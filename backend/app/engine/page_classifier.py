"""
Page Type Classifier
Automatically classifies pages into types based on URL patterns, title, content, and structure.
Every page gets classified first, then context-specific rules are applied.
"""
import re
from typing import Optional


PAGE_TYPES = {
    "HOMEPAGE": "Homepage",
    "PRICING": "Pricing",
    "PRODUCT": "Product",
    "SOLUTIONS": "Solutions",
    "SERVICES": "Services",
    "FEATURE": "Feature",
    "BLOG": "Blog",
    "CASE_STUDY": "Case Study",
    "DOCUMENTATION": "Documentation",
    "FAQ": "FAQ",
    "ABOUT": "About",
    "CONTACT": "Contact",
    "DEMO": "Demo",
    "LEGAL": "Legal",
    "LANDING_PAGE": "Landing Page",
    "RESOURCE": "Resource",
    "CAREERS": "Careers",
    "AUTHOR": "Author",
    "TAG": "Tag",
    "ARCHIVE": "Archive",
    "CATEGORY": "Category",
    "SEARCH": "Search",
    "PAGINATION": "Pagination",
    "ERROR_404": "404",
}

URL_PATTERNS = {
    "HOMEPAGE": [r"^https?://[^/]+/?$"],
    "PRICING": [r"/pricing", r"/plans", r"/price", r"/cost", r"/packages"],
    "PRODUCT": [r"/product", r"/app", r"/platform", r"/software", r"/tool"],
    "SOLUTIONS": [r"/solutions?", r"/use-cases?", r"/industries?"],
    "SERVICES": [r"/services?", r"/consulting", r"/agency", r"/support"],
    "FEATURE": [r"/features?", r"/capabilities"],
    "BLOG": [r"/blog", r"/articles?", r"/posts?", r"/news", r"/updates?"],
    "CASE_STUDY": [r"/case-stud", r"/stories?", r"/portfolio", r"/work"],
    "DOCUMENTATION": [r"/docs?/", r"/documentation", r"/api/", r"/reference", r"/manual", r"/guides?"],
    "FAQ": [r"/faq", r"/faqs", r"/help", r"/knowledge-base", r"/kb"],
    "ABOUT": [r"/about", r"/company", r"/team", r"/story", r"/mission", r"/values"],
    "CONTACT": [r"/contact", r"/get-in-touch", r"/reach-us"],
    "DEMO": [r"/demo", r"/trial", r"/request", r"/signup", r"/register", r"/book-a-"],
    "LEGAL": [r"/legal", r"/privacy", r"/terms", r"/cookies?", r"/gdpr", r"/policy", r"/disclaimer", r"/agreement", r"/sla"],
    "LANDING_PAGE": [r"/lp/", r"/campaign/", r"/promo/", r"/special"],
    "RESOURCE": [r"/resources?", r"/guides?", r"/whitepapers?", r"/ebooks?", r"/downloads?", r"/templates?"],
    "CAREERS": [r"/careers?", r"/jobs", r"/hiring", r"/join-us", r"/openings?"],
    "AUTHOR": [r"/author/", r"/authors/", r"/writers?/", r"/team/"],
    "TAG": [r"/tags?/", r"/topics?/", r"/labels?/"],
    "ARCHIVE": [r"/archive", r"/archives"],
    "CATEGORY": [r"/categories/", r"/category/"],
    "SEARCH": [r"/search", r"/suche", r"/recherche"],
    "PAGINATION": [r"/page/\d+", r"/\d+/?$", r"\?page="],
    "ERROR_404": [r"/404", r"/not-found"],
}

TITLE_SIGNALS = {
    "HOMEPAGE": ["home", "welcome", "official site", "main page"],
    "PRICING": ["pricing", "plans", "cost", "price list", "packages"],
    "PRODUCT": ["product", "platform", "software", "features"],
    "SOLUTIONS": ["solutions", "use cases", "industries"],
    "SERVICES": ["services", "consulting", "what we do"],
    "BLOG": ["blog", "article", "post", "news", "latest"],
    "CASE_STUDY": ["case study", "success story", "customer story", "portfolio"],
    "FAQ": ["frequently asked", "faq", "common questions"],
    "ABOUT": ["about us", "our story", "company", "who we are", "team"],
    "CONTACT": ["contact us", "get in touch", "reach us"],
    "DEMO": ["demo", "free trial", "request demo", "book a demo"],
    "LEGAL": ["privacy policy", "terms of service", "cookie policy", "legal"],
    "CAREERS": ["careers", "jobs", "join our team", "work with us"],
}

CONTENT_SIGNALS = {
    "HOMEPAGE": {
        "min_headings": 3,
        "key_elements": ["hero", "cta", "value proposition", "trust signals"],
        "expected_schema": ["Organization", "WebSite"],
        "min_links": 5,
    },
    "PRICING": {
        "key_elements": ["price", "plan", "feature comparison", "cta", "faq"],
        "expected_schema": ["Product", "Offer"],
        "conversion_focus": True,
    },
    "PRODUCT": {
        "key_elements": ["features", "benefits", "screenshot", "demo", "faq", "integrations"],
        "expected_schema": ["SoftwareApplication", "Product"],
    },
    "SERVICES": {
        "key_elements": ["process", "deliverables", "timeline", "industries", "testimonials", "faq"],
        "expected_schema": ["Service", "FAQPage"],
    },
    "BLOG": {
        "key_elements": ["author", "date", "updated date", "reading time", "table of contents", "faq", "related"],
        "expected_schema": ["Article", "BlogPosting", "BreadcrumbList"],
        "min_headings": 3,
    },
    "CASE_STUDY": {
        "key_elements": ["results", "metrics", "testimonial", "timeline", "industry", "roi"],
        "expected_schema": ["Article"],
    },
    "FAQ": {
        "key_elements": ["questions", "answers", "categories"],
        "expected_schema": ["FAQPage"],
    },
    "ABOUT": {
        "key_elements": ["story", "mission", "team", "awards", "certifications", "timeline"],
        "expected_schema": ["Organization", "AboutPage"],
    },
    "CONTACT": {
        "key_elements": ["address", "phone", "email", "map", "hours"],
        "expected_schema": ["LocalBusiness", "ContactPage"],
    },
    "DEMO": {
        "key_elements": ["form", "trust signals", "privacy", "testimonials", "faq"],
        "expected_schema": ["SoftwareApplication"],
        "conversion_focus": True,
    },
    "LEGAL": {
        "key_elements": ["policy", "terms", "contact info", "effective date"],
        "expected_schema": ["WebPage"],
    },
    "DOCUMENTATION": {
        "key_elements": ["code", "examples", "navigation", "search", "versions"],
        "expected_schema": ["TechArticle", "WebPage"],
        "min_headings": 3,
    },
}


class PageClassifier:
    """Classifies a page into one of the defined page types."""

    def classify(self, url: str, title: str = "", meta_description: str = "",
                 content_text: str = "", h1: str = "", word_count: int = 0,
                 schema_types: list = None, images: list = None) -> dict:
        """
        Returns: {
            "page_type": str,          # e.g., "HOMEPAGE"
            "page_type_label": str,    # e.g., "Homepage"
            "confidence": float,       # 0.0 - 1.0
            "signals_used": list,      # which signals matched
            "url_path": str,           # extracted URL path
        }
        """
        url_lower = url.lower().rstrip("/")
        parsed = re.match(r"https?://([^/]+)(/.*)?", url_lower)
        domain = parsed.group(1) if parsed else ""
        path = parsed.group(2) if parsed and parsed.group(2) else "/"

        scores = {}

        # URL pattern matching (strongest signal)
        for ptype, patterns in URL_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, path):
                    scores[ptype] = scores.get(ptype, 0) + 10
                    break

        # Title signals
        title_lower = (title or "").lower()
        h1_lower = (h1 or "").lower()
        combined_text = f"{title_lower} {h1_lower} {(meta_description or '').lower()}"
        for ptype, keywords in TITLE_SIGNALS.items():
            for kw in keywords:
                if kw in combined_text:
                    scores[ptype] = scores.get(ptype, 0) + 5
                    break

        # Content signals
        content_lower = (content_text or "").lower()[:5000]
        if "pricing" in content_lower and ("plan" in content_lower or "month" in content_lower):
            scores["PRICING"] = scores.get("PRICING", 0) + 3
        if "case study" in content_lower or "success story" in content_lower:
            scores["CASE_STUDY"] = scores.get("CASE_STUDY", 0) + 3
        if "frequently asked" in content_lower or "faq" in content_lower:
            scores["FAQ"] = scores.get("FAQ", 0) + 2

        # Schema signals
        if schema_types:
            schema_str = " ".join(str(s) for s in schema_types).lower()
            if "product" in schema_str or "softwareapplication" in schema_str:
                scores["PRODUCT"] = scores.get("PRODUCT", 0) + 4
            if "blogposting" in schema_str or "article" in schema_str:
                scores["BLOG"] = scores.get("BLOG", 0) + 4
            if "faqpage" in schema_str:
                scores["FAQ"] = scores.get("FAQ", 0) + 4
            if "organization" in schema_str and not scores.get("BLOG"):
                scores["HOMEPAGE"] = scores.get("HOMEPAGE", 0) + 3
            if "localbusiness" in schema_str:
                scores["CONTACT"] = scores.get("CONTACT", 0) + 3
            if "service" in schema_str:
                scores["SERVICES"] = scores.get("SERVICES", 0) + 3

        # Homepage special: root domain with no clear path
        if path in ("", "/") or path.count("/") <= 1:
            if not any(t in scores for t in ["BLOG", "PRICING", "PRODUCT", "SERVICES"]):
                scores["HOMEPAGE"] = scores.get("HOMEPAGE", 0) + 8

        # Determine winner
        if not scores:
            # Fallback heuristics
            if word_count > 1500:
                scores["BLOG"] = 1
            elif word_count < 200:
                scores["LANDING_PAGE"] = 1
            else:
                scores["LANDING_PAGE"] = 1

        best_type = max(scores, key=scores.get)
        total_score = sum(scores.values())
        confidence = scores[best_type] / max(total_score, 1) if total_score > 0 else 0.5
        confidence = min(round(confidence, 2), 1.0)

        return {
            "page_type": best_type,
            "page_type_label": PAGE_TYPES.get(best_type, best_type),
            "confidence": confidence,
            "signals_used": [f"{k}:{v}" for k, v in sorted(scores.items(), key=lambda x: -x[1])[:5]],
            "url_path": path,
        }


def get_page_type_rules(page_type: str) -> dict:
    """Returns context-specific rules and checks for a given page type."""
    return CONTENT_SIGNALS.get(page_type, {})


classifier = PageClassifier()
