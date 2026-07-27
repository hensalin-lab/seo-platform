import re
import hashlib
import math
from collections import Counter
from typing import Any


_STOP_WORDS = frozenset(
    "a about above after again against all am an and any are aren't as at be because been before being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further get got had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up us very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's will with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves"
)


_SCHEMA_PAGE_TYPE_MAP = {
    "article": ["Article", "WebPage", "BreadcrumbList"],
    "blog_post": ["Article", "BlogPosting", "WebPage", "BreadcrumbList"],
    "product": ["Product", "WebPage", "BreadcrumbList", "Offer"],
    "category": ["ItemList", "CollectionPage", "WebPage", "BreadcrumbList"],
    "homepage": ["WebSite", "Organization", "WebPage", "BreadcrumbList"],
    "service": ["Service", "WebPage", "BreadcrumbList", "FAQPage"],
    "about": ["AboutPage", "Organization", "WebPage", "BreadcrumbList"],
    "contact": ["ContactPage", "Organization", "WebPage", "BreadcrumbList"],
    "faq": ["FAQPage", "WebPage", "BreadcrumbList"],
    "landing_page": ["WebPage", "BreadcrumbList"],
    "documentation": ["TechArticle", "WebPage", "BreadcrumbList"],
    "news": ["NewsArticle", "WebPage", "BreadcrumbList"],
    "review": ["Review", "WebPage", "BreadcrumbList"],
    "video": ["VideoObject", "WebPage", "BreadcrumbList"],
    "event": ["Event", "WebPage", "BreadcrumbList"],
    "recipe": ["Recipe", "WebPage", "BreadcrumbList"],
    "local_business": ["LocalBusiness", "WebPage", "BreadcrumbList"],
}


class PageIntelligenceEngine:

    def analyze(self, page: dict[str, Any]) -> dict[str, Any]:
        html = page.get("html_raw", "")
        url = page.get("url", "")
        page_type = page.get("page_type", "unknown")
        headings = page.get("headings", [])
        images = page.get("images", [])
        links_internal = page.get("links_internal", [])
        links_external = page.get("links_external", [])
        schema_markup = page.get("schema_markup", [])
        open_graph = page.get("open_graph", {}) or {}
        twitter_card = page.get("twitter_card", {}) or {}
        content_text = page.get("content_text", "")
        word_count = page.get("word_count", 0)

        sub_views = {}
        sub_views["googlebot_view"] = self._googlebot_view(html, page)
        sub_views["browser_view"] = self._browser_view(html, page, open_graph)
        sub_views["mobile_view"] = self._mobile_view(html, page)
        sub_views["ai_search_view"] = self._ai_search_view(html, content_text, headings, schema_markup)
        sub_views["crawl_path"] = self._crawl_path(page, links_internal)
        sub_views["dom_tree"] = self._dom_tree(html)
        sub_views["heading_hierarchy"] = self._heading_hierarchy(headings)
        sub_views["internal_link_graph"] = self._internal_link_graph(links_internal, url)
        sub_views["external_link_graph"] = self._external_link_graph(links_external)
        sub_views["schema_viewer"] = self._schema_viewer(schema_markup, page_type)
        sub_views["entity_extraction"] = self._entity_extraction(content_text)
        sub_views["content_blocks"] = self._content_blocks(html, content_text)
        sub_views["keyword_map"] = self._keyword_map(content_text)
        sub_views["core_web_vitals"] = self._core_web_vitals(html, images)
        sub_views["accessibility_issues"] = self._accessibility_issues(html, images, headings)
        sub_views["security_issues"] = self._security_issues(html, page)
        sub_views["javascript_rendering"] = self._javascript_rendering(html)
        sub_views["indexability_status"] = self._indexability_status(html, page)
        sub_views["canonical_validation"] = self._canonical_validation(page)
        sub_views["duplicate_detection"] = self._duplicate_detection(html, content_text, word_count)
        sub_views["eeat_analysis"] = self._eeat_analysis(html, content_text, schema_markup, page)
        sub_views["ai_citation_readiness"] = self._ai_citation_readiness(content_text, headings)
        sub_views["featured_snippet_readiness"] = self._featured_snippet_readiness(html, content_text, headings)
        sub_views["knowledge_graph_readiness"] = self._knowledge_graph_readiness(schema_markup, open_graph, content_text)

        overall_score = self._compute_overall_score(sub_views)

        return {
            "url": url,
            "page_type": page_type,
            "overall_score": overall_score,
            "sub_views": sub_views,
        }

    # ---------- helpers ----------

    @staticmethod
    def _strip_tags(html: str) -> str:
        return re.sub(r"<[^>]+>", " ", html)

    @staticmethod
    def _extract_title_tag(html: str) -> str:
        m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
        return m.group(1).strip() if m else ""

    @staticmethod
    def _meta_content(html: str, name: str) -> str:
        pattern = rf'<meta\s[^>]*name=["\']{re.escape(name)}["\'][^>]*content=["\']([^"\']*)["\']'
        m = re.search(pattern, html, re.I)
        if m:
            return m.group(1).strip()
        pattern2 = rf'<meta\s[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']{re.escape(name)}["\']'
        m2 = re.search(pattern2, html, re.I)
        return m2.group(1).strip() if m2 else ""

    @staticmethod
    def _meta_property(html: str, prop: str) -> str:
        pattern = rf'<meta\s[^>]*property=["\']{re.escape(prop)}["\'][^>]*content=["\']([^"\']*)["\']'
        m = re.search(pattern, html, re.I)
        if m:
            return m.group(1).strip()
        pattern2 = rf'<meta\s[^>]*content=["\']([^"\']*)["\'][^>]*property=["\']{re.escape(prop)}["\']'
        m2 = re.search(pattern2, html, re.I)
        return m2.group(1).strip() if m2 else ""

    @staticmethod
    def _meta_value(html: str, key: str) -> str:
        v = PageIntelligenceEngine._meta_content(html, key)
        if v:
            return v
        return PageIntelligenceEngine._meta_property(html, key)

    @staticmethod
    def _tag_exists(html: str, tag: str) -> bool:
        return bool(re.search(rf"<{tag}[\s>]", html, re.I))

    @staticmethod
    def _count_pattern(html: str, pattern: str) -> int:
        return len(re.findall(pattern, html, re.I))

    @staticmethod
    def _text_to_words(text: str) -> list[str]:
        cleaned = re.sub(r"[^a-zA-Z0-9\s'-]", " ", text.lower())
        words = cleaned.split()
        return [w for w in words if len(w) > 2 and w not in _STOP_WORDS]

    @staticmethod
    def _content_hash(text: str) -> str:
        normalised = re.sub(r"\s+", " ", text.lower().strip())
        return hashlib.sha256(normalised.encode("utf-8")).hexdigest()[:16]

    # ---------- 1. googlebot_view ----------

    def _googlebot_view(self, html: str, page: dict) -> dict:
        rendered_size = len(html.encode("utf-8", errors="replace"))
        js_patterns = [
            r"document\.write",
            r"window\.location\s*=",
            r"location\.href\s*=",
            r"setTimeout\s*\(",
            r"setInterval\s*\(",
            r"XMLHttpRequest",
            r"fetch\s*\(",
            r"\.ajax\s*\(",
            r"addEventListener\s*\(\s*['\"]load['\"]",
            r"DOMContentLoaded",
        ]
        js_required = any(re.search(p, html, re.I) for p in js_patterns)

        render_blocking = self._count_pattern(html, r'<script\s[^>]*(?!async|defer)[^>]*src=["\']') > 0

        resource_blocking = (
            self._count_pattern(html, r'<link\s[^>]*rel=["\']stylesheet["\'][^>]*href=["\']') > 2
            or render_blocking
        )

        server_rendered = bool(re.search(r"__NEXT_DATA__|__NUXT__|__APP_DATA__|window\.__PRELOADED_STATE__", html))

        meta_tags = bool(
            self._meta_content(html, "description")
            or self._meta_property(html, "og:description")
        )

        canonical = re.search(r'<link\s[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']', html, re.I)
        canonical_correct = bool(canonical)

        robots = self._meta_content(html, "robots").lower()
        robots_directive = robots if robots else "index, follow"

        sitemap_inclusion = not any(
            term in robots for term in ["noindex", "nosnippet"]
        )

        return {
            "rendered_html_size": rendered_size,
            "javascript_required": js_required,
            "resource_blocking": resource_blocking,
            "server_rendered": server_rendered,
            "meta_tags_present": meta_tags,
            "canonical_correct": canonical_correct,
            "robots_directive": robots_directive,
            "xml_sitemap_inclusion": sitemap_inclusion,
        }

    # ---------- 2. browser_view ----------

    def _browser_view(self, html: str, page: dict, og: dict) -> dict:
        title = self._extract_title_tag(html)
        title_display = len(title) > 0 and len(title) <= 60

        meta_desc = self._meta_content(html, "description")
        meta_desc_display = 0 < len(meta_desc) <= 160

        og_image = bool(og.get("image") or og.get("image:url") or self._meta_property(html, "og:image"))

        fav_icon = bool(re.search(r'<link\s[^>]*rel=["\'][^"\']*icon[^"\']*["\']', html, re.I))

        viewport = self._meta_content(html, "viewport")
        viewport_config = "width=device-width" in viewport if viewport else False

        font_loading = bool(re.search(r'font-display\s*:\s*(swap|optional|fallback)', html, re.I))

        inline_styles = re.findall(r"style\s*=\s*[\"'][^\"']*[\"']", html)
        large_dimensions = sum(
            1 for s in inline_styles
            if re.search(r"(width|height)\s*:\s*\d{4,}px", s)
        )
        layout_stability = large_dimensions == 0

        interactive_patterns = [r"<button", r"<input", r"<select", r"<textarea", r"<a\s", r"onclick"]
        interactive_count = sum(self._count_pattern(html, p) for p in interactive_patterns)
        interactive_elements = interactive_count > 0

        return {
            "title_display": title_display,
            "meta_desc_display": meta_desc_display,
            "og_image": og_image,
            "fav_icon": fav_icon,
            "viewport_config": viewport_config,
            "font_loading": font_loading,
            "layout_stability": layout_stability,
            "interactive_elements": interactive_elements,
        }

    # ---------- 3. mobile_view ----------

    def _mobile_view(self, html: str, page: dict) -> dict:
        viewport = self._meta_content(html, "viewport")
        viewport_present = bool(viewport) and "width=device-width" in viewport

        font_sizes = re.findall(r"font-size\s*:\s*(\d+)(px|rem|em)", html)
        bad_fonts = sum(1 for val, unit in font_sizes if unit == "px" and int(val) < 12)
        font_size_ok = bad_fonts == 0

        tap_targets = re.findall(r'<(a|button|input|select|textarea)\s[^>]*>', html, re.I)
        small_taps = 0
        for tag in tap_targets:
            width_match = re.search(r'width\s*:\s*(\d+)', tag)
            if width_match and int(width_match.group(1)) < 24:
                small_taps += 1
        tap_targets_ok = small_taps == 0

        horizontal_scroll = not bool(re.search(r"overflow-x\s*:\s*scroll", html, re.I))

        content_width = "max-width" in html or "width: 100%" in html or "width:100%" in html

        img_tags = re.findall(r"<img\s[^>]*>", html, re.I)
        responsive_images = all(
            re.search(r"(srcset|sizes|loading\s*=\s*['\"]lazy['\"])", tag, re.I)
            or re.search(r"max-width\s*:\s*100%", tag, re.I)
            for tag in img_tags
        ) if img_tags else True

        score = 100
        if not viewport_present:
            score -= 30
        if not font_size_ok:
            score -= 10
        if not tap_targets_ok:
            score -= 15
        if not horizontal_scroll:
            score -= 15
        if not content_width:
            score -= 10
        if not responsive_images:
            score -= 10

        return {
            "viewport_present": viewport_present,
            "font_size_ok": font_size_ok,
            "tap_targets_ok": tap_targets_ok,
            "horizontal_scroll": horizontal_scroll,
            "content_width": content_width,
            "responsive_images": responsive_images,
            "mobile_usability_score": max(0, score),
        }

    # ---------- 4. ai_search_view ----------

    def _ai_search_view(self, html: str, text: str, headings: list, schemas: list) -> dict:
        sentences = re.split(r"[.!?]+", text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

        bluf_score = 0
        if sentences and len(sentences[0]) > 30:
            first_words = sentences[0].lower().split()[:8]
            bluf_triggers = ["what", "how", "why", "guide", "definition", "means", "refers", "is a", "are a", "is an"]
            if any(t in " ".join(first_words) for t in bluf_triggers):
                bluf_score += 30
            if len(sentences[0]) > 100:
                bluf_score += 20
        bluf_score = min(100, bluf_score + 50 if bluf_score > 0 else 30)

        entity_terms = re.findall(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b", text)
        entity_coverage = min(100, len(set(entity_terms)) * 15) if entity_terms else 0

        has_list = bool(re.search(r"<(ul|ol)\s", html, re.I))
        has_table = bool(re.search(r"<table\s", html, re.I))
        has_heading = len(headings) >= 3
        structured_answer = has_list or has_table or has_heading

        citation_patterns = [
            r"\[\d+\]",
            r"\(\d{4}\)",
            r"according to",
            r"research (shows|suggests|indicates)",
            r"study (found|shows|indicates)",
            r"source:",
        ]
        source_citations = sum(1 for p in citation_patterns if re.search(p, text, re.I)) * 20
        source_citations = min(100, source_citations)

        stat_patterns = [
            r"\d+%",
            r"\d+\.\d+%",
            r"\$\d+",
            r"\d+x\b",
            r"\d{1,3}(,\d{3})+",
            r"\d+\s*(million|billion|thousand)",
        ]
        statistical_evidence = min(100, sum(1 for p in stat_patterns if re.search(p, text, re.I)) * 20)

        has_schema = len(schemas) > 0
        citation_readiness = min(100, (
            (30 if source_citations > 20 else 0)
            + (20 if statistical_evidence > 20 else 0)
            + (20 if entity_coverage > 30 else 0)
            + (15 if has_schema else 0)
            + (15 if bluf_score > 40 else 0)
        ))

        return {
            "citation_readiness": citation_readiness,
            "bluf_analysis": bluf_score,
            "entity_coverage": entity_coverage,
            "structured_answer": structured_answer,
            "source_citations": source_citations,
            "statistical_evidence": statistical_evidence,
        }

    # ---------- 5. crawl_path ----------

    def _crawl_path(self, page: dict, links_internal: list) -> dict:
        depth = page.get("crawl_depth", 0)
        internal_links_to = len(links_internal)
        internal_links_from = page.get("links_from_count", 0)

        if depth <= 2:
            priority = "high"
        elif depth <= 4:
            priority = "medium"
        else:
            priority = "low"

        response_ms = page.get("response_time_ms", 0)
        crawl_signals = []
        if response_ms and response_ms < 500:
            crawl_signals.append("fast_response")
        if internal_links_from > 3:
            crawl_signals.append("well_linked")
        if page.get("status_code") == 200:
            crawl_signals.append("status_200")
        if internal_links_to > 0:
            crawl_signals.append("has_outlinks")

        return {
            "depth": depth,
            "internal_links_to": internal_links_to,
            "internal_links_from": internal_links_from,
            "crawl_priority": priority,
            "last_crawl_signals": crawl_signals,
        }

    # ---------- 6. dom_tree ----------

    def _dom_tree(self, html: str) -> dict:
        all_tags = re.findall(r"<(\w+)[\s>]", html, re.I)
        total_elements = len(all_tags)

        max_depth = 0
        depth = 0
        for i in range(len(html)):
            if html[i] == "<":
                snippet = html[i:i + 100] if i + 100 < len(html) else html[i:]
                if re.match(r"<\w+", snippet) and not re.match(r"</\w+", snippet) and not snippet.startswith("<!"):
                    depth += 1
                    if depth > max_depth:
                        max_depth = depth
                elif re.match(r"</\w+", snippet):
                    depth = max(0, depth - 1)

        div_count = self._count_pattern(html, r"<div[\s>]")
        section_count = self._count_pattern(html, r"<section[\s>]")
        article_count = self._count_pattern(html, r"<article[\s>]")
        nav_count = self._count_pattern(html, r"<nav[\s>]")
        aside_count = self._count_pattern(html, r"<aside[\s>]")
        header_count = self._count_pattern(html, r"<header[\s>]")
        footer_count = self._count_pattern(html, r"<footer[\s>]")

        return {
            "total_elements": total_elements,
            "depth_max": max_depth,
            "div_count": div_count,
            "section_count": section_count,
            "article_count": article_count,
            "nav_count": nav_count,
            "aside_count": aside_count,
            "header_footer": header_count + footer_count,
        }

    # ---------- 7. heading_hierarchy ----------

    def _heading_hierarchy(self, headings: list) -> dict:
        h_counts = Counter()
        for h in headings:
            level = h.get("level", "")
            if isinstance(level, int):
                h_counts[level] += 1
            elif isinstance(level, str):
                match = re.search(r"(\d)", level)
                if match:
                    h_counts[int(match.group(1))] += 1

        h1_count = h_counts.get(1, 0)
        h2_count = h_counts.get(2, 0)
        h3_count = h_counts.get(3, 0)
        h4_count = h_counts.get(4, 0)

        levels = []
        for h in headings:
            level = h.get("level", "")
            if isinstance(level, int):
                levels.append(level)
            elif isinstance(level, str):
                match = re.search(r"(\d)", level)
                if match:
                    levels.append(int(match.group(1)))

        hierarchy_valid = True
        if h1_count != 1:
            hierarchy_valid = False
        for i in range(1, len(levels)):
            if levels[i] > levels[i - 1] + 1:
                hierarchy_valid = False
                break

        heading_order = [f"H{l}" for l in levels]

        suggested = []
        if h1_count == 0:
            suggested.append("Add an H1 heading")
        if h1_count > 1:
            suggested.append(f"Reduce H1 count from {h1_count} to 1")
        if h2_count == 0 and h3_count > 0:
            suggested.append("Add H2 headings before H3 headings")
        for i in range(1, len(levels)):
            if levels[i] > levels[i - 1] + 1:
                suggested.append(
                    f"Skip level detected: H{levels[i - 1]} followed by H{levels[i]} at position {i + 1}"
                )

        return {
            "h1_count": h1_count,
            "h2_count": h2_count,
            "h3_count": h3_count,
            "h4_count": h4_count,
            "hierarchy_valid": hierarchy_valid,
            "heading_order": heading_order,
            "suggested_hierarchy": suggested,
        }

    # ---------- 8. internal_link_graph ----------

    def _internal_link_graph(self, links_internal: list, current_url: str) -> dict:
        links_from_page = len(links_internal)
        linked_pages = [l.get("url", "") for l in links_internal if l.get("url")]

        anchor_texts = [l.get("anchor_text", "").strip() for l in links_internal]
        anchor_texts = [a for a in anchor_texts if a]

        good_anchors = sum(
            1 for a in anchor_texts
            if 2 <= len(a.split()) <= 8 and not a.lower().startswith("click here")
        )
        anchor_text_quality = (good_anchors / len(anchor_texts) * 100) if anchor_texts else 0

        orphan_risk = links_from_page == 0

        depth = 1 if links_from_page > 5 else (2 if links_from_page > 0 else 0)

        return {
            "links_from_page": links_from_page,
            "linked_pages": linked_pages[:20],
            "anchor_text_quality": round(anchor_text_quality, 1),
            "orphan_risk": orphan_risk,
            "link_depth": depth,
        }

    # ---------- 9. external_link_graph ----------

    def _external_link_graph(self, links_external: list) -> dict:
        external_count = len(links_external)
        nofollow_count = sum(1 for l in links_external if l.get("rel", "").find("nofollow") != -1)

        domain_counter = Counter()
        for link in links_external:
            url = link.get("url", "")
            m = re.search(r"https?://(?:www\.)?([^/]+)", url)
            if m:
                domain_counter[m.group(1)] += 1

        top_linked = domain_counter.most_common(10)

        edu_gov = sum(c for d, c in domain_counter.items() if d.endswith(".edu") or d.endswith(".gov"))
        outbound_quality = min(100, (
            (30 if external_count > 0 else 0)
            + (20 if nofollow_count == 0 or nofollow_count < external_count * 0.5 else 5)
            + (25 if edu_gov > 0 else 0)
            + (25 if 1 <= external_count <= 20 else (10 if external_count > 20 else 0))
        ))

        return {
            "external_count": external_count,
            "nofollow_count": nofollow_count,
            "domain_authority": edu_gov > 0,
            "top_linked_domains": [{"domain": d, "count": c} for d, c in top_linked],
            "outbound_quality": outbound_quality,
        }

    # ---------- 10. schema_viewer ----------

    def _schema_viewer(self, schemas: list, page_type: str) -> dict:
        types_present = []
        for s in schemas:
            t = s.get("@type", "")
            if isinstance(t, list):
                types_present.extend(t)
            elif t:
                types_present.append(t)

        expected = _SCHEMA_PAGE_TYPE_MAP.get(page_type, ["WebPage", "BreadcrumbList"])

        types_expected = expected

        validation_errors = []
        for i, s in enumerate(schemas):
            if "@type" not in s:
                validation_errors.append(f"Schema {i} missing @type")
            if "@context" not in s:
                validation_errors.append(f"Schema {i} missing @context")
            t = s.get("@type", "")
            if t == "Article" or t == "BlogPosting":
                if "headline" not in s and "name" not in s:
                    validation_errors.append(f"Article schema {i} missing headline/name")
                if "datePublished" not in s:
                    validation_errors.append(f"Article schema {i} missing datePublished")
            if t == "Product":
                if "name" not in s:
                    validation_errors.append(f"Product schema {i} missing name")
                if "offers" not in s and "price" not in s:
                    validation_errors.append(f"Product schema {i} missing offers/price")
            if t == "LocalBusiness":
                if "name" not in s or "address" not in s:
                    validation_errors.append(f"LocalBusiness schema {i} missing name/address")

        missing_required = [e for e in validation_errors if "missing" in e.lower()]

        present_set = set(types_present)
        expected_set = set(expected)
        schema_score = 0
        if expected_set:
            matched = present_set & expected_set
            schema_score = round(len(matched) / len(expected_set) * 100)
        if validation_errors:
            schema_score = max(0, schema_score - len(validation_errors) * 5)

        recommendations = []
        for et in expected:
            if et not in present_set:
                recommendations.append(f"Add {et} schema markup")
        if "BreadcrumbList" not in present_set:
            recommendations.append("Add BreadcrumbList schema for navigation")
        if any(v for v in validation_errors if "datePublished" in v):
            recommendations.append("Add datePublished to Article schema")

        return {
            "types_present": types_present,
            "types_expected": types_expected,
            "validation_errors": validation_errors,
            "missing_required": missing_required,
            "schema_score": schema_score,
            "recommendations": recommendations,
        }

    # ---------- 11. entity_extraction ----------

    def _entity_extraction(self, text: str) -> dict:
        capitalized_phrases = re.findall(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b", text)
        entity_counter = Counter(capitalized_phrases)

        single_capitalized = re.findall(r"\b([A-Z][a-z]{2,})\b", text)
        for word in single_capitalized:
            if word not in entity_counter and word not in _STOP_WORDS:
                entity_counter[word] += 1

        top_entities = entity_counter.most_common(30)

        entity_type_map = {}
        for entity, count in top_entities:
            if entity[0].isupper() and count >= 3:
                if entity.isupper():
                    etype = "ORGANIZATION"
                elif len(entity.split()) >= 2:
                    etype = "PERSON" if re.search(r"\b(Mr|Ms|Dr|Prof)\.", text) else "ENTITY"
                else:
                    etype = "CONCEPT"
                entity_type_map[entity] = etype

        primary_entity = top_entities[0][0] if top_entities else ""

        total_words = max(1, len(text.split()))
        entity_density = round(len(capitalized_phrases) / total_words * 100, 2)

        kg_ready = (
            entity_density > 0.5
            and len(top_entities) >= 3
            and any("ORGANIZATION" in t for t in entity_type_map.values())
        )

        entities_found = [
            {"text": e, "count": c, "type": entity_type_map.get(e, "UNKNOWN")}
            for e, c in top_entities[:15]
        ]

        entity_types = list(set(entity_type_map.values()))

        return {
            "entities_found": entities_found,
            "entity_types": entity_types,
            "primary_entity": primary_entity,
            "entity_density": entity_density,
            "knowledge_graph_ready": kg_ready,
        }

    # ---------- 12. content_blocks ----------

    def _content_blocks(self, html: str, text: str) -> dict:
        blocks = {}

        first_para = re.search(r"<p[^>]*>(.*?)</p>", html, re.I | re.S)
        intro_text = re.sub(r"<[^>]+>", "", first_para.group(1)).strip() if first_para else ""
        hero_patterns = [r"<h1[^>]*>(.*?)</h1>", r"class=[\"'][^\"']*(?:hero|banner)[^\"']*[\"']"]
        has_hero = any(re.search(p, html, re.I) for p in hero_patterns)
        blocks["hero_section"] = has_hero

        first_200_words = " ".join(text.split()[:200]).lower()
        intro_triggers = ["introduction", "overview", "in this", "this article", "this guide", "we'll", "you'll"]
        blocks["intro_section"] = any(t in first_200_words for t in intro_triggers) or len(intro_text) > 80

        h2s = re.findall(r"<h2[^>]*>(.*?)</h2>", html, re.I | re.S)
        h2s_clean = [re.sub(r"<[^>]+>", "", h).strip() for h in h2s]
        blocks["main_content"] = len(h2s_clean) >= 2

        faq_patterns = [
            r"class=[\"'][^\"']*(?:faq)[^\"']*[\"']",
            r"<h2[^>]*>[^<]*(?:FAQ|Frequently Asked)[^<]*</h2>",
            r"itemscope[^>]*itemtype=[\"'][^\"']*FAQPage",
            r"<details[^>]*>",
        ]
        blocks["faq_section"] = any(re.search(p, html, re.I) for p in faq_patterns)

        cta_patterns = [
            r"class=[\"'][^\"']*(?:cta|call-to-action|btn|button)[^\"']*[\"']",
            r"<a\s[^>]*class=[\"'][^\"']*(?:btn|button)[^\"']*[\"']",
            r"(sign up|get started|contact us|learn more|download|subscribe)",
        ]
        blocks["cta_section"] = any(re.search(p, html, re.I) for p in cta_patterns[:2])

        testimonial_patterns = [
            r"class=[\"'][^\"']*(?:testimonial|review|feedback)[^\"']*[\"']",
            r"<blockquote",
            r"class=[\"'][^\"']*(?:rating|stars)[^\"']*[\"']",
        ]
        blocks["testimonials"] = any(re.search(p, html, re.I) for p in testimonial_patterns)

        last_paragraphs = text[-500:].lower() if len(text) > 500 else text.lower()
        conclusion_triggers = ["conclusion", "in summary", "to sum up", "final thoughts", "takeaway", "in conclusion"]
        blocks["conclusion"] = any(t in last_paragraphs for t in conclusion_triggers)

        block_count = sum(1 for v in blocks.values() if v)

        blocks["block_count"] = block_count
        return blocks

    # ---------- 13. keyword_map ----------

    def _keyword_map(self, text: str) -> dict:
        words = self._text_to_words(text)

        bigrams = [f"{words[i]} {words[i + 1]}" for i in range(len(words) - 1)]
        trigrams = [f"{words[i]} {words[i + 1]} {words[i + 2]}" for i in range(len(words) - 2)]

        word_freq = Counter(words)
        bigram_freq = Counter(bigrams)
        trigram_freq = Counter(trigrams)

        combined = Counter()
        for w, c in word_freq.most_common(50):
            combined[w] = c
        for b, c in bigram_freq.most_common(30):
            if c >= 2:
                combined[b] = c
        for t, c in trigram_freq.most_common(20):
            if c >= 2:
                combined[t] = c

        top5 = combined.most_common(5)
        primary_keyword = top5[0][0] if top5 else ""
        secondary_keywords = [k for k, _ in top5[1:5]] if len(top5) > 1 else []

        total_words = max(1, len(words))
        keyword_density = round(
            word_freq.get(primary_keyword, 0) / total_words * 100, 2
        ) if primary_keyword else 0

        lsi = []
        if primary_keyword:
            p_words = set(primary_keyword.split())
            for w, c in word_freq.most_common(100):
                if w not in p_words and c >= 2:
                    lsi.append(w)
            lsi = lsi[:10]

        over_optimization = keyword_density > 3.0

        return {
            "primary_keyword": primary_keyword,
            "secondary_keywords": secondary_keywords,
            "keyword_density": keyword_density,
            "lsi_keywords": lsi,
            "missing_keywords": [],
            "over_optimization": over_optimization,
        }

    # ---------- 14. core_web_vitals ----------

    def _core_web_vitals(self, html: str, images: list) -> dict:
        html_size = len(html.encode("utf-8", errors="replace"))
        image_count = len(images)

        script_count = self._count_pattern(html, r"<script[\s>]")
        inline_css_size = sum(
            len(m) for m in re.findall(r"<style[^>]*>(.*?)</style>", html, re.I | re.S)
        )

        large_images = 0
        for img in images:
            src = img.get("src", "")
            if re.search(r"\.(png|bmp|tiff?)($|\?)", src, re.I):
                large_images += 1

        css_files = self._count_pattern(html, r'<link\s[^>]*rel=["\']stylesheet["\']')
        blocking_scripts = self._count_pattern(
            html,
            r'<script\s[^>]*(?!async|defer)[^>]*src=["\']'
        )

        lcp_estimate = 800
        if html_size > 500_000:
            lcp_estimate += 2000
        elif html_size > 200_000:
            lcp_estimate += 1000
        lcp_estimate += image_count * 200
        lcp_estimate += large_images * 500
        lcp_estimate += blocking_scripts * 300
        lcp_estimate += css_files * 100
        lcp_estimate = min(8000, lcp_estimate)

        cls_estimate = 0.0
        if not re.search(r"width\s*:\s*\d+.*height\s*:\s*\d+", html):
            cls_estimate += 0.05
        if image_count > 5 and not re.search(r"aspect-ratio|padding-top\s*:\s*\d+%", html, re.I):
            cls_estimate += 0.1
        if re.search(r"(position\s*:\s*absolute|position\s*:\s*fixed)", html, re.I):
            cls_estimate += 0.05
        cls_estimate = round(min(0.5, cls_estimate), 3)

        inp_estimate = 100
        if script_count > 30:
            inp_estimate += 300
        elif script_count > 15:
            inp_estimate += 150
        event_handlers = self._count_pattern(html, r"addEventListener|onclick|onload")
        inp_estimate += event_handlers * 30
        inp_estimate = min(1000, inp_estimate)

        fcp_estimate = 500
        if inline_css_size > 50_000:
            fcp_estimate += 1000
        if css_files > 3:
            fcp_estimate += css_files * 200
        fcp_estimate = min(5000, fcp_estimate)

        ttfb_estimate = 200
        if html_size > 300_000:
            ttfb_estimate += 300
        ttfb_estimate = min(2000, ttfb_estimate)

        cwv_score = 100
        if lcp_estimate > 2500:
            cwv_score -= min(30, (lcp_estimate - 2500) / 100)
        if cls_estimate > 0.1:
            cwv_score -= min(25, (cls_estimate - 0.1) * 100)
        if inp_estimate > 200:
            cwv_score -= min(25, (inp_estimate - 200) / 10)
        cwv_score = max(0, round(cwv_score))

        return {
            "lcp_estimate": lcp_estimate,
            "cls_estimate": cls_estimate,
            "inp_estimate": inp_estimate,
            "fcp_estimate": fcp_estimate,
            "ttfb_estimate": ttfb_estimate,
            "cwv_score": cwv_score,
        }

    # ---------- 15. accessibility_issues ----------

    def _accessibility_issues(self, html: str, images: list, headings: list) -> dict:
        img_tags = re.findall(r"<img\s[^>]*>", html, re.I)
        with_alt = sum(1 for tag in img_tags if re.search(r'alt\s*=\s*["\'][^"\']+["\']', tag))
        total_imgs = len(img_tags) if img_tags else 1
        alt_text_coverage = round(with_alt / total_imgs * 100)

        aria_count = self._count_pattern(html, r'aria-(?:label|describedby|hidden|role)')
        aria_labels = aria_count > 0

        dark_bg = bool(re.search(
            r"background(?:-color)?\s*:\s*#[0-3][0-9a-f]{2}|background(?:-color)?\s*:\s*rgb\(\s*[0-5][0-9]",
            html, re.I
        ))
        light_text = bool(re.search(
            r"color\s*:\s*#[c-f][0-9a-f]{2}|color\s*:\s*rgb\(\s*[2-5]\d{2}",
            html, re.I
        ))
        color_contrast_estimate = not (dark_bg and light_text)

        focusable_elements = re.findall(
            r"<(a|button|input|select|textarea)\s", html, re.I
        )
        with_tabindex = sum(1 for tag in focusable_elements if "tabindex" in tag.lower())
        keyboard_navigation = len(focusable_elements) == 0 or with_tabindex > 0 or self._count_pattern(html, r"tabindex") > 0

        has_aria_live = bool(re.search(r'aria-live', html, re.I))
        has_skip_link = bool(re.search(r'(?:skip|jump)\s*(?:to)?\s*(?:main|content|nav)', html, re.I))
        has_landmark = self._count_pattern(html, r'role\s*=\s*["\'](?:main|banner|contentinfo|navigation|complementary)["\']')
        screen_reader_friendly = has_skip_link or has_aria_live or has_landmark > 0

        return {
            "alt_text_coverage": alt_text_coverage,
            "aria_labels": aria_labels,
            "color_contrast_estimate": color_contrast_estimate,
            "keyboard_navigation": keyboard_navigation,
            "screen_reader_friendly": screen_reader_friendly,
        }

    # ---------- 16. security_issues ----------

    def _security_issues(self, html: str, page: dict) -> dict:
        url = page.get("url", "")
        https = url.startswith("https://")

        mixed_content = False
        if https:
            http_refs = re.findall(r'(?:src|href|action)\s*=\s*["\']http://', html, re.I)
            mixed_content = len(http_refs) > 0

        headers = page.get("headers", {}) or {}
        if isinstance(headers, list):
            headers = {}
        headers_lower = {k.lower(): v for k, v in headers.items()}

        x_frame_options = "x-frame-options" in headers_lower or any(
            k.replace("-", "") == "xframeoptions" for k in headers_lower
        )

        csp = "content-security-policy" in headers_lower

        hsts = "strict-transport-security" in headers_lower

        x_content_type = "x-content-type-options" in headers_lower

        return {
            "https": https,
            "mixed_content": mixed_content,
            "x_frame_options": x_frame_options,
            "csp": csp,
            "hsts": hsts,
            "x_content_type": x_content_type,
        }

    # ---------- 17. javascript_rendering ----------

    def _javascript_rendering(self, html: str) -> dict:
        js_tags = re.findall(r"<script[^>]*>", html, re.I)

        js_required = bool(re.search(
            r"document\.write|window\.location|location\.href|React\.|ReactDOM\.|Vue\.|angular\.|__NEXT_DATA__",
            html, re.I
        ))

        render_blocking = sum(
            1 for tag in js_tags
            if re.search(r"src\s*=", tag, re.I)
            and "async" not in tag.lower()
            and "defer" not in tag.lower()
            and not re.search(r'type\s*=\s*["\']module["\']', tag, re.I)
        )

        async_scripts = sum(1 for tag in js_tags if "async" in tag.lower())
        defer_scripts = sum(1 for tag in js_tags if "defer" in tag.lower())

        noscript_fallback = bool(re.search(r"<noscript", html, re.I))

        return {
            "js_required": js_required,
            "render_blocking": render_blocking,
            "async_scripts": async_scripts,
            "defer_scripts": defer_scripts,
            "noscript_fallback": noscript_fallback,
        }

    # ---------- 18. indexability_status ----------

    def _indexability_status(self, html: str, page: dict) -> dict:
        robots_content = self._meta_content(html, "robots").lower()
        noindex = "noindex" in robots_content

        robots_allowed = "noindex" not in robots_content and "none" not in robots_content

        canonical = re.search(
            r'<link\s[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']', html, re.I
        )
        canonical_status = bool(canonical)

        url = page.get("url", "")
        sitemap_included = not noindex

        indexable = not noindex and robots_allowed

        return {
            "indexable": indexable,
            "noindex_directive": noindex,
            "robots_txt_allowed": robots_allowed,
            "canonical_status": canonical_status,
            "sitemap_included": sitemap_included,
        }

    # ---------- 19. canonical_validation ----------

    def _canonical_validation(self, page: dict) -> dict:
        html = page.get("html_raw", "")
        url = page.get("url", "")

        canonical = re.search(
            r'<link\s[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']', html, re.I
        )
        has_canonical = bool(canonical)
        canonical_url = canonical.group(1) if canonical else ""

        self_referencing = False
        if canonical_url:
            norm_canonical = canonical_url.rstrip("/").lower()
            norm_url = url.rstrip("/").lower()
            self_referencing = norm_canonical == norm_url

        indexable = not bool(re.search(r"noindex", self._meta_content(html, "robots"), re.I))
        points_to_indexable = self_referencing and indexable if has_canonical else False

        duplicate_risk = has_canonical and not self_referencing

        return {
            "has_canonical": has_canonical,
            "self_referencing": self_referencing,
            "points_to_indexable": points_to_indexable,
            "duplicate_risk": duplicate_risk,
            "canonical_url": canonical_url,
        }

    # ---------- 20. duplicate_detection ----------

    def _duplicate_detection(self, html: str, text: str, word_count: int) -> dict:
        content_hash = self._content_hash(text)

        text_lower = text.lower()
        generic_phrases = [
            "lorem ipsum", "click here", "read more", "learn more",
            "this page", "coming soon", "under construction", "placeholder",
        ]
        generic_count = sum(1 for g in generic_phrases if g in text_lower)
        thin_content_risk = word_count < 300 or generic_count >= 2

        sentences = re.split(r"[.!?]+", text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        if sentences:
            avg_len = sum(len(s.split()) for s in sentences) / len(sentences)
            near_duplicate_risk = avg_len < 5 or word_count < 200
        else:
            near_duplicate_risk = True

        similar_pages_risk = word_count < 150 or generic_count >= 3

        return {
            "content_hash": content_hash,
            "similar_pages_risk": similar_pages_risk,
            "thin_content_risk": thin_content_risk,
            "near_duplicate_risk": near_duplicate_risk,
        }

    # ---------- 21. eeat_analysis ----------

    def _eeat_analysis(self, html: str, text: str, schemas: list, page: dict) -> dict:
        author_present = bool(
            re.search(r'class=["\'][^"\']*(?:author|byline)[^"\']*["\']', html, re.I)
            or re.search(r'(?:by|written by|author:)\s+[A-Z][a-z]+', text)
            or any(
                s.get("@type") in ("Person", "Organization") and "author" in s
                for s in schemas
            )
        )

        publication_date = bool(
            re.search(r'class=["\'][^"\']*(?:date|published|time)[^"\']*["\']', html, re.I)
            or re.search(r'datetime\s*=\s*["\']', html, re.I)
            or any(
                "datePublished" in s or "dateCreated" in s
                for s in schemas
            )
        )

        source_patterns = [
            r"\[\d+\]",
            r"\(\d{4}\)",
            r"according to",
            r"source[s]?:",
            r"reference[s]?:",
            r"according to (?:a|the) (?:study|report|survey|research)",
        ]
        sources_cited = sum(1 for p in source_patterns if re.search(p, text, re.I))

        first_hand = bool(
            re.search(r"(?:we |I )(?:found|tested|tried|used|built|created|developed)", text, re.I)
            or re.search(r"(?:our|my) (?:experience|research|analysis|test)", text, re.I)
        )

        expertise_signals = bool(
            re.search(r"(?:years of experience|certified|expert|professional|specialist)", text, re.I)
            or re.search(r'(?:PhD|MD|MBA|M\.?S\.?|B\.?S\.?)', text)
            or re.search(r"class=[\"'][^\"']*(?:credentials|qualification)[^\"']*[\"']", html, re.I)
        )

        trust_signals = bool(
            re.search(r"(?:privacy policy|terms of service|refund|guarantee|secure)", text, re.I)
            or re.search(r'(?:https|ssl|encrypted|certified)', text, re.I)
            or re.search(r'class=["\'][^"\']*(?:trust|security|badge)[^"\']*["\']', html, re.I)
        )

        authoritativeness = bool(
            author_present
            and sources_cited >= 2
            and publication_date
            and expertise_signals
        )

        return {
            "author_present": author_present,
            "publication_date": publication_date,
            "sources_cited": sources_cited > 0,
            "first_hand_experience": first_hand,
            "expertise_signals": expertise_signals,
            "trust_signals": trust_signals,
            "authoritativeness": authoritativeness,
        }

    # ---------- 22. ai_citation_readiness ----------

    def _ai_citation_readiness(self, text: str, headings: list) -> dict:
        stat_patterns = [
            r"\d+%", r"\d+\.\d+%", r"\$\d+", r"\d+x\b",
            r"\d{1,3}(,\d{3})+", r"\d+\s*(million|billion|thousand)",
        ]
        has_statistics = any(re.search(p, text) for p in stat_patterns)

        source_patterns = [
            r"\[\d+\]", r"\(\d{4}\)", r"according to", r"source:",
            r"research (shows|suggests)", r"study (found|shows)",
            r"per (?:the|a) .+ report",
        ]
        has_sources = sum(1 for p in source_patterns if re.search(p, text, re.I)) >= 2

        has_quotes = bool(re.search(r'[""][^""]{20,}[""]|<blockquote', text))

        definition_patterns = [
            r"(?:is defined as|refers to|is a\b|is an\b|means that|can be described as)",
        ]
        has_definitions = any(re.search(p, text, re.I) for p in definition_patterns)

        first_sentences = re.split(r"[.!?]+", text)[:3]
        first_sentences = [s.strip() for s in first_sentences if len(s.strip()) > 10]
        bluf_score = 0
        for s in first_sentences:
            words = s.lower().split()[:10]
            if any(t in " ".join(words) for t in ["what", "how", "why", "definition", "guide"]):
                bluf_score += 40
            if len(s.split()) > 15:
                bluf_score += 20
        bluf_score = min(100, bluf_score)

        rag_friendly = bool(headings) and has_definitions and has_statistics

        score = 0
        if has_statistics:
            score += 20
        if has_sources:
            score += 25
        if has_quotes:
            score += 15
        if has_definitions:
            score += 15
        if bluf_score > 40:
            score += 15
        if rag_friendly:
            score += 10

        return {
            "score": min(100, score),
            "has_statistics": has_statistics,
            "has_sources": has_sources,
            "has_quotes": has_quotes,
            "has_definitions": has_definitions,
            "bluf_score": bluf_score,
            "rag_friendly": rag_friendly,
        }

    # ---------- 23. featured_snippet_readiness ----------

    def _featured_snippet_readiness(self, html: str, text: str, headings: list) -> dict:
        definition_patterns = [
            r"(?:is defined as|refers to|is a .+ that|is an .+ that|means|is the process of|can be defined)",
        ]
        has_definition = any(re.search(p, text, re.I) for p in definition_patterns)

        has_list = bool(re.search(r"<(ul|ol)\s", html, re.I))
        list_items = re.findall(r"<li[^>]*>(.*?)</li>", html, re.I | re.S)
        has_list = has_list and len(list_items) >= 3

        has_table = bool(re.search(r"<table\s", html, re.I))
        table_rows = re.findall(r"<tr[^>]*>", html, re.I)
        has_table = has_table and len(table_rows) >= 3

        step_patterns = [
            r"(?:step\s*\d|step\s*one|step\s*two|step\s*three|\d+\.\s+\w)",
        ]
        ordered_list = re.search(r"<ol[^>]*>(.*?)</ol>", html, re.I | re.S)
        has_step_by_step = False
        if ordered_list:
            items = re.findall(r"<li[^>]*>(.*?)</li>", ordered_list.group(1), re.I | re.S)
            has_step_by_step = len(items) >= 3
        if not has_step_by_step:
            has_step_by_step = any(re.search(p, text, re.I) for p in step_patterns)

        first_para = re.split(r"\n\n|\.</p>", text)[:1]
        para_words = first_para[0].split() if first_para else []
        paragraph_snippet_risk = 40 <= len(para_words) <= 60

        list_snippet_risk = has_list and len(list_items) >= 4

        table_snippet_risk = has_table and len(table_rows) >= 3

        return {
            "has_definition": has_definition,
            "has_list": has_list,
            "has_table": has_table,
            "has_step_by_step": has_step_by_step,
            "paragraph_snippet_risk": paragraph_snippet_risk,
            "list_snippet_risk": list_snippet_risk,
            "table_snippet_risk": table_snippet_risk,
        }

    # ---------- 24. knowledge_graph_readiness ----------

    def _knowledge_graph_readiness(self, schemas: list, og: dict, text: str) -> dict:
        org_schemas = [
            s for s in schemas
            if s.get("@type") in ("Organization", "LocalBusiness", "Corporation", "Company")
        ]
        organization_schema = len(org_schemas) > 0

        sameas_links = []
        for s in schemas:
            if isinstance(s.get("sameAs"), list):
                sameas_links.extend(s["sameAs"])
            elif isinstance(s.get("sameAs"), str):
                sameas_links.append(s["sameAs"])
        if not sameas_links:
            for s in schemas:
                if "url" in s and "sameAs" in s:
                    sameas_links.append(s["sameAs"])

        entity_clarity = bool(
            re.search(r'class=["\'][^"\']*(?:brand|company|organization)[^"\']*["\']', text, re.I)
            or re.search(r"class=[\"'][^\"']*(?:brand|company|organization)[^\"']*[\"']", "", re.I)
        )
        if not entity_clarity:
            brand_patterns = [
                r'class=["\'][^"\']*(?:brand|company|org)[^"\']*["\']',
                r'itemprop=["\']name["\']',
            ]
            entity_clarity = any(re.search(p, "", re.I) for p in brand_patterns)

        brand_name = ""
        if og.get("site_name"):
            brand_name = og["site_name"]
        elif org_schemas:
            brand_name = org_schemas[0].get("name", "")

        brand_mention = bool(brand_name) and brand_name.lower() in text.lower()[:1000]

        kp_ready = bool(
            organization_schema
            and len(sameas_links) >= 2
            and brand_mention
        )

        return {
            "organization_schema": organization_schema,
            "sameas_links": sameas_links,
            "entity_clarity": entity_clarity,
            "brand_mention": brand_mention,
            "knowledge_panel_ready": kp_ready,
        }

    # ---------- overall score ----------

    @staticmethod
    def _compute_overall_score(sub_views: dict) -> int:
        weights = {
            "googlebot_view": 8,
            "browser_view": 5,
            "mobile_view": 10,
            "ai_search_view": 5,
            "crawl_path": 4,
            "dom_tree": 3,
            "heading_hierarchy": 6,
            "internal_link_graph": 5,
            "external_link_graph": 3,
            "schema_viewer": 7,
            "content_blocks": 5,
            "keyword_map": 5,
            "core_web_vitals": 10,
            "accessibility_issues": 5,
            "security_issues": 4,
            "javascript_rendering": 3,
            "indexability_status": 7,
            "canonical_validation": 4,
            "duplicate_detection": 3,
            "eeat_analysis": 3,
            "ai_citation_readiness": 2,
            "featured_snippet_readiness": 2,
            "knowledge_graph_readiness": 1,
        }

        total_weight = 0
        weighted_sum = 0

        for view_name, weight in weights.items():
            view_data = sub_views.get(view_name, {})
            view_score = PageIntelligenceEngine._score_sub_view(view_name, view_data)
            weighted_sum += view_score * weight
            total_weight += weight

        if total_weight == 0:
            return 0
        return round(weighted_sum / total_weight)

    @staticmethod
    def _score_sub_view(name: str, data: dict) -> int:
        if name == "googlebot_view":
            score = 0
            if data.get("meta_tags_present"):
                score += 15
            if data.get("canonical_correct"):
                score += 15
            if not data.get("javascript_required"):
                score += 20
            if not data.get("resource_blocking"):
                score += 15
            if data.get("server_rendered"):
                score += 10
            if data.get("xml_sitemap_inclusion"):
                score += 10
            robots = data.get("robots_directive", "")
            if "noindex" not in robots:
                score += 15
            return min(100, score)

        if name == "browser_view":
            checks = [
                data.get("title_display", False),
                data.get("meta_desc_display", False),
                data.get("og_image", False),
                data.get("fav_icon", False),
                data.get("viewport_config", False),
                data.get("font_loading", False),
                data.get("layout_stability", False),
            ]
            return round(sum(checks) / len(checks) * 100) if checks else 50

        if name == "mobile_view":
            return data.get("mobile_usability_score", 50)

        if name == "ai_search_view":
            return data.get("citation_readiness", 30)

        if name == "crawl_path":
            priority = data.get("crawl_priority", "medium")
            return {"high": 90, "medium": 60, "low": 30}.get(priority, 50)

        if name == "heading_hierarchy":
            return 90 if data.get("hierarchy_valid", False) else 40

        if name == "schema_viewer":
            return data.get("schema_score", 0)

        if name == "core_web_vitals":
            return data.get("cwv_score", 50)

        if name == "accessibility_issues":
            alt = data.get("alt_text_coverage", 50)
            return round(alt * 0.4 + (20 if data.get("aria_labels") else 0) +
                         (20 if data.get("color_contrast_estimate") else 0) +
                         (10 if data.get("keyboard_navigation") else 0) +
                         (10 if data.get("screen_reader_friendly") else 0))

        if name == "security_issues":
            checks = [
                data.get("https", False),
                not data.get("mixed_content", True),
                data.get("csp", False),
                data.get("hsts", False),
                data.get("x_content_type", False),
                data.get("x_frame_options", False),
            ]
            return round(sum(checks) / len(checks) * 100) if checks else 0

        if name == "javascript_rendering":
            score = 80
            if data.get("render_blocking", 0) > 0:
                score -= data["render_blocking"] * 10
            if data.get("js_required"):
                score -= 15
            if data.get("noscript_fallback"):
                score += 10
            return max(0, min(100, score))

        if name == "indexability_status":
            return 90 if data.get("indexable", False) else 20

        if name == "canonical_validation":
            score = 30
            if data.get("has_canonical"):
                score += 25
            if data.get("self_referencing"):
                score += 25
            if data.get("points_to_indexable"):
                score += 20
            return score

        if name == "duplicate_detection":
            score = 100
            if data.get("thin_content_risk"):
                score -= 40
            if data.get("near_duplicate_risk"):
                score -= 30
            if data.get("similar_pages_risk"):
                score -= 20
            return max(0, score)

        if name == "eeat_analysis":
            checks = [
                data.get("author_present", False),
                data.get("publication_date", False),
                data.get("sources_cited", False),
                data.get("first_hand_experience", False),
                data.get("expertise_signals", False),
                data.get("trust_signals", False),
                data.get("authoritativeness", False),
            ]
            return round(sum(checks) / len(checks) * 100) if checks else 0

        if name == "ai_citation_readiness":
            return data.get("score", 0)

        if name == "featured_snippet_readiness":
            score = 20
            if data.get("has_definition"):
                score += 20
            if data.get("has_list"):
                score += 15
            if data.get("has_table"):
                score += 15
            if data.get("has_step_by_step"):
                score += 15
            if data.get("list_snippet_risk"):
                score += 10
            if data.get("table_snippet_risk"):
                score += 5
            return min(100, score)

        if name == "knowledge_graph_readiness":
            score = 20
            if data.get("organization_schema"):
                score += 30
            if len(data.get("sameas_links", [])) >= 2:
                score += 25
            if data.get("brand_mention"):
                score += 15
            if data.get("entity_clarity"):
                score += 10
            return min(100, score)

        if name == "dom_tree":
            score = 60
            if data.get("section_count", 0) > 0:
                score += 10
            if data.get("article_count", 0) > 0:
                score += 10
            if data.get("nav_count", 0) > 0:
                score += 10
            if data.get("header_footer", 0) >= 2:
                score += 10
            return min(100, score)

        if name == "internal_link_graph":
            links = data.get("links_from_page", 0)
            if links >= 3:
                return 80
            if links >= 1:
                return 60
            return 20

        if name == "external_link_graph":
            return data.get("outbound_quality", 50)

        if name == "content_blocks":
            count = data.get("block_count", 0)
            return min(100, count * 15)

        if name == "keyword_map":
            density = data.get("keyword_density", 0)
            if 0.5 <= density <= 2.5:
                return 80
            if 0.1 <= density <= 3.5:
                return 60
            return 30

        if name == "crawl_path":
            priority = data.get("crawl_priority", "medium")
            return {"high": 90, "medium": 60, "low": 30}.get(priority, 50)

        return 50
