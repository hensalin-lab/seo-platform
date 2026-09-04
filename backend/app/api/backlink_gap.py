"""Backlink Gap Analysis API — compares referring domains between your domain
and up to 3 competitors using Backlink/ReferringDomain rows populated by the
Common Crawl ingestion pipeline (target_domain-keyed).

GET /api/backlink-gap/{domain}?competitors=domain1,domain2,domain3
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ReferringDomain, User
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/backlink-gap", tags=["backlink-gap"])


async def _get_referring_domains(db: AsyncSession, domain: str) -> set:
    """Return the set of referring domains for a target domain."""
    d = domain.lower().strip()
    result = await db.execute(
        select(ReferringDomain.domain).where(ReferringDomain.target_domain == d)
    )
    return {row[0] for row in result.all()}


@router.get("/{domain}")
async def backlink_gap(
    domain: str,
    competitors: str = Query(..., description="Comma-separated competitor domains, up to 3"),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Compare referring domains between your domain and up to 3 competitors.

    Returns:
      - link_that_to_competitor: domains linking to a competitor but not to you
      - link_to_you_but_not_competitor: domains linking to you but not to competitors
      - overlap: domains linking to both you and at least one competitor
      - combined: flattened view for the table
    """
    d1 = domain.lower().strip()
    comp_list = [c.lower().strip() for c in (competitors or "").split(",") if c.strip()][:3]

    if not d1:
        return {"note": "Missing target domain.", "combined": []}

    your_domains = await _get_referring_domains(db, d1)

    # Get referring domains for each competitor
    comp_domains = {}
    for c in comp_list:
        comp_domains[c] = await _get_referring_domains(db, c)

    # Build set of all domains referenced
    all_domains = set(your_domains)
    for c in comp_list:
        all_domains |= comp_domains[c]

    # Classify each domain
    link_that_to_competitor = []      # domain links to competitor but not you
    link_to_you_but_not_competitor = []  # domain links to you but not competitors
    overlap = []                      # domain links to you and at least one competitor

    for rd in all_domains:
        links_to_you = rd in your_domains
        links_to_comps = [c for c in comp_list if rd in comp_domains[c]]

        if links_to_you and links_to_comps:
            overlap.append({"domain": rd, "competitors": links_to_comps})
        elif links_to_comps and not links_to_you:
            link_that_to_competitor.append({"domain": rd, "competitors": links_to_comps})
        elif links_to_you and not links_to_comps:
            link_to_you_but_not_competitor.append({"domain": rd, "competitors": []})

    # Combined flat list for the table
    combined = []
    for nd in ["unique_to_you", "unique_to_competitor", "overlap"]:
        items = {
            "unique_to_you": link_to_you_but_not_competitor,
            "unique_to_competitor": link_that_to_competitor,
            "overlap": overlap,
        }[nd]
        for it in items:
            combined.append({**it, "type": nd})

    return {
        "domain": d1,
        "competitors": comp_list,
        "your_referring_domains_count": len(your_domains),
        "competitors_referring_domains_count": {c: len(comp_domains[c]) for c in comp_list},
        "link_that_to_competitor": link_that_to_competitor,
        "link_to_you_but_not_competitor": link_to_you_but_not_competitor,
        "overlap": overlap,
        "combined": combined,
        "summary": {
            "your_domains": len(your_domains),
            "competitor_domains": {c: len(comp_domains[c]) for c in comp_list},
            "unique_to_you_count": len(link_to_you_but_not_competitor),
            "unique_to_competitor_count": len(link_that_to_competitor),
            "overlap_count": len(overlap),
        },
    }
