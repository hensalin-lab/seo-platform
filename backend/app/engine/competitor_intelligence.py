"""
Competitor Intelligence Engine v1.0
Independently crawls and analyzes each competitor for: pages, authority, backlinks,
schema, content, AI visibility, internal links, CWV, titles, entities, EEAT, brand signals.
No fake data — every metric is independently measured.
"""
import logging
import re
import json
from collections import Counter, defaultdict
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class CompetitorCrawler:
    """Crawl and analyze a single competitor URL."""

    def analyze_competitor(self, pages: list, competitor_url: str) -> dict:
        """Analyze competitor from their crawled pages."""
        if not pages:
            return self._empty_profile(competitor_url)

        pages = [p for p in pages if isinstance(p, dict)]
        if not pages:
            return self._empty_profile(competitor_url)

        domain = urlparse(competitor_url).netloc.replace("www.", "")

        # Pages analysis
        total_pages = len(pages)
        page_types = Counter(p.get("page_type", "UNKNOWN") for p in pages)

        # Authority signals
        authority = self._analyze_authority(pages)

        # Backlink signals from page data
        backlink_signals = self._analyze_backlink_signals(pages)

        # Schema analysis
        schema = self._analyze_schema(pages)

        # Content analysis
        content = self._analyze_content(pages)

        # AI visibility signals
        ai_visibility = self._analyze_ai_visibility_signals(pages)

        # Internal linking
        internal_links = self._analyze_internal_links(pages, domain)

        # Core Web Vitals from page data
        cwv = self._estimate_cwv(pages)

        # Title analysis
        titles = self._analyze_titles(pages)

        # Entity signals
        entities = self._analyze_entities(pages)

        # EEAT signals
        eeat = self._analyze_eeat(pages)

        # Brand signals
        brand = self._analyze_brand_signals(pages)

        return {
            "competitor_url": competitor_url,
            "domain": domain,
            "total_pages": total_pages,
            "page_types": dict(page_types),
            "authority": authority,
            "backlink_signals": backlink_signals,
            "schema": schema,
            "content": content,
            "ai_visibility": ai_visibility,
            "internal_links": internal_links,
            "cwv": cwv,
            "titles": titles,
            "entities": entities,
            "eeat": eeat,
            "brand_signals": brand,
        }

    def _empty_profile(self, url: str) -> dict:
        return {
            "competitor_url": url,
            "domain": urlparse(url).netloc.replace("www.", ""),
            "total_pages": 0,
            "page_types": {},
            "authority": {"score": 0, "evidence": ["No pages crawled"]},
            "backlink_signals": {"score": 0},
            "schema": {"score": 0, "types_found": []},
            "content": {"score": 0, "avg_word_count": 0},
            "ai_visibility": {"score": 0},
            "internal_links": {"score": 0, "avg_links_per_page": 0},
            "cwv": {"score": 0},
            "titles": {"score": 0, "avg_length": 0},
            "entities": {"score": 0, "unique_entities": 0},
            "eeat": {"score": 0, "signals": []},
            "brand_signals": {"score": 0},
        }

    def _analyze_authority(self, pages: list) -> dict:
        signals = []
        score = 0

        # HTTPS
        https_pages = sum(1 for p in pages if p.get("url", "").startswith("https://"))
        if https_pages == len(pages):
            score += 20
            signals.append("Full HTTPS")

        # Content depth
        avg_wc = sum(p.get("word_count", 0) for p in pages) / max(len(pages), 1)
        if avg_wc > 1000:
            score += 25
            signals.append(f"Deep content (avg {int(avg_wc)} words/page)")
        elif avg_wc > 500:
            score += 15
            signals.append(f"Moderate content (avg {int(avg_wc)} words/page)")

        # Schema presence
        schema_pages = sum(1 for p in pages if p.get("schema_markup"))
        schema_pct = (schema_pages / max(len(pages), 1)) * 100
        if schema_pct > 50:
            score += 20
            signals.append(f"Schema on {int(schema_pct)}% of pages")

        # Heading structure quality
        good_headings = sum(1 for p in pages if len(p.get("headings", p.get("headers", []))) >= 3)
        heading_pct = (good_headings / max(len(pages), 1)) * 100
        if heading_pct > 60:
            score += 15
            signals.append(f"Good heading structure on {int(heading_pct)}% of pages")

        # Meta descriptions
        with_desc = sum(1 for p in pages if p.get("meta_description"))
        desc_pct = (with_desc / max(len(pages), 1)) * 100
        if desc_pct > 80:
            score += 10
            signals.append(f"Meta descriptions on {int(desc_pct)}% of pages")

        # OpenGraph
        with_og = sum(1 for p in pages if p.get("open_graph"))
        og_pct = (with_og / max(len(pages), 1)) * 100
        if og_pct > 50:
            score += 10
            signals.append(f"OpenGraph on {int(og_pct)}% of pages")

        return {"score": min(100, score), "signals": signals}

    def _analyze_backlink_signals(self, pages: list) -> dict:
        external_link_domains = set()
        total_external = 0
        for p in pages:
            links = p.get("links_external", [])
            if isinstance(links, list):
                total_external += len(links)
                for link in links:
                    if isinstance(link, str):
                        ext_domain = urlparse(link).netloc.replace("www.", "")
                        if ext_domain:
                            external_link_domains.add(ext_domain)

        score = min(100, len(external_link_domains) * 5 + total_external)
        return {
            "score": score,
            "external_domains_linked_to": len(external_link_domains),
            "total_external_links": total_external,
        }

    def _analyze_schema(self, pages: list) -> dict:
        all_types = Counter()
        pages_with_schema = 0
        for p in pages:
            schemas = p.get("schema_markup", [])
            if isinstance(schemas, str):
                try:
                    schemas = json.loads(schemas)
                except Exception:
                    schemas = []
            if schemas:
                pages_with_schema += 1
                for s in schemas:
                    if isinstance(s, dict):
                        t = s.get("@type", "Unknown")
                        if isinstance(t, list):
                            for tt in t:
                                all_types[tt] += 1
                        else:
                            all_types[t] += 1

        pct = (pages_with_schema / max(len(pages), 1)) * 100
        score = min(100, int(pct * 1.2 + len(all_types) * 5))

        return {
            "score": score,
            "pages_with_schema": pages_with_schema,
            "schema_coverage_pct": round(pct, 1),
            "types_found": dict(all_types.most_common(15)),
        }

    def _analyze_content(self, pages: list) -> dict:
        word_counts = [p.get("word_count", 0) for p in pages]
        avg_wc = sum(word_counts) / max(len(word_counts), 1)
        median_wc = sorted(word_counts)[len(word_counts) // 2] if word_counts else 0

        thin_pages = sum(1 for wc in word_counts if wc < 300)
        deep_pages = sum(1 for wc in word_counts if wc > 1500)

        # Content freshness signals
        with_dates = sum(1 for p in pages if p.get("content_text", ""))
        content_quality = min(100, int(
            (avg_wc / 15) +  # word count score
            (deep_pages / max(len(pages), 1) * 40) -  # depth bonus
            (thin_pages / max(len(pages), 1) * 30)  # thin penalty
        ))

        return {
            "score": max(0, content_quality),
            "avg_word_count": round(avg_wc),
            "median_word_count": median_wc,
            "total_word_count": sum(word_counts),
            "thin_pages": thin_pages,
            "deep_pages": deep_pages,
            "content_richness": "HIGH" if avg_wc > 1000 else "MEDIUM" if avg_wc > 500 else "LOW",
        }

    def _analyze_ai_visibility_signals(self, pages: list) -> dict:
        """Score based on content signals that AI platforms look for."""
        score = 0
        signals = []

        # FAQ content
        faq_pages = sum(1 for p in pages if any(
            kw in (p.get("content_text", "").lower() + p.get("title", "").lower())
            for kw in ["faq", "frequently asked", "questions"]
        ))
        if faq_pages > 0:
            score += 20
            signals.append(f"FAQ content on {faq_pages} pages")

        # Statistics and data
        stat_pages = sum(1 for p in pages if re.search(r'\d+[%$KMB]|\d{4}', p.get("content_text", "")))
        if stat_pages > 0:
            score += 15
            signals.append(f"Statistical content on {stat_pages} pages")

        # Author attribution
        author_pages = sum(1 for p in pages if any(
            kw in p.get("content_text", "").lower()[:500]
            for kw in ["written by", "author:", "about the author", "byline"]
        ))
        if author_pages > 0:
            score += 15
            signals.append(f"Author attribution on {author_pages} pages")

        # Structured data
        schema_pages = sum(1 for p in pages if p.get("schema_markup"))
        if schema_pages > 0:
            score += 20
            signals.append(f"Structured data on {schema_pages} pages")

        # Content length (AI likes comprehensive)
        long_pages = sum(1 for p in pages if p.get("word_count", 0) > 800)
        long_pct = (long_pages / max(len(pages), 1)) * 100
        if long_pct > 30:
            score += 15
            signals.append(f"Comprehensive content on {int(long_pct)}% of pages")

        # Definition-style content
        def_pages = sum(1 for p in pages if any(
            kw in p.get("content_text", "").lower()[:1000]
            for kw in ["is a ", "refers to", "defined as", "means that"]
        ))
        if def_pages > 0:
            score += 15
            signals.append(f"Definition content on {def_pages} pages")

        return {"score": min(100, score), "signals": signals}

    def _analyze_internal_links(self, pages: list, domain: str) -> dict:
        link_counts = []
        for p in pages:
            links = p.get("links_internal", [])
            if isinstance(links, list):
                link_counts.append(len(links))
            else:
                link_counts.append(0)

        avg_links = sum(link_counts) / max(len(link_counts), 1)
        orphan_pages = sum(1 for lc in link_counts if lc == 0)

        score = min(100, int(avg_links * 10 + (1 - orphan_pages / max(len(pages), 1)) * 30))

        return {
            "score": score,
            "avg_links_per_page": round(avg_links, 1),
            "orphan_pages": orphan_pages,
            "total_internal_links": sum(link_counts),
        }

    def _estimate_cwv(self, pages: list) -> dict:
        load_times = [p.get("response_time_ms", 0) or p.get("load_time", 0) for p in pages]
        load_times = [lt for lt in load_times if lt > 0]

        if not load_times:
            return {"score": 0, "avg_load_time_ms": 0, "data_available": False}

        avg_lt = sum(load_times) / len(load_times)
        fast_pages = sum(1 for lt in load_times if lt < 2000)
        slow_pages = sum(1 for lt in load_times if lt > 3000)

        score = max(0, min(100, int(100 - (avg_lt / 50) - (slow_pages / max(len(load_times), 1) * 30))))

        return {
            "score": score,
            "avg_load_time_ms": round(avg_lt),
            "median_load_time_ms": sorted(load_times)[len(load_times) // 2],
            "fast_pages": fast_pages,
            "slow_pages": slow_pages,
            "data_available": True,
        }

    def _analyze_titles(self, pages: list) -> dict:
        titles = [p.get("title", "") for p in pages if p.get("title")]
        lengths = [len(t) for t in titles]
        avg_len = sum(lengths) / max(len(lengths), 1)

        too_long = sum(1 for l in lengths if l > 60)
        too_short = sum(1 for l in lengths if l < 20)
        duplicates = len(titles) - len(set(titles))

        score = 100
        if too_long > len(pages) * 0.3:
            score -= 25
        if too_short > len(pages) * 0.3:
            score -= 15
        score -= min(30, duplicates * 5)

        return {
            "score": max(0, min(100, score)),
            "avg_length": round(avg_len),
            "too_long": too_long,
            "too_short": too_short,
            "duplicates": duplicates,
            "total_titles": len(titles),
        }

    def _analyze_entities(self, pages: list) -> dict:
        entity_counter = Counter()
        for p in pages:
            h1 = p.get("h1", "")
            title = p.get("title", "")
            if h1:
                for word in h1.split():
                    if len(word) > 3 and word[0].isupper():
                        entity_counter[word] += 1

        unique = len(entity_counter)
        score = min(100, unique * 3 + sum(entity_counter.values()))

        return {
            "score": score,
            "unique_entities": unique,
            "top_entities": dict(entity_counter.most_common(20)),
        }

    def _analyze_eeat(self, pages: list) -> dict:
        signals = []
        score = 0

        # Author info
        author_pages = sum(1 for p in pages if any(
            kw in p.get("content_text", "").lower()[:500]
            for kw in ["by ", "written by", "author", "editor", "reviewed by"]
        ))
        if author_pages > 0:
            score += 25
            signals.append(f"Author attribution: {author_pages} pages")

        # About page
        about_pages = sum(1 for p in pages if any(
            kw in p.get("url", "").lower() + p.get("title", "").lower()
            for kw in ["about", "team", "company", "our story"]
        ))
        if about_pages > 0:
            score += 20
            signals.append("About/team pages present")

        # Contact info
        contact = sum(1 for p in pages if any(
            kw in p.get("content_text", "").lower()[:1000]
            for kw in ["contact", "email", "phone", "address", "location"]
        ))
        if contact > 0:
            score += 15
            signals.append("Contact information present")

        # Privacy/Terms
        legal = sum(1 for p in pages if any(
            kw in p.get("url", "").lower() + p.get("title", "").lower()
            for kw in ["privacy", "terms", "policy", "legal"]
        ))
        if legal > 0:
            score += 10
            signals.append("Privacy/terms pages present")

        # Citations and references
        citations = sum(1 for p in pages if re.search(
            r'\[.*?\]|\(.*?et al|source:|reference:|according to',
            p.get("content_text", "")[:2000]
        ))
        if citations > 0:
            score += 15
            signals.append(f"Citations/references on {citations} pages")

        # First-party data
        original = sum(1 for p in pages if any(
            kw in p.get("content_text", "").lower()[:2000]
            for kw in ["our data", "we found", "our research", "our study", "survey of"]
        ))
        if original > 0:
            score += 15
            signals.append(f"First-party research on {original} pages")

        return {"score": min(100, score), "signals": signals}

    def _analyze_brand_signals(self, pages: list) -> dict:
        signals = []
        score = 0

        # OpenGraph brand
        og_site = sum(1 for p in pages if p.get("open_graph", {}).get("og:site_name"))
        if og_site > 0:
            score += 20
            signals.append("OpenGraph site name configured")

        # Twitter handles
        twitter = sum(1 for p in pages if p.get("twitter_card", {}).get("twitter:site"))
        if twitter > 0:
            score += 15
            signals.append("Twitter Card configured")

        # Social links
        social_domains = {"facebook.com", "twitter.com", "x.com", "linkedin.com", "instagram.com", "youtube.com"}
        social_links = 0
        for p in pages:
            links = p.get("links_external", [])
            if isinstance(links, list):
                for link in links:
                    if isinstance(link, str):
                        if any(sd in link for sd in social_domains):
                            social_links += 1
        if social_links > 0:
            score += 25
            signals.append(f"{social_links} social media links found")

        # Logo/branding in schema
        logo = sum(1 for p in pages if any(
            "logo" in str(s).lower() for s in (p.get("schema_markup", []) or [])
        ))
        if logo > 0:
            score += 20
            signals.append("Logo in structured data")

        # Consistent naming
        all_titles = [p.get("title", "") for p in pages if p.get("title")]
        brand_words = Counter()
        for title in all_titles:
            for word in title.split():
                if len(word) > 3:
                    brand_words[word.lower()] += 1
        common = [w for w, c in brand_words.most_common(5) if c > 2]
        if common:
            score += 20
            signals.append(f"Consistent brand terms: {', '.join(common[:3])}")

        return {"score": min(100, score), "signals": signals}


class CompetitorIntelligenceEngine:
    """Analyze multiple competitors independently and produce gap analysis."""

    def __init__(self):
        self.crawler = CompetitorCrawler()

    def analyze(self, my_pages: list, competitor_data: dict = None, competitor_url: str = "") -> dict:
        """Full competitor intelligence analysis.

        Args:
            my_pages: Our crawled pages
            competitor_data: {url: [pages]} for each competitor
            competitor_url: single competitor URL (legacy support)
        """
        competitors = {}

        # Handle both formats
        if competitor_data:
            for comp_url, comp_pages in competitor_data.items():
                competitors[comp_url] = self.crawler.analyze_competitor(comp_pages, comp_url)
        elif competitor_url:
            # Single competitor — we only have the summary, not their pages
            competitors[competitor_url] = self.crawler._empty_profile(competitor_url)
            competitors[competitor_url]["note"] = "Full crawl data needed for detailed analysis"

        # Analyze our site
        my_profile = self.crawler.analyze_competitor(my_pages, "")

        # Gap analysis per competitor
        gaps = {}
        for comp_url, comp in competitors.items():
            gap = self._compute_gap(my_profile, comp)
            gaps[comp_url] = gap

        # Overall competitive position
        avg_comp_scores = {}
        dimensions = ["authority", "content", "schema", "internal_links", "cwv", "titles", "eeat", "brand_signals", "ai_visibility"]
        for dim in dimensions:
            my_score = my_profile.get(dim, {}).get("score", 0)
            comp_scores = [c.get(dim, {}).get("score", 0) for c in competitors.values()]
            avg_comp = sum(comp_scores) / max(len(comp_scores), 1)
            avg_comp_scores[dim] = {
                "mine": my_score,
                "avg_competitor": round(avg_comp, 1),
                "delta": round(my_score - avg_comp, 1),
                "advantage": "US" if my_score > avg_comp else "COMPETITOR" if avg_comp > my_score else "TIE",
            }

        return {
            "my_profile": my_profile,
            "competitors": competitors,
            "gaps": gaps,
            "competitive_position": avg_comp_scores,
            "dimensions_analyzed": dimensions,
        }

    def _compute_gap(self, my: dict, competitor: dict) -> dict:
        """Compute gap between our profile and a competitor."""
        gaps = {}
        wins = []
        losses = []

        dimensions = {
            "authority": "Authority",
            "content": "Content Quality",
            "schema": "Schema Markup",
            "internal_links": "Internal Linking",
            "cwv": "Core Web Vitals",
            "titles": "Title Optimization",
            "eeat": "E-E-A-T Signals",
            "brand_signals": "Brand Signals",
            "ai_visibility": "AI Readiness",
        }

        for key, label in dimensions.items():
            my_score = my.get(key, {}).get("score", 0)
            comp_score = competitor.get(key, {}).get("score", 0)
            delta = my_score - comp_score

            gaps[key] = {
                "label": label,
                "mine": my_score,
                "competitor": comp_score,
                "delta": delta,
                "status": "WIN" if delta > 5 else "LOSS" if delta < -5 else "TIE",
            }

            if delta > 5:
                wins.append(label)
            elif delta < -5:
                losses.append(label)

        return {
            "dimension_gaps": gaps,
            "our_advantages": wins,
            "their_advantages": losses,
            "overall_competitive_score": round(
                sum(g["delta"] for g in gaps.values()) / max(len(gaps), 1), 1
            ),
        }
