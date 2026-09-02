"""Tests for Phase 2 provider scaffolding: registry, keyless fallbacks,
provider config API, brand monitor, and keyword volumes."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.engine.providers import (
    KeylessCitationProvider,
    KeylessSerpProvider,
    KeylessVolumeEstimator,
    build_provider,
    effective_config,
    full_status,
    is_configured,
    resolve_for_capability,
)
from app.engine import providers as providers_mod

transport = ASGITransport(app=app)


class FakePage:
    def __init__(self, url="https://example.com/page-a", title="SEO Guide", h1="SEO Guide",
                 content_text="How to do SEO audit best practices ", word_count=900,
                 html_raw="", schema_markup=None, status_code=200):
        self.url = url
        self.title = title
        self.h1 = h1
        self.content_text = content_text
        self.word_count = word_count
        self.html_raw = html_raw
        self.schema_markup = schema_markup or []
        self.status_code = status_code


class FakeAudit:
    website_url = "https://example.com"


async def _register(client, email):
    await client.post("/api/auth/register", json={
        "email": email, "username": email.split("@")[0], "password": "password123",
    })
    resp = await client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ---------------- Registry unit tests ----------------

def test_keyless_providers_always_configured():
    for st in full_status({}):
        if st["name"].startswith("keyless"):
            assert st["configured"] is True
        else:
            assert st["configured"] is False
            assert st["source"] == "none"


def test_resolve_without_keys_uses_keyless():
    for cap in ("keyword_volume", "serp_ranks", "backlinks", "ai_citations"):
        resolved = resolve_for_capability(cap, {})
        assert resolved["configured"] is False
        assert resolved["provider"].startswith("keyless")


def test_resolve_dataforseo_when_configured():
    cfg = {"dataforseo": {"login": "u", "password": "p"}}
    assert resolve_for_capability("keyword_volume", cfg)["provider"] == "dataforseo"
    assert resolve_for_capability("backlinks", cfg)["provider"] == "dataforseo"
    assert resolve_for_capability("serp_ranks", cfg)["provider"] == "dataforseo"


def test_effective_config_override():
    merged = effective_config("dataforseo", {"login": "user-key", "password": "user-pass"})
    assert merged["login"] == "user-key"
    assert merged["password"] == "user-pass"


@pytest.mark.asyncio
async def test_keyless_volume_estimator():
    prov = KeylessVolumeEstimator()
    res = await prov.get_volume("best seo tools")
    assert res["source"] == "keyless_volume"
    assert res["volume"] >= 0
    assert res["keyword"] == "best seo tools"


@pytest.mark.asyncio
async def test_keyless_serp_provider():
    prov = KeylessSerpProvider()
    pages = [FakePage()]
    res = await prov.live_position("seo audit", "example.com", pages=pages, audit=FakeAudit())
    assert res["source"] == "estimated"


@pytest.mark.asyncio
async def test_keyless_citation_provider():
    prov = KeylessCitationProvider()
    pages = [FakePage(url="https://example.com/", title="Example Brand - SEO Guide")]
    res = await prov.analyze("Example Brand", {"pages": pages, "audit": FakeAudit()})
    assert res["mention_count"] >= 0
    assert res["provider"] == "keyless_citations"
    assert "citation_estimate" in res


@pytest.mark.asyncio
async def test_keyless_test_dispatcher():
    res = await providers_mod.test_provider("keyless_volume", {})
    assert res["ok"] is True


def test_build_provider_unknown_raises():
    with pytest.raises(ValueError):
        build_provider("keyword_volume", "does_not_exist", {})


def test_is_configured_secrets():
    assert is_configured("serpapi", {"api_key": "abc"}) is True
    assert is_configured("serpapi", {}) is False


# ---------------- API integration tests ----------------

@pytest.mark.asyncio
async def test_provider_api_flow():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register(client, "providers@example.com")

        listing = await client.get("/api/providers", headers=headers)
        assert listing.status_code == 200
        body = listing.json()
        names = [p["name"] for p in body["providers"]]
        assert "serpapi" in names and "keyless_serp" in names
        assert body["resolved"]["serp_ranks"]["provider"] == "keyless_serp"

        fields = await client.get("/api/providers/serpapi/fields", headers=headers)
        assert fields.status_code == 200
        assert any(f["key"] == "api_key" for f in fields.json()["config_fields"])

        saved = await client.put("/api/providers/serpapi", json={"config": {"api_key": "testkey123"}}, headers=headers)
        assert saved.status_code == 200
        assert saved.json()["configured"] is True

        listing2 = await client.get("/api/providers", headers=headers)
        serp = next(p for p in listing2.json()["providers"] if p["name"] == "serpapi")
        assert serp["configured"] is True
        assert serp["source"] == "user"
        assert listing2.json()["resolved"]["serp_ranks"]["provider"] == "serpapi"

        tested = await client.post("/api/providers/serpapi/test", json={}, headers=headers)
        assert tested.status_code == 200
        assert tested.json()["ok"] is False  # invalid key, but request handled

        removed = await client.delete("/api/providers/serpapi", headers=headers)
        assert removed.status_code == 200

        listing3 = await client.get("/api/providers", headers=headers)
        serp = next(p for p in listing3.json()["providers"] if p["name"] == "serpapi")
        assert serp["configured"] is False

        caps = await client.get("/api/providers/capabilities", headers=headers)
        assert caps.status_code == 200
        assert "keyword_volume" in caps.json()["capabilities"]


@pytest.mark.asyncio
async def test_provider_test_unknown_404():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register(client, "prov2@example.com")
        r = await client.post("/api/providers/nope/test", json={}, headers=headers)
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_brand_monitor_and_keyword_volumes():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register(client, "brand@example.com")

        demo = await client.post("/api/demo", headers=headers)
        audit_id = demo.json()["audit_id"]

        monitor = await client.get(f"/api/audit/{audit_id}/brand-monitor", headers=headers)
        assert monitor.status_code == 200, monitor.text
        m = monitor.json()
        assert m["brand"]
        assert m["provider"] == "keyless_citations"
        assert 0 <= m["citation_estimate"] <= 100

        history = await client.get(f"/api/audit/{audit_id}/brand-monitor/history", headers=headers)
        assert history.status_code == 200
        assert len(history.json()["records"]) >= 1

        volumes = await client.get(f"/api/audit/{audit_id}/keyword-volumes?limit=10", headers=headers)
        assert volumes.status_code == 200, volumes.text
        v = volumes.json()
        assert v["provider"] == "keyless_volume"
        assert isinstance(v["volumes"], list)


@pytest.mark.asyncio
async def test_rankings_capture_uses_keyless_provider():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register(client, "rankpro@example.com")

        demo = await client.post("/api/demo", headers=headers)
        audit_id = demo.json()["audit_id"]

        captured = await client.post(f"/api/audit/{audit_id}/rankings/capture", json={"keywords": ["seo audit", "backlinks"]}, headers=headers)
        assert captured.status_code == 200, captured.text
        body = captured.json()
        assert body["mode"] in ("estimated", "keyless_serp", "unmeasured") or body["mode"].startswith("keyless")
        assert body["total"] >= 1
        for r in body["rankings"]:
            assert r["source"] != "dataforseo"
            if not body["configured"]:
                assert r["position"] is None, "Unkeyed capture must not fabricate a rank position"
                assert r["source"] == "unmeasured"
