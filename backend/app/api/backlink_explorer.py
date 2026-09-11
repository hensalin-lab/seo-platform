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
import time
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

# In-memory throttle so an empty dataset doesn't trigger Open PageRank
# ingestion on every request. Tracked as {domain: last_trigger_ts}.
_AUTO_REFRESH_WINDOW = 15 * 60  # seconds
_last_auto_refresh: dict[str, float] = {}

# Live (DataForSEO) backlink responses cached in-memory per request so
# repeat page loads never burn paid credits. Tracked as {cache_key: (ts, data)}.
_LIVE_TTL = 15 * 60  # seconds
_LIVE_CACHE: dict[str, tuple[float, dict]] = {}


async def _live_backlink_provider(db, user) -> tuple:
    """Return (DataForSEO backlink provider, user_config) when the user (or env)
    has DataForSEO credentials, else (None, None)."""
    from app.engine.providers import (
        build_provider, effective_config, get_user_provider_config, is_configured,
    )
    user_config = await get_user_provider_config(db, user.id) if user else {}
    if not is_configured("dataforseo", user_config):
        return None, None
    provider = build_provider(
        "backlinks", "dataforseo",
        effective_config("dataforseo", user_config),
    )
    return provider, user_config


def _live_cache_get(key: str) -> dict | None:
    val = _LIVE_CACHE.get(key)
    if val and (time.time() - val[0]) < _LIVE_TTL:
        return val[1]
    return None


def _live_cache_set(key: str, data: dict) -> None:
    _LIVE_CACHE[key] = (time.time(), data)


async def _try_live(db, user, cache_key: str, fetcher) -> dict | None:
    """Fetch live DataForSEO backlinks when configured + within budget.

    Returns the live payload dict (possibly empty), or None when DataForSEO is
    not configured, budget-blocked, or the paid call errored — in which case the
    caller falls back to the free Common Crawl dataset.
    """
    provider, _ = await _live_backlink_provider(db, user)
    if not provider:
        return None
    cached = _live_cache_get(cache_key)
    if cached is not None:
        return cached
    from app.engine.spend_guard import check_provider_budget, record_provider_usage
    try:
        await check_provider_budget(db, user.id if user else None, "dataforseo_backlinks", cost=1)
    except Exception as e:
        logger.info(f"Live backlinks budget block ({cache_key}): {e}")
        return None
    try:
        data = await fetcher(provider)
        await record_provider_usage(
            db, user.id if user else None, "dataforseo_backlinks", cost=1,
            details={"endpoint": "backlinks/live", "cache_key": cache_key},
        )
        _live_cache_set(cache_key, data)
        return data
    except Exception as e:
        logger.warning(f"Live backlinks failed for {cache_key}: {e}")
        return None


def _domain_of_audit_url(url: str) -> str:
    """Extract domain from audit website_url for matching."""
    from urllib.parse import urlparse
    try:
        return (urlparse(url or "").hostname or "").lower().removeprefix("www.")
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


async def _domain_has_data(db: AsyncSession, domain: str) -> bool:
    """True if the domain already has backlink rows from any source."""
    if await _get_backlinks_for_domain(db, domain):
        return True
    result = await db.execute(
        select(ReferringDomain).where(ReferringDomain.target_domain == domain).limit(1)
    )
    return result.scalar_one_or_none() is not None


def _should_auto_refresh(domain: str) -> bool:
    """Throttle check: allow an auto-refresh once per window per domain."""
    import time
    now = time.time()
    last = _last_auto_refresh.get(domain, 0.0)
    if now - last < _AUTO_REFRESH_WINDOW:
        return False
    _last_auto_refresh[domain] = now
    return True


async def _ensure_backlink_data(db, domain: str, background_tasks: Optional[BackgroundTasks] = None) -> str:
    """Ensure a domain has backlink data, kicking off free ingestion in the
    background when it doesn't (throttled). Returns:
      "ready"     — data already present
      "fetching"  — ingestion just scheduled
      "pending"   — ingestion recently scheduled, still in progress window"""
    if await _domain_has_data(db, domain):
        return "ready"
    if not _should_auto_refresh(domain):
        return "pending"
    if background_tasks is not None:
        background_tasks.add_task(_run_refresh_background, domain.lower().strip())
        return "fetching"
    # No background_tasks available — schedule directly as a detached task
    import asyncio
    asyncio.create_task(_run_refresh_background(domain.lower().strip()))
    return "fetching"


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
    from app.engine.domain_utils import normalize_domain
    d = normalize_domain(domain)
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
                            background_tasks: BackgroundTasks = None,
                            user: User = Depends(get_current_active_user),
                            db: AsyncSession = Depends(get_db)):
    """Return all backlinks for a domain, paginated. Auto-fetches free data
    (Open PageRank) in the background when the domain has none yet. Uses a
    configured DataForSEO account (paid, measured) when available, else the
    free Common Crawl dataset."""
    from app.engine.domain_utils import normalize_domain
    d = normalize_domain(domain)

    live = await _try_live(
        db, user, f"expl:{d}:{offset}:{limit}",
        lambda p: p.list_backlinks(d, max(offset + limit, limit or 1)),
    )
    if live is not None:
        rows = live.get("backlinks", [])[offset:offset + limit]
        return {
            "domain": d,
            "total": live.get("total", len(live.get("backlinks", []))),
            "source": "dataforseo",
            "data_status": "live",
            "note": "Measured backlinks from DataForSEO (paid).",
            "backlinks": rows,
        }

    try:
        data_status = await _ensure_backlink_data(db, d, background_tasks)
    except Exception as e:
        logger.warning(f"_ensure_backlink_data failed for {d}: {e}")
        data_status = "pending"

    try:
        backlinks = await _get_backlinks_for_domain(db, d)
    except Exception as e:
        logger.warning(f"get_backlinks failed for {d}: {e}")
        backlinks = []

    total = len(backlinks)
    paginated = backlinks[offset:offset + limit]

    source_label = "common_crawl" if any(bl.target_domain == d for bl in backlinks) else "audit"

    return {
        "domain": d,
        "total": len(backlinks),
        "source": source_label,
        "data_status": data_status,
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
                            background_tasks: BackgroundTasks = None,
                            user: User = Depends(get_current_active_user),
                            db: AsyncSession = Depends(get_db)):
    """Return backlinks grouped by referring domain, sortable by authority.
    Auto-fetches free data (Open PageRank) in the background when empty.
    Uses a configured DataForSEO account (paid, measured) when available."""
    from app.engine.domain_utils import normalize_domain
    d = normalize_domain(domain)

    live = await _try_live(
        db, user, f"ref:{d}",
        lambda p: p.list_referring_domains(d),
    )
    if live is not None:
        return {
            "domain": d,
            "total": live.get("total", len(live.get("domains", []))),
            "source": "dataforseo",
            "data_status": "live",
            "note": "Measured referring domains from DataForSEO (paid).",
            "domains": live.get("domains", []),
        }

    try:
        data_status = await _ensure_backlink_data(db, d, background_tasks)
    except Exception as e:
        logger.warning(f"_ensure_backlink_data failed for {d}: {e}")
        data_status = "pending"

    try:
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
    except Exception as e:
        logger.warning(f"get_referring_domains failed for {d}: {e}")
        domains = []

    # Per-domain dofollow/nofollow counts from the backlinks table (best effort).
    dofollow_map: dict[str, int] = {}
    nofollow_map: dict[str, int] = {}
    total_map: dict[str, int] = {}
    try:
        result = await db.execute(
            select(
                Backlink.source_domain,
                Backlink.is_follow,
                func.count(Backlink.id),
            )
            .where(Backlink.target_domain == d)
            .group_by(Backlink.source_domain, Backlink.is_follow)
        )
        for src, is_follow, cnt in result.all():
            src = (src or "").lower()
            if is_follow:
                dofollow_map[src] = dofollow_map.get(src, 0) + cnt
            else:
                nofollow_map[src] = nofollow_map.get(src, 0) + cnt
            total_map[src] = total_map.get(src, 0) + cnt
    except Exception as e:
        logger.warning(f"dofollow/nofollow aggregation failed for {d}: {e}")

    source_label = "common_crawl" if any(rd.target_domain == d for rd in domains) else "audit"

    return {
        "domain": d,
        "total": len(domains),
        "source": source_label,
        "data_status": data_status,
        "note": "Backlink data sourced from Common Crawl's public web archive." if source_label == "common_crawl" else None,
        "domains": [
            {
                "id": rd.id,
                "domain": rd.domain,
                "link_count": rd.link_count,
                "domain_authority": rd.domain_authority,
                "toxic_score": rd.toxic_score,
                "dofollow_count": dofollow_map.get((rd.domain or "").lower(), 0),
                "nofollow_count": nofollow_map.get((rd.domain or "").lower(), 0),
                "dofollow_ratio": round(dofollow_map.get((rd.domain or "").lower(), 0) / total_map.get((rd.domain or "").lower(), 0), 3) if total_map.get((rd.domain or "").lower(), 0) else None,
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
                      background_tasks: BackgroundTasks = None,
                      user: User = Depends(get_current_active_user),
                      db: AsyncSession = Depends(get_db)):
    """Return flagged toxic links (toxic_score >= threshold) + disavow file.
    Auto-fetches free data (Open PageRank) in the background when empty.
    Uses a configured DataForSEO account (paid, measured) when available."""
    from app.engine.domain_utils import normalize_domain
    d = normalize_domain(domain)

    live = await _try_live(
        db, user, f"expl:{d}:0:200",
        lambda p: p.list_backlinks(d, 200),
    )
    if live is not None:
        rows = live.get("backlinks", [])
        toxic = [
            {
                "id": bl.get("id"),
                "source_url": bl.get("source_url"),
                "source_domain": bl.get("source_domain"),
                "anchor_text": bl.get("anchor_text"),
                "toxic_score": bl.get("toxic_score"),
                "domain_authority": bl.get("domain_authority"),
            }
            for bl in rows if (bl.get("toxic_score") or 0) >= threshold
        ]
        return {
            "domain": d,
            "threshold": threshold,
            "data_status": "live",
            "total_backlinks": len(rows),
            "toxic_count": len(toxic),
            "toxic_links": toxic[:200],
            "disavow_lines": [f"domain:{t['source_domain']}" for t in toxic if t.get("source_domain")],
            "source": "dataforseo",
            "note": "Toxic signals derived from DataForSEO backlink attributes.",
        }

    try:
        data_status = await _ensure_backlink_data(db, d, background_tasks)
    except Exception as e:
        logger.warning(f"_ensure_backlink_data failed for {d}: {e}")
        data_status = "pending"

    try:
        all_backlinks = await _get_backlinks_for_domain(db, d)
    except Exception as e:
        logger.warning(f"get_backlinks failed for {d}: {e}")
        all_backlinks = []

    toxic = [
        bl for bl in all_backlinks
        if (bl.toxic_score or 0) >= threshold
    ]

    disavow_lines = [f"domain:{bl.source_domain}" for bl in toxic if bl.source_domain]

    return {
        "domain": d,
        "threshold": threshold,
        "data_status": data_status,
        "total_backlinks": len(all_backlinks),
        "toxic_count": len(toxic),
        "source": "common_crawl",
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
    from app.engine.domain_utils import normalize_domain
    d = normalize_domain(domain)
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
