"""Rank Tracking API — CRUD for TrackedKeywords and RankSnapshots.

Endpoints:
    POST   /api/rank-tracking/keywords              — add a keyword to track
    GET    /api/rank-tracking/{domain}/keywords      — list with latest position + delta
    GET    /api/rank-tracking/{domain}/keywords/{id}/history — full snapshot history
    DELETE /api/rank-tracking/keywords/{id}          — remove a tracked keyword
    POST   /api/rank-tracking/{domain}/refresh       — manual trigger (background task)
    GET    /api/rank-tracking/{domain}/export/csv    — CSV export
"""
import csv
import datetime as _dt
import io
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    TrackedDomain, TrackedKeyword, RankSnapshot, User, DeviceEnum,
)
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rank-tracking", tags=["rank-tracking"])


# ── Pydantic request bodies ──────────────────────────────────────────────────

class AddKeywordBody(BaseModel):
    domain: str
    keyword: str
    device: str = "desktop"
    location: str = "us"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_create_domain(db: AsyncSession, domain: str,
                                user_id: str) -> TrackedDomain:
    """Return an existing TrackedDomain or create a new one."""
    result = await db.execute(
        select(TrackedDomain).where(TrackedDomain.domain == domain.lower().strip())
    )
    td = result.scalar_one_or_none()
    if td:
        return td
    td = TrackedDomain(domain=domain.lower().strip(), is_own_domain=False)
    db.add(td)
    await db.flush()
    return td


def _delta_str(prev: Optional[int], curr: Optional[int]) -> str:
    if prev is None or curr is None:
        return "—"
    diff = curr - prev
    if diff == 0:
        return "="
    return f"+{diff}" if diff > 0 else str(diff)


def _serialize_keyword(kw: TrackedKeyword, latest: Optional[RankSnapshot],
                       prev: Optional[RankSnapshot]) -> dict:
    return {
        "id": kw.id,
        "keyword": kw.keyword,
        "device": kw.device,
        "location": kw.location,
        "position": latest.position if latest else None,
        "delta": _delta_str(prev.position if prev else None,
                            latest.position if latest else None),
        "serp_features": latest.serp_features if latest else {},
        "checked_at": latest.checked_at.isoformat() if latest and latest.checked_at else None,
        "added_at": kw.added_at.isoformat() if kw.added_at else None,
    }


async def _fetch_latest_snapshots(db: AsyncSession,
                                  keyword_id: str) -> tuple[Optional[RankSnapshot],
                                                           Optional[RankSnapshot]]:
    """Return (latest, previous) snapshots for a keyword."""
    result = await db.execute(
        select(RankSnapshot)
        .where(RankSnapshot.tracked_keyword_id == keyword_id)
        .order_by(desc(RankSnapshot.checked_at))
        .limit(2)
    )
    rows = result.scalars().all()
    return (rows[0] if rows else None, rows[1] if len(rows) > 1 else None)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/keywords")
async def add_keyword(body: AddKeywordBody,
                      user: User = Depends(get_current_active_user),
                      db: AsyncSession = Depends(get_db)):
    """Add a keyword to track for a domain."""
    device = body.device.lower()
    if device not in (DeviceEnum.DESKTOP.value, DeviceEnum.MOBILE.value):
        raise HTTPException(400, "device must be 'desktop' or 'mobile'")

    td = await _get_or_create_domain(db, body.domain, user.id)

    existing = (await db.execute(
        select(TrackedKeyword).where(
            TrackedKeyword.target_domain_id == td.id,
            TrackedKeyword.keyword == body.keyword.strip(),
            TrackedKeyword.device == device,
            TrackedKeyword.location == body.location,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(409, "Keyword already tracked for this domain/device/location")

    kw = TrackedKeyword(
        target_domain_id=td.id,
        keyword=body.keyword.strip(),
        device=device,
        location=body.location,
    )
    db.add(kw)
    await db.commit()
    return {"id": kw.id, "message": "Keyword added"}


@router.get("/{domain}/keywords")
async def list_keywords(domain: str,
                        user: User = Depends(get_current_active_user),
                        db: AsyncSession = Depends(get_db)):
    """List all tracked keywords for a domain with latest position + delta."""
    td_result = await db.execute(
        select(TrackedDomain).where(TrackedDomain.domain == domain.lower().strip())
    )
    td = td_result.scalar_one_or_none()
    if not td:
        return {"keywords": []}

    kws = (await db.execute(
        select(TrackedKeyword)
        .where(TrackedKeyword.target_domain_id == td.id)
        .order_by(TrackedKeyword.added_at.desc())
    )).scalars().all()

    items = []
    for kw in kws:
        latest, prev = await _fetch_latest_snapshots(db, kw.id)
        items.append(_serialize_keyword(kw, latest, prev))

    return {"domain": domain, "keywords": items}


@router.get("/{domain}/keywords/{keyword_id}/history")
async def keyword_history(domain: str, keyword_id: str,
                          user: User = Depends(get_current_active_user),
                          db: AsyncSession = Depends(get_db)):
    """Return full RankSnapshot history for a tracked keyword."""
    kw = await db.get(TrackedKeyword, keyword_id)
    if not kw:
        raise HTTPException(404, "Keyword not found")

    snapshots = (await db.execute(
        select(RankSnapshot)
        .where(RankSnapshot.tracked_keyword_id == keyword_id)
        .order_by(desc(RankSnapshot.checked_at))
    )).scalars().all()

    return {
        "keyword": kw.keyword,
        "history": [
            {
                "position": s.position,
                "serp_features": s.serp_features,
                "top_3_urls": s.top_3_urls,
                "checked_at": s.checked_at.isoformat() if s.checked_at else None,
            }
            for s in snapshots
        ],
    }


@router.delete("/keywords/{keyword_id}")
async def delete_keyword(keyword_id: str,
                         user: User = Depends(get_current_active_user),
                         db: AsyncSession = Depends(get_db)):
    """Remove a tracked keyword and its snapshots."""
    kw = await db.get(TrackedKeyword, keyword_id)
    if not kw:
        raise HTTPException(404, "Keyword not found")
    await db.delete(kw)
    await db.commit()
    return {"message": "Keyword deleted"}


@router.post("/{domain}/refresh")
async def refresh_keywords(domain: str,
                           background_tasks: BackgroundTasks,
                           user: User = Depends(get_current_active_user),
                           db: AsyncSession = Depends(get_db)):
    """Trigger a manual rank check for all keywords on a domain."""
    from app.engine.rank_tracking_engine import check_all_tracked_keywords

    td_result = await db.execute(
        select(TrackedDomain).where(TrackedDomain.domain == domain.lower().strip())
    )
    td = td_result.scalar_one_or_none()
    if not td:
        raise HTTPException(404, "Domain not found")

    background_tasks.add_task(check_all_tracked_keywords)
    return {"message": "Rank refresh queued"}


@router.get("/{domain}/export/csv")
async def export_csv(domain: str,
                     user: User = Depends(get_current_active_user),
                     db: AsyncSession = Depends(get_db)):
    """Export tracked keywords and their latest positions as CSV."""
    td_result = await db.execute(
        select(TrackedDomain).where(TrackedDomain.domain == domain.lower().strip())
    )
    td = td_result.scalar_one_or_none()
    if not td:
        raise HTTPException(404, "Domain not found")

    kws = (await db.execute(
        select(TrackedKeyword)
        .where(TrackedKeyword.target_domain_id == td.id)
        .order_by(TrackedKeyword.added_at.desc())
    )).scalars().all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Keyword", "Device", "Location", "Position", "Delta",
                     "Last Checked", "Added"])
    for kw in kws:
        latest, prev = await _fetch_latest_snapshots(db, kw.id)
        writer.writerow([
            kw.keyword, kw.device, kw.location,
            latest.position if latest else "",
            _delta_str(prev.position if prev else None,
                       latest.position if latest else None),
            latest.checked_at.isoformat() if latest and latest.checked_at else "",
            kw.added_at.isoformat() if kw.added_at else "",
        ])

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=rank-tracking-{domain}.csv"},
    )
