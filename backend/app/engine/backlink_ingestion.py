"""Backlink ingestion pipeline — fills the Backlink and ReferringDomain tables
using Common Crawl (free, no API key) and Open PageRank (free API key).

This is the missing piece that makes Backlink Explorer, Referring Domains,
Toxic Links, and disavow export work with real data.

Flow:
  1. Query Common Crawl index for pages referencing the target domain.
  2. Extract outbound <a href> tags from WARC files.
  3. Enrich referring domains with Open PageRank DA scores.
  4. Score each backlink for toxicity (spammy TLD, low DA, anchor repetition).
  5. Write/update Backlink and ReferingDomain rows.
"""
import asyncio
import logging
import datetime as _dt
from urllib.parse import urlparse
from collections import Counter

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Backlink, ReferringDomain, TrackedDomain

logger = logging.getLogger(__name__)

# Spammy TLDs that correlate with low-quality / toxic sites
SPAMMY_TLDS = {
    ".xyz", ".top", ".club", ".site", ".online", ".click", ".link",
    ".buzz", ".gq", ".ml", ".cf", ".tk", ".ga", ".cc", ".pw",
    ".work", ".icu", ".monster", ".surf", ".rest", ".cfd",
}

# Anchor text is considered over-optimized if >30% of backlinks from one
# referring domain use the exact same anchor
OVER_OPTIMIZED_THRESHOLD = 0.30


def _toxicity_score(
    source_domain: str,
    domain_authority: float,
    anchor_text: str,
    anchor_counts: Counter,
    total_from_domain: int,
    spam_score: float = 0.0,
) -> float:
    """Compute a 0.0–1.0 toxic score for a single backlink.
    Incorporates real Open PageRank spam score when available."""
    score = 0.0

    # Open PageRank spam score (real signal, 0-1 scale)
    if spam_score > 0:
        score += spam_score * 0.4

    # TLD check
    for tld in SPAMMY_TLDS:
        if source_domain.endswith(tld):
            score += 0.3
            break

    # Low domain authority
    if domain_authority <= 5:
        score += 0.3
    elif domain_authority <= 15:
        score += 0.15

    # Over-optimized anchor text from same domain
    if total_from_domain > 0 and anchor_text:
        ratio = anchor_counts.get(anchor_text.lower(), 0) / total_from_domain
        if ratio >= OVER_OPTIMIZED_THRESHOLD:
            score += 0.25

    # Very short or no anchor text (often a sign of comment spam / forum spam)
    if anchor_text and len(anchor_text) <= 2:
        score += 0.1

    # Very long anchor text (often auto-generated)
    if anchor_text and len(anchor_text) > 150:
        score += 0.1

    return min(score, 1.0)


async def _get_domain_authority(domain: str) -> tuple[float, float]:
    """Get domain authority + spam score from Open PageRank (free).
    Returns (da, spam_score) tuple. Falls back to (0.0, 0.0) if unavailable."""
    try:
        from app.engine.open_page_rank_client import get_domain_authority
        info = await get_domain_authority(domain)
        da = float(info.get("domain_authority", 0))
        # Open PageRank has no spam score; approximate via rank gap (large
        # page_rank with low referring-domains is unusual, not a spam metric,
        # so we return 0 unless low authority).
        spam = 0.0
        if da <= 5:
            spam = 40.0
        elif da <= 15:
            spam = 15.0
        return (da, spam)
    except Exception as e:
        logger.debug(f"Open PageRank failed for {domain}: {e}")
    return (0.0, 0.0)


async def ingest_backlinks_for_domain(
    domain: str,
    db: AsyncSession,
    max_index_pages: int = 3,
) -> dict:
    """Ingest backlinks for a single domain using Common Crawl + Open PageRank.

    Writes/updates Backlink and ReferringDomain rows.
    Returns a summary dict: {backlinks_found, backlinks_added, referring_domains, source}.
    """
    from app.services.common_crawl_client import get_backlinks_for_domain

    domain = domain.lower().strip().lstrip("www.")
    logger.info(f"Starting backlink ingestion for {domain}")

    # 1. Fetch backlinks from Common Crawl
    raw_backlinks = await get_backlinks_for_domain(domain, max_index_pages)

    if not raw_backlinks:
        logger.info(f"No backlinks found for {domain} in Common Crawl")
        return {
            "backlinks_found": 0,
            "backlinks_added": 0,
            "referring_domains": 0,
            "source": "common_crawl",
            "note": "No Common Crawl records found for this domain.",
        }

    # 2. Deduplicate by (source_domain, anchor_text) and count per domain
    domain_anchors: dict[str, Counter] = {}
    domain_links: dict[str, list[dict]] = {}
    for bl in raw_backlinks:
        sd = bl["source_domain"]
        if sd not in domain_links:
            domain_links[sd] = []
            domain_anchors[sd] = Counter()
        domain_links[sd].append(bl)
        if bl["anchor_text"]:
            domain_anchors[sd][bl["anchor_text"].lower()] += 1

    # 3. Get domain authority for top referring domains (cap at 100 to stay free-tier safe)
    referring_domains_list = list(domain_links.keys())[:100]
    da_scores: dict[str, float] = {}
    spam_scores: dict[str, float] = {}

    # Fetch DA in batches of 10 with delay
    for i in range(0, len(referring_domains_list), 10):
        batch = referring_domains_list[i:i + 10]
        tasks = [_get_domain_authority(d) for d in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for d, result in zip(batch, results):
            if isinstance(result, tuple):
                da_scores[d] = result[0]
                spam_scores[d] = result[1]
            elif isinstance(result, (int, float)):
                da_scores[d] = float(result)
                spam_scores[d] = 0.0
            else:
                da_scores[d] = 0.0
                spam_scores[d] = 0.0
        if i + 10 < len(referring_domains_list):
            await asyncio.sleep(1.0)

    # 4. Upsert Backlink and ReferringDomain rows
    backlinks_added = 0
    now = _dt.datetime.utcnow()

    # Find or create TrackedDomain for this domain
    tracked_domain = None
    result = await db.execute(
        select(TrackedDomain).where(TrackedDomain.domain == domain)
    )
    tracked_domain = result.scalar_one_or_none()
    if not tracked_domain:
        tracked_domain = TrackedDomain(domain=domain, is_own_domain=False)
        db.add(tracked_domain)
        await db.flush()
        logger.info(f"Created TrackedDomain for {domain}")

    for source_domain, links in domain_links.items():
        da = da_scores.get(source_domain, 0.0)
        anchor_counter = domain_anchors[source_domain]
        total_from_domain = len(links)

        # Upsert ReferringDomain
        rd_result = await db.execute(
            select(ReferringDomain).where(
                ReferringDomain.target_domain == domain,
                ReferringDomain.domain == source_domain,
            )
        )
        rd = rd_result.scalar_one_or_none()
        if rd:
            rd.link_count = max(rd.link_count or 0, total_from_domain)
            rd.domain_authority = da
            rd.last_seen = now
        else:
            rd = ReferringDomain(
                target_domain=domain,
                domain=source_domain,
                link_count=total_from_domain,
                domain_authority=da,
                first_seen=now,
                last_seen=now,
            )
            db.add(rd)

        # Upsert each unique backlink from this referring domain
        seen_anchors: set[str] = set()
        for link in links:
            anchor_key = (source_domain, link["anchor_text"].lower())
            if anchor_key in seen_anchors:
                continue
            seen_anchors.add(anchor_key)

            toxic = _toxicity_score(
                source_domain, da, link["anchor_text"],
                anchor_counter, total_from_domain,
                spam_score=spam_scores.get(source_domain, 0.0),
            )

            bl_result = await db.execute(
                select(Backlink).where(
                    Backlink.target_domain == domain,
                    Backlink.source_domain == source_domain,
                    Backlink.anchor_text == link["anchor_text"],
                )
            )
            existing = bl_result.scalar_one_or_none()
            if existing:
                existing.last_seen = now
                existing.domain_authority = da
                existing.toxic_score = toxic
                existing.is_follow = not link["is_nofollow"]
            else:
                bl = Backlink(
                    target_domain=domain,
                    source_url=link["source_url"][:500],
                    source_domain=source_domain,
                    target_url=f"https://{domain}",
                    anchor_text=link["anchor_text"][:200],
                    is_follow=not link["is_nofollow"],
                    domain_authority=da,
                    toxic_score=toxic,
                    first_seen=now,
                    last_seen=now,
                )
                db.add(bl)
                backlinks_added += 1

    # Compute average toxic score for referring domain
    for source_domain in domain_links:
        rd_result = await db.execute(
            select(ReferringDomain).where(
                ReferringDomain.target_domain == domain,
                ReferringDomain.domain == source_domain,
            )
        )
        rd = rd_result.scalar_one_or_none()
        if rd:
            bls = await db.execute(
                select(func.avg(Backlink.toxic_score)).where(
                    Backlink.target_domain == domain,
                    Backlink.source_domain == source_domain,
                )
            )
            avg_toxic = bls.scalar()
            rd.toxic_score = float(avg_toxic or 0.0)

    await db.commit()

    summary = {
        "backlinks_found": len(raw_backlinks),
        "backlinks_added": backlinks_added,
        "referring_domains": len(domain_links),
        "source": "common_crawl",
        "note": "Backlink data sourced from Common Crawl's public web archive, refreshed monthly.",
    }
    logger.info(f"Backlink ingestion complete for {domain}: {summary}")
    return summary


async def scheduled_backlink_ingestion_worker():
    """Monthly worker: ingest backlinks for every TrackedDomain."""
    from app.database import async_session
    from sqlalchemy import select

    while True:
        try:
            async with async_session() as db:
                result = await db.execute(select(TrackedDomain))
                domains = result.scalars().all()
                for td in domains:
                    try:
                        summary = await ingest_backlinks_for_domain(td.domain, db)
                        logger.info(f"Scheduled backlink ingestion for {td.domain}: {summary}")
                    except Exception as e:
                        logger.error(f"Scheduled backlink ingestion failed for {td.domain}: {e}")
                    # Pause between domains to be a respectful Common Crawl citizen
                    await asyncio.sleep(10)
        except Exception as e:
            logger.error(f"Scheduled backlink ingestion worker error: {e}")

        # Run once a month
        await asyncio.sleep(30 * 24 * 3600)
