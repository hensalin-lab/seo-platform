"""Backlink Explorer API — domain-level backlink data from the existing
Backlink table (populated by audits). Provides Explorer, Referring Domains,
and Toxic Links views.

GET /api/backlinks/{domain}/explorer     — all backlinks for a domain
GET /api/backlinks/{domain}/referring    — backlinks grouped by referring domain
GET /api/backlinks/{domain}/toxic        — flagged toxic links + disavow export
"""
import csv
import io
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, func, desc, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Backlink, ReferringDomain, Audit, User
from app.api.auth import get_current_active_user

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


# ── Explorer ─────────────────────────────────────────────────────────────────

@router.get("/{domain}/explorer")
async def backlink_explorer(domain: str,
                            limit: int = 100,
                            offset: int = 0,
                            user: User = Depends(get_current_active_user),
                            db: AsyncSession = Depends(get_db)):
    """Return all backlinks for a domain, paginated."""
    d = domain.lower().strip()
    audit_id = await _get_latest_audit_id(db, d)
    if not audit_id:
        return {"domain": d, "backlinks": [], "total": 0,
                "note": "No completed audit found for this domain. Run an audit first."}

    total = (await db.execute(
        select(func.count(Backlink.id)).where(Backlink.audit_id == audit_id)
    )).scalar() or 0

    result = await db.execute(
        select(Backlink)
        .where(Backlink.audit_id == audit_id)
        .order_by(desc(Backlink.domain_authority))
        .limit(limit)
        .offset(offset)
    )
    backlinks = result.scalars().all()

    return {
        "domain": d,
        "total": total,
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
            for bl in backlinks
        ],
    }


# ── Referring Domains ────────────────────────────────────────────────────────

@router.get("/{domain}/referring")
async def referring_domains(domain: str,
                            user: User = Depends(get_current_active_user),
                            db: AsyncSession = Depends(get_db)):
    """Return backlinks grouped by referring domain, sortable by authority."""
    d = domain.lower().strip()
    audit_id = await _get_latest_audit_id(db, d)
    if not audit_id:
        return {"domain": d, "domains": [], "total": 0,
                "note": "No completed audit found for this domain. Run an audit first."}

    result = await db.execute(
        select(ReferringDomain)
        .where(ReferringDomain.audit_id == audit_id)
        .order_by(desc(ReferringDomain.domain_authority))
    )
    domains = result.scalars().all()

    return {
        "domain": d,
        "total": len(domains),
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
    audit_id = await _get_latest_audit_id(db, d)
    if not audit_id:
        return {"domain": d, "toxic_links": [], "total": 0, "disavow_lines": [],
                "note": "No completed audit found for this domain. Run an audit first."}

    result = await db.execute(
        select(Backlink)
        .where(Backlink.audit_id == audit_id)
        .order_by(desc(Backlink.toxic_score))
    )
    all_backlinks = result.scalars().all()

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
    audit_id = await _get_latest_audit_id(db, d)
    if not audit_id:
        raise HTTPException(404, "No completed audit found")

    result = await db.execute(
        select(Backlink)
        .where(Backlink.audit_id == audit_id)
        .order_by(desc(Backlink.toxic_score))
    )
    all_backlinks = result.scalars().all()
    toxic = [bl for bl in all_backlinks if (bl.toxic_score or 0) >= threshold]

    buf = io.StringIO()
    buf.write(f"# Disavow file for {d}\n")
    buf.write(f"# Generated by SEO Platform\n")
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
