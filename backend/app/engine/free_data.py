"""Free, keyless, server-side data sources: Google Autocomplete keyword
suggestions, RDAP WHOIS, DNS-over-HTTPS (Cloudflare), and SSL Labs grade.

All of these run on the backend (Railway) so they work for every user of the
platform at zero cost. Each call is best-effort: failures return a safe empty
result instead of raising, so the UI can fall back to other signals.
"""
import asyncio
import datetime as _dt
import json
import logging
import re
from urllib.parse import urljoin, urlparse

import httpx

logger = logging.getLogger(__name__)

GOOGLE_SUGGEST = "https://suggestqueries.google.com/complete/search"
RDAP_BOOTSTRAP = "https://rdap.org/domain/"
DNS_OVER_HTTPS = "https://cloudflare-dns.com/dns-query"
SSL_LABS_API = "https://api.ssllabs.com/api/v3/analyze"

try:  # pragma: no cover - optional parser
    from bs4 import BeautifulSoup

    _BS4_AVAILABLE = True
except Exception:  # pragma: no cover
    _BS4_AVAILABLE = False
    BeautifulSoup = None


def host_of(url: str) -> str:
    parsed = urlparse(url or "")
    host = (parsed.hostname or "").strip()
    if not host:
        host = (url or "").strip()
    return host.lower().lstrip("www.")


async def google_autocomplete(q: str, limit: int = 10) -> list:
    """Free Google autocomplete suggestions (no key required)."""
    if not q or not q.strip():
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                GOOGLE_SUGGEST,
                params={"client": "firefox", "hl": "en", "q": q.strip()},
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
        items = data[1] if isinstance(data, list) and len(data) > 1 else []
        return [str(s) for s in items if s][:limit]
    except Exception as e:
        logger.warning(f"Google autocomplete failed: {e}")
        return []


def _rdap_events_to_dates(events):
    registered = None
    expiry = None
    for ev in events or []:
        action = (ev.get("eventAction") or "").lower()
        date = ev.get("eventDate") or ""
        if action == "registration" and not registered:
            registered = date
        elif action == "expiration" and not expiry:
            expiry = date
    return registered, expiry


async def rdap_whois(url: str) -> dict:
    """Free WHOIS data via RDAP (registrar, registration, expiry, status)."""
    host = host_of(url)
    if not host:
        return {"source": "rdap", "host": host, "note": "no host"}
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(f"{RDAP_BOOTSTRAP}{host}")
            if resp.status_code != 200:
                return {"source": "rdap", "host": host, "note": f"RDAP {resp.status_code}"}
            data = resp.json()
        registered, expiry = _rdap_events_to_dates(data.get("events"))
        registrar = ""
        for ent in data.get("entities") or []:
            if (ent.get("roles") or []) and "registrar" in [r.lower() for r in ent["roles"]]:
                vcard = (ent.get("vcardArray") or [[]])[1] or []
                for item in vcard:
                    if len(item) >= 2 and item[0] == "fn":
                        registrar = str(item[3] if len(item) > 3 else item[2] or "")
                        break
                if registrar:
                    break
        age_days = None
        if registered:
            try:
                dt = _dt.datetime.fromisoformat(registered.replace("Z", "+00:00")).replace(tzinfo=None)
                age_days = max(0, (_dt.datetime.utcnow() - dt).days)
            except Exception:
                age_days = None
        return {
            "source": "rdap",
            "host": host,
            "registrar": registrar,
            "registration_date": registered,
            "expiry_date": expiry,
            "domain_age_days": age_days,
            "domain_status": data.get("status", []),
            "dnssec": data.get("secureDNS", {}).get("delegationSigned") if isinstance(data.get("secureDNS"), dict) else None,
        }
    except Exception as e:
        logger.warning(f"RDAP failed for {host}: {e}")
        return {"source": "rdap", "host": host, "note": f"RDAP error: {e}"}


DNS_TYPES = ("A", "AAAA", "MX", "NS", "TXT", "CNAME")


async def dns_over_https(url: str) -> dict:
    """Free DNS records via Cloudflare DNS-over-HTTPS JSON API."""
    host = host_of(url)
    if not host:
        return {"host": host, "records": {}, "source": "doh"}
    out = {}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for t in DNS_TYPES:
                resp = await client.get(
                    DNS_OVER_HTTPS,
                    params={"name": host, "type": t},
                    headers={"Accept": "application/dns-json"},
                )
                if resp.status_code != 200:
                    continue
                data = resp.json()
                answers = []
                for a in data.get("Answer", []):
                    answers.append(str(a.get("data", "")).rstrip("."))
                out[t] = answers
        return {"host": host, "records": out, "source": "doh"}
    except Exception as e:
        logger.warning(f"DNS-over-HTTPS failed for {host}: {e}")
        return {"host": host, "records": {}, "source": "doh", "note": str(e)}


async def ssl_labs_grade(url: str) -> dict:
    """Free SSL/TLS grade + certificate expiry via the SSL Labs API.

    Uses fromCache so it returns immediately when a cached result exists and
    starts a fresh scan otherwise. Best-effort — slow scans are the caller's
    problem (callers should treat this as async/on-demand)."""
    host = host_of(url)
    if not host:
        return {"host": host, "grade": None, "source": "ssllabs"}
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(SSL_LABS_API, params={"host": host, "fromCache": "on", "maxAge": "24"})
            if resp.status_code != 200:
                return {"host": host, "grade": None, "note": f"SSL Labs {resp.status_code}"}
            data = resp.json()
        status = (data.get("status") or "").upper()
        if status == "READY":
            endpoints = data.get("endpoints") or []
            grade = endpoints[0].get("grade") if endpoints else None
            grade_trust_ignored = endpoints[0].get("gradeTrustIgnored") if endpoints else None
            tls = None
            cert_days_left = None
            cert_not_after = None
            for ep in endpoints:
                details = ep.get("details") or {}
                proto = details.get("protocol") or ""
                if proto:
                    tls = proto
                chain = details.get("chain") or []
                if chain and not cert_days_left:
                    cert = chain[0]
                    try:
                        not_after = _dt.datetime.fromisoformat((cert.get("notAfter") or "").replace("Z", "+00:00")).replace(tzinfo=None)
                        cert_days_left = max(0, (not_after - _dt.datetime.utcnow()).days)
                        cert_not_after = cert.get("notAfter")
                    except Exception:
                        pass
            return {
                "host": host,
                "grade": grade,
                "grade_trust_ignored": grade_trust_ignored,
                "tls_version": tls,
                "cert_not_after": cert_not_after,
                "cert_days_left": cert_days_left,
                "status": "READY",
                "source": "ssllabs",
            }
        return {"host": host, "grade": None, "status": status, "source": "ssllabs", "note": "scan pending or unavailable"}
    except Exception as e:
        logger.warning(f"SSL Labs failed for {host}: {e}")
        return {"host": host, "grade": None, "source": "ssllabs", "note": str(e)}


async def site_checks(url: str) -> dict:
    """Combined fast free checks: RDAP WHOIS + DNS records."""
    whois, dns = await asyncio.gather(rdap_whois(url), dns_over_https(url))
    return {
        "url": url,
        "host": host_of(url),
        "whois": whois,
        "dns": dns,
    }


# ---------------------------------------------------------------------------
# Live page fetch tools (free, keyless — fetch + parse the page directly)
# ---------------------------------------------------------------------------

DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0 Safari/537.36"
)


def _normalize_page_url(url: str) -> str:
    """Return a usable absolute http(s) URL, defaulting to https."""
    url = (url or "").strip()
    if not url:
        return ""
    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = "https://" + url.lstrip("/")
    parsed = urlparse(url)
    if not parsed.netloc:
        return ""
    return url


async def _fetch_page(url: str, max_bytes: int = 2_000_000) -> tuple[str, str] | None:
    """Fetch a page and return (final_url, html). None on any failure."""
    norm = _normalize_page_url(url)
    if not norm:
        return None
    try:
        async with httpx.AsyncClient(
            timeout=20, follow_redirects=True,
            headers={"User-Agent": DEFAULT_UA, "Accept": "*/*"},
        ) as client:
            resp = await client.get(norm)
            if resp.status_code >= 400:
                return None
            html = resp.text
        if len(html) > max_bytes:
            html = html[:max_bytes]
        return str(resp.url), html
    except Exception as e:  # pragma: no cover
        logger.warning(f"Page fetch failed for {norm}: {e}")
        return None


def _meta(html: str, name: str) -> str:
    """Return the content of a meta tag by name or property."""
    m = re.search(
        rf'<meta[^>]+(?:name|property)=["\']{re.escape(name)}["\'][^>]*content=["\']([^"\']*)["\']',
        html, re.IGNORECASE,
    )
    if not m:
        m = re.search(
            rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:name|property)=["\']{re.escape(name)}["\']',
            html, re.IGNORECASE,
        )
    return (m.group(1).strip() if m else "")


async def page_inspector(url: str) -> dict:
    """Free on-page tag inspector: title, meta description, OG tags and H1s,
    parsed live from the target page (no API key)."""
    got = await _fetch_page(url)
    final_url, html = got if got else ("", "")
    if not html:
        return {"url": url, "error": "Could not fetch the page (blocked, unreachable, or non-HTML)."}

    title = ""
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if m:
        title = re.sub(r"\s+", " ", m.group(1)).strip()

    description = _meta(html, "description")
    og_title = _meta(html, "og:title")
    og_description = _meta(html, "og:description")
    og_image = _meta(html, "og:image")
    og_url = _meta(html, "og:url")
    robots = _meta(html, "robots")

    canonical = ""
    cm = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']*)["\']', html, re.IGNORECASE)
    if cm:
        canonical = cm.group(1)

    h1 = []
    if _BS4_AVAILABLE:
        try:
            soup = BeautifulSoup(html, "html.parser")
            h1 = [re.sub(r"\s+", " ", t.get_text(" ", strip=True)) for t in soup.find_all("h1")]
            if not h1:
                h1 = [re.sub(r"\s+", " ", t.get_text(" ", strip=True)) for t in soup.find_all(["h2"], limit=1)]
        except Exception:  # pragma: no cover
            h1 = []

    title_len = len(title) if title else None
    desc_len = len(description) if description else None

    return {
        "url": url,
        "final_url": final_url,
        "title": title,
        "title_length": title_len,
        "description": description,
        "description_length": desc_len,
        "og_title": og_title,
        "og_description": og_description,
        "og_image": og_image,
        "og_url": og_url,
        "canonical": canonical,
        "robots": robots,
        "h1s": h1[:5],
        "title_too_long": bool(title_len and title_len > 60),
        "desc_too_long": bool(desc_len and desc_len > 160),
        "missing_title": not title,
        "missing_description": not description,
    }


def _extract_json_ld(html: str, base_url: str) -> list:
    """Best-effort JSON-LD extraction from <script type="application/ld+json">."""
    blocks = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.IGNORECASE | re.DOTALL,
    )
    out = []
    for b in blocks:
        b = b.strip()
        try:
            data = json.loads(b)
        except json.JSONDecodeError:
            continue
        items = data if isinstance(data, list) else [data]
        for it in items:
            if not isinstance(it, dict):
                continue
            typ = it.get("@type")
            if isinstance(typ, list):
                typ = typ[0]
            if not typ:
                continue
            out.append({
                "@type": typ,
                "name": it.get("name") or "",
                "url": it.get("url") or it.get("mainEntityOfPage") or "",
                "headline": it.get("headline") or "",
                "keys": sorted(k for k in it.keys() if not k.startswith("@")),
            })
    return out


async def schema_detector(url: str) -> dict:
    """Free structured-data (JSON-LD) detector: list the schema types found on a
    live page (no API key)."""
    got = await _fetch_page(url)
    final_url, html = got if got else ("", "")
    if not html:
        return {"url": url, "error": "Could not fetch the page."}
    schema = _extract_json_ld(html, final_url)
    types = {}
    for s in schema:
        types[s["@type"]] = types.get(s["@type"], 0) + 1
    return {
        "url": url,
        "final_url": final_url,
        "count": len(schema),
        "types": types,
        "items": schema[:20],
    }


async def sitemap_robots(url: str) -> dict:
    """Free Sitemap + Robots.txt finder: fetch robots.txt and discover/discover
    sitemap URLs from a live site (no API key)."""
    norm = _normalize_page_url(url)
    if not norm:
        return {"url": url, "error": "Invalid URL."}
    parsed = urlparse(norm)
    origin = f"{parsed.scheme}://{parsed.netloc}"

    robots_txt = ""
    sitemaps = []
    try:
        async with httpx.AsyncClient(
            timeout=20, follow_redirects=True,
            headers={"User-Agent": DEFAULT_UA},
        ) as client:
            r = await client.get(urljoin(norm, "/robots.txt"))
            if r.status_code == 200:
                robots_txt = r.text[:20000]
                for m in re.finditer(r"(?im)^sitemap:\s*(\S+)", robots_txt):
                    sitemaps.append(m.group(1).strip())
    except Exception as e:  # pragma: no cover
        logger.warning(f"robots.txt fetch failed for {norm}: {e}")

    if not sitemaps:
        for candidate in ("/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"):
            try:
                async with httpx.AsyncClient(
                    timeout=15, follow_redirects=True,
                    headers={"User-Agent": DEFAULT_UA},
                ) as client:
                    rs = await client.get(urljoin(norm, candidate))
                    if rs.status_code == 200 and "xml" in (rs.headers.get("content-type") or ""):
                        sitemaps.append(urljoin(norm, candidate))
                        break
            except Exception:  # pragma: no cover
                continue

    return {
        "url": url,
        "origin": origin,
        "has_robots_txt": bool(robots_txt),
        "robots_txt": robots_txt,
        "sitemaps": sitemaps[:10],
    }
