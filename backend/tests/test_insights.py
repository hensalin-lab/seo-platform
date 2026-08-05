"""Tests for advanced insights: drift, hreflang, redirects, duplicates,
domain authority, JS dependency, content briefs, usage, demo, uptime,
and workspaces."""
import datetime as _dt

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.engine.advanced_insights import (
    analyze_hreflang,
    analyze_redirects,
    analyze_duplicates,
    analyze_js_dependency,
    build_content_briefs,
    compute_domain_authority,
    _cluster_name,
    _norm_href,
)

transport = ASGITransport(app=app)


class FakePage:
    def __init__(self, url="https://example.com/a", title="Page A", content_hash="h1",
                 word_count=800, signals=None, status_code=200):
        self.url = url
        self.title = title
        self.content_hash = content_hash
        self.word_count = word_count
        self.signals = signals or {}
        self.status_code = status_code


class FakeScore:
    overall_score = 80.0
    technical_score = 75.0


class FakeAudit:
    website_url = "https://example.com"


# ---------------- Engine unit tests ----------------


def test_norm_href_handles_trailing_slash_and_case():
    assert _norm_href("https://Example.com/Page/") == "https://example.com/Page"
    assert _norm_href("https://example.com") == "https://example.com"


def test_cluster_name_ignores_stopwords():
    assert _cluster_name("how to fix the roof quickly") == "fix"
    assert _cluster_name("roofing services") == "roofing"


def test_analyze_hreflang_detects_invalid_codes_and_missing_x_default():
    pages = [
        FakePage(
            url="https://example.com/",
            signals={
                "hreflang_tags": [
                    {"hreflang": "en", "href": "https://example.com/"},
                    {"hreflang": "es-mx", "href": "https://example.com/es/"},
                    {"hreflang": "not-a-locale", "href": "https://example.com/xx/"},
                ],
                "hreflang_x_default": False,
            },
        )
    ]
    result = analyze_hreflang(pages, "https://example.com")
    assert result["has_hreflang"] is True
    assert result["coverage"] == 100.0
    types = {i["type"] for i in result["issues"]}
    assert "invalid_hreflang_code" in types
    assert "missing_x_default" in types
    assert result["language_count"] == 2


def test_analyze_redirects_detects_chains_and_https():
    pages = [
        FakePage(
            url="http://example.com/old",
            signals={"redirect_chain": ["http://example.com/old", "https://example.com/new", "https://example.com/new-final"]},
            status_code=200,
        )
    ]
    result = analyze_redirects(pages)
    assert result["total_redirects"] == 1
    assert result["records"][0]["is_chain"] is True
    assert result["records"][0]["http_to_https"] is True
    assert result["records"][0]["chain_length"] == 3
    assert any(i["type"] == "redirect_chain" for i in result["issues"])


def test_analyze_duplicates_groups_content_and_titles():
    pages = [
        FakePage(url="https://example.com/a", title="Same Title", content_hash="hash-x"),
        FakePage(url="https://example.com/b", title="Same Title", content_hash="hash-x"),
        FakePage(url="https://example.com/c", title="Same Title", content_hash="hash-y"),
        FakePage(url="https://example.com/d", title="Unique", content_hash="hash-z"),
    ]
    result = analyze_duplicates(pages)
    assert result["total_groups"] == 2
    kinds = {g["kind"] for g in result["groups"]}
    assert kinds == {"content", "title"}


def test_analyze_js_dependency_flags_js_only_pages():
    pages = [
        FakePage(url="https://example.com/app", word_count=0, signals={
            "js_signals": {"content_empty_with_js": True, "framework": "next.js", "script_count": 8},
        }),
        FakePage(url="https://example.com/static", word_count=900, signals={
            "js_signals": {"content_empty_with_js": False, "framework": "none"},
        }),
    ]
    result = analyze_js_dependency(pages)
    assert result["js_only_count"] == 1
    assert result["risk_score"] == 50.0
    assert result["frameworks"].get("next.js") == 1


def test_compute_domain_authority_heuristic():
    result = compute_domain_authority(
        FakeAudit(), [FakePage(url="https://example.com", title="Example Home"), FakePage()],
        FakeScore(), [], [], [],
    )
    assert 0 <= result["score"] <= 100
    assert "factors" in result
    assert result["method"] == "heuristic (keyless)"


def test_build_content_briefs_generates_clusters_and_briefs():
    class FakeKD:
        top_keywords = [{"keyword": "seo audit tool", "opportunity": "HIGH"}]
        keyword_opportunities = []
        keyword_clusters = []
        content_gaps = []
        missing_keywords = []

    class FakeCD:
        pass

    result = build_content_briefs(FakeKD(), FakeCD(), [FakePage(url="https://example.com/seo-audit", title="SEO Audit Tool Guide")])
    assert result["clusters"]
    assert result["briefs"]
    assert result["briefs"][0]["target_keyword"] == "seo audit tool"
    assert result["briefs"][0]["outline"]


# ---------------- API integration tests ----------------


async def _register(client, email):
    await client.post("/api/auth/register", json={
        "email": email, "username": email.split("@")[0], "password": "password123",
    })
    resp = await client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.asyncio
async def test_demo_usage_and_public_info():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register(client, "insights@example.com")

        demo = await client.post("/api/demo", headers=headers)
        assert demo.status_code == 200, demo.text
        audit_id = demo.json()["audit_id"]

        usage = await client.get("/api/usage?days=30", headers=headers)
        assert usage.status_code == 200
        assert usage.json()["total_events"] >= 1

        info = await client.get("/api/public/info", headers=headers)
        assert info.status_code == 200
        assert "audits" in info.json()["resources"]

        redirects = await client.get(f"/api/audit/{audit_id}/redirects", headers=headers)
        assert redirects.status_code == 200
        duplicates = await client.get(f"/api/audit/{audit_id}/duplicates", headers=headers)
        assert duplicates.status_code == 200
        da = await client.get(f"/api/audit/{audit_id}/domain-authority", headers=headers)
        assert da.status_code == 200
        assert 0 <= da.json()["score"] <= 100
        briefs = await client.get(f"/api/audit/{audit_id}/content-briefs", headers=headers)
        assert briefs.status_code == 200
        assert "clusters" in briefs.json()
        jsd = await client.get(f"/api/audit/{audit_id}/js-dependency", headers=headers)
        assert jsd.status_code == 200


@pytest.mark.asyncio
async def test_drift_requires_two_audits():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register(client, "drift@example.com")
        demo1 = await client.post("/api/demo", headers=headers)
        demo2 = await client.post("/api/demo", headers=headers)

        drift = await client.get(f"/api/audit/{demo2.json()['audit_id']}/drift", headers=headers)
        assert drift.status_code == 200, drift.text
        body = drift.json()
        assert body["available"] is True
        assert "score_delta" in body["summary"]
        assert body["summary"]["previous_audit_id"] == demo1.json()["audit_id"]


@pytest.mark.asyncio
async def test_uptime_targets_crud():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register(client, "uptime@example.com")

        created = await client.post("/api/uptime/targets", json={
            "name": "Homepage", "url": "https://example.com", "interval_minutes": 5,
        }, headers=headers)
        assert created.status_code == 200, created.text
        target_id = created.json()["id"]

        listed = await client.get("/api/uptime/targets", headers=headers)
        assert any(t["id"] == target_id for t in listed.json()["targets"])

        checks = await client.get(f"/api/uptime/targets/{target_id}/checks", headers=headers)
        assert checks.status_code == 200
        assert "checks" in checks.json()

        updated = await client.put(f"/api/uptime/targets/{target_id}", json={
            "name": "Homepage v2", "url": "https://example.com", "interval_minutes": 10,
        }, headers=headers)
        assert updated.json()["interval_minutes"] == 10

        deleted = await client.delete(f"/api/uptime/targets/{target_id}", headers=headers)
        assert deleted.status_code == 200


@pytest.mark.asyncio
async def test_uptime_target_requires_valid_url():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register(client, "uptime2@example.com")
        resp = await client.post("/api/uptime/targets", json={
            "name": "Bad", "url": "ftp://example.com", "interval_minutes": 5,
        }, headers=headers)
        assert resp.status_code == 422


@pytest.mark.asyncio
async def test_workspaces_flow():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register(client, "wsws@example.com")

        demo = await client.post("/api/demo", headers=headers)
        audit_id = demo.json()["audit_id"]

        created = await client.post("/api/workspaces", json={"name": "Client A"}, headers=headers)
        assert created.status_code == 200, created.text
        ws_id = created.json()["id"]

        assigned = await client.post(f"/api/workspaces/{ws_id}/audits", json={"audit_ids": [audit_id]}, headers=headers)
        assert assigned.status_code == 200
        assert assigned.json()["added"] == 1

        audits = await client.get(f"/api/workspaces/{ws_id}/audits", headers=headers)
        assert any(a["id"] == audit_id for a in audits.json()["audits"])

        members = await client.get(f"/api/workspaces/{ws_id}/members", headers=headers)
        assert len(members.json()["members"]) == 1
        assert members.json()["members"][0]["role"] == "owner"

        second_headers = await _register(client, "ws2user@example.com")
        added = await client.post(f"/api/workspaces/{ws_id}/members", json={
            "email": "ws2user@example.com", "role": "viewer",
        }, headers=headers)
        assert added.status_code == 200

        denied = await client.get(f"/api/workspaces/{ws_id}/audits", headers=second_headers)
        assert denied.status_code == 403

        removed = await client.delete(f"/api/workspaces/{ws_id}/audits/{audit_id}", headers=headers)
        assert removed.status_code == 200

        deleted = await client.delete(f"/api/workspaces/{ws_id}", headers=headers)
        assert deleted.status_code == 200


@pytest.mark.asyncio
async def test_insights_require_auth():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        assert (await client.get("/api/usage")).status_code == 401
        assert (await client.get("/api/uptime/targets")).status_code == 401
        assert (await client.get("/api/workspaces")).status_code == 401
        assert (await client.get("/api/public/info")).status_code == 401
