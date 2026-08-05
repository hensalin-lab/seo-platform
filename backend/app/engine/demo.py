"""Demo/sample audit generator. Creates a fully populated synthetic completed
audit so users can explore the platform before running a real crawl."""
import datetime as _dt
import random

from app.models import (
    Audit, AuditScore, Page, Issue, Recommendation,
    KeywordData, ContentData, RoadmapRecord, AuditHistory,
)

_SAMPLE_ISSUES = [
    ("Missing Meta Description", "SEO", "HIGH", "Page has no meta description", "Click-through rate is lower without a snippet description", "Add a 150-160 character meta description"),
    ("Thin Content", "CONTENT", "HIGH", "Page has fewer than 300 words", "Thin pages rarely rank", "Expand to 800+ words"),
    ("Missing Alt Text", "IMAGES", "MEDIUM", "Images missing alt attributes", "Hurts image SEO and accessibility", "Add descriptive alt text"),
    ("Slow LCP", "PERFORMANCE", "MEDIUM", "Largest Contentful Paint exceeds 2.5s", "Slow pages hurt user experience and rankings", "Optimize hero image and server response"),
    ("Duplicate Title", "SEO", "MEDIUM", "Title tag duplicated across pages", "Confuses search engines", "Write unique titles"),
    ("Broken Internal Link", "CRAWLABILITY", "HIGH", "Internal link returns 404", "Wastes crawl budget", "Fix or remove the broken link"),
    ("Missing FAQ Schema", "SCHEMA", "MEDIUM", "No FAQPage JSON-LD detected", "Misses rich result opportunities", "Add FAQ schema"),
    ("No Question Headings", "CONTENT", "LOW", "No question-format headings", "Misses featured snippet opportunities", "Add 2-3 question H2s"),
    ("HTTP not HTTPS", "TECHNICAL", "CRITICAL", "Page served over insecure HTTP", "Google prioritizes HTTPS", "Enable SSL and 301 redirect"),
    ("Long Title Tag", "SEO", "LOW", "Title exceeds 60 characters", "May be truncated in SERPs", "Shorten the title"),
]

_SAMPLE_KEYWORDS = [
    {"keyword": "seo audit tool", "frequency": 12, "opportunity": "HIGH", "action": "Target"},
    {"keyword": "technical seo checklist", "frequency": 9, "opportunity": "HIGH", "action": "Target"},
    {"keyword": "ai seo software", "frequency": 7, "opportunity": "MEDIUM", "action": "Target"},
    {"keyword": "site audit", "frequency": 11, "opportunity": "HIGH", "action": "Target"},
    {"keyword": "website grader", "frequency": 5, "opportunity": "MEDIUM", "action": "Consider"},
    {"keyword": "core web vitals checker", "frequency": 4, "opportunity": "LOW", "action": "Consider"},
]


async def seed_demo_audit(db, user_id: str) -> Audit:
    website_url = "https://example-demo.com"
    audit = Audit(
        website_url=website_url,
        status="COMPLETED",
        progress=100,
        current_step="Demo data ready",
        user_id=user_id,
        completed_at=_dt.datetime.utcnow(),
    )
    db.add(audit)
    await db.flush()
    audit_id = audit.id

    rng = random.Random(42)
    for i in range(8):
        page_title = f"Demo {['Homepage', 'About', 'Pricing', 'Blog', 'Resources', 'Support', 'Features', 'Contact'][i]}"
        wc = rng.randint(150, 1800)
        db.add(Page(
            audit_id=audit_id,
            url=f"{website_url}/{['', 'about', 'pricing', 'blog', 'resources', 'support', 'features', 'contact'][i]}".replace("https://example-demo.com/", "https://example-demo.com/") if i else website_url,
            status_code=200,
            title=page_title,
            meta_description=f"Meta description for {page_title}.",
            h1=page_title,
            content_text=(page_title + " " * 8) * max(wc // 8, 20),
            word_count=wc,
            content_hash=f"hash{i}",
            page_type="HOMEPAGE" if i == 0 else "ARTICLE" if i in (3, 4) else "PAGE",
            signals={"demo": True, "scheme": "https"},
        ))
    db.add(AuditScore(
        audit_id=audit_id, overall_score=72.0, seo_score=68.0, technical_score=75.0,
        aeo_score=70.0, geo_score=66.0, content_score=74.0, ai_visibility_score=71.0,
        signals={"demo": True},
    ))
    for name, category, severity, desc, impact, fix in _SAMPLE_ISSUES:
        db.add(Issue(
            audit_id=audit_id, page_url=f"{website_url}/{['', 'about', 'blog', 'pricing', 'resources', 'features', 'support', 'contact'][rng.randint(0, 7)]}".replace("//", "/"),
            category=category, severity=severity, signal_id=0, signal_name=name,
            description=desc, impact=impact, fix=fix, effort="MEDIUM", pages_affected=rng.randint(1, 4),
        ))
    db.add(Recommendation(
        audit_id=audit_id, page_url=website_url, category="SEO", priority="HIGH",
        issue="Improve on-page relevance", current_problem="Target keywords missing from key elements",
        why_it_matters="On-page signals drive rankings", exact_fix="Optimize title, H1 and content",
        keywords=["seo audit tool"], expected_impact="HIGH", difficulty="EASY",
    ))
    db.add(KeywordData(
        audit_id=audit_id,
        top_keywords=[{**k, "frequency": k["frequency"]} for k in _SAMPLE_KEYWORDS],
        keyword_opportunities=[{**k, "reason": "High relevance to domain"} for k in _SAMPLE_KEYWORDS[:3]],
        keyword_clusters=[{"name": "SEO Tools", "keywords": ["seo audit tool", "site audit", "website grader"]}],
        missing_keywords=["ai seo software", "core web vitals checker"],
        content_gaps=[{"keyword": "technical seo checklist", "opportunity": "HIGH"}],
    ))
    db.add(ContentData(
        audit_id=audit_id,
        content_quality=[{"page_url": website_url, "score": 74, "issues": ["Thin content"]}],
        content_gaps=[{"keyword": "technical seo checklist", "opportunity": "HIGH"}],
        topic_authority={"seo": 0.7, "ai": 0.5},
        content_recommendations=[{"title": "Write: Complete Technical SEO Checklist", "impact": "HIGH"}],
        search_intent=[{"keyword": "seo audit tool", "intent": "commercial"}],
    ))
    db.add(RoadmapRecord(
        audit_id=audit_id,
        immediate=[{"task": "Fix critical meta description gaps", "category": "SEO"}],
        week1=[{"task": "Add FAQ schema to high-value pages", "category": "SCHEMA"}],
        month1=[{"task": "Publish technical SEO checklist", "category": "CONTENT"}],
        month3=[{"task": "Build internal link hub pages", "category": "SEO"}],
    ))
    db.add(AuditHistory(
        audit_id=audit_id, website_url=website_url, overall_score=72.0,
        seo_score=68.0, aeo_score=70.0, geo_score=66.0, ai_score=71.0,
        total_pages=8, total_issues=10, status="COMPLETED", linter_warnings=0,
    ))
    await db.commit()
    await db.refresh(audit)
    return audit
