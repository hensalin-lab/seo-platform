"""Tests for the programmatic SEO engine and API."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.engine.programmatic_seo import (
    build_url,
    estimate_word_count,
    generate_pages,
    render_template,
    slugify,
)

transport = ASGITransport(app=app)


class FakeTemplate:
    base_url = "https://example.com"
    url_pattern = "/{city|slug}/{service|slug}"
    title_template = "{service} in {city}, {state} | Acme"
    meta_template = "Compare the best {service} providers in {city}, {state}."
    h1_template = "Best {service} in {city}, {state}"
    sections = [
        {
            "heading": "Why Choose {service} in {city}",
            "body": "Choosing a {service} provider in {city}, {state} matters. " * 4,
            "keywords": "{service} {city}",
        }
    ]
    schema_type = "LocalBusiness"
    schema_fields = {
        "@type": "LocalBusiness",
        "name": "{service} in {city}",
        "address": {"addressLocality": "{city}", "addressRegion": "{state}"},
    }
    faq_enabled = True
    faq_section = [
        {"q": "How much does {service} cost in {city}?", "a": "Prices vary in {city}."}
    ]
    min_words_target = 200


# ---------- Engine unit tests ----------


def test_slugify_basic():
    assert slugify("Best Roofing Co. — Austin, TX!") == "best-roofing-co-austin-tx"
    assert slugify("New York City") == "new-york-city"
    assert slugify("café naïve") == "cafe-naive"


def test_slugify_handles_unicode_and_empties():
    assert slugify("") == ""
    assert slugify(None) == ""


def test_render_template_placeholders():
    data = {"city": "New York", "service": "Plumbing", "nested": {"x": "value"}}
    assert render_template("Hello {city}", data) == "Hello New York"
    assert render_template("{city|slug}", data) == "new-york"
    assert render_template("{service|title}", data) == "Plumbing"
    assert render_template("{service|upper}", data) == "PLUMBING"
    assert render_template("{nested.x}", data) == "value"


def test_render_template_unresolved_keeps_placeholder():
    data = {"city": "Austin"}
    assert render_template("{missing} here", data) == "{missing} here"


def test_build_url_with_slug_pattern():
    url = build_url("https://example.com", "/cities/{city|slug}/{service|slug}", {
        "city": "New York City",
        "service": "Roofing",
    })
    assert url == "https://example.com/cities/new-york-city/roofing"


def test_build_url_no_base():
    url = build_url("", "/{city|slug}", {"city": "Austin"})
    assert url == "/austin"


def test_generate_pages_basic():
    entries = [
        {"city": "Austin", "state": "Texas", "service": "Plumbing"},
        {"city": "Denver", "state": "Colorado", "service": "Roofing"},
    ]
    pages, errors, count = generate_pages(FakeTemplate(), entries)
    assert count == 2
    assert errors == []
    urls = {p["url"] for p in pages}
    assert urls == {
        "https://example.com/austin/plumbing",
        "https://example.com/denver/roofing",
    }
    page = pages[0]
    assert page["title"] == "Plumbing in Austin, Texas | Acme"
    assert page["schema_markup"][0]["@type"] == "LocalBusiness"
    assert page["word_count"] > 0
    assert any(link["url"] for link in page["internal_links"])


def test_generate_pages_duplicate_url_reported():
    entries = [
        {"city": "Austin", "state": "Texas", "service": "Plumbing"},
        {"city": "Austin", "state": "Texas", "service": "Plumbing"},
    ]
    pages, errors, count = generate_pages(FakeTemplate(), entries)
    assert count == 1
    assert any("Duplicate URL" in e["message"] for e in errors)


def test_generate_pages_invalid_entry_reported():
    pages, errors, count = generate_pages(FakeTemplate(), ["not a dict"])
    assert count == 0
    assert any("must be an object" in e["message"] for e in errors)


def test_generate_pages_internal_link_fallback():
    # Two pages with no shared variables must still get fallback links.
    entries = [
        {"city": "Austin", "state": "Texas", "service": "Plumbing"},
        {"city": "Denver", "state": "Colorado", "service": "Roofing"},
    ]
    pages, _, count = generate_pages(FakeTemplate(), entries)
    assert count == 2
    for p in pages:
        assert len(p["internal_links"]) == 1
        assert p["internal_links"][0]["url"] != p["url"]


def test_generate_pages_thin_content_warning():
    template = FakeTemplate()
    template.sections = [{"heading": "Short", "body": "Only a few words.", "keywords": ""}]
    template.min_words_target = 1000
    pages, _, count = generate_pages(template, [
        {"city": "Austin", "state": "Texas", "service": "Plumbing"},
    ])
    assert count == 1
    assert any(w["type"] == "thin_content" for w in pages[0]["warnings"])


def test_generate_pages_faq_respects_flag():
    t_on = FakeTemplate()
    t_off = FakeTemplate()
    t_off.faq_enabled = False
    entries = [{"city": "Austin", "state": "Texas", "service": "Plumbing"}]
    pages_on, _, _ = generate_pages(t_on, entries)
    pages_off, _, _ = generate_pages(t_off, entries)
    assert len(pages_on[0]["faq"]) == 1
    assert pages_off[0]["faq"] == []


def test_estimate_word_count_counts_faq():
    sections = [{"body": "one two three", "heading": "h", "keywords": ""}]
    faq = [{"q": "a question?", "a": "an answer with words"}]
    assert estimate_word_count(sections, faq) == 10


# ---------- API integration tests ----------


async def _register_client(client, email):
    await client.post("/api/auth/register", json={
        "email": email,
        "username": email.split("@")[0],
        "password": "password123",
    })
    resp = await client.post("/api/auth/login", json={
        "email": email,
        "password": "password123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_programmatic_requires_auth():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/programmatic/templates")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_programmatic_full_flow():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _register_client(client, "prog@example.com")

        # Create a template
        create = await client.post("/api/programmatic/templates", json={
            "name": "City Service Pages",
            "base_url": "https://example.com",
            "url_pattern": "/{city|slug}/{service|slug}",
            "title_template": "{service} in {city} | Acme",
            "meta_template": "Best {service} in {city}.",
            "h1_template": "Best {service} in {city}",
            "sections": [{"heading": "Why {service} in {city}", "body": "Local {service} providers in {city}. " * 4, "keywords": "{service} {city}"}],
            "schema_type": "LocalBusiness",
            "schema_fields": {"@type": "LocalBusiness", "name": "{service} in {city}"},
            "faq_enabled": True,
            "faq_section": [{"q": "How much is {service}?", "a": "It varies by {city}."}],
            "min_words_target": 100,
        }, headers=headers)
        assert create.status_code == 200, create.text
        template = create.json()
        template_id = template["id"]

        # Get + list
        got = await client.get(f"/api/programmatic/templates/{template_id}", headers=headers)
        assert got.status_code == 200
        assert got.json()["name"] == "City Service Pages"
        listed = await client.get("/api/programmatic/templates", headers=headers)
        assert any(t["id"] == template_id for t in listed.json()["templates"])

        # Add entries
        entries = [
            {"city": "Austin", "service": "Plumbing"},
            {"city": "Denver", "service": "Roofing"},
        ]
        added = await client.post(
            f"/api/programmatic/templates/{template_id}/entries",
            json={"entries": entries},
            headers=headers,
        )
        assert added.status_code == 200
        assert added.json()["added"] == 2

        # Preview
        preview = await client.post(
            f"/api/programmatic/templates/{template_id}/preview",
            json={"limit": 5},
            headers=headers,
        )
        assert preview.status_code == 200
        assert preview.json()["generated"] == 2
        assert preview.json()["total_entries"] == 2

        # Generate
        gen = await client.post(
            f"/api/programmatic/templates/{template_id}/generate",
            headers=headers,
        )
        assert gen.status_code == 200, gen.text
        assert gen.json()["generated"] == 2
        assert gen.json()["error_count"] == 0

        # List pages
        pages = await client.get(
            f"/api/programmatic/templates/{template_id}/pages",
            headers=headers,
        )
        assert pages.status_code == 200
        assert pages.json()["total"] == 2
        assert any(p["url"].endswith("/austin/plumbing") for p in pages.json()["pages"])

        # Export JSON + CSV + sitemap
        exp_json = await client.get(
            f"/api/programmatic/templates/{template_id}/export?format=json",
            headers=headers,
        )
        assert exp_json.status_code == 200
        assert "example.com" in exp_json.json()["content"]

        exp_csv = await client.get(
            f"/api/programmatic/templates/{template_id}/export?format=csv",
            headers=headers,
        )
        assert exp_csv.status_code == 200
        assert "url,title" in exp_csv.json()["content"]

        exp_sitemap = await client.get(
            f"/api/programmatic/templates/{template_id}/export?format=sitemap",
            headers=headers,
        )
        assert exp_sitemap.status_code == 200
        assert "<urlset" in exp_sitemap.json()["content"]

        # Parse CSV
        parsed = await client.post(
            "/api/programmatic/parse-csv",
            json={"csv_text": "city,service\nHouston,Plumbing", "has_header": True},
            headers=headers,
        )
        assert parsed.status_code == 200
        assert parsed.json()["entries"][0]["city"] == "Houston"

        # Cleanup
        deleted = await client.delete(
            f"/api/programmatic/templates/{template_id}",
            headers=headers,
        )
        assert deleted.status_code == 200


@pytest.mark.asyncio
async def test_programmatic_cannot_access_other_users_template():
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers_a = await _register_client(client, "owner@example.com")
        create = await client.post("/api/programmatic/templates", json={"name": "Mine"}, headers=headers_a)
        template_id = create.json()["id"]

        headers_b = await _register_client(client, "intruder@example.com")
        resp = await client.get(f"/api/programmatic/templates/{template_id}", headers=headers_b)
        assert resp.status_code in (403, 404)

        await client.delete(f"/api/programmatic/templates/{template_id}", headers=headers_a)
