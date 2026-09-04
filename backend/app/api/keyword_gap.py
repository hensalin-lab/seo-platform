"""Keyword Gap Analysis API — compares tracked keywords between two domains
using RankSnapshot data. Works at the domain level (not audit-based).

GET /api/keyword-gap/{domain}/{competitor} returns keywords where the
competitor ranks but you don't (or rank lower), and vice versa.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    TrackedDomain, TrackedKeyword, RankSnapshot, User,
)
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/keyword-gap", tags=["keyword-gap"])


async def _get_latest_positions(db: AsyncSession, domain_id: str) -> dict:
    """Return {keyword: position} for the latest snapshot of each tracked keyword."""
    kws = (await db.execute(
        select(TrackedKeyword).where(TrackedKeyword.target_domain_id == domain_id)
    )).scalars().all()

    result = {}
    for kw in kws:
        snap = (await db.execute(
            select(RankSnapshot)
            .where(RankSnapshot.tracked_keyword_id == kw.id)
            .order_by(desc(RankSnapshot.checked_at))
            .limit(1)
        )).scalar_one_or_none()
        if snap and snap.position is not None:
            result[kw.keyword.lower()] = {
                "position": snap.position,
                "device": kw.device,
                "serp_features": snap.serp_features or {},
            }
    return result


@router.get("/{domain}/{competitor}")
async def keyword_gap(domain: str, competitor: str,
                      user: User = Depends(get_current_active_user),
                      db: AsyncSession = Depends(get_db)):
    """Compare tracked keywords between two domains.

    Returns:
      - your_only: keywords you track but competitor doesn't (or hasn't ranked)
      - competitor_only: keywords competitor ranks for but you don't track
      - both_rank: keywords both rank for, with position comparison
    """
    d1 = domain.lower().strip()
    d2 = competitor.lower().strip()

    td1 = (await db.execute(
        select(TrackedDomain).where(TrackedDomain.domain == d1)
    )).scalar_one_or_none()
    td2 = (await db.execute(
        select(TrackedDomain).where(TrackedDomain.domain == d2)
    )).scalar_one_or_none()

    if not td1 and not td2:
        return {
            "domain": d1, "competitor": d2,
            "your_only": [], "competitor_only": [], "both_rank": [],
            "note": "Neither domain has tracked keywords yet. Add keywords under Rank Tracking first.",
        }

    pos1 = await _get_latest_positions(db, td1.id) if td1 else {}
    pos2 = await _get_latest_positions(db, td2.id) if td2 else {}

    all_keywords = set(pos1.keys()) | set(pos2.keys())
    your_only = []
    competitor_only = []
    both_rank = []

    for kw in all_keywords:
        in_you = kw in pos1
        in_comp = kw in pos2
        if in_you and not in_comp:
            your_only.append({"keyword": kw, **pos1[kw]})
        elif in_comp and not in_you:
            competitor_only.append({"keyword": kw, **pos2[kw]})
        elif in_you and in_comp:
            both_rank.append({
                "keyword": kw,
                "your_position": pos1[kw]["position"],
                "competitor_position": pos2[kw]["position"],
                "gap": pos1[kw]["position"] - pos2[kw]["position"],
                "device": pos1[kw]["device"],
                "serp_features": pos1[kw]["serp_features"],
            })

    your_only.sort(key=lambda x: x["position"])
    competitor_only.sort(key=lambda x: x["position"])
    both_rank.sort(key=lambda x: x["gap"])

    return {
        "domain": d1,
        "competitor": d2,
        "your_only": your_only,
        "competitor_only": competitor_only,
        "both_rank": both_rank,
        "summary": {
            "your_keywords_tracked": len(pos1),
            "competitor_keywords_tracked": len(pos2),
            "your_only_count": len(your_only),
            "competitor_only_count": len(competitor_only),
            "both_rank_count": len(both_rank),
        },
    }
