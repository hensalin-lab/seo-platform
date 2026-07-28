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
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
