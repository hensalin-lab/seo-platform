"""
Complete Keyword Research Engine v2
Provides intent analysis, difficulty scoring, topic clusters, cannibalization detection,
question keywords, LSI, entities, suggested landing pages, blog topics, and FAQs.
Uses navigation/boilerplate filtering for meaningful keyword extraction.
"""
import logging
import re
from collections import Counter, defaultdict

logger = logging.getLogger(__name__)

STOP_WORDS = frozenset(
    "a an the and or but in on at to for of is it that this with from by as be are was "
    "were has have had do does did will would could should may might can shall not no nor "
    "so if than too very just about above after again also am any because before between "
    "both during each few more most other some such own same than these those up down out "
    "off over under where when how what which who whom why its being been are am will would "
    "could should can may might shall must do does did has have had you we our us they them "
    "their he she him her me my i the their there then them your yours yourself myself "
    "herself himself itself ourselves themselves anyone someone everyone nobody everybody "
    "anything something everything nothing another either neither several themselves "
    "into one every make day today keep real low ask level right high like don get use "
    "way time work need want know good great new free many much long short next last "
    "first best top plus also even still yet since until while during within without "
    "across along around behind below beneath beside beyond toward towards upon".split()
)

NAV_WORDS = frozenset(
    "login sign account support help documentation docs api status contact us "
    "privacy policy terms conditions cookie about our team careers jobs "
    "home page site map blog resources guides faq pricing plan enterprise "
    "get demo free trial signup register subscribe download try buy now "
    "search menu close open expand collapse nav sidebar footer header "
    "copyright reserved rights all facebook twitter linkedin instagram youtube "
    "back next previous skip content main navigation min start activate "
    "revenue beta read more learn more see more view all show calculator "
    "fit comics podcast request quote contact book platform product sales "
    "agents win personal data expand ready company built talk inc security "
    "website stop gtm analytics javascript enable consent cookies "
    "click here read learn visit online web".split()
)

QUESTION_STARTERS = {"how", "what", "why", "when", "where", "who", "which", "is", "are", "can", "does", "do", "should", "will", "could", "would", "may", "might"}

INTENT_KEYWORDS = {
    "COMMERCIAL": ["best", "top", "review", "comparison", "compare", "vs", "versus", "alternative", "alternative to", "cheapest", "affordable", "pricing", "cost", "price", "deal", "discount", "coupon", "cheap", "premium", "enterprise", "agency"],
    "TRANSACTIONAL": ["buy", "purchase", "order", "signup", "sign up", "register", "subscribe", "download", "get", "try", "demo", "trial", "free trial", "book", "hire", "contact", "quote", "apply", "start"],
    "INFORMATIONAL": ["what is", "how to", "guide", "tutorial", "learn", "example", "examples", "tips", "strategy", "strategies", "handbook", "overview", "introduction", "beginner", "advanced", "checklist", "template", "framework", "process", "step by step"],
    "NAVIGATIONAL": ["login", "log in", "sign in", "dashboard", "account", "support", "help", "documentation", "docs", "api", "status", "contact us"],
}


def _clean_html(text: str) -> str:
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<nav[^>]*>.*?</nav>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<footer[^>]*>.*?</footer>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<header[^>]*>.*?</header>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _is_meaningful_term(term: str) -> bool:
    words = term.lower().split()
    if not words:
        return False
    if len(term) < 3:
        return False
    if term.lower() in NAV_WORDS:
        return False
    if re.match(r"^[\d\s\.\,\-\_]+$", term):
        return False
    meaningful = [w for w in words if w not in NAV_WORDS and w not in STOP_WORDS and len(w) > 2]
    return len(meaningful) > 0


def _is_title_heading(term: str) -> bool:
    words = term.split()
    if len(words) <= 1:
        return False
    if any(w[0].isupper() for w in words if len(w) > 1):
        return True
    return False


class KeywordResearchEngine:
    def analyze(self, pages, competitor_pages=None, gsc_data=None):
        result = {
            "keywords": [],
            "keyword_map": {},
            "intent_breakdown": {},
            "question_keywords": [],
            "lsi_keywords": [],
            "entity_suggestions": [],
            "topic_clusters": [],
            "cannibalization": [],
            "suggested_landing_pages": [],
            "suggested_blog_topics": [],
            "suggested_faqs": [],
            "content_gaps": [],
            "difficulty_estimates": [],
            "trending_signals": [],
            "summary": {},
        }

        if not pages:
            return result

        all_clean_text = " ".join(
            _clean_html(p.content_text or "") + " " + (p.title or "") + " " + (p.h1 or "")
            for p in pages
        )
        all_titles = [p.title for p in pages if p.title]
        all_h1s = [p.h1 for p in pages if p.h1]

        raw_keywords = self._extract_keywords(all_clean_text)
        bigrams = self._extract_bigrams(all_clean_text)

        for kw, freq in raw_keywords[:80]:
            if not _is_meaningful_term(kw):
                continue
            if len(kw.split()) == 1:
                if not any(kw in (t or "").lower() for t in all_titles) and not any(kw in (h or "").lower() for h in all_h1s):
                    continue
            intent = self._classify_intent(kw, all_clean_text)
            difficulty = self._estimate_difficulty(kw, freq, len(pages))
            opportunity = self._score_opportunity(kw, freq, intent, difficulty, all_titles, all_h1s)
            pages_using = self._find_pages_using_keyword(kw, pages)
            est_volume = self._estimate_volume(kw, freq, len(pages))

            result["keywords"].append({
                "keyword": kw.title(),
                "frequency": freq,
                "estimated_volume": est_volume,
                "type": "short-tail" if len(kw.split()) <= 2 else "long-tail",
                "intent": intent,
                "difficulty": difficulty["level"],
                "difficulty_score": difficulty["score"],
                "difficulty_reason": difficulty["reason"],
                "opportunity": opportunity,
                "pages_using": len(pages_using),
                "density": round(freq / max(len(all_clean_text.split()), 1) * 100, 2),
            })

        for kw, freq in bigrams[:40]:
            if not _is_meaningful_term(kw):
                continue
            intent = self._classify_intent(kw, all_clean_text)
            difficulty = self._estimate_difficulty(kw, freq, len(pages))
            pages_using = self._find_pages_using_keyword(kw, pages)
            est_volume = self._estimate_volume(kw, freq, len(pages))

            result["keywords"].append({
                "keyword": kw.title(),
                "frequency": freq,
                "estimated_volume": est_volume,
                "type": "long-tail",
                "intent": intent,
                "difficulty": difficulty["level"],
                "difficulty_score": difficulty["score"],
                "difficulty_reason": difficulty["reason"],
                "opportunity": self._score_opportunity(kw, freq, intent, difficulty, all_titles, all_h1s),
                "pages_using": len(pages_using),
                "density": round(freq / max(len(all_clean_text.split()), 1) * 100, 2),
            })

        result["keywords"].sort(key=lambda x: x["frequency"], reverse=True)
        result["keywords"] = [k for k in result["keywords"] if k["frequency"] >= 2][:50]

        result["intent_breakdown"] = self._get_intent_breakdown(result["keywords"])

        result["question_keywords"] = self._find_question_keywords(all_clean_text, all_titles, all_h1s)

        result["lsi_keywords"] = self._find_lsi_keywords(result["keywords"], all_clean_text)

        result["entity_suggestions"] = self._extract_entities(all_clean_text, pages)

        result["topic_clusters"] = self._build_topic_clusters(result["keywords"], pages)

        result["cannibalization"] = self._detect_cannibalization(pages, result["keywords"])

        result["suggested_landing_pages"] = self._suggest_landing_pages(result["keywords"], pages)

        result["suggested_blog_topics"] = self._suggest_blog_topics(result["keywords"], result["question_keywords"], pages)

        result["suggested_faqs"] = self._suggest_faqs(result["question_keywords"], result["keywords"])

        if competitor_pages:
            result["content_gaps"] = self._find_content_gaps(pages, competitor_pages)

        result["difficulty_estimates"] = self._batch_difficulty(result["keywords"])

        result["summary"] = self._build_summary(result)

        return result

    def _extract_keywords(self, text):
        clean = _clean_html(text).lower()
        words = re.findall(r'\b[a-zA-Z]{3,}\b', clean)
        words = [w for w in words if w not in STOP_WORDS and w not in NAV_WORDS]
        return Counter(words).most_common(80)

    def _extract_bigrams(self, text):
        clean = _clean_html(text).lower()
        words = re.findall(r'\b[a-zA-Z]{3,}\b', clean)
        words = [w for w in words if w not in STOP_WORDS and w not in NAV_WORDS]
        bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words)-1)]
        return Counter(bigrams).most_common(40)

    def _classify_intent(self, keyword, all_text):
        kw_lower = keyword.lower()
        for intent, markers in INTENT_KEYWORDS.items():
            for marker in markers:
                if marker in kw_lower:
                    return intent
        if "?" in keyword:
            return "INFORMATIONAL"
        if kw_lower in NAV_WORDS:
            return "NAVIGATIONAL"
        word_count = len(keyword.split())
        if word_count == 1:
            return "INFORMATIONAL"
        if word_count >= 4:
            return "INFORMATIONAL"
        return "INFORMATIONAL"

    def _estimate_difficulty(self, keyword, frequency, total_pages):
        word_count = len(keyword.split())
        competition_signals = 0
        if re.search(r'\b(best|top|review|comparison|vs)\b', keyword):
            competition_signals += 3
        if re.search(r'\b(buy|price|cost|cheap|deal)\b', keyword):
            competition_signals += 2
        if re.search(r'\b(guide|how to|tutorial|what is)\b', keyword):
            competition_signals += 1

        length_bonus = max(0, (word_count - 2) * 0.5)

        score = min(10, competition_signals + length_bonus + (5 if frequency < 3 else 0))

        if score <= 3:
            return {"level": "LOW", "score": min(30, score * 10), "reason": "Low competition — fewer authoritative domains targeting this keyword"}
        elif score <= 6:
            return {"level": "MEDIUM", "score": min(60, 30 + score * 5), "reason": "Moderate competition — some established pages ranking for this keyword"}
        else:
            return {"level": "HIGH", "score": min(90, 60 + score * 3), "reason": "High competition — strong SaaS competitors with rich backlink profiles"}

    def _estimate_volume(self, keyword, frequency, total_pages):
        base = frequency * total_pages * 12
        if len(keyword.split()) >= 3:
            base = int(base * 0.6)
        if any(w in keyword for w in ("best", "top", "review", "vs", "alternative")):
            base = int(base * 1.5)
        if any(w in keyword for w in ("buy", "price", "cost", "free", "trial", "demo")):
            base = int(base * 1.3)
        return max(50, base)

    def _score_opportunity(self, keyword, frequency, intent, difficulty, all_titles, all_h1s):
        kw_lower = keyword.lower()
        in_title = any(kw_lower in t.lower() for t in all_titles if t)
        in_h1 = any(kw_lower in h.lower() for h in all_h1s if h)

        score = 0
        if not in_title:
            score += 30
        if not in_h1:
            score += 20
        if frequency >= 5:
            score += 25
        elif frequency >= 3:
            score += 15
        if difficulty["level"] == "LOW":
            score += 25
        elif difficulty["level"] == "MEDIUM":
            score += 15
        if intent == "COMMERCIAL":
            score += 10
        elif intent == "TRANSACTIONAL":
            score += 15
        if len(keyword.split()) >= 3:
            score += 10

        if score >= 70:
            return "HIGH"
        elif score >= 40:
            return "MEDIUM"
        return "LOW"

    def _find_pages_using_keyword(self, keyword, pages):
        kw_lower = keyword.lower()
        return [p.url for p in pages if p.content_text and kw_lower in _clean_html(p.content_text).lower()]

    def _get_intent_breakdown(self, keywords):
        breakdown = defaultdict(lambda: {"count": 0, "keywords": []})
        for kw in keywords:
            intent = kw["intent"]
            breakdown[intent]["count"] += 1
            if len(breakdown[intent]["keywords"]) < 10:
                breakdown[intent]["keywords"].append(kw["keyword"])
        return dict(breakdown)

    def _find_question_keywords(self, all_text, all_titles, all_h1s):
        questions = []
        clean = _clean_html(all_text)
        sentences = re.split(r'[.!?\n]', clean)
        for s in sentences:
            s = s.strip()
            if "?" in s and 15 < len(s) < 200:
                first_word = s.split()[0].lower() if s.split() else ""
                if first_word in QUESTION_STARTERS:
                    questions.append(s.strip())

        for h in all_titles + all_h1s:
            if h and "?" in h and len(h) > 10:
                questions.append(h.strip())

        seen = set()
        unique = []
        for q in questions:
            q_lower = q.lower().strip()
            if q_lower not in seen:
                seen.add(q_lower)
                unique.append({
                    "question": q,
                    "type": self._classify_question_type(q),
                    "difficulty": "LOW" if len(q.split()) >= 6 else "MEDIUM",
                })
        return unique[:30]

    def _classify_question_type(self, question):
        q_lower = question.lower()
        if q_lower.startswith(("how", "what is", "what are")):
            return "DEFINITION"
        elif q_lower.startswith(("why", "reason")):
            return "EXPLANATION"
        elif q_lower.startswith(("when", "time", "date")):
            return "TEMPORAL"
        elif q_lower.startswith(("where", "location")):
            return "LOCATION"
        elif q_lower.startswith(("who", "people")):
            return "PERSON"
        elif q_lower.startswith(("which", "best", "top")):
            return "COMPARISON"
        elif q_lower.startswith(("can", "does", "is", "do", "should", "will")):
            return "YES_NO"
        return "GENERAL"

    def _find_lsi_keywords(self, keywords, all_text):
        lsi = []
        if not keywords:
            return lsi

        clean = _clean_html(all_text).lower()
        text_words = re.findall(r'\b[a-zA-Z]{4,}\b', clean)
        text_words = [w for w in text_words if w not in STOP_WORDS and w not in NAV_WORDS]

        for kw_data in keywords[:5]:
            kw = kw_data["keyword"].lower()
            kw_words = kw.split()
            co_occurrences = Counter()
            for i, w in enumerate(text_words):
                if w in kw_words:
                    for j in range(max(0, i-5), min(len(text_words), i+6)):
                        if text_words[j] not in kw_words and text_words[j] not in STOP_WORDS and text_words[j] not in NAV_WORDS:
                            co_occurrences[text_words[j]] += 1

            for word, count in co_occurrences.most_common(5):
                if count >= 2:
                    lsi.append({
                        "primary_keyword": kw_data["keyword"],
                        "lsi_keyword": word.title(),
                        "co_occurrence_count": count,
                        "relevance": "HIGH" if count >= 5 else "MEDIUM",
                    })

        return lsi[:20]

    def _extract_entities(self, all_text, pages):
        entities = []
        clean = _clean_html(all_text)
        capitalized = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b', clean)
        entity_freq = Counter(capitalized)

        for entity, freq in entity_freq.most_common(20):
            if freq >= 3 and len(entity) > 2 and _is_meaningful_term(entity):
                context_pages = [p.url for p in pages if p.content_text and entity in _clean_html(p.content_text)]
                entities.append({
                    "entity": entity,
                    "frequency": freq,
                    "type": self._classify_entity_type(entity),
                    "prominence": "HIGH" if freq >= 10 else "MEDIUM" if freq >= 5 else "LOW",
                    "found_on_pages": len(context_pages),
                })

        return entities[:15]

    def _classify_entity_type(self, entity):
        entity_lower = entity.lower()
        if entity_lower in {"google", "bing", "openai", "microsoft", "amazon", "apple", "facebook", "meta"}:
            return "BRAND"
        if entity_lower in {"seo", "ai", "saas", "b2b", "crm", "erp", "api", "roi", "ctr", "serp"}:
            return "ACRONYM"
        if re.search(r'\b(company|inc|llc|corp|ltd)\b', entity_lower):
            return "ORGANIZATION"
        return "CONCEPT"

    def _build_topic_clusters(self, keywords, pages):
        clusters = []
        root_words = Counter()
        for kw in keywords:
            words = kw["keyword"].lower().split()
            if words:
                root_words[words[0]] += kw["frequency"]

        for root, freq in root_words.most_common(8):
            if root in STOP_WORDS or root in NAV_WORDS:
                continue
            cluster_kws = [kw for kw in keywords if kw["keyword"].lower().startswith(root)]
            if len(cluster_kws) >= 2:
                pages_in_cluster = []
                for kw in cluster_kws:
                    pages_in_cluster.append(kw.get("pages_using", 0))

                clusters.append({
                    "root_keyword": root.title(),
                    "total_frequency": freq,
                    "keywords": [kw["keyword"] for kw in cluster_kws[:8]],
                    "keyword_count": len(cluster_kws),
                    "pages_affected": list(set(pages_in_cluster))[:10],
                    "topic_authority": "HIGH" if freq >= 20 else "MEDIUM" if freq >= 10 else "LOW",
                })

        return clusters

    def _detect_cannibalization(self, pages, keywords):
        cannibalization = []
        for kw_data in keywords[:15]:
            kw = kw_data["keyword"].lower()
            competing_pages = []
            for p in pages:
                if p.content_text and kw in _clean_html(p.content_text).lower():
                    title_match = p.title and kw in p.title.lower()
                    h1_match = p.h1 and kw in p.h1.lower()
                    if title_match or h1_match:
                        competing_pages.append({
                            "url": p.url,
                            "title": p.title or "",
                            "has_in_title": title_match,
                            "has_in_h1": h1_match,
                            "word_count": p.word_count or 0,
                        })

            if len(competing_pages) >= 2:
                cannibalization.append({
                    "keyword": kw_data["keyword"],
                    "competing_pages": competing_pages,
                    "severity": "HIGH" if len(competing_pages) >= 4 else "MEDIUM",
                    "recommendation": f"Consolidate {len(competing_pages)} pages targeting '{kw_data['keyword']}' into one authoritative page",
                })

        return cannibalization

    def _suggest_landing_pages(self, keywords, pages):
        suggestions = []
        commercial_kws = [kw for kw in keywords if kw["intent"] in ("COMMERCIAL", "TRANSACTIONAL") and kw["opportunity"] in ("HIGH", "MEDIUM")]

        for kw in commercial_kws[:12]:
            existing = self._find_pages_using_keyword(kw["keyword"], pages)
            best_page = None
            if existing:
                best_page = max(existing, key=lambda u: next((p.word_count for p in pages if p.url == u), 0))

            suggestions.append({
                "keyword": kw["keyword"],
                "intent": kw["intent"],
                "difficulty": kw["difficulty"],
                "estimated_volume": kw.get("estimated_volume", 0),
                "suggested_page": best_page or f"/{kw['keyword'].replace(' ', '-')}",
                "action": "OPTIMIZE" if best_page else "CREATE",
                "priority": kw["opportunity"],
            })

        return suggestions

    def _suggest_blog_topics(self, keywords, questions, pages):
        topics = []
        informational_kws = [kw for kw in keywords if kw["intent"] == "INFORMATIONAL" and kw["frequency"] >= 3]

        for kw in informational_kws[:8]:
            topics.append({
                "title": f"How to {kw['keyword'].title()}: Complete Guide",
                "keyword": kw["keyword"],
                "type": "GUIDE",
                "estimated_words": 1500,
                "priority": kw["opportunity"],
                "target_audience": "beginners" if "beginner" in kw["keyword"] else "general",
            })

        for q in questions[:8]:
            if q["question"] not in [t.get("keyword") for t in topics]:
                topics.append({
                    "title": q["question"],
                    "keyword": q["question"],
                    "type": "Q&A",
                    "estimated_words": 800,
                    "priority": "MEDIUM",
                    "target_audience": "general",
                })

        comparison_kws = [kw for kw in keywords if "vs" in kw["keyword"].lower() or "alternative" in kw["keyword"].lower() or "comparison" in kw["keyword"].lower()]
        for kw in comparison_kws[:5]:
            topics.append({
                "title": f"{kw['keyword'].title()}: Which Is Better?",
                "keyword": kw["keyword"],
                "type": "COMPARISON",
                "estimated_words": 1200,
                "priority": "HIGH",
                "target_audience": "buyers",
            })

        return topics

    def _suggest_faqs(self, questions, keywords):
        faqs = []
        for q in questions[:10]:
            faqs.append({
                "question": q["question"],
                "type": q["type"],
                "suggested_answer": f"Provide a clear, concise answer to '{q['question']}' in 2-3 sentences, targeting the featured snippet format.",
                "schema_type": "FAQPage",
                "priority": "HIGH" if q["type"] in ("DEFINITION", "YES_NO") else "MEDIUM",
            })

        for kw in keywords[:5]:
            faqs.append({
                "question": f"What is {kw['keyword'].lower()}?",
                "type": "DEFINITION",
                "suggested_answer": f"Define '{kw['keyword']}' clearly, include key features, benefits, and use cases.",
                "schema_type": "FAQPage",
                "priority": "MEDIUM",
            })

        return faqs

    def _find_content_gaps(self, pages, competitor_pages):
        gaps = []
        my_text = " ".join(_clean_html(p.content_text or "") for p in pages if p.content_text)
        my_words = set(re.findall(r'\b[a-zA-Z]{5,}\b', my_text.lower())) - STOP_WORDS - NAV_WORDS

        comp_text = " ".join(_clean_html(p.content_text or "") for p in competitor_pages if p.content_text)
        comp_words = set(re.findall(r'\b[a-zA-Z]{5,}\b', comp_text.lower())) - STOP_WORDS - NAV_WORDS

        missing = comp_words - my_words
        word_freq = Counter(re.findall(r'\b[a-zA-Z]{5,}\b', comp_text.lower()))

        for word in sorted(missing, key=lambda w: word_freq.get(w, 0), reverse=True)[:25]:
            freq = word_freq.get(word, 0)
            if freq >= 3:
                gaps.append({
                    "keyword": word.title(),
                    "competitor_frequency": freq,
                    "your_frequency": 0,
                    "priority": "HIGH" if freq >= 10 else "MEDIUM",
                    "action": f"Create content covering '{word}' — competitor mentions it {freq} times across their pages",
                })

        return gaps

    def _batch_difficulty(self, keywords):
        return [{
            "keyword": kw["keyword"],
            "difficulty": kw["difficulty"],
            "difficulty_score": kw.get("difficulty_score", 50),
            "difficulty_reason": kw.get("difficulty_reason", ""),
            "type": kw["type"],
            "competition_level": "High" if kw["difficulty"] == "HIGH" else "Medium" if kw["difficulty"] == "MEDIUM" else "Low",
        } for kw in keywords[:25]]

    def _build_summary(self, result):
        total = len(result["keywords"])
        high_opp = len([k for k in result["keywords"] if k["opportunity"] == "HIGH"])
        med_opp = len([k for k in result["keywords"] if k["opportunity"] == "MEDIUM"])
        low_diff = len([k for k in result["keywords"] if k.get("difficulty", "LOW") == "LOW" or (isinstance(k.get("difficulty"), dict) and k["difficulty"].get("level") == "LOW")])
        questions = len(result["question_keywords"])
        clusters = len(result["topic_clusters"])
        cannibal = len(result["cannibalization"])

        return {
            "total_keywords": total,
            "high_opportunity": high_opp,
            "medium_opportunity": med_opp,
            "low_difficulty": low_diff,
            "question_keywords": questions,
            "topic_clusters": clusters,
            "cannibalization_issues": cannibal,
            "suggested_blog_topics": len(result["suggested_blog_topics"]),
            "suggested_faqs": len(result["suggested_faqs"]),
            "content_gaps": len(result["content_gaps"]),
            "top_opportunities": [
                {"keyword": k["keyword"], "difficulty": k["difficulty"], "intent": k["intent"], "estimated_volume": k.get("estimated_volume", 0)}
                for k in result["keywords"] if k["opportunity"] == "HIGH"
            ][:10],
        }
