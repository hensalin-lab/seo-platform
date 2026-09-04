"""Rank tracking engine — loops all TrackedKeywords, queries the right
data source (GSC for own domains, DuckDuckGo scraper for competitors),
and writes a new RankSnapshot each run.

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
from app.services.ddg_serp_client import DDGSerpClient
from app.services.gsc_rank_client import GSCRankClient

logger = logging.getLogger(__name__)


async def check_all_tracked_keywords():
    """One full pass: query every tracked keyword, write a RankSnapshot."""
    from app.models import DeviceEnum

    gsc_client = GSCRankClient()
    ddg_client = DDGSerpClient()

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
                    # Own domain → use GSC (real position data, free)
                    pos_float = await gsc_client.get_average_position(
                        f"https://{domain.domain}", kw.keyword
                    )
                    if pos_float is not None:
                        position = int(round(pos_float))

                else:
                    # Competitor domain → use DuckDuckGo scraper (free, approx)
                    serp_data = await ddg_client.get_serp(
                        keyword=kw.keyword,
                        target_domain=domain.domain,
                    )
                    if not serp_data.get("error"):
                        position = serp_data.get("position")
                        serp_features = serp_data.get("serp_features", {})
                        top_3_urls = serp_data.get("top_3_urls", [])
                    else:
                        logger.info(
                            f"[rank-tracking] DDG returned error for "
                            f"'{kw.keyword}' on {domain.domain}: "
                            f"{serp_data.get('error')}"
                        )

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
