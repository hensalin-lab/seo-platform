"""Classic SEO Engine — Googlebot Simulation (200+ signals)"""
import re
import json
import math

_DOMAIN_RE = re.compile(r'https?://([^/]+)')
_URL_PATH_RE = re.compile(r'https?://[^/]+(/.*)')
_PROTOCOL_RE = re.compile(r'^https?://')
_PARAM_RE = re.compile(r'[?&]')
_SLUG_RE = re.compile(r'/([a-z0-9-]+)/?$')
_WORD_RE = re.compile(r'\b\w+\b')
_SENTENCE_RE = re.compile(r'[^.!?]+[.!?]+')
_PARA_RE = re.compile(r'\n\s*\n')
_HTML_TAG_RE = re.compile(r'<[^>]+>')
_ENTITY_RE = re.compile(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b')
_STATISTIC_RE = re.compile(r'\d+\.?\d*\s*%|\$\d+|\d+\s*(?:million|billion|thousand|k\b|m\b)', re.I)
_DEFINITION_RE = re.compile(r'\b(?:is|are|refers to|means|defined as|known as)\s+(?:a|an|the)?\s*\w', re.I)
_PASSIVE_RE = re.compile(r'\b(?:is|are|was|were|been|being|be)\s+\w+ed\b', re.I)
_TRANSITION_RE = re.compile(r'\b(?:however|moreover|furthermore|additionally|consequently|therefore|in contrast|on the other hand|for example|specifically|in particular|as a result|similarly|likewise|nevertheless|nonetheless|meanwhile|subsequently|alternatively|conversely)\b', re.I)
_LIST_RE = re.compile(r'<(?:ul|ol)\b|^\s*[-•*]\s|^\s*\d+\.\s', re.M|re.I)
_TABLE_RE = re.compile(r'<table\b', re.I)
_IMG_RE = re.compile(r'<img\b', re.I)
_NOFOLLOW_RE = re.compile(r'rel\s*=\s*["\'].*nofollow.*["\']', re.I)


class ClassicSEOEngine:
    def analyze(self, page):
        html = page.html_raw or ""
        text = page.content_text or ""
        wc = page.word_count or 0
        title = page.title or ""
        desc = page.meta_description or ""
        h1 = page.h1 or ""
        canonical = page.canonical or ""
        url = page.url or ""
        images = page.images or []
        links_int = page.links_internal or []
        links_ext = page.links_external or []
        schema = page.schema_markup or []
        og = page.open_graph or {}
        tc = page.twitter_card or {}
        headers = getattr(page, 'headings', None) or getattr(page, 'headers', None) or []

        sigs = []
        issues = []
        cat_scores = {}

        sigs += self._check_indexability(url, page.status_code, canonical, html, headers, wc, page.crawl_depth, page.response_time_ms)
        sigs += self._check_onpage(title, desc, h1, og, tc, html, url)
        sigs += self._check_content(text, wc, title, h1)
        sigs += self._check_links(links_int, links_ext, url)
        sigs += self._check_schema(schema, page.page_type)
        sigs += self._check_performance(page.response_time_ms, html, images)
        sigs += self._check_security(html, headers)

        for cat in ["indexability", "on_page", "content", "links", "schema", "performance", "security"]:
            cat_sigs = [s for s in sigs if s["category"] == cat]
            if cat_sigs:
                passes = sum(1 for s in cat_sigs if s["status"] == "pass")
                warns = sum(1 for s in cat_sigs if s["status"] == "warn")
                total = len(cat_sigs)
                cat_scores[cat] = round((passes * 100 + warns * 50) / max(total, 1), 1)
            else:
                cat_scores[cat] = 100.0

        weights = {"indexability": 0.25, "on_page": 0.20, "content": 0.20, "links": 0.15, "schema": 0.10, "performance": 0.05, "security": 0.05}
        tech_score = sum(cat_scores.get(c, 100) * w for c, w in weights.items())

        issues = self._generate_issues(sigs, page)

        return {
            "technical_score": round(tech_score, 1),
            "signals_checked": len(sigs),
            "category_scores": cat_scores,
            "diagnostics": {
                cat: [s for s in sigs if s["category"] == cat]
                for cat in ["indexability", "on_page", "content", "links", "schema", "performance", "security"]
            },
            "issues": issues,
        }

    def _sig(self, category, name, status, value, expected, detail):
        return {"category": category, "name": name, "status": status, "value": value, "expected": expected, "detail": detail}

    def _check_indexability(self, url, status, canonical, html, headers, wc, depth, resp_ms):
        s = []
        if status == 200:
            s.append(self._sig("indexability", "status_code", "pass", status, "200", "Page returns 200 OK"))
        elif status == 301:
            s.append(self._sig("indexability", "status_code", "warn", status, "200", "Permanent redirect detected"))
        elif status == 302:
            s.append(self._sig("indexability", "status_code", "warn", status, "200", "Temporary redirect detected"))
        elif status == 404:
            s.append(self._sig("indexability", "status_code", "fail", status, "200", "Page not found"))
        elif status == 500:
            s.append(self._sig("indexability", "status_code", "fail", status, "200", "Server error"))
        else:
            s.append(self._sig("indexability", "status_code", "warn", status, "200", f"Unexpected status {status}"))

        if canonical:
            if canonical == url:
                s.append(self._sig("indexability", "canonical_self", "pass", "self-referencing", "Self-referencing", "Canonical points to self"))
            elif canonical.startswith("http") and _DOMAIN_RE.search(canonical) and _DOMAIN_RE.search(url) and _DOMAIN_RE.search(canonical).group(1) != _DOMAIN_RE.search(url).group(1):
                s.append(self._sig("indexability", "canonical_external", "fail", canonical[:80], "Same domain", "Canonical points to external domain"))
            else:
                s.append(self._sig("indexability", "canonical_mismatch", "warn", canonical[:80], url[:80], "Canonical differs from URL"))
        else:
            s.append(self._sig("indexability", "canonical_missing", "fail", "missing", "Self-referencing canonical", "No canonical tag found"))

        noindex = re.search(r'noindex', html, re.I) or any('noindex' in str(h).lower() for h in headers)
        if noindex:
            s.append(self._sig("indexability", "noindex", "fail", "noindex", "index", "Page has noindex directive"))
        else:
            s.append(self._sig("indexability", "noindex", "pass", "indexable", "index", "Page is indexable"))

        nofollow = re.search(r'nofollow', html, re.I)
        if nofollow:
            s.append(self._sig("indexability", "nofollow", "warn", "nofollow", "follow", "Page or links have nofollow"))
        else:
            s.append(self._sig("indexability", "nofollow", "pass", "follow", "follow", "Links are followable"))

        if depth is not None:
            if depth <= 3:
                s.append(self._sig("indexability", "crawl_depth", "pass", depth, "<=3", "Good crawl depth"))
            elif depth <= 5:
                s.append(self._sig("indexability", "crawl_depth", "warn", depth, "<=3", f"Crawl depth {depth} — deep page"))
            else:
                s.append(self._sig("indexability", "crawl_depth", "fail", depth, "<=3", f"Crawl depth {depth} — very deep, may not be crawled"))

        if url.startswith("https://"):
            s.append(self._sig("indexability", "https", "pass", "HTTPS", "HTTPS", "Page uses HTTPS"))
        else:
            s.append(self._sig("indexability", "https", "fail", "HTTP", "HTTPS", "Page uses HTTP — not secure"))

        if len(url) > 256:
            s.append(self._sig("indexability", "url_length", "fail", len(url), "<256", f"URL too long ({len(url)} chars)"))
        elif len(url) > 128:
            s.append(self._sig("indexability", "url_length", "warn", len(url), "<128", f"URL is long ({len(url)} chars)"))
        else:
            s.append(self._sig("indexability", "url_length", "pass", len(url), "<128", "URL length is fine"))

        if _PARAM_RE.search(url):
            s.append(self._sig("indexability", "url_params", "warn", "has params", "clean URL", "URL contains query parameters"))
        else:
            s.append(self._sig("indexability", "url_params", "pass", "clean", "clean URL", "Clean URL structure"))

        viewport = re.search(r'viewport', html, re.I)
        if viewport:
            s.append(self._sig("indexability", "viewport", "pass", "present", "present", "Mobile viewport tag present"))
        else:
            s.append(self._sig("indexability", "viewport", "fail", "missing", "present", "Missing viewport meta tag"))

        lang = re.search(r'<html[^>]*\slang\s*=\s*["\']([^"\']+)["\']', html, re.I)
        if lang:
            s.append(self._sig("indexability", "lang_attr", "pass", lang.group(1), "present", f"HTML lang attribute: {lang.group(1)}"))
        else:
            s.append(self._sig("indexability", "lang_attr", "warn", "missing", "present", "Missing HTML lang attribute"))

        xrt = any('x-robots-tag' in str(h).lower() for h in headers)
        if xrt:
            s.append(self._sig("indexability", "x_robots_tag", "warn", "present", "absent", "X-Robots-Tag header present — check for noindex"))

        return s

    def _check_onpage(self, title, desc, h1, og, tc, html, url):
        s = []
        if not title:
            s.append(self._sig("on_page", "title_missing", "fail", "missing", "30-60 chars", "Title tag is missing"))
        elif len(title) < 30:
            s.append(self._sig("on_page", "title_short", "warn", f"{len(title)} chars", "30-60 chars", f"Title too short ({len(title)} chars)"))
        elif len(title) > 60:
            s.append(self._sig("on_page", "title_long", "warn", f"{len(title)} chars", "30-60 chars", f"Title too long ({len(title)} chars)"))
        else:
            s.append(self._sig("on_page", "title_length", "pass", f"{len(title)} chars", "30-60 chars", "Title length is optimal"))

        title_words = set(_WORD_RE.findall(title.lower()))
        desc_words = set(_WORD_RE.findall(desc.lower())) if desc else set()
        if title_words and desc_words:
            overlap = len(title_words & desc_words) / max(len(title_words), 1)
            if overlap > 0.5:
                s.append(self._sig("on_page", "title_desc_match", "pass", f"{overlap:.0%}", ">50%", "Title and description keyword overlap is good"))
            else:
                s.append(self._sig("on_page", "title_desc_match", "warn", f"{overlap:.0%}", ">50%", "Title and description share few keywords"))

        if not desc:
            s.append(self._sig("on_page", "meta_desc_missing", "fail", "missing", "70-160 chars", "Meta description is missing"))
        elif len(desc) < 70:
            s.append(self._sig("on_page", "meta_desc_short", "warn", f"{len(desc)} chars", "70-160 chars", f"Meta description too short ({len(desc)} chars)"))
        elif len(desc) > 160:
            s.append(self._sig("on_page", "meta_desc_long", "warn", f"{len(desc)} chars", "70-160 chars", f"Meta description too long ({len(desc)} chars)"))
        else:
            s.append(self._sig("on_page", "meta_desc_length", "pass", f"{len(desc)} chars", "70-160 chars", "Meta description length is optimal"))

        if not h1:
            s.append(self._sig("on_page", "h1_missing", "fail", "missing", "1 H1 tag", "No H1 tag found"))
        else:
            h1_count = html.lower().count('<h1')
            if h1_count > 1:
                s.append(self._sig("on_page", "h1_multiple", "warn", h1_count, "1 H1 tag", f"Multiple H1 tags ({h1_count})"))
            else:
                s.append(self._sig("on_page", "h1_present", "pass", "1", "1 H1 tag", "Single H1 tag present"))

        h2_count = len(re.findall(r'<h2\b', html, re.I))
        h3_count = len(re.findall(r'<h3\b', html, re.I))
        if h2_count == 0:
            s.append(self._sig("on_page", "h2_missing", "warn", "0", ">0", "No H2 subheadings found"))
        else:
            s.append(self._sig("on_page", "h2_present", "pass", h2_count, ">0", f"{h2_count} H2 headings found"))

        h_tags = re.findall(r'<h([1-6])\b', html, re.I)
        h_levels = [int(l) for l in h_tags]
        skipped = False
        for i in range(1, len(h_levels)):
            if h_levels[i] > h_levels[i-1] + 1:
                skipped = True
                break
        if skipped:
            s.append(self._sig("on_page", "heading_hierarchy", "warn", str(h_levels[:8]), "sequential", "Heading levels skip (e.g. H1→H3)"))

        if og:
            og_fields = ["og:title", "og:description", "og:image", "og:url", "og:type"]
            present = sum(1 for f in og_fields if f in og)
            if present >= 4:
                s.append(self._sig("on_page", "og_tags", "pass", f"{present}/5", "5/5", "Open Graph tags are mostly present"))
            elif present > 0:
                s.append(self._sig("on_page", "og_tags", "warn", f"{present}/5", "5/5", f"Only {present}/5 Open Graph tags present"))
            else:
                s.append(self._sig("on_page", "og_tags", "fail", "0/5", "5/5", "No Open Graph tags found"))
        else:
            s.append(self._sig("on_page", "og_tags", "fail", "0/5", "5/5", "No Open Graph tags found"))

        if tc:
            tc_fields = ["twitter:card", "twitter:title", "twitter:description"]
            present = sum(1 for f in tc_fields if f in tc)
            if present >= 2:
                s.append(self._sig("on_page", "twitter_card", "pass", f"{present}/3", "3/3", "Twitter Card tags present"))
            else:
                s.append(self._sig("on_page", "twitter_card", "warn", f"{present}/3", "3/3", f"Only {present}/3 Twitter Card tags"))
        else:
            s.append(self._sig("on_page", "twitter_card", "fail", "0/3", "3/3", "No Twitter Card tags found"))

        return s

    def _check_content(self, text, wc, title, h1):
        s = []
        if wc < 300:
            s.append(self._sig("content", "word_count_thin", "fail", wc, ">600", f"Very thin content ({wc} words)"))
        elif wc < 600:
            s.append(self._sig("content", "word_count_short", "warn", wc, ">600", f"Short content ({wc} words)"))
        elif wc > 3000:
            s.append(self._sig("content", "word_count_long", "warn", wc, "600-3000", f"Very long content ({wc} words) — check for fluff"))
        else:
            s.append(self._sig("content", "word_count_good", "pass", wc, "600-3000", f"Good content length ({wc} words)"))

        sentences = _SENTENCE_RE.findall(text)
        if sentences:
            avg_sent_len = sum(len(_WORD_RE.findall(s)) for s in sentences) / len(sentences)
            if avg_sent_len > 25:
                s.append(self._sig("content", "sentence_length", "warn", f"{avg_sent_len:.0f} words", "<25", "Average sentence length too high"))
            else:
                s.append(self._sig("content", "sentence_length", "pass", f"{avg_sent_len:.0f} words", "<25", "Good sentence length"))

        paras = [p.strip() for p in _PARA_RE.split(text) if len(p.strip()) > 20]
        long_paras = [i for i, p in enumerate(paras) if len(_WORD_RE.findall(p)) > 150]
        if long_paras:
            s.append(self._sig("content", "long_paragraphs", "warn", f"{len(long_paras)} long paras", "0", f"{len(long_paras)} paragraphs exceed 150 words"))
        else:
            s.append(self._sig("content", "paragraph_length", "pass", "all <150w", "all <150w", "All paragraphs are reasonable length"))

        has_lists = bool(_LIST_RE.search(text))
        has_tables = bool(_TABLE_RE.search(text))
        if wc > 600 and not has_lists and not has_tables:
            s.append(self._sig("content", "no_lists_tables", "warn", "none", "lists/tables", "No lists or tables in substantial content"))
        elif has_lists or has_tables:
            s.append(self._sig("content", "lists_tables", "pass", "present", "lists/tables", "Lists or tables present for scannability"))

        passive_count = len(_PASSIVE_RE.findall(text))
        passive_pct = (passive_count / max(len(sentences), 1)) * 100
        if passive_pct > 15:
            s.append(self._sig("content", "passive_voice", "warn", f"{passive_pct:.0f}%", "<15%", f"High passive voice ({passive_pct:.0f}%)"))
        else:
            s.append(self._sig("content", "passive_voice", "pass", f"{passive_pct:.0f}%", "<15%", "Passive voice within acceptable range"))

        first_para = text[:500].lower()
        title_words = set(_WORD_RE.findall((title or "").lower())) - {"the", "a", "an", "and", "or", "is", "are", "how", "what", "why", "when", "where", "who"}
        if title_words:
            overlap = len(title_words & set(_WORD_RE.findall(first_para)))
            if overlap > 0:
                s.append(self._sig("content", "first_para_keywords", "pass", f"{overlap} matches", ">0", "First paragraph contains title keywords"))
            else:
                s.append(self._sig("content", "first_para_keywords", "warn", "0 matches", ">0", "First paragraph doesn't contain title keywords"))

        if _DEFINITION_RE.search(text[:800]):
            s.append(self._sig("content", "has_definition", "pass", "present", "present", "Content contains definition-style sentences"))
        else:
            s.append(self._sig("content", "has_definition", "warn", "missing", "present", "No definition-style sentences found in opening"))

        if _STATISTIC_RE.search(text):
            s.append(self._sig("content", "has_statistics", "pass", "present", "present", "Statistics/data points present"))
        else:
            s.append(self._sig("content", "has_statistics", "warn", "missing", "present", "No statistics or data points found"))

        transitions = len(_TRANSITION_RE.findall(text))
        if transitions >= 3:
            s.append(self._sig("content", "transitions", "pass", transitions, ">=3", "Good use of transition words"))
        else:
            s.append(self._sig("content", "transitions", "warn", transitions, ">=3", f"Only {transitions} transition words found"))

        return s

    def _check_links(self, links_int, links_ext, url):
        s = []
        int_count = len(links_int) if isinstance(links_int, list) else 0
        ext_count = len(links_ext) if isinstance(links_ext, list) else 0

        if int_count == 0:
            s.append(self._sig("links", "no_internal", "fail", 0, ">0", "No internal links found"))
        elif int_count < 3:
            s.append(self._sig("links", "few_internal", "warn", int_count, ">=3", f"Very few internal links ({int_count})"))
        else:
            s.append(self._sig("links", "internal_count", "pass", int_count, ">=3", f"{int_count} internal links"))

        if ext_count == 0:
            s.append(self._sig("links", "no_external", "warn", 0, ">=1", "No external links"))
        else:
            s.append(self._sig("links", "external_count", "pass", ext_count, ">=1", f"{ext_count} external links"))

        if int_count + ext_count > 0:
            nofollow_count = 0
            for link in (links_int or []):
                if isinstance(link, dict) and link.get("nofollow"):
                    nofollow_count += 1
            for link in (links_ext or []):
                if isinstance(link, dict) and link.get("nofollow"):
                    nofollow_count += 1
            total = int_count + ext_count
            nofollow_pct = (nofollow_count / total) * 100
            if nofollow_pct > 50:
                s.append(self._sig("links", "nofollow_ratio", "warn", f"{nofollow_pct:.0f}%", "<50%", f"High nofollow ratio ({nofollow_pct:.0f}%)"))
            else:
                s.append(self._sig("links", "nofollow_ratio", "pass", f"{nofollow_pct:.0f}%", "<50%", "Nofollow ratio is acceptable"))

        generic_anchors = ["click here", "read more", "learn more", "here", "this page"]
        for link in (links_int or [])[:50]:
            if isinstance(link, dict):
                anchor = (link.get("anchor") or link.get("text") or "").lower()
                if anchor in generic_anchors:
                    s.append(self._sig("links", "generic_anchor", "warn", anchor[:30], "descriptive", f"Generic anchor text: '{anchor}'"))
                    break

        return s

    def _check_schema(self, schema, page_type):
        s = []
        if not schema:
            s.append(self._sig("schema", "schema_missing", "fail", "none", "at least 1", "No structured data found"))
            return s

        types = []
        for item in schema:
            if isinstance(item, dict):
                t = item.get("@type", "")
                if t:
                    types.append(t)

        s.append(self._sig("schema", "schema_present", "pass", f"{len(types)} types", "at least 1", f"Schema types: {', '.join(types[:5])}"))

        if "Organization" in types or "LocalBusiness" in types:
            s.append(self._sig("schema", "org_schema", "pass", "present", "present", "Organization/LocalBusiness schema present"))
        else:
            s.append(self._sig("schema", "org_schema", "warn", "missing", "present", "No Organization/LocalBusiness schema"))

        pt = (page_type or "").upper()
        type_map = {
            "BLOG": ["Article", "BlogPosting", "Blog"],
            "PRODUCT": ["Product"],
            "FAQ": ["FAQPage"],
            "ABOUT": ["Organization"],
            "PRICING": ["Product", "Offer"],
        }
        expected = type_map.get(pt, [])
        if expected:
            found = any(t in types for t in expected)
            if found:
                s.append(self._sig("schema", "page_type_schema", "pass", "matching", "matching", f"Schema matches page type {pt}"))
            else:
                s.append(self._sig("schema", "page_type_schema", "warn", "mismatch", f"expected {expected}", f"Page type {pt} should have {expected} schema"))

        if "BreadcrumbList" in types:
            s.append(self._sig("schema", "breadcrumb_schema", "pass", "present", "present", "BreadcrumbList schema present"))
        else:
            s.append(self._sig("schema", "breadcrumb_schema", "warn", "missing", "present", "No BreadcrumbList schema"))

        for item in schema:
            if isinstance(item, dict) and item.get("@type") == "Organization":
                if "sameAs" in item and isinstance(item["sameAs"], list) and len(item["sameAs"]) > 0:
                    s.append(self._sig("schema", "org_sameas", "pass", f"{len(item['sameAs'])} links", ">=1", "Organization SameAs links present"))
                else:
                    s.append(self._sig("schema", "org_sameas", "warn", "missing", ">=1", "Organization missing SameAs links"))
                break

        return s

    def _check_performance(self, resp_ms, html, images):
        s = []
        if resp_ms:
            if resp_ms > 3000:
                s.append(self._sig("performance", "response_time", "fail", f"{resp_ms}ms", "<1000ms", f"Very slow response ({resp_ms}ms)"))
            elif resp_ms > 1000:
                s.append(self._sig("performance", "response_time", "warn", f"{resp_ms}ms", "<1000ms", f"Slow response ({resp_ms}ms)"))
            else:
                s.append(self._sig("performance", "response_time", "pass", f"{resp_ms}ms", "<1000ms", "Good response time"))

        html_size = len(html.encode('utf-8')) if html else 0
        if html_size > 2_000_000:
            s.append(self._sig("performance", "html_size", "fail", f"{html_size/1000:.0f}KB", "<500KB", "Very large HTML"))
        elif html_size > 500_000:
            s.append(self._sig("performance", "html_size", "warn", f"{html_size/1000:.0f}KB", "<500KB", f"Large HTML ({html_size/1000:.0f}KB)"))
        else:
            s.append(self._sig("performance", "html_size", "pass", f"{html_size/1000:.0f}KB", "<500KB", "HTML size is reasonable"))

        img_tags = _IMG_RE.findall(html)
        if len(img_tags) > 50:
            s.append(self._sig("performance", "image_count", "warn", len(img_tags), "<50", f"Many images ({len(img_tags)}) — check lazy loading"))

        return s

    def _check_security(self, html, headers):
        s = []
        hsts = any('strict-transport-security' in str(h).lower() for h in headers)
        if hsts:
            s.append(self._sig("security", "hsts", "pass", "present", "present", "HSTS header present"))
        else:
            s.append(self._sig("security", "hsts", "warn", "missing", "present", "Missing HSTS header"))

        xct = any('x-content-type-options' in str(h).lower() for h in headers)
        if xct:
            s.append(self._sig("security", "x_content_type", "pass", "present", "present", "X-Content-Type-Options present"))
        else:
            s.append(self._sig("security", "x_content_type", "warn", "missing", "present", "Missing X-Content-Type-Options"))

        xfo = any('x-frame-options' in str(h).lower() for h in headers)
        if xfo:
            s.append(self._sig("security", "x_frame_options", "pass", "present", "present", "X-Frame-Options present"))
        else:
            s.append(self._sig("security", "x_frame_options", "warn", "missing", "present", "Missing X-Frame-Options"))

        csp = any('content-security-policy' in str(h).lower() for h in headers)
        if csp:
            s.append(self._sig("security", "csp", "pass", "present", "present", "Content-Security-Policy present"))
        else:
            s.append(self._sig("security", "csp", "warn", "missing", "present", "Missing Content-Security-Policy"))

        return s

    def _generate_issues(self, sigs, page):
        issues = []
        counter = 0
        fail_map = {
            "title_missing": ("CRITICAL", "title tag", "Add a unique, descriptive title tag (30-60 characters) with primary keyword"),
            "meta_desc_missing": ("HIGH", "meta description", "Write a compelling meta description (70-160 characters) with CTA"),
            "h1_missing": ("CRITICAL", "H1 tag", "Add a single H1 tag that matches the page's primary topic"),
            "canonical_missing": ("HIGH", "canonical tag", "Add a self-referencing canonical tag pointing to this URL"),
            "canonical_external": ("CRITICAL", "canonical tag", "Fix canonical to point to this page's own URL"),
            "noindex": ("CRITICAL", "meta robots", "Remove noindex directive if this page should be indexed"),
            "https": ("CRITICAL", "page URL", "Migrate to HTTPS immediately"),
            "viewport": ("CRITICAL", "viewport meta", "Add <meta name='viewport' content='width=device-width, initial-scale=1'>"),
            "schema_missing": ("HIGH", "structured data", "Add relevant Schema.org structured data"),
            "og_tags": ("MEDIUM", "Open Graph", "Add Open Graph tags for social sharing"),
            "twitter_card": ("MEDIUM", "Twitter Card", "Add Twitter Card meta tags"),
            "no_internal": ("HIGH", "internal links", "Add internal links to related content on your site"),
            "word_count_thin": ("HIGH", "content", "Expand content to at least 600 words with unique, valuable information"),
            "word_count_short": ("MEDIUM", "content", "Consider expanding content for better topic coverage"),
            "long_paragraphs": ("MEDIUM", "paragraphs", "Break long paragraphs into 3-5 sentence chunks"),
            "passive_voice": ("LOW", "content style", "Rewrite passive voice sentences in active voice"),
            "has_statistics": ("MEDIUM", "content depth", "Add relevant statistics and data points to support claims"),
            "no_lists_tables": ("LOW", "content format", "Add lists or tables to improve scannability"),
            "org_schema": ("MEDIUM", "Organization schema", "Add Organization schema with SameAs links to social profiles"),
            "breadcrumb_schema": ("LOW", "BreadcrumbList schema", "Add BreadcrumbList schema for navigation breadcrumbs"),
        }

        for sig in sigs:
            if sig["status"] == "fail" and sig["name"] in fail_map:
                counter += 1
                sev, element, fix = fail_map[sig["name"]]
                issues.append({
                    "id": f"FIX-{counter:03d}",
                    "category": sig["category"].replace("_", "-").title(),
                    "severity": sev,
                    "element": element,
                    "issue": sig["detail"],
                    "current_value": str(sig["value"])[:200],
                    "recommended_value": sig["expected"],
                    "impact_score": 90 if sev == "CRITICAL" else 70 if sev == "HIGH" else 40 if sev == "MEDIUM" else 20,
                    "effort": "Low" if "missing" in str(sig["value"]).lower() else "Medium",
                    "fix": fix,
                    "seo_justification": f"Failing {sig['name']} signal directly impacts search engine crawling, indexing, and ranking.",
                })
            elif sig["status"] == "warn" and sig["name"] in fail_map:
                counter += 1
                sev, element, fix = fail_map[sig["name"]]
                issues.append({
                    "id": f"FIX-{counter:03d}",
                    "category": sig["category"].replace("_", "-").title(),
                    "severity": "MEDIUM" if sev == "CRITICAL" else sev,
                    "element": element,
                    "issue": sig["detail"],
                    "current_value": str(sig["value"])[:200],
                    "recommended_value": sig["expected"],
                    "impact_score": 50,
                    "effort": "Low",
                    "fix": fix,
                    "seo_justification": f"Warning on {sig['name']} signal may reduce search visibility.",
                })

        issues.sort(key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x["severity"], 4))
        return issues
