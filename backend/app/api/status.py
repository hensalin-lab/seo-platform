import logging
import json
import datetime as _dt
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import (
    Audit, Page, Issue, Recommendation, CompetitorData,
    AuditScore, PageAnalysisRecord, KeywordRecord, RoadmapRecord,
    ChatMessage, KeywordData, ContentData, AIVisibilityData,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["status"])

# In-memory cache for expensive endpoint results
_endpoint_cache = {}
_CACHE_TTL = 600  # 10 minutes

def _cache_get(key):
    import time
    entry = _endpoint_cache.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None

def _cache_set(key, data):
    import time
    _endpoint_cache[key] = {"data": data, "ts": time.time()}

def _cache_clear(audit_id=None):
    if audit_id:
        keys_to_del = [k for k in _endpoint_cache if audit_id in k]
        for k in keys_to_del:
            del _endpoint_cache[k]
    else:
        _endpoint_cache.clear()


class PageAdapter:
    def __init__(self, page):
        self._page = page
        self.url = page.url
        self.title = page.title or ""
        self.meta_description = page.meta_description or ""
        self.canonical = page.canonical or ""
        self.h1 = page.h1 or ""
        self.content_text = page.content_text or ""
        self.word_count = page.word_count or 0
        self.html_raw = page.html_raw or ""
        self.headings = page.headers or []
        self.images = page.images or []
        self.links_internal = page.links_internal or []
        self.links_external = page.links_external or []
        self.schema_markup = page.schema_markup or []
        self.open_graph = page.open_graph or {}
        self.twitter_card = page.twitter_card or {}
        self.status_code = page.status_code or 200
        self.crawl_depth = page.crawl_depth or 0
        self.response_time_ms = page.response_time_ms or 0
        self.page_type = getattr(page, 'page_type', '') or ""
        self.headers = getattr(page, 'headers', []) or []
        self.signals = getattr(page, 'signals', {}) or {}
        self.context_issues = getattr(page, 'context_issues', []) or []

    def get(self, key, default=None):
        return getattr(self, key, default)


@router.get("/audit/status/{audit_id}")
async def get_audit_status(audit_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return {
        "audit_id": audit.id, "status": audit.status, "progress": audit.progress,
        "current_step": audit.current_step, "message": audit.current_step,
        "error_message": audit.error_message,
        "created_at": audit.created_at.isoformat() if audit.created_at else None,
        "completed_at": audit.completed_at.isoformat() if audit.completed_at else None,
    }


@router.get("/audit/{audit_id}")
async def get_audit_detail(audit_id: str, db: AsyncSession = Depends(get_db)):
    cache_key = f"audit_detail:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    score_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = score_result.scalar_one_or_none()

    pages_result = await db.execute(
        select(Page.id, Page.url, Page.status_code, Page.title, Page.meta_description,
               Page.word_count, Page.h1, Page.canonical, Page.links_internal,
               Page.links_external, Page.images, Page.schema_markup, Page.response_time_ms,
               Page.page_type)
        .where(Page.audit_id == audit_id).limit(200)
    )
    pages = pages_result.all()

    resp = {
        "audit_id": audit.id, "website_url": audit.website_url, "competitor_url": audit.competitor_url,
        "status": audit.status, "progress": audit.progress,
        "created_at": audit.created_at.isoformat() if audit.created_at else None,
        "completed_at": audit.completed_at.isoformat() if audit.completed_at else None,
        "scores": {
            "overall_score": scores.overall_score if scores else 0,
            "seo_score": scores.seo_score if scores else 0,
            "technical_score": scores.technical_score if scores else 0,
            "aeo_score": scores.aeo_score if scores else 0,
            "geo_score": scores.geo_score if scores else 0,
            "content_score": scores.content_score if scores else 0,
            "ai_visibility_score": scores.ai_visibility_score if scores else 0,
            "signals": scores.signals if scores else {},
        } if scores else None,
        "pages": [{
            "url": p.url, "status_code": p.status_code, "title": p.title,
            "meta_description": p.meta_description, "word_count": p.word_count,
            "h1": p.h1, "canonical": p.canonical,
            "links_internal_count": len(p.links_internal or []) if isinstance(p.links_internal, (list, dict)) else 0,
            "links_external_count": len(p.links_external or []) if isinstance(p.links_external, (list, dict)) else 0,
            "images_count": len(p.images or []) if isinstance(p.images, (list, dict)) else 0,
            "schema_count": len(p.schema_markup or []) if isinstance(p.schema_markup, (list, dict)) else 0,
            "response_time_ms": p.response_time_ms,
        } for p in pages],
        "total_pages": len(pages),
    }
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/issues")
async def get_audit_issues(audit_id: str, category: str = None, severity: str = None, offset: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    query = select(Issue).where(Issue.audit_id == audit_id)
    count_query = select(func.count()).select_from(Issue).where(Issue.audit_id == audit_id)
    if category:
        query = query.where(Issue.category == category)
        count_query = count_query.where(Issue.category == category)
    if severity:
        query = query.where(Issue.severity == severity)
        count_query = count_query.where(Issue.severity == severity)
    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Issue.detected_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return {
        "items": [{
            "id": i.id, "page_url": i.page_url, "category": i.category, "severity": i.severity,
            "signal_id": i.signal_id, "signal_name": i.signal_name,
            "description": i.description, "impact": i.impact, "fix": i.fix,
        } for i in result.scalars().all()],
        "total": total, "offset": offset, "limit": limit,
    }


@router.get("/audit/{audit_id}/recommendations")
async def get_audit_recommendations(audit_id: str, offset: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    from app.engine.confidence_engine import RecommendationConfidenceEngine
    count_query = select(func.count()).select_from(Recommendation).where(Recommendation.audit_id == audit_id)
    total = (await db.execute(count_query)).scalar() or 0
    recs_result = await db.execute(
        select(Recommendation).where(Recommendation.audit_id == audit_id)
        .order_by(Recommendation.priority).offset(offset).limit(limit)
    )
    recs = recs_result.scalars().all()

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    pages_by_url = {p.url: p for p in pages}

    conf_engine = RecommendationConfidenceEngine()
    enriched = []
    for r in recs:
        page_obj = pages_by_url.get(r.page_url)
        page_dict = {}
        if page_obj:
            page_dict = {
                "title": page_obj.title or "", "meta_description": page_obj.meta_description or "",
                "h1": page_obj.h1 or "", "word_count": page_obj.word_count or 0,
                "content_text": page_obj.content_text or "", "images": page_obj.images or [],
                "links_internal": page_obj.links_internal or [], "headings": page_obj.headers or [],
                "response_time_ms": page_obj.response_time_ms or 0,
            }
        rec_dict = {"category": r.category or "", "issue": r.issue or "", "priority": r.priority or ""}
        enriched_rec = conf_engine.enrich_recommendations([rec_dict], page_dict)
        conf = enriched_rec[0] if enriched_rec else {}
        enriched.append({
            "id": r.id, "page_url": r.page_url, "category": r.category, "priority": r.priority,
            "issue": r.issue, "current_problem": r.current_problem,
            "why_it_matters": r.why_it_matters, "exact_fix": r.exact_fix,
            "before_example": r.before_example, "after_example": r.after_example,
            "suggested_content": r.suggested_content, "suggested_heading": r.suggested_heading,
            "keywords": r.keywords or [], "expected_impact": r.expected_impact,
            "difficulty": r.difficulty, "ai_generated": bool(r.ai_generated),
            "confidence": conf.get("confidence", 0),
            "confidence_tier": conf.get("confidence_tier", "UNCERTAIN"),
            "confidence_breakdown": conf.get("confidence_breakdown", {}),
            "evidence": conf.get("evidence", []),
        })
    return {"items": enriched, "total": total, "offset": offset, "limit": limit}


@router.get("/audit/{audit_id}/competitor")
async def get_competitor_data(audit_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    comp_result = await db.execute(select(CompetitorData).where(CompetitorData.audit_id == audit_id))
    comp = comp_result.scalar_one_or_none()

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    analysis = {}
    if pages:
        try:
            from app.engine.competitor_intelligence import CompetitorIntelligenceEngine
            from app.engine.crawler import PageData
            engine = CompetitorIntelligenceEngine()
            best_page = max(pages, key=lambda p: p.word_count or 0)
            pa = PageAdapter(best_page)
            comp_url = comp.competitor_url if comp and comp.competitor_url else ""
            analysis = engine.analyze(pa, [comp_url] if comp_url else [])
        except Exception:
            analysis = {}

    return {
        "competitor_url": comp.competitor_url if comp else "",
        "keyword_opportunities": (comp.keyword_opportunities if comp else []) or [],
        "content_opportunities": (comp.content_opportunities if comp else []) or [],
        "entity_gaps": (comp.entity_gaps if comp else []) or [],
        "topic_gaps": (comp.topic_gaps if comp else []) or [],
        "seo_comparison": (comp.seo_comparison if comp else {}) or {},
        "strengths": (comp.strengths if comp else []) or [],
        "weaknesses": (comp.weaknesses if comp else []) or [],
        "winning_strategy": (comp.winning_strategy if comp else []) or [],
        "backlink_gap": (comp.backlink_gap if comp else []) or [],
        "serp_gap": (comp.serp_gap if comp else []) or [],
        "intelligence_analysis": analysis,
    }


@router.get("/audit/{audit_id}/pages")
async def get_audit_pages(audit_id: str, offset: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    total = (await db.execute(select(func.count()).select_from(Page).where(Page.audit_id == audit_id))).scalar() or 0
    result = await db.execute(select(Page).where(Page.audit_id == audit_id).offset(offset).limit(limit))
    return {
        "items": [{
            "id": p.id, "url": p.url, "status_code": p.status_code,
            "title": p.title, "meta_description": p.meta_description,
            "canonical": p.canonical, "h1": p.h1, "word_count": p.word_count,
            "response_time_ms": p.response_time_ms, "schema_markup": p.schema_markup,
            "links_internal_count": len(p.links_internal or []),
            "links_external_count": len(p.links_external or []),
            "images_count": len(p.images or []),
            "page_type": p.page_type or "UNKNOWN",
            "context_issues_count": len(p.context_issues or []),
        } for p in result.scalars().all()],
        "total": total, "offset": offset, "limit": limit,
    }


@router.get("/audit/{audit_id}/page-detail")
async def get_page_detail(audit_id: str, url: str = "", db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Page).where(Page.audit_id == audit_id, Page.url == url)
    )
    page = result.scalar_one_or_none()
    if not page:
        result2 = await db.execute(select(Page).where(Page.audit_id == audit_id))
        all_pages = result2.scalars().all()
        for p in all_pages:
            if url in p.url or p.url.endswith(url):
                page = p
                break
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    pa_result = await db.execute(
        select(PageAnalysisRecord).where(
            PageAnalysisRecord.audit_id == audit_id,
            PageAnalysisRecord.page_url == page.url,
        )
    )
    pa = pa_result.scalar_one_or_none()

    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id, Issue.page_url == page.url)
    )
    issues = issues_result.scalars().all()

    recs_result = await db.execute(
        select(Recommendation).where(Recommendation.audit_id == audit_id, Recommendation.page_url == page.url)
    )
    recs = recs_result.scalars().all()

    return {
        "url": page.url, "status_code": page.status_code,
        "title": page.title, "meta_description": page.meta_description,
        "h1": page.h1, "word_count": page.word_count,
        "canonical": page.canonical,
        "links_internal_count": len(page.links_internal or []),
        "links_external_count": len(page.links_external or []),
        "images_count": len(page.images or []),
        "schema_count": len(page.schema_markup or []),
        "response_time_ms": page.response_time_ms,
        "page_type": page.page_type or "UNKNOWN",
        "context_issues": page.context_issues or [],
        "scores": pa.scores if pa else {},
        "issues": [{
            "id": i.id, "category": i.category, "severity": i.severity,
            "signal_name": i.signal_name, "description": i.description,
            "impact": i.impact, "fix": i.fix,
        } for i in issues],
        "recommendations": [{
            "id": r.id, "category": r.category, "priority": r.priority,
            "issue": r.issue, "exact_fix": r.exact_fix,
        } for r in recs],
    }


@router.get("/audit/{audit_id}/page-analysis/{page_url:path}")
async def get_page_analysis(audit_id: str, page_url: str, db: AsyncSession = Depends(get_db)):
    full_url = page_url
    if not full_url.startswith("http"):
        full_url = "/" + page_url

    result = await db.execute(
        select(PageAnalysisRecord).where(
            PageAnalysisRecord.audit_id == audit_id,
            PageAnalysisRecord.page_url == full_url,
        )
    )
    pa = result.scalar_one_or_none()
    if not pa:
        alt_result = await db.execute(
            select(PageAnalysisRecord).where(PageAnalysisRecord.audit_id == audit_id)
        )
        all_pa = alt_result.scalars().all()
        for p in all_pa:
            if page_url in p.page_url or p.page_url.endswith(page_url):
                pa = p
                break
    if not pa:
        raise HTTPException(status_code=404, detail="Page analysis not found")

    page_result = await db.execute(
        select(Page).where(Page.audit_id == audit_id, Page.url == pa.page_url)
    )
    page = page_result.scalar_one_or_none()

    return {
        "page_url": pa.page_url,
        "scores": pa.scores,
        "issue_count": pa.issue_count,
        "signal_count": pa.signal_count,
        "issues": pa.issues or [],
        "recommendations": pa.recommendations or [],
        "page_data": {
            "url": page.url if page else pa.page_url,
            "status_code": page.status_code if page else 0,
            "title": page.title if page else "",
            "meta_description": page.meta_description if page else "",
            "h1": page.h1 if page else "",
            "word_count": page.word_count if page else 0,
            "canonical": page.canonical if page else "",
            "links_internal_count": len(page.links_internal or []) if page else 0,
            "links_external_count": len(page.links_external or []) if page else 0,
            "images_count": len(page.images or []) if page else 0,
            "schema_count": len(page.schema_markup or []) if page else 0,
            "response_time_ms": page.response_time_ms if page else 0,
        } if page else None,
    }


@router.get("/audit/{audit_id}/page-analyses")
async def get_all_page_analyses(audit_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PageAnalysisRecord).where(PageAnalysisRecord.audit_id == audit_id)
    )
    analyses = result.scalars().all()
    return [{
        "page_url": pa.page_url,
        "scores": pa.scores,
        "issue_count": pa.issue_count,
        "signal_count": pa.signal_count,
    } for pa in analyses]


@router.get("/audit/{audit_id}/seo-analysis")
async def get_seo_analysis(audit_id: str, db: AsyncSession = Depends(get_db)):
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id, Issue.category == "SEO")
    )
    seo_issues = issues_result.scalars().all()

    return {
        "seo_score": scores.seo_score if scores else 0,
        "issues": [{
            "id": i.id, "page_url": i.page_url, "severity": i.severity,
            "signal_name": i.signal_name, "description": i.description,
            "impact": i.impact, "fix": i.fix,
        } for i in seo_issues],
        "signals": {k: v for k, v in (scores.signals if scores else {}).items()
                    if isinstance(v, dict) and v.get("category") == "SEO"},
    }


@router.get("/audit/{audit_id}/keywords")
async def get_keyword_data(audit_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(KeywordRecord).where(KeywordRecord.audit_id == audit_id).order_by(KeywordRecord.frequency.desc())
    )
    return [{
        "keyword": kw.keyword, "frequency": kw.frequency,
        "opportunity": kw.opportunity, "action": kw.action,
    } for kw in result.scalars().all()]


@router.get("/audit/{audit_id}/roadmap")
async def get_roadmap(audit_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RoadmapRecord).where(RoadmapRecord.audit_id == audit_id))
    record = result.scalar_one_or_none()
    if not record:
        return {"immediate": [], "week1": [], "month1": [], "month3": []}
    return {
        "immediate": record.immediate or [],
        "week1": record.week1 or [],
        "month1": record.month1 or [],
        "month3": record.month3 or [],
    }


@router.get("/audit/{audit_id}/aeo-analysis")
async def get_aeo_analysis(audit_id: str, db: AsyncSession = Depends(get_db)):
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id, Issue.category == "AEO")
    )
    aeo_issues = issues_result.scalars().all()
    return {
        "aeo_score": scores.aeo_score if scores else 0,
        "issues": [{"id": i.id, "page_url": i.page_url, "severity": i.severity, "signal_name": i.signal_name, "description": i.description, "impact": i.impact, "fix": i.fix} for i in aeo_issues],
        "signals": {k: v for k, v in (scores.signals if scores else {}).items() if isinstance(v, dict) and v.get("category") == "AEO"},
    }


@router.get("/audit/{audit_id}/geo-analysis")
async def get_geo_analysis(audit_id: str, db: AsyncSession = Depends(get_db)):
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id, Issue.category == "GEO")
    )
    geo_issues = issues_result.scalars().all()
    return {
        "geo_score": scores.geo_score if scores else 0,
        "issues": [{"id": i.id, "page_url": i.page_url, "severity": i.severity, "signal_name": i.signal_name, "description": i.description, "impact": i.impact, "fix": i.fix} for i in geo_issues],
        "signals": {k: v for k, v in (scores.signals if scores else {}).items() if isinstance(v, dict) and v.get("category") == "GEO"},
    }


@router.get("/audit/{audit_id}/ai-visibility")
async def get_ai_visibility(audit_id: str, db: AsyncSession = Depends(get_db)):
    cache_key = f"ai_visibility:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id, Issue.category == "AI_SEARCH")
    )
    ai_issues = issues_result.scalars().all()

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    all_pages = list(pages_result.scalars().all())

    platform_scores_accumulator = {"chatgpt": [], "gemini": [], "perplexity": []}
    platform_details = {}

    try:
        from app.engine.dual_ai import dual_ai_search_optimization
        for page_obj in all_pages[:20]:
            try:
                pa = PageAdapter(page_obj)
                content_str = pa.content_text if isinstance(pa.content_text, str) else " ".join(pa.content_text) if pa.content_text else ""
                vis = await dual_ai_search_optimization(pa.url, pa.title or "", content_str, "")
                for platform in ["chatgpt", "gemini", "perplexity"]:
                    score = vis.get("platform_scores", {}).get(platform, {}).get("score", 0)
                    if score > 0:
                        platform_scores_accumulator[platform].append(score)
                if not platform_details:
                    platform_details = vis
            except Exception:
                continue
    except Exception:
        pass

    avg = lambda lst: round(sum(lst) / len(lst), 1) if lst else 0
    chatgpt_avg = avg(platform_scores_accumulator["chatgpt"])
    gemini_avg = avg(platform_scores_accumulator["gemini"])
    perplexity_avg = avg(platform_scores_accumulator["perplexity"])

    has_schema = sum(1 for p in all_pages if p.schema_markup)
    has_citations = sum(1 for p in all_pages if any(kw in (p.content_text or "").lower() for kw in ["source:", "according to", "research", "study"]))
    has_fresh = sum(1 for p in all_pages if any(yr in (p.content_text or "") for yr in ["2025", "2026"]))

    signal_scores = {}
    for k, v in (scores.signals if scores else {}).items():
        if isinstance(v, dict) and v.get("category") == "AI_SEARCH":
            signal_scores[k] = v

    result = {
        "ai_visibility_score": scores.ai_visibility_score if scores else 0,
        "chatgpt_visibility": chatgpt_avg,
        "gemini_visibility": gemini_avg,
        "perplexity_visibility": perplexity_avg,
        "pages_analyzed": min(len(all_pages), 20),
        "pages_with_schema": has_schema,
        "pages_with_citations": has_citations,
        "pages_with_fresh_content": has_fresh,
        "ai_platform_visibility": platform_details,
        "issues": [{"id": i.id, "page_url": i.page_url, "severity": i.severity, "signal_name": i.signal_name, "description": i.description, "impact": i.impact, "fix": i.fix} for i in ai_issues],
        "signals": signal_scores,
    }
    _cache_set(cache_key, result)
    return result


@router.get("/audit/{audit_id}/schema-analysis")
async def get_schema_analysis(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    total = len(pages)
    with_schema = [p for p in pages if p.schema_markup and len(p.schema_markup) > 0]
    schema_types = {}
    for p in with_schema:
        for s in p.schema_markup:
            if isinstance(s, dict):
                t = s.get("@type", "Unknown")
                schema_types[t] = schema_types.get(t, 0) + 1
    return {
        "total_pages": total,
        "pages_with_schema": len(with_schema),
        "coverage_pct": round(len(with_schema) / max(total, 1) * 100, 1),
        "schema_types": schema_types,
        "pages": [{
            "url": p.url, "has_schema": bool(p.schema_markup),
            "schema_count": len(p.schema_markup or []),
            "schemas": p.schema_markup or [],
        } for p in pages[:50]],
    }


@router.get("/audit/{audit_id}/canonicalization")
async def get_canonicalization(audit_id: str, db: AsyncSession = Depends(get_db)):
    from app.engine.url_canonicalization import URLCanonicalizer
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    if not pages:
        raise HTTPException(status_code=404, detail="No pages found")
    page_dicts = [{
        "url": p.url, "title": p.title or "", "h1": p.h1 or "",
        "canonical": p.canonical or "", "status_code": p.status_code,
        "word_count": p.word_count or 0, "content_text": p.content_text or "",
    } for p in pages]
    canonicalizer = URLCanonicalizer()
    result = canonicalizer.analyze(page_dicts)
    return {
        "summary": result.get("summary", {}),
        "canonicalization_issues": result.get("canonicalization_issues", {}),
        "duplicate_groups": result.get("duplicate_groups", [])[:20],
        "redirect_chains": result.get("redirect_chains", [])[:20],
    }


@router.get("/audit/{audit_id}/confidence")
async def get_confidence_analysis(audit_id: str, db: AsyncSession = Depends(get_db)):
    from app.engine.confidence_engine import RecommendationConfidenceEngine
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    issues = issues_result.scalars().all()
    engine = RecommendationConfidenceEngine()
    page_dicts = []
    for p in pages[:30]:
        page_dicts.append({
            "title": p.title or "", "meta_description": p.meta_description or "",
            "h1": p.h1 or "", "word_count": p.word_count or 0,
            "content_text": p.content_text or "", "images": p.images or [],
            "links_internal": p.links_internal or [], "headings": p.headers or [],
            "response_time_ms": p.response_time_ms or 0,
            "issues": [{"category": i.category, "issue": i.signal_name} for i in issues if i.page_url == p.url],
        })
    analysis = engine.analyze(page_dicts)
    return {
        "summary": analysis.get("summary", {}),
        "confidence_distribution": analysis.get("confidence_distribution", {}),
    }


@router.get("/audit/{audit_id}/internal-links")
async def get_internal_links(audit_id: str, db: AsyncSession = Depends(get_db)):
    import re as _re
    from urllib.parse import urlparse

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    total = len(pages)

    def _safe_links(p):
        v = p.links_internal
        if isinstance(v, list): return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except: return []
        return []

    def _safe_ext_links(p):
        v = p.links_external
        if isinstance(v, list): return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except: return []
        return []

    def _link_text(link):
        if isinstance(link, dict): return (link.get("text", "") or link.get("anchor", "") or "").strip()
        return ""

    def _link_url(link):
        if isinstance(link, dict): return (link.get("url", "") or link.get("href", "")).strip()
        if isinstance(link, str): return link.strip()
        return ""

    def _normalize_url(url):
        if not url: return ""
        parsed = urlparse(url)
        normalized = f"{parsed.netloc}{parsed.path.rstrip('/')}"
        return normalized.lower()

    def _is_generic_anchor(text):
        generic = {"click here", "read more", "learn more", "here", "this", "link", "more", "go", "continue", "see more", "view more"}
        return text.lower().strip() in generic

    def _is_orphan(url, all_pages):
        for p in all_pages:
            links = _safe_links(p)
            for link in links:
                target = _link_url(link)
                if _normalize_url(target) == _normalize_url(url):
                    return False
        return True

    for p in pages:
        raw_links = _safe_links(p)
        seen_urls = set()
        deduped = []
        for link in raw_links:
            norm = _normalize_url(_link_url(link))
            if norm and norm not in seen_urls:
                seen_urls.add(norm)
                deduped.append(link)
        p._deduped_links = deduped

    total_internal = sum(len(getattr(p, '_deduped_links', _safe_links(p))) for p in pages)
    avg_internal = total_internal / max(total, 1)
    total_external = sum(len(_safe_ext_links(p)) for p in pages)
    avg_external = total_external / max(total, 1)

    all_link_targets = set()
    for p in pages:
        for link in getattr(p, '_deduped_links', _safe_links(p)):
            target = _normalize_url(_link_url(link))
            if target: all_link_targets.add(target)

    no_links = [p for p in pages if len(getattr(p, '_deduped_links', _safe_links(p))) == 0]
    orphan_pages = [p for p in pages if p.crawl_depth and p.crawl_depth > 3]
    orphan_urls_list = [p.url for p in pages if _is_orphan(p.url, pages)]

    link_map = {}
    for p in pages:
        for link in _safe_ext_links(p):
            domain = _link_url(link).split("//")[-1].split("/")[0] if _link_url(link) else ""
            if domain:
                if domain not in link_map:
                    link_map[domain] = {"count": 0, "from_pages": [], "anchor_texts": []}
                link_map[domain]["count"] += 1
                if p.url not in link_map[domain]["from_pages"]:
                    link_map[domain]["from_pages"].append(p.url)
                txt = _link_text(link)
                if txt: link_map[domain]["anchor_texts"].append(txt)

    all_anchors = []
    generic_anchors = []
    pages_anchor_map = {}
    for p in pages:
        page_anchors = []
        for link in getattr(p, '_deduped_links', _safe_links(p)):
            txt = _link_text(link)
            if txt:
                all_anchors.append({"text": txt, "page": p.url, "target": _link_url(link)})
                page_anchors.append(txt)
                if _is_generic_anchor(txt):
                    generic_anchors.append({"text": txt, "page": p.url, "target": _link_url(link)})
        pages_anchor_map[p.url] = page_anchors

    page_scores = []
    for p in pages:
        links = getattr(p, '_deduped_links', _safe_links(p))
        ext_links = _safe_ext_links(p)
        link_count = len(links)
        ext_count = len(ext_links)
        wc = p.word_count or 0

        score = 50
        issues = []

        if link_count == 0:
            score -= 30
            issues.append("No internal links — page is isolated")
        elif link_count < 3:
            score -= 15
            issues.append(f"Only {link_count} internal links (aim for 3+)")
        elif link_count >= 5:
            score += 15

        if wc > 500 and ext_count == 0:
            score -= 10
            issues.append("No outbound links in 500+ word content")

        depth = p.crawl_depth or 0
        if depth > 3:
            score -= 15
            issues.append(f"Page is {depth} clicks from homepage")

        if wc > 0 and link_count > 0:
            density = link_count / (wc / 100)
            if density > 10:
                score -= 5
                issues.append("Link density is very high (may feel spammy)")

        page_gen = [a for a in generic_anchors if a["page"] == p.url]
        if page_gen:
            score -= 5
            issues.append(f"{len(page_gen)} generic anchor(s) like 'click here'")

        score = max(0, min(100, score))
        page_scores.append({
            "url": p.url,
            "score": score,
            "internal_links": link_count,
            "external_links": ext_count,
            "unique_targets": len({_normalize_url(_link_url(l)) for l in links if _link_url(l)}),
            "crawl_depth": depth,
            "word_count": wc,
            "issues": issues,
            "anchors": pages_anchor_map.get(p.url, [])[:5],
        })

    page_scores.sort(key=lambda x: x["score"])

    page_keywords = {}
    stopwords = {"the","a","an","is","are","was","were","in","on","at","to","for","of","and","or","with","from","by","this","that","it","as","be","has","had","have","do","does","did","will","would","could","should","may","might","can","not","no","all","any","each","every","but","if","so","than","too","very","just","about","above","after","before","between","how","what","when","where","who","which","why","their","there","these","those","your","you","we","us","our","he","she","his","her","its","them","they","me","my","i","more","most","other","some","such","only","own","same","into","over","also","use","used","using","into","more","new","one","two"}
    for p in pages:
        title_words = set((p.title or "").lower().split()) - stopwords
        h1_words = set((p.h1 or "").lower().split()) - stopwords
        combined = title_words | h1_words
        page_keywords[p.url] = combined

    clusters = {}
    url_list = [p.url for p in pages]
    for i, url1 in enumerate(url_list):
        for url2 in url_list[i+1:]:
            shared = page_keywords.get(url1, set()) & page_keywords.get(url2, set())
            if len(shared) >= 2:
                cluster_key = " / ".join(sorted(shared)[:3])
                if cluster_key not in clusters:
                    clusters[cluster_key] = {"topic": cluster_key, "pages": [], "shared_keywords": sorted(shared)}
                for u in [url1, url2]:
                    if u not in clusters[cluster_key]["pages"]:
                        clusters[cluster_key]["pages"].append(u)

    page_text_cache = {}
    for p in pages:
        ct = getattr(p, "content_text", None) or ""
        cleaned = _re.sub(r'<[^>]+>', ' ', ct).lower()
        cleaned = _re.sub(r'\s+', ' ', cleaned).strip()
        page_text_cache[p.url] = cleaned

    link_suggestions = []
    pages_by_url = {p.url: p for p in pages}
    for p in pages:
        if not p.url: continue
        current_links = {_normalize_url(_link_url(l)) for l in _safe_links(p)}
        p_text = page_text_cache.get(p.url, "")
        p_words = set(p_text.split())
        p_title_words = set((p.title or "").lower().split())
        p_h1_words = set((p.h1 or "").lower().split())
        key_terms = (p_words | p_title_words | p_h1_words) - stopwords

        for other in pages:
            if other.url == p.url or not other.url: continue
            if _normalize_url(other.url) in current_links: continue
            other_text = page_text_cache.get(other.url, "")
            other_title_words = set((other.title or "").lower().split())
            overlap = len(key_terms & other_title_words)
            if overlap >= 2 or any(t in other_text for t in list(key_terms)[:5] if len(t) > 4):
                paragraphs = p_text.split(". ")
                best_para = ""
                for para in paragraphs:
                    if any(t in para for t in list(key_terms & other_title_words)[:3]):
                        best_para = para[:80]
                        break

                link_suggestions.append({
                    "from_page": p.url,
                    "to_page": other.url,
                    "to_title": other.title or other.url.split("/")[-1].replace("-", " ").title(),
                    "reason": f"Related content — shares topics: {', '.join(list(key_terms & other_title_words)[:3]) if key_terms & other_title_words else 'thematic relevance'}",
                    "anchor_suggestion": (other.title or other.url.split("/")[-1].replace("-", " "))[:60],
                    "priority": "HIGH" if overlap >= 3 else "MEDIUM" if overlap >= 2 else "LOW",
                    "placement_hint": f"Place in paragraph: \"{best_para}...\"" if best_para else "Add as contextual link in body content",
                    "shared_topics": sorted(list(key_terms & other_title_words)[:5]),
                })

    link_suggestions.sort(key=lambda x: {"HIGH": 0, "MEDIUM": 1, "LOW": 2}.get(x.get("priority", "LOW"), 3))

    link_improvements = []
    for p in pages:
        if not p.url: continue
        links = getattr(p, '_deduped_links', _safe_links(p))
        external = _safe_ext_links(p)
        if len(external) == 0 and p.word_count and p.word_count > 500:
            link_improvements.append({
                "page": p.url, "issue": "No external links in 500+ word content",
                "suggestion": "Add 2-3 outbound links to authoritative sources to boost E-E-A-T signals",
                "impact": "MEDIUM",
            })
        if len(links) < 3 and p.word_count and p.word_count > 300:
            link_improvements.append({
                "page": p.url, "issue": f"Only {len(links)} internal links in {p.word_count}-word content",
                "suggestion": f"Add links to related pages to improve crawlability and topical authority. Aim for {min(max(3, len(links) + 3), 10)} internal links.",
                "impact": "HIGH",
            })
        if p.crawl_depth and p.crawl_depth > 3:
            link_improvements.append({
                "page": p.url, "issue": f"Page is {p.crawl_depth} clicks from homepage (too deep)",
                "suggestion": "Add links from higher-authority pages to reduce crawl depth",
                "impact": "HIGH",
            })

    inbound_count = {}
    for p in pages:
        for link in getattr(p, '_deduped_links', _safe_links(p)):
            target = _normalize_url(_link_url(link))
            inbound_count[target] = inbound_count.get(target, 0) + 1

    pagerank_data = []
    for p in pages:
        inbound = inbound_count.get(_normalize_url(p.url), 0)
        outbound = len(getattr(p, '_deduped_links', _safe_links(p)))
        pr_score = min(100, (inbound * 10) + 20 + (min(outbound, 10) * 2))
        pagerank_data.append({
            "url": p.url,
            "title": p.title or p.url,
            "inbound_links": inbound,
            "outbound_links": outbound,
            "pagerank_score": pr_score,
            "is_orphan": _is_orphan(p.url, pages),
        })
    pagerank_data.sort(key=lambda x: x["pagerank_score"], reverse=True)

    return {
        "total_pages": total,
        "unique_internal_targets": len(all_link_targets),
        "avg_internal_links": round(avg_internal, 1),
        "avg_external_links": round(avg_external, 1),
        "total_internal_links": total_internal,
        "pages_with_no_internal_links": len(no_links),
        "orphan_pages": len(orphan_urls_list),
        "no_links_urls": [p.url for p in no_links[:20]],
        "orphan_urls": orphan_urls_list[:20],
        "link_suggestions": link_suggestions[:30],
        "link_improvements": link_improvements[:20],
        "page_scores": page_scores[:50],
        "anchor_analysis": {
            "total_anchors": len(all_anchors),
            "generic_anchors": generic_anchors[:20],
            "unique_anchors": len(set(a["text"].lower() for a in all_anchors)),
            "sample_anchors": all_anchors[:30],
        },
        "topic_clusters": list(clusters.values())[:15],
        "pagerank": pagerank_data[:30],
        "external_domains": sorted(link_map.items(), key=lambda x: x[1]["count"], reverse=True)[:20],
        "pages": [{
            "url": p.url,
            "title": p.title or "",
            "internal_links": len(getattr(p, '_deduped_links', _safe_links(p))),
            "external_links": len(_safe_ext_links(p)),
            "crawl_depth": p.crawl_depth,
            "word_count": p.word_count or 0,
        } for p in pages[:50]],
    }


@router.get("/audit/{audit_id}/page-speed")
async def get_page_speed(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    total = len(pages)
    times = [p.response_time_ms for p in pages if p.response_time_ms and p.response_time_ms > 0]
    avg_time = sum(times) / max(len(times), 1)
    slow_pages = [p for p in pages if p.response_time_ms and p.response_time_ms > 3000]
    return {
        "total_pages": total,
        "avg_response_time_ms": round(avg_time),
        "slow_pages_count": len(slow_pages),
        "slow_threshold_ms": 3000,
        "slow_pages": [{
            "url": p.url, "response_time_ms": p.response_time_ms,
            "status_code": p.status_code,
        } for p in sorted(slow_pages, key=lambda x: x.response_time_ms or 0, reverse=True)[:20]],
        "pages": [{
            "url": p.url, "response_time_ms": p.response_time_ms,
            "status_code": p.status_code, "word_count": p.word_count,
        } for p in pages[:50]],
    }


@router.get("/audit/{audit_id}/eeat-analysis")
async def get_eeat_analysis(audit_id: str, db: AsyncSession = Depends(get_db)):
    import re as _re
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id, Issue.category == "SEO")
    )
    seo_issues = issues_result.scalars().all()
    eeat_signals = {
        "author_signals": len([p for p in pages if p.content_text and "author" in p.content_text.lower()]),
        "date_signals": len([p for p in pages if p.open_graph and p.open_graph.get("article:published_time")]),
        "source_signals": len([p for p in pages if p.links_external and len(p.links_external) > 0]),
        "expertise_signals": len([p for p in pages if p.word_count and p.word_count > 500]),
        "trust_signals": len([p for p in pages if p.canonical]),
        "total_pages": len(pages),
    }

    pages_by_url = {p.url: p for p in pages if p.url}
    enhanced_issues = []
    for i in seo_issues[:30]:
        page = pages_by_url.get(i.page_url)
        signal = (i.signal_name or "").lower()
        enhanced_fix = i.fix or ""
        enhanced_impact = i.impact or ""

        if "duplicate title" in signal:
            if page and page.title:
                slug_words = page.url.rstrip("/").split("/")[-1].replace("-", " ").title() if page.url else ""
                enhanced_fix = f'This page title "{page.title}" appears on multiple pages. Write a unique, keyword-rich title specific to this page\'s content. Example: "{slug_words} — {page.title.split("|")[0].strip()[:40]} | Your Brand Name" (50-60 characters, include primary keyword)'
                enhanced_impact = "Duplicate titles cause Google to pick one randomly — your intended page may not rank. Each page needs a unique title to signal distinct content."
            else:
                enhanced_fix = "Add a unique, descriptive title tag between 50-60 characters. Include the primary keyword near the beginning and your brand name at the end."

        elif "multiple h1" in signal:
            if page:
                headings = page.headings or []
                if isinstance(headings, str):
                    try:
                        headings = json.loads(headings)
                    except Exception:
                        headings = []
                h1_list = [h.get("text", "") for h in headings if isinstance(h, dict) and h.get("level") == "H1"][:3]
                h1_text = "; ".join(h1_list) if h1_list else "multiple H1 tags"
                enhanced_fix = f'This page has {len(h1_list)} H1 tags: "{h1_text}". Keep only the most important one as H1. Convert the rest to H2 by changing <h1> to <h2> in your HTML. The H1 should contain your primary target keyword and describe the page\'s main topic.'
                enhanced_impact = "Multiple H1 tags confuse search engines about the page\'s primary topic. Google can only attribute one H1 as the main heading — having multiple dilutes your keyword signals."
            else:
                enhanced_fix = "Keep only one H1 tag per page. The H1 should contain the primary target keyword and describe the page\'s main topic. Convert all other H1s to H2 tags."

        elif "missing alt text" in signal or ("alt" in signal and "missing" in signal):
            if page:
                images = page.images or []
                if isinstance(images, str):
                    try:
                        images = json.loads(images)
                    except Exception:
                        images = []
                no_alt = [img for img in images if isinstance(img, dict) and not img.get("alt")]
                if no_alt:
                    first_img = no_alt[0]
                    img_src = first_img.get("src", first_img.get("url", "image"))[:80]
                    enhanced_fix = f'{len(no_alt)} images are missing alt text. Start with the first one ({img_src}) — add a concise, descriptive alt attribute. Example: <img src="..." alt="Description of what the image shows">. Each alt text should describe the image content and include relevant keywords naturally.'
                    enhanced_impact = "Missing alt text hurts accessibility for screen readers and prevents Google from understanding image content. Image search traffic is lost."
                else:
                    enhanced_fix = "Add descriptive alt text to all images. Each alt attribute should describe what the image shows in 5-15 words, incorporating relevant keywords naturally."

        elif "meta description short" in signal or ("meta" in signal and "short" in signal):
            if page and page.meta_description:
                current_len = len(page.meta_description)
                enhanced_fix = f'Your meta description is only {current_len} characters. Expand it to 150-160 characters. Include: 1) Primary keyword naturally, 2) A clear value proposition, 3) A call-to-action. Example: "{page.meta_description[:60]}... [expand with relevant keywords and CTA here]"'
                enhanced_impact = "Short meta descriptions waste SERP real estate. Google may auto-generate one that misses your key message, reducing click-through rates."

        elif "title" in signal and "missing" in signal:
            enhanced_fix = f'Add a unique title tag to this page. Format: "Primary Keyword — Secondary Keyword | Brand Name". Keep it 50-60 characters. Put the most important keyword at the beginning.'
            enhanced_impact = "Missing title tag means Google has no signal about what this page is about. Title is the #1 on-page SEO factor."

        elif "meta description" in signal and ("missing" in signal or "absent" in signal):
            enhanced_fix = "Add a meta description between 150-160 characters. Write it as a compelling ad copy: include the primary keyword, explain what the page offers, and end with a call-to-action like Learn more, Get started, or Discover."
            enhanced_impact = "Missing meta description means Google auto-generates one from page content, which often misses your key message and reduces click-through rates."

        elif "canonical" in signal:
            enhanced_fix = "Add a canonical tag pointing to the preferred URL: <link rel='canonical' href='https://yourdomain.com/page-url'>. Use the full HTTPS URL. If this page has URL parameters, set the canonical to the clean version without parameters."
            enhanced_impact = "Missing canonical tag can cause duplicate content issues when the same page is accessible via multiple URLs (with/without www, trailing slash, parameters)."

        elif "heading" in signal and "h1" in signal.lower():
            enhanced_fix = "Add a single H1 tag that contains the primary keyword and clearly describes the page topic. Place it at the top of the main content area. Example: <h1>Your Primary Keyword Here</h1>"
            enhanced_impact = "Missing H1 tag removes the most important on-page keyword signal. Google uses H1 to understand the page\'s main topic."

        elif "schema" in signal or "structured data" in signal:
            enhanced_fix = "Add JSON-LD structured data. For this page type, implement: Organization schema with brand details, WebPage schema with description, and any relevant type (Article, Product, FAQ, etc.). Test at google.com/rich-results-test after adding."
            enhanced_impact = "No structured data means missed opportunities for rich snippets, knowledge panels, and enhanced search features."

        elif "open graph" in signal or "og:" in signal:
            enhanced_fix = 'Add Open Graph tags: <meta property="og:title" content="Page Title">, <meta property="og:description" content="Page description">, <meta property="og:image" content="URL to 1200x630 image">, <meta property="og:url" content="Canonical URL">. These control how your page appears when shared on social media.'
            enhanced_impact = "Missing Open Graph tags means poor social media previews — lower engagement and click-through from social shares."

        elif "internal link" in signal:
            if page:
                link_count = len(page.links_internal or []) if isinstance(page.links_internal, list) else 0
                enhanced_fix = f'This page has only {link_count} internal links. Add links to 3-5 related pages on your site using descriptive anchor text. For example, link to your most important related pages using the target keyword as anchor text.'
                enhanced_impact = "Few internal links means search engines see this page as isolated. Internal links distribute PageRank and help Google understand your site structure."
            else:
                enhanced_fix = "Add 3-5 internal links to related pages using descriptive anchor text that includes target keywords."

        elif "external link" in signal:
            enhanced_fix = "Add 2-3 outbound links to authoritative, relevant sources (industry reports, government sites, well-known publications). Use descriptive anchor text. This boosts E-E-A-T by showing you reference credible sources."
            enhanced_impact = "No outbound links to authoritative sources weakens E-E-A-T signals. Linking to quality sources shows Google you provide well-researched content."

        elif "image" in signal and ("no " in signal or "missing" in signal):
            enhanced_fix = "Add at least 1-2 images to break up text and improve engagement. Include a featured image at the top. Add 1-2 supporting images or diagrams within the content. Each image needs descriptive alt text."
            enhanced_impact = "Pages with no images have higher bounce rates and lower time-on-page. Visual content improves user engagement signals."

        elif "thin content" in signal or "word count" in signal:
            if page and page.word_count:
                enhanced_fix = f'This page has only {page.word_count} words. Expand to at least 800-1200 words of substantive, helpful content. Add: a clear introduction (2-3 sentences), detailed sections with H2/H3 headings, practical examples, and a conclusion. Quality matters more than quantity — each paragraph should provide value.'
                enhanced_impact = f"Content with only {page.word_count} words is unlikely to rank competitively. Google favors comprehensive, in-depth content that fully answers user queries."
            else:
                enhanced_fix = "Expand content to at least 800-1200 words of substantive, helpful content. Focus on comprehensively covering the topic with clear sections, examples, and actionable advice."

        elif "broken link" in signal or "404" in signal:
            enhanced_fix = "Fix the broken link: either restore the missing page, update the link to point to the correct URL, or remove the link entirely. Set up 301 redirects if the content was moved to a new URL."
            enhanced_impact = "Broken links waste crawl budget and create poor user experiences. Google may interpret broken links as a sign of site neglect."

        elif "redirect" in signal:
            enhanced_fix = "Ensure all redirects use 301 (permanent) redirects, not 302 (temporary). Check for redirect chains — each redirect should go directly to the final URL. Avoid redirect loops."
            enhanced_impact = "Incorrect redirects confuse search engines and users. Chains longer than 2-3 hops waste crawl budget."

        else:
            if page and page.url:
                enhanced_fix = f"Review and fix this issue on {page.url}. Check the specific signal: {i.signal_name or 'unknown'} for details."

        enhanced_issues.append({
            "id": i.id, "page_url": i.page_url, "severity": i.severity,
            "signal_name": i.signal_name, "description": i.description,
            "impact": enhanced_impact or i.impact or "",
            "fix": enhanced_fix or i.fix or "",
        })

    total_pages = eeat_signals.get("total_pages", 1) or 1
    experience_pct = min(100, eeat_signals.get("expertise_signals", 0) / total_pages * 100)
    expertise_pct = min(100, eeat_signals.get("author_signals", 0) / total_pages * 100)
    authority_pct = min(100, eeat_signals.get("source_signals", 0) / total_pages * 100)
    trust_pct = min(100, eeat_signals.get("trust_signals", 0) / total_pages * 100)
    date_pct = min(100, eeat_signals.get("date_signals", 0) / total_pages * 100)
    eeat_computed = round(experience_pct * 0.2 + expertise_pct * 0.25 + authority_pct * 0.25 + trust_pct * 0.15 + date_pct * 0.15)

    return {
        "eeat_score": eeat_computed,
        "signals": eeat_signals,
        "issues": enhanced_issues,
    }


@router.get("/audit/{audit_id}/content-analysis")
async def get_content_analysis(audit_id: str, db: AsyncSession = Depends(get_db)):
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id, Issue.category == "CONTENT")
    )
    content_issues = issues_result.scalars().all()
    total = len(pages)
    avg_words = sum(p.word_count for p in pages) / max(total, 1)
    thin = [p.url for p in pages if p.word_count and p.word_count < 300]
    return {
        "content_score": scores.content_score if scores else 0,
        "avg_word_count": round(avg_words),
        "thin_content_count": len(thin),
        "thin_content_urls": thin[:20],
        "issues": [{
            "id": i.id, "page_url": i.page_url, "severity": i.severity,
            "signal_name": i.signal_name, "description": i.description,
            "impact": i.impact, "fix": i.fix,
        } for i in content_issues],
    }


@router.get("/audit/{audit_id}/conversion-analysis")
async def get_conversion_analysis(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    all_issues = issues_result.scalars().all()

    cta_signals = []
    trust_signals = []
    form_issues = []
    speed_issues = []

    for p in pages:
        title = (p.title or "").lower()
        content = (p.content_text or "").lower()[:5000]
        word_count = p.word_count or 0

        cta_words = ["buy", "sign up", "register", "contact", "demo", "trial", "start", "get", "download", "subscribe", "book", "schedule", "pricing"]
        has_cta = any(w in content for w in cta_words)
        if not has_cta and word_count > 300:
            cta_signals.append({"url": p.url, "issue": "No clear call-to-action detected", "severity": "HIGH"})

        trust_words = ["testimonial", "review", "case study", "certified", "partner", "client", "customer", "trusted", "award", "guarantee"]
        has_trust = any(w in content for w in trust_words)
        if not has_trust and word_count > 300:
            trust_signals.append({"url": p.url, "issue": "Missing trust signals", "severity": "MEDIUM"})

        form_words = ["form", "input", "submit", "field", "email", "phone", "signup"]
        has_form = any(w in content for w in form_words)
        if has_form and word_count < 100:
            form_issues.append({"url": p.url, "issue": "Form page has thin content", "severity": "HIGH"})

        if p.response_time_ms and p.response_time_ms > 3000:
            speed_issues.append({"url": p.url, "issue": f"Slow page ({p.response_time_ms}ms) hurts conversions", "severity": "HIGH", "response_time_ms": p.response_time_ms})

    total = len(pages)
    cta_count = len(cta_signals)
    trust_count = len(trust_signals)
    conv_score = max(0, round(100 - (cta_count * 5 + trust_count * 3 + len(form_issues) * 8 + len(speed_issues) * 6) / max(total, 1) * 100, 1))

    return {
        "conversion_score": conv_score,
        "pages_analyzed": total,
        "cta_issues": cta_signals[:20],
        "trust_issues": trust_signals[:20],
        "form_issues": form_issues[:10],
        "speed_issues": speed_issues[:10],
        "summary": {
            "pages_without_cta": cta_count,
            "pages_without_trust_signals": trust_count,
            "form_issues": len(form_issues),
            "slow_conversion_pages": len(speed_issues),
        },
    }


@router.get("/audit/{audit_id}/chat-history")
async def get_chat_history(audit_id: str, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.audit_id == audit_id).order_by(ChatMessage.created_at.asc()).limit(limit)
    )
    messages = result.scalars().all()
    return [{"role": m.role, "content": m.content, "created_at": m.created_at.isoformat() if m.created_at else None} for m in messages]


@router.post("/audit/{audit_id}/chat")
async def chat_with_ai(audit_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    from app.engine.ai_engine import AIEngine
    from app.engine.openai_engine import openai_engine

    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    db.add(ChatMessage(audit_id=audit_id, role="user", content=message))
    await db.commit()

    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    score_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = score_result.scalar_one_or_none()

    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id).limit(20))
    issues = issues_result.scalars().all()

    # Try OpenAI first
    if openai_engine.available:
        try:
            audit_context = {
                "website_url": audit.website_url,
                "overall_score": scores.overall_score if scores else 0,
                "seo_score": scores.seo_score if scores else 0,
                "content_score": scores.content_score if scores else 0,
                "aeo_score": scores.aeo_score if scores else 0,
                "total_issues": len(issues),
            }
            response = await openai_engine.chat(message, audit_context)
            if response:
                db.add(ChatMessage(audit_id=audit_id, role="assistant", content=response))
                await db.commit()
                return {"response": response, "role": "assistant"}
        except Exception as e:
            logger.warning(f"OpenAI chat failed: {e}")

    # Try Gemini
    ai = AIEngine()
    if ai.available:
        context = f"""You are an expert SEO consultant analyzing {audit.website_url}.
Overall Score: {scores.overall_score if scores else 0}/100
SEO: {scores.seo_score if scores else 0} | Technical: {scores.technical_score if scores else 0}
AEO: {scores.aeo_score if scores else 0} | GEO: {scores.geo_score if scores else 0}
Top issues: {', '.join([i.signal_name for i in issues[:5]])}

User question: {message}

Provide a helpful, specific, actionable response. Be concise."""
        response = await ai._call_gemini_text(context)
        if response:
            db.add(ChatMessage(audit_id=audit_id, role="assistant", content=response))
            await db.commit()
            return {"response": response, "role": "assistant"}

    fallback = f"I'd be happy to help with your question about {audit.website_url}. Your site has an overall score of {scores.overall_score if scores else 0}/100. Set OPENAI_API_KEY or GEMINI_API_KEY in backend .env for AI-powered answers."
    db.add(ChatMessage(audit_id=audit_id, role="assistant", content=fallback))
    await db.commit()
    return {"response": fallback, "role": "assistant"}


@router.delete("/audit/{audit_id}")
async def delete_audit(audit_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    await db.delete(audit)
    await db.commit()
    return {"message": "Audit deleted"}


@router.get("/audit/{audit_id}/ai/summary")
async def get_ai_summary(audit_id: str, db: AsyncSession = Depends(get_db)):
    from app.engine.ai_engine import AIEngine

    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    score_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = score_result.scalar_one_or_none()

    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    issues = issues_result.scalars().all()

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    high_issues = [i for i in issues if i.severity == "HIGH"]
    medium_issues = [i for i in issues if i.severity == "MEDIUM"]

    cats = {}
    for i in issues:
        cats[i.category] = cats.get(i.category, 0) + 1

    summary_data = {
        "url": audit.website_url,
        "overall": scores.overall_score if scores else 0,
        "seo": scores.seo_score if scores else 0,
        "technical": scores.technical_score if scores else 0,
        "aeo": scores.aeo_score if scores else 0,
        "geo": scores.geo_score if scores else 0,
        "content": scores.content_score if scores else 0,
        "ai_visibility": scores.ai_visibility_score if scores else 0,
        "total_pages": len(pages),
        "total_issues": len(issues),
        "high_issues": len(high_issues),
        "medium_issues": len(medium_issues),
        "category_breakdown": cats,
        "avg_word_count": sum(p.word_count for p in pages) // max(len(pages), 1),
        "error_pages": sum(1 for p in pages if p.status_code >= 400),
    }

    ai = AIEngine()
    if ai.available:
        prompt = f"""You are an expert SEO consultant. Write a concise executive summary of this website audit.

Website: {audit.website_url}
Overall Score: {summary_data['overall']}/100
SEO: {summary_data['seo']}/100 | Technical: {summary_data['technical']}/100
AEO: {summary_data['aeo']}/100 | GEO: {summary_data['geo']}/100
Content: {summary_data['content']}/100 | AI Visibility: {summary_data['ai_visibility']}/100

Pages: {summary_data['total_pages']} | Issues: {summary_data['total_issues']} ({summary_data['high_issues']} high, {summary_data['medium_issues']} medium)
Category breakdown: {json.dumps(summary_data['category_breakdown'])}
Avg words per page: {summary_data['avg_word_count']}

Write 3-4 paragraphs covering:
1. Overall health assessment
2. Top strengths
3. Critical areas needing attention
4. Quick wins and prioritized next steps

Be specific, reference actual scores, and provide actionable insight. Use markdown."""

        response = await ai._call_gemini_text(prompt)
        if response:
            return {"summary": response, "data": summary_data}

    high_items = [f"- [{i.category}] {i.signal_name}: {i.description}" for i in high_issues[:8]]
    med_items = [f"- [{i.category}] {i.signal_name}: {i.description}" for i in medium_issues[:5]]

    fallback = f"""## Audit Summary for {audit.website_url}

**Overall Score: {summary_data['overall']}/100**

### Health Assessment
Your website scores {summary_data['overall']}/100 overall with {summary_data['total_issues']} issues found across {summary_data['total_pages']} pages. {'SEO is your strongest area' if summary_data['seo'] > 60 else 'SEO needs significant work'} ({summary_data['seo']}/100), while {'technical performance is solid' if summary_data['technical'] > 60 else 'technical issues are holding you back'} ({summary_data['technical']}/100).

### Critical Issues ({summary_data['high_issues']} high priority)
{chr(10).join(high_items) if high_items else '- No critical issues found'}

### Medium Priority ({summary_data['medium_issues']} items)
{chr(10).join(med_items) if med_items else '- No medium priority issues'}

### Quick Wins
- Fix missing meta descriptions and title tags
- Add canonical tags to all pages
- Implement schema markup for better AI visibility
- Optimize page load times

*For AI-powered detailed recommendations, ensure Gemini API is accessible.*"""

    return {"summary": fallback, "data": summary_data}


@router.post("/audit/{audit_id}/ai/write-meta")
async def ai_write_meta(audit_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    from app.engine.ai_engine import AIEngine

    page_url = body.get("page_url", "")
    page_title = body.get("current_title", "")
    page_description = body.get("current_description", "")
    target_keywords = body.get("keywords", [])

    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    ai = AIEngine()
    if ai.available:
        prompt = f"""You are an expert SEO copywriter. Generate optimized meta tags for this page.

Page URL: {page_url}
Website: {audit.website_url}
Current Title: {page_title or '(missing)'}
Current Description: {page_description or '(missing)'}
Target Keywords: {', '.join(target_keywords) if target_keywords else 'auto-detect from page'}

Generate:
1. An optimized title tag (50-60 chars)
2. A compelling meta description (150-160 chars)
3. 3 alternative title variations
4. 3 alternative description variations

Return JSON:
{{
  "title": "optimized title",
  "description": "optimized description",
  "title_alternatives": ["alt1", "alt2", "alt3"],
  "description_alternatives": ["alt1", "alt2", "alt3"],
  "keywords_used": ["kw1", "kw2"],
  "notes": "brief explanation of optimization choices"
}}"""
        result = await ai._call_gemini(prompt)
        if result:
            return result

    brand = audit.website_url.split("//")[-1].split(".")[0].replace("-", " ").title()
    return {
        "title": f"{brand} - Expert Solutions & Services",
        "description": f"{brand} offers professional services. Discover our solutions, pricing, and how we help businesses succeed.",
        "title_alternatives": [
            f"{brand} | Trusted by Thousands of Businesses",
            f"Welcome to {brand} - Your Growth Partner",
            f"{brand} - Get Started Today",
        ],
        "description_alternatives": [
            f"Looking for reliable solutions? {brand} delivers results. Explore our services and see why clients choose us.",
            f"{brand} helps businesses grow with proven strategies. Free consultation available. Contact us today.",
            f"Trusted by businesses worldwide. {brand} provides expert solutions tailored to your needs.",
        ],
        "keywords_used": target_keywords[:5] if target_keywords else [brand.lower()],
        "notes": "Generated with fallback templates. Set GEMINI_API_KEY for AI-optimized versions.",
    }


@router.post("/audit/{audit_id}/ai/write-content")
async def ai_write_content(audit_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    from app.engine.ai_engine import AIEngine

    topic = body.get("topic", "")
    content_type = body.get("type", "blog_post")
    target_audience = body.get("audience", "general")
    word_count = body.get("word_count", 1500)

    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    ai = AIEngine()
    if ai.available:
        prompt = f"""You are an expert SEO content strategist. Create a detailed content brief for: {topic}

Website: {audit.website_url}
Content Type: {content_type}
Target Audience: {target_audience}
Target Word Count: {word_count}

Generate a comprehensive content brief including:
1. Suggested title (H1)
2. Meta title and description
3. Full outline with H2/H3 headings and key points under each
4. Target keywords (primary + LSI)
5. Suggested internal linking opportunities
6. FAQ section (5 questions)
7. Schema markup recommendation

Return JSON:
{{
  "title": "H1 title",
  "meta_title": "SEO title",
  "meta_description": "155 char description",
  "outline": [{{"heading": "H2", "subheadings": ["H3a"], "key_points": ["point1"]}}],
  "primary_keywords": ["kw1"],
  "lsi_keywords": ["kw1", "kw2"],
  "faq": [{{"question": "Q", "answer": "A"}}],
  "schema_type": "Article",
  "internal_links_suggestions": ["page topic suggestions"],
  "estimated_read_time": "X min"
}}"""
        result = await ai._call_gemini(prompt)
        if result:
            return result

    return {
        "title": topic.title(),
        "meta_title": f"{topic.title()} - Complete Guide | {audit.website_url.split('//')[-1].split('.')[0].title()}",
        "meta_description": f"Learn everything about {topic}. Comprehensive guide covering best practices, tips, and expert insights.",
        "outline": [
            {"heading": f"What is {topic}?", "subheadings": ["Definition", "Importance"], "key_points": ["Define clearly", "Explain relevance"]},
            {"heading": f"Benefits of {topic}", "subheadings": ["Key advantages"], "key_points": ["List benefits", "Include data"]},
            {"heading": f"How to Get Started", "subheadings": ["Step by step"], "key_points": ["Actionable steps", "Include examples"]},
            {"heading": f"Best Practices", "subheadings": ["Do's and Don'ts"], "key_points": ["Common mistakes", "Pro tips"]},
            {"heading": f"FAQ", "subheadings": [], "key_points": ["Answer common questions"]},
        ],
        "primary_keywords": [topic.lower()],
        "lsi_keywords": [f"{topic.lower()} guide", f"{topic.lower()} tips", f"best {topic.lower()}", f"{topic.lower()} examples"],
        "faq": [
            {"question": f"What is {topic}?", "answer": f"{topic} refers to..."},
            {"question": f"Why is {topic} important?", "answer": f"It matters because..."},
        ],
        "schema_type": "Article",
        "internal_links_suggestions": [],
        "estimated_read_time": f"{max(3, word_count // 250)} min",
        "notes": "Fallback template. Set GEMINI_API_KEY for AI-generated briefs.",
    }


@router.post("/audit/{audit_id}/ai/fix")
async def ai_generate_fix(audit_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    from app.engine.ai_engine import AIEngine

    issue_id = body.get("issue_id", "")
    issue_desc = body.get("description", "")

    issue_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    issues = issue_result.scalars().all()

    target_issue = None
    for i in issues:
        if i.id == issue_id:
            target_issue = i
            break
    if not target_issue and issue_desc:
        for i in issues:
            if issue_desc.lower() in i.description.lower():
                target_issue = i
                break
    if not target_issue and issues:
        target_issue = issues[0]

    if not target_issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    ai = AIEngine()
    if ai.available:
        prompt = f"""You are an expert web developer and SEO consultant. Provide a detailed fix for this issue.

Issue: {target_issue.signal_name}
Category: {target_issue.category}
Severity: {target_issue.severity}
Description: {target_issue.description}
Page URL: {target_issue.page_url}
Impact: {target_issue.impact or 'Not specified'}

Generate:
1. Root cause explanation
2. Step-by-step fix instructions
3. HTML/code example (before and after)
4. Testing steps to verify the fix
5. Estimated time to fix
6. Related issues to check

Return JSON:
{{
  "root_cause": "explanation",
  "fix_steps": ["step1", "step2"],
  "before_code": "<!-- current broken state -->",
  "after_code": "<!-- fixed state -->",
  "testing_steps": ["verify1", "verify2"],
  "estimated_time": "15 minutes",
  "related_checks": ["check1", "check2"]
}}"""
        result = await ai._call_gemini(prompt)
        if result:
            return result

    fixes = {
        "Missing Canonical": {
            "root_cause": "The page is missing a canonical tag, which tells search engines which version of the URL to index.",
            "fix_steps": ["Add <link rel='canonical' href='...' /> to the <head> section", "Ensure the canonical URL matches the page URL", "For paginated content, point to the first page or self-canonicalize"],
            "before_code": "<head>\n  <title>Page Title</title>\n</head>",
            "after_code": "<head>\n  <title>Page Title</title>\n  <link rel=\"canonical\" href=\"https://example.com/page\" />\n</head>",
            "testing_steps": ["View page source and verify canonical tag", "Use Google Search Console URL Inspection"],
            "estimated_time": "5 minutes",
            "related_checks": ["Check for duplicate content", "Verify HTTPS consistency"],
        },
        "Missing Meta Description": {
            "root_cause": "No meta description tag found. Search engines will auto-generate one, which may not represent your content well.",
            "fix_steps": ["Write a compelling 150-160 character description", "Add <meta name='description' content='...' /> to <head>", "Include primary keyword naturally"],
            "before_code": "<head>\n  <title>Page Title</title>\n</head>",
            "after_code": "<head>\n  <title>Page Title</title>\n  <meta name=\"description\" content=\"Clear, compelling description with target keyword. Include a call to action.\" />\n</head>",
            "testing_steps": ["View page source", "Check Google SERP preview"],
            "estimated_time": "10 minutes",
            "related_checks": ["Check title tag optimization", "Review Open Graph tags"],
        },
        "Title Too Short": {
            "root_cause": "The title tag is too short and doesn't utilize available character space for SEO.",
            "fix_steps": ["Expand title to 50-60 characters", "Include primary keyword near the beginning", "Add brand name at the end"],
            "before_code": "<title>Home</title>",
            "after_code": "<title>Expert Solutions for Your Business | BrandName</title>",
            "testing_steps": ["Check character count", "Verify in SERP preview tool"],
            "estimated_time": "5 minutes",
            "related_checks": ["Check meta description length", "Review H1 tag"],
        },
    }

    fix_data = fixes.get(target_issue.signal_name, {
        "root_cause": target_issue.description,
        "fix_steps": [f"Review the {target_issue.signal_name} issue on {target_issue.page_url}", "Implement the recommended fix", "Verify the fix in browser and search console"],
        "before_code": f"<!-- Issue: {target_issue.signal_name} -->",
        "after_code": f"<!-- Fixed: {target_issue.signal_name} -->",
        "testing_steps": ["Clear cache", "Re-crawl page", "Check search console"],
        "estimated_time": "15-30 minutes",
        "related_checks": ["Check other pages for same issue"],
    })

    fix_data["notes"] = "Fallback fix. Set GEMINI_API_KEY for AI-generated custom fixes."
    return fix_data


@router.post("/audit/{audit_id}/ai/schema")
async def ai_generate_schema(audit_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    from app.engine.ai_engine import AIEngine

    page_url = body.get("page_url", "")
    schema_type = body.get("type", "auto")

    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    page_result = await db.execute(select(Page).where(Page.audit_id == audit_id, Page.url == page_url))
    page = page_result.scalar_one_or_none()

    ai = AIEngine()
    if ai.available:
        prompt = f"""Generate Schema.org JSON-LD structured data for this page.

Page: {page_url}
Website: {audit.website_url}
Title: {page.title if page else 'N/A'}
Description: {page.meta_description if page else 'N/A'}
Content Type: {schema_type}

Generate complete, valid JSON-LD markup. Include all recommended properties.
Return JSON with:
{{
  "@context": "https://schema.org",
  ... full schema object ...,
  "_notes": "implementation tips"
}}"""
        result = await ai._call_gemini(prompt)
        if result:
            return {"schema": result, "page_url": page_url, "instructions": "Add this JSON-LD script to the <head> section of your page."}

    brand = audit.website_url.split("//")[-1].split(".")[0].replace("-", " ").title()
    schema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": page.title if page else brand,
        "description": page.meta_description if page else f"Official website of {brand}",
        "url": page_url,
        "publisher": {
            "@type": "Organization",
            "name": brand,
            "url": audit.website_url,
        },
        "dateModified": _dt.datetime.utcnow().isoformat() + "Z",
    }

    if page and page.open_graph:
        schema["image"] = page.open_graph.get("og:image", "")

    return {
        "schema": schema,
        "page_url": page_url,
        "instructions": "Add this JSON-LD script to the <head> section: <script type=\"application/ld+json\">...</script>",
        "notes": "Fallback schema. Set GEMINI_API_KEY for AI-optimized structured data.",
    }


@router.post("/audit/{audit_id}/ai/optimize")
async def ai_optimize_page(audit_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    from app.engine.ai_engine import AIEngine

    page_url = body.get("page_url", "")

    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    page_result = await db.execute(select(Page).where(Page.audit_id == audit_id, Page.url == page_url))
    page = page_result.scalar_one_or_none()

    score_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = score_result.scalar_one_or_none()

    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id, Issue.page_url == page_url))
    page_issues = issues_result.scalars().all()

    ai = AIEngine()
    if ai.available:
        prompt = f"""You are an expert SEO consultant. Provide a comprehensive optimization plan for this specific page.

Page: {page_url}
Title: {page.title if page else 'N/A'}
H1: {page.h1 if page else 'N/A'}
Meta Description: {page.meta_description if page else 'N/A'}
Word Count: {page.word_count if page else 0}
Schema Types: {json.dumps(page.schema_markup) if page and page.schema_markup else 'None'}
Internal Links: {len(page.links_internal) if page and page.links_internal else 0}
External Links: {len(page.links_external) if page and page.links_external else 0}

Issues on this page: {json.dumps([{"signal": i.signal_name, "severity": i.severity, "desc": i.description} for i in page_issues[:10]])}

Overall site scores: SEO={scores.seo_score if scores else 0}, Technical={scores.technical_score if scores else 0}

Return a prioritized optimization plan:
{{
  "grade": "A-F",
  "priority_score": 0-100,
  "critical_fixes": [{{"issue": "", "fix": "", "impact": ""}}],
  "content_optimizations": [{{"area": "", "suggestion": "", "example": ""}}],
  "technical_seo": [{{"item": "", "action": ""}}],
  "aeo_optimizations": [{{"area": "", "action": ""}}],
  "geo_optimizations": [{{"area": "", "action": ""}}],
  "estimated_impact": "description of expected improvement"
}}"""
        result = await ai._call_gemini(prompt)
        if result:
            return result

    critical = [{"issue": i.signal_name, "fix": i.fix or f"Fix: {i.description}", "impact": i.severity} for i in page_issues if i.severity == "HIGH"]
    improvements = [{"issue": i.signal_name, "fix": i.fix or f"Address: {i.description}", "impact": i.severity} for i in page_issues if i.severity != "HIGH"]

    wc = page.word_count if page else 0
    title_len = len(page.title) if page and page.title else 0
    desc_len = len(page.meta_description) if page and page.meta_description else 0

    content_opts = []
    if wc < 300:
        content_opts.append({"area": "Content Depth", "suggestion": f"Page has only {wc} words. Add 500+ more words of valuable content.", "example": "Add sections covering related topics, FAQs, or detailed explanations."})
    if title_len < 30:
        content_opts.append({"area": "Title Tag", "suggestion": f"Title is only {title_len} chars. Expand to 50-60 characters.", "example": "Include primary keyword and brand name."})
    if desc_len < 100:
        content_opts.append({"area": "Meta Description", "suggestion": f"Description is {desc_len} chars. Write 150-160 characters.", "example": "Summarize page content with a call to action."})

    return {
        "grade": "B" if len(critical) == 0 else "D" if len(critical) > 3 else "C",
        "priority_score": max(20, 100 - len(critical) * 20 - len(improvements) * 5),
        "critical_fixes": critical,
        "content_optimizations": content_opts or [{"area": "General", "suggestion": "Review content for keyword optimization and user intent match.", "example": "Ensure the page answers the primary search query comprehensively."}],
        "technical_seo": [{"item": "Schema Markup", "action": "Add structured data relevant to page content"}] if not page or not page.schema_markup else [],
        "aeo_optimizations": [{"area": "Answer Boxes", "action": "Add FAQ section with structured Q&A"}],
        "geo_optimizations": [{"area": "AI Citability", "action": "Add definition paragraphs, statistics, and authoritative statements"}],
        "estimated_impact": f"Fixing {len(critical)} critical issues could improve ranking potential by {len(critical) * 15}%",
        "notes": "Fallback analysis. Set GEMINI_API_KEY for AI-powered optimization plans.",
    }


@router.get("/audit/{audit_id}/page-intelligence/{page_url:path}")
async def get_page_intelligence(audit_id: str, page_url: str, db: AsyncSession = Depends(get_db)):
    """Complete AI Page Intelligence Report with 6 scores and AI explanation."""
    import traceback as _tb
    try:
        return await _get_page_intelligence_impl(audit_id, page_url, db)
    except HTTPException:
        raise
    except Exception as e:
        _tb.print_exc()
        with open("page_intel_error.log", "a") as _f:
            _f.write(f"\n--- {e} ---\n")
            _f.write(_tb.format_exc())
        raise HTTPException(status_code=500, detail=f"Page intelligence error: {str(e)}")


async def _get_page_intelligence_impl(audit_id: str, page_url: str, db: AsyncSession):
    full_url = page_url
    if not full_url.startswith("http"):
        full_url = "/" + page_url

    # Find the page
    result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    all_pages = result.scalars().all()
    
    page = None
    for p in all_pages:
        if p.url == full_url or p.url.rstrip('/') == full_url.rstrip('/') or full_url in p.url or p.url.endswith(full_url):
            page = p
            break
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Get page analysis record
    pa_result = await db.execute(
        select(PageAnalysisRecord).where(
            PageAnalysisRecord.audit_id == audit_id,
            PageAnalysisRecord.page_url == page.url,
        )
    )
    pa = pa_result.scalar_one_or_none()

    # Get issues for this page
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id, Issue.page_url == page.url)
    )
    page_issues = issues_result.scalars().all()

    # Get recommendations for this page
    recs_result = await db.execute(
        select(Recommendation).where(Recommendation.audit_id == audit_id, Recommendation.page_url == page.url)
    )
    page_recs = recs_result.scalars().all()

    # Get site-wide scores for context
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    site_scores = scores_result.scalar_one_or_none()

    # Get all page analyses for comparison
    all_pa_result = await db.execute(select(PageAnalysisRecord).where(PageAnalysisRecord.audit_id == audit_id))
    all_pas = all_pa_result.scalars().all()

    # Get total pages for context
    total_pages = len(all_pages)
    total_issues = len(page_issues)

    # Build per-page scores from PageAnalysisRecord
    page_scores = pa.scores if pa else {}
    
    # Calculate 6 individual scores
    seo_score = page_scores.get("seo", 0)
    content_score = page_scores.get("content", 0)
    aeo_score = page_scores.get("aeo", 0)
    geo_score = page_scores.get("geo", 0)
    ai_vis_score = page_scores.get("ai_visibility", 0)
    technical_score = page_scores.get("technical", 0)
    overall_score = page_scores.get("overall", 0)

    # Classify issues by category
    issues_by_category = {}
    for issue in page_issues:
        cat = (issue.category or "OTHER").upper()
        issues_by_category.setdefault(cat, []).append({
            "id": issue.id,
            "severity": issue.severity,
            "signal_name": issue.signal_name,
            "description": issue.description,
            "impact": issue.impact,
            "fix": issue.fix,
        })

    # Count severity breakdown
    severity_counts = {}
    for issue in page_issues:
        sev = issue.severity or "LOW"
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    # Extract heading structure
    headings = page.headers or []
    heading_structure = []
    for h in headings:
        if isinstance(h, dict):
            heading_structure.append({
                "level": h.get("level", ""),
                "text": h.get("text", "")[:200],
            })

    # Schema analysis
    schemas = page.schema_markup or []
    schema_types = []
    for s in schemas:
        if isinstance(s, dict) and "@type" in s:
            schema_types.append(s["@type"])

    # Content analysis
    content_text = page.content_text or ""
    word_count = page.word_count or 0
    avg_sentence_len = 0
    sentences = []
    if content_text:
        import re
        sentences = re.split(r'[.!?]+', content_text)
        sentences = [s.strip() for s in sentences if s.strip()]
        avg_sentence_len = word_count / max(len(sentences), 1)

    # Image analysis
    images = page.images or []
    images_with_alt = sum(1 for i in images if isinstance(i, dict) and i.get("alt"))
    images_without_alt = len(images) - images_with_alt

    # Link analysis
    internal_links = page.links_internal or []
    external_links = page.links_external or []

    # Generate AI explanation based on scores
    strengths = []
    weaknesses = []
    
    if seo_score >= 70:
        strengths.append("Strong on-page SEO fundamentals")
    elif seo_score < 40:
        weaknesses.append("On-page SEO needs significant improvement")
    
    if content_score >= 70:
        strengths.append("Good content quality and depth")
    elif content_score < 40:
        weaknesses.append("Content is thin or low quality")
    
    if aeo_score >= 60:
        strengths.append("Well-optimized for AI/featured snippets")
    elif aeo_score < 40:
        weaknesses.append("Missing AEO signals (FAQ, question headings)")
    
    if geo_score >= 60:
        strengths.append("Good entity and authority signals")
    elif geo_score < 40:
        weaknesses.append("Weak entity and trust signals for AI search")
    
    if ai_vis_score >= 60:
        strengths.append("Good AI search visibility potential")
    elif ai_vis_score < 40:
        weaknesses.append("Low AI citation probability")
    
    if technical_score >= 70:
        strengths.append("Solid technical SEO foundation")
    elif technical_score < 40:
        weaknesses.append("Technical issues are hurting rankings")

    if images_without_alt > 0:
        weaknesses.append(f"{images_without_alt} images missing alt text")
    
    if word_count < 300:
        weaknesses.append(f"Thin content ({word_count} words)")
    
    if not any(st == "FAQ" or st == "FAQPage" for st in schema_types):
        weaknesses.append("No FAQPage schema for AI extraction")
    
    if len(internal_links) < 3:
        weaknesses.append(f"Only {len(internal_links)} internal links (need 3+)")

    # Build AI explanation
    if weaknesses and strengths:
        explanation = f"This page has {strengths[0].lower()} but {weaknesses[0].lower()}. "
        if len(weaknesses) > 1:
            explanation += f"Additionally, {weaknesses[1].lower()}. "
        explanation += f"Overall score is {overall_score}/100."
    elif weaknesses:
        explanation = f"This page needs work: {weaknesses[0].lower()}. "
        if len(weaknesses) > 1:
            explanation += f"{weaknesses[1].lower()}. "
        explanation += f"Score: {overall_score}/100."
    elif strengths:
        explanation = f"This page performs well: {strengths[0].lower()}. "
        if len(strengths) > 1:
            explanation += f"{strengths[1].lower()}. "
        explanation += f"Score: {overall_score}/100."
    else:
        explanation = f"This page has an overall score of {overall_score}/100 across {total_issues} issues."

    # Quick wins - easy fixes
    quick_wins = []
    for issue in page_issues:
        if issue.severity in ("CRITICAL", "HIGH") and issue.fix:
            quick_wins.append({
                "issue": issue.signal_name,
                "fix": issue.fix,
                "severity": issue.severity,
            })
    quick_wins = quick_wins[:5]

    return {
        "page_url": page.url,
        "audit_id": audit_id,
        "page_data": {
            "url": page.url,
            "status_code": page.status_code,
            "title": page.title,
            "meta_description": page.meta_description,
            "h1": page.h1,
            "word_count": word_count,
            "canonical": page.canonical,
            "response_time_ms": page.response_time_ms,
            "links_internal_count": len(internal_links),
            "links_external_count": len(external_links),
            "images_count": len(images),
            "images_with_alt": images_with_alt,
            "images_without_alt": images_without_alt,
            "schema_count": len(schemas),
            "schema_types": schema_types,
            "heading_structure": heading_structure,
            "is_indexable": "noindex" not in (page.signals or {}).get("robots_meta", "").lower() if page.signals else True,
            "https": True,  # crawled successfully
        },
        "scores": {
            "seo": round(seo_score, 1),
            "content": round(content_score, 1),
            "aeo": round(aeo_score, 1),
            "geo": round(geo_score, 1),
            "ai_visibility": round(ai_vis_score, 1),
            "technical": round(technical_score, 1),
            "overall": round(overall_score, 1),
        },
        "site_context": {
            "total_pages": total_pages,
            "site_seo_score": round(site_scores.seo_score if site_scores else 0, 1),
            "site_overall_score": round(site_scores.overall_score if site_scores else 0, 1),
        },
        "issues_summary": {
            "total": total_issues,
            "by_severity": severity_counts,
            "by_category": {cat: len(items) for cat, items in issues_by_category.items()},
        },
        "issues": issues_by_category,
        "recommendations": [{
            "id": r.id,
            "category": r.category,
            "priority": r.priority,
            "issue": r.issue,
            "current_problem": r.current_problem,
            "why_it_matters": r.why_it_matters,
            "exact_fix": r.exact_fix,
            "before_example": r.before_example,
            "after_example": r.after_example,
            "expected_impact": r.expected_impact,
            "difficulty": r.difficulty,
        } for r in page_recs[:20]],
        "content_analysis": {
            "word_count": word_count,
            "sentence_count": len(sentences),
            "avg_sentence_length": round(avg_sentence_len, 1),
            "heading_count": len(headings),
            "has_lists": any(isinstance(h, dict) and any(kw in h.get("text", "").lower() for kw in ["list", "steps", "tips"]) for h in headings),
        },
        "ai_explanation": explanation,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "quick_wins": quick_wins,
    }


@router.get("/audit/{audit_id}/content-revival")
async def get_content_revival(audit_id: str, db: AsyncSession = Depends(get_db)):
    """Analyze content freshness and detect pages that need revival."""
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    thin_content = []
    outdated_content = []
    orphan_pages = []

    for page in pages:
        word_count = page.word_count or 0
        signals = page.signals or {}
        if word_count > 0 and word_count < 300:
            thin_content.append({
                "url": page.url, "title": page.title or "Untitled", "word_count": word_count,
                "recommended_minimum": 1500, "gap": 1500 - word_count,
                "severity": "CRITICAL" if word_count < 100 else "HIGH",
                "suggestion": f"Increase content from {word_count} to at least 1,500 words with comprehensive coverage.",
            })
        has_date_schema = any(isinstance(s, dict) and s.get("@type") in ("Article", "BlogPosting", "NewsArticle") for s in (page.schema_markup or []))
        if 0 < word_count < 800 and not has_date_schema:
            outdated_content.append({
                "url": page.url, "title": page.title or "Untitled", "word_count": word_count,
                "severity": "MEDIUM",
                "reason": "Short content without date markup suggests stale page",
                "suggestion": "Add datePublished/dateModified schema, update content, expand to 1,500+ words.",
            })
        internal_links = page.links_internal or []
        external_links = page.links_external or []
        if len(internal_links) + len(external_links) == 0 and word_count > 0:
            orphan_pages.append({
                "url": page.url, "title": page.title or "Untitled", "word_count": word_count,
                "severity": "HIGH",
                "reason": "Orphan page - no internal or external links found",
                "suggestion": "Add internal links from relevant pages and contextual external links.",
            })

    total = len(pages)
    thin_pct = (len(thin_content) / max(total, 1)) * 100
    freshness_score = round(max(0, 100 - thin_pct * 2 - len(outdated_content) * 5 - len(orphan_pages) * 3), 1)

    return {
        "audit_id": audit_id,
        "freshness_score": freshness_score,
        "summary": {
            "total_pages": total, "thin_content_count": len(thin_content),
            "outdated_content_count": len(outdated_content), "orphan_pages_count": len(orphan_pages),
            "healthiest_pct": round(100 - thin_pct, 1),
        },
        "thin_content": sorted(thin_content, key=lambda x: x["word_count"])[:20],
        "outdated_content": outdated_content[:20],
        "orphan_pages": orphan_pages[:20],
        "recommendations": [
            {"priority": "CRITICAL", "action": f"Expand {len(thin_content)} thin content pages to 1,500+ words",
             "impact": "Thin content rarely ranks and hurts site authority", "effort": "HIGH"},
            {"priority": "HIGH", "action": f"Add internal links to {len(orphan_pages)} orphan pages",
             "impact": "Orphan pages are invisible to crawlers", "effort": "LOW"},
            {"priority": "MEDIUM", "action": f"Update {len(outdated_content)} stale content pages",
             "impact": "Fresh content is favored by Google and AI search", "effort": "MEDIUM"},
        ],
    }


@router.post("/audit/{audit_id}/generate-content")
async def generate_page_content(audit_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    """AI-powered content generation: meta, FAQ, schema, brief, optimize."""
    page_url = body.get("page_url", "")
    action = body.get("action", "meta")

    result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    all_pages = result.scalars().all()
    page = None
    for p in all_pages:
        if p.url == page_url or page_url in p.url:
            page = p
            break
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id, Issue.page_url == page.url))
    issues = issues_result.scalars().all()
    recs_result = await db.execute(select(Recommendation).where(Recommendation.audit_id == audit_id, Recommendation.page_url == page.url))
    recs = recs_result.scalars().all()

    context = {
        "url": page.url, "title": page.title or "", "meta_description": page.meta_description or "",
        "h1": page.h1 or "", "word_count": page.word_count or 0,
        "content_text": (page.content_text or "")[:2000],
        "issues": [{"signal": i.signal_name, "description": i.description, "fix": i.fix} for i in issues[:10]],
        "recommendations": [{"issue": r.issue, "fix": r.exact_fix} for r in recs[:5]],
    }

    try:
        from app.engine.ai_engine import AIEngine
        ai = AIEngine()
        if action == "meta":
            prompt = f"Generate optimized SEO meta tags for: {context['url']}\nTitle: {context['title']}\nMeta: {context['meta_description']}\nH1: {context['h1']}\nProvide: title (50-60 chars), meta desc (150-160 chars), OG tags."
            result_text = await ai.generate(prompt)
        elif action == "faq":
            prompt = f"Generate FAQ for: {context['url']} - {context['title']}\nContent: {context['content_text'][:1000]}\nGenerate 5-8 Q&A pairs with FAQPage schema."
            result_text = await ai.generate(prompt)
        elif action == "schema":
            prompt = f"Generate Schema.org JSON-LD for: {context['url']} - {context['title']}\nInclude all relevant types."
            result_text = await ai.generate(prompt)
        elif action == "brief":
            prompt = f"Content brief for: {context['url']} - {context['title']}\nWord count: {context['word_count']}\nIssues: {', '.join(i['description'] for i in context['issues'][:5])}\nInclude sections, keywords, schema types."
            result_text = await ai.generate(prompt)
        elif action == "optimize":
            prompt = f"Optimization plan for: {context['url']} - {context['title']}\nIssues: {json.dumps(context['issues'][:5])}\nStep-by-step fixes with before/after."
            result_text = await ai.generate(prompt)
        else:
            result_text = "Invalid action. Use: meta, faq, schema, brief, optimize."
    except Exception:
        if action == "meta":
            title = context['title'] or f"{context['url'].split('/')[-1].replace('-', ' ').title()} | Brand"
            desc = context['meta_description'] or f"Discover {context['title'] or 'this page'}."
            result_text = json.dumps({"title": title[:60], "meta_description": desc[:160], "og_title": title[:95], "og_description": desc[:200]}, indent=2)
        elif action == "faq":
            result_text = json.dumps({"schema_type": "FAQPage", "faqs": [{"q": f"What is {context['title']}?", "a": "Details about this service..."}, {"q": "How to get started?", "a": "Contact our team..."}, {"q": "What are the benefits?", "a": "Improved efficiency, cost savings..."}], "note": "Set GEMINI_API_KEY for AI-generated FAQs"}, indent=2)
        elif action == "schema":
            result_text = json.dumps({"@context": "https://schema.org", "@type": "WebPage", "name": context['title'] or "Page", "url": context['url'], "description": context['meta_description']}, indent=2)
        elif action == "brief":
            result_text = json.dumps({"target_word_count": 2000, "sections": ["Introduction", "Key Features", "Benefits", "FAQ", "Conclusion"], "schema_types": ["WebPage", "FAQPage"], "note": "Set GEMINI_API_KEY for AI briefs"}, indent=2)
        else:
            result_text = json.dumps({"error": f"Unknown action: {action}"})

    return {"audit_id": audit_id, "page_url": page.url, "action": action, "generated_content": result_text}


@router.get("/audit/{audit_id}/report-data")
async def get_report_data(audit_id: str, db: AsyncSession = Depends(get_db)):
    cache_key = f"report:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    issues = issues_result.scalars().all()
    recs_result = await db.execute(select(Recommendation).where(Recommendation.audit_id == audit_id))
    recs = recs_result.scalars().all()

    severity_counts = {}
    for issue in issues:
        sev = issue.severity or "LOW"
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    category_counts = {}
    for issue in issues:
        cat = (issue.category or "OTHER").upper()
        category_counts[cat] = category_counts.get(cat, 0) + 1

    critical_issues = [i for i in issues if i.severity in ("CRITICAL", "HIGH")][:30]
    top_recs = sorted(recs, key=lambda r: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(r.priority, 4))[:15]

    pa_result = await db.execute(select(PageAnalysisRecord).where(PageAnalysisRecord.audit_id == audit_id))
    pas = pa_result.scalars().all()
    page_scores = [{"url": pa.page_url, "scores": pa.scores or {}} for pa in pas]

    page_type_counts = {}
    context_issues_all = []
    for p in pages:
        pt = p.page_type or "UNKNOWN"
        page_type_counts[pt] = page_type_counts.get(pt, 0) + 1
        if p.context_issues:
            for ci in p.context_issues:
                ci["page_url"] = p.url
                ci["page_type"] = pt
            context_issues_all.extend(p.context_issues)

    # Content analysis
    thin_pages = [p for p in pages if (p.word_count or 0) < 300]
    avg_wc = sum(p.word_count or 0 for p in pages) / max(len(pages), 1)
    content_analysis = {
        "avg_word_count": round(avg_wc),
        "thin_content_count": len(thin_pages),
        "thin_content_urls": [p.url for p in thin_pages[:50]],
    }

    # Internal links
    link_pages = [p for p in pages if p.url]
    def _link_count(val):
        if isinstance(val, list): return len(val)
        if isinstance(val, str):
            try:
                import json
                parsed = json.loads(val)
                return len(parsed) if isinstance(parsed, list) else 0
            except: return 0
        return 0
    total_internal = sum(_link_count(p.links_internal) for p in link_pages)
    total_external = sum(_link_count(p.links_external) for p in link_pages)
    no_links = [p.url for p in link_pages if _link_count(p.links_internal) == 0]
    link_data = {
        "total_pages": len(pages),
        "avg_internal_links": round(total_internal / max(len(pages), 1), 1),
        "avg_external_links": round(total_external / max(len(pages), 1), 1),
        "pages_with_no_internal_links": len(no_links),
        "orphan_pages": len(no_links),
        "no_links_urls": no_links[:50],
    }

    # Issues by category (full detail)
    issues_by_category_detail = {}
    for issue in issues:
        cat = (issue.category or "OTHER").upper()
        issues_by_category_detail.setdefault(cat, []).append({
            "severity": issue.severity,
            "signal_name": issue.signal_name,
            "description": issue.description,
            "fix": issue.fix,
        })

    resp = {
        "report_title": f"AI SEO Intelligence Report - {audit.website_url}",
        "audit_id": audit_id, "audit_url": audit.website_url,
        "generated_at": str(audit.created_at) if audit.created_at else "",
        "site_summary": {
            "total_pages": len(pages), "total_issues": len(issues), "total_recommendations": len(recs),
            "overall_score": round(scores.overall_score if scores else 0, 1),
            "seo_score": round(scores.seo_score if scores else 0, 1),
            "technical_score": round(scores.technical_score if scores else 0, 1),
            "content_score": round(scores.content_score if scores else 0, 1),
            "aeo_score": round(scores.aeo_score if scores else 0, 1),
            "geo_score": round(scores.geo_score if scores else 0, 1),
            "ai_visibility_score": round(scores.ai_visibility_score if scores else 0, 1),
            "page_type_breakdown": page_type_counts,
        },
        "issues_summary": {"total": len(issues), "by_severity": severity_counts, "by_category": category_counts},
        "critical_issues": [{"page": i.page_url, "signal": i.signal_name, "severity": i.severity, "description": i.description, "impact": i.impact, "fix": i.fix} for i in critical_issues],
        "context_issues": context_issues_all,
        "top_recommendations": [{"category": r.category, "priority": r.priority, "issue": r.issue, "current_problem": r.current_problem, "why_it_matters": r.why_it_matters, "exact_fix": r.exact_fix, "before_example": r.before_example, "after_example": r.after_example, "expected_impact": r.expected_impact, "difficulty": r.difficulty} for r in top_recs],
        "page_scores": sorted(page_scores, key=lambda x: x["scores"].get("overall", 0)),
        "content_analysis": content_analysis,
        "internal_links": link_data,
        "issues_by_category": issues_by_category_detail,
    }

    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/gsc-overview")
async def get_gsc_overview(audit_id: str, days: int = 28):
    """Get GSC search performance overview."""
    from app.engine.gsc_engine import GSCEngine
    from app.models import Audit

    gsc = GSCEngine()
    if not gsc.available:
        return {"available": False, "error": "GSC service account not configured. Place gsc_service_account.json in backend/credentials/"}

    from app.database import engine as _db_engine
    async with AsyncSession(_db_engine, expire_on_commit=False) as db:
        audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
        audit = audit_result.scalar_one_or_none()
        if not audit:
            raise HTTPException(status_code=404, detail="Audit not found")
        property_url = audit.gsc_property or audit.website_url

    data = gsc.get_search_analytics(property_url, days=days)
    page_data = gsc.get_page_performance(property_url, days=days)
    top_queries = gsc.get_top_queries(property_url, days=days, limit=25)
    long_tail = gsc.get_long_tail_keywords(property_url, days=days)

    return {
        "available": True,
        "property": property_url,
        "period_days": days,
        "overview": {
            "total_clicks": data.get("total_clicks", 0),
            "total_impressions": data.get("total_impressions", 0),
            "avg_ctr": data.get("avg_ctr", 0),
            "avg_position": data.get("avg_position", 0),
        },
        "top_pages": page_data[:20],
        "top_queries": top_queries,
        "long_tail_keywords": long_tail,
    }


@router.get("/audit/{audit_id}/gsc-keywords")
async def get_gsc_keywords(audit_id: str, days: int = 28):
    """Get all keywords with GSC performance data for the site."""
    from app.engine.gsc_engine import GSCEngine
    from app.models import Audit

    gsc = GSCEngine()
    if not gsc.available:
        return {"available": False, "keywords": []}

    from app.database import engine as _db_engine
    async with AsyncSession(_db_engine, expire_on_commit=False) as db:
        audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
        audit = audit_result.scalar_one_or_none()
        if not audit:
            raise HTTPException(status_code=404, detail="Audit not found")
        property_url = audit.gsc_property or audit.website_url

    all_queries = gsc.get_top_queries(property_url, days=days, limit=200)
    long_tail = gsc.get_long_tail_keywords(property_url, days=days)

    def classify_intent(query):
        q = query.lower()
        informational = ["what", "how", "why", "when", "where", "who", "guide", "tutorial", "learn", "example", "tips", "best practices"]
        commercial = ["best", "top", "review", "comparison", "vs", "alternative", "pricing", "cost", "cheap", "affordable"]
        transactional = ["buy", "get", "download", "sign up", "register", "free trial", "demo", "contact", "hire"]
        navigational = ["login", "dashboard", "support", "docs", "api", "pricing page", "about us"]

        if any(w in q for w in transactional): return "Transactional"
        if any(w in q for w in commercial): return "Commercial"
        if any(w in q for w in navigational): return "Navigational"
        if any(w in q for w in informational): return "Informational"
        if "?" in q: return "Informational"
        return "Mixed"

    enriched = []
    for kw in all_queries:
        enriched.append({
            **kw,
            "intent": classify_intent(kw["query"]),
            "is_long_tail": len(kw["query"].split()) >= 3,
        })

    return {
        "available": True,
        "total_keywords": len(enriched),
        "long_tail_count": sum(1 for k in enriched if k["is_long_tail"]),
        "keywords": enriched,
        "long_tail_keywords": long_tail,
    }


@router.get("/audit/{audit_id}/backlink-profile")
async def get_backlink_profile(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id, Issue.category == "SEO")
    )
    seo_issues = issues_result.scalars().all()

    all_outbound = []
    for p in pages:
        for link in (p.links_external or []):
            if isinstance(link, dict):
                all_outbound.append({"url": link.get("url", link.get("href", "")), "text": link.get("text", ""), "page": p.url, "rel": link.get("rel", "")})
            elif isinstance(link, str):
                all_outbound.append({"url": link, "text": "", "page": p.url, "rel": ""})

    linked_domains = {}
    for link in all_outbound:
        domain = link["url"].split("//")[-1].split("/")[0] if link["url"] else ""
        if domain:
            linked_domains.setdefault(domain, []).append(link)

    anchor_text_dist = {}
    for link in all_outbound:
        text = (link.get("text") or "no text").strip()[:50]
        anchor_text_dist[text] = anchor_text_dist.get(text, 0) + 1

    no_follow_count = sum(1 for link in all_outbound if "nofollow" in str(link.get("rel", "")).lower())
    do_follow_count = len(all_outbound) - no_follow_count

    outbound_score = 50
    if len(linked_domains) > 10:
        outbound_score += 15
    if len(all_outbound) > 20:
        outbound_score += 10
    if no_follow_count / max(len(all_outbound), 1) < 0.5:
        outbound_score += 10
    outbound_score = min(outbound_score, 100)

    broken_outbound = []
    for link in all_outbound:
        if link["url"] and any(kw in link["url"].lower() for kw in ["404", "error", "broken", "not-found"]):
            broken_outbound.append(link)

    return {
        "backlink_score": outbound_score,
        "outbound_link_count": len(all_outbound),
        "linked_domains": len(linked_domains),
        "dofollow_count": do_follow_count,
        "nofollow_count": no_follow_count,
        "top_linked_domains": sorted(
            [{"domain": d, "count": len(links)} for d, links in linked_domains.items()],
            key=lambda x: x["count"], reverse=True
        )[:20],
        "anchor_text_distribution": sorted(
            [{"text": t, "count": c} for t, c in anchor_text_dist.items()],
            key=lambda x: x["count"], reverse=True
        )[:20],
        "pages_with_most_outbound_links": sorted(
            [{"url": p.url, "count": len(p.links_external or [])} for p in pages if p.links_external],
            key=lambda x: x["count"], reverse=True
        )[:10],
        "issues": [{"id": i.id, "page_url": i.page_url, "severity": i.severity, "signal_name": i.signal_name, "description": i.description, "fix": i.fix} for i in seo_issues[:20]],
        "signals": {k: v for k, v in (scores.signals if scores else {}).items() if isinstance(v, dict) and v.get("category") == "SEO"},
        "note": "This site cannot analyze inbound backlinks without third-party API access (Ahrefs, Moz, etc.). These are outbound link metrics from your own pages.",
    }


@router.get("/audit/{audit_id}/local-seo")
async def get_local_seo(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()

    nap_signals = {"address_found": False, "phone_found": False, "schema_local": False}
    local_keywords = ["address", "phone", "contact", "location", "map", "directions", "opening hours", "street", "city", "zip"]
    pages_with_local = []

    for p in pages:
        text = (p.content_text or "").lower()
        has_nap = any(kw in text for kw in local_keywords)
        has_local_schema = any(
            isinstance(s, dict) and s.get("@type") in ("LocalBusiness", "Restaurant", "Store", "MedicalBusiness", "DentistOffice")
            for s in (p.schema_markup or [])
        )
        if has_nap:
            nap_signals["address_found"] = True
        if "phone" in text or "tel:" in text:
            nap_signals["phone_found"] = True
        if has_local_schema:
            nap_signals["schema_local"] = True
        if has_nap or has_local_schema:
            pages_with_local.append(p.url)

    signals_count = sum(1 for v in nap_signals.values() if v)
    score = round(signals_count / max(len(nap_signals), 1) * 100)

    return {
        "local_seo_score": score,
        "nap_signals": nap_signals,
        "pages_with_local_signals": len(pages_with_local),
        "pages_with_local_urls": pages_with_local[:20],
        "total_pages": len(pages),
        "recommendations": [
            {"priority": "HIGH", "action": "Add LocalBusiness schema to homepage", "impact": "Improves local search visibility"},
            {"priority": "HIGH", "action": "Ensure NAP consistency across all pages", "impact": "Builds local citation authority"},
            {"priority": "MEDIUM", "action": "Create dedicated contact/location pages", "impact": "Improves local landing page signals"},
            {"priority": "MEDIUM", "action": "Add Google Business Profile link", "impact": "Connects site to GBP for local SEO"},
        ],
    }


@router.get("/audit/{audit_id}/mobile-seo")
async def get_mobile_seo(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id)
    )
    all_issues = issues_result.scalars().all()

    mobile_issues = [i for i in all_issues if "mobile" in (i.signal_name or "").lower() or "mobile" in (i.description or "").lower() or "viewport" in (i.signal_name or "").lower()]
    slow_pages = [p for p in pages if p.response_time_ms and p.response_time_ms > 3000]
    small_text = sum(1 for p in pages if p.word_count and p.word_count < 100)

    total = len(pages)
    has_viewport = sum(1 for p in pages if p.signals and p.signals.get("has_viewport"))
    responsive_score = round((has_viewport / max(total, 1)) * 100)

    score = 60
    if responsive_score > 80:
        score += 15
    if len(slow_pages) == 0:
        score += 15
    if len(mobile_issues) < 3:
        score += 10
    score = min(score, 100)

    return {
        "mobile_seo_score": score,
        "responsive_score": responsive_score,
        "total_pages": total,
        "slow_pages_count": len(slow_pages),
        "mobile_issues_count": len(mobile_issues),
        "mobile_issues": [{"id": i.id, "page_url": i.page_url, "severity": i.severity, "signal_name": i.signal_name, "description": i.description, "fix": i.fix} for i in mobile_issues[:20]],
        "slow_pages": [{"url": p.url, "response_time_ms": p.response_time_ms} for p in sorted(slow_pages, key=lambda x: x.response_time_ms or 0, reverse=True)[:10]],
        "signals": {k: v for k, v in (scores.signals if scores else {}).items() if isinstance(v, dict)},
        "recommendations": [
            {"priority": "HIGH", "action": "Ensure all pages have a viewport meta tag", "impact": "Required for mobile-first indexing"},
            {"priority": "HIGH", "action": "Optimize page load times to under 3 seconds", "impact": "Core Web Vitals directly affect ranking"},
            {"priority": "MEDIUM", "action": "Use responsive images with srcset", "impact": "Reduces mobile bandwidth usage"},
            {"priority": "MEDIUM", "action": "Implement touch-friendly navigation", "impact": "Improves mobile user experience"},
        ],
    }


@router.get("/audit/{audit_id}/image-seo")
async def get_image_seo(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()

    total_images = 0
    images_with_alt = 0
    images_without_alt = 0
    images_with_title = 0
    large_images = 0
    image_pages = []

    for p in pages:
        images = p.images or []
        page_has_images = False
        for img in images:
            if isinstance(img, dict):
                total_images += 1
                page_has_images = True
                alt = img.get("alt", "")
                if alt and alt.strip():
                    images_with_alt += 1
                else:
                    images_without_alt += 1
                if img.get("title"):
                    images_with_title += 1
                src = img.get("src", img.get("url", ""))
                if any(ext in src.lower() for ext in [".png", ".bmp", ".tiff"]):
                    large_images += 1
        if page_has_images:
            image_pages.append({"url": p.url, "image_count": len(images), "with_alt": sum(1 for i in images if isinstance(i, dict) and i.get("alt"))})

    alt_pct = round(images_with_alt / max(total_images, 1) * 100, 1)
    score = round(alt_pct)
    if total_images > 0 and images_with_title / total_images > 0.5:
        score = min(score + 10, 100)

    return {
        "image_seo_score": score,
        "total_images": total_images,
        "images_with_alt": images_with_alt,
        "images_without_alt": images_without_alt,
        "images_with_title": images_with_title,
        "alt_text_coverage_pct": alt_pct,
        "potential_large_images": large_images,
        "pages_with_images": len(image_pages),
        "page_details": sorted(image_pages, key=lambda x: x["image_count"], reverse=True)[:20],
        "issues": [{"signal_name": "Missing Alt Text", "severity": "HIGH", "description": f"{images_without_alt} images missing alt text", "fix": "Add descriptive alt text to all images"}] if images_without_alt > 0 else [],
        "recommendations": [
            {"priority": "HIGH", "action": "Add descriptive alt text to all images", "impact": "Improves accessibility and image SEO"},
            {"priority": "MEDIUM", "action": "Convert large images to WebP format", "impact": "Reduces page load time by 25-50%"},
            {"priority": "MEDIUM", "action": "Add title attributes to important images", "impact": "Provides additional context for search engines"},
            {"priority": "LOW", "action": "Create an image sitemap", "impact": "Helps search engines discover all images"},
        ],
    }


@router.get("/audit/{audit_id}/sitemap-robots")
async def get_sitemap_robots(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()

    total = len(pages)
    indexed = sum(1 for p in pages if p.signals and "noindex" not in str(p.signals.get("robots_meta", "")).lower())
    non_indexed = total - indexed
    redirects = sum(1 for p in pages if p.status_code and 300 <= p.status_code < 400)
    errors = sum(1 for p in pages if p.status_code and p.status_code >= 400)
    canonicals = sum(1 for p in pages if p.canonical)

    url_patterns = {}
    for p in pages:
        parts = p.url.replace("https://", "").replace("http://", "").split("/")
        if len(parts) > 1:
            path = "/" + "/".join(parts[1:3])
            url_patterns[path] = url_patterns.get(path, 0) + 1

    score = 50
    if canonicals / max(total, 1) > 0.8:
        score += 15
    if errors == 0:
        score += 15
    if indexed / max(total, 1) > 0.9:
        score += 10
    if redirects < total * 0.1:
        score += 10
    score = min(score, 100)

    return {
        "sitemap_robots_score": score,
        "total_pages": total,
        "indexed_pages": indexed,
        "non_indexed_pages": non_indexed,
        "redirect_count": redirects,
        "error_count": errors,
        "pages_with_canonical": canonicals,
        "canonical_coverage_pct": round(canonicals / max(total, 1) * 100, 1),
        "url_structure": sorted([{"pattern": k, "count": v} for k, v in url_patterns.items()], key=lambda x: x["count"], reverse=True)[:15],
        "error_pages": [{"url": p.url, "status_code": p.status_code} for p in pages if p.status_code and p.status_code >= 400][:20],
        "issues": [{"signal_name": "Missing Canonical", "severity": "MEDIUM", "description": f"{total - canonicals} pages missing canonical tag", "fix": "Add canonical tags to all pages"}] if total - canonicals > 0 else [],
        "recommendations": [
            {"priority": "HIGH", "action": "Generate and submit XML sitemap", "impact": "Helps search engines discover all pages"},
            {"priority": "HIGH", "action": "Configure robots.txt properly", "impact": "Controls crawler access to important pages"},
            {"priority": "MEDIUM", "action": "Fix broken links and 404 errors", "impact": "Prevents crawl budget waste"},
            {"priority": "MEDIUM", "action": "Implement proper canonical tags", "impact": "Prevents duplicate content issues"},
        ],
    }


@router.get("/audit/{audit_id}/security-headers")
async def get_security_headers(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()

    total = len(pages)
    https_count = sum(1 for p in pages if p.url.startswith("https"))
    http_count = total - https_count

    security_signals = {
        "https_enabled": https_count > 0,
        "mixed_content": http_count > 0 and https_count > 0,
        "all_https": https_count == total,
    }

    score = 50
    if security_signals["all_https"]:
        score += 25
    elif security_signals["https_enabled"]:
        score += 10
    if not security_signals["mixed_content"]:
        score += 15
    score = min(score, 100)

    return {
        "security_score": score,
        "total_pages": total,
        "https_pages": https_count,
        "http_pages": http_count,
        "all_https": security_signals["all_https"],
        "mixed_content": security_signals["mixed_content"],
        "checks": security_signals,
        "issues": [
            {"signal_name": "Mixed Content", "severity": "HIGH", "description": "Some pages use HTTP while others use HTTPS", "fix": "Redirect all HTTP pages to HTTPS"},
        ] if security_signals["mixed_content"] else [],
        "recommendations": [
            {"priority": "HIGH", "action": "Enable HTTPS on all pages", "impact": "HTTPS is a ranking signal and required for security"},
            {"priority": "HIGH", "action": "Add Strict-Transport-Security header", "impact": "Prevents protocol downgrade attacks"},
            {"priority": "MEDIUM", "action": "Implement Content-Security-Policy", "impact": "Prevents XSS and code injection attacks"},
            {"priority": "MEDIUM", "action": "Add X-Content-Type-Options header", "impact": "Prevents MIME-type sniffing"},
            {"priority": "LOW", "action": "Set X-Frame-Options to DENY or SAMEORIGIN", "impact": "Prevents clickjacking attacks"},
        ],
    }


@router.get("/audit/{audit_id}/social-seo")
async def get_social_seo(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()

    total = len(pages)
    og_count = 0
    twitter_count = 0
    og_pages = []
    twitter_pages = []

    for p in pages:
        og = p.open_graph or {}
        tc = p.twitter_card or {}
        if any(v for v in og.values() if v):
            og_count += 1
            og_pages.append(p.url)
        if any(v for v in tc.values() if v):
            twitter_count += 1
            twitter_pages.append(p.url)

    og_pct = round(og_count / max(total, 1) * 100, 1)
    twitter_pct = round(twitter_count / max(total, 1) * 100, 1)
    score = round((og_pct + twitter_pct) / 2)

    return {
        "social_seo_score": score,
        "total_pages": total,
        "pages_with_og": og_count,
        "pages_with_twitter": twitter_count,
        "og_coverage_pct": og_pct,
        "twitter_coverage_pct": twitter_pct,
        "pages_with_og_urls": og_pages[:20],
        "pages_with_twitter_urls": twitter_pages[:20],
        "issues": [
            {"signal_name": "Missing Open Graph Tags", "severity": "MEDIUM", "description": f"{total - og_count} pages missing Open Graph tags", "fix": "Add og:title, og:description, og:image to all pages"},
            {"signal_name": "Missing Twitter Cards", "severity": "LOW", "description": f"{total - twitter_count} pages missing Twitter Card tags", "fix": "Add twitter:card, twitter:title, twitter:description"},
        ] if total - og_count > 0 else [],
        "recommendations": [
            {"priority": "HIGH", "action": "Add Open Graph tags to all pages", "impact": "Improves social sharing appearance on Facebook, LinkedIn"},
            {"priority": "HIGH", "action": "Add Twitter Card meta tags", "impact": "Improves appearance when shared on Twitter/X"},
            {"priority": "MEDIUM", "action": "Add og:image to all key pages", "impact": "Visual preview increases click-through rates"},
            {"priority": "LOW", "action": "Implement Schema.org sameAs links", "impact": "Connects site to social profiles for entity recognition"},
        ],
    }


@router.get("/audit/{audit_id}/page-experience")
async def get_page_experience(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id)
    )
    all_issues = issues_result.scalars().all()

    total = len(pages)
    times = [p.response_time_ms for p in pages if p.response_time_ms and p.response_time_ms > 0]
    avg_time = round(sum(times) / max(len(times), 1))
    fast_pages = sum(1 for t in times if t < 1000)
    medium_pages = sum(1 for t in times if 1000 <= t < 3000)
    slow_pages_count = sum(1 for t in times if t >= 3000)

    cwv_issues = [i for i in all_issues if "speed" in (i.signal_name or "").lower() or "cwv" in (i.signal_name or "").lower() or "core web" in (i.description or "").lower() or "lcp" in (i.signal_name or "").lower() or "cls" in (i.signal_name or "").lower()]

    score = 60
    if avg_time < 2000:
        score += 20
    elif avg_time < 3000:
        score += 10
    if slow_pages_count == 0:
        score += 10
    if len(cwv_issues) < 3:
        score += 10
    score = min(score, 100)

    return {
        "page_experience_score": score,
        "total_pages": total,
        "avg_response_time_ms": avg_time,
        "fast_pages": fast_pages,
        "medium_pages": medium_pages,
        "slow_pages": slow_pages_count,
        "speed_distribution": {
            "fast_under_1s": fast_pages,
            "moderate_1s_3s": medium_pages,
            "slow_over_3s": slow_pages_count,
        },
        "cwv_issues": [{"id": i.id, "page_url": i.page_url, "severity": i.severity, "signal_name": i.signal_name, "description": i.description, "fix": i.fix} for i in cwv_issues[:20]],
        "all_issues": [{"id": i.id, "signal_name": i.signal_name, "severity": i.severity, "description": i.description} for i in all_issues[:30]],
        "signals": {k: v for k, v in (scores.signals if scores else {}).items() if isinstance(v, dict)},
        "recommendations": [
            {"priority": "HIGH", "action": "Optimize Largest Contentful Paint (LCP) under 2.5s", "impact": "LCP is a Core Web Vital ranking factor"},
            {"priority": "HIGH", "action": "Minimize Cumulative Layout Shift (CLS) under 0.1", "impact": "CLS measures visual stability"},
            {"priority": "MEDIUM", "action": "Reduce server response time (TTFB)", "impact": "Faster TTFB improves all page load metrics"},
            {"priority": "MEDIUM", "action": "Optimize images and use lazy loading", "impact": "Images are often the largest page resources"},
        ],
    }


@router.get("/audit/{audit_id}/content-quality")
async def get_content_quality(audit_id: str, db: AsyncSession = Depends(get_db)):
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    issues_result = await db.execute(
        select(Issue).where(Issue.audit_id == audit_id, Issue.category == "CONTENT")
    )
    content_issues = issues_result.scalars().all()

    total = len(pages)
    word_counts = [p.word_count or 0 for p in pages]
    avg_words = round(sum(word_counts) / max(total, 1))
    thin = [p for p in pages if p.word_count and p.word_count < 300]
    comprehensive = [p for p in pages if p.word_count and p.word_count >= 1500]

    has_headings = sum(1 for p in pages if p.headers and len(p.headers or []) > 0)
    has_schema = sum(1 for p in pages if p.schema_markup and len(p.schema_markup or []) > 0)
    has_meta = sum(1 for p in pages if p.meta_description)

    eeat_signals = {
        "author_signals": len([p for p in pages if p.content_text and "author" in (p.content_text or "").lower()]),
        "date_signals": len([p for p in pages if p.open_graph and (p.open_graph or {}).get("article:published_time")]),
        "source_signals": len([p for p in pages if p.links_external and len(p.links_external or []) > 0]),
        "expertise_signals": len([p for p in pages if p.word_count and p.word_count > 500]),
        "trust_signals": len([p for p in pages if p.canonical]),
    }

    thin_pct = round(len(thin) / max(total, 1) * 100, 1)
    score = scores.content_score if scores else 50
    score = round(score)

    return {
        "content_quality_score": score,
        "total_pages": total,
        "avg_word_count": avg_words,
        "thin_content_count": len(thin),
        "thin_content_pct": thin_pct,
        "comprehensive_content_count": len(comprehensive),
        "pages_with_headings": has_headings,
        "pages_with_schema": has_schema,
        "pages_with_meta": has_meta,
        "eeat_signals": eeat_signals,
        "eeat_coverage_pct": round(sum(1 for v in eeat_signals.values() if v > 0) / max(len(eeat_signals), 1) * 100, 1),
        "thin_content_pages": [{"url": p.url, "word_count": p.word_count or 0, "title": p.title or ""} for p in sorted(thin, key=lambda x: x.word_count or 0)[:20]],
        "top_content_pages": [{"url": p.url, "word_count": p.word_count or 0, "title": p.title or ""} for p in sorted(pages, key=lambda x: x.word_count or 0, reverse=True)[:10]],
        "issues": [{"id": i.id, "page_url": i.page_url, "severity": i.severity, "signal_name": i.signal_name, "description": i.description, "fix": i.fix} for i in content_issues[:30]],
        "recommendations": [
            {"priority": "HIGH", "action": f"Expand {len(thin)} thin content pages to 1,500+ words", "impact": "Thin content rarely ranks and hurts site authority"},
            {"priority": "HIGH", "action": "Add author bios and publication dates", "impact": "E-E-A-T signals are critical for AI search"},
            {"priority": "MEDIUM", "action": "Add FAQ sections to key pages", "impact": "FAQ content is highly citable by AI search"},
            {"priority": "MEDIUM", "action": "Include data, statistics, and expert quotes", "impact": "Demonstrates expertise and authority"},
        ],
    }


@router.get("/audit/{audit_id}/seo-health")
async def get_seo_health(audit_id: str, db: AsyncSession = Depends(get_db)):
    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    scores_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = scores_result.scalar_one_or_none()
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    issues = issues_result.scalars().all()

    total = len(pages)
    high_issues = [i for i in issues if i.severity in ("HIGH", "CRITICAL")]
    medium_issues = [i for i in issues if i.severity == "MEDIUM"]
    low_issues = [i for i in issues if i.severity == "LOW"]

    errors = sum(1 for p in pages if p.status_code and p.status_code >= 400)
    avg_time = round(sum(p.response_time_ms or 0 for p in pages) / max(total, 1))
    avg_words = round(sum(p.word_count or 0 for p in pages) / max(total, 1))
    canonicals = sum(1 for p in pages if p.canonical)
    with_schema = sum(1 for p in pages if p.schema_markup and len(p.schema_markup or []) > 0)
    with_og = sum(1 for p in pages if p.open_graph and any(v for v in (p.open_graph or {}).values() if v))

    categories = {}
    for i in issues:
        cat = i.category or "OTHER"
        categories[cat] = categories.get(cat, 0) + 1

    category_scores = {}
    for cat, count in categories.items():
        category_scores[cat] = max(0, 100 - count * 5)

    health_checks = [
        {"name": "HTTPS", "status": "pass" if all(p.url.startswith("https") for p in pages) else "fail", "score": 100 if all(p.url.startswith("https") for p in pages) else 50},
        {"name": "Canonical Tags", "status": "pass" if canonicals / max(total, 1) > 0.8 else "warn" if canonicals / max(total, 1) > 0.5 else "fail", "score": round(canonicals / max(total, 1) * 100)},
        {"name": "Schema Markup", "status": "pass" if with_schema / max(total, 1) > 0.5 else "warn" if with_schema / max(total, 1) > 0.2 else "fail", "score": round(with_schema / max(total, 1) * 100)},
        {"name": "Meta Descriptions", "status": "pass" if sum(1 for p in pages if p.meta_description) / max(total, 1) > 0.8 else "warn", "score": round(sum(1 for p in pages if p.meta_description) / max(total, 1) * 100)},
        {"name": "Page Speed", "status": "pass" if avg_time < 2000 else "warn" if avg_time < 3000 else "fail", "score": max(0, 100 - avg_time // 50)},
        {"name": "Content Depth", "status": "pass" if avg_words > 800 else "warn" if avg_words > 400 else "fail", "score": min(100, avg_words // 15)},
        {"name": "Social Tags", "status": "pass" if with_og / max(total, 1) > 0.7 else "warn", "score": round(with_og / max(total, 1) * 100)},
        {"name": "Error Pages", "status": "pass" if errors == 0 else "fail", "score": max(0, 100 - errors * 20)},
    ]

    overall_health = round(sum(c["score"] for c in health_checks) / max(len(health_checks), 1))

    return {
        "seo_health_score": overall_health,
        "audit_id": audit_id,
        "website_url": audit.website_url,
        "scores": {
            "overall": round(scores.overall_score if scores else 0),
            "seo": round(scores.seo_score if scores else 0),
            "technical": round(scores.technical_score if scores else 0),
            "content": round(scores.content_score if scores else 0),
            "aeo": round(scores.aeo_score if scores else 0),
            "geo": round(scores.geo_score if scores else 0),
            "ai_visibility": round(scores.ai_visibility_score if scores else 0),
        },
        "site_stats": {
            "total_pages": total,
            "total_issues": len(issues),
            "high_issues": len(high_issues),
            "medium_issues": len(medium_issues),
            "low_issues": len(low_issues),
            "avg_response_time_ms": avg_time,
            "avg_word_count": avg_words,
            "error_pages": errors,
            "pages_with_canonical": canonicals,
            "pages_with_schema": with_schema,
            "pages_with_social": with_og,
        },
        "health_checks": health_checks,
        "category_breakdown": categories,
        "category_scores": category_scores,
        "top_issues": [{"signal_name": i.signal_name, "severity": i.severity, "description": i.description, "page_url": i.page_url} for i in sorted(issues, key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x.severity, 4))[:15]],
        "grade": "A" if overall_health >= 80 else "B" if overall_health >= 65 else "C" if overall_health >= 50 else "D" if overall_health >= 35 else "F",
    }


@router.post("/audit/{audit_id}/ai-suggestions")
async def get_ai_suggestions(audit_id: str, body: dict = None, db: AsyncSession = Depends(get_db)):
    cache_key = f"ai_suggestions:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.gemini_engine import GeminiEngine
    from app.engine.openai_engine import openai_engine

    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    score_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = score_result.scalar_one_or_none()

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    issues = issues_result.scalars().all()

    high_issues = [i for i in issues if i.severity in ("HIGH", "CRITICAL")]

    audit_data = {
        "website_url": audit.website_url,
        "overall_score": scores.overall_score if scores else 0,
        "seo_score": scores.seo_score if scores else 0,
        "technical_score": scores.technical_score if scores else 0,
        "content_score": scores.content_score if scores else 0,
        "aeo_score": scores.aeo_score if scores else 0,
        "geo_score": scores.geo_score if scores else 0,
        "ai_visibility_score": scores.ai_visibility_score if scores else 0,
        "total_pages": len(pages),
        "total_issues": len(issues),
        "high_issues": len(high_issues),
        "top_issues": [{"signal": i.signal_name, "severity": i.severity, "description": i.description, "page": i.page_url} for i in high_issues[:10]],
    }

    suggestions = None
    provider = "fallback"

    try:
        from app.engine.dual_ai import dual_ai_analyze_seo
        groq_sugg = await dual_ai_analyze_seo(
            audit.website_url, audit.website_url, "",
            f"SEO Score: {scores.seo_score if scores else 0}, Technical: {scores.technical_score if scores else 0}, AEO: {scores.aeo_score if scores else 0}",
            {}, [{"name": i.signal_name, "status": "fail" if i.severity in ("CRITICAL","HIGH") else "warn"} for i in high_issues[:20]],
        )
        if groq_sugg and groq_sugg.get("executive_summary"):
            suggestions = groq_sugg
            provider = "dual-ai"
    except Exception as e:
        logger.warning(f"DualAI suggestions failed: {e}")

    if not suggestions:
        from app.engine.gemini_engine import GeminiEngine
        from app.engine.openai_engine import openai_engine
        if openai_engine.available:
            try:
                suggestions = await openai_engine.generate_suggestions(audit_data)
                if suggestions:
                    provider = "openai"
            except Exception as e:
                logger.warning(f"OpenAI suggestions failed: {e}")
        if not suggestions:
            gemini = GeminiEngine()
                suggestions = await gemini.generate_suggestions(audit_data)
                provider = "gemini"
    result = {"audit_id": audit_id, "suggestions": suggestions, "provider": provider}
    _cache_set(cache_key, result)
    return result


@router.get("/audit/{audit_id}/keywords-enhanced")
async def get_keywords_enhanced(audit_id: str, days: int = 28, db: AsyncSession = Depends(get_db)):
    """Merged keyword intelligence: internal analysis + GSC data + per-page mapping."""
    # --- Internal keywords from crawler ---
    kw_result = await db.execute(
        select(KeywordRecord).where(KeywordRecord.audit_id == audit_id).order_by(KeywordRecord.frequency.desc())
    )
    internal_kws = kw_result.scalars().all()
    internal_map = {}
    for kw in internal_kws:
        internal_map[kw.keyword.lower()] = {
            "keyword": kw.keyword,
            "frequency": kw.frequency,
            "opportunity": kw.opportunity,
            "action": kw.action,
            "source": "internal",
        }

    # --- Pages for per-page mapping ---
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    page_urls = [p.url for p in pages]
    page_content_map = {}
    for p in pages:
        text = (p.content_text or "").lower()
        title = (p.title or "").lower()
        h1 = (p.h1 or "").lower()
        page_content_map[p.url] = f"{title} {h1} {text}"

    # --- Per-page keyword presence ---
    per_page_keywords = {}
    for p_url in page_urls:
        per_page_keywords[p_url] = {"keywords_found": [], "keyword_count": 0}
        content = page_content_map[p_url]
        for kw_obj in internal_kws:
            kw_lower = kw_obj.keyword.lower()
            if kw_lower in content:
                per_page_keywords[p_url]["keywords_found"].append(kw_obj.keyword)
                per_page_keywords[p_url]["keyword_count"] += 1

    # --- GSC data (optional) ---
    gsc_keywords = []
    gsc_available = False
    gsc_overview = {"total_clicks": 0, "total_impressions": 0, "avg_ctr": 0, "avg_position": 0}
    try:
        from app.engine.gsc_engine import GSCEngine
        gsc = GSCEngine()
        if gsc.available:
            audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
            audit = audit_result.scalar_one_or_none()
            if audit:
                property_url = audit.gsc_property or audit.website_url
                gsc_data = gsc.get_search_analytics(property_url, days=days)
                if "error" not in gsc_data:
                    gsc_available = True
                    gsc_overview = {
                        "total_clicks": gsc_data.get("total_clicks", 0),
                        "total_impressions": gsc_data.get("total_impressions", 0),
                        "avg_ctr": gsc_data.get("avg_ctr", 0),
                        "avg_position": gsc_data.get("avg_position", 0),
                    }
                    all_queries = gsc.get_top_queries(property_url, days=days, limit=200)

                    def classify_intent(query):
                        q = query.lower()
                        informational = ["what", "how", "why", "when", "where", "who", "guide", "tutorial", "learn", "example", "tips", "best practices"]
                        commercial = ["best", "top", "review", "comparison", "vs", "alternative", "pricing", "cost", "cheap", "affordable"]
                        transactional = ["buy", "get", "download", "sign up", "register", "free trial", "demo", "contact", "hire"]
                        navigational = ["login", "dashboard", "support", "docs", "api", "pricing page", "about us"]
                        if any(w in q for w in transactional): return "Transactional"
                        if any(w in q for w in commercial): return "Commercial"
                        if any(w in q for w in navigational): return "Navigational"
                        if any(w in q for w in informational): return "Informational"
                        if "?" in q: return "Informational"
                        return "Mixed"

                    for kw in all_queries:
                        gsc_keywords.append({
                            **kw,
                            "intent": classify_intent(kw["query"]),
                            "is_long_tail": len(kw["query"].split()) >= 3,
                        })
    except Exception as e:
        logger.warning(f"GSC unavailable for enhanced keywords: {e}")

    # --- Merge: build combined list ---
    gsc_kw_set = set()
    combined = []

    for kw_obj in internal_kws:
        kw_lower = kw_obj.keyword.lower()
        gsc_match = next((g for g in gsc_keywords if g["query"].lower() == kw_lower), None)
        combined.append({
            "keyword": kw_obj.keyword,
            "frequency": kw_obj.frequency,
            "opportunity": kw_obj.opportunity,
            "action": kw_obj.action,
            "is_long_tail": len(kw_obj.keyword.split()) >= 3,
            "source": "internal" if not gsc_match else "both",
            "clicks": gsc_match["clicks"] if gsc_match else 0,
            "impressions": gsc_match["impressions"] if gsc_match else 0,
            "ctr": gsc_match["ctr"] if gsc_match else 0,
            "position": gsc_match["position"] if gsc_match else 0,
            "intent": gsc_match["intent"] if gsc_match else "Unknown",
            "gsc_tracked": bool(gsc_match),
        })
        if gsc_match:
            gsc_kw_set.add(gsc_match["query"].lower())

    # --- Missing keywords: in GSC but not in internal ---
    missing_keywords = []
    if gsc_available:
        for gkw in gsc_keywords:
            if gkw["query"].lower() not in gsc_kw_set:
                missing_keywords.append({
                    "keyword": gkw["query"],
                    "frequency": 0,
                    "opportunity": "High — appears in search results but not targeted in content",
                    "action": "Add this keyword to relevant page content and meta tags",
                    "is_long_tail": gkw["is_long_tail"],
                    "source": "gsc_missing",
                    "clicks": gkw["clicks"],
                    "impressions": gkw["impressions"],
                    "ctr": gkw["ctr"],
                    "position": gkw["position"],
                    "intent": gkw["intent"],
                    "gsc_tracked": True,
                })

    # --- Intent classification summary ---
    intent_summary = {"Informational": 0, "Commercial": 0, "Transactional": 0, "Navigational": 0, "Mixed": 0, "Unknown": 0}
    for kw in combined + missing_keywords:
        intent_summary[kw["intent"]] = intent_summary.get(kw["intent"], 0) + 1

    # --- Keyword health score ---
    total_combined = len(combined) + len(missing_keywords)
    if total_combined > 0:
        covered = len([k for k in combined if k["gsc_tracked"]])
        long_tail_in_combined = len([k for k in combined if k["is_long_tail"]])
        health_score = min(100, int(
            (covered / max(len(gsc_keywords), 1) * 40) +
            (long_tail_in_combined / max(len(combined), 1) * 30) +
            (len(combined) / max(total_combined, 1) * 30)
        ))
    else:
        health_score = 0

    # --- Per-page keyword mapping summary ---
    page_keyword_map = []
    for p_url in page_urls:
        pk = per_page_keywords[p_url]
        page_keyword_map.append({
            "url": p_url,
            "keywords_found": pk["keywords_found"][:20],
            "keyword_count": pk["keyword_count"],
            "total_internal_keywords": len(internal_kws),
        })
    page_keyword_map.sort(key=lambda x: x["keyword_count"], reverse=True)

    # --- Action plan (prioritized) ---
    action_plan = []
    # 1. Missing keywords from GSC
    top_missing = sorted(missing_keywords, key=lambda x: x["clicks"] + x["impressions"], reverse=True)[:10]
    for mk in top_missing:
        action_plan.append({
            "priority": "Critical" if mk["clicks"] > 5 else "High",
            "type": "missing_keyword",
            "keyword": mk["keyword"],
            "detail": f"Getting {mk['clicks']} clicks/{mk['impressions']} impressions but not targeted in content.",
            "suggestion": f"Add \"{mk['keyword']}\" to the most relevant page content, title, and meta description.",
        })
    # 2. Internal keywords with no GSC data (orphan content)
    orphan_kws = [k for k in combined if not k["gsc_tracked"] and k["frequency"] > 0][:5]
    for ok in orphan_kws:
        action_plan.append({
            "priority": "Medium",
            "type": "orphan_keyword",
            "keyword": ok["keyword"],
            "detail": f"Used {ok['frequency']} times in content but not appearing in search results.",
            "suggestion": ok["action"] or f"Review \"{ok['keyword']}\" usage — may need better on-page optimization or meta tags.",
        })
    # 3. Content improvements from keyword data
    thin_pages = [p for p in pages if p.word_count and p.word_count < 300]
    for tp in thin_pages[:3]:
        action_plan.append({
            "priority": "High",
            "type": "thin_content",
            "keyword": None,
            "detail": f"{tp.url} has only {tp.word_count} words — too thin to rank.",
            "suggestion": f"Expand to 800+ words with targeted keywords and valuable content.",
        })

    return {
        "health_score": health_score,
        "gsc_available": gsc_available,
        "gsc_overview": gsc_overview,
        "total_internal": len(internal_kws),
        "total_gsc": len(gsc_keywords),
        "total_combined": len(combined),
        "total_missing": len(missing_keywords),
        "long_tail_count": len([k for k in combined if k["is_long_tail"]]),
        "short_tail_count": len([k for k in combined if not k["is_long_tail"]]),
        "intent_summary": intent_summary,
        "keywords": combined,
        "missing_keywords": missing_keywords,
        "gsc_keywords": gsc_keywords,
        "page_keyword_map": page_keyword_map,
        "action_plan": action_plan,
        "page_urls": page_urls,
    }


@router.get("/audit/{audit_id}/keyword-research")
async def get_keyword_research(audit_id: str, db: AsyncSession = Depends(get_db)):
    """Complete keyword research: clusters, questions, LSI, entities, cannibalization, suggestions."""
    cache_key = f"kw_research:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.keyword_research import KeywordResearchEngine
    from app.engine.crawler import PageData

    kw_result = await db.execute(
        select(KeywordRecord).where(KeywordRecord.audit_id == audit_id).order_by(KeywordRecord.frequency.desc())
    )
    internal_kws = kw_result.scalars().all()

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    page_objects = []
    for p in pages:
        links_internal = p.links_internal or []
        links_external = p.links_external or []
        if isinstance(links_internal, str):
            links_internal = json.loads(links_internal) if links_internal.strip() else []
        if isinstance(links_external, str):
            links_external = json.loads(links_external) if links_external.strip() else []
        headings = p.headers or []
        if isinstance(headings, str):
            headings = json.loads(headings) if headings.strip() else []
        images = p.images or []
        if isinstance(images, str):
            images = json.loads(images) if images.strip() else []
        schema = p.schema_markup or []
        if isinstance(schema, str):
            schema = json.loads(schema) if schema.strip() else []

        pd = PageData()
        pd.url = p.url
        pd.status_code = p.status_code or 200
        pd.title = p.title or ""
        pd.h1 = p.h1 or ""
        pd.meta_description = p.meta_description or ""
        pd.content_text = p.content_text or ""
        pd.word_count = p.word_count or 0
        pd.headings = headings
        pd.links_internal = links_internal
        pd.links_external = links_external
        pd.images = images
        pd.schema_markup = schema
        pd.response_time_ms = p.response_time_ms or 0
        pd.page_type = getattr(p, 'page_type', '') or ''
        page_objects.append(pd)

    engine = KeywordResearchEngine()
    research = engine.analyze(pages=page_objects, competitor_pages=None, gsc_data=None)

    research["summary"]["total_internal_keywords"] = len(internal_kws)

    _cache_set(cache_key, research)
    return research


@router.get("/audit/{audit_id}/content-audit")
async def get_content_audit(audit_id: str, db: AsyncSession = Depends(get_db)):
    """Per-page content audit: missing sections, links, images, schema, CTAs, trust signals, EEAT."""
    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    issues = issues_result.scalars().all()
    issues_by_page = {}
    for issue in issues:
        issues_by_page.setdefault(issue.page_url, []).append(issue)

    page_audits = []
    overall_score = 0

    for p in pages:
        content_text = p.content_text or ""
        word_count = p.word_count or 0
        headings = p.headers or []
        if isinstance(headings, str):
            headings = json.loads(headings) if headings.strip() else []
        links_internal = p.links_internal or []
        links_external = p.links_external or []
        if isinstance(links_internal, str):
            links_internal = json.loads(links_internal) if links_internal.strip() else []
        if isinstance(links_external, str):
            links_external = json.loads(links_external) if links_external.strip() else []
        images = p.images or []
        if isinstance(images, str):
            images = json.loads(images) if images.strip() else []
        schema = p.schema_markup or []
        if isinstance(schema, str):
            schema = json.loads(schema) if schema.strip() else []
        page_issues = issues_by_page.get(p.url, [])

        missing_sections = []
        h1_count = sum(1 for h in headings if h.get("level") == "H1")
        h2_count = sum(1 for h in headings if h.get("level") == "H2")
        h3_count = sum(1 for h in headings if h.get("level") == "H3")

        if h1_count == 0:
            missing_sections.append({"section": "H1 Tag", "importance": "critical", "fix": "Add a single H1 tag with the primary target keyword"})
        elif h1_count > 1:
            missing_sections.append({"section": "Multiple H1 Tags", "importance": "high", "fix": f"Found {h1_count} H1 tags — consolidate into one"})
        if h2_count < 2:
            missing_sections.append({"section": "H2 Subheadings", "importance": "high", "fix": f"Only {h2_count} H2s found. Add 3-5 H2s to structure content for readers and crawlers"})
        if h3_count == 0 and word_count > 600:
            missing_sections.append({"section": "H3 Sub-subheadings", "importance": "medium", "fix": "Add H3s within H2 sections to break up long content"})

        missing_links = []
        if len(links_internal) < 3:
            missing_links.append({"type": "internal", "current_count": len(links_internal), "recommended": 5, "fix": "Add 5+ internal links to related content to build topical authority"})
        if len(links_external) == 0:
            missing_links.append({"type": "external", "current_count": 0, "recommended": 2, "fix": "Add 2-3 outbound links to authoritative sources to boost credibility"})

        missing_images = []
        if len(images) == 0:
            missing_images.append({"type": "no_images", "fix": "Add at least one featured image and 1-2 supporting images with descriptive alt text"})
        else:
            no_alt = [img for img in images if not img.get("alt")]
            if len(no_alt) > 0:
                missing_images.append({"type": "missing_alt", "count": len(no_alt), "fix": f"{len(no_alt)} images missing alt text — add descriptive alt tags for accessibility and image SEO"})

        missing_schema = []
        schema_types = [s.get("@type", "") for s in schema if isinstance(s, dict)]
        page_type = (p.page_type or "").upper()
        if "Article" in page_type or "BLOG" in page_type:
            if "Article" not in schema_types and "BlogPosting" not in schema_types:
                missing_schema.append({"type": "Article", "fix": "Add Article schema for rich results in Google search"})
        if "PRODUCT" in page_type:
            if "Product" not in schema_types:
                missing_schema.append({"type": "Product", "fix": "Add Product schema for rich results (price, rating, availability)"})
        if "FAQ" in page_type:
            if "FAQPage" not in schema_types:
                missing_schema.append({"type": "FAQPage", "fix": "Add FAQPage schema for FAQ rich results"})
        if not schema_types:
            missing_schema.append({"type": "Organization", "fix": "Add Organization schema with brand info for Knowledge Graph"})

        missing_cta = []
        cta_signals = ["buy", "get started", "sign up", "try", "demo", "contact", "learn more", "download", "subscribe", "request"]
        has_cta = any(sig in content_text.lower() for sig in cta_signals)
        if not has_cta and page_type not in ("LEGAL", "PRIVACY", "TERMS", "POLICY"):
            missing_cta.append({"fix": "No clear call-to-action found. Add a CTA relevant to the page purpose"})

        missing_eeat = []
        if word_count > 600:
            has_author = "author" in content_text.lower() or "written by" in content_text.lower() or "by " in content_text.lower()
            if not has_author:
                missing_eeat.append({"signal": "Author Attribution", "fix": "Add author name and credentials for YMYL/E-E-A-T compliance"})
            has_date = "updated" in content_text.lower() or "published" in content_text.lower() or "2024" in content_text or "2025" in content_text or "2026" in content_text
            if not has_date:
                missing_eeat.append({"signal": "Publication Date", "fix": "Add visible publication/update date for freshness signals"})
            has_stats = any(w in content_text.lower() for w in ["percent", "%", "study", "research", "data", "statistics", "according to"])
            if not has_stats:
                missing_eeat.append({"signal": "Data/Statistics", "fix": "Include data points, statistics, or research citations to strengthen authority"})

        score = 100
        score -= len(missing_sections) * 8
        score -= len(missing_links) * 6
        score -= len(missing_images) * 5
        score -= len(missing_schema) * 7
        score -= len(missing_cta) * 4
        score -= len(missing_eeat) * 5
        score -= min(20, len(page_issues) * 2)
        score = max(0, min(100, score))
        overall_score += score

        page_audits.append({
            "url": p.url,
            "title": p.title or "",
            "page_type": p.page_type or "UNKNOWN",
            "word_count": word_count,
            "score": score,
            "missing_sections": missing_sections,
            "missing_links": missing_links,
            "missing_images": missing_images,
            "missing_schema": missing_schema,
            "missing_cta": missing_cta,
            "missing_eeat": missing_eeat,
            "issue_count": len(page_issues),
            "heading_counts": {"h1": h1_count, "h2": h2_count, "h3": h3_count},
        })

    avg_score = round(overall_score / max(len(pages), 1), 1)

    category_scores = {}
    for pa in page_audits:
        pt = pa["page_type"]
        category_scores.setdefault(pt, {"total": 0, "count": 0})
        category_scores[pt]["total"] += pa["score"]
        category_scores[pt]["count"] += 1

    category_averages = {
        cat: round(data["total"] / data["count"], 1)
        for cat, data in category_scores.items()
    }

    return {
        "audit_id": audit_id,
        "overall_score": avg_score,
        "total_pages": len(pages),
        "page_audits": sorted(page_audits, key=lambda x: x["score"]),
        "category_averages": category_averages,
        "summary": {
            "pages_needing_work": len([pa for pa in page_audits if pa["score"] < 70]),
            "pages_good": len([pa for pa in page_audits if pa["score"] >= 70]),
            "total_missing_sections": sum(len(pa["missing_sections"]) for pa in page_audits),
            "total_missing_links": sum(len(pa["missing_links"]) for pa in page_audits),
            "total_missing_images": sum(len(pa["missing_images"]) for pa in page_audits),
            "total_missing_schema": sum(len(pa["missing_schema"]) for pa in page_audits),
            "total_missing_cta": sum(len(pa["missing_cta"]) for pa in page_audits),
            "total_missing_eeat": sum(len(pa["missing_eeat"]) for pa in page_audits),
        },
    }


@router.get("/audit/{audit_id}/blog-ai")
async def get_blog_ai(audit_id: str, db: AsyncSession = Depends(get_db)):
    """Blog AI: ideas, content calendar, internal linking, featured snippets, repurposing."""
    cache_key = f"blog_ai:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.blog_ai import BlogAIEngine
    from app.engine.keyword_research import KeywordResearchEngine
    from app.engine.crawler import PageData

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    page_objects = []
    for p in pages:
        links_internal = p.links_internal or []
        links_external = p.links_external or []
        if isinstance(links_internal, str):
            links_internal = json.loads(links_internal) if links_internal.strip() else []
        if isinstance(links_external, str):
            links_external = json.loads(links_external) if links_external.strip() else []
        headings = p.headers or []
        if isinstance(headings, str):
            headings = json.loads(headings) if headings.strip() else []
        images = p.images or []
        if isinstance(images, str):
            images = json.loads(images) if images.strip() else []
        schema = p.schema_markup or []
        if isinstance(schema, str):
            schema = json.loads(schema) if schema.strip() else []

        pd = PageData()
        pd.url = p.url
        pd.status_code = p.status_code or 200
        pd.title = p.title or ""
        pd.h1 = p.h1 or ""
        pd.meta_description = p.meta_description or ""
        pd.content_text = p.content_text or ""
        pd.word_count = p.word_count or 0
        pd.headings = headings
        pd.links_internal = links_internal
        pd.links_external = links_external
        pd.images = images
        pd.schema_markup = schema
        pd.response_time_ms = p.response_time_ms or 0
        pd.page_type = getattr(p, 'page_type', '') or ''
        page_objects.append(pd)

    kw_engine = KeywordResearchEngine()
    kw_research = kw_engine.analyze(pages=page_objects)

    blog_engine = BlogAIEngine()
    result = blog_engine.analyze(pages=page_objects, keyword_research=kw_research)
    _cache_set(cache_key, result)
    return result


@router.get("/audit/{audit_id}/page-improvements")
async def get_page_improvements(audit_id: str, db: AsyncSession = Depends(get_db)):
    """Page improvement engine: per-page fixes with role-based tasks and priority matrix."""
    from app.engine.page_improvement import PageImprovementEngine
    from app.engine.crawler import PageData

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    page_objects = []
    for p in pages:
        links_internal = p.links_internal or []
        links_external = p.links_external or []
        if isinstance(links_internal, str):
            links_internal = json.loads(links_internal) if links_internal.strip() else []
        if isinstance(links_external, str):
            links_external = json.loads(links_external) if links_external.strip() else []
        headings = p.headers or []
        if isinstance(headings, str):
            headings = json.loads(headings) if headings.strip() else []
        images = p.images or []
        if isinstance(images, str):
            images = json.loads(images) if images.strip() else []
        schema = p.schema_markup or []
        if isinstance(schema, str):
            schema = json.loads(schema) if schema.strip() else []

        pd = PageData()
        pd.url = p.url
        pd.status_code = p.status_code or 200
        pd.title = p.title or ""
        pd.h1 = p.h1 or ""
        pd.meta_description = p.meta_description or ""
        pd.content_text = p.content_text or ""
        pd.word_count = p.word_count or 0
        pd.headings = headings
        pd.links_internal = links_internal
        pd.links_external = links_external
        pd.images = images
        pd.schema_markup = schema
        pd.response_time_ms = p.response_time_ms or 0
        pd.page_type = getattr(p, 'page_type', '') or ''
        page_objects.append(pd)

    engine = PageImprovementEngine()
    result = engine.analyze(pages=page_objects)
    return result


@router.get("/audit/{audit_id}/compare/{other_audit_id}")
async def compare_audits(audit_id: str, other_audit_id: str, db: AsyncSession = Depends(get_db)):
    """Compare two audits side by side: scores, issues, pages, keywords."""
    async def get_audit_data(aid):
        audit_r = await db.execute(select(Audit).where(Audit.id == aid))
        audit = audit_r.scalar_one_or_none()
        if not audit:
            return None

        score_r = await db.execute(select(AuditScore).where(AuditScore.audit_id == aid))
        score = score_r.scalar_one_or_none()

        pages_r = await db.execute(select(Page).where(Page.audit_id == aid))
        pages = pages_r.scalars().all()

        issues_r = await db.execute(select(Issue).where(Issue.audit_id == aid))
        issues = issues_r.scalars().all()

        recs_r = await db.execute(select(Recommendation).where(Recommendation.audit_id == aid))
        recs = recs_r.scalars().all()

        issue_cats = {}
        issue_sevs = {}
        for iss in issues:
            issue_cats[iss.category] = issue_cats.get(iss.category, 0) + 1
            issue_sevs[iss.severity] = issue_sevs.get(iss.severity, 0) + 1

        return {
            "id": aid,
            "url": audit.website_url,
            "created_at": audit.created_at.isoformat() if audit.created_at else None,
            "status": audit.status,
            "scores": {
                "overall": score.overall_score if score else 0,
                "seo": score.seo_score if score else 0,
                "technical": score.technical_score if score else 0,
                "content": score.content_score if score else 0,
                "aeo": score.aeo_score if score else 0,
                "geo": score.geo_score if score else 0,
            },
            "total_pages": len(pages),
            "total_issues": len(issues),
            "total_recommendations": len(recs),
            "issue_categories": issue_cats,
            "issue_severities": issue_sevs,
            "avg_word_count": round(sum(p.word_count or 0 for p in pages) / max(len(pages), 1)),
            "pages_with_schema": len([p for p in pages if p.schema_markup]),
            "pages_with_h1": len([p for p in pages if p.h1]),
        }

    data_a = await get_audit_data(audit_id)
    data_b = await get_audit_data(other_audit_id)

    if not data_a:
        raise HTTPException(status_code=404, detail=f"Audit {audit_id} not found")
    if not data_b:
        raise HTTPException(status_code=404, detail=f"Audit {other_audit_id} not found")

    score_diff = {}
    for key in data_a["scores"]:
        score_diff[key] = round(data_a["scores"][key] - data_b["scores"][key], 1)

    return {
        "audit_a": data_a,
        "audit_b": data_b,
        "score_differences": score_diff,
        "winner": "A" if data_a["scores"]["overall"] > data_b["scores"]["overall"] else "B" if data_b["scores"]["overall"] > data_a["scores"]["overall"] else "TIE",
        "comparison": {
            "pages": {"a": data_a["total_pages"], "b": data_b["total_pages"]},
            "issues": {"a": data_a["total_issues"], "b": data_b["total_issues"]},
            "recommendations": {"a": data_a["total_recommendations"], "b": data_b["total_recommendations"]},
            "word_count": {"a": data_a["avg_word_count"], "b": data_b["avg_word_count"]},
            "schema_coverage": {"a": data_a["pages_with_schema"], "b": data_b["pages_with_schema"]},
        },
    }


@router.get("/portfolio")
async def get_portfolio(request: Request, db: AsyncSession = Depends(get_db)):
    """Portfolio dashboard: all audits with scores, trends, and health overview."""
    user_id = getattr(request.state, "user_id", None)
    stmt = select(Audit).where(Audit.status == "COMPLETED")
    if user_id:
        stmt = stmt.where(Audit.user_id == user_id)
    audits_r = await db.execute(stmt.order_by(Audit.created_at.desc()))
    audits = audits_r.scalars().all()

    portfolio = []
    total_score = 0
    total_pages = 0
    total_issues = 0

    for audit in audits:
        score_r = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit.id))
        score = score_r.scalar_one_or_none()

        pages_r = await db.execute(select(Page).where(Page.audit_id == audit.id))
        pages = pages_r.scalars().all()

        issues_r = await db.execute(select(Issue).where(Issue.audit_id == audit.id))
        issues = issues_r.scalars().all()

        page_count = len(pages)
        issue_count = len(issues)
        overall = score.overall_score if score else 0

        total_score += overall
        total_pages += page_count
        total_issues += issue_count

        portfolio.append({
            "id": audit.id,
            "url": audit.website_url,
            "created_at": audit.created_at.isoformat() if audit.created_at else None,
            "completed_at": audit.completed_at.isoformat() if audit.completed_at else None,
            "scores": {
                "overall": overall,
                "seo": score.seo_score if score else 0,
                "technical": score.technical_score if score else 0,
                "content": score.content_score if score else 0,
                "aeo": score.aeo_score if score else 0,
                "geo": score.geo_score if score else 0,
            },
            "total_pages": page_count,
            "total_issues": issue_count,
            "health_status": "GOOD" if overall >= 80 else "FAIR" if overall >= 60 else "POOR",
        })

    avg_score = round(total_score / max(len(audits), 1), 1)

    return {
        "total_audits": len(audits),
        "average_score": avg_score,
        "total_pages_audited": total_pages,
        "total_issues_found": total_issues,
        "health_distribution": {
            "good": len([a for a in portfolio if a["health_status"] == "GOOD"]),
            "fair": len([a for a in portfolio if a["health_status"] == "FAIR"]),
            "poor": len([a for a in portfolio if a["health_status"] == "POOR"]),
        },
        "audits": portfolio,
    }


@router.get("/audit/{audit_id}/enterprise")
async def get_enterprise_audit(audit_id: str, db: AsyncSession = Depends(get_db)):
    cache_key = f"enterprise:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    orch_cache_key = f"orchestrator:{audit_id}"
    orchestrator_data = _cache_get(orch_cache_key)
    if orchestrator_data is None:
        from app.engine.enterprise_orchestrator import EnterpriseOrchestrator

        result = await db.execute(select(Audit).where(Audit.id == audit_id))
        audit = result.scalar_one_or_none()
        if not audit:
            raise HTTPException(status_code=404, detail="Audit not found")

        pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
        pages = pages_result.scalars().all()

        orchestrator = EnterpriseOrchestrator()
        payload = orchestrator.generate_enterprise_payload(pages, audit.website_url)
        _cache_set(orch_cache_key, {"pages": pages, "payload": payload, "url": audit.website_url})
    else:
        payload = orchestrator_data["payload"]

    _cache_set(cache_key, payload)
    return payload


@router.get("/audit/{audit_id}/enterprise/{page_idx}")
async def get_enterprise_page(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    from app.engine.enterprise_orchestrator import EnterpriseOrchestrator

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    orchestrator = EnterpriseOrchestrator()
    page_analysis = orchestrator.analyze_page(pages[page_idx])
    return page_analysis


@router.get("/audit/{audit_id}/remediation-feed")
async def get_remediation_feed(audit_id: str, severity: str = None, category: str = None, offset: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    raw_cache_key = f"remediation_raw:{audit_id}"
    all_fixes = _cache_get(raw_cache_key)
    if all_fixes is None:
        orch_cache_key = f"orchestrator:{audit_id}"
        orch_data = _cache_get(orch_cache_key)
        if orch_data is not None:
            page_analyses = orch_data["payload"].get("page_results", [])
            url_to_type = {}
            for pr in page_analyses:
                url_to_type[pr.get("url", "")] = pr.get("page_type", "UNKNOWN")
            all_fixes = []
            seen = set()
            for pr in page_analyses:
                for fix in pr.get("diagnostics", {}).get("actionable_fixes", []):
                    key = (pr.get("url", ""), fix.get("element", ""), fix.get("issue", ""))
                    if key not in seen:
                        seen.add(key)
                        fix["page_url"] = pr.get("url", "")
                        fix["page_type"] = url_to_type.get(pr.get("url", ""), "UNKNOWN")
                        fix["page_health_score"] = pr.get("overall_health_score", 0)
                        all_fixes.append(fix)
            all_fixes.sort(key=lambda x: x.get("impact_score", 0), reverse=True)
            _cache_set(raw_cache_key, all_fixes)
        else:
            from app.engine.enterprise_orchestrator import EnterpriseOrchestrator

            result = await db.execute(select(Audit).where(Audit.id == audit_id))
            audit = result.scalar_one_or_none()
            if not audit:
                raise HTTPException(status_code=404, detail="Audit not found")

            pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
            pages = pages_result.scalars().all()

            orchestrator = EnterpriseOrchestrator()
            all_fixes = []
            seen = set()

            for page in pages:
                try:
                    analysis = orchestrator.analyze_page(page)
                    for fix in analysis["diagnostics"]["actionable_fixes"]:
                        key = (page.url, fix.get("element", ""), fix.get("issue", ""))
                        if key not in seen:
                            seen.add(key)
                            fix["page_url"] = page.url
                            fix["page_type"] = analysis.get("page_type", "UNKNOWN")
                            fix["page_health_score"] = analysis.get("overall_health_score", 0)
                            all_fixes.append(fix)
                except Exception:
                    continue

            all_fixes.sort(key=lambda x: x.get("impact_score", 0), reverse=True)
            _cache_set(raw_cache_key, all_fixes)

    if severity:
        all_fixes = [f for f in all_fixes if f["severity"] == severity.upper()]
    if category:
        all_fixes = [f for f in all_fixes if category.lower() in f.get("category", "").lower()]

    all_fixes.sort(key=lambda x: x.get("impact_score", 0), reverse=True)

    return {
        "items": all_fixes[offset:offset + limit],
        "total": len(all_fixes),
        "offset": offset,
        "limit": limit,
        "summary": {
            "critical": sum(1 for f in all_fixes if f["severity"] == "CRITICAL"),
            "high": sum(1 for f in all_fixes if f["severity"] == "HIGH"),
            "medium": sum(1 for f in all_fixes if f["severity"] == "MEDIUM"),
            "low": sum(1 for f in all_fixes if f["severity"] == "LOW"),
        },
    }


@router.get("/audit/{audit_id}/content-rewrite/{page_idx}")
async def get_content_rewrite(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"content_rewrite:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    page = PageAdapter(pages[page_idx])
    from app.engine.enterprise_orchestrator import EnterpriseOrchestrator
    orchestrator = EnterpriseOrchestrator()
    analysis = orchestrator.analyze_page(page)

    current_content = page.content_text or ""
    issues = analysis["diagnostics"]["actionable_fixes"]
    targets = analysis.get("page_type_targets", {})
    
    headings = page.headings or []
    if isinstance(headings, str):
        import json as _json
        try:
            headings = _json.loads(headings)
        except Exception:
            headings = []
    h1_text = ""
    for h in headings:
        if isinstance(h, dict):
            t = h.get("text", "")
        else:
            t = str(h)
        if t.strip():
            h1_text = t.strip()
            break

    ai_rewrite = {}
    ai_readability = {}
    ai_eeat = {}
    ai_links = []
    ai_keywords = {}
    try:
        from app.engine.dual_ai import (
            dual_ai_content_rewrite, dual_ai_readability_analysis,
            dual_ai_eeat_analysis, dual_ai_link_suggestions, dual_ai_keyword_insights,
        )
        import asyncio
        results = await asyncio.gather(
            dual_ai_content_rewrite(page.url, page.title or "", page.meta_description or "", current_content, targets.get("must_have", []) or [h1_text] if h1_text else [], issues),
            dual_ai_readability_analysis(current_content),
            dual_ai_eeat_analysis(current_content, page.url, page.title or ""),
            dual_ai_link_suggestions(page.url, current_content, []),
            dual_ai_keyword_insights(page.url, page.title or "", current_content, targets.get("must_have", [])),
            return_exceptions=True,
        )
        ai_rewrite = results[0] if isinstance(results[0], dict) else {}
        ai_readability = results[1] if isinstance(results[1], dict) else {}
        ai_eeat = results[2] if isinstance(results[2], dict) else {}
        ai_links = results[3] if isinstance(results[3], list) else []
        ai_keywords = results[4] if isinstance(results[4], dict) else {}
    except Exception as e:
        logger.warning(f"DualAI content-rewrite failed: {e}")

    resp = {
        "url": page.url,
        "page_type": analysis.get("page_type", "UNKNOWN"),
        "current_content": current_content[:5000],
        "word_count": page.word_count or 0,
        "title": page.title or "",
        "meta_description": page.meta_description or "",
        "h1": h1_text,
        "headings": headings[:20],
        "issues": issues[:20],
        "targets": targets,
        "platform_scores": analysis.get("platform_scores", {}),
        "readability": analysis["scores"].get("readability", 50),
        "ai_rewrite": ai_rewrite,
        "ai_readability": ai_readability,
        "ai_eeat": ai_eeat,
        "ai_links": ai_links,
        "ai_keywords": ai_keywords,
    }
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/page-intelligence-deep/{page_idx}")
async def get_page_intelligence_deep(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"pid:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.page_intelligence_engine import PageIntelligenceEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    engine = PageIntelligenceEngine()
    page_obj = PageAdapter(pages[page_idx])
    base = engine.analyze(page_obj)

    try:
        from app.engine.dual_ai import dual_ai_analyze_seo, dual_ai_search_optimization, dual_ai_entity_extraction, dual_ai_eeat_analysis
        import asyncio
        current_content = pages[page_idx].content_text or ""
        results = await asyncio.gather(
            dual_ai_analyze_seo(pages[page_idx].url, pages[page_idx].title or "", pages[page_idx].meta_description or "", current_content, {}, []),
            dual_ai_search_optimization(pages[page_idx].url, pages[page_idx].title or "", current_content, []),
            dual_ai_entity_extraction(current_content, pages[page_idx].url),
            dual_ai_eeat_analysis(current_content, pages[page_idx].url, pages[page_idx].title or ""),
            return_exceptions=True,
        )
        base["ai_seo_analysis"] = results[0] if isinstance(results[0], dict) else {}
        base["ai_search"] = results[1] if isinstance(results[1], dict) else {}
        base["ai_entities"] = results[2] if isinstance(results[2], dict) else {}
        base["ai_eeat"] = results[3] if isinstance(results[3], dict) else {}
    except Exception as e:
        logger.warning(f"DualAI page-intelligence-deep failed: {e}")

    _cache_set(cache_key, base)
    return base


@router.get("/audit/{audit_id}/page-intelligence-deep-by-url")
async def get_page_intelligence_deep_by_url(audit_id: str, url: str, db: AsyncSession = Depends(get_db)):
    import hashlib
    cache_key = f"pid_url:{audit_id}:{hashlib.md5(url.encode()).hexdigest()}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.page_intelligence_engine import PageIntelligenceEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    page = next((p for p in pages if p.url == url), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    engine = PageIntelligenceEngine()
    resp = engine.analyze(PageAdapter(page))
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/content-deep/{page_idx}")
async def get_content_deep(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"cdeep:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.content_intelligence_deep import ContentIntelligenceDeep

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    engine = ContentIntelligenceDeep()
    all_pages_data = [PageAdapter(p) for p in pages]
    resp = engine.analyze(PageAdapter(pages[page_idx]), all_pages=all_pages_data)
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/content-deep-by-url")
async def get_content_deep_by_url(audit_id: str, url: str, db: AsyncSession = Depends(get_db)):
    import hashlib
    cache_key = f"cdeep_url:{audit_id}:{hashlib.md5(url.encode()).hexdigest()}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.content_intelligence_deep import ContentIntelligenceDeep

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    page = next((p for p in pages if p.url == url), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    engine = ContentIntelligenceDeep()
    all_pages_data = [PageAdapter(p) for p in pages]
    resp = engine.analyze(PageAdapter(page), all_pages=all_pages_data)
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/recommendations-deep/{page_idx}")
async def get_recommendations_deep(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"recs:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.recommendation_engine import RecommendationEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    engine = RecommendationEngine()
    resp = engine.analyze(PageAdapter(pages[page_idx]))
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/recommendations-deep-by-url")
async def get_recommendations_deep_by_url(audit_id: str, url: str, db: AsyncSession = Depends(get_db)):
    import hashlib
    cache_key = f"recs_url:{audit_id}:{hashlib.md5(url.encode()).hexdigest()}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.recommendation_engine import RecommendationEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    page = next((p for p in pages if p.url == url), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    engine = RecommendationEngine()
    resp = engine.analyze(PageAdapter(page))
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/ai-search-deep/{page_idx}")
async def get_ai_search_deep(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"ais:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.ai_search_deep import AISearchDeepEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    engine = AISearchDeepEngine()
    base = engine.analyze(PageAdapter(pages[page_idx]))

    try:
        from app.engine.dual_ai import dual_ai_search_optimization
        page_obj = PageAdapter(pages[page_idx])
        groq_ai = await dual_ai_search_optimization(page_obj.url, page_obj.title or "", page_obj.content_text or "", [])
        if groq_ai and groq_ai.get("platform_scores"):
            base["ai_analysis"] = groq_ai
            for platform, pdata in groq_ai.get("platform_scores", {}).items():
                if platform in base.get("platform_scores", {}):
                    base["platform_scores"][platform]["ai_score"] = pdata.get("score", 0)
                    base["platform_scores"][platform]["ai_reasons"] = pdata.get("reasons", [])
                    base["platform_scores"][platform]["ai_fixes"] = pdata.get("fixes", [])
    except Exception:
        pass

    _cache_set(cache_key, base)
    return base


@router.get("/audit/{audit_id}/ai-search-deep-by-url")
async def get_ai_search_deep_by_url(audit_id: str, url: str, db: AsyncSession = Depends(get_db)):
    import hashlib
    cache_key = f"ais_url:{audit_id}:{hashlib.md5(url.encode()).hexdigest()}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.ai_search_deep import AISearchDeepEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    page = next((p for p in pages if p.url == url), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    engine = AISearchDeepEngine()
    resp = engine.analyze(PageAdapter(page))
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/ai-search-intelligence/{page_idx}")
async def get_ai_search_intelligence(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"aisi:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.ai_search_intelligence import AiSearchIntelligenceEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    engine = AiSearchIntelligenceEngine()
    all_pages_data = [PageAdapter(p) for p in pages]
    resp = engine.analyze(PageAdapter(pages[page_idx]), all_pages=all_pages_data)
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/ai-search-intelligence-by-url")
async def get_ai_search_intelligence_by_url(audit_id: str, url: str, db: AsyncSession = Depends(get_db)):
    import hashlib
    cache_key = f"aisi_url:{audit_id}:{hashlib.md5(url.encode()).hexdigest()}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.ai_search_intelligence import AiSearchIntelligenceEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    page = next((p for p in pages if p.url == url), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    engine = AiSearchIntelligenceEngine()
    all_pages_data = [PageAdapter(p) for p in pages]
    resp = engine.analyze(PageAdapter(page), all_pages=all_pages_data)
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/competitor-deep/{page_idx}")
async def get_competitor_deep(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    from app.engine.competitor_intelligence import CompetitorIntelligenceEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    comp_result = await db.execute(select(CompetitorData).where(CompetitorData.audit_id == audit_id))
    comp_data = comp_result.scalar_one_or_none()

    page_adapters = [PageAdapter(pages[page_idx])]

    comp_dict = {}
    if comp_data and comp_data.backlink_gap:
        if isinstance(comp_data.backlink_gap, dict):
            comp_dict = comp_data.backlink_gap
        elif isinstance(comp_data.backlink_gap, list) and comp_data.backlink_gap:
            comp_dict = {"competitor": comp_data.backlink_gap}

    engine = CompetitorIntelligenceEngine()
    try:
        return engine.analyze(page_adapters, comp_dict)
    except Exception as e:
        logger.exception(f"competitor-deep failed: {e}")
        my_profile = engine.crawler.analyze_competitor(page_adapters, "")
        return {
            "my_profile": my_profile,
            "competitors": {},
            "gaps": {},
            "competitive_position": {},
            "dimensions_analyzed": [],
            "error": str(e),
        }


@router.get("/audit/{audit_id}/competitor-deep-by-url")
async def get_competitor_deep_by_url(audit_id: str, url: str, db: AsyncSession = Depends(get_db)):
    from app.engine.competitor_intelligence import CompetitorIntelligenceEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    page = next((p for p in pages if p.url == url), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    comp_result = await db.execute(select(CompetitorData).where(CompetitorData.audit_id == audit_id))
    comp_data = comp_result.scalar_one_or_none()

    page_adapters = [PageAdapter(page)]

    comp_dict = {}
    if comp_data and comp_data.backlink_gap:
        if isinstance(comp_data.backlink_gap, dict):
            comp_dict = comp_data.backlink_gap
        elif isinstance(comp_data.backlink_gap, list) and comp_data.backlink_gap:
            comp_dict = {"competitor": comp_data.backlink_gap}

    engine = CompetitorIntelligenceEngine()
    return engine.analyze(page_adapters, comp_dict)


@router.get("/audit/{audit_id}/dashboard-deep")
async def get_dashboard_deep(audit_id: str, db: AsyncSession = Depends(get_db)):
    import asyncio, logging
    log = logging.getLogger(__name__)

    cache_key = f"dash_deep:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = list(pages_result.scalars().all())

    score_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = score_result.scalar_one_or_none()

    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    issues = list(issues_result.scalars().all())

    def _compute_scores():
        from app.engine.page_intelligence_engine import PageIntelligenceEngine
        from app.engine.ai_search_deep import AISearchDeepEngine
        from app.engine.content_intelligence_deep import ContentIntelligenceDeep

        page_intel = PageIntelligenceEngine()
        ai_deep = AISearchDeepEngine()
        content_deep = ContentIntelligenceDeep()

        page_scores = []
        ai_scores = []
        content_scores = []

        sample = pages[:min(len(pages), 20)]
        for page in sample:
            pa = PageAdapter(page)
            try:
                pi = page_intel.analyze(pa)
                page_scores.append(pi.get("overall_score", 0))
            except Exception:
                pass
            try:
                ai = ai_deep.analyze(pa)
                ai_scores.append(ai.get("overall_ai_score", 0))
            except Exception:
                pass
            try:
                cd = content_deep.analyze(pa)
                content_scores.append(cd.get("quality_scores", {}).get("content_completeness", 0))
            except Exception:
                pass

        return page_scores, ai_scores, content_scores

    try:
        page_scores, ai_scores, content_scores = await asyncio.to_thread(_compute_scores)
    except Exception:
        log.exception("Score computation failed")
        page_scores, ai_scores, content_scores = [], [], []

    avg = lambda lst: round(sum(lst) / len(lst), 1) if lst else 0

    issue_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for issue in issues:
        sev = getattr(issue, 'severity', 'LOW')
        if sev in issue_counts:
            issue_counts[sev] += 1

    page_type_dist = {}
    for page in pages:
        pt = getattr(page, 'page_type', 'UNKNOWN') or 'UNKNOWN'
        page_type_dist[pt] = page_type_dist.get(pt, 0) + 1

    recent_issues = []
    for issue in issues[:10]:
        recent_issues.append({
            "page_url": getattr(issue, 'page_url', ''),
            "category": getattr(issue, 'category', ''),
            "severity": getattr(issue, 'severity', 'LOW'),
            "description": getattr(issue, 'description', ''),
        })

    geo_score = scores.geo_score if scores else 0
    aeo_score_val = scores.aeo_score if scores else 0

    resp = {
        "audit_id": audit_id,
        "website_url": audit.website_url,
        "health_scores": {
            "seo_health": scores.seo_score if scores else 0,
            "ai_search_health": scores.ai_visibility_score if scores else 0,
            "content_health": scores.content_score if scores else 0,
            "technical_health": scores.technical_score if scores else 0,
            "eeat_score": geo_score,
            "aeo_score": aeo_score_val,
            "page_intelligence": avg(page_scores) if page_scores else 0,
        },
        "overall_score": scores.overall_score if scores else 0,
        "total_pages": len(pages),
        "total_issues": len(issues),
        "issue_summary": issue_counts,
        "page_type_distribution": page_type_dist,
        "recent_issues": recent_issues,
        "pages_analyzed_for_scores": len(page_scores),
        "alerts": list(filter(None, [
            {"type": "critical", "message": f"{issue_counts['CRITICAL']} critical issues need immediate attention"} if issue_counts['CRITICAL'] > 0 else None,
            {"type": "warning", "message": f"{issue_counts['HIGH']} high-priority issues found"} if issue_counts['HIGH'] > 0 else None,
            {"type": "info", "message": f"{len(pages)} pages analyzed across {len(page_type_dist)} page types"},
        ])),
        "action_center": {
            "immediate": [{"action": getattr(i, 'description', ''), "severity": "CRITICAL"} for i in issues if getattr(i, 'severity', '') == "CRITICAL"][:5],
            "this_week": [{"action": getattr(i, 'description', ''), "severity": "HIGH"} for i in issues if getattr(i, 'severity', '') == "HIGH"][:5],
            "this_month": [{"action": getattr(i, 'description', ''), "severity": "MEDIUM"} for i in issues if getattr(i, 'severity', '') == "MEDIUM"][:5],
        },
    }

    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/ai-recommendations/{page_idx}")
async def get_ai_recommendations_page(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    from app.engine.ai_recommendation_engine import AIRecommendationEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    score_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = score_result.scalar_one_or_none()

    page = pages[page_idx]
    pa = PageAdapter(page)
    page_data = {
        "url": pa.url,
        "title": pa.title,
        "meta_description": pa.meta_description,
        "h1": pa.h1,
        "word_count": pa.word_count,
        "content_text": pa.content_text[:3000],
        "page_type": pa.page_type,
        "headings": pa.headings[:15],
        "image_count": len(pa.images),
        "images_without_alt": sum(1 for i in (pa.images or []) if isinstance(i, dict) and not i.get("alt", "").strip()),
        "internal_link_count": len(pa.links_internal),
        "external_link_count": len(pa.links_external),
        "open_graph": pa.open_graph,
        "schema_types": [s.get("@type", "") for s in (pa.schema_markup or []) if isinstance(s, dict)],
        "top_issues": [{"severity": ci.get("severity", ""), "description": ci.get("description", "")} for ci in (pa.context_issues or [])[:5]],
    }
    audit_data = {"scores": {
        "seo": scores.seo_score if scores else 50,
        "technical": scores.technical_score if scores else 50,
        "aeo": scores.aeo_score if scores else 50,
        "geo": scores.geo_score if scores else 50,
    } if scores else {}}

    groq_result = {}
    try:
        from app.engine.dual_ai import dual_ai_page_recommendations
        groq_result = await dual_ai_page_recommendations(
            page_data,
            [{"name": t.get("description", ""), "status": "fail" if t.get("severity") in ("CRITICAL", "HIGH") else "warn"} for t in pa.context_issues[:10]],
            {},
        )
    except Exception:
        pass

    engine = AIRecommendationEngine()
    recs = await engine.analyze_page(page_data, audit_data)
    recs["url"] = pa.url
    recs["page_type"] = pa.page_type

    if groq_result and groq_result.get("executive_summary"):
        recs["ai_recommendations"] = groq_result
        if groq_result.get("critical_fixes"):
            recs["critical_fixes"] = groq_result["critical_fixes"]
        if groq_result.get("content_improvements"):
            recs["content_improvements"] = groq_result["content_improvements"]
        if groq_result.get("priority_ranking"):
            recs["priority_ranking"] = groq_result["priority_ranking"]

    return recs


@router.get("/audit/{audit_id}/ai-recommendations-global")
async def get_ai_recommendations_global(audit_id: str, db: AsyncSession = Depends(get_db)):
    cache_key = f"ai_recs_global:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.ai_recommendation_engine import AIRecommendationEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = list(pages_result.scalars().all())

    score_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = score_result.scalar_one_or_none()

    issues_result = await db.execute(select(Issue).where(Issue.audit_id == audit_id))
    issues = list(issues_result.scalars().all())

    issue_summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    issues_by_cat = {}
    issues_by_page = {}
    for issue in issues:
        sev = getattr(issue, 'severity', 'LOW')
        cat = getattr(issue, 'category', 'Other') or 'Other'
        purl = getattr(issue, 'page_url', '') or ''
        if sev in issue_summary:
            issue_summary[sev] += 1
        issues_by_cat[cat] = issues_by_cat.get(cat, 0) + 1
        if purl:
            issues_by_page[purl] = issues_by_page.get(purl, 0) + 1

    page_type_dist = {}
    thin = 0
    total_wc = 0
    no_schema = 0
    no_og = 0
    low_word_pages = []
    for page in pages:
        pt = getattr(page, 'page_type', 'UNKNOWN') or 'UNKNOWN'
        page_type_dist[pt] = page_type_dist.get(pt, 0) + 1
        wc = getattr(page, 'word_count', 0) or 0
        total_wc += wc
        if wc < 300:
            thin += 1
            low_word_pages.append({"url": getattr(page, 'url', ''), "words": wc, "title": getattr(page, 'title', '')[:60]})
        sm = getattr(page, 'schema_markup', None)
        if not sm or (isinstance(sm, list) and len(sm) == 0):
            no_schema += 1
        og = getattr(page, 'open_graph', None)
        if not og or (isinstance(og, dict) and len(og) == 0):
            no_og += 1

    critical_issues = [i for i in issues if getattr(i, 'severity', '') == 'CRITICAL']
    high_issues = [i for i in issues if getattr(i, 'severity', '') == 'HIGH']

    most_affected = sorted(issues_by_page.items(), key=lambda x: x[1], reverse=True)[:10]

    seo_score = scores.seo_score if scores else 50
    tech_score = scores.technical_score if scores else 50
    aeo_score = scores.aeo_score if scores else 50
    geo_score = scores.geo_score if scores else 50
    ai_score = scores.ai_visibility_score if scores else 50
    overall = scores.overall_score if scores else 50

    grade = "F" if overall < 40 else "D" if overall < 55 else "C" if overall < 70 else "B" if overall < 85 else "A"
    grade_explanation = {
        "A": "Excellent - your site is well-optimized across all dimensions",
        "B": "Good - solid foundation with room for targeted improvements",
        "C": "Average - several areas need attention to compete effectively",
        "D": "Below Average - significant gaps that are costing rankings",
        "F": "Poor - major issues across multiple areas require immediate action",
    }

    google_likes = []
    if seo_score >= 75:
        google_likes.append({"element": "Strong On-Page SEO", "why": f"Your SEO score of {seo_score}/100 indicates solid title tags, meta descriptions, and heading structure across your {len(pages)} pages"})
    if tech_score >= 75:
        google_likes.append({"element": "Healthy Technical Foundation", "why": f"Technical score of {tech_score}/100 means Google can efficiently crawl and index your site"})
    if overall >= 70:
        google_likes.append({"element": "Above-Average Quality Signals", "why": f"Overall score of {overall} puts you ahead of many competitors, but there's still ground to gain"})
    hasHTTPS = "https" in (audit.website_url or "")
    if hasHTTPS:
        google_likes.append({"element": "HTTPS Enabled", "why": "Your site uses HTTPS encryption, which is a confirmed Google ranking signal"})
    avg_wc = round(total_wc / max(len(pages), 1))
    if avg_wc >= 800:
        google_likes.append({"element": "Substantial Content Depth", "why": f"Average {avg_wc} words per page provides good coverage of topics"})

    google_dislikes = []
    if thin > 0:
        google_dislikes.append({"element": f"{thin} Thin Content Pages", "why": f"{thin} of {len(pages)} pages have fewer than 300 words. Google favors comprehensive content that fully answers user queries", "severity": "CRITICAL" if thin > 20 else "HIGH", "fix": f"Expand each thin page to 800+ words with unique, valuable content. Prioritize pages with existing traffic or backlinks"})
    if no_schema > 0:
        google_dislikes.append({"element": f"{no_schema} Pages Missing Schema Markup", "why": f"{no_schema} pages have no structured data. Schema helps Google understand your content and can trigger rich results in SERPs", "severity": "HIGH", "fix": "Add Organization, WebPage, or Article schema to every page. Use JSON-LD format. Start with homepage and top 10 pages"})
    if no_og > 0:
        google_dislikes.append({"element": f"{no_og} Pages Missing Open Graph Tags", "why": "Missing OG tags means poor social sharing previews on Facebook, LinkedIn, and Slack", "severity": "MEDIUM", "fix": "Add og:title, og:description, og:image, and og:url to every page"})
    if aeo_score < 65:
        google_dislikes.append({"element": "Weak AI/Answer Engine Visibility", "why": f"Your AEO score is {aeo_score}/100. ChatGPT, Perplexity, and Google AI Overviews are less likely to cite your content", "severity": "HIGH", "fix": "Add FAQ sections, definition blocks, comparison tables, and step-by-step guides that AI can extract answers from"})
    if geo_score < 65:
        google_dislikes.append({"element": "Low Generative Engine Optimization", "why": f"GEO score of {geo_score}/100 means your content lacks the structured, citation-friendly format AI engines prefer", "severity": "HIGH", "fix": "Add statistics, data points, direct answers to questions, and source citations within your content"})
    if ai_score < 40:
        google_dislikes.append({"element": "Poor AI Search Presence", "why": f"AI visibility score of {ai_score}/100 is critically low. Your brand is largely invisible in AI-powered search results", "severity": "CRITICAL", "fix": "Create comprehensive, authoritative content with clear entity signals. Add FAQ schema, HowTo schema, and ensure your brand name appears with descriptive context"})

    content_strengths = []
    content_weaknesses = []
    if avg_wc >= 600:
        content_strengths.append(f"Average word count of {avg_wc} provides reasonable content depth")
    else:
        content_weaknesses.append(f"Average word count of {avg_wc} is below the 600-word minimum for competitive pages")
    if thin == 0:
        content_strengths.append("All pages meet minimum content length requirements")
    else:
        content_weaknesses.append(f"{thin} pages have thin content (<300 words) that won't rank")
    blog_count = page_type_dist.get("BLOG_POST", 0) + page_type_dist.get("BLOG", 0)
    service_count = page_type_dist.get("SERVICE", 0) + page_type_dist.get("PRODUCT", 0)
    if blog_count > 5:
        content_strengths.append(f"{blog_count} blog posts provide topical authority signals")
    else:
        content_weaknesses.append(f"Only {blog_count} blog posts - need more to establish topical authority")

    content_calendar = []
    if blog_count < 10:
        content_calendar.append({"topic": "Create comprehensive guides for your core services", "keywords": ["how to", "guide", "best practices"], "type": "blog", "priority": "high", "estimated_traffic": "500-2000 monthly visits per guide"})
    content_calendar.append({"topic": "Address top customer questions as FAQ content", "keywords": ["what is", "how does", "benefits of"], "type": "blog", "priority": "high", "estimated_traffic": "200-1000 monthly visits"})
    content_calendar.append({"topic": "Create comparison pages (vs competitors)", "keywords": ["vs", "compared to", "alternative to"], "type": "landing", "priority": "medium", "estimated_traffic": "300-1500 monthly visits"})
    content_calendar.append({"topic": "Industry case studies with data and results", "keywords": ["case study", "results", "ROI"], "type": "blog", "priority": "medium", "estimated_traffic": "100-500 monthly visits"})

    tech_priorities = []
    critical_tech = [i for i in critical_issues if getattr(i, 'category', '').lower() in ('technical', 'performance', 'crawlability', 'indexability', 'security')]
    for issue in critical_tech[:5]:
        tech_priorities.append({
            "issue": getattr(issue, 'description', '')[:100],
            "impact": "Google may not crawl or index affected pages",
            "fix": getattr(issue, 'fix_suggestion', '')[:200] if getattr(issue, 'fix_suggestion', '') else "Review the specific technical issue and implement the recommended fix",
            "priority": "critical",
        })
    if no_schema > 5:
        tech_priorities.append({"issue": "Missing structured data on most pages", "impact": "Missing rich results, knowledge panel data, and AI citation opportunities", "fix": "Implement JSON-LD schema for Organization, WebPage, FAQ, and Article types on all pages", "priority": "high"})

    aeo_platform_tips = {
        "google_ai_overview": [
            "Add FAQ sections with direct questions and concise answers (2-3 sentences each)",
            "Include comparison tables that summarize key differences",
            "Use clear H2/H3 headings that match actual search queries",
            "Add 'Key Takeaway' boxes at the top of important content",
        ],
        "chatgpt": [
            "Structure content with clear definitions, lists, and step-by-step instructions",
            "Include specific data, statistics, and percentages in your content",
            "Add an 'About [Company]' section with clear entity descriptions",
            "Ensure your About page has complete company information with NAP data",
        ],
        "perplexity": [
            "Cite sources and link to authoritative references within your content",
            "Write factual, data-driven paragraphs that can be directly quoted",
            "Include 'According to [source]' patterns in your content",
            "Create comprehensive pillar pages that cover topics in depth",
        ],
        "gemini": [
            "Optimize for multimodal: add descriptive alt text to all images",
            "Include YouTube video embeds where relevant (Gemini indexes video)",
            "Add location-specific content if you serve specific areas",
            "Ensure Google Business Profile is fully optimized",
        ],
    }

    eeat_strategy = []
    if ai_score < 50:
        eeat_strategy.append({"signal": "Experience", "current_score": "Low", "target_score": "High", "action_plan": "Add first-hand experience signals: personal stories, original photos, specific project details, before/after results, team bios with real credentials"})
    eeat_strategy.append({"signal": "Expertise", "current_score": "Medium", "target_score": "High", "action_plan": "Add author bios with credentials on all content. Create an 'Our Experts' page. Reference industry certifications and training. Include author LinkedIn profiles"})
    eeat_strategy.append({"signal": "Authoritativeness", "current_score": "Medium" if geo_score < 70 else "High", "target_score": "High", "action_plan": "Get mentioned on industry publications. Create original research or surveys. Guest post on authoritative sites. Build topical authority through content clusters"})
    eeat_strategy.append({"signal": "Trustworthiness", "current_score": "Medium", "target_score": "High", "action_plan": "Add clear contact information, privacy policy, terms of service. Display trust badges and certifications. Include customer testimonials with real names and photos"})

    quick_wins = []
    if thin > 0:
        quick_wins.append(f"Expand {min(thin, 5)} thin pages to 800+ words each - can improve rankings within 2-4 weeks")
    if no_og > 0:
        quick_wins.append("Add Open Graph tags to all pages - immediate improvement in social sharing")
    if no_schema > 0:
        quick_wins.append("Add Organization schema to homepage - can trigger knowledge panel in Google")
    quick_wins.append("Update title tags on the 10 most-visited pages to include primary keywords")
    quick_wins.append("Add internal links from high-authority pages to pages that need ranking boosts")

    advantages = []
    if seo_score >= 70:
        advantages.append("Strong on-page SEO foundation compared to many competitors")
    if tech_score >= 70:
        advantages.append("Technical health is solid - faster than most competing sites")
    if avg_wc >= 600:
        advantages.append("Content depth is above average for your industry")

    gaps = []
    if ai_score < 40:
        gaps.append("AI search visibility is critically low - competitors with AI-optimized content will capture growing search volume")
    if aeo_score < 60:
        gaps.append("Answer engine optimization needs work - competitors are winning featured snippets and AI citations")
    if thin > 0:
        gaps.append(f"Thin content pages are leaving ranking opportunities on the table")

    day_plan = [
        {"week": "Week 1-2", "action": "Fix all CRITICAL issues - these are blocking Google from properly indexing your site", "expected_impact": "Restore proper indexing and crawlability"},
        {"week": "Week 3-4", "action": f"Expand {min(thin, 10)} thin content pages to 800+ words with keyword-targeted content", "expected_impact": "20-40% increase in organic traffic to updated pages"},
        {"week": "Week 5-6", "action": "Implement FAQ schema on all service/product pages and add structured data", "expected_impact": "Rich results in Google, AI citation readiness improvement"},
        {"week": "Week 7-8", "action": "Create 3-5 comprehensive pillar pages for core topics with internal linking", "expected_impact": "Topical authority boost, improved rankings for cluster keywords"},
        {"week": "Week 9-10", "action": "Build backlink strategy: guest posts, industry mentions, original research", "expected_impact": "Domain authority improvement, higher rankings across the board"},
        {"week": "Week 11-12", "action": "Optimize for AI search: add comparison tables, definition blocks, direct answers", "expected_impact": "Improved visibility in ChatGPT, Perplexity, and Google AI Overviews"},
    ]

    kpis = [
        {"metric": "Overall SEO Score", "current_baseline": f"{overall}/100", "target": f"{min(95, overall + 15)}/100", "timeframe": "90 days"},
        {"metric": "Organic Traffic", "current_baseline": "Baseline from GSC", "target": "+30-50%", "timeframe": "90 days"},
        {"metric": "AI Visibility Score", "current_baseline": f"{ai_score}/100", "target": f"{min(80, ai_score + 30)}/100", "timeframe": "90 days"},
        {"metric": "Thin Content Pages", "current_baseline": f"{thin} pages", "target": "0 pages", "timeframe": "60 days"},
        {"metric": "Schema Coverage", "current_baseline": f"{len(pages) - no_schema}/{len(pages)} pages", "target": f"{len(pages)}/{len(pages)} pages", "timeframe": "45 days"},
        {"metric": "Average Word Count", "current_baseline": f"{avg_wc} words", "target": f"{max(avg_wc + 200, 800)} words", "timeframe": "60 days"},
    ]

    recs = {
        "executive_summary": f"{audit.website_url} scores {overall}/100 overall with {len(pages)} pages analyzed and {len(issues)} issues found. SEO ({seo_score}) and Technical ({tech_score}) are your strengths. AI visibility ({ai_score}) and AEO ({aeo_score}) are critical gaps. Fix {issue_summary.get('CRITICAL', 0)} critical issues first, then focus on content expansion and AI search optimization.",
        "site_health_grade": f"{grade} - {grade_explanation.get(grade, '')}",
        "google_likes": google_likes,
        "google_dislikes": google_dislikes,
        "content_strategy": {
            "strengths": content_strengths,
            "weaknesses": content_weaknesses,
            "content_calendar_suggestions": content_calendar,
        },
        "technical_seo_priorities": tech_priorities,
        "ai_search_strategy": {
            "platform_optimizations": aeo_platform_tips,
        },
        "eeat_strategy": eeat_strategy,
        "competitor_positioning": {
            "your_advantages": advantages,
            "your_gaps": gaps,
            "quick_wins": quick_wins,
        },
        "90_day_action_plan": day_plan,
        "kpis_to_track": kpis,
        "most_affected_pages": [{"url": u, "issue_count": c} for u, c in most_affected],
        "issue_breakdown_by_category": issues_by_cat,
        "thin_content_examples": low_word_pages[:5],
        "website_url": audit.website_url,
    }

    try:
        from app.engine.dual_ai import dual_ai_analyze_seo
        site_summary_text = f"URL: {audit.website_url}, {len(pages)} pages, SEO: {seo_score}, Tech: {tech_score}, AEO: {aeo_score}, GEO: {geo_score}, AI: {ai_score}"
        groq_site = await dual_ai_analyze_seo(audit.website_url, audit.website_url, "", site_summary_text, {}, [])
        if groq_site and groq_site.get("executive_summary"):
            recs["ai_site_analysis"] = groq_site
            if groq_site.get("quick_wins"):
                recs["competitor_positioning"]["ai_quick_wins"] = groq_site["quick_wins"]
            if groq_site.get("content_recommendations"):
                recs["content_strategy"]["ai_content_recs"] = groq_site["content_recommendations"]
            if groq_site.get("long_term_strategy"):
                recs["90_day_action_plan"] = [{"week": "AI Strategy", "action": s, "expected_impact": "Competitive advantage"} for s in groq_site["long_term_strategy"][:6]]
    except Exception:
        pass

    try:
        engine = AIRecommendationEngine()
        if engine.api_key:
            site_data = {
                "url": audit.website_url, "total_pages": len(pages),
                "overall_score": overall, "page_type_distribution": page_type_dist,
                "issue_summary": issue_summary, "top_issues": [{"severity": getattr(i, 'severity', ''), "category": getattr(i, 'category', ''), "description": getattr(i, 'description', '')[:100]} for i in issues[:8]],
                "scores": {"seo": seo_score, "technical": tech_score, "aeo": aeo_score, "geo": geo_score, "ai_visibility": ai_score},
                "thin_content_pages": thin, "avg_word_count": avg_wc,
            }
            ai_recs = await engine.analyze_global(site_data)
            if ai_recs and ai_recs.get("executive_summary") and "unavailable" not in ai_recs.get("executive_summary", "").lower():
                recs["ai_enhanced"] = True
                if ai_recs.get("content_strategy", {}).get("content_calendar_suggestions"):
                    recs["content_strategy"]["content_calendar_suggestions"] = ai_recs["content_strategy"]["content_calendar_suggestions"]
                if ai_recs.get("90_day_action_plan"):
                    recs["90_day_action_plan"] = ai_recs["90_day_action_plan"]
    except Exception:
        pass

    _cache_set(cache_key, recs)
    return recs


@router.get("/audit/{audit_id}/ai-content-suggestion/{page_idx}")
async def get_ai_content_suggestion(audit_id: str, page_idx: int, section: str = "hero", db: AsyncSession = Depends(get_db)):
    from app.engine.ai_recommendation_engine import AIRecommendationEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()
    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    page = pages[page_idx]
    pa = PageAdapter(page)
    page_data = {
        "url": pa.url,
        "title": pa.title,
        "page_type": pa.page_type,
        "target_keywords": [pa.h1] if pa.h1 else [],
        "current_section_content": pa.content_text[:1500] if pa.content_text else "",
    }

    engine = AIRecommendationEngine()
    suggestion = await engine.generate_content_suggestion(page_data, section)
    suggestion["section"] = section
    suggestion["url"] = pa.url

    try:
        from app.engine.dual_ai import dual_ai_content_rewrite
        groq_suggestion = await dual_ai_content_rewrite(pa.url, pa.title or "", pa.meta_description or "", pa.content_text or "", [pa.h1] if pa.h1 else [], [])
        if groq_suggestion and groq_suggestion.get("rewrite_sections"):
            suggestion["ai_content_suggestion"] = groq_suggestion
    except Exception:
        pass

    return suggestion


@router.get("/mega-analysis/{audit_id}/by-url")
async def get_mega_analysis_by_url(audit_id: str, url: str, db: AsyncSession = Depends(get_db)):
    import hashlib
    cache_key = f"mega_url:{audit_id}:{hashlib.md5(url.encode()).hexdigest()}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.mega_seo_engine import MegaSEOEngine

    pages = (await db.execute(select(Page).where(Page.audit_id == audit_id))).scalars().all()
    page = next((p for p in pages if p.url == url), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    engine = MegaSEOEngine()
    try:
        result = engine.analyze(page, all_pages=pages)
    except Exception as e:
        logger.exception(f"mega-analysis by-url failed: {e}")
        result = {"signals": [], "all_signals": [], "issues": [], "error": str(e)}
    result["page_url"] = page.url
    result["page_title"] = page.title
    result["word_count"] = page.word_count or 0
    _cache_set(cache_key, result)
    return result


@router.get("/mega-analysis/{audit_id}/{page_idx}")
async def get_mega_analysis(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"mega:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.mega_seo_engine import MegaSEOEngine

    pages = (await db.execute(select(Page).where(Page.audit_id == audit_id))).scalars().all()
    if not pages or page_idx >= len(pages):
        raise HTTPException(status_code=404, detail="Page not found")

    page = pages[page_idx]
    engine = MegaSEOEngine()
    result = engine.analyze(page, all_pages=pages)

    result["page_url"] = page.url
    result["page_title"] = page.title
    result["word_count"] = page.word_count or 0

    try:
        from app.engine.dual_ai import dual_ai_analyze_seo, dual_ai_search_optimization
        import asyncio
        current_content = page.content_text or ""
        signals = result.get("all_signals", [])
        results = await asyncio.gather(
            dual_ai_analyze_seo(page.url, page.title or "", page.meta_description or "", current_content, {}, signals),
            dual_ai_search_optimization(page.url, page.title or "", current_content, signals),
            return_exceptions=True,
        )
        result["ai_seo_analysis"] = results[0] if isinstance(results[0], dict) else {}
        result["ai_search"] = results[1] if isinstance(results[1], dict) else {}
    except Exception:
        pass

    _cache_set(cache_key, result)
    return result


@router.get("/full-strategy/{audit_id}")
async def get_full_strategy(audit_id: str, db: AsyncSession = Depends(get_db)):
    """Generate comprehensive ranking strategy guide from all audit data."""
    from app.engine.mega_seo_engine import generate_full_strategy

    from sqlalchemy.orm import selectinload

    audit = (await db.execute(
        select(Audit).where(Audit.id == audit_id).options(selectinload(Audit.scores))
    )).scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages = (await db.execute(select(Page).where(Page.audit_id == audit_id))).scalars().all()
    issues = (await db.execute(select(Issue).where(Issue.audit_id == audit_id))).scalars().all()
    recs = (await db.execute(select(Recommendation).where(Recommendation.audit_id == audit_id))).scalars().all()
    competitor = (await db.execute(select(CompetitorData).where(CompetitorData.audit_id == audit_id))).scalar_one_or_none()
    keywords = (await db.execute(select(KeywordData).where(KeywordData.audit_id == audit_id))).scalar_one_or_none()
    content = (await db.execute(select(ContentData).where(ContentData.audit_id == audit_id))).scalar_one_or_none()

    scores_obj = audit.scores
    audit_dict = {
        "seo_score": scores_obj.seo_score if scores_obj else 0,
        "technical_score": scores_obj.technical_score if scores_obj else 0,
        "aeo_score": scores_obj.aeo_score if scores_obj else 0,
        "geo_score": scores_obj.geo_score if scores_obj else 0,
    }
    strategy = generate_full_strategy(audit_dict, pages, issues, recs, competitor, keywords, content)

    try:
        from app.engine.dual_ai import dual_ai_full_strategy
        groq_strategy = await dual_ai_full_strategy(
            {"url": audit.website_url, **audit_dict},
            [{"url": p.url, "title": p.title, "word_count": p.word_count} for p in pages[:30]],
            [{"severity": i.severity, "category": i.category, "title": i.signal_name or i.description} for i in issues[:30]],
        )
        if groq_strategy and groq_strategy.get("steps"):
            strategy["ai_strategy"] = groq_strategy
            strategy["ai_steps"] = groq_strategy["steps"]
    except Exception:
        pass

    return strategy


@router.get("/all-pages-mega/{audit_id}")
async def get_all_pages_mega(audit_id: str, db: AsyncSession = Depends(get_db)):
    """Run mega analysis on ALL pages and return aggregated results."""
    cache_key = f"all_mega:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.mega_seo_engine import MegaSEOEngine

    pages = (await db.execute(select(Page).where(Page.audit_id == audit_id))).scalars().all()
    if not pages:
        raise HTTPException(status_code=404, detail="No pages found")

    engine = MegaSEOEngine()
    all_results = []
    all_issues = []
    cat_scores_agg = {}

    for i, page in enumerate(pages):
        result = engine.analyze(page, all_pages=pages)
        all_results.append({
            "page_url": page.url,
            "page_title": page.title,
            "overall_score": result["overall_score"],
            "signals_checked": result["signals_checked"],
            "issues_count": len(result["issues"]),
        })
        all_issues.extend(result["issues"])

        for cat, score in result.get("category_scores", {}).items():
            if cat not in cat_scores_agg:
                cat_scores_agg[cat] = []
            cat_scores_agg[cat].append(score)

    avg_cat_scores = {cat: round(sum(scores) / len(scores), 1) for cat, scores in cat_scores_agg.items()}

    all_issues.sort(key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x["severity"], 4))

    critical_count = sum(1 for i in all_issues if i["severity"] == "CRITICAL")
    high_count = sum(1 for i in all_issues if i["severity"] == "HIGH")

    unique_fixes = {}
    for issue in all_issues:
        key = issue["signal_id"]
        if key not in unique_fixes:
            unique_fixes[key] = {
                **issue,
                "affected_pages": [],
                "total_count": 0,
            }
        unique_fixes[key]["affected_pages"].append(issue["page_url"])
        unique_fixes[key]["total_count"] += 1

    prioritized_fixes = sorted(unique_fixes.values(), key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x["severity"], 4))

    resp = {
        "total_pages": len(pages),
        "total_signals": sum(r["signals_checked"] for r in all_results),
        "total_issues": len(all_issues),
        "critical_count": critical_count,
        "high_count": high_count,
        "category_scores": avg_cat_scores,
        "page_scores": all_results,
        "prioritized_fixes": prioritized_fixes,
        "all_issues": all_issues[:500],
    }
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/ai-bot-intelligence/{page_idx}")
async def get_ai_bot_intelligence(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"abi:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.ai_bot_intelligence import AiBotIntelligenceEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    engine = AiBotIntelligenceEngine()
    page_obj = PageAdapter(pages[page_idx])
    robots_txt = pages[page_idx].robots_txt if hasattr(pages[page_idx], 'robots_txt') and pages[page_idx].robots_txt else ""
    all_pages_data = [PageAdapter(p) for p in pages]
    page_dict = {
        "url": page_obj.url,
        "title": page_obj.title,
        "meta_description": page_obj.meta_description,
        "h1": page_obj.h1,
        "headings": page_obj.headings,
        "content_text": page_obj.content_text,
        "word_count": page_obj.word_count,
        "html_raw": page_obj.html_raw,
        "images": page_obj.images,
        "links_internal": page_obj.links_internal,
        "links_external": page_obj.links_external,
        "schema_markup": page_obj.schema_markup,
        "page_type": page_obj.page_type,
        "response_time_ms": page_obj.response_time_ms,
        "status_code": page_obj.status_code,
        "robots_txt": robots_txt,
        "linked_files": [],
        "domain": "",
    }
    resp = engine.analyze(page_dict, all_pages=all_pages_data)
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/offsite-authority/{page_idx}")
async def get_offsite_authority(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"osa:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.offsite_authority import OffsiteAuthorityEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    engine = OffsiteAuthorityEngine()
    page_obj = PageAdapter(pages[page_idx])
    from urllib.parse import urlparse
    domain = urlparse(page_obj.url).netloc if page_obj.url else ""
    all_pages_data = [PageAdapter(p) for p in pages]
    page_dict = {
        "url": page_obj.url,
        "title": page_obj.title,
        "meta_description": page_obj.meta_description,
        "h1": page_obj.h1,
        "headings": page_obj.headings,
        "content_text": page_obj.content_text,
        "word_count": page_obj.word_count,
        "html_raw": page_obj.html_raw,
        "images": page_obj.images,
        "links_internal": page_obj.links_internal,
        "links_external": page_obj.links_external,
        "schema_markup": page_obj.schema_markup,
        "page_type": page_obj.page_type,
        "response_time_ms": page_obj.response_time_ms,
        "status_code": page_obj.status_code,
        "robots_txt": "",
        "linked_files": [],
        "domain": domain,
    }
    resp = engine.analyze(page_dict, all_pages=all_pages_data)
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/schema-intelligence/{page_idx}")
async def get_schema_intelligence(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"si:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.schema_intelligence import SchemaIntelligenceEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    engine = SchemaIntelligenceEngine()
    page_obj = PageAdapter(pages[page_idx])
    all_pages_data = [PageAdapter(p) for p in pages]
    page_dict = {
        "url": page_obj.url,
        "title": page_obj.title,
        "meta_description": page_obj.meta_description,
        "h1": page_obj.h1,
        "headings": page_obj.headings,
        "content_text": page_obj.content_text,
        "word_count": page_obj.word_count,
        "html_raw": page_obj.html_raw,
        "images": page_obj.images,
        "links_internal": page_obj.links_internal,
        "links_external": page_obj.links_external,
        "schema_markup": page_obj.schema_markup,
        "page_type": page_obj.page_type,
        "response_time_ms": page_obj.response_time_ms,
        "status_code": page_obj.status_code,
        "robots_txt": "",
        "linked_files": [],
        "domain": "",
    }
    resp = engine.analyze(page_dict, all_pages=all_pages_data)
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/speed-intelligence/{page_idx}")
async def get_speed_intelligence(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"spi:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.speed_intelligence import SpeedIntelligenceEngine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    engine = SpeedIntelligenceEngine()
    page_obj = PageAdapter(pages[page_idx])
    all_pages_data = [PageAdapter(p) for p in pages]
    page_dict = {
        "url": page_obj.url,
        "title": page_obj.title,
        "meta_description": page_obj.meta_description,
        "h1": page_obj.h1,
        "headings": page_obj.headings,
        "content_text": page_obj.content_text,
        "word_count": page_obj.word_count,
        "html_raw": page_obj.html_raw,
        "images": page_obj.images,
        "links_internal": page_obj.links_internal,
        "links_external": page_obj.links_external,
        "schema_markup": page_obj.schema_markup,
        "page_type": page_obj.page_type,
        "response_time_ms": page_obj.response_time_ms,
        "status_code": page_obj.status_code,
        "robots_txt": "",
        "linked_files": [],
        "domain": "",
    }
    resp = engine.analyze(page_dict, all_pages=all_pages_data)
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/content-deep-v2/{page_idx}")
async def get_content_deep_v2(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"cdv2:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.content_intelligence_deep import ContentIntelligenceDeep

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    engine = ContentIntelligenceDeep()
    page_obj = PageAdapter(pages[page_idx])
    all_pages_data = [PageAdapter(p) for p in pages]
    page_dict = {
        "url": page_obj.url,
        "title": page_obj.title,
        "meta_description": page_obj.meta_description,
        "h1": page_obj.h1,
        "headings": page_obj.headings,
        "content_text": page_obj.content_text,
        "word_count": page_obj.word_count,
        "html_raw": page_obj.html_raw,
        "images": page_obj.images,
        "links_internal": page_obj.links_internal,
        "links_external": page_obj.links_external,
        "schema_markup": page_obj.schema_markup,
        "page_type": page_obj.page_type,
        "response_time_ms": page_obj.response_time_ms,
        "status_code": page_obj.status_code,
        "robots_txt": "",
        "linked_files": [],
        "domain": "",
    }
    resp = engine.analyze(page_dict, all_pages=all_pages_data)
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/enterprise-dashboard")
async def get_enterprise_dashboard(audit_id: str, db: AsyncSession = Depends(get_db)):
    cache_key = f"ent_dash:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages = (await db.execute(select(Page).where(Page.audit_id == audit_id))).scalars().all()
    all_pages_data = [PageAdapter(p) for p in pages]

    score_result = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
    scores = score_result.scalar_one_or_none()

    engine_scores = {}
    priority_actions = []

    try:
        from app.engine.ai_bot_intelligence import AiBotIntelligenceEngine
        from app.engine.offsite_authority import OffsiteAuthorityEngine
        from app.engine.schema_intelligence import SchemaIntelligenceEngine
        from app.engine.speed_intelligence import SpeedIntelligenceEngine
        from app.engine.content_intelligence_deep import ContentIntelligenceDeep

        for idx, page in enumerate(pages[:3]):
            page_obj = PageAdapter(page)
            page_dict = {
                "url": page_obj.url, "title": page_obj.title, "meta_description": page_obj.meta_description,
                "h1": page_obj.h1, "headings": page_obj.headings, "content_text": page_obj.content_text,
                "word_count": page_obj.word_count, "html_raw": page_obj.html_raw, "images": page_obj.images,
                "links_internal": page_obj.links_internal, "links_external": page_obj.links_external,
                "schema_markup": page_obj.schema_markup, "page_type": page_obj.page_type,
                "response_time_ms": page_obj.response_time_ms, "status_code": page_obj.status_code,
                "robots_txt": "", "linked_files": [], "domain": "",
            }

            try:
                abi = AiBotIntelligenceEngine().analyze(page_dict, all_pages=all_pages_data)
                key = "ai_bot_intelligence"
                if key not in engine_scores:
                    engine_scores[key] = []
                engine_scores[key].append({"url": page.url, "score": abi.get("overall_ai_accessibility_score", 0)})
                if abi.get("overall_ai_accessibility_score", 100) < 60:
                    priority_actions.append({"engine": key, "url": page.url, "score": abi.get("overall_ai_accessibility_score", 0), "issues": abi.get("issues", [])[:3]})
            except Exception:
                pass

            try:
                osa = OffsiteAuthorityEngine().analyze(page_dict, all_pages=all_pages_data)
                key = "offsite_authority"
                if key not in engine_scores:
                    engine_scores[key] = []
                engine_scores[key].append({"url": page.url, "score": osa.get("authority_score", 0)})
                if osa.get("authority_score", 100) < 60:
                    priority_actions.append({"engine": key, "url": page.url, "score": osa.get("authority_score", 0), "issues": osa.get("issues", [])[:3]})
            except Exception:
                pass

            try:
                si = SchemaIntelligenceEngine().analyze(page_dict, all_pages=all_pages_data)
                key = "schema_intelligence"
                if key not in engine_scores:
                    engine_scores[key] = []
                engine_scores[key].append({"url": page.url, "score": si.get("schema_score", 0)})
                if si.get("schema_score", 100) < 60:
                    priority_actions.append({"engine": key, "url": page.url, "score": si.get("schema_score", 0), "issues": si.get("issues", [])[:3]})
            except Exception:
                pass

            try:
                spi = SpeedIntelligenceEngine().analyze(page_dict, all_pages=all_pages_data)
                key = "speed_intelligence"
                if key not in engine_scores:
                    engine_scores[key] = []
                engine_scores[key].append({"url": page.url, "score": spi.get("performance_score", 0)})
                if spi.get("performance_score", 100) < 60:
                    priority_actions.append({"engine": key, "url": page.url, "score": spi.get("performance_score", 0), "issues": spi.get("issues_detected", [])[:3]})
            except Exception:
                pass

            try:
                cdv2 = ContentIntelligenceDeep().analyze(page_dict, all_pages=all_pages_data)
                key = "content_deep_v2"
                if key not in engine_scores:
                    engine_scores[key] = []
                engine_scores[key].append({"url": page.url, "score": cdv2.get("content_score", 0)})
                if cdv2.get("content_score", 100) < 60:
                    priority_actions.append({"engine": key, "url": page.url, "score": cdv2.get("content_score", 0), "issues": cdv2.get("issues", [])[:3]})
            except Exception:
                pass

    except Exception as e:
        logger.warning(f"Enterprise dashboard engine aggregation failed: {e}")

    avg_engine_scores = {}
    for eng, entries in engine_scores.items():
        if entries:
            avg_engine_scores[eng] = round(sum(e["score"] for e in entries) / len(entries), 1)

    overall_score = round(sum(avg_engine_scores.values()) / len(avg_engine_scores), 1) if avg_engine_scores else 0

    priority_actions.sort(key=lambda x: x.get("score", 100))

    business_impact = {
        "overall_score": overall_score,
        "total_pages": len(pages),
        "critical_areas": [a for a in priority_actions if a.get("score", 100) < 40][:10],
        "improvement_opportunities": len(priority_actions),
    }

    resp = {
        "audit_id": audit_id,
        "website_url": audit.website_url,
        "overall_score": overall_score,
        "engine_scores": avg_engine_scores,
        "raw_engine_data": {k: v[:10] for k, v in engine_scores.items()},
        "priority_actions": priority_actions[:30],
        "business_impact": business_impact,
        "trends": {
            "seo_score": scores.seo_score if scores else 0,
            "technical_score": scores.technical_score if scores else 0,
            "aeo_score": scores.aeo_score if scores else 0,
            "geo_score": scores.geo_score if scores else 0,
        },
    }
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/page-intelligence-v2/{page_idx}")
async def get_page_intelligence_v2(audit_id: str, page_idx: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"piv2:{audit_id}:{page_idx}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    from app.engine.page_intelligence_v2 import PageIntelligenceV2Engine

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
    pages = pages_result.scalars().all()

    if page_idx < 0 or page_idx >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")

    engine = PageIntelligenceV2Engine()
    all_pages_data = [PageAdapter(p) for p in pages]
    page_obj = all_pages_data[page_idx]
    page_dict = {
        "url": page_obj.url,
        "title": page_obj.title,
        "meta_description": page_obj.meta_description,
        "h1": page_obj.h1,
        "headings": page_obj.headings,
        "content_text": page_obj.content_text,
        "word_count": page_obj.word_count,
        "html_raw": page_obj.html_raw,
        "images": page_obj.images,
        "links_internal": page_obj.links_internal,
        "links_external": page_obj.links_external,
        "schema_markup": page_obj.schema_markup,
        "page_type": page_obj.page_type,
        "response_time_ms": page_obj.response_time_ms,
        "status_code": page_obj.status_code,
        "canonical": page_obj.canonical,
        "robots_txt": "",
    }
    all_pages_dicts = []
    for ap in all_pages_data:
        all_pages_dicts.append({
            "url": ap.url,
            "title": ap.title,
            "meta_description": ap.meta_description,
            "h1": ap.h1,
            "headings": ap.headings,
            "content_text": ap.content_text,
            "word_count": ap.word_count,
            "html_raw": ap.html_raw,
            "images": ap.images,
            "links_internal": ap.links_internal,
            "links_external": ap.links_external,
            "schema_markup": ap.schema_markup,
            "page_type": ap.page_type,
            "response_time_ms": ap.response_time_ms,
            "status_code": ap.status_code,
            "canonical": ap.canonical,
        })
    resp = engine.analyze(page_dict, all_pages=all_pages_dicts)
    _cache_set(cache_key, resp)
    return resp


@router.get("/audit/{audit_id}/page-speed-live")
async def get_page_speed_live(audit_id: str, url: str = "", strategy: str = "mobile", db: AsyncSession = Depends(get_db)):
    from app.engine.pagespeed_engine import PageSpeedEngine
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    target_url = url or audit.website_url
    cache_key = f"pagespeed:{audit_id}:{target_url}:{strategy}"
    cached = _cache_get(cache_key)
    if cached:
        return cached
    engine = PageSpeedEngine()
    data = await engine.analyze(target_url, strategy)
    _cache_set(cache_key, data)
    return data


@router.get("/audit/{audit_id}/ga4-traffic")
async def get_ga4_traffic(audit_id: str, property_id: str = "", days: int = 28, db: AsyncSession = Depends(get_db)):
    from app.engine.ga4_engine import GA4Engine
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    ga_property = property_id or audit.ga_property or ""
    cache_key = f"ga4:{audit_id}:{ga_property}:{days}"
    cached = _cache_get(cache_key)
    if cached:
        return cached
    engine = GA4Engine()
    data = await engine.get_organic_traffic(ga_property, days)
    _cache_set(cache_key, data)
    return data


@router.get("/audit/{audit_id}/ga4-top-pages")
async def get_ga4_top_pages(audit_id: str, property_id: str = "", days: int = 28, db: AsyncSession = Depends(get_db)):
    from app.engine.ga4_engine import GA4Engine
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    engine = GA4Engine()
    return await engine.get_top_pages(property_id or audit.ga_property or "", days)


@router.get("/audit/{audit_id}/historical")
async def get_historical_trends(audit_id: str, db: AsyncSession = Depends(get_db)):
    from app.engine.historical_tracker import HistoricalTracker
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    cache_key = f"historical:{audit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached
    tracker = HistoricalTracker(db)
    data = await tracker.get_trends(audit.website_url)
    regressions = await tracker.detect_regressions(audit.website_url)
    data["regressions"] = regressions
    _cache_set(cache_key, data)
    return data
