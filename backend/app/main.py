import logging
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
    yield
    logger.info("Shutting down...")


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
