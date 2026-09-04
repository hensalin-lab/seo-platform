"""Shared Open PageRank client.

Open PageRank (Keywords Everywhere) provides spam-filtered authority scores
(0-10) for any domain, built from Common Crawl's open web graph, in a single
batch request (up to 100 domains). This is the *current* API:

    POST https://openpagerank.keywordseverywhere.com/v1/domains/bulk
    Authorization: Bearer <opr_live_xxx>
    {"domains": [...], "include_history": false}

The legacy openpagerank.com endpoint (with API-OPR header) is deprecated and
rejects current keys with "Invalid API key", so all callers should go through
this module.
"""
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

OPR_API = "https://openpagerank.keywordseverywhere.com/v1/domains/bulk"
BATCH_SIZE = 100
_TIMEOUT = 20.0


def _normalize_domain(domain: str) -> str:
    return domain.lower().strip().lstrip("www.")


async def opr_batch(domains: list, api_key: str, timeout: float = _TIMEOUT) -> dict:
    """Fetch Open PageRank data for up to 100 domains.

    Returns {normalized_domain: {domain, page_rank (0-10), rank,
    referring_domains, domain_authority (0-100 scaled)}}.
    """
    cleaned = [_normalize_domain(d) for d in domains if d and _normalize_domain(d)]
    if not cleaned or not api_key:
        return {}

    payload = {"domains": cleaned, "include_history": False}
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    out: dict = {}
    # Send in batches of BATCH_SIZE (the API allows up to 100 per request).
    for i in range(0, len(cleaned), BATCH_SIZE):
        batch = cleaned[i:i + BATCH_SIZE]
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(OPR_API, json={**payload, "domains": batch}, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                for res in data.get("results") or []:
                    dom = _normalize_domain(res.get("domain") or "")
                    if not dom:
                        continue
                    opr = res.get("open_page_rank")
                    opr = float(opr) if opr is not None else 0.0
                    out[dom] = {
                        "domain": dom,
                        "page_rank": opr,
                        "domain_authority": min(100.0, opr / 10.0 * 100.0),
                        "rank": res.get("rank") or 0,
                        "referring_domains": res.get("referring_domains") or 0,
                    }
            elif resp.status_code in (401, 403):
                logger.warning("Open PageRank auth rejected: %s %s", resp.status_code, resp.text[:200])
            else:
                logger.debug("Open PageRank HTTP %s: %s", resp.status_code, resp.text[:200])
        except Exception as e:
            logger.debug(f"Open PageRank batch failed: {e}")

    return out


async def get_domain_authority(domain: str, api_key: Optional[str] = None) -> dict:
    """Convenience: authority info for a single domain."""
    from app.config import settings
    key = api_key or getattr(settings, "OPEN_PAGERANK_API_KEY", "") or ""
    dom = _normalize_domain(domain)
    results = await opr_batch([dom], key)
    return results.get(dom, {
        "domain": dom,
        "page_rank": 0.0,
        "domain_authority": 0.0,
        "rank": 0,
        "referring_domains": 0,
    })
