"""Free, keyless, server-side data sources: Google Autocomplete keyword
suggestions, RDAP WHOIS, DNS-over-HTTPS (Cloudflare), and SSL Labs grade.

All of these run on the backend (Railway) so they work for every user of the
platform at zero cost. Each call is best-effort: failures return a safe empty
result instead of raising, so the UI can fall back to other signals.
"""
import asyncio
import datetime as _dt
import logging
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

GOOGLE_SUGGEST = "https://suggestqueries.google.com/complete/search"
RDAP_BOOTSTRAP = "https://rdap.org/domain/"
DNS_OVER_HTTPS = "https://cloudflare-dns.com/dns-query"
SSL_LABS_API = "https://api.ssllabs.com/api/v3/analyze"


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
