"""
Context-Aware Analysis Engine
Generates page-specific, context-aware issues and recommendations based on page type.
Never repeats the same generic issue across all pages.
"""
import re
from typing import Optional
from app.engine.page_classifier import classifier, PAGE_TYPES, CONTENT_SIGNALS


def _has_schema(page, schema_type):
    """Check if page has a specific schema type."""
    if not page.schema_markup:
        return False
    for s in page.schema_markup:
        if isinstance(s, dict):
            t = s.get("@type", "").lower()
            if schema_type.lower() in t:
                return True
        elif isinstance(s, str) and schema_type.lower() in s.lower():
            return True
    return False


def _has_element(text, keywords):
    """Check if text contains any of the keywords."""
    if not text:
        return False
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in keywords)


def _heading_text(page):
    """Extract all heading text from page."""
    headings = getattr(page, 'headings', None) or getattr(page, 'headers', None) or []
    if not headings:
        return ""
    return " ".join(
        h.get("text", "") if isinstance(h, dict) else str(h)
        for h in headings
    ).lower()


def _word_count(page):
    return page.word_count or 0


def _images_count(page):
    return len(page.images) if page.images else 0


def _images_without_alt(page):
    if not page.images:
        return 0
    return sum(1 for img in page.images if isinstance(img, dict) and not img.get("alt", "").strip())


def analyze_homepage(page, result):
    """Homepage-specific checks."""
    issues = []
    recs = []
    ht = _heading_text(page)
    wc = _word_count(page)

    # Value proposition
    if not _has_element(ht, ["solution", "platform", "help", "enable", "power", "transform", "data", "ai", "revenue", "grow"]):
        issues.append({
            "severity": "HIGH", "category": "SEO",
            "signal_name": "Missing Value Proposition",
            "description": "Homepage heading does not clearly communicate the value proposition",
            "impact": "Visitors and search engines cannot quickly understand what you offer",
            "fix": "Add a clear H1 that states your primary value proposition (e.g., 'AI-Powered Revenue Intelligence for B2B')"
        })

    # Trust signals
    if not _has_element(page.content_text or "", ["trusted", "customers", "companies", "partner", "client", "logo", "testimonial", "review", "rating"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Trust Signals",
            "description": "Homepage lacks visible trust signals (customer logos, testimonials, reviews)",
            "impact": "Reduces credibility and conversion rate for new visitors",
            "fix": "Add customer logos section, testimonials, or review badges above the fold"
        })

    # Social proof
    if not _has_element(page.content_text or "", ["million", "billion", "thousand", "companies", "users", "customers", "data points", "processed"]):
        issues.append({
            "severity": "MEDIUM", "category": "SEO",
            "signal_name": "Missing Social Proof Numbers",
            "description": "No quantified social proof (e.g., 'Trusted by 500+ companies')",
            "impact": "Missed opportunity to build immediate credibility",
            "fix": "Add metrics like '500+ companies', '$2B revenue managed', '99.9% uptime'"
        })

    # Primary CTA
    if not _has_element(page.content_text or "", ["try", "demo", "start", "free", "get started", "sign up", "request", "contact us", "schedule"]):
        issues.append({
            "severity": "HIGH", "category": "CONTENT",
            "signal_name": "Missing Primary CTA",
            "description": "No clear call-to-action on homepage",
            "impact": "Visitors don't know what to do next, reducing conversions",
            "fix": "Add a prominent CTA button like 'Request Demo' or 'Start Free Trial'"
        })

    # Schema
    if not _has_schema(page, "Organization"):
        issues.append({
            "severity": "MEDIUM", "category": "SEO",
            "signal_name": "Missing Organization Schema",
            "description": "Homepage missing Organization structured data",
            "impact": "Missed Knowledge Graph and rich snippet opportunities",
            "fix": "Add Organization JSON-LD with name, logo, url, social profiles, contact"
        })

    if not _has_schema(page, "WebSite"):
        issues.append({
            "severity": "LOW", "category": "SEO",
            "signal_name": "Missing WebSite Schema",
            "description": "Homepage missing WebSite schema with SearchAction",
            "impact": "Sitelinks searchbox won't appear in Google results",
            "fix": "Add WebSite schema with SearchAction for sitelinks searchbox"
        })

    # Content depth
    if wc < 300:
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Thin Homepage Content",
            "description": f"Homepage has only {wc} words — very thin for a homepage",
            "impact": "Search engines have limited content to understand your site's purpose",
            "fix": "Add 300-500 words including value proposition, features, benefits, and FAQ"
        })

    # Internal links
    internal_count = len(page.links_internal or [])
    if internal_count < 5:
        issues.append({
            "severity": "MEDIUM", "category": "SEO",
            "signal_name": "Few Internal Links from Homepage",
            "description": f"Homepage has only {internal_count} internal links",
            "impact": "Poor link equity distribution; key pages not discovered by crawlers",
            "fix": "Add links to main product pages, blog, about, contact, and key landing pages"
        })

    return issues, recs


def analyze_pricing(page, result):
    """Pricing page specific checks."""
    issues = []
    recs = []
    ct = (page.content_text or "").lower()
    ht = _heading_text(page)

    # Pricing clarity
    if not _has_element(ct, ["$", "€", "£", "price", "per month", "per year", "annual", "monthly", "free", "starter", "enterprise"]):
        issues.append({
            "severity": "CRITICAL", "category": "CONTENT",
            "signal_name": "No Pricing Information",
            "description": "Pricing page does not contain visible pricing information",
            "impact": "Visitors cannot evaluate cost, leading to high bounce rate",
            "fix": "Add clear pricing tiers with monthly/annual options and feature comparison"
        })

    # Feature comparison
    if not _has_element(ct, ["feature", "comparison", "includes", "plan", "tier", "difference"]):
        issues.append({
            "severity": "HIGH", "category": "CONTENT",
            "signal_name": "Missing Feature Comparison",
            "description": "No feature comparison table between pricing tiers",
            "impact": "Visitors cannot easily compare plans, reducing informed decisions",
            "fix": "Add a feature comparison matrix showing what each tier includes"
        })

    # Enterprise CTA
    if not _has_element(ct, ["enterprise", "custom", "contact sales", "talk to", "schedule", "demo"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Enterprise CTA",
            "description": "No enterprise/custom pricing option or 'Contact Sales' CTA",
            "impact": "Losing high-value enterprise leads who need custom pricing",
            "fix": "Add an 'Enterprise' tier with 'Contact Sales' CTA for custom pricing"
        })

    # Pricing FAQ
    if not _has_element(ct, ["question", "answer", "faq", "frequently"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Pricing FAQ",
            "description": "No FAQ section addressing common pricing questions",
            "impact": "Visitors leave with unanswered questions about billing, trials, refunds",
            "fix": "Add FAQ section covering billing cycles, trial period, refund policy, upgrades"
        })

    # Pricing schema
    if not _has_schema(page, "Product") and not _has_schema(page, "Offer"):
        issues.append({
            "severity": "MEDIUM", "category": "SEO",
            "signal_name": "Missing Pricing Schema",
            "description": "Pricing page missing Product/Offer structured data",
            "impact": "Price information won't appear in rich results",
            "fix": "Add Product schema with offers, price, priceCurrency, availability"
        })

    # Trust badges
    if not _has_element(ct, ["secure", "money back", "guarantee", "ssl", "trusted", "certified", "compliant"]):
        issues.append({
            "severity": "LOW", "category": "CONTENT",
            "signal_name": "Missing Trust Badges",
            "description": "No trust badges (security, money-back guarantee, compliance)",
            "impact": "Reduces buyer confidence, especially for annual/enterprise plans",
            "fix": "Add security badges, money-back guarantee, compliance certifications"
        })

    return issues, recs


def analyze_product(page, result):
    """Product page specific checks."""
    issues = []
    recs = []
    ct = (page.content_text or "").lower()
    wc = _word_count(page)

    # Features explanation
    if not _has_element(ct, ["feature", "capability", "what it does", "how it works", "benefit"]):
        issues.append({
            "severity": "HIGH", "category": "CONTENT",
            "signal_name": "Missing Feature Explanation",
            "description": "Product page does not clearly explain features or capabilities",
            "impact": "Visitors don't understand what the product does",
            "fix": "Add detailed feature sections with explanations, use cases, and benefits"
        })

    # Use cases
    if not _has_element(ct, ["use case", "used for", "ideal for", "perfect for", "who uses"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Use Cases",
            "description": "No use case scenarios shown on product page",
            "impact": "Visitors can't see how the product applies to their situation",
            "fix": "Add 3-5 use case sections showing different ways the product is used"
        })

    # Demo/CTA
    if not _has_element(ct, ["demo", "trial", "try", "start", "free", "get started", "request", "schedule"]):
        issues.append({
            "severity": "HIGH", "category": "CONTENT",
            "signal_name": "Missing Demo CTA",
            "description": "No demo or trial call-to-action on product page",
            "impact": "Visitors interested in the product have no clear next step",
            "fix": "Add prominent 'Request Demo' or 'Start Free Trial' CTA"
        })

    # FAQ
    if not _has_element(ct, ["question", "faq", "frequently asked"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Product FAQ",
            "description": "No FAQ section on product page",
            "impact": "Common questions go unanswered, increasing support burden",
            "fix": "Add FAQ covering pricing, integrations, security, getting started"
        })

    # Schema
    if not _has_schema(page, "SoftwareApplication") and not _has_schema(page, "Product"):
        issues.append({
            "severity": "MEDIUM", "category": "SEO",
            "signal_name": "Missing Product Schema",
            "description": "No SoftwareApplication or Product structured data",
            "impact": "Missing rich results opportunities for product features",
            "fix": "Add SoftwareApplication or Product JSON-LD with features, offers, aggregateRating"
        })

    # Content depth
    if wc < 500:
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Thin Product Content",
            "description": f"Product page has only {wc} words — insufficient for ranking",
            "impact": "Thin content pages rank poorly and provide limited value",
            "fix": "Expand to 800+ words with features, benefits, use cases, integrations, FAQ"
        })

    return issues, recs


def analyze_blog(page, result):
    """Blog post specific checks."""
    issues = []
    recs = []
    ct = (page.content_text or "").lower()
    ht = _heading_text(page)
    wc = _word_count(page)

    # Author
    if not _has_element(ct, ["author", "written by", "by ", "posted by", "published by"]):
        issues.append({
            "severity": "HIGH", "category": "CONTENT",
            "signal_name": "Missing Author Attribution",
            "description": "Blog post has no visible author name or attribution",
            "impact": "Hurts E-E-A-T signals; Google favors content with identifiable expert authors",
            "fix": "Add author name, bio, photo, and link to author page with credentials"
        })

    # Author bio
    if not _has_element(ct, ["bio", "background", "experience", "years", "expert"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Author Bio",
            "description": "No author biography or credentials shown",
            "impact": "Weakens E-E-A-T; readers can't verify author expertise",
            "fix": "Add author bio with credentials, experience, and links to social profiles"
        })

    # Published date
    if not _has_element(ct, ["published", "posted on", "date:", "updated", "last modified"]):
        issues.append({
            "severity": "MEDIUM", "category": "SEO",
            "signal_name": "Missing Publication Date",
            "description": "No visible published or last updated date",
            "impact": "Content freshness signals are weakened; users can't gauge recency",
            "fix": "Add visible 'Published: [date]' and 'Last Updated: [date]' above the article"
        })

    # Reading time
    if not _has_element(ct, ["min read", "minute read", "reading time", "read time"]):
        issues.append({
            "severity": "LOW", "category": "CONTENT",
            "signal_name": "Missing Reading Time",
            "description": "No estimated reading time shown",
            "impact": "Minor UX improvement missed; readers like knowing time commitment",
            "fix": "Add estimated reading time (e.g., '8 min read') near the title"
        })

    # Table of contents
    if wc > 1500 and not _has_element(ct, ["table of contents", "in this article", "what you'll learn"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Table of Contents",
            "description": "Long article without a table of contents",
            "impact": "Readers can't navigate to relevant sections; higher bounce rate",
            "fix": "Add a clickable table of contents at the top of articles over 1500 words"
        })

    # FAQ
    if not _has_element(ct, ["frequently asked", "faq", "common questions"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Blog FAQ",
            "description": "Blog post has no FAQ section",
            "impact": "Missing FAQ rich results; not optimized for 'People Also Ask'",
            "fix": "Add 3-5 FAQ pairs related to the blog topic with FAQPage schema"
        })

    # Article schema
    if not _has_schema(page, "Article") and not _has_schema(page, "BlogPosting"):
        issues.append({
            "severity": "HIGH", "category": "SEO",
            "signal_name": "Missing Article Schema",
            "description": "Blog post missing Article or BlogPosting structured data",
            "impact": "Won't appear in article rich results, Google Discover, or news carousels",
            "fix": "Add BlogPosting JSON-LD with headline, author, datePublished, dateModified, image"
        })

    # Breadcrumb
    if not _has_schema(page, "BreadcrumbList"):
        issues.append({
            "severity": "MEDIUM", "category": "SEO",
            "signal_name": "Missing Breadcrumb Schema",
            "description": "No BreadcrumbList structured data",
            "impact": "Breadcrumb trail won't show in search results",
            "fix": "Add BreadcrumbList JSON-LD: Home > Blog > [Category] > [Article Title]"
        })

    # Content depth
    if wc < 800:
        issues.append({
            "severity": "HIGH", "category": "CONTENT",
            "signal_name": "Thin Blog Content",
            "description": f"Blog post has only {wc} words — too thin to rank",
            "impact": "Thin content rarely ranks; doesn't provide enough value for featured snippets",
            "fix": "Expand to 1500+ words with comprehensive coverage, examples, and data"
        })

    # Related articles
    if not _has_element(ct, ["related", "you might also like", "more from", "next article"]):
        issues.append({
            "severity": "LOW", "category": "SEO",
            "signal_name": "Missing Related Articles",
            "description": "No related articles section at the end of the post",
            "impact": "Missed internal linking opportunity; readers leave after one article",
            "fix": "Add 'Related Articles' section with 3-5 relevant posts to increase session depth"
        })

    return issues, recs


def analyze_about(page, result):
    """About page specific checks."""
    issues = []
    recs = []
    ct = (page.content_text or "").lower()
    wc = _word_count(page)

    if not _has_element(ct, ["mission", "vision", "values", "purpose", "believe"]):
        issues.append({
            "severity": "HIGH", "category": "CONTENT",
            "signal_name": "Missing Mission/Vision",
            "description": "About page doesn't state company mission or vision",
            "impact": "Visitors can't understand company purpose; weakens brand narrative",
            "fix": "Add clear mission statement, vision, and core values section"
        })

    if not _has_element(ct, ["team", "leader", "founder", "ceo", "people", "our people"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Team/Leadership",
            "description": "No team or leadership section on About page",
            "impact": "Reduces trust; visitors want to know who's behind the company",
            "fix": "Add team section with photos, names, titles, and brief bios"
        })

    if not _has_element(ct, ["founded", "started", "began", "established", "history", "journey", "timeline"]):
        issues.append({
            "severity": "LOW", "category": "CONTENT",
            "signal_name": "Missing Company Story",
            "description": "No founding story or company journey",
            "impact": "Missed opportunity to build emotional connection with visitors",
            "fix": "Add founding story, key milestones, and company timeline"
        })

    if not _has_schema(page, "Organization"):
        issues.append({
            "severity": "MEDIUM", "category": "SEO",
            "signal_name": "Missing Organization Schema",
            "description": "About page missing Organization structured data",
            "impact": "Knowledge Graph opportunities missed",
            "fix": "Add Organization JSON-LD with foundingDate, founder, numberOfEmployees"
        })

    return issues, recs


def analyze_contact(page, result):
    """Contact page specific checks."""
    issues = []
    recs = []
    ct = (page.content_text or "").lower()

    if not _has_element(ct, ["phone", "tel:", "call us", "telephone"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Phone Number",
            "description": "Contact page doesn't show a phone number",
            "impact": "Enterprise customers prefer phone contact; missing trust signal",
            "fix": "Add phone number with tel: link and business hours"
        })

    if not _has_element(ct, ["address", "street", "city", "zip", "postal", "location"]):
        issues.append({
            "severity": "MEDIUM", "category": "SEO",
            "signal_name": "Missing Physical Address",
            "description": "No physical address on contact page",
            "impact": "Missed local SEO signals; reduces trust for B2B buyers",
            "fix": "Add full business address with Google Maps embed"
        })

    if not _has_element(ct, ["hour", "open", "am", "pm", "monday", "available"]):
        issues.append({
            "severity": "LOW", "category": "CONTENT",
            "signal_name": "Missing Business Hours",
            "description": "No business hours shown on contact page",
            "impact": "Visitors don't know when to expect a response",
            "fix": "Add business hours with timezone (e.g., 'Mon-Fri 9am-6pm EST')"
        })

    if not _has_schema(page, "LocalBusiness") and not _has_schema(page, "ContactPage"):
        issues.append({
            "severity": "MEDIUM", "category": "SEO",
            "signal_name": "Missing LocalBusiness Schema",
            "description": "Contact page missing LocalBusiness or ContactPage structured data",
            "impact": "Local search visibility and Knowledge Panel won't show contact info",
            "fix": "Add LocalBusiness JSON-LD with address, phone, openingHours, geo"
        })

    return issues, recs


def analyze_demo(page, result):
    """Demo/Trial page specific checks."""
    issues = []
    recs = []
    ct = (page.content_text or "").lower()

    if not _has_element(ct, ["form", "name", "email", "company", "fill", "submit"]):
        issues.append({
            "severity": "HIGH", "category": "CONTENT",
            "signal_name": "Missing Demo Form",
            "description": "Demo page has no visible lead capture form",
            "impact": "Cannot capture leads; visitors leave without converting",
            "fix": "Add a short form (3-5 fields) with clear CTA above the fold"
        })

    if not _has_element(ct, ["privacy", "data", "secure", "gdpr", "protected", "consent"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Privacy Assurance",
            "description": "No privacy or data protection mention on demo page",
            "impact": "Visitors hesitate to submit personal information",
            "fix": "Add privacy notice, security badges, and GDPR compliance note near form"
        })

    if not _has_element(ct, ["testimonial", "review", "case study", "trusted", "customer"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Social Proof on Demo Page",
            "description": "No customer testimonials or social proof near conversion form",
            "impact": "Lower conversion rates due to lack of trust signals",
            "fix": "Add 2-3 customer testimonials or logos near the demo form"
        })

    if not _has_element(ct, ["response", "within", "business day", "24 hours", "follow up"]):
        issues.append({
            "severity": "LOW", "category": "CONTENT",
            "signal_name": "Missing Response Expectation",
            "description": "No information about when users will hear back",
            "impact": "Visitors don't know response timeline, reducing form fills",
            "fix": "Add 'We'll respond within 24 hours' near the form"
        })

    return issues, recs


def analyze_services(page, result):
    """Service page specific checks."""
    issues = []
    recs = []
    ct = (page.content_text or "").lower()
    wc = _word_count(page)

    if not _has_element(ct, ["process", "how we", "step", "approach", "methodology", "workflow"]):
        issues.append({
            "severity": "HIGH", "category": "CONTENT",
            "signal_name": "Missing Process Description",
            "description": "Service page doesn't explain the engagement process",
            "impact": "Potential clients don't know what to expect",
            "fix": "Add step-by-step process: consultation → strategy → execution → reporting"
        })

    if not _has_element(ct, ["deliverable", "output", "result", "what you get", "included"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Deliverables",
            "description": "No clear deliverables listed for the service",
            "impact": "Clients can't evaluate what they're paying for",
            "fix": "List specific deliverables: reports, audits, dashboards, content, etc."
        })

    if not _has_element(ct, ["testimonial", "case study", "result", "roi", "success", "client"]):
        issues.append({
            "severity": "HIGH", "category": "CONTENT",
            "signal_name": "Missing Customer Success Stories",
            "description": "No testimonials, case studies, or results shown",
            "impact": "Visitors can't validate service effectiveness",
            "fix": "Add customer quotes, metrics, and links to full case studies"
        })

    if not _has_element(ct, ["faq", "question", "common", "what is"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Service FAQ",
            "description": "No FAQ section on service page",
            "impact": "Common questions require contacting sales instead of self-service",
            "fix": "Add 5-8 FAQ pairs with FAQPage schema"
        })

    if not _has_schema(page, "Service"):
        issues.append({
            "severity": "MEDIUM", "category": "SEO",
            "signal_name": "Missing Service Schema",
            "description": "No Service structured data",
            "impact": "Service won't appear in service-related rich results",
            "fix": "Add Service JSON-LD with provider, areaServed, serviceType"
        })

    return issues, recs


def analyze_faq(page, result):
    """FAQ page specific checks."""
    issues = []
    recs = []
    ct = (page.content_text or "").lower()

    if not _has_element(ct, ["question", "?"]):
        issues.append({
            "severity": "HIGH", "category": "CONTENT",
            "signal_name": "No Questions Found",
            "description": "FAQ page doesn't contain any question marks",
            "impact": "Page may not actually be an FAQ page",
            "fix": "Add structured Q&A pairs with clear question and answer format"
        })

    if not _has_schema(page, "FAQPage"):
        issues.append({
            "severity": "CRITICAL", "category": "SEO",
            "signal_name": "Missing FAQPage Schema",
            "description": "FAQ page missing FAQPage structured data",
            "impact": "FAQ rich results won't appear in Google; major missed opportunity",
            "fix": "Add FAQPage JSON-LD with mainEntity containing Question/Answer pairs"
        })

    question_count = ct.count("?")
    if question_count < 5:
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Few FAQ Questions",
            "description": f"Only {question_count} questions found — aim for at least 10",
            "impact": "Limited coverage of user questions reduces search visibility",
            "fix": "Add more Q&A pairs covering common customer questions"
        })

    return issues, recs


def analyze_legal(page, result):
    """Legal page specific checks."""
    issues = []
    recs = []
    ct = (page.content_text or "").lower()

    if not _has_element(ct, ["effective", "last updated", "date", "2024", "2025", "2026"]):
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Missing Effective Date",
            "description": "Legal page doesn't show when it was last updated",
            "impact": "Users can't tell if policy is current; compliance risk",
            "fix": "Add 'Effective Date: [date]' and 'Last Updated: [date]' at top"
        })

    if not _has_element(ct, ["contact", "email", "question", "reach", "inquiry"]):
        issues.append({
            "severity": "LOW", "category": "CONTENT",
            "signal_name": "Missing Contact for Questions",
            "description": "No contact information for legal questions",
            "impact": "Users with privacy/legal questions have no way to reach you",
            "fix": "Add contact email or form for legal inquiries at bottom of page"
        })

    return issues, recs


# Map page types to analyzer functions
PAGE_TYPE_ANALYZERS = {
    "HOMEPAGE": analyze_homepage,
    "PRICING": analyze_pricing,
    "PRODUCT": analyze_product,
    "BLOG": analyze_blog,
    "CASE_STUDY": analyze_blog,  # Similar to blog
    "ABOUT": analyze_about,
    "CONTACT": analyze_contact,
    "DEMO": analyze_demo,
    "SERVICES": analyze_services,
    "FAQ": analyze_faq,
    "LEGAL": analyze_legal,
}


def run_context_aware_analysis(page, result, page_type: str):
    """
    Run type-specific analysis on a page.
    Returns (issues, recommendations) for that specific page type.
    """
    analyzer_fn = PAGE_TYPE_ANALYZERS.get(page_type)
    if analyzer_fn:
        return analyzer_fn(page, result)

    # Default: generic checks for unclassified pages
    issues = []
    recs = []
    wc = _word_count(page)
    ct = (page.content_text or "").lower()

    if wc < 300:
        issues.append({
            "severity": "MEDIUM", "category": "CONTENT",
            "signal_name": "Thin Content",
            "description": f"Page has only {wc} words",
            "impact": "Thin pages rarely rank and provide limited value to users",
            "fix": "Expand content to 800+ words with comprehensive, useful information"
        })

    if not _has_element(ct, ["faq", "question", "answer"]):
        issues.append({
            "severity": "LOW", "category": "CONTENT",
            "signal_name": "Missing FAQ",
            "description": "No FAQ section on page",
            "impact": "Missed opportunity for FAQ rich results and user engagement",
            "fix": "Add 3-5 relevant FAQ pairs with FAQPage schema"
        })

    return issues, recs
