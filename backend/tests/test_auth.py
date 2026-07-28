import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

transport = ASGITransport(app=app)


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_register():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/auth/register", json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "password123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_login():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/auth/register", json={
            "email": "login@example.com",
            "username": "loginuser",
            "password": "password123",
        })
        resp = await client.post("/api/auth/login", json={
            "email": "login@example.com",
            "password": "password123",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/auth/register", json={
            "email": "wrong@example.com",
            "username": "wronguser",
            "password": "password123",
        })
        resp = await client.post("/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_auth():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_with_token():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        reg = await client.post("/api/auth/register", json={
            "email": "me@example.com",
            "username": "meuser",
            "password": "password123",
        })
        token = reg.json()["access_token"]
        resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "me@example.com"


@pytest.mark.asyncio
async def test_duplicate_register():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/auth/register", json={
            "email": "dup@example.com",
            "username": "dupuser",
            "password": "password123",
        })
        resp = await client.post("/api/auth/register", json={
            "email": "dup@example.com",
            "username": "dupuser2",
            "password": "password123",
        })
        assert resp.status_code == 400
