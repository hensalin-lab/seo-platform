import logging
import re
from collections import Counter
from app.engine.crawler import PageData

logger = logging.getLogger(__name__)


class CompetitorEngine:
    def analyze(self, my_pages, competitor_pages):
        if not competitor_pages:
            return self._empty_result()

        my_200 = [p for p in my_pages if p.status_code == 200]
        comp_200 = [p for p in competitor_pages if p.status_code == 200]

        my_urls = set(p.url for p in my_200)
        comp_urls = set(p.url for p in comp_200)

        my_words = sum(p.word_count for p in my_200) / max(len(my_200), 1)
        comp_words = sum(p.word_count for p in comp_200) / max(len(comp_200), 1)

        my_schema = sum(1 for p in my_200 if p.schema_markup) / max(len(my_200), 1)
        comp_schema = sum(1 for p in comp_200 if p.schema_markup) / max(len(comp_200), 1)

        my_og = sum(1 for p in my_200 if p.open_graph) / max(len(my_200), 1)
        comp_og = sum(1 for p in comp_200 if p.open_graph) / max(len(comp_200), 1)

        my_internal = set()
        comp_internal = set()
        for p in my_200:
            for link in p.links_internal:
                my_internal.add(link["url"].rstrip("/"))
        for p in comp_200:
            for link in p.links_internal:
                comp_internal.add(link["url"].rstrip("/"))

        keyword_opportunities = self._find_keyword_gaps(my_200, comp_200, my_words, comp_words)
        content_opportunities = self._find_content_gaps(my_urls, comp_urls, my_200, comp_200)
        entity_gaps = self._find_entity_gaps(my_200, comp_200)
        topic_gaps = self._find_topic_gaps(my_urls, comp_urls)
        backlink_gap = self._analyze_backlink_gap(my_200, comp_200)
        serp_gap = self._analyze_serp_gap(my_200, comp_200)

        strengths, weaknesses = [], []

        if len(my_200) > len(comp_200):
            strengths.append({"point": "More indexed pages", "detail": f"Your site has {len(my_200)} pages vs competitor's {len(comp_200)}"})
        else:
            weaknesses.append({"point": "Fewer indexed pages", "detail": f"Competitor has {len(comp_200)} pages vs your {len(my_200)}"})

        if my_words > comp_words:
            strengths.append({"point": "Deeper content", "detail": f"Average {int(my_words)} words vs competitor's {int(comp_words)}"})
        else:
            weaknesses.append({"point": "Thinner content", "detail": f"Competitor averages {int(comp_words)} words vs your {int(my_words)}"})

        if my_schema > comp_schema:
            strengths.append({"point": "Better structured data", "detail": f"{int(my_schema*100)}% schema coverage vs {int(comp_schema*100)}%"})
        else:
            weaknesses.append({"point": "Less structured data", "detail": f"Competitor has {int(comp_schema*100)}% schema vs your {int(my_schema*100)}%"})

        if my_og > comp_og:
            strengths.append({"point": "Better social markup", "detail": f"{int(my_og*100)}% OG coverage vs {int(comp_og*100)}%"})
        else:
            weaknesses.append({"point": "Weaker social markup", "detail": f"Competitor has {int(comp_og*100)}% OG vs your {int(my_og*100)}%"})

        if len(my_internal) > len(comp_internal):
            strengths.append({"point": "Stronger internal linking", "detail": f"{len(my_internal)} internal links vs {len(comp_internal)}"})
        else:
            weaknesses.append({"point": "Weaker internal linking", "detail": f"Competitor has {len(comp_internal)} internal links vs your {len(my_internal)}"})

        my_h1_coverage = sum(1 for p in my_200 if p.h1) / max(len(my_200), 1)
        comp_h1_coverage = sum(1 for p in comp_200 if p.h1) / max(len(comp_200), 1)
        if my_h1_coverage > comp_h1_coverage:
            strengths.append({"point": "Better H1 tag coverage", "detail": f"{int(my_h1_coverage*100)}% vs {int(comp_h1_coverage*100)}%"})
        else:
            weaknesses.append({"point": "Lower H1 tag coverage", "detail": f"Competitor has {int(comp_h1_coverage*100)}% H1 coverage vs your {int(my_h1_coverage*100)}%"})

        my_blog = sum(1 for p in my_200 if "/blog" in p.url.lower())
        comp_blog = sum(1 for p in comp_200 if "/blog" in p.url.lower())
        if comp_blog > my_blog:
            weaknesses.append({"point": "Fewer blog/content pages", "detail": f"Competitor has {comp_blog} blog pages vs your {my_blog}"})

        my_faq = sum(1 for p in my_200 if any(isinstance(s, dict) and s.get("@type") == "FAQPage" for s in p.schema_markup))
        comp_faq = sum(1 for p in comp_200 if any(isinstance(s, dict) and s.get("@type") == "FAQPage" for s in p.schema_markup))
        if comp_faq > my_faq:
            weaknesses.append({"point": "Less FAQ schema", "detail": f"Competitor has {comp_faq} FAQ pages vs your {my_faq}"})

        winning_strategies = self._generate_strategies(my_200, comp_200, strengths, weaknesses, keyword_opportunities, content_opportunities)

        return {
            "competitor_url": comp_200[0].url if comp_200 else "",
            "keyword_opportunities": keyword_opportunities,
            "content_opportunities": content_opportunities,
            "entity_gaps": entity_gaps,
            "topic_gaps": topic_gaps,
            "seo_comparison": {
                "your_pages": len(my_200),
                "competitor_pages": len(comp_200),
                "your_avg_words": int(my_words),
                "competitor_avg_words": int(comp_words),
                "your_schema_coverage": round(my_schema * 100, 1),
                "competitor_schema_coverage": round(comp_schema * 100, 1),
                "your_og_coverage": round(my_og * 100, 1),
                "competitor_og_coverage": round(comp_og * 100, 1),
                "your_internal_links": len(my_internal),
                "competitor_internal_links": len(comp_internal),
                "your_h1_coverage": round(my_h1_coverage * 100, 1),
                "competitor_h1_coverage": round(comp_h1_coverage * 100, 1),
                "your_blog_pages": my_blog,
                "competitor_blog_pages": comp_blog,
                "your_faq_pages": my_faq,
                "competitor_faq_pages": comp_faq,
            },
            "strengths": strengths,
            "weaknesses": weaknesses,
            "winning_strategy": winning_strategies,
            "backlink_gap": backlink_gap,
            "serp_gap": serp_gap,
        }

    def _find_keyword_gaps(self, my_pages, comp_pages, my_avg_words, comp_avg_words):
        opportunities = []

        for p in comp_pages:
            if p.word_count > comp_avg_words * 1.3:
                opportunities.append({
                    "topic": p.title or p.url.split("/")[-1].replace("-", " ").title(),
                    "url": p.url,
                    "reason": f"Competitor has {p.word_count} words on this topic (avg: {int(comp_avg_words)})",
                    "opportunity": "HIGH",
                    "action": f"Create comprehensive content targeting this topic with {int(comp_avg_words * 1.2)}+ words",
                })

        my_paths = set()
        comp_paths = set()
        for p in my_pages:
            parts = [s for s in p.url.split("/") if s and s != "https:" and s != "http:"]
            if len(parts) > 2:
                my_paths.add(parts[-1].lower())
        for p in comp_pages:
            parts = [s for s in p.url.split("/") if s and s != "https:" and s != "http:"]
            if len(parts) > 2:
                comp_paths.add(parts[-1].lower())

        for path in list(comp_paths - my_paths)[:15]:
            opportunities.append({
                "topic": path.replace("-", " ").replace("_", " ").title(),
                "url": "",
                "reason": f"Competitor has '/{path}' page, you don't",
                "opportunity": "MEDIUM",
                "action": f"Create content for /{path} topic",
            })

        my_all_text = " ".join(p.content_text.lower() for p in my_pages if p.content_text)
        comp_all_text = " ".join(p.content_text.lower() for p in comp_pages if p.content_text)

        my_words = set(re.findall(r'\b[a-z]{4,}\b', my_all_text[:200000]))
        comp_words = set(re.findall(r'\b[a-z]{4,}\b', comp_all_text[:200000]))

        stop = {"this", "that", "with", "from", "have", "been", "were", "will", "would", "could", "should", "about", "their", "there", "what", "when", "where", "which", "these", "those", "more", "than", "also", "into", "only", "very", "some", "your", "just", "like", "over", "such", "make", "both", "each", "much", "most", "other", "being", "does", "does", "well", "back", "even", "here", "after", "first", "still", "used"}
        my_words -= stop
        comp_words -= stop

        unique_to_comp = comp_words - my_words
        high_value = [w for w in unique_to_comp if len(w) > 5][:20]
        for word in high_value:
            opportunities.append({
                "topic": word.title(),
                "url": "",
                "reason": f"Competitor uses '{word}' in content but you don't",
                "opportunity": "MEDIUM",
                "action": f"Create content or add sections covering '{word}'",
            })

        return sorted(opportunities, key=lambda x: {"HIGH": 0, "MEDIUM": 1, "LOW": 2}.get(x.get("opportunity", "LOW"), 2))[:25]

    def _find_content_gaps(self, my_urls, comp_urls, my_pages, comp_pages):
        opportunities = []

        my_path_segments = set()
        comp_path_segments = set()
        for url in my_urls:
            parts = [s for s in url.split("/") if s and s not in ("https:", "http:", "")]
            for part in parts[2:]:
                my_path_segments.add(part.lower())
        for url in comp_urls:
            parts = [s for s in url.split("/") if s and s not in ("https:", "http:", "")]
            for part in parts[2:]:
                comp_path_segments.add(part.lower())

        missing_segments = comp_path_segments - my_path_segments
        for seg in list(missing_segments)[:15]:
            opportunities.append({
                "topic": seg.replace("-", " ").replace("_", " ").title(),
                "reason": f"Competitor has '/{seg}' content you're missing",
                "priority": "MEDIUM",
                "action": f"Create content about {seg.replace('-', ' ')}",
            })

        my_types = set()
        comp_types = set()
        for p in my_pages:
            for s in p.schema_markup:
                if isinstance(s, dict) and "@type" in s:
                    my_types.add(s["@type"])
        for p in comp_pages:
            for s in p.schema_markup:
                if isinstance(s, dict) and "@type" in s:
                    comp_types.add(s["@type"])

        for stype in comp_types - my_types:
            opportunities.append({
                "topic": f"Add {stype} Schema",
                "reason": f"Competitor uses {stype} schema but you don't",
                "priority": "HIGH",
                "action": f"Implement {stype} structured data",
            })

        return opportunities[:20]

    def _find_entity_gaps(self, my_pages, comp_pages):
        my_entities = set()
        comp_entities = set()
        for p in my_pages:
            for s in p.schema_markup:
                if isinstance(s, dict):
                    if "@type" in s:
                        my_entities.add(s["@type"])
                    if "author" in s and isinstance(s["author"], dict):
                        my_entities.add(s["author"].get("@type", ""))
        for p in comp_pages:
            for s in p.schema_markup:
                if isinstance(s, dict):
                    if "@type" in s:
                        comp_entities.add(s["@type"])
                    if "author" in s and isinstance(s["author"], dict):
                        comp_entities.add(s["author"].get("@type", ""))

        return [{"entity": e, "action": f"Add {e} schema markup"} for e in (comp_entities - my_entities) if e]

    def _find_topic_gaps(self, my_urls, comp_urls):
        my_segs = set()
        comp_segs = set()
        for url in my_urls:
            parts = [s for s in url.split("/") if s and s not in ("https:", "http:", "")]
            if len(parts) > 3:
                my_segs.add(parts[-1].lower())
        for url in comp_urls:
            parts = [s for s in url.split("/") if s and s not in ("https:", "http:", "")]
            if len(parts) > 3:
                comp_segs.add(parts[-1].lower())

        return [{"topic": s.replace("-", " ").title(), "action": f"Create content for '{s.replace('-', ' ')}'"} for s in list(comp_segs - my_segs)[:20]]

    def _analyze_backlink_gap(self, my_pages, comp_pages):
        my_ext_urls = set()
        comp_ext_urls = set()
        for p in my_pages:
            for link in p.links_external:
                my_ext_urls.add(link.get("url", ""))
        for p in comp_pages:
            for link in p.links_external:
                comp_ext_urls.add(link.get("url", ""))

        comp_unique = comp_ext_urls - my_ext_urls
        return [{"domain": url, "action": f"Consider acquiring backlink from this domain"} for url in list(comp_unique)[:15]]

    def _analyze_serp_gap(self, my_pages, comp_pages):
        gaps = []
        my_titles = {p.title.lower(): p.url for p in my_pages if p.title}
        comp_titles = {p.title.lower(): p.url for p in comp_pages if p.title}

        for title, url in comp_titles.items():
            if title not in my_titles:
                gaps.append({
                    "topic": title.title(),
                    "competitor_url": url,
                    "action": f"Create content targeting: {title.title()}",
                })

        return gaps[:15]

    def _generate_strategies(self, my_pages, comp_pages, strengths, weaknesses, keyword_ops, content_ops):
        strategies = []
        my_words = sum(p.word_count for p in my_pages) / max(len(my_pages), 1)
        comp_words = sum(p.word_count for p in comp_pages) / max(len(comp_pages), 1)

        if my_words < comp_words:
            strategies.append({"strategy": "Increase Content Depth", "detail": f"Expand content to match competitor's {int(comp_words)} avg words", "priority": "HIGH"})
        
        high_kw_ops = [k for k in keyword_ops if k.get("opportunity") == "HIGH"]
        if high_kw_ops:
            strategies.append({"strategy": "Target High-Value Keyword Gaps", "detail": f"Create content for {len(high_kw_ops)} high-opportunity topics", "priority": "HIGH"})

        my_blog = sum(1 for p in my_pages if "/blog" in p.url.lower())
        comp_blog = sum(1 for p in comp_pages if "/blog" in p.url.lower())
        if comp_blog > my_blog * 1.5:
            strategies.append({"strategy": "Scale Content Production", "detail": f"Competitor has {comp_blog} blog pages vs your {my_blog}", "priority": "HIGH"})

        my_faq = sum(1 for p in my_pages if any(isinstance(s, dict) and s.get("@type") == "FAQPage" for s in p.schema_markup))
        comp_faq = sum(1 for p in comp_pages if any(isinstance(s, dict) and s.get("@type") == "FAQPage" for s in p.schema_markup))
        if comp_faq > my_faq:
            strategies.append({"strategy": "Add FAQ Content and Schema", "detail": f"Competitor has {comp_faq} FAQ pages vs your {my_faq}", "priority": "MEDIUM"})

        my_schema = sum(1 for p in my_pages if p.schema_markup)
        comp_schema = sum(1 for p in comp_pages if p.schema_markup)
        if comp_schema > my_schema:
            strategies.append({"strategy": "Expand Structured Data", "detail": "Add more schema types to match competitor's markup", "priority": "MEDIUM"})

        strategies.append({"strategy": "Create Comparison Content", "detail": "Build comparison and alternatives pages to capture decision-stage traffic", "priority": "MEDIUM"})
        strategies.append({"strategy": "Build Topical Authority", "detail": "Create content clusters around core topics with hub-and-spoke structure", "priority": "MEDIUM"})

        return strategies[:10]

    def _empty_result(self):
        return {
            "competitor_url": "", "keyword_opportunities": [], "content_opportunities": [],
            "entity_gaps": [], "topic_gaps": [], "seo_comparison": {}, "strengths": [],
            "weaknesses": [], "winning_strategy": [], "backlink_gap": [], "serp_gap": [],
        }
