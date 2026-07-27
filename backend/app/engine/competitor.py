import logging
import re
from collections import Counter
from app.engine.crawler import PageData

logger = logging.getLogger(__name__)

NAV_WORDS = frozenset(
    "login sign account support help documentation docs api status contact "
    "privacy policy terms conditions cookie about us our team careers jobs "
    "home page site map blog resources guides faq pricing plan enterprise "
    "get demo free trial signup register subscribe download try buy now "
    "search menu close open expand collapse nav sidebar footer header "
    "copyright reserved rights reserved all rights "
    "facebook twitter linkedin instagram youtube github "
    "back next previous skip content main navigation "
    "min max start free trial demo activate revenue "
    "beta read more learn more see more view all show "
    " calculator fit comics podcast contact ".split()
)

STOP_WORDS = frozenset(
    "a an the and or but if in on at to for of is it its be are was were am been being "
    "do does did has have had with from by as this that these those so too very just not "
    "no nor can could would should may might will shall must need dare ought used also "
    "into over under between through during before after above below up down out off "
    "again further then once here there when where why how all any both each few more "
    "most other some such only own same than what which who whom your you we our us "
    "they them their he she him her me my i the their there than them then when what "
    "which where who whom how its being been were are am will would could should can "
    "may might shall must do does did has have had".split()
)


def _clean_text(text: str) -> str:
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<nav[^>]*>.*?</nav>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<footer[^>]*>.*?</footer>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<header[^>]*>.*?</header>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_meaningful_keywords(text: str, min_len: int = 4) -> list[tuple[str, int]]:
    clean = _clean_text(text).lower()
    words = re.findall(r"\b[a-z]{" + str(min_len) + r",}\b", clean)
    words = [w for w in words if w not in STOP_WORDS and w not in NAV_WORDS and len(w) >= min_len]
    return Counter(words).most_common(80)


def _extract_bigrams(text: str) -> list[tuple[str, int]]:
    clean = _clean_text(text).lower()
    words = re.findall(r"\b[a-z]{3,}\b", clean)
    words = [w for w in words if w not in STOP_WORDS and w not in NAV_WORDS]
    bigrams = [f"{words[i]} {words[i + 1]}" for i in range(len(words) - 1)]
    return Counter(bigrams).most_common(40)


def _extract_title_bigrams(title: str) -> list[str]:
    clean = _clean_text(title).lower()
    words = [w for w in clean.split() if w not in STOP_WORDS and len(w) >= 3]
    return [f"{words[i]} {words[i + 1]}" for i in range(len(words) - 1)]


def _domain_from_url(url: str) -> str:
    try:
        domain = url.split("//")[-1].split("/")[0].split(":")[0]
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return ""


def _is_real_content_page(page) -> bool:
    url = (page.url or "").lower()
    skip = ("/login", "/signup", "/sign-up", "/register", "/admin", "/api/", "/feed", "/sitemap",
            ".xml", ".json", ".rss", ".css", ".js", "#", "mailto:", "tel:")
    return not any(s in url for s in skip)


class CompetitorEngine:
    def analyze(self, my_pages, competitor_pages):
        if not competitor_pages:
            return self._empty_result()

        my_200 = [p for p in my_pages if p.status_code == 200 and _is_real_content_page(p)]
        comp_200 = [p for p in competitor_pages if p.status_code == 200 and _is_real_content_page(p)]

        if not my_200 or not comp_200:
            return self._empty_result()

        my_urls = set(p.url for p in my_200)
        comp_urls = set(p.url for p in comp_200)

        my_words = sum(p.word_count or 0 for p in my_200) / max(len(my_200), 1)
        comp_words = sum(p.word_count or 0 for p in comp_200) / max(len(comp_200), 1)

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
            for link in comp_internal if False else []:
                pass
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

        my_all_text = " ".join(
            (p.content_text or "") + " " + (p.title or "") + " " + (p.h1 or "")
            for p in my_pages
        )
        comp_all_text = " ".join(
            (p.content_text or "") + " " + (p.title or "") + " " + (p.h1 or "")
            for p in comp_pages
        )

        my_kws = dict(_extract_meaningful_keywords(my_all_text))
        comp_kws = dict(_extract_meaningful_keywords(comp_all_text))

        my_bigrams = dict(_extract_bigrams(my_all_text))
        comp_bigrams = dict(_extract_bigrams(comp_all_text))

        my_all_terms = set(my_kws.keys()) | set(my_bigrams.keys())
        comp_all_terms = set(comp_kws.keys()) | set(comp_bigrams.keys())

        missing = comp_all_terms - my_all_terms

        scored = []
        for term in missing:
            freq = comp_kws.get(term, 0) + comp_bigrams.get(term, 0)
            if freq < 2:
                continue
            is_bigram = " " in term
            word_count = len(term.split())
            if word_count >= 3:
                intent = "INFORMATIONAL"
            elif any(w in term for w in ("best", "top", "review", "vs", "alternative", "comparison")):
                intent = "COMMERCIAL"
            elif any(w in term for w in ("buy", "price", "cost", "free", "trial", "demo")):
                intent = "TRANSACTIONAL"
            else:
                intent = "INFORMATIONAL"

            difficulty = "LOW" if freq <= 3 else "MEDIUM" if freq <= 8 else "HIGH"
            importance = "HIGH" if freq >= 8 else "MEDIUM" if freq >= 4 else "LOW"

            scored.append({
                "keyword": term.title(),
                "competitor_frequency": freq,
                "is_phrase": is_bigram,
                "intent": intent,
                "difficulty": difficulty,
                "importance": importance,
            })

        scored.sort(key=lambda x: x["competitor_frequency"], reverse=True)

        for item in scored[:20]:
            opportunities.append({
                "topic": item["keyword"],
                "url": "",
                "reason": f"Competitor mentions '{item['keyword']}' {item['competitor_frequency']} times across their pages but you don't use this term",
                "opportunity": item["importance"],
                "action": f"Create content or optimize existing pages to include '{item['keyword']}' — target {max(500, item['competitor_frequency'] * 120)}+ words with natural usage",
                "intent": item["intent"],
                "difficulty": item["difficulty"],
            })

        comp_only_paths = set()
        for p in comp_pages:
            parts = p.url.rstrip("/").split("/")
            if len(parts) > 3:
                slug = parts[-1].lower()
                if len(slug) > 3 and slug not in ("index", "home", "default"):
                    comp_only_paths.add(slug)

        my_paths = set()
        for p in my_pages:
            parts = p.url.rstrip("/").split("/")
            if len(parts) > 3:
                my_paths.add(parts[-1].lower())

        for path in list(comp_only_paths - my_paths)[:10]:
            topic = path.replace("-", " ").replace("_", " ").title()
            opportunities.append({
                "topic": topic,
                "url": "",
                "reason": f"Competitor has a dedicated page at /{path} but you don't have equivalent content",
                "opportunity": "MEDIUM",
                "action": f"Create a dedicated page for '{topic}' targeting this content gap — aim for {int(comp_avg_words * 1.2)}+ words",
                "intent": "INFORMATIONAL",
                "difficulty": "MEDIUM",
            })

        return sorted(opportunities, key=lambda x: {"HIGH": 0, "MEDIUM": 1, "LOW": 2}.get(x.get("opportunity", "LOW"), 2))[:25]

    def _find_content_gaps(self, my_urls, comp_urls, my_pages, comp_pages):
        opportunities = []

        my_path_segments = set()
        comp_path_segments = set()
        for url in my_urls:
            parts = [s for s in url.split("/") if s and s not in ("https:", "http:", "")]
            for part in parts[2:]:
                if len(part) > 3:
                    my_path_segments.add(part.lower())
        for url in comp_urls:
            parts = [s for s in url.split("/") if s and s not in ("https:", "http:", "")]
            for part in parts[2:]:
                if len(part) > 3:
                    comp_path_segments.add(part.lower())

        missing_segments = comp_path_segments - my_path_segments
        for seg in list(missing_segments)[:10]:
            if seg in ("index", "home", "default", "admin", "login", "signup", "api"):
                continue
            topic = seg.replace("-", " ").replace("_", " ").title()
            opportunities.append({
                "topic": topic,
                "reason": f"Competitor has a dedicated /{seg} page with content you're missing",
                "priority": "HIGH",
                "action": f"Create comprehensive content about '{topic}' — competitor invested a full page here, so this topic matters for ranking",
            })

        my_text_words = set()
        comp_text_words = set()
        for p in my_pages:
            if p.content_text:
                clean = _clean_text(p.content_text).lower()
                words = set(re.findall(r"\b[a-z]{5,}\b", clean)) - STOP_WORDS - NAV_WORDS
                my_text_words |= words
        for p in comp_pages:
            if p.content_text:
                clean = _clean_text(p.content_text).lower()
                words = set(re.findall(r"\b[a-z]{5,}\b", clean)) - STOP_WORDS - NAV_WORDS
                comp_text_words |= words

        high_value_missing = comp_text_words - my_text_words
        topic_words = sorted(high_value_missing, key=lambda w: len(w), reverse=True)[:15]
        for word in topic_words:
            opportunities.append({
                "topic": word.title(),
                "reason": f"Competitor covers the concept of '{word}' across their content but you don't address it",
                "priority": "MEDIUM",
                "action": f"Add a section or article covering '{word}' with at least 300+ words of substantive content",
            })

        return opportunities[:15]

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
                seg = parts[-1].lower()
                if len(seg) > 3:
                    my_segs.add(seg)
        for url in comp_urls:
            parts = [s for s in url.split("/") if s and s not in ("https:", "http:", "")]
            if len(parts) > 3:
                seg = parts[-1].lower()
                if len(seg) > 3:
                    comp_segs.add(seg)

        return [{"topic": s.replace("-", " ").title(), "action": f"Create content for '{s.replace('-', ' ')}'"} for s in list(comp_segs - my_segs)[:20]]

    def _analyze_backlink_gap(self, my_pages, comp_pages):
        my_domains = set()
        comp_domains = set()
        for p in my_pages:
            for link in p.links_external:
                url = link.get("url", "") if isinstance(link, dict) else str(link)
                domain = _domain_from_url(url)
                if domain and len(domain) > 3:
                    my_domains.add(domain)
        for p in comp_pages:
            for link in p.links_external:
                url = link.get("url", "") if isinstance(link, dict) else str(link)
                domain = _domain_from_url(url)
                if domain and len(domain) > 3:
                    comp_domains.add(domain)

        comp_unique = comp_domains - my_domains

        domain_sources = {}
        for p in comp_pages:
            for link in p.links_external:
                url = link.get("url", "") if isinstance(link, dict) else str(link)
                domain = _domain_from_url(url)
                if domain in comp_unique:
                    if domain not in domain_sources:
                        domain_sources[domain] = {"count": 0, "pages": [], "anchors": []}
                    domain_sources[domain]["count"] += 1
                    if p.url not in domain_sources[domain]["pages"]:
                        domain_sources[domain]["pages"].append(p.url)
                    if isinstance(link, dict):
                        anchor = link.get("text", "").strip()
                        if anchor and len(anchor) > 1 and anchor not in domain_sources[domain]["anchors"]:
                            domain_sources[domain]["anchors"].append(anchor[:60])

        results = []
        for domain, info in sorted(domain_sources.items(), key=lambda x: x[1]["count"], reverse=True)[:15]:
            anchor_text = ", ".join(info["anchors"][:3]) if info["anchors"] else "no anchor text"
            results.append({
                "domain": domain,
                "link_count": info["count"],
                "linked_from_pages": len(info["pages"]),
                "anchor_text_examples": anchor_text,
                "action": f"Contact {domain} for a backlink opportunity — they already link to {len(info['pages'])} competitor page(s)",
                "priority": "HIGH" if info["count"] >= 3 else "MEDIUM",
            })

        return results

    def _analyze_serp_gap(self, my_pages, comp_pages):
        gaps = []
        my_urls = {p.url.rstrip("/") for p in my_pages}
        comp_urls = {p.url.rstrip("/") for p in comp_pages}

        missing_urls = comp_urls - my_urls
        for url in sorted(missing_urls)[:15]:
            slug = url.rstrip("/").split("/")[-1] if url.rstrip("/") else ""
            topic = slug.replace("-", " ").replace("_", " ").title() if slug else url
            comp_page = next((p for p in comp_pages if p.url.rstrip("/") == url), None)
            title = comp_page.title if comp_page and comp_page.title else topic
            word_count = comp_page.word_count if comp_page else 0
            gaps.append({
                "topic": title,
                "competitor_url": url,
                "action": f"Create content targeting '{title}' — competitor's page has ~{word_count} words",
                "priority": "HIGH" if word_count > 1000 else "MEDIUM",
            })

        return gaps[:15]

    def _generate_strategies(self, my_pages, comp_pages, strengths, weaknesses, keyword_ops, content_ops):
        strategies = []
        my_words = sum(p.word_count or 0 for p in my_pages) / max(len(my_pages), 1)
        comp_words = sum(p.word_count or 0 for p in comp_pages) / max(len(comp_pages), 1)

        if my_words < comp_words:
            strategies.append({"strategy": "Increase Content Depth", "detail": f"Expand content to match competitor's {int(comp_words)} avg words per page", "priority": "HIGH"})

        high_kw_ops = [k for k in keyword_ops if k.get("opportunity") == "HIGH"]
        if high_kw_ops:
            kw_list = ", ".join(k["topic"] for k in high_kw_ops[:5])
            strategies.append({"strategy": "Target High-Value Keyword Gaps", "detail": f"Create content for: {kw_list}", "priority": "HIGH"})

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
