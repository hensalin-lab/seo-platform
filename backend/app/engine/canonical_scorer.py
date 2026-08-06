"""Canonical GEO/AEO scorer — the single source of truth for per-page AI-readiness.

Why this exists
---------------
The platform ships 8+ standalone heuristic engines (AIGeoEngine, AISearchDeepEngine,
AiSearchIntelligenceEngine, ContentIntelligenceV2/Deep, PageIntelligenceEngine/V2,
MegaSEOEngine) that each compute their own GEO/AEO-style number with different
signals and weights. That made the same page legitimately show, say, a GEO score
of 62 on one tab and 78 on another.

Fix (consolidation)
-------------------
AIGeoEngine is the canonical GEO/AEO scorer: cleanest model, 48 signals across 6
weighted categories, plus per-platform sub-scores for ChatGPT/Perplexity/Gemini/
Claude/AI Overview. Other engines keep their specialty outputs (technical, content,
schema, speed ...) but every exit point — audit-time per-page scores and every deep
route the UI reads — normalizes geo_score/aeo_score to the value produced here.

AIGeoEngine.analyze() reads these attributes from the page object: content_text,
word_count, html_raw, title, meta_description, h1, url, schema_markup, images,
links_external, links_internal. Any object exposing them works (CrawlerPage,
CrawlSnapshot, PageAdapter, DB Page model).
"""
from app.engine.ai_geo import AIGeoEngine

SCORER = {
    "name": "AIGeoEngine",
    "version": "1.0",
    "method": "48-signal regex heuristic across 6 weighted categories",
    "range": "0-100",
    "note": "Canonical per-page GEO/AEO score. Other engines keep their specialty outputs; their geo/aeo numbers are normalized to this value.",
}

_engine = AIGeoEngine()


def score_page(page):
    """Run the canonical GEO/AEO scorer on any page-like object.

    Returns the same canonical shape every consumer reads: one geo_score, one
    aeo_score, per-platform sub-scores, category breakdown, issues and the
    why-not-ranking reasons.
    """
    result = _engine.analyze(page)
    return {
        "geo_score": result["geo_score"],
        "aeo_score": result["aeo_score"],
        "platform_scores": result["platform_scores"],
        "category_scores": result["category_scores"],
        "signals_checked": result["signals_checked"],
        "issues": result["issues"],
        "why_not_ranking": result["why_not_ranking"],
        "scoring": SCORER,
    }


def attach_canonical(payload, page):
    """Overlay the canonical geo/aeo score onto an engine response dict.

    Every deep route that returns per-page intelligence calls this before caching
    so the UI tabs agree: geo_score/aeo_score are normalized to the canonical value
    and a ``canonical_geo`` block carries the full breakdown + provenance.

    Never raises: if scoring fails for any reason the original payload is returned
    unchanged so no route breaks because of canonicalization.
    """
    try:
        canon = score_page(page)
    except Exception:
        return payload
    payload["geo_score"] = canon["geo_score"]
    payload["aeo_score"] = canon["aeo_score"]
    payload["canonical_geo"] = {
        "source": SCORER["name"],
        "version": SCORER["version"],
        "geo_score": canon["geo_score"],
        "aeo_score": canon["aeo_score"],
        "platform_scores": canon["platform_scores"],
        "category_scores": canon["category_scores"],
        "signals_checked": canon["signals_checked"],
        "issues": canon["issues"][:10],
        "why_not_ranking": canon["why_not_ranking"],
    }
    return payload
