"""Tests for the closed-loop Apply Fix (Phase 4.5): helper snippets and the
MCP tool. All helpers are pure (no network, no DB) so they are tested directly."""
import json

import pytest

from app.api import apply_fix
from app.engine.mcp_server import _build_mcp_server


def _issue(**over):
    from types import SimpleNamespace

    base = {
        "page_url": "https://example.com/blog/seo-audit",
        "category": "SCHEMA",
        "signal_name": "Missing FAQPage schema",
        "fix": "Add FAQPage structured data",
        "severity": "HIGH",
    }
    base.update(over)
    return SimpleNamespace(**base)


def _page(**over):
    from types import SimpleNamespace

    base = {
        "url": "https://example.com/blog/seo-audit",
        "title": "SEO Audit Guide",
        "meta_description": "Old meta",
        "h1": "SEO Audit Guide",
    }
    base.update(over)
    return SimpleNamespace(**base)


def test_schema_fix_faq_generates_jsonld():
    fix = apply_fix._schema_fix("Missing FAQPage schema", "https://example.com/faq", "https://example.com")
    assert fix["type"] == "jsonld"
    assert json.loads(fix["code"].replace("<script type=\"application/ld+json\">\n", "").replace("\n</script>", ""))

def test_schema_fix_article_has_headline():
    fix = apply_fix._schema_fix("Structured data", "https://example.com/post", "https://example.com")
    assert "Article" in fix["code"]
    assert "headline" in fix["code"]

def test_schema_fix_organization_positive():
    fix = apply_fix._schema_fix("og tags", "https://example.com/", "https://acme.com")
    assert "Organization" in fix["code"]
    assert "acme" in fix["code"].lower()

def test_meta_fix_title_rewrite():
    fix = apply_fix._meta_fix("Duplicate title tag", _page(), "Acme")
    assert "title" in fix["label"].lower()
    assert fix["code"].startswith("<title>")

def test_meta_fix_description():
    fix = apply_fix._meta_fix("Missing meta description", _page(), "Acme")
    assert "meta" in fix["label"].lower()
    assert "name=\"description\"" in fix["code"]

def test_heading_fix_has_hierarchy():
    fix = apply_fix._heading_fix(_page(), "Acme")
    assert "<h1>" in fix["code"]
    assert "<h2>" in fix["code"]
    assert "<h3>" in fix["code"]

def test_robots_fix_llms_txt_content():
    from types import SimpleNamespace

    audit = SimpleNamespace(website_url="https://example.com")
    fix = apply_fix._robots_fix(audit)
    assert fix["filename"] == "llms.txt"
    assert "example.com" in fix["code"]
    assert "Key pages" in fix["code"]

def test_text_fix_has_eeat_actions():
    fix = apply_fix._text_fix(_issue(category="CONTENT", signal_name="Thin content"), "Acme")
    assert "statistic" in fix["code"].lower()
    assert "H2" in fix["code"]


def test_mcp_apply_issue_fix_tool_registered():
    import asyncio

    async def _run():
        return [t.name for t in await _build_mcp_server().list_tools()]

    names = asyncio.run(_run())
    assert "apply_issue_fix" in names
