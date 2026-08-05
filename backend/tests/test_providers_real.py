"""Tests for the real (measured-data) provider implementations: Moz, SE Ranking,
Profound, DataForSEO LLM citations, and GSC OAuth. HTTP is mocked so no keys or
network are required."""
import json
from unittest import mock

import pytest

from app.engine import providers as providers_mod
from app.engine.providers import (
    DataForSEOCitationProvider,
    GscOAuthProvider,
    MozBacklinkProvider,
    ProfoundCitationProvider,
    SeRankingCitationProvider,
    SeRankingVolumeProvider,
    build_provider,
    is_configured,
    resolve_for_capability,
)


class FakeResponse:
    def __init__(self, payload, status=200):
        self._payload = payload
        self.status_code = status
        self.text = json.dumps(payload)

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, **kwargs):
        self.calls.append(("GET", url, kwargs))
        return self._route(url)

    async def post(self, url, **kwargs):
        self.calls.append(("POST", url, kwargs))
        return self._route(url)

    async def request(self, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        return self._route(url)

    def _route(self, url):
        for sub in sorted(self.routes, key=len, reverse=True):
            if sub in url:
                return self.routes[sub]
        return FakeResponse({"error": "not found"}, status=404)


class FakeAudit:
    website_url = "https://example.com"


def _patch(routes):
    return mock.patch(
        "app.engine.providers.httpx.AsyncClient",
        lambda *a, **k: FakeAsyncClient(routes),
    )


# ---------------- Moz ----------------

@pytest.mark.asyncio
async def test_moz_backlink_summary():
    routes = {"url_metrics": FakeResponse({
        "domain_authority": 42, "page_authority": 37,
        "external_pages": 120, "linking_domains": 30, "spam_score": 2,
    })}
    with _patch(routes):
        prov = MozBacklinkProvider({"access_id": "aid", "secret_key": "sk"})
        res = await prov.summary("example.com")
    assert res["source"] == "moz"
    assert res["domain_authority"] == 42
    assert res["backlinks_count"] == 120
    assert res["referring_domains"] == 30


@pytest.mark.asyncio
async def test_moz_test_ok():
    with _patch({"url_metrics": FakeResponse({"domain_authority": 1})}):
        prov = MozBacklinkProvider({"access_id": "aid", "secret_key": "sk"})
        res = await prov.test()
    assert res["ok"] is True


# ---------------- SE Ranking ----------------

@pytest.mark.asyncio
async def test_se_ranking_volume():
    routes = {"/keywords/export": FakeResponse({
        "total": 1,
        "keywords": [{"keyword": "seo audit", "volume": 3200, "cpc": 12.5, "difficulty": 45}],
    })}
    with _patch(routes):
        prov = SeRankingVolumeProvider({"token": "t"})
        res = await prov.get_volume("seo audit")
    assert res["source"] == "se_ranking"
    assert res["volume"] == 3200
    assert res["competition"] == 45


@pytest.mark.asyncio
async def test_se_ranking_citations():
    routes = {"/ai-search/prompts-by-brand": FakeResponse({
        "total": 7,
        "prompts": [{"engine": "ChatGPT", "text": "..."}, {"search_engine": "Perplexity", "text": "..."}],
    })}
    with _patch(routes):
        prov = SeRankingCitationProvider({"token": "t"})
        res = await prov.analyze("Example", {"pages": [], "audit": FakeAudit()})
    assert res["provider"] == "se_ranking"
    assert res["mention_count"] == 7
    assert "ChatGPT" in res["engines"] and "Perplexity" in res["engines"]


# ---------------- Profound ----------------

@pytest.mark.asyncio
async def test_profound_citations():
    routes = {
        "/v1/org/categories": FakeResponse({"data": [{"id": "cat-1"}]}),
        "/v2/reports/citations": FakeResponse({
            "info": {"models": ["ChatGPT"], "start_date": "2026-07-01", "end_date": "2026-07-31"},
            "data": [
                {"domain": "example.com", "rank": 1, "count": 12, "citation_share": 0.04},
                {"domain": "reddit.com", "rank": 2, "count": 90, "citation_share": 0.02},
            ],
        }),
    }
    with _patch(routes):
        prov = ProfoundCitationProvider({"api_key": "k"})
        res = await prov.analyze("Example", {"pages": [], "audit": FakeAudit()})
    assert res["provider"] == "profound"
    assert res["mention_count"] == 102
    assert res["citation_share"] == 4.0
    assert res["citation_rank"] == 1


# ---------------- DataForSEO citations ----------------

@pytest.mark.asyncio
async def test_dataforseo_citations():
    routes = {"llm_responses": FakeResponse({"tasks": [{
        "result": [{
            "llm_response": "SEO Platform is a leader in this space.",
            "citations": [{"url": "https://example.com"}],
        }],
    }]})}
    with _patch(routes):
        prov = DataForSEOCitationProvider({"login": "u", "password": "p"})
        res = await prov.analyze("SEO Platform", {"pages": [], "audit": None})
    assert res["provider"] == "dataforseo"
    assert res["mention_count"] == 1
    assert res["citations"][0] == "https://example.com"


# ---------------- GSC OAuth ----------------

@pytest.mark.asyncio
async def test_gsc_oauth_search_analytics():
    routes = {
        "/sites": FakeResponse({"siteEntry": [
            {"siteUrl": "sc-domain:example.com"},
            {"siteUrl": "https://example.com/"},
        ]}),
        "/searchAnalytics/query": FakeResponse({"rows": [
            {"keys": ["https://example.com/", "seo audit"], "clicks": 10, "impressions": 100, "ctr": 0.1, "position": 3.5},
        ]}),
    }
    with _patch(routes):
        prov = GscOAuthProvider({"oauth_access_token": "at", "oauth_email": "u@example.com"})
        res = await prov.get_search_analytics("example.com")
    assert res["total_clicks"] == 10
    assert res["rows"][0]["query"] == "seo audit"


@pytest.mark.asyncio
async def test_gsc_oauth_refreshes_and_persists():
    refreshed = {}

    async def persist(cfg):
        refreshed.update(cfg)

    routes = {
        "oauth2.googleapis.com/token": FakeResponse({"access_token": "new-token", "expires_in": 3600}),
        "/sites": FakeResponse({"siteEntry": [{"siteUrl": "https://example.com/"}]}),
        "/searchAnalytics/query": FakeResponse({"rows": []}),
    }
    with _patch(routes):
        prov = GscOAuthProvider({"oauth_refresh_token": "rt", "oauth_client_id": "cid", "oauth_client_secret": "cs"})
        prov.persist_cb = persist
        res = await prov.get_search_analytics("example.com")
    assert res["total_clicks"] == 0
    assert prov.cfg["oauth_access_token"] == "new-token"
    assert refreshed.get("oauth_access_token") == "new-token"


@pytest.mark.asyncio
async def test_gsc_oauth_resolve_property_matches_host():
    routes = {"/sites": FakeResponse({"siteEntry": [
        {"siteUrl": "sc-domain:other.com"},
        {"siteUrl": "https://example.com/"},
    ]})}
    with _patch(routes):
        prov = GscOAuthProvider({"oauth_access_token": "at"})
        site = await prov.resolve_property("https://www.example.com")
    assert site == "https://example.com/"


# ---------------- Registry integration ----------------

def test_resolve_ai_citations_prefers_profound():
    cfg = {"profound": {"api_key": "k"}}
    assert resolve_for_capability("ai_citations", cfg)["provider"] == "profound"


def test_resolve_ai_citations_se_ranking_second():
    cfg = {"se_ranking": {"token": "t"}}
    assert resolve_for_capability("ai_citations", cfg)["provider"] == "se_ranking"


def test_resolve_keyword_volume_se_ranking():
    cfg = {"se_ranking": {"token": "t"}}
    assert resolve_for_capability("keyword_volume", cfg)["provider"] == "se_ranking"


def test_resolve_backlinks_moz():
    cfg = {"moz": {"access_id": "a", "secret_key": "s"}}
    assert resolve_for_capability("backlinks", cfg)["provider"] == "moz"


def test_is_configured_gsc_oauth():
    assert is_configured("gsc", {"oauth_refresh_token": "x"}) is True
    assert is_configured("gsc", {"oauth_access_token": "x"}) is True
    assert is_configured("gsc", {}) is False


def test_build_provider_real_capabilities():
    assert isinstance(build_provider("backlinks", "moz", {"access_id": "a"}), MozBacklinkProvider)
    assert isinstance(build_provider("keyword_volume", "se_ranking", {"token": "t"}), SeRankingVolumeProvider)
    assert isinstance(build_provider("ai_citations", "se_ranking", {"token": "t"}), SeRankingCitationProvider)
    assert isinstance(build_provider("ai_citations", "profound", {"api_key": "k"}), ProfoundCitationProvider)
    assert isinstance(build_provider("ai_citations", "dataforseo", {"login": "u", "password": "p"}), DataForSEOCitationProvider)
    assert isinstance(build_provider("gsc", "gsc", {"oauth_refresh_token": "x"}), GscOAuthProvider)


def test_scaffold_flags_removed():
    by_name = {p["name"]: p for p in providers_mod.PROVIDER_CATALOG}
    assert by_name["moz"]["scaffold"] is False
    assert by_name["profound"]["scaffold"] is False
    assert by_name["se_ranking"]["scaffold"] is False
    assert "ai_citations" in by_name["dataforseo"]["capabilities"]
