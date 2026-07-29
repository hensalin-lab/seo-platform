import logging
import datetime as _dt
from fastapi import APIRouter, BackgroundTasks, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, outerjoin
from sqlalchemy.orm import selectinload
from slowapi import Limiter

from app.database import get_db
from app.models import (
    Audit, AuditStatus, Page, Issue, Recommendation,
    CompetitorData, AuditScore, AuditHistory, AuditLinterResult,
    PageAnalysisRecord, KeywordRecord, RoadmapRecord,
)
from app.schemas import AuditRequest, AuditStartResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["audit"])


FIX_TEMPLATES = {
    "Missing Title": {"issue": "Missing title tag", "problem": "Page has no <title> element", "why": "Title is the #1 on-page ranking factor", "fix": "Add a unique, keyword-rich title tag (50-60 characters) to the <head> section", "before": "<head>\n  <!-- no title -->\n</head>", "after": "<head>\n  <title>Primary Keyword - Brand Name</title>\n</head>", "difficulty": "EASY", "impact": "HIGH"},
    "Missing Meta Description": {"issue": "Missing meta description", "problem": "No meta description tag found", "why": "Meta descriptions control SERP snippets and affect CTR", "fix": "Add a compelling 150-160 character meta description with target keyword and CTA", "before": "<head>\n  <!-- no description -->\n</head>", "after": "<head>\n  <meta name=\"description\" content=\"Clear, compelling 155-char description with target keyword. Include a call to action.\" />\n</head>", "difficulty": "EASY", "impact": "HIGH"},
    "Missing Canonical": {"issue": "Missing canonical tag", "problem": "No canonical tag on page", "why": "Without canonical, search engines may index duplicate versions", "fix": "Add <link rel=\"canonical\" href=\"URL\" /> to the <head>", "before": "<head>\n  <!-- no canonical -->\n</head>", "after": "<head>\n  <link rel=\"canonical\" href=\"https://example.com/page\" />\n</head>", "difficulty": "EASY", "impact": "HIGH"},
    "Missing H1": {"issue": "Missing H1 tag", "problem": "No H1 heading found on page", "why": "H1 is a primary on-page signal for topic relevance", "fix": "Add one H1 tag with the primary target keyword", "before": "<body>\n  <h2>Page Title</h2>\n</body>", "after": "<body>\n  <h1>Primary Keyword - Page Title</h1>\n</body>", "difficulty": "EASY", "impact": "HIGH"},
    "Thin Content": {"issue": "Thin content", "problem": "Page has fewer than 300 words", "why": "Thin pages rarely rank; Panda algorithm targets thin content", "fix": "Expand to 800+ words with comprehensive topic coverage, FAQs, and examples", "before": "<!-- ~100 words, minimal content -->", "after": "<!-- 800+ words with H2/H3 structure, lists, examples, FAQs -->", "difficulty": "MODERATE", "impact": "HIGH"},
    "Missing FAQ Schema": {"issue": "Missing FAQPage schema", "problem": "No FAQPage JSON-LD detected", "why": "FAQ schema enables rich results and AI answer extraction", "fix": "Add FAQPage JSON-LD schema with 4-6 Q&As matching page content", "before": "<!-- no structured data -->", "after": "<script type=\"application/ld+json\">\n{\"@context\":\"https://schema.org\",\"@type\":\"FAQPage\",\"mainEntity\":[...]}\n</script>", "difficulty": "MODERATE", "impact": "HIGH"},
    "No Question Headings": {"issue": "No question-format headings", "problem": "No H2/H3 headings in question format", "why": "Question headings target featured snippets and AI answers", "fix": "Add 2-3 question-format H2/H3 headings (How to, What is, Why...)", "before": "<h2>Our Services</h2>", "after": "<h2>What Services Do We Offer?</h2>\n<h2>How Can We Help Your Business?</h2>", "difficulty": "EASY", "impact": "MEDIUM"},
    "No Internal Links": {"issue": "No internal links", "problem": "Page has zero internal links", "why": "Internal links distribute PageRank and improve crawlability", "fix": "Add 3-5 contextual internal links to related pages", "before": "<!-- page with no links to other site pages -->", "after": "<!-- 3-5 contextual links to related pages -->", "difficulty": "EASY", "impact": "MEDIUM"},
    "Missing Alt Text": {"issue": "Missing image alt text", "problem": "Images missing alt attributes", "why": "Alt text helps image SEO and accessibility", "fix": "Add descriptive alt text to all images with relevant keywords where natural", "before": "<img src=\"photo.jpg\">", "after": "<img src=\"photo.jpg\" alt=\"Descriptive text with relevant keyword\">", "difficulty": "EASY", "impact": "MEDIUM"},
    "HTTP not HTTPS": {"issue": "Page uses HTTP", "problem": "Page served over insecure HTTP", "why": "Google prioritizes HTTPS; browsers show 'Not Secure' warning", "fix": "Enable SSL certificate and set up HTTP to HTTPS redirect", "before": "http://example.com/page", "after": "https://example.com/page (with 301 redirect)", "difficulty": "MODERATE", "impact": "CRITICAL"},
}


def _generate_fallback_recommendations(issues, website_url):
    seen = set()
    recs = []
    priority_map = {"CRITICAL": "CRITICAL", "HIGH": "HIGH", "MEDIUM": "MEDIUM", "LOW": "LOW"}
    for issue in issues:
        name = issue.get("signal_name", "")
        if name in seen:
            continue
        seen.add(name)
        tmpl = FIX_TEMPLATES.get(name)
        if tmpl:
            recs.append({
                "page_url": issue.get("page_url", website_url),
                "category": issue.get("category", "SEO"),
                "priority": priority_map.get(issue.get("severity", "MEDIUM"), "MEDIUM"),
                "issue": tmpl["issue"],
                "current_problem": tmpl["problem"],
                "why_it_matters": tmpl["why"],
                "exact_fix": tmpl["fix"],
                "before_example": tmpl["before"],
                "after_example": tmpl["after"],
                "suggested_content": "",
                "suggested_heading": "",
                "keywords": [],
                "expected_impact": f"Fixing this {issue.get('severity', 'MEDIUM').lower()}-priority issue improves {issue.get('category', 'SEO')} signals",
                "difficulty": tmpl["difficulty"],
            })
        else:
            recs.append({
                "page_url": issue.get("page_url", website_url),
                "category": issue.get("category", "SEO"),
                "priority": priority_map.get(issue.get("severity", "MEDIUM"), "MEDIUM"),
                "issue": name,
                "current_problem": issue.get("description", ""),
                "why_it_matters": issue.get("impact", ""),
                "exact_fix": issue.get("fix", f"Address the {name} issue"),
                "before_example": "",
                "after_example": "",
                "suggested_content": "",
                "suggested_heading": "",
                "keywords": [],
                "expected_impact": f"Resolves {issue.get('severity', 'LOW')}-priority {issue.get('category', 'SEO')} issue",
                "difficulty": "MODERATE",
            })
    return recs[:50]


@router.post("/audit/start", response_model=AuditStartResponse)
async def start_audit(request: Request, req: AuditRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    user_id = getattr(request.state, "user_id", None)
    audit = Audit(
        website_url=req.website_url.rstrip("/"),
        competitor_url=req.competitor_url.rstrip("/") if req.competitor_url else None,
        status=AuditStatus.QUEUED.value,
        progress=0,
        user_id=user_id,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)
    background_tasks.add_task(run_audit_task, audit.id)
    return AuditStartResponse(audit_id=audit.id, status=AuditStatus.QUEUED.value, message="Audit started")


@router.get("/audit/history")
async def get_history(request: Request, limit: int = 20, db: AsyncSession = Depends(get_db)):
    user_id = getattr(request.state, "user_id", None)
    stmt = (
        select(Audit, AuditScore)
        .outerjoin(AuditScore, Audit.id == AuditScore.audit_id)
    )
    if user_id:
        stmt = stmt.where(Audit.user_id == user_id)
    stmt = stmt.order_by(Audit.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    return [{
        "id": a.id, "audit_id": a.id, "website_url": a.website_url,
        "competitor_url": a.competitor_url,
        "overall_score": s.overall_score if s else 0.0,
        "seo_score": s.seo_score if s else 0.0,
        "technical_score": s.technical_score if s else 0.0,
        "aeo_score": s.aeo_score if s else 0.0,
        "geo_score": s.geo_score if s else 0.0,
        "content_score": s.content_score if s else 0.0,
        "ai_visibility_score": s.ai_visibility_score if s else 0.0,
        "status": a.status,
        "created_at": a.created_at.isoformat() if a.created_at else "",
    } for a, s in rows]


@router.post("/audit/{audit_id}/cancel")
async def cancel_audit(audit_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    if audit.status in (AuditStatus.COMPLETED.value, AuditStatus.FAILED.value):
        raise HTTPException(status_code=400, detail="Audit already finished")
    audit.status = AuditStatus.FAILED.value
    audit.error_message = "Cancelled by user"
    audit.completed_at = _dt.datetime.utcnow()
    await db.commit()
    return {"status": "cancelled", "audit_id": audit_id}


@router.post("/audit/{audit_id}/rerun")
async def rerun_audit(audit_id: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    if audit.status not in (AuditStatus.COMPLETED.value, AuditStatus.FAILED.value):
        raise HTTPException(status_code=400, detail="Audit is still running")
    from app.models import Issue, Recommendation, PageAnalysisRecord, KeywordRecord, RoadmapRecord
    for model in [Issue, Recommendation, PageAnalysisRecord, KeywordRecord, RoadmapRecord]:
        await db.execute(select(model).where(model.audit_id == audit_id))
        old = await db.execute(select(model).where(model.audit_id == audit_id))
        for item in old.scalars().all():
            await db.delete(item)
    audit.status = AuditStatus.QUEUED.value
    audit.progress = 0
    audit.current_step = ""
    audit.error_message = None
    audit.completed_at = None
    await db.commit()
    background_tasks.add_task(run_audit_task, audit_id)
    return {"status": "rerun", "audit_id": audit_id}


@router.get("/audit/{audit_id}/export/csv")
async def export_csv(audit_id: str, type: str = "issues", db: AsyncSession = Depends(get_db)):
    from fastapi.responses import StreamingResponse
    import csv
    import io

    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    output = io.StringIO()
    writer = csv.writer(output)

    if type == "issues":
        writer.writerow(["Page URL", "Category", "Severity", "Issue", "Description", "Impact", "Fix"])
        rows = await db.execute(select(Issue).where(Issue.audit_id == audit_id).order_by(Issue.severity))
        for i in rows.scalars().all():
            writer.writerow([i.page_url, i.category, i.severity, i.signal_name, i.description, i.impact, i.fix])
    elif type == "pages":
        writer.writerow(["URL", "Status", "Title", "Word Count", "Page Type", "Internal Links", "External Links", "Images", "Response Time (ms)"])
        rows = await db.execute(select(Page).where(Page.audit_id == audit_id))
        for p in rows.scalars().all():
            writer.writerow([p.url, p.status_code, p.title, p.word_count, p.page_type or "UNKNOWN",
                           len(p.links_internal or []), len(p.links_external or []), len(p.images or []), p.response_time_ms])
    elif type == "recommendations":
        writer.writerow(["Page URL", "Category", "Priority", "Issue", "Problem", "Why It Matters", "Fix", "Difficulty", "Expected Impact"])
        rows = await db.execute(select(Recommendation).where(Recommendation.audit_id == audit_id).order_by(Recommendation.priority))
        for r in rows.scalars().all():
            writer.writerow([r.page_url, r.category, r.priority, r.issue, r.current_problem, r.why_it_matters, r.exact_fix, r.difficulty, r.expected_impact])
    else:
        raise HTTPException(status_code=400, detail="type must be issues, pages, or recommendations")

    output.seek(0)
    filename = f"seo-{type}-{audit_id[:8]}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


async def _warm_cache(audit_id: str, website_url: str):
    """Pre-compute cached results for fast first-page loads."""
    import asyncio
    from app.database import async_session
    from app.api.status import _cache_set, _endpoint_cache

    try:
        async with async_session() as db:
            from sqlalchemy import select
            from app.models import Audit, AuditScore, Page, Issue, Recommendation, PageAnalysisRecord

            pages_q = await db.execute(select(Page).where(Page.audit_id == audit_id))
            pages = list(pages_q.scalars().all())
            score_q = await db.execute(select(AuditScore).where(AuditScore.audit_id == audit_id))
            scores = score_q.scalar_one_or_none()

            # 1. audit-detail
            from app.api.status import get_audit_detail
            # Skip - lightweight endpoint, fast without cache

            # 2. enterprise (the big one - runs orchestrator on all pages)
            try:
                from app.engine.enterprise_orchestrator import EnterpriseOrchestrator
                orch = EnterpriseOrchestrator()
                payload = orch.generate_enterprise_payload(pages, website_url)
                _cache_set(f"enterprise:{audit_id}", payload)
                _cache_set(f"orchestrator:{audit_id}", {"pages": None, "payload": payload, "url": website_url})

                # 3. remediation-feed from orchestrator data
                all_fixes = []
                seen = set()
                for pr in payload.get("page_results", []):
                    for fix in pr.get("diagnostics", {}).get("actionable_fixes", []):
                        key = (pr.get("url", ""), fix.get("element", ""), fix.get("issue", ""))
                        if key not in seen:
                            seen.add(key)
                            fix["page_url"] = pr.get("url", "")
                            fix["page_type"] = pr.get("page_type", "UNKNOWN")
                            fix["page_health_score"] = pr.get("overall_health_score", 0)
                            all_fixes.append(fix)
                all_fixes.sort(key=lambda x: x.get("impact_score", 0), reverse=True)
                _cache_set(f"remediation_raw:{audit_id}", all_fixes)
            except Exception:
                pass

            # 4. dashboard-deep
            try:
                from app.api.status import get_dashboard_deep
                await get_dashboard_deep(audit_id, db)
            except Exception:
                pass

            # 5. report-data
            try:
                from app.api.status import get_report_data
                await get_report_data(audit_id, db)
            except Exception:
                pass

            # 6. mega-analysis for page 0
            try:
                from app.api.status import get_mega_analysis
                await get_mega_analysis(audit_id, 0, db)
            except Exception:
                pass

            # 7. content-rewrite for page 0
            try:
                from app.api.status import get_content_rewrite
                await get_content_rewrite(audit_id, 0, db)
            except Exception:
                pass

            # 8. ai-visibility
            try:
                from app.api.status import get_ai_visibility
                await get_ai_visibility(audit_id, db)
            except Exception:
                pass

            # 9. ai-recommendations-global
            try:
                from app.api.status import get_ai_recommendations_global
                await get_ai_recommendations_global(audit_id, db)
            except Exception:
                pass

            # 10. all-pages-mega
            try:
                from app.api.status import get_all_pages_mega
                await get_all_pages_mega(audit_id, db)
            except Exception:
                pass

            # 11. page-intelligence-deep, recommendations-deep, ai-search-deep for page 0
            try:
                from app.api.status import get_page_intelligence_deep, get_recommendations_deep, get_ai_search_deep
                await get_page_intelligence_deep(audit_id, 0, db)
                await get_recommendations_deep(audit_id, 0, db)
                await get_ai_search_deep(audit_id, 0, db)
            except Exception:
                pass

            logger.info(f"Cache warmed for audit {audit_id}")
    except Exception as e:
        logger.error(f"Cache warming failed for {audit_id}: {e}")


async def run_audit_task(audit_id: str):
    from app.database import async_session
    from app.engine.crawler import CrawlerEngine
    from app.engine.analyzer import AnalyzerEngine
    from app.engine.ai_engine import AIEngine
    from app.engine.competitor import CompetitorEngine
    from app.engine.page_classifier import classifier
    from app.engine.context_analyzer import run_context_aware_analysis
    from app.engine.classic_seo import ClassicSEOEngine
    from app.engine.ai_geo import AIGeoEngine
    from app.engine.content_intelligence_v2 import ContentIntelligenceV2

    async with async_session() as db:
        try:
            result = await db.execute(select(Audit).where(Audit.id == audit_id))
            audit = result.scalar_one_or_none()
            if not audit:
                return

            async def update_status(status, progress, step=""):
                audit.status = status
                audit.progress = progress
                audit.current_step = step
                await db.commit()

            website_url = audit.website_url
            competitor_url = audit.competitor_url

            await update_status(AuditStatus.CRAWLING.value, 5, "Starting crawler...")

            crawler = CrawlerEngine()
            try:
                pages = await crawler.crawl(website_url, max_pages=300)
            except Exception as e:
                logger.error(f"Crawler failed: {e}")
                pages = []
            finally:
                await crawler.close()

            if not pages:
                await update_status(AuditStatus.FAILED.value, 0, "No pages found")
                audit.error_message = "No pages could be crawled"
                audit.completed_at = _dt.datetime.utcnow()
                await db.commit()
                return

            await update_status(AuditStatus.SEO_ANALYSIS.value, 35, "Running 200+ signal analysis...")

            analyzer = AnalyzerEngine()
            try:
                analysis = analyzer.analyze_pages(pages)
            except Exception as e:
                logger.error(f"Analyzer failed: {e}")
                from app.engine.analyzer import AnalysisResult
                analysis = AnalysisResult()
                analysis.compute_scores()

            await update_status(AuditStatus.TECHNICAL_ANALYSIS.value, 50, "Saving page data...")

            for page in pages:
                schema_types = []
                if page.schema_markup:
                    for s in page.schema_markup:
                        if isinstance(s, dict) and "@type" in s:
                            schema_types.append(s["@type"])
                classification = classifier.classify(
                    url=page.url, title=page.title,
                    content_text=page.content_text, h1=page.h1,
                    word_count=page.word_count or 0,
                    schema_types=schema_types,
                    images=page.images if isinstance(page.images, list) else [],
                )
                page_type = classification["page_type"]

                ctx_issues, ctx_recs = run_context_aware_analysis(page, analysis, page_type)

                for ci in ctx_issues:
                    analysis.add_issue(
                        page.url, ci.get("category", "CONTEXT"),
                        ci.get("severity", "MEDIUM"), 0,
                        ci.get("signal_name", ""), ci.get("description", ""),
                        ci.get("impact", ""), ci.get("fix", ""),
                    )

                from app.engine.crawl_snapshot import CrawlSnapshot
                page_snap = CrawlSnapshot(page)
                db.add(Page(
                    audit_id=audit_id, url=page.url, status_code=page.status_code,
                    title=page.title, meta_description=page.meta_description,
                    canonical=page.canonical, h1=page.h1,
                    content_text=page.content_text[:50000], word_count=page.word_count,
                    html_raw=page.html_raw[:100000] if page.html_raw else "",
                    headers=page.headings, images=page.images,
                    links_internal=page.links_internal[:100],
                    links_external=page.links_external[:100],
                    schema_markup=page.schema_markup, open_graph=page.open_graph,
                    twitter_card=page.twitter_card, crawl_depth=page.crawl_depth,
                    response_time_ms=page.response_time_ms, content_hash=page.content_hash,
                    page_type=page_type, context_issues=ctx_issues,
                    snapshot_hash=page_snap.snapshot_hash,
                ))
            await db.commit()

            await update_status(AuditStatus.TECHNICAL_ANALYSIS.value, 52, "Running enterprise engine analysis...")

            from app.engine.crawl_snapshot import CrawlSnapshot, build_snapshots, _normalize_url
            import json

            pages_result = await db.execute(select(Page).where(Page.audit_id == audit_id))
            pages_saved = pages_result.scalars().all()

            snapshots = build_snapshots(pages_saved)

            for snap in snapshots:
                for sp in pages_saved:
                    if snap.url == sp.url or snap.get("url") == sp.url:
                        sp.snapshot_hash = snap.snapshot_hash
                        break

            seen_norm = set()
            deduped_pages = []
            for sp in pages_saved:
                norm = _normalize_url(sp.url)
                if norm not in seen_norm:
                    seen_norm.add(norm)
                    deduped_pages.append(sp)
            pages_saved = deduped_pages

            classic_engine = ClassicSEOEngine()
            ai_geo_engine = AIGeoEngine()
            content_v2_engine = ContentIntelligenceV2()

            enterprise_issues = []
            for sp in pages_saved:
                try:
                    snap_for_page = CrawlSnapshot(sp)
                    classic_result = classic_engine.analyze(snap_for_page)
                    ai_geo_result = ai_geo_engine.analyze(snap_for_page)
                    content_v2_result = content_v2_engine.analyze(snap_for_page)
                    for issue in classic_result.get("issues", []):
                        issue["page_url"] = sp.url
                        issue["snapshot_hash"] = snap_for_page.snapshot_hash
                        enterprise_issues.append(issue)
                    for issue in ai_geo_result.get("issues", []):
                        issue["page_url"] = sp.url
                        issue["snapshot_hash"] = snap_for_page.snapshot_hash
                        enterprise_issues.append(issue)
                    for issue in content_v2_result.get("issues", []):
                        issue["page_url"] = sp.url
                        issue["snapshot_hash"] = snap_for_page.snapshot_hash
                        enterprise_issues.append(issue)
                except Exception as e:
                    logger.error(f"Enterprise analysis failed for {sp.url}: {e}")

            for issue in enterprise_issues:
                db.add(Issue(
                    audit_id=audit_id, page_url=issue.get("page_url", ""),
                    category=issue.get("category", ""), severity=issue.get("severity", "LOW"),
                    signal_id=issue.get("signal_id", 0), signal_name=issue.get("id", ""),
                    description=issue.get("issue", ""), impact=issue.get("expected_impact", ""),
                    fix=issue.get("fix", issue.get("exact_fix", "")),
                    effort=issue.get("effort", "MEDIUM"),
                    root_cause=issue.get("what_wrong", ""),
                    fix_code=f"FIX-{issue.get('id', '0000')}",
                    snapshot_hash=issue.get("snapshot_hash", ""),
                    pages_affected=1,
                ))
            await db.commit()

            for issue in analysis.issues:
                db.add(Issue(
                    audit_id=audit_id, page_url=issue.get("page_url", ""),
                    category=issue.get("category", ""), severity=issue.get("severity", "LOW"),
                    signal_id=issue.get("signal_id", 0), signal_name=issue.get("signal_name", ""),
                    description=issue.get("description", ""), impact=issue.get("impact", ""),
                    fix=issue.get("fix", ""),
                    effort=issue.get("effort", "MEDIUM"),
                    fix_code=f"FIX-{issue.get('signal_id', 0):04d}",
                    pages_affected=1,
                ))
            await db.commit()

            await update_status(AuditStatus.AEO_ANALYSIS.value, 55, "AEO analysis complete")

            for page_url, pa in analysis.page_analyses.items():
                db.add(PageAnalysisRecord(
                    audit_id=audit_id, page_url=page_url,
                    scores=pa.scores, issue_count=len(pa.issues),
                    signal_count=len(pa.signals),
                    issues=pa.issues[:20],
                    recommendations=pa.recommendations[:10],
                ))
            await db.commit()

            await update_status(AuditStatus.GEO_ANALYSIS.value, 60, "GEO analysis complete")
            await update_status(AuditStatus.CONTENT_ANALYSIS.value, 65, "Content analysis complete")

            await update_status(AuditStatus.COMPETITOR_ANALYSIS.value, 70, "Analyzing competitors...")

            competitor_data = None
            comp_discovery_info = {"source": "not_available", "note": "No competitor URL or SERP API configured"}

            competitor_urls = []
            if competitor_url:
                competitor_urls.append(competitor_url)
            else:
                try:
                    from app.engine.competitor_discovery import discover_competitors
                    first_page = pages[0] if pages else None
                    keyword = getattr(first_page, 'title', '') or domain or ""
                    discovered = await discover_competitors(website_url, keyword.split(" -")[0] if " -" in keyword else keyword)
                    comp_discovery_info = discovered
                    competitor_urls = [c["url"] for c in discovered.get("competitors", [])[:3]]
                    if competitor_urls:
                        logger.info(f"Discovered {len(competitor_urls)} competitors from {discovered.get('source', 'unknown')}")
                        comp_discovery_info["competitor_count"] = len(competitor_urls)
                except Exception as e:
                    logger.warning(f"Competitor discovery failed: {e}")

            if competitor_urls:
                comp_crawler = CrawlerEngine()
                comp_engine = CompetitorEngine()
                all_comp_pages = {}
                try:
                    for cu in competitor_urls:
                        try:
                            comp_pages = await comp_crawler.crawl(cu, max_pages=20)
                            if comp_pages:
                                comp_snapshots = build_snapshots(comp_pages)
                                all_comp_pages[cu] = comp_snapshots
                        except Exception as e:
                            logger.warning(f"Competitor crawl failed for {cu}: {e}")
                            all_comp_pages[cu] = []
                finally:
                    await comp_crawler.close()

                for cu, comp_pages_list in all_comp_pages.items():
                    if not comp_pages_list:
                        continue
                    try:
                        comp_raw = [s.to_dict() for s in comp_pages_list]
                        comp_result = comp_engine.analyze(pages, comp_raw)
                        competitor_data = {
                            "keyword_opportunities": comp_result.get("keyword_opportunities", []),
                            "content_opportunities": comp_result.get("content_opportunities", []),
                            "entity_gaps": comp_result.get("entity_gaps", []),
                            "topic_gaps": comp_result.get("topic_gaps", []),
                            "seo_comparison": comp_result.get("seo_comparison", {}),
                            "strengths": comp_result.get("strengths", []),
                            "weaknesses": comp_result.get("weaknesses", []),
                            "winning_strategy": comp_result.get("winning_strategy", []),
                            "backlink_gap": comp_result.get("backlink_gap", []),
                            "serp_gap": comp_result.get("serp_gap", []),
                            "_note": f"Real crawl data from {cu}",
                            "_source": "competitor_crawl",
                            "_competitor_url": cu,
                        }
                    except Exception as e:
                        logger.error(f"Competitor analysis failed for {cu}: {e}")
                        competitor_data = {
                            "_note": f"Competitor analysis not available for {cu}",
                            "_source": "unavailable",
                            "_competitor_url": cu,
                        }

                    if competitor_data:
                        db.add(CompetitorData(
                            audit_id=audit_id, competitor_url=cu,
                            keyword_opportunities=competitor_data.get("keyword_opportunities", []),
                            content_opportunities=competitor_data.get("content_opportunities", []),
                            entity_gaps=competitor_data.get("entity_gaps", []),
                            topic_gaps=competitor_data.get("topic_gaps", []),
                            seo_comparison=competitor_data.get("seo_comparison", {}),
                            strengths=competitor_data.get("strengths", []),
                            weaknesses=competitor_data.get("weaknesses", []),
                            winning_strategy=competitor_data.get("winning_strategy", []),
                            backlink_gap=competitor_data.get("backlink_gap", []),
                            serp_gap=competitor_data.get("serp_gap", []),
                        ))
                        await db.commit()

            if not competitor_data or competitor_data.get("_source") == "unavailable":
                competitor_data = competitor_data or {}
                competitor_data.setdefault("_note", comp_discovery_info.get("note", "Competitor data not available"))
                competitor_data.setdefault("_source", comp_discovery_info.get("source", "unavailable"))
                competitor_data.setdefault("_discovery", comp_discovery_info)

            await update_status(AuditStatus.KEYWORD_ANALYSIS.value, 75, "Keyword analysis...")

            for kw in analysis.keyword_data:
                db.add(KeywordRecord(
                    audit_id=audit_id, keyword=kw.get("keyword", ""),
                    frequency=kw.get("frequency", 0),
                    opportunity=kw.get("opportunity", "LOW"),
                    action=kw.get("action", ""),
                ))
            await db.commit()

            if analysis.roadmap:
                db.add(RoadmapRecord(
                    audit_id=audit_id,
                    immediate=analysis.roadmap.get("immediate", []),
                    week1=analysis.roadmap.get("week1", []),
                    month1=analysis.roadmap.get("month1", []),
                    month3=analysis.roadmap.get("month3", []),
                ))
                await db.commit()

            await update_status(AuditStatus.AI_ANALYSIS.value, 80, "Running AI analysis...")

            scores = analysis.scores
            total_pages = len(pages)
            avg_words = sum(p.word_count for p in pages) / max(total_pages, 1)
            error_pages = sum(1 for p in pages if p.status_code >= 400)
            top_issues = [{"page_url": i["page_url"], "category": i["category"], "severity": i["severity"], "description": i["description"]} for i in analysis.issues[:15]]

            analysis_summary = {
                "overall_score": scores.get("overall", 0), "seo_score": scores.get("seo", 0),
                "technical_score": scores.get("technical", 0), "aeo_score": scores.get("aeo", 0),
                "geo_score": scores.get("geo", 0), "content_score": scores.get("content", 0),
                "ai_visibility_score": scores.get("ai_visibility", 0),
                "total_pages": total_pages, "error_pages": error_pages,
                "avg_word_count": int(avg_words), "top_issues": top_issues,
            }

            ai_engine = AIEngine()
            ai_recommendations = []
            ai_visibility = {}

            ai_provider_available = ai_engine.available
            if ai_provider_available:
                try:
                    ai_recommendations = await ai_engine.generate_recommendations(analysis_summary)
                except Exception as e:
                    logger.error(f"AI recs failed: {e}")

            if ai_provider_available:
                try:
                    parsed_url = website_url.replace("https://", "").replace("http://", "").split("/")[0]
                    ai_visibility = await ai_engine.analyze_ai_visibility(website_url, parsed_url)
                except Exception as e:
                    logger.error(f"AI visibility failed: {e}")
            else:
                ai_visibility = {
                    "_note": "AI visibility score requires GEMINI_API_KEY. Configure it to enable AI citation analysis.",
                    "_source": "unavailable",
                }

            if not ai_recommendations:
                if analysis.issues:
                    ai_recommendations = _generate_fallback_recommendations(analysis.issues, website_url)
                    for rec in ai_recommendations:
                        rec["_source"] = "rule_based"
                else:
                    ai_recommendations = [{
                        "issue": "AI recommendations not available",
                        "current_problem": "No AI API key configured and no fallback issues available",
                        "why_it_matters": "Configure a GEMINI_API_KEY to generate AI-powered recommendations",
                        "exact_fix": "Set the GEMINI_API_KEY environment variable",
                        "priority": "LOW", "category": "SEO",
                        "expected_impact": "LOW", "difficulty": "EASY",
                        "before_example": "", "after_example": "",
                        "suggested_content": "", "suggested_heading": "",
                        "keywords": [], "_source": "unavailable",
                        "page_url": website_url,
                    }]

            for rec in ai_recommendations:
                db.add(Recommendation(
                    audit_id=audit_id, page_url=rec.get("page_url", website_url),
                    category=rec.get("category", "SEO"), priority=rec.get("priority", "MEDIUM"),
                    issue=rec.get("issue", ""), current_problem=rec.get("current_problem", ""),
                    why_it_matters=rec.get("why_it_matters", ""), exact_fix=rec.get("exact_fix", ""),
                    before_example=rec.get("before_example", ""), after_example=rec.get("after_example", ""),
                    suggested_content=rec.get("suggested_content", ""),
                    suggested_heading=rec.get("suggested_heading", ""),
                    keywords=rec.get("keywords", []), expected_impact=rec.get("expected_impact", ""),
                    difficulty=rec.get("difficulty", "MODERATE"), ai_generated=1 if ai_provider_available else 0,
                ))
            await db.commit()

            await update_status(AuditStatus.REPORT_GENERATION.value, 90, "Generating report...")

            ai_vis_score = 0
            if ai_visibility and ai_visibility.get("_source") != "unavailable":
                ai_vis_score = (ai_visibility.get("chatgpt_visibility", 0) + ai_visibility.get("gemini_visibility", 0) + ai_visibility.get("perplexity_visibility", 0)) / 3

            await update_status(AuditStatus.REPORT_QA.value, 95, "Running self-QA linter...")

            linter_errors = []
            try:
                from app.engine.report_linter import lint_report
                report_for_lint = {
                    "issues": [i.to_business_schema() if hasattr(i, 'to_business_schema') else {} for i in (enterprise_issues + analysis.issues[:200])],
                    "all_signals": analysis.signals,
                    "pages_analyzed": [{"url": p.url} for p in pages_saved],
                    "competitor_data": competitor_data or {},
                    "snapshot_hashes": [getattr(p, 'snapshot_hash', '') for p in pages_saved if hasattr(p, 'snapshot_hash')],
                }
                linter_errors = lint_report(report_for_lint)
                if linter_errors:
                    for err in linter_errors:
                        logger.warning(f"Linter: {err}")
            except Exception as e:
                logger.error(f"Linter failed: {e}")

            db.add(AuditScore(
                audit_id=audit_id, overall_score=round(scores.get("overall", 0), 1),
                seo_score=round(scores.get("seo", 0), 1), technical_score=round(scores.get("technical", 0), 1),
                aeo_score=round(scores.get("aeo", 0), 1), geo_score=round(scores.get("geo", 0), 1),
                content_score=round(scores.get("content", 0), 1), ai_visibility_score=round(ai_vis_score, 1),
                signals={sig.name: sig.to_dict() for sig in analysis.signals[:200]},
            ))

            db.add(AuditHistory(
                audit_id=audit_id, website_url=website_url,
                overall_score=round(scores.get("overall", 0), 1),
                status=AuditStatus.COMPLETED.value,
                linter_warnings=len([e for e in linter_errors if "warning" not in str(e).lower()]),
            ))

            if linter_errors:
                db.add(AuditLinterResult(
                    audit_id=audit_id,
                    passed=len([e for e in linter_errors if not e]),
                    failed=len(linter_errors),
                    details=[{"check": e.check_name, "detail": e.detail} for e in linter_errors],
                ))
                await db.commit()
                logger.warning(f"Audit {audit_id} passed with {len(linter_errors)} linter warnings (non-blocking)")

            await update_status(AuditStatus.COMPLETED.value, 100, "Audit complete")
            audit.completed_at = _dt.datetime.utcnow()
            await db.commit()
            logger.info(f"Audit {audit_id} completed successfully")

            import asyncio
            asyncio.create_task(_warm_cache(audit_id, website_url))

        except Exception as e:
            logger.error(f"Audit {audit_id} failed: {e}", exc_info=True)
            try:
                r = await db.execute(select(Audit).where(Audit.id == audit_id))
                a = r.scalar_one_or_none()
                if a:
                    a.status = AuditStatus.FAILED.value
                    a.error_message = str(e)[:500]
                    a.completed_at = _dt.datetime.utcnow()
                    await db.commit()
            except Exception:
                pass
