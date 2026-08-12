"""Tests for Phase B historical trends: AuditSnapshot persistence and the
GET /api/audit/{id}/trends?metric=X endpoint.

Each test uses a unique website_url so session-scoped test DB pollution is
impossible (the endpoint scopes its series by site)."""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.models import Audit, AuditSnapshot, User
from app.database import async_session

transport = ASGITransport(app=app)

SCORES = {
    "overall_score": 71.0, "seo_score": 82.0, "technical_score": 65.0,
    "aeo_score": 78.0, "geo_score": 74.0, "content_score": 69.0,
    "ai_visibility_score": 60.0,
}


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


async def _create_audit(email: str, user_id: str, site: str) -> str:
    async with async_session() as db:
        audit = Audit(website_url=site, status="COMPLETED",
                      progress=100, user_id=user_id)
        db.add(audit)
        await db.flush()
        await db.commit()
        return audit.id


async def _add_snapshot(audit_id: str, website_url: str, **overrides):
    values = dict(SCORES)
    values.update(overrides)
    async with async_session() as db:
        snap = AuditSnapshot(audit_id=audit_id, website_url=website_url, **values)
        db.add(snap)
        await db.commit()
        return snap.id


# ---------------- Model + persistence ----------------

@pytest.mark.asyncio
async def test_one_snapshot_per_audit_but_many_per_site():
    email, site = "snap_model@test.com", "https://trends-model.test"
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, email)
        uid = await _user_id(email)
        audit1 = await _create_audit(email, uid, site)
        audit2 = await _create_audit(email, uid, site)
        await _add_snapshot(audit1, site, snapshot_type="initial")
        await _add_snapshot(audit2, site, snapshot_type="rerun")

    async with async_session() as db:
        rows = (await db.execute(
            select(AuditSnapshot).where(AuditSnapshot.website_url == site)
        )).scalars().all()
        assert len(rows) == 2
        assert rows[0].audit_id != rows[1].audit_id
        assert rows[0].overall_score == 71.0
        assert {r.snapshot_type for r in rows} == {"initial", "rerun"}


@pytest.mark.asyncio
async def test_snapshot_without_an_audit_is_rejected():
    # audit_id is unique + FK'd: a stray id must not silently create a row.
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "snap_fk@test.com")
        resp = await client.get("/api/audit/00000000-0000-0000-0000-000000000000/trends", headers=headers)
        assert resp.status_code == 404


# ---------------- Endpoint ----------------

@pytest.mark.asyncio
async def test_trends_missing_audit_404():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "trends_missing@test.com")
        resp = await client.get("/api/audit/no-such/trends", headers=headers)
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_trends_empty_state_no_snapshots():
    email, site = "trends_empty@test.com", "https://trends-empty.test"
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, email)
        audit_id = await _create_audit(email, await _user_id(email), site)

        resp = await client.get(f"/api/audit/{audit_id}/trends", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["snapshot_count"] == 0
        assert body["enough_data"] is False
        assert body["data_points"] == []
        assert body["change"] is None


@pytest.mark.asyncio
async def test_trends_single_snapshot_not_enough_data():
    email, site = "trends_one@test.com", "https://trends-one.test"
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, email)
        audit_id = await _create_audit(email, await _user_id(email), site)
        await _add_snapshot(audit_id, site)

        resp = await client.get(f"/api/audit/{audit_id}/trends", headers=headers)
        body = resp.json()
        assert body["snapshot_count"] == 1
        assert body["enough_data"] is False
        assert len(body["data_points"]) == 1
        assert body["data_points"][0]["value"] == 71.0


@pytest.mark.asyncio
async def test_trends_time_series_and_change():
    email, site = "trends_series@test.com", "https://trends-series.test"
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, email)
        uid = await _user_id(email)
        audit1 = await _create_audit(email, uid, site)
        audit2 = await _create_audit(email, uid, site)
        audit3 = await _create_audit(email, uid, site)
        await _add_snapshot(audit1, site, overall_score=60.0)
        await _add_snapshot(audit2, site, overall_score=70.0)
        await _add_snapshot(audit3, site, overall_score=80.0)

        resp = await client.get(f"/api/audit/{audit3}/trends", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["snapshot_count"] == 3
        assert body["enough_data"] is True
        values = [p["value"] for p in body["data_points"]]
        assert values == [60.0, 70.0, 80.0]
        assert body["change"]["value"] == 10.0
        assert body["change"]["direction"] == "up"
        assert body["metric"] == "overall"
        assert body["website_url"] == site


@pytest.mark.asyncio
async def test_trends_metric_selector():
    email, site = "trends_metric@test.com", "https://trends-metric.test"
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, email)
        uid = await _user_id(email)
        audit1 = await _create_audit(email, uid, site)
        audit2 = await _create_audit(email, uid, site)
        await _add_snapshot(audit1, site, seo_score=50.0)
        await _add_snapshot(audit2, site, seo_score=90.0)

        resp = await client.get(f"/api/audit/{audit2}/trends", params={"metric": "seo"}, headers=headers)
        body = resp.json()
        assert body["metric"] == "seo"
        assert [p["value"] for p in body["data_points"]] == [50.0, 90.0]
        assert body["change"]["value"] == 40.0

        resp = await client.get(f"/api/audit/{audit2}/trends", params={"metric": "technical"}, headers=headers)
        body = resp.json()
        assert [p["value"] for p in body["data_points"]] == [65.0, 65.0]
        assert body["change"]["direction"] == "flat"


@pytest.mark.asyncio
async def test_trends_invalid_metric_422():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "trends_bad@test.com")
        audit_id = await _create_audit("trends_bad@test.com", await _user_id("trends_bad@test.com"), "https://trends-bad.test")
        resp = await client.get(f"/api/audit/{audit_id}/trends", params={"metric": "nonsense"}, headers=headers)
        assert resp.status_code == 422


@pytest.mark.asyncio
async def test_trends_snapshots_scoped_to_same_site():
    email, site_a, site_b = "trends_scope@test.com", "https://trends-a.test", "https://trends-b.test"
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, email)
        uid = await _user_id(email)
        audit_a = await _create_audit(email, uid, site_a)
        audit_b = await _create_audit(email, uid, site_b)
        await _add_snapshot(audit_a, site_a, overall_score=60.0)
        await _add_snapshot(audit_b, site_b, overall_score=95.0)

        resp = await client.get(f"/api/audit/{audit_a}/trends", headers=headers)
        body = resp.json()
        # The other site's snapshot must not leak into this trend series.
        assert body["snapshot_count"] == 1
        assert body["data_points"][0]["value"] == 60.0
