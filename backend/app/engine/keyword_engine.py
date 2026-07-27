import logging
import re
from collections import Counter
from app.engine.crawler import PageData

logger = logging.getLogger(__name__)


class KeywordEngine:
    def analyze(self, pages, competitor_pages=None):
        result = {
            "keyword_opportunities": [],
            "content_gaps": [],
            "keyword_clusters": [],
            "keyword_density": [],
            "missing_keywords": [],
            "top_keywords": [],
        }

        if not pages:
            return result

        all_text = " ".join(p.content_text for p in pages if p.content_text)
        all_titles = " ".join(p.title for p in pages if p.title)
        all_h1s = " ".join(p.h1 for p in pages if p.h1)
        all_meta = " ".join(p.meta_description for p in pages if p.meta_description)

        keywords = self._extract_keywords(all_text)
        result["top_keywords"] = keywords[:30]

        density = self._calculate_density(all_text, keywords[:20])
        result["keyword_density"] = density

        if competitor_pages:
            comp_text = " ".join(p.content_text for p in competitor_pages if p.content_text)
            comp_keywords = self._extract_keywords(comp_text)
            my_kw_set = set(kw for kw, _ in keywords)
            comp_kw_set = set(kw for kw, _ in comp_keywords)

            missing = comp_kw_set - my_kw_set
            result["missing_keywords"] = [
                {"keyword": kw, "competitor_frequency": freq}
                for kw, freq in comp_keywords if kw in missing
            ][:30]

            for p in competitor_pages:
                if p.word_count > 500:
                    has_match = False
                    for my_p in pages:
                        if p.title and my_p.title and self._semantic_similarity(p.title, my_p.title) > 0.3:
                            has_match = True
                            break
                    if not has_match and p.title:
                        result["keyword_opportunities"].append({
                            "topic": p.title,
                            "url": p.url,
                            "words": p.word_count,
                            "reason": f"Competitor covers '{p.title[:60]}' but you don't",
                        })

        for page in pages:
            if page.status_code != 200 or not page.content_text:
                continue
            page_kw = self._extract_keywords(page.content_text)
            for kw, freq in page_kw[:10]:
                if page.title and kw.lower() in page.title.lower():
                    continue
                if page.h1 and kw.lower() in page.h1.lower():
                    continue
                result["keyword_opportunities"].append({
                    "keyword": kw,
                    "page": page.url,
                    "frequency": freq,
                    "reason": f"Keyword '{kw}' appears {freq} times but not in title/H1",
                })

        result["keyword_clusters"] = self._cluster_keywords(keywords)

        result["content_gaps"] = self._find_content_gaps(pages, keywords)

        return result

    def _extract_keywords(self, text):
        if not text:
            return []
        text_lower = text.lower()
        words = re.findall(r'\b[a-z]{3,}\b', text_lower)
        stop_words = {
            "the", "and", "for", "are", "but", "not", "you", "all", "can", "has", "his",
            "her", "its", "our", "who", "get", "with", "from", "your", "more", "will",
            "about", "that", "this", "they", "than", "them", "then", "what", "when",
            "how", "been", "have", "were", "one", "any", "may", "also", "just", "over",
            "such", "into", "most", "some", "only", "very", "after", "well", "much",
            "each", "made", "like", "back", "many", "ould", "does", "did", "here",
            "come", "make", "know", "take", "said", "use", "way", "way", "long",
            "through", "year", "while", "need", "want", "work", "give", "first",
            "even", "new", "want", "because", "any", "these", "two", "may",
            "high", "see", "now", "look", "own", "still", "find", "being",
            "same", "tell", "help", "start", "show", "try", "every", "ask",
            "must", "large", "too", "right", "old", "big", "end", "why",
            "turn", "life", "part", "head", "real", "keep", "last", "let",
            "thought", "group", "around", "never", "land", "second", "city",
            "case", "another", "become", "number", "people", "place", "year",
            "thing", "world", "down", "side", "both", "off", "use", "using",
        }
        freq = Counter(w for w in words if w not in stop_words and len(w) >= 3)

        bigrams = []
        word_list = [w for w in words if w not in stop_words]
        for i in range(len(word_list) - 1):
            bigram = f"{word_list[i]} {word_list[i+1]}"
            bigrams.append(bigram)
        bigram_freq = Counter(bigrams)

        combined = {}
        for kw, f in freq.most_common(100):
            combined[kw] = f
        for kw, f in bigram_freq.most_common(50):
            if f >= 2:
                combined[kw] = f

        return sorted(combined.items(), key=lambda x: x[1], reverse=True)

    def _calculate_density(self, text, keywords):
        if not text:
            return []
        total_words = len(text.split())
        result = []
        text_lower = text.lower()
        for kw, freq in keywords:
            count = text_lower.count(kw)
            density = (count / max(total_words, 1)) * 100
            result.append({
                "keyword": kw,
                "count": count,
                "density": round(density, 2),
                "total_words": total_words,
            })
        return result

    def _semantic_similarity(self, text1, text2):
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        if not words1 or not words2:
            return 0.0
        intersection = words1 & words2
        union = words1 | words2
        return len(intersection) / len(union) if union else 0.0

    def _cluster_keywords(self, keywords):
        clusters = {}
        for kw, freq in keywords:
            words = kw.split()
            root = words[0] if words else kw
            clusters.setdefault(root, []).append({"keyword": kw, "frequency": freq})

        return [
            {"cluster": root, "keywords": kws[:5], "total_frequency": sum(k["frequency"] for k in kws)}
            for root, kws in sorted(clusters.items(), key=lambda x: sum(k["frequency"] for k in x[1]), reverse=True)[:15]
        ]

    def _find_content_gaps(self, pages, keywords):
        gaps = []
        topics = set()
        for p in pages:
            if p.title:
                for word in p.title.lower().split():
                    if len(word) > 3:
                        topics.add(word)

        for kw, freq in keywords[:20]:
            root = kw.split()[0] if kw.split() else kw
            if root not in topics and freq > 2:
                gaps.append({
                    "keyword": kw,
                    "frequency": freq,
                    "suggestion": f"Create content targeting '{kw}'",
                })
        return gaps[:15]
