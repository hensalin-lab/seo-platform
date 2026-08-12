import logging
import datetime as _dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import ScheduledAudit
from app.api.auth import get_current_active_user
from app.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/scheduled", tags=["scheduled"])


class ScheduledAuditRequest(BaseModel):
    website_url: str
    competitor_url: Optional[str] = None
    frequency: str = "weekly"


@router.post("")
async def create_scheduled_audit(req: ScheduledAuditRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    now = _dt.datetime.utcnow()
    freq_map = {"daily": 1, "weekly": 7, "monthly": 30}
    days = freq_map.get(req.frequency, 7)
    next_run = now + _dt.timedelta(days=days)

    sa = ScheduledAudit(
        user_id=user.id, website_url=req.website_url,
        competitor_url=req.competitor_url, frequency=req.frequency,
        next_run=next_run,
    )
    db.add(sa)
    await db.flush()

    from app.utils.activity import log_activity
    await log_activity(
        db, user.id, "scheduled.created", "scheduled_audit", sa.id,
        {"website_url": req.website_url, "frequency": req.frequency},
    )
    await db.commit()
    await db.refresh(sa)
    return {
        "id": sa.id, "website_url": sa.website_url, "competitor_url": sa.competitor_url,
        "frequency": sa.frequency, "next_run": sa.next_run.isoformat() if sa.next_run else None,
        "is_active": sa.is_active, "created_at": sa.created_at.isoformat() if sa.created_at else "",
    }


@router.get("")
async def list_scheduled_audits(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    count_q = select(func.count()).select_from(ScheduledAudit).where(ScheduledAudit.user_id == user.id)
    total = (await db.execute(count_q)).scalar()
    result = await db.execute(
        select(ScheduledAudit).where(ScheduledAudit.user_id == user.id).order_by(ScheduledAudit.created_at.desc()).limit(limit).offset(offset)
    )
    items = result.scalars().all()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [{
            "id": s.id, "website_url": s.website_url, "competitor_url": s.competitor_url,
            "frequency": s.frequency, "next_run": s.next_run.isoformat() if s.next_run else None,
            "is_active": s.is_active, "created_at": s.created_at.isoformat() if s.created_at else "",
        } for s in items],
    }


@router.put("/{sa_id}")
async def update_scheduled_audit(sa_id: str, req: ScheduledAuditRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduledAudit).where(ScheduledAudit.id == sa_id, ScheduledAudit.user_id == user.id))
    sa = result.scalar_one_or_none()
    if not sa:
        raise HTTPException(status_code=404, detail="Scheduled audit not found")
    sa.website_url = req.website_url
    sa.competitor_url = req.competitor_url
    sa.frequency = req.frequency
    freq_map = {"daily": 1, "weekly": 7, "monthly": 30}
    sa.next_run = _dt.datetime.utcnow() + _dt.timedelta(days=freq_map.get(req.frequency, 7))
    await db.commit()
    await db.refresh(sa)
    return {
        "id": sa.id, "website_url": sa.website_url, "frequency": sa.frequency,
        "next_run": sa.next_run.isoformat() if sa.next_run else None, "is_active": sa.is_active,
    }


@router.delete("/{sa_id}")
async def delete_scheduled_audit(sa_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduledAudit).where(ScheduledAudit.id == sa_id, ScheduledAudit.user_id == user.id))
    sa = result.scalar_one_or_none()
    if not sa:
        raise HTTPException(status_code=404, detail="Scheduled audit not found")

    from app.utils.activity import log_activity
    await log_activity(db, user.id, "scheduled.deleted", "scheduled_audit", sa_id, {"website_url": sa.website_url})
    await db.delete(sa)
    await db.commit()
    return {"status": "deleted"}
