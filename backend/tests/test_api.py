import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

transport = ASGITransport(app=app)


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_root():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/")
        assert resp.status_code == 200
        assert "docs" in resp.json()


@pytest.mark.asyncio
async def test_history_empty():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/audit/history")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_audit_not_found():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/audit/nonexistent")
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_webhooks_requires_auth():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/webhooks")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_scheduled_requires_auth():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/scheduled")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_whitelabel_requires_auth():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/whitelabel")
        assert resp.status_code == 401
