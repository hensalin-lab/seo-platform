"""Tests for Slack alert preference endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.models import SlackPreference, User
from app.database import async_session

transport = ASGITransport(app=app)


async def _auth_headers(client, email, username=None):
    username = username or email.split("@")[0]
    await client.post("/api/auth/register", json={
        "email": email, "username": username, "password": "password123",
    })
    resp = await client.post("/api/auth/login", json={
        "email": email, "password": "password123",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _user_id(email: str) -> str:
    async with async_session() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        return user.id


@pytest.mark.asyncio
async def test_slack_settings_requires_auth():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/alerts/slack")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_slack_defaults_unconfigured():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "slack_user@test.com")
        resp = await client.get("/api/alerts/slack", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["configured"] is False
        assert body["enabled"] is True


@pytest.mark.asyncio
async def test_slack_save_and_delete():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "slack_user2@test.com")
        resp = await client.put("/api/alerts/slack", json={
            "webhook_url": "https://hooks.slack.com/services/T000/B000/XYZ",
            "enabled": True,
            "notify_audit_completed": True,
            "notify_audit_failed": False,
            "notify_digest": True,
        }, headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["configured"] is True
        assert body["notify_audit_failed"] is False

        resp = await client.get("/api/alerts/slack", headers=headers)
        assert resp.json()["webhook_url"] == "https://hooks.slack.com/services/T000/B000/XYZ"

        resp = await client.delete("/api/alerts/slack", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["configured"] is False

        async with async_session() as db:
            pref = (await db.execute(select(SlackPreference).where(SlackPreference.user_id == await _user_id("slack_user2@test.com")))).scalar_one_or_none()
            assert pref is None


@pytest.mark.asyncio
async def test_slack_invalid_webhook_rejected():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "slack_user3@test.com")
        resp = await client.put("/api/alerts/slack", json={
            "webhook_url": "https://example.com/not-slack",
        }, headers=headers)
        assert resp.status_code == 400
        resp = await client.post("/api/alerts/slack/test", json={
            "webhook_url": "https://example.com/not-slack",
        }, headers=headers)
        assert resp.status_code == 400


@pytest.mark.asyncio
async def test_slack_test_requires_url():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "slack_user4@test.com")
        resp = await client.post("/api/alerts/slack/test", json={"webhook_url": ""}, headers=headers)
        assert resp.status_code == 400
