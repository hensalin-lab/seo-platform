import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

GA4_DATA_API = "https://analyticsdata.googleapis.com/v1beta"


class GA4Engine:
    def __init__(self):
        self.api_key = settings.PAGESPEED_API_KEY
        self.available = bool(self.api_key)

    async def get_organic_traffic(self, property_id: str, days: int = 28) -> dict:
        if not self.available or not property_id:
            return self._empty_result(property_id, days)
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                body = {
                    "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
                    "dimensions": [{"name": "date"}],
                    "metrics": [
                        {"name": "sessions"},
                        {"name": "totalUsers"},
                        {"name": "screenPageViews"},
                        {"name": "averageSessionDuration"},
                    ],
                    "dimensionFilter": {
                        "filter": {
                            "fieldName": "sessionDefaultChannelGroup",
                            "stringFilter": {"matchType": "EXACT", "value": "Organic Search"},
                        }
                    },
                }
                resp = await client.post(
                    f"{GA4_DATA_API}/properties/{property_id}:runReport",
                    json=body,
                    params={"key": self.api_key},
                )
                if resp.status_code == 200:
                    return self._parse_report(resp.json(), property_id, days)
                logger.error(f"GA4 API error: {resp.status_code}")
                return self._empty_result(property_id, days)
        except Exception as e:
            logger.error(f"GA4 analysis failed: {e}")
            return self._empty_result(property_id, days)

    async def get_top_pages(self, property_id: str, days: int = 28) -> dict:
        if not self.available or not property_id:
            return {"pages": []}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                body = {
                    "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
                    "dimensions": [{"name": "pagePath"}],
                    "metrics": [
                        {"name": "screenPageViews"},
                        {"name": "totalUsers"},
                        {"name": "averageSessionDuration"},
                    ],
                    "dimensionFilter": {
                        "filter": {
                            "fieldName": "sessionDefaultChannelGroup",
                            "stringFilter": {"matchType": "EXACT", "value": "Organic Search"},
                        }
                    },
                    "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
                    "limit": 50,
                }
                resp = await client.post(
                    f"{GA4_DATA_API}/properties/{property_id}:runReport",
                    json=body,
                    params={"key": self.api_key},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    pages = []
                    for row in data.get("rows", []):
                        dims = row.get("dimensionValues", [])
                        metrics = row.get("metricValues", [])
                        pages.append({
                            "page": dims[0].get("value", ""),
                            "views": int(metrics[0].get("value", 0)) if metrics else 0,
                            "users": int(metrics[1].get("value", 0)) if len(metrics) > 1 else 0,
                            "avg_duration": float(metrics[2].get("value", 0)) if len(metrics) > 2 else 0,
                        })
                    return {"pages": pages}
                return {"pages": []}
        except Exception as e:
            logger.error(f"GA4 top pages failed: {e}")
            return {"pages": []}

    async def get_keywords(self, property_id: str, days: int = 28) -> dict:
        if not self.available or not property_id:
            return {"keywords": []}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                body = {
                    "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
                    "dimensions": [{"name": "sessionSource"}, {"name": "sessionMedium"}],
                    "metrics": [
                        {"name": "sessions"},
                        {"name": "totalUsers"},
                    ],
                    "dimensionFilter": {
                        "filter": {
                            "fieldName": "sessionDefaultChannelGroup",
                            "stringFilter": {"matchType": "EXACT", "value": "Organic Search"},
                        }
                    },
                    "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
                    "limit": 50,
                }
                resp = await client.post(
                    f"{GA4_DATA_API}/properties/{property_id}:runReport",
                    json=body,
                    params={"key": self.api_key},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    keywords = []
                    for row in data.get("rows", []):
                        dims = row.get("dimensionValues", [])
                        metrics = row.get("metricValues", [])
                        keywords.append({
                            "source": dims[0].get("value", ""),
                            "medium": dims[1].get("value", "") if len(dims) > 1 else "",
                            "sessions": int(metrics[0].get("value", 0)) if metrics else 0,
                            "users": int(metrics[1].get("value", 0)) if len(metrics) > 1 else 0,
                        })
                    return {"keywords": keywords}
                return {"keywords": []}
        except Exception as e:
            logger.error(f"GA4 keywords failed: {e}")
            return {"keywords": []}

    def _parse_report(self, data: dict, property_id: str, days: int) -> dict:
        rows = data.get("rows", [])
        total_sessions = 0
        total_users = 0
        total_views = 0
        total_duration = 0
        count = 0

        for row in rows:
            metrics = row.get("metricValues", [])
            if len(metrics) >= 4:
                total_sessions += int(metrics[0].get("value", 0))
                total_users += int(metrics[1].get("value", 0))
                total_views += int(metrics[2].get("value", 0))
                total_duration += float(metrics[3].get("value", 0))
                count += 1

        return {
            "property_id": property_id,
            "period_days": days,
            "total_sessions": total_sessions,
            "total_users": total_users,
            "total_pageviews": total_views,
            "avg_session_duration": round(total_duration / max(count, 1), 1),
            "daily_data": [
                {
                    "date": row.get("dimensionValues", [{}])[0].get("value", ""),
                    "sessions": int(row.get("metricValues", [{}])[0].get("value", 0)),
                    "users": int(row.get("metricValues", [{}])[1].get("value", 0)) if len(row.get("metricValues", [])) > 1 else 0,
                }
                for row in rows
            ],
        }

    def _empty_result(self, property_id: str, days: int) -> dict:
        return {
            "property_id": property_id or "",
            "period_days": days,
            "total_sessions": 0,
            "total_users": 0,
            "total_pageviews": 0,
            "avg_session_duration": 0,
            "daily_data": [],
            "note": "GA4 API key not configured",
        }
