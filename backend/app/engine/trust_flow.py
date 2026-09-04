"""Trust & Citation Flow engine — Majestic-style two-metric link quality.

Trust Flow (0-100): the quality/trustworthiness of the link neighborhood —
high when a large share of referring links come from trusted, high-authority
sites (high DA, low toxic score, authoritative TLDs).

Citation Flow (0-100): raw link popularity — based on the raw number of
referring domains and total backlinks (influence/popularity regardless of
quality), not derated by toxic/low-quality links.

Enhanced with real Open PageRank DA values when the API key is configured.
Without a key, falls back to heuristic DA from Common Crawl ingestion.
"""
import logging
import math

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Backlink, ReferringDomain

logger = logging.getLogger(__name__)

_AUTHORITY_TLDS = {".gov", ".edu", ".org"}


def _log_scale(value: int, base=10.0) -> float:
    if value <= 0:
        return 0.0
    return min(100.0, math.log(value + 1) / math.log(base + 1) * 100.0)


def _trust_from_referring_domains(domains: list) -> dict:
    """Compute Trust/Citation Flow from a list of ReferringDomain rows."""
    referring_count = len(domains)
    total_links = sum(rd.link_count or 0 for rd in domains)

    trusted_links = 0
    trusted_domains = 0
    toxic_links = 0

    for rd in domains:
        da = rd.domain_authority or 0
        toxic = rd.toxic_score or 0
        count = rd.link_count or 1
        is_authoritative_tld = any(rd.domain.endswith(t) for t in _AUTHORITY_TLDS)

        if (da >= 30 or is_authoritative_tld) and toxic < 0.5:
            trusted_links += count
            trusted_domains += 1
        if toxic >= 0.7:
            toxic_links += count

    # Citation Flow: raw popularity (log-scaled referring count + links)
    citation_flow = round(
        _log_scale(referring_count, base=8) * 0.7
        + _log_scale(total_links, base=50) * 0.3,
        1,
    )

    # Trust Flow: share of trusted links, scaled by overall size
    trust_ratio = (trusted_links / total_links) if total_links else 0.0
    trust_flow = round(
        _log_scale(trusted_domains, base=6) * 0.6
        + (trust_ratio * 100) * 0.4,
        1,
    )

    # Signal quality: trust vs citation divergence indicates polishing
    quality_ratio = round((trust_flow / max(citation_flow, 0.1)), 2)

    return {
        "trust_flow": trust_flow,
        "citation_flow": citation_flow,
        "trust_citation_ratio": quality_ratio,
        "referring_domains": referring_count,
        "total_backlinks": total_links,
        "trusted_referring_domains": trusted_domains,
        "trusted_links": trusted_links,
        "toxic_links": toxic_links,
        "method": "heuristic (DA + toxic-score signals, approximates Majestic TC/CF)",
    }


async def compute_trust_citation_flow(db: AsyncSession, domain: str) -> dict:
    """Compute Trust/Citation Flow for a domain from ReferringDomain rows.
    Enhances DA values with real Open PageRank data when API key is configured."""
    domain = domain.lower().strip().lstrip("www.")

    result = await db.execute(
        select(ReferringDomain).where(ReferringDomain.target_domain == domain)
    )
    domains = result.scalars().all()

    if not domains:
        return {
            "domain": domain,
            "trust_flow": 0, "citation_flow": 0, "referring_domains": 0,
            "note": "No referring domains found. Refresh backlinks for this domain first.",
            "source": "common_crawl",
        }

    # Enhance DA values with real Open PageRank data when available
    from app.config import settings
    opr_key = getattr(settings, "OPEN_PAGERANK_API_KEY", "") or ""
    if opr_key:
        try:
            import httpx
            domain_list = [rd.domain for rd in domains[:50]]
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    "https://openpagerank.com/api/v1.0/getPageRank",
                    params={"domains[]": domain_list},
                    headers={"API-OPR": opr_key},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for row in data.get("response") or []:
                        dom = row.get("domain", "").lstrip("www.")
                        da = row.get("domain_authority", 0)
                        if da:
                            for rd in domains:
                                if rd.domain.lstrip("www.") == dom:
                                    rd.domain_authority = da
        except Exception as e:
            logger.debug(f"Open PageRank enhancement failed: {e}")

    tfcf = _trust_from_referring_domains(domains)
    tfcf["domain"] = domain
    tfcf["source"] = "common_crawl + open_pagerank" if opr_key else "common_crawl"
    tfcf["note"] = "Trust/Citation Flow vs Majestic — derived from referring-domain authority. Enhanced with real Open PageRank DA when configured."
    return tfcf
