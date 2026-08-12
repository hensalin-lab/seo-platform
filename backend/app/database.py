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
    from app.models import (
        Audit, Page, Issue, AuditScore, Recommendation,
        CompetitorData, AuditHistory, PageAnalysisRecord,
        KeywordRecord, RoadmapRecord, ChatMessage,
        RoadmapItem, KeywordData, ContentData, AIVisibilityData,
        User, APIKey, Session, Webhook, ScheduledAudit, WhiteLabelSettings,
        Backlink, ReferringDomain, CoreWebVitals, FixAction, DigestPreference,
        RankPosition, ProgrammaticTemplate, ProgrammaticEntry, ProgrammaticPage,
        GoogleAccount, OAuthFlow, AuditShareLink, ActivityLog, SlackPreference,
        AuditSnapshot,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_sqlite_columns()


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
    }
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

