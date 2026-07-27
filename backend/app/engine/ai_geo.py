"""AI/GEO Engine — LLM/RAG Extraction Simulation (80+ signals)"""
import re
import json
import math

_WORD_RE = re.compile(r'\b\w+\b')
_SENTENCE_RE = re.compile(r'[^.!?]+[.!?]+')
_PARA_RE = re.compile(r'\n\s*\n')
_STATISTIC_RE = re.compile(r'\d+\.?\d*\s*%|\$\d+|\d+\s*(?:million|billion|thousand|k\b|m\b)', re.I)
_SOURCE_RE = re.compile(r'source:|according to|research by|study by|published in|journal of|doi:|isbn:|et al\.', re.I)
_QUOTE_RE = re.compile(r'["""].*?["""]|said:|stated:|noted:|explained:', re.I)
_ENTITY_RE = re.compile(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b')
_DEFINITION_RE = re.compile(r'(?:is|are|refers to|means|defined as)\s+(?:a|an|the)?\s*\w', re.I)
_PRONOUN_RE = re.compile(r'\b(?:this|it|they|that|these|those|them)\b', re.I)
_BLUF_RE = re.compile(r'^(.{20,200})')
_QUESTION_RE = re.compile(r'[^.!?]*\?')
_LIST_RE = re.compile(r'[-•*]\s|^\d+\.\s', re.M)
_TABLE_RE = re.compile(r'<table|^\|.*\|', re.M|re.I)
_COMPARISON_RE = re.compile(r'\b(?:compared to|versus|vs\.?|better than|worse than|more than|less than|unlike|similar to)\b', re.I)
_STEP_RE = re.compile(r'(?:step\s+\d|first|second|third|finally|to\s+do\s+this|here\'s\s+how|follow\s+these)', re.I)
_NUMBER_RE = re.compile(r'\b\d+(?:\.\d+)?(?:\s*%|\s*x|\s*\+)?\b')
_AMBIGUOUS_RE = re.compile(r'(?<=[.]\s)(?:This|It|They|That)\s', re.M)


class AIGeoEngine:
    def analyze(self, page):
        text = page.content_text or ""
        wc = page.word_count or 0
        html = page.html_raw or ""
        title = page.title or ""
        desc = page.meta_description or ""
        h1 = page.h1 or ""
        url = page.url or ""
        schema = page.schema_markup or []
        images = page.images or []
        links_ext = page.links_external or []
        links_int = page.links_internal or []

        sigs = []
        issues = []

        sigs += self._citation_readiness(text, wc, title, desc, h1, links_ext, schema)
        sigs += self._bluf_analysis(text, title, h1, desc)
        sigs += self._rag_extraction(text, wc)
        sigs += self._entity_analysis(text, title, h1, wc)
        sigs += self._answer_engine(text, wc, schema, html)
        sigs += self._platform_specific(text, wc, schema, links_ext, html)

        cat_scores = {}
        for cat in ["citation_readiness", "bluf_analysis", "rag_extraction", "entity_analysis", "answer_engine", "platform_specific"]:
            cat_sigs = [s for s in sigs if s["category"] == cat]
            if cat_sigs:
                passes = sum(1 for s in cat_sigs if s["status"] == "pass")
                warns = sum(1 for s in cat_sigs if s["status"] == "warn")
                total = len(cat_sigs)
                cat_scores[cat] = round((passes * 100 + warns * 50) / max(total, 1), 1)
            else:
                cat_scores[cat] = 100.0

        weights = {"citation_readiness": 0.25, "bluf_analysis": 0.20, "rag_extraction": 0.20, "entity_analysis": 0.15, "answer_engine": 0.10, "platform_specific": 0.10}
        geo_score = sum(cat_scores.get(c, 100) * w for c, w in weights.items())

        platform_scores = self._platform_scores(sigs, wc, schema, links_ext, text)

        why_not = self._why_not_ranking(text, wc, title, schema, links_ext, images)

        issues = self._generate_issues(sigs, page)

        return {
            "geo_score": round(geo_score, 1),
            "aeo_score": round(sum(platform_scores.values()) / max(len(platform_scores), 1), 1),
            "signals_checked": len(sigs),
            "platform_scores": platform_scores,
            "category_scores": cat_scores,
            "diagnostics": {
                cat: [s for s in sigs if s["category"] == cat]
                for cat in ["citation_readiness", "bluf_analysis", "rag_extraction", "entity_analysis", "answer_engine", "platform_specific"]
            },
            "issues": issues,
            "why_not_ranking": why_not,
        }

    def _sig(self, category, name, status, value, expected, detail):
        return {"category": category, "name": name, "status": status, "value": value, "expected": expected, "detail": detail}

    def _citation_readiness(self, text, wc, title, desc, h1, links_ext, schema):
        s = []
        first_200 = " ".join(text.split()[:40])

        if _STATISTIC_RE.search(first_200):
            s.append(self._sig("citation_readiness", "first_para_stats", "pass", "present", "present", "Statistics in opening paragraph"))
        else:
            s.append(self._sig("citation_readiness", "first_para_stats", "warn", "missing", "present", "No statistics in first paragraph"))

        pronouns = _PRONOUN_RE.findall(first_200)
        if len(pronouns) > 1:
            s.append(self._sig("citation_readiness", "pronoun_issues", "warn", f"{len(pronouns)} ambiguous pronouns", "0", f"Ambiguous pronouns in opening: {', '.join(set(pronouns[:3]))}"))
        else:
            s.append(self._sig("citation_readiness", "pronoun_issues", "pass", "clean", "clean", "No ambiguous pronouns in opening"))

        if _SOURCE_RE.search(text):
            s.append(self._sig("citation_readiness", "has_sources", "pass", "present", "present", "Source citations found in content"))
        else:
            s.append(self._sig("citation_readiness", "has_sources", "warn", "missing", "present", "No source citations found"))

        if _QUOTE_RE.search(text):
            s.append(self._sig("citation_readiness", "has_quotes", "pass", "present", "present", "Expert quotes/references present"))
        else:
            s.append(self._sig("citation_readiness", "has_quotes", "warn", "missing", "present", "No expert quotes found"))

        if _STATISTIC_RE.search(text):
            s.append(self._sig("citation_readiness", "has_statistics", "pass", "present", "present", "Statistics and data points present"))
        else:
            s.append(self._sig("citation_readiness", "has_statistics", "warn", "missing", "present", "No statistics found"))

        entities = _ENTITY_RE.findall(text)
        unique_entities = set(e for e in entities if len(e) > 3)
        if len(unique_entities) >= 5:
            s.append(self._sig("citation_readiness", "has_entities", "pass", f"{len(unique_entities)} entities", ">=5", f"Rich entity presence ({len(unique_entities)} unique)"))
        else:
            s.append(self._sig("citation_readiness", "has_entities", "warn", f"{len(unique_entities)} entities", ">=5", f"Low entity count ({len(unique_entities)})"))

        if _DEFINITION_RE.search(text[:1000]):
            s.append(self._sig("citation_readiness", "has_definitions", "pass", "present", "present", "Definition-style sentences present"))
        else:
            s.append(self._sig("citation_readiness", "has_definitions", "warn", "missing", "present", "No definition-style sentences found"))

        numbers = _NUMBER_RE.findall(text)
        specific_nums = [n for n in numbers if len(n) > 1]
        if len(specific_nums) >= 3:
            s.append(self._sig("citation_readiness", "specific_numbers", "pass", f"{len(specific_nums)}", ">=3", "Multiple specific numbers present"))
        else:
            s.append(self._sig("citation_readiness", "specific_numbers", "warn", f"{len(specific_nums)}", ">=3", "Few specific numbers"))

        if len(links_ext) >= 3:
            s.append(self._sig("citation_readiness", "external_references", "pass", f"{len(links_ext)}", ">=3", f"{len(links_ext)} external references"))
        else:
            s.append(self._sig("citation_readiness", "external_references", "warn", f"{len(links_ext)}", ">=3", "Few external references"))

        has_original = bool(re.search(r'(?:our|the)\s+(?:research|study|analysis|data|survey|report)\s+(?:found|shows|reveals|indicates)', text, re.I))
        if has_original:
            s.append(self._sig("citation_readiness", "original_research", "pass", "present", "present", "Original research/data present"))
        else:
            s.append(self._sig("citation_readiness", "original_research", "warn", "missing", "present", "No original research mentioned"))

        has_citations = bool(re.search(r'\[\d+\]|\(\d{4}\)|et al\.|doi:|isbn:', text, re.I))
        if has_citations:
            s.append(self._sig("citation_readiness", "formal_citations", "pass", "present", "present", "Formal citation format found"))
        else:
            s.append(self._sig("citation_readiness", "formal_citations", "warn", "missing", "present", "No formal citation format"))

        if wc >= 1500:
            s.append(self._sig("citation_readiness", "content_depth", "pass", wc, ">=1500", f"Comprehensive content ({wc} words)"))
        elif wc >= 800:
            s.append(self._sig("citation_readiness", "content_depth", "warn", wc, ">=1500", f"Moderate content ({wc} words)"))
        else:
            s.append(self._sig("citation_readiness", "content_depth", "fail", wc, ">=1500", f"Thin content ({wc} words) for citation extraction"))

        return s

    def _bluf_analysis(self, text, title, h1, desc):
        s = []
        first_60w = " ".join(text.split()[:60])
        first_100w = " ".join(text.split()[:100])

        has_direct_answer = bool(re.search(r'(?:is|are|provides|offers|delivers|helps|enables|allows)\s+(?:a|an|the|you|your|businesses)', first_60w, re.I))
        if has_direct_answer:
            s.append(self._sig("bluf_analysis", "direct_answer_first", "pass", "present", "present", "Direct answer in first 60 words"))
        else:
            s.append(self._sig("bluf_analysis", "direct_answer_first", "warn", "missing", "present", "No direct answer in first 60 words"))

        has_definition_in_h1 = bool(re.search(r'(?:is|are|what|how|why|guide|tips|best)', (h1 or "").lower()))
        if has_definition_in_h1:
            s.append(self._sig("bluf_analysis", "h1_intent_match", "pass", "matching", "matching", "H1 matches search intent"))
        else:
            s.append(self._sig("bluf_analysis", "h1_intent_match", "warn", "weak", "matching", "H1 may not match search intent"))

        no_welcome = not bool(re.search(r'welcome\s+(?:to|on|back)', first_60w, re.I))
        if no_welcome:
            s.append(self._sig("bluf_analysis", "no_preamble", "pass", "clean", "no preamble", "No preamble/fluff in opening"))
        else:
            s.append(self._sig("bluf_analysis", "no_preamble", "warn", "has preamble", "no preamble", "Contains preamble like 'Welcome to...'"))

        stat_in_opening = bool(_STATISTIC_RE.search(first_100w))
        if stat_in_opening:
            s.append(self._sig("bluf_analysis", "data_in_opening", "pass", "present", "present", "Data/statistics in opening"))
        else:
            s.append(self._sig("bluf_analysis", "data_in_opening", "warn", "missing", "present", "No data in opening paragraph"))

        if len(first_60w.split()) >= 15:
            s.append(self._sig("bluf_analysis", "substantial_opening", "pass", f"{len(first_60w.split())} words", ">=15", "Opening paragraph has substance"))
        else:
            s.append(self._sig("bluf_analysis", "substantial_opening", "warn", f"{len(first_60w.split())} words", ">=15", "Opening paragraph is very short"))

        first_para_200 = " ".join(text.split()[:40])
        has_claim = bool(re.search(r'(?:best|leading|most|number one|top|trusted|proven)', first_para_200, re.I))
        if has_claim:
            s.append(self._sig("bluf_analysis", "value_proposition", "pass", "present", "present", "Value proposition in opening"))
        else:
            s.append(self._sig("bluf_analysis", "value_proposition", "warn", "missing", "present", "No clear value proposition in opening"))

        sentences = _SENTENCE_RE.findall(first_100w)
        if sentences and len(sentences[0].split()) <= 20:
            s.append(self._sig("bluf_analysis", "concise_first_sentence", "pass", f"{len(sentences[0].split())} words", "<=20", "First sentence is concise"))
        elif sentences:
            s.append(self._sig("bluf_analysis", "concise_first_sentence", "warn", f"{len(sentences[0].split())} words", "<=20", "First sentence is too long"))
        else:
            s.append(self._sig("bluf_analysis", "concise_first_sentence", "warn", "no sentences", "<=20", "Could not parse first sentence"))

        return s

    def _rag_extraction(self, text, wc):
        s = []
        paras = [p.strip() for p in _PARA_RE.split(text) if len(p.strip()) > 30]

        ambiguous_paras = 0
        for p in paras[:20]:
            sentences = _SENTENCE_RE.findall(p)
            for sent in sentences[1:3]:
                if _AMBIGUOUS_RE.search(". " + sent):
                    ambiguous_paras += 1
                    break

        if ambiguous_paras == 0:
            s.append(self._sig("rag_extraction", "self_contained_paras", "pass", "all clean", "all clean", "All paragraphs are self-contained"))
        else:
            s.append(self._sig("rag_extraction", "self_contained_paras", "warn", f"{ambiguous_paras} ambiguous", "0", f"{ambiguous_paras} paragraphs have ambiguous pronouns"))

        lists = bool(_LIST_RE.search(text))
        if lists:
            s.append(self._sig("rag_extraction", "has_lists", "pass", "present", "present", "Lists present for RAG extraction"))
        else:
            s.append(self._sig("rag_extraction", "has_lists", "warn", "missing", "present", "No lists found"))

        tables = bool(_TABLE_RE.search(text))
        if tables:
            s.append(self._sig("rag_extraction", "has_tables", "pass", "present", "present", "Tables present for structured extraction"))
        else:
            s.append(self._sig("rag_extraction", "has_tables", "warn", "missing", "present", "No tables found"))

        vague_words = re.findall(r'\b(?:some|many|various|several|a lot|quite a few|numerous)\b', text, re.I)
        if len(vague_words) <= 3:
            s.append(self._sig("rag_extraction", "no_vague_quantifiers", "pass", f"{len(vague_words)} vague words", "<=3", "Minimal vague quantifiers"))
        else:
            s.append(self._sig("rag_extraction", "no_vague_quantifiers", "warn", f"{len(vague_words)} vague words", "<=3", f"Too many vague quantifiers: {', '.join(set(vague_words[:5]))}"))

        examples = bool(re.search(r'(?:for example|for instance|such as|e\.g\.|like|specifically|including)', text, re.I))
        if examples:
            s.append(self._sig("rag_extraction", "has_examples", "pass", "present", "present", "Examples present for context"))
        else:
            s.append(self._sig("rag_extraction", "has_examples", "warn", "missing", "present", "No examples found"))

        steps = bool(_STEP_RE.search(text))
        if steps:
            s.append(self._sig("rag_extraction", "has_steps", "pass", "present", "present", "Step-by-step process found"))
        else:
            s.append(self._sig("rag_extraction", "has_steps", "warn", "missing", "present", "No step-by-step content found"))

        comparisons = bool(_COMPARISON_RE.search(text))
        if comparisons:
            s.append(self._sig("rag_extraction", "has_comparisons", "pass", "present", "present", "Comparative content found"))
        else:
            s.append(self._sig("rag_extraction", "has_comparisons", "warn", "missing", "present", "No comparative content"))

        avg_para_words = 0
        if paras:
            avg_para_words = sum(len(_WORD_RE.findall(p)) for p in paras) / len(paras)
        if 30 <= avg_para_words <= 100:
            s.append(self._sig("rag_extraction", "para_length_optimal", "pass", f"{avg_para_words:.0f} words", "30-100", "Optimal paragraph length for extraction"))
        elif avg_para_words > 150:
            s.append(self._sig("rag_extraction", "para_length_long", "warn", f"{avg_para_words:.0f} words", "30-100", "Paragraphs too long for clean extraction"))
        else:
            s.append(self._sig("rag_extraction", "para_length_short", "warn", f"{avg_para_words:.0f} words", "30-100", "Paragraphs may be too short"))

        topic_sentences = sum(1 for p in paras[:10] if p and p[0].isupper() and any(_WORD_RE.findall(p)[:3]))
        if topic_sentences >= len(paras[:10]) * 0.6:
            s.append(self._sig("rag_extraction", "topic_sentences", "pass", f"{topic_sentences}/{len(paras[:10])}", ">=60%", "Most paragraphs have topic sentences"))
        else:
            s.append(self._sig("rag_extraction", "topic_sentences", "warn", f"{topic_sentences}/{len(paras[:10])}", ">=60%", "Many paragraphs lack topic sentences"))

        return s

    def _entity_analysis(self, text, title, h1, wc):
        s = []
        entities = _ENTITY_RE.findall(text)
        unique = set(e for e in entities if len(e) > 3)

        title_entities = set(_ENTITY_RE.findall(title or "")) | set(_ENTITY_RE.findall(h1 or ""))
        title_entities = {e for e in title_entities if len(e) > 3}

        if title_entities:
            in_text = title_entities & unique
            coverage = len(in_text) / max(len(title_entities), 1)
            if coverage >= 0.8:
                s.append(self._sig("entity_analysis", "title_entity_coverage", "pass", f"{coverage:.0%}", ">=80%", "Title entities well-represented in content"))
            else:
                s.append(self._sig("entity_analysis", "title_entity_coverage", "warn", f"{coverage:.0%}", ">=80%", f"Only {coverage:.0%} of title entities in content"))
        else:
            s.append(self._sig("entity_analysis", "title_entity_coverage", "warn", "no entities", ">=80%", "No entities detected in title/H1"))

        if len(unique) >= 10:
            s.append(self._sig("entity_analysis", "entity_richness", "pass", f"{len(unique)}", ">=10", f"Rich entity presence ({len(unique)} unique)"))
        elif len(unique) >= 5:
            s.append(self._sig("entity_analysis", "entity_richness", "warn", f"{len(unique)}", ">=10", f"Moderate entity presence ({len(unique)})"))
        else:
            s.append(self._sig("entity_analysis", "entity_richness", "fail", f"{len(unique)}", ">=10", f"Very few entities ({len(unique)})"))

        primary_topic = (title or h1 or "").strip()
        if primary_topic:
            primary_words = set(_WORD_RE.findall(primary_topic.lower())) - {"the", "a", "an", "and", "or", "is", "are", "how", "what", "why"}
            content_lower = text.lower()
            found = sum(1 for w in primary_words if w in content_lower)
            density = found / max(len(primary_words), 1)
            if density >= 0.7:
                s.append(self._sig("entity_analysis", "primary_topic_coverage", "pass", f"{density:.0%}", ">=70%", "Primary topic well-covered"))
            else:
                s.append(self._sig("entity_analysis", "primary_topic_coverage", "warn", f"{density:.0%}", ">=70%", "Primary topic under-represented"))
        else:
            s.append(self._sig("entity_analysis", "primary_topic_coverage", "warn", "no topic", ">=70%", "No primary topic detected"))

        entity_freq = {}
        for e in entities:
            if len(e) > 3:
                entity_freq[e] = entity_freq.get(e, 0) + 1
        stuffed = [e for e, f in entity_freq.items() if f > wc * 0.02]
        if not stuffed:
            s.append(self._sig("entity_analysis", "entity_stuffing", "pass", "none", "none", "No keyword stuffing detected"))
        else:
            s.append(self._sig("entity_analysis", "entity_stuffing", "warn", f"{len(stuffed)} stuffed", "none", f"Possible stuffing: {', '.join(stuffed[:3])}"))

        brand_mentions = len(re.findall(r'\b(?:DataViCloud|DataviCloud)\b', text, re.I))
        if brand_mentions >= 2:
            s.append(self._sig("entity_analysis", "brand_mentions", "pass", brand_mentions, ">=2", f"Brand mentioned {brand_mentions} times"))
        elif brand_mentions >= 1:
            s.append(self._sig("entity_analysis", "brand_mentions", "warn", brand_mentions, ">=2", "Brand mentioned only once"))
        else:
            s.append(self._sig("entity_analysis", "brand_mentions", "warn", 0, ">=2", "Brand not mentioned in content"))

        return s

    def _answer_engine(self, text, wc, schema, html):
        s = []
        questions = _QUESTION_RE.findall(text)

        if len(questions) >= 3:
            s.append(self._sig("answer_engine", "question_coverage", "pass", f"{len(questions)}", ">=3", f"{len(questions)} questions addressed"))
        elif len(questions) >= 1:
            s.append(self._sig("answer_engine", "question_coverage", "warn", f"{len(questions)}", ">=3", "Very few questions addressed"))
        else:
            s.append(self._sig("answer_engine", "question_coverage", "fail", 0, ">=3", "No questions addressed in content"))

        types = [item.get("@type", "") for item in schema if isinstance(item, dict)]
        if "FAQPage" in types:
            s.append(self._sig("answer_engine", "faq_schema", "pass", "present", "present", "FAQPage schema present"))
        elif len(questions) >= 3:
            s.append(self._sig("answer_engine", "faq_schema", "warn", "missing", "present", f"{len(questions)} questions but no FAQPage schema"))
        else:
            s.append(self._sig("answer_engine", "faq_schema", "warn", "missing", "present", "No FAQPage schema"))

        if "HowTo" in types:
            s.append(self._sig("answer_engine", "howto_schema", "pass", "present", "present", "HowTo schema present"))
        elif bool(_STEP_RE.search(text)):
            s.append(self._sig("answer_engine", "howto_schema", "warn", "missing", "present", "Step-by-step content but no HowTo schema"))
        else:
            s.append(self._sig("answer_engine", "howto_schema", "warn", "missing", "present", "No HowTo schema"))

        concise_answers = 0
        for q in questions[:10]:
            q_clean = q.strip()
            after = text[text.find(q_clean) + len(q_clean):text.find(q_clean) + len(q_clean) + 300] if q_clean in text else ""
            if after:
                first_sent = _SENTENCE_RE.findall(after)
                if first_sent and len(first_sent[0].split()) <= 30:
                    concise_answers += 1
        if concise_answers >= 3:
            s.append(self._sig("answer_engine", "concise_answers", "pass", f"{concise_answers}", ">=3", f"{concise_answers} concise answers for featured snippets"))
        else:
            s.append(self._sig("answer_engine", "concise_answers", "warn", f"{concise_answers}", ">=3", "Few concise answers for featured snippets"))

        list_format = bool(_LIST_RE.search(text))
        if list_format:
            s.append(self._sig("answer_engine", "list_format", "pass", "present", "present", "List formatting present"))
        else:
            s.append(self._sig("answer_engine", "list_format", "warn", "missing", "present", "No list formatting"))

        comparison_tables = bool(_TABLE_RE.search(text))
        if comparison_tables:
            s.append(self._sig("answer_engine", "comparison_tables", "pass", "present", "present", "Comparison tables present"))
        else:
            s.append(self._sig("answer_engine", "comparison_tables", "warn", "missing", "present", "No comparison tables"))

        return s

    def _platform_specific(self, text, wc, schema, links_ext, html):
        s = []
        types = [item.get("@type", "") for item in schema if isinstance(item, dict)]

        has_clear_data = bool(_TABLE_RE.search(text)) or bool(re.search(r'\|.*\|', text))
        if has_clear_data:
            s.append(self._sig("platform_specific", "structured_data_for_llm", "pass", "present", "present", "Structured data (tables) for LLM extraction"))
        else:
            s.append(self._sig("platform_specific", "structured_data_for_llm", "warn", "missing", "present", "No structured tables for LLM extraction"))

        academic_sources = bool(_SOURCE_RE.search(text))
        if academic_sources:
            s.append(self._sig("platform_specific", "academic_references", "pass", "present", "present", "Academic/authority references present"))
        else:
            s.append(self._sig("platform_specific", "academic_references", "warn", "missing", "present", "No academic/authority references"))

        freshness = bool(re.search(r'\b202[0-9]\b', text))
        if freshness:
            s.append(self._sig("platform_specific", "freshness_signals", "pass", "present", "present", "Year references present (freshness signal)"))
        else:
            s.append(self._sig("platform_specific", "freshness_signals", "warn", "missing", "present", "No year/date references in content"))

        first_hand = bool(re.search(r'(?:we tested|our experience|in our|based on our|from our own|we found)', text, re.I))
        if first_hand:
            s.append(self._sig("platform_specific", "first_hand_experience", "pass", "present", "present", "First-hand experience signals present"))
        else:
            s.append(self._sig("platform_specific", "first_hand_experience", "warn", "missing", "present", "No first-hand experience signals"))

        balanced = bool(re.search(r'(?:however|on the other hand|alternatively|disadvantage|drawback|limitation|con)', text, re.I))
        if balanced:
            s.append(self._sig("platform_specific", "balanced_viewpoint", "pass", "present", "present", "Balanced viewpoint with alternatives"))
        else:
            s.append(self._sig("platform_specific", "balanced_viewpoint", "warn", "missing", "present", "No balanced viewpoint — may seem biased"))

        off_page_entities = len(links_ext)
        if off_page_entities >= 5:
            s.append(self._sig("platform_specific", "off_page_entity_mentions", "pass", f"{off_page_entities}", ">=5", "Good off-page entity references"))
        else:
            s.append(self._sig("platform_specific", "off_page_entity_mentions", "warn", f"{off_page_entities}", ">=5", "Few off-page entity references"))

        llms_txt = bool(re.search(r'llms[-.]txt', html, re.I))
        if llms_txt:
            s.append(self._sig("platform_specific", "llms_txt", "pass", "present", "present", "llms.txt reference found"))
        else:
            s.append(self._sig("platform_specific", "llms_txt", "warn", "missing", "present", "No llms.txt reference"))

        return s

    def _platform_scores(self, sigs, wc, schema, links_ext, text):
        scores = {}
        types = [item.get("@type", "") for item in schema if isinstance(item, dict)]
        pass_count = sum(1 for s in sigs if s["status"] == "pass")
        warn_count = sum(1 for s in sigs if s["status"] == "warn")
        total = max(len(sigs), 1)
        base = (pass_count * 100 + warn_count * 50) / total

        scores["chatgpt"] = min(100, base + (10 if any(t in types for t in ["Article", "FAQPage"]) else 0) + (5 if len(links_ext) >= 3 else 0))
        scores["perplexity"] = min(100, base + (10 if bool(_SOURCE_RE.search(text)) else 0) + (5 if bool(re.search(r'\[\d+\]|\(\d{4}\)', text)) else 0))
        scores["gemini"] = min(100, base + (10 if "FAQPage" in types else 0) + (5 if "HowTo" in types else 0))
        scores["claude"] = min(100, base + (5 if bool(_QUOTE_RE.search(text)) else 0) + (5 if wc >= 1500 else 0))
        scores["google_ai_overview"] = min(100, base + (10 if bool(_LIST_RE.search(text)) else 0) + (5 if bool(_TABLE_RE.search(text)) else 0))

        return {k: round(v, 1) for k, v in scores.items()}

    def _why_not_ranking(self, text, wc, title, schema, links_ext, images):
        reasons = []
        if wc < 600:
            reasons.append(f"Content too thin ({wc} words) — AI platforms prefer comprehensive content (1500+ words)")
        if not _SOURCE_RE.search(text):
            reasons.append("No source citations — AI platforms heavily weight cited, authoritative content")
        if not _STATISTIC_RE.search(text):
            reasons.append("No statistics or data points — AI extraction pipelines prioritize quantified claims")
        if not _QUOTE_RE.search(text):
            reasons.append("No expert quotes — AI platforms cite content with named expert perspectives")
        types = [item.get("@type", "") for item in schema if isinstance(item, dict)]
        if "FAQPage" not in types:
            reasons.append("No FAQPage schema — missing structured answers for AI question answering")
        if len(links_ext) < 3:
            reasons.append(f"Only {len(links_ext)} external references — AI platforms prefer content with rich citation networks")
        first_60w = " ".join(text.split()[:60])
        if not _DEFINITION_RE.search(first_60w):
            reasons.append("No clear definition in opening — AI platforms extract first-paragraph definitions")
        if not _LIST_RE.search(text):
            reasons.append("No lists in content — list-formatted content is more extractable by AI crawlers")
        return reasons

    def _generate_issues(self, sigs, page):
        issues = []
        counter = 0
        critical_map = {
            "pronoun_issues": ("HIGH", "opening paragraph", "Replace ambiguous pronouns (this, it, they) with specific nouns in the first paragraph"),
            "has_statistics": ("HIGH", "content", "Add specific statistics with sources (e.g., '47% of enterprises report...')"),
            "has_sources": ("HIGH", "content", "Add named sources and citations (e.g., 'According to Gartner research...')"),
            "has_quotes": ("MEDIUM", "content", "Add expert quotes to establish authority for AI citation"),
            "direct_answer_first": ("HIGH", "first paragraph", "Add a direct, factual answer in the first 60 words of the page"),
            "self_contained_paras": ("MEDIUM", "paragraphs", "Replace ambiguous pronouns with specific nouns for RAG extraction"),
            "faq_schema": ("HIGH", "structured data", "Add FAQPage schema for questions found in content"),
            "topic_sentences": ("MEDIUM", "paragraphs", "Start each paragraph with a clear topic sentence"),
            "entity_richness": ("HIGH", "content", "Add more named entities (people, organizations, concepts) throughout content"),
            "content_depth": ("CRITICAL", "content", "Expand content to 1500+ words for AI citation eligibility"),
            "primary_topic_coverage": ("HIGH", "content", "Increase mentions of primary topic/entity throughout content"),
            "no_vague_quantifiers": ("MEDIUM", "content", "Replace vague words ('some', 'many') with specific numbers"),
        }

        for sig in sigs:
            if sig["status"] in ("fail", "warn") and sig["name"] in critical_map:
                counter += 1
                sev, element, fix = critical_map[sig["name"]]
                issues.append({
                    "id": f"GEO-{counter:03d}",
                    "category": "GEO / AI Search",
                    "severity": sev,
                    "element": element,
                    "issue": sig["detail"],
                    "current_value": str(sig["value"])[:200],
                    "recommended_value": sig["expected"],
                    "impact_score": 90 if sev == "CRITICAL" else 70 if sev == "HIGH" else 40,
                    "effort": "Low" if "missing" in str(sig["value"]).lower() else "Medium",
                    "fix": fix,
                    "seo_justification": f"AI search platforms (ChatGPT, Perplexity, Gemini) cite content with these signals. Missing: {sig['name']}.",
                    "platform_impact": {
                        "chatgpt": f"{'High' if sig['status'] == 'fail' else 'Medium'} impact on ChatGPT citation",
                        "perplexity": f"{'High' if sig['status'] == 'fail' else 'Medium'} impact on Perplexity citation",
                        "gemini": f"{'High' if sig['status'] == 'fail' else 'Medium'} impact on Gemini citation",
                        "ai_overview": f"{'High' if sig['status'] == 'fail' else 'Medium'} impact on AI Overview",
                    },
                })

        issues.sort(key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x["severity"], 4))
        return issues
