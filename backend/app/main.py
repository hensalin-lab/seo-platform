import asyncio
import logging
import datetime as _dt
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db
from app.api.audit import router as audit_router
from app.api.status import router as status_router
from app.api.auth import router as auth_router
from app.api.webhooks import router as webhook_router
from app.api.scheduled import router as scheduled_router
from app.api.whitelabel import router as whitelabel_router
from app.api.oauth import router as oauth_router
from app.api.action_studio import router as action_studio_router
from app.api.rank_boost import router as rank_boost_router
from app.api.digest import router as digest_router
from app.api.rankings import router as rankings_router
from app.auth_middleware import AuthMiddleware, _extract_user_id

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def _rate_limit_key(request: Request) -> str:
    """Use user ID if authenticated, else IP address."""
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    return get_remote_address(request)


limiter = Limiter(key_func=_rate_limit_key, default_limits=["200/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI SEO Intelligence Platform v2.0...")
    await init_db()
    logger.info("Database initialized")
    try:
        from app.database import async_session
        from app.engine.issue_cleanup import cleanup_stale_no_author_issues
        async with async_session() as db:
            await cleanup_stale_no_author_issues(db)
    except Exception as e:
        logger.warning(f"Issue cleanup failed (non-fatal): {e}")

    try:
        from app.engine.db_maintenance import run_startup_maintenance
        maint = await run_startup_maintenance()
        logger.info(f"Startup maintenance result: {maint}")
    except Exception as e:
        logger.warning(f"Startup maintenance failed (non-fatal): {e}")

    scheduler_task = asyncio.create_task(_scheduled_audit_worker())
    logger.info("Scheduled audit worker started")
    digest_task = asyncio.create_task(_digest_worker())
    logger.info("Digest worker started")
    yield
    scheduler_task.cancel()
    digest_task.cancel()
    try:
        await scheduler_task
        await digest_task
    except asyncio.CancelledError:
        pass
    logger.info("Shutting down...")


_FREQ_DAYS = {"daily": 1, "weekly": 7, "monthly": 30}


async def _scheduled_audit_worker():
    """Run due scheduled audits. Every 5 minutes, find scheduled audits whose
    next_run has passed, create the Audit row, and kick off the audit task."""
    from sqlalchemy import select
    from app.database import async_session
    from app.models import Audit, ScheduledAudit

    while True:
        try:
            async with async_session() as db:
                now = _dt.datetime.utcnow()
                result = await db.execute(
                    select(ScheduledAudit).where(
                        ScheduledAudit.is_active == True,
                        ScheduledAudit.next_run != None,
                        ScheduledAudit.next_run <= now,
                    )
                )
                due = result.scalars().all()
                for sa in due:
                    audit = Audit(
                        website_url=sa.website_url,
                        competitor_url=sa.competitor_url,
                        status="queued",
                        progress=0,
                        user_id=sa.user_id,
                    )
                    db.add(audit)
                    await db.flush()
                    days = _FREQ_DAYS.get(sa.frequency, 7)
                    sa.next_run = _dt.datetime.utcnow() + _dt.timedelta(days=days)
                    logger.info(f"Scheduled audit triggered: {sa.website_url} -> audit {audit.id}")
                    try:
                        from app.api.audit import run_audit_task
                        asyncio.create_task(run_audit_task(audit.id))
                    except Exception as e:
                        logger.warning(f"Could not launch scheduled audit {audit.id}: {e}")
                if due:
                    await db.commit()
        except Exception as e:
            logger.warning(f"Scheduled audit worker error (non-fatal): {e}")
        await asyncio.sleep(300)


async def _digest_worker():
    """Send due AI SEO digests. Checks every 15 minutes."""
    from app.engine.digest import check_and_send_digests

    while True:
        try:
            await check_and_send_digests()
        except Exception as e:
            logger.warning(f"Digest worker error (non-fatal): {e}")
        await asyncio.sleep(900)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

app.add_middleware(AuthMiddleware)

app.include_router(audit_router)
app.include_router(status_router)
app.include_router(auth_router)
app.include_router(webhook_router)
app.include_router(scheduled_router)
app.include_router(whitelabel_router)
app.include_router(oauth_router)
app.include_router(action_studio_router)
app.include_router(rank_boost_router)
app.include_router(digest_router)
app.include_router(rankings_router)


@app.get("/api/health")
@limiter.exempt
async def health():
    try:
        from app.database import async_session
        from sqlalchemy import text
        async with async_session() as db:
            await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.warning(f"Health check DB error: {e}")
        db_status = "disconnected"
    return {"status": "healthy" if db_status == "connected" else "degraded", "version": settings.APP_VERSION, "database": db_status}


@app.get("/")
@limiter.exempt
async def root():
    return {"message": "AI SEO Intelligence Platform API v2.0", "docs": "/docs"}
