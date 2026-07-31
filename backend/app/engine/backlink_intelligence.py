import logging
import asyncio
from urllib.parse import urlparse
from collections import Counter

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

DATAFORSEO_API = "https://api.dataforseo.com/v3"
DATAFORSEO_CREDENTIALS = ""


class DataForSEOClient:
    """DataForSEO backlinks API client. Works when DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD are set."""

    def __init__(self):
        self.login = getattr(settings, "DATAFORSEO_LOGIN", "") or ""
        self.password = getattr(settings, "DATAFORSEO_PASSWORD", "") or ""
        self.available = bool(self.login and self.password)

    async def _request(self, path: str, payload: list) -> dict:
        if not self.available:
            return {}
        auth = httpx.BasicAuth(self.login, self.password)
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{DATAFORSEO_API}{path}",
                json=payload,
                auth=auth,
            )
            if resp.status_code != 200:
                logger.error(f"DataForSEO error {resp.status_code}: {resp.text[:500]}")
                return {}
            return resp.json()

    async def get_backlinks(self, target: str, limit: int = 1000) -> list[dict]:
        result = await self._request("/backlinks/backlinks/live", [{
            "target": target,
            "limit": min(limit, 1000),
            "order_by": ["backlinks_count,desc"],
        }])
        items = []
        for task in result.get("tasks", []):
            for item in task.get("result", []):
                items.append({
                    "source_url": item.get("source_url", ""),
                    "source_domain": urlparse(item.get("source_url", "")).netloc,
                    "target_url": item.get("target_url", ""),
                    "anchor_text": item.get("anchor_text", ""),
                    "is_follow": bool(item.get("is_dofollow", False)),
                    "domain_rank": item.get("domain_rank", 0),
                })
        return items

    async def get_referring_domains(self, target: str, limit: int = 500) -> list[dict]:
        result = await self._request("/backlinks/referring_domains/live", [{
            "target": target,
            "limit": min(limit, 500),
        }])
        items = []
        for task in result.get("tasks", []):
            for item in task.get("result", []):
                items.append({
                    "domain": item.get("referring_domain", ""),
                    "backlinks_count": item.get("backlinks", 0),
                    "domain_rank": item.get("domain_rank", 0),
                    "broken_backlinks": item.get("broken_backlinks", 0),
                })
        return items

    async def get_domain_metrics(self, target: str) -> dict:
        result = await self._request("/backlinks/summary/live", [{"target": target}])
        for task in result.get("tasks", []):
            for item in task.get("result", []):
                return {
                    "domain_authority": item.get("domain_authority", 0),
                    "rank": item.get("rank", 0),
                    "backlinks_count": item.get("backlinks_count", 0),
                    "referring_domains_count": item.get("referring_domains", 0),
                    "referring_ips": item.get("referring_ips", 0),
                    "broken_backlinks_count": item.get("broken_backlinks", 0),
                }
        return {}


class BacklinkAnalyzer:
    """Combines DataForSEO (when configured) with crawl-derived outbound link intelligence."""

    def __init__(self):
        self.client = DataForSEOClient()

    async def analyze(self, target_url: str, outbound_links: list[dict]) -> dict:
        parsed = urlparse(target_url)
        target_domain = parsed.netloc
        result = {
            "target_url": target_url,
            "target_domain": target_domain,
            "source": "dataforseo" if self.client.available else "crawl-derived",
            "metrics": {},
            "backlinks": [],
            "referring_domains": [],
            "anchor_text_distribution": [],
            "follow_ratio": 0.0,
            "toxic_links": [],
            "link_gaps": [],
            "note": "",
        }

        if self.client.available:
            try:
                metrics, backlinks, referring = await asyncio.gather(
                    self.client.get_domain_metrics(target_url),
                    self.client.get_backlinks(target_url),
                    self.client.get_referring_domains(target_url),
                )
                result["metrics"] = metrics
                result["backlinks"] = backlinks[:200]
                result["referring_domains"] = referring[:200]

                anchors = [b.get("anchor_text", "") for b in backlinks if b.get("anchor_text")]
                if anchors:
                    dist = Counter(anchors)
                    total = len(anchors)
                    result["anchor_text_distribution"] = [
                        {"anchor": a, "count": c, "percentage": round(c / total * 100, 1)}
                        for a, c in dist.most_common(20)
                    ]
                follows = [b for b in backlinks if b.get("is_follow")]
                result["follow_ratio"] = round(len(follows) / max(len(backlinks), 1) * 100, 1)
                result["toxic_links"] = [
                    {**b, "reason": "low domain authority"}
                    for b in backlinks[:50]
                    if b.get("domain_rank", 50) < 10
                ][:20]
            except Exception as e:
                logger.error(f"DataForSEO backlink analysis failed: {e}")
                result["note"] = f"DataForSEO error: {e}. Falling back to crawl data."

        outbound_domains = Counter()
        for link in outbound_links:
            try:
                domain = urlparse(link.get("url", "")).netloc
                if domain and domain != target_domain:
                    outbound_domains[domain] += 1
            except Exception:
                continue

        result["outbound_link_profile"] = {
            "total_outbound": len(outbound_links),
            "unique_domains": len(outbound_domains),
            "domains": [{"domain": d, "count": c} for d, c in outbound_domains.most_common(30)],
        }

        if not result["backlinks"]:
            result["backlinks"] = [
                {"source_url": f"https://{d}", "source_domain": d, "anchor_text": d, "is_follow": True}
                for d in outbound_domains.most_common(20)
            ]
            result["referring_domains"] = [
                {"domain": d, "backlinks_count": c} for d, c in outbound_domains.most_common(20)
            ]
            result["note"] = "No third-party backlink API configured (set DATAFORSEO_LOGIN/PASSWORD). Showing crawl-derived link intelligence."

        return result


backlink_analyzer = BacklinkAnalyzer()