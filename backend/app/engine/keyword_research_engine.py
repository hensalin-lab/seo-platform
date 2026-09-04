"""Keyword research engine — SERP-based keyword difficulty, SERP overview,
and keyword-universe discovery. All free, no API key required for basic usage.

Uses multi-source SERP client (Serper → OpenSerp → DuckDuckGo) for real
Google rankings when API keys are configured. Falls back to DDG HTML scraper.

Keyword Difficulty (0-100): a real competitive difficulty estimate computed by
analyzing the actual SERP for the keyword — the strength (referring-domain
authority) of the domains ranking in the top 10 determines the score.
"""
import asyncio
import logging

from app.services.ddg_serp_client import DDGSerpClient
from app.services.common_crawl_client import get_backlinks_for_domain

logger = logging.getLogger(__name__)


def _host_of(url: str) -> str:
    from urllib.parse import urlparse
    try:
        return (urlparse(url).hostname or "").lower().lstrip("www.")
    except Exception:
        return ""


def _difficulty_from_results(results: list, referring_strength: dict) -> dict:
    """Compute keyword difficulty from the top SERP results.

    Score logic (0-100, higher = harder):
      - Average DA of ranking domains (weighted): 0-60
      - % of top-10 from strong domains (DA>=40): 0-20
      - Density of well-known/authority TLDs (.gov/.edu/.com): 0-10
      - Competitiveness spread (how tightly packed positions 1-10): 0-10
    """
    top10 = results[:10]
    if not top10:
        return {"difficulty": 50.0, "note": "No SERP results — defaulted to moderate difficulty.",
                "top10_da_avg": 0, "strong_domain_pct": 0}

    das = []
    strong_count = 0
    authority_tld_count = 0
    for r in top10:
        host = _host_of(r.get("url", ""))
        da = referring_strength.get(host, 0) or 0
        das.append(da)
        if da >= 40:
            strong_count += 1
        if host.endswith((".gov", ".edu", ".org")):
            authority_tld_count += 1

    avg_da = sum(das) / len(das)
    strong_pct = strong_count / len(das)
    authority_pct = authority_tld_count / len(das)

    # DA component: 0-60 points
    da_component = min(60.0, avg_da * 1.2)
    # Strong-domain concentration: 0-20
    strong_component = strong_pct * 20.0
    # Authority TLD presence: 0-10
    tld_component = authority_pct * 10.0
    # Spread: tight top-10 = harder — approximate using DA variance
    if len(das) > 1:
        mean = sum(das) / len(das)
        spread = sum((d - mean) ** 2 for d in das) / len(das)
        spread_component = min(10.0, (1 - (spread / 2500)) * 10.0)
    else:
        spread_component = 5.0

    difficulty = round(min(100.0, da_component + strong_component + tld_component + spread_component), 1)

    return {
        "difficulty": difficulty,
        "note": "Estimated from DuckDuckGo SERP analysis of the top 10 results (domain-authority of ranking pages). Estimates, not Google data.",
        "top10_da_avg": round(avg_da, 1),
        "strong_domain_pct": round(strong_pct, 3),
    }


async def _referring_strength_cache(domains: list, max_new: int = 5) -> dict:
    """Fetch referring-domain counts for up to `max_new` uncached domains."""
    # Authority is approximated by the count of referring domains (from Common
    # Crawl, cached monthly). We batch and reuse for all requested domains.
    strength = {}
    for host in domains[:max_new]:
        try:
            backlinks = await get_backlinks_for_domain(host, max_index_pages=1)
            strength[host] = min(100, len({b["source_domain"] for b in backlinks if b.get("source_domain")}))
        except Exception as e:
            logger.debug(f"Referring strength lookup failed for {host}: {e}")
            strength[host] = 0
        await asyncio.sleep(2)
    return strength


class KeywordDifficultyEngine:
    """Estimate keyword difficulty + SERP overview using the free DDG scraper."""

    def __init__(self):
        self.ddg = DDGSerpClient()

    async def analyze(self, keyword: str) -> dict:
        """Get difficulty score + SERP overview for a keyword."""
        serp = await self.ddg.get_serp(keyword)  # no target_domain → position None
        results = serp.get("all_results") or []
        if not results:
            return {"keyword": keyword, "error": serp.get("error", "No results"),
                    "difficulty": None, "results": []}

        top_domains = list(dict.fromkeys(_host_of(r["url"]) for r in results[:10]))
        strength = await _referring_strength_cache(top_domains)

        difficulty = _difficulty_from_results(results, strength)

        return {
            "keyword": keyword,
            "difficulty": difficulty["difficulty"],
            "note": difficulty["note"],
            "top10_da_avg": difficulty["top10_da_avg"],
            "strong_domain_pct": difficulty["strong_domain_pct"],
            "serp_overview": [
                {
                    "position": i + 1,
                    "url": r["url"],
                    "domain": _host_of(r["url"]),
                    "title": r["title"],
                    "snippet": r["snippet"],
                    "referring_strength": strength.get(_host_of(r["url"]), 0),
                }
                for i, r in enumerate(results[:10])
            ],
            "source": serp.get("source", "ddg"),
        }


async def discover_keyword_universe(
    domain: str,
    seed_keyword: str,
    max_keywords: int = 20,
) -> dict:
    """Discover the organic keyword universe for a competitor domain by
    probing their ranking pages through DDG and harvesting related queries.

    This provides the 'full keyword universe' capability — finding what a
    competitor organically ranks for without manual tracking.
    """
    domain = domain.lower().strip().lstrip("www.")
    from app.services.ddg_serp_client import DDGSerpClient

    ddg = DDGSerpClient()
    found_keywords = set()
    found_pages = []

    # 1. Probe the domain for the seed keyword — capture their ranking pages
    try:
        serp = await ddg.get_serp(seed_keyword)
        for r in (serp.get("all_results") or []):
            if domain in _host_of(r.get("url", "")):
                found_pages.append(r["url"])
    except Exception as e:
        logger.warning(f"Seed SERP probe failed for {domain}: {e}")

    # 2. Crawl up to N discovered pages for <title> and <h1> — these contain the
    # keywords the page targets/ranks for.
    import httpx
    from bs4 import BeautifulSoup

    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True,
                                 headers={"User-Agent": "Mozilla/5.0"}) as client:
        for url in found_pages[:6]:
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    title = soup.title.get_text(strip=True) if soup.title else ""
                    h1 = soup.find("h1")
                    h1_text = h1.get_text(strip=True) if h1 else ""
                    for text in [title, h1_text]:
                        clean = text.split(" | ")[0].split(" - ")[0].split(" – ")[0].strip()
                        if clean and 4 <= len(clean) <= 90 and clean.lower() != domain:
                            found_keywords.add(clean.lower())
                await asyncio.sleep(2)
            except Exception:
                continue

    # 3. Expand via DDG autocomplete-style related queries
    try:
        # lightweight related-query expansion using DDG suggestions endpoint
        for kw in list(found_keywords)[:5] + [seed_keyword]:
            related = await _ddg_suggest(kw)
            for r in related:
                if 3 <= len(r) <= 90:
                    found_keywords.add(r.lower())
            await asyncio.sleep(2)
    except Exception as e:
        logger.debug(f"Related-query expansion failed: {e}")

    keywords = sorted(kw for kw in found_keywords if seed_keyword.split()[0] in kw or kw == seed_keyword.lower())[:max_keywords]
    if not keywords and found_keywords:
        keywords = sorted(found_keywords)[:max_keywords]

    return {
        "domain": domain,
        "seed_keyword": seed_keyword,
        "keyword_count": len(keywords),
        "keywords": keywords,
        "found_pages": found_pages[:6],
        "source": "serp_probe",
        "note": "Keywords discovered by probing the competitor's ranking pages + related-query expansion. Uses real SERP data when Serper/OpenSerp API keys are configured.",
    }


async def _ddg_suggest(query: str) -> list[str]:
    """Fetch DDG autocomplete suggestions for a query (free)."""
    import urllib.parse
    import httpx
    try:
        url = "https://duckduckgo.com/ac/" + urllib.parse.quote(query)
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code == 200:
                return [item[0] for item in resp.json() if isinstance(item, list) and item]
    except Exception:
        pass
    return []
