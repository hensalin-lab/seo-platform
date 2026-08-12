import logging
import re
import math
from collections import Counter
from app.engine.crawler import PageData

logger = logging.getLogger(__name__)


class Signal:
    def __init__(self, id, name, category, score, weight, description, detail="", page_url=""):
        self.id = id
        self.name = name
        self.category = category
        self.score = score
        self.weight = weight
        self.description = description
        self.detail = detail
        self.page_url = page_url

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "category": self.category,
            "score": round(self.score, 2), "weight": self.weight,
            "description": self.description, "detail": self.detail,
            "page_url": self.page_url,
        }


class PageAnalysis:
    def __init__(self, url):
        self.url = url
        self.scores = {"seo": 0, "technical": 0, "aeo": 0, "geo": 0, "content": 0, "ai_visibility": 0, "overall": 0}
        self.signals = []
        self.issues = []
        self.recommendations = []
        self.keyword_opportunities = []
        self.content_gaps = []

    def to_dict(self):
        return {
            "url": self.url,
            "scores": self.scores,
            "signal_count": len(self.signals),
            "issue_count": len(self.issues),
            "issues": self.issues[:30],
            "recommendations": self.recommendations[:10],
        }


class AnalysisResult:
    def __init__(self):
        self.signals = []
        self.issues = []
        self.recommendations = []
        self.page_analyses = {}
        self.scores = {
            "seo": 0.0, "technical": 0.0, "aeo": 0.0, "geo": 0.0,
            "content": 0.0, "ai_visibility": 0.0, "overall": 0.0,
        }
        self.keyword_data = []
        self.content_opportunities = []
        self.roadmap = {"immediate": [], "week1": [], "month1": [], "month3": []}
        self.canonicalization = {}

    def add_signal(self, id, name, category, score, weight, description, detail="", page_url=""):
        self.signals.append(Signal(id, name, category, score, weight, description, detail, page_url))

    def add_issue(self, page_url, category, severity, signal_id, signal_name, description, impact="", fix=""):
        self.issues.append({
            "page_url": page_url, "category": category, "severity": severity,
            "signal_id": signal_id, "signal_name": signal_name,
            "description": description, "impact": impact, "fix": fix,
        })

    def add_recommendation(self, page_url, category, priority, issue, problem, why, fix, before="", after="", keywords=None, expected_impact="", difficulty="MODERATE"):
        self.recommendations.append({
            "page_url": page_url, "category": category, "priority": priority,
            "issue": issue, "current_problem": problem, "why_it_matters": why,
            "exact_fix": fix, "before_example": before, "after_example": after,
            "keywords": keywords or [], "expected_impact": expected_impact,
            "difficulty": difficulty,
        })

    def compute_scores(self):
        categories = {}
        for sig in self.signals:
            categories.setdefault(sig.category, []).append(sig)

        score_map = {}
        for cat, sigs in categories.items():
            tw = sum(s.weight for s in sigs)
            score_map[cat] = sum(s.score * s.weight for s in sigs) / tw if tw > 0 else 0.0

        self.scores["seo"] = round(score_map.get("SEO", 0.0) * 100, 1)
        self.scores["technical"] = round(score_map.get("TECHNICAL", 0.0) * 100, 1)
        self.scores["aeo"] = round(score_map.get("AEO", 0.0) * 100, 1)
        self.scores["geo"] = round(score_map.get("GEO", 0.0) * 100, 1)
        self.scores["content"] = round(score_map.get("CONTENT", 0.0) * 100, 1)
        self.scores["ai_visibility"] = round(score_map.get("AI_SEARCH", 0.0) * 100, 1)

        weights = {"seo": 0.25, "technical": 0.20, "aeo": 0.15, "geo": 0.15, "content": 0.15, "ai_visibility": 0.10}
        self.scores["overall"] = round(sum(self.scores[k] * w for k, w in weights.items()), 1)
        return self.scores

    def compute_page_score(self, page_url):
        page_sigs = [s for s in self.signals if s.page_url == page_url]
        if not page_sigs:
            return {"seo": 0, "technical": 0, "aeo": 0, "geo": 0, "content": 0, "ai_visibility": 0, "overall": 0}
        categories = {}
        for sig in page_sigs:
            categories.setdefault(sig.category, []).append(sig)
        scores = {}
        for cat, sigs in categories.items():
            tw = sum(s.weight for s in sigs)
            scores[cat.lower()] = round(sum(s.score * s.weight for s in sigs) / tw * 100, 1) if tw > 0 else 0
        weights = {"seo": 0.25, "technical": 0.20, "aeo": 0.15, "geo": 0.15, "content": 0.15, "ai_visibility": 0.10}
        scores["overall"] = round(sum(scores.get(k, 0) * w for k, w in weights.items()), 1)
        return scores


class AnalyzerEngine:
    SIGNAL_ID_COUNTER = 1000

    @staticmethod
    def _expects_author_attribution(page):
        """Only editorial content pages (blog, resource, case study, long-form
        article) should require an author byline — never legal/utility/home pages."""
        page_type = str(getattr(page, "page_type", "") or "").upper()
        editorial = {"BLOG", "RESOURCE", "CASE_STUDY", "CONTENT", "ARTICLE", "NEWS", "PUBLICATION", "PODCAST"}
        non_editorial = {"HOMEPAGE", "PRICING", "PRODUCT", "SOLUTIONS", "SERVICES", "FEATURE",
                         "DOCUMENTATION", "FAQ", "ABOUT", "CONTACT", "DEMO", "LEGAL", "LANDING_PAGE",
                         "CAREERS", "AUTHOR", "TAG", "ARCHIVE", "CATEGORY", "SEARCH", "PAGINATION",
                         "ERROR_404", "PROFILE", "ACCOUNT", "CART", "CHECKOUT"}
        if page_type in editorial:
            return True
        if page_type in non_editorial:
            return False
        url = (page.url or "").lower()
        title = (page.title or "").lower()
        junk = ["/privacy", "/terms", "/cookie", "/legal", "/policy", "/disclaimer", "/agreement",
                "/get-a-demo", "/demo", "/signup", "/login", "/register", "/cart", "/checkout",
                "/account", "/status", "/careers", "/jobs", "/pricing", "/contact", "/about",
                "/resources/blog", "/404", "page-not-found"]
        if any(k in url for k in junk):
            return False
        if any(k in url for k in ["/blog", "/post", "/article", "/news", "/journal", "/case-stud",
                                  "/resource", "/whitepaper", "/ebook", "/podcast", "/story"]):
            return True
        if any(k in title for k in ["blog", "article", "post", "news", "case study"]):
            return True
        return False

    @staticmethod
    def _detect_page_type(page):
        url = (page.url or "").lower()
        title = (page.title or "").lower()
        h1 = (page.h1 or "").lower()
        content = (page.content_text or "").lower()[:2000]
        slug = url.split("//")[-1].split("?")[0].rstrip("/").rsplit("/", 1)[-1] if "/" in url else ""

        if any(k in url for k in ["/blog", "/post", "/article", "/news", "/journal"]):
            return "BLOG"
        if any(k in url for k in ["/product", "/item", "/shop", "/buy", "/store", "/collection"]):
            return "PRODUCT"
        if any(k in url for k in ["/category", "/tag", "/topics", "/collections"]):
            return "CATEGORY"
        if any(k in url for k in ["/about", "/team", "/company", "/mission", "/story"]):
            return "ABOUT"
        if any(k in url for k in ["/contact", "/support", "/help", "/help-center"]):
            return "CONTACT"
        if any(k in url for k in ["/pricing", "/plans", "/enterprise"]):
            return "PRICING"
        if any(k in url for k in ["/case-study", "/case-studies", "/portfolio", "/work"]):
            return "CASE_STUDY"
        if any(k in url for k in ["/faq", "/questions", "/answers"]):
            return "FAQ"
        if any(k in url for k in ["/docs", "/documentation", "/guide", "/tutorial", "/learn"]):
            return "DOCS"
        if slug in ("", "index.html", "index.php", "home"):
            return "HOMEPAGE"
        if any(k in title for k in ["blog", "article", "post", "news"]):
            return "BLOG"
        if any(k in title for k in ["product", "feature", "solution"]):
            return "PRODUCT"
        if any(k in content for k in ["add to cart", "buy now", "pricing", "checkout"]):
            return "PRODUCT"
        if any(k in content for k in ["contact us", "get in touch", "reach out"]):
            return "CONTACT"
        if page.word_count and page.word_count > 1500 and len(page.headings) >= 5:
            return "CONTENT"
        return "PAGE"

    def analyze_pages(self, pages):
        result = AnalysisResult()
        if not pages:
            return result

        from app.engine.url_canonicalization import URLCanonicalizer
        canonicalizer = URLCanonicalizer()
        page_dicts = []
        for p in pages:
            page_dicts.append({
                "url": p.url, "title": p.title or "", "h1": p.h1 or "",
                "canonical": p.canonical or "", "status_code": p.status_code,
                "word_count": p.word_count or 0, "content_text": p.content_text or "",
            })
        canonical_result = canonicalizer.analyze(page_dicts)
        result.canonicalization = {
            "summary": canonical_result.get("summary", {}),
            "issues": canonical_result.get("canonicalization_issues", {}),
            "duplicate_groups": canonical_result.get("duplicate_groups", []),
            "redirect_chains": canonical_result.get("redirect_chains", []),
        }

        for page in pages:
            if not getattr(page, 'page_type', None) or page.page_type in ("UNKNOWN", "other", ""):
                page.page_type = self._detect_page_type(page)
            page._normalized_url = canonicalizer.normalize(page.url)

        all_text = " ".join(p.content_text for p in pages if p.content_text)
        all_titles = [p.title for p in pages if p.title]
        domain_entities = self._extract_entities(all_text)
        all_headings = []
        for p in pages:
            all_headings.extend(p.headings)

        for page in pages:
            pa = PageAnalysis(page.url)
            self._analyze_page_technical(page, result, pa)
            self._analyze_page_seo(page, result, pa, all_titles, domain_entities)
            self._analyze_page_content(page, result, pa, all_text)
            self._analyze_page_aeo(page, result, pa, all_headings, all_text)
            self._analyze_page_geo(page, result, pa, all_text, domain_entities)
            self._analyze_page_ai_search(page, result, pa, all_text, domain_entities)
            self._analyze_page_internal_links(page, result, pa, pages)
            self._analyze_page_schema(page, result, pa)
            pa.scores = result.compute_page_score(page.url)
            result.page_analyses[page.url] = pa

        self._analyze_site_wide(pages, result, all_text, domain_entities)
        self._analyze_site_aeo(pages, result, all_text, all_headings)
        self._analyze_site_geo(pages, result, all_text, domain_entities)
        self._analyze_site_ai_search(pages, result, all_text, domain_entities)
        self._analyze_content_intelligence(pages, result, all_text)
        self._analyze_content_structure(pages, result, all_text)
        self._generate_keyword_data(pages, result, all_text, domain_entities)
        self._generate_roadmap(result)

        result.compute_scores()
        return result

    def _sid(self):
        self.SIGNAL_ID_COUNTER += 1
        return self.SIGNAL_ID_COUNTER

    def _analyze_page_technical(self, page, result, pa):
        sid = self._sid()
        result.add_signal(sid, "HTTPS", "TECHNICAL", 1.0 if page.https else 0.0, 1.0, "Uses HTTPS" if page.https else "Uses HTTP - critical security issue", page.url, page.url)
        if not page.https:
            result.add_issue(page.url, "TECHNICAL", "CRITICAL", sid, "HTTP not HTTPS", "Page uses HTTP instead of HTTPS", "Google prioritizes HTTPS sites; browsers show 'Not Secure' warning", "Enable SSL certificate and redirect HTTP to HTTPS")

        sid = self._sid()
        result.add_signal(sid, "HTTP Status Code", "TECHNICAL", 1.0 if page.status_code == 200 else (0.5 if page.status_code in (301, 302) else 0.0), 1.0, f"Status: {page.status_code}", page.url, page.url)
        if page.status_code >= 400:
            result.add_issue(page.url, "TECHNICAL", "CRITICAL", sid, f"HTTP {page.status_code} Error", f"Page returns {page.status_code}", "Page cannot be indexed or crawled", "Fix server configuration or restore the page")
        elif page.status_code == 0:
            result.add_issue(page.url, "TECHNICAL", "CRITICAL", sid, "Connection Failed", "Page could not be reached", "Page is completely inaccessible", "Check DNS, server status, and firewall rules")

        sid = self._sid()
        result.add_signal(sid, "Response Time", "TECHNICAL", 1.0 if page.response_time_ms < 800 else (0.8 if page.response_time_ms < 1500 else (0.5 if page.response_time_ms < 3000 else 0.2)), 0.8, f"{page.response_time_ms}ms", page.url, page.url)
        if page.response_time_ms > 3000:
            result.add_issue(page.url, "TECHNICAL", "HIGH", sid, "Slow Response", f"Page takes {page.response_time_ms}ms to respond", "Slow pages hurt rankings and user experience", "Optimize server response time, use CDN, enable caching")

        sid = self._sid()
        has_canonical = bool(page.canonical)
        result.add_signal(sid, "Canonical Tag", "TECHNICAL", 1.0 if has_canonical else 0.2, 0.9, "Has canonical" if has_canonical else "Missing canonical tag", page.url, page.url)
        if not has_canonical:
            result.add_issue(page.url, "TECHNICAL", "HIGH", sid, "Missing Canonical", f"No canonical tag on {page.url}", "Search engines may index duplicate versions", f'<link rel="canonical" href="{page.url}" />')

        sid = self._sid()
        robots_clean = page.robots_meta.lower().replace(" ", "") if page.robots_meta else ""
        is_indexable = "noindex" not in robots_clean
        result.add_signal(sid, "Indexability", "TECHNICAL", 1.0 if is_indexable else 0.0, 1.0, f"{'Indexable' if is_indexable else 'Noindex detected'}", page.url, page.url)
        if not is_indexable:
            result.add_issue(page.url, "TECHNICAL", "HIGH", sid, "Noindex Tag", f"Page {page.url} has noindex directive", "Page will not appear in search results", "Remove noindex if page should be indexed")

        sid = self._sid()
        has_robots_meta = bool(page.robots_meta)
        result.add_signal(sid, "Robots Meta", "TECHNICAL", 0.8 if has_robots_meta else 0.5, 0.5, f"Robots: {page.robots_meta or 'default (none)'}", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "Redirect Chain", "TECHNICAL", 1.0 if len(page.redirect_chain) == 0 else (0.5 if len(page.redirect_chain) == 1 else 0.2), 0.7, f"{len(page.redirect_chain)} redirects", page.url, page.url)
        if len(page.redirect_chain) > 1:
            result.add_issue(page.url, "TECHNICAL", "MEDIUM", sid, "Redirect Chain", f"{len(page.redirect_chain)} redirects in chain", "Redirect chains waste crawl budget and dilute link equity", "Update links to point directly to final URL")

        sid = self._sid()
        result.add_signal(sid, "Language Declaration", "TECHNICAL", 1.0 if page.language else 0.3, 0.4, f"Language: {page.language or 'not declared'}", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "Content Hash", "TECHNICAL", 1.0 if page.content_hash else 0.3, 0.5, "Content fingerprinted" if page.content_hash else "No content hash", page.url, page.url)

    def _analyze_page_seo(self, page, result, pa, all_titles, entities):
        title_len = len(page.title)
        sid = self._sid()
        result.add_signal(sid, "Title Tag Exists", "SEO", 1.0 if page.title else 0.0, 1.0, f"Title: {page.title[:80]}" if page.title else "Missing title tag", page.url, page.url)
        if not page.title:
            result.add_issue(page.url, "SEO", "CRITICAL", sid, "Missing Title", f"No title tag on {page.url}", "Title is the #1 on-page ranking factor", "Add a unique, keyword-rich title (50-60 chars)")

        sid = self._sid()
        result.add_signal(sid, "Title Length", "SEO", 1.0 if 30 <= title_len <= 60 else (0.7 if 20 <= title_len <= 70 else 0.3), 0.9, f"{title_len} characters", page.url, page.url)
        if title_len > 0 and title_len < 30:
            result.add_issue(page.url, "SEO", "MEDIUM", sid, "Title Too Short", f"Title is only {title_len} chars", "Short titles miss keyword opportunities", "Expand title to 50-60 characters with target keywords")
        elif title_len > 60:
            result.add_issue(page.url, "SEO", "MEDIUM", sid, "Title Too Long", f"Title is {title_len} chars (may be truncated)", "Long titles get truncated in SERPs", "Shorten to 55-60 characters, keep most important words first")

        sid = self._sid()
        result.add_signal(sid, "Title Uniqueness", "SEO", 1.0 if all_titles.count(page.title) <= 1 else 0.3, 0.8, "Unique" if all_titles.count(page.title) <= 1 else f"Duplicate of {all_titles.count(page.title) - 1} other pages", page.url, page.url)
        if all_titles.count(page.title) > 1 and page.title:
            result.add_issue(page.url, "SEO", "HIGH", sid, "Duplicate Title", f"Title '{page.title[:60]}' appears on {all_titles.count(page.title)} pages", "Duplicate titles confuse search engines about page relevance", "Write a unique title for each page")

        sid = self._sid()
        result.add_signal(sid, "Title Keyword Presence", "SEO", 1.0 if page.title and any(e.lower() in page.title.lower() for e in list(entities.keys())[:20]) else 0.4, 0.7, "Contains domain entities" if page.title else "No entities in title", page.url, page.url)

        desc_len = len(page.meta_description)
        sid = self._sid()
        result.add_signal(sid, "Meta Description Exists", "SEO", 1.0 if page.meta_description else 0.0, 1.0, f"Description: {page.meta_description[:80]}..." if page.meta_description else "Missing meta description", page.url, page.url)
        if not page.meta_description:
            result.add_issue(page.url, "SEO", "HIGH", sid, "Missing Meta Description", f"No meta description on {page.url}", "Google auto-generates descriptions, missing CTR opportunity", "Write compelling 150-160 char description with CTA")

        sid = self._sid()
        result.add_signal(sid, "Meta Description Length", "SEO", 1.0 if 120 <= desc_len <= 160 else (0.6 if 80 <= desc_len <= 200 else 0.2), 0.8, f"{desc_len} characters", page.url, page.url)
        if desc_len > 0 and desc_len < 120:
            result.add_issue(page.url, "SEO", "MEDIUM", sid, "Meta Description Short", f"Only {desc_len} chars", "Short descriptions miss SERP real estate", "Expand to 150-160 characters with keywords and CTA")

        h1s = [h for h in page.headings if h["level"] == "H1"]
        sid = self._sid()
        result.add_signal(sid, "H1 Tag", "SEO", 1.0 if len(h1s) == 1 else (0.5 if len(h1s) > 1 else 0.0), 1.0, f"{len(h1s)} H1 tags", page.url, page.url)
        if len(h1s) == 0:
            result.add_issue(page.url, "SEO", "HIGH", sid, "Missing H1", f"No H1 tag on {page.url}", "H1 is a primary on-page signal for topic relevance", "Add one H1 with primary keyword")
        elif len(h1s) > 1:
            h1_texts = ", ".join(h["text"][:40] for h in h1s[:3])
            result.add_issue(page.url, "SEO", "MEDIUM", sid, "Multiple H1 Tags", f"{len(h1s)} H1 tags on {page.url}: {h1_texts}", "Multiple H1s dilute topic focus", "Keep only one H1 per page, convert others to H2")

        h2s = [h for h in page.headings if h["level"] == "H2"]
        sid = self._sid()
        result.add_signal(sid, "H2 Tags", "SEO", 1.0 if len(h2s) >= 2 else (0.6 if len(h2s) == 1 else 0.2), 0.7, f"{len(h2s)} H2 tags", page.url, page.url)
        if len(h2s) == 0 and page.word_count > 300:
            result.add_issue(page.url, "SEO", "MEDIUM", sid, "No H2 Subheadings", "Long page without H2 structure", "Subheadings improve readability and keyword targeting", "Add 3-5 H2 subheadings with related keywords")

        h3s = [h for h in page.headings if h["level"] == "H3"]
        sid = self._sid()
        result.add_signal(sid, "H3 Tags", "SEO", 1.0 if len(h3s) >= 1 else 0.5, 0.4, f"{len(h3s)} H3 tags", page.url, page.url)

        all_h = [h for h in page.headings if h["level"] in ("H1", "H2", "H3")]
        sid = self._sid()
        heading_texts = " ".join(h["text"].lower() for h in all_h)
        result.add_signal(sid, "Heading Keyword Coverage", "SEO", 1.0 if any(e.lower() in heading_texts for e in list(entities.keys())[:10]) else 0.3, 0.7, "Headings contain domain entities", page.url, page.url)

        wc = page.word_count
        sid = self._sid()
        if wc == 0: wc_score = 0.0
        elif wc < 200: wc_score = 0.1
        elif wc < 400: wc_score = 0.3
        elif wc < 800: wc_score = 0.6
        elif wc < 1500: wc_score = 0.8
        else: wc_score = 1.0
        result.add_signal(sid, "Content Length", "SEO", wc_score, 0.9, f"{wc} words", page.url, page.url)
        if 0 < wc < 300 and page.status_code == 200:
            result.add_issue(page.url, "SEO", "HIGH", sid, "Thin Content", f"Only {wc} words on page", "Thin pages are rarely ranked; Panda algorithm targets thin content", "Expand to 800+ words with comprehensive topic coverage")

        sid = self._sid()
        imgs = len(page.images)
        alt_imgs = sum(1 for i in page.images if i.get("alt"))
        if imgs > 0:
            alt_ratio = alt_imgs / imgs
            result.add_signal(sid, "Image Alt Text", "SEO", alt_ratio, 0.7, f"{alt_imgs}/{imgs} images have alt text", page.url, page.url)
            if alt_imgs < imgs:
                result.add_issue(page.url, "SEO", "MEDIUM", sid, "Missing Alt Text", f"{imgs - alt_imgs} images missing alt text", "Alt text helps image SEO and accessibility", "Add descriptive alt text to all images")

        sid = self._sid()
        large_imgs = sum(1 for i in page.images if i.get("src", ""))
        result.add_signal(sid, "Image Count", "SEO", 1.0 if 1 <= imgs <= 20 else (0.5 if imgs > 20 else 0.3), 0.4, f"{imgs} images", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "Lazy Loading", "SEO", 1.0 if any(i.get("loading") == "lazy" for i in page.images) else 0.4, 0.4, "Lazy loading detected" if any(i.get("loading") == "lazy" for i in page.images) else "No lazy loading", page.url, page.url)

        sid = self._sid()
        int_count = len(page.links_internal)
        result.add_signal(sid, "Internal Links", "SEO", 1.0 if int_count >= 3 else (0.6 if int_count >= 1 else 0.1), 0.8, f"{int_count} internal links", page.url, page.url)
        if int_count == 0 and page.status_code == 200:
            result.add_issue(page.url, "SEO", "MEDIUM", sid, "No Internal Links", "Page has no internal links", "Internal links distribute PageRank and help crawlability", "Add 3-5 contextual internal links")

        sid = self._sid()
        ext_count = len(page.links_external)
        result.add_signal(sid, "External Links", "SEO", 1.0 if ext_count >= 1 else 0.4, 0.5, f"{ext_count} external links", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "Outbound Link Quality", "SEO", 0.7 if ext_count > 0 else 0.3, 0.4, "Links to external resources" if ext_count > 0 else "No outbound links", page.url, page.url)

    def _analyze_page_content(self, page, result, pa, all_text):
        wc = page.word_count
        sid = self._sid()
        reading_ease = 0.7
        if page.content_text:
            try:
                import textstat
                reading_ease = textstat.flesch_reading_ease(page.content_text) / 100
            except Exception:
                reading_ease = 0.7
        result.add_signal(sid, "Readability", "CONTENT", max(0, min(1, reading_ease)), 0.6, f"Reading ease: {reading_ease:.0%}", page.url, page.url)

        sid = self._sid()
        paragraphs = page.content_text.count("\n\n") if page.content_text else 0
        result.add_signal(sid, "Content Structure", "CONTENT", 1.0 if paragraphs >= 3 else (0.5 if paragraphs >= 1 else 0.2), 0.5, f"{paragraphs} paragraph breaks", page.url, page.url)

        sid = self._sid()
        sentences = len(re.split(r'[.!?]+', page.content_text)) if page.content_text else 0
        avg_sentence_len = wc / max(sentences, 1) if wc > 0 else 0
        result.add_signal(sid, "Sentence Complexity", "CONTENT", 1.0 if avg_sentence_len < 25 else (0.6 if avg_sentence_len < 35 else 0.3), 0.4, f"Avg {avg_sentence_len:.0f} words/sentence", page.url, page.url)
        if avg_sentence_len > 35 and wc > 200:
            result.add_issue(page.url, "CONTENT", "LOW", sid, "Complex Sentences", f"Average {avg_sentence_len:.0f} words per sentence", "Complex sentences reduce readability", "Break long sentences into shorter ones")

        sid = self._sid()
        has_lists = bool(re.search(r'<[ou]l|•|▪|–|\d+\.', page.content_text or page.html_raw or ""))
        result.add_signal(sid, "Lists Present", "CONTENT", 1.0 if has_lists else 0.2, 0.5, "Lists found" if has_lists else "No lists", page.url, page.url)

        sid = self._sid()
        has_bold = bool(re.search(r'<strong|<b|__|\*\*', page.html_raw or page.content_text or ""))
        result.add_signal(sid, "Bold Text", "CONTENT", 1.0 if has_bold else 0.3, 0.3, "Bold text present" if has_bold else "No bold text", page.url, page.url)

        sid = self._sid()
        year_refs = len(re.findall(r'20[2-3]\d', page.content_text or ""))
        result.add_signal(sid, "Content Freshness", "CONTENT", 1.0 if year_refs >= 2 else (0.5 if year_refs >= 1 else 0.2), 0.6, f"{year_refs} year references", page.url, page.url)
        if year_refs == 0 and wc > 200:
            result.add_issue(page.url, "CONTENT", "MEDIUM", sid, "Stale Content", "No recent year references found", "Outdated content loses rankings and trust", "Update content with current year and recent data")

        sid = self._sid()
        has_numbers = bool(re.search(r'\d+%|\$\d+|\d{1,3},\d{3}', page.content_text or ""))
        result.add_signal(sid, "Data & Statistics", "CONTENT", 1.0 if has_numbers else 0.3, 0.4, "Contains data/statistics" if has_numbers else "No statistics found", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "CTA Presence", "CONTENT", 1.0 if any(kw in (page.content_text or "").lower() for kw in ["sign up", "get started", "contact us", "learn more", "request demo", "start free", "try now", "book a demo"]) else 0.3, 0.5, "CTAs found" if any(kw in (page.content_text or "").lower() for kw in ["sign up", "get started"]) else "No CTAs found", page.url, page.url)

        sid = self._sid()
        has_author = any(s in (page.html_raw or "").lower() for s in ["author", "written by", "byline", "posted by"])
        result.add_signal(sid, "Author Attribution", "CONTENT", 1.0 if has_author else 0.2, 0.4, "Author info present" if has_author else "No author attribution", page.url, page.url)
        if not has_author and wc > 500 and self._expects_author_attribution(page):
            result.add_issue(page.url, "CONTENT", "LOW", sid, "No Author", "Content has no author attribution", "Author signals build E-E-A-T for AI and Google", "Add author name, bio, and credentials")

        sid = self._sid()
        has_toc = bool(re.search(r'table.of.contents|toc|jump.to', page.html_raw or "", re.IGNORECASE))
        result.add_signal(sid, "Table of Contents", "CONTENT", 1.0 if has_toc else 0.3, 0.3, "TOC present" if has_toc else "No table of contents", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "Video/Media Embed", "CONTENT", 1.0 if any(s in (page.html_raw or "").lower() for s in ["youtube.com/embed", "vimeo.com", "wistia", "<video", "iframe"]) else 0.3, 0.3, "Media embedded" if any(s in (page.html_raw or "").lower() for s in ["youtube", "video"]) else "No media", page.url, page.url)

    def _analyze_page_aeo(self, page, result, pa, all_headings, all_text):
        page_headings = [h for h in page.headings]

        sid = self._sid()
        question_headings = [h for h in page_headings if "?" in h["text"] or h["text"].lower().startswith(("how", "what", "why", "when", "where", "who", "can", "is", "does", "do", "are"))]
        result.add_signal(sid, "Question Headings", "AEO", min(len(question_headings) / 2, 1.0), 0.9, f"{len(question_headings)} question-format headings", page.url, page.url)
        if len(question_headings) == 0 and page.word_count > 300:
            result.add_issue(page.url, "AEO", "MEDIUM", sid, "No Question Headings", "No question-format headings found", "Question headings directly target featured snippets and AI answers", "Add 2-3 question-format H2/H3 headings")

        sid = self._sid()
        faq_schema = any(isinstance(s, dict) and s.get("@type") == "FAQPage" for s in page.schema_markup)
        has_faq_section = bool(re.search(r'frequently.asked|faq|common.questions', (page.content_text or "").lower()))
        result.add_signal(sid, "FAQ Schema", "AEO", 1.0 if faq_schema else (0.5 if has_faq_section else 0.0), 1.0, "FAQPage schema found" if faq_schema else ("FAQ section exists" if has_faq_section else "No FAQ schema"), page.url, page.url)
        if not faq_schema and page.word_count > 500:
            result.add_issue(page.url, "AEO", "HIGH", sid, "Missing FAQ Schema", f"No FAQPage JSON-LD on {page.url}", "FAQ schema enables AI answer extraction (GEO/AEO) and citation readiness", "Add FAQPage schema with 4-6 Q&As")

        sid = self._sid()
        result.add_signal(sid, "FAQ Section Content", "AEO", 1.0 if has_faq_section else 0.0, 0.8, "FAQ section in content" if has_faq_section else "No FAQ section", page.url, page.url)

        sid = self._sid()
        lists_in_content = len(re.findall(r'<[ou]l|•|▪|–', page.html_raw or page.content_text or ""))
        result.add_signal(sid, "Lists for Snippets", "AEO", min(lists_in_content / 3, 1.0), 0.7, f"{lists_in_content} list elements", page.url, page.url)

        sid = self._sid()
        has_tables = "table" in (page.html_raw or "").lower()
        result.add_signal(sid, "Tables", "AEO", 1.0 if has_tables else 0.2, 0.6, "Tables present" if has_tables else "No tables", page.url, page.url)

        sid = self._sid()
        direct_answers = sum(1 for h in page_headings if any(kw in h["text"].lower() for kw in ["definition", "meaning", "what is", "what are", "overview"]))
        result.add_signal(sid, "Definition Sections", "AEO", min(direct_answers / 2, 1.0), 0.7, f"{direct_answers} definition headings", page.url, page.url)

        sid = self._sid()
        how_to = sum(1 for h in page_headings if "how to" in h["text"].lower() or "step" in h["text"].lower() or "guide" in h["text"].lower())
        how_to_schema = any(isinstance(s, dict) and s.get("@type") == "HowTo" for s in page.schema_markup)
        result.add_signal(sid, "How-To Structure", "AEO", 1.0 if how_to_schema else (min(how_to / 2, 1.0) if how_to else 0.1), 0.8, f"{how_to} how-to headings" + (", HowTo schema" if how_to_schema else ""), page.url, page.url)
        if how_to > 0 and not how_to_schema:
            result.add_issue(page.url, "AEO", "MEDIUM", sid, "Missing HowTo Schema", "How-to content without HowTo schema", "HowTo schema enables step-by-step rich results", "Add HowTo JSON-LD schema for how-to content")

        sid = self._sid()
        result.add_signal(sid, "Featured Snippet Format", "AEO", 1.0 if (question_headings and lists_in_content > 0) else (0.5 if question_headings else 0.2), 0.7, "Optimized for snippets" if question_headings else "Not optimized", page.url, page.url)

        sid = self._sid()
        voice_kw_count = sum(1 for kw in ["near me", "best", "how to", "what is", "where can", "top", "vs", "compare", "review"] if kw in (page.content_text or "").lower())
        result.add_signal(sid, "Voice Search Keywords", "AEO", min(voice_kw_count / 4, 1.0), 0.5, f"{voice_kw_count} voice-keyword patterns", page.url, page.url)

        sid = self._sid()
        has_speakable = any(isinstance(s, dict) and "speakable" in str(s).lower() for s in page.schema_markup)
        result.add_signal(sid, "Speakable Schema", "AEO", 1.0 if has_speakable else 0.0, 0.5, "Speakable markup found" if has_speakable else "No Speakable schema", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "Q&A Format", "AEO", 1.0 if re.search(r'q[:.]|a[:.]|question:|answer:', (page.content_text or "").lower()) else 0.2, 0.5, "Q&A format detected" if re.search(r'q[:.]|a[:.]', (page.content_text or "").lower()) else "No Q&A format", page.url, page.url)

    def _analyze_page_geo(self, page, result, pa, all_text, entities):
        sid = self._sid()
        brand_signals = sum(1 for kw in ["about us", "our company", "our team", "founded", "our mission", "our story"] if kw in (page.content_text or "").lower())
        result.add_signal(sid, "Brand Entity Signals", "GEO", min(brand_signals / 2, 1.0), 0.9, f"{brand_signals} brand signals", page.url, page.url)

        sid = self._sid()
        has_author_entity = any(isinstance(s, dict) and s.get("@type") in ("Person", "Organization") for s in page.schema_markup)
        result.add_signal(sid, "Author Schema", "GEO", 1.0 if has_author_entity else 0.2, 0.8, "Author/Org schema present" if has_author_entity else "No author schema", page.url, page.url)
        if not has_author_entity and page.word_count > 500:
            result.add_issue(page.url, "GEO", "MEDIUM", sid, "Missing Author Schema", f"No Person or Organization schema on {page.url}", "Author entities help AI systems attribute expertise", "Add author Person schema with name, URL, sameAs")

        sid = self._sid()
        has_org_schema = any(isinstance(s, dict) and s.get("@type") == "Organization" for s in page.schema_markup)
        result.add_signal(sid, "Organization Schema", "GEO", 1.0 if has_org_schema else 0.2, 0.7, "Organization schema present" if has_org_schema else "No Organization schema", page.url, page.url)

        sid = self._sid()
        expertise_kw = sum(1 for kw in ["expert", "experience", "years of", "certified", "professional", "award", "leading", "trusted", "proven"] if kw in (page.content_text or "").lower())
        result.add_signal(sid, "Expertise Signals", "GEO", min(expertise_kw / 5, 1.0), 0.7, f"{expertise_kw} expertise indicators", page.url, page.url)

        sid = self._sid()
        has_about = "/about" in page.url.lower()
        result.add_signal(sid, "About Page Link", "GEO", 1.0 if has_about else 0.5, 0.6, "Is about page" if has_about else "Not about page", page.url, page.url)

        sid = self._sid()
        trust_kw = sum(1 for kw in ["trust", "security", "privacy", "compliance", "gdpr", "soc 2", "iso", "certified", "guarantee", "warranty"] if kw in (page.content_text or "").lower())
        result.add_signal(sid, "Trust Signals", "GEO", min(trust_kw / 3, 1.0), 0.7, f"{trust_kw} trust indicators", page.url, page.url)

        sid = self._sid()
        review_kw = sum(1 for kw in ["review", "testimonial", "feedback", "rating", "case study", "success story", "client"] if kw in (page.content_text or "").lower())
        result.add_signal(sid, "Review/Testimonial Signals", "GEO", min(review_kw / 3, 1.0), 0.6, f"{review_kw} review indicators", page.url, page.url)

        sid = self._sid()
        citation_kw = sum(1 for kw in ["source", "reference", "according to", "study shows", "research", "data from", "report"] if kw in (page.content_text or "").lower())
        result.add_signal(sid, "Citation Signals", "GEO", min(citation_kw / 3, 1.0), 0.7, f"{citation_kw} citation indicators", page.url, page.url)

        sid = self._sid()
        has_sameas = any(isinstance(s, dict) and "sameAs" in str(s) for s in page.schema_markup)
        result.add_signal(sid, "SameAs Links", "GEO", 1.0 if has_sameas else 0.0, 0.6, "SameAs social links found" if has_sameas else "No SameAs links", page.url, page.url)
        if not has_sameas:
            result.add_issue(page.url, "GEO", "LOW", sid, "No SameAs Links", "No social profile links in schema", "SameAs links help AI verify brand identity", "Add sameAs links to Organization schema")

        sid = self._sid()
        result.add_signal(sid, "Entity Density", "GEO", min(len([e for e in entities if e.lower() in (page.content_text or "").lower()]) / 5, 1.0), 0.6, f"{len([e for e in entities if e.lower() in (page.content_text or '').lower()])} entities in content", page.url, page.url)

    def _analyze_page_ai_search(self, page, result, pa, all_text, entities):
        sid = self._sid()
        structured_count = len(page.schema_markup)
        result.add_signal(sid, "Structured Data Count", "AI_SEARCH", min(structured_count / 3, 1.0), 0.9, f"{structured_count} schema types", page.url, page.url)

        sid = self._sid()
        has_article = any(isinstance(s, dict) and s.get("@type") in ("Article", "BlogPosting", "NewsArticle", "TechArticle") for s in page.schema_markup)
        result.add_signal(sid, "Article Schema", "AI_SEARCH", 1.0 if has_article else 0.2, 0.7, "Article schema present" if has_article else "No Article schema", page.url, page.url)

        sid = self._sid()
        has_breadcrumb = any(isinstance(s, dict) and s.get("@type") == "BreadcrumbList" for s in page.schema_markup)
        result.add_signal(sid, "Breadcrumb Schema", "AI_SEARCH", 1.0 if has_breadcrumb else 0.2, 0.5, "Breadcrumb schema found" if has_breadcrumb else "No breadcrumb schema", page.url, page.url)

        sid = self._sid()
        has_webpage = any(isinstance(s, dict) and s.get("@type") in ("WebPage", "WebSite") for s in page.schema_markup)
        result.add_signal(sid, "WebPage Schema", "AI_SEARCH", 1.0 if has_webpage else 0.2, 0.5, "WebPage schema found" if has_webpage else "No WebPage schema", page.url, page.url)

        sid = self._sid()
        content_lower = (page.content_text or "").lower()
        citation_signals = sum(1 for kw in ["source:", "reference:", "according to", "study shows", "research indicates", "data shows", "report by", "published in"] if kw in content_lower)
        result.add_signal(sid, "Citation-Ready Content", "AI_SEARCH", min(citation_signals / 3, 1.0), 0.8, f"{citation_signals} citation patterns", page.url, page.url)
        if citation_signals == 0 and page.word_count > 500:
            result.add_issue(page.url, "AI_SEARCH", "MEDIUM", sid, "Not Citation-Ready", "No citation patterns found in content", "AI systems prefer citing content with clear source attribution", "Add source references, study citations, and data attribution")

        sid = self._sid()
        year_refs = len(re.findall(r'20[2-3]\d', page.content_text or ""))
        result.add_signal(sid, "Content Freshness for AI", "AI_SEARCH", 1.0 if year_refs >= 2 else (0.5 if year_refs >= 1 else 0.1), 0.7, f"{year_refs} recent year references", page.url, page.url)

        sid = self._sid()
        has_code = bool(re.search(r'<code|```|<pre', page.html_raw or ""))
        result.add_signal(sid, "Code Examples", "AI_SEARCH", 1.0 if has_code else 0.3, 0.4, "Code examples present" if has_code else "No code examples", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "Content Uniqueness", "AI_SEARCH", 1.0 if page.content_hash else 0.3, 0.7, "Content fingerprinted" if page.content_hash else "No hash", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "AI Readability", "AI_SEARCH", 1.0 if page.word_count > 300 and len(page.headings) >= 3 else (0.5 if page.word_count > 100 else 0.2), 0.7, f"{page.word_count} words, {len(page.headings)} headings", page.url, page.url)

        sid = self._sid()
        has_wordtable = bool(re.search(r'comparison|vs\.?|versus|alternatives?|competitors?|pricing', (page.content_text or "").lower()))
        result.add_signal(sid, "Comparison Content", "AI_SEARCH", 1.0 if has_wordtable else 0.2, 0.5, "Comparison content found" if has_wordtable else "No comparison content", page.url, page.url)

    def _analyze_page_internal_links(self, page, result, pa, all_pages):
        sid = self._sid()
        int_links = len(page.links_internal)
        result.add_signal(sid, "Internal Link Count", "SEO", 1.0 if int_links >= 5 else (0.7 if int_links >= 3 else (0.4 if int_links >= 1 else 0.1)), 0.8, f"{int_links} internal links", page.url, page.url)

        sid = self._sid()
        if page.links_internal:
            link_texts = [l.get("text", "") for l in page.links_internal if l.get("text")]
            avg_link_len = sum(len(t) for t in link_texts) / max(len(link_texts), 1) if link_texts else 0
            result.add_signal(sid, "Anchor Text Quality", "SEO", 1.0 if avg_link_len > 5 else 0.4, 0.6, f"Avg anchor text: {avg_link_len:.0f} chars", page.url, page.url)
        else:
            result.add_signal(sid, "Anchor Text Quality", "SEO", 0.1, 0.6, "No internal links", page.url, page.url)

        sid = self._sid()
        linked_urls = set(l["url"].rstrip("/") for l in page.links_internal)
        result.add_signal(sid, "Link Diversity", "SEO", min(len(linked_urls) / 5, 1.0), 0.5, f"Links to {len(linked_urls)} unique pages", page.url, page.url)

    def _analyze_page_schema(self, page, result, pa):
        schemas = page.schema_markup or []
        types = set()
        for s in schemas:
            if isinstance(s, dict) and "@type" in s:
                types.add(s["@type"])

        sid = self._sid()
        result.add_signal(sid, "Schema Types Count", "TECHNICAL", min(len(types) / 3, 1.0), 0.7, f"{len(types)} schema types: {', '.join(list(types)[:3])}", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "Organization Schema", "TECHNICAL", 1.0 if "Organization" in types else 0.0, 0.6, "Has Organization" if "Organization" in types else "Missing Organization", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "WebPage Schema", "TECHNICAL", 1.0 if "WebPage" in types else 0.0, 0.5, "Has WebPage" if "WebPage" in types else "Missing WebPage", page.url, page.url)

        sid = self._sid()
        og_tags = len(page.open_graph)
        result.add_signal(sid, "OpenGraph Tags", "TECHNICAL", 1.0 if og_tags >= 4 else (0.5 if og_tags >= 2 else 0.1), 0.5, f"{og_tags} OG tags", page.url, page.url)
        if og_tags < 4 and page.status_code == 200:
            result.add_issue(page.url, "TECHNICAL", "LOW", sid, "Incomplete OpenGraph", f"Only {og_tags} OG tags", "Incomplete OG tags reduce social sharing quality", "Add og:title, og:description, og:image, og:url")

        sid = self._sid()
        result.add_signal(sid, "Twitter Card", "TECHNICAL", 1.0 if page.twitter_card else 0.2, 0.4, f"{len(page.twitter_card)} Twitter tags", page.url, page.url)

        sid = self._sid()
        result.add_signal(sid, "JSON-LD Validity", "TECHNICAL", 1.0 if schemas else 0.0, 0.6, "JSON-LD present" if schemas else "No JSON-LD", page.url, page.url)

    def _analyze_site_wide(self, pages, result, all_text, entities):
        all_pages = [p for p in pages if p.status_code == 200]
        total = len(all_pages)
        if total == 0:
            return

        sid = self._sid()
        result.add_signal(sid, "Total Pages Crawled", "TECHNICAL", min(total / 20, 1.0), 0.5, f"{total} pages crawled", "", "")

        sid = self._sid()
        canonical_count = sum(1 for p in all_pages if p.canonical)
        result.add_signal(sid, "Site-wide Canonical Coverage", "TECHNICAL", canonical_count / total, 0.8, f"{canonical_count}/{total} pages have canonical", "", "")

        sid = self._sid()
        indexable = sum(1 for p in all_pages if p.is_indexable)
        result.add_signal(sid, "Indexability Rate", "TECHNICAL", indexable / total, 0.9, f"{indexable}/{total} pages indexable", "", "")

        sid = self._sid()
        schema_count = sum(1 for p in all_pages if p.schema_markup)
        result.add_signal(sid, "Site-wide Schema Coverage", "TECHNICAL", schema_count / total, 0.8, f"{schema_count}/{total} pages with schema", "", "")

        sid = self._sid()
        unique_titles = len(set(p.title for p in all_pages if p.title))
        titled = len([p for p in all_pages if p.title])
        result.add_signal(sid, "Title Tag Coverage", "SEO", titled / total, 0.9, f"{titled}/{total} pages have titles", "", "")

        sid = self._sid()
        result.add_signal(sid, "Title Uniqueness", "SEO", unique_titles / max(titled, 1), 0.8, f"{unique_titles} unique titles out of {titled}", "", "")

        sid = self._sid()
        desc_count = sum(1 for p in all_pages if p.meta_description)
        result.add_signal(sid, "Meta Description Coverage", "SEO", desc_count / total, 0.8, f"{desc_count}/{total} have descriptions", "", "")

        sid = self._sid()
        broken_pages = [p for p in pages if p.status_code >= 400]
        broken = len(broken_pages)
        result.add_signal(sid, "Broken Page Rate", "SEO", 1.0 - (broken / max(len(pages), 1)), 0.9, f"{broken} broken pages out of {len(pages)}", "", "")
        if broken > 0:
            broken_urls = ", ".join(p.url for p in broken_pages[:5])
            more = f" and {broken - 5} more" if broken > 5 else ""
            result.add_issue(broken_pages[0].url if broken_pages else "", "SEO", "HIGH", sid, "Broken Pages", f"{broken} pages return errors: {broken_urls}{more}", "Broken pages waste crawl budget and hurt site quality", "Fix or redirect broken URLs")

        sid = self._sid()
        dup_hashes = {}
        for p in all_pages:
            if p.content_hash:
                dup_hashes.setdefault(p.content_hash, []).append(p.url)
        dup_groups = [v for v in dup_hashes.values() if len(v) > 1]
        dup_count = sum(len(v) - 1 for v in dup_groups)
        result.add_signal(sid, "Duplicate Content Rate", "SEO", 1.0 - (dup_count / total), 0.8, f"{dup_count} duplicate pages", "", "")
        if dup_count > 0:
            first_group = dup_groups[0] if dup_groups else []
            dup_urls = ", ".join(first_group[:3])
            more = f" and {dup_count - 3} more duplicates" if dup_count > 3 else ""
            result.add_issue(first_group[0] if first_group else "", "SEO", "MEDIUM", sid, "Duplicate Content", f"{dup_count} pages share identical content: {dup_urls}{more}", "Duplicate content dilutes ranking signals", "Add canonical tags or merge duplicate pages")

        sid = self._sid()
        word_counts = [p.word_count for p in all_pages if p.word_count > 0]
        avg_words = sum(word_counts) / len(word_counts) if word_counts else 0
        result.add_signal(sid, "Average Content Depth", "CONTENT", 1.0 if avg_words >= 1000 else (0.8 if avg_words >= 600 else (0.5 if avg_words >= 300 else 0.2)), 0.8, f"Avg: {int(avg_words)} words", "", "")
        if avg_words < 400 and total > 3:
            thin_site = [p for p in all_pages if 0 < p.word_count < 300]
            thin_url = thin_site[0].url if thin_site else (all_pages[0].url if all_pages else "")
            result.add_issue(thin_url, "CONTENT", "HIGH", sid, "Shallow Site Content", f"Average {int(avg_words)} words per page across {total} pages", "Sites with thin content struggle to rank", "Expand key pages to 1000+ words")

        sid = self._sid()
        result.add_signal(sid, "HTTPS Adoption", "SEO", sum(1 for p in all_pages if p.https) / total, 0.9, f"{sum(1 for p in all_pages if p.https)}/{total} HTTPS", "", "")

        sid = self._sid()
        result.add_signal(sid, "H1 Tag Coverage", "SEO", sum(1 for p in all_pages if p.h1) / total, 0.8, f"{sum(1 for p in all_pages if p.h1)}/{total} have H1", "", "")

        sid = self._sid()
        single_h1 = sum(1 for p in all_pages if sum(1 for h in p.headings if h["level"] == "H1") == 1)
        result.add_signal(sid, "Single H1 Compliance", "SEO", single_h1 / total, 0.7, f"{single_h1}/{total} have exactly one H1", "", "")

        sid = self._sid()
        avg_time = sum(p.response_time_ms for p in all_pages) // total
        result.add_signal(sid, "Average Response Time", "TECHNICAL", 1.0 if avg_time < 800 else (0.7 if avg_time < 2000 else 0.3), 0.7, f"Avg: {avg_time}ms", "", "")

        sid = self._sid()
        fast_pages = sum(1 for p in all_pages if p.response_time_ms < 2000)
        result.add_signal(sid, "Page Speed Distribution", "TECHNICAL", fast_pages / total, 0.7, f"{fast_pages}/{total} under 2s", "", "")

        sid = self._sid()
        has_about = any("/about" in p.url.lower() for p in all_pages)
        has_contact = any("/contact" in p.url.lower() for p in all_pages)
        has_privacy = any("/privacy" in p.url.lower() or "/policy" in p.url.lower() for p in all_pages)
        has_blog = any("/blog" in p.url.lower() or "/post" in p.url.lower() for p in all_pages)
        trust_score = (int(has_about) + int(has_contact) + int(has_privacy) + int(has_blog)) / 4
        result.add_signal(sid, "Trust Pages", "GEO", trust_score, 0.7, f"About:{has_about} Contact:{has_contact} Privacy:{has_privacy} Blog:{has_blog}", "", "")

        sid = self._sid()
        og_count = sum(1 for p in all_pages if p.open_graph)
        result.add_signal(sid, "Site-wide OpenGraph", "TECHNICAL", og_count / total, 0.5, f"{og_count}/{total} have OG tags", "", "")

        sid = self._sid()
        img_no_alt = sum(1 for p in all_pages for i in p.images if not i.get("alt"))
        total_imgs = sum(len(p.images) for p in all_pages)
        result.add_signal(sid, "Site-wide Alt Text", "SEO", 1.0 - (img_no_alt / max(total_imgs, 1)), 0.7, f"{total_imgs - img_no_alt}/{total_imgs} images have alt", "", "")

        sid = self._sid()
        ext_links_total = sum(len(p.links_external) for p in all_pages)
        result.add_signal(sid, "External Linking", "SEO", 1.0 if ext_links_total > total else 0.4, 0.5, f"{ext_links_total} external links total", "", "")

        sid = self._sid()
        result.add_signal(sid, "Site Content Freshness", "CONTENT", 1.0 if any(yr in all_text for yr in ["2026", "2025"]) else (0.5 if "2024" in all_text else 0.2), 0.7, "Recent content found" if any(yr in all_text for yr in ["2026", "2025"]) else "Content may be outdated", "", "")

    def _analyze_site_aeo(self, pages, result, all_text, all_headings):
        sid = self._sid()
        question_headings = [h for h in all_headings if "?" in h["text"] or h["text"].lower().startswith(("how", "what", "why", "when", "where", "who", "can", "is", "does"))]
        result.add_signal(sid, "Site-wide Question Headings", "AEO", min(len(question_headings) / 10, 1.0), 0.8, f"{len(question_headings)} question headings across site", "", "")

        sid = self._sid()
        faq_count = sum(1 for p in pages if any(isinstance(s, dict) and s.get("@type") == "FAQPage" for s in p.schema_markup))
        result.add_signal(sid, "FAQ Schema Coverage", "AEO", min(faq_count / 3, 1.0), 0.9, f"{faq_count} pages with FAQ schema", "", "")

        sid = self._sid()
        howto_count = sum(1 for p in pages if any(isinstance(s, dict) and s.get("@type") == "HowTo" for s in p.schema_markup))
        result.add_signal(sid, "HowTo Schema Coverage", "AEO", min(howto_count / 2, 1.0), 0.7, f"{howto_count} pages with HowTo schema", "", "")

        sid = self._sid()
        faq_text = all_text.lower().count("frequently asked") + all_text.lower().count("faq") + all_text.lower().count("common questions")
        result.add_signal(sid, "FAQ Content Coverage", "AEO", min(faq_text / 5, 1.0), 0.7, f"{faq_text} FAQ content sections", "", "")

        sid = self._sid()
        has_lists = bool(re.search(r'<[ou]l|•|▪|\d+\.', all_text))
        result.add_signal(sid, "Site-wide Lists", "AEO", 1.0 if has_lists else 0.2, 0.5, "Lists present site-wide" if has_lists else "No lists found", "", "")

        sid = self._sid()
        has_tables = any("table" in (p.html_raw or "").lower() for p in pages if p.html_raw)
        result.add_signal(sid, "Site-wide Tables", "AEO", 1.0 if has_tables else 0.2, 0.5, "Tables present" if has_tables else "No tables", "", "")

    def _analyze_site_geo(self, pages, result, all_text, entities):
        sid = self._sid()
        about_pages = sum(1 for p in pages if "/about" in p.url.lower())
        result.add_signal(sid, "About Page Existence", "GEO", 1.0 if about_pages > 0 else 0.0, 0.9, f"{'Has about page' if about_pages else 'No about page'}", "", "")
        if about_pages == 0:
            first_url = pages[0].url if pages else ""
            result.add_issue(first_url, "GEO", "HIGH", sid, "Missing About Page", "No about page found on site", "About pages are critical for E-E-A-T and AI trust signals", "Create comprehensive About page with team, mission, and credentials")

        sid = self._sid()
        contact_pages = sum(1 for p in pages if "/contact" in p.url.lower())
        result.add_signal(sid, "Contact Page", "GEO", 1.0 if contact_pages > 0 else 0.0, 0.8, f"{'Has contact page' if contact_pages else 'No contact page'}", "", "")

        sid = self._sid()
        privacy_pages = sum(1 for p in pages if "/privacy" in p.url.lower() or "/policy" in p.url.lower())
        result.add_signal(sid, "Privacy Policy", "GEO", 1.0 if privacy_pages > 0 else 0.0, 0.7, f"{'Has privacy policy' if privacy_pages else 'No privacy policy'}", "", "")

        sid = self._sid()
        blog_pages = sum(1 for p in pages if "/blog" in p.url.lower() or "/post" in p.url.lower() or "/article" in p.url.lower())
        result.add_signal(sid, "Blog/Content Hub", "GEO", 1.0 if blog_pages > 0 else 0.2, 0.8, f"{blog_pages} blog/article pages", "", "")

        sid = self._sid()
        org_schema = sum(1 for p in pages if any(isinstance(s, dict) and s.get("@type") == "Organization" for s in p.schema_markup))
        result.add_signal(sid, "Organization Schema Coverage", "GEO", min(org_schema / 2, 1.0), 0.8, f"{org_schema} pages with Organization schema", "", "")

        sid = self._sid()
        author_schema = sum(1 for p in pages if any(isinstance(s, dict) and s.get("@type") in ("Person", "Organization") for s in p.schema_markup))
        result.add_signal(sid, "Author Schema Coverage", "GEO", min(author_schema / 3, 1.0), 0.7, f"{author_schema} pages with author schema", "", "")

        sid = self._sid()
        expertise_count = sum(1 for kw in ["expert", "experience", "years", "certified", "professional", "award", "leading", "trusted"] if kw in all_text.lower())
        result.add_signal(sid, "Expertise Signals", "GEO", min(expertise_count / 5, 1.0), 0.7, f"{expertise_count} expertise indicators", "", "")

        sid = self._sid()
        review_count = sum(1 for kw in ["review", "testimonial", "feedback", "rating", "case study", "client"] if kw in all_text.lower())
        result.add_signal(sid, "Social Proof Signals", "GEO", min(review_count / 3, 1.0), 0.6, f"{review_count} social proof indicators", "", "")

    def _analyze_site_ai_search(self, pages, result, all_text, entities):
        sid = self._sid()
        structured = sum(1 for p in pages if p.schema_markup)
        total = len(pages)
        result.add_signal(sid, "Structured Data Coverage", "AI_SEARCH", structured / max(total, 1), 0.9, f"{structured}/{total} pages with schema", "", "")

        sid = self._sid()
        citations = sum(1 for kw in ["source", "reference", "according to", "study shows", "research"] if kw in all_text.lower())
        result.add_signal(sid, "Citation-Ready Content", "AI_SEARCH", min(citations / 4, 1.0), 0.7, f"{citations} citation signals across site", "", "")

        sid = self._sid()
        freshness = sum(1 for p in pages if any(yr in (p.content_text or "") for yr in ["2025", "2026"]))
        result.add_signal(sid, "Content Freshness", "AI_SEARCH", freshness / max(total, 1), 0.7, f"{freshness}/{total} pages with recent dates", "", "")

        sid = self._sid()
        unique = len(set(p.content_hash for p in pages if p.content_hash))
        result.add_signal(sid, "Content Uniqueness Rate", "AI_SEARCH", unique / max(total, 1), 0.8, f"{unique} unique content hashes", "", "")

        sid = self._sid()
        result.add_signal(sid, "Entity Coverage", "AI_SEARCH", min(len(entities) / 15, 1.0), 0.6, f"{len(entities)} entities extracted", "", "")

        sid = self._sid()
        has_llms = any("/llms.txt" in (p.url or "").lower() or "llms" in (p.url or "").lower() for p in pages)
        result.add_signal(sid, "LLMs.txt", "AI_SEARCH", 1.0 if has_llms else 0.0, 0.5, "LLMs.txt found" if has_llms else "No llms.txt", "", "")

        sid = self._sid()
        has_robots = any("/robots.txt" in (p.url or "").lower() for p in pages)
        result.add_signal(sid, "Robots.txt Presence", "AI_SEARCH", 1.0 if has_robots else 0.2, 0.6, "robots.txt found" if has_robots else "robots.txt not found in crawl", "", "")

        self._analyze_ai_crawler_access(pages, result, all_text)

    def _analyze_ai_crawler_access(self, pages, result, all_text):
        """Detect whether AI crawlers (GPTBot, CCBot, PerplexityBot, OAI-SearchBot) can access the site."""
        ai_crawlers = ["gptbot", "ccbot", "perplexitybot", "oai-searchbot", "aiextractor", "imagesiftbot", "anthropic-ai"]
        robots_text = ""
        for p in pages:
            if "/robots.txt" in (p.url or "").lower():
                robots_text = p.content_text or ""
                break

        allowed = []
        blocked = []
        if robots_text:
            lower = robots_text.lower()
            for crawler in ai_crawlers:
                if crawler in lower:
                    allowed.append(crawler)
                else:
                    blocked.append(crawler)
            sid = self._sid()
            score = min(len(allowed) / 3, 1.0)
            detail = "AI crawlers allowed" if allowed else "robots.txt found but no AI crawler directives"
            result.add_signal(
                sid, "AI Crawler Accessibility", "AI_SEARCH", score, 0.8,
                f"{detail}: {', '.join(allowed) if allowed else 'GPTBot, CCBot, PerplexityBot not explicitly allowed'}", "", "",
            )

        sid = self._sid()
        has_llms = any("/llms.txt" in (p.url or "").lower() for p in pages)
        result.add_signal(sid, "LLMs.txt for AI Access", "AI_SEARCH", 1.0 if has_llms else 0.0, 0.6, "llms.txt found" if has_llms else "No llms.txt — add for AI discoverability", "", "")

        sid = self._sid()
        stats = sum(1 for kw in ["according to", "study found", "data shows", "research indicates", "statistics show", "survey of"] if kw in all_text.lower())
        result.add_signal(sid, "Statistical Authority", "AI_SEARCH", min(stats / 3, 1.0), 0.6, f"{stats} statistical references", "", "")

        sid = self._sid()
        direct_answers = sum(1 for p in pages if any(h["level"] in ("H2", "H3") and (h["text"].lower().startswith(("what", "how", "why", "when", "where", "can", "do", "does", "is"))) for h in p.headings))
        result.add_signal(sid, "Direct Answer Content", "AI_SEARCH", min(direct_answers / 3, 1.0), 0.7, f"{direct_answers} pages with question-form headings", "", "")

    def _analyze_content_intelligence(self, pages, result, all_text):
        thin_pages = [p for p in pages if 0 < p.word_count < 300 and p.status_code == 200]
        all_counted = [p for p in pages if p.word_count > 0 and p.status_code == 200]
        word_counts = [p.word_count for p in all_counted]
        thin = len(thin_pages)

        sid = self._sid()
        result.add_signal(sid, "Thin Content Pages", "CONTENT", 1.0 - (thin / max(len(all_counted), 1)), 0.8, f"{thin} pages under 300 words", "", "")
        if thin > 0:
            thin_urls = ", ".join(p.url for p in thin_pages[:5])
            more = f" and {thin - 5} more" if thin > 5 else ""
            result.add_issue(thin_pages[0].url if thin_pages else "", "CONTENT", "CRITICAL" if thin > len(all_counted) * 0.3 else "HIGH", sid, "Thin Content Pages", f"{thin}/{len(all_counted)} pages have fewer than 300 words: {thin_urls}{more}", "Thin pages rarely rank and dilute site quality", "Expand each to 800+ words or remove/consolidate")

        sid = self._sid()
        long_form = sum(1 for wc in word_counts if wc >= 1500)
        result.add_signal(sid, "Long-form Content", "CONTENT", min(long_form / max(len(word_counts) * 0.2, 1), 1.0), 0.6, f"{long_form} pages with 1500+ words", "", "")

        sid = self._sid()
        result.add_signal(sid, "Content Distribution", "CONTENT", 0.8 if word_counts else 0.0, 0.5, f"Range: {min(word_counts) if word_counts else 0}-{max(word_counts) if word_counts else 0} words", "", "")

        sid = self._sid()
        result.add_signal(sid, "Total Content Volume", "CONTENT", min(sum(word_counts) / 10000, 1.0), 0.6, f"{sum(word_counts):,} total words", "", "")

    def _analyze_content_structure(self, pages, result, all_text):
        all_headings = []
        for p in pages:
            all_headings.extend(p.headings)

        sid = self._sid()
        h2_count = sum(1 for h in all_headings if h["level"] == "H2")
        result.add_signal(sid, "H2 Subheading Count", "CONTENT", min(h2_count / 10, 1.0), 0.5, f"{h2_count} H2 subheadings across site", "", "")

        sid = self._sid()
        h3_count = sum(1 for h in all_headings if h["level"] == "H3")
        result.add_signal(sid, "H3 Subheading Count", "CONTENT", min(h3_count / 15, 1.0), 0.4, f"{h3_count} H3 subheadings across site", "", "")

        sid = self._sid()
        result.add_signal(sid, "Heading Hierarchy", "CONTENT", 0.8 if h2_count > h3_count else 0.5, 0.4, "Proper heading hierarchy" if h2_count > h3_count else "Heading hierarchy may be off", "", "")

    def _generate_keyword_data(self, pages, result, all_text, entities):
        top_entities = sorted(entities.items(), key=lambda x: x[1], reverse=True)[:30]
        for entity, count in top_entities:
            result.keyword_data.append({
                "keyword": entity,
                "frequency": count,
                "opportunity": "HIGH" if count >= 5 else "MEDIUM" if count >= 3 else "LOW",
                "action": f"Create dedicated content for '{entity}'" if count >= 3 else f"Increase mentions of '{entity}'",
            })

        page_titles = [(p.url, p.title) for p in pages if p.title and p.status_code == 200]
        for url, title in page_titles[:20]:
            words = [w for w in title.lower().split() if len(w) > 3]
            for word in words[:5]:
                if word not in [e.lower() for e in entities]:
                    result.content_opportunities.append({
                        "topic": word.title(),
                        "current_page": url,
                        "reason": f"'{word}' appears in title but needs dedicated content",
                        "priority": "MEDIUM",
                    })

    def _generate_roadmap(self, result):
        critical_issues = [i for i in result.issues if i["severity"] == "CRITICAL"]
        high_issues = [i for i in result.issues if i["severity"] == "HIGH"]
        medium_issues = [i for i in result.issues if i["severity"] == "MEDIUM"]
        low_issues = [i for i in result.issues if i["severity"] == "LOW"]

        result.roadmap = {
            "immediate": [{"action": i["signal_name"], "detail": i["description"], "fix": i.get("fix", ""), "priority": "CRITICAL"} for i in critical_issues[:5]],
            "week1": [{"action": i["signal_name"], "detail": i["description"], "fix": i.get("fix", ""), "priority": "HIGH"} for i in high_issues[:8]],
            "month1": [{"action": i["signal_name"], "detail": i["description"], "fix": i.get("fix", ""), "priority": "MEDIUM"} for i in medium_issues[:10]],
            "month3": [{"action": i["signal_name"], "detail": i["description"], "fix": i.get("fix", ""), "priority": "LOW"} for i in low_issues[:8]],
        }

    def _extract_entities(self, text):
        if not text:
            return {}
        caps = re.findall(r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b", text[:200000])
        skip = {"The", "This", "That", "What", "When", "Where", "How", "Why", "And", "But", "For", "Are", "Not", "You", "All", "Can", "Has", "His", "Her", "Its", "Our", "Who", "Get", "Use", "One", "Two", "See", "New", "Now", "Old", "Big", "Top", "Also", "Over", "More", "Most", "Some", "Any", "Each", "Make", "Like", "Long", "Very", "Much", "Such", "Take", "Come", "Could", "Would", "Should", "May", "Might", "Will", "Shall", "First", "Last", "Next", "Back", "Still", "Even", "Here", "There", "Just", "Only", "Than", "Then", "Well", "Too"}
        entities = {}
        for w in caps:
            if len(w) > 2 and w not in skip:
                entities[w] = entities.get(w, 0) + 1
        return dict(sorted(entities.items(), key=lambda x: x[1], reverse=True)[:50])
