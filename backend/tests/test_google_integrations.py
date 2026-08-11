"""Tests for the Google OAuth integrations (Phase A).

Covers: connect URL, state-bound callback, encrypted token storage, multi-
account support (never overwrites), account ownership, safe property listing,
disconnect/revoke, and crypto round-tripping. Google APIs are mocked.
"""
import datetime as _dt

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.utils import crypto
from app.models import GoogleAccount, OAuthFlow
from app.database import async_session
from auth import google_oauth

transport = ASGITransport(app=app)


async def _auth_headers(client, email, username=None):
    username = username or email.split("@")[0]
    await client.post("/api/auth/register", json={
        "email": email,
        "username": username,
        "password": "password123",
    })
    resp = await client.post("/api/auth/login", json={
        "email": email,
        "password": "password123",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _start_flow(client, headers):
    resp = await client.get("/api/integrations/google/connect", headers=headers)
    return resp


def _configure_google(monkeypatch, token="at_123", refresh="rt_456", scope=None):
    monkeypatch.setattr(google_oauth, "is_configured", lambda: True)

    async def fake_exchange(code, redirect_uri=None):
        return {"access_token": token, "refresh_token": refresh,
                "expires_in": 3600, "scope": scope or " ".join(google_oauth.SCOPES)}

    async def fake_userinfo(access_token):
        return {"id": "google-1", "email": "owner@example.com", "name": "Owner"}

    async def fake_properties(access_token):
        return [{"siteUrl": "https://example.com", "permissionLevel": "siteFullUser"}]

    async def fake_valid_token(account):
        return token

    async def fake_revoke(access_token):
        return None

    monkeypatch.setattr(google_oauth, "exchange_code", fake_exchange)
    monkeypatch.setattr(google_oauth, "get_user_info", fake_userinfo)
    monkeypatch.setattr(google_oauth, "list_search_console_properties", fake_properties)
    monkeypatch.setattr(google_oauth, "get_valid_access_token", fake_valid_token)
    monkeypatch.setattr(google_oauth, "revoke_token", fake_revoke)


@pytest.mark.asyncio
async def test_crypto_roundtrip():
    secret = "ya29.abc123-secret-value"
    enc = crypto.encrypt_plaintext(secret)
    assert crypto.looks_encrypted(enc)
    assert enc != secret
    assert "enc:" not in secret
    assert crypto.decrypt_to_plaintext(enc) == secret
    assert crypto.decrypt_to_plaintext("") == ""
    assert crypto.decrypt_to_plaintext("legacy-plaintext") == "legacy-plaintext"


@pytest.mark.asyncio
async def test_connect_requires_auth():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/integrations/google/connect")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_connect_unconfigured_returns_503():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "nocfg@example.com")
        resp = await client.get("/api/integrations/google/connect", headers=headers)
        assert resp.status_code == 503


@pytest.mark.asyncio
async def test_connect_returns_auth_url(monkeypatch):
    monkeypatch.setattr(google_oauth, "is_configured", lambda: True)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "connect@example.com")
        resp = await client.get("/api/integrations/google/connect", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "accounts.google.com" in body["auth_url"]
        assert body["state"]
        assert body["expires_in_seconds"] == 900


@pytest.mark.asyncio
async def test_callback_creates_encrypted_account(monkeypatch):
    _configure_google(monkeypatch)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "cbuser@example.com")
        flow = await _start_flow(client, headers)
        state = flow.json()["state"]

        resp = await client.get(
            f"/api/integrations/google/callback?code=xyz&state={state}",
            follow_redirects=False,
        )
        assert resp.status_code == 307

    async with async_session() as db:
        acc = (await db.execute(select(GoogleAccount))).scalars().first()
        assert acc is not None
        assert crypto.looks_encrypted(acc.encrypted_access_token)
        assert crypto.looks_encrypted(acc.encrypted_refresh_token)
        assert acc.email == "owner@example.com"
        flow_row = (await db.execute(select(OAuthFlow).where(
            OAuthFlow.state == state))).scalar_one()
        assert flow_row.consumed is True


@pytest.mark.asyncio
async def test_callback_invalid_state(monkeypatch):
    _configure_google(monkeypatch)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/integrations/google/callback?code=xyz&state=bogus",
            follow_redirects=False,
        )
        assert resp.status_code == 307
        assert "google=error" in resp.headers.get("location", "")


@pytest.mark.asyncio
async def test_multi_account_never_overwrites(monkeypatch):
    state_store = {}

    async def fake_userinfo(access_token):
        return state_store.get("userinfo", {"id": "google-1", "email": "owner@example.com", "name": "Owner"})

    _configure_google(monkeypatch)
    monkeypatch.setattr(google_oauth, "get_user_info", fake_userinfo)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "multi@example.com")
        state1 = (await _start_flow(client, headers)).json()["state"]
        await client.get(f"/api/integrations/google/callback?code=c1&state={state1}")

        state_store["userinfo"] = {"id": "google-2", "email": "other@example.com", "name": "Other"}
        state2 = (await _start_flow(client, headers)).json()["state"]
        await client.get(f"/api/integrations/google/callback?code=c2&state={state2}")

        resp = await client.get("/api/integrations/google/accounts", headers=headers)
        assert resp.status_code == 200
        accounts = resp.json()["accounts"]
        assert len(accounts) == 2
        emails = {a["email"] for a in accounts}
        assert emails == {"owner@example.com", "other@example.com"}


@pytest.mark.asyncio
async def test_accounts_response_never_exposes_tokens(monkeypatch):
    _configure_google(monkeypatch)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "safe@example.com")
        state = (await _start_flow(client, headers)).json()["state"]
        await client.get(f"/api/integrations/google/callback?code=xyz&state={state}")
        resp = await client.get("/api/integrations/google/accounts", headers=headers)
        body = resp.json()
        raw = str(body)
        assert "enc:" not in raw
        assert "access_token" not in raw
        assert "refresh_token" not in raw
        assert body["accounts"][0]["email"] == "owner@example.com"


@pytest.mark.asyncio
async def test_properties_ownership_isolated(monkeypatch):
    _configure_google(monkeypatch)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers_a = await _auth_headers(client, "owner_p@example.com", username="ownerp")
        state = (await _start_flow(client, headers_a)).json()["state"]
        await client.get(f"/api/integrations/google/callback?code=xyz&state={state}")

        headers_b = await _auth_headers(client, "intruder@example.com", username="intruder")
        resp = await client.get("/api/integrations/google/properties", headers=headers_b)
        assert resp.status_code == 404

        resp_ok = await client.get("/api/integrations/google/properties", headers=headers_a)
        assert resp_ok.status_code == 200
        props = resp_ok.json()["properties"]
        assert props == [{"siteUrl": "https://example.com", "permissionLevel": "siteFullUser"}]
        assert resp_ok.json()["account"]["email"] == "owner@example.com"


@pytest.mark.asyncio
async def test_disconnect_revokes_and_removes(monkeypatch):
    revoked = []
    async def fake_revoke(access_token):
        revoked.append(access_token)

    _configure_google(monkeypatch)
    monkeypatch.setattr(google_oauth, "revoke_token", fake_revoke)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "disc@example.com")
        state = (await _start_flow(client, headers)).json()["state"]
        await client.get(f"/api/integrations/google/callback?code=xyz&state={state}")
        accounts = (await client.get("/api/integrations/google/accounts", headers=headers)).json()["accounts"]
        account_id = accounts[0]["id"]

        resp = await client.delete(f"/api/integrations/google/accounts/{account_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["connected"] is False
        assert revoked  # revoke called with the decrypted token

        remaining = (await client.get("/api/integrations/google/accounts", headers=headers)).json()["accounts"]
        assert remaining == []
