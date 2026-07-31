import json
import re
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Audit, Page, Issue, Recommendation, AuditScore

router = APIRouter(prefix="/api", tags=["action-studio"])

SEVERITY_POINTS = {"CRITICAL": 6, "HIGH": 4, "MEDIUM": 2, "LOW": 1}
IMPACT_MULT = {"HIGH": 1.25, "MEDIUM": 1.0, "LOW": 0.6}
CONTENT_CATS = {"CONTENT", "AEO", "GEO", "AI_SEARCH", "SEO", "ON-PAGE"}


def _location_for(issue, page):
    name = (issue.signal_name or "").lower()
    url = page.url if page else ""
    if not issue.signal_name:
        return url or ""
    signal = issue.signal_name.lower()
    if "title" in signal:
        return "In the <title> tag (inside <head>)"
    if "description" in signal or "meta" in signal:
        return 'In the <meta name="description"> tag (inside <head>)'
    if "h1" in signal:
        return "In the <h1> heading"
    if "heading" in signal or "h2" in signal or "h3" in signal:
        return "In the heading structure of the main content"
    if "image" in signal or "alt" in signal or "img" in signal:
        return "In an <img> tag (src / alt attribute)"
    if "schema" in signal or "structured data" in signal or "json-ld" in signal:
        return "In the JSON-LD structured data block"
    if "link" in signal or "anchor" in signal:
        return "In an internal/external <a> link"
    if "canonical" in signal:
        return 'In the <link rel="canonical"> tag'
    if "word" in signal or "content" in signal or "thin" in signal:
        return "In the main content body"
    if "url" in signal or "slug" in signal:
        return "In the page URL"
    if "speed" in signal or "response" in signal or "lcp" in signal or "time" in signal:
        return "In the page load / server response"
    if "index" in signal or "noindex" in signal or "robots" in signal:
        return 'In the <meta name="robots"> tag or robots.txt'
    if "open graph" in signal or "og:" in signal:
        return "In the Open Graph meta tags"
    return url or "On the page"


def _content_snippet(page, issue, span=220):
    if not page or not page.content_text:
        return ""
    text = page.content_text
    key = (issue.fix or issue.description or issue.signal_name or "")
    key = re.sub(r"\s+", " ", key).strip()
    head = re.sub(r"\s+", " ", (page.h1 or "")).strip()
    search_terms = [head] if len(head) > 3 else []
    if len(key) > 5:
        search_terms.append(key[:60])
    found = None
    for term in search_terms:
        idx = text.lower().find(term.lower())
        if idx >= 0:
            found = idx
            break
    if found is None:
        found = 0
    start = max(0, found - 40)
    snippet = text[start:start + span].strip()
    if len(text) > start + span:
        snippet += "..."
    if start > 0:
        snippet = "..." + snippet
    return snippet


def _est_points(severity, impact, difficulty):
    base = SEVERITY_POINTS.get(severity, 2)
    mult = IMPACT_MULT.get(impact, 1.0)
    diff = {"EASY": 1.0, "MEDIUM": 0.8, "HARD": 0.6}.get(difficulty, 0.8)
    return round(base * mult * diff, 1)


def _build_action(issue, page, rec):
    location = _location_for(issue, page)
    snippet = _content_snippet(page, issue)
    how_to_fix = rec.exact_fix if rec and rec.exact_fix else issue.fix
    before = rec.before_example if rec and rec.before_example else (issue.fix_code or "")
    after = rec.after_example if rec and rec.after_example else ""
    if not before and snippet:
        before = snippet
    if not after:
        after = ""
    return {
        "id": issue.id,
        "issue_id": issue.id,
        "priority": issue.severity,
        "category": (issue.category or "OTHER").upper(),
        "what": issue.signal_name or "Issue",
        "whats_wrong": issue.description or issue.root_cause or "",
        "why_it_matters": issue.impact or "",
        "page_url": issue.page_url or (page.url if page else ""),
        "page_title": page.title if page else "",
        "where": location,
        "content_snippet": snippet,
        "how_to_fix": how_to_fix or "",
        "before": before,
        "after": after,
        "difficulty": (rec.difficulty if rec and rec.difficulty else issue.effort) or "MEDIUM",
        "expected_impact": (rec.expected_impact if rec and rec.expected_impact else issue.severity) or "MEDIUM",
        "est_points_gain": _est_points(issue.severity, (rec.expected_impact if rec else "") or issue.severity, (rec.difficulty if rec else "") or issue.effort),
        "ai_generated": bool(rec.ai_generated if rec else False),
    }


@router.get("/audit/{audit_id}/action-studio")
async def get_action_studio(audit_id: str, db: AsyncSession = Depends(get_db)):
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id)
    )
    issues = issues_result.scalars().all()

    recs_result = await db.execute(
        select(Recommendation).where(Recommendation.audit_id == audit_id)
    )
    recs = recs_result.scalars().all()
    rec_by_url = {}
    for r in recs:
        rec_by_url.setdefault(r.page_url or "", []).append(r)

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = {p.url: p for p in pages_result.scalars().all()}

    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()

    actions = []
    for issue in issues:
        page = pages.get(issue.page_url or "")
        pool = rec_by_url.get(issue.page_url or "", [])
        rec = None
        for r in pool:
            if r.issue and issue.signal_name and r.issue.lower() in issue.signal_name.lower():
                rec = r
                break
            if r.issue and issue.signal_name and issue.signal_name.lower() in r.issue.lower():
                rec = r
                break
        if rec is None and pool:
            rec = pool[0]
        actions.append(_build_action(issue, page, rec))

    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    actions.sort(key=lambda a: (order.get(a["priority"], 9), -a["est_points_gain"]))
    actions = actions[:50]

    summary_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    total_gain = 0.0
    for a in actions:
        summary_counts[a["priority"]] = summary_counts.get(a["priority"], 0) + 1
        total_gain += a["est_points_gain"]

    from app.engine.dual_ai import PROVIDER_HEALTH
    ai_available = any(
        PROVIDER_HEALTH.get(n, {}).get("status") == "ok"
        for n in ("gemini", "gpt-4o", "groq", "cerebras")
    )

    content_count = sum(1 for a in actions if a["category"] in CONTENT_CATS)

    return {
        "audit_id": audit_id,
        "summary": {
            "total_actions": len(actions),
            "by_severity": summary_counts,
            "est_total_points": round(total_gain, 1),
            "content_actions": content_count,
            "current_score": round(scores.overall_score, 1) if scores else 0,
            "ai_available": ai_available,
        },
        "actions": actions,
    }


@router.post("/audit/{audit_id}/action-studio/generate-fix")
async def generate_action_fix(audit_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON body")
    issue_id = (body.get("issue_id") or body.get("action_id") or "").strip()
    if not issue_id:
        raise HTTPException(400, "issue_id is required")

    issue_result = await db.execute(select(Issue).where(Issue.id == issue_id, Issue.audit_id == audit_id))
    issue = issue_result.scalar_one_or_none()
    if not issue:
        raise HTTPException(404, "Issue not found")

    page = None
    if issue.page_url:
        page_result = await db.execute(
            select(Page).where(Page.audit_id == audit_id, Page.url == issue.page_url)
        )
        page = page_result.scalar_one_or_none()

    content = (page.content_text or "")[:3500] if page else ""
    title = page.title or "" if page else ""

    sys_prompt = (
        "You are a senior SEO/AEO/GEO engineer. Fix ONE specific issue on a page. "
        "Use ONLY the data provided. Never invent URLs, traffic, or rankings. "
        'Return ONLY valid JSON: {"what":"...","where":"...","before":"exact current code/text being fixed","after":"exact replacement to use","explanation":"why this fixes it"}'
    )
    user_prompt = (
        f"Issue: {issue.signal_name}\n"
        f"What's wrong: {issue.description}\n"
        f"Why it matters: {issue.impact}\n"
        f"Category: {issue.category}\n"
        f"Page URL: {issue.page_url}\n"
        f"Page title: {title}\n"
        f"Content of page:\n{content[:2000]}"
    )

    from app.engine.dual_ai import _run_all
    merged = await _run_all(sys_prompt, user_prompt, 1500, task="rewrite")
    providers_used = merged.get("providers_used", [])

    text = ""
    for key in ("fix", "response", "result", "content"):
        if isinstance(merged.get(key), str):
            text = merged[key]
            break
    if not text:
        text = merged.get("text", "") or ""

    parsed = None
    if text:
        try:
            parsed = json.loads(text)
        except Exception:
            m = re.search(r"\{.*\}", text, re.S)
            if m:
                try:
                    parsed = json.loads(m.group(0))
                except Exception:
                    parsed = None

    if parsed and isinstance(parsed, dict) and parsed.get("after"):
        return {
            "generated": True,
            "providers": providers_used,
            "what": parsed.get("what") or issue.signal_name,
            "where": parsed.get("where") or _location_for(issue, page),
            "before": parsed.get("before") or (issue.fix_code or ""),
            "after": parsed.get("after"),
            "explanation": parsed.get("explanation") or "",
        }

    return {
        "generated": False,
        "providers": providers_used,
        "what": issue.signal_name,
        "where": _location_for(issue, page),
        "before": issue.fix_code or (page.content_text or "")[:200] if page else "",
        "after": issue.fix or "",
        "explanation": "Live AI was unavailable, so this is the rule-based fix captured during the audit.",
    }
