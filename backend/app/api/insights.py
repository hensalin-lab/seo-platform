"""API endpoints for advanced insights: drift detection, hreflang/i18n,
redirect chains, duplicate content, domain authority, JS dependency,
content briefs, usage metering, and demo data."""
import logging
import re
import datetime as _dt
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    Audit, AuditScore, Page, Backlink, ReferringDomain, CoreWebVitals,
    KeywordData, ContentData, DriftReport, HreflangAnalysis, RedirectRecord,
    DuplicateGroup, DomainAuthority, TopicCluster, ContentBrief, User,
)
from app.api.auth import get_current_active_user
from app.engine.advanced_insights import (
    analyze_hreflang, analyze_redirects, analyze_duplicates,
    compute_domain_authority, analyze_js_dependency,
    build_content_briefs, get_usage_summary, record_usage,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["insights"])


def _audit_guard(audit, user):
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    if audit.user_id and audit.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this audit")


async def _get_audit(db, audit_id):
    return (await db.execute(select(Audit).where(Audit.id == audit_id))).scalar_one_or_none()


async def _get_pages(db, audit_id):
    return (await db.execute(select(Page).where(Page.audit_id == audit_id))).scalars().all()


# ---------------------------------------------------------------------------
# Drift / change detection
# ---------------------------------------------------------------------------

@router.get("/audit/{audit_id}/drift")
async def get_drift(audit_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    from app.engine.advanced_insights import compute_drift
    audit = await _get_audit(db, audit_id)
    _audit_guard(audit, user)
    existing = (await db.execute(
        select(DriftReport).where(DriftReport.audit_id == audit_id).order_by(DriftReport.created_at.desc())
    )).scalar_one_or_none()
    if existing:
        return {"available": True, "report_id": existing.id, "summary": existing.summary, "cached": True}
    return await compute_drift(db, audit_id)


# ---------------------------------------------------------------------------
# hreflang / i18n
# ---------------------------------------------------------------------------

@router.get("/audit/{audit_id}/hreflang")
async def get_hreflang(audit_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    audit = await _get_audit(db, audit_id)
    _audit_guard(audit, user)
    existing = (await db.execute(select(HreflangAnalysis).where(HreflangAnalysis.audit_id == audit_id))).scalar_one_or_none()
    if existing and existing.issues is not None:
        return {
            "has_hreflang": existing.has_hreflang,
            "coverage": existing.coverage,
            "language_count": existing.language_count,
            "languages": [],
            "pages": existing.pages or [],
            "issues": existing.issues or [],
            "issue_counts": _issue_counts(existing.issues or []),
        }
    pages = await _get_pages(db, audit_id)
    result = analyze_hreflang(pages, audit.website_url or "")
    db.add(HreflangAnalysis(
        audit_id=audit_id, has_hreflang=result["has_hreflang"],
        coverage=result["coverage"], language_count=result["language_count"],
        pages=result["pages"], issues=result["issues"],
    ))
    await db.commit()
    return result


def _issue_counts(issues):
    by_type = {}
    for i in issues:
        if isinstance(i, dict):
            by_type[i.get("type", "other")] = by_type.get(i.get("type", "other"), 0) + 1
    return {"total": len(issues), "by_type": by_type}


# ---------------------------------------------------------------------------
# Redirect chains
# ---------------------------------------------------------------------------

@router.get("/audit/{audit_id}/redirects")
async def get_redirects(audit_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    audit = await _get_audit(db, audit_id)
    _audit_guard(audit, user)
    pages = await _get_pages(db, audit_id)
    result = analyze_redirects(pages)
    for r in result["records"]:
        db.add(RedirectRecord(
            audit_id=audit_id, url=r["url"], status_code=r["status_code"],
            final_url=r["final_url"], chain=r["chain"], chain_length=r["chain_length"],
            is_chain=r["is_chain"], http_to_https=r["http_to_https"],
        ))
    await db.commit()
    return result


# ---------------------------------------------------------------------------
# Duplicate content
# ---------------------------------------------------------------------------

@router.get("/audit/{audit_id}/duplicates")
async def get_duplicates(audit_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    audit = await _get_audit(db, audit_id)
    _audit_guard(audit, user)
    pages = await _get_pages(db, audit_id)
    result = analyze_duplicates(pages)
    for g in result["groups"]:
        db.add(DuplicateGroup(
            audit_id=audit_id, kind=g["kind"], key=g["key"], count=g["count"],
            urls=g["urls"], title=g.get("title", ""),
        ))
    await db.commit()
    return result


# ---------------------------------------------------------------------------
# Domain authority heuristic
# ---------------------------------------------------------------------------

@router.get("/audit/{audit_id}/domain-authority")
async def get_domain_authority(audit_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    audit = await _get_audit(db, audit_id)
    _audit_guard(audit, user)
    existing = (await db.execute(select(DomainAuthority).where(DomainAuthority.audit_id == audit_id))).scalar_one_or_none()
    if existing:
        return {"score": existing.score, "factors": existing.factors or {}, "method": "heuristic (keyless)", "cached": True}
    pages = await _get_pages(db, audit_id)
    scores = (await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))).scalar_one_or_none()
    backlinks = (await db.execute(select(Backlink).where(Backlink.audit_id == audit_id))).scalars().all()
    referring = (await db.execute(select(ReferringDomain).where(ReferringDomain.audit_id == audit_id))).scalars().all()
    cvw = (await db.execute(select(CoreWebVitals).where(CoreWebVitals.audit_id == audit_id))).scalars().all()
    result = compute_domain_authority(audit, pages, scores, backlinks, referring, cvw)
    db.add(DomainAuthority(audit_id=audit_id, score=result["score"], factors=result["factors"]))
    await db.commit()
    return result


# ---------------------------------------------------------------------------
# JS dependency
# ---------------------------------------------------------------------------

@router.get("/audit/{audit_id}/js-dependency")
async def get_js_dependency(audit_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    audit = await _get_audit(db, audit_id)
    _audit_guard(audit, user)
    pages = await _get_pages(db, audit_id)
    return analyze_js_dependency(pages)


# ---------------------------------------------------------------------------
# Content briefs + topic clusters
# ---------------------------------------------------------------------------

@router.get("/audit/{audit_id}/content-briefs")
async def get_content_briefs(audit_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    audit = await _get_audit(db, audit_id)
    _audit_guard(audit, user)
    pages = await _get_pages(db, audit_id)
    keyword_data = (await db.execute(select(KeywordData).where(KeywordData.audit_id == audit_id))).scalar_one_or_none()
    content_data = (await db.execute(select(ContentData).where(ContentData.audit_id == audit_id))).scalar_one_or_none()
    result = build_content_briefs(keyword_data, content_data, pages)
    for c in result["clusters"]:
        db.add(TopicCluster(
            audit_id=audit_id, name=c["name"], keywords=c["keywords"],
            opportunity=c["opportunity"], pages=c["pages"],
        ))
    await db.flush()
    brief_objs = {}
    for b in result["briefs"]:
        cluster = next((c for c in result["clusters"] if b["target_keyword"] in c["keywords"]), None)
        obj = ContentBrief(
            audit_id=audit_id,
            cluster_id=cluster["name"] if cluster else "",
            title=b["title"], target_keyword=b["target_keyword"],
            search_intent=b["search_intent"], outline=b["outline"],
            word_count_target=b["word_count_target"],
            related_keywords=b["related_keywords"], competitor_pages=b["competitor_pages"],
        )
        db.add(obj)
        brief_objs[b["target_keyword"]] = obj.id
    await db.commit()
    for b in result["briefs"]:
        b["id"] = brief_objs.get(b["target_keyword"])
    return result


# ---------------------------------------------------------------------------
# Usage metering
# ---------------------------------------------------------------------------

@router.get("/usage")
async def get_usage(days: int = Query(30, ge=1, le=365), user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    return await get_usage_summary(db, user.id, days)


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

@router.post("/demo")
async def create_demo(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    from app.engine.demo import seed_demo_audit
    audit = await seed_demo_audit(db, user.id)
    await record_usage(db, user.id, "demo.created", {"audit_id": audit.id})
    return {
        "audit_id": audit.id,
        "website_url": audit.website_url,
        "message": "Sample audit created — open it from the History or Portfolio pages.",
    }


# ---------------------------------------------------------------------------
# Public API info (developer reference)
# ---------------------------------------------------------------------------

_PUBLIC_API_INFO = {
    "name": "SEO Intelligence Platform Public API",
    "auth": "Send Authorization: Bearer <JWT> or X-API-Key: <key>. Create keys in Settings > API Keys.",
    "base_url": "/api",
    "resources": {
        "audits": [
            "POST /api/audit/start",
            "GET /api/audit/history",
            "GET /api/audit/{id}",
            "GET /api/audit/{id}/issues",
            "GET /api/audit/{id}/recommendations",
            "GET /api/audit/{id}/pages",
            "GET /api/audit/{id}/seo-analysis",
            "GET /api/audit/{id}/content-briefs",
            "GET /api/audit/{id}/hreflang",
            "GET /api/audit/{id}/redirects",
            "GET /api/audit/{id}/duplicates",
            "GET /api/audit/{id}/domain-authority",
            "GET /api/audit/{id}/drift",
            "GET /api/audit/{id}/rankings",
        ],
        "monitoring": [
            "GET /api/uptime/targets",
            "POST /api/uptime/targets",
            "GET /api/uptime/targets/{id}/checks",
        ],
        "workspaces": [
            "GET /api/workspaces",
            "POST /api/workspaces",
            "POST /api/workspaces/{id}/audits",
            "POST /api/workspaces/{id}/members",
        ],
        "platform": [
            "GET /api/health",
            "GET /api/usage",
            "POST /api/demo",
            "POST /api/webhooks",
            "GET /api/scheduled",
        ],
    },
    "webhook_events": [
        "audit.completed", "audit.failed", "audit.started",
        "drift.regression", "uptime.down", "webhook.test",
    ],
}


@router.get("/public/info")
async def public_api_info(user: User = Depends(get_current_active_user)):
    return _PUBLIC_API_INFO


# ---------------------------------------------------------------------------
# Keyword volumes via provider registry
# ---------------------------------------------------------------------------

@router.get("/audit/{audit_id}/keyword-volumes")
async def get_keyword_volumes(
    audit_id: str,
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Resolve the keyword-volume provider (DataForSEO/SE Ranking when configured,
    keyless heuristic otherwise) and return volumes for the audit's keywords."""
    from app.engine.providers import (
        build_provider, effective_config, get_user_provider_config,
        resolve_for_capability,
    )
    audit = await _get_audit(db, audit_id)
    _audit_guard(audit, user)

    keyword_data = (await db.execute(select(KeywordData).where(KeywordData.audit_id == audit_id))).scalar_one_or_none()
    entries = []
    if keyword_data:
        seen = set()
        for field in ("top_keywords", "keyword_opportunities", "keyword_clusters", "content_gaps", "missing_keywords"):
            for item in getattr(keyword_data, field) or []:
                if isinstance(item, dict):
                    k = item.get("keyword") or item.get("key") or item.get("name") or ""
                else:
                    k = str(item)
                nk = re.sub(r"\s+", " ", (k or "").strip()).lower()
                if nk and nk not in seen:
                    seen.add(nk)
                    entries.append(k.strip())

    user_config = await get_user_provider_config(db, user.id)
    resolved = resolve_for_capability("keyword_volume", user_config)
    provider = build_provider(
        "keyword_volume", resolved["provider"],
        effective_config(resolved["provider"], user_config),
    )

    volumes = []
    for kw in entries[:limit]:
        try:
            v = await provider.get_volume(kw)
        except Exception as e:
            logger.warning(f"Keyword volume failed for {kw!r}: {e}")
            v = {"keyword": kw, "volume": 0, "cpc": 0, "competition": "N/A", "source": "error", "note": str(e)[:200]}
        volumes.append(v)

    return {
        "audit_id": audit_id,
        "provider": resolved["provider"],
        "configured": resolved["configured"],
        "total": len(volumes),
        "sum_volume": sum(v.get("volume") or 0 for v in volumes),
        "volumes": volumes,
    }
