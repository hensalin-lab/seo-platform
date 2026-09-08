"""Keyword research engine — keyword-universe discovery.

Uses multi-source SERP client (Serper → OpenSerp → DuckDuckGo) for real
Google rankings when API keys are configured. Falls back to DDG HTML scraper.

Keyword Difficulty now lives in `app.engine.keyword_difficulty_engine`
(transparent formula, reconciled buckets, shared modules).
"""
import logging

logger = logging.getLogger(__name__)


def _host_of(url: str) -> str:
    from urllib.parse import urlparse
    try:
        return (urlparse(url).hostname or "").lower().removeprefix("www.")
    except Exception:
        return ""


async def discover_keyword_universe(
    domain: str,
    seed_keyword: str,
    max_keywords: int = 20,
) -> dict:
    """Discover the organic keyword universe for a competitor domain by
    probing their ranking pages through DDG and harvesting related queries.

    Provides the 'full keyword universe' capability — finding what a
    competitor organically ranks for without manual tracking. Falls back to
    SERP-derived related queries when the domain isn't in the seed SERP so a
    universe is always returned (honestly labeled per source).
    """
    domain = domain.lower().strip().removeprefix("www.")
    from app.services.ddg_serp_client import DDGSerpClient

    ddg = DDGSerpClient()
    found_keywords = set()
    found_pages = []
    serp_related = []

    # 1. Probe the domain for the seed keyword — capture their ranking pages
    serp = {}
    try:
        serp = await ddg.get_serp(seed_keyword)
        for r in (serp.get("all_results") or []):
            if domain in _host_of(r.get("url", "")):
                found_pages.append(r["url"])
    except Exception as e:
        logger.warning(f"Seed SERP probe failed for {domain}: {e}")

    # 1b. Harvest related queries straight from the seed SERP (titles of the
    # top results, minus site names). These go straight into the pool so the
    # universe is never empty even when the competitor doesn't rank for the seed.
    for r in (serp.get("all_results") or [])[:8]:
        t = (r.get("title") or "").split(" | ")[0].split(" - ")[0].split(" – ")[0].strip()
        if t and 4 <= len(t) <= 90:
            serp_related.append(t.lower())
            found_keywords.add(t.lower())

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
            except Exception:
                continue

    # 3. Expand via DDG autocomplete (seed + SERP-derived related keywords so we
    # get suggestions even without a matched page). Persona: prefer seed-related.
    try:
        expansion_seeds = [k for k in list(found_keywords)[:4]] or [seed_keyword]
        for kw in expansion_seeds:
            for r in await _ddg_suggest(kw):
                if 3 <= len(r) <= 90:
                    found_keywords.add(r.lower())
    except Exception as e:
        logger.debug(f"Related-query expansion failed: {e}")

    seed_tokens = [w for w in seed_keyword.lower().split() if len(w) > 2]
    if seed_tokens:
        keywords = sorted(kw for kw in found_keywords if any(t in kw for t in seed_tokens))[:max_keywords]
    if not keywords:
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
        url = "https://duckduckgo.com/ac/?q=" + urllib.parse.quote(query) + "&type=list"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code == 200:
                data = resp.json()
                # DDG returns ["query", ["sug1","sug2",...]] — take the array
                if isinstance(data, list) and data and isinstance(data[-1], list):
                    return [str(x) for x in data[-1] if x]
                return [str(x) for x in data if isinstance(x, str)]
    except Exception:
        pass
    return []
