import json
import logging
from typing import Any
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def discover_competitors(domain: str, keyword: str | None = None) -> dict[str, Any]:
    serp_api_key = settings.SERP_API_KEY or ""
    if serp_api_key:
        try:
            return await _serpapi_discover(domain, keyword, serp_api_key)
        except Exception as e:
            logger.warning(f"SERP API discovery failed: {e}")

    try:
        return await _duckduckgo_discover(domain, keyword)
    except Exception as e:
        logger.warning(f"DuckDuckGo discovery failed: {e}")

    return {
        "competitors": [],
        "source": "not_available",
        "note": "No SERP API key configured. Set SERP_API_KEY env var to enable competitor discovery.",
        "status": "unavailable",
    }


async def _serpapi_discover(domain: str, keyword: str | None, api_key: str) -> dict[str, Any]:
    query = keyword or domain.split(".")[0]
    url = f"https://serpapi.com/search?engine=google&q={query}&api_key={api_key}&num=10"
    async with httpx.AsyncClient(timeout=httpx.Timeout(connect=5.0, read=10.0)) as client:
        resp = await client.get(url)
        data = resp.json()
    organic = data.get("organic_results", [])
    competitors = []
    for r in organic:
        link = r.get("link", "")
        if domain not in link:
            competitors.append({
                "url": link,
                "title": r.get("title", ""),
                "snippet": r.get("snippet", ""),
                "position": r.get("position", 0),
            })
    return {
        "competitors": competitors[:5],
        "source": "serpapi",
        "keyword_used": query,
        "status": "available",
    }


async def _duckduckgo_discover(domain: str, keyword: str | None) -> dict[str, Any]:
    query = keyword or domain.split(".")[0]
    url = f"https://html.duckduckgo.com/html/?q={query}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    async with httpx.AsyncClient(timeout=httpx.Timeout(connect=5.0, read=10.0)) as client:
        resp = await client.get(url, headers=headers)
    import re
    competitors = []
    for link in re.findall(r'uddg=(https?://[^&]+)', resp.text):
        from urllib.parse import unquote
        decoded = unquote(link)
        if domain not in decoded and decoded.startswith("http"):
            competitors.append({"url": decoded})
    return {
        "competitors": competitors[:5],
        "source": "duckduckgo",
        "keyword_used": query,
        "status": "available",
    }
