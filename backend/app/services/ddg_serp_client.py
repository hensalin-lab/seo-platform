"""Multi-source SERP client — tries premium free APIs first (Serper, OpenSerp),
falls back to DuckDuckGo HTML scraper. All sources are free.

Priority order:
1. Serper (serper.dev) — real Google SERP, fast, 2500 free queries
2. OpenSerp (openserp.com) — free Google SERP alternative
3. DuckDuckGo HTML scraper — unlimited, self-hosted fallback

Caveats (stated honestly):
- Serper/OpenSerp return real Google rankings — most accurate
- DDG rankings correlate with Google's but aren't identical
- HTML scraping WILL occasionally break if DDG changes markup
- Self-throttled: minimum 4s between DDG requests, rotates User-Agent strings
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
    """Multi-source SERP client: Serper → OpenSerp → DuckDuckGo fallback."""

    BASE_URL = "https://html.duckduckgo.com/html/"

    async def _try_serper(self, keyword: str, target_domain: str | None = None) -> dict | None:
        """Try Serper API (real Google SERP, free 2500 queries)."""
        from app.config import settings
        api_key = getattr(settings, "SERPER_API_KEY", "") or ""
        if not api_key:
            return None
        headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
        payload = {"q": keyword, "num": 100, "gl": "us", "hl": "en"}
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.post("https://google.serper.dev/search", json=payload, headers=headers)
                if resp.status_code != 200:
                    logger.debug(f"[Serper] HTTP {resp.status_code}")
                    return None
                data = resp.json()
        except Exception as e:
            logger.debug(f"[Serper] Failed: {e}")
            return None

        results = []
        for item in data.get("organic") or []:
            results.append({
                "url": item.get("link", ""),
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
            })
        if not results:
            return None

        position = None
        if target_domain:
            target = target_domain.lower().lstrip("www.")
            for i, r in enumerate(results):
                if target in _host_of(r["url"]):
                    position = i + 1
                    break

        return {
            "position": position,
            "top_3_urls": [r["url"] for r in results[:3]],
            "all_results": results[:20],
            "serp_features": {
                "featured_snippet": bool(data.get("knowledgeGraph")),
                "people_also_ask": bool(data.get("relatedSearches")),
                "ai_overview": False,
            },
            "source": "serper",
        }

    async def _try_openserp(self, keyword: str, target_domain: str | None = None) -> dict | None:
        """Try OpenSerp API (free Google SERP alternative)."""
        from app.config import settings
        api_key = getattr(settings, "OPEN_SERP_API_KEY", "") or ""
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        params = {"q": keyword, "gl": "us", "hl": "en", "num": 100}
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get("https://api.openserp.com/api/v1/search", params=params, headers=headers)
                if resp.status_code != 200:
                    logger.debug(f"[OpenSerp] HTTP {resp.status_code}")
                    return None
                data = resp.json()
        except Exception as e:
            logger.debug(f"[OpenSerp] Failed: {e}")
            return None

        results = []
        for item in data.get("results") or data.get("organic") or []:
            results.append({
                "url": item.get("url") or item.get("link", ""),
                "title": item.get("title", ""),
                "snippet": item.get("snippet") or item.get("description", ""),
            })
        if not results:
            return None

        position = None
        if target_domain:
            target = target_domain.lower().lstrip("www.")
            for i, r in enumerate(results):
                if target in _host_of(r["url"]):
                    position = i + 1
                    break

        return {
            "position": position,
            "top_3_urls": [r["url"] for r in results[:3]],
            "all_results": results[:20],
            "serp_features": {
                "featured_snippet": False,
                "people_also_ask": False,
                "ai_overview": False,
            },
            "source": "openserp",
        }

    async def _try_ddg(self, keyword: str, target_domain: str | None = None) -> dict:
        """DuckDuckGo HTML scraper fallback (unlimited, self-hosted)."""
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

        position = None
        if target_domain:
            target = target_domain.lower().lstrip("www.")
            for i, r in enumerate(results):
                if target in _host_of(r["url"]):
                    position = i + 1
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
            "source": "ddg",
        }

    async def get_serp(self, keyword: str,
                       target_domain: Optional[str] = None) -> dict:
        """Get SERP results with automatic fallback: Serper → OpenSerp → DDG.

        Returns the same shape regardless of source:
            {
                "position": int|None,
                "top_3_urls": [str, ...],
                "all_results": [{url, title, snippet}, ...],
                "serp_features": {...},
                "source": "serper"|"openserp"|"ddg",
            }
        """
        # Try Serper first (real Google, fast)
        result = await self._try_serper(keyword, target_domain)
        if result and not result.get("error"):
            return result

        # Try OpenSerp second (free alternative)
        result = await self._try_openserp(keyword, target_domain)
        if result and not result.get("error"):
            return result

        # Fallback to DDG (unlimited, self-hosted)
        return await self._try_ddg(keyword, target_domain)
