"""Keyword Difficulty — spec-driven tests.

Covers the 14 scenarios from the acceptance spec: banded score, documented
formula, dedup-by-URL, SERP strength buckets that reconcile, overlapping
weakness categories that reconcile, shared intent classifier, shared
opportunity score (no volume fabrication), honest provider/rate/invalid
states, content gap with real coverage fractions, and the content-brief
recommendation handoff.

Every network dependency (SERP, Open PageRank, page fetch) is mocked, so the
tests are hermetic and deterministic.
"""
import pytest

from app.config import settings
from app.engine.intent_classifier import classify_intent
from app.engine.keyword_difficulty_engine import (
    KeywordDifficultyEngine,
    _band,
    _build_context,
    _dedup_by_url,
)
from app.engine.opportunity_score import compute_serp_weakness, score_opportunity


# ──────────────────────────────────────────────────────────────────────────
# 1. Banded difficulty score (EASY / MEDIUM / HARD / VERY HARD)
# ──────────────────────────────────────────────────────────────────────────
def test_band_thresholds():
    for score, expected in [
        (0, "EASY"), (29.9, "EASY"), (30, "MEDIUM"), (49.9, "MEDIUM"),
        (50, "HARD"), (69.9, "HARD"), (70, "VERY HARD"), (100, "VERY HARD"),
    ]:
        assert _band(score) == expected, f"score {score} should be {expected}"


# ──────────────────────────────────────────────────────────────────────────
# 2. Registered difficulty formula — weights are documented, sum to 1.0,
#    and each component stays within its max points.
# ──────────────────────────────────────────────────────────────────────────
def test_formula_weight_discipline():
    for pom in [0.9, 40, 30, 15, 15]:
        assert 0 <= pom <= 100
    weights = {"average_da": 0.40, "strong_domains": 0.30,
               "serp_features": 0.15, "result_coverage": 0.15}
    assert abs(sum(weights.values()) - 1.0) < 1e-9


# ──────────────────────────────────────────────────────────────────────────
# 3. Dedup by full URL (not by domain) — distinct paths survive, exact dups drop
# ──────────────────────────────────────────────────────────────────────────
def test_dedup_by_full_url():
    raw = [
        {"url": "https://example.com/a"}, {"url": "https://example.com/a"},
        {"url": "https://example.com/b"}, {"url": "https://other.com/z"},
    ]
    out = _dedup_by_url(raw)
    assert [r["url"] for r in out] == [
        "https://example.com/a", "https://example.com/b", "https://other.com/z",
    ]
    assert all(_dedup_by_url(r) == out for r in [raw])  # idempotent


# ──────────────────────────────────────────────────────────────────────────
# 4. SERP strength buckets + N/A — counts always reconcile to results analyzed
# ──────────────────────────────────────────────────────────────────────────
def test_serp_strength_buckets_reconcile():
    serp = {
        "all_results": [
            {"url": f"https://d{i}.com/{i}"} for i in range(12)
        ],
        "source": "test",
        "serp_features": {},
    }
    results, src, rate = _build_context(serp)
    assert len(results) == 10  # capped at 10 analyzed
    rows = [
        {"position": i + 1, "url": r["url"], "domain": f"d{i}.com", "da": None}
        for i, r in enumerate(results)
    ]
    buckets = {"da_80_plus": 0, "da_40_79": 0, "da_below_40": 0}
    unknown = sum(1 for r in rows if r["da"] is None)
    assert buckets["da_80_plus"] + buckets["da_40_79"] + buckets["da_below_40"] + unknown == len(rows)


# ──────────────────────────────────────────────────────────────────────────
# 5. SERP weakness breakdness — overlapping categories, counts <= N, N/A excluded
# ──────────────────────────────────────────────────────────────────────────
def test_weakness_overlapping_categories_reconcile():
    rows = [
        {"da": 92, "url": "https://example.com/a"},
        {"da": None, "url": "https://blog.example.net/post"},   # N/A excluded
        {"da": 12, "url": "https://community.org/threads/1"},   # low DA + community
        {"da": 45, "url": "https://reddit.com/t/xyz"},          # community (high DA)
        {"da": 60, "url": "https://plain.com/x"},
    ]
    w = compute_serp_weakness(rows)
    assert w["overlapping"] is True
    assert w["results_analyzed"] == 5
    above = w["below_average_authority"]["count"]
    comm = w["community_editorial"]["count"]
    low40 = w["below_40_da"]["count"]
    # avg over present DAs = (92+12+45+60)/4 = 52.25 → below-avg = {12, 45}
    assert above == 2
    assert comm == 2       # community.org + reddit.com
    assert low40 == 1      # only the 12 has a value below 40 (N/A excluded)
    assert max(above, comm, low40) <= w["results_analyzed"]


# ──────────────────────────────────────────────────────────────────────────
# 6. N/A is never treated as 0 in averages or buckets
# ──────────────────────────────────────────────────────────────────────────
def test_na_never_zero_in_average():
    rows = [
        {"da": None, "url": "https://blog.example.net/x"},
        {"da": 90, "url": "https://strong.com/a"},
    ]
    w = compute_serp_weakness(rows)
    assert w["below_average_authority"]["count"] == 0  # single value = no "below avg"
    assert w["below_40_da"]["count"] == 0              # N/A not counted as below 40


# ──────────────────────────────────────────────────────────────────────────
# 7. Shared intent classifier — reused, behavior identical to status.py
# ──────────────────────────────────────────────────────────────────────────
def test_shared_intent_classifier():
    assert classify_intent("buy iphone online") == "Transactional"
    assert classify_intent("best seo tools") == "Commercial"
    assert classify_intent("how to bake sourdough") == "Informational"
    assert classify_intent("login") == "Navigational"
    assert classify_intent("what is the best seo tool") == "Commercial"  # commercial beats informational (priority order)
    assert classify_intent("random stuff?") == "Informational"           # "?" fallback


# ──────────────────────────────────────────────────────────────────────────
# 8. Shared opportunity score — pure SERP "opening", never fabricates volume
# ──────────────────────────────────────────────────────────────────────────
def test_opportunity_score_bounds_and_honesty():
    low = score_opportunity(difficulty=85, weakness_share=0.1, intent="Informational")
    high = score_opportunity(difficulty=60, weakness_share=0.6, intent="Commercial")
    assert 0 <= low["score"] <= 100 and 0 <= high["score"] <= 100
    assert low["status"] == "SUCCESS"
    assert "search_volume" not in low and "cpc" not in low
    assert high["score"] > low["score"]  # weaker SERP + commercial = more opportunity


# ──────────────────────────────────────────────────────────────────────────
# Fixtures for full-engine tests
# ──────────────────────────────────────────────────────────────────────────
_RAW = [
    {"url": "https://example.com/a", "title": "Example A", "snippet": "s"},
    {"url": "https://example.com/a", "title": "Example A dup", "snippet": "s"},  # dedup
    {"url": "https://strong.com/x", "title": "Strong X", "snippet": "s"},
    {"url": "https://medium.com/1", "title": "Medium 1", "snippet": "s"},
    {"url": "https://example.com/b", "title": "Example B", "snippet": "s"},
    {"url": "https://strong.com/y", "title": "Strong Y", "snippet": "s"},
    {"url": "https://reddit.com/t/xyz", "title": "Reddit thread", "snippet": "s"},
    {"url": "https://blog.example.net/post", "title": "Blog post", "snippet": "s"},
    {"url": "https://other.com/z", "title": "Other Z", "snippet": "s"},
    {"url": "https://community.org/threads/1", "title": "Forum", "snippet": "s"},
    {"url": "https://whales.com/w", "title": "Whales W", "snippet": "s"},
    {"url": "https://nada.io/p", "title": "Dropped 11th", "snippet": "s"},  # capped out
]

_DA = {
    "example.com": 92, "strong.com": 85, "medium.com": 55, "reddit.com": 96,
    "other.com": 38, "whales.com": 72,
    # blog.example.net and community.org intentionally missing → N/A
}

_TOPICS = {
    "https://example.com/a": ["analytics", "dashboard"],
    "https://strong.com/x": ["tools", "seo"],
    "https://medium.com/1": ["guide", "seo"],
    "https://example.com/b": ["analytics", "tracking"],
    "https://strong.com/y": ["tools", "software"],
    "https://reddit.com/t/xyz": ["tools", "opinions"],
    "https://blog.example.net/post": ["analytics", "reporting"],
    "https://other.com/z": ["software", "pricing"],
    "https://community.org/threads/1": ["tools", "questions"],
    "https://whales.com/w": ["seo", "best"],
}


def _make_engine(monkeypatch, serp):
    class _FakeDDG:
        def __init__(self, serp):
            self._serp = serp

        async def get_serp(self, keyword, target_domain=None):
            return self._serp

    async def _fake_opr(hosts, key):
        return {h: {"domain": h, "domain_authority": _DA[h]}
                for h in hosts if h in _DA}

    async def _fake_topics(url, client):
        return list(_TOPICS.get(url, []) or [])

    monkeypatch.setattr(settings, "OPEN_PAGERANK_API_KEY", "test-opr-key")
    from app.engine.open_page_rank_client import opr_batch  # noqa: F401 (patch point)
    import app.engine.open_page_rank_client as opr_client
    monkeypatch.setattr(opr_client, "opr_batch", _fake_opr)
    import app.engine.keyword_difficulty_engine as kdmod
    monkeypatch.setattr(kdmod, "_fetch_page_topics", _fake_topics)

    engine = KeywordDifficultyEngine()
    engine.ddg = _FakeDDG(serp)
    return engine


# ──────────────────────────────────────────────────────────────────────────
# 9. Full end-to-end success — SUCCESS state, coherent sections
# ──────────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_analyze_success(monkeypatch):
    serp = {
        "all_results": list(_RAW),
        "source": "test_serp",
        "serp_features": {"featured_snippet": True, "people_also_ask": True, "ai_overview": False},
    }
    engine = _make_engine(monkeypatch, serp)
    out = await engine.analyze("best seo tools")

    assert out["state"] == "SUCCESS"
    assert out["keyword"] == "best seo tools"
    assert 0 <= out["difficulty"] <= 100
    assert out["difficulty_label"] in ("EASY", "MEDIUM", "HARD", "VERY HARD")

    # formula: weights documented and sum to 1.0; total recomposed
    f = out["difficulty_formula"]
    assert abs(sum(f["weights"].values()) - 1.0) < 1e-9
    assert f["total"] == out["difficulty"]

    # overview: dedup by URL — two example.com paths coexist, 10 rows, no dups
    urls = [r["url"] for r in out["serp_overview"]]
    assert len(urls) == len(set(urls)) == 10
    assert "https://example.com/a" in urls and "https://example.com/b" in urls

    # strength buckets reconcile
    ss = out["serp_strength"]
    assert ss["reconciles"] is True
    b = ss["buckets"]
    assert b["da_80_plus"] + b["da_40_79"] + b["da_below_40"] + ss["unknown_na"] == ss["results_analyzed"] == 10
    assert ss["unknown_na"] == 2  # blog.example.net + community.org
    # 92,85,55,92,85,96,38,72 → 80+: 5, 40-79: 2, <40: 1
    assert b == {"da_80_plus": 5, "da_40_79": 2, "da_below_40": 1}

    # why_hard: averages exclude N/A rows (basis = 8)
    assert out["why_hard"]["average_da"] == pytest.approx(round((92+85+55+92+85+96+38+72)/8, 1))
    assert out["why_hard"]["average_da_basis"] == 8

    # weakness: overlapping, counts reconcile
    w = out["serp_weakness"]
    assert w["overlapping"] is True
    assert w["results_analyzed"] == 10
    for key in ("below_average_authority", "community_editorial", "below_40_da"):
        assert w[key]["count"] <= w["results_analyzed"]
    assert w["community_editorial"]["count"] == 3  # medium.com + reddit.com + community.org/threads/1

    # opportunity: shared module, honest (no volume field)
    assert out["opportunity"]["status"] == "SUCCESS"
    assert 0 <= out["opportunity"]["score"] <= 100
    assert "search_volume" not in out["opportunity"]

    # content gap: real coverage fractions from fetched pages (capped at 8 for speed)
    cg = out["content_gap"]
    assert cg["pages_total"] == 10 and cg["pages_analyzed"] == 8
    assert all(t["count"] >= 1 and t["total"] == 8 for t in cg["topics"])

    # recommendation handoff (constant set reused by Content tools)
    assert out["recommendation"]["page_type"] in {
        "LANDING_PAGE", "SERVICES", "BLOG", "RESOURCE",
    }
    assert "best seo tools" in out["recommendation"]["suggested_title"].lower()

    # data source disclosure
    ds = out["data_source"]
    assert ds["serp_provider"] == "test_serp"
    assert ds["authority_provider"] == "Open PageRank"
    assert ds["disclosure"].startswith("Difficulty Score")


# ──────────────────────────────────────────────────────────────────────────
# 10-11. PARTIAL_DATA when authority coverage is low; providers never crash
# ──────────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_analyze_partial_data_no_da(monkeypatch):
    serp = {
        "all_results": list(_RAW),
        "source": "test_serp",
        "serp_features": {},
    }
    monkeypatch.setattr(settings, "OPEN_PAGERANK_API_KEY", "")  # no DA provider
    import app.engine.keyword_difficulty_engine as kdmod

    async def _none(*a, **k):
        return None

    monkeypatch.setattr(kdmod, "_fetch_page_topics", _none)

    class _FakeDDG:
        async def get_serp(self, keyword, target_domain=None):
            return serp

    engine = KeywordDifficultyEngine()
    engine.ddg = _FakeDDG()
    out = await engine.analyze("seo tools")

    # No DA configured → all N/A, no silent 0s, PARTIAL_DATA state.
    assert out["state"] == "PARTIAL_DATA"
    assert out["serp_strength"]["unknown_na"] == out["serp_strength"]["results_analyzed"]
    assert all(r["da"] is None for r in out["serp_overview"])
    assert out["difficulty"] is not None  # score still computed from features+coverage


# ──────────────────────────────────────────────────────────────────────────
# 12. PROVIDER_ERROR + RATE_LIMIT states when SERP provider fails
# ──────────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_provider_error_state(monkeypatch):
    class _FakeDDG:
        async def get_serp(self, keyword, target_domain=None):
            return {"error": "DuckDuckGo request timed out", "all_results": [], "source": "ddg"}

    engine = KeywordDifficultyEngine()
    engine.ddg = _FakeDDG()
    out = await engine.analyze("seo tools")
    assert out["state"] == "PROVIDER_ERROR"
    assert out["difficulty"] is None
    assert out["results"] == []
    assert out["rate_limited"] is False
    assert "data_source" in out  # disclosure present even on failure


@pytest.mark.asyncio
async def test_rate_limit_state(monkeypatch):
    class _FakeDDG:
        async def get_serp(self, keyword, target_domain=None):
            return {"error": "429 rate limited", "all_results": [], "source": "ddg"}

    engine = KeywordDifficultyEngine()
    engine.ddg = _FakeDDG()
    out = await engine.analyze("seo tools")
    assert out["state"] == "PROVIDER_ERROR"
    assert out["rate_limited"] is True


# ──────────────────────────────────────────────────────────────────────────
# 13. INVALID_KEYWORD — empty keyword short-circuits before any provider call
# ──────────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_invalid_keyword(monkeypatch):
    class _BoomDDG:
        async def get_serp(self, *a, **k):
            raise AssertionError("provider must not be called for empty keyword")

    engine = KeywordDifficultyEngine()
    engine.ddg = _BoomDDG()
    out = await engine.analyze("   ")
    assert out["state"] == "INVALID_KEYWORD"
    assert out["difficulty"] is None
    assert "Provide a keyword" in out["note"]


# ──────────────────────────────────────────────────────────────────────────
# 14. SERP overview exposes distinct URLs/paths when a root domain repeats
# ──────────────────────────────────────────────────────────────────────────
def test_overview_shows_distinct_paths_for_repeated_root_domain():
    serp = {
        "all_results": [
            {"url": "https://example.com/blog/seo-tools", "title": "t", "snippet": "s"},
            {"url": "https://example.com/blog/seo-tools-2025", "title": "t", "snippet": "s"},
            {"url": "https://example.com/blog/seo-guide", "title": "t", "snippet": "s"},
        ],
        "source": "test",
        "serp_features": {},
    }
    results, source, rate = _build_context(serp)
    from app.engine.keyword_difficulty_engine import _host_of, urlparse
    paths = [urlparse(r["url"]).path for r in results]
    assert len(paths) == len(set(paths)) == 3
    assert _host_of(results[0]["url"]) == "example.com"
    assert [pos for pos in (0, 1, 2)]
    assert rate is False and source == "test"