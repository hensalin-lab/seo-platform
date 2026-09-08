"""Tests for Keyword Gap shared-module opportunity enrichment.

The gap API reuses the platform's single `opportunity_score` implementation
(via the Keyword Difficulty engine) so competitor-only rows carry a real,
SERP-derived opportunity — never a fabricated volume/CPC.
"""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.api import keyword_gap as kg

transport = ASGITransport(app=app)


class FakeEngine:
    """Deterministic stand-in for KeywordDifficultyEngine.analyze."""

    def __init__(self, success_keywords=("seo audit tool", "backlink checker")):
        self.success_keywords = set(success_keywords)

    async def analyze(self, keyword):
        if keyword not in self.success_keywords:
            return {"keyword": keyword, "state": "PROVIDER_ERROR"}
        return {
            "keyword": keyword,
            "state": "SUCCESS",
            "difficulty": 45.0,
            "difficulty_label": "MEDIUM",
            "opportunity": {"score": 62.0, "band": "GOOD OPPORTUNITY", "status": "SUCCESS"},
            "serp_weakness": {"level": "MEDIUM"},
            "data_source": {"serp_provider": "serper"},
        }


def _row(keyword="seo audit tool"):
    return {"keyword": keyword, "position": 4, "device": "desktop", "serp_features": {}}


async def _register(client):
    await client.post("/api/auth/register", json={
        "email": "gap@example.com", "username": "gaptester",
        "password": "password123", "name": "Gap Tester",
    })
    resp = await client.post("/api/auth/login", json={"email": "gap@example.com", "password": "password123"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.asyncio
async def test_score_gap_opportunities_attaches_shared_score():
    engine = FakeEngine()
    rows = [_row("seo audit tool"), _row("backlink checker")]
    out = await kg._score_gap_opportunities(rows, engine=engine)

    assert len(out) == 2
    for r in out:
        assert r["opportunity"] == 62.0
        assert r["opportunity_band"] == "GOOD OPPORTUNITY"
        assert r["difficulty"] == 45.0
        assert r["difficulty_label"] == "MEDIUM"
        assert r["weakness"] == "MEDIUM"
        assert r["score_source"] == "serper"


@pytest.mark.asyncio
async def test_score_gap_opportunities_bounded_and_best_effort():
    many = [_row(k) for k in (f"keyword {i}" for i in range(10))]
    # Only the first five keywords succeed; the rest error — mirrors rate limits.
    engine = FakeEngine(success_keywords={f"keyword {i}" for i in range(5)})
    out = await kg._score_gap_opportunities(many, engine=engine)

    # Bounded to the limit: exactly the first 5 rows get scored.
    scored = [r for r in out if r.get("opportunity") is not None]
    assert len(scored) == kg._SCORE_LIMIT == 5

    # Failed analyses stay unscored but never error the whole batch.
    assert len(out) == len(many)
    assert all(r.get("keyword") for r in out)  # rows preserved
    unscored = out[kg._SCORE_LIMIT:]
    assert all(r.get("opportunity") is None for r in unscored)


@pytest.mark.asyncio
async def test_gap_api_enriches_competitor_only_rows():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register(client)

        async def fake_serp_check(keywords, target_domain, client):
            return {
                "seo audit tool": {"position": 4, "serp_features": {}},
                "technical seo": {"position": 7, "serp_features": {}},
            }

        async def fake_score(rows):
            return [
                {**r, "opportunity": 62.0, "opportunity_band": "GOOD OPPORTUNITY",
                 "difficulty": 45.0, "difficulty_label": "MEDIUM", "weakness": "MEDIUM",
                 "score_source": "serper"}
                for r in rows
            ]

        kg._live_serp_check = fake_serp_check
        kg._score_gap_opportunities = fake_score

        resp = await client.get(
            "/api/keyword-gap?domain=example.com&competitor=competitor.com", headers=headers
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert body["summary"]["live_serp_checked"] is True
        assert body["summary"]["opportunity_scored"] == body["summary"]["competitor_only_count"]
        for r in body["competitor_only"]:
            assert r["opportunity"] == 62.0
            assert r["opportunity_band"] == "GOOD OPPORTUNITY"
            assert r["difficulty"] == 45.0
        assert "opportunity_note" in body["summary"]


@pytest.mark.asyncio
async def test_gap_api_no_fabricated_volume():
    # Opportunity enrichment must never introduce volume/CPC anywhere.
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register(client)

        async def fake_serp_check(kws, td, client):
            return {"seo audit tool": {"position": 4, "serp_features": {}}}

        kg._live_serp_check = fake_serp_check

        # Real helper, fake engine: proves the honest shape end-to-end.
        async def real_scoring(rows):
            return await kg._score_gap_opportunities(rows, engine=FakeEngine())

        kg._score_gap_opportunities = real_scoring

        resp = await client.get(
            "/api/keyword-gap?domain=example.com&competitor=competitor.com", headers=headers
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        for bucket in ("your_only", "competitor_only", "both_rank"):
            for r in body.get(bucket, []):
                assert "search_volume" not in r
                assert "volume" not in r
                assert "cpc" not in r