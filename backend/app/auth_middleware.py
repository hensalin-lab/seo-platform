import re
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.auth import decode_access_token

logger = logging.getLogger(__name__)

PUBLIC_PATHS = {
    "/",
    "/api/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}

PUBLIC_PREFIXES = [
    "/api/auth/register",
    "/api/auth/login",
    "/api/oauth/",
    "/api/integrations/google/callback",
    "/api/share/",
    "/api/mcp",
]

PUBLIC_METHODS = {"OPTIONS", "HEAD"}

_AUDIT_ID_RE = re.compile(r"/api/audit/(?:status/)?([a-f0-9-]+)")
_MEGA_RE = re.compile(r"/api/(?:mega-analysis|full-strategy|all-pages-mega)/([a-f0-9-]+)")


def _is_public(path: str, method: str) -> bool:
    if method in PUBLIC_METHODS:
        return True
    if path in PUBLIC_PATHS:
        return True
    for prefix in PUBLIC_PREFIXES:
        if path.startswith(prefix):
            return True
    return False


def _extract_audit_id(path: str) -> str | None:
    m = _AUDIT_ID_RE.match(path)
    if m:
        return m.group(1)
    m = _MEGA_RE.match(path)
    if m:
        return m.group(1)
    return None


async def _extract_user_id(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        payload = decode_access_token(token)
        if payload:
            return payload.get("sub")
    api_key = request.headers.get("X-API-Key", "")
    if api_key:
        from sqlalchemy import select
        from app.database import async_session
        from app.models import APIKey, User
        async with async_session() as db:
            result = await db.execute(select(APIKey).where(APIKey.key == api_key, APIKey.is_active == True))
            key_obj = result.scalar_one_or_none()
            if key_obj:
                return key_obj.user_id
    return None


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method

        if _is_public(path, method):
            return await call_next(request)

        # Everything else under /api requires authentication (default-deny).
        if path.startswith("/api"):
            user_id = await _extract_user_id(request)
            if not user_id:
                return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
            request.state.user_id = user_id

            audit_id = _extract_audit_id(path)
            if audit_id:
                owner = await self._check_audit_owner(audit_id, user_id)
                if owner is False:
                    return JSONResponse(status_code=403, content={"detail": "Access denied"})

        return await call_next(request)

    @staticmethod
    async def _check_audit_owner(audit_id: str, user_id: str) -> bool | None:
        from sqlalchemy import select
        from app.database import async_session
        from app.models import Audit
        try:
            async with async_session() as db:
                result = await db.execute(select(Audit).where(Audit.id == audit_id))
                audit = result.scalar_one_or_none()
                if not audit:
                    return None
                if audit.user_id is None:
                    return None
                return audit.user_id == user_id
        except Exception as e:
            logger.error(f"Owner check failed: {e}")
            return None
