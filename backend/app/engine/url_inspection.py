"""URL Inspection — live indexing status via Google Search Console URL
Inspection API. Uses the same service-account GSC credentials as the rest of
the platform.

Not available when GSC service account is not configured; returns an honest
message in that case rather than fabricating a status.
"""
import logging

from app.config import settings

logger = logging.getLogger(__name__)


def _get_gsc_service(service_account_json: str = ""):
    """Build a searchconsole service from the configured service account.

    Accepts an optional per-user service-account JSON (the preferred, stored
    credential); falls back to the global env setting, then a local file.
    """
    import json
    import os
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    try:
        sa_json = service_account_json or settings.GSC_SERVICE_ACCOUNT_JSON or ""
        if sa_json:
            credentials = service_account.Credentials.from_service_account_info(
                json.loads(sa_json),
                scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
            )
        else:
            # Look for the default credentials file next to the engine
            from app.engine.gsc_engine import GSCEngine
            path = GSCEngine.SERVICE_ACCOUNT_FILE
            if not os.path.exists(path):
                return None
            credentials = service_account.Credentials.from_service_account_file(
                path,
                scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
            )
        return build("searchconsole", "v1", credentials=credentials)
    except Exception as e:
        logger.warning(f"URL Inspection: GSC service init failed: {e}")
        return None


def url_inspection_lookup(property_url: str, url_to_inspect: str, service_account_json: str = "") -> dict:
    """Run a live URL Inspection for a single URL against GSC.

    Returns indexing status (e.g. 'INDEXED', 'NOT_FOUND', 'NEEDS_ATTENTION')
    plus coverage-level detail when available.
    """
    service = _get_gsc_service(service_account_json)
    if not service:
        return {
            "status": "UNAVAILABLE",
            "note": "GSC service account is not configured. Connect a service account in Settings to run live indexing checks.",
        }

    try:
        body = {
            "inspectionUrl": url_to_inspect,
            "siteUrl": property_url,
            "inspectionType": "URL_INSPECTION",
        }
        response = (
            service.urlInspection()
            .index()
            .inspect(body=body)
            .execute()
        )

        result = response.get("inspectionResult", {})
        indexing = result.get("indexStatusResult", {})
        verdict = indexing.get("verdict", "UNKNOWN")
        coverage_state = indexing.get("coverageState", "")

        return {
            "url": url_to_inspect,
            "status": verdict,  # e.g. INDEXED / EXCLUDED / NOT_FOUND
            "coverage_state": coverage_state,
            "page_fetch_state": result.get("pageFetchState", ""),
            "indexing_state": indexing.get("indexingState", ""),
            "last_crawl_time": indexing.get("lastCrawlTime", ""),
            "crawled_as": indexing.get("crawledAs", ""),
            "robots_txt_state": indexing.get("robotsTxtState", ""),
            "google_canonical": result.get("googleCanonical", ""),
            "user_canonical": result.get("userCanonical", ""),
            "source": "gsc_url_inspection",
            "note": "Live data from Google Search Console URL Inspection API.",
        }
    except Exception as e:
        logger.warning(f"URL Inspection failed for {url_to_inspect}: {e}")
        return {
            "url": url_to_inspect,
            "status": "ERROR",
            "note": f"URL Inspection API call failed: {e}",
            "source": "gsc_url_inspection",
        }
