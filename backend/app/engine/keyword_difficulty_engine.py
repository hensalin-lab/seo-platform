"""Keyword Difficulty engine â€” transparent, mathematically consistent.

Answers: how hard is it to rank Top-10 for this keyword, which results are
weak, is there an opening, what would a competitive page cover, and what is
the actionable next step.

Everything is derived from real data only:
  - SERP results: multi-source provider (Serper â†’ OpenSerp â†’ DuckDuckGo),
    deduplicated by full URL.
  - Authority (DA): Open PageRank (same provider as Backlink Explorer /
    Trust-Citation Flow). Missing DA is shown as N/A â€” never a silent 0.
  - Content gap: real topic extraction from the actually-fetched ranking pages.
  - Search volume: only from a configured volume provider (DataForSEO); when
    unavailable, the Opportunity Score honestly returns N/A instead of
    guessing a volume.

Documented Difficulty formula (0-100, strictly weighted):

    Difficulty =
        (average DA of results WITH a DA value)        Ã— 0.40
      + (% of those results with DA >= 40)             Ã— 0.30
      + (SERP features the provider actually returned) Ã— 0.15
      + (result coverage: N_results_returned / 10)     Ã— 0.15

    average-DA component = min(40, avg_da Ã— 0.8)              [0..40]
    strong-domain      = strong_pct Ã— 30                      [0..30]
    SERP features       = min(15, feature_count Ã— 3)          [0..15]
    coverage            = min(15, results_returned/10 Ã— 15)   [0..15]

Bands:  0â€“29 EASY Â· 30â€“49 MEDIUM Â· 50â€“69 HARD Â· 70â€“100 VERY HARD
Label: "Difficulty Score â€” platform-derived, based on Google SERP Analysis."
(NOT identical to Ahrefs/Semrush/Moz Keyword Difficulty.)
"""
from __future__ import annotations

import datetime as _dt
import logging
import re
import time
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.services.ddg_serp_client import DDGSerpClient
from app.engine.intent_classifier import classify_intent
from app.engine.opportunity_score import compute_serp_weakness, score_opportunity

logger = logging.getLogger(__name__)

# Difficulty formula weights (match the disclosure shown in the UI).
_W_AVG_AUTH = 0.40
_W_STRONG = 0.30
_W_FEATURES = 0.15
_W_COVERAGE = 0.15
_STRONG_DA = 40
_MAX_ANALYZED = 10
_FEATURE_POINTS = 3.0  # per detected SERP feature
_FEATURE_CAP = 5  # more than 5 detected features don't add points

_BANDS = ((0, "EASY"), (30, "MEDIUM"), (50, "HARD"), (70, "VERY HARD"))

_FETCH_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
             "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
_DISCLOSURE = ("Difficulty Score â€” platform-derived, based on Google SERP Analysis. "
               "Not identical to Ahrefs/Semrush/Moz Keyword Difficulty.")

_STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "your", "you", "are",
    "our", "they", "what", "when", "all", "can", "have", "has", "not", "but",
    "more", "most", "their", "there", "here", "which", "will", "would", "about",
    "these", "those", "into", "over", "than", "then", "were", "was", "been",
    "being", "other", "some", "such", "only", "very", "just", "like", "using",
    "used", "use", "make", "made", "work", "best", "top", "how", "why", "get",
    "good", "new", "now", "one", "two", "page", "pages", "site", "website",
    "search", "read", "more", "menu", "navigation", "privacy", "cookie",
    "cookies", "policy", "terms", "click", "sign", "login", "register",
    "subscribe", "newsletter", "email", "follow", "share", "home", "skip",
    "content", "services", "back", "next", "first", "last", "footer", "header",
    "loading", "error", "view", "free", "online", "right", "copyright",
    "reserved", "cookies", "consent", "learn", "guide", "list", "big", "much",
}

_COMMUNITY_HINT = re.compile(
    r"(reddit|quora|forum|threads|stackoverflow|wikipedia|wikihow|"
    r"community|discussion|answers|github|medium|trustpilot|yelp|producthunt)",
    re.I,
)


def _host_of(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower().removeprefix("www.")
    except Exception:
        return ""


def _band(score: float) -> str:
    label = _BANDS[0][1]
    for low, band_label in _BANDS:
        if score >= low:
            label = band_label
    return label


def _dedup_by_url(results: list[dict]) -> list[dict]:
    seen, out = set(), []
    for r in results:
        u = (r.get("url") or "").strip()
        if not u or u in seen:
            continue
        seen.add(u)
        out.append(r)
    return out


async def _resolve_authority(hosts: list[str]) -> dict:
    """Return {host: int|None}. None means 'no DA available' (no key configured
    or the provider didn't return the domain) â€” rendered as N/A, never 0."""
    hosts = [h for h in dict.fromkeys(hosts) if h]
    out = {h: None for h in hosts}
    if not hosts:
        return out
    from app.engine.open_page_rank_client import opr_batch
    from app.config import settings
    key = getattr(settings, "OPEN_PAGERANK_API_KEY", "") or ""
    if not key:
        return out
    try:
        data = await opr_batch(hosts, key)
        for dom, info in data.items():
            if "domain_authority" in info:
                out[dom] = int(round(min(100.0, float(info["domain_authority"]))))
    except Exception as e:
        logger.debug(f"Open PageRank lookup failed: {e}")
    return out


def _authority_configured() -> bool:
    from app.config import settings
    return bool(getattr(settings, "OPEN_PAGERANK_API_KEY", ""))


def _search_volume_available() -> bool:
    """Real volume/CPC requires a configured volume provider (DataForSEO)."""
    from app.config import settings
    return bool(getattr(settings, "DATAFORSEO_LOGIN", "") and getattr(settings, "DATAFORSEO_PASSWORD", ""))


async def _fetch_page_topics(url: str, client: httpx.AsyncClient) -> list[str] | None:
    """Fetch a ranking page and reduce it to a set of meaningful topic words."""
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text[:250_000], "html.parser")
        for tag in soup(["script", "style", "noscript", "nav", "header", "footer", "form", "aside"]):
            tag.decompose()
        parts = []
        for el in soup.select("h1, h2, h3, title, p"):
            text = el.get_text(" ", strip=True)
            if text:
                parts.append(text)
        text = " ".join(parts)
    except Exception:
        return None
    words = re.findall(r"[a-z][a-z0-9\-]{2,}", text.lower())
    seen = set()
    topics = []
    for w in words:
        if len(w) < 4 or w in _STOPWORDS or w.isdigit() or w in seen:
            continue
        seen.add(w)
        topics.append(w)
    return topics


async def _content_gap(results: list[dict], limit: int = 8) -> dict:
    """Derive content-gap topics from the ranking pages that actually fetch.

    Returns real coverage fractions (count/total analyzed). Pages that fail to
    fetch are excluded from the denominator and disclosed.
    """
    urls = [r.get("url") for r in results[:limit] if r.get("url", "").startswith("http")]
    if not urls:
        return {"pages_analyzed": 0, "pages_total": len(results),
                "fetch_failures": len(results), "topics": [],
                "note": "No ranking pages could be fetched for content analysis."}

    topics = {}
    analyzed = 0
    sem = __import__("asyncio").Semaphore(5)

    async def one(url: str):
        nonlocal analyzed
        async with sem:
            page_topics = await _fetch_page_topics(url, client)
            if not page_topics:
                return
            analyzed += 1
            seen = set(page_topics)
            for t in seen:
                topics.setdefault(t, 0)
                topics[t] += 1

    async with httpx.AsyncClient(timeout=9.0, follow_redirects=True,
                                 headers={"User-Agent": _FETCH_UA,
                                          "Accept-Language": "en-US,en;q=0.9"}) as client:
        await __import__("asyncio").gather(*(one(u) for u in urls))

    ordered = sorted(topics.items(), key=lambda kv: -kv[1])
    rows = [{"topic": t, "count": c, "total": analyzed} for t, c in ordered[:7] if c >= 1]
    return {
        "pages_analyzed": analyzed,
        "pages_total": len(results),
        "fetch_failures": len(results) - analyzed,
        "topics": rows,
        "note": (f"Topics aggregated from {analyzed} of {len(results)} ranking pages that "
                 "could be fetched successfully."),
    }


def _recommendation(keyword: str, intent: str, content_topics: list[dict], difficulty: float | None) -> dict:
    year = _dt.datetime.now(_dt.timezone.utc).year
    if intent == "Commercial":
        page_type, page_label, rationale = "LANDING_PAGE", "Comparison/Landing Page", "commercial query â€” a comparison or landing page targets buyers directly"
        title = f"{keyword}: Top Options Compared ({year})"
        h1 = f"Best {keyword} in {year}"
    elif intent == "Transactional":
        page_type, page_label, rationale = "LANDING_PAGE", "Landing Page", "transactional query â€” a CTA-led landing page converts searchers"
        title = f"{keyword} â€” Get Started Today"
        h1 = f"{keyword} â€” Start Free"
    elif intent == "Navigational":
        page_type, page_label, rationale = "SERVICES", "Services Page", "navigational query â€” a dedicated page that matches the expected destination"
        title = f"{keyword}: Overview & Resources"
        h1 = f"{keyword}"
    elif intent == "Informational":
        page_type, page_label, rationale = "BLOG", "In-depth Guide/Article", "informational query â€” a comprehensive guide satisfies research intent"
        title = f"{keyword}: A Practical Guide ({year})"
        h1 = f"{keyword}: A Practical Guide"
    else:
        page_type, page_label, rationale = "RESOURCE", "Resource/Hub", "mixed intent â€” a resource hub that covers both research and consideration"
        title = f"{keyword}: What You Need to Know ({year})"
        h1 = f"{keyword} â€” Everything You Need to Know"

    secondary = []
    for t in content_topics[:4]:
        if t.get("topic") and t["topic"] not in secondary and t["topic"] != keyword.lower():
            secondary.append(t["topic"])
    if len(secondary) < 3:
        for w in keyword.split():
            wl = w.lower().strip(" ,.")
            if wl and len(wl) > 2 and wl not in secondary:
                secondary.append(wl)
        secondary += ["alternatives", "vs", "pricing", "reviews", "guide"]
    return {
        "page_type": page_type,
        "page_type_label": page_label,
        "rationale": rationale,
        "suggested_title": title,
        "suggested_h1": h1,
        "secondary_keywords": secondary[:6],
    }


def _build_context(serp: dict) -> tuple[list[dict], str, bool]:
    """Return (dedup results, source, is_rate_limited)."""
    results = _dedup_by_url(serp.get("all_results") or [])[:_MAX_ANALYZED]
    err = serp.get("error") or ""
    rate = False
    if err:
        low = err.lower()
        rate = any(k in low for k in ("429", " 202", "anomaly", "blocked", "rate"))
    return results, serp.get("source", "unknown"), rate


class KeywordDifficultyEngine:
    """Transparent keyword difficulty: SERP â†’ DA â†’ documented weighted score."""

    def __init__(self):
        self.ddg = DDGSerpClient()

    async def analyze(self, keyword: str) -> dict:
        kw = (keyword or "").strip()
        if not kw:
            return {"keyword": kw, "state": "INVALID_KEYWORD", "difficulty": None,
                    "rate_limited": False, "results": [],
                    "note": "Provide a keyword to analyze."}

        serp = await self.ddg.get_serp(kw)
        results, source, rate_limited = _build_context(serp)

        if not results:
            return {
                "keyword": kw, "state": "PROVIDER_ERROR",
                "rate_limited": rate_limited, "difficulty": None,
                "results": [], "serp_error": serp.get("error", "No SERP results."),
                "data_source": {"serp_provider": source, "authority_provider": "Open PageRank",
                                "authority_configured": _authority_configured(),
                                "volume_provider": "DataForSEO",
                                "volume_configured": _search_volume_available(),
                                "disclosure": _DISCLOSURE},
            }

        # â”€â”€ Authority (DA) per unique ranking domain â”€â”€
        top_hosts = list(dict.fromkeys(_host_of(r.get("url", "")) for r in results))
        strength = await _resolve_authority(top_hosts)
        da_configured = _authority_configured()

        rows = []
        for i, r in enumerate(results):
            host = _host_of(r.get("url", ""))
            rows.append({
                "position": i + 1,
                "url": r.get("url", ""),
                "domain": host,
                "path": (urlparse(r.get("url", "")).path or "")[:120],
                "title": (r.get("title") or "")[:200],
                "snippet": (r.get("snippet") or "")[:300],
                "da": strength.get(host),  # int or None (N/A)
            })

        # â”€â”€ Difficulty formula (documented weights) â”€â”€
        das = [r["da"] for r in rows if r["da"] is not None]
        n = len(rows)
        avg_da = round(sum(das) / len(das), 1) if das else None
        strong_pct = round(sum(1 for d in das if d >= _STRONG_DA) / len(das), 3) if das else 0.0

        features = serp.get("serp_features") or {}
        feature_count = sum(1 for v in features.values() if v)

        # Component split â€” each weight maps to max points as documented.
        pts_avg = min(40.0, (avg_da or 0.0) * 0.8)           # 0..40  (40% weight)
        pts_strong = strong_pct * 30.0                        # 0..30  (30% weight)
        pts_features = min(15.0, min(feature_count, _FEATURE_CAP) * _FEATURE_POINTS)  # 0..15 (15% weight)
        pts_coverage = min(15.0, (n / _MAX_ANALYZED) * 15.0)  # 0..15 (15% weight)

        difficulty = round(min(100.0, pts_avg + pts_strong + pts_features + pts_coverage), 1)
        state = "SUCCESS" if (n >= _MAX_ANALYZED and das and (len(das) / n) >= 0.6) else "PARTIAL_DATA"

        # â”€â”€ SERP strength distribution (buckets + N/A) â”€â”€
        b80 = sum(1 for d in das if d >= 80)
        b40 = sum(1 for d in das if 40 <= d < 80)
        blow = sum(1 for d in das if d < 40)
        unknown = sum(1 for r in rows if r["da"] is None)

        # â”€â”€ SERP weakness (overlapping, disclosed) â”€â”€
        weakness = compute_serp_weakness(rows)
        union = (weakness["below_average_authority"]["count"]
                 + weakness["community_editorial"]["count"]
                 + weakness["below_40_da"]["count"])

        # â”€â”€ Intent (shared rule-based classifier) â”€â”€
        intent = classify_intent(kw)

        # â”€â”€ Opportunity (shared module; volume/CPC never guessed) â”€â”€
        opportunity = score_opportunity(
            difficulty=difficulty, avg_da=avg_da, strong_pct=strong_pct,
            weakness_share=(union / n) if n else 0.0, intent=intent,
        )

        # â”€â”€ Content gap (real page analysis) â”€â”€
        content_gap = await _content_gap(results)

        recommendation = _recommendation(kw, intent, content_gap.get("topics") or [], difficulty)

        return {
            "keyword": kw,
            "state": state,
            "rate_limited": rate_limited,
            "difficulty": difficulty,
            "difficulty_label": _band(difficulty),
            "difficulty_formula": {
                "weights": {
                    "average_da": _W_AVG_AUTH, "strong_domains": _W_STRONG,
                    "serp_features": _W_FEATURES, "result_coverage": _W_COVERAGE,
                },
                "components": [
                    {"label": "Average DA of ranking domains", "weight": _W_AVG_AUTH,
                     "value": avg_da, "points": round(pts_avg, 1),
                     "description": "min(40, avg_DA Ã— 0.8)"},
                    {"label": "Strong domains (DA â‰¥ 40)", "weight": _W_STRONG,
                     "value": strong_pct, "points": round(pts_strong, 1),
                     "description": "strong_pct Ã— 30"},
                    {"label": "SERP features returned", "weight": _W_FEATURES,
                     "value": feature_count, "points": round(pts_features, 1),
                     "description": f"min(15, min(features, {_FEATURE_CAP}) Ã— {_FEATURE_POINTS})"},
                    {"label": "Result coverage (N/10)", "weight": _W_COVERAGE,
                     "value": n, "points": round(pts_coverage, 1),
                     "description": "min(15, n/10 Ã— 15)"},
                ],
                "total": difficulty,
            },
            "why_hard": {
                "average_da": avg_da,
                "average_da_basis": len(das),
                "strong_domain_pct": strong_pct,
                "strong_domain_basis": len(das),
                "results_analyzed": n,
                "serp_feature_count": feature_count,
                "intent": intent,
                "note": ("Factors are shown with their exact weights in `difficulty_formula`; "
                         "DA averages exclude results where DA is N/A."),
            },
            "serp_strength": {
                "results_analyzed": n,
                "buckets": {"da_80_plus": b80, "da_40_79": b40, "da_below_40": blow},
                "unknown_na": unknown,
                "reconciles": (b80 + b40 + blow + unknown) == n,
                "note": "Bucket counts + Unknown/N/A always sum to the results analyzed. "
                        "DA comes from Open PageRank; N/A = no value returned.",
            },
            "serp_weakness": weakness,
            "opportunity": opportunity,
            "serp_overview": rows,
            "content_gap": content_gap,
            "recommendation": recommendation,
            "data_source": {
                "serp_provider": source,
                "authority_provider": "Open PageRank" if da_configured else "Not configured",
                "authority_configured": da_configured,
                "volume_provider": "DataForSEO",
                "volume_configured": _search_volume_available(),
                "analyzed_at": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
                "disclosure": _DISCLOSURE,
            },
            "note": (f"Analyzed the {n}-position SERP for '{kw}'. Difficulty is platform-derived "
                     "from real SERP + authority data; unavailable DA is shown as N/A, never 0."),
        }