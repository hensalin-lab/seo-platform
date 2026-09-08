"""Shared Opportunity Score + SERP weakness analysis.

Single, reusable implementation for the whole platform (Keyword Difficulty
today, Keyword Gap Analysis capable). There must be exactly one opportunity
scoring module â€” this is it.

Opportunity Score (0-100) = how attractive this keyword is *as an opening*
given the current SERP:

    score = 100 * (0.50 * inverse-difficulty
                 + 0.35 * SERP weakness share
                 + 0.15 * intent factor)

    inverse-difficulty = (100 - difficulty) / 100       (higher = opener)
    SERP weakness share = unique weak results / N       (incumbent opening)
    intent factor       = 1.0 commercial/transactional, 0.9 otherwise

Honesty rule: search volume / CPC are NEVER invented here (or anywhere). This
module computes the traffic-independent "opening" only; any volume numbers you
see elsewhere must come from a real provider (DataForSEO) or absent.
"""
from __future__ import annotations

import re
from typing import Optional

# UGC / community / editorial domains (used for the weakness breakdown).
_COMMUNITY_HOSTS = {
    "reddit.com", "quora.com", "github.com", "stackoverflow.com",
    "serverfault.com", "superuser.com", "askubuntu.com", "dev.to",
    "medium.com", "producthunt.com", "youtube.com", "tiktok.com",
    "twitter.com", "x.com", "facebook.com", "instagram.com", "pinterest.com",
    "wikipedia.org", "wikihow.com", "yelp.com", "trustpilot.com",
}
_COMMUNITY_PATH = re.compile(
    r"(/forum|/threads|/discuss|/community|/boards|/topics|/posts|"
    r"/questions/|/u/|/user/|/answers|/groups|/discussion)",
    re.I,
)
_COMMUNITY_HOSTNAME = re.compile(
    r"^(community|forum|forums|answers|discuss|boards)\.", re.I,
)


def _host_of(url: str) -> str:
    try:
        from urllib.parse import urlparse
        return (urlparse(url).hostname or "").lower().removeprefix("www.")
    except Exception:
        return ""


def compute_serp_weakness(rows: list[dict]) -> dict:
    """Compute an honest, *overlapping* SERP weakness breakdown.

    Each row must contain at least {"da": int|None, "url": str}.

    Categories are explicitly overlapping ("a result can count in more than one
    category") and each sub-count is expressed with the same denominator N
    (total results analyzed) so the numbers always reconcile to the result set:
    count <= N, and the three counts are independent (union is reported too).
    """
    n = len(rows)
    das = [r.get("da") for r in rows if isinstance(r.get("da"), int)]
    avg_da = round(sum(das) / len(das), 1) if das else None

    below_avg = 0
    below_40 = 0
    community = 0
    for r in rows:
        da = r.get("da") if isinstance(r.get("da"), int) else None
        url = r.get("url") or ""
        if da is not None and avg_da is not None and da < avg_da:
            below_avg += 1
        if da is not None and da < 40:
            below_40 += 1
        if _is_community(url):
            community += 1

    def in_union(r: dict) -> bool:
        da = r.get("da") if isinstance(r.get("da"), int) else None
        if da is not None and ((avg_da is not None and da < avg_da) or da < 40):
            return True
        return _is_community(r.get("url") or "")

    union = sum(1 for r in rows if in_union(r))
    share = (union / n) if n else 0.0

    if (avg_da is not None and avg_da < 40) or share >= 0.5:
        level = "HIGH"
    elif (avg_da is not None and avg_da < 60) or share >= 0.3:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "level": level,
        "overlapping": True,
        "note": "Categories overlap: a single result can count in more than one "
                "category. Counts share the same denominator (results analyzed) "
                "so they always reconcile to the result set.",
        "results_analyzed": n,
        "below_average_authority": {
            "count": below_avg, "of": n,
            "note": "Results with a DA below the SERP average. Results with N/A DA are excluded from the numerator.",
        },
        "community_editorial": {
            "count": community, "of": n,
            "note": "UGC/community/editorial results (e.g. reddit.com, quora.com, forums, wikipedia.org).",
        },
        "below_40_da": {
            "count": below_40, "of": n,
            "note": "Results with DA below 40. Results with N/A DA are excluded from the numerator.",
        },
    }


def _is_community(url: str) -> bool:
    host = _host_of(url)
    if not host:
        return False
    if host in _COMMUNITY_HOSTS:
        return True
    if _COMMUNITY_HOSTNAME.match(host):
        return True
    return bool(_COMMUNITY_PATH.search(url))


def score_opportunity(
    *,
    difficulty: Optional[float] = None,
    avg_da: Optional[float] = None,
    strong_pct: Optional[float] = None,
    weakness_share: Optional[float] = None,
    intent: Optional[str] = None,
):
    """Shared Opportunity Score â€” traffic-independent SERP "opening".

    Reused by Keyword Difficulty (and available to Keyword Gap Analysis) so the
    platform keeps ONE opportunity implementation. Volume/CPC are deliberately
    not part of the score: those must come from a real provider or be absent.

    Returns {"status": "SUCCESS", "score": 0-100, "band": ..., "inputs": {...}}
    """
    difficulty_f = min(1.0, max(0.0, (100.0 - float(difficulty or 50)) / 100.0))
    weakness_f = min(1.0, (weakness_share or 0.0) / 0.6)
    intent_factor = 1.0 if (intent or "").lower() in ("commercial", "transactional") else 0.9

    score = round(max(0.0, min(100.0, 100.0 * (
        0.50 * difficulty_f + 0.35 * weakness_f + 0.15 * intent_factor
    ))), 1)
    band = "GOOD OPPORTUNITY" if score >= 60 else "MODERATE" if score >= 40 else "LOW OPPORTUNITY"
    return {
        "status": "SUCCESS",
        "score": score,
        "band": band,
        "inputs": {
            "difficulty": difficulty, "avg_da": avg_da,
            "strong_domain_pct": strong_pct, "weakness_share": weakness_share,
            "intent": intent,
            "formula": "0.50*inverse-difficulty + 0.35*serp-weakness-share + 0.15*intent-factor",
        },
    }