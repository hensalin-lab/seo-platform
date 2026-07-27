import re
from collections import Counter
from typing import Any


STOPWORDS = frozenset(
    "a an the and or but if in on at to for of is it its be are was were am been being "
    "do does did has have had with from by as this that these those so too very just not "
    "no nor can could would should may might will shall must need dare ought used also "
    "into over under between through during before after above below up down out off "
    "again further then once here there when where why how all any both each few more "
    "most other some such only own same than what which who whom whose why how your you "
    "we our us they them their he she him her it its me my i".split()
)

HEADING_TAGS = re.compile(r"<(h[1-6])[^>]*>(.*?)</\1>", re.IGNORECASE | re.DOTALL)
HTML_TAG = re.compile(r"<[^>]+>")
TABLE_RE = re.compile(r"<table[\s>]", re.IGNORECASE)
UL_RE = re.compile(r"<ul[\s>]", re.IGNORECASE)
OL_RE = re.compile(r"<ol[\s>]", re.IGNORECASE)
VIDEO_RE = re.compile(
    r"<(?:iframe[^>]*src=['\"][^'\"]*(?:youtube|vimeo|wistia|dailymotion|loom|vidyard)[^'\"]*['\"]|video[\s>]|embed[\s>]|object[\s>]|param[^>]*movie|\.mp4|\.webm)",
    re.IGNORECASE,
)
SCHEMA_RE = re.compile(r'"@type"\s*:\s*"([^"]+)"', re.IGNORECASE)
YEAR_RE = re.compile(r"\b(20[0-9]{2})\b")
DATE_RE = re.compile(
    r"(?:last\s+(?:modified|updated|reviewed|published)|date(?:d)?|published|updated|modified)\s*[:=]?\s*[\w\s,\-/]*?(20[0-9]{2})",
    re.IGNORECASE,
)
QUESTION_SENTENCE_RE = re.compile(r"[^.!?]*\?", re.IGNORECASE)
NUMBER_RE = re.compile(r"\b\d[\d,.:]*%?\b")
PERCENT_RE = re.compile(r"\b\d+(?:\.\d+)?%")
CURRENCY_RE = re.compile(r"[$£€¥₹]\s*\d[\d,.]*|\b\d[\d,.]*\s*(?:USD|EUR|GBP|INR)\b")
SOURCE_RE = re.compile(
    r"\b(?:source[sd]?\s*[:=]|according\s+to|cited\s+(?:from|in)|study\s+(?:by|from)|research\s+(?:by|from|shows)|report\s+(?:by|from|shows))\b",
    re.IGNORECASE,
)
AUTHOR_RE = re.compile(
    r"(?:author|written\s+by|by\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b", re.IGNORECASE
)
TESTIMONIAL_RE = re.compile(
    r"(?:testimonial|review[sd]?|client\s+(?:said|says|feedback)|customer\s+(?:said|says)|quote[sd]?\s+(?:by|from)|5[\s-]*star|rating|trustpilot|g2|capterra|clutch)",
    re.IGNORECASE,
)
LOGO_RE = re.compile(r"<img[^>]*(?:logo|brand|company)[^>]*>", re.IGNORECASE)
EMBED_RE = re.compile(
    r"<(?:iframe|object|embed|video|picture|source)\b", re.IGNORECASE
)
CAPITALIZED_MULTIWORD = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b")


def _strip_html(text: str) -> str:
    return HTML_TAG.sub(" ", text)


def _tokenize(text: str) -> list[str]:
    clean = _strip_html(text).lower()
    words = re.findall(r"[a-z]{4,}", clean)
    return [w for w in words if w not in STOPWORDS]


def _extract_title_words(title: str) -> list[str]:
    words = re.findall(r"[a-zA-Z]{4,}", title.lower())
    return [w for w in words if w not in STOPWORDS]


def _extract_entities(text: str) -> list[str]:
    raw = CAPITALIZED_MULTIWORD.findall(_strip_html(text))
    entities = []
    for e in raw:
        tokens = e.split()
        if len(tokens) >= 2 and all(t.lower() not in STOPWORDS for t in tokens):
            entities.append(e.strip())
    return list(dict.fromkeys(entities))


def _count_questions(html: str) -> int:
    text = _strip_html(html)
    return len(QUESTION_SENTENCE_RE.findall(text))


def _heading_structure(html: str) -> list[dict[str, str]]:
    headings = []
    for m in HEADING_TAGS.finditer(html):
        level = m.group(1).lower()
        content = _strip_html(m.group(2)).strip()
        if content:
            headings.append({"level": level, "text": content})
    return headings


def _heading_pattern(headings: list[dict[str, str]]) -> list[str]:
    return [f"{h['level']}: {h['text'][:60]}" for h in headings]


def _count_statistics(text: str) -> int:
    clean = _strip_html(text)
    nums = NUMBER_RE.findall(clean)
    return len(nums)


def _count_citations(text: str) -> int:
    clean = _strip_html(text)
    return len(SOURCE_RE.findall(clean))


def _detect_trust_signals(page: dict) -> list[str]:
    html = page.get("html_raw", "")
    text = page.get("content_text", "")
    combined = html + " " + text
    signals = []
    if AUTHOR_RE.search(combined):
        signals.append("author")
    if DATE_RE.search(combined) or YEAR_RE.search(combined):
        signals.append("date")
    if _count_citations(combined) > 0:
        signals.append("citations")
    if TESTIMONIAL_RE.search(combined):
        signals.append("testimonials")
    if LOGO_RE.search(html):
        signals.append("logos")
    return signals


def _detect_freshness(page: dict) -> str:
    text = page.get("content_text", "")
    html = page.get("html_raw", "")
    combined = html + " " + text
    years = YEAR_RE.findall(combined)
    if years:
        newest = max(int(y) for y in years)
        return str(newest)
    return "unknown"


def _count_images(html: str) -> int:
    return len(re.findall(r"<img\b", html, re.IGNORECASE))


def _has_video(html: str) -> bool:
    return bool(VIDEO_RE.search(html))


def _count_tables(html: str) -> int:
    return len(TABLE_RE.findall(html))


def _count_lists(html: str) -> int:
    return len(UL_RE.findall(html)) + len(OL_RE.findall(html))


def _schema_types(html: str) -> list[str]:
    types = SCHEMA_RE.findall(html)
    return sorted(set(t for t in types))


def _build_word_freq(texts: list[str]) -> Counter:
    counter: Counter = Counter()
    for t in texts:
        counter.update(_tokenize(t))
    return counter


def _compute_difficulty(count: int, competitor_count: int) -> str:
    ratio = count / max(competitor_count, 1)
    if ratio <= 0.2:
        return "hard"
    if ratio <= 0.5:
        return "medium"
    return "easy"


class CompetitorIntelligenceEngine:
    def analyze(self, page: dict[str, Any], competitor_pages: list[dict[str, Any]]) -> dict[str, Any]:
        url = page.get("url", "")
        c_count = len(competitor_pages)
        gap_scores: dict[str, float] = {}

        topic_result = self._topic_gap(page, competitor_pages)
        gap_scores["topic_coverage"] = topic_result["score"]

        keyword_result = self._keyword_gap(page, competitor_pages)
        gap_scores["keyword_gap"] = keyword_result["score"]

        entity_result = self._entity_gap(page, competitor_pages)
        gap_scores["entity_gap"] = entity_result["score"]

        faq_result = self._faq_gap(page, competitor_pages)
        gap_scores["faq_gap"] = faq_result["score"]

        heading_result = self._heading_gap(page, competitor_pages)
        gap_scores["heading_gap"] = heading_result["score"]

        schema_result = self._schema_gap(page, competitor_pages)
        gap_scores["schema_gap"] = schema_result["score"]

        link_result = self._link_gap(page, competitor_pages)
        gap_scores["internal_link_gap"] = link_result["score"]

        trust_result = self._trust_gap(page, competitor_pages)
        gap_scores["trust_signal_gap"] = trust_result["score"]

        freshness_result = self._freshness_gap(page, competitor_pages)
        gap_scores["content_freshness"] = freshness_result["score"]

        media_result = self._media_gap(page, competitor_pages)
        gap_scores["media_usage"] = media_result["score"]

        table_list_result = self._table_list_gap(page, competitor_pages)
        gap_scores["tables_and_lists"] = table_list_result["score"]

        stats_result = self._stats_gap(page, competitor_pages)
        gap_scores["statistics_and_citations"] = stats_result["score"]

        overall = round(sum(gap_scores.values()) / len(gap_scores), 2) if gap_scores else 0.0

        comp_summary = self._competitor_summary(competitor_pages)
        action_plan = self._build_action_plan(gap_scores, topic_result, keyword_result, entity_result, heading_result, schema_result, trust_result, media_result)
        winning = self._winning_opportunities(topic_result, keyword_result, entity_result, heading_result, schema_result, media_result)

        return {
            "url": url,
            "competitor_count": c_count,
            "overall_gap_score": overall,
            "gap_analyses": {
                "topic_coverage": topic_result,
                "keyword_gap": keyword_result,
                "entity_gap": entity_result,
                "faq_gap": faq_result,
                "heading_gap": heading_result,
                "schema_gap": schema_result,
                "internal_link_gap": link_result,
                "trust_signal_gap": trust_result,
                "content_freshness": freshness_result,
                "media_usage": media_result,
                "tables_and_lists": table_list_result,
                "statistics_and_citations": stats_result,
            },
            "competitor_summary": comp_summary,
            "action_plan": action_plan,
            "winning_opportunities": winning,
        }

    def _topic_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_text = page.get("title", "") + " " + page.get("content_text", "")
        your_topics = list(dict.fromkeys(_tokenize(your_text)))

        comp_texts = [c.get("title", "") + " " + c.get("content_text", "") for c in competitors]
        comp_topics = _build_word_freq(comp_texts)
        your_freq = Counter(_tokenize(your_text))

        common_threshold = max(1, len(competitors) // 2)
        competitor_common = {w for w, c in comp_topics.items() if c >= common_threshold}

        your_set = set(your_topics)
        missing = sorted(competitor_common - your_set, key=lambda w: comp_topics[w], reverse=True)[:30]
        unique = sorted(your_set - competitor_common - set(missing))[:20]

        if not competitor_common:
            score = 80.0
        else:
            overlap = len(your_set & competitor_common)
            score = round((overlap / len(competitor_common)) * 100, 2) if competitor_common else 80.0

        rec = ""
        if missing:
            rec = f"Add these topics competitors cover: {', '.join(missing[:5])}"
        elif unique:
            rec = f"You have unique angles ({', '.join(unique[:3])}). Leverage them for differentiation."
        else:
            rec = "Topic coverage is strong. Look for deeper subtopics."

        return {
            "your_topics": your_topics[:50],
            "competitor_topics": [w for w, _ in comp_topics.most_common(50)],
            "missing_topics": missing,
            "unique_topics": unique,
            "score": score,
            "recommendation": rec,
        }

    def _keyword_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_title_words = set(_extract_title_words(page.get("title", "")))
        your_content_words = set(_tokenize(page.get("content_text", "")))
        your_all = your_title_words | your_content_words

        comp_title_words: Counter = Counter()
        comp_content_words: Counter = Counter()
        for c in competitors:
            comp_title_words.update(_extract_title_words(c.get("title", "")))
            comp_content_words.update(_tokenize(c.get("content_text", "")))

        c_count = max(len(competitors), 1)
        title_threshold = max(1, c_count // 3)
        content_threshold = max(1, c_count // 2)

        frequent_comp = set()
        for w, cnt in comp_title_words.items():
            if cnt >= title_threshold:
                frequent_comp.add(w)
        for w, cnt in comp_content_words.items():
            if cnt >= content_threshold:
                frequent_comp.add(w)

        missing = sorted(frequent_comp - your_all)

        opportunities = []
        for kw in missing:
            tc = comp_title_words.get(kw, 0)
            cc = comp_content_words.get(kw, 0)
            total = tc + cc
            difficulty = _compute_difficulty(your_all & {kw}.__len__() if kw in your_all else 0, total)
            opportunities.append({
                "keyword": kw,
                "competitor_count": total,
                "difficulty": difficulty,
            })
        opportunities.sort(key=lambda x: x["competitor_count"], reverse=True)
        opportunities = opportunities[:30]

        if not frequent_comp:
            score = 75.0
        else:
            overlap = len(your_all & frequent_comp)
            score = round((overlap / len(frequent_comp)) * 100, 2)

        return {
            "your_keywords": sorted(your_all)[:50],
            "competitor_keywords": sorted(frequent_comp)[:50],
            "missing_keywords": missing[:50],
            "keyword_opportunities": opportunities,
            "score": score,
        }

    def _entity_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_entities = _extract_entities(page.get("title", "") + " " + page.get("content_text", ""))

        comp_entities_counter: Counter = Counter()
        for c in competitors:
            ents = _extract_entities(c.get("title", "") + " " + c.get("content_text", ""))
            comp_entities_counter.update(ents)

        c_count = max(len(competitors), 1)
        threshold = max(1, c_count // 3)
        frequent = {e for e, cnt in comp_entities_counter.items() if cnt >= threshold}

        your_set = set(your_entities)
        missing_list = sorted(frequent - your_set, key=lambda e: comp_entities_counter[e], reverse=True)[:20]

        missing_entities = []
        for e in missing_list:
            e_lower = e.lower()
            etype = "organization" if e[0].isupper() and " " not in e else "concept"
            if any(w in e_lower for w in ("inc", "llc", "corp", "company", "group")):
                etype = "organization"
            elif any(w in e_lower for w in ("framework", "method", "strategy", "model", "approach")):
                etype = "concept"
            elif any(w in e_lower for w in ("report", "study", "survey")):
                etype = "reference"
            importance = "high" if comp_entities_counter[e] >= c_count // 2 else "medium"
            missing_entities.append({"entity": e, "type": etype, "importance": importance})

        if not frequent:
            score = 75.0
        else:
            overlap = len(your_set & frequent)
            score = round((overlap / len(frequent)) * 100, 2)

        return {
            "your_entities": your_entities[:30],
            "competitor_entities": sorted(frequent)[:30],
            "missing_entities": missing_entities,
            "score": score,
        }

    def _faq_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_html = page.get("html_raw", "") + " " + page.get("content_text", "")
        your_faq_count = _count_questions(your_html)

        comp_faq_counts = []
        for c in competitors:
            c_html = c.get("html_raw", "") + " " + c.get("content_text", "")
            comp_faq_counts.append(_count_questions(c_html))

        avg_comp_faqs = round(sum(comp_faq_counts) / len(comp_faq_counts), 1) if comp_faq_counts else 0

        missing_faqs = []
        for c in competitors:
            c_html = c.get("html_raw", "") + " " + c.get("content_text", "")
            c_headings = _heading_structure(c.get("html_raw", ""))
            for h in c_headings:
                if "?" in h["text"]:
                    missing_faqs.append({"question": h["text"], "competitor_has": True})

        your_headings = _heading_structure(page.get("html_raw", ""))
        your_questions = {h["text"] for h in your_headings if "?" in h["text"]}
        missing_faqs = [f for f in missing_faqs if f["question"] not in your_questions]
        seen = set()
        unique_missing = []
        for f in missing_faqs:
            if f["question"] not in seen:
                seen.add(f["question"])
                unique_missing.append(f)
        missing_faqs = unique_missing[:15]

        if avg_comp_faqs == 0:
            score = 80.0
        else:
            score = round(min(100, (your_faq_count / max(avg_comp_faqs, 1)) * 100), 2)

        return {
            "your_faqs": your_faq_count,
            "competitor_faqs": avg_comp_faqs,
            "missing_faqs": missing_faqs,
            "score": score,
        }

    def _heading_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_headings = _heading_structure(page.get("html_raw", ""))
        your_pattern = _heading_pattern(your_headings)

        comp_patterns: list[list[str]] = []
        all_h2_texts: Counter = Counter()
        all_h3_texts: Counter = Counter()
        for c in competitors:
            ch = _heading_structure(c.get("html_raw", ""))
            comp_patterns.append(_heading_pattern(ch))
            for h in ch:
                text = h["text"][:60].lower()
                if h["level"] == "h2":
                    all_h2_texts.update([text])
                elif h["level"] == "h3":
                    all_h3_texts.update([text])

        your_levels = Counter(h["level"] for h in your_headings)
        comp_level_totals: Counter = Counter()
        for cp in comp_patterns:
            for item in cp:
                level = item.split(":")[0]
                comp_level_totals[level] += 1

        c_count = max(len(competitors), 1)
        missing_types = []
        for level in ["h2", "h3", "h4"]:
            if your_levels.get(level, 0) < comp_level_totals.get(level, 0) / c_count:
                missing_types.append(level)

        suggested = []
        for h2_text, cnt in all_h2_texts.most_common(10):
            if cnt >= c_count // 3:
                suggested.append(f"H2: {h2_text.title()}")
        for h3_text, cnt in all_h3_texts.most_common(10):
            if cnt >= c_count // 3:
                suggested.append(f"H3: {h3_text.title()}")

        comp_headings_flat = [item for sublist in comp_patterns for item in sublist]
        your_set = set(your_pattern)
        comp_set = set(comp_headings_flat)
        overlap = len(your_set & comp_set)
        total_unique = len(comp_set) | 1
        score = round((overlap / total_unique) * 100, 2) if total_unique else 70.0

        return {
            "your_headings": your_pattern[:30],
            "competitor_heading_patterns": comp_headings_flat[:30],
            "missing_heading_types": missing_types,
            "suggested_headings": suggested[:20],
            "score": score,
        }

    def _schema_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_schemas = _schema_types(page.get("html_raw", ""))

        comp_schema_counter: Counter = Counter()
        for c in competitors:
            comp_schema_counter.update(_schema_types(c.get("html_raw", "")))

        c_count = max(len(competitors), 1)
        threshold = max(1, c_count // 3)
        frequent = {s for s, cnt in comp_schema_counter.items() if cnt >= threshold}

        your_set = set(your_schemas)
        missing = sorted(frequent - your_set)

        if not frequent:
            score = 80.0
        else:
            overlap = len(your_set & frequent)
            score = round((overlap / len(frequent)) * 100, 2)

        return {
            "your_schemas": your_schemas,
            "competitor_schemas": sorted(frequent),
            "missing_schemas": missing,
            "score": score,
        }

    def _link_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_links = len(page.get("links_internal", []) if isinstance(page.get("links_internal"), list) else [])

        comp_link_counts = []
        for c in competitors:
            links = c.get("links_internal", [])
            if isinstance(links, list):
                comp_link_counts.append(len(links))
            else:
                comp_link_counts.append(0)

        avg_links = round(sum(comp_link_counts) / len(comp_link_counts), 1) if comp_link_counts else 0
        missing = max(0, round(avg_links - your_links))

        if avg_links == 0:
            score = 80.0
        else:
            score = round(min(100, (your_links / avg_links) * 100), 2)

        return {
            "your_links": your_links,
            "competitor_avg_links": avg_links,
            "missing_internal_links": missing,
            "score": score,
        }

    def _trust_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_signals = _detect_trust_signals(page)

        comp_signal_counter: Counter = Counter()
        for c in competitors:
            comp_signal_counter.update(_detect_trust_signals(c))

        c_count = max(len(competitors), 1)
        threshold = max(1, c_count // 3)
        frequent = {s for s, cnt in comp_signal_counter.items() if cnt >= threshold}

        your_set = set(your_signals)
        missing = sorted(frequent - your_set)

        if not frequent:
            score = 75.0
        else:
            overlap = len(your_set & frequent)
            score = round((overlap / len(frequent)) * 100, 2)

        return {
            "your_signals": your_signals,
            "competitor_signals": sorted(frequent),
            "missing_signals": missing,
            "score": score,
        }

    def _freshness_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_freshness = _detect_freshness(page)

        comp_freshness_list = [_detect_freshness(c) for c in competitors]
        valid_years = [int(f) for f in comp_freshness_list if f != "unknown"]
        avg_freshness = str(max(valid_years)) if valid_years else "unknown"

        if your_freshness == "unknown":
            gap = "missing year references"
            score = 30.0
        elif avg_freshness == "unknown":
            gap = "no gap detected"
            score = 80.0
        else:
            diff = int(avg_freshness) - int(your_freshness)
            if diff <= 0:
                gap = "up to date"
                score = 95.0
            elif diff == 1:
                gap = "1 year behind"
                score = 60.0
            else:
                gap = f"{diff} years behind"
                score = max(10, 60.0 - diff * 15)

        return {
            "your_freshness": your_freshness,
            "competitor_freshness": avg_freshness,
            "freshness_gap": gap,
            "score": round(score, 2),
        }

    def _media_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_images = _count_images(page.get("html_raw", ""))
        your_video = _has_video(page.get("html_raw", ""))

        comp_image_counts = [_count_images(c.get("html_raw", "")) for c in competitors]
        comp_videos = [_has_video(c.get("html_raw", "")) for c in competitors]

        avg_images = round(sum(comp_image_counts) / len(comp_image_counts), 1) if comp_image_counts else 0
        any_video = any(comp_videos)

        missing_media = []
        if your_images < avg_images:
            missing_media.append(f"Add ~{round(avg_images - your_images)} more images")
        if not your_video and any_video:
            missing_media.append("Add video content (competitors have videos)")
        if your_video and not any_video:
            pass

        if avg_images == 0 and not any_video:
            score = 75.0
        else:
            img_score = min(100, (your_images / max(avg_images, 1)) * 100) if avg_images > 0 else 100
            video_score = 100.0 if (your_video or not any_video) else 50.0
            score = round((img_score * 0.6 + video_score * 0.4), 2)

        return {
            "your_images": your_images,
            "competitor_avg_images": avg_images,
            "your_videos": your_video,
            "competitor_has_videos": any_video,
            "missing_media": missing_media,
            "score": score,
        }

    def _table_list_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_tables = _count_tables(page.get("html_raw", ""))
        your_lists = _count_lists(page.get("html_raw", ""))

        comp_tables = [_count_tables(c.get("html_raw", "")) for c in competitors]
        comp_lists = [_count_lists(c.get("html_raw", "")) for c in competitors]

        avg_tables = round(sum(comp_tables) / len(comp_tables), 1) if comp_tables else 0
        avg_lists = round(sum(comp_lists) / len(comp_lists), 1) if comp_lists else 0

        total_your = your_tables + your_lists
        total_avg = avg_tables + avg_lists

        if total_avg == 0:
            score = 75.0
        else:
            score = round(min(100, (total_your / max(total_avg, 1)) * 100), 2)

        return {
            "your_tables": your_tables,
            "your_lists": your_lists,
            "competitor_avg_tables": avg_tables,
            "competitor_avg_lists": avg_lists,
            "score": score,
        }

    def _stats_gap(self, page: dict, competitors: list[dict]) -> dict:
        your_text = page.get("content_text", "") + " " + page.get("html_raw", "")
        your_stats = _count_statistics(your_text)
        your_citations = _count_citations(your_text)

        comp_stats = []
        comp_citations = []
        for c in competitors:
            ct = c.get("content_text", "") + " " + c.get("html_raw", "")
            comp_stats.append(_count_statistics(ct))
            comp_citations.append(_count_citations(ct))

        avg_stats = round(sum(comp_stats) / len(comp_stats), 1) if comp_stats else 0
        avg_citations = round(sum(comp_citations) / len(comp_citations), 1) if comp_citations else 0

        total_your = your_stats + your_citations
        total_avg = avg_stats + avg_citations

        if total_avg == 0:
            score = 75.0
        else:
            score = round(min(100, (total_your / max(total_avg, 1)) * 100), 2)

        return {
            "your_statistics": your_stats,
            "your_citations": your_citations,
            "competitor_avg_statistics": avg_stats,
            "competitor_avg_citations": avg_citations,
            "score": score,
        }

    def _competitor_summary(self, competitors: list[dict]) -> list[dict]:
        summaries = []
        for c in competitors:
            url = c.get("url", "")
            wc = c.get("word_count", 0)
            html = c.get("html_raw", "")
            strengths = []
            weaknesses = []

            if wc > 1500:
                strengths.append(f"Comprehensive content ({wc} words)")
            elif wc < 500:
                weaknesses.append(f"Thin content ({wc} words)")

            img_count = _count_images(html)
            if img_count > 5:
                strengths.append(f"Rich media ({img_count} images)")
            elif img_count == 0:
                weaknesses.append("No images")

            if _has_video(html):
                strengths.append("Includes video content")

            schemas = _schema_types(html)
            if schemas:
                strengths.append(f"Structured data: {', '.join(schemas[:3])}")
            else:
                weaknesses.append("No structured data")

            if _detect_trust_signals(c):
                strengths.append(f"Trust signals: {', '.join(_detect_trust_signals(c))}")

            faqs = _count_questions(c.get("content_text", "") + " " + html)
            if faqs > 3:
                strengths.append(f"FAQ-rich ({faqs} questions)")

            links = c.get("links_internal", [])
            if isinstance(links, list) and len(links) > 20:
                strengths.append(f"Strong internal linking ({len(links)} links)")

            tables = _count_tables(html)
            lists_count = _count_lists(html)
            if tables > 2:
                strengths.append(f"Data presentation ({tables} tables)")
            if lists_count > 3:
                strengths.append(f"Scannable content ({lists_count} lists)")

            if not strengths:
                strengths.append("Baseline content present")
            if not weaknesses:
                weaknesses.append("No obvious weaknesses detected")

            summaries.append({
                "url": url,
                "word_count": wc,
                "strengths": strengths,
                "weaknesses": weaknesses,
            })
        return summaries

    def _build_action_plan(
        self,
        gap_scores: dict[str, float],
        topic_result: dict,
        keyword_result: dict,
        entity_result: dict,
        heading_result: dict,
        schema_result: dict,
        trust_result: dict,
        media_result: dict,
    ) -> list[dict]:
        actions: list[dict] = []

        if gap_scores.get("keyword_gap", 100) < 70:
            kw_opps = keyword_result.get("keyword_opportunities", [])[:5]
            kw_list = ", ".join(k["keyword"] for k in kw_opps) if kw_opps else "competitor keywords"
            actions.append({
                "action": f"Integrate missing keywords into content: {kw_list}",
                "priority": "high",
                "estimated_impact": "high",
                "effort": "medium",
            })

        if gap_scores.get("topic_coverage", 100) < 70:
            missing = topic_result.get("missing_topics", [])[:5]
            actions.append({
                "action": f"Expand content to cover missing topics: {', '.join(missing)}",
                "priority": "high",
                "estimated_impact": "high",
                "effort": "high",
            })

        if gap_scores.get("entity_gap", 100) < 70:
            ents = entity_result.get("missing_entities", [])[:3]
            ent_names = ", ".join(e["entity"] for e in ents) if ents else "key entities"
            actions.append({
                "action": f"Include missing entities for topical authority: {ent_names}",
                "priority": "medium",
                "estimated_impact": "medium",
                "effort": "low",
            })

        if gap_scores.get("schema_gap", 100) < 70:
            schemas = schema_result.get("missing_schemas", [])
            actions.append({
                "action": f"Implement missing schema markup: {', '.join(schemas)}",
                "priority": "medium",
                "estimated_impact": "medium",
                "effort": "low",
            })

        if gap_scores.get("heading_gap", 100) < 60:
            suggestions = heading_result.get("suggested_headings", [])[:3]
            actions.append({
                "action": f"Restructure headings with competitor patterns: {'; '.join(suggestions)}",
                "priority": "medium",
                "estimated_impact": "medium",
                "effort": "low",
            })

        if gap_scores.get("trust_signal_gap", 100) < 70:
            missing_sigs = trust_result.get("missing_signals", [])
            actions.append({
                "action": f"Add trust signals: {', '.join(missing_sigs)}",
                "priority": "medium",
                "estimated_impact": "medium",
                "effort": "low",
            })

        if gap_scores.get("media_usage", 100) < 60:
            missing_m = media_result.get("missing_media", [])
            actions.append({
                "action": f"Enhance media usage: {'; '.join(missing_m)}",
                "priority": "low",
                "estimated_impact": "medium",
                "effort": "medium",
            })

        if gap_scores.get("statistics_and_citations", 100) < 60:
            actions.append({
                "action": "Add more statistics and source citations to boost credibility",
                "priority": "medium",
                "estimated_impact": "medium",
                "effort": "medium",
            })

        if gap_scores.get("tables_and_lists", 100) < 60:
            actions.append({
                "action": "Add tables and lists to improve scannability and data presentation",
                "priority": "low",
                "estimated_impact": "low",
                "effort": "low",
            })

        if gap_scores.get("content_freshness", 100) < 50:
            actions.append({
                "action": "Update content with current year references and fresh data",
                "priority": "high",
                "estimated_impact": "high",
                "effort": "low",
            })

        if gap_scores.get("internal_link_gap", 100) < 60:
            actions.append({
                "action": "Add more internal links to related content on your site",
                "priority": "medium",
                "estimated_impact": "medium",
                "effort": "low",
            })

        actions.sort(key=lambda a: {"high": 0, "medium": 1, "low": 2}.get(a["priority"], 3))
        return actions[:15]

    def _winning_opportunities(
        self,
        topic_result: dict,
        keyword_result: dict,
        entity_result: dict,
        heading_result: dict,
        schema_result: dict,
        media_result: dict,
    ) -> list[dict]:
        opps: list[dict] = []

        unique_topics = topic_result.get("unique_topics", [])[:5]
        if unique_topics:
            opps.append({
                "opportunity": "Leverage unique topic coverage",
                "why": f"You cover topics competitors don't: {', '.join(unique_topics[:3])}",
                "how": "Create dedicated content clusters around these unique angles to establish niche authority",
            })

        missing_kws = keyword_result.get("keyword_opportunities", [])[:5]
        easy_kws = [k for k in missing_kws if k["difficulty"] == "easy"]
        if easy_kws:
            kw_list = ", ".join(k["keyword"] for k in easy_kws[:3])
            opps.append({
                "opportunity": "Capture low-difficulty keyword gaps",
                "why": f"These keywords are used by multiple competitors but missing from your content: {kw_list}",
                "how": "Integrate these keywords naturally into existing headings and body paragraphs",
            })

        missing_entities = entity_result.get("missing_entities", [])[:3]
        high_imp = [e for e in missing_entities if e["importance"] == "high"]
        if high_imp:
            ent_list = ", ".join(e["entity"] for e in high_imp[:3])
            opps.append({
                "opportunity": "Add high-importance missing entities",
                "why": f"Competitors consistently reference: {ent_list}",
                "how": "Mention these entities in context with proper attribution to build topical authority",
            })

        missing_schemas = schema_result.get("missing_schemas", [])[:3]
        if missing_schemas:
            opps.append({
                "opportunity": "Implement missing structured data",
                "why": f"Competitors use {', '.join(missing_schemas)} schema but you don't",
                "how": "Add JSON-LD structured data for these types to improve rich snippet eligibility",
            })

        missing_headings = heading_result.get("suggested_headings", [])[:3]
        if missing_headings:
            opps.append({
                "opportunity": "Match competitor heading structure",
                "why": "Competitors use heading patterns you're missing",
                "how": f"Add sections with these headings: {'; '.join(missing_headings)}",
            })

        if media_result.get("your_videos") is False and media_result.get("competitor_has_videos"):
            opps.append({
                "opportunity": "Add video content",
                "why": "Competitors have embedded video content but you don't",
                "how": "Create or embed relevant video content to increase engagement and time on page",
            })

        return opps[:10]
