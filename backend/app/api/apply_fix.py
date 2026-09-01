"""Closed-loop "Apply Fix" for audit issues (Phase 4.5).

Turns any audit issue into ready-to-copy markup: schema JSON-LD, corrected
<title>/meta, heading structure, robots/llms.txt blocks, etc. The frontend
renders these as copy-to-clipboard code blocks so a user can apply a fix
without leaving the platform.
"""
import json
import logging
import re
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Audit, Issue, Page, User
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/audit/{audit_id}/apply-fix", tags=["apply-fix"])


def _audit_guard(audit: Audit | None, user: User):
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    if audit.user_id and audit.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this audit")


def _host(url: str) -> str:
    try:
        return (urlparse(url or "").hostname or "").lstrip("www.")
    except Exception:
        return (url or "").strip()


def _brand(website_url: str) -> str:
    host = _host(website_url)
    if not host:
        return "YourBrand"
    root = host.split(".")[0]
    return root[:1].upper() + root[1:] if root else "YourBrand"


def _schema_fix(category: str, page_url: str, website_url: str) -> dict:
    brand = _brand(website_url)
    host = _host(website_url)
    cat = (category or "").lower()
    markdown = {
        "Article": "Article",
        "faq": "FAQPage",
        "product": "Product",
        "service": "Service",
        "local": "LocalBusiness",
        "org": "Organization",
        "organization": "Organization",
        "person": "Person",
        "breadcrumb": "BreadcrumbList",
        "video": "VideoObject",
        "event": "Event",
        "review": "Review",
        "course": "Course",
        "recipe": "Recipe",
        "job": "JobPosting",
    }
    type_name = None
    for key, val in markdown.items():
        if key in cat:
            type_name = val
            break
    if not type_name:
        # Derive from the page type if we can't map the category.
        if "schema" in cat or "structured" in cat:
            type_name = "Article"
        else:
            type_name = "Organization"

    ld = {
        "@context": "https://schema.org",
        "@type": type_name,
        "name": brand,
        "url": website_url.rstrip("/"),
    }
    if type_name == "Article":
        ld = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Your compelling headline that contains the primary keyword",
            "author": {"@type": "Person", "name": "Author Name"},
            "publisher": {"@type": "Organization", "name": brand},
            "datePublished": "2025-01-01",
            "dateModified": "2025-01-01",
            "mainEntityOfPage": page_url,
        }
    elif type_name == "FAQPage":
        ld = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "Question one?",
                    "acceptedAnswer": {"@type": "Answer", "text": "Concise, direct answer."},
                },
                {
                    "@type": "Question",
                    "name": "Question two?",
                    "acceptedAnswer": {"@type": "Answer", "text": "Concise, direct answer."},
                },
            ],
        }
    elif type_name == "Product":
        ld = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Product Name",
            "image": "https://" + host + "/product-image.jpg",
            "description": "Short compelling product description.",
            "brand": {"@type": "Brand", "name": brand},
            "offers": {"@type": "Offer", "priceCurrency": "USD", "price": "49.00", "availability": "https://schema.org/InStock"},
        }
    elif type_name in ("LocalBusiness", "Service"):
        ld = {
            "@context": "https://schema.org",
            "@type": type_name,
            "name": brand,
            "url": website_url.rstrip("/"),
            "telephone": "+1-555-000-0000",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "123 Main St",
                "addressLocality": "City",
                "addressRegion": "ST",
                "postalCode": "00000",
                "addressCountry": "US",
            },
        }
    elif type_name == "Organization":
        ld = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": brand,
            "url": website_url.rstrip("/"),
            "logo": "https://" + host + "/logo.png",
            "sameAs": [
                "https://www.facebook.com/" + host,
                "https://www.linkedin.com/company/" + host,
            ],
        }

    html = '<script type="application/ld+json">\n' + json.dumps(ld, indent=2) + '\n</script>'
    return {
        "label": "Add Schema.org structured data",
        "why": "Structured data lets search engines and AI systems understand the page and is a key AEO/GEO citation-readiness signal.",
        "type": "jsonld",
        "filename": f"schema-{type_name.lower()}.jsonld",
        "code": html,
        "note": "Paste this into the page <head>. Replace placeholder values (names, URLs, dates, prices) with real data.",
    }


def _meta_fix(category: str, page: Page | None, brand: str) -> dict:
    cat = (category or "").lower()
    is_title = "title" in cat
    is_desc = ("description" in cat) or ("meta" in cat and "title" not in cat)
    current_title = (page.title if page else "") or "Current page title"
    current_meta = (page.meta_description if hasattr(page, "meta_description") and page.meta_description else "") or "Current meta description"
    if is_desc and not is_title and "title" not in cat:
        return {
            "label": "Rewrite the meta description",
            "why": "A compelling meta description lifts click-through rate, which feeds trust signals.",
            "type": "html",
            "filename": "meta-description.html",
            "before": current_meta,
            "after": "Discover how " + brand + " delivers measurable results. Concise, benefit-driven, with a call to action.",
            "code": '<meta name="description" content="Discover how {brand} delivers measurable results. Concise, benefit-driven, with a call to action." />'.format(brand=brand),
        }
    if "meta" in cat and "title" not in cat and "description" not in cat:
        return {
            "label": "Optimize page title & meta",
            "why": "Titles and meta set the search-snippet copy AI engines cite when summarizing a page.",
            "type": "html",
            "filename": "title-meta.html",
            "before": current_title,
            "after": f"{brand} — Clear Benefit | Primary Keyword",
            "code": "<title>{brand} — Clear Benefit | Primary Keyword</title>\n<meta name=\"description\" content=\"Discover how {brand} delivers measurable results.\" />".format(brand=brand),
        }
    return {
        "label": "Rewrite the <title> tag",
        "why": "The title drives CTR in both classic and AI-generated search results.",
        "type": "html",
        "filename": "title.html",
        "before": current_title,
        "after": f"{brand} — Clear Benefit | Primary Keyword",
        "code": "<title>{brand} — Clear Benefit | Primary Keyword</title>".format(brand=brand),
    }


def _heading_fix(page: Page | None, brand: str) -> dict:
    h1 = (page.h1 if page and getattr(page, "h1", None) else "") or "Your Page Heading"
    return {
        "label": "Restructure headings (H1 → H2/H3)",
        "why": "A clean heading hierarchy (one H1, logical H2/H3) is a direct AEO/answer-engine clarity signal.",
        "type": "html",
        "filename": "headings.html",
        "before": f"<h1>{h1}</h1>",
        "after": f"<h1>{h1}</h1>\n  <h2>Primary Sub-topic</h2>\n    <h3>Specific detail</h3>\n  <h2>Related Sub-topic</h2>\n    <h3>Specific detail</h3>",
        "code": f"<h1>{h1}</h1>\n  <h2>Primary Sub-topic</h2>\n    <h3>Specific detail</h3>\n  <h2>Related Sub-topic</h2>\n    <h3>Specific detail</h3>",
    }


def _text_fix(issue: Issue, brand: str) -> dict:
    return {
        "label": "Improve content & E-E-A-T",
        "why": "Adding statistics, author bylines, dates and direct answers makes content more citable by answer engines.",
        "type": "markdown",
        "filename": "content-fix.md",
        "code": (
            "# Content fix\n\n"
            f"**Page:** {issue.page_url or '(all)'}\n\n"
            "## 1. Add a byline + date\n"
            "`<span class='author'>Written by <a href='/about'>Author Name</a> · Updated {date}</span>`\n\n"
            "## 2. Add a statistic with a source\n"
            "> According to industry research, **X%** of visitors take action when clear data is present. [Source](https://example.com/research)\n\n"
            "## 3. Answer the primary question in the first paragraph\n"
            f"Lead with a direct one-sentence answer to the query a user typed, then expand — this is what AI engines paraphrase and cite.\n\n"
            f"## Suggested H2 sections\n"
            "- What is {brand}? \n- How it works \n- Results & evidence \n- FAQs"
        ),
    }


def _robots_fix(audit: Audit) -> dict:
    host = _host(audit.website_url or "")
    return {
        "label": "Add /llms.txt for AI crawlability",
        "why": "llms.txt is the single biggest free AEO win: it gives LLMs a machine-readable map of your site, directly boosting AI citation readiness.",
        "type": "text",
        "filename": "llms.txt",
        "code": (
            f"# {host}\n\n"
            f"> {host} — short, factual 2-3 sentence description of what the site is and who it's for.\n\n"
            "## Key pages\n\n"
            f"- [Home](https://{host}/): {host} overview and value proposition\n"
            f"- [About](https://{host}/about): who is behind {host}\n"
            f"- [Services](https://{host}/services): what {host} offers\n"
        ),
        "note": "Place at https://{host}/llms.txt as a plain-text file at the domain root.",
    }


@router.get("/issue/{issue_id}")
async def get_apply_fix(
    audit_id: str,
    issue_id: str,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    audit = (await db.execute(select(Audit).where(Audit.id == audit_id))).scalar_one_or_none()
    _audit_guard(audit, user)

    issue = (await db.execute(select(Issue).where(Issue.id == issue_id, Issue.audit_id == audit_id))).scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found for this audit")

    page = None
    if issue.page_url:
        page = (await db.execute(select(Page).where(Page.audit_id == audit_id, Page.url == issue.page_url))).scalar_one_or_none()

    brand = _brand(audit.website_url or "")
    cat = (issue.category or "") + " " + (issue.signal_name or "")

    fixes = []
    if any(k in cat.lower() for k in ("schema", "structured", "json-ld", "jsonld", "faq", "rich")):
        fixes.append(_schema_fix(cat, issue.page_url or "", audit.website_url or ""))
    if any(k in cat.lower() for k in ("title", "meta", "description", "duplicate title", "snippet")):
        fixes.append(_meta_fix(cat, page, brand))
    if any(k in cat.lower() for k in ("heading", "h1", "h2", "h3", "hierarchy", "structure")):
        fixes.append(_heading_fix(page, brand))
    if any(k in cat.lower() for k in ("robots", "llms", "crawl")):
        fixes.append(_robots_fix(audit))
    if any(k in cat.lower() for k in ("content", "e-e-a-t", "eeat", "thin", "depth", "keyword", "word")):
        fixes.append(_text_fix(issue, brand))

    # Always include a schema + meta candidate if nothing specific matched.
    if not fixes:
        fixes = [
            _schema_fix(cat, issue.page_url or "", audit.website_url or ""),
            _meta_fix(cat, page, brand),
            _heading_fix(page, brand),
        ]

    return {
        "audit_id": audit_id,
        "issue_id": issue_id,
        "signal_name": issue.signal_name,
        "category": issue.category,
        "severity": issue.severity,
        "fix_summary": issue.fix,
        "fix_snippets": fixes,
    }


@router.post("/issue/{issue_id}/dismiss")
async def dismiss_issue(
    audit_id: str,
    issue_id: str,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    audit = (await db.execute(select(Audit).where(Audit.id == audit_id))).scalar_one_or_none()
    _audit_guard(audit, user)
    issue = (await db.execute(select(Issue).where(Issue.id == issue_id, Issue.audit_id == audit_id))).scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found for this audit")
    issue.status = "dismissed"
    await db.commit()
    return {"status": "dismissed"}
