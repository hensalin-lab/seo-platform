"""Google OAuth2 for Search Console + Analytics.

Replaces the service-account-only path with a full authorization-code flow:

- consent URL generation (per authenticated user, state-bound)
- authorization-code exchange
- encrypted token storage (app.utils.crypto)
- automatic refresh when an access token expires
- Search Console property discovery

Tokens never leave the backend. Frontend only sees safe account metadata.
"""
import datetime as _dt
import logging

import httpx
from sqlalchemy import select

from app.config import settings

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_OAUTH2_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
SEARCH_CONSOLE_API = "https://searchconsole.googleapis.com/webmasters/v3/sites"

# Search Console read-only + Analytics read-only + profile basics.
SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/analytics.readonly",
]

_EXPIRY_BUFFER_SECONDS = 60


def is_configured() -> bool:
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)


def build_auth_url(state: str, redirect_uri: str | None = None) -> str:
    redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query}"


async def exchange_code(code: str, redirect_uri: str | None = None) -> dict:
    """Exchange an authorization code for tokens. Raises ValueError on failure."""
    redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI
    payload = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=payload)
    if resp.status_code != 200:
        raise ValueError(f"Token exchange failed with status {resp.status_code}")
    tokens = resp.json()
    if not tokens.get("access_token"):
        raise ValueError("Token exchange returned no access token")
    return tokens


async def refresh_access_token(refresh_token: str) -> dict:
    """Exchange a refresh token for a fresh access token. Raises ValueError on failure."""
    payload = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=payload)
    if resp.status_code != 200:
        raise ValueError(f"Token refresh failed with status {resp.status_code}")
    tokens = resp.json()
    if not tokens.get("access_token"):
        raise ValueError("Token refresh returned no access token")
    return tokens


async def get_user_info(access_token: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if resp.status_code != 200:
        raise ValueError(f"Failed to fetch Google user info ({resp.status_code})")
    return resp.json()


async def get_valid_access_token(account) -> str:
    """Return a non-expired access token for a GoogleAccount, refreshing and
    persisting it when necessary. Returns '' if the account cannot be used."""
    from app.database import async_session
    from app.models import GoogleAccount
    from app.utils.crypto import decrypt_to_plaintext, encrypt_plaintext

    refresh = decrypt_to_plaintext(account.encrypted_refresh_token)
    access = decrypt_to_plaintext(account.encrypted_access_token)
    expires_at = account.token_expires_at

    if access and expires_at:
        naive = expires_at.replace(tzinfo=_dt.timezone.utc) if expires_at.tzinfo is None else expires_at
        if naive > _dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(seconds=_EXPIRY_BUFFER_SECONDS):
            return access

    if not refresh:
        return ""

    try:
        tokens = await refresh_access_token(refresh)
    except Exception as e:
        logger.warning(f"Google token refresh failed for account {account.id}: {e}")
        return ""

    new_access = tokens.get("access_token", "")
    new_refresh = tokens.get("refresh_token") or refresh
    expires_in = tokens.get("expires_in", 3600)

    async with async_session() as db:
        fresh = (await db.execute(
            select(GoogleAccount).where(GoogleAccount.id == account.id)
        )).scalar_one_or_none()
        if fresh:
            fresh.encrypted_access_token = encrypt_plaintext(new_access)
            fresh.encrypted_refresh_token = encrypt_plaintext(new_refresh)
            fresh.token_expires_at = _dt.datetime.utcnow() + _dt.timedelta(seconds=expires_in)
            await db.commit()

    return new_access


async def list_search_console_properties(access_token: str) -> list[dict]:
    """List Search Console properties accessible with the token. Returns safe
    property metadata only (siteUrl, permissionLevel)."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            SEARCH_CONSOLE_API,
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if resp.status_code != 200:
        raise ValueError(f"Search Console API returned {resp.status_code}")
    data = resp.json()
    entries = data.get("siteEntry", []) if isinstance(data, dict) else []
    return [
        {
            "siteUrl": e.get("siteUrl", ""),
            "permissionLevel": e.get("permissionLevel", ""),
        }
        for e in entries
        if isinstance(e, dict) and e.get("siteUrl")
    ]


async def revoke_token(access_token: str) -> None:
    if not access_token:
        return
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(
                GOOGLE_OAUTH2_REVOKE_URL,
                data={"token": access_token},
            )
    except Exception as e:
        logger.warning(f"Google token revoke failed (non-fatal): {e}")
