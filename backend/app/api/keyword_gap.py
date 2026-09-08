"""Keyword Gap Analysis API — compares tracked keywords between two domains
using RankSnapshot data. Falls back to live SERP comparison when snapshots
don't exist yet.

GET /api/keyword-gap/{domain}/{competitor} returns keywords where the
competitor ranks but you don't (or rank lower), and vice versa.
"""
import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    TrackedDomain, TrackedKeyword, RankSnapshot, User,
)
from app.api.auth import get_current_active_user
from app.services.ddg_serp_client import DDGSerpClient
from app.engine.keyword_difficulty_engine import KeywordDifficultyEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/keyword-gap", tags=["keyword-gap"])

# Bounded live opportunity enrichment: we never score more than this many gap
# rows per request, and the scoring reuses the platform's single shared
# SERP-weakness + opportunity modules (see app.engine.opportunity_score).
_SCORE_LIMIT = 5
_SCORE_CONCURRENCY = 3


async def _score_gap_opportunities(rows: list[dict], engine=None) -> list[dict]:
    """Attach shared-module SERP opportunity to competitor-only gap rows.

    Reuses the Keyword Difficulty engine, which layers the shared
    `compute_serp_weakness` + `score_opportunity` under one documented formula.
    Honesty rules inherited: no volume/CPC anywhere, N/A stays N/A. Scoring is
    best-effort — a failed or rate-limited analysis leaves the row unscored.
    """
    engine = engine or KeywordDifficultyEngine()
    targets = rows[:_SCORE_LIMIT]
    sem = asyncio.Semaphore(_SCORE_CONCURRENCY)

    async def score_one(row: dict) -> dict:
        async with sem:
            try:
                res = await engine.analyze(row.get("keyword", ""))
            except Exception as e:
                logger.debug(f"Gap opportunity scoring failed for '{row.get('keyword')}': {e}")
                return row
        if res.get("state") not in ("SUCCESS", "PARTIAL_DATA"):
            return row
        opp = res.get("opportunity") or {}
        weakness = res.get("serp_weakness") or {}
        return {
            **row,
            "difficulty": res.get("difficulty"),
            "difficulty_label": res.get("difficulty_label"),
            "opportunity": opp.get("score"),
            "opportunity_band": opp.get("band"),
            "weakness": weakness.get("level"),
            "score_source": (res.get("data_source") or {}).get("serp_provider", "unknown"),
        }

    scored = await asyncio.gather(*(score_one(r) for r in targets))
    return list(scored) + rows[_SCORE_LIMIT:]


async def _get_latest_positions(db: AsyncSession, domain_id: str) -> dict:
    """Return {keyword: position} for the latest snapshot of each tracked keyword."""
    kws = (await db.execute(
        select(TrackedKeyword).where(TrackedKeyword.target_domain_id == domain_id)
    )).scalars().all()

    result = {}
    for kw in kws:
        snap = (await db.execute(
            select(RankSnapshot)
            .where(RankSnapshot.tracked_keyword_id == kw.id)
            .order_by(desc(RankSnapshot.checked_at))
            .limit(1)
        )).scalar_one_or_none()
        if snap and snap.position is not None:
            result[kw.keyword.lower()] = {
                "position": snap.position,
                "device": kw.device,
                "serp_features": snap.serp_features or {},
            }
    return result


async def _live_serp_check(keywords: list[str], target_domain: str, client: DDGSerpClient) -> dict:
    """Check a list of keywords for a domain via live SERP. Returns {keyword: {position, serp_features}}.

    Runs checks concurrently (bounded by a semaphore). Repeated lookups hit the
    in-process SERP cache so re-checking the same keywords is nearly instant.
    """
    results = {}
    sem = asyncio.Semaphore(5)

    async def check(kw: str):
        async with sem:
            try:
                data = await client.get_serp(keyword=kw, target_domain=target_domain)
                if not data.get("error"):
                    results[kw.lower()] = {
                        "position": data.get("position"),
                        "serp_features": data.get("serp_features", {}),
                    }
            except Exception as e:
                logger.debug(f"Live SERP check failed for '{kw}' on {target_domain}: {e}")

    await asyncio.gather(*(check(kw) for kw in keywords))
    return results


def _generate_seed_keywords(domain: str) -> list[str]:
    """Generate keyword seeds from a domain name for live SERP gap analysis."""
    name = domain.lower().replace(".com", "").replace(".io", "").replace(".ai", "").replace(".co", "")
    parts = name.replace("-", " ").replace(".", " ").split()
    seeds = []

    # Core branded variations
    seeds.append(name)
    seeds.append(f"{name} reviews")
    seeds.append(f"{name} alternatives")
    seeds.append(f"{name} vs")
    seeds.append(f"{name} pricing")
    seeds.append(f"{name} login")

    # Industry-generic if name looks like a brand
    if len(parts) >= 1:
        main = " ".join(parts)
        seeds.extend([
            f"{main} software",
            f"{main} tool",
            f"{main} platform",
            f"best {main}",
        ])

    return seeds[:10]


@router.get("")
async def keyword_gap_query(domain: str = Query("", description="Your domain (URL or bare)"),
                            competitor: str = Query("", description="Competitor domain (URL or bare)"),
                            user: User = Depends(get_current_active_user),
                            db: AsyncSession = Depends(get_db)):
    """Compare tracked keywords between two domains (query-param version).
    Accepts full URLs or bare domains."""
    from app.engine.domain_utils import normalize_domain
    d1 = normalize_domain(domain)
    d2 = normalize_domain(competitor)
    if not d1 or not d2:
        return {"detail": "Provide both domain and competitor."}
    return await _keyword_gap_inner(d1, d2, user, db)


@router.get("/{domain}/{competitor}")
async def keyword_gap(domain: str, competitor: str,
                      background_tasks: BackgroundTasks,
                      user: User = Depends(get_current_active_user),
                      db: AsyncSession = Depends(get_db)):
    """Compare tracked keywords between two domains (path version).

    Returns:
      - your_only: keywords you rank for but competitor doesn't
      - competitor_only: keywords competitor ranks for but you don't
      - both_rank: keywords both rank for, with position comparison
    """
    from app.engine.domain_utils import normalize_domain
    d1 = normalize_domain(domain)
    d2 = normalize_domain(competitor)
    if not d1 or not d2:
        return {"detail": "Provide both domain and competitor."}
    return await _keyword_gap_inner(d1, d2, user, db)


async def _keyword_gap_inner(d1: str, d2: str, user, db):
    """Shared gap logic. d1/d2 are already normalized bare domains."""

    td1 = (await db.execute(
        select(TrackedDomain).where(TrackedDomain.domain == d1)
    )).scalar_one_or_none()
    td2 = (await db.execute(
        select(TrackedDomain).where(TrackedDomain.domain == d2)
    )).scalar_one_or_none()

    pos1 = await _get_latest_positions(db, td1.id) if td1 else {}
    pos2 = await _get_latest_positions(db, td2.id) if td2 else {}

    # Live SERP fallback: if either domain has no tracked positions, check live
    live_checked = False
    if (not pos1 or not pos2):
        client = DDGSerpClient()
        keywords_to_check = set(pos1.keys()) | set(pos2.keys())

        # If neither domain has any keywords, generate seeds from domain names
        if not keywords_to_check:
            seeds_d1 = _generate_seed_keywords(d1)
            seeds_d2 = _generate_seed_keywords(d2)
            keywords_to_check = set(seeds_d1) | set(seeds_d2)

        if keywords_to_check:
            live_checked = True
            kw_list = sorted(keywords_to_check)

            # Check domain 1 if it has no positions
            if not pos1:
                pos1 = await _live_serp_check(kw_list, d1, client)

            # Check domain 2 if it has no positions
            if not pos2:
                pos2 = await _live_serp_check(kw_list, d2, client)

    all_keywords = set(pos1.keys()) | set(pos2.keys())
    your_only = []
    competitor_only = []
    both_rank = []

    for kw in all_keywords:
        in_you = kw in pos1
        in_comp = kw in pos2

        you_pos = pos1.get(kw, {}).get("position") if in_you else None
        comp_pos = pos2.get(kw, {}).get("position") if in_comp else None

        if you_pos and not comp_pos:
            your_only.append({
                "keyword": kw,
                "position": you_pos,
                "device": pos1[kw].get("device", "desktop"),
                "serp_features": pos1[kw].get("serp_features", {}),
            })
        elif comp_pos and not you_pos:
            competitor_only.append({
                "keyword": kw,
                "position": comp_pos,
                "device": pos2[kw].get("device", "desktop"),
                "serp_features": pos2[kw].get("serp_features", {}),
            })
        elif you_pos and comp_pos:
            both_rank.append({
                "keyword": kw,
                "your_position": you_pos,
                "competitor_position": comp_pos,
                "gap": you_pos - comp_pos,
                "device": pos1[kw].get("device", "desktop"),
                "serp_features": pos1[kw].get("serp_features", {}),
            })

    your_only.sort(key=lambda x: x.get("position", 999))
    competitor_only.sort(key=lambda x: x.get("position", 999))
    both_rank.sort(key=lambda x: x.get("gap", 0))

    # Shared-module opportunity enrichment: for your attack gaps (competitor
    # ranks, you don't), score the actual SERP via the KD engine — which uses
    # the single platform-wide `opportunity_score` module. Best-effort.
    scored = 0
    if competitor_only:
        enriched = await _score_gap_opportunities(competitor_only)
        scored = sum(1 for r in enriched if r.get("opportunity") is not None)
        if scored:
            competitor_only = enriched

    return {
        "domain": d1,
        "competitor": d2,
        "your_only": your_only,
        "competitor_only": competitor_only,
        "both_rank": both_rank,
        "summary": {
            "your_keywords_tracked": len(pos1),
            "competitor_keywords_tracked": len(pos2),
            "your_only_count": len(your_only),
            "competitor_only_count": len(competitor_only),
            "both_rank_count": len(both_rank),
            "live_serp_checked": live_checked,
            "opportunity_scored": scored,
            "opportunity_note": "Competitor-only rows are scored against the live SERP "
                                "via the shared opportunity module (SERP weakness + "
                                "difficulty). Never volume/CPC — those are never guessed.",
        },
    }
