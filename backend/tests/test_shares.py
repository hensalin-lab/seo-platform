"""Tests for the enterprise Phase: public share links (client portal),
admin user management, and the audit-trail (activity) feed."""
import datetime as _dt

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.models import Audit, User, AuditShareLink, ActivityLog
from app.database import async_session

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


async def _create_audit(user_id: str, url: str = "https://example.com") -> str:
    async with async_session() as db:
        audit = Audit(website_url=url, status="COMPLETED", progress=100, user_id=user_id)
        db.add(audit)
        await db.commit()
        await db.refresh(audit)
        return audit.id


async def _user_id(email: str) -> str:
    async with async_session() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        return user.id


async def _make_admin(email: str):
    async with async_session() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        user.role = "ADMIN"
        await db.commit()


async def _make_viewer(email: str):
    async with async_session() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        user.role = "VIEWER"
        await db.commit()


# ---------------------------------------------------------------------------
# Share links (client portal)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_share_requires_auth():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/shares", params={"audit_id": "x"})
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_share_audit_not_found():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "share_missing@test.com")
        resp = await client.post("/api/shares", params={"audit_id": "no-such-audit"}, headers=headers)
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_and_public_view_share():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "owner2@test.com")
        owner_id = await _user_id("owner2@test.com")
        audit_id = await _create_audit(owner_id)
        resp = await client.post("/api/shares", params={"audit_id": audit_id, "days": 7}, headers=headers)
        assert resp.status_code == 200
        token = resp.json()["token"]
        assert resp.json()["url"] == f"/share/{token}"

        # Public view: no auth required, returns report payload
        pub = await client.get(f"/api/share/{token}")
        assert pub.status_code == 200
        body = pub.json()
        assert body["audit_id"] == audit_id
        assert body["website_url"] == "https://example.com"
        assert "report" in body
        assert "site_summary" in body["report"]

        # view count incremented after public access
        async with async_session() as db:
            link = (await db.execute(select(AuditShareLink).where(AuditShareLink.token == token))).scalar_one()
            assert link.views == 1


@pytest.mark.asyncio
async def test_share_not_found_after_revoke():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "owner3@test.com")
        audit_id = await _create_audit(await _user_id("owner3@test.com"))
        created = await client.post("/api/shares", params={"audit_id": audit_id}, headers=headers)
        token = created.json()["token"]

        rev = await client.delete(f"/api/shares/{token}", headers=headers)
        assert rev.status_code == 200
        assert rev.json()["status"] == "revoked"

        pub = await client.get(f"/api/share/{token}")
        assert pub.status_code == 404


@pytest.mark.asyncio
async def test_share_expired_returns_410():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "owner4@test.com")
        audit_id = await _create_audit(await _user_id("owner4@test.com"))
        created = await client.post("/api/shares", params={"audit_id": audit_id, "days": 30}, headers=headers)
        token = created.json()["token"]

        async with async_session() as db:
            link = (await db.execute(select(AuditShareLink).where(AuditShareLink.token == token))).scalar_one()
            link.expires_at = _dt.datetime.utcnow() - _dt.timedelta(hours=1)
            await db.commit()

        pub = await client.get(f"/api/share/{token}")
        assert pub.status_code == 410


@pytest.mark.asyncio
async def test_share_owner_cannot_revoke_others():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        h_a = await _auth_headers(client, "owner5@test.com")
        h_b = await _auth_headers(client, "other5@test.com")
        audit_id = await _create_audit(await _user_id("owner5@test.com"))
        created = await client.post("/api/shares", params={"audit_id": audit_id}, headers=h_a)
        token = created.json()["token"]

        resp = await client.delete(f"/api/shares/{token}", headers=h_b)
        assert resp.status_code == 403

        # still live
        pub = await client.get(f"/api/share/{token}")
        assert pub.status_code == 200


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_stats_requires_admin():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "viewer_admin1@test.com")
        await _make_viewer("viewer_admin1@test.com")  # ensure role is VIEWER
        resp = await client.get("/api/admin/stats", headers=headers)
        assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_stats_and_users():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "realadmin@test.com")
        await _make_admin("realadmin@test.com")

        stats = await client.get("/api/admin/stats", headers=headers)
        assert stats.status_code == 200
        assert "total_users" in stats.json()
        assert stats.json()["total_users"] >= 1

        users = await client.get("/api/admin/users", headers=headers)
        assert users.status_code == 200
        body = users.json()
        assert "total" in body and "items" in body
        assert any(u["email"] == "realadmin@test.com" for u in body["items"])


@pytest.mark.asyncio
async def test_admin_can_change_role_and_deactivate():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "boss@test.com")
        await _make_admin("boss@test.com")
        await _auth_headers(client, "target_user@test.com")

        async with async_session() as db:
            target = (await db.execute(select(User).where(User.email == "target_user@test.com"))).scalar_one()
            target_id = target.id

        upd = await client.patch(f"/api/admin/users/{target_id}", json={"role": "EDITOR"}, headers=headers)
        assert upd.status_code == 200
        assert upd.json()["role"] == "EDITOR"

        deact = await client.patch(f"/api/admin/users/{target_id}", json={"is_active": False}, headers=headers)
        assert deact.status_code == 200
        assert deact.json()["is_active"] is False


@pytest.mark.asyncio
async def test_admin_cannot_demote_or_deactivate_self():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "lonelyadmin@test.com")
        await _make_admin("lonelyadmin@test.com")

        async with async_session() as db:
            me = (await db.execute(select(User).where(User.email == "lonelyadmin@test.com"))).scalar_one()
            my_id = me.id

        demote = await client.patch(f"/api/admin/users/{my_id}", json={"role": "VIEWER"}, headers=headers)
        assert demote.status_code == 400

        deact = await client.patch(f"/api/admin/users/{my_id}", json={"is_active": False}, headers=headers)
        assert deact.status_code == 400


@pytest.mark.asyncio
async def test_invalid_role_rejected():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "validadmin@test.com")
        await _make_admin("validadmin@test.com")

        async with async_session() as db:
            target = (await db.execute(select(User).where(User.email == "validadmin@test.com"))).scalar_one()

        resp = await client.patch(f"/api/admin/users/{target.id}", json={"role": "SUPERUSER"}, headers=headers)
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Activity trail
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_activity_logged_on_share_create_and_viewed():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "actuser@test.com")
        audit_id = await _create_audit(await _user_id("actuser@test.com"))

        await client.post("/api/shares", params={"audit_id": audit_id, "days": 14}, headers=headers)

        feed = await client.get("/api/activity", headers=headers)
        assert feed.status_code == 200
        actions = [i["action"] for i in feed.json()["items"]]
        assert "share.created" in actions
        assert any(i["entity_id"] == audit_id for i in feed.json()["items"] if i["action"] == "share.created")


@pytest.mark.asyncio
async def test_admin_activity_feed():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "actadmin@test.com")
        await _make_admin("actadmin@test.com")
        resp = await client.get("/api/admin/activity", headers=headers)
        assert resp.status_code == 200
        assert "total" in resp.json() and "items" in resp.json()


@pytest.mark.asyncio
async def test_login_logs_activity():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "loginact@test.com")
        feed = await client.get("/api/activity", headers=headers)
        actions = [i["action"] for i in feed.json()["items"]]
        assert "auth.logged_in" in actions
