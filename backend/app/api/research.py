"""Growth Research API — advanced competitive/Ahrefs-class capabilities.

Curated from the missing-capability audit against Semrush/Moz/Majestic/
SE Ranking/Ubersuggest/Mangools/Serpstat. All features are free, self-hosted,
and honestly labeled.

Endpoints:
    GET /api/research/keyword-difficulty?keyword=       → Keyword Difficulty 0-100 + SERP overview
    GET /api/research/traffic-estimate?domain=&own=     → Organic traffic estimate (GSC if own, DDG else)
    GET /api/research/keyword-universe?domain=&seed=    → Discover what a competitor ranks for
    GET /api/research/trust-flow/{domain}               → Trust Flow / Citation Flow (Majestic-style)
    GET /api/research/url-inspection?...                → Live GSC indexing status
"""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.api.auth import get_current_active_user
from app.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/research", tags=["research"])


@router.get("/keyword-difficulty")
@limiter.limit("10/minute")
async def keyword_difficulty(
    keyword: str = "",
    user: User = Depends(get_current_active_user),
):
    """Return keyword difficulty (0-100) + SERP overview from DDG analysis."""
    from app.engine.keyword_research_engine import KeywordDifficultyEngine
    if not keyword.strip():
        return {"keyword": "", "difficulty": None, "note": "Provide a keyword.", "results": []}
    engine = KeywordDifficultyEngine()
    return await engine.analyze(keyword.strip())


@router.get("/traffic-estimate")
@limiter.limit("10/minute")
async def traffic_estimate(
    domain: str = "",
    own: bool = False,
    property_url: str = "",
    user: User = Depends(get_current_active_user),
):
    """Estimate monthly organic traffic for a domain.

    If `own` is true (and a property_url is given), uses real GSC data.
    Otherwise estimates from DDG SERP visibility.
    """
    from app.engine.traffic_engine import estimate_domain_traffic, gsc_traffic
    if not domain.strip():
        return {"note": "Provide a domain.", "estimated_monthly_visits": None}

    if own and property_url:
        try:
            result = await gsc_traffic(property_url)
            if not result.get("error"):
                return result
        except Exception as e:
            logger.debug(f"GSC traffic failed, falling back to estimate: {e}")

    return await estimate_domain_traffic(domain.strip())


@router.get("/keyword-universe")
@limiter.limit("10/minute")
async def keyword_universe(
    domain: str = "",
    seed: str = "",
    max_keywords: int = 20,
    user: User = Depends(get_current_active_user),
):
    """Discover the organic keyword universe for a competitor domain."""
    from app.engine.keyword_research_engine import discover_keyword_universe
    if not domain.strip() or not seed.strip():
        return {"note": "Provide both a domain and a seed keyword.", "keywords": []}
    return await discover_keyword_universe(domain.strip(), seed.strip(), max_keywords)


@router.get("/trust-flow/{domain}")
@limiter.limit("10/minute")
async def trust_flow(
    domain: str,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Compute Trust Flow / Citation Flow (Majestic-style) for a domain."""
    from app.engine.trust_flow import compute_trust_citation_flow
    return await compute_trust_citation_flow(db, domain)


@router.get("/url-inspection")
@limiter.limit("10/minute")
async def url_inspection(
    url: str = "",
    property_url: str = "",
    user: User = Depends(get_current_active_user),
):
    """Run a live GSC URL Inspection for a single URL."""
    from app.engine.url_inspection import url_inspection_lookup
    if not url.strip():
        return {"note": "Provide a URL to inspect.", "status": None}
    return url_inspection_lookup(property_url or url.split("/")[0], url.strip())
