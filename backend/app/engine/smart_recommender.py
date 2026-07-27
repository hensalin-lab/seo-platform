"""
Smart Recommendation Engine
Produces page-specific, content-aware recommendations with:
- Current Value → Recommended Value
- SEO Impact, Business Impact, Priority, Difficulty, Estimated Time
- Google Guideline reference
- Implementation Example
Never repeats the same recommendation across pages.
Every recommendation inspects actual HTML and page content.
"""
import re
import json
import logging
from collections import Counter

logger = logging.getLogger(__name__)

# Google guideline references
GOOGLE_GUIDELINES = {
    "title": "Google Search Central: Title tags — Create unique, descriptive titles for each page (50-60 chars). Include primary keyword near the beginning.",
    "meta": "Google Search Central: Meta descriptions — Write compelling 150-160 char descriptions. Include target keyword, value proposition, and CTA.",
    "h1": "Google Search Central: Headings — Use headings to introduce page content. One H1 per page with primary keyword.",
    "content": "Google Search Central: Helpful Content System — Create people-first content. Demonstrate E-E-A-T. Provide comprehensive coverage.",
    "images": "Google Search Central: Images — Use descriptive alt text. Optimize file size. Use descriptive filenames. Implement lazy loading.",
    "links": "Google Search Central: Links — Use descriptive anchor text. Link to relevant internal and external resources.",
    "schema": "Google Search Central: Structured Data — Implement JSON-LD. Use schema.org vocabulary. Match schema to visible content.",
    "mobile": "Google Search Central: Mobile-First — Design for mobile first. Ensure content is equivalent across devices.",
    "speed": "Google Search Central: Page Speed — Optimize Core Web Vitals. Target LCP < 2.5s, INP < 200ms, CLS < 0.1.",
    "eeat": "Google Search Central: E-E-A-T — Demonstrate Experience, Expertise, Authoritativeness, Trustworthiness.",
    "ai_overview": "Google Search Central: AI Overviews — Structure content for direct answers. Use clear definitions, lists, and tables.",
    "featured_snippet": "Google Search Central: Featured Snippets — Provide concise, direct answers (40-60 words) to common questions.",
    "canonical": "Google Search Central: Canonical URLs — Use canonical tags to prevent duplicate content indexing.",
    "internal_links": "Google Search Central: Internal Links — Use descriptive anchor text. Link to relevant pages. Maintain shallow crawl depth.",
}

# Page-type specific word count targets
PAGE_TYPE_WORD_COUNTS = {
    "HOMEPAGE": {"min": 300, "ideal": 800, "max": 2000},
    "BLOG": {"min": 1200, "ideal": 2000, "max": 5000},
    "PRODUCT": {"min": 500, "ideal": 1000, "max": 3000},
    "SERVICES": {"min": 600, "ideal": 1200, "max": 3000},
    "PRICING": {"min": 300, "ideal": 600, "max": 1500},
    "ABOUT": {"min": 400, "ideal": 800, "max": 2000},
    "CONTACT": {"min": 100, "ideal": 300, "max": 800},
    "FAQ": {"min": 500, "ideal": 1500, "max": 4000},
    "LEGAL": {"min": 500, "ideal": 1500, "max": 5000},
    "RESOURCE": {"min": 800, "ideal": 1800, "max": 5000},
    "SOLUTIONS": {"min": 600, "ideal": 1200, "max": 3000},
    "DEMO": {"min": 300, "ideal": 600, "max": 1500},
}

# Page-type specific heading targets
PAGE_TYPE_HEADINGS = {
    "BLOG": {"h1": 1, "h2_min": 3, "h3_min": 1},
    "PRODUCT": {"h1": 1, "h2_min": 2, "h3_min": 1},
    "SERVICES": {"h1": 1, "h2_min": 3, "h3_min": 0},
    "FAQ": {"h1": 1, "h2_min": 5, "h3_min": 0},
    "HOMEPAGE": {"h1": 1, "h2_min": 2, "h3_min": 0},
    "ABOUT": {"h1": 1, "h2_min": 2, "h3_min": 0},
    "RESOURCE": {"h1": 1, "h2_min": 3, "h3_min": 1},
}

# Content quality signals
TRUST_SIGNALS = [
    "testimonial", "case study", "review", "rating", "certified", "award",
    "trusted by", "clients include", "partner", "security", "privacy",
    "guarantee", "money back", "satisfaction", "iso", "soc2", "gdpr",
    "compliance", "accredited", "licensed", "insured", "bonded",
]

STATISTICS_PATTERNS = [
    r'\d+%', r'\d+x', r'\$\d+', r'\d+ million', r'\d+ billion',
    r'increased by \d+', r'reduced by \d+', r'saved \d+',
    r'\d+ customers', r'\d+ users', r'\d+ companies',
    r'according to', r'study shows', r'research indicates',
    r'data from', r'source:', r'based on \d+',
]

ENTITY_PATTERNS = [
    r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',  # Proper nouns
    r'\b(Google|Bing|Amazon|Microsoft|Apple|Facebook|Meta)\b',
    r'\b(CEO|CTO|CFO|VP|Director|Manager)\b',
]


class SmartRecommendationEngine:
    def __init__(self):
        self.recommendations_generated = set()

    def analyze_page(self, page, all_pages=None, page_type="UNKNOWN"):
        recs = []
        page_url = page.url

        recs.extend(self._analyze_title(page, page_type))
        recs.extend(self._analyze_meta_description(page, page_type))
        recs.extend(self._analyze_headings(page, page_type))
        recs.extend(self._analyze_content_depth(page, page_type))
        recs.extend(self._analyze_images(page, page_type))
        recs.extend(self._analyze_internal_links(page, all_pages, page_type))
        recs.extend(self._analyze_external_links(page, page_type))
        recs.extend(self._analyze_schema(page, page_type))
        recs.extend(self._analyze_eeat(page, page_type))
        recs.extend(self._analyze_trust_signals(page, page_type))
        recs.extend(self._analyze_content_structure(page, page_type))
        recs.extend(self._analyze_entities(page, page_type))
        recs.extend(self._analyze_cta(page, page_type))
        recs.extend(self._analyze_content_freshness(page, page_type))

        unique_recs = self._deduplicate(recs)

        for rec in unique_recs:
            rec["page_url"] = page_url
            rec["page_type"] = page_type

        return unique_recs

    def _analyze_title(self, page, page_type):
        recs = []
        title = page.title or ""
        title_len = len(title)

        if not title:
            page_type_lower = page_type.lower().replace("_", " ")
            recs.append({
                "category": "SEO",
                "area": "Title Tag",
                "current_value": "Missing",
                "recommended_value": self._suggest_title(page, page_type),
                "reason": f"This {page_type_lower} page has no title tag. Title is the #1 on-page ranking factor.",
                "seo_impact": "CRITICAL",
                "business_impact": "HIGH — Missing title means Google auto-generates one, losing control of SERP presentation",
                "priority": "CRITICAL",
                "difficulty": "EASY",
                "estimated_time": "5 minutes",
                "google_guideline": GOOGLE_GUIDELINES["title"],
                "implementation_example": f'<head>\n  <title>{self._suggest_title(page, page_type)}</title>\n</head>',
            })
        else:
            if title_len < 30:
                suggested = self._suggest_title(page, page_type)
                recs.append({
                    "category": "SEO",
                    "area": "Title Tag — Too Short",
                    "current_value": f'"{title}" ({title_len} characters)',
                    "recommended_value": f'"{suggested}" ({len(suggested)} characters)',
                    "reason": f"Title is only {title_len} chars. Optimal is 50-60 characters. Short titles miss keyword opportunities and waste SERP real estate.",
                    "seo_impact": "HIGH",
                    "business_impact": "MEDIUM — Short titles get lower CTR in search results",
                    "priority": "HIGH",
                    "difficulty": "EASY",
                    "estimated_time": "5 minutes",
                    "google_guideline": GOOGLE_GUIDELINES["title"],
                    "implementation_example": f'Current:  <title>{title}</title>\nSuggested: <title>{suggested}</title>',
                })

            if title_len > 65:
                recs.append({
                    "category": "SEO",
                    "area": "Title Tag — Too Long",
                    "current_value": f'"{title}" ({title_len} characters)',
                    "recommended_value": f'"{title[:57]}..." (55-60 characters)',
                    "reason": f"Title is {title_len} chars. Google truncates at ~60 chars (or ~580px desktop). Important words at the end will be hidden.",
                    "seo_impact": "MEDIUM",
                    "business_impact": "MEDIUM — Truncated titles lose the CTA or brand name in SERP",
                    "priority": "MEDIUM",
                    "difficulty": "EASY",
                    "estimated_time": "5 minutes",
                    "google_guideline": GOOGLE_GUIDELINES["title"],
                    "implementation_example": f'Current:  <title>{title}</title>\nSuggested: <title>{title[:57]}</title>',
                })

            if all_pages:
                dup_count = sum(1 for p in all_pages if p.title == title and p.url != page.url)
                if dup_count > 0:
                    recs.append({
                        "category": "SEO",
                        "area": "Title Tag — Duplicate",
                        "current_value": f'"{title}" (appears on {dup_count + 1} pages)',
                        "recommended_value": f'Unique title for this page (e.g., "{self._suggest_title(page, page_type)}")',
                        "reason": f"Same title found on {dup_count} other pages. Google may ignore duplicate titles or show the wrong page for a query.",
                        "seo_impact": "HIGH",
                        "business_impact": "HIGH — Duplicate titles cause keyword cannibalization",
                        "priority": "HIGH",
                        "difficulty": "EASY",
                        "estimated_time": "10 minutes",
                        "google_guideline": GOOGLE_GUIDELINES["title"],
                        "implementation_example": f'Write a unique title incorporating the page-specific primary keyword and brand.',
                    })

        return recs

    def _analyze_meta_description(self, page, page_type):
        recs = []
        desc = page.meta_description or ""
        desc_len = len(desc)

        if not desc:
            suggested = self._suggest_meta_description(page, page_type)
            recs.append({
                "category": "SEO",
                "area": "Meta Description",
                "current_value": "Missing",
                "recommended_value": f'"{suggested}" ({len(suggested)} characters)',
                "reason": "No meta description found. Google auto-generates snippets, losing your control over CTR. Meta descriptions are your SERP sales pitch.",
                "seo_impact": "HIGH",
                "business_impact": "HIGH — Missing description means Google writes one, often poorly. Can reduce CTR by 5-10%.",
                "priority": "HIGH",
                "difficulty": "EASY",
                "estimated_time": "10 minutes",
                "google_guideline": GOOGLE_GUIDELINES["meta"],
                "implementation_example": f'<meta name="description" content="{suggested}" />',
            })
        else:
            if desc_len < 120:
                suggested = self._suggest_meta_description(page, page_type)
                recs.append({
                    "category": "SEO",
                    "area": "Meta Description — Too Short",
                    "current_value": f'"{desc}" ({desc_len} characters)',
                    "recommended_value": f'"{suggested}" ({len(suggested)} characters)',
                    "reason": f"Description is only {desc_len} chars. Optimal is 150-160 characters. Short descriptions miss SERP real estate and CTR opportunity.",
                    "seo_impact": "MEDIUM",
                    "business_impact": "MEDIUM — Underutilized SERP snippet reduces click-through rate",
                    "priority": "MEDIUM",
                    "difficulty": "EASY",
                    "estimated_time": "10 minutes",
                    "google_guideline": GOOGLE_GUIDELINES["meta"],
                    "implementation_example": f'Expand to include: primary keyword, value proposition, and call-to-action within 150-160 characters.',
                })

            if desc_len > 165:
                recs.append({
                    "category": "SEO",
                    "area": "Meta Description — Too Long",
                    "current_value": f'"{desc[:60]}..." ({desc_len} characters)',
                    "recommended_value": f'Condensed version (150-160 characters)',
                    "reason": f"Description is {desc_len} chars. Google truncates at ~155-160 characters. Key info at the end will be hidden.",
                    "seo_impact": "LOW",
                    "business_impact": "LOW — Truncation cuts off CTA or brand name",
                    "priority": "LOW",
                    "difficulty": "EASY",
                    "estimated_time": "5 minutes",
                    "google_guideline": GOOGLE_GUIDELINES["meta"],
                    "implementation_example": f'Trim to 150-160 characters. Keep the most compelling sentence and CTA.',
                })

        return recs

    def _analyze_headings(self, page, page_type):
        recs = []
        headings = page.headings or []
        h1s = [h for h in headings if h.get("level") == "H1"]
        h2s = [h for h in headings if h.get("level") == "H2"]
        h3s = [h for h in headings if h.get("level") == "H3"]

        targets = PAGE_TYPE_HEADINGS.get(page_type, PAGE_TYPE_HEADINGS.get("BLOG", {}))

        if len(h1s) == 0:
            suggested_h1 = self._suggest_h1(page, page_type)
            recs.append({
                "category": "SEO",
                "area": "H1 Tag — Missing",
                "current_value": "No H1 tag found",
                "recommended_value": f'"{suggested_h1}"',
                "reason": "H1 is the primary on-page signal for topic relevance. Google uses it to understand what the page is about.",
                "seo_impact": "HIGH",
                "business_impact": "HIGH — Without H1, page topic is ambiguous to both users and crawlers",
                "priority": "HIGH",
                "difficulty": "EASY",
                "estimated_time": "5 minutes",
                "google_guideline": GOOGLE_GUIDELINES["h1"],
                "implementation_example": f'<h1>{suggested_h1}</h1>',
            })
        elif len(h1s) > 1:
            h1_texts = [h.get("text", "") for h in h1s]
            recs.append({
                "category": "SEO",
                "area": "H1 Tag — Multiple",
                "current_value": f'{len(h1s)} H1 tags: {", ".join(h1_texts[:3])}',
                "recommended_value": "Single H1 tag with primary keyword",
                "reason": f"Found {len(h1s)} H1 tags. Google expects one H1 per page. Multiple H1s dilute topic focus.",
                "seo_impact": "MEDIUM",
                "business_impact": "MEDIUM — Multiple H1s confuse page topic signal",
                "priority": "MEDIUM",
                "difficulty": "EASY",
                "estimated_time": "10 minutes",
                "google_guideline": GOOGLE_GUIDELINES["h1"],
                "implementation_example": f'Convert secondary H1s to H2:\n{"\\n".join(f"<h2>{t}</h2>" for t in h1_texts[1:3])}',
            })

        if len(h2s) < targets.get("h2_min", 2) and page.word_count and page.word_count > 300:
            recs.append({
                "category": "SEO",
                "area": "H2 Subheadings — Insufficient",
                "current_value": f'{len(h2s)} H2 tags (page type "{page_type}" needs {targets.get("h2_min", 2)}+)',
                "recommended_value": f'{targets.get("h2_min", 2)}+ H2 subheadings introducing key sections',
                "reason": f"Only {len(h2s)} H2s on a {page.word_count}-word page. H2s break content into scannable sections and provide keyword targeting opportunities.",
                "seo_impact": "MEDIUM",
                "business_impact": "MEDIUM — Poor heading structure reduces readability and dwell time",
                "priority": "MEDIUM",
                "difficulty": "EASY",
                "estimated_time": "15 minutes",
                "google_guideline": GOOGLE_GUIDELINES["h1"],
                "implementation_example": "Add H2s for each major section: Features, Benefits, How It Works, Pricing, FAQ.",
            })

        h1_text = h1s[0].get("text", "") if h1s else ""
        title_text = page.title or ""
        if h1_text and title_text and h1_text.lower().strip() != title_text.lower().strip():
            h1_words = set(h1_text.lower().split())
            title_words = set(title_text.lower().split())
            overlap = h1_words & title_words
            if len(overlap) < 2 and len(h1_words) > 0 and len(title_words) > 0:
                recs.append({
                    "category": "SEO",
                    "area": "Title-H1 Alignment",
                    "current_value": f'Title: "{title_text}" | H1: "{h1_text}"',
                    "recommended_value": "Title and H1 should share primary keyword but be slightly different",
                    "reason": f"Title and H1 share only {len(overlap)} words. They should align on the primary keyword while offering slightly different angles.",
                    "seo_impact": "MEDIUM",
                    "business_impact": "LOW — Misalignment sends mixed signals about page topic",
                    "priority": "LOW",
                    "difficulty": "EASY",
                    "estimated_time": "5 minutes",
                    "google_guideline": GOOGLE_GUIDELINES["h1"],
                    "implementation_example": f'Align H1 with title keyword:\nTitle: {title_text}\nH1: {self._suggest_h1(page, page_type)}',
                })

        return recs

    def _analyze_content_depth(self, page, page_type):
        recs = []
        wc = page.word_count or 0
        targets = PAGE_TYPE_WORD_COUNTS.get(page_type, PAGE_TYPE_WORD_COUNTS.get("BLOG", {}))

        if wc == 0:
            return recs

        if wc < targets["min"]:
            gap = targets["ideal"] - wc
            recs.append({
                "category": "CONTENT",
                "area": "Content Depth — Insufficient",
                "current_value": f'{wc} words (page type "{page_type}" needs {targets["min"]}-{targets["ideal"]} words)',
                "recommended_value": f'{targets["ideal"]} words (add ~{gap} words)',
                "reason": f"Content is {targets['min'] - wc} words below the minimum for this page type. Thin content is targeted by Google's Helpful Content system.",
                "seo_impact": "HIGH",
                "business_impact": "HIGH — Thin pages rarely rank and hurt site-wide authority",
                "priority": "HIGH",
                "difficulty": "HIGH",
                "estimated_time": f'{max(1, gap // 200)}-{max(2, gap // 100)} hours',
                "google_guideline": GOOGLE_GUIDELINES["content"],
                "implementation_example": "Add comprehensive sections covering: definition, benefits, use cases, examples, FAQ, and comparison.",
            })
        elif wc < targets["ideal"]:
            gap = targets["ideal"] - wc
            recs.append({
                "category": "CONTENT",
                "area": "Content Depth — Could Be Deeper",
                "current_value": f'{wc} words (target: {targets["ideal"]}+ words)',
                "recommended_value": f'{targets["ideal"]}+ words (add ~{gap} words)',
                "reason": f"Content is {gap} words below ideal depth. Deeper content outperforms in competitive SERPs.",
                "seo_impact": "MEDIUM",
                "business_impact": "MEDIUM — More comprehensive content ranks for more keywords",
                "priority": "MEDIUM",
                "difficulty": "MEDIUM",
                "estimated_time": f'{max(1, gap // 200)}-{max(2, gap // 100)} hours',
                "google_guideline": GOOGLE_GUIDELINES["content"],
                "implementation_example": "Expand with: statistics, examples, case studies, expert quotes, comparison tables, and detailed how-to sections.",
            })

        text = page.content_text or ""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        avg_sentence_len = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
        if avg_sentence_len > 25:
            recs.append({
                "category": "CONTENT",
                "area": "Readability — Long Sentences",
                "current_value": f'Average sentence length: {int(avg_sentence_len)} words',
                "recommended_value": "Average sentence length: 15-20 words",
                "reason": f"Average sentence length is {int(avg_sentence_len)} words. Google's Helpful Content system favors content that is easy to read.",
                "seo_impact": "MEDIUM",
                "business_impact": "MEDIUM — Long sentences reduce readability and increase bounce rate",
                "priority": "MEDIUM",
                "difficulty": "MEDIUM",
                "estimated_time": "1-2 hours",
                "google_guideline": GOOGLE_GUIDELINES["content"],
                "implementation_example": "Break long sentences into shorter ones. Use active voice. Aim for Flesch-Kincaid grade level 8-10.",
            })

        return recs

    def _analyze_images(self, page, page_type):
        recs = []
        images = page.images or []

        if not images:
            if page_type not in ("LEGAL", "PRICING", "CONTACT"):
                recs.append({
                    "category": "SEO",
                    "area": "Images — Missing",
                    "current_value": "No images found on page",
                    "recommended_value": "At least 1-2 relevant images with descriptive alt text",
                    "reason": "Pages without images have lower engagement and miss image SEO opportunities. Visual content improves dwell time.",
                    "seo_impact": "MEDIUM",
                    "business_impact": "MEDIUM — Visual content increases engagement by 80% (source: HubSpot)",
                    "priority": "MEDIUM",
                    "difficulty": "MEDIUM",
                    "estimated_time": "30 minutes",
                    "google_guideline": GOOGLE_GUIDELINES["images"],
                    "implementation_example": "Add a hero image, supporting screenshots, or infographic relevant to the page topic.",
                })
            return recs

        for i, img in enumerate(images[:10]):
            src = img.get("src", img.get("url", ""))
            alt = img.get("alt", "")
            if not src:
                continue

            if not alt:
                suggested_alt = self._suggest_alt_text(img, page, i)
                recs.append({
                    "category": "SEO",
                    "area": f"Image {i+1} — Missing Alt Text",
                    "current_value": f'<img src="{self._short_url(src)}" alt=""> (empty alt)',
                    "recommended_value": f'<img src="{self._short_url(src)}" alt="{suggested_alt}">',
                    "reason": f"Image has no alt text. Alt text is required for accessibility (WCAG 2.1) and helps Google understand image content.",
                    "seo_impact": "MEDIUM",
                    "business_impact": "HIGH — Missing alt text fails accessibility compliance and loses image search traffic",
                    "priority": "HIGH",
                    "difficulty": "EASY",
                    "estimated_time": "2 minutes per image",
                    "google_guideline": GOOGLE_GUIDELINES["images"],
                    "implementation_example": f'Add descriptive alt text that describes the image content and includes relevant keywords naturally.',
                })
            elif len(alt) < 10:
                suggested_alt = self._suggest_alt_text(img, page, i)
                recs.append({
                    "category": "SEO",
                    "area": f"Image {i+1} — Alt Text Too Short",
                    "current_value": f'alt="{alt}" ({len(alt)} characters)',
                    "recommended_value": f'alt="{suggested_alt}" ({len(suggested_alt)} characters)',
                    "reason": f"Alt text is only {len(alt)} chars. Descriptive alt text (10-125 chars) helps Google understand image context.",
                    "seo_impact": "LOW",
                    "business_impact": "LOW — Short alt text misses image search optimization",
                    "priority": "LOW",
                    "difficulty": "EASY",
                    "estimated_time": "2 minutes",
                    "google_guideline": GOOGLE_GUIDELINES["images"],
                    "implementation_example": f'Describe the image content, purpose, and include relevant keywords naturally.',
                })

        return recs

    def _analyze_internal_links(self, page, all_pages, page_type):
        recs = []
        links = page.links_internal or []
        link_count = len(links)

        if link_count == 0:
            suggestions = self._suggest_internal_links(page, all_pages)
            recs.append({
                "category": "SEO",
                "area": "Internal Links — None",
                "current_value": "0 internal links",
                "recommended_value": f'{min(5, len(suggestions))}+ internal links to related pages',
                "reason": "No internal links found. Internal links distribute PageRank, help crawlability, and establish topical relationships.",
                "seo_impact": "HIGH",
                "business_impact": "HIGH — Orphan pages are invisible to crawlers and users. Zero link equity flows in.",
                "priority": "HIGH",
                "difficulty": "EASY",
                "estimated_time": "15 minutes",
                "google_guideline": GOOGLE_GUIDELINES["internal_links"],
                "implementation_example": self._format_link_suggestions(suggestions[:5]),
            })
        elif link_count < 3:
            suggestions = self._suggest_internal_links(page, all_pages)
            recs.append({
                "category": "SEO",
                "area": "Internal Links — Few",
                "current_value": f'{link_count} internal links',
                "recommended_value": f'5+ internal links with descriptive anchor text',
                "reason": f"Only {link_count} internal links found. Aim for 5+ contextual internal links per page.",
                "seo_impact": "MEDIUM",
                "business_impact": "MEDIUM — Fewer internal links means less PageRank flow and poorer topic clustering",
                "priority": "MEDIUM",
                "difficulty": "EASY",
                "estimated_time": "15 minutes",
                "google_guideline": GOOGLE_GUIDELINES["internal_links"],
                "implementation_example": self._format_link_suggestions(suggestions[:5]),
            })

        return recs

    def _analyze_external_links(self, page, page_type):
        recs = []
        links = page.links_external or []

        if len(links) == 0 and page.word_count and page.word_count > 500:
            recs.append({
                "category": "SEO",
                "area": "External Links — None",
                "current_value": "0 external links",
                "recommended_value": "2-3 links to authoritative sources",
                "reason": "No outbound links found. Linking to authoritative sources signals trust and provides citation context to Google.",
                "seo_impact": "LOW",
                "business_impact": "LOW — Missing outbound links reduces content credibility signals",
                "priority": "LOW",
                "difficulty": "EASY",
                "estimated_time": "10 minutes",
                "google_guideline": GOOGLE_GUIDELINES["links"],
                "implementation_example": "Link to official documentation, research studies, or authoritative references that support your claims.",
            })

        return recs

    def _analyze_schema(self, page, page_type):
        recs = []
        schema = page.schema_markup or []
        schema_types = [s.get("@type", "") for s in schema if isinstance(s, dict)]

        if not schema_types:
            suggested_types = self._suggest_schema_types(page_type)
            recs.append({
                "category": "TECHNICAL",
                "area": "Structured Data — Missing",
                "current_value": "No JSON-LD structured data",
                "recommended_value": f'Implement: {", ".join(suggested_types)}',
                "reason": "No structured data found. Schema markup enables rich results (FAQ, HowTo, Product, etc.) in Google Search.",
                "seo_impact": "MEDIUM",
                "business_impact": "MEDIUM — Missing schema means no rich results, reducing SERP visibility by 30%+",
                "priority": "MEDIUM",
                "difficulty": "MEDIUM",
                "estimated_time": "30-60 minutes",
                "google_guideline": GOOGLE_GUIDELINES["schema"],
                "implementation_example": self._generate_schema_example(page_type, page),
            })

        return recs

    def _analyze_eeat(self, page, page_type):
        recs = []
        text = (page.content_text or "").lower()
        wc = page.word_count or 0

        if wc < 500:
            return recs

        has_author = any(signal in text for signal in ["author", "written by", "by ", "written on", "contributor"])
        if not has_author and page_type in ("BLOG", "RESOURCE", "SOLUTIONS"):
            recs.append({
                "category": "CONTENT",
                "area": "E-E-A-T — Missing Author Attribution",
                "current_value": "No author name or credentials found",
                "recommended_value": "Author name + title + credentials + avatar + bio link",
                "reason": "YMYL pages and blog content benefit from visible author attribution. Google's E-E-A-T guidelines emphasize author credibility.",
                "seo_impact": "MEDIUM",
                "business_impact": "HIGH — Missing author signals reduce trust for YMYL and informational content",
                "priority": "HIGH",
                "difficulty": "EASY",
                "estimated_time": "15 minutes",
                "google_guideline": GOOGLE_GUIDELINES["eeat"],
                "implementation_example": 'Add byline: "Written by [Author Name], [Title] | [Credentials]" with link to author bio page.',
            })

        has_date = any(signal in text for signal in ["updated", "published", "last modified", "2024", "2025", "2026"])
        if not has_date:
            recs.append({
                "category": "CONTENT",
                "area": "E-E-A-T — Missing Publication Date",
                "current_value": "No visible publication or update date",
                "recommended_value": "Visible date with datePublished and dateModified schema",
                "reason": "No publication date detected. Fresh content signals are important for ranking, especially for time-sensitive queries.",
                "seo_impact": "LOW",
                "business_impact": "MEDIUM — Missing dates suggest stale content to users",
                "priority": "MEDIUM",
                "difficulty": "EASY",
                "estimated_time": "5 minutes",
                "google_guideline": GOOGLE_GUIDELINES["eeat"],
                "implementation_example": 'Add visible date: "Published: January 15, 2026 | Updated: March 3, 2026"',
            })

        has_stats = any(re.search(p, text) for p in STATISTICS_PATTERNS)
        if not has_stats and wc > 800:
            recs.append({
                "category": "CONTENT",
                "area": "E-E-A-T — Missing Statistics/Data",
                "current_value": "No statistics, data points, or research citations found",
                "recommended_value": "3-5 statistics with source citations",
                "reason": "Content without data points or research citations lacks authority. Google's quality raters look for evidence-based content.",
                "seo_impact": "MEDIUM",
                "business_impact": "MEDIUM — Data-backed content earns more backlinks and trust",
                "priority": "MEDIUM",
                "difficulty": "MEDIUM",
                "estimated_time": "30 minutes",
                "google_guideline": GOOGLE_GUIDELINES["eeat"],
                "implementation_example": 'Add: "According to [Source], [statistic]. Research by [Authority] shows [finding]."',
            })

        return recs

    def _analyze_trust_signals(self, page, page_type):
        recs = []
        text = (page.content_text or "").lower()

        if page_type not in ("HOMEPAGE", "PRODUCT", "SERVICES", "PRICING", "DEMO"):
            return recs

        found_trust = [t for t in TRUST_SIGNALS if t in text]
        if len(found_trust) < 2:
            recs.append({
                "category": "CONTENT",
                "area": "Trust Signals — Insufficient",
                "current_value": f'Found: {", ".join(found_trust[:3]) or "None"}',
                "recommended_value": "3+ trust signals: testimonials, case studies, certifications, client logos, security badges",
                "reason": f"Only {len(found_trust)} trust signals found on this {page_type.lower()} page. Trust signals are critical for conversion-focused pages.",
                "seo_impact": "LOW",
                "business_impact": "HIGH — Missing trust signals can reduce conversions by 20-40%",
                "priority": "HIGH",
                "difficulty": "MEDIUM",
                "estimated_time": "1-2 hours",
                "google_guideline": GOOGLE_GUIDELINES["eeat"],
                "implementation_example": "Add: customer logos, testimonials, case study links, security badges (SOC2, ISO), compliance info.",
            })

        return recs

    def _analyze_content_structure(self, page, page_type):
        recs = []
        text = page.content_text or ""
        wc = page.word_count or 0

        if wc < 500:
            return recs

        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 20]
        long_paras = [p for p in paragraphs if len(p.split()) > 100]
        if long_paras:
            recs.append({
                "category": "CONTENT",
                "area": "Content Structure — Long Paragraphs",
                "current_value": f'{len(long_paras)} paragraphs with 100+ words',
                "recommended_value": "Paragraphs of 3-5 sentences (40-80 words max)",
                "reason": "Long paragraphs reduce readability on mobile. Google favors content that is easy to scan and read.",
                "seo_impact": "LOW",
                "business_impact": "MEDIUM — Long paragraphs increase mobile bounce rate",
                "priority": "LOW",
                "difficulty": "EASY",
                "estimated_time": "30 minutes",
                "google_guideline": GOOGLE_GUIDELINES["content"],
                "implementation_example": "Break paragraphs at logical points. Use bullet points, numbered lists, and short sentences.",
            })

        has_lists = bool(re.search(r'(<ul|<ol|\n[-•*]|\n\d+\.)', text, re.IGNORECASE))
        if not has_lists and wc > 800:
            recs.append({
                "category": "CONTENT",
                "area": "Content Structure — No Lists",
                "current_value": "No bullet points or numbered lists found",
                "recommended_value": "2-3 lists for features, steps, or comparisons",
                "reason": "Lists improve readability and are eligible for featured snippets. Google explicitly recommends using lists for step-by-step content.",
                "seo_impact": "MEDIUM",
                "business_impact": "MEDIUM — Lists improve readability and featured snippet eligibility",
                "priority": "MEDIUM",
                "difficulty": "EASY",
                "estimated_time": "20 minutes",
                "google_guideline": GOOGLE_GUIDELINES["featured_snippet"],
                "implementation_example": "Convert relevant paragraphs into bullet points or numbered steps.",
            })

        return recs

    def _analyze_entities(self, page, page_type):
        recs = []
        text = page.content_text or ""
        wc = page.word_count or 0

        if wc < 500:
            return recs

        entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b', text)
        entity_freq = Counter(entities)
        named_entities = [e for e, f in entity_freq.items() if f >= 2]

        if len(named_entities) < 3:
            recs.append({
                "category": "CONTENT",
                "area": "Entity Coverage — Low",
                "current_value": f'{len(named_entities)} named entities found: {", ".join(named_entities[:5]) or "None"}',
                "recommended_value": "5+ named entities (brands, people, products, concepts) mentioned naturally",
                "reason": "Named entities help Google understand content context and topical authority. Entity SEO is increasingly important for AI search.",
                "seo_impact": "MEDIUM",
                "business_impact": "MEDIUM — Entity-poor content may not be cited by AI assistants",
                "priority": "MEDIUM",
                "difficulty": "MEDIUM",
                "estimated_time": "30 minutes",
                "google_guideline": GOOGLE_GUIDELINES["content"],
                "implementation_example": "Naturally mention relevant brands, tools, people, and industry concepts throughout the content.",
            })

        return recs

    def _analyze_cta(self, page, page_type):
        recs = []
        text = (page.content_text or "").lower()
        wc = page.word_count or 0

        if page_type in ("LEGAL", "PRIVACY", "TERMS", "POLICY", "CONTACT"):
            return recs
        if wc < 300:
            return recs

        cta_signals = ["buy", "get started", "sign up", "try", "demo", "contact", "learn more", "download", "subscribe", "request", "schedule", "book", "start free", "free trial"]
        found_cta = [c for c in cta_signals if c in text]

        if not found_cta:
            recs.append({
                "category": "CONTENT",
                "area": "Call-to-Action — Missing",
                "current_value": "No CTA found on page",
                "recommended_value": f'Primary CTA relevant to page purpose (e.g., "Get Started", "Request Demo", "Learn More")',
                "reason": f"No call-to-action detected on this {page_type.lower()} page. CTAs guide users toward conversion goals.",
                "seo_impact": "LOW",
                "business_impact": "HIGH — Missing CTAs can reduce conversions by 30%+",
                "priority": "HIGH",
                "difficulty": "EASY",
                "estimated_time": "15 minutes",
                "google_guideline": "Google doesn't directly penalize missing CTAs, but poor UX signals (low conversion, high bounce) indirectly affect rankings.",
                "implementation_example": "Add a prominent CTA button or section that aligns with the page's purpose and user intent.",
            })

        return recs

    def _analyze_content_freshness(self, page, page_type):
        recs = []
        text = (page.content_text or "").lower()
        wc = page.word_count or 0

        if wc < 500:
            return recs

        year_refs = re.findall(r'20(1[0-9]|2[0-6])', text)
        latest_year = max([int(y) for y in year_refs]) if year_refs else 0

        if latest_year > 0 and latest_year < 2025:
            recs.append({
                "category": "CONTENT",
                "area": "Content Freshness — Outdated References",
                "current_value": f'Latest year reference: {latest_year}',
                "recommended_value": "Update to current year (2026) with fresh data and examples",
                "reason": f"Content references {latest_year} data. Outdated content signals reduced relevance to Google and users.",
                "seo_impact": "MEDIUM",
                "business_impact": "MEDIUM — Outdated content loses trust and rankings for time-sensitive queries",
                "priority": "MEDIUM",
                "difficulty": "MEDIUM",
                "estimated_time": "1-2 hours",
                "google_guideline": GOOGLE_GUIDELINES["content"],
                "implementation_example": f"Update all year references to 2026. Refresh statistics, examples, and screenshots.",
            })

        return recs

    def _suggest_title(self, page, page_type):
        h1 = page.h1 or ""
        title_from_url = page.url.split("/")[-1].replace("-", " ").replace("_", " ").title() if page.url else ""
        if h1:
            return f"{h1[:50]} | Brand"
        if title_from_url and len(title_from_url) > 3:
            return f"{title_from_url[:50]} | Brand"
        return f"Page Title — Primary Keyword | Brand"

    def _suggest_meta_description(self, page, page_type):
        h1 = page.h1 or page.title or ""
        text = (page.content_text or "")[:200]
        first_sentence = text.split(".")[0].strip() if text else ""
        if first_sentence and len(first_sentence) > 30:
            return f"{first_sentence[:140]}. Learn more about {h1.lower() or 'this topic'}."
        return f"Discover everything about {h1.lower() or 'this topic'}. Get started today with our comprehensive guide."

    def _suggest_h1(self, page, page_type):
        title = page.title or ""
        if title:
            return title.split("|")[0].strip()[:80]
        url_slug = page.url.split("/")[-1].replace("-", " ").replace("_", " ").title() if page.url else ""
        return url_slug[:80] or "Page Heading"

    def _suggest_alt_text(self, img, page, index):
        src = img.get("src", img.get("url", ""))
        filename = src.split("/")[-1].split("?")[0].split(".")[0] if src else ""
        filename_clean = filename.replace("-", " ").replace("_", " ").replace(".", " ").title()
        if filename_clean and len(filename_clean) > 3:
            return f"{filename_clean} — {page.title or 'page visual'}"
        return f"{page.title or 'Page'} — visual {index + 1}"

    def _suggest_internal_links(self, page, all_pages):
        if not all_pages:
            return []
        page_text = (page.content_text or "").lower()
        page_words = set(re.findall(r'\b[a-zA-Z]{5,}\b', page_text))

        scored = []
        for p in all_pages:
            if p.url == page.url or not p.content_text:
                continue
            p_words = set(re.findall(r'\b[a-zA-Z]{5,}\b', p.content_text.lower()))
            overlap = len(page_words & p_words)
            if overlap >= 3:
                scored.append({"url": p.url, "title": p.title or "", "overlap": overlap})

        scored.sort(key=lambda x: x["overlap"], reverse=True)
        return scored[:8]

    def _format_link_suggestions(self, suggestions):
        if not suggestions:
            return "Find relevant pages on your site and add contextual internal links."
        lines = ["Suggested internal links:"]
        for s in suggestions[:5]:
            anchor = s["title"][:40] if s["title"] else s["url"].split("/")[-1].replace("-", " ")
            lines.append(f'  <a href="{s["url"]}">{anchor}</a>')
        return "\n".join(lines)

    def _suggest_schema_types(self, page_type):
        type_map = {
            "HOMEPAGE": ["Organization", "WebSite", "BreadcrumbList"],
            "BLOG": ["Article", "BlogPosting", "BreadcrumbList"],
            "PRODUCT": ["Product", "Offer", "AggregateRating", "BreadcrumbList"],
            "SERVICES": ["Service", "Organization", "BreadcrumbList"],
            "FAQ": ["FAQPage", "BreadcrumbList"],
            "ABOUT": ["Organization", "BreadcrumbList"],
            "PRICING": ["Product", "Offer", "BreadcrumbList"],
            "CONTACT": ["Organization", "LocalBusiness", "BreadcrumbList"],
            "LEGAL": ["WebPage", "BreadcrumbList"],
            "DEMO": ["SoftwareApplication", "BreadcrumbList"],
        }
        return type_map.get(page_type, ["Organization", "BreadcrumbList"])

    def _generate_schema_example(self, page_type, page):
        if page_type == "BLOG":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": page.title or "Article Title",
                "author": {"@type": "Person", "name": "Author Name"},
                "datePublished": "2026-01-01",
                "dateModified": "2026-01-15",
            }, indent=2)
        if page_type == "FAQ":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [{"@type": "Question", "name": "Question?", "acceptedAnswer": {"@type": "Answer", "text": "Answer."}}],
            }, indent=2)
        return json.dumps({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Organization Name",
            "url": page.url,
        }, indent=2)

    def _short_url(self, url, max_len=60):
        if len(url) <= max_len:
            return url
        return url[:max_len-3] + "..."

    def _deduplicate(self, recs):
        seen = set()
        unique = []
        for rec in recs:
            key = f"{rec['category']}:{rec['area']}"
            if key not in seen:
                seen.add(key)
                unique.append(rec)
        return unique
