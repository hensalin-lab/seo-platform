import datetime as _dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import DigestPreference
from app.api.auth import get_current_active_user
from app.models import User

router = APIRouter(prefix="/api/digest", tags=["digest"])


class DigestPrefRequest(BaseModel):
    enabled: bool = True
    frequency: str = "weekly"


def _pref_dict(p: DigestPreference) -> dict:
    return {
        "enabled": p.enabled,
        "frequency": p.frequency,
        "last_sent_at": p.last_sent_at.isoformat() if p.last_sent_at else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


async def _get_pref(db: AsyncSession, user_id: str) -> DigestPreference:
    result = await db.execute(select(DigestPreference).where(DigestPreference.user_id == user_id))
    pref = result.scalar_one_or_none()
    if not pref:
        pref = DigestPreference(user_id=user_id, enabled=True, frequency="weekly")
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
    return pref


@router.get("/preferences")
async def get_digest_preferences(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    pref = await _get_pref(db, user.id)
    return _pref_dict(pref)


@router.put("/preferences")
async def update_digest_preferences(req: DigestPrefRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    if req.frequency not in ("daily", "weekly", "monthly"):
        raise HTTPException(status_code=400, detail="frequency must be daily, weekly or monthly")
    pref = await _get_pref(db, user.id)
    pref.enabled = req.enabled
    pref.frequency = req.frequency
    await db.commit()
    await db.refresh(pref)
    return _pref_dict(pref)


@router.get("/status")
async def get_digest_status(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    from app.engine.emailer import email_configured
    from app.config import settings
    pref = await _get_pref(db, user.id)
    return {
        "configured": email_configured(),
        "host": settings.SMTP_HOST or "",
        "from_email": settings.EMAIL_FROM or "",
        "preference": _pref_dict(pref),
        "setup_help": "Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and EMAIL_FROM to enable the weekly AI SEO digest email.",
    }


@router.post("/send")
async def send_digest_now(user: User = Depends(get_current_active_user)):
    from app.engine.digest import send_digest
    result = await send_digest(user.id)
    if not result.get("sent"):
        raise HTTPException(status_code=400, detail=result.get("reason", "Digest could not be sent (SMTP not configured?)"))
    return {"status": "sent", "stats": result.get("stats", {})}
