"""Traffic estimation engine — historical organic traffic estimates + trends.

Own domains: uses real Google Search Console clicks/impressions when GSC is
connected (precise). Any domain (incl. competitors): estimates monthly organic
visits from visible SERP presence (avg position × estimated search volume),
derived from the free DDG SERP scraper and per-keyword volume heuristics.

Honestly labeled: own-domain numbers are real GSC data; competitor estimates
are labeled as estimates.
"""
import asyncio
import logging
import datetime as _dt
from urllib.parse import urlparse

from app.services.ddg_serp_client import DDGSerpClient

logger = logging.getLogger(__name__)


def _host_of(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower().lstrip("www.")
    except Exception:
        return ""


# Approximate CTR-by-position curve (shared across engines, derived from
# standard organic search CTR studies). Used only for estimates.
def _ctr_for_position(position: float) -> float:
    if not position or position <= 0:
        return 0.0
    # Piecewise approximation of first-page CTR
    if position == 1:
        return 0.28
    if position == 2:
        return 0.15
    if position == 3:
        return 0.10
    if position <= 5:
        return 0.07
    if position <= 10:
        return 0.03
    if position <= 20:
        return 0.012
    return 0.005


# Very rough global search-volume heuristic by query length (estimate only).
def _estimate_keyword_volume(keyword: str) -> float:
    words = len(keyword.split())
    # short/head queries have higher volume, long-tail lower
    if words <= 1:
        return 2200.0
    if words <= 2:
        return 900.0
    if words <= 3:
        return 400.0
    if words <= 4:
        return 180.0
    return 90.0


async def estimate_domain_traffic(
    domain: str,
    seed_keywords: list[str] | None = None,
) -> dict:
    """Estimate monthly organic traffic for a domain.

    For each seed keyword we probe the DDG SERP to determine the domain's
    position, then estimate visits = volume × CTR(position) × click-share.
    """
    domain = domain.lower().strip().lstrip("www.")
    ddg = DDGSerpClient()

    seed_keywords = seed_keywords or [domain.replace(".com", "").replace(".io", "").replace(".co", "")
                                     .replace("-", " ").strip()]

    keyword_rows = []
    total_estimated_visits = 0.0

    for kw in seed_keywords:
        try:
            serp = await ddg.get_serp(kw, target_domain=domain)
            position = serp.get("position")
            if position is None:
                continue
            volume = _estimate_keyword_volume(kw)
            ctr = _ctr_for_position(position)
            est_visits = volume * ctr
            total_estimated_visits += est_visits
            keyword_rows.append({
                "keyword": kw,
                "position": position,
                "estimated_volume": round(volume),
                "ctr": round(ctr, 3),
                "estimated_monthly_visits": round(est_visits),
            })
        except Exception as e:
            logger.debug(f"Traffic probe failed for '{kw}': {e}")
        await asyncio.sleep(4)

    return {
        "domain": domain,
        "estimated_monthly_visits": round(total_estimated_visits),
        "is_estimate": True,
        "note": "Estimated from DDG SERP visibility × estimated keyword volume. Use connected GSC for exact own-domain traffic.",
        "channels": {"organic": round(total_estimated_visits)},
        "keywords_analyzed": keyword_rows[:20],
        "source": "ddg_estimate",
    }


async def gsc_traffic(property_url: str, days: int = 28) -> dict:
    """Real organic traffic from GSC (own domains). Returns precise data."""
    from app.engine.gsc_engine import GSCEngine
    engine = GSCEngine()
    data = engine.get_search_analytics(property_url, days=days)
    if data.get("error"):
        return {"error": data["error"]}
    return {
        "property": property_url,
        "is_estimate": False,
        "source": "gsc",
        "period": data["period"],
        "total_clicks": data["total_clicks"],
        "total_impressions": data["total_impressions"],
        "avg_ctr": data["avg_ctr"],
        "avg_position": data["avg_position"],
        "note": "Real Google Search Console data.",
    }
