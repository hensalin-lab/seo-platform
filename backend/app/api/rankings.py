import datetime as _dt
import logging
import re
from typing import List, Optional
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Audit, RankPosition, KeywordData, KeywordRecord, User
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["rankings"])


def _host_of(url: str) -> str:
    try:
        return (urlparse(url or "").hostname or "").lower().lstrip("www.")
    except Exception:
        return ""


def _norm_keyword(kw: str) -> str:
    return re.sub(r"\s+", " ", (kw or "").strip()).lower()


def _serialize(pos: RankPosition) -> dict:
    return {
        "id": pos.id,
        "keyword": pos.keyword,
        "position": pos.position,
        "previous_position": pos.previous_position,
        "page_url": pos.page_url,
        "source": pos.source,
        "captured_at": pos.captured_at.isoformat() if pos.captured_at else None,
    }


async def _collect_keywords(db: AsyncSession, audit_id: str) -> List[str]:
    keywords = []
    kd = (await db.execute(select(KeywordData).where(KeywordData.audit_id == audit_id))).scalar_one_or_none()
    if kd:
        for field in ("top_keywords", "keyword_opportunities", "keyword_clusters", "content_gaps", "missing_keywords"):
            for item in (getattr(kd, field) or []):
                if isinstance(item, dict):
                    k = item.get("keyword") or item.get("key") or item.get("name") or ""
                else:
                    k = str(item)
                if k and _norm_keyword(k):
                    keywords.append(k)
    for row in (await db.execute(select(KeywordRecord).where(KeywordRecord.audit_id == audit_id))).scalars().all():
        if row.keyword and _norm_keyword(row.keyword):
            keywords.append(row.keyword)
    seen, out = set(), []
    for k in keywords:
        nk = _norm_keyword(k)
        if nk and nk not in seen:
            seen.add(nk)
            out.append(k)
    return out


def _estimate_position(keyword: str, audit: Audit, pages) -> Optional[int]:
    """Crude position estimate from crawled page signals (used when no SERP key)."""
    k = _norm_keyword(keyword)
    if not k:
        return None
    kw_words = set(w for w in k.split() if len(w) > 2)
    homepage = [p for p in pages if (p.url or "").rstrip("/") == (audit.website_url or "").rstrip("/")]
    for p in (homepage or pages):
        title = _norm_keyword(p.title or "")
        h1 = _norm_keyword(p.h1 or "")
        content = _norm_keyword((p.content_text or "")[:6000])
        if k in title:
            return 5
        if k in h1:
            return 12
        if title and kw_words and kw_words.issubset(set(title.split())):
            return 18
        if content and k in content:
            return 60
    return None


async def _live_position(keyword: str, host: str, client: httpx.AsyncClient) -> dict:
    r = await client.get(
        "https://serpapi.com/search",
        params={"engine": "google", "q": keyword, "num": 100, "api_key": settings.SERP_API_KEY},
    )
    data = r.json()
    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(str(data.get("error"))[:300])
    for i, o in enumerate((data.get("organic_results") or [])):
        if not isinstance(o, dict):
            continue
        link = (o.get("link") or "") or ""
        link_host = _host_of(link)
        if link_host and (link_host == host or link_host.rstrip(".") == host.rstrip(".")):
            return {"position": i + 1, "page_url": link}
    return {"position": None, "page_url": ""}


async def _latest_for(db: AsyncSession, audit_id: str, keyword: str) -> Optional[RankPosition]:
    result = await db.execute(
        select(RankPosition)
        .where(RankPosition.audit_id == audit_id, RankPosition.keyword == keyword)
        .order_by(desc(RankPosition.captured_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


def _audit_guard(audit: Optional[Audit], user: User):
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    if audit.user_id and audit.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this audit")


class CaptureRequest(BaseModel):
    keywords: Optional[List[str]] = None


@router.post("/audit/{audit_id}/rankings/capture")
async def capture_rankings(
    audit_id: str,
    req: CaptureRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    audit = (await db.execute(select(Audit).where(Audit.id == audit_id))).scalar_one_or_none()
    _audit_guard(audit, user)

    keywords = req.keywords if req.keywords else await _collect_keywords(db, audit_id)
    keywords = [k for k in keywords if _norm_keyword(k)][:25]
    if not keywords:
        raise HTTPException(status_code=400, detail="No keywords found. Run an audit first or pass keywords in the body.")

    host = _host_of(audit.website_url or "")
    pages = []
    from app.models import Page
    pages = (await db.execute(select(Page).where(Page.audit_id == audit_id))).scalars().all()

    live = bool(settings.SERP_API_KEY)
    now = _dt.datetime.utcnow()
    results = []
    async with httpx.AsyncClient(timeout=30) as client:
        for kw in keywords:
            prev = await _latest_for(db, audit_id, kw)
            if live:
                try:
                    live_result = await _live_position(kw, host, client)
                    position = live_result["position"]
                    page_url = live_result["page_url"]
                    source = "live"
                except Exception as e:
                    logger.warning(f"SERP live check failed for '{kw}': {e}")
                    position = _estimate_position(kw, audit, pages)
                    page_url = ""
                    source = "estimated"
            else:
                position = _estimate_position(kw, audit, pages)
                page_url = ""
                source = "estimated"

            row = RankPosition(
                audit_id=audit_id,
                keyword=_norm_keyword(kw),
                position=position,
                previous_position=prev.position if prev else None,
                page_url=page_url,
                source=source,
                captured_at=now,
            )
            db.add(row)
            results.append({
                "keyword": _norm_keyword(kw),
                "position": position,
                "previous_position": prev.position if prev else None,
                "change": (prev.position - position) if (prev and prev.position and position) else None,
                "page_url": page_url,
                "source": source,
            })
    await db.commit()
    return {
        "audit_id": audit_id,
        "captured_at": now.isoformat(),
        "configured": live,
        "mode": "live" if live else "estimated",
        "total": len(results),
        "rankings": results,
    }


@router.get("/audit/{audit_id}/rankings")
async def get_rankings(
    audit_id: str,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    history: int = 8,
):
    audit = (await db.execute(select(Audit).where(Audit.id == audit_id))).scalar_one_or_none()
    _audit_guard(audit, user)

    rows = (await db.execute(
        select(RankPosition)
        .where(RankPosition.audit_id == audit_id)
        .order_by(desc(RankPosition.captured_at))
    )).scalars().all()

    by_keyword = {}
    last_captured = None
    for r in rows:
        by_keyword.setdefault(r.keyword, []).append(r)
        if last_captured is None or (r.captured_at and r.captured_at > last_captured):
            last_captured = r.captured_at

    keywords_out = []
    for kw, positions in by_keyword.items():
        positions = sorted(positions, key=lambda p: p.captured_at or _dt.datetime.min)
        latest = positions[-1]
        prev = latest.previous_position
        first = positions[0].position
        keywords_out.append({
            "keyword": kw,
            "latest_position": latest.position,
            "previous_position": prev,
            "first_position": first,
            "change": (prev - latest.position) if (prev and latest.position) else None,
            "source": latest.source,
            "page_url": latest.page_url,
            "captures": len(positions),
            "history": [_serialize(p) for p in positions[-history:]],
        })
    keywords_out.sort(key=lambda k: (k["latest_position"] is None, k["latest_position"] or 999))
    return {
        "audit_id": audit_id,
        "configured": bool(settings.SERP_API_KEY),
        "mode": "live" if settings.SERP_API_KEY else "estimated",
        "last_captured_at": last_captured.isoformat() if last_captured else None,
        "total_keywords": len(keywords_out),
        "keywords": keywords_out,
    }


async def auto_capture_rankings(audit_id: str):
    """Record a ranking baseline snapshot after an audit completes (forward tracking)."""
    from app.database import async_session
    from app.models import Page
    try:
        async with async_session() as db:
            audit = (await db.execute(select(Audit).where(Audit.id == audit_id))).scalar_one_or_none()
            if not audit:
                return
            keywords = await _collect_keywords(db, audit_id)
            if not keywords:
                return
            host = _host_of(audit.website_url or "")
            pages = (await db.execute(select(Page).where(Page.audit_id == audit_id))).scalars().all()
            now = _dt.datetime.utcnow()
            if settings.SERP_API_KEY:
                async with httpx.AsyncClient(timeout=30) as client:
                    for kw in keywords[:10]:
                        try:
                            live_result = await _live_position(kw, host, client)
                            db.add(RankPosition(
                                audit_id=audit_id, keyword=_norm_keyword(kw),
                                position=live_result["position"], page_url=live_result["page_url"],
                                source="live", captured_at=now,
                            ))
                        except Exception as e:
                            logger.warning(f"auto rank capture failed for '{kw}': {e}")
            else:
                for kw in keywords[:25]:
                    db.add(RankPosition(
                        audit_id=audit_id, keyword=_norm_keyword(kw),
                        position=_estimate_position(kw, audit, pages), source="estimated", captured_at=now,
                    ))
            await db.commit()
            logger.info(f"Ranking snapshot captured for audit {audit_id} ({len(keywords)} keywords)")
    except Exception as e:
        logger.error(f"Auto ranking capture failed for {audit_id}: {e}")
