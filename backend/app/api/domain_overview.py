"""Domain Overview API — fast aggregate endpoint for the Growth AI Engine
"front door" page.

GET /api/domain-overview/{domain} returns a fast snapshot combining data
from across modules without triggering a full crawl. Returns partial data
with CTA fields for whatever module hasn't been run yet.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    Audit, AuditScore, TrackedDomain, TrackedKeyword, RankSnapshot,
    Backlink, ReferringDomain, User,
)
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/domain-overview", tags=["domain-overview"])


def _domain_of(url: str) -> str:
    """Extract bare domain from a URL string."""
    from urllib.parse import urlparse
    try:
        return (urlparse(url or "").hostname or "").lower().lstrip("www.")
    except Exception:
        return ""


@router.get("/{domain}")
async def get_domain_overview(domain: str,
                              user: User = Depends(get_current_active_user),
                              db: AsyncSession = Depends(get_db)):
    """Return a fast aggregate overview for *domain*.

    This endpoint reads across all modules and returns whatever data exists,
    with CTA fields indicating what hasn't been run yet. It does NOT trigger
    any crawl or analysis — it is purely read-side.
    """
    d = domain.lower().strip()

    # ── Last audit score ──────────────────────────────────────────────────
    last_audit = (await db.execute(
        select(Audit)
        .where(Audit.website_url.ilike(f"%{d}%"))
        .order_by(desc(Audit.created_at))
        .limit(1)
    )).scalar_one_or_none()

    last_audit_score = None
    last_audit_id = None
    last_audit_date = None
    if last_audit:
        last_audit_id = last_audit.id
        last_audit_date = last_audit.created_at.isoformat() if last_audit.created_at else None
        score_row = (await db.execute(
            select(AuditScore).where(AuditScore.audit_id == last_audit.id)
        )).scalar_one_or_none()
        if score_row:
            last_audit_score = {
                "overall": score_row.overall_score,
                "seo": score_row.seo_score,
                "technical": score_row.technical_score,
                "aeo": score_row.aeo_score,
                "geo": score_row.geo_score,
                "content": score_row.content_score,
            }

    # ── Backlink summary ──────────────────────────────────────────────────
    backlink_count = None
    referring_domain_count = None
    if last_audit_id:
        backlink_count = (await db.execute(
            select(func.count(Backlink.id)).where(Backlink.audit_id == last_audit_id)
        )).scalar() or 0
        referring_domain_count = (await db.execute(
            select(func.count(ReferringDomain.id)).where(ReferringDomain.audit_id == last_audit_id)
        )).scalar() or 0

    # ── Tracked keyword summary ───────────────────────────────────────────
    tracked_domain = (await db.execute(
        select(TrackedDomain).where(TrackedDomain.domain == d)
    )).scalar_one_or_none()

    tracked_kw_count = 0
    avg_position = None
    if tracked_domain:
        tracked_kw_count = (await db.execute(
            select(func.count(TrackedKeyword.id)).where(
                TrackedKeyword.target_domain_id == tracked_domain.id
            )
        )).scalar() or 0

        if tracked_kw_count > 0:
            # Get latest snapshot per keyword, average the position
            subq = (
                select(
                    RankSnapshot.tracked_keyword_id,
                    func.max(RankSnapshot.checked_at).label("max_dt"),
                )
                .group_by(RankSnapshot.tracked_keyword_id)
            ).subquery()

            latest_snaps = await db.execute(
                select(RankSnapshot).join(
                    subq,
                    (RankSnapshot.tracked_keyword_id == subq.c.tracked_keyword_id) &
                    (RankSnapshot.checked_at == subq.c.max_dt)
                )
            )
            snaps = latest_snaps.scalars().all()
            positions = [s.position for s in snaps if s.position is not None]
            if positions:
                avg_position = round(sum(positions) / len(positions), 1)

    # ── Top pages (from last audit) ───────────────────────────────────────
    top_pages = []
    if last_audit_id:
        from app.models import Page
        pages_result = await db.execute(
            select(Page)
            .where(Page.audit_id == last_audit_id)
            .order_by(desc(Page.word_count))
            .limit(5)
        )
        for p in pages_result.scalars().all():
            top_pages.append({
                "url": p.url,
                "title": p.title or "",
                "word_count": p.word_count or 0,
                "status_code": p.status_code,
            })

    # ── Build response with CTA flags ─────────────────────────────────────
    has_backlinks = backlink_count is not None
    has_keywords = tracked_kw_count > 0
    has_audit = last_audit_score is not None

    return {
        "domain": d,
        "last_audit": {
            "id": last_audit_id,
            "score": last_audit_score,
            "completed_at": last_audit_date,
        } if has_audit else None,
        "backlinks": {
            "total": backlink_count,
            "referring_domains": referring_domain_count,
        } if has_backlinks else None,
        "rank_tracking": {
            "tracked_keywords": tracked_kw_count,
            "avg_position": avg_position,
        } if has_keywords else None,
        "top_pages": top_pages,
        "ctas": {
            "run_audit": not has_audit,
            "analyze_backlinks": not has_backlinks and has_audit,
            "track_keywords": not has_keywords,
        },
    }
