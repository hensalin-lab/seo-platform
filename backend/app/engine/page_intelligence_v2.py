from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import datetime
from typing import Any

_WORD_RE = re.compile(r"\w+")
_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")
_SCHEMA_ORG_RE = re.compile(r'"@type"\s*:\s*"([^"]+)"')
_FQA_RE = re.compile(r"(?i)(faq|frequently asked|common questions|q\s*&\s*a)")
_DEFINITION_RE = re.compile(
    r"(?i)\b(is (?:a|an|the)|refers to|defined as|means|denotes|"
    r"describes (?:a|an|the)|is a type of|is a form of)\b"
)
_ENTITY_CANDIDATE_RE = re.compile(r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b")
_URL_RE = re.compile(r"https?://[^\s<>\"']+")
_CITATION_RE = re.compile(r"\[?\d+\]?|https?://[^\s<>\"']+|et al\.|ibid\.|p\.\s*\d+")


def _safe_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        f = float(val)
    except (TypeError, ValueError):
        return default
    if math.isnan(f) or math.isinf(f):
        return default
    return f


def _safe_int(val: Any, default: int = 0) -> int:
    return int(_safe_float(val, float(default)))


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, _safe_float(val)))


def _score(val: Any, default: float = 0.0) -> float:
    return _clamp(_safe_float(val, default))


def _count_words(text: str) -> int:
    if not text:
        return 0
    return len(_WORD_RE.findall(text))


def _truncate(text: str, length: int = 160) -> str:
    if not text:
        return ""
    if len(text) <= length:
        return text
    return text[: length - 3].rsplit(" ", 1)[0] + "..."


def _sentences(text: str) -> list[str]:
    if not text:
        return []
    return [s.strip() for s in _SENTENCE_RE.split(text) if s.strip()]


def _heading_depth(h: str) -> int:
    h = h.strip()
    if h.startswith("h1"):
        return 1
    if h.startswith("h2"):
        return 2
    if h.startswith("h3"):
        return 3
    if h.startswith("h4"):
        return 4
    if h.startswith("h5"):
        return 5
    if h.startswith("h6"):
        return 6
    return 0


def _avg(lst: list[float]) -> float:
    if not lst:
        return 0.0
    return sum(lst) / len(lst)


class PageIntelligenceV2Engine:

    EXPECTED_SCHEMAS: dict[str, list[str]] = {
        "article": ["Article", "WebPage", "BreadcrumbList", "Organization"],
        "product": [
            "Product",
            "Offer",
            "AggregateRating",
            "Review",
            "BreadcrumbList",
            "Organization",
        ],
        "service": [
            "Service",
            "Organization",
            "BreadcrumbList",
            "FAQPage",
        ],
        "blog": [
            "Article",
            "BlogPosting",
            "BreadcrumbList",
            "Organization",
            "Person",
        ],
        "faq": ["FAQPage", "WebPage", "BreadcrumbList"],
        "landing": ["WebPage", "Organization", "BreadcrumbList", "FAQPage"],
        "home": ["WebPage", "Organization", "SiteNavigationElement", "BreadcrumbList"],
        "category": ["ItemList", "WebPage", "BreadcrumbList"],
        "default": ["WebPage", "BreadcrumbList", "Organization"],
    }

    COMMON_ENTITIES: list[str] = [
        "Google",
        "SEO",
        "Search Engine",
        "Content Marketing",
        "Keyword Research",
        "Backlinks",
        "Meta Description",
        "Title Tag",
        "Schema Markup",
        "Core Web Vitals",
        "Page Speed",
        "Mobile Optimization",
        "URL Structure",
        "Sitemap",
        "Robots.txt",
        "Canonical URL",
        "Internal Linking",
        "External Linking",
        "Alt Text",
        "Heading Tags",
        "Structured Data",
        "Open Graph",
        "Social Media",
        "Analytics",
        "Conversion Rate",
        "Bounce Rate",
        "Dwell Time",
        "Click Through Rate",
        "Search Console",
        "Indexing",
        "Crawling",
        "Ranking Factor",
        "Algorithm",
        "Artificial Intelligence",
        "Machine Learning",
        "Natural Language Processing",
        "User Intent",
        "Search Intent",
        "Long Tail Keywords",
        "LSI Keywords",
        "Domain Authority",
        "Page Authority",
        "E-E-A-T",
        "YMYL",
        "Freshness",
        "Relevance",
        "User Experience",
    ]

    AI_PLATFORMS = ["ChatGPT", "Gemini", "Perplexity", "Google AI Overview", "Claude"]

    def __init__(self) -> None:
        pass

    def analyze(self, page: dict, all_pages: list | None = None) -> dict:
        page = dict(page) if page else {}
        all_pages = list(all_pages) if all_pages else []

        url = str(page.get("url", ""))
        title = str(page.get("title", ""))
        meta_description = str(page.get("meta_description", ""))
        h1 = str(page.get("h1", ""))
        headings: list[str] = list(page.get("headings", [])) if page.get("headings") else []
        content_text = str(page.get("content_text", ""))
        word_count = _safe_int(page.get("word_count", _count_words(content_text)))
        if word_count == 0:
            word_count = _count_words(content_text)
        html_raw = str(page.get("html_raw", ""))
        images: list[dict] = list(page.get("images", [])) if page.get("images") else []
        links_internal: list[dict] = (
            list(page.get("links_internal", [])) if page.get("links_internal") else []
        )
        links_external: list[dict] = (
            list(page.get("links_external", [])) if page.get("links_external") else []
        )
        schema_markup: list[dict] = (
            list(page.get("schema_markup", [])) if page.get("schema_markup") else []
        )
        page_type = str(page.get("page_type", "default")).lower().strip()
        response_time_ms = _safe_float(page.get("response_time_ms", 0))
        status_code = _safe_int(page.get("status_code", 200))
        canonical = str(page.get("canonical", ""))
        robots_txt = str(page.get("robots_txt", ""))

        has_https = url.startswith("https://")
        has_canonical = len(canonical) > 0
        has_robots = len(robots_txt) > 0
        is_200 = status_code == 200
        has_title = len(title.strip()) > 0
        has_h1 = len(h1.strip()) > 0
        has_meta = len(meta_description.strip()) > 0
        title_len = len(title)
        meta_len = len(meta_description)
        h1_len = len(h1)
        img_count = len(images)
        imgs_with_alt = sum(1 for img in images if str(img.get("alt", "")).strip())
        internal_link_count = len(links_internal)
        external_link_count = len(links_external)
        schema_types = self._extract_schema_types(schema_markup)
        heading_tags = [_heading_depth(h) for h in headings if _heading_depth(h) > 0]
        content_len = len(content_text)

        sentences = _sentences(content_text)
        sentence_count = len(sentences)
        avg_sentence_len = (
            _avg([_count_words(s) for s in sentences]) if sentences else 0
        )

        tables_in_html = html_raw.lower().count("<table")
        lists_in_html = html_raw.lower().count("<ul") + html_raw.lower().count("<ol")
        has_faq = bool(_FQA_RE.search(content_text)) or bool(_FQA_RE.search(html_raw))
        definition_count = len(_DEFINITION_RE.findall(content_text))
        entity_mentions = self._detect_entities(content_text)
        citation_count = len(_CITATION_RE.findall(content_text))
        urls_in_content = _URL_RE.findall(content_text)
        avg_words_per_sentence = _safe_float(avg_sentence_len)

        competitor_stats = self._compute_competitor_stats(all_pages, page)

        category_scores = self._compute_category_scores(
            has_https=has_https,
            has_canonical=has_canonical,
            has_robots=has_robots,
            is_200=is_200,
            has_title=has_title,
            has_h1=has_h1,
            has_meta=has_meta,
            title_len=title_len,
            meta_len=meta_len,
            h1_len=h1_len,
            word_count=word_count,
            tables_in_html=tables_in_html,
            lists_in_html=lists_in_html,
            content_len=content_len,
            definition_count=definition_count,
            has_faq=has_faq,
            citation_count=citation_count,
            entity_mentions=entity_mentions,
            schema_types=schema_types,
            page_type=page_type,
            images=images,
            imgs_with_alt=imgs_with_alt,
            links_internal=links_internal,
            internal_link_count=internal_link_count,
            external_link_count=external_link_count,
            response_time_ms=response_time_ms,
            avg_sentence_len=avg_sentence_len,
            heading_tags=heading_tags,
            sentence_count=sentence_count,
            url=url,
            html_raw=html_raw,
            content_text=content_text,
            h1=h1,
            img_count=img_count,
            all_pages=all_pages,
        )

        issues = self._build_issues(
            has_https=has_https,
            has_canonical=has_canonical,
            has_robots=has_robots,
            is_200=is_200,
            has_title=has_title,
            has_h1=has_h1,
            has_meta=has_meta,
            title_len=title_len,
            meta_len=meta_len,
            h1_len=h1_len,
            word_count=word_count,
            content_len=content_len,
            img_count=img_count,
            imgs_with_alt=imgs_with_alt,
            internal_link_count=internal_link_count,
            external_link_count=external_link_count,
            schema_types=schema_types,
            page_type=page_type,
            has_faq=has_faq,
            definition_count=definition_count,
            citation_count=citation_count,
            response_time_ms=response_time_ms,
            avg_sentence_len=avg_sentence_len,
            tables_in_html=tables_in_html,
            lists_in_html=lists_in_html,
            heading_tags=heading_tags,
            entity_mentions=entity_mentions,
            title=title,
            h1=h1,
            content_text=content_text,
            meta_description=meta_description,
            url=url,
        )

        overall_current = _score(self._weighted_overall(category_scores))

        critical_issues = [i for i in issues if i["seo_impact"] == "High"]
        medium_issues = [i for i in issues if i["seo_impact"] == "Medium"]
        low_issues = [i for i in issues if i["seo_impact"] == "Low"]

        after_critical = min(
            100.0, overall_current + len(critical_issues) * 2.8 + 4.0
        )
        after_all = min(
            100.0,
            after_critical
            + len(medium_issues) * 1.5
            + len(low_issues) * 0.5
            + 2.0,
        )

        ai_scores = self._compute_ai_scores(
            definition_count=definition_count,
            has_faq=has_faq,
            entity_mentions=entity_mentions,
            citation_count=citation_count,
            word_count=word_count,
            content_text=content_text,
            schema_types=schema_types,
            heading_tags=heading_tags,
            sentence_count=sentence_count,
            avg_sentence_len=avg_sentence_len,
        )

        entity_analysis = self._analyze_entities(
            entity_mentions=entity_mentions,
            content_text=content_text,
            page_type=page_type,
        )

        internal_linking = self._analyze_internal_links(
            links_internal=links_internal,
            content_text=content_text,
            url=url,
            all_pages=all_pages,
        )

        before_after = self._generate_before_after(
            title=title,
            h1=h1,
            meta_description=meta_description,
            content_text=content_text,
            has_faq=has_faq,
            schema_types=schema_types,
            page_type=page_type,
            url=url,
            definition_count=definition_count,
            entity_mentions=entity_mentions,
        )

        action_plan = self._build_action_plan(
            issues=issues,
            overall_current=overall_current,
            after_all=after_all,
        )

        business_impact = self._estimate_business_impact(
            overall_current=overall_current,
            after_all=after_all,
            critical_count=len(critical_issues),
            medium_count=len(medium_issues),
            low_count=len(low_issues),
            word_count=word_count,
            internal_link_count=internal_link_count,
            ai_scores=ai_scores,
        )

        return {
            "url": url,
            "analyzed_at": datetime.utcnow().isoformat() + "Z",
            "page_type": page_type,
            "overall_score": round(overall_current, 1),
            "predicted_after_critical": round(after_critical, 1),
            "predicted_after_all": round(after_all, 1),
            "word_count": word_count,
            "category_scores": category_scores,
            "ranking_impact_analysis": issues,
            "before_after_fixes": before_after,
            "competitor_comparison": competitor_stats,
            "ai_search_readiness": {
                "platforms": ai_scores,
                "overall_ai_score": round(
                    _score(
                        _avg([s["score"] for s in ai_scores.values()])
                    ),
                    1,
                ),
                "biggest_improvement": self._biggest_ai_improvement(ai_scores),
            },
            "entity_analysis": entity_analysis,
            "internal_linking_intelligence": internal_linking,
            "predicted_improvements": {
                "current_score": round(overall_current, 1),
                "after_critical_fixes": round(after_critical, 1),
                "after_all_fixes": round(after_all, 1),
                "ranking_positions_gained_estimate": round(
                    _clamp(
                        (after_all - overall_current) * 0.15 + len(critical_issues) * 0.4,
                        0,
                        25,
                    ),
                    1,
                ),
            },
            "action_plan": action_plan,
            "business_impact": business_impact,
            "summary": self._build_summary(
                overall_current=overall_current,
                after_all=after_all,
                critical_count=len(critical_issues),
                medium_count=len(medium_issues),
                category_scores=category_scores,
                ai_scores=ai_scores,
                page_type=page_type,
                url=url,
            ),
        }

    def _extract_schema_types(self, schema_markup: list[dict]) -> list[str]:
        types: list[str] = []
        for item in schema_markup:
            if isinstance(item, dict):
                t = str(item.get("@type", "")).strip()
                if t:
                    types.append(t)
            elif isinstance(item, str):
                for m in _SCHEMA_ORG_RE.finditer(item):
                    types.append(m.group(1))
        return types

    def _compute_category_scores(
        self,
        *,
        has_https: bool,
        has_canonical: bool,
        has_robots: bool,
        is_200: bool,
        has_title: bool,
        has_h1: bool,
        has_meta: bool,
        title_len: int,
        meta_len: int,
        h1_len: int,
        word_count: int,
        tables_in_html: int,
        lists_in_html: int,
        content_len: int,
        definition_count: int,
        has_faq: bool,
        citation_count: int,
        entity_mentions: dict[str, int],
        schema_types: list[str],
        page_type: str,
        images: list[dict],
        imgs_with_alt: int,
        links_internal: list[dict],
        internal_link_count: int,
        external_link_count: int,
        response_time_ms: float,
        avg_sentence_len: float,
        heading_tags: list[int],
        sentence_count: int,
        url: str,
        html_raw: str,
        content_text: str,
        h1: str = "",
        img_count: int = 0,
        all_pages: list | None = None,
    ) -> dict[str, dict]:
        passed_signals: list[str] = []
        failed_signals: list[str] = []

        # Technical SEO
        tech_score = 0.0
        tech_target = 100.0
        if has_https:
            tech_score += 15
            passed_signals.append("HTTPS enabled")
        else:
            failed_signals.append("Not using HTTPS")
        if has_canonical:
            tech_score += 15
            passed_signals.append("Canonical tag present")
        else:
            failed_signals.append("Missing canonical tag")
        if has_robots:
            tech_score += 10
            passed_signals.append("Robots configuration present")
        else:
            failed_signals.append("No robots configuration")
        if is_200:
            tech_score += 20
            passed_signals.append("200 OK status code")
        else:
            failed_signals.append(f"Non-200 status code: {int(tech_score)}")
        if response_time_ms > 0:
            if response_time_ms < 1000:
                tech_score += 15
                passed_signals.append("Fast response time (<1s)")
            elif response_time_ms < 3000:
                tech_score += 10
                passed_signals.append("Acceptable response time (<3s)")
            else:
                tech_score += 3
                failed_signals.append("Slow response time (>3s)")
        else:
            tech_score += 8
            passed_signals.append("Response time not measured")

        has_viewport = "viewport" in html_raw.lower()
        if has_viewport:
            tech_score += 5
            passed_signals.append("Viewport meta tag present")
        else:
            failed_signals.append("Missing viewport meta tag")

        has_lang = 'lang="' in html_raw.lower()
        if has_lang:
            tech_score += 5
            passed_signals.append("Language attribute present")
        else:
            failed_signals.append("Missing lang attribute")

        has_og = "og:" in html_raw.lower()
        if has_og:
            tech_score += 5
            passed_signals.append("Open Graph tags present")
        else:
            failed_signals.append("Missing Open Graph tags")

        tech_score = _clamp(tech_score)

        # Content Quality
        content_score = 0.0
        content_target = 100.0
        if has_title:
            content_score += 8
            passed_signals.append("Title tag present")
        else:
            failed_signals.append("Missing title tag")
        if 30 <= title_len <= 65:
            content_score += 8
            passed_signals.append("Title length optimal (30-65 chars)")
        elif title_len > 0:
            content_score += 3
            failed_signals.append(f"Title length suboptimal ({title_len} chars)")
        else:
            failed_signals.append("No title tag")
        if has_h1:
            content_score += 8
            passed_signals.append("H1 tag present")
        else:
            failed_signals.append("Missing H1 tag")
        if has_meta:
            content_score += 6
            passed_signals.append("Meta description present")
        else:
            failed_signals.append("Missing meta description")
        if 120 <= meta_len <= 160:
            content_score += 6
            passed_signals.append("Meta description length optimal (120-160 chars)")
        elif meta_len > 0:
            content_score += 2
            failed_signals.append(
                f"Meta description length suboptimal ({meta_len} chars)"
            )
        if word_count >= 1500:
            content_score += 12
            passed_signals.append(f"Comprehensive content ({word_count} words)")
        elif word_count >= 800:
            content_score += 8
            passed_signals.append(f"Adequate content length ({word_count} words)")
        elif word_count >= 300:
            content_score += 4
            failed_signals.append(f"Thin content ({word_count} words)")
        else:
            content_score += 1
            failed_signals.append(f"Very thin content ({word_count} words)")
        if tables_in_html > 0:
            content_score += 5
            passed_signals.append("Contains structured tables")
        else:
            failed_signals.append("No tables for data presentation")
        if lists_in_html > 0:
            content_score += 5
            passed_signals.append("Contains lists")
        else:
            failed_signals.append("No lists found")
        if avg_sentence_len > 0 and avg_sentence_len < 25:
            content_score += 8
            passed_signals.append("Good sentence readability")
        elif avg_sentence_len >= 25:
            content_score += 3
            failed_signals.append("Sentences too long on average")
        else:
            content_score += 5
        if len(heading_tags) >= 3:
            heading_levels = set(heading_tags)
            if len(heading_levels) >= 2:
                content_score += 10
                passed_signals.append("Good heading hierarchy")
            else:
                content_score += 5
                failed_signals.append("Flat heading hierarchy")
        else:
            content_score += 2
            failed_signals.append("Insufficient heading structure")
        if sentence_count > 0:
            unique_ratio = self._uniqueness_ratio(content_text)
            if unique_ratio > 0.7:
                content_score += 8
                passed_signals.append("High content uniqueness")
            elif unique_ratio > 0.5:
                content_score += 4
                passed_signals.append("Moderate content uniqueness")
            else:
                content_score += 1
                failed_signals.append("Low content uniqueness")
        else:
            content_score += 3
        if "image" in html_raw.lower():
            content_score += 3
        if "video" in html_raw.lower() or "iframe" in html_raw.lower():
            content_score += 3
            passed_signals.append("Multimedia content detected")
        if has_h1 and h1_len > 0:
            h1_words = _count_words(h1)
            if 5 <= h1_words <= 15:
                content_score += 8
                passed_signals.append("H1 length optimal")
            elif h1_words > 0:
                content_score += 4
        content_score = _clamp(content_score)

        # AI Search Readiness
        ai_readiness_score = 0.0
        ai_readiness_target = 100.0
        if definition_count >= 3:
            ai_readiness_score += 20
            passed_signals.append("Strong definition coverage for AI")
        elif definition_count >= 1:
            ai_readiness_score += 10
            passed_signals.append("Some definition patterns for AI")
        else:
            ai_readiness_score += 2
            failed_signals.append("No definitional patterns for AI extraction")
        if has_faq:
            ai_readiness_score += 20
            passed_signals.append("FAQ content detected")
        else:
            failed_signals.append("No FAQ content for AI citation")
        if citation_count >= 2:
            ai_readiness_score += 15
            passed_signals.append("References/citations present")
        elif citation_count >= 1:
            ai_readiness_score += 8
            failed_signals.append("Limited citations")
        else:
            failed_signals.append("No citations detected")
        entity_count = len(entity_mentions)
        if entity_count >= 10:
            ai_readiness_score += 15
            passed_signals.append(f"Rich entity coverage ({entity_count} entities)")
        elif entity_count >= 5:
            ai_readiness_score += 8
            passed_signals.append(f"Moderate entity coverage ({entity_count} entities)")
        else:
            ai_readiness_score += 2
            failed_signals.append(f"Limited entity coverage ({entity_count} entities)")
        if word_count >= 1500:
            ai_readiness_score += 10
            passed_signals.append("Substantial content for AI context")
        elif word_count >= 800:
            ai_readiness_score += 5
        else:
            failed_signals.append("Insufficient content depth for AI")
        if definition_count > 0 and has_faq and entity_count >= 8:
            ai_readiness_score += 10
            passed_signals.append("Strong AI-extractable structure")
        elif definition_count > 0 or has_faq:
            ai_readiness_score += 5
        if avg_sentence_len > 0 and avg_sentence_len < 22:
            ai_readiness_score += 5
            passed_signals.append("Concise sentences for AI parsing")
        elif avg_sentence_len >= 22:
            failed_signals.append("Complex sentences reduce AI extractability")
        if len(urls_in_content := _URL_RE.findall(content_text)) > 0:
            ai_readiness_score += 5
            passed_signals.append("External references in content")
        ai_readiness_score = _clamp(ai_readiness_score)

        # Schema Coverage
        schema_score = 0.0
        schema_target = 100.0
        expected = set(self.EXPECTED_SCHEMAS.get(page_type, self.EXPECTED_SCHEMAS["default"]))
        detected = set(schema_types)
        if expected:
            coverage = len(detected & expected)
            schema_score = _clamp((coverage / len(expected)) * 80)
        else:
            schema_score = 40.0
        if schema_types:
            passed_signals.append(f"Schema types found: {', '.join(schema_types)}")
        else:
            failed_signals.append("No structured data detected")
        missing_schemas = expected - detected
        if missing_schemas:
            failed_signals.append(
                f"Missing expected schemas: {', '.join(sorted(missing_schemas))}"
            )
        else:
            passed_signals.append("All expected schema types present")
        schema_score = _clamp(schema_score)

        # E-E-A-T
        eeat_score = 50.0
        eeat_target = 100.0
        if "author" in html_raw.lower() or "by " in content_text[:200].lower():
            eeat_score += 12
            passed_signals.append("Author attribution detected")
        else:
            failed_signals.append("No author attribution found")
        if "date" in html_raw.lower() or "published" in html_raw.lower():
            eeat_score += 8
            passed_signals.append("Publication date detected")
        else:
            failed_signals.append("No publication date found")
        if citation_count >= 2:
            eeat_score += 12
            passed_signals.append("External references support expertise")
        elif citation_count >= 1:
            eeat_score += 6
        else:
            failed_signals.append("No external references")
        if "research" in content_text.lower() or "study" in content_text.lower():
            eeat_score += 8
            passed_signals.append("Research citations detected")
        else:
            failed_signals.append("No research citations")
        if "experience" in content_text.lower() or "we have" in content_text.lower():
            eeat_score += 8
            passed_signals.append("Experience signals detected")
        else:
            failed_signals.append("No experience signals")
        if "years" in content_text.lower() or "since " in content_text.lower():
            eeat_score += 6
            passed_signals.append("Temporal authority signals")
        else:
            failed_signals.append("No temporal authority signals")
        eeat_score = _clamp(eeat_score)

        # Performance
        perf_score = 0.0
        perf_target = 100.0
        if response_time_ms > 0:
            if response_time_ms < 500:
                perf_score += 35
                passed_signals.append("Excellent response time (<500ms)")
            elif response_time_ms < 1000:
                perf_score += 28
                passed_signals.append("Good response time (<1s)")
            elif response_time_ms < 2000:
                perf_score += 18
                passed_signals.append("Acceptable response time (<2s)")
            elif response_time_ms < 3000:
                perf_score += 10
                failed_signals.append("Slow response time (>2s)")
            else:
                perf_score += 3
                failed_signals.append("Very slow response time (>3s)")
        else:
            perf_score += 15
        html_size = len(html_raw)
        if html_size > 0:
            if html_size < 50_000:
                perf_score += 20
                passed_signals.append("Reasonable page size")
            elif html_size < 100_000:
                perf_score += 12
                failed_signals.append("Large page size")
            else:
                perf_score += 5
                failed_signals.append("Very large page size")
        else:
            perf_score += 10
        if imgs_with_alt > 0 or img_count == 0:
            perf_score += 10
        if img_count > 0:
            no_alt = img_count - imgs_with_alt
            if no_alt == 0:
                perf_score += 15
                passed_signals.append("All images have alt text")
            else:
                perf_score += max(0, 15 - no_alt * 3)
                failed_signals.append(f"{no_alt} images missing alt text")
        else:
            perf_score += 10
        inline_styles = html_raw.count("style=")
        if inline_styles < 5:
            perf_score += 10
            passed_signals.append("Minimal inline styles")
        else:
            perf_score += 4
            failed_signals.append(f"{inline_styles} inline styles detected")
        if html_size > 0:
            scripts = html_raw.lower().count("<script")
            if scripts < 10:
                perf_score += 10
            elif scripts < 20:
                perf_score += 5
            else:
                failed_signals.append(f"Excessive scripts ({scripts})")
        perf_score = _clamp(perf_score)

        # Internal Linking
        link_score = 0.0
        link_target = 100.0
        if internal_link_count >= 10:
            link_score += 25
            passed_signals.append(f"Good internal link count ({internal_link_count})")
        elif internal_link_count >= 5:
            link_score += 18
            passed_signals.append(f"Moderate internal links ({internal_link_count})")
        elif internal_link_count >= 2:
            link_score += 10
            failed_signals.append(f"Few internal links ({internal_link_count})")
        else:
            link_score += 3
            failed_signals.append(f"Very few internal links ({internal_link_count})")
        if external_link_count >= 2:
            link_score += 15
            passed_signals.append(
                f"Good external linking ({external_link_count} links)"
            )
        elif external_link_count >= 1:
            link_score += 8
            passed_signals.append("Some external linking")
        else:
            link_score += 5
            failed_signals.append("No external links")
        if internal_link_count > 0 and external_link_count > 0:
            link_score += 10
            passed_signals.append("Balanced link profile")
        if all_pages:
            link_score += 15
            passed_signals.append("Site-wide link analysis available")
        if len(heading_tags) >= 3:
            link_score += 10
        if word_count > 0 and internal_link_count > 0:
            links_per_1000 = (internal_link_count / word_count) * 1000
            if 2 <= links_per_1000 <= 8:
                link_score += 15
                passed_signals.append("Good link density per word count")
            elif links_per_1000 > 8:
                link_score += 8
                failed_signals.append("Excessive link density")
            else:
                link_score += 5
                failed_signals.append("Low link density")
        link_score = _clamp(link_score)

        return {
            "technical_seo": {
                "score": round(tech_score, 1),
                "target": tech_target,
                "passed": [s for s in passed_signals if "HTTPS" in s or "Canonical" in s or "Robots" in s or "200 OK" in s or "response" in s.lower() or "viewport" in s.lower() or "lang" in s.lower() or "Open Graph" in s],
                "failed": [s for s in failed_signals if "HTTPS" in s or "Canonical" in s or "Robots" in s or "200" in s or "response" in s.lower() or "viewport" in s.lower() or "lang" in s.lower() or "Open Graph" in s],
            },
            "content_quality": {
                "score": round(content_score, 1),
                "target": content_target,
                "passed": [s for s in passed_signals if "Title" in s or "H1" in s or "Meta" in s or "word" in s.lower() or "table" in s.lower() or "list" in s.lower() or "sentence" in s.lower() or "heading" in s.lower() or "uniqueness" in s.lower() or "Multimedia" in s],
                "failed": [s for s in failed_signals if "Title" in s or "H1" in s or "Meta" in s or "word" in s.lower() or "table" in s.lower() or "list" in s.lower() or "sentence" in s.lower() or "heading" in s.lower() or "uniqueness" in s.lower()],
            },
            "ai_search_readiness": {
                "score": round(ai_readiness_score, 1),
                "target": ai_readiness_target,
                "passed": [s for s in passed_signals if "definition" in s.lower() or "FAQ" in s or "citation" in s.lower() or "entity" in s.lower() or "AI" in s or "Concise" in s or "external ref" in s.lower()],
                "failed": [s for s in failed_signals if "definition" in s.lower() or "FAQ" in s.lower() or "citation" in s.lower() or "entity" in s.lower() or "AI" in s or "sentence" in s.lower()],
            },
            "schema_coverage": {
                "score": round(schema_score, 1),
                "target": schema_target,
                "passed": [s for s in passed_signals if "Schema" in s or "schema" in s.lower()],
                "failed": [s for s in failed_signals if "Schema" in s or "schema" in s.lower() or "structured data" in s.lower()],
            },
            "e_e_a_t": {
                "score": round(eeat_score, 1),
                "target": eeat_target,
                "passed": [s for s in passed_signals if "author" in s.lower() or "date" in s.lower() or "reference" in s.lower() or "research" in s.lower() or "experience" in s.lower() or "temporal" in s.lower()],
                "failed": [s for s in failed_signals if "author" in s.lower() or "date" in s.lower() or "reference" in s.lower() or "research" in s.lower() or "experience" in s.lower() or "temporal" in s.lower()],
            },
            "performance": {
                "score": round(perf_score, 1),
                "target": perf_target,
                "passed": [s for s in passed_signals if "response" in s.lower() or "page size" in s.lower() or "image" in s.lower() or "inline" in s.lower() or "alt" in s.lower()],
                "failed": [s for s in failed_signals if "response" in s.lower() or "page size" in s.lower() or "image" in s.lower() or "inline" in s.lower() or "script" in s.lower()],
            },
            "internal_linking": {
                "score": round(link_score, 1),
                "target": link_target,
                "passed": [s for s in passed_signals if "link" in s.lower()],
                "failed": [s for s in failed_signals if "link" in s.lower()],
            },
        }

    def _weighted_overall(self, cats: dict[str, dict]) -> float:
        weights = {
            "technical_seo": 0.20,
            "content_quality": 0.22,
            "ai_search_readiness": 0.18,
            "schema_coverage": 0.10,
            "e_e_a_t": 0.12,
            "performance": 0.08,
            "internal_linking": 0.10,
        }
        total = 0.0
        for k, w in weights.items():
            if k in cats:
                total += cats[k]["score"] * w
        return total

    def _uniqueness_ratio(self, text: str) -> float:
        words = _WORD_RE.findall(text.lower())
        if len(words) < 5:
            return 0.5
        unique = set(words)
        return len(unique) / len(words)

    def _detect_entities(self, content_text: str) -> dict[str, int]:
        found: dict[str, int] = {}
        for ent in self.COMMON_ENTITIES:
            count = content_text.lower().count(ent.lower())
            if count > 0:
                found[ent] = count
        capital_matches = _ENTITY_CANDIDATE_RE.findall(content_text)
        for m in capital_matches:
            key = m.strip()
            if len(key) > 3 and key not in found:
                found[key] = 1
        return found

    def _build_issues(
        self,
        *,
        has_https: bool,
        has_canonical: bool,
        has_robots: bool,
        is_200: bool,
        has_title: bool,
        has_h1: bool,
        has_meta: bool,
        title_len: int,
        meta_len: int,
        h1_len: int,
        word_count: int,
        content_len: int,
        img_count: int,
        imgs_with_alt: int,
        internal_link_count: int,
        external_link_count: int,
        schema_types: list[str],
        page_type: str,
        has_faq: bool,
        definition_count: int,
        citation_count: int,
        response_time_ms: float,
        avg_sentence_len: float,
        tables_in_html: int,
        lists_in_html: int,
        heading_tags: list[int],
        entity_mentions: dict[str, int],
        title: str,
        h1: str,
        content_text: str,
        meta_description: str,
        url: str,
    ) -> list[dict]:
        issues: list[dict] = []

        if not has_https:
            issues.append(
                {
                    "id": "missing_https",
                    "category": "technical_seo",
                    "issue": "Site not using HTTPS",
                    "seo_impact": "High",
                    "ai_impact": "High",
                    "difficulty": "Medium",
                    "time_to_fix": "1-2 hours",
                    "expected_effect": "Immediate trust signal improvement; Google confirmed HTTPS as a ranking signal. AI crawlers prefer HTTPS sources.",
                }
            )
        if not has_canonical:
            issues.append(
                {
                    "id": "missing_canonical",
                    "category": "technical_seo",
                    "issue": "No canonical tag specified",
                    "seo_impact": "High",
                    "ai_impact": "Medium",
                    "difficulty": "Easy",
                    "time_to_fix": "5 minutes",
                    "expected_effect": "Prevents duplicate content issues; clarifies the preferred URL for indexing and AI citation.",
                }
            )
        if not is_200:
            issues.append(
                {
                    "id": "non_200_status",
                    "category": "technical_seo",
                    "issue": f"Page returns non-200 status code ({int(response_time_ms)})",
                    "seo_impact": "High",
                    "ai_impact": "High",
                    "difficulty": "Hard",
                    "time_to_fix": "Varies",
                    "expected_effect": "Non-200 pages may not be indexed or crawled properly by search engines and AI systems.",
                }
            )
        if not has_title:
            issues.append(
                {
                    "id": "missing_title",
                    "category": "content_quality",
                    "issue": "Missing title tag",
                    "seo_impact": "High",
                    "ai_impact": "High",
                    "difficulty": "Easy",
                    "time_to_fix": "5 minutes",
                    "expected_effect": "Title is the most critical on-page ranking factor. AI systems use titles as primary content summaries.",
                }
            )
        elif title_len < 30:
            issues.append(
                {
                    "id": "title_too_short",
                    "category": "content_quality",
                    "issue": f"Title tag too short ({title_len} chars, recommended: 30-65)",
                    "seo_impact": "Medium",
                    "ai_impact": "Medium",
                    "difficulty": "Easy",
                    "time_to_fix": "5 minutes",
                    "expected_effect": "Longer, descriptive titles provide more context for ranking and AI understanding.",
                }
            )
        elif title_len > 65:
            issues.append(
                {
                    "id": "title_too_long",
                    "category": "content_quality",
                    "issue": f"Title tag too long ({title_len} chars, recommended: 30-65)",
                    "seo_impact": "Medium",
                    "ai_impact": "Low",
                    "difficulty": "Easy",
                    "time_to_fix": "5 minutes",
                    "expected_effect": "Title will be truncated in SERPs, losing click-through rate.",
                }
            )
        if not has_h1:
            issues.append(
                {
                    "id": "missing_h1",
                    "category": "content_quality",
                    "issue": "No H1 tag found",
                    "seo_impact": "High",
                    "ai_impact": "Medium",
                    "difficulty": "Easy",
                    "time_to_fix": "5 minutes",
                    "expected_effect": "H1 is the primary heading signal for search engines. Critical for content hierarchy.",
                }
            )
        if not has_meta:
            issues.append(
                {
                    "id": "missing_meta_desc",
                    "category": "content_quality",
                    "issue": "Missing meta description",
                    "seo_impact": "Medium",
                    "ai_impact": "Medium",
                    "difficulty": "Easy",
                    "time_to_fix": "5 minutes",
                    "expected_effect": "Meta description influences CTR in SERPs and is used by AI systems for content summaries.",
                }
            )
        elif meta_len > 160:
            issues.append(
                {
                    "id": "meta_too_long",
                    "category": "content_quality",
                    "issue": f"Meta description too long ({meta_len} chars, recommended: 120-160)",
                    "seo_impact": "Low",
                    "ai_impact": "Low",
                    "difficulty": "Easy",
                    "time_to_fix": "5 minutes",
                    "expected_effect": "Will be truncated in search results.",
                }
            )
        if word_count < 300:
            issues.append(
                {
                    "id": "thin_content",
                    "category": "content_quality",
                    "issue": f"Very thin content ({word_count} words, recommended: 1500+)",
                    "seo_impact": "High",
                    "ai_impact": "High",
                    "difficulty": "Hard",
                    "time_to_fix": "4-8 hours",
                    "expected_effect": "Thin content rarely ranks. AI systems prefer comprehensive sources for citation.",
                }
            )
        elif word_count < 800:
            issues.append(
                {
                    "id": "short_content",
                    "category": "content_quality",
                    "issue": f"Content could be more comprehensive ({word_count} words)",
                    "seo_impact": "Medium",
                    "ai_impact": "Medium",
                    "difficulty": "Medium",
                    "time_to_fix": "2-4 hours",
                    "expected_effect": "Expanding content depth improves topical authority and AI citation potential.",
                }
            )
        no_alt = img_count - imgs_with_alt
        if no_alt > 0:
            issues.append(
                {
                    "id": "missing_alt_text",
                    "category": "content_quality",
                    "issue": f"{no_alt} of {img_count} images missing alt text",
                    "seo_impact": "Medium",
                    "ai_impact": "Medium",
                    "difficulty": "Easy",
                    "time_to_fix": "15-30 minutes",
                    "expected_effect": "Alt text improves image SEO and accessibility. AI systems use alt text for content understanding.",
                }
            )
        if internal_link_count < 3:
            issues.append(
                {
                    "id": "few_internal_links",
                    "category": "internal_linking",
                    "issue": f"Very few internal links ({internal_link_count})",
                    "seo_impact": "High",
                    "ai_impact": "Medium",
                    "difficulty": "Medium",
                    "time_to_fix": "30-60 minutes",
                    "expected_effect": "Internal links distribute page authority and help search engines understand site structure.",
                }
            )
        if not schema_types:
            issues.append(
                {
                    "id": "no_schema",
                    "category": "schema_coverage",
                    "issue": "No structured data (schema.org) detected",
                    "seo_impact": "High",
                    "ai_impact": "High",
                    "difficulty": "Medium",
                    "time_to_fix": "1-2 hours",
                    "expected_effect": "Schema markup enables rich results and helps AI systems understand content context.",
                }
            )
        else:
            expected = set(
                self.EXPECTED_SCHEMAS.get(page_type, self.EXPECTED_SCHEMAS["default"])
            )
            missing = expected - set(schema_types)
            if missing:
                issues.append(
                    {
                        "id": "incomplete_schema",
                        "category": "schema_coverage",
                        "issue": f"Missing expected schema types: {', '.join(sorted(missing))}",
                        "seo_impact": "Medium",
                        "ai_impact": "Medium",
                        "difficulty": "Medium",
                        "time_to_fix": "30-60 minutes",
                        "expected_effect": "Complete schema coverage improves rich snippet eligibility.",
                    }
                )
        if not has_faq:
            issues.append(
                {
                    "id": "no_faq",
                    "category": "ai_search_readiness",
                    "issue": "No FAQ section detected",
                    "seo_impact": "Medium",
                    "ai_impact": "High",
                    "difficulty": "Medium",
                    "time_to_fix": "1-2 hours",
                    "expected_effect": "FAQ content is highly citable by AI systems and eligible for FAQ rich results.",
                }
            )
        if definition_count < 2:
            issues.append(
                {
                    "id": "few_definitions",
                    "category": "ai_search_readiness",
                    "issue": f"Limited definitional content ({definition_count} patterns found)",
                    "seo_impact": "Low",
                    "ai_impact": "High",
                    "difficulty": "Easy",
                    "time_to_fix": "30 minutes",
                    "expected_effect": "Clear definitions are the most cited content format by AI systems.",
                }
            )
        if citation_count < 2:
            issues.append(
                {
                    "id": "few_citations",
                    "category": "e_e_a_t",
                    "issue": "Insufficient external references and citations",
                    "seo_impact": "Medium",
                    "ai_impact": "Medium",
                    "difficulty": "Medium",
                    "time_to_fix": "30-60 minutes",
                    "expected_effect": "External references support E-E-A-T signals and provide source verification for AI systems.",
                }
            )
        if response_time_ms > 3000:
            issues.append(
                {
                    "id": "slow_response",
                    "category": "performance",
                    "issue": f"Very slow response time ({response_time_ms:.0f}ms)",
                    "seo_impact": "High",
                    "ai_impact": "Low",
                    "difficulty": "Hard",
                    "time_to_fix": "4-8 hours",
                    "expected_effect": "Slow pages lose rankings and users. Core Web Vitals directly impact ranking.",
                }
            )
        elif response_time_ms > 1500:
            issues.append(
                {
                    "id": "moderate_response",
                    "category": "performance",
                    "issue": f"Response time could be improved ({response_time_ms:.0f}ms)",
                    "seo_impact": "Medium",
                    "ai_impact": "Low",
                    "difficulty": "Medium",
                    "time_to_fix": "2-4 hours",
                    "expected_effect": "Faster pages improve user experience signals and crawl efficiency.",
                }
            )
        if len(entity_mentions) < 5:
            issues.append(
                {
                    "id": "few_entities",
                    "category": "ai_search_readiness",
                    "issue": f"Limited named entity coverage ({len(entity_mentions)} entities)",
                    "seo_impact": "Low",
                    "ai_impact": "High",
                    "difficulty": "Medium",
                    "time_to_fix": "1-2 hours",
                    "expected_effect": "Rich entity coverage helps AI systems contextualize content for retrieval.",
                }
            )

        return issues

    def _generate_before_after(
        self,
        *,
        title: str,
        h1: str,
        meta_description: str,
        content_text: str,
        has_faq: bool,
        schema_types: list[str],
        page_type: str,
        url: str,
        definition_count: int,
        entity_mentions: dict[str, int],
    ) -> dict[str, dict]:
        topic = self._guess_topic(title, h1, content_text)
        primary_kw = self._guess_primary_keyword(title, h1, content_text)

        recommended_title = (
            f"{topic}: Complete Guide & Expert Analysis [2026]" if topic else title
        )
        if len(recommended_title) > 65:
            recommended_title = f"{topic}: Expert Guide [2026]" if topic else _truncate(title, 62)

        recommended_h1 = f"{topic}: Everything You Need to Know" if topic else h1

        rec_meta = (
            f"Learn about {primary_kw or topic} with our comprehensive guide. "
            f"Expert insights, practical tips, and proven strategies."
        )
        if len(rec_meta) > 160:
            rec_meta = _truncate(rec_meta, 157)

        sentences = _sentences(content_text)
        intro = sentences[0] if sentences else ""
        optimized_intro = (
            f"{primary_kw or topic} is a critical concept in modern digital strategy. "
            f"This comprehensive guide covers everything you need to know, from fundamentals "
            f"to advanced techniques, backed by expert analysis and real-world examples."
        )
        if intro:
            optimized_intro = f"{intro.rstrip('.')}. Our expert analysis covers the key dimensions that practitioners need to understand, from foundational principles to advanced implementation strategies."

        missing_schemas = set(
            self.EXPECTED_SCHEMAS.get(page_type, self.EXPECTED_SCHEMAS["default"])
        ) - set(schema_types)
        missing_schema_snippets: list[str] = []
        for ms in sorted(missing_schemas):
            if ms == "FAQPage":
                missing_schema_snippets.append(
                    json.dumps(
                        {
                            "@context": "https://schema.org",
                            "@type": "FAQPage",
                            "mainEntity": [
                                {
                                    "@type": "Question",
                                    "name": f"What is {primary_kw or topic}?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": f"{primary_kw or topic} refers to the practice of optimizing web content for improved visibility in search engines and AI-powered platforms.",
                                    },
                                },
                                {
                                    "@type": "Question",
                                    "name": f"Why is {primary_kw or topic} important?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": f"{primary_kw or topic} is important because it directly impacts search visibility, user engagement, and AI citation rates across major platforms.",
                                    },
                                },
                            ],
                        },
                        indent=2,
                    )
                )
            elif ms == "BreadcrumbList":
                missing_schema_snippets.append(
                    json.dumps(
                        {
                            "@context": "https://schema.org",
                            "@type": "BreadcrumbList",
                            "itemListElement": [
                                {"@type": "ListItem", "position": 1, "name": "Home", "item": url.split("//")[0] + "//" + url.split("//")[1].split("/")[0] if "//" in url else "/"},
                                {"@type": "ListItem", "position": 2, "name": topic or "Guide", "item": url},
                            ],
                        },
                        indent=2,
                    )
                )
            elif ms == "Organization":
                missing_schema_snippets.append(
                    json.dumps(
                        {
                            "@context": "https://schema.org",
                            "@type": "Organization",
                            "name": "Your Organization",
                            "url": url.split("/")[0] + "//" + url.split("/")[2] if "/" in url else url,
                        },
                        indent=2,
                    )
                )

        generated_faq = None
        if not has_faq:
            generated_faq = [
                {
                    "question": f"What is {primary_kw or topic}?",
                    "answer": f"{primary_kw or topic} is a key concept that refers to the systematic approach of optimizing digital content for maximum visibility in search engines and AI-powered answer systems.",
                },
                {
                    "question": f"Why is {primary_kw or topic} important for businesses?",
                    "answer": f"{primary_kw or topic} is critical because it directly affects organic search rankings, user acquisition costs, and how AI platforms cite and recommend your content to users.",
                },
                {
                    "question": f"How do I improve my {primary_kw or topic}?",
                    "answer": f"To improve your {primary_kw or topic}, focus on creating comprehensive, well-structured content with clear definitions, FAQ sections, schema markup, and strong internal linking.",
                },
                {
                    "question": f"How long does it take to see results from {primary_kw or topic}?",
                    "answer": f"Most implementations show measurable improvements within 4-8 weeks. Technical fixes can yield faster results, while content quality improvements compound over time.",
                },
            ]

        return {
            "title": {
                "current": title or "(missing)",
                "recommended": recommended_title,
                "reason": f"Optimized to {len(recommended_title)} characters with primary keyword and freshness signal.",
            },
            "h1": {
                "current": h1 or "(missing)",
                "recommended": recommended_h1,
                "reason": "Structured for clarity and keyword inclusion while remaining natural.",
            },
            "meta_description": {
                "current": meta_description or "(missing)",
                "recommended": rec_meta,
                "reason": f"Optimized to {len(rec_meta)} characters with clear value proposition and CTA.",
            },
            "intro": {
                "current": _truncate(intro, 200) if intro else "(no intro detected)",
                "recommended": optimized_intro,
                "reason": "Enhanced with definitional pattern and expertise signals for AI extractability.",
            },
            "generated_faq": generated_faq,
            "generated_schema": missing_schema_snippets if missing_schema_snippets else None,
        }

    def _guess_topic(self, title: str, h1: str, content_text: str) -> str:
        text = title or h1
        if not text:
            words = _WORD_RE.findall(content_text[:500])
            return " ".join(words[:5]) if words else ""
        text = re.sub(r"\s*[-:|]\s*.*$", "", text).strip()
        words = _WORD_RE.findall(text)
        return " ".join(words[:8]) if words else ""

    def _guess_primary_keyword(self, title: str, h1: str, content_text: str) -> str:
        text = (h1 or title).strip()
        if text:
            return text
        words = _WORD_RE.findall(content_text[:300].lower())
        if words:
            return " ".join(words[:4])
        return ""

    def _compute_competitor_stats(
        self, all_pages: list[dict], current_page: dict
    ) -> dict[str, Any]:
        if not all_pages:
            return {
                "note": "No other pages available for comparison",
                "word_count_vs_avg": 0,
                "faq_count_vs_avg": 0,
                "schema_types_vs_avg": 0,
                "internal_links_vs_avg": 0,
                "content_depth_vs_avg": 0,
            }

        peer_pages = [
            p
            for p in all_pages
            if p.get("url") != current_page.get("url")
            and p.get("page_type", "").lower() == current_page.get("page_type", "").lower()
        ]
        if not peer_pages:
            peer_pages = [p for p in all_pages if p.get("url") != current_page.get("url")]
        if not peer_pages:
            peer_pages = all_pages

        wc_list = [
            _safe_int(p.get("word_count", _count_words(str(p.get("content_text", "")))))
            for p in peer_pages
        ]
        avg_wc = _avg(wc_list) if wc_list else 0
        current_wc = _safe_int(
            current_page.get("word_count", _count_words(str(current_page.get("content_text", ""))))
        )

        def _has_faq_page(p: dict) -> bool:
            ct = str(p.get("content_text", ""))
            return bool(_FQA_RE.search(ct))

        faq_avg = _avg([1.0 if _has_faq_page(p) else 0.0 for p in peer_pages]) if peer_pages else 0
        current_faq = 1.0 if _has_faq_page(current_page) else 0.0

        schema_avgs: list[float] = []
        for p in peer_pages:
            st = p.get("schema_markup", [])
            if isinstance(st, list):
                schema_avgs.append(float(len(st)))
            else:
                schema_avgs.append(0.0)
        avg_schemas = _avg(schema_avgs) if schema_avgs else 0
        current_schemas = float(
            len(current_page.get("schema_markup", []))
            if isinstance(current_page.get("schema_markup"), list)
            else 0
        )

        link_avgs: list[float] = []
        for p in peer_pages:
            li = p.get("links_internal", [])
            link_avgs.append(float(len(li)) if isinstance(li, list) else 0.0)
        avg_links = _avg(link_avgs) if link_avgs else 0
        current_links = float(
            len(current_page.get("links_internal", []))
            if isinstance(current_page.get("links_internal"), list)
            else 0
        )

        depth_avg = _avg(wc_list) if wc_list else 0

        def _vs(val: float, avg_val: float) -> dict[str, Any]:
            diff = val - avg_val
            pct = (diff / avg_val * 100) if avg_val > 0 else (0.0 if diff == 0 else 100.0)
            return {
                "current": round(val, 1),
                "average": round(avg_val, 1),
                "difference": round(diff, 1),
                "percent_vs_average": round(_safe_float(pct), 1),
                "position": "above" if diff > 0 else ("below" if diff < 0 else "at"),
            }

        return {
            "peers_analyzed": len(peer_pages),
            "word_count_vs_avg": _vs(float(current_wc), avg_wc),
            "faq_count_vs_avg": _vs(current_faq, faq_avg),
            "schema_types_vs_avg": _vs(current_schemas, avg_schemas),
            "internal_links_vs_avg": _vs(current_links, avg_links),
            "content_depth_vs_avg": _vs(float(current_wc), depth_avg),
        }

    def _compute_ai_scores(
        self,
        *,
        definition_count: int,
        has_faq: bool,
        entity_mentions: dict[str, int],
        citation_count: int,
        word_count: int,
        content_text: str,
        schema_types: list[str],
        heading_tags: list[int],
        sentence_count: int,
        avg_sentence_len: float,
    ) -> dict[str, dict]:
        entity_count = len(entity_mentions)
        base = 30.0
        base += min(15.0, definition_count * 5.0)
        base += 15.0 if has_faq else 0
        base += min(12.0, entity_count * 1.2)
        base += min(8.0, citation_count * 4.0)
        base += 10.0 if word_count >= 1000 else (5.0 if word_count >= 500 else 0)
        base += min(5.0, len(heading_tags) * 0.8)
        if avg_sentence_len > 0 and avg_sentence_len < 22:
            base += 5.0
        base = _clamp(base)

        platform_weights: dict[str, dict[str, float]] = {
            "ChatGPT": {"definitions": 1.2, "faq": 1.3, "entities": 0.9, "citations": 0.8},
            "Gemini": {"definitions": 1.0, "faq": 1.0, "entities": 1.3, "citations": 1.1},
            "Perplexity": {"definitions": 1.1, "faq": 1.4, "entities": 1.0, "citations": 1.3},
            "Google AI Overview": {"definitions": 1.0, "faq": 1.1, "entities": 1.2, "citations": 1.0},
            "Claude": {"definitions": 1.3, "faq": 1.1, "entities": 1.1, "citations": 1.2},
        }

        platform_scores: dict[str, dict] = {}
        for platform, weights in platform_weights.items():
            ps = 20.0
            ps += min(18.0, definition_count * 6.0) * weights["definitions"]
            ps += (15.0 if has_faq else 0.0) * weights["faq"]
            ps += min(12.0, entity_count * 1.5) * weights["entities"]
            ps += min(10.0, citation_count * 5.0) * weights["citations"]
            ps += 8.0 if word_count >= 1000 else 3.0
            ps += 5.0 if len(schema_types) > 0 else 0
            if avg_sentence_len > 0 and avg_sentence_len < 20:
                ps += 5.0
            ps = _clamp(ps)

            improvements: list[str] = []
            if definition_count < 2:
                improvements.append("Add more definitional sentences")
            if not has_faq:
                improvements.append("Add FAQ section")
            if entity_count < 8:
                improvements.append("Include more named entities")
            if citation_count < 2:
                improvements.append("Add external references")

            platform_scores[platform] = {
                "score": round(ps, 1),
                "improvements": improvements,
            }

        return platform_scores

    def _biggest_ai_improvement(self, ai_scores: dict[str, dict]) -> str:
        if not ai_scores:
            return ""
        lowest_platform = min(ai_scores.items(), key=lambda x: x[1]["score"])
        return lowest_platform[0]

    def _analyze_entities(
        self,
        *,
        entity_mentions: dict[str, int],
        content_text: str,
        page_type: str,
    ) -> dict[str, Any]:
        all_possible = self.COMMON_ENTITIES
        detected = {k: v for k, v in entity_mentions.items() if k in all_possible}
        missing = [e for e in all_possible if e not in detected and len(detected) < 15]
        missing = missing[:10]

        if missing:
            missing_text = (
                "Key concepts include " + ", ".join(missing[:5]) + ", "
                "which are essential for understanding this topic comprehensively. "
                "Additionally, " + ", ".join(missing[5:10] if len(missing) > 5 else missing[:3]) +
                " represent important dimensions that practitioners should consider."
            )
        else:
            missing_text = "Entity coverage appears comprehensive."

        return {
            "detected_entities": [
                {"entity": k, "mention_count": v}
                for k, v in sorted(detected.items(), key=lambda x: -x[1])
            ],
            "missing_entities": missing,
            "entity_count": len(detected),
            "suggested_paragraph": missing_text,
        }

    def _analyze_internal_links(
        self,
        *,
        links_internal: list[dict],
        content_text: str,
        url: str,
        all_pages: list[dict],
    ) -> dict[str, Any]:
        existing_urls = {str(l.get("url", "")) for l in links_internal}
        suggestions: list[dict] = []

        for p in all_pages:
            p_url = str(p.get("url", ""))
            if not p_url or p_url == url or p_url in existing_urls:
                continue
            p_title = str(p.get("title", ""))
            p_type = str(p.get("page_type", ""))
            anchor = p_title[:50] if p_title else p_url.split("/")[-1].replace("-", " ").title()

            relevance = self._estimate_link_relevance(
                content_text=content_text,
                target_url=p_url,
                target_title=p_title,
                target_type=p_type,
            )
            if relevance["score"] > 30:
                suggestions.append(
                    {
                        "anchor_text": anchor,
                        "destination_url": p_url,
                        "reason": relevance["reason"],
                        "confidence_score": round(relevance["score"], 1),
                    }
                )

        suggestions.sort(key=lambda x: -x["confidence_score"])
        suggestions = suggestions[:10]

        existing_anchors = [str(l.get("anchor", "")) for l in links_internal if l.get("anchor")]

        return {
            "current_internal_links": len(links_internal),
            "existing_anchor_texts": existing_anchors[:20],
            "suggested_links": suggestions,
            "total_suggestions": len(suggestions),
        }

    def _estimate_link_relevance(
        self,
        *,
        content_text: str,
        target_url: str,
        target_title: str,
        target_type: str,
    ) -> dict[str, Any]:
        score = 20.0
        reason_parts: list[str] = []
        content_lower = content_text.lower()
        title_words = _WORD_RE.findall(target_title.lower())
        overlap = sum(1 for w in title_words if w in content_lower and len(w) > 3)
        if overlap >= 3:
            score += 30
            reason_parts.append(f"Strong topical relevance ({overlap} keyword overlaps)")
        elif overlap >= 1:
            score += 15
            reason_parts.append(f"Moderate topical relevance ({overlap} keyword overlaps)")
        else:
            reason_parts.append("Low topical overlap but complementary content")

        url_path = target_url.lower()
        if "blog" in url_path or "guide" in url_path or "how-to" in url_path:
            score += 10
            reason_parts.append("Content-type link adds value")
        elif "service" in url_path or "product" in url_path:
            score += 5
            reason_parts.append("Service/product link for conversion path")
        elif "about" in url_path:
            score += 3
            reason_parts.append("Supports trust signals")

        if target_type in ("blog", "article", "guide"):
            score += 8
            reason_parts.append(f"High-value {target_type} content")
        elif target_type in ("product", "service"):
            score += 5

        content_words = _count_words(content_text)
        if content_words > 1000 and overlap >= 2:
            score += 5

        return {
            "score": _clamp(score),
            "reason": "; ".join(reason_parts) if reason_parts else "General internal linking",
        }

    def _build_action_plan(
        self,
        *,
        issues: list[dict],
        overall_current: float,
        after_all: float,
    ) -> dict[str, list[dict]]:
        critical: list[dict] = []
        high: list[dict] = []
        medium: list[dict] = []

        for issue in issues:
            entry = {
                "issue": issue["issue"],
                "category": issue["category"],
                "difficulty": issue["difficulty"],
                "time_to_fix": issue["time_to_fix"],
                "expected_effect": issue["expected_effect"],
            }
            if issue["seo_impact"] == "High":
                critical.append(entry)
            elif issue["seo_impact"] == "Medium":
                high.append(entry)
            else:
                medium.append(entry)

        return {
            "critical_today": critical,
            "high_this_week": high,
            "medium_next_month": medium,
        }

    def _estimate_business_impact(
        self,
        *,
        overall_current: float,
        after_all: float,
        critical_count: int,
        medium_count: int,
        low_count: int,
        word_count: int,
        internal_link_count: int,
        ai_scores: dict[str, dict],
    ) -> dict[str, Any]:
        score_delta = after_all - overall_current
        ranking_positions = _clamp(score_delta * 0.15 + critical_count * 0.4, 0, 25)

        if overall_current < 30:
            traffic_multiplier = 1.8
        elif overall_current < 50:
            traffic_multiplier = 1.5
        elif overall_current < 70:
            traffic_multiplier = 1.3
        else:
            traffic_multiplier = 1.15

        base_traffic_est = max(100, word_count * 0.5 + internal_link_count * 20)
        potential_gain = base_traffic_est * (traffic_multiplier - 1.0)

        avg_ai = _avg([s["score"] for s in ai_scores.values()]) if ai_scores else 0
        ai_improvement_pct = _clamp(
            ((85 - avg_ai) / max(avg_ai, 1)) * 100, 0, 300
        )

        ctr_impact_pct = _clamp(
            critical_count * 1.2 + medium_count * 0.5 + score_delta * 0.1, 0, 25
        )

        return {
            "expected_ranking_positions_gained": round(ranking_positions, 1),
            "potential_monthly_traffic_gain": round(potential_gain, 0),
            "ai_citation_improvement_percent": round(ai_improvement_pct, 1),
            "estimated_ctr_impact_percent": round(ctr_impact_pct, 1),
            "confidence_level": "Estimated based on page analysis heuristics",
        }

    def _build_summary(
        self,
        *,
        overall_current: float,
        after_all: float,
        critical_count: int,
        medium_count: int,
        category_scores: dict[str, dict],
        ai_scores: dict[str, dict],
        page_type: str,
        url: str,
    ) -> str:
        weakest = min(category_scores.items(), key=lambda x: x[1]["score"])
        strongest = max(category_scores.items(), key=lambda x: x[1]["score"])
        avg_ai = _avg([s["score"] for s in ai_scores.values()]) if ai_scores else 0

        cat_display = {
            "technical_seo": "Technical SEO",
            "content_quality": "Content Quality",
            "ai_search_readiness": "AI Search Readiness",
            "schema_coverage": "Schema Coverage",
            "e_e_a_t": "E-E-A-T",
            "performance": "Performance",
            "internal_linking": "Internal Linking",
        }

        return (
            f"Page Intelligence V2 analysis of {url} ({page_type} page). "
            f"Overall score: {overall_current:.0f}/100. "
            f"Strongest category: {cat_display.get(strongest[0], strongest[0])} "
            f"({strongest[1]['score']:.0f}/100). "
            f"Weakest category: {cat_display.get(weakest[0], weakest[0])} "
            f"({weakest[1]['score']:.0f}/100). "
            f"{critical_count} critical issues, {medium_count} medium issues found. "
            f"AI search readiness averages {avg_ai:.0f}/100 across platforms. "
            f"After all fixes, estimated score improves to {after_all:.0f}/100."
        )
