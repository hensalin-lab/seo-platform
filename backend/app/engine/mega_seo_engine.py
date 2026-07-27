"""Mega SEO Intelligence Engine — 500+ rule-based signals with detailed fixes, WHY explanations, and code examples.
Works WITHOUT any AI API. Pure rule-based analysis."""
import re
import math
from typing import Any

_WORD_RE = re.compile(r'\b\w+\b')
_SENTENCE_RE = re.compile(r'[^.!?]+[.!?]+')
_URL_PATH_RE = re.compile(r'https?://[^/]+(/.*)')
_DOMAIN_RE = re.compile(r'https?://([^/]+)')


def _safe_list(val):
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            import json
            return json.loads(val)
        except Exception:
            return []
    return []


def _safe_dict(val):
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            import json
            return json.loads(val)
        except Exception:
            return {}
    return {}


def _words(text):
    return _WORD_RE.findall((text or "").lower())


class MegaSEOEngine:
    """Runs 500+ checks across 15 categories. Each check returns a detailed signal dict."""

    CATEGORIES = [
        "title_tag", "meta_tags", "headings", "content_quality", "content_structure",
        "keyword_optimization", "internal_links", "external_links", "image_optimization",
        "url_structure", "schema_markup", "open_graph", "mobile_optimization",
        "page_speed", "security", "crawlability", "indexability", "user_experience",
        "ai_search_readiness", "entity_optimization", "freshness_signals",
        "local_seo", "video_seo", "social_signals", "conversion_optimization",
        "readability", "semantic_html", "structured_data_richness",
        "voice_search", "accessibility", "international_seo",
        "page_engagement", "content_freshness", "brand_authority",
        "link_quality", "competitor_benchmarking", "content_uniqueness",
        "visual_content", "technical_integrity", "core_web_vitals_detailed",
        "mobile_first", "progressive_web", "AMP_validation",
    ]

    def analyze(self, page, all_pages=None) -> dict:
        all_pages = all_pages or []
        html = page.html_raw or ""
        text = page.content_text or ""
        wc = page.word_count or 0
        title = page.title or ""
        desc = page.meta_description or ""
        h1 = page.h1 or ""
        canonical = page.canonical or ""
        url = page.url or ""
        images = _safe_list(page.images)
        links_int = _safe_list(page.links_internal)
        links_ext = _safe_list(page.links_external)
        schema = _safe_list(page.schema_markup)
        og = _safe_dict(page.open_graph)
        tc = _safe_dict(page.twitter_card)
        headings = _safe_list(getattr(page, 'headings', None) or getattr(page, 'headers', None))
        status = page.status_code or 0
        resp_ms = page.response_time_ms or 0
        crawl_depth = page.crawl_depth or 0
        robots_meta = getattr(page, 'robots_meta', '') or ""
        https = getattr(page, 'https', False)
        is_indexable = getattr(page, 'is_indexable', True)

        signals = []
        words = _words(text)
        sentences = _SENTENCE_RE.findall(text or "")

        signals += self._title_tag_signals(title, url, words, wc)
        signals += self._meta_tag_signals(desc, url, title)
        signals += self._heading_signals(headings, h1, text, words)
        signals += self._content_quality_signals(text, wc, sentences, words, title, h1)
        signals += self._content_structure_signals(html, text, wc)
        signals += self._keyword_signals(words, title, h1, desc, text, wc)
        signals += self._internal_link_signals(links_int, url, all_pages, wc)
        signals += self._external_link_signals(links_ext, url)
        signals += self._image_signals(images, text, html)
        signals += self._url_signals(url, title)
        signals += self._schema_signals(schema, title, desc, url, text)
        signals += self._open_graph_signals(og, tc, title, desc, url)
        signals += self._mobile_signals(html, resp_ms)
        signals += self._speed_signals(resp_ms, html, images)
        signals += self._security_signals(html, https, status)
        signals += self._crawlability_signals(status, robots_meta, is_indexable, html)
        signals += self._indexability_signals(canonical, status, robots_meta, is_indexable)
        signals += self._ux_signals(wc, images, links_int, crawl_depth)
        signals += self._ai_search_signals(text, schema, wc, headings)
        signals += self._entity_signals(text, words, schema)
        signals += self._freshness_signals(html, text)
        signals += self._local_seo_signals(text, url, schema)
        signals += self._video_signals(html, text)
        signals += self._social_signals(og, tc, schema)
        signals += self._conversion_signals(text, html, links_int)
        signals += self._advanced_content_signals(text, wc, words, html, sentences, title, h1, desc)
        signals += self._advanced_technical_signals(html, resp_ms, status, wc)
        signals += self._advanced_link_signals(links_int, links_ext, url, wc, all_pages)
        signals += self._advanced_schema_signals(schema, title, desc, url, text, html)
        signals += self._advanced_onpage_signals(title, desc, h1, og, tc, html, url, wc, words)
        signals += self._readability_signals(text, wc, sentences, words)
        signals += self._semantic_html_signals(html, text, headings)
        signals += self._structured_data_richness_signals(schema, title, desc, url, text, html)
        signals += self._voice_search_signals(text, words, headings, wc)
        signals += self._accessibility_signals(html, images, text)
        signals += self._content_freshness_signals(html, text, url)
        signals += self._brand_authority_signals(text, schema, url, title, desc)
        signals += self._link_quality_signals(links_int, links_ext, url, wc)
        signals += self._content_uniqueness_signals(text, wc)
        signals += self._visual_content_signals(images, text, html, wc)
        signals += self._core_web_vitals_signals(resp_ms, html, images)
        signals += self._mobile_first_signals(html, resp_ms)
        signals += self._technical_integrity_signals(html, status, url, robots_meta, is_indexable)

        cat_scores = {}
        for cat in self.CATEGORIES:
            cat_sigs = [s for s in signals if s["category"] == cat]
            if cat_sigs:
                passes = sum(1 for s in cat_sigs if s["status"] == "pass")
                warns = sum(1 for s in cat_sigs if s["status"] == "warn")
                fails = sum(1 for s in cat_sigs if s["status"] == "fail")
                total = len(cat_sigs)
                cat_scores[cat] = round((passes * 100 + warns * 50) / max(total, 1), 1)
            else:
                cat_scores[cat] = 100.0

        weights = {
            "title_tag": 0.06, "meta_tags": 0.05, "headings": 0.04, "content_quality": 0.09,
            "content_structure": 0.04, "keyword_optimization": 0.06, "internal_links": 0.05,
            "external_links": 0.02, "image_optimization": 0.03, "url_structure": 0.03,
            "schema_markup": 0.04, "open_graph": 0.02, "mobile_optimization": 0.04,
            "page_speed": 0.04, "security": 0.02, "crawlability": 0.03, "indexability": 0.04,
            "user_experience": 0.02, "ai_search_readiness": 0.04, "entity_optimization": 0.02,
            "freshness_signals": 0.01, "local_seo": 0.01, "video_seo": 0.01,
            "social_signals": 0.01, "conversion_optimization": 0.01,
            "readability": 0.03, "semantic_html": 0.02, "structured_data_richness": 0.03,
            "voice_search": 0.02, "accessibility": 0.02, "international_seo": 0.01,
            "page_engagement": 0.01, "content_freshness": 0.01, "brand_authority": 0.02,
            "link_quality": 0.02, "competitor_benchmarking": 0.01, "content_uniqueness": 0.01,
            "visual_content": 0.01, "technical_integrity": 0.02, "core_web_vitals_detailed": 0.03,
            "mobile_first": 0.02, "progressive_web": 0.01, "AMP_validation": 0.01,
        }
        overall = sum(cat_scores.get(c, 100) * w for c, w in weights.items())

        issues = []
        for s in signals:
            if s["status"] in ("warn", "fail"):
                issues.append({
                    "signal_id": s["id"],
                    "signal_name": s["name"],
                    "category": s["category"],
                    "severity": s["severity"],
                    "status": s["status"],
                    "what_wrong": s["what_wrong"],
                    "why_it_matters": s["why_it_matters"],
                    "how_to_fix": s["how_to_fix"],
                    "code_example": s.get("code_example", ""),
                    "before_code": s.get("before_code", ""),
                    "after_code": s.get("after_code", ""),
                    "expected_impact": s["expected_impact"],
                    "effort": s["effort"],
                    "page_url": url,
                })

        issues.sort(key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x["severity"], 4))

        return {
            "overall_score": round(overall, 1),
            "signals_checked": len(signals),
            "signals_passing": sum(1 for s in signals if s["status"] == "pass"),
            "signals_warning": sum(1 for s in signals if s["status"] == "warn"),
            "signals_failing": sum(1 for s in signals if s["status"] == "fail"),
            "category_scores": cat_scores,
            "all_signals": signals,
            "issues": issues,
            "top_fixes": issues[:10],
        }

    def _s(self, id, name, cat, status, severity, what_wrong, why, fix, impact="Moderate", effort="Easy", code="", before="", after=""):
        return {
            "id": id, "name": name, "category": cat, "status": status, "severity": severity,
            "what_wrong": what_wrong, "why_it_matters": why, "how_to_fix": fix,
            "code_example": code, "before_code": before, "after_code": after,
            "expected_impact": impact, "effort": effort,
        }

    def _title_tag_signals(self, title, url, words, wc):
        sigs = []
        t = title.strip()
        tl = len(t)

        if not t:
            sigs.append(self._s("T001", "Missing Title Tag", "title_tag", "fail", "CRITICAL",
                "Your page has no title tag. This is the single most important on-page SEO element.",
                "Google uses the title tag as the first signal to understand page content. Without one, Google must guess what your page is about, which almost always leads to poor rankings. Title tags appear as the blue clickable link in search results — they directly affect click-through rate.",
                "Add a unique, descriptive title tag between 50-60 characters. Place your primary keyword at the beginning. Make it compelling enough to click.",
                "Critical for ranking — can improve position by 5-10 spots", "Easy",
                '<head>\n  <title>Your Primary Keyword - Brand Name</title>\n</head>',
                '<head>\n  <!-- No title tag -->\n</head>',
                '<head>\n  <title>Data Analytics Platform - DataViCloud AI</title>\n</head>'))
        else:
            if tl < 30:
                sigs.append(self._s("T002", "Title Tag Too Short", "title_tag", "warn", "HIGH",
                    f"Your title tag is only {tl} characters. Google may rewrite it or add your brand name.",
                    "Short titles waste valuable ranking real estate. You're missing an opportunity to include secondary keywords and make the result more compelling to click. Google may replace your title with content from the page, which may not be as optimized.",
                    f"Expand your title to 50-60 characters. Include your primary keyword near the start, a secondary keyword or benefit, and your brand name. Example: 'AI Data Analytics Platform | Real-Time Insights - DataViCloud'",
                    "Can improve CTR by 10-20%", "Easy",
                    f"<title>DataViCloud - AI-Powered Analytics Platform</title>  <!-- {tl} chars, too short -->",
                    "",
                    "<title>AI Data Analytics Platform | Real-Time Insights - DataViCloud</title>  <!-- 58 chars, optimal -->"))
            elif tl > 60:
                sigs.append(self._s("T003", "Title Tag Too Long", "title_tag", "warn", "MEDIUM",
                    f"Your title tag is {tl} characters. Google will truncate it after ~60 characters, cutting off important words.",
                    "Truncated titles look unprofessional in search results and may cut off your brand name or key benefit. This reduces click-through rate and can confuse users about what the page offers.",
                    "Shorten to 50-60 characters. Move less important words to the end. Remove filler words like 'the', 'a', 'and'.",
                    "Improved CTR from non-truncated display", "Easy",
                    f"<title>{t[:60]}...</title>  <!-- currently {tl} chars, truncated -->",
                    "",
                    "<title>AI Data Analytics Platform - DataViCloud</title>  <!-- 48 chars, fits perfectly -->"))
            else:
                sigs.append(self._s("T001", "Title Tag Present", "title_tag", "pass", "LOW",
                    "Your title tag is properly formatted and within optimal length.", "", "", "", "Easy"))

            kw_in_title = any(w in t.lower() for w in words[:5]) if words else False
            if not kw_in_title and words:
                sigs.append(self._s("T004", "Primary Keyword Not in Title", "title_tag", "warn", "HIGH",
                    "Your page's most frequent word (likely your primary keyword) does not appear in the title tag.",
                    "The title tag is the strongest on-page ranking signal. If your target keyword isn't in it, Google has a harder time associating your page with that search query. Pages with the keyword in the title rank an average of 1.5 positions higher.",
                    "Rewrite the title to include your primary keyword naturally near the beginning. Don't force it — make it read naturally for humans.",
                    "High — direct ranking signal", "Easy",
                    f"<title>{t}</title>  <!-- missing primary keyword -->",
                    "",
                    "<title>AI Data Analytics Platform | DataViCloud</title>  <!-- keyword 'AI data analytics' included -->"))
            else:
                sigs.append(self._s("T005", "Keyword in Title", "title_tag", "pass", "LOW",
                    "Your primary keyword appears in the title tag. Good.", "", "", "", "Easy"))

            brand_words = ["datavicloud", "brand"]
            has_brand = any(b in t.lower() for b in brand_words)
            if not has_brand:
                sigs.append(self._s("T006", "No Brand Name in Title", "title_tag", "warn", "LOW",
                    "Your brand name is not in the title tag.",
                    "Brand names increase trust and click-through rate. Users who recognize your brand are more likely to click. Google also uses brand signals to understand your site's authority.",
                    "Add your brand name to the end of the title, separated by a pipe (|) or dash (-).", "Improved brand recognition and CTR", "Easy",
                    "", "",
                    f"<title>{t} - DataViCloud</title>"))
            else:
                sigs.append(self._s("T007", "Brand in Title", "title_tag", "pass", "LOW", "", "", "", "", "Easy"))

            if " | " in t and " - " in t:
                sigs.append(self._s("T008", "Multiple Separators in Title", "title_tag", "warn", "LOW",
                    "Your title contains both pipe (|) and dash (-) separators. Use only one consistently.",
                    "Multiple separators look messy in search results and reduce professionalism.",
                    "Choose one separator style (pipe or dash) and use it consistently across your site.", "", "Easy"))
        return sigs

    def _meta_tag_signals(self, desc, url, title):
        sigs = []
        d = desc.strip()
        dl = len(d)

        if not d:
            sigs.append(self._s("M001", "Missing Meta Description", "meta_tags", "fail", "CRITICAL",
                "Your page has no meta description. Google will auto-generate one from page content.",
                "Meta descriptions don't directly affect rankings, but they massively affect click-through rate (CTR). A good meta description can increase CTR by 5-10%, which IS a ranking signal. Google rewrites auto-generated descriptions 70% of the time, often poorly.",
                "Write a unique meta description of 150-160 characters. Include your primary keyword naturally. Write it as a compelling pitch — tell users WHY they should click.",
                "Can improve CTR by 5-10% which improves ranking", "Easy",
                '<meta name="description" content="Your compelling description here">',
                '<!-- No meta description -->',
                '<meta name="description" content="DataViCloud AI analytics platform processes 1B+ data points in real-time. Get actionable insights, predict trends, and make data-driven decisions. Free trial.">'))
        else:
            if dl < 70:
                sigs.append(self._s("M002", "Meta Description Too Short", "meta_tags", "warn", "HIGH",
                    f"Your meta description is only {dl} characters. You're wasting 80+ characters of persuasive space.",
                    "Short descriptions appear incomplete in search results. You have room to include keywords, benefits, and a call-to-action. Every unused character is a missed opportunity to convince a user to click.",
                    f"Expand to 150-160 characters. Include: (1) what the page offers, (2) a key benefit, (3) a call-to-action or unique selling point.",
                    "Higher CTR from more informative snippet", "Easy"))
            elif dl > 160:
                sigs.append(self._s("M003", "Meta Description Too Long", "meta_tags", "warn", "MEDIUM",
                    f"Your meta description is {dl} characters. Google will truncate it after ~155-160 characters.",
                    "Truncated descriptions cut off mid-sentence, making your result look unprofessional and confusing users.",
                    "Shorten to 150-160 characters. Front-load the most important information.", "Better display in SERPs", "Easy"))
            else:
                sigs.append(self._s("M004", "Meta Description Length OK", "meta_tags", "pass", "LOW", "", "", "", "", "Easy"))

            kw_in_desc = any(w in d.lower() for w in _words(title)[:3]) if title else False
            if not kw_in_desc and title:
                sigs.append(self._s("M005", "Keyword Not in Meta Description", "meta_tags", "warn", "MEDIUM",
                    "Your primary keyword from the title does not appear in the meta description.",
                    "Google bolds matching keywords in search results. When users see their search term bolded in your description, they're more likely to click. This directly improves CTR.",
                    "Naturally include your primary keyword in the meta description. Google will bold it in results.",
                    "Higher CTR from keyword bolding in SERPs", "Easy"))
            else:
                sigs.append(self._s("M006", "Keyword in Meta Description", "meta_tags", "pass", "LOW", "", "", "", "", "Easy"))

        if not desc or dl == 0:
            pass
        elif "click" not in d.lower() and "learn" not in d.lower() and "discover" not in d.lower() and "try" not in d.lower():
            sigs.append(self._s("M007", "No Call-to-Action in Description", "meta_tags", "warn", "LOW",
                "Your meta description doesn't contain a call-to-action (click, learn, discover, try, get, start).",
                "CTAs in meta descriptions increase CTR by 2-5%. They create urgency and tell users what to do next.",
                "Add a subtle CTA like 'Learn how...', 'Discover...', 'Get started...', 'Try free...'", "Improved CTR", "Easy"))
        else:
            sigs.append(self._s("M008", "Has CTA in Description", "meta_tags", "pass", "LOW", "", "", "", "", "Easy"))
        return sigs

    def _heading_signals(self, headings, h1, text, words):
        sigs = []
        heading_list = []
        if isinstance(headings, list):
            for h in headings:
                if isinstance(h, dict):
                    heading_list.append(h)
                elif isinstance(h, str):
                    heading_list.append({"tag": "h", "text": h})

        h1_text = h1 or (heading_list[0].get("text", "") if heading_list and heading_list[0].get("tag", "").startswith("h1") else "")

        if not h1_text:
            sigs.append(self._s("H001", "Missing H1 Tag", "headings", "fail", "CRITICAL",
                "Your page has no H1 heading. Every page must have exactly one H1.",
                "The H1 is the second most important on-page signal after the title tag. It tells Google the main topic of the page. Without it, Google struggles to understand your content hierarchy.",
                "Add one H1 tag that clearly describes the page topic. Include your primary keyword. Only ONE H1 per page.",
                "Critical — can improve ranking by 3-5 positions", "Easy",
                '<h1>AI Data Analytics Platform</h1>',
                '<!-- No H1 tag -->',
                '<h1>DataViCloud: AI-Powered Data Analytics Platform</h1>'))
        else:
            sigs.append(self._s("H002", "H1 Present", "headings", "pass", "LOW", "", "", "", "", "Easy"))
            if len(h1_text) > 70:
                sigs.append(self._s("H003", "H1 Too Long", "headings", "warn", "MEDIUM",
                    f"Your H1 is {len(h1_text)} characters. Keep it under 70 characters for best results.",
                    "Long H1s dilute the keyword signal and may confuse Google about the primary topic.",
                    "Shorten the H1 to under 70 characters. Keep it clear and keyword-focused.", "", "Easy"))

        h_count = len(heading_list)
        if h_count == 0:
            sigs.append(self._s("H004", "No Subheadings (H2-H6)", "headings", "fail", "HIGH",
                "Your page has no subheadings. Content without structure is hard for both users and Google to digest.",
                "Subheadings help Google understand the content hierarchy and topical coverage. Pages with structured headings rank higher because they provide better user experience and topical depth signals.",
                "Add H2 headings for major sections, H3 for subsections. Include keywords in at least 50% of subheadings. Use a logical hierarchy.",
                "Improved rankings from better content structure", "Medium"))
        elif h_count < 3 and (page_wc := len(words)) > 500:
            sigs.append(self._s("H005", "Too Few Subheadings for Content Length", "headings", "warn", "MEDIUM",
                f"You have only {h_count} heading(s) for a {page_wc}-word page. Aim for 1 heading per 200-300 words.",
                "Long blocks of text without subheadings are exhausting to read. Google measures user engagement metrics — if users bounce because content looks overwhelming, it hurts rankings.",
                f"Add approximately {max(2, page_wc // 300 - h_count)} more H2/H3 subheadings to break up your content into digestible sections.", "", "Medium"))
        else:
            sigs.append(self._s("H006", "Good Subheading Count", "headings", "pass", "LOW", "", "", "", "", "Easy"))

        kw_h1 = any(w in h1_text.lower() for w in words[:3]) if h1_text and words else False
        if not kw_h1 and h1_text and words:
            sigs.append(self._s("H007", "Primary Keyword Not in H1", "headings", "warn", "HIGH",
                "Your primary keyword doesn't appear in the H1 tag.",
                "The H1 strongly signals page topic to Google. Missing the keyword weakens this signal.",
                "Rewrite the H1 to naturally include your primary keyword.", "Direct ranking signal", "Easy"))
        elif h1_text:
            sigs.append(self._s("H008", "Keyword in H1", "headings", "pass", "LOW", "", "", "", "", "Easy"))

        h2_texts = [h.get("text", "") for h in heading_list if isinstance(h, dict) and h.get("tag", "").startswith("h2")]
        if h2_texts:
            empty_h2 = [t for t in h2_texts if not t.strip()]
            if empty_h2:
                sigs.append(self._s("H009", "Empty H2 Tags", "headings", "warn", "MEDIUM",
                    f"You have {len(empty_h2)} empty H2 heading(s).",
                    "Empty headings confuse Google's content parsing and waste structural signals.",
                    "Either add meaningful text to each heading or remove the empty tags.", "", "Easy"))
        return sigs

    def _content_quality_signals(self, text, wc, sentences, words, title, h1):
        sigs = []
        if wc == 0:
            sigs.append(self._s("CQ001", "No Content Detected", "content_quality", "fail", "CRITICAL",
                "No text content was detected on this page.",
                "Content is the foundation of SEO. Without text, Google has nothing to index.",
                "Add meaningful, original content. Aim for 1500+ words for competitive topics.", "Critical", "Medium"))
            return sigs

        if wc < 300:
            sigs.append(self._s("CQ002", "Thin Content", "content_quality", "fail", "CRITICAL",
                f"This page has only {wc} words. Google considers pages with under 300 words as 'thin content'.",
                "Thin content rarely ranks because it can't comprehensively cover a topic. Google's Helpful Content Update specifically targets thin pages. The top-ranking pages for most keywords have 1500-2500 words.",
                f"Expand to at least 1500 words. Add: detailed explanations, examples, statistics, comparisons, FAQs. Cover the topic from every angle.",
                "Can improve ranking by 5-15 positions", "Medium"))
        elif wc < 800:
            sigs.append(self._s("CQ003", "Below-Average Content Length", "content_quality", "warn", "HIGH",
                f"This page has {wc} words. The average top-10 page has 1500-2500 words.",
                "Shorter content struggles to cover topics comprehensively. Google favors depth and thoroughness.",
                "Add 700-1700 more words of valuable, relevant content. Include examples, data, and expert insights.",
                "Improved topical authority", "Medium"))
        elif wc < 1500:
            sigs.append(self._s("CQ004", "Moderate Content Length", "content_quality", "warn", "MEDIUM",
                f"This page has {wc} words. Competitive pages typically have 1500+ words.",
                "While not thin, more depth could help compete for competitive keywords.",
                "Consider adding more detail, examples, or a FAQ section to reach 1500+ words.", "Moderate improvement potential", "Medium"))
        else:
            sigs.append(self._s("CQ005", "Good Content Length", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        if wc > 3000:
            sigs.append(self._s("CQ006", "Long-Form Content", "content_quality", "pass", "LOW",
                f"Excellent — {wc} words. Long-form content tends to rank for more keywords and earn more backlinks.", "", "", "", "Easy"))

        if sentences:
            avg_sent_len = wc / max(len(sentences), 1)
            if avg_sent_len > 25:
                sigs.append(self._s("CQ007", "Sentences Too Long", "content_quality", "warn", "MEDIUM",
                    f"Average sentence length is {avg_sent_len:.0f} words. Aim for 15-20 words per sentence.",
                    "Long sentences reduce readability. Google's Helpful Content Update considers user experience — hard-to-read content gets demoted.",
                    "Break long sentences into shorter ones. Target 15-20 words average. Use simple language.", "Improved readability score", "Medium"))
            elif avg_sent_len < 8:
                sigs.append(self._s("CQ008", "Sentences Too Short", "content_quality", "warn", "LOW",
                    f"Average sentence length is only {avg_sent_len:.0f} words. Very short sentences can feel choppy.",
                    "While short sentences are readable, a page full of them lacks depth and sophistication.",
                    "Vary sentence length. Mix short punchy sentences with longer explanatory ones.", "", "Easy"))
            else:
                sigs.append(self._s("CQ009", "Good Sentence Length", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        stop_words = {"the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall", "can", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once", "and", "but", "or", "nor", "not", "so", "yet", "both", "either", "neither", "each", "every", "all", "any", "few", "more", "most", "other", "some", "such", "no", "only", "own", "same", "than", "too", "very", "just", "because", "if", "when", "while", "this", "that", "these", "those", "it", "its", "they", "them", "their"}
        content_words = [w for w in words if w not in stop_words and len(w) > 2]
        if content_words:
            from collections import Counter
            word_freq = Counter(content_words)
            top_5 = word_freq.most_common(5)
            if title:
                title_words = [w.lower() for w in title.split() if w.lower() not in stop_words]
                kw_density = sum(word_freq.get(w, 0) for w in title_words) / max(wc, 1) * 100
                if kw_density > 3:
                    sigs.append(self._s("CQ010", "Keyword Stuffing Risk", "content_quality", "warn", "HIGH",
                        f"Your primary keyword appears {kw_density:.1f}% of the time. This may trigger keyword stuffing penalties.",
                        "Google's spam algorithms detect over-optimization. Keyword density above 2-3% is a red flag. Instead of repeating keywords, use synonyms and related terms.",
                        "Reduce keyword repetition. Use LSI keywords (related terms) and synonyms. Aim for 1-2% natural density.",
                        "Avoids spam penalty", "Medium"))
                elif kw_density < 0.5 and title_words:
                    sigs.append(self._s("CQ011", "Very Low Keyword Density", "content_quality", "warn", "MEDIUM",
                        f"Your primary keyword appears only {kw_density:.1f}% of the time. Google may not associate this page with that keyword.",
                        "While over-optimization is bad, under-optimization means Google doesn't have strong keyword signals.",
                        "Naturally incorporate your primary keyword 3-5 times throughout the content. Use it in at least one heading.",
                        "Stronger keyword association", "Easy"))
                else:
                    sigs.append(self._s("CQ012", "Good Keyword Density", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        if wc > 500:
            list_count = len(re.findall(r'<(?:ul|ol)\b|^\s*[-*]\s|^\s*\d+\.\s', (text or ""), re.M | re.I))
            if list_count == 0:
                sigs.append(self._s("CQ013", "No Lists in Content", "content_quality", "warn", "MEDIUM",
                    "Your content has no bulleted or numbered lists despite being long enough to warrant them.",
                    "Lists improve readability and are favored by Google for featured snippets. They also help AI search engines extract answers.",
                    "Add bulleted or numbered lists where you mention steps, features, benefits, or comparisons.", "Featured snippet potential", "Easy"))
        return sigs

    def _content_structure_signals(self, html, text, wc):
        sigs = []
        if wc < 100:
            return sigs

        table_count = len(re.findall(r'<table\b', html or "", re.I))
        if table_count == 0 and wc > 800:
            sigs.append(self._s("CS001", "No Tables in Content", "content_structure", "warn", "MEDIUM",
                "Your content has no HTML tables. Tables are powerful for comparisons, data, and featured snippets.",
                "Google loves structured data in tables. Featured snippets often pull table data. Tables also improve E-E-A-T signals.",
                "Add tables for comparisons, pricing, specifications, or data summaries.", "Featured snippet potential", "Medium"))
        else:
            sigs.append(self._s("CS002", "Tables Present", "content_structure", "pass", "LOW", "", "", "", "", "Easy"))

        faq_signals = bool(re.search(r'(?i)(faq|frequently asked|common questions)', text or ""))
        paa_signals = bool(re.search(r'(?i)(people also ask|q:|question:|answer:)', text or ""))
        if not faq_signals and not paa_signals and wc > 1000:
            sigs.append(self._s("CS003", "No FAQ Section", "content_structure", "warn", "MEDIUM",
                "Your content doesn't include an FAQ section or Q&A format.",
                "FAQ sections are prime real estate for Google's 'People Also Ask' boxes. They directly answer common questions, making your content more citable by AI search engines.",
                "Add a FAQ section at the bottom with 5-10 questions your audience asks. Use proper FAQ schema markup.",
                "Can capture People Also Ask boxes", "Medium"))
        else:
            sigs.append(self._s("CS004", "FAQ/Q&A Content Found", "content_structure", "pass", "LOW", "", "", "", "", "Easy"))

        paragraph_count = len(re.split(r'\n\s*\n', text or ""))
        avg_para_len = wc / max(paragraph_count, 1)
        if avg_para_len > 150:
            sigs.append(self._s("CS005", "Long Paragraphs", "content_structure", "warn", "MEDIUM",
                f"Average paragraph length is {avg_para_len:.0f} words. Users skim — keep paragraphs under 100 words.",
                "Long paragraphs increase bounce rate. Mobile users especially struggle with long text blocks.",
                "Break paragraphs at 3-4 sentences (80-100 words max). Use line breaks between sections.", "Lower bounce rate", "Easy"))
        else:
            sigs.append(self._s("CS006", "Good Paragraph Length", "content_structure", "pass", "LOW", "", "", "", "", "Easy"))

        jump_links = bool(re.search(r'(?i)(table of contents|jump to|skip to|on this page)', html or ""))
        if not jump_links and wc > 2000:
            sigs.append(self._s("CS007", "No Table of Contents", "content_structure", "warn", "LOW",
                "Long-form content (2000+ words) lacks a table of contents or jump links.",
                "TOCs improve user navigation and can generate sitelinks in Google search results. They also help Google understand content structure.",
                "Add a clickable table of contents at the top. Link to H2/H3 headings using anchor links.", "Improved UX and potential sitelinks", "Medium"))
        return sigs

    def _keyword_signals(self, words, title, h1, desc, text, wc):
        sigs = []
        if not words or wc < 100:
            return sigs

        from collections import Counter
        stop = {"the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "and", "but", "or", "not", "this", "that", "it", "its", "you", "your", "we", "our", "they", "their", "i", "me", "my", "no", "so", "if", "or", "all", "just", "more", "also", "about", "which", "who", "when", "where", "how", "what", "than", "then", "there", "here", "very", "one", "two", "each", "some", "any", "most", "other", "into", "over", "such", "only"}
        content_words = [w for w in words if w not in stop and len(w) > 2]
        word_freq = Counter(content_words).most_common(20)
        primary_kw = word_freq[0][0] if word_freq else ""

        if primary_kw:
            kw_in_first_100 = primary_kw in " ".join(words[:100])
            if not kw_in_first_100 and wc > 200:
                sigs.append(self._s("K001", "Primary Keyword Not in First 100 Words", "keyword_optimization", "warn", "MEDIUM",
                    f"Your top keyword '{primary_kw}' doesn't appear in the first 100 words of content.",
                    "Google gives more weight to keywords that appear early in the content. Starting with your target keyword signals immediate relevance.",
                    f"Include '{primary_kw}' naturally within the first 1-2 sentences of your content.",
                    "Stronger early content relevance", "Easy"))
            else:
                sigs.append(self._s("K002", "Keyword in Opening Content", "keyword_optimization", "pass", "LOW", "", "", "", "", "Easy"))

            if wc > 500:
                paragraphs = re.split(r'\n\s*\n', text or "")
                kw_in_last = any(primary_kw in p.lower() for p in paragraphs[-3:]) if paragraphs else False
                if not kw_in_last:
                    sigs.append(self._s("K003", "Keyword Not in Conclusion", "keyword_optimization", "warn", "LOW",
                        f"'{primary_kw}' doesn't appear in your concluding paragraphs.",
                        "Reinforcing your primary keyword in the conclusion strengthens topical relevance and leaves a lasting impression.",
                        f"Naturally include '{primary_kw}' in your final 2-3 paragraphs.", "", "Easy"))
                else:
                    sigs.append(self._s("K004", "Keyword in Conclusion", "keyword_optimization", "pass", "LOW", "", "", "", "", "Easy"))

            if len(content_words) > 50:
                bigrams = [f"{content_words[i]} {content_words[i+1]}" for i in range(len(content_words)-1)]
                bigram_freq = Counter(bigrams).most_common(5)
                if bigram_freq:
                    top_bigram = bigram_freq[0][0]
                    top_count = bigram_freq[0][1]
                    if top_count > wc * 0.03:
                        sigs.append(self._s("K005", "Potential Keyword Stuffing (Bigram)", "keyword_optimization", "warn", "HIGH",
                            f"The phrase '{top_bigram}' appears {top_count} times ({top_count/max(wc,1)*100:.1f}%). This may be over-optimized.",
                            "Repetitive phrases trigger Google's over-optimization filters.",
                            "Vary your language. Use synonyms, related terms, and different phrasings.", "", "Medium"))
        return sigs

    def _internal_link_signals(self, links_int, url, all_pages, wc):
        sigs = []
        count = len(links_int)

        if count == 0:
            sigs.append(self._s("IL001", "No Internal Links", "internal_links", "fail", "HIGH",
                "This page has zero internal links. It's an orphan page — disconnected from your site structure.",
                "Internal links distribute PageRank throughout your site. Pages with no internal links are harder for Google to discover and receive no link equity. This is one of the easiest fixes in SEO.",
                "Add 3-5 internal links to relevant pages on your site. Link from this page to others AND from other pages to this one.",
                "High — links are a top-3 ranking factor", "Easy"))
        elif count < 3:
            sigs.append(self._s("IL002", "Very Few Internal Links", "internal_links", "warn", "MEDIUM",
                f"This page has only {count} internal link(s). Aim for 3-5 minimum.",
                "More internal links mean more PageRank flowing to this page and better topical signals for Google.",
                f"Add {3 - count} more internal links to related pages. Use descriptive anchor text.", "Improved PageRank flow", "Easy"))
        else:
            sigs.append(self._s("IL003", f"Good Internal Link Count ({count})", "internal_links", "pass", "LOW", "", "", "", "", "Easy"))

        if wc > 1000 and count > 0:
            link_density = count / (wc / 100)
            if link_density < 1:
                sigs.append(self._s("IL004", "Low Link Density", "internal_links", "warn", "LOW",
                    f"Only {count} internal link(s) for {wc} words. Consider adding more contextual links.",
                    "Contextual internal links within body content are worth more than navigation links. They show Google topical relationships.",
                    "Add internal links naturally within body text where you mention related topics.", "", "Easy"))

        broken = [l for l in links_int if isinstance(l, dict) and (l.get("broken") or l.get("status_code", 200) >= 400)]
        if broken:
            sigs.append(self._s("IL005", "Broken Internal Links", "internal_links", "fail", "HIGH",
                f"This page has {len(broken)} broken internal link(s). These lead to 404 pages.",
                "Broken links waste crawl budget, lose PageRank, and create poor user experience. Google may demote pages with broken internal links.",
                f"Fix or remove {len(broken)} broken link(s). Set up 301 redirects if pages moved.", "Direct crawl and UX improvement", "Easy"))
        return sigs

    def _external_link_signals(self, links_ext, url):
        sigs = []
        count = len(links_ext)
        if count == 0:
            sigs.append(self._s("EL001", "No External Links", "external_links", "warn", "LOW",
                "This page has no outbound links to other websites.",
                "Pages that link to authoritative sources show Google you've done research. This can improve E-E-A-T. However, too many external links dilute PageRank.",
                "Add 1-3 links to authoritative, relevant external sources (studies, documentation, etc.)", "", "Easy"))
        else:
            nofollow_count = sum(1 for l in links_ext if isinstance(l, dict) and l.get("nofollow"))
            if nofollow_count > count * 0.5 and count > 3:
                sigs.append(self._s("EL002", "Too Many Nofollow External Links", "external_links", "warn", "LOW",
                    f"{nofollow_count} of {count} external links are nofollow.",
                    "Overusing nofollow looks unnatural. Use dofollow for links to authoritative, relevant sources.", "", "", "Easy"))
            else:
                sigs.append(self._s("EL003", "External Links Present", "external_links", "pass", "LOW", "", "", "", "", "Easy"))
        return sigs

    def _image_signals(self, images, text, html):
        sigs = []
        img_count = len(images)

        if img_count == 0:
            sigs.append(self._s("IMG001", "No Images", "image_optimization", "warn", "MEDIUM",
                "This page has no images. Visual content improves engagement and ranking.",
                "Pages with images rank higher because they provide better user experience. Images also appear in Google Image Search, driving additional traffic.",
                "Add 2-5 relevant images with descriptive alt text. Use original images when possible.", "Additional traffic from Image Search", "Easy"))
            return sigs

        no_alt = sum(1 for img in images if isinstance(img, dict) and not img.get("alt", "").strip())
        if no_alt > 0:
            sigs.append(self._s("IMG002", f"{no_alt} Image(s) Missing Alt Text", "image_optimization", "fail" if no_alt == img_count else "warn", "HIGH" if no_alt > 3 else "MEDIUM",
                f"{no_alt} of {img_count} images are missing alt text (alternative text).",
                "Alt text helps Google understand images and is required for accessibility. Google Image Search uses alt text to rank images. Missing alt text also fails WCAG accessibility standards.",
                f"Add descriptive alt text to all {no_alt} images. Describe the image content and include relevant keywords naturally.",
                "Improved Image Search rankings + accessibility", "Easy"))
        else:
            sigs.append(self._s("IMG003", "All Images Have Alt Text", "image_optimization", "pass", "LOW", "", "", "", "", "Easy"))

        large_imgs = [img for img in images if isinstance(img, dict) and (img.get("file_size", 0) > 500000 or img.get("size_kb", 0) > 500)]
        if large_imgs:
            sigs.append(self._s("IMG004", "Large Image Files", "image_optimization", "warn", "MEDIUM",
                f"{len(large_imgs)} image(s) exceed 500KB. Large images slow page loading.",
                "Image size directly impacts page speed, which is a ranking factor. Large images cause slow load times, especially on mobile.",
                "Compress images to under 200KB. Use WebP format. Implement lazy loading for below-the-fold images.",
                "Improved page speed", "Easy"))

        webp_count = sum(1 for img in images if isinstance(img, dict) and "webp" in str(img.get("src", "")).lower())
        if webp_count == 0 and img_count > 2:
            sigs.append(self._s("IMG005", "No WebP Images", "image_optimization", "warn", "LOW",
                "None of your images use WebP format.",
                "WebP images are 25-35% smaller than PNG/JPG with similar quality. Faster loading improves both UX and rankings.",
                "Convert images to WebP format using tools like Squoosh or Imagemin.", "", "Easy"))
        return sigs

    def _url_signals(self, url, title):
        sigs = []
        path = re.sub(r'https?://[^/]+', '', url) or "/"

        if len(url) > 100:
            sigs.append(self._s("U001", "URL Too Long", "url_structure", "warn", "MEDIUM",
                f"Your URL is {len(url)} characters. Keep URLs under 75 characters.",
                "Long URLs are harder to share, remember, and crawl. They also dilute keyword signals.",
                "Shorten the URL by removing unnecessary parameters, dates, or redundant words.", "", "Easy"))
        else:
            sigs.append(self._s("U002", "Good URL Length", "url_structure", "pass", "LOW", "", "", "", "", "Easy"))

        if re.search(r'[A-Z]', path):
            sigs.append(self._s("U003", "URL Contains Uppercase", "url_structure", "warn", "LOW",
                "Your URL path contains uppercase letters.",
                "URLs should be lowercase to avoid duplicate content issues and confusion.",
                "Convert the URL path to lowercase.", "", "Easy"))

        if re.search(r'[?&]', url):
            sigs.append(self._s("U004", "URL Contains Query Parameters", "url_structure", "warn", "MEDIUM",
                "Your URL contains query parameters (? or &).",
                "Parameterized URLs can create duplicate content issues. Google may index both versions.",
                "Use canonical tags or convert parameters to URL paths.", "", "Easy"))

        if re.search(r'\d{4,}', path):
            sigs.append(self._s("U005", "URL Contains Long Numbers", "url_structure", "warn", "LOW",
                "Your URL contains a long string of numbers which may indicate auto-generated URLs.",
                "Clean, descriptive URLs with keywords send stronger relevance signals.",
                "Use descriptive, keyword-rich slugs instead of numeric IDs.", "", "Easy"))
        return sigs

    def _schema_signals(self, schema, title, desc, url, text):
        sigs = []
        schema_list = _safe_list(schema)

        if not schema_list:
            sigs.append(self._s("S001", "No Schema Markup", "schema_markup", "fail", "HIGH",
                "This page has zero structured data (Schema.org markup).",
                "Schema markup helps Google understand your content and can generate rich results (star ratings, FAQs, breadcrumbs, etc.). Pages with schema rank an average of 4 positions higher.",
                "Add at minimum: Organization, WebPage, or BreadcrumbList schema. Use JSON-LD format.",
                "Can enable rich results in SERPs", "Medium",
                '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "Page Title",\n  "description": "Page description"\n}\n</script>',
                '<!-- No schema markup -->',
                '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "AI Data Analytics Platform - DataViCloud",\n  "description": "Real-time AI-powered analytics",\n  "url": "https://datavicloud.ai"\n}\n</script>'))
        else:
            sigs.append(self._s("S002", f"Schema Markup Present ({len(schema_list)} types)", "schema_markup", "pass", "LOW", "", "", "", "", "Easy"))
            schema_types = set()
            for s in schema_list:
                if isinstance(s, dict):
                    t = s.get("@type", "")
                    if t:
                        schema_types.add(t)
            if "FAQPage" not in schema_types:
                sigs.append(self._s("S003", "No FAQ Schema", "schema_markup", "warn", "LOW",
                    "You don't have FAQPage schema. This can generate FAQ rich results in Google.",
                    "FAQ rich results take up more SERP space and dramatically improve click-through rate.",
                    "Add FAQPage schema for any Q&A content on the page.", "Can significantly increase SERP visibility", "Medium"))
            if "BreadcrumbList" not in schema_types:
                sigs.append(self._s("S004", "No Breadcrumb Schema", "schema_markup", "warn", "LOW",
                    "You don't have BreadcrumbList schema.",
                    "Breadcrumb schema shows your site hierarchy in search results, improving navigation signals.",
                    "Add BreadcrumbList schema reflecting your site navigation.", "", "Easy"))
        return sigs

    def _open_graph_signals(self, og, tc, title, desc, url):
        sigs = []
        og_fields = ["og:title", "og:description", "og:image", "og:url", "og:type"]
        present = [f for f in og_fields if og.get(f)]
        missing = [f for f in og_fields if not og.get(f)]

        if not og:
            sigs.append(self._s("OG001", "No Open Graph Tags", "open_graph", "fail", "MEDIUM",
                "This page has no Open Graph meta tags. Social sharing will look broken.",
                "Open Graph tags control how your page appears when shared on Facebook, LinkedIn, Slack, etc. Without them, shared links look unprofessional with no image, title, or description.",
                "Add og:title, og:description, og:image, og:url, and og:type tags.",
                "Better social sharing appearance", "Easy",
                '<meta property="og:title" content="Page Title">\n<meta property="og:description" content="Description">\n<meta property="og:image" content="https://example.com/image.jpg">\n<meta property="og:url" content="https://example.com/page">',
                '<!-- No OG tags -->',
                '<meta property="og:title" content="AI Data Analytics Platform - DataViCloud">\n<meta property="og:description" content="Real-time AI-powered data analytics">\n<meta property="og:image" content="https://datavicloud.ai/og-image.png">\n<meta property="og:url" content="https://datavicloud.ai/analytics">\n<meta property="og:type" content="website">'))
        elif len(missing) > 0:
            sigs.append(self._s("OG002", f"Missing OG Tags: {', '.join(missing)}", "open_graph", "warn", "MEDIUM",
                f"You have {len(present)}/5 essential Open Graph tags. Missing: {', '.join(missing)}.",
                "Incomplete OG tags mean some platforms won't display your content properly when shared.",
                f"Add the missing OG tags: {', '.join(missing)}.", "", "Easy"))
        else:
            sigs.append(self._s("OG003", "All Essential OG Tags Present", "open_graph", "pass", "LOW", "", "", "", "", "Easy"))

        if not tc:
            sigs.append(self._s("OG004", "No Twitter Card Tags", "open_graph", "warn", "LOW",
                "No Twitter Card meta tags found.",
                "Twitter Cards control how your page appears when shared on Twitter/X. Without them, tweets linking to your site look plain.",
                "Add twitter:card, twitter:title, twitter:description, and twitter:image tags.", "", "Easy"))
        return sigs

    def _mobile_signals(self, html, resp_ms):
        sigs = []
        viewport = bool(re.search(r'<meta[^>]*name\s*=\s*["\']viewport["\']', html or "", re.I))
        if not viewport:
            sigs.append(self._s("MOB001", "No Viewport Meta Tag", "mobile_optimization", "fail", "CRITICAL",
                "Your page has no viewport meta tag. This page is NOT mobile-friendly.",
                "Over 60% of Google searches come from mobile devices. Without a viewport tag, Google will not rank your page for mobile searches. This is a confirmed ranking factor.",
                "Add: <meta name='viewport' content='width=device-width, initial-scale=1'>",
                "Critical — enables mobile ranking", "Easy",
                '<meta name="viewport" content="width=device-width, initial-scale=1">',
                '<!-- No viewport tag -->',
                '<meta name="viewport" content="width=device-width, initial-scale=1">'))
        else:
            sigs.append(self._s("MOB002", "Viewport Tag Present", "mobile_optimization", "pass", "LOW", "", "", "", "", "Easy"))

        if re.search(r'(?i)user-scalable\s*=\s*no|maximum-scale\s*=\s*1', html or ""):
            sigs.append(self._s("MOB003", "Zoom Disabled", "mobile_optimization", "warn", "MEDIUM",
                "Your page disables user zooming (user-scalable=no or maximum-scale=1).",
                "Disabling zoom hurts accessibility and may negatively impact mobile rankings.",
                "Remove user-scalable=no and maximum-scale=1 from the viewport tag.", "", "Easy"))
        return sigs

    def _speed_signals(self, resp_ms, html, images):
        sigs = []
        if resp_ms > 3000:
            sigs.append(self._s("PS001", "Very Slow Server Response", "page_speed", "fail", "CRITICAL",
                f"Server response time is {resp_ms}ms. Google recommends under 200ms (TTFB).",
                "Server response time (TTFB) directly impacts Core Web Vitals. Slow TTFB hurts LCP and FID scores. Google uses these as ranking factors.",
                "Optimize server: use caching (Redis/Memcached), optimize database queries, use a CDN, upgrade hosting.",
                "Critical — affects Core Web Vitals ranking factor", "Hard"))
        elif resp_ms > 1000:
            sigs.append(self._s("PS002", "Slow Server Response", "page_speed", "warn", "HIGH",
                f"Server response time is {resp_ms}ms. Target under 200ms.",
                "Slow TTFB degrades user experience and Core Web Vitals scores.",
                "Implement server-side caching, optimize database queries, use a CDN.", "Improves Core Web Vitals", "Hard"))
        elif resp_ms > 500:
            sigs.append(self._s("PS003", "Moderate Server Response", "page_speed", "warn", "MEDIUM",
                f"Server response time is {resp_ms}ms. Consider optimizing further.",
                "While not critical, faster is always better for TTFB.", "Consider adding caching or a CDN.", "", "Medium"))
        else:
            sigs.append(self._s("PS004", "Fast Server Response", "page_speed", "pass", "LOW", "", "", "", "", "Easy"))

        html_size = len(html or "")
        if html_size > 100000:
            sigs.append(self._s("PS005", f"Large HTML ({html_size // 1024}KB)", "page_speed", "warn", "MEDIUM",
                f"HTML size is {html_size // 1024}KB. Large HTML increases parse time and bandwidth.",
                "Bloated HTML slows rendering. Google's crawl budget is limited — heavy pages use more of it.",
                "Minify HTML, remove unnecessary code, use server-side rendering.", "", "Medium"))

        js_count = len(re.findall(r'<script\b', html or "", re.I))
        if js_count > 15:
            sigs.append(self._s("PS006", f"Too Many Scripts ({js_count})", "page_speed", "warn", "HIGH",
                f"Your page loads {js_count} JavaScript files. Each blocks rendering.",
                "Render-blocking JavaScript delays First Contentful Paint and Largest Contentful Paint. Both are Core Web Vitals.",
                "Defer non-critical JS, combine scripts, use async/defer attributes.", "Direct CWV improvement", "Medium"))
        return sigs

    def _security_signals(self, html, https, status):
        sigs = []
        if not https:
            sigs.append(self._s("SEC001", "Not Using HTTPS", "security", "fail", "CRITICAL",
                "Your page is served over HTTP, not HTTPS.",
                "HTTPS is a confirmed Google ranking factor. Chrome warns users about HTTP pages, increasing bounce rate. No modern website should use HTTP.",
                "Install an SSL certificate (free via Let's Encrypt). Redirect all HTTP to HTTPS.",
                "Confirmed ranking factor", "Medium"))
        else:
            sigs.append(self._s("SEC002", "HTTPS Active", "security", "pass", "LOW", "", "", "", "", "Easy"))

        mixed = re.search(r'http://[^"\'>\s]+', html or "")
        if mixed:
            sigs.append(self._s("SEC003", "Mixed Content Detected", "security", "warn", "HIGH",
                "Your HTTPS page loads resources over HTTP (mixed content).",
                "Mixed content triggers browser warnings, breaks features, and undermines trust. Chrome may block mixed content.",
                "Change all http:// references to https:// in your HTML.", "", "Easy"))

        if status == 200:
            sigs.append(self._s("SEC004", "200 OK Status", "security", "pass", "LOW", "", "", "", "", "Easy"))
        elif status >= 300 and status < 400:
            sigs.append(self._s("SEC005", f"Redirect ({status})", "security", "pass", "LOW", "", "", "", "", "Easy"))
        elif status >= 400:
            sigs.append(self._s("SEC006", f"Error Status {status}", "security", "fail", "CRITICAL",
                f"Server returned HTTP {status} error.", "Error pages are not indexed and waste crawl budget.", "Fix the server error.", "", "Hard"))
        return sigs

    def _crawlability_signals(self, status, robots_meta, is_indexable, html):
        sigs = []
        if "noindex" in (robots_meta or "").lower():
            sigs.append(self._s("CR001", "Page Marked Noindex", "crawlability", "fail", "HIGH",
                "This page is marked with noindex — Google will NOT include it in search results.",
                "The noindex directive tells Google to exclude this page from its index. This may be intentional, but if not, this page will never rank.",
                "If this page should rank, remove the noindex directive from the meta tag or X-Robots-Tag header.", "Critical — page won't appear in Google", "Easy"))
        else:
            sigs.append(self._s("CR002", "Indexable (no noindex)", "crawlability", "pass", "LOW", "", "", "", "", "Easy"))

        if "nofollow" in (robots_meta or "").lower():
            sigs.append(self._s("CR003", "Nofollow on Page", "crawlability", "warn", "MEDIUM",
                "This page has a nofollow directive. Google won't follow any links on this page.",
                "Nofollow prevents PageRank from passing through links on this page. If this is unintentional, you're wasting internal link equity.",
                "Remove nofollow unless specifically needed for user-generated content or paid links.", "", "Easy"))

        if status == 404:
            sigs.append(self._s("CR004", "404 Not Found", "crawlability", "fail", "CRITICAL",
                "This page returns 404. Google will eventually drop it from the index.",
                "404 errors waste crawl budget and lose any PageRank this page had.",
                "Set up a 301 redirect to the most relevant live page, or fix the broken URL.", "", "Medium"))
        return sigs

    def _indexability_signals(self, canonical, status, robots_meta, is_indexable):
        sigs = []
        if not canonical:
            sigs.append(self._s("IDX001", "No Canonical Tag", "indexability", "warn", "MEDIUM",
                "This page has no canonical tag.",
                "Without a canonical tag, Google may index duplicate versions of this page, splitting ranking signals across multiple URLs.",
                "Add <link rel='canonical' href='[preferred URL]'> pointing to the correct version of this page.",
                "Consolidates ranking signals", "Easy",
                '<link rel="canonical" href="https://datavicloud.ai/page">',
                '<!-- No canonical tag -->',
                '<link rel="canonical" href="https://datavicloud.ai/analytics">'))
        else:
            sigs.append(self._s("IDX002", "Canonical Tag Present", "indexability", "pass", "LOW", "", "", "", "", "Easy"))
            page_domain = re.search(r'https?://([^/]+)', canonical)
            if page_domain:
                sigs.append(self._s("IDX003", "Canonical Points to Different Domain", "indexability", "warn", "HIGH",
                    f"Your canonical tag points to a different domain: {canonical}",
                    "Cross-domain canonicals are only correct for syndicated content. Otherwise, you're telling Google to rank a different page instead of yours.",
                    "Update the canonical tag to point to the current page's URL.", "Critical fix", "Easy"))

        if is_indexable and status == 200:
            sigs.append(self._s("IDX004", "Page Is Indexable", "indexability", "pass", "LOW", "", "", "", "", "Easy"))
        elif not is_indexable:
            sigs.append(self._s("IDX005", "Page Not Indexable", "indexability", "fail", "HIGH",
                "This page is marked as not indexable.",
                "Non-indexable pages cannot appear in Google search results.",
                "Check robots.txt, meta robots, and X-Robots-Tag headers for noindex directives.", "", "Easy"))
        return sigs

    def _ux_signals(self, wc, images, links_int, crawl_depth):
        sigs = []
        if wc > 300 and len(images or []) == 0 and len(links_int or []) == 0:
            sigs.append(self._s("UX001", "Poor UX - Text Only, No Navigation", "user_experience", "warn", "MEDIUM",
                "This page is text-only with no images or internal links. Poor user experience.",
                "Users expect rich content — text, images, navigation, related content. Plain text pages have high bounce rates.",
                "Add relevant images, internal links to related content, and navigation elements.", "Lower bounce rate", "Easy"))

        depth = crawl_depth or 0
        if depth > 5:
            sigs.append(self._s("UX002", f"Deep Crawl Depth ({depth} clicks)", "user_experience", "warn", "MEDIUM",
                f"This page is {depth} clicks from the homepage. Pages deep in the architecture get less crawl attention.",
                "Google prioritizes pages closer to the homepage. Deep pages are crawled less frequently.",
                "Add this page to your main navigation or link to it from high-authority pages.", "Improved crawl frequency", "Medium"))
        return sigs

    def _ai_search_signals(self, text, schema, wc, headings):
        sigs = []
        text_lower = (text or "").lower()

        if wc < 500:
            sigs.append(self._s("AI001", "Content Too Short for AI Citation", "ai_search_readiness", "fail", "HIGH",
                "AI search engines (ChatGPT, Perplexity, Google AI) prefer content with 800+ words for citation.",
                "AI engines look for comprehensive, authoritative answers. Short content rarely gets cited because it lacks depth and evidence.",
                "Expand to 800+ words with clear structure, evidence, and unique insights.", "Critical for AI search visibility", "Medium"))

        has_definition = bool(re.search(r'\b(?:is|are|refers to|defined as|means)\s+(?:a|an|the)\s+\w', text_lower))
        if not has_definition and wc > 500:
            sigs.append(self._s("AI002", "No Clear Definitions", "ai_search_readiness", "warn", "MEDIUM",
                "AI search engines prefer content with clear, citable definitions of key terms.",
                "When AI engines generate answers, they quote clear definitions. 'X is a Y that Z' format gets cited most often.",
                "Add clear definitions for key terms. Use the format: '[Term] is [definition].'", "Higher AI citation rate", "Easy"))

        has_stats = bool(re.search(r'\d+\.?\d*\s*%|\$\d+|\d+\s*(?:million|billion|thousand|k\b|m\b)', text or "", re.I))
        if not has_stats and wc > 800:
            sigs.append(self._s("AI003", "No Statistics or Data", "ai_search_readiness", "warn", "MEDIUM",
                "Your content contains no numbers, statistics, or data points.",
                "AI engines strongly prefer content backed by data. Pages with statistics are 3x more likely to be cited by AI search.",
                "Add relevant statistics, percentages, data points, and research findings.", "Significantly higher AI citation rate", "Medium"))

        has_lists = bool(re.search(r'<(?:ul|ol)\b|^\s*[-*]\s|^\s*\d+\.\s', text or "", re.M | re.I))
        if not has_lists and wc > 500:
            sigs.append(self._s("AI004", "No Structured Lists", "ai_search_readiness", "warn", "MEDIUM",
                "Your content has no bulleted or numbered lists.",
                "AI engines extract list-format answers more easily. 'Step-by-step' and 'how to' lists get cited frequently.",
                "Add numbered steps, bullet points, or comparison lists.", "Better AI answer extraction", "Easy"))

        schema_list = _safe_list(schema)
        has_faq = any(s.get("@type") == "FAQPage" for s in schema_list if isinstance(s, dict))
        if not has_faq and wc > 1000:
            sigs.append(self._s("AI005", "No FAQ Schema for AI", "ai_search_readiness", "warn", "MEDIUM",
                "No FAQPage schema markup detected.",
                "FAQ schema directly feeds Google's AI Overviews and People Also Ask. It's the most direct way to appear in AI-generated answers.",
                "Add FAQPage schema with questions and answers from your content.", "Direct path to AI Overview inclusion", "Medium"))
        return sigs

    def _entity_signals(self, text, words, schema):
        sigs = []
        entity_re = re.compile(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b')
        entities = entity_re.findall(text or "")
        unique_entities = set(entities)

        if len(unique_entities) < 5 and len(words) > 200:
            sigs.append(self._s("E001", "Few Named Entities", "entity_optimization", "warn", "MEDIUM",
                f"Only {len(unique_entities)} named entities detected in {len(words)} words.",
                "Entities (people, places, organizations, concepts) help Google understand topical depth. Rich entity signals improve Knowledge Graph association.",
                "Mention relevant organizations, people, products, locations, and concepts naturally in your content.", "Improved entity recognition", "Easy"))

        schema_list = _safe_list(schema)
        org_entity = any(s.get("@type") in ("Organization", "Company") for s in schema_list if isinstance(s, dict))
        if not org_entity:
            sigs.append(self._s("E002", "No Organization Entity in Schema", "entity_optimization", "warn", "LOW",
                "No Organization schema found. This helps Google associate your content with your brand.",
                "Organization schema feeds Google's Knowledge Graph and helps with brand recognition in search.",
                "Add Organization schema with name, logo, URL, and social profiles.", "", "Medium"))
        return sigs

    def _freshness_signals(self, html, text):
        sigs = []
        copyright_match = re.search(r'(?:copyright|©)\s*(?:20\d{2})', html or "")
        date_match = re.search(r'20\d{2}[-/]\d{2}[-/]\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2}', text or "")
        if not copyright_match and not date_match:
            sigs.append(self._s("FR001", "No Date/Freshness Signals", "freshness_signals", "warn", "LOW",
                "No dates, copyright notices, or freshness signals found on the page.",
                "Google considers content freshness. Pages without date signals may be perceived as outdated.",
                "Add a visible 'Last updated' date, copyright year, or publication date.", "Slight freshness boost", "Easy"))
        return sigs

    def _local_seo_signals(self, text, url, schema):
        sigs = []
        text_lower = (text or "").lower()
        has_local = any(term in text_lower for term in ["near me", "in your area", "local", "directions", "open hours", "address"])
        schema_list = _safe_list(schema)
        has_local_business = any(s.get("@type") in ("LocalBusiness", "Restaurant", "Store") for s in schema_list if isinstance(s, dict))

        if has_local and not has_local_business:
            sigs.append(self._s("LS001", "Local Content but No LocalBusiness Schema", "local_seo", "warn", "MEDIUM",
                "Your content mentions local terms but lacks LocalBusiness schema.",
                "LocalBusiness schema helps you appear in Google Maps and local search results.",
                "Add LocalBusiness schema with name, address, phone, hours, and geo coordinates.", "Google Maps visibility", "Medium"))
        return sigs

    def _video_signals(self, html, text):
        sigs = []
        has_video = bool(re.search(r'<video\b|<iframe[^>]*youtube|<iframe[^>]*vimeo|\.mp4', html or "", re.I))
        text_mentions_video = bool(re.search(r'(?i)(watch|video|tutorial|demo|webinar)', text or ""))
        if text_mentions_video and not has_video:
            sigs.append(self._s("V001", "Mentions Video But No Video Embedded", "video_seo", "warn", "LOW",
                "Your content mentions videos but doesn't embed any.",
                "Embedded videos increase time-on-page, a user engagement signal. Video also gets special SERP features.",
                "Embed relevant videos or create video content for this page.", "Improved engagement", "Hard"))
        return sigs

    def _social_signals(self, og, tc, schema):
        sigs = []
        schema_list = _safe_list(schema)
        has_social = any(s.get("@type") == "Organization" and s.get("sameAs") for s in schema_list if isinstance(s, dict))
        if not has_social:
            sigs.append(self._s("SC001", "No Social Links in Schema", "social_signals", "warn", "LOW",
                "No social media profiles linked in structured data.",
                "Social links in schema help Google verify your brand's authenticity and reach.",
                "Add sameAs links to your social profiles in Organization schema.", "", "Medium"))
        return sigs

    def _conversion_signals(self, text, html, links_int):
        sigs = []
        text_lower = (text or "").lower()
        has_cta = any(cta in text_lower for cta in ["sign up", "get started", "try free", "contact us", "learn more", "download", "buy now", "subscribe", "request a demo", "start free"])
        if not has_cta:
            sigs.append(self._s("CV001", "No Call-to-Action", "conversion_optimization", "warn", "MEDIUM",
                "Your page has no clear call-to-action.",
                "Pages without CTAs fail to convert visitors into leads or customers. Even informational pages should guide users to the next step.",
                "Add a prominent CTA button or link. Match the CTA to the page intent (informational vs transactional).",
                "Can improve conversion rate by 20-50%", "Easy"))

        has_contact = bool(re.search(r'(?i)(contact|phone|email|address|form)', text or ""))
        if not has_contact:
            sigs.append(self._s("CV002", "No Contact Information", "conversion_optimization", "warn", "LOW",
                "No contact information found on this page.",
                "Contact information builds trust (E-E-A-T). Google's quality raters specifically check for contact details.",
                "Add contact information, a contact form, or a link to your contact page.", "Improved trust signals", "Easy"))
        return sigs

    def _advanced_content_signals(self, text, wc, words, html, sentences, title, h1, desc):
        sigs = []
        tc = len(re.findall(r'<table\b', html or "", re.I))
        lc = len(re.findall(r'<(?:ul|ol)\b', html or "", re.I))
        ic = len(re.findall(r'<img\b', html or "", re.I))
        code_count = len(re.findall(r'<code\b|<pre\b', html or "", re.I))

        if wc >= 1500:
            sigs.append(self._s("AC001", "Comprehensive Content Length", "content_quality", "pass", "LOW", f"{wc} words - excellent depth for comprehensive coverage.", "", "", "", "Easy"))
        elif wc >= 800:
            sigs.append(self._s("AC002", "Adequate Content Length", "content_quality", "pass", "LOW", f"{wc} words - good baseline content.", "", "", "", "Easy"))
        elif wc >= 300:
            sigs.append(self._s("AC003", "Content Needs Expansion", "content_quality", "warn", "MEDIUM", f"{wc} words is below the 1500-word average for top-ranking pages.", "Longer content ranks for more keywords and provides more value.", "Add 500-1000 more words of expert content.", "Moderate", "Medium"))
        else:
            sigs.append(self._s("AC004", "Thin Content", "content_quality", "fail", "HIGH", f"Only {wc} words. Google penalizes thin content.", "Pages under 300 words rarely rank. Expand significantly.", "Add comprehensive content, examples, and data.", "High", "Medium"))

        if wc > 2000 and tc == 0:
            sigs.append(self._s("AC005", "Long Content Without Tables", "content_quality", "warn", "LOW", "2000+ words but no tables. Tables help featured snippets.", "Google extracts tables for featured snippets.", "Add comparison tables, data tables, or pricing tables.", "", "Medium"))
        elif tc > 0:
            sigs.append(self._s("AC006", "Tables Present", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        if wc > 1000 and lc == 0:
            sigs.append(self._s("AC007", "Long Content Without Lists", "content_quality", "warn", "LOW", "1000+ words but no lists found. Lists improve scannability.", "List content appears in featured snippets and People Also Ask.", "Convert steps, features, or benefits to bulleted/numbered lists.", "", "Easy"))
        elif lc > 0:
            sigs.append(self._s("AC008", "Lists Present", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        if wc > 1000 and code_count == 0:
            sigs.append(self._s("AC009", "No Code Examples in Content", "content_quality", "warn", "LOW", "Long content without code snippets. Code examples build E-E-A-T for technical topics.", "Code examples show expertise and help developers.", "Add relevant code snippets if the topic is technical.", "", "Easy"))
        elif code_count > 0:
            sigs.append(self._s("AC010", "Code Examples Present", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text or "") if p.strip()]
        if paragraphs:
            short_paras = sum(1 for p in paragraphs if len(p.split()) < 20)
            long_paras = sum(1 for p in paragraphs if len(p.split()) > 150)
            if long_paras > 2:
                sigs.append(self._s("AC011", "Overly Long Paragraphs", "content_quality", "warn", "MEDIUM", f"{long_paras} paragraphs exceed 150 words. Mobile users struggle with long text blocks.", "Long paragraphs increase bounce rate on mobile.", "Break into 2-3 sentence paragraphs.", "Lower bounce rate", "Easy"))
            else:
                sigs.append(self._s("AC012", "Good Paragraph Length Distribution", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        text_lower = (text or "").lower()
        has_numbers = bool(re.search(r'\d+\.?\d*', text or ""))
        has_percentages = bool(re.search(r'\d+\.?\d*\s*%', text or ""))
        has_quotes = bool(re.search(r'["\u201c\u201d].*["\u201c\u201d]|\baccording to\b|\bresearch shows\b|\bstudy found\b', text or "", re.I))
        has_expert_terms = bool(re.search(r'\b(?:expert|professional|specialist|certified|licensed|years of experience)\b', text_lower))

        if has_percentages:
            sigs.append(self._s("AC013", "Statistics in Content", "content_quality", "pass", "LOW", "Content includes percentage statistics - builds credibility.", "", "", "", "Easy"))
        else:
            sigs.append(self._s("AC014", "No Percentage Statistics", "content_quality", "warn", "MEDIUM", "Content lacks percentage-based statistics.", "Statistics increase E-E-A-T and are frequently cited by AI search engines.", "Add relevant statistics with sources.", "Higher E-E-A-T and AI citation", "Medium"))

        if has_quotes:
            sigs.append(self._s("AC015", "Expert Citations Present", "content_quality", "pass", "LOW", "Content references expert opinions or research.", "", "", "", "Easy"))
        else:
            sigs.append(self._s("AC016", "No Expert Citations", "content_quality", "warn", "LOW", "Content doesn't reference expert opinions or research.", "Expert citations improve E-E-A-T and AI citation rate.", "Add quotes from industry experts or reference studies.", "", "Easy"))

        if has_expert_terms:
            sigs.append(self._s("AC017", "Expert Language Used", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))
        else:
            sigs.append(self._s("AC018", "No Expert Positioning", "content_quality", "warn", "LOW", "Content doesn't position the author as an expert.", "Expert positioning improves E-E-A-T scores.", "Add phrases like 'based on our experience', 'as a certified specialist'.", "", "Easy"))

        if wc > 500:
            avg_word_len = sum(len(w) for w in words) / max(len(words), 1)
            if avg_word_len > 6.5:
                sigs.append(self._s("AC019", "Complex Vocabulary", "content_quality", "warn", "LOW", f"Average word length is {avg_word_len:.1f} characters - may be too complex for general audience.", "Complex content may not match user intent for many queries.", "Simplify language while maintaining expertise.", "", "Easy"))
            else:
                sigs.append(self._s("AC020", "Accessible Vocabulary", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        if wc > 0:
            passive_count = len(re.findall(r'\b(?:is|are|was|were|been|being|be)\s+\w+ed\b', text or "", re.I))
            passive_ratio = passive_count / max(len(sentences), 1)
            if passive_ratio > 0.3:
                sigs.append(self._s("AC021", "Excessive Passive Voice", "content_quality", "warn", "LOW", f"{passive_ratio:.0%} of sentences use passive voice. Active voice is clearer and more engaging.", "Active voice improves readability and engagement.", "Rewrite passive sentences in active voice.", "", "Easy"))
            else:
                sigs.append(self._s("AC022", "Good Voice Balance", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        unique_words = set(w for w in words if len(w) > 3)
        vocab_richness = len(unique_words) / max(len(words), 1)
        if vocab_richness < 0.3 and wc > 200:
            sigs.append(self._s("AC023", "Repetitive Vocabulary", "content_quality", "warn", "MEDIUM", f"Vocabulary richness is only {vocab_richness:.0%}. Content may seem repetitive.", "Repetitive content indicates thin substance.", "Use synonyms and varied vocabulary.", "", "Easy"))
        elif vocab_richness > 0.5:
            sigs.append(self._s("AC024", "Rich Vocabulary", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        if wc > 0 and sentences:
            words_per_sentence = wc / len(sentences)
            if words_per_sentence > 25:
                sigs.append(self._s("AC025", "Sentences Too Complex", "content_quality", "warn", "MEDIUM", f"Average {words_per_sentence:.0f} words per sentence. Target 15-20.", "Complex sentences reduce readability scores.", "Shorten sentences to 15-20 words average.", "", "Easy"))
            elif words_per_sentence > 15:
                sigs.append(self._s("AC026", "Good Sentence Complexity", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))
            else:
                sigs.append(self._s("AC027", "Short Sentences", "content_quality", "pass", "LOW", "Sentences are clear and concise.", "", "", "", "Easy"))

        if wc > 500 and not re.search(r'(?i)(?:introduction|overview|what is|getting started|in this)', text or ""):
            sigs.append(self._s("AC028", "No Clear Introduction", "content_quality", "warn", "LOW", "Content lacks a clear introductory section.", "Intros help readers and Google understand page purpose immediately.", "Start with a clear introduction explaining what the page covers.", "", "Easy"))
        elif wc > 0:
            sigs.append(self._s("AC029", "Has Introduction", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        if wc > 500 and not re.search(r'(?i)(?:conclusion|summary|key takeaways|final thoughts|to sum up|in summary)', text or ""):
            sigs.append(self._s("AC030", "No Conclusion Section", "content_quality", "warn", "LOW", "Content lacks a conclusion or summary section.", "Conclusions reinforce key messages and include keyword signals.", "Add a conclusion section summarizing the main points.", "", "Easy"))
        elif wc > 0:
            sigs.append(self._s("AC031", "Has Conclusion", "content_quality", "pass", "LOW", "", "", "", "", "Easy"))

        if wc > 1000:
            h2_count = len(re.findall(r'<h2\b', html or "", re.I))
            h3_count = len(re.findall(r'<h3\b', html or "", re.I))
            if h2_count == 0 and h3_count == 0:
                sigs.append(self._s("AC032", "No H2/H3 Subheadings in Long Content", "content_quality", "fail", "HIGH", f"{wc}-word page has no H2/H3 subheadings.", "Subheadings break content into scannable sections. Google uses them to understand content structure.", "Add H2 for major sections, H3 for subsections.", "Major improvement", "Easy"))
            elif h2_count >= 3:
                sigs.append(self._s("AC033", "Good Subheading Structure", "content_quality", "pass", "LOW", f"{h2_count} H2 headings found.", "", "", "", "Easy"))
            else:
                sigs.append(self._s("AC034", "Some Subheadings Present", "content_quality", "warn", "LOW", f"Only {h2_count} H2 headings for {wc} words.", "More subheadings improve scannability.", f"Add {max(2, wc // 500) - h2_count} more H2 headings.", "", "Easy"))
        return sigs

    def _advanced_technical_signals(self, html, resp_ms, status, wc):
        sigs = []
        has_gzip = bool(re.search(r'content-encoding:\s*gzip', html or "", re.I))
        if has_gzip:
            sigs.append(self._s("AT001", "Gzip Compression Active", "page_speed", "pass", "LOW", "", "", "", "", "Easy"))
        else:
            sigs.append(self._s("AT002", "No Gzip Compression Detected", "page_speed", "warn", "MEDIUM", "Content may not be gzip-compressed.", "Gzip reduces HTML size by 60-80%, speeding up load time.", "Enable gzip compression on your server.", "Faster page loads", "Medium"))

        if resp_ms < 200:
            sigs.append(self._s("AT003", "Excellent TTFB", "page_speed", "pass", "LOW", f"{resp_ms}ms response time.", "", "", "", "Easy"))
        elif resp_ms < 500:
            sigs.append(self._s("AT004", "Good TTFB", "page_speed", "pass", "LOW", f"{resp_ms}ms response time.", "", "", "", "Easy"))
        elif resp_ms < 1000:
            sigs.append(self._s("AT005", "Moderate TTFB", "page_speed", "warn", "LOW", f"{resp_ms}ms response time. Target under 500ms.", "TTFB affects LCP.", "Optimize server response.", "", "Medium"))
        elif resp_ms < 3000:
            sigs.append(self._s("AT006", "Slow TTFB", "page_speed", "warn", "HIGH", f"{resp_ms}ms response time. Target under 500ms.", "Slow TTFB directly impacts Core Web Vitals.", "Use caching, optimize database, CDN.", "Core Web Vitals", "Hard"))
        else:
            sigs.append(self._s("AT007", "Very Slow TTFB", "page_speed", "fail", "CRITICAL", f"{resp_ms}ms response time. Severely impacts performance.", "Extremely slow TTFB causes poor LCP and FID scores.", "Urgent server optimization needed.", "Critical", "Hard"))

        html_size = len(html or "")
        if html_size > 0:
            size_kb = html_size / 1024
            if size_kb < 50:
                sigs.append(self._s("AT008", "Lightweight HTML", "page_speed", "pass", "LOW", f"{size_kb:.0f}KB HTML.", "", "", "", "Easy"))
            elif size_kb < 100:
                sigs.append(self._s("AT009", "Moderate HTML Size", "page_speed", "pass", "LOW", f"{size_kb:.0f}KB HTML.", "", "", "", "Easy"))
            elif size_kb < 200:
                sigs.append(self._s("AT010", "Large HTML", "page_speed", "warn", "MEDIUM", f"{size_kb:.0f}KB HTML is heavy.", "Large HTML increases parse time.", "Minify HTML, remove unused code.", "", "Medium"))
            else:
                sigs.append(self._s("AT011", "Very Large HTML", "page_speed", "warn", "HIGH", f"{size_kb:.0f}KB HTML is very heavy.", "Heavy HTML significantly impacts load time.", "Aggressively minify and trim HTML.", "Faster loading", "Medium"))

        script_count = len(re.findall(r'<script\b', html or "", re.I))
        link_css = len(re.findall(r'<link[^>]*stylesheet', html or "", re.I))
        if script_count > 0:
            async_scripts = len(re.findall(r'<script[^>]*\basync\b', html or "", re.I))
            defer_scripts = len(re.findall(r'<script[^>]*\bdefer\b', html or "", re.I))
            blocking = script_count - async_scripts - defer_scripts
            if blocking > 5:
                sigs.append(self._s("AT012", f"{blocking} Render-Blocking Scripts", "page_speed", "warn", "HIGH", f"{blocking} scripts block page rendering.", "Render-blocking JS delays FCP and LCP.", "Add async or defer attributes to non-critical scripts.", "Improved CWV", "Medium"))
            elif blocking > 0:
                sigs.append(self._s("AT013", f"{blocking} Blocking Scripts", "page_speed", "warn", "LOW", f"{blocking} scripts without async/defer.", "Even a few blocking scripts affect FCP.", "Consider adding defer to non-critical scripts.", "", "Easy"))
            else:
                sigs.append(self._s("AT014", "All Scripts Async/Defer", "page_speed", "pass", "LOW", "", "", "", "", "Easy"))
        else:
            sigs.append(self._s("AT015", "No Inline Scripts", "page_speed", "pass", "LOW", "No script tags detected.", "", "", "", "Easy"))

        if link_css > 5:
            sigs.append(self._s("AT016", f"Many CSS Files ({link_css})", "page_speed", "warn", "MEDIUM", f"{link_css} external stylesheets.", "Each CSS file requires an HTTP request.", "Combine CSS files.", "", "Medium"))
        elif link_css > 0:
            sigs.append(self._s("AT017", "CSS Files Reasonable", "page_speed", "pass", "LOW", "", "", "", "", "Easy"))

        meta_viewport = bool(re.search(r'<meta[^>]*viewport', html or "", re.I))
        if meta_viewport:
            sigs.append(self._s("AT018", "Viewport Configured", "mobile_optimization", "pass", "LOW", "", "", "", "", "Easy"))
        else:
            sigs.append(self._s("AT019", "Missing Viewport Meta", "mobile_optimization", "fail", "CRITICAL", "No viewport meta tag.", "Critical for mobile ranking.", "Add viewport meta tag.", "Critical", "Easy"))

        if re.search(r'(?i)user-scalable\s*=\s*no|maximum-scale\s*=\s*1', html or ""):
            sigs.append(self._s("AT020", "User Zoom Disabled", "mobile_optimization", "warn", "MEDIUM", "Page disables zooming.", "Hurts accessibility and mobile ranking.", "Remove user-scalable=no.", "", "Easy"))
        else:
            sigs.append(self._s("AT021", "User Zoom Allowed", "mobile_optimization", "pass", "LOW", "", "", "", "", "Easy"))

        has_responsive = bool(re.search(r'(?i)(?:max-width|min-width|@media\s+screen)', html or ""))
        if has_responsive:
            sigs.append(self._s("AT022", "Responsive CSS Detected", "mobile_optimization", "pass", "LOW", "Page uses responsive CSS.", "", "", "", "Easy"))
        elif html:
            sigs.append(self._s("AT023", "No Responsive CSS", "mobile_optimization", "warn", "MEDIUM", "No responsive CSS patterns detected.", "Non-responsive pages rank poorly on mobile.", "Add media queries for responsive design.", "Mobile ranking", "Hard"))

        preconnect = len(re.findall(r'rel\s*=\s*["\']preconnect["\']', html or "", re.I))
        prefetch = len(re.findall(r'rel\s*=\s*["\']prefetch["\']', html or "", re.I))
        preload = len(re.findall(r'rel\s*=\s*["\']preload["\']', html or "", re.I))
        if preconnect > 0 or preload > 0:
            sigs.append(self._s("AT024", "Resource Hints Used", "page_speed", "pass", "LOW", f"{preconnect} preconnect, {preload} preload hints.", "", "", "", "Easy"))
        elif wc > 1000:
            sigs.append(self._s("AT025", "No Resource Hints", "page_speed", "warn", "LOW", "No preconnect/preload hints for a content-rich page.", "Resource hints speed up resource loading.", "Add preconnect for critical third-party domains.", "", "Easy"))

        return sigs

    def _advanced_link_signals(self, links_int, links_ext, url, wc, all_pages):
        sigs = []
        int_count = len(links_int or [])
        ext_count = len(links_ext or [])

        if wc > 500:
            int_density = int_count / (wc / 1000)
            if int_density < 1:
                sigs.append(self._s("AL001", "Low Internal Link Density", "internal_links", "warn", "MEDIUM", f"Only {int_count} internal links per 1000 words.", "Dense internal linking helps Google understand topic relationships.", "Add 2-3 more internal links per 1000 words.", "Better PageRank flow", "Easy"))
            elif int_density < 3:
                sigs.append(self._s("AL002", "Good Internal Link Density", "internal_links", "pass", "LOW", f"{int_count} internal links per 1000 words.", "", "", "", "Easy"))
            else:
                sigs.append(self._s("AL003", "Excellent Internal Link Density", "internal_links", "pass", "LOW", f"{int_count} internal links per 1000 words.", "", "", "", "Easy"))

        if int_count > 0:
            if isinstance(links_int[0], dict):
                has_anchor_text = sum(1 for l in links_int if l.get("text", "").strip())
                if has_anchor_text < int_count * 0.5:
                    sigs.append(self._s("AL004", "Poor Anchor Text Coverage", "internal_links", "warn", "MEDIUM", f"Only {has_anchor_text}/{int_count} internal links have descriptive anchor text.", "Descriptive anchor text tells Google what the linked page is about.", "Use descriptive, keyword-rich anchor text for internal links.", "", "Easy"))
                else:
                    sigs.append(self._s("AL005", "Good Anchor Text", "internal_links", "pass", "LOW", "", "", "", "", "Easy"))

        if ext_count == 0 and wc > 500:
            sigs.append(self._s("AL006", "No External Links", "external_links", "warn", "LOW", "No outbound links. Pages with external links to authoritative sources rank higher.", "Outbound links show you've done research. Google values this.", "Link to 2-3 authoritative sources.", "", "Easy"))
        elif ext_count > 0:
            sigs.append(self._s("AL007", "External Links Present", "external_links", "pass", "LOW", f"{ext_count} outbound links.", "", "", "", "Easy"))

        if ext_count > 10:
            sigs.append(self._s("AL008", "Many External Links", "external_links", "warn", "LOW", f"{ext_count} outbound links may dilute PageRank.", "Too many outbound links reduce link equity.", "Reduce to 3-5 most authoritative links.", "", "Easy"))

        link_depth = 0
        if all_pages and url:
            link_map = {}
            for p in all_pages:
                link_map[p.url] = [l.get("url", "") if isinstance(l, dict) else str(l) for l in (links_int or [])]

        if int_count == 0 and wc > 200:
            sigs.append(self._s("AL009", "Orphan Page Risk", "internal_links", "fail", "HIGH", "No internal links found. This may be an orphan page.", "Orphan pages are nearly invisible to Google.", "Add internal links from related pages.", "Critical", "Medium"))

        return sigs

    def _advanced_schema_signals(self, schema, title, desc, url, text, html):
        sigs = []
        schema_list = _safe_list(schema)
        schema_types = set()
        for s in schema_list:
            if isinstance(s, dict):
                t = s.get("@type", "")
                if t:
                    schema_types.add(t)

        essential = {"WebPage", "Organization", "SiteNavigationElement"}
        found_essential = schema_types & essential
        if found_essential:
            sigs.append(self._s("AS001", f"Essential Schema Types: {', '.join(found_essential)}", "schema_markup", "pass", "LOW", "", "", "", "", "Easy"))
        else:
            sigs.append(self._s("AS002", "Missing Essential Schema Types", "schema_markup", "warn", "MEDIUM", f"No WebPage, Organization, or SiteNavigationElement schema found.", "Essential schemas help Google understand page structure.", "Add WebPage schema at minimum.", "", "Medium"))

        if "BreadcrumbList" not in schema_types and url:
            sigs.append(self._s("AS003", "No BreadcrumbList Schema", "schema_markup", "warn", "LOW", "No breadcrumb schema for navigation hierarchy.", "Breadcrumb schema shows navigation in SERPs.", "Add BreadcrumbList schema.", "", "Easy"))
        else:
            sigs.append(self._s("AS004", "Breadcrumb Schema Present", "schema_markup", "pass", "LOW", "", "", "", "", "Easy"))

        if "FAQPage" not in schema_types:
            text_lower = (text or "").lower()
            has_qa = bool(re.search(r'(?i)(?:q:|question:|faq|frequently asked|how do i|what is|why does)', text or ""))
            if has_qa:
                sigs.append(self._s("AS005", "Q&A Content Without FAQPage Schema", "schema_markup", "warn", "HIGH", "Page has Q&A content but no FAQPage schema.", "FAQ schema directly generates rich results and AI citations.", "Add FAQPage schema for all Q&A content.", "Major visibility boost", "Medium"))
            else:
                sigs.append(self._s("AS006", "No FAQPage Schema", "schema_markup", "warn", "LOW", "No FAQPage schema.", "FAQ schema can generate rich results.", "Consider adding FAQ section and schema.", "", "Medium"))

        if "HowTo" not in schema_types:
            text_lower = (text or "").lower()
            has_steps = bool(re.search(r'(?i)(?:step\s*\d|step\s+\d|phase\s+\d|instructions|how to|tutorial)', text or ""))
            if has_steps:
                sigs.append(self._s("AS007", "Step-by-Step Content Without HowTo Schema", "schema_markup", "warn", "MEDIUM", "Page has step-by-step content but no HowTo schema.", "HowTo schema generates step-by-step rich results.", "Add HowTo schema for instructional content.", "", "Medium"))
            else:
                sigs.append(self._s("AS008", "No HowTo Schema", "schema_markup", "pass", "LOW", "", "", "", "", "Easy"))

        if "Article" not in schema_types and "BlogPosting" not in schema_types:
            word_count = len(_words(text or ""))
            if word_count > 500:
                sigs.append(self._s("AS009", "No Article Schema for Content Page", "schema_markup", "warn", "LOW", "Content page missing Article or BlogPosting schema.", "Article schema helps Google understand content type.", "Add Article schema with author, datePublished, dateModified.", "", "Medium"))
        elif "Article" in schema_types or "BlogPosting" in schema_types:
            sigs.append(self._s("AS010", "Article Schema Present", "schema_markup", "pass", "LOW", "", "", "", "", "Easy"))

        if "Product" not in schema_types and "Service" not in schema_types:
            text_lower = (text or "").lower()
            has_product = bool(re.search(r'(?i)(?:price|pricing|buy|purchase|product|service plan|subscription)', text or ""))
            if has_product:
                sigs.append(self._s("AS011", "Product/Service Content Without Schema", "schema_markup", "warn", "MEDIUM", "Page mentions products/services but has no Product/Service schema.", "Product schema enables rich results with prices and ratings.", "Add Product or Service schema.", "Rich results", "Medium"))

        if "Video" not in schema_types:
            has_video = bool(re.search(r'<video\b|\.mp4|youtube\.com|vimeo\.com', html or "", re.I))
            if has_video:
                sigs.append(self._s("AS012", "Video Without VideoObject Schema", "schema_markup", "warn", "MEDIUM", "Page has video but no VideoObject schema.", "Video schema generates video rich results.", "Add VideoObject schema with thumbnail, duration, and description.", "", "Medium"))

        return sigs

    def _advanced_onpage_signals(self, title, desc, h1, og, tc, html, url, wc, words):
        sigs = []
        t = (title or "").strip()
        d = (desc or "").strip()

        if t:
            if t.startswith("Home") or t.startswith("Welcome") or t == "Home":
                sigs.append(self._s("AO001", "Generic Title Tag", "title_tag", "warn", "HIGH", f"Title '{t}' is generic and doesn't describe the page content.", "Generic titles don't help Google understand page relevance or attract clicks.", "Rewrite with specific keywords describing this page's content.", "Significant CTR improvement", "Easy"))
            else:
                sigs.append(self._s("AO002", "Descriptive Title", "title_tag", "pass", "LOW", "", "", "", "", "Easy"))

            numbers_in_title = bool(re.search(r'\d+', t))
            if numbers_in_title:
                sigs.append(self._s("AO003", "Numbers in Title", "title_tag", "pass", "LOW", "Numbers in titles tend to increase CTR.", "", "", "", "Easy"))

            power_words = ["ultimate", "complete", "guide", "best", "top", "free", "new", "proven", "essential", "step-by-step", "easy", "fast", "2024", "2025", "2026"]
            has_power = any(pw in t.lower() for pw in power_words)
            if has_power:
                sigs.append(self._s("AO004", "Power Words in Title", "title_tag", "pass", "LOW", "Title contains power words that increase CTR.", "", "", "", "Easy"))
        else:
            sigs.append(self._s("AO005", "Missing Title", "title_tag", "fail", "CRITICAL", "No title tag.", "Critical for ranking.", "Add keyword-rich title.", "Critical", "Easy"))

        if d:
            if "!" in d or "?" in d:
                sigs.append(self._s("AO006", "Engaging Meta Description", "meta_tags", "pass", "LOW", "Description uses punctuation that creates engagement.", "", "", "", "Easy"))
            numbers_in_desc = bool(re.search(r'\d+', d))
            if numbers_in_desc:
                sigs.append(self._s("AO007", "Numbers in Description", "meta_tags", "pass", "LOW", "Numbers in descriptions increase CTR.", "", "", "", "Easy"))

        if h1:
            if h1.strip() == (title or "").strip():
                sigs.append(self._s("AO008", "H1 Matches Title", "headings", "pass", "LOW", "H1 and title are identical - good consistency.", "", "", "", "Easy"))
            else:
                sigs.append(self._s("AO009", "H1 Differs from Title", "headings", "pass", "LOW", "H1 differs from title - acceptable but consistency can help.", "", "", "", "Easy"))

        h2_count = len(re.findall(r'<h2\b', html or "", re.I))
        h3_count = len(re.findall(r'<h3\b', html or "", re.I))
        h4_count = len(re.findall(r'<h4\b', html or "", re.I))
        h5_count = len(re.findall(r'<h5\b', html or "", re.I))
        h6_count = len(re.findall(r'<h6\b', html or "", re.I))

        if h2_count > 0:
            sigs.append(self._s("AO010", f"H2 Tags: {h2_count}", "headings", "pass", "LOW", "", "", "", "", "Easy"))
        if h3_count > 0:
            sigs.append(self._s("AO011", f"H3 Tags: {h3_count}", "headings", "pass", "LOW", "", "", "", "", "Easy"))
        if h4_count > 0:
            sigs.append(self._s("AO012", f"H4 Tags: {h4_count}", "headings", "pass", "LOW", "", "", "", "", "Easy"))
        if h5_count == 0 and h6_count == 0 and h2_count > 5:
            sigs.append(self._s("AO013", "Shallow Heading Depth", "headings", "warn", "LOW", "No H4/H6 headings despite many H2s.", "Deeper heading structure shows more organized content.", "Consider adding H4 headings for sub-subsections.", "", "Easy"))

        return sigs


    def _readability_signals(self, text, wc, sentences, words):
        sigs = []
        if not text:
            sigs.append(self._s("RD001", "No Content to Analyze", "readability", "fail", "HIGH",
                "Page has no readable text content.", "Readability is impossible without content.",
                "Add meaningful text content to the page.", "High", "Medium"))
            return sigs
        avg_sent_len = wc / max(len(sentences), 1)
        if avg_sent_len > 25:
            sigs.append(self._s("RD002", "Sentences Too Long", "readability", "warn", "MEDIUM",
                f"Average sentence length is {avg_sent_len:.0f} words. Sentences over 20 words are harder to read.",
                "Long sentences reduce readability and comprehension. Google's Helpful Content system favors content that is easy to read.",
                "Break long sentences into 2 shorter ones. Aim for 15-20 words per sentence. Use periods, semicolons, or restructure.",
                "Improved readability scores and user engagement", "Medium"))
        else:
            sigs.append(self._s("RD003", "Good Sentence Length", "readability", "pass", "LOW", "", "", "", "", "Easy"))

        if wc > 0:
            avg_word_len = sum(len(w) for w in words) / max(len(words), 1)
            if avg_word_len > 6.5:
                sigs.append(self._s("RD004", "Complex Vocabulary", "readability", "warn", "LOW",
                    f"Average word length is {avg_word_len:.1f} characters. Complex vocabulary may reduce accessibility.",
                    "Content should be accessible to a broad audience. Complex words reduce comprehension for non-expert readers.",
                    "Replace technical jargon with simpler alternatives where possible. Define technical terms when used.",
                    "Broader audience accessibility", "Medium"))
            else:
                sigs.append(self._s("RD005", "Appropriate Vocabulary Level", "readability", "pass", "LOW", "", "", "", "", "Easy"))

        passive_patterns = ['is ', 'are ', 'was ', 'were ', 'been ', 'being ', 'be ', 'have been', 'has been', 'had been']
        passive_count = sum(text.lower().count(p) for p in passive_patterns)
        passive_ratio = passive_count / max(len(sentences), 1)
        if passive_ratio > 0.3:
            sigs.append(self._s("RD006", "Excessive Passive Voice", "readability", "warn", "MEDIUM",
                f"High passive voice usage detected. Active voice is more engaging and clearer.",
                "Passive voice makes content less engaging and harder to follow. Google favors clear, direct writing.",
                "Convert passive sentences to active voice. Instead of 'The data was analyzed', write 'We analyzed the data'.",
                "Improved engagement and clarity", "Medium"))
        else:
            sigs.append(self._s("RD007", "Good Voice Usage", "readability", "pass", "LOW", "", "", "", "", "Easy"))

        flesch_words = len(words)
        flesch_sentences = max(len(sentences), 1)
        flesch_syllables = sum(max(1, len(re.findall(r'[aeiouy]+', w.lower()))) for w in words)
        if flesch_words > 0 and flesch_sentences > 0:
            flesch = 206.835 - 1.015 * (flesch_words / flesch_sentences) - 84.6 * (flesch_syllables / flesch_words)
            if flesch < 30:
                sigs.append(self._s("RD008", "Very Difficult Reading Level", "readability", "warn", "MEDIUM",
                    f"Flesch Reading Ease score is {flesch:.0f}. Content is very difficult to read.",
                    "Content should be readable by your target audience. Very low scores mean only highly educated readers can understand it.",
                    "Simplify sentences, use shorter words, and break up complex paragraphs.",
                    "Broader audience reach", "High"))
            elif flesch < 50:
                sigs.append(self._s("RD009", "Difficult Reading Level", "readability", "warn", "LOW",
                    f"Flesch Reading Ease score is {flesch:.0f}. Content is fairly difficult to read.",
                    "Consider simplifying for a broader audience.", "Aim for a score of 50-70 for general web content.", "Moderate", "Medium"))
            else:
                sigs.append(self._s("RD010", "Good Reading Level", "readability", "pass", "LOW", "", "", "", "", "Easy"))
        return sigs

    def _semantic_html_signals(self, html, text, headings):
        sigs = []
        if not html:
            sigs.append(self._s("SH001", "No HTML to Analyze", "semantic_html", "warn", "LOW", "No HTML content available.", "", "", "", "Easy"))
            return sigs

        semantic_tags = ['<article', '<section', '<nav', '<aside', '<header', '<footer', '<main', '<figure', '<figcaption', '<time']
        found = [t for t in semantic_tags if t in html.lower()]
        if len(found) >= 5:
            sigs.append(self._s("SH002", "Good Semantic HTML", "semantic_html", "pass", "LOW",
                f"Page uses {len(found)} semantic HTML elements.", "", "", "", "Easy"))
        elif len(found) >= 2:
            sigs.append(self._s("SH003", "Partial Semantic HTML", "semantic_html", "warn", "LOW",
                f"Page uses only {len(found)} semantic HTML elements. Google uses semantic HTML to understand content structure.",
                "Semantic elements like <article>, <section>, <nav> help Google understand your content hierarchy.",
                "Wrap main content in <article>, navigation in <nav>, side content in <aside>, and use <section> for major sections.",
                "Better content understanding by search engines", "Medium"))
        else:
            sigs.append(self._s("SH004", "Missing Semantic HTML", "semantic_html", "warn", "MEDIUM",
                "Page has almost no semantic HTML elements. Content is likely wrapped in generic <div> elements.",
                "Semantic HTML helps Google, screen readers, and assistive technologies understand your content. It's a ranking signal.",
                "Replace key <div> elements with semantic tags: <article> for main content, <nav> for navigation, <section> for content blocks.",
                "Improved SEO and accessibility", "Medium"))

        has_noscript = '<noscript' in html.lower()
        if not has_noscript and '<script' in html.lower():
            sigs.append(self._s("SH005", "No Noscript Fallback", "semantic_html", "warn", "LOW",
                "JavaScript is used but there's no <noscript> fallback.",
                "Some users and crawlers may not execute JavaScript.",
                "Add <noscript> tags with essential content for non-JS users.", "", "Easy"))

        div_count = html.lower().count('<div')
        if div_count > 200:
            sigs.append(self._s("SH006", "Excessive Div Usage", "semantic_html", "warn", "LOW",
                f"Page uses {div_count} div elements. Consider using more semantic tags.",
                "Excessive div usage makes content harder for search engines to understand.",
                "Replace content divs with semantic elements like article, section, nav.", "", "Medium"))
        return sigs

    def _structured_data_richness_signals(self, schema, title, desc, url, text, html):
        sigs = []
        if not schema:
            sigs.append(self._s("SD001", "No Structured Data", "structured_data_richness", "fail", "HIGH",
                "No structured data (JSON-LD) found on this page.",
                "Structured data enables rich results, knowledge panel features, and AI citation eligibility. Pages with schema get 30% more clicks.",
                "Add at minimum: Organization, WebPage, and BreadcrumbList schema. Add FAQPage if the page has Q&A content.",
                "30%+ increase in SERP real estate", "Medium",
                '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "Page Title"\n}\n</script>'))
            return sigs

        types_found = set()
        for s in schema:
            if isinstance(s, dict) and '@type' in s:
                types_found.add(s['@type'])
        if len(types_found) >= 3:
            sigs.append(self._s("SD002", "Rich Schema Implementation", "structured_data_richness", "pass", "LOW",
                f"Page has {len(types_found)} schema types: {', '.join(list(types_found)[:5])}", "", "", "", "Easy"))
        elif len(types_found) == 1:
            sigs.append(self._s("SD003", "Minimal Schema Coverage", "structured_data_richness", "warn", "MEDIUM",
                f"Only {list(types_found)[0]} schema type found. Add more for richer results.",
                "Multiple schema types create more opportunities for rich results and improve topical authority signals.",
                "Add complementary schemas: if you have WebPage, also add BreadcrumbList, AboutPage, or FAQPage.",
                "More rich result opportunities", "Medium"))

        for s in schema:
            if isinstance(s, dict):
                if s.get('@type') == 'WebPage' and not s.get('name') and not s.get('headline'):
                    sigs.append(self._s("SD004", "Incomplete WebPage Schema", "structured_data_richness", "warn", "MEDIUM",
                        "WebPage schema is missing 'name' or 'headline' property.",
                        "Incomplete schema reduces the chance of rich results.",
                        "Add 'name', 'description', 'url', and 'dateModified' to the WebPage schema.", "", "Easy"))

        has_breadcrumb = any(s.get('@type') == 'BreadcrumbList' for s in schema if isinstance(s, dict))
        if not has_breadcrumb:
            sigs.append(self._s("SD005", "Missing BreadcrumbList Schema", "structured_data_richness", "warn", "LOW",
                "No BreadcrumbList schema found.",
                "Breadcrumb schema enables breadcrumb display in search results, improving CTR.",
                "Add BreadcrumbList schema reflecting the page hierarchy.", "", "Easy"))
        return sigs

    def _voice_search_signals(self, text, words, headings, wc):
        sigs = []
        if not text or wc < 100:
            return sigs

        question_words = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'does', 'is', 'are']
        questions_found = []
        for h in headings:
            if isinstance(h, dict):
                htext = (h.get('text', '') or '').lower()
                if any(hw in htext for hw in question_words):
                    questions_found.append(htext)

        if len(questions_found) >= 3:
            sigs.append(self._s("VS001", "Question-Based Headings", "voice_search", "pass", "LOW",
                f"Found {len(questions_found)} question-based headings. Great for voice search and featured snippets.", "", "", "", "Easy"))
        elif len(questions_found) >= 1:
            sigs.append(self._s("VS002", "Some Question Headings", "voice_search", "warn", "LOW",
                f"Only {len(questions_found)} question-based heading found. Voice search queries are often questions.",
                "Voice assistants answer questions. Content structured as Q&A is more likely to be read aloud.",
                "Add question-based headings (How to..., What is..., Why does...) and answer them directly below.",
                "Voice search visibility and featured snippets", "Medium"))
        else:
            sigs.append(self._s("VS003", "No Question-Based Headings", "voice_search", "warn", "MEDIUM",
                "No question-based headings found. Voice search relies on question-answer format.",
                "70% of voice search results come from featured snippets which use Q&A format.",
                "Add H2/H3 headings as questions your audience asks. Answer each in 40-60 words directly below.",
                "Voice search and featured snippet eligibility", "High"))

        definition_patterns = [r'is (a|an|the) ', r'refers to ', r'means ', r'defined as ', r'defined by ']
        defs_found = sum(1 for p in definition_patterns if re.search(p, text.lower()))
        if defs_found >= 2:
            sigs.append(self._s("VS004", "Definition Rich Content", "voice_search", "pass", "LOW",
                "Content includes definitions. Ideal for voice search answers.", "", "", "", "Easy"))
        else:
            sigs.append(self._s("VS005", "Few Definitions Found", "voice_search", "warn", "LOW",
                "Content has few clear definitions. Voice assistants prefer content with explicit definitions.",
                "Add clear definitions: 'X is [definition]' format. This is how AI search engines extract answers.",
                "Define key terms explicitly using 'X is/means/refers to' phrasing.", "", "Medium"))
        return sigs

    def _accessibility_signals(self, html, images, text):
        sigs = []
        if not html:
            return sigs

        has_lang = 'lang=' in html.lower()[:500]
        if has_lang:
            sigs.append(self._s("AC001", "Language Attribute Present", "accessibility", "pass", "LOW", "", "", "", "", "Easy"))
        else:
            sigs.append(self._s("AC002", "Missing Language Attribute", "accessibility", "warn", "MEDIUM",
                "HTML tag is missing the lang attribute.",
                "Screen readers need lang attribute to pronounce content correctly. Also affects SEO.",
                "Add lang attribute to the HTML tag: <html lang=\"en\">", "", "Easy"))

        tabindex_count = html.lower().count('tabindex')
        if tabindex_count == 0 and '<a ' in html.lower():
            sigs.append(self._s("AC003", "No Tabindex Usage", "accessibility", "warn", "LOW",
                "No tabindex attributes found. Keyboard navigation may be limited.",
                "Proper tabindex usage ensures keyboard users can navigate your content.",
                "Add tabindex=\"0\" to interactive elements not naturally in tab order.", "", "Medium"))

        has_skip_link = 'skip' in html.lower() and ('nav' in html.lower() or 'content' in html.lower())
        if not has_skip_link and '<nav' in html.lower():
            sigs.append(self._s("AC004", "No Skip Navigation Link", "accessibility", "warn", "LOW",
                "No skip-to-content link found.",
                "Skip links allow keyboard users to bypass navigation and go directly to content.",
                "Add a skip link as the first focusable element: <a href=\"#main\" class=\"skip-link\">Skip to content</a>", "", "Medium"))

        if images:
            no_alt = sum(1 for img in images if isinstance(img, dict) and not img.get('alt'))
            if no_alt > 0:
                sigs.append(self._s("AC005", f"{no_alt} Images Without Alt Text", "accessibility", "warn", "MEDIUM",
                    f"{no_alt} images lack alt text. Screen readers cannot describe these images.",
                    "Alt text is required for accessibility and helps with image SEO.",
                    "Add descriptive alt text to all images. Be specific: 'Blue data visualization chart' not 'chart'.",
                    "Image SEO + accessibility compliance", "Medium"))
        return sigs

    def _content_freshness_signals(self, html, text, url):
        sigs = []
        year_patterns = re.findall(r'20[12]\d', html or "")
        current_year = 2026
        past_years = [y for y in year_patterns if int(y) < current_year - 1]
        if past_years and not any(str(current_year) in y for y in year_patterns):
            sigs.append(self._s("CF001", "Outdated Year References", "content_freshness", "warn", "MEDIUM",
                f"Content references past years ({', '.join(set(past_years[:3]))}) but not {current_year}.",
                "Outdated content signals to Google that the page may be abandoned. Fresh content ranks better.",
                f"Update all year references to {current_year}. Review and update any outdated statistics or information.",
                "Improved freshness signals", "Medium"))
        else:
            sigs.append(self._s("CF002", "Current Year References", "content_freshness", "pass", "LOW", "", "", "", "", "Easy"))

        copyright_pattern = re.search(r'©\s*(\d{4})', html or "")
        if copyright_pattern:
            copy_year = int(copyright_pattern.group(1))
            if copy_year < current_year:
                sigs.append(self._s("CF003", "Outdated Copyright Year", "content_freshness", "warn", "LOW",
                    f"Copyright notice shows {copy_year}. This signals the site is not actively maintained.",
                    "An outdated copyright year makes the site look abandoned.",
                    f"Update copyright to: © 2020-{current_year}", "", "Easy"))
            else:
                sigs.append(self._s("CF004", "Current Copyright Year", "content_freshness", "pass", "LOW", "", "", "", "", "Easy"))
        return sigs

    def _brand_authority_signals(self, text, schema, url, title, desc):
        sigs = []
        brand_signals = ['award', 'certified', 'trusted', 'recognized', 'leading', 'established', 'since', 'founded', 'partner']
        brand_count = sum(1 for b in brand_signals if b in (text or "").lower())
        if brand_count >= 3:
            sigs.append(self._s("BA001", "Strong Brand Authority Signals", "brand_authority", "pass", "LOW",
                f"Content includes {brand_count} brand authority signals (awards, certifications, trust markers).",
                "", "", "", "Easy"))
        elif brand_count >= 1:
            sigs.append(self._s("BA002", "Some Brand Signals", "brand_authority", "warn", "LOW",
                "Only limited brand authority signals found.",
                "Brand authority signals build trust with both users and search engines.",
                "Add trust signals: certifications, awards, client logos, years of experience, team credentials.",
                "Improved trust and E-E-A-T", "Medium"))
        else:
            sigs.append(self._s("BA003", "No Brand Authority Signals", "brand_authority", "warn", "MEDIUM",
                "No brand authority signals (awards, certifications, trust markers) found.",
                "E-E-A-T (Experience, Expertise, Authority, Trust) is a core ranking factor. Without authority signals, Google has no reason to trust your content over competitors.",
                "Add: years in business, certifications, awards, client count, testimonials, case studies, team expertise.",
                "Significant E-E-A-T improvement", "High"))

        has_about = any(s.get('@type') == 'AboutPage' for s in schema if isinstance(s, dict))
        has_org = any(s.get('@type') in ('Organization', 'LocalBusiness') for s in schema if isinstance(s, dict))
        if not has_about and not has_org:
            sigs.append(self._s("BA004", "Missing Organization Schema", "brand_authority", "warn", "MEDIUM",
                "No Organization or AboutPage schema found.",
                "Organization schema establishes your brand identity in Google's knowledge graph.",
                "Add Organization schema with name, url, logo, foundingDate, and contact info.", "", "Medium"))
        return sigs

    def _link_quality_signals(self, links_int, links_ext, url, wc):
        sigs = []
        int_count = len(links_int) if isinstance(links_int, list) else 0
        ext_count = len(links_ext) if isinstance(links_ext, list) else 0

        if wc and wc > 500 and int_count < 3:
            sigs.append(self._s("LQ001", "Insufficient Internal Links for Content Length", "link_quality", "warn", "MEDIUM",
                f"Page has {wc} words but only {int_count} internal links. Content-rich pages should link to related content.",
                "Internal links distribute PageRank and help Google discover related content.",
                f"Add at least 3-5 internal links to related pages. Link using descriptive anchor text.",
                "Improved PageRank flow", "Medium"))
        elif int_count >= 5:
            sigs.append(self._s("LQ002", "Good Internal Link Count", "link_quality", "pass", "LOW", "", "", "", "", "Easy"))

        if ext_count > 15:
            sigs.append(self._s("LQ003", "Excessive External Links", "link_quality", "warn", "LOW",
                f"Page has {ext_count} external links. Too many outbound links can dilute PageRank.",
                "Excessive outbound links can signal low quality to Google and dilute your page's authority.",
                "Audit external links. Remove low-quality or irrelevant ones. Keep only valuable, relevant references.",
                "Better PageRank retention", "Easy"))

        if isinstance(links_ext, list):
            nofollow_count = sum(1 for l in links_ext if isinstance(l, dict) and l.get('nofollow'))
            if ext_count > 0 and nofollow_count == 0:
                sigs.append(self._s("LQ004", "No Nofollow on External Links", "link_quality", "warn", "LOW",
                    "All external links are dofollow. Consider adding nofollow to non-essential outbound links.",
                    "Nofollow tells Google not to pass PageRank to linked pages. Useful for ads, user-generated content, and non-endorsement links.",
                    "Add rel=\"nofollow\" to links you don't want to endorse: ads, affiliate links, untrusted content.",
                    "Better PageRank control", "Easy"))
        return sigs

    def _content_uniqueness_signals(self, text, wc):
        sigs = []
        if not text or wc < 100:
            return sigs

        words_list = text.lower().split()
        if len(words_list) > 20:
            unique_words = set(words_list)
            ratio = len(unique_words) / len(words_list)
            if ratio < 0.3:
                sigs.append(self._s("CU001", "Low Content Uniqueness Ratio", "content_uniqueness", "warn", "MEDIUM",
                    f"Content has low word diversity ({ratio:.0%} unique words). May appear repetitive or spun.",
                    "Repetitive content signals low quality to Google and reduces readability.",
                    "Use synonyms, restructure sentences, and add varied examples to improve word diversity.",
                    "Improved content quality signals", "Medium"))
            else:
                sigs.append(self._s("CU002", "Good Word Diversity", "content_uniqueness", "pass", "LOW", "", "", "", "", "Easy"))

        sentences_list = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
        if len(sentences_list) > 5:
            unique_starts = set(s.split()[0].lower() for s in sentences_list if s.split())
            diversity = len(unique_starts) / max(len(sentences_list), 1)
            if diversity < 0.4:
                sigs.append(self._s("CU003", "Repetitive Sentence Starters", "content_uniqueness", "warn", "LOW",
                    "Many sentences start with the same words. Vary sentence structure for better readability.",
                    "Repetitive sentence structure makes content monotonous.",
                    "Vary sentence openings: use different subjects, transition words, or restructure paragraphs.",
                    "Improved engagement metrics", "Easy"))
        return sigs

    def _visual_content_signals(self, images, text, html, wc):
        sigs = []
        img_count = len(images) if isinstance(images, list) else 0
        if wc and wc > 500:
            if img_count == 0:
                sigs.append(self._s("VI001", "No Visual Content", "visual_content", "warn", "MEDIUM",
                    "Content-rich page has no images. Visual content improves engagement and dwell time.",
                    "Pages with images have 94% more views. Visual content improves user engagement, which is a ranking signal.",
                    "Add 2-5 relevant images: diagrams, screenshots, infographics, or photos. Each needs descriptive alt text.",
                    "30%+ improvement in user engagement", "Medium"))
            elif img_count < 3 and wc > 1000:
                sigs.append(self._s("VI002", "Few Images for Content Length", "visual_content", "warn", "LOW",
                    f"Only {img_count} image(s) for {wc} words of content.",
                    "Long-form content benefits from visual breaks every 300-500 words.",
                    f"Add {max(2, wc // 500)} more images to break up text and maintain reader engagement.", "", "Easy"))
            elif img_count >= 3:
                sigs.append(self._s("VI003", "Good Visual Content Ratio", "visual_content", "pass", "LOW", "", "", "", "", "Easy"))

        if html:
            has_iframe = '<iframe' in html.lower()
            has_video = '<video' in html.lower() or 'youtube' in html.lower() or 'vimeo' in html.lower()
            if has_video:
                sigs.append(self._s("VI004", "Embedded Video Content", "visual_content", "pass", "LOW",
                    "Page includes video content. Videos increase dwell time by 2.6x.", "", "", "", "Easy"))

        if img_count > 0 and isinstance(images, list):
            lazy_count = sum(1 for img in images if isinstance(img, dict) and (img.get('loading') == 'lazy' or 'loading="lazy"' in str(img)))
            if lazy_count == 0 and img_count > 3:
                sigs.append(self._s("VI005", "No Lazy Loading on Images", "visual_content", "warn", "LOW",
                    f"{img_count} images without lazy loading.",
                    "Lazy loading improves initial page load speed, which affects Core Web Vitals.",
                    "Add loading=\"lazy\" attribute to images below the fold.", "", "Easy"))
        return sigs

    def _core_web_vitals_signals(self, resp_ms, html, images):
        sigs = []
        if resp_ms > 0:
            if resp_ms < 200:
                sigs.append(self._s("CW001", "Excellent Server Response Time", "core_web_vitals_detailed", "pass", "LOW",
                    f"Server responds in {resp_ms}ms. Excellent.", "", "", "", "Easy"))
            elif resp_ms < 500:
                sigs.append(self._s("CW002", "Good Server Response Time", "core_web_vitals_detailed", "pass", "LOW",
                    f"Server responds in {resp_ms}ms. Within acceptable range.", "", "", "", "Easy"))
            elif resp_ms < 1000:
                sigs.append(self._s("CW003", "Slow Server Response Time", "core_web_vitals_detailed", "warn", "MEDIUM",
                    f"Server takes {resp_ms}ms to respond. TTFB should be under 200ms for optimal Core Web Vitals.",
                    "Slow TTFB directly impacts LCP (Largest Contentful Paint), a Core Web Vitals metric.",
                    "Optimize server response: use CDN, optimize database queries, implement server-side caching.",
                    "Improved LCP score", "High"))
            else:
                sigs.append(self._s("CW004", "Very Slow Server Response", "core_web_vitals_detailed", "fail", "HIGH",
                    f"Server takes {resp_ms}ms to respond. This is critically slow.",
                    "TTFB over 1000ms severely impacts Core Web Vitals and user experience. Google penalizes slow TTFB.",
                    "Immediate action: deploy CDN, enable server caching, optimize database queries, consider upgrading hosting.",
                    "Critical for Core Web Vitals", "High"))

        if html:
            render_blocking = html.lower().count('rel="stylesheet"') + html.lower().count("rel='stylesheet'")
            if render_blocking > 3:
                sigs.append(self._s("CW005", f"{render_blocking} Render-Blocking Stylesheets", "core_web_vitals_detailed", "warn", "MEDIUM",
                    f"Found {render_blocking} render-blocking stylesheets.",
                    "Render-blocking CSS delays First Contentful Paint (FCP), a Core Web Vitals metric.",
                    "Inline critical CSS, defer non-critical stylesheets, use async loading for non-essential CSS.",
                    "Improved FCP score", "Medium"))
        return sigs

    def _mobile_first_signals(self, html, resp_ms):
        sigs = []
        if not html:
            return sigs

        has_viewport = 'viewport' in html.lower()
        if has_viewport:
            sigs.append(self._s("MF001", "Viewport Meta Tag Present", "mobile_first", "pass", "LOW", "", "", "", "", "Easy"))
        else:
            sigs.append(self._s("MF002", "Missing Viewport Meta Tag", "mobile_first", "fail", "CRITICAL",
                "No viewport meta tag. The page will not render correctly on mobile devices.",
                "Google uses mobile-first indexing. Without a viewport tag, Google treats the page as non-mobile-friendly.",
                "Add: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
                "Critical for mobile ranking", "Easy",
                '<meta name="viewport" content="width=device-width, initial-scale=1">',
                '<!-- No viewport tag -->',
                '<meta name="viewport" content="width=device-width, initial-scale=1">'))

        font_size_pattern = re.findall(r'font-size:\s*(\d+)px', html.lower())
        small_fonts = sum(1 for f in font_size_pattern if int(f) < 12)
        if small_fonts > 3:
            sigs.append(self._s("MF003", "Small Font Sizes Detected", "mobile_first", "warn", "MEDIUM",
                f"{small_fonts} elements use font sizes smaller than 12px.",
                "Small text is difficult to read on mobile devices. Google considers readability in mobile-first indexing.",
                "Ensure minimum font size of 14px for body text and 16px for form inputs.",
                "Improved mobile readability", "Medium"))

        click_targets = re.findall(r'(padding|margin):\s*(\d+)px', html.lower())
        small_targets = sum(1 for _, val in click_targets if int(val) < 8)
        if small_targets > 5:
            sigs.append(self._s("MF004", "Small Click Targets", "mobile_first", "warn", "LOW",
                "Some interactive elements have very small padding/margin.",
                "Google recommends touch targets be at least 48x48px for mobile usability.",
                "Increase padding on buttons and links to at least 12px on all sides.", "", "Easy"))
        return sigs

    def _technical_integrity_signals(self, html, status, url, robots_meta, is_indexable):
        sigs = []
        if status and status >= 400:
            sigs.append(self._s("TI001", f"HTTP {status} Error", "technical_integrity", "fail", "CRITICAL",
                f"Page returns HTTP {status}. Error pages should not be indexed.",
                "Error pages waste crawl budget and provide poor user experience. Google may demote your site in rankings.",
                "Fix the underlying issue causing the error. If the page doesn't exist, return 401 and remove from sitemap.",
                "Critical for crawl health", "Medium"))

        if html:
            doctype = '<!doctype html' in html.lower() or '<!DOCTYPE html' in html
            if doctype:
                sigs.append(self._s("TI002", "Valid DOCTYPE Declaration", "technical_integrity", "pass", "LOW", "", "", "", "", "Easy"))
            else:
                sigs.append(self._s("TI003", "Missing DOCTYPE Declaration", "technical_integrity", "warn", "LOW",
                    "No DOCTYPE declaration found. This can cause rendering quirks.",
                    "Missing DOCTYPE can trigger quirks mode in browsers, causing inconsistent rendering.",
                    "Add <!DOCTYPE html> as the first line of your HTML.", "", "Easy"))

            charset = 'charset=' in html.lower()[:500] or 'encoding=' in html.lower()[:500]
            if charset:
                sigs.append(self._s("TI004", "Character Encoding Declared", "technical_integrity", "pass", "LOW", "", "", "", "", "Easy"))
            else:
                sigs.append(self._s("TI005", "No Character Encoding", "technical_integrity", "warn", "LOW",
                    "Character encoding not explicitly declared.",
                    "Missing charset can cause display issues with special characters.",
                    "Add <meta charset=\"UTF-8\"> in the <head>.", "", "Easy"))

        mixed_content = 'http://' in (html or "") and 'https://' in (html or "") and url and url.startswith('https')
        if mixed_content:
            sigs.append(self._s("TI006", "Mixed Content Detected", "technical_integrity", "warn", "MEDIUM",
                "HTTPS page loads HTTP resources. This triggers mixed content warnings.",
                "Mixed content degrades security and can block resource loading in modern browsers.",
                "Update all internal resource URLs to use HTTPS.", "", "Easy"))
        return sigs


def generate_full_strategy(audit_data, pages, issues, recommendations, competitor_data=None, keyword_data=None, content_data=None) -> dict:
    """Generate a comprehensive ranking strategy guide from all audit data."""

    total_issues = len(issues)
    critical = sum(1 for i in issues if i.severity == "CRITICAL")
    high = sum(1 for i in issues if i.severity == "HIGH")
    medium = sum(1 for i in issues if i.severity == "MEDIUM")

    seo_score = audit_data.get("seo_score", 0) if isinstance(audit_data, dict) else getattr(audit_data, 'seo_score', 0) or 0
    tech_score = audit_data.get("technical_score", 0) if isinstance(audit_data, dict) else getattr(audit_data, 'technical_score', 0) or 0
    aeo_score = audit_data.get("aeo_score", 0) if isinstance(audit_data, dict) else getattr(audit_data, 'aeo_score', 0) or 0
    geo_score = audit_data.get("geo_score", 0) if isinstance(audit_data, dict) else getattr(audit_data, 'geo_score', 0) or 0

    week1_actions = []
    week2_4_actions = []
    month2_3_actions = []
    month4_6_actions = []

    for issue in issues:
        action = {
            "title": issue.description or issue.signal_name or "Fix issue",
            "severity": issue.severity,
            "what_wrong": issue.impact or issue.description,
            "how_to_fix": issue.fix or "Review and fix this issue",
            "category": issue.category,
            "page_url": issue.page_url,
        }
        if issue.severity == "CRITICAL":
            week1_actions.append(action)
        elif issue.severity == "HIGH":
            week2_4_actions.append(action)
        elif issue.severity == "MEDIUM":
            month2_3_actions.append(action)
        else:
            month4_6_actions.append(action)

    competitor_insights = []
    if competitor_data:
        if hasattr(competitor_data, 'strengths') and competitor_data.strengths:
            for s in (competitor_data.strengths or []):
                competitor_insights.append({"type": "competitor_strength", "text": s if isinstance(s, str) else str(s)})
        if hasattr(competitor_data, 'weaknesses') and competitor_data.weaknesses:
            for w in (competitor_data.weaknesses or []):
                competitor_insights.append({"type": "our_opportunity", "text": w if isinstance(w, str) else str(w)})
        if hasattr(competitor_data, 'winning_strategy') and competitor_data.winning_strategy:
            for ws in (competitor_data.winning_strategy or []):
                competitor_insights.append({"type": "strategy", "text": ws if isinstance(ws, str) else str(ws)})

    keyword_strategy = []
    if keyword_data:
        if hasattr(keyword_data, 'top_keywords') and keyword_data.top_keywords:
            for kw in (keyword_data.top_keywords or [])[:20]:
                keyword_strategy.append({
                    "keyword": kw.get("keyword", "") if isinstance(kw, dict) else str(kw),
                    "frequency": kw.get("frequency", 0) if isinstance(kw, dict) else 0,
                    "action": kw.get("action", "Optimize") if isinstance(kw, dict) else "Monitor",
                })
        if hasattr(keyword_data, 'missing_keywords') and keyword_data.missing_keywords:
            for kw in (keyword_data.missing_keywords or [])[:20]:
                keyword_strategy.append({
                    "keyword": kw.get("keyword", "") if isinstance(kw, dict) else str(kw),
                    "action": "Create content targeting this keyword",
                    "type": "missing",
                })

    content_strategy = []
    if content_data:
        if hasattr(content_data, 'content_gaps') and content_data.content_gaps:
            for gap in (content_data.content_gaps or [])[:15]:
                content_strategy.append({
                    "topic": gap.get("topic", "") if isinstance(gap, dict) else str(gap),
                    "action": gap.get("action", "Create content") if isinstance(gap, dict) else "Create comprehensive content",
                })

    how_to_rank_1 = [
        {
            "step": 1,
            "title": "Fix All Critical Issues First",
            "description": f"You have {critical} critical issues. These are actively preventing your pages from ranking. Fix these before anything else.",
            "actions": [a["title"] for a in week1_actions[:5]],
            "timeline": "Week 1",
            "impact": "Highest ROI — removes barriers to ranking",
        },
        {
            "step": 2,
            "title": "Optimize Title Tags & Meta Descriptions",
            "description": "Every page needs a unique, keyword-optimized title (50-60 chars) and meta description (150-160 chars). These directly control click-through rate.",
            "actions": ["Audit every page title for keyword placement", "Write compelling meta descriptions with CTAs", "Ensure no duplicate titles across the site"],
            "timeline": "Week 1-2",
            "impact": "Direct ranking signal + improved CTR",
        },
        {
            "step": 3,
            "title": "Fix Content Depth & Quality",
            "description": f"Your pages average {'{:,}'.format(sum(p.word_count or 0 for p in pages) // max(len(pages), 1))} words. Top-ranking pages have 1500-2500 words of comprehensive, expert content.",
            "actions": ["Expand thin pages to 1500+ words", "Add expert insights, data, and examples", "Include FAQ sections", "Use structured formatting (lists, tables, subheadings)"],
            "timeline": "Week 2-4",
            "impact": "Major — content quality is a top ranking factor",
        },
        {
            "step": 4,
            "title": "Build Internal Link Structure",
            "description": "Create a strong internal linking structure where every page links to 3-5 related pages. This distributes PageRank and helps Google understand your site hierarchy.",
            "actions": ["Link from high-authority pages to new content", "Use descriptive anchor text (not 'click here')", "Create topic clusters with pillar pages"],
            "timeline": "Week 2-4",
            "impact": "High — links are a top-3 ranking factor",
        },
        {
            "step": 5,
            "title": "Implement Schema Markup",
            "description": "Add structured data to every page. Start with Organization, WebPage, BreadcrumbList, and FAQPage schemas.",
            "actions": ["Add Organization schema to homepage", "Add WebPage schema to all pages", "Add FAQPage schema to pages with Q&A content", "Test with Google's Rich Results Test"],
            "timeline": "Week 3-4",
            "impact": "Enables rich results and AI citation",
        },
        {
            "step": 6,
            "title": "Optimize for Core Web Vitals",
            "description": "Ensure LCP < 2.5s, FID < 100ms, CLS < 0.1. These are confirmed ranking factors.",
            "actions": ["Optimize images (WebP, lazy loading)", "Reduce server response time", "Minimize render-blocking resources", "Implement caching"],
            "timeline": "Month 2",
            "impact": "Confirmed ranking factor for mobile search",
        },
        {
            "step": 7,
            "title": "Create Comprehensive Content for Every Target Keyword",
            "description": "Create or improve pages for every important keyword. Each page should be the best resource on the internet for that topic.",
            "actions": keyword_strategy[:5] and [f"Target: {k.get('keyword', k)}" for k in keyword_strategy[:5]],
            "timeline": "Month 2-3",
            "impact": "Expands keyword footprint and topical authority",
        },
        {
            "step": 8,
            "title": "Build Authority Through Backlinks",
            "description": "Earn high-quality backlinks from relevant, authoritative websites. This is the #1 factor for competitive keywords.",
            "actions": ["Create linkable assets (research, tools, data)", "Guest post on industry sites", "Build relationships with journalists and bloggers", "Create original research or surveys"],
            "timeline": "Month 2-6 (ongoing)",
            "impact": "Most important factor for competitive keywords",
        },
        {
            "step": 9,
            "title": "Optimize for AI Search Engines",
            "description": "Google AI Overviews, ChatGPT, and Perplexity cite authoritative, well-structured content. Optimize specifically for AI citation.",
            "actions": ["Add clear definitions of key terms", "Include statistics and data points", "Use structured lists and tables", "Add FAQPage schema", "Write in a clear, authoritative tone"],
            "timeline": "Month 3-4",
            "impact": "Growing channel — AI search traffic increasing 30%+ monthly",
        },
        {
            "step": 10,
            "title": "Monitor, Measure, and Iterate",
            "description": "Track rankings weekly. Measure organic traffic monthly. Identify what's working and double down on it.",
            "actions": ["Set up Google Search Console", "Track keyword rankings weekly", "Monitor Core Web Vitals monthly", "Review and update content quarterly"],
            "timeline": "Ongoing",
            "impact": "Ensures continuous improvement",
        },
    ]

    return {
        "executive_summary": {
            "total_pages": len(pages),
            "total_issues": total_issues,
            "critical_issues": critical,
            "high_issues": high,
            "medium_issues": medium,
            "seo_score": round(seo_score, 1),
            "technical_score": round(tech_score, 1),
            "aeo_score": round(aeo_score, 1),
            "geo_score": round(geo_score, 1),
            "estimated_timeline": "3-6 months to see significant improvement",
            "top_3_priorities": [
                "Fix all critical technical issues (blocking indexing)",
                "Improve content depth and quality on all pages",
                "Build internal linking structure and schema markup",
            ],
        },
        "how_to_rank_1": how_to_rank_1,
        "action_plan": {
            "week_1": week1_actions,
            "week_2_to_4": week2_4_actions,
            "month_2_to_3": month2_3_actions,
            "month_4_to_6": month4_6_actions,
        },
        "keyword_strategy": keyword_strategy,
        "content_strategy": content_strategy,
        "competitor_insights": competitor_insights,
    }
