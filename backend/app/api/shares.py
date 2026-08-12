"""Public, read-only audit share links (client portal).

Authenticated users create/revoke links for their own audits. The public
GET /api/share/{token} endpoint is exempt from auth via PUBLIC_PREFIXES and
serves only the curated read-only report payload (get_report_data), so clients
see scores, issue summaries, and recommendations without a login.
"""
import secrets
import datetime as _dt
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Audit, AuditShareLink, User
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["shares"])

_TOKEN_BYTES = 16


def _generate_token() -> str:
    return secrets.token_urlsafe(_TOKEN_BYTES)


@router.get("/shares")
async def list_share_links(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    """List all active share links created by the current user."""
    result = await db.execute(
        select(AuditShareLink).where(
            AuditShareLink.created_by == user.id,
            AuditShareLink.is_active == True,
        ).order_by(AuditShareLink.created_at.desc())
    )
    links = result.scalars().all()
    return [
        {
            "id": l.id,
            "token": l.token,
            "audit_id": l.audit_id,
            "expires_at": l.expires_at.isoformat() if l.expires_at else None,
            "views": l.views,
            "created_at": l.created_at.isoformat() if l.created_at else None,
            "url": f"/share/{l.token}",
        }
        for l in links
    ]


@router.post("/shares")
async def create_share_link(
    audit_id: str,
    days: int = 30,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a share link for an audit owned by the current user."""
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    if audit.user_id is not None and audit.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    days = max(1, min(days, 365))
    token = _generate_token()
    link = AuditShareLink(
        token=token,
        audit_id=audit_id,
        created_by=user.id,
        is_active=True,
        expires_at=_dt.datetime.utcnow() + _dt.timedelta(days=days),
    )
    db.add(link)
    await db.flush()

    from app.utils.activity import log_activity
    await log_activity(
        db, user.id, "share.created", "audit", audit_id,
        {"token": link.token, "days": days},
    )
    await db.commit()
    await db.refresh(link)
    return {
        "id": link.id,
        "token": link.token,
        "audit_id": link.audit_id,
        "expires_at": link.expires_at.isoformat() if link.expires_at else None,
        "views": link.views,
        "created_at": link.created_at.isoformat() if link.created_at else None,
        "url": f"/share/{link.token}",
    }


@router.delete("/shares/{token}")
async def revoke_share_link(token: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    """Revoke a share link (owner only)."""
    result = await db.execute(select(AuditShareLink).where(AuditShareLink.token == token))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")
    if link.created_by is not None and link.created_by != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    link.is_active = False

    from app.utils.activity import log_activity
    await log_activity(
        db, user.id, "share.revoked", "audit", link.audit_id,
        {"token": link.token},
    )
    await db.commit()
    return {"status": "revoked", "token": token}


@router.get("/share/{token}")
async def get_public_share(token: str, db: AsyncSession = Depends(get_db)):
    """Public, read-only audit report served without authentication.

    Tracks view count and validates active + not expired.
    """
    result = await db.execute(select(AuditShareLink).where(AuditShareLink.token == token))
    link = result.scalar_one_or_none()
    if not link or not link.is_active:
        raise HTTPException(status_code=404, detail="Share link not found or revoked")
    if link.expires_at and link.expires_at < _dt.datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link expired")

    audit_result = await db.execute(select(Audit).where(Audit.id == link.audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    link.views = (link.views or 0) + 1
    await db.commit()

    from app.api.status import get_report_data
    report = await get_report_data(link.audit_id, db)
    return {
        "audit_id": link.audit_id,
        "website_url": audit.website_url,
        "competitor_url": audit.competitor_url,
        "status": audit.status,
        "created_at": audit.created_at.isoformat() if audit.created_at else None,
        "completed_at": audit.completed_at.isoformat() if audit.completed_at else None,
        "report": report,
    }
