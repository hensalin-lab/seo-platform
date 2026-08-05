"""Tests for the free, keyless, server-side data sources (Google Autocomplete,
RDAP WHOIS, DNS-over-HTTPS, SSL Labs). HTTP is mocked so no network is needed."""
import datetime as _dt
import json
from unittest import mock

import pytest

from app.engine import free_data


class FakeResponse:
    def __init__(self, payload, status=200):
        self._payload = payload
        self.status_code = status
        self.text = json.dumps(payload)

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, routes, status=200):
        self.routes = routes
        self.status = status

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, **kwargs):
        for sub in sorted(self.routes, key=len, reverse=True):
            if sub in url:
                return self.routes[sub]
        return FakeResponse({"error": "not found"}, status=404)


def _patch(routes):
    return mock.patch("app.engine.free_data.httpx.AsyncClient", lambda *a, **k: FakeAsyncClient(routes))


@pytest.mark.asyncio
async def test_google_autocomplete():
    routes = {"suggestqueries": FakeResponse(["seo audit", ["seo audit tools", "seo audit checklist"]])}
    with _patch(routes):
        res = await free_data.google_autocomplete("seo audit")
    assert res == ["seo audit tools", "seo audit checklist"]


@pytest.mark.asyncio
async def test_google_autocomplete_failure_returns_empty():
    with _patch({"suggestqueries": FakeResponse({"error": 1}, status=500)}):
        res = await free_data.google_autocomplete("seo audit")
    assert res == []


@pytest.mark.asyncio
async def test_rdap_whois():
    future = (_dt.date.today() + _dt.timedelta(days=365)).isoformat()
    routes = {"rdap.org": FakeResponse({
        "events": [{"eventAction": "registration", "eventDate": "2010-01-01T00:00:00Z"},
                   {"eventAction": "expiration", "eventDate": future}],
        "entities": [{"roles": ["registrar"], "vcardArray": ["vcard", [["fn", {}, "text", "Example Registrar"]]]}],
        "status": ["client delete prohibited"],
        "secureDNS": {"delegationSigned": True},
    })}
    with _patch(routes):
        res = await free_data.rdap_whois("https://www.example.com")
    assert res["host"] == "example.com"
    assert res["registrar"] == "Example Registrar"
    assert res["domain_age_days"] > 3000
    assert res["dnssec"] is True


@pytest.mark.asyncio
async def test_dns_over_https():
    routes = {"cloudflare-dns": FakeResponse({
        "Answer": [{"data": "93.184.216.34."}],
    })}
    with _patch(routes):
        res = await free_data.dns_over_https("example.com")
    assert res["host"] == "example.com"
    assert res["records"]["A"] == ["93.184.216.34"]


@pytest.mark.asyncio
async def test_ssl_labs_ready():
    not_after = (_dt.datetime.utcnow() + _dt.timedelta(days=120)).strftime("%Y-%m-%dT%H:%M:%SZ")
    routes = {"ssllabs": FakeResponse({
        "status": "READY",
        "endpoints": [{
            "grade": "A",
            "details": {
                "protocol": "TLS1.3",
                "chain": [{"notAfter": not_after}],
            },
        }],
    })}
    with _patch(routes):
        res = await free_data.ssl_labs_grade("example.com")
    assert res["grade"] == "A"
    assert res["tls_version"] == "TLS1.3"
    assert 119 <= res["cert_days_left"] <= 120


@pytest.mark.asyncio
async def test_ssl_labs_pending():
    routes = {"ssllabs": FakeResponse({"status": "DNS"})}
    with _patch(routes):
        res = await free_data.ssl_labs_grade("example.com")
    assert res["grade"] is None


@pytest.mark.asyncio
async def test_site_checks_combines():
    routes = {
        "rdap.org": FakeResponse({"events": [{"eventAction": "registration", "eventDate": "2010-01-01T00:00:00Z"}]}),
        "cloudflare-dns": FakeResponse({"Answer": [{"data": "1.2.3.4."}]}),
    }
    with _patch(routes):
        res = await free_data.site_checks("example.com")
    assert res["host"] == "example.com"
    assert res["whois"]["source"] == "rdap"
    assert res["dns"]["records"]["A"] == ["1.2.3.4"]


@pytest.mark.asyncio
async def test_host_of_normalizes():
    assert free_data.host_of("https://www.Example.com/path") == "example.com"
    assert free_data.host_of("example.com") == "example.com"
