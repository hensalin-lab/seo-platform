"""Admin endpoints: user management, platform stats, and audit-trail feed.

Only users with role=ADMIN can access these (see require_admin)."""
import datetime as _dt
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.database import get_db
from app.models import User, Audit, ActivityLog, Webhook, ScheduledAudit, AuditShareLink
from app.api.auth import require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

VALID_ROLES = ("ADMIN", "EDITOR", "VIEWER")


class UserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None


@router.get("/stats")
async def admin_stats(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """High-level platform stats for the admin dashboard."""
    users = await db.execute(select(func.count()).select_from(User))
    audits = await db.execute(select(func.count()).select_from(Audit))
    completed = await db.execute(
        select(func.count()).select_from(Audit).where(Audit.status == "COMPLETED")
    )
    failed = await db.execute(
        select(func.count()).select_from(Audit).where(Audit.status == "FAILED")
    )
    webhooks = await db.execute(select(func.count()).select_from(Webhook))
    scheduled = await db.execute(
        select(func.count()).select_from(ScheduledAudit).where(ScheduledAudit.is_active == True)
    )
    shares = await db.execute(
        select(func.count()).select_from(AuditShareLink).where(AuditShareLink.is_active == True)
    )
    activity_24h = await db.execute(
        select(func.count()).select_from(ActivityLog).where(
            ActivityLog.created_at >= _dt.datetime.utcnow() - _dt.timedelta(hours=24)
        )
    )

    role_counts = await db.execute(
        select(User.role, func.count()).group_by(User.role)
    )
    roles = {role: count for role, count in role_counts.all()}

    return {
        "total_users": users.scalar(),
        "total_audits": audits.scalar(),
        "audits_completed": completed.scalar(),
        "audits_failed": failed.scalar(),
        "total_webhooks": webhooks.scalar(),
        "active_scheduled_audits": scheduled.scalar(),
        "active_share_links": shares.scalar(),
        "activity_last_24h": activity_24h.scalar(),
        "users_by_role": roles,
        "generated_at": _dt.datetime.utcnow().isoformat(),
    }


@router.get("/users")
async def list_users(
    limit: int = 50,
    offset: int = 0,
    q: str = "",
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List users with audit counts (paged)."""
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)

    filters = []
    if q:
        like = f"%{q.strip()}%"
        filters.append(or_(User.email.like(like), User.username.like(like)))

    count_q = select(func.count()).select_from(User)
    if filters:
        count_q = count_q.where(*filters)
    total = (await db.execute(count_q)).scalar()

    query = select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    if filters:
        query = query.where(*filters)
    result = await db.execute(query)
    users = result.scalars().all()

    audit_counts = {}
    if users:
        ids = [u.id for u in users]
        counts = await db.execute(
            select(Audit.user_id, func.count()).where(Audit.user_id.in_(ids)).group_by(Audit.user_id)
        )
        audit_counts = {uid: c for uid, c in counts.all()}

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "username": u.username,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else "",
                "audit_count": audit_counts.get(u.id, 0),
            }
            for u in users
        ],
    }


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    payload: UserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's role and/or active state. Admins cannot demote themselves."""
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    role = payload.role.upper() if payload.role else None
    is_active = payload.is_active

    if role is not None:
        if role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail="Role must be ADMIN, EDITOR, or VIEWER")
        if target.id == admin.id and role != "ADMIN":
            raise HTTPException(status_code=400, detail="Cannot demote yourself")

    if is_active is not None and target.id == admin.id and not is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    if role is not None:
        target.role = role
    if is_active is not None:
        target.is_active = is_active
    target.updated_at = _dt.datetime.utcnow()

    from app.utils.activity import log_activity
    await log_activity(
        db, admin.id, "user.updated", "user", target.id,
        {"role": role, "is_active": is_active},
    )
    await db.commit()
    return {
        "id": target.id,
        "email": target.email,
        "username": target.username,
        "role": target.role,
        "is_active": target.is_active,
    }


@router.get("/activity")
async def list_activity(
    limit: int = 50,
    offset: int = 0,
    user_id: str = "",
    action: str = "",
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Full audit-trail feed (admin)."""
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)

    filters = []
    if user_id:
        filters.append(ActivityLog.user_id == user_id)
    if action:
        filters.append(ActivityLog.action.like(f"%{action.strip()}%"))

    count_q = select(func.count()).select_from(ActivityLog)
    if filters:
        count_q = count_q.where(*filters)
    total = (await db.execute(count_q)).scalar()

    query = select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit).offset(offset)
    if filters:
        query = query.where(*filters)
    result = await db.execute(query)
    rows = result.scalars().all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "action": r.action,
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "details": r.details or {},
                "created_at": r.created_at.isoformat() if r.created_at else "",
            }
            for r in rows
        ],
    }
