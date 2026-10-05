import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event
from app.config import settings

def _engine_options() -> dict:
    if "sqlite" in settings.DATABASE_URL:
        return {"connect_args": {"check_same_thread": False}}

    if settings.uses_transaction_pooler:
        # Supabase's transaction-mode pooler (pgbouncer, port 6543) multiplexes
        # clients over one backend connection. Prepared statements collide
        # across clients, and pgbouncer can close the connection mid-statement
        # (ConnectionDoesNotExistError), which strands long-running audits. A
        # single pooled connection with no overflow keeps every statement on
        # one server-side connection, which is what pgbouncer transaction mode
        # actually supports.
        return {
            "connect_args": {"statement_cache_size": 0},
            "pool_size": 1,
            "max_overflow": 0,
            "pool_recycle": 1800,
            "pool_pre_ping": True,
        }

    # Session mode (port 5432): the free tier allows one client, so the pool
    # must never exceed it or every connection past the first is refused
    # (EMAXCONNSESSION).
    if settings.uses_supabase_pooler:
        return {
            "pool_size": 1,
            "max_overflow": 0,
            "pool_recycle": 1800,
            "pool_pre_ping": True,
        }

    return {"connect_args": {"statement_cache_size": 0}}


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    **_engine_options(),
)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, connection_record):
    """Tune every SQLite connection for the slow shared volume the app runs on.

    - WAL: readers no longer block writers and vice versa; the audit status
      drain, live probe beacon, orphan reaper and web handlers can all touch the
      database concurrently without serializing on one rollback-journal lock.
    - synchronous=NORMAL: commits stop fsyncing the journal on every write
      (the dominant cost of the multi-second write stalls we observed), leaving
      durability to the WAL checkpoint.
    - busy_timeout: concurrent writers queue instead of failing immediately.
    - wal_autocheckpoint: the WAL can only be reclaimed when no reader is
      holding an open snapshot. If any session leaks an uncommitted
      transaction, the WAL grows without bound and every write then has to
      search an ever-larger write-ahead log, which is what turned routine
      concurrency into persistent "database is locked" failures. A bounded
      autocheckpoint keeps the file small even if that ever happens again.
    """
    if "sqlite" not in settings.DATABASE_URL:
        return
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.execute("PRAGMA wal_autocheckpoint=1000")
        cursor.close()
    except Exception:
        # Falls back to defaults if a compatibility layer lacks PRAGMA support.
        pass


async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    from app import models as _models  # noqa: F401  (register ALL tables on Base.metadata)

    async with engine.begin() as conn:
        # If no alembic_version table exists, this database predates Alembic
        # management. Stamp it at head so a later `alembic upgrade` is a no-op
        # instead of trying to replay hand-written baselines onto an existing
        # schema. Alembic stays non-authoritative (compat fallback): create_all
        # and migrate_sqlite_columns still run below to keep the runtime schema
        # and versioned state in sync regardless of how tables were created.
        await conn.run_sync(_stamp_if_unversioned)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Run pending Alembic migrations (e.g. target_domain columns on backlinks).
    await _run_pending_migrations()

    await migrate_sqlite_columns()


def _stamp_if_unversioned(conn):
    """Stamp a pre-Alembic database at head, if it has no alembic_version table.

    Uses the live connection so a DATABASE_URL override is honoured rather than
    alembic.ini's default sqlite URL. Idempotent: only stamps the first run.
    """
    from sqlalchemy import inspect
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from alembic.runtime.migration import MigrationContext

    if "alembic_version" in inspect(conn).get_table_names():
        return

    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cfg = Config(os.path.join(here, "alembic.ini"))
    # script_location in alembic.ini is relative ("alembic"); make it absolute so
    # stamping works regardless of the process cwd (pytest runs from repo root).
    cfg.set_main_option("script_location", os.path.join(here, "alembic"))
    script = ScriptDirectory.from_config(cfg)
    MigrationContext.configure(conn).stamp(script, "head")
    print("[init_db] database had no alembic_version; stamped at head")


async def _run_pending_migrations():
    """Run Alembic upgrade head to apply any pending migrations.

    Uses the sync engine derived from the async DATABASE_URL so Alembic
    operates against the correct database. Runs in a thread to avoid
    clashing with the existing event loop (Alembic's env.py calls asyncio.run).
    """
    from alembic.config import Config
    from alembic import command

    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # Export the live URL as an env var so alembic/env.py can consume it
    # without routing a '%'-containing URL through configparser interpolation.
    os.environ["DATABASE_URL"] = settings.DATABASE_URL
    cfg = Config(os.path.join(here, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(here, "alembic"))

    def _run():
        command.upgrade(cfg, "head")

    try:
        await asyncio.to_thread(_run)
        print("[init_db] Alembic migrations applied")
    except Exception as exc:
        print(f"[init_db] Alembic upgrade skipped/failed (non-fatal): {exc}")


_SQLITE_ADD_COLUMNS = {
    "issues": {
        "why_it_matters": "TEXT",
        "business_impact": "TEXT",
        "expected_improvement": "TEXT",
        "confidence_basis": "TEXT",
        "dependencies": "JSON",
        "estimated_time_minutes": "INTEGER",
        "framework_snippets": "JSON",
        "source_model": "TEXT",
        "status": "TEXT",
        "last_checked": "TIMESTAMP",
    },
    "webhooks": {
        "delivery_count": "INTEGER DEFAULT 0",
        "last_delivery_status": "INTEGER",
        "last_delivery_error": "TEXT DEFAULT ''",
    },
    "backlinks": {
        "target_domain": "TEXT DEFAULT ''",
    },
    "referring_domains": {
        "target_domain": "TEXT DEFAULT ''",
    },
}


async def migrate_sqlite_columns():
    """SQLite cannot ALTER via create_all on existing tables, so add new
    columns lazily with a PRAGMA-driven idempotent migration."""
    if "sqlite" not in settings.DATABASE_URL:
        return
    from sqlalchemy import text

    async with engine.begin() as conn:
        for table, columns in _SQLITE_ADD_COLUMNS.items():
            exists = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"), {"t": table}
            )
            if not exists.scalar_one_or_none():
                continue
            existing = {
                row[1] for row in (await conn.execute(text(f"PRAGMA table_info({table})"))).fetchall()
            }
            for col, col_type in columns.items():
                if col in existing:
                    continue
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))

