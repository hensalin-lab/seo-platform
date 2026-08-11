"""Google integrations: OAuth connect/callback, connected accounts, and
Search Console property discovery under /api/integrations/google/*.

Token handling rules:
- Tokens are encrypted at rest (app.utils.crypto).
- Access/refresh tokens never appear in any API response.
- The OAuth callback is public (browser redirect from Google) but is bound to
  the initiating user through a short-lived OAuthFlow state record.
"""
import datetime as _dt
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import GoogleAccount, OAuthFlow, User
from app.api.auth import get_current_active_user
from app.utils.crypto import decrypt_to_plaintext, encrypt_plaintext
from auth import google_oauth

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/integrations/google", tags=["google-integrations"])

_STATE_TTL_MINUTES = 15
FRONTEND_SETTINGS_PATH = "/settings"


def _redirect_home(params: str = "") -> RedirectResponse:
    base = settings.APP_URL or "http://localhost:5173"
    return RedirectResponse(f"{base}{FRONTEND_SETTINGS_PATH}{params}")


def _safe_account(acc: GoogleAccount) -> dict:
    return {
        "id": acc.id,
        "google_account_id": acc.google_account_id,
        "email": acc.email,
        "name": acc.name,
        "scopes": acc.scopes or [],
        "is_active": acc.is_active,
        "connected_at": acc.created_at.isoformat() if acc.created_at else None,
        "token_expires_at": acc.token_expires_at.isoformat() if acc.token_expires_at else None,
    }


@router.get("/connect")
async def google_connect(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redirect_to: str = "",
):
    """Start OAuth. Creates a short-lived state bound to the user and returns
    the consent URL (the frontend redirects the browser there)."""
    if not google_oauth.is_configured():
        raise HTTPException(status_code=503, detail="Google OAuth is not configured on this server yet.")

    flow = OAuthFlow(
        user_id=user.id,
        provider="google",
        redirect_uri=redirect_to or "",
        expires_at=_dt.datetime.utcnow() + _dt.timedelta(minutes=_STATE_TTL_MINUTES),
    )
    db.add(flow)
    await db.commit()

    auth_url = google_oauth.build_auth_url(flow.state)
    return {"auth_url": auth_url, "state": flow.state, "expires_in_seconds": _STATE_TTL_MINUTES * 60}


@router.get("/callback")
async def google_callback(code: str = "", state: str = "", db: AsyncSession = Depends(get_db)):
    """Public OAuth redirect target. Verifies the state, exchanges the code,
    and stores an encrypted GoogleAccount (multi-account: existing accounts are
    never overwritten)."""
    if not code or not state:
        return _redirect_home("?google=error&reason=missing_params")
    if not google_oauth.is_configured():
        return _redirect_home("?google=error&reason=not_configured")

    flow = (await db.execute(select(OAuthFlow).where(OAuthFlow.state == state))).scalar_one_or_none()
    if not flow or flow.consumed or flow.expires_at < _dt.datetime.utcnow():
        return _redirect_home("?google=error&reason=invalid_state")

    try:
        tokens = await google_oauth.exchange_code(code)
        user_info = await google_oauth.get_user_info(tokens["access_token"])
    except Exception as e:
        logger.warning(f"Google callback exchange failed: {e}")
        return _redirect_home("?google=error&reason=exchange_failed")

    google_id = user_info.get("id", "")
    email = (user_info.get("email") or "").lower()

    # Multi-account: create a new row per Google account; never overwrite.
    existing = (await db.execute(select(GoogleAccount).where(
        GoogleAccount.user_id == flow.user_id,
        GoogleAccount.google_account_id == google_id,
    ))).scalar_one_or_none()

    expires_at = _dt.datetime.utcnow() + _dt.timedelta(seconds=tokens.get("expires_in", 3600))
    if existing:
        existing.email = email or existing.email
        existing.name = user_info.get("name") or existing.name
        existing.encrypted_access_token = encrypt_plaintext(tokens.get("access_token", ""))
        if tokens.get("refresh_token"):
            existing.encrypted_refresh_token = encrypt_plaintext(tokens["refresh_token"])
        existing.token_expires_at = expires_at
        existing.scopes = tokens.get("scope", " ".join(google_oauth.SCOPES)).split()
        existing.is_active = True
    else:
        db.add(GoogleAccount(
            user_id=flow.user_id,
            google_account_id=google_id,
            email=email,
            name=user_info.get("name") or "",
            encrypted_access_token=encrypt_plaintext(tokens.get("access_token", "")),
            encrypted_refresh_token=encrypt_plaintext(tokens.get("refresh_token", "")),
            token_expires_at=expires_at,
            scopes=tokens.get("scope", " ".join(google_oauth.SCOPES)).split(),
            is_active=True,
        ))

    flow.consumed = True
    await db.commit()

    return _redirect_home("?google=connected&email=" + email)


@router.get("/accounts")
async def list_accounts(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GoogleAccount).where(
        GoogleAccount.user_id == user.id,
        GoogleAccount.is_active == True,
    ).order_by(GoogleAccount.created_at.desc()))
    accounts = result.scalars().all()
    return {
        "accounts": [_safe_account(a) for a in accounts],
        "configured": google_oauth.is_configured(),
    }


@router.get("/properties")
async def list_properties(
    account_id: str = "",
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List Search Console properties for a connected account. Validates
    ownership, refreshes the token when needed, and never returns secrets."""
    result = await db.execute(select(GoogleAccount).where(
        GoogleAccount.user_id == user.id,
        GoogleAccount.is_active == True,
    ))
    accounts = result.scalars().all()
    if not accounts:
        raise HTTPException(status_code=404, detail="No Google account connected.")

    account = next((a for a in accounts if a.id == account_id), None) if account_id else accounts[0]
    if account_id and account is None:
        raise HTTPException(status_code=404, detail="Google account not found.")

    access_token = await google_oauth.get_valid_access_token(account)
    if not access_token:
        raise HTTPException(status_code=401, detail="Google access is expired. Reconnect the account.")

    try:
        properties = await google_oauth.list_search_console_properties(access_token)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"Search Console API error: {e}")

    return {
        "account": _safe_account(account),
        "properties": properties,
    }


@router.delete("/accounts/{account_id}")
async def disconnect_account(
    account_id: str,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GoogleAccount).where(
        GoogleAccount.id == account_id,
        GoogleAccount.user_id == user.id,
    ))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Google account not found.")

    access = decrypt_to_plaintext(account.encrypted_access_token)
    await google_oauth.revoke_token(access)
    await db.execute(delete(GoogleAccount).where(GoogleAccount.id == account.id))
    await db.commit()
    return {"connected": False, "removed_account_id": account_id}
