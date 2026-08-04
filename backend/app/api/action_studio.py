import json
import re
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models import Audit, Page, Issue, Recommendation, AuditScore, FixAction

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


def _projected_score(current, gained_points):
    current = float(current or 0.0)
    distance = max(0.0, 100.0 - current)
    return round(min(100.0, current + min(float(gained_points), distance) * 0.55), 1)


def _impact_plan(actions, current_score):
    diff_rank = {"EASY": 1, "MEDIUM": 2, "HARD": 3}
    ranked = sorted(
        actions,
        key=lambda a: (-a.get("est_points_gain", 0), diff_rank.get(a.get("difficulty"), 2)),
    )

    by_category = {}
    for a in actions:
        c = a.get("category") or "OTHER"
        entry = by_category.setdefault(c, {"count": 0, "points": 0.0, "critical_high": 0})
        entry["count"] += 1
        entry["points"] += a.get("est_points_gain", 0)
        if a.get("priority") in ("CRITICAL", "HIGH"):
            entry["critical_high"] += 1
    by_category = {
        k: {**v, "points": round(v["points"], 1)}
        for k, v in sorted(by_category.items(), key=lambda kv: -kv[1]["points"])
    }

    batches = []
    cumulative = 0.0
    top = ranked[:15]
    for i in range(0, len(top), 3):
        batch = top[i:i + 3]
        cumulative += sum(b.get("est_points_gain", 0) for b in batch)
        batches.append({
            "start": i + 1,
            "count": len(batch),
            "cumulative_points": round(cumulative, 1),
            "projected_score": _projected_score(current_score, cumulative),
            "actions": [{k: b.get(k) for k in ("issue_id", "what", "category", "priority", "difficulty", "page_url", "est_points_gain")} for b in batch],
        })

    total_points = round(sum(a.get("est_points_gain", 0) for a in actions), 1)
    return {
        "ranked": top,
        "by_category": by_category,
        "batches": batches,
        "total_points": total_points,
        "projected_score_full": _projected_score(current_score, total_points),
    }


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
    current_score = round(scores.overall_score, 1) if scores else 0

    return {
        "audit_id": audit_id,
        "summary": {
            "total_actions": len(actions),
            "by_severity": summary_counts,
            "est_total_points": round(total_gain, 1),
            "content_actions": content_count,
            "current_score": current_score,
            "ai_available": ai_available,
        },
        "actions": actions,
        "impact_plan": _impact_plan(actions, current_score),
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


def _norm_url(url: str) -> str:
    u = (url or "").strip()
    while u.endswith("/"):
        u = u[:-1]
    return u.lower()


@router.get("/audit/{audit_id}/fixes")
async def get_applied_fixes(audit_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FixAction).where(FixAction.audit_id == audit_id).order_by(FixAction.applied_at.desc())
    )
    return {
        "audit_id": audit_id,
        "fixes": [
            {
                "id": f.id,
                "issue_id": f.issue_id,
                "page_url": f.page_url,
                "signal_name": f.signal_name,
                "category": f.category,
                "severity": f.severity,
                "applied_at": f.applied_at.isoformat() if f.applied_at else None,
            }
            for f in result.scalars().all()
        ],
    }


@router.post("/audit/{audit_id}/fixes")
async def mark_fix_applied(audit_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON body")
    issue_id = (body.get("issue_id") or "").strip()
    if not issue_id:
        raise HTTPException(400, "issue_id is required")

    issue_result = await db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.audit_id == audit_id)
    )
    issue = issue_result.scalar_one_or_none()
    if not issue:
        raise HTTPException(404, "Issue not found")

    existing = await db.execute(
        select(FixAction).where(FixAction.audit_id == audit_id, FixAction.issue_id == issue_id)
    )
    found = existing.scalar_one_or_none()
    if not found:
        found = FixAction(
            audit_id=audit_id,
            issue_id=issue.id,
            page_url=issue.page_url or "",
            signal_name=issue.signal_name or "",
            category=(issue.category or "").upper(),
            severity=issue.severity or "LOW",
        )
        db.add(found)
        await db.commit()
        await db.refresh(found)

    return {
        "id": found.id,
        "issue_id": found.issue_id,
        "page_url": found.page_url,
        "signal_name": found.signal_name,
        "category": found.category,
        "severity": found.severity,
        "applied": True,
    }


@router.delete("/audit/{audit_id}/fixes/{fix_id}")
async def unmark_fix(audit_id: str, fix_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FixAction).where(FixAction.id == fix_id, FixAction.audit_id == audit_id)
    )
    fix = result.scalar_one_or_none()
    if not fix:
        raise HTTPException(404, "Applied fix not found")
    await db.delete(fix)
    await db.commit()
    return {"deleted": True}


@router.get("/audit/{audit_id}/fix-validation")
async def get_fix_validation(audit_id: str, db: AsyncSession = Depends(get_db)):
    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(404, "Audit not found")

    fixes_result = await db.execute(
        select(FixAction).where(FixAction.audit_id == audit_id)
    )
    fixes = fixes_result.scalars().all()

    newer = await db.execute(
        select(Audit)
        .where(Audit.website_url == audit.website_url, Audit.id != audit_id, Audit.status == "COMPLETED")
        .order_by(Audit.created_at.desc())
        .limit(1)
    )
    newer_audit = newer.scalar_one_or_none()

    async def _score_obj(aid):
        r = await db.execute(select(AuditScore).where(AuditScore.audit_id == aid))
        return r.scalar_one_or_none()

    current_scores = await _score_obj(audit_id)
    newer_scores = await _score_obj(newer_audit.id) if newer_audit else None

    items = []
    resolved = 0
    still_present = 0
    unchecked = 0
    if newer_audit:
        newer_issues = await db.execute(select(Issue).where(Issue.audit_id == newer_audit.id))
        present = {
            (_norm_url(i.page_url), (i.signal_name or "").lower())
            for i in newer_issues.scalars().all()
        }
        for fix in fixes:
            key = (_norm_url(fix.page_url), (fix.signal_name or "").lower())
            still = key in present
            status = "STILL_PRESENT" if still else "RESOLVED"
            if still:
                still_present += 1
            else:
                resolved += 1
            items.append({
                "id": fix.id,
                "issue_id": fix.issue_id,
                "page_url": fix.page_url,
                "signal_name": fix.signal_name,
                "category": fix.category,
                "severity": fix.severity,
                "applied_at": fix.applied_at.isoformat() if fix.applied_at else None,
                "status": status,
                "newer_audit_id": newer_audit.id,
            })
    else:
        unchecked = len(fixes)
        for fix in fixes:
            items.append({
                "id": fix.id,
                "issue_id": fix.issue_id,
                "page_url": fix.page_url,
                "signal_name": fix.signal_name,
                "category": fix.category,
                "severity": fix.severity,
                "applied_at": fix.applied_at.isoformat() if fix.applied_at else None,
                "status": "UNCHECKED",
                "newer_audit_id": None,
            })

    delta = None
    if newer_audit and newer_scores and current_scores:
        delta = round((newer_scores.overall_score or 0) - (current_scores.overall_score or 0), 1)

    return {
        "audit_id": audit_id,
        "applied_count": len(fixes),
        "resolved": resolved,
        "still_present": still_present,
        "unchecked": unchecked,
        "newer_audit_id": newer_audit.id if newer_audit else None,
        "newer_audit_created_at": newer_audit.created_at.isoformat() if newer_audit and newer_audit.created_at else None,
        "score_before": round(current_scores.overall_score, 1) if current_scores else None,
        "score_after": round(newer_scores.overall_score, 1) if newer_scores else None,
        "score_delta": delta,
        "items": items,
    }


@router.get("/audit/{audit_id}/impact-report")
async def get_impact_report(audit_id: str, db: AsyncSession = Depends(get_db)):
    """Forward-looking validated impact: fixes applied in the PREVIOUS audit, checked against this audit."""
    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(404, "Audit not found")

    prev = await db.execute(
        select(Audit)
        .where(Audit.website_url == audit.website_url, Audit.id != audit_id, Audit.status == "COMPLETED")
        .order_by(Audit.created_at.desc())
        .limit(1)
    )
    prev_audit = prev.scalar_one_or_none()

    async def _score_obj(aid):
        r = await db.execute(select(AuditScore).where(AuditScore.audit_id == aid))
        return r.scalar_one_or_none()

    current_scores = await _score_obj(audit_id)
    prev_scores = await _score_obj(prev_audit.id) if prev_audit else None

    items = []
    resolved = 0
    still_present = 0
    if prev_audit:
        fixes_result = await db.execute(
            select(FixAction).where(FixAction.audit_id == prev_audit.id)
        )
        fixes = fixes_result.scalars().all()
        current_issues = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
        present = {
            (_norm_url(i.page_url), (i.signal_name or "").lower())
            for i in current_issues.scalars().all()
        }
        for fix in fixes:
            key = (_norm_url(fix.page_url), (fix.signal_name or "").lower())
            still = key in present
            status = "STILL_PRESENT" if still else "RESOLVED"
            points = _est_points(fix.severity or "LOW", fix.severity or "LOW", "MEDIUM")
            if still:
                still_present += 1
            else:
                resolved += 1
            items.append({
                "fix_id": fix.id,
                "page_url": fix.page_url,
                "signal_name": fix.signal_name,
                "category": fix.category,
                "severity": fix.severity,
                "applied_at": fix.applied_at.isoformat() if fix.applied_at else None,
                "status": status,
                "est_points": points,
            })
    else:
        items = []

    validated_points = round(sum(it["est_points"] for it in items if it["status"] == "RESOLVED"), 1)
    score_before = round(prev_scores.overall_score, 1) if prev_scores else None
    score_after = round(current_scores.overall_score, 1) if current_scores else None
    score_delta = round(score_after - score_before, 1) if score_before is not None and score_after is not None else None

    return {
        "audit_id": audit_id,
        "website_url": audit.website_url,
        "previous_audit_id": prev_audit.id if prev_audit else None,
        "previous_created_at": prev_audit.created_at.isoformat() if prev_audit and prev_audit.created_at else None,
        "applied_count": len(items),
        "resolved": resolved,
        "still_present": still_present,
        "validated_points": validated_points,
        "score_before": score_before,
        "score_after": score_after,
        "score_delta": score_delta,
        "items": items,
    }


def _site_host(website_url: str) -> str:
    parsed = urlparse(website_url or "")
    return (parsed.netloc or (website_url or "").strip()).lower()


@router.get("/audit/{audit_id}/indexnow/status")
async def get_indexnow_status(audit_id: str, db: AsyncSession = Depends(get_db)):
    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(404, "Audit not found")
    host = _site_host(audit.website_url)

    fixes_result = await db.execute(select(FixAction).where(FixAction.audit_id == audit_id))
    applied_urls = sorted({f.page_url for f in fixes_result.scalars().all() if f.page_url})

    pages_result = await db.execute(select(Page.url).where(Page.audit_id == audit_id))
    page_urls = sorted({u for (u,) in pages_result.all() if u})

    return {
        "audit_id": audit_id,
        "configured": bool(settings.INDEXNOW_KEY),
        "host": host,
        "key": (settings.INDEXNOW_KEY[:4] + "…") if settings.INDEXNOW_KEY else "",
        "key_location": f"https://{host}/{settings.INDEXNOW_KEY}.txt" if settings.INDEXNOW_KEY and host else "",
        "applied_fix_urls": len(applied_urls),
        "total_page_urls": len(page_urls),
        "setup_help": "Set INDEXNOW_KEY (your IndexNow key) in backend env and place a text file at https://<host>/<key>.txt containing the key.",
    }


@router.post("/audit/{audit_id}/indexnow/push")
async def push_indexnow(audit_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    if not settings.INDEXNOW_KEY:
        return {
            "configured": False,
            "submitted": 0,
            "message": "Set INDEXNOW_KEY in backend env to push URLs to IndexNow.",
        }

    try:
        body = await request.json()
    except Exception:
        body = {}
    explicit = body.get("page_urls") or []
    if isinstance(explicit, str):
        explicit = [explicit]

    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(404, "Audit not found")
    host = _site_host(audit.website_url)

    if not explicit:
        fixes_result = await db.execute(select(FixAction).where(FixAction.audit_id == audit_id))
        explicit = sorted({f.page_url for f in fixes_result.scalars().all() if f.page_url})
    if not explicit:
        pages_result = await db.execute(select(Page.url).where(Page.audit_id == audit_id))
        explicit = sorted({u for (u,) in pages_result.all() if u})[:100]

    urls = [u for u in explicit if u and u.startswith(("http://", "https://"))][:100]
    if not urls:
        return {"configured": True, "submitted": 0, "urls": [], "message": "No URLs to push."}

    payload = {
        "host": host,
        "key": settings.INDEXNOW_KEY,
        "keyLocation": f"https://{host}/{settings.INDEXNOW_KEY}.txt",
        "urlList": urls,
    }
    try:
        import httpx
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post("https://api.indexnow.org/indexnow", json=payload)
        status_code = resp.status_code
        resp_text = (resp.text or "")[:200]
    except Exception as exc:
        return {"configured": True, "submitted": 0, "urls": [], "error": f"IndexNow request failed: {exc}"}

    if status_code == 200:
        return {"configured": True, "submitted": len(urls), "urls": urls, "host": host, "message": "Submitted to IndexNow successfully."}
    if status_code == 202:
        return {"configured": True, "submitted": len(urls), "urls": urls, "host": host, "message": "Accepted — some URLs may already be indexed."}
    return {"configured": True, "submitted": 0, "urls": [], "host": host, "error": f"IndexNow returned {status_code}: {resp_text}"}
