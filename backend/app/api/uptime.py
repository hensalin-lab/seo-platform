"""Uptime monitoring API: targets CRUD, on-demand checks, check history."""
import logging
import datetime as _dt
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import UptimeTarget, UptimeCheck, User
from app.api.auth import get_current_active_user
from app.engine.uptime import run_check_for_target, get_uptime_percent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/uptime", tags=["uptime"])


class UptimeTargetRequest(BaseModel):
    name: str = ""
    url: str
    interval_minutes: int = 5
    is_active: bool = True


def _target_dict(t: UptimeTarget, uptime_percent=None) -> dict:
    return {
        "id": t.id,
        "name": t.name or "",
        "url": t.url,
        "interval_minutes": t.interval_minutes or 5,
        "is_active": bool(t.is_active),
        "last_checked_at": t.last_checked_at.isoformat() if t.last_checked_at else None,
        "last_status_code": t.last_status_code,
        "last_is_up": t.last_is_up,
        "uptime_percent": uptime_percent,
        "created_at": t.created_at.isoformat() if t.created_at else "",
    }


async def _get_target(db, target_id, user) -> UptimeTarget:
    result = await db.execute(select(UptimeTarget).where(UptimeTarget.id == target_id, UptimeTarget.user_id == user.id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Uptime target not found")
    return t


@router.get("/targets")
async def list_targets(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    count_q = select(func.count()).select_from(UptimeTarget).where(UptimeTarget.user_id == user.id)
    total = (await db.execute(count_q)).scalar()
    result = await db.execute(
        select(UptimeTarget).where(UptimeTarget.user_id == user.id).order_by(UptimeTarget.created_at.desc()).limit(limit).offset(offset)
    )
    targets = result.scalars().all()
    out = []
    for t in targets:
        out.append(_target_dict(t, await get_uptime_percent(db, t.id)))
    return {"targets": out, "total": total, "limit": limit, "offset": offset}


@router.post("/targets")
async def create_target(req: UptimeTargetRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    if not req.url.strip().startswith(("http://", "https://")):
        raise HTTPException(status_code=422, detail="URL must start with http:// or https://")
    t = UptimeTarget(
        user_id=user.id, name=req.name.strip(), url=req.url.strip(),
        interval_minutes=max(1, min(1440, req.interval_minutes)),
        is_active=req.is_active,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return _target_dict(t)


@router.put("/targets/{target_id}")
async def update_target(target_id: str, req: UptimeTargetRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    t = await _get_target(db, target_id, user)
    if req.url.strip().startswith(("http://", "https://")):
        t.url = req.url.strip()
    t.name = req.name.strip()
    t.interval_minutes = max(1, min(1440, req.interval_minutes))
    t.is_active = req.is_active
    await db.commit()
    await db.refresh(t)
    return _target_dict(t, await get_uptime_percent(db, t.id))


@router.delete("/targets/{target_id}")
async def delete_target(target_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    t = await _get_target(db, target_id, user)
    await db.delete(t)
    await db.commit()
    return {"status": "deleted"}


@router.post("/targets/{target_id}/check")
async def check_now(target_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    t = await _get_target(db, target_id, user)
    result = await run_check_for_target(db, t)
    return {"target_id": target_id, "result": result}


@router.get("/targets/{target_id}/checks")
async def list_checks(target_id: str, limit: int = Query(50, ge=1, le=500), user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    t = await _get_target(db, target_id, user)
    result = await db.execute(
        select(UptimeCheck).where(UptimeCheck.target_id == target_id).order_by(desc(UptimeCheck.checked_at)).limit(limit)
    )
    checks = result.scalars().all()
    return {
        "target": _target_dict(t, await get_uptime_percent(db, t.id)),
        "checks": [{
            "id": c.id, "status_code": c.status_code, "is_up": c.is_up,
            "response_time_ms": c.response_time_ms, "error": c.error or "",
            "checked_at": c.checked_at.isoformat() if c.checked_at else "",
        } for c in checks],
        "total": len(checks),
    }
