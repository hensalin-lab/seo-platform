"""Tests for real-data guarantees on the Dashboard deep-scores and audit
detail pagination: scores must come from stored page data, and the audit
detail endpoint must honor offset/limit instead of hardcoded limits."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models import Audit, Page, User
from app.database import async_session

transport = ASGITransport(app=app)


async def _auth_headers(client, email):
    await client.post("/api/auth/register", json={
        "email": email, "username": email.split("@")[0], "password": "password123",
    })
    resp = await client.post("/api/auth/login", json={
        "email": email, "password": "password123",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _user_id(email: str) -> str:
    async with async_session() as db:
        user = (await db.execute(__import__("sqlalchemy").select(User).where(User.email == email))).scalar_one()
        return user.id


@pytest.mark.asyncio
async def test_audit_detail_pagination():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "paging@test.com")
        async with async_session() as db:
            audit = Audit(website_url="https://paging-test.com", status="COMPLETED", progress=100,
                          user_id=await _user_id("paging@test.com"))
            db.add(audit)
            await db.flush()
            db.add_all([
                Page(audit_id=audit.id, url="https://paging-test.com/b", status_code=200, title="B"),
                Page(audit_id=audit.id, url="https://paging-test.com/a", status_code=200, title="A"),
                Page(audit_id=audit.id, url="https://paging-test.com/c", status_code=200, title="C"),
            ])
            await db.commit()
            audit_id = audit.id

        resp = await client.get(f"/api/audit/{audit_id}?offset=1&limit=1", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_pages"] == 3
        assert data["pages_offset"] == 1
        assert data["pages_limit"] == 1
        assert len(data["pages"]) == 1
        assert data["pages"][0]["url"] == "https://paging-test.com/b"


@pytest.mark.asyncio
async def test_dashboard_deep_real_scores():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "deepscores@test.com")
        async with async_session() as db:
            audit = Audit(website_url="https://deep-test.com", status="COMPLETED", progress=100,
                          user_id=await _user_id("deepscores@test.com"))
            db.add(audit)
            await db.flush()
            db.add_all([
                Page(audit_id=audit.id, url="https://deep-test.com/", status_code=200,
                     title="Home", word_count=500, page_type="HOMEPAGE",
                     links_internal=["https://deep-test.com/about", "https://deep-test.com/contact"]),
                Page(audit_id=audit.id, url="https://deep-test.com/blog", status_code=200,
                     title="", word_count=50, page_type="BLOGPOST",
                     links_internal=[]),
            ])
            await db.commit()
            audit_id = audit.id

        resp = await client.get(f"/api/audit/{audit_id}/dashboard-deep", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "internal_links_score" in data
        assert "keyword_score" in data
        assert "page_type_distribution" in data
        assert data["page_type_distribution"] == {"HOMEPAGE": 1, "BLOGPOST": 1}

        il = data["internal_links_score"]
        kw = data["keyword_score"]
        assert isinstance(il, (int, float)) and 0 <= il <= 100
        assert isinstance(kw, (int, float)) and 0 <= kw <= 100
        # Page A holds 2 internal links with a title + depth; page B has none.
        assert il == pytest.approx(32.0)
        assert kw == pytest.approx(42.8)


@pytest.mark.asyncio
async def test_dashboard_deep_empty_audit():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "deepscores2@test.com")
        async with async_session() as db:
            audit = Audit(website_url="https://deep-empty.com", status="COMPLETED", progress=100,
                          user_id=await _user_id("deepscores2@test.com"))
            db.add(audit)
            await db.commit()
            audit_id = audit.id

        resp = await client.get(f"/api/audit/{audit_id}/dashboard-deep", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["internal_links_score"] == 0
        assert data["keyword_score"] == 0
        assert data["page_type_distribution"] == {}