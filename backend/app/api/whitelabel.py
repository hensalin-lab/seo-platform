import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import WhiteLabelSettings
from app.api.auth import get_current_active_user
from app.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/whitelabel", tags=["whitelabel"])


class WhiteLabelRequest(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    custom_domain: Optional[str] = None
    is_active: Optional[bool] = None


async def _get_or_create(user_id: str, db: AsyncSession) -> WhiteLabelSettings:
    result = await db.execute(select(WhiteLabelSettings).where(WhiteLabelSettings.user_id == user_id))
    wl = result.scalar_one_or_none()
    if not wl:
        wl = WhiteLabelSettings(user_id=user_id)
        db.add(wl)
        await db.commit()
        await db.refresh(wl)
    return wl


@router.get("")
async def get_whitelabel(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    wl = await _get_or_create(user.id, db)
    return {
        "id": wl.id, "company_name": wl.company_name, "logo_url": wl.logo_url,
        "primary_color": wl.primary_color, "secondary_color": wl.secondary_color,
        "custom_domain": wl.custom_domain, "is_active": wl.is_active,
    }


@router.put("")
async def update_whitelabel(req: WhiteLabelRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    wl = await _get_or_create(user.id, db)
    if req.company_name is not None:
        wl.company_name = req.company_name
    if req.logo_url is not None:
        wl.logo_url = req.logo_url
    if req.primary_color is not None:
        wl.primary_color = req.primary_color
    if req.secondary_color is not None:
        wl.secondary_color = req.secondary_color
    if req.custom_domain is not None:
        wl.custom_domain = req.custom_domain
    if req.is_active is not None:
        wl.is_active = req.is_active
    await db.commit()
    await db.refresh(wl)
    return {
        "id": wl.id, "company_name": wl.company_name, "logo_url": wl.logo_url,
        "primary_color": wl.primary_color, "secondary_color": wl.secondary_color,
        "custom_domain": wl.custom_domain, "is_active": wl.is_active,
    }
