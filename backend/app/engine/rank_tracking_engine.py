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


def _resolve_serp_provider(user_config: dict | None = None):
    """Pick the best configured SERP provider (paid/free-with-key), else None.

    Returns (provider_obj, provider_name, configured). When not configured the
    engine falls back to the free DuckDuckGo scraper to keep positions flowing.
    """
    from app.engine.providers import (
        build_provider, effective_config, resolve_for_capability,
    )
    resolved = resolve_for_capability("serp_ranks", user_config)
    provider = build_provider(
        "serp_ranks",
        resolved["provider"],
        effective_config(resolved["provider"], user_config),
    )
    return provider, resolved["provider"], resolved["configured"]


async def check_all_tracked_keywords(domain_filter: Optional[str] = None):
    """One full pass: query tracked keywords, write a RankSnapshot.

    Data source per keyword, in priority order:
      1. GSC (own domains, real positions, free)
      2. configured SERP provider (Serper/OpenSerp/Google CSE/SerpAPI/DataForSEO)
      3. DuckDuckGo scraper (free keyless fallback)

    Args:
        domain_filter: if provided, only check keywords for this domain.
    """
    from app.models import DeviceEnum
    from app.engine.spend_guard import check_provider_budget, record_provider_usage
    from app.services.gsc_rank_client import GSCRankClient
    from app.services.ddg_serp_client import DDGSerpClient

    gsc_client = GSCRankClient()
    ddg_client = DDGSerpClient()
    serp_provider, serp_source, serp_configured = _resolve_serp_provider()

    async with async_session() as db:
        if domain_filter:
            result = await db.execute(
                select(TrackedKeyword)
                .join(TrackedDomain)
                .where(TrackedDomain.domain == domain_filter.lower().strip())
            )
        else:
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
            source = "gsc"

            try:
                if domain.is_own_domain and gsc_client.available:
                    # Own domain → use GSC (real position data, free)
                    # Wrap sync GSC call in asyncio.to_thread to avoid blocking event loop
                    pos_float = await asyncio.to_thread(
                        gsc_client.get_average_position,
                        f"https://{domain.domain}", kw.keyword
                    )
                    if pos_float is not None:
                        position = int(round(pos_float))

                else:
                    # Competitor domain — use a configured SERP provider (paid/
                    # free-with-key) else the free DuckDuckGo scraper.
                    source = "ddg"
                    if serp_configured:
                        try:
                            await check_provider_budget(db, None, serp_source, cost=1)
                            serp_result = await serp_provider.live_position(
                                keyword=kw.keyword, host=domain.domain,
                            )
                            position = serp_result.get("position")
                            if serp_result.get("page_url"):
                                top_3_urls = [serp_result["page_url"]]
                            if serp_result.get("error"):
                                logger.info(
                                    f"[rank-tracking] {serp_source} error for "
                                    f"'{kw.keyword}' on {domain.domain}: {serp_result['error']}"
                                )
                            else:
                                source = serp_source
                            await record_provider_usage(
                                db, None, serp_source, cost=1,
                                details={"endpoint": "rank-tracking/refresh", "keyword": kw.keyword},
                            )
                        except Exception as e:
                            logger.info(
                                f"[rank-tracking] provider '{serp_source}' failed "
                                f"for '{kw.keyword}' on {domain.domain}, falling back to DDG: {e}"
                            )

                    if source == "ddg":
                        serp_features = {}
                        serp_data = await ddg_client.get_serp(
                            keyword=kw.keyword,
                            target_domain=domain.domain,
                        )
                        if not serp_data.get("error"):
                            position = serp_data.get("position")
                            serp_features = serp_data.get("serp_features", {}) or {}
                            top_3_urls = serp_data.get("top_3_urls", [])
                        else:
                            logger.info(
                                f"[rank-tracking] DDG returned error for "
                                f"'{kw.keyword}' on {domain.domain}: "
                                f"{serp_data.get('error')}"
                            )

                serp_features["source"] = source

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
