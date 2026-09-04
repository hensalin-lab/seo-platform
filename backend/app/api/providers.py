"""Provider configuration API: list, configure, test and resolve third-party
data providers. Per-user keys are stored in ProviderSetting and override
environment variables. Keyless fallbacks are always available."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.rate_limit import limiter
from app.models import ProviderSetting, User
from app.api.auth import get_current_active_user
from app.engine.providers import (
    ALL_PROVIDERS, PROVIDER_CATALOG, build_provider, effective_config,
    full_status, get_user_provider_config, is_configured, resolve_for_capability,
    test_provider,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/providers", tags=["providers"])

CAPABILITIES = {
    "keyword_volume": {"label": "Keyword volume", "description": "Search volume, CPC and competition per keyword."},
    "serp_ranks": {"label": "Live SERP ranks", "description": "Current position of your pages for tracked keywords."},
    "backlinks": {"label": "Backlink index", "description": "Inbound links, referring domains and authority metrics."},
    "ai_citations": {"label": "AI citations", "description": "Brand mentions and citation readiness across LLM answer engines."},
    "gsc": {"label": "Google Search Console", "description": "Impressions, clicks and positions from your verified properties."},
}


class ProviderConfigRequest(BaseModel):
    config: dict
    is_active: Optional[bool] = True


class ProviderTestRequest(BaseModel):
    config: Optional[dict] = None
    capability: Optional[str] = None


def _known(provider: str):
    if provider not in {p["name"] for p in ALL_PROVIDERS}:
        raise HTTPException(status_code=404, detail=f"Unknown provider {provider!r}")


@router.get("")
async def list_providers(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    user_config = await get_user_provider_config(db, user.id)
    return {
        "capabilities": CAPABILITIES,
        "providers": full_status(user_config),
        "resolved": {
            cap: resolve_for_capability(cap, user_config)
            for cap in CAPABILITIES
        },
    }


@router.get("/capabilities")
async def capabilities(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    user_config = await get_user_provider_config(db, user.id)
    return {
        "capabilities": CAPABILITIES,
        "resolved": {
            cap: resolve_for_capability(cap, user_config)
            for cap in CAPABILITIES
        },
    }


@router.get("/{name}")
async def get_provider(name: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    _known(name)
    user_config = await get_user_provider_config(db, user.id)
    st = next((p for p in full_status(user_config) if p["name"] == name), None)
    return st or {"name": name, "configured": False}


@router.put("/{name}")
async def save_provider(name: str, req: ProviderConfigRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    _known(name)
    row = (await db.execute(select(ProviderSetting).where(
        ProviderSetting.user_id == user.id, ProviderSetting.provider == name
    ))).scalar_one_or_none()
    if not row:
        row = ProviderSetting(user_id=user.id, provider=name)
        db.add(row)
    row.config = {k: v for k, v in (req.config or {}).items() if v not in (None, "")}
    row.is_active = req.is_active
    await db.commit()
    return {"status": "saved", "provider": name, "configured": is_configured(name, row.config)}


@router.delete("/{name}")
async def delete_provider(name: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    _known(name)
    row = (await db.execute(select(ProviderSetting).where(
        ProviderSetting.user_id == user.id, ProviderSetting.provider == name
    ))).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"status": "removed", "provider": name}


@router.post("/{name}/test")
@limiter.limit(settings.RATE_LIMIT_PROVIDER_TEST)
async def test(
    request: Request,
    name: str,
    req: ProviderTestRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    _known(name)
    # Guard the credential-test (which hits the live paid API) against spend caps.
    from app.engine.spend_guard import ProviderBudgetExceeded, check_provider_budget, record_provider_usage
    try:
        await check_provider_budget(db, user.id, name, cost=1)
    except ProviderBudgetExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))
    user_config = await get_user_provider_config(db, user.id)
    test_config = user_config.get(name)
    if req.config is not None:
        merged = dict(effective_config(name, {}))
        merged.update({k: v for k, v in req.config.items() if v not in (None, "")})
        test_config = merged
    result = await test_provider(name, test_config, req.capability)
    await record_provider_usage(db, user.id, name, cost=1,
                                details={"action": "test", "capability": req.capability})
    return {"provider": name, **result}


@router.get("/{name}/fields")
async def provider_fields(name: str, user: User = Depends(get_current_active_user)):
    _known(name)
    for p in PROVIDER_CATALOG:
        if p["name"] == name:
            return {"name": name, "label": p["label"], "capabilities": p["capabilities"], "config_fields": p["config_fields"], "docs": p.get("docs", "")}
    return {"name": name, "label": name, "capabilities": [], "config_fields": [], "docs": ""}
