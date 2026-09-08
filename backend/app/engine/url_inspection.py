"""URL Inspection — live indexing status via Google Search Console URL
Inspection API, with a free self-hosted fallback that works even when no GSC
service account is configured.

Flow:
  1. If a GSC service account is available → authoritative Google verdict.
  2. Otherwise → live probe of the URL (status, robots.txt, sitemap, canonical,
     X-Robots-Tag / meta robots) and an honest heuricted indexability verdict.

The free probe is labelled as such (source: "free_probe") so users know it's
not Google's official coverage data.
"""
import logging
import re
import urllib.parse

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


def _probe_url(url_to_inspect: str) -> dict:
    """Free live-probe fallback: HTTP status, robots, sitemap, canonical,
    X-Robots-Tag and meta-robots for a single URL."""
    import socket
    import ssl
    import urllib.request

    def _fetch(url: str, timeout: float = 8.0, max_bytes: int = 200_000):
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        })
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
            body = r.read(max_bytes)
            return r.status, dict(r.getheaders()), r.geturl(), body

    parsed = urllib.parse.urlparse(url_to_inspect if "://" in url_to_inspect else "https://" + url_to_inspect)
    host = (parsed.hostname or "").lower()
    scheme = parsed.scheme or "https"
    path = parsed.path or "/"

    if not host:
        return {"status": "ERROR", "note": "Invalid URL — no host found.", "source": "free_probe"}

    result = {
        "url": url_to_inspect,
        "host": host,
        "path": path,
        "source": "free_probe",
    }

    # 1) robots.txt
    robots_text = None
    robots_blocked = None
    sitemap_refs = []
    try:
        st, headers, _, body = _fetch(f"{scheme}://{host}/robots.txt", timeout=6.0)
        if st == 200:
            robots_text = body.decode("utf-8", "ignore")
            for line in robots_text.splitlines():
                if line.lower().startswith("sitemap:"):
                    sitemap_refs.append(line.split(":", 1)[1].strip())
            # Evaluate with a UA specific to our crawler-style browser UA and
            # a common "*" wildcard, per RFC 9309.
            groups = re.split(r"(?m)^\s*user-agent\s*:\s*", robots_text.lower())
            applicable = []
            for g in groups[1:]:
                ua_and_rules = g.splitlines()
                ua = (ua_and_rules[0] if ua_and_rules else "").strip()
                if ua in ("*", "googlebot"):
                    applicable.append("\n".join(ua_and_rules[1:]))
            combined = "\n".join(applicable)
            for rule in re.finditer(r"(?m)^\s*disallow\s*:\s*(\S*)", combined):
                dis = rule.group(1)
                if not dis:
                    continue
                target = path.lstrip("/") if path != "/" else ""
                dis_clean = dis.lstrip("/")
                if target.startswith(dis_clean) if dis_clean else True:
                    # longest-match wins per RFC 9309
                    if robots_blocked is None or len(dis) >= len(robots_blocked):
                        robots_blocked = dis
    except Exception:
        pass
    result["robots_file"] = robots_text is not None
    result["robots_disallow"] = robots_blocked
    result["sitemap_refs"] = sitemap_refs

    # 2) the URL itself
    x_robots_tag = None
    canonical = None
    meta_robots = None
    page_title = None
    final_status = None
    redirected = False
    final_url = None
    try:
        st, headers, final_url, body = _fetch(url_to_inspect, timeout=8.0)
        final_status = st
        redirected = bool(final_url) and urllib.parse.urlparse(final_url).path != path
        x_robots_tag = headers.get("X-Robots-Tag")
        html = body.decode("utf-8", "ignore")[:80_000]
        m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
        page_title = m.group(1).strip()[:200] if m else None
        m = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']', html, re.I)
        canonical = m.group(1) if m else None
        m = re.search(r'<meta[^>]+name=["\']robots["\'][^>]*content=["\']([^"\']+)["\']', html, re.I)
        meta_robots = m.group(1) if m else None
    except Exception:
        pass

    result["final_status"] = final_status
    result["redirected"] = redirected
    result["final_url"] = final_url
    result["canonical"] = canonical or None
    result["x_robots_tag"] = x_robots_tag
    result["meta_robots"] = meta_robots
    result["page_title"] = page_title

    # 3) sitemap location
    if not sitemap_refs:
        for cand in ("/sitemap.xml", "/sitemap_index.xml", "/sitemap/sitemap.xml"):
            try:
                st, _, _, _ = _fetch(f"{scheme}://{host}{cand}", timeout=5.0)
                if st == 200:
                    sitemap_refs.append(f"{scheme}://{host}{cand}")
                    break
            except Exception:
                continue
    result["sitemap"] = (sitemap_refs[0] if sitemap_refs else None)

    # 4) Verdict
    noindex_hints = (x_robots_tag and "noindex" in x_robots_tag.lower()) or (meta_robots and "noindex" in meta_robots.lower())
    blocked = bool(robots_blocked)
    if final_status == 404:
        verdict, coverage = "NOT_FOUND", "Not found (HTTP 404)."
    elif noindex_hints:
        verdict, coverage = "EXCLUDED_NOINDEX", "Blocked from index by a noindex robots directive."
    elif blocked:
        verdict, coverage = "EXCLUDED_ROBOTS", f"Blocked by robots.txt rule 'Disallow: {robots_blocked}'."
    elif final_status is not None and 300 <= final_status < 400:
        verdict, coverage = "NEEDS_ATTENTION", f"URL redirects (HTTP {final_status})."
    elif final_status is not None and 200 <= final_status < 300:
        verdict, coverage = "PROBE_INDEXABLE", f"Live fetch returned HTTP {final_status}. No robots directive blocks indexing. (Free probe — connect GSC for Google's official coverage verdict.)"
    else:
        verdict, coverage = "ERROR", f"Live fetch failed for {url_to_inspect}."

    result["status"] = verdict
    result["coverage_state"] = coverage
    result["last_crawl_time"] = None
    result["crawled_as"] = "PROBE"
    result["note"] = "Free live probe (HTTP status + robots.txt + sitemap + on-page signals). Connect a GSC service account for Google's authoritative URL Inspection verdict."
    return result


def url_inspection_lookup(property_url: str, url_to_inspect: str, service_account_json: str = "") -> dict:
    """Run a URL Inspection for a single URL.

    Uses GSC when available; otherwise falls back to the free live-probe so
    the tool always returns real, useful indexability data.
    """
    service = _get_gsc_service(service_account_json)
    if not service:
        return _probe_url(url_to_inspect)

    try:
        body = {
            "inspectionUrl": url_to_inspect,
            "siteUrl": property_url,
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