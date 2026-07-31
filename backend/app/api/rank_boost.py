import json
import re
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Audit, Page, Issue, AuditScore

router = APIRouter(prefix="/api", tags=["rank-boost"])

_cache = {}


def _cache_key(kind, audit_id, page_idx):
    return f"rank_boost:{kind}:{audit_id}:{page_idx}"


def _get_cached(key, ttl=3600):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    return None


def _set_cached(key, value):
    _cache[key] = (time.time(), value)


async def _top_pages(db, audit_id, limit=8):
    issues_result = await db.execute(
        select(Issue.page_url, Issue.severity, func.count(Issue.id).label("n"))
        .where(Issue.audit_id == audit_id)
        .group_by(Issue.page_url, Issue.severity)
    )
    rows = issues_result.all()
    weights = {"CRITICAL": 6, "HIGH": 4, "MEDIUM": 2, "LOW": 1}
    by_url = {}
    for url, severity, n in rows:
        u = url or ""
        by_url.setdefault(u, {"issues": 0, "weight": 0})
        by_url[u]["issues"] += n
        by_url[u]["weight"] += n * weights.get(severity, 1)

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    ranked = []
    for p in pages:
        key = by_url.get(p.url or "", {})
        content_len = len((p.content_text or "").split())
        if content_len < 30:
            continue
        ranked.append({
            "idx": len(ranked),
            "url": p.url,
            "title": p.title or "",
            "h1": p.h1 or "",
            "word_count": p.word_count or content_len,
            "issue_count": key.get("issues", 0),
            "issue_weight": key.get("weight", 0),
        })
    ranked.sort(key=lambda p: (-p["issue_weight"], -p["word_count"]))
    return ranked[:limit]


def _pick_page(pages, page_idx):
    if not pages:
        raise HTTPException(404, "No pages with content found for this audit")
    if page_idx is None or page_idx < 0 or page_idx >= len(pages):
        return pages[0]
    return pages[page_idx]


def _parse_json(text):
    if not text:
        return None
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    m = re.search(r"\{.*\}", text, re.S)
    if m:
        try:
            parsed = json.loads(m.group(0))
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return None


def _extract_text(merged):
    for key in ("fix", "response", "result", "content"):
        if isinstance(merged.get(key), str):
            return merged[key]
    return merged.get("text", "") or ""


def _fallback_artifacts(page):
    return {
        "generated": False,
        "answer_snippet": "",
        "faq_pairs": [],
        "faq_schema": "",
        "title_rewrite": None,
        "meta_rewrite": None,
        "h2_rewrites": [],
        "llm_intro": None,
        "projection": {"citation_current": 40, "citation_projected": 65, "page_score_current": 55, "page_score_projected": 72},
    }


@router.get("/audit/{audit_id}/rank-boost")
async def get_rank_boost(audit_id: str, db: AsyncSession = Depends(get_db)):
    cache_key = _cache_key("pages", audit_id, 0)
    cached = _get_cached(cache_key)
    if cached:
        return cached

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(404, "Audit not found")

    pages = await _top_pages(db, audit_id)

    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()

    issue_count = 0
    aeo_geo_count = 0
    cat_counts = {}
    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    for i in issues_result.scalars().all():
        issue_count += 1
        cat = (i.category or "OTHER").upper()
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
        if cat in ("AEO", "GEO", "AI_SEARCH", "CONTENT"):
            aeo_geo_count += 1

    from app.engine.dual_ai import PROVIDER_HEALTH
    ai_available = any(
        PROVIDER_HEALTH.get(n, {}).get("status") == "ok"
        for n in ("gemini", "groq", "gpt-4o", "cerebras")
    )

    resp = {
        "audit_id": audit_id,
        "domain": audit.website_url or (pages[0]["url"] if pages else ""),
        "current_score": round(scores.overall_score, 1) if scores else 0,
        "total_issues": issue_count,
        "aeo_geo_issues": aeo_geo_count,
        "category_counts": cat_counts,
        "ai_available": ai_available,
        "pages": pages,
    }
    _set_cached(cache_key, resp)
    return resp


@router.post("/audit/{audit_id}/rank-boost/generate")
async def generate_rank_boost(audit_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    page_idx = body.get("page_idx")
    page_idx = page_idx if page_idx is None else int(page_idx)

    cache_key = _cache_key("artifacts", audit_id, page_idx if page_idx is not None else -1)
    cached = _get_cached(cache_key, ttl=7200)
    if cached:
        return cached

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(404, "Audit not found")

    pages = await _top_pages(db, audit_id)
    page = _pick_page(pages, page_idx)

    page_result = await db.execute(
        select(Page).where(Page.audit_id == audit_id, Page.url == page["url"])
    )
    full = page_result.scalar_one_or_none()
    content = (full.content_text or "")[:4000] if full else ""
    h1 = full.h1 or "" if full else ""
    title = full.title or "" if full else ""
    meta = full.meta_description or "" if full else ""

    sys_prompt = (
        "You are a world-class AEO (Answer Engine Optimization) and GEO (Generative Engine Optimization) "
        "specialist. Your output must help this page get cited by Google AI Overviews, ChatGPT, Perplexity, "
        "Gemini and Bing Copilot. Use ONLY the page data provided. Never invent URLs, traffic or rankings.\n"
        'Return ONLY valid JSON with EXACTLY this structure:\n'
        '{\n'
        '  "answer_snippet": "45-60 word definitive definition-style answer that directly answers the pages primary question, entity-dense, self-contained, citable",\n'
        '  "faq_pairs": [{"question": "...", "answer": "definitive 2-3 sentence answer"}],\n'
        '  "faq_schema": "valid JSON-LD string for a FAQPage with the above Q&A pairs, as compact JSON (no code fences)",\n'
        '  "title_rewrite": {"before": "...", "after": "...", "reason": "..."},\n'
        '  "meta_rewrite": {"before": "...", "after": "max 155 chars with keyword front-loaded", "reason": "..."},\n'
        '  "h2_rewrites": [{"before": "current H2", "after": "question-form H2 that matches how people ask AI", "reason": "..."}],\n'
        '  "llm_intro": {"before": "first paragraph", "after": "rewritten intro that states topic + entities + data in first 2 sentences", "reason": "..."},\n'
        '  "projection": {"citation_current": 0, "citation_projected": 0, "page_score_current": 0, "page_score_projected": 0}\n'
        '}\n'
        "CRITICAL RULES: faq_schema must be a plain JSON string (already serialized). 5-8 FAQ pairs. "
        "Every before/after must use the actual current text from the page, not placeholders."
    )
    user_prompt = (
        f"URL: {page['url']}\n"
        f"Title: {title}\n"
        f"H1: {h1}\n"
        f"Meta Description: {meta}\n"
        f"Word count: {page['word_count']}\n\n"
        f"Page content (first 2000 chars):\n{content[:2000]}"
    )

    from app.engine.dual_ai import _run_all
    merged = await _run_all(sys_prompt, user_prompt, 3000, task="rewrite")
    providers_used = merged.get("providers_used", [])

    parsed = _parse_json(_extract_text(merged))
    if not parsed:
        resp = _fallback_artifacts(page)
        resp["page"] = page
        resp["providers"] = providers_used
        _set_cached(cache_key, resp)
        return resp

    faq_pairs = parsed.get("faq_pairs") or []
    if isinstance(faq_pairs, list):
        faq_pairs = [fp for fp in faq_pairs if isinstance(fp, dict) and fp.get("question")]

    faq_schema = parsed.get("faq_schema")
    if isinstance(faq_schema, (dict, list)):
        try:
            faq_schema = json.dumps(faq_schema, ensure_ascii=False)
        except Exception:
            faq_schema = None
    if isinstance(faq_schema, str):
        faq_schema = faq_schema.strip()
        if faq_schema.startswith("```"):
            faq_schema = re.sub(r"^```(?:json)?\s*|\s*```$", "", faq_schema)
        try:
            json.loads(faq_schema)
        except Exception:
            faq_schema = ""

    h2_rewrites = parsed.get("h2_rewrites") or []
    if isinstance(h2_rewrites, list):
        h2_rewrites = [h for h in h2_rewrites if isinstance(h, dict) and h.get("after")]

    projection = parsed.get("projection") or {}
    if not isinstance(projection, dict):
        projection = {}

    def _pair(key):
        v = parsed.get(key)
        if isinstance(v, dict):
            return {"before": v.get("before") or "", "after": v.get("after") or "", "reason": v.get("reason") or ""}
        return None

    resp = {
        "generated": True,
        "providers": providers_used,
        "answer_snippet": parsed.get("answer_snippet") or "",
        "faq_pairs": faq_pairs[:8],
        "faq_schema": faq_schema or "",
        "title_rewrite": _pair("title_rewrite"),
        "meta_rewrite": _pair("meta_rewrite"),
        "h2_rewrites": h2_rewrites[:6],
        "llm_intro": _pair("llm_intro"),
        "projection": {
            "citation_current": projection.get("citation_current", 40) or 40,
            "citation_projected": projection.get("citation_projected", 65) or 65,
            "page_score_current": projection.get("page_score_current", 55) or 55,
            "page_score_projected": projection.get("page_score_projected", 75) or 75,
        },
        "page": page,
    }
    _set_cached(cache_key, resp)
    return resp
