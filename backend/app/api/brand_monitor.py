"""Brand / AI-citation monitor: estimates how visible and citable a brand is
across AI answer engines. Uses configured providers (Profound, SE Ranking) when
available, otherwise a keyless scan of crawled pages and AI-crawlability signals."""
import logging
import datetime as _dt
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Audit, Page, AiCitationRecord, User
from app.api.auth import get_current_active_user
from app.engine.providers import (
    KeylessCitationProvider, build_provider, effective_config,
    get_user_provider_config, is_configured, resolve_for_capability,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["brand-monitor"])


def _audit_guard(audit, user):
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    if audit.user_id and audit.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this audit")


def _derive_brand(website_url: str, pages) -> str:
    host = (urlparse(website_url or "").hostname or "").lower()
    host = host.lstrip("www.")
    base = host.split(".")[0] if host else ""
    # Prefer a brand-like word from the homepage title when it differs from the hostname root.
    for p in pages:
        if (p.url or "").rstrip("/") == (website_url or "").rstrip("/"):
            words = [w for w in (p.title or "").replace("|", " ").replace("-", " ").split() if len(w) > 2]
            if words:
                return words[0].title()
            break
    return base.title() or website_url or "Your brand"


@router.get("/audit/{audit_id}/brand-monitor")
async def get_brand_monitor(
    audit_id: str,
    brand: str = Query("", description="Optional brand name override"),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    audit = (await db.execute(select(Audit).where(Audit.id == audit_id))).scalar_one_or_none()
    _audit_guard(audit, user)
    pages = (await db.execute(select(Page).where(Page.audit_id == audit_id))).scalars().all()

    user_config = await get_user_provider_config(db, user.id)
    resolved = resolve_for_capability("ai_citations", user_config)
    brand_name = brand.strip() or _derive_brand(audit.website_url or "", pages)

    site_data = {"pages": pages, "audit": audit}

    if resolved["provider"].startswith("keyless"):
        provider = KeylessCitationProvider()
    else:
        provider = build_provider("ai_citations", resolved["provider"], effective_config(resolved["provider"], user_config))

    try:
        result = await provider.analyze(brand_name, site_data)
    except Exception as e:
        logger.warning(f"AI citation provider {resolved['provider']} failed: {e}")
        provider = KeylessCitationProvider()
        result = await provider.analyze(brand_name, site_data)
        result["note"] = f"Configured provider failed ({e}); used keyless scan instead."

    db.add(AiCitationRecord(
        audit_id=audit_id,
        brand_name=brand_name,
        mention_count=result.get("mention_count", 0),
        ai_crawlable=bool(result.get("ai_crawlable")),
        llms_txt=bool(result.get("llms_txt")),
        robots_ai_rules=bool(result.get("robots_ai_rules")),
        citation_estimate=result.get("citation_estimate", 0),
        provider=result.get("provider", "keyless"),
        details=result,
        created_at=_dt.datetime.utcnow(),
    ))
    await db.commit()

    return {
        "brand": brand_name,
        "resolved_provider": resolved["provider"],
        "ai_crawlable": result.get("ai_crawlable"),
        "mention_count": result.get("mention_count", 0),
        "brand_pages": result.get("brand_pages", []),
        "llms_txt": result.get("llms_txt"),
        "robots_ai_rules": result.get("robots_ai_rules"),
        "schema_present": result.get("schema_present"),
        "citation_estimate": result.get("citation_estimate", 0),
        "provider": result.get("provider", "keyless"),
        "note": result.get("note", ""),
    }


@router.get("/audit/{audit_id}/brand-monitor/history")
async def get_brand_monitor_history(
    audit_id: str,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    audit = (await db.execute(select(Audit).where(Audit.id == audit_id))).scalar_one_or_none()
    _audit_guard(audit, user)
    rows = (await db.execute(
        select(AiCitationRecord).where(AiCitationRecord.audit_id == audit_id).order_by(AiCitationRecord.created_at.desc()).limit(50)
    )).scalars().all()
    return {"records": [{
        "id": r.id, "brand": r.brand_name, "mention_count": r.mention_count,
        "citation_estimate": r.citation_estimate, "provider": r.provider,
        "ai_crawlable": r.ai_crawlable,
        "created_at": r.created_at.isoformat() if r.created_at else "",
    } for r in rows]}
