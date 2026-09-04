"""Tests for the OpenSEO-style MCP server: tool registration, mount point,
and Streamable HTTP handshake over the real FastAPI app.

A single module-scoped TestClient is used because the MCP session manager's
run() can only be entered once per process (as documented by the SDK), and the
TestClient drives the full app lifespan (including the MCP task group).
"""
import json

import pytest
from starlette.testclient import TestClient

from app.engine.mcp_server import _build_mcp_server, get_mcp_app
from app.main import app
from app.config import settings

_MCP_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
}


def _auth_headers():
    """When MCP_API_KEY is configured, requests to /api/mcp must present it."""
    h = dict(_MCP_HEADERS)
    key = getattr(settings, "MCP_API_KEY", "")
    if key:
        h["X-API-Key"] = key
    return h


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _mcp_session(client):
    """Perform the MCP initialize handshake and return headers with session id."""
    init = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "pytest", "version": "1.0"},
        },
    }
    r = client.post("/api/mcp", json=init, headers=_auth_headers())
    assert r.status_code == 200
    sid = r.headers.get("mcp-session-id")
    assert sid, "MCP session id must be issued"
    h2 = _auth_headers()
    h2["mcp-session-id"] = sid
    client.post("/api/mcp", json={"jsonrpc": "2.0", "method": "notifications/initialized"}, headers=h2)
    return h2


def test_mcp_server_builds_all_tools():
    import asyncio

    async def _run():
        return [t.name for t in await _build_mcp_server().list_tools()]

    names = asyncio.run(_run())
    expected = {
        "keyword_volume",
        "serp_position",
        "backlink_summary",
        "ai_citations",
        "free_site_checks",
        "free_autocomplete",
        "free_whois",
        "free_dns",
        "free_ssl",
        "audit_website",
        "providers_status",
    }
    assert expected.issubset(set(names))


def test_mcp_app_and_session_available():
    from app.engine.mcp_server import get_mcp_session_manager

    assert get_mcp_app() is not None
    assert get_mcp_session_manager() is not None


def test_mcp_initialize_and_tools_list(client):
    h2 = _mcp_session(client)
    rt = client.post("/api/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"}, headers=h2)
    assert rt.status_code == 200
    tools = rt.json()["result"]["tools"]
    names = {t["name"] for t in tools}
    assert "free_autocomplete" in names
    assert "audit_website" in names
    assert "providers_status" in names
    assert "keyword_volume" in names


def test_providers_status_tool_returns_json(client):
    h2 = _mcp_session(client)
    call = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {"name": "providers_status", "arguments": {}},
    }
    rt = client.post("/api/mcp", json=call, headers=h2)
    assert rt.status_code == 200
    result = rt.json()["result"]
    content = result["content"][0]["text"]
    data = json.loads(content)
    assert "providers" in data
    keyless = [p for p in data["providers"] if p["name"].startswith("keyless")]
    assert keyless
    assert all(p["configured"] is True for p in keyless)
