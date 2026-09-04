import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

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
    cfg = Config(os.path.join(here, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(here, "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

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

