import re
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.auth import decode_access_token

logger = logging.getLogger(__name__)

PUBLIC_PATHS = {
    "/api/health",
    "/",
    "/docs",
    "/openapi.json",
    "/redoc",
}

PUBLIC_PREFIXES = [
    "/api/auth/register",
    "/api/auth/login",
    "/api/audit/status/",
]

PUBLIC_METHODS = {"OPTIONS", "HEAD"}


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

        if method in PUBLIC_METHODS:
            return await call_next(request)

        if path in PUBLIC_PATHS:
            return await call_next(request)

        for prefix in PUBLIC_PREFIXES:
            if path.startswith(prefix):
                return await call_next(request)

        if path.startswith("/api/audit/"):
            is_status_poll = path.startswith("/api/audit/status/")
            is_post_like = method in ("POST", "PUT", "DELETE", "PATCH")

            if is_status_poll and method in ("GET", "HEAD"):
                return await call_next(request)

            if path == "/api/audit/history" and method == "GET":
                user_id = await _extract_user_id(request)
                if not user_id:
                    return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
                request.state.user_id = user_id
                return await call_next(request)

            if path == "/api/audit/start" and method == "POST":
                user_id = await _extract_user_id(request)
                if not user_id:
                    return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
                request.state.user_id = user_id
                return await call_next(request)

            if is_post_like:
                user_id = await _extract_user_id(request)
                if not user_id:
                    return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
                request.state.user_id = user_id

                if not is_status_poll:
                    audit_id_match = re.match(r"/api/audit/([a-f0-9-]+)", path)
                    if audit_id_match:
                        audit_id = audit_id_match.group(1)
                        owner = await self._check_audit_owner(audit_id, user_id)
                        if owner is False:
                            return JSONResponse(status_code=403, content={"detail": "Access denied"})

                return await call_next(request)

            if method in ("GET", "HEAD", "DELETE"):
                user_id = await _extract_user_id(request)
                if user_id:
                    request.state.user_id = user_id
                else:
                    request.state.user_id = None

                if method == "DELETE":
                    if not user_id:
                        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
                    audit_id_match = re.match(r"/api/audit/([a-f0-9-]+)$", path)
                    if audit_id_match:
                        audit_id = audit_id_match.group(1)
                        owner = await self._check_audit_owner(audit_id, user_id)
                        if owner is False:
                            return JSONResponse(status_code=403, content={"detail": "Access denied"})

                if user_id:
                    audit_id_match = re.match(r"/api/audit/([a-f0-9-]+)", path)
                    if audit_id_match:
                        audit_id = audit_id_match.group(1)
                        owner = await self._check_audit_owner(audit_id, user_id)
                        if owner is False:
                            return JSONResponse(status_code=403, content={"detail": "Access denied"})

                return await call_next(request)

        if path == "/api/portfolio":
            user_id = await _extract_user_id(request)
            if not user_id:
                return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
            request.state.user_id = user_id
            return await call_next(request)

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
