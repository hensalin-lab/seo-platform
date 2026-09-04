"""Rank tracking engine — loops all TrackedKeywords, queries the right
data source (GSC for own domains, DataForSEO for competitors), and writes
a new RankSnapshot per keyword each run.

Designed to be called once per day via the scheduler loop in ``main.py``.
"""
import asyncio
import logging
import datetime as _dt
from typing import Optional

from sqlalchemy import select
from app.database import async_session
from app.models import (
    TrackedDomain, TrackedKeyword, RankSnapshot, User,
)
from app.services.dataforseo_client import DataForSEOClient
from app.services.gsc_rank_client import GSCRankClient
from app.engine.spend_guard import check_provider_budget

logger = logging.getLogger(__name__)

# Map TrackedKeyword.location string → DataForSEO location_code (US default)
_LOCATION_MAP = {"us": "2840", "uk": "2826", "ca": "2124", "au": "2036"}


async def _check_budget(user_id: Optional[str], provider: str) -> bool:
    try:
        async with async_session() as db:
            return await check_provider_budget(db, user_id, provider)
    except Exception:
        return True  # fail-open if budget check fails


async def _get_user_for_domain(db, domain: TrackedDomain) -> Optional[str]:
    """Return user_id for the domain owner (for budget check)."""
    # TrackedDomain isn't FK-linked to User; caller passes user_id or None
    return getattr(domain, "_user_id", None)


async def check_all_tracked_keywords():
    """One full pass: query every tracked keyword, write a RankSnapshot."""
    from app.models import DeviceEnum

    gsc_client = GSCRankClient()
    dfs_client = DataForSEOClient()

    async with async_session() as db:
        result = await db.execute(
            select(TrackedKeyword).join(TrackedDomain)
        )
        tracked = result.scalars().all()

    if not tracked:
        return {"checked": 0, "errors": 0}

    checked = 0
    errors = 0

    for kw in tracked:
        async with async_session() as db:
            domain = await db.get(TrackedDomain, kw.target_domain_id)
            if not domain:
                errors += 1
                continue

            position: Optional[int] = None
            serp_features = {}
            top_3_urls = []

            try:
                if domain.is_own_domain and gsc_client.available:
                    pos_float = await gsc_client.get_average_position(
                        f"https://{domain.domain}", kw.keyword
                    )
                    if pos_float is not None:
                        position = int(round(pos_float))

                elif dfs_client.available:
                    serp_data = await dfs_client.get_serp(
                        keyword=kw.keyword,
                        location=_LOCATION_MAP.get(kw.location, "2840"),
                    )
                    if not serp_data.get("error"):
                        position = serp_data.get("position")
                        serp_features = serp_data.get("serp_features", {})
                        top_3_urls = serp_data.get("top_3_urls", [])

                snapshot = RankSnapshot(
                    tracked_keyword_id=kw.id,
                    position=position,
                    serp_features=serp_features,
                    top_3_urls=top_3_urls,
                    checked_at=_dt.datetime.utcnow(),
                )
                db.add(snapshot)
                await db.commit()
                checked += 1

            except Exception as e:
                logger.warning(f"Rank check failed for keyword '{kw.keyword}': {e}")
                await db.rollback()
                errors += 1

    return {"checked": checked, "errors": errors}


async def scheduled_rank_tracking_worker():
    """Background worker: runs check_all_tracked_keywords() once per call.
    Intended to be called by the main scheduler loop every ~24h."""
    logger.info("[rank-tracking] Starting scheduled rank check…")
    result = await check_all_tracked_keywords()
    logger.info(f"[rank-tracking] Complete: {result}")
    return result
