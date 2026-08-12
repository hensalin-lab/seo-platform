"""User-facing audit-trail endpoint: the current user's own activity."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import User, ActivityLog
from app.api.auth import get_current_active_user

router = APIRouter(prefix="/api", tags=["activity"])


@router.get("/activity")
async def list_own_activity(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Recent activity for the current user (paged)."""
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)

    count_q = (
        select(func.count())
        .select_from(ActivityLog)
        .where(ActivityLog.user_id == user.id)
    )
    total = (await db.execute(count_q)).scalar()

    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.scalars().all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": r.id,
                "action": r.action,
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "details": r.details or {},
                "created_at": r.created_at.isoformat() if r.created_at else "",
            }
            for r in rows
        ],
    }
