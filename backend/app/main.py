import asyncio
import logging
import datetime as _dt
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db
from app.rate_limit import limiter
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
from app.api.gsc_settings import router as gsc_settings_router
from app.api.programmatic import router as programmatic_router
from app.api.insights import router as insights_router
from app.api.uptime import router as uptime_router
from app.api.workspaces import router as workspaces_router
from app.api.providers import router as providers_router
from app.api.brand_monitor import router as brand_monitor_router
from app.api.apply_fix import router as apply_fix_router
from app.api.free_data import router as free_data_router
from app.api.google_integrations import router as google_integrations_router
from app.api.shares import router as shares_router
from app.api.rank_tracking import router as rank_tracking_router
from app.api.domain_overview import router as domain_overview_router
from app.api.keyword_gap import router as keyword_gap_router
from app.api.content_editor import router as content_editor_router
from app.api.ai_visibility_trend import router as ai_visibility_trend_router
from app.api.admin import router as admin_router
from app.api.activity import router as activity_router
from app.api.alerts import router as alerts_router
from app.auth_middleware import AuthMiddleware, _extract_user_id

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


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
    uptime_task = asyncio.create_task(_uptime_worker())
    logger.info("Uptime monitor worker started")
    rank_task = asyncio.create_task(_rank_tracker_worker())
    logger.info("SERP rank tracker worker started")
    growth_rank_task = asyncio.create_task(_growth_ai_rank_tracker_worker())
    logger.info("Growth AI rank tracker worker started (daily)")
    ai_vis_task = asyncio.create_task(_ai_visibility_trend_worker())
    logger.info("AI visibility trend worker started (weekly)")

    # Drive the MCP session manager task group for /mcp (if enabled).
    mcp_session = _get_mcp_session()
    _mcp_ctx = None
    if mcp_session is not None:
        _mcp_ctx = mcp_session.run()
        await _mcp_ctx.__aenter__()
        logger.info("MCP session manager started")

    yield
    scheduler_task.cancel()
    digest_task.cancel()
    uptime_task.cancel()
    rank_task.cancel()
    growth_rank_task.cancel()
    ai_vis_task.cancel()
    if _mcp_ctx is not None:
        try:
            await _mcp_ctx.__aexit__(None, None, None)
        except Exception as e:  # pragma: no cover
            logger.warning(f"MCP session shutdown error: {e}")
    try:
        await scheduler_task
        await digest_task
        await uptime_task
        await rank_task
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


async def _uptime_worker():
    """Run due uptime checks every 60 seconds."""
    from app.database import async_session
    from app.engine.uptime import run_due_checks

    while True:
        try:
            async with async_session() as db:
                await run_due_checks(db)
        except Exception as e:
            logger.warning(f"Uptime worker error (non-fatal): {e}")
        await asyncio.sleep(60)


async def _rank_tracker_worker():
    """Periodically re-capture SERP positions for recent audits so the ranking
    history (position-over-time) grows automatically without a manual capture.
    Runs every 6 hours (≈4 captures/day)."""
    from sqlalchemy import select, func
    from app.database import async_session
    from app.models import Audit, AuditStatus, RankPosition
    from app.api.rankings import auto_capture_rankings

    while True:
        try:
            async with async_session() as db:
                cutoff = _dt.datetime.utcnow() - _dt.timedelta(days=45)
                result = await db.execute(
                    select(Audit.id, Audit.website_url)
                    .where(
                        Audit.status == AuditStatus.COMPLETED.value,
                        Audit.created_at >= cutoff,
                    )
                    .order_by(Audit.created_at.desc())
                    .limit(40)
                )
                candidates = result.all()
                tracked = 0
                for audit_id, _url in candidates:
                    try:
                        kw_count = (
                            await db.execute(
                                select(func.count(RankPosition.id)).where(RankPosition.audit_id == audit_id)
                            )
                        ).scalar()
                        if (kw_count or 0) >= 1:
                            asyncio.get_running_loop().create_task(auto_capture_rankings(audit_id))
                            tracked += 1
                    except Exception as e:
                        logger.warning(f"Rank tracker eval failed for {audit_id}: {e}")
                if tracked:
                    logger.info(f"Rank tracker queued recapture for {tracked} audits")
        except Exception as e:
            logger.warning(f"Rank tracker worker error (non-fatal): {e}")
        await asyncio.sleep(6 * 3600)


async def _growth_ai_rank_tracker_worker():
    """Daily worker for the Growth AI Engine's TrackedKeyword-based rank tracking.
    Runs check_all_tracked_keywords() from rank_tracking_engine once per day."""
    from app.engine.rank_tracking_engine import scheduled_rank_tracking_worker
    while True:
        try:
            await scheduled_rank_tracking_worker()
        except Exception as e:
            logger.warning(f"Growth AI rank tracker worker error (non-fatal): {e}")
        await asyncio.sleep(24 * 3600)


async def _ai_visibility_trend_worker():
    """Weekly worker for AI visibility trend tracking (checks all tracked domains)."""
    from app.engine.ai_visibility_trend import scheduled_ai_visibility_worker
    while True:
        try:
            await scheduled_ai_visibility_worker()
        except Exception as e:
            logger.warning(f"AI visibility trend worker error (non-fatal): {e}")
        await asyncio.sleep(7 * 24 * 3600)  # weekly


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
app.include_router(gsc_settings_router)
app.include_router(programmatic_router)
app.include_router(insights_router)
app.include_router(uptime_router)
app.include_router(workspaces_router)
app.include_router(providers_router)
app.include_router(brand_monitor_router)
app.include_router(apply_fix_router)
app.include_router(free_data_router)
app.include_router(google_integrations_router)
app.include_router(shares_router)
app.include_router(rank_tracking_router)
app.include_router(domain_overview_router)
app.include_router(keyword_gap_router)
app.include_router(content_editor_router)
app.include_router(ai_visibility_trend_router)
app.include_router(admin_router)
app.include_router(activity_router)
app.include_router(alerts_router)

_mcp_session = None


def _get_mcp_session():
    return _mcp_session


try:
    from app.engine.mcp_server import get_mcp_app, get_mcp_session_manager
    _mcp = get_mcp_app()
    if _mcp is not None:
        # Served under /api/mcp (not /mcp): FastAPI Cloud forwards /api/* paths,
        # and the Vercel frontend proxies /api/* -> backend. Exempted from auth
        # in auth_middleware so MCP clients can connect directly.
        app.mount("/api/mcp", _mcp, name="mcp")
        _mcp_session = get_mcp_session_manager()
        logger.info("MCP server mounted at /api/mcp")
    else:
        logger.warning("MCP server not available; /api/mcp disabled")
except Exception as e:  # pragma: no cover
    logger.warning(f"MCP mount failed (non-fatal): {e}")

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
