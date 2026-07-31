import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

PAGESPEED_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
CRUX_API = "https://chromeuxreport.googleapis.com/v1/records:queryRecord"

CWV_THRESHOLDS = {
    "largest-contentful-paint": {"good": 2500, "poor": 4000, "label": "LCP"},
    "cumulative-layout-shift": {"good": 0.1, "poor": 0.25, "label": "CLS"},
    "interaction_to_next_paint": {"good": 200, "poor": 500, "label": "INP"},
    "first-contentful-paint": {"good": 1800, "poor": 3000, "label": "FCP"},
    "time_to_first_byte": {"good": 800, "poor": 1800, "label": "TTFB"},
}


class PageSpeedEngine:
    def __init__(self):
        self.api_key = settings.PAGESPEED_API_KEY
        self.available = bool(self.api_key)

    def _cwv_status(self, metric_key: str, value: float) -> str:
        thresholds = CWV_THRESHOLDS.get(metric_key)
        if not thresholds or value is None:
            return "unknown"
        if value <= thresholds["good"]:
            return "good"
        if value < thresholds["poor"]:
            return "needs_improvement"
        return "poor"

    async def analyze(self, url: str, strategy: str = "mobile") -> dict:
        if not self.available:
            return self._empty_result(strategy)
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                params = {
                    "url": url,
                    "strategy": strategy,
                    "key": self.api_key,
                    "category": "PERFORMANCE,ACCESSIBILITY,BEST_PRACTICES,SEO",
                }
                resp = await client.get(PAGESPEED_API, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    lab_result = self._parse_result(data, strategy)
                    field_result = await self._fetch_crux(client, url)
                    lab_result["field_data"] = field_result
                    lab_result["core_web_vitals"]["_assessment"] = self._assess_cwv(lab_result["core_web_vitals"], field_result)
                    lab_result["performance_score"] = self._compute_performance_score(lab_result, field_result)
                    return lab_result
                logger.error(f"PageSpeed API error: {resp.status_code}")
                return self._empty_result(strategy)
        except Exception as e:
            logger.error(f"PageSpeed analysis failed: {e}")
            return self._empty_result(strategy)

    async def _fetch_crux(self, client: httpx.AsyncClient, url: str) -> dict:
        try:
            payload = {
                "url": url,
                "formFactor": "PHONE" if True else "DESKTOP",
                "metrics": [
                    "largest_contentful_paint", "cumulative_layout_shift",
                    "interaction_to_next_paint", "first_contentful_paint",
                    "time_to_first_byte", "experimental_time_to_first_byte",
                ],
            }
            resp = await client.post(CRUX_API, json=payload, params={"key": self.api_key}, timeout=30)
            if resp.status_code != 200:
                return {"_source": "crux", "_available": False, "_note": f"CrUX API returned {resp.status_code}"}
            data = resp.json()
            record = data.get("record", {})
            metrics = record.get("metrics", {})
            result = {"_source": "crux", "_available": True}
            for key, m in metrics.items():
                percentiles = m.get("percentiles", {})
                histogram = m.get("histogram", [])
                result[key] = {
                    "p75": percentiles.get("p75"),
                    "histogram": histogram,
                }
            return result
        except Exception as e:
            logger.warning(f"CrUX fetch failed: {e}")
            return {"_source": "crux", "_available": False, "_note": str(e)}

    def _assess_cwv(self, lab_metrics: dict, field_data: dict) -> dict:
        assessment = {}
        for key, label in [
            ("largest-contentful-paint", "LCP"),
            ("cumulative-layout-shift", "CLS"),
            ("interaction-to-next-paint", "INP"),
        ]:
            value = None
            source = "unknown"
            if field_data and field_data.get("_available") and field_data.get(key):
                value = field_data[key].get("p75")
                source = "field"
            elif lab_metrics.get(key):
                value = lab_metrics[key].get("numeric_value")
                source = "lab"
            if value is not None:
                thresholds = CWV_THRESHOLDS.get(key)
                if value <= thresholds["good"]:
                    status = "good"
                elif value < thresholds["poor"]:
                    status = "needs_improvement"
                else:
                    status = "poor"
                assessment[key] = {"label": label, "value": value, "status": status, "source": source}
        passed = sum(1 for v in assessment.values() if v["status"] == "good")
        assessment["_summary"] = {
            "passed": passed,
            "total": len(assessment),
            "passed_cwv": passed == 3 and len(assessment) == 3,
        }
        return assessment

    def _compute_performance_score(self, lab_result: dict, field_data: dict) -> int:
        score = 0
        counts = 0
        if field_data and field_data.get("_available"):
            for key in CWV_THRESHOLDS:
                if field_data.get(key):
                    value = field_data[key].get("p75")
                    if value is not None:
                        status = self._cwv_status(key, value)
                        score += {"good": 100, "needs_improvement": 50, "poor": 10}.get(status, 0)
                        counts += 1
        if counts == 0:
            perf = lab_result.get("scores", {}).get("performance")
            if perf is not None:
                return int(perf)
            return 0
        return int(score / counts)

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
            "interaction-to-next-paint", "time-to-first-byte",
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
            "field_data": {"_source": "crux", "_available": False, "_note": "CrUX requires a Google API key"},
            "performance_score": 0,
            "note": "PageSpeed API key not configured",
        }
