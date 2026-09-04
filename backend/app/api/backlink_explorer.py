"""Backlink Explorer API — domain-level backlink data from the existing
Backlink table (populated by audits OR the Common Crawl ingestion pipeline).

GET /api/backlinks/{domain}/explorer     — all backlinks for a domain
GET /api/backlinks/{domain}/referring    — backlinks grouped by referring domain
GET /api/backlinks/{domain}/toxic        — flagged toxic links + disavow export
POST /api/backlinks/{domain}/refresh     — trigger backlink ingestion (background)
"""
import csv
import io
import logging
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, func, desc, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Backlink, ReferringDomain, Audit, User
from app.api.auth import get_current_active_user
from app.rate_limit import limiter
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/backlinks", tags=["backlinks"])


def _domain_of_audit_url(url: str) -> str:
    """Extract domain from audit website_url for matching."""
    from urllib.parse import urlparse
    try:
        return (urlparse(url or "").hostname or "").lower().lstrip("www.")
    except Exception:
        return ""


async def _get_latest_audit_id(db: AsyncSession, domain: str) -> Optional[str]:
    """Find the most recent completed audit whose website_url matches domain."""
    result = await db.execute(
        select(Audit)
        .where(
            Audit.website_url.ilike(f"%{domain}%"),
            Audit.status == "COMPLETED",
        )
        .order_by(desc(Audit.created_at))
        .limit(1)
    )
    audit = result.scalar_one_or_none()
    return audit.id if audit else None


async def _get_backlinks_for_domain(db: AsyncSession, domain: str) -> list:
    """Get backlinks for a domain — first tries target_domain, then falls back to audit_id."""
    d = domain.lower().strip()

    # Prefer target_domain queries (Common Crawl ingestion pipeline)
    result = await db.execute(
        select(Backlink)
        .where(Backlink.target_domain == d)
        .order_by(desc(Backlink.domain_authority))
    )
    backlinks = result.scalars().all()
    if backlinks:
        return backlinks

    # Fallback: audit-based backlinks
    audit_id = await _get_latest_audit_id(db, d)
    if audit_id:
        result = await db.execute(
            select(Backlink)
            .where(Backlink.audit_id == audit_id)
            .order_by(desc(Backlink.domain_authority))
        )
        return result.scalars().all()

    return []


# ── Refresh backlinks (trigger ingestion) ────────────────────────────────────

async def _run_refresh_background(domain: str):
    """Background task that runs the full backlink ingestion pipeline."""
    from app.database import async_session
    from app.engine.backlink_ingestion import ingest_backlinks_for_domain

    try:
        async with async_session() as db:
            summary = await ingest_backlinks_for_domain(domain, db)
            logger.info(f"Background backlink refresh complete for {domain}: {summary}")
    except Exception as e:
        logger.error(f"Background backlink refresh failed for {domain}: {e}")


@router.post("/{domain}/refresh")
@limiter.limit("5/minute")
async def refresh_backlinks(
    request: Request,
    domain: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_active_user),
):
    """Trigger backlink ingestion for a domain as a background task.
    Returns immediately with a status message; ingestion runs asynchronously."""
    d = domain.lower().strip()
    background_tasks.add_task(_run_refresh_background, d)
    return {
        "status": "started",
        "domain": d,
        "message": "Backlink ingestion started in the background. Check back in a few minutes.",
        "source": "common_crawl",
        "note": "Backlink data sourced from Common Crawl's public web archive, refreshed monthly.",
    }


# ── Explorer ─────────────────────────────────────────────────────────────────

@router.get("/{domain}/explorer")
async def backlink_explorer(domain: str,
                            limit: int = 100,
                            offset: int = 0,
                            user: User = Depends(get_current_active_user),
                            db: AsyncSession = Depends(get_db)):
    """Return all backlinks for a domain, paginated."""
    d = domain.lower().strip()

    total = (await db.execute(
        select(func.count(Backlink.id)).where(
            (Backlink.target_domain == d) | (Backlink.audit_id == (func.select(Audit.id).where(Audit.website_url.ilike(f"%{d}%")).correlate(None).scalar_subquery()))
        )
    )).scalar() or 0

    backlinks = await _get_backlinks_for_domain(db, d)
    paginated = backlinks[offset:offset + limit]

    source_label = "common_crawl" if any(bl.target_domain == d for bl in backlinks) else "audit"

    return {
        "domain": d,
        "total": len(backlinks),
        "source": source_label,
        "note": "Backlink data sourced from Common Crawl's public web archive." if source_label == "common_crawl" else None,
        "backlinks": [
            {
                "id": bl.id,
                "source_url": bl.source_url,
                "source_domain": bl.source_domain,
                "target_url": bl.target_url,
                "anchor_text": bl.anchor_text,
                "is_follow": bl.is_follow,
                "domain_authority": bl.domain_authority,
                "toxic_score": bl.toxic_score,
                "first_seen": bl.first_seen.isoformat() if bl.first_seen else None,
                "last_seen": bl.last_seen.isoformat() if bl.last_seen else None,
            }
            for bl in paginated
        ],
    }


# ── Referring Domains ────────────────────────────────────────────────────────

@router.get("/{domain}/referring")
async def referring_domains(domain: str,
                            user: User = Depends(get_current_active_user),
                            db: AsyncSession = Depends(get_db)):
    """Return backlinks grouped by referring domain, sortable by authority."""
    d = domain.lower().strip()

    # Prefer target_domain
    result = await db.execute(
        select(ReferringDomain)
        .where(ReferringDomain.target_domain == d)
        .order_by(desc(ReferringDomain.domain_authority))
    )
    domains = result.scalars().all()

    # Fallback to audit-based
    if not domains:
        audit_id = await _get_latest_audit_id(db, d)
        if audit_id:
            result = await db.execute(
                select(ReferringDomain)
                .where(ReferringDomain.audit_id == audit_id)
                .order_by(desc(ReferringDomain.domain_authority))
            )
            domains = result.scalars().all()

    source_label = "common_crawl" if any(rd.target_domain == d for rd in domains) else "audit"

    return {
        "domain": d,
        "total": len(domains),
        "source": source_label,
        "note": "Backlink data sourced from Common Crawl's public web archive." if source_label == "common_crawl" else None,
        "domains": [
            {
                "id": rd.id,
                "domain": rd.domain,
                "link_count": rd.link_count,
                "domain_authority": rd.domain_authority,
                "toxic_score": rd.toxic_score,
                "first_seen": rd.first_seen.isoformat() if rd.first_seen else None,
                "last_seen": rd.last_seen.isoformat() if rd.last_seen else None,
            }
            for rd in domains
        ],
    }


# ── Toxic Links ──────────────────────────────────────────────────────────────

@router.get("/{domain}/toxic")
async def toxic_links(domain: str,
                      threshold: float = 0.7,
                      user: User = Depends(get_current_active_user),
                      db: AsyncSession = Depends(get_db)):
    """Return flagged toxic links (toxic_score >= threshold) + disavow file."""
    d = domain.lower().strip()
    all_backlinks = await _get_backlinks_for_domain(db, d)

    toxic = [
        bl for bl in all_backlinks
        if (bl.toxic_score or 0) >= threshold
    ]

    disavow_lines = [f"domain:{bl.source_domain}" for bl in toxic if bl.source_domain]

    return {
        "domain": d,
        "threshold": threshold,
        "total_backlinks": len(all_backlinks),
        "toxic_count": len(toxic),
        "toxic_links": [
            {
                "id": bl.id,
                "source_url": bl.source_url,
                "source_domain": bl.source_domain,
                "anchor_text": bl.anchor_text,
                "toxic_score": bl.toxic_score,
                "domain_authority": bl.domain_authority,
            }
            for bl in toxic[:200]
        ],
        "disavow_lines": disavow_lines,
    }


@router.get("/{domain}/toxic/export")
async def export_disavow(domain: str,
                          threshold: float = 0.7,
                          user: User = Depends(get_current_active_user),
                          db: AsyncSession = Depends(get_db)):
    """Export a Google-ready disavow file for toxic links."""
    d = domain.lower().strip()
    all_backlinks = await _get_backlinks_for_domain(db, d)
    toxic = [bl for bl in all_backlinks if (bl.toxic_score or 0) >= threshold]

    buf = io.StringIO()
    buf.write(f"# Disavow file for {d}\n")
    buf.write(f"# Generated by SEO Platform\n")
    buf.write(f"# Source: Common Crawl public web archive\n")
    buf.write(f"# Toxic threshold: {threshold}\n")
    buf.write(f"# Total toxic domains: {len(set(bl.source_domain for bl in toxic if bl.source_domain))}\n\n")
    for bl in toxic:
        if bl.source_domain:
            buf.write(f"domain:{bl.source_domain}\n")

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=disavow-{d}.txt"},
    )
