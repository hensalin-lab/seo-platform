"""Tests for Phase A Core Web Vitals: the PageSpeed engine (lab + CrUX field
data) and the CWV endpoints. Google APIs are mocked so no keys or network are
required."""
import json
from unittest import mock

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.models import Audit, CoreWebVitals, Page, User
from app.database import async_session
from app.api.status import _cwv_sources
from app.engine import pagespeed_engine as pse_mod
from app.engine.pagespeed_engine import PageSpeedEngine

transport = ASGITransport(app=app)

PAGESPEED_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
CRUX_API = "https://chromeuxreport.googleapis.com/v1/records:queryRecord"


class FakeResponse:
    def __init__(self, payload, status=200):
        self._payload = payload
        self.status_code = status
        self.text = json.dumps(payload)

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, **kwargs):
        self.calls.append(("GET", url, kwargs))
        return self._route(url)

    async def post(self, url, **kwargs):
        self.calls.append(("POST", url, kwargs))
        return self._route(url)

    def _route(self, url):
        for sub in sorted(self.routes, key=len, reverse=True):
            if sub in url:
                return self.routes[sub]
        return FakeResponse({"error": "not found"}, status=404)


def _patch(routes):
    return mock.patch(
        "app.engine.pagespeed_engine.httpx.AsyncClient",
        lambda *a, **k: FakeAsyncClient(routes),
    )


def _lab_payload():
    return {
        "lighthouseResult": {
            "fetchTime": "2026-01-01T00:00:00Z",
            "finalUrl": "https://example.com/",
            "categories": {"performance": {"score": 0.9}, "seo": {"score": 0.8}},
            "audits": {
                "largest-contentful-paint": {"displayValue": "2.5 s", "score": 0.89, "numericValue": 2500},
                "interactive": {"displayValue": "4.2 s", "score": 0.75, "numericValue": 4200},
                "cumulative-layout-shift": {"displayValue": "0.01", "score": 1.0, "numericValue": 0.01},
                "first-contentful-paint": {"displayValue": "1.4 s", "score": 0.95, "numericValue": 1400},
                "speed-index": {"displayValue": "3.0 s", "score": 0.8, "numericValue": 3000},
                "total-blocking-time": {"displayValue": "100 ms", "score": 0.9, "numericValue": 100},
                "interaction-to-next-paint": {"displayValue": "150 ms", "score": 0.96, "numericValue": 150},
                "time-to-first-byte": {"displayValue": "600 ms", "score": 0.99, "numericValue": 600},
                "render-blocking-resources": {
                    "score": 0.3, "title": "Eliminate render-blocking resources",
                    "description": "description", "displayValue": "2 resources",
                    "details": {"type": "opportunity"},
                },
                "long-tasks": {
                    "score": 0.5, "title": "Avoid long main-thread tasks",
                    "description": "description", "displayValue": "3",
                    "details": {"type": "table"},
                },
            },
        }
    }


def _crux_payload():
    return {
        "record": {
            "metrics": {
                "largest_contentful_paint": {
                    "percentiles": {"p75": 2100},
                    "histogram": [{"start": 0, "end": 2500, "density": 0.8}],
                },
                "cumulative_layout_shift": {"percentiles": {"p75": 0.04}, "histogram": []},
                "interaction_to_next_paint": {"percentiles": {"p75": 190}, "histogram": []},
                "first_contentful_paint": {"percentiles": {"p75": 1300}, "histogram": []},
                "experimental_time_to_first_byte": {"percentiles": {"p75": 650}, "histogram": []},
            }
        }
    }


def _both_routes():
    return {
        PAGESPEED_API: FakeResponse(_lab_payload()),
        CRUX_API: FakeResponse(_crux_payload()),
    }


# ---------------- Engine: parsing ----------------

@pytest.mark.asyncio
async def test_analyze_parses_lab_and_field():
    with _patch(_both_routes()):
        result = await PageSpeedEngine().analyze("https://example.com", "mobile")
    assert result["strategy"] == "mobile"
    assert result["scores"]["performance"] == 90.0
    assert result["scores"]["seo"] == 80.0
    assert result["final_url"] == "https://example.com/"
    assert result["core_web_vitals"]["largest-contentful-paint"]["numeric_value"] == 2500
    assert len(result["opportunities"]) == 1
    assert result["opportunities"][0]["id"] == "render-blocking-resources"
    assert len(result["diagnostics"]) == 1
    assert result["diagnostics"][0]["id"] == "long-tasks"


@pytest.mark.asyncio
async def test_analyze_parses_crux_field_data():
    with _patch(_both_routes()):
        result = await PageSpeedEngine().analyze("https://example.com", "mobile")
    field = result["field_data"]
    assert field["_source"] == "crux"
    assert field["_available"] is True
    assert field["largest_contentful_paint"]["p75"] == 2100
    assert field["largest_contentful_paint"]["histogram"][0]["density"] == 0.8
    # experimental_time_to_first_byte is normalized to time_to_first_byte
    assert field["time_to_first_byte"]["p75"] == 650


@pytest.mark.asyncio
async def test_assessment_prefers_field_over_lab():
    with _patch(_both_routes()):
        result = await PageSpeedEngine().analyze("https://example.com", "mobile")
    assessment = result["core_web_vitals"]["_assessment"]
    assert assessment["largest-contentful-paint"]["source"] == "field"
    assert assessment["largest-contentful-paint"]["value"] == 2100
    assert assessment["largest-contentful-paint"]["status"] == "good"
    assert assessment["_summary"]["passed"] == 3
    assert assessment["_summary"]["passed_cwv"] is True


@pytest.mark.asyncio
async def test_assessment_falls_back_to_lab_when_no_crux():
    routes = {PAGESPEED_API: FakeResponse(_lab_payload()), CRUX_API: FakeResponse({}, status=404)}
    with _patch(routes):
        result = await PageSpeedEngine().analyze("https://example.com", "mobile")
    assert result["field_data"]["_available"] is False
    assessment = result["core_web_vitals"]["_assessment"]
    assert assessment["largest-contentful-paint"]["source"] == "lab"
    assert assessment["largest-contentful-paint"]["value"] == 2500


@pytest.mark.asyncio
async def test_psi_error_still_attempts_crux():
    routes = {
        PAGESPEED_API: FakeResponse({"error": {"message": "quota exceeded"}}, status=500),
        CRUX_API: FakeResponse(_crux_payload()),
    }
    with _patch(routes):
        result = await PageSpeedEngine().analyze("https://example.com", "mobile")
    assert result["field_data"]["_available"] is True
    assert result["core_web_vitals"]["_assessment"]["largest-contentful-paint"]["source"] == "field"
    assert "quota exceeded" in (result.get("note") or "")


@pytest.mark.asyncio
async def test_analyze_all_down_returns_empty_result():
    routes = {
        PAGESPEED_API: FakeResponse({"error": {"message": "down"}}, status=503),
        CRUX_API: FakeResponse({}, status=500),
    }
    with _patch(routes):
        result = await PageSpeedEngine().analyze("https://example.com", "mobile")
    assert result["field_data"]["_available"] is False
    # No real metrics survive an all-down run (only the empty _assessment summary).
    assert not any(k for k in result["core_web_vitals"] if not k.startswith("_"))
    assert result["performance_score"] == 0
    assert result["note"]


@pytest.mark.asyncio
async def test_analyze_unavailable_engine():
    engine = PageSpeedEngine()
    engine.available = False
    result = await engine.analyze("https://example.com", "mobile")
    assert result["field_data"]["_available"] is False
    assert result["core_web_vitals"] == {}


# ---------------- Engine: thresholds + score ----------------

def test_engine_cwv_status_thresholds():
    engine = PageSpeedEngine()
    assert engine._cwv_status("largest-contentful-paint", 2500) == "good"
    assert engine._cwv_status("largest-contentful-paint", 3999) == "needs_improvement"
    assert engine._cwv_status("largest-contentful-paint", 4000) == "poor"
    assert engine._cwv_status("cumulative-layout-shift", 0.10) == "good"
    assert engine._cwv_status("interaction-to-next-paint", 200) == "good"
    assert engine._cwv_status("interaction-to-next-paint", 501) == "poor"
    assert engine._cwv_status("unknown-metric", 100) == "unknown"


@pytest.mark.asyncio
async def test_performance_score_from_field_when_available():
    with _patch(_both_routes()):
        result = await PageSpeedEngine().analyze("https://example.com", "mobile")
    # All five field metrics are "good" => weighted average of 100.
    assert result["performance_score"] == 100


@pytest.mark.asyncio
async def test_performance_score_falls_back_to_lab_perf():
    routes = {PAGESPEED_API: FakeResponse(_lab_payload()), CRUX_API: FakeResponse({}, status=404)}
    with _patch(routes):
        result = await PageSpeedEngine().analyze("https://example.com", "mobile")
    assert result["performance_score"] == 90


# ---------------- _cwv_sources attribution ----------------

def test_cwv_sources_precedence():
    field = {
        "_available": True,
        "largest_contentful_paint": {"p75": 2100},
        "cumulative_layout_shift": {"p75": 0.04},
    }
    lab = {
        "interaction-to-next-paint": {"numeric_value": 150},
        "first-contentful-paint": {"numeric_value": 1400},
        "time-to-first-byte": {"numeric_value": 600},
    }
    values = {"lcp": 2100, "cls": 0.04, "inp": 150, "fcp": 1400, "ttfb": 600}
    sources = _cwv_sources(field, lab, values)
    assert sources["lcp"] == "field"
    assert sources["cls"] == "field"
    assert sources["inp"] == "lab"
    assert sources["fcp"] == "lab"
    assert sources["ttfb"] == "lab"


def test_cwv_sources_crawl_fallback_only_for_ttfb():
    field = {"source": "crawl", "_available": False}
    lab = {}
    sources = _cwv_sources(field, lab, {"ttfb": 900, "lcp": None, "cls": None, "inp": None, "fcp": None})
    assert sources["ttfb"] == "crawl"
    assert sources["lcp"] == "unavailable"


def test_cwv_sources_estimated_when_value_only():
    sources = _cwv_sources({}, {}, {"ttfb": 700, "lcp": 2600, "cls": None, "inp": None, "fcp": None})
    assert sources["ttfb"] == "estimated"
    assert sources["lcp"] == "estimated"
    assert sources["cls"] == "unavailable"


# ---------------- Endpoint helpers ----------------

async def _auth_headers(client, email, username=None):
    username = username or email.split("@")[0]
    await client.post("/api/auth/register", json={
        "email": email, "username": username, "password": "password123",
    })
    resp = await client.post("/api/auth/login", json={
        "email": email, "password": "password123",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _user_id(email: str) -> str:
    async with async_session() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        return user.id


async def _create_audit(email: str, user_id: str, times=None) -> str:
    async with async_session() as db:
        audit = Audit(website_url="https://cwv-test.com", status="COMPLETED", progress=100, user_id=user_id)
        db.add(audit)
        await db.flush()
        if times:
            db.add_all([
                Page(audit_id=audit.id, url=f"https://cwv-test.com/page{i}", status_code=200,
                     response_time_ms=t, title=f"Page {i}", word_count=100)
                for i, t in enumerate(times)
            ])
        await db.commit()
        return audit.id


class FakePSIEngine:
    def __init__(self, result=None):
        self.result = result
        self.calls = 0

    async def analyze(self, url, strategy="mobile"):
        self.calls += 1
        if self.result is not None:
            return self.result
        return {
            "strategy": "mobile",
            "scores": {"performance": 82},
            "core_web_vitals": {
                "_assessment": {"largest-contentful-paint": {"label": "LCP", "value": 2100, "status": "good"}},
            },
            "field_data": {
                "_available": True,
                "largest_contentful_paint": {"p75": 2100, "histogram": []},
                "interaction_to_next_paint": {"p75": 190, "histogram": []},
                "cumulative_layout_shift": {"p75": 0.04, "histogram": []},
                "first_contentful_paint": {"p75": 1300, "histogram": []},
                "time_to_first_byte": {"p75": 700, "histogram": []},
            },
            "performance_score": 82,
            "note": "",
        }


def _monkey_engine(monkeypatch, result=None):
    fake = FakePSIEngine(result=result)
    monkeypatch.setattr("app.engine.pagespeed_engine.PageSpeedEngine", lambda: fake)
    return fake


# ---------------- Endpoint tests ----------------

@pytest.mark.asyncio
async def test_cwv_endpoint_missing_audit(monkeypatch):
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "cwv_missing@test.com")
        resp = await client.get("/api/audit/no-such/core-web-vitals", headers=headers)
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cwv_endpoint_live_run_persists_row(monkeypatch):
    fake = _monkey_engine(monkeypatch)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "cwv_live@test.com")
        audit_id = await _create_audit("cwv_live@test.com", await _user_id("cwv_live@test.com"))

        resp = await client.get(f"/api/audit/{audit_id}/core-web-vitals", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["source"] == "live"
        assert body["lcp_ms"] == 2100
        assert body["inp_ms"] == 190
        assert body["cls"] == 0.04
        assert body["ttfb_ms"] == 700
        assert body["performance_score"] == 82
        assert body["sources"]["lcp"] == "field"
        assert fake.calls == 1

    async with async_session() as db:
        rows = (await db.execute(select(CoreWebVitals).where(CoreWebVitals.audit_id == audit_id))).scalars().all()
        assert len(rows) == 1
        assert rows[0].lcp_ms == 2100
        assert rows[0].performance_score == 82


@pytest.mark.asyncio
async def test_cwv_endpoint_returns_stored_without_rerun(monkeypatch):
    fake = _monkey_engine(monkeypatch)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "cwv_stored@test.com")
        audit_id = await _create_audit("cwv_stored@test.com", await _user_id("cwv_stored@test.com"))

        await client.get(f"/api/audit/{audit_id}/core-web-vitals", headers=headers)
        resp = await client.get(f"/api/audit/{audit_id}/core-web-vitals", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["source"] == "stored"
        assert body["lcp_ms"] == 2100
        assert fake.calls == 1


@pytest.mark.asyncio
async def test_cwv_endpoint_refresh_forces_rerun(monkeypatch):
    fake = _monkey_engine(monkeypatch)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "cwv_refresh@test.com")
        audit_id = await _create_audit("cwv_refresh@test.com", await _user_id("cwv_refresh@test.com"))

        await client.get(f"/api/audit/{audit_id}/core-web-vitals", headers=headers)
        resp = await client.get(f"/api/audit/{audit_id}/core-web-vitals", params={"refresh": 1}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["source"] == "live"
        assert fake.calls == 2


@pytest.mark.asyncio
async def test_cwv_endpoint_crawl_fallback(monkeypatch):
    fake = _monkey_engine(monkeypatch, result={
        "strategy": "mobile",
        "scores": {},
        "core_web_vitals": {},
        "field_data": {"_available": False, "_note": "no data"},
        "performance_score": 0,
        "note": "",
    })
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "cwv_crawl@test.com")
        audit_id = await _create_audit(
            "cwv_crawl@test.com", await _user_id("cwv_crawl@test.com"),
            times=[400, 600, 800, 900, 1200],
        )

        resp = await client.get(f"/api/audit/{audit_id}/core-web-vitals", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["source"] == "crawl"
        # p75 of [400,600,800,900,1200] is index int(5*0.75)=3 => 900
        assert body["ttfb_ms"] == 900
        assert body["sources"]["ttfb"] == "crawl"
        assert "crawler measured" in body["note"]
        assert fake.calls == 1


@pytest.mark.asyncio
async def test_page_speed_live_uses_cache(monkeypatch):
    fake = _monkey_engine(monkeypatch)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "cwv_livecache@test.com")
        audit_id = await _create_audit("cwv_livecache@test.com", await _user_id("cwv_livecache@test.com"))

        r1 = await client.get(f"/api/audit/{audit_id}/page-speed-live", headers=headers)
        r2 = await client.get(f"/api/audit/{audit_id}/page-speed-live", headers=headers)
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json() == r2.json()
        assert fake.calls == 1


@pytest.mark.asyncio
async def test_page_speed_live_missing_audit():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _auth_headers(client, "live_missing@test.com")
        resp = await client.get("/api/audit/no-such/page-speed-live", headers=headers)
        assert resp.status_code == 404
