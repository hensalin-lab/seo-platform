import json
import re
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Audit, Page, Issue, AuditScore, CompetitorData, Recommendation

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


async def _top_pages(db, audit_id, limit=None, gsc_property=None):
    """Rank every crawlable page (>=30 words) by issue weight and traffic potential.

    The old implementation hard-capped the pool to the top 8 pages, so pages ranked
    lower by issue-count never got a Rank Boost / GEO kit generated. This version:

    * returns ALL pages unless an explicit ``limit`` is given,
    * ranks by real GSC traffic potential (clicks/impressions) first when GSC is
      wired up, then by issue weight and word count,
    * tags each page with its GSC traffic so the UI can show why it was prioritized.
    """
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

    traffic = {}
    if gsc_property:
        try:
            from app.engine.gsc_engine import GSCEngine
            gsc_eng = GSCEngine()
            if gsc_eng.available:
                for row in gsc_eng.get_page_performance(gsc_property, days=28):
                    traffic[(row.get("page") or "").rstrip("/")] = {
                        "clicks": row.get("clicks", 0) or 0,
                        "impressions": row.get("impressions", 0) or 0,
                        "ctr": row.get("ctr", 0) or 0,
                        "position": row.get("position", 0) or 0,
                    }
        except Exception:
            traffic = {}

    ranked = []
    for p in pages:
        key = by_url.get(p.url or "", {})
        content_len = len((p.content_text or "").split())
        if content_len < 30:
            continue
        t = traffic.get((p.url or "").rstrip("/")) or {}
        ranked.append({
            "idx": len(ranked),
            "url": p.url,
            "title": p.title or "",
            "h1": p.h1 or "",
            "word_count": p.word_count or content_len,
            "issue_count": key.get("issues", 0),
            "issue_weight": key.get("weight", 0),
            "traffic": t,
            "gsc_available": bool(traffic),
        })
    ranked.sort(key=lambda p: (
        -p["traffic"].get("clicks", 0),
        -p["issue_weight"],
        -p["word_count"],
    ))
    return ranked if limit is None else ranked[:limit]


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


def _merged_artifacts(merged):
    """Return the merged artifact dict from _run_all if it actually contains AI output."""
    if not isinstance(merged, dict):
        return None
    artifact_keys = ("answer_snippet", "faq_pairs", "faq_schema", "title_rewrite",
                     "meta_rewrite", "h2_rewrites", "llm_intro", "projection",
                     "narrative", "top_3_moves", "timeframe")
    if any(k in merged for k in artifact_keys):
        return merged
    return None


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
async def get_rank_boost(audit_id: str, limit: int | None = None, db: AsyncSession = Depends(get_db)):
    cache_key = _cache_key("pages", audit_id, 0)
    cached = _get_cached(cache_key)
    if cached:
        return cached

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(404, "Audit not found")

    pages = await _top_pages(db, audit_id, limit=limit, gsc_property=audit.gsc_property or audit.website_url)

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
        "total_pages": len(pages),
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
    limit = body.get("limit")
    limit = None if limit is None else int(limit)

    cache_key = _cache_key("artifacts", audit_id, page_idx if page_idx is not None else -1)
    cached = _get_cached(cache_key, ttl=7200)
    if cached:
        return cached

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(404, "Audit not found")

    pages = await _top_pages(db, audit_id, limit=limit, gsc_property=audit.gsc_property or audit.website_url)
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
        'Return ONLY valid JSON with EXACTLY this structure (be concise, keep total under 1400 tokens):\n'
        '{\n'
        '  "answer_snippet": "40-50 word definitive definition-style answer that directly answers the pages primary question, entity-dense, self-contained, citable",\n'
        '  "faq_pairs": [{"question": "...", "answer": "1-2 sentence definitive answer"}],\n'
        '  "faq_schema": "valid compact JSON-LD string for a FAQPage with the above Q&A pairs (minified, no code fences)",\n'
        '  "title_rewrite": {"before": "...", "after": "...", "reason": "8 words max"},\n'
        '  "meta_rewrite": {"before": "...", "after": "max 155 chars with keyword front-loaded", "reason": "8 words max"},\n'
        '  "h2_rewrites": [{"before": "current H2", "after": "question-form H2 that matches how people ask AI", "reason": "8 words max"}],\n'
        '  "llm_intro": {"before": "first paragraph", "after": "rewritten intro that states topic + entities + data in first 2 sentences", "reason": "8 words max"},\n'
        '  "projection": {"citation_current": 0, "citation_projected": 0, "page_score_current": 0, "page_score_projected": 0}\n'
        '}\n'
        "CRITICAL RULES: faq_schema must be a plain JSON string (already serialized). Exactly 3 FAQ pairs. "
        "Max 3 H2 rewrites. Every before/after must use the actual current text from the page, not placeholders."
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
    merged = await _run_all(sys_prompt, user_prompt, 3000, task="rewrite", timeout=75)
    providers_used = merged.get("providers_used", [])

    parsed = _merged_artifacts(merged)
    if not parsed:
        resp = _fallback_artifacts(page)
        resp["page"] = page
        resp["providers"] = providers_used
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

    proj_cur_cit = projection.get("citation_current", 40) or 40
    proj_cur_score = projection.get("page_score_current", 55) or 55
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
            "citation_current": proj_cur_cit,
            "citation_projected": max(projection.get("citation_projected", 65) or 65, proj_cur_cit),
            "page_score_current": proj_cur_score,
            "page_score_projected": max(projection.get("page_score_projected", 75) or 75, proj_cur_score),
        },
        "page": page,
    }
    _set_cached(cache_key, resp)
    return resp


def _grade(readiness):
    if readiness >= 90:
        return {"grade": "S", "label": "Rank #1 ready", "color": "#099268"}
    if readiness >= 75:
        return {"grade": "A", "label": "Close — finish the top fixes", "color": "#12b886"}
    if readiness >= 60:
        return {"grade": "B", "label": "On track — keep fixing", "color": "#f59f00"}
    if readiness >= 40:
        return {"grade": "C", "label": "Lots of upside left", "color": "#fd7e14"}
    return {"grade": "D", "label": "Early days — fix criticals first", "color": "#fa5252"}


@router.get("/audit/{audit_id}/win-proof")
async def get_win_proof(audit_id: str, db: AsyncSession = Depends(get_db)):
    cache_key = _cache_key("winproof", audit_id, 0)
    cached = _get_cached(cache_key, ttl=600)
    if cached:
        return cached

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(404, "Audit not found")

    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()

    your = {
        "overall": round(scores.overall_score, 1) if scores else 0,
        "seo": round(scores.seo_score, 1) if scores else 0,
        "technical": round(scores.technical_score, 1) if scores else 0,
        "aeo": round(scores.aeo_score, 1) if scores else 0,
        "geo": round(scores.geo_score, 1) if scores else 0,
        "content": round(scores.content_score, 1) if scores else 0,
        "ai_visibility": round(scores.ai_visibility_score, 1) if scores else 0,
    }

    comp_result = await db.execute(select(CompetitorData).where(CompetitorData.audit_id == audit_id))
    comp = comp_result.scalar_one_or_none()

    competitor = {
        "has_competitor": bool(comp and comp.competitor_url),
        "url": comp.competitor_url if comp else "",
        "scores": None,
        "winning_strategy": (comp.winning_strategy if comp else []) or [],
        "weaknesses": (comp.weaknesses if comp else []) or [],
        "seo_comparison": (comp.seo_comparison if comp else {}) or {},
    }

    if comp and comp.competitor_url:
        comp_audit = await db.execute(select(Audit).where(Audit.website_url == comp.competitor_url))
        ca = comp_audit.scalar_one_or_none()
        if ca:
            cs = await db.execute(select(AuditScore).where(AuditScore.audit_id == ca.id))
            cs_obj = cs.scalar_one_or_none()
            if cs_obj:
                competitor["scores"] = {
                    "overall": round(cs_obj.overall_score, 1) if cs_obj.overall_score else 0,
                    "seo": round(cs_obj.seo_score, 1) if cs_obj.seo_score else 0,
                    "technical": round(cs_obj.technical_score, 1) if cs_obj.technical_score else 0,
                    "aeo": round(cs_obj.aeo_score, 1) if cs_obj.aeo_score else 0,
                    "geo": round(cs_obj.geo_score, 1) if cs_obj.geo_score else 0,
                    "content": round(cs_obj.content_score, 1) if cs_obj.content_score else 0,
                    "ai_visibility": round(cs_obj.ai_visibility_score, 1) if cs_obj.ai_visibility_score else 0,
                }

    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    all_issues = issues_result.scalars().all()
    issue_count = len(all_issues)
    critical_count = sum(1 for i in all_issues if i.severity == "CRITICAL")
    high_count = sum(1 for i in all_issues if i.severity == "HIGH")

    recs = []
    rec_result = await db.execute(
        select(Recommendation).where(Recommendation.audit_id == audit_id)
    )
    for r in rec_result.scalars().all():
        recs.append(r)

    pages = []
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    page_map = {p.url: p for p in pages_result.scalars().all()}

    from app.api.action_studio import _build_action
    actions = []
    for i in all_issues:
        page = page_map.get(i.page_url or "")
        rec = None
        for r in recs:
            if r.page_url == (i.page_url or ""):
                rec = r
                break
        actions.append(_build_action(i, page, rec))
    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    actions.sort(key=lambda a: (order.get(a["priority"], 9), -a["est_points_gain"]))
    actions = actions[:50]
    est_total_points = round(sum(a["est_points_gain"] for a in actions), 1)
    top_moves = actions[:5]

    current = your["overall"]
    distance = max(0, 100 - current)
    projected = min(100.0, round(current + min(est_total_points, distance) * 0.55, 1))
    readiness = round(current + est_total_points * 0.55, 1)
    grade = _grade(readiness)

    gsc = {"available": False, "total_keywords": 0, "avg_position": None, "top_keywords": []}
    try:
        if audit.gsc_property or audit.website_url:
            from app.engine.gsc_engine import GSCEngine
            gsc_eng = GSCEngine()
            if gsc_eng.available:
                top_kw = gsc_eng.get_top_queries(audit.gsc_property or audit.website_url, days=28, limit=10)
                if top_kw:
                    positions = [k.get("position") for k in top_kw if k.get("position")]
                    gsc = {
                        "available": True,
                        "total_keywords": len(top_kw),
                        "avg_position": round(sum(positions) / len(positions), 1) if positions else None,
                        "top_keywords": top_kw[:10],
                    }
    except Exception:
        pass

    from app.engine.dual_ai import PROVIDER_HEALTH
    ai_available = any(PROVIDER_HEALTH.get(n, {}).get("status") == "ok" for n in ("gemini", "groq", "gpt-4o", "cerebras"))

    resp = {
        "audit_id": audit_id,
        "domain": audit.website_url,
        "your_scores": your,
        "current_score": current,
        "projected_score": projected,
        "points_available": est_total_points,
        "issues": {"total": issue_count, "critical": critical_count, "high": high_count},
        "rank_readiness": {"score": round(readiness, 1), **grade},
        "distance_to_100": round(distance, 1),
        "competitor": competitor,
        "gsc": gsc,
        "top_moves": [{k: a.get(k) for k in ("id", "priority", "category", "what", "page_url", "where", "how_to_fix", "est_points_gain")} for a in top_moves],
        "ai_available": ai_available,
        "has_ai_narrative": False,
    }
    _set_cached(cache_key, resp)
    return resp


@router.post("/audit/{audit_id}/win-proof/generate")
async def generate_win_proof(audit_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        await request.json()
    except Exception:
        pass

    cache_key = _cache_key("winproofai", audit_id, 0)
    cached = _get_cached(cache_key, ttl=3600)
    if cached:
        return cached

    base = await get_win_proof(audit_id, db)

    comp_text = ""
    if base["competitor"]["has_competitor"]:
        comp_text = (
            f"Competitor: {base['competitor']['url']}\n"
            f"Competitor winning strategy: {json.dumps(base['competitor']['winning_strategy'][:5], ensure_ascii=False)}\n"
            f"Competitor weaknesses: {json.dumps(base['competitor']['weaknesses'][:5], ensure_ascii=False)}"
        )
    moves_text = "\n".join(
        f"- [{m['priority']}] {m['what']} on {m['page_url']} (+{m['est_points_gain']} pts)"
        for m in base["top_moves"]
    )

    sys_prompt = (
        "You are a ranking strategist. Build a tight, confident 'Path to Rank #1' plan from the data given. "
        "Use ONLY the data provided. Never invent rankings, traffic or keywords. "
        'Return ONLY valid JSON: {"narrative": "3-4 sentence strategy summary", '
        '"top_3_moves": [{"move": "one concrete action", "why": "why this moves rankings", "impact": "HIGH|MEDIUM"}], '
        '"timeframe": "how long to reach #1, based on effort"}'
    )
    user_prompt = (
        f"Domain: {base['domain']}\n"
        f"Current score: {base['current_score']}/100, projected after fixing top 50: {base['projected_score']}\n"
        f"Issues: {base['issues']['total']} total, {base['issues']['critical']} critical, {base['issues']['high']} high\n"
        f"Your weakest categories:\n"
        f"{json.dumps({k: v for k, v in sorted(base['your_scores'].items(), key=lambda x: x[1])[:3]}, ensure_ascii=False)}\n"
        f"Top moves (est. points):\n{moves_text}\n"
        f"{comp_text}"
    )

    from app.engine.dual_ai import _run_all
    merged = await _run_all(sys_prompt, user_prompt, 2000, task="rewrite", timeout=75)
    providers = merged.get("providers_used", [])
    parsed = _merged_artifacts(merged)

    narrative = ""
    top_3 = []
    timeframe = ""
    if parsed and isinstance(parsed, dict):
        narrative = parsed.get("narrative") or ""
        top_3 = parsed.get("top_3_moves") or []
        if isinstance(top_3, list):
            top_3 = [m for m in top_3 if isinstance(m, dict) and m.get("move")][:3]
        timeframe = parsed.get("timeframe") or ""

    resp = {**base, "has_ai_narrative": bool(narrative), "ai_narrative": narrative, "ai_top_moves": top_3, "ai_timeframe": timeframe, "providers": providers}
    _set_cached(cache_key, resp)
    return resp
