import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

PAGESPEED_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"


class PageSpeedEngine:
    def __init__(self):
        self.api_key = settings.PAGESPEED_API_KEY
        self.available = bool(self.api_key)

    async def analyze(self, url: str, strategy: str = "mobile") -> dict:
        if not self.available:
            return self._empty_result(strategy)
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                params = {
                    "url": url,
                    "strategy": strategy,
                    "key": self.api_key,
                    "category": "PERFORMANCE,ACCESSIBILITY,BEST_PRACTICES,SEO",
                }
                resp = await client.get(PAGESPEED_API, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    return self._parse_result(data, strategy)
                logger.error(f"PageSpeed API error: {resp.status_code}")
                return self._empty_result(strategy)
        except Exception as e:
            logger.error(f"PageSpeed analysis failed: {e}")
            return self._empty_result(strategy)

    def _parse_result(self, data: dict, strategy: str) -> dict:
        lighthouse = data.get("lighthouseResult", {})
        categories = lighthouse.get("categories", {})
        audits = lighthouse.get("audits", {})

        scores = {}
        for cat_key, cat_data in categories.items():
            scores[cat_key] = round((cat_data.get("score", 0) or 0) * 100, 1)

        cwv = {}
        for metric_key in [
            "largest-contentful-paint", "interactive", "cumulative-layout-shift",
            "first-contentful-paint", "speed-index", "total-blocking-time",
        ]:
            audit = audits.get(metric_key, {})
            cwv[metric_key] = {
                "value": audit.get("displayValue", "N/A"),
                "score": round((audit.get("score", 0) or 0) * 100, 1),
                "numeric_value": audit.get("numericValue", 0),
            }

        opportunities = []
        for key, audit in audits.items():
            if (
                audit.get("score") is not None
                and audit["score"] < 0.9
                and audit.get("details", {}).get("type") == "opportunity"
            ):
                opportunities.append({
                    "id": key,
                    "title": audit.get("title", ""),
                    "description": audit.get("description", ""),
                    "savings": audit.get("displayValue", ""),
                    "score": round((audit.get("score", 0) or 0) * 100, 1),
                })

        diagnostics = []
        for key, audit in audits.items():
            if (
                audit.get("score") is not None
                and audit["score"] < 0.9
                and audit.get("details", {}).get("type") == "table"
            ):
                diagnostics.append({
                    "id": key,
                    "title": audit.get("title", ""),
                    "description": audit.get("description", ""),
                    "score": round((audit.get("score", 0) or 0) * 100, 1),
                })

        return {
            "strategy": strategy,
            "scores": scores,
            "core_web_vitals": cwv,
            "opportunities": opportunities[:10],
            "diagnostics": diagnostics[:10],
            "final_url": lighthouse.get("finalUrl", ""),
            "fetch_time": lighthouse.get("fetchTime", ""),
        }

    def _empty_result(self, strategy: str) -> dict:
        return {
            "strategy": strategy,
            "scores": {},
            "core_web_vitals": {},
            "opportunities": [],
            "diagnostics": [],
            "final_url": "",
            "fetch_time": "",
            "note": "PageSpeed API key not configured",
        }
