"""Self-hosted DuckDuckGo SERP scraper for competitor rank tracking.

Scrapes https://html.duckduckgo.com/html/?q=<keyword> to find a domain's
position in the results and return the top-3 URLs. No API key needed.

Caveats (stated honestly):
- DuckDuckGo rankings correlate with Google's but aren't identical.
- HTML scraping WILL occasionally break if DuckDuckGo changes markup —
  failures are logged loudly, never silently swallowed.
- Self-throttled: minimum 4s between requests, rotates User-Agent strings.
"""
import asyncio
import logging
import random
import re
import time
import urllib.parse
from typing import Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
]

# Minimum seconds between requests to avoid throttling
_MIN_DELAY = 4.0
_last_request_time: float = 0.0


def _host_of(url: str) -> str:
    """Extract bare domain from a URL."""
    try:
        parsed = urllib.parse.urlparse(url)
        return (parsed.hostname or "").lower().lstrip("www.")
    except Exception:
        return ""


async def _throttle():
    """Wait at least _MIN_DELAY seconds since the last request."""
    global _last_request_time
    elapsed = time.monotonic() - _last_request_time
    if elapsed < _MIN_DELAY:
        await asyncio.sleep(_MIN_DELAY - elapsed)
    _last_request_time = time.monotonic()


def _parse_ddg_results(html: str) -> list[dict]:
    """Parse DuckDuckGo HTML results page into a list of {url, title, snippet}."""
    soup = BeautifulSoup(html, "html.parser")
    results = []

    # DDG wraps each result in a div.result or div.results_links
    for result_div in soup.select("div.result, div.results_links, div.web-result"):
        link = result_div.select_one("a.result__a, a.result__url, a[href]")
        if not link:
            continue
        href = link.get("href", "")
        title = link.get_text(strip=True) or ""

        # DDG sometimes wraps URLs through a redirect — extract the actual URL
        if "uddg=" in href:
            match = re.search(r"uddg=([^&]+)", href)
            if match:
                href = urllib.parse.unquote(match.group(1))

        snippet_el = result_div.select_one("a.result__snippet, div.result__snippet")
        snippet = snippet_el.get_text(strip=True) if snippet_el else ""

        if href and href.startswith("http"):
            results.append({"url": href, "title": title, "snippet": snippet})

    return results


class DDGSerpClient:
    """Free, self-hosted DuckDuckGo SERP scraper for position tracking."""

    BASE_URL = "https://html.duckduckgo.com/html/"

    async def get_serp(self, keyword: str,
                       target_domain: Optional[str] = None) -> dict:
        """Scrape DuckDuckGo for *keyword* and return results.

        Returns:
            {
                "position": int|None,       # target_domain's position (1-indexed)
                "top_3_urls": [str, ...],   # first 3 result URLs
                "all_results": [{url, title, snippet}, ...],
                "serp_features": {...},     # always False — DDG doesn't expose these
            }

        If target_domain is None, position is None (used by content editor for
        top-3 URL fetching only).
        """
        await _throttle()

        params = {"q": keyword, "kl": "us-en"}
        headers = {"User-Agent": random.choice(_USER_AGENTS)}

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(self.BASE_URL, params=params, headers=headers)
                resp.raise_for_status()
        except httpx.TimeoutException:
            logger.warning(f"[DDG] Timeout for keyword '{keyword}'")
            return {"error": "DuckDuckGo request timed out", "position": None,
                    "top_3_urls": [], "all_results": []}
        except httpx.HTTPStatusError as e:
            logger.warning(f"[DDG] HTTP {e.response.status_code} for keyword '{keyword}'")
            return {"error": f"DuckDuckGo HTTP {e.response.status_code}",
                    "position": None, "top_3_urls": [], "all_results": []}
        except Exception as e:
            logger.warning(f"[DDG] Request failed for keyword '{keyword}': {e}")
            return {"error": str(e), "position": None, "top_3_urls": [],
                    "all_results": []}

        results = _parse_ddg_results(resp.text)

        if not results:
            logger.warning(f"[DDG] No results parsed for keyword '{keyword}' — "
                           "markup may have changed. Dumping first 500 chars of HTML.")
            logger.debug(f"[DDG] HTML snippet: {resp.text[:500]}")
            return {"error": "No results parsed (DDG markup may have changed)",
                    "position": None, "top_3_urls": [], "all_results": []}

        # Find target domain position
        position = None
        if target_domain:
            target = target_domain.lower().lstrip("www.")
            for i, r in enumerate(results):
                if target in _host_of(r["url"]):
                    position = i + 1  # 1-indexed
                    break

        top_3 = [r["url"] for r in results[:3]]

        return {
            "position": position,
            "top_3_urls": top_3,
            "all_results": results[:20],
            "serp_features": {
                "featured_snippet": False,
                "people_also_ask": False,
                "ai_overview": False,
            },
        }
