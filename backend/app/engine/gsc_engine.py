"""Google Search Console integration engine."""
import json
import os
import datetime as _dt
from typing import Optional


class GSCEngine:
    """Fetch real search performance data from Google Search Console API."""

    SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
    SERVICE_ACCOUNT_FILE = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "credentials",
        "gsc_service_account.json",
    )

    def __init__(self):
        self._service = None
        self._available = os.path.exists(self.SERVICE_ACCOUNT_FILE)

    @property
    def available(self) -> bool:
        return self._available

    def _get_service(self):
        if self._service is not None:
            return self._service
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

            credentials = service_account.Credentials.from_service_account_file(
                self.SERVICE_ACCOUNT_FILE, scopes=self.SCOPES
            )
            self._service = build("searchconsole", "v1", credentials=credentials)
            return self._service
        except Exception as e:
            print(f"[GSC] Failed to initialize: {e}")
            self._available = False
            return None

    def get_search_analytics(
        self,
        property_url: str,
        days: int = 28,
        row_limit: int = 250,
    ) -> dict:
        """Get search analytics for the property."""
        service = self._get_service()
        if not service:
            return {"error": "GSC service not available", "rows": []}

        try:
            end_date = _dt.date.today()
            start_date = end_date - _dt.timedelta(days=days)

            body = {
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
                "dimensions": ["page", "query"],
                "rowLimit": row_limit,
                "dataState": "final",
            }

            response = (
                service.searchanalytics()
                .query(siteUrl=property_url, body=body)
                .execute()
            )

            rows = response.get("rows", [])
            result = []
            for row in rows:
                keys = row.get("keys", [])
                result.append({
                    "page": keys[0] if len(keys) > 0 else "",
                    "query": keys[1] if len(keys) > 1 else "",
                    "clicks": row.get("clicks", 0),
                    "impressions": row.get("impressions", 0),
                    "ctr": round(row.get("ctr", 0) * 100, 2),
                    "position": round(row.get("position", 0), 1),
                })

            return {
                "property": property_url,
                "period": f"{start_date.isoformat()} to {end_date.isoformat()}",
                "total_clicks": sum(r["clicks"] for r in result),
                "total_impressions": sum(r["impressions"] for r in result),
                "avg_ctr": round(
                    sum(r["ctr"] for r in result) / max(len(result), 1), 2
                ),
                "avg_position": round(
                    sum(r["position"] for r in result) / max(len(result), 1), 1
                ),
                "rows": result,
            }

        except Exception as e:
            return {"error": str(e), "rows": []}

    def get_page_performance(
        self, property_url: str, days: int = 28
    ) -> list:
        """Get per-page performance data."""
        service = self._get_service()
        if not service:
            return []

        try:
            end_date = _dt.date.today()
            start_date = end_date - _dt.timedelta(days=days)

            body = {
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
                "dimensions": ["page"],
                "rowLimit": 500,
                "dataState": "final",
            }

            response = (
                service.searchanalytics()
                .query(siteUrl=property_url, body=body)
                .execute()
            )

            rows = response.get("rows", [])
            result = []
            for row in rows:
                keys = row.get("keys", [])
                result.append({
                    "page": keys[0] if keys else "",
                    "clicks": row.get("clicks", 0),
                    "impressions": row.get("impressions", 0),
                    "ctr": round(row.get("ctr", 0) * 100, 2),
                    "position": round(row.get("position", 0), 1),
                })

            return sorted(result, key=lambda x: x["clicks"], reverse=True)

        except Exception as e:
            print(f"[GSC] Page performance error: {e}")
            return []

    def get_top_queries(
        self, property_url: str, days: int = 28, limit: int = 50
    ) -> list:
        """Get top search queries."""
        service = self._get_service()
        if not service:
            return []

        try:
            end_date = _dt.date.today()
            start_date = end_date - _dt.timedelta(days=days)

            body = {
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
                "dimensions": ["query"],
                "rowLimit": limit,
                "dataState": "final",
            }

            response = (
                service.searchanalytics()
                .query(siteUrl=property_url, body=body)
                .execute()
            )

            rows = response.get("rows", [])
            result = []
            for row in rows:
                keys = row.get("keys", [])
                result.append({
                    "query": keys[0] if keys else "",
                    "clicks": row.get("clicks", 0),
                    "impressions": row.get("impressions", 0),
                    "ctr": round(row.get("ctr", 0) * 100, 2),
                    "position": round(row.get("position", 0), 1),
                })

            return sorted(result, key=lambda x: x["clicks"], reverse=True)

        except Exception as e:
            print(f"[GSC] Top queries error: {e}")
            return []

    def get_long_tail_keywords(
        self, property_url: str, days: int = 28, min_words: int = 3
    ) -> list:
        """Get long-tail keywords (3+ words) with performance data."""
        all_queries = self.get_top_queries(property_url, days, limit=500)
        long_tail = [q for q in all_queries if len(q["query"].split()) >= min_words]
        return long_tail[:100]
