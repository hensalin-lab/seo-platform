"""DataForSEO SERP API client for competitor rank tracking and live content
editor benchmarking (see https://dataforseo.com/apis/serp-api).

Returns real SERP positions, SERP feature flags (featured snippet / PAA / AI
Overview), and the current top-N result URLs for a query. Used only for
domains that are NOT the user's own (own domains use GSC, which is free).
"""
import base64
import json
import time
from typing import Optional

import httpx

from app.config import settings


class DataForSEOClient:
    """Thin, low-cost DataForSEO SERP client (live/dataforseo-labs/ranked_serp)."""

    BASE = "https://api.dataforseo.com/v3"
    LOGIN = settings.DATAFORSEO_LOGIN
    PASSWORD = settings.DATAFORSEO_PASSWORD
    DEFAULT_LOCATION = "2840"  # United States
    DEFAULT_LANGUAGE = "en"

    def __init__(self, login: str = "", password: str = ""):
        self.login = login or self.LOGIN
        self.password = password or self.PASSWORD
        self._auth = base64.b64encode(
            f"{self.login}:{self.password}".encode("utf-8")
        ).decode("utf-8")
        self._client = httpx.AsyncClient(
            base_url=self.BASE,
            headers={
                "Authorization": f"Basic {self._auth}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    @property
    def available(self) -> bool:
        return bool(self.login and self.password)

    async def aclose(self):
        await self._client.aclose()

    async def get_serp(self, keyword: str, location: str = DEFAULT_LOCATION,
                       language: str = DEFAULT_LANGUAGE) -> dict:
        """Query the live SERP via DataForSEO's ranked_serp endpoint.

        Returns:
            {"position": int|None, "serp_features": {...}, "top_3_urls": [...]}
        """
        if not self.available:
            return {"error": "DataForSEO credentials not configured", "rows": []}

        payload = [{
            "keyword": keyword,
            "location_code": int(location) if str(location).isdigit()
            else self.DEFAULT_LOCATION,
            "language_code": language or self.DEFAULT_LANGUAGE,
            "depth": 10,
        }]

        resp = await self._client.post("/serp/google/organic/live/regular", json=payload)
        data = resp.json()

        if resp.status_code != 200 or not data.get("tasks"):
            return {"error": data.get("status_message", "DataForSEO request failed"),
                    "rows": []}

        task = data["tasks"][0]
        if task.get("status_code") != 20000:
            return {"error": task.get("status_message", "DataForSEO task failed"),
                    "rows": []}

        items = []
        for result in task.get("result", []):
            items.extend(result.get("items", []))

        organic = [it for it in items if it.get("type") == "organic"]
        top_3_urls = []
        position = None
        for it in organic:
            pos = it.get("rank_absolute") or it.get("rank_group")
            if position is None and pos:
                position = pos
            if it.get("url") and len(top_3_urls) < 3:
                top_3_urls.append(it["url"])

        serp_features = {
            "featured_snippet": any(
                it.get("type") == "featured_snippet" for it in items
            ),
            "people_also_ask": any(
                it.get("type") == "people_also_ask" for it in items
            ),
            "ai_overview": any(
                "ai" in (it.get("type") or "").lower() or "overview" in (it.get("type") or "").lower()
                for it in items
            ),
        }

        return {
            "position": position,
            "serp_features": serp_features,
            "top_3_urls": top_3_urls,
        }