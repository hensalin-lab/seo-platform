import logging
import re
from app.engine.crawler import PageData

logger = logging.getLogger(__name__)


class ContentIntelligenceEngine:
    def analyze(self, pages, competitor_pages=None):
        result = {
            "content_quality": [],
            "content_gaps": [],
            "topic_authority": {},
            "content_recommendations": [],
            "search_intent": [],
            "entity_analysis": {},
        }

        if not pages:
            return result

        all_text = " ".join(p.content_text for p in pages if p.content_text)

        for page in pages:
            if page.status_code != 200 or not page.content_text:
                continue
            quality = self._analyze_page_quality(page)
            result["content_quality"].append(quality)

            intent = self._detect_search_intent(page)
            result["search_intent"].append(intent)

        result["topic_authority"] = self._analyze_topic_authority(pages, all_text)

        result["entity_analysis"] = self._analyze_entities(all_text)

        if competitor_pages:
            result["content_gaps"] = self._find_gaps(pages, competitor_pages, all_text)

        result["content_recommendations"] = self._generate_recommendations(pages, result)

        return result

    def _analyze_page_quality(self, page):
        wc = page.word_count
        headings = page.headings
        h1_count = sum(1 for h in headings if h["level"] == "H1")
        h2_count = sum(1 for h in headings if h["level"] == "H2")
        h3_count = sum(1 for h in headings if h["level"] == "H3")
        internal_links = len(page.links_internal)
        external_links = len(page.links_external)
        images = len(page.images)
        has_schema = bool(page.schema_markup)

        score = 0
        if wc >= 800: score += 25
        elif wc >= 400: score += 15
        elif wc >= 200: score += 5
        if h1_count == 1: score += 15
        if h2_count >= 2: score += 15
        if h3_count >= 1: score += 5
        if internal_links >= 3: score += 15
        elif internal_links >= 1: score += 8
        if external_links >= 1: score += 5
        if images >= 1: score += 5
        if has_schema: score += 10

        return {
            "url": page.url,
            "title": page.title,
            "word_count": wc,
            "score": min(score, 100),
            "headings": {"h1": h1_count, "h2": h2_count, "h3": h3_count},
            "internal_links": internal_links,
            "external_links": external_links,
            "images": images,
            "has_schema": has_schema,
            "grade": self._score_to_grade(min(score, 100)),
        }

    def _detect_search_intent(self, page):
        text = (page.content_text or "").lower()
        title = (page.title or "").lower()
        h1 = (page.h1 or "").lower()

        commercial_kw = ["pricing", "buy", "purchase", "deal", "discount", "offer", "free trial", "get started", "demo"]
        informational_kw = ["what is", "how to", "guide", "tutorial", "learn", "understand", "explain", "definition"]
        navigational_kw = ["login", "sign in", "dashboard", "account", "support"]
        transactional_kw = ["download", "register", "subscribe", "sign up", "apply", "contact"]

        scores = {
            "commercial": sum(1 for kw in commercial_kw if kw in text or kw in title),
            "informational": sum(1 for kw in informational_kw if kw in text or kw in title),
            "navigational": sum(1 for kw in navigational_kw if kw in text or kw in title),
            "transactional": sum(1 for kw in transactional_kw if kw in text or kw in title),
        }

        primary_intent = max(scores, key=scores.get) if any(scores.values()) else "informational"

        return {
            "url": page.url,
            "primary_intent": primary_intent,
            "intent_scores": scores,
        }

    def _analyze_topic_authority(self, pages, all_text):
        word_freq = {}
        for p in pages:
            if p.content_text:
                words = re.findall(r'\b[a-z]{4,}\b', p.content_text.lower())
                for w in words:
                    word_freq[w] = word_freq.get(w, 0) + 1

        top_topics = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:20]

        topic_clusters = {}
        for p in pages:
            if p.title:
                key_words = [w for w in p.title.lower().split() if len(w) > 3]
                for kw in key_words:
                    topic_clusters.setdefault(kw, []).append(p.url)

        return {
            "top_topics": [{"topic": t, "frequency": f} for t, f in top_topics],
            "topic_clusters": {k: len(v) for k, v in topic_clusters.items() if len(v) >= 2},
            "total_pages": len(pages),
            "content_freshness": self._check_freshness(pages),
        }

    def _check_freshness(self, pages):
        recent = 0
        for p in pages:
            if p.content_text and re.search(r"202[4-6]", p.content_text):
                recent += 1
        return {
            "recent_pages": recent,
            "total_pages": len(pages),
            "freshness_ratio": round(recent / max(len(pages), 1), 2),
        }

    def _analyze_entities(self, all_text):
        if not all_text:
            return {"entities": [], "entity_count": 0}

        caps = re.findall(r'\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b', all_text[:100000])
        skip = {"The", "This", "That", "What", "When", "Where", "How", "Why", "And", "But", "For",
                "Are", "Not", "You", "All", "Can", "Has", "His", "Her", "Its", "Our", "Who", "Get",
                "With", "From", "Your", "More", "Will", "About", "Contact", "Home", "Page", "New",
                "Learn", "Read", "View", "See", "Also", "Other", "Some", "Most", "Like", "Into",
                "Over", "After", "Before", "Between", "Through", "During", "Below", "Above", "Use"}
        entities = {}
        for w in caps:
            if len(w) > 2 and w not in skip:
                entities[w] = entities.get(w, 0) + 1

        sorted_entities = sorted(entities.items(), key=lambda x: x[1], reverse=True)[:30]
        return {
            "entities": [{"name": e, "frequency": f} for e, f in sorted_entities],
            "entity_count": len(entities),
        }

    def _find_gaps(self, my_pages, comp_pages, my_text):
        gaps = []
        comp_text = " ".join(p.content_text for p in comp_pages if p.content_text)

        my_topics = set()
        comp_topics = set()
        for p in my_pages:
            if p.title:
                for w in p.title.lower().split():
                    if len(w) > 3:
                        my_topics.add(w)
        for p in comp_pages:
            if p.title:
                for w in p.title.lower().split():
                    if len(w) > 3:
                        comp_topics.add(w)

        missing = comp_topics - my_topics
        for topic in list(missing)[:10]:
            comp_page = next((p for p in comp_pages if p.title and topic in p.title.lower()), None)
            gaps.append({
                "topic": topic,
                "competitor_url": comp_page.url if comp_page else "",
                "competitor_words": comp_page.word_count if comp_page else 0,
                "suggestion": f"Create content about '{topic}'",
            })

        return gaps

    def _generate_recommendations(self, pages, analysis):
        recs = []
        avg_words = sum(p.word_count for p in pages if p.word_count > 0) / max(len(pages), 1)

        if avg_words < 500:
            recs.append({
                "type": "CONTENT_DEPTH",
                "priority": "HIGH",
                "message": f"Average content depth is only {int(avg_words)} words. Target 800+ words for competitive keywords.",
            })

        thin_pages = [p for p in pages if 0 < p.word_count < 300 and p.status_code == 200]
        if thin_pages:
            recs.append({
                "type": "THIN_CONTENT",
                "priority": "HIGH",
                "message": f"{len(thin_pages)} pages have fewer than 300 words. Expand or consolidate thin content.",
                "pages": [p.url for p in thin_pages[:5]],
            })

        no_schema = [p for p in pages if not p.schema_markup and p.status_code == 200]
        if no_schema:
            recs.append({
                "type": "SCHEMA",
                "priority": "MEDIUM",
                "message": f"{len(no_schema)} pages lack structured data. Add JSON-LD schema markup.",
            })

        no_cta = [p for p in pages if p.status_code == 200 and not any(
            kw in (p.content_text or "").lower()
            for kw in ["sign up", "get started", "contact us", "demo", "trial"]
        )]
        if no_cta:
            recs.append({
                "type": "CTA",
                "priority": "MEDIUM",
                "message": f"{len(no_cta)} pages lack clear calls-to-action.",
            })

        return recs

    def _score_to_grade(self, score):
        if score >= 90: return "A+"
        if score >= 80: return "A"
        if score >= 70: return "B+"
        if score >= 60: return "B"
        if score >= 50: return "C+"
        if score >= 40: return "C"
        if score >= 30: return "D"
        return "F"
