import logging
import httpx
import secrets
import datetime as _dt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models import User
from app.config import settings
from app.auth import create_access_token
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/oauth", tags=["oauth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
SCOPES = "openid email profile https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly"


@router.get("/config")
async def oauth_config():
    """Public: reports which OAuth providers are configured so the UI can
    hide buttons instead of bouncing users to a Google error page."""
    return {
        "google": {
            "configured": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
        }
    }


@router.get("/google")
async def google_login():
    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET):
        raise HTTPException(status_code=503, detail="Google OAuth is not configured on this server yet.")
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}")


@router.get("/google/callback")
async def google_callback(code: str = "", state: str = "", db: AsyncSession = Depends(get_db)):
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Token exchange failed")
        tokens = token_resp.json()

        user_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        google_user = user_resp.json()

    email = google_user.get("email", "").lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            username=google_user.get("name", email.split("@")[0]).replace(" ", "_"),
            hashed_password=secrets.token_urlsafe(32),
            role="VIEWER",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    jwt_token = create_access_token({"sub": user.id, "role": user.role})

    # Persist Google tokens as a per-user provider config (GSC OAuth scaffold).
    try:
        from app.models import ProviderSetting
        from sqlalchemy import select as _select
        row = (await db.execute(_select(ProviderSetting).where(
            ProviderSetting.user_id == user.id, ProviderSetting.provider == "gsc"
        ))).scalar_one_or_none()
        config = {
            "oauth_access_token": tokens.get("access_token", ""),
            "oauth_refresh_token": tokens.get("refresh_token", ""),
            "oauth_expires_in": tokens.get("expires_in", 3600),
            "oauth_email": email,
        }
        if not row:
            row = ProviderSetting(user_id=user.id, provider="gsc", config=config)
            db.add(row)
        else:
            row.config = {**(row.config or {}), **config}
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to persist google provider tokens: {e}")

    return {
        "access_token": jwt_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role,
        },
        "google_tokens": {
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "expires_in": tokens.get("expires_in"),
        },
    }


@router.get("/google/status")
async def google_status(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    """Report per-user Google OAuth connectivity (GSC provider scaffold)."""
    from app.models import ProviderSetting
    from sqlalchemy import select as _select
    row = (await db.execute(_select(ProviderSetting).where(
        ProviderSetting.user_id == user.id, ProviderSetting.provider == "gsc"
    ))).scalar_one_or_none()
    cfg = (row.config if row else {}) or {}
    return {
        "connected": bool(cfg.get("oauth_refresh_token") or cfg.get("oauth_access_token")),
        "email": cfg.get("oauth_email", ""),
        "scopes": SCOPES.split(" "),
        "note": "Tokens stored per-user. Revoke by connecting to Google or deleting the GSC provider config in Integrations.",
    }
