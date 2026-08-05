"""Per-user Google Search Console settings: service account JSON + property URL."""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.engine.gsc_engine import GSCEngine
from app.models import GSCSettings, User
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/gsc", tags=["gsc"])


class GSCSettingsRequest(BaseModel):
    service_account_json: str = ""
    property_url: str = ""


def _normalize_property(url: str) -> str:
    return (url or "").strip().rstrip("/")


def _property_matches(url: str, sites: list) -> bool:
    target = _normalize_property(url).lower()
    if not target:
        return False
    for s in sites:
        site = (s or "").lower()
        if site == target or site == target + "/":
            return True
        if site.startswith("sc-domain:"):
            domain = site.split(":", 1)[1]
            if target.startswith("https://") or target.startswith("http://"):
                host = target.split("//", 1)[1].split("/", 1)[0]
                if host == domain or host.startswith("www." + domain) or domain.startswith("www." + host):
                    return True
            elif target == domain:
                return True
    return False


async def _list_sites(service_account_json: str) -> list:
    engine = GSCEngine(service_account_json=service_account_json)
    service = engine._get_service()
    if not service:
        raise HTTPException(status_code=400, detail="Invalid service account JSON. Check the key format and that the Search Console API is enabled.")
    try:
        sites = service.sites().list().execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google Search Console API error: {e}")
    return [s.get("siteUrl", "") for s in sites.get("siteEntry", [])]


def _client_email(service_account_json: str) -> str:
    try:
        info = json.loads(service_account_json)
        return info.get("client_email", "")
    except Exception:
        return ""


@router.get("/settings")
async def get_gsc_settings(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GSCSettings).where(GSCSettings.user_id == user.id))
    gs = result.scalar_one_or_none()
    if not gs or not gs.service_account_json:
        return {"configured": False, "property_url": "", "client_email": ""}
    return {
        "configured": True,
        "property_url": gs.property_url or "",
        "client_email": _client_email(gs.service_account_json),
    }


@router.put("/settings")
async def save_gsc_settings(body: GSCSettingsRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    if not body.service_account_json or not body.service_account_json.strip():
        raise HTTPException(status_code=400, detail="Service account JSON is required")
    try:
        json.loads(body.service_account_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Service account JSON is not valid JSON")

    sites = await _list_sites(body.service_account_json)
    matched = _property_matches(body.property_url, sites)

    result = await db.execute(select(GSCSettings).where(GSCSettings.user_id == user.id))
    gs = result.scalar_one_or_none()
    if not gs:
        gs = GSCSettings(user_id=user.id)
        db.add(gs)
    gs.service_account_json = body.service_account_json.strip()
    gs.property_url = body.property_url.strip()
    await db.commit()

    return {
        "configured": True,
        "property_url": gs.property_url,
        "client_email": _client_email(gs.service_account_json),
        "sites_visible": sites,
        "property_matched": matched,
    }


@router.post("/test")
async def test_gsc_settings(body: GSCSettingsRequest, user: User = Depends(get_current_active_user)):
    if not body.service_account_json or not body.service_account_json.strip():
        raise HTTPException(status_code=400, detail="Service account JSON is required")
    try:
        json.loads(body.service_account_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Service account JSON is not valid JSON")

    sites = await _list_sites(body.service_account_json)
    return {
        "ok": True,
        "client_email": _client_email(body.service_account_json),
        "sites_visible": sites,
        "property_matched": _property_matches(body.property_url, sites),
    }


@router.delete("/settings")
async def delete_gsc_settings(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GSCSettings).where(GSCSettings.user_id == user.id))
    gs = result.scalar_one_or_none()
    if gs:
        await db.delete(gs)
        await db.commit()
    return {"configured": False}
