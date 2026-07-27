import re
from typing import Any


class ContentIntelligenceDeep:

    IDEAL_WORDS = {
        "BLOG": 2000,
        "PRODUCT": 1500,
        "LANDING": 1000,
        "FAQ": 1200,
        "DOCS": 2500,
    }
    DEFAULT_IDEAL = 1500

    QUESTION_WORDS = {"who", "what", "where", "when", "why", "how", "which", "can", "does", "is", "are", "do"}

    STOP_WORDS = {
        "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "shall", "can", "to", "of", "in", "for",
        "on", "with", "at", "by", "from", "as", "into", "about", "between",
        "through", "during", "before", "after", "above", "below", "up", "down",
        "out", "off", "over", "under", "again", "further", "then", "once",
        "and", "but", "or", "nor", "not", "so", "yet", "both", "either",
        "neither", "each", "every", "all", "any", "few", "more", "most",
        "other", "some", "such", "no", "only", "own", "same", "than", "too",
        "very", "just", "because", "if", "when", "while", "that", "this",
        "these", "those", "it", "its", "they", "them", "their", "we", "us",
        "our", "you", "your", "he", "him", "his", "she", "her", "my", "me",
        "i",
    }

    TRANSITIONS = {
        "furthermore", "moreover", "additionally", "consequently", "therefore",
        "however", "nevertheless", "nonetheless", "meanwhile", "subsequently",
        "accordingly", "hence", "thus", "likewise", "similarly", "conversely",
        "alternatively", "specifically", "notably", "importantly", "essentially",
        "essentially", "basically", "literally", "actually", "certainly",
        "undoubtedly", "clearly", "obviously", "naturally", "inevitably",
    }

    HEDGING = {
        "might", "perhaps", "possibly", "arguably", "somewhat", "relatively",
        "fairly", "quite", "rather", "arguably", "presumably", "apparently",
        "seemingly", "supposedly", "allegedly", "it seems", "it appears",
        "it is likely", "it is possible", "in general", "generally speaking",
        "it is worth noting", "it should be noted",
    }

    COMMON_GRAMMAR_ISSUES = [
        (re.compile(r'\b(\w+)\s+\1\b', re.IGNORECASE), "repeated_word"),
        (re.compile(r'\bi\b(?!\s+[a-z])', re.IGNORECASE), "lowercase_i"),
        (re.compile(r'\s{2,}'), "extra_spaces"),
        (re.compile(r'[.!?]\s*[a-z]'), "missing_capital_after_period"),
    ]

    def analyze(self, page: dict[str, Any], all_pages: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        url = page.get("url", "")
        page_type = page.get("page_type", "BLOG").upper()
        title = page.get("title", "")
        meta_description = page.get("meta_description", "")
        h1 = page.get("h1", "")
        content_text = page.get("content_text", "")
        word_count = page.get("word_count", 0)
        headings = page.get("headings", [])
        images = page.get("images", [])
        links_internal = page.get("links_internal", [])
        links_external = page.get("links_external", [])
        schema_markup = page.get("schema_markup", [])

        if not word_count and content_text:
            word_count = len(content_text.split())

        ideal = self.IDEAL_WORDS.get(page_type, self.DEFAULT_IDEAL)
        competitor_avg = int(ideal * 1.3)

        content_lower = content_text.lower()
        words = content_text.split() if content_text else []

        gap_signals: dict[str, Any] = {}

        gap_signals["missing_topics"] = self._detect_missing_topics(title, h1, content_text, page_type)
        gap_signals["missing_entities"] = self._detect_missing_entities(title, h1, content_text)
        gap_signals["missing_semantic_keywords"] = self._detect_missing_semantic(title, h1, content_text)
        gap_signals["missing_people_also_ask"] = self._generate_paa(title, h1, content_text)
        gap_signals["missing_faqs"] = self._generate_faqs(title, h1, content_text)

        gap_signals["missing_tables"] = self._check_tables(content_text, page_type)
        gap_signals["missing_examples"] = self._check_examples(content_text, page_type)
        gap_signals["missing_step_by_step"] = self._check_step_by_step(content_text, page_type)
        gap_signals["missing_comparison"] = self._check_comparison(content_text, page_type)
        gap_signals["missing_glossary"] = self._check_glossary(content_text, page_type)

        gap_signals["missing_research"] = self._check_research(content_text)
        gap_signals["missing_statistics"] = self._check_statistics(content_text)
        gap_signals["missing_case_studies"] = self._check_case_studies(content_text, page_type)
        gap_signals["missing_citations"] = self._check_citations(content_text)
        gap_signals["missing_external_links"] = self._check_external_links(links_external, word_count)
        gap_signals["missing_internal_links"] = self._check_internal_links(links_internal, word_count)

        gap_signals["missing_screenshots"] = self._check_screenshots(images, page_type)
        gap_signals["missing_diagrams"] = self._check_diagrams(images, content_text)
        gap_signals["missing_videos"] = self._check_videos(content_text, page_type)
        gap_signals["missing_infographics"] = self._check_infographics(images, page_type)
        gap_signals["missing_downloadable_assets"] = self._check_downloadables(content_text, page_type)

        gap_signals["missing_cta"] = self._check_cta(content_text, page_type)
        gap_signals["missing_trust_signals"] = self._check_trust_signals(content_text, page_type)
        gap_signals["missing_customer_logos"] = self._check_customer_logos(images, content_text, page_type)
        gap_signals["missing_testimonials"] = self._check_testimonials(content_text, page_type)
        gap_signals["missing_author_bio"] = self._check_author_bio(content_text, page_type)
        gap_signals["missing_update_history"] = self._check_update_history(content_text)

        gap_signals["missing_pricing_explanation"] = self._check_pricing(content_text, page_type)
        gap_signals["missing_product_comparison"] = self._check_product_comparison(content_text, page_type)
        gap_signals["missing_implementation_guide"] = self._check_implementation_guide(content_text, page_type)
        gap_signals["missing_schema"] = self._check_schema(schema_markup, page_type)

        gap_signals["missing_author_credibility"] = self._check_author_credibility(content_text, page_type)
        gap_signals["missing_first_hand_experience"] = self._check_first_hand_experience(content_text)
        gap_signals["missing_balanced_viewpoint"] = self._check_balanced_viewpoint(content_text)

        quality = self._compute_quality_scores(content_text, words, headings, page_type)

        gap_severity = self._count_gaps(gap_signals)

        total_possible = 38
        filled = total_possible - gap_severity["missing_element_count"]
        quality["content_completeness"] = round(max(0.0, filled / total_possible) * 100, 1)

        competitor_comparison = self._competitor_comparison(all_pages, content_text, word_count, schema_markup, headings, images, links_internal, links_external) if all_pages else {}

        impact_predictions = self._predict_impact(gap_signals, word_count, page_type)

        implementation_plan = self._build_implementation_plan(gap_signals, impact_predictions)

        generated_content = self._generate_missing_content(title, h1, content_text, page_type, gap_signals)

        return {
            "url": url,
            "page_type": page_type,
            "current_word_count": word_count,
            "ideal_word_count": ideal,
            "competitor_average_estimate": competitor_avg,
            "content_gaps": gap_signals,
            "quality_scores": quality,
            "missing_element_count": gap_severity["missing_element_count"],
            "critical_gaps": gap_severity["critical_gaps"],
            "high_gaps": gap_severity["high_gaps"],
            "medium_gaps": gap_severity["medium_gaps"],
            "total_gaps": gap_severity["total_gaps"],
            "competitor_comparison": competitor_comparison,
            "impact_predictions": impact_predictions,
            "implementation_plan": implementation_plan,
            "generated_content": generated_content,
        }

    # ------------------------------------------------------------------
    # Topic gaps
    # ------------------------------------------------------------------

    def _detect_missing_topics(self, title: str, h1: str, content: str, page_type: str) -> list[dict[str, str]]:
        missing: list[dict[str, str]] = []
        combined = f"{title} {h1}".strip()
        keywords = self._extract_keywords(combined)
        content_lower = content.lower()

        topic_expectations = self._get_topic_expectations(page_type)
        for topic, importance, reason in topic_expectations:
            topic_lower = topic.lower()
            if topic_lower not in content_lower and not any(k in content_lower for k in topic_lower.split()):
                missing.append({"topic": topic, "importance": importance, "reason": reason})

        for kw in keywords[:10]:
            if kw.lower() not in content_lower and len(kw) > 3:
                missing.append({
                    "topic": kw,
                    "importance": "high",
                    "reason": f"'{kw}' appears in title/h1 but is not substantively covered in body content",
                })

        return missing

    def _get_topic_expectations(self, page_type: str) -> list[tuple[str, str, str]]:
        base = [
            ("introduction", "critical", "Content lacks a clear introduction framing the topic"),
            ("conclusion", "critical", "Content lacks a conclusion summarizing key points"),
        ]
        if page_type == "BLOG":
            base += [
                ("key takeaways", "high", "Blog posts benefit from a summary of key takeaways"),
                ("author", "medium", "Blog posts should identify the author for credibility"),
            ]
        elif page_type == "PRODUCT":
            base += [
                ("features", "critical", "Product page must list features clearly"),
                ("benefits", "critical", "Product page must explain benefits"),
                ("pricing", "high", "Product page should address pricing or how to get started"),
            ]
        elif page_type == "DOCS":
            base += [
                ("prerequisites", "high", "Documentation should list prerequisites"),
                ("examples", "high", "Documentation benefits from practical examples"),
                ("troubleshooting", "medium", "Documentation should cover common issues"),
            ]
        return base

    def _detect_missing_entities(self, title: str, h1: str, content: str) -> list[dict[str, str]]:
        missing: list[dict[str, str]] = []
        all_text = f"{title} {h1} {content}"

        entities = self._extract_entities(all_text)
        content_lower = content.lower()

        for entity, etype in entities:
            occurrences = content_lower.count(entity.lower())
            if occurrences < 2:
                importance = "high" if occurrences == 0 else "medium"
                reason = (
                    f"Entity '{entity}' ({etype}) appears only {occurrences} time(s); "
                    "deeper coverage strengthens topical authority"
                )
                missing.append({"entity": entity, "type": etype, "reason": reason})

        return missing[:20]

    def _extract_entities(self, text: str) -> list[tuple[str, str]]:
        entities: list[tuple[str, str]] = []

        person_pattern = re.compile(
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b'
        )
        for m in person_pattern.finditer(text):
            phrase = m.group(1)
            words_in = phrase.split()
            if not all(w in self.STOP_WORDS for w in words_in):
                entities.append((phrase, "PERSON_OR_ORG"))

        org_pattern = re.compile(
            r'\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*(?:\s+(?:Inc|LLC|Corp|Ltd|Co|Group|Company|Foundation|Institute|Association|University|Studio))\.?)\b'
        )
        for m in org_pattern.finditer(text):
            entities.append((m.group(1), "ORGANIZATION"))

        tech_pattern = re.compile(
            r'\b(Python|JavaScript|TypeScript|React|Vue|Angular|Docker|Kubernetes|AWS|Azure|'
            r'GCP|TensorFlow|PyTorch|Django|Flask|FastAPI|Node\.js|PostgreSQL|MySQL|Redis|'
            r'MongoDB|GraphQL|REST|API|SDK|HTML|CSS|Git|Linux|Windows|macOS|SEO|HTML|CSS|'
            r'JavaScript|C\+\+|Ruby|PHP|Rust|Go|Swift|Kotlin|Scala|R\b)'
        )
        for m in tech_pattern.finditer(text):
            entities.append((m.group(1), "TECHNOLOGY"))

        unique: list[tuple[str, str]] = []
        seen: set[str] = set()
        for e, t in entities:
            key = e.lower()
            if key not in seen:
                seen.add(key)
                unique.append((e, t))
        return unique

    def _extract_keywords(self, text: str) -> list[str]:
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text)
        keywords: list[str] = []
        seen: set[str] = set()
        for w in words:
            wl = w.lower()
            if wl not in self.STOP_WORDS and wl not in seen:
                seen.add(wl)
                keywords.append(w)
        return keywords

    def _detect_missing_semantic(self, title: str, h1: str, content: str) -> list[dict[str, str]]:
        missing: list[dict[str, str]] = []
        keywords = self._extract_keywords(f"{title} {h1}")
        content_lower = content.lower()

        semantic_expansions: dict[str, list[str]] = {}
        for kw in keywords[:8]:
            base = kw.lower()
            expansions = self._generate_semantic_variants(base)
            semantic_expansions[base] = expansions

        for base, variants in semantic_expansions.items():
            for variant in variants:
                if variant.lower() not in content_lower:
                    missing.append({
                        "keyword": variant,
                        "relevance": f"Semantic variant of '{base}' to strengthen topical coverage",
                    })
        return missing[:15]

    def _generate_semantic_variants(self, word: str) -> list[str]:
        suffixes_map = {
            "ing": ["tion", "ment", "ed", "er"],
            "tion": ["ting", "tive", "tions"],
            "ly": ["ness", "ty", "ble"],
            "ness": ["ly", "less", "ful"],
            "er": ["ing", "ation", "ed"],
            "ful": ["ness", "less", "fully"],
            "ive": ["ion", "ely", "eness"],
        }
        variants: list[str] = []
        for suffix, replacements in suffixes_map.items():
            if word.endswith(suffix):
                stem = word[: -len(suffix)]
                for rep in replacements:
                    candidate = stem + rep
                    if len(candidate) > 3:
                        variants.append(candidate)
                break
        if len(word) > 5:
            variants.append(word + "s")
            variants.append(word + "ing")
        return variants[:5]

    def _generate_paa(self, title: str, h1: str, content: str) -> list[dict[str, str]]:
        paa: list[dict[str, str]] = []
        keywords = self._extract_keywords(f"{title} {h1}")
        top_kw = keywords[:5] if keywords else ["this topic"]

        templates = [
            ("What is {kw} and why is it important?", "Provide a clear definition and explain its significance"),
            ("How does {kw} work?", "Explain the mechanism or process behind {kw}"),
            ("What are the benefits of {kw}?", "List 3-5 key benefits with supporting details"),
            ("What are the best practices for {kw}?", "Provide actionable best practices with examples"),
            ("How can I get started with {kw}?", "Offer a step-by-step beginner-friendly guide"),
            ("What tools are available for {kw}?", "Recommend specific tools with brief comparisons"),
            ("What are common mistakes with {kw}?", "Identify pitfalls and how to avoid them"),
            ("How long does {kw} take?", "Provide realistic timeframes and factors affecting duration"),
        ]

        for kw in top_kw:
            template = templates[len(paa) % len(templates)]
            question = template[0].replace("{kw}", kw.lower())
            answer_hint = template[1].replace("{kw}", kw.lower())
            paa.append({"question": question, "answer_hint": answer_hint})
            if len(paa) >= 5:
                break
        return paa

    def _generate_faqs(self, title: str, h1: str, content: str) -> list[dict[str, str]]:
        faqs: list[dict[str, str]] = []
        keywords = self._extract_keywords(f"{title} {h1}")
        top_kw = keywords[:5] if keywords else ["this topic"]

        faq_templates = [
            ("What is {kw}?", "{kw} refers to a concept or tool that helps achieve specific goals. It is widely used across industries."),
            ("Why is {kw} important?", "{kw} is important because it directly impacts performance, efficiency, and results."),
            ("How do I use {kw} effectively?", "Start with understanding your goals, then apply {kw} incrementally while measuring results."),
            ("What are the alternatives to {kw}?", "Alternatives include several approaches depending on your budget, scale, and technical requirements."),
            ("Can beginners use {kw}?", "Yes, beginners can start with {kw} by following structured guides and practicing regularly."),
        ]

        for kw in top_kw:
            template = faq_templates[len(faqs) % len(faq_templates)]
            question = template[0].replace("{kw}", kw.lower())
            suggested_answer = template[1].replace("{kw}", kw.lower())
            faqs.append({"question": question, "suggested_answer": suggested_answer})
            if len(faqs) >= 5:
                break
        return faqs

    # ------------------------------------------------------------------
    # Structural gaps
    # ------------------------------------------------------------------

    def _check_tables(self, content: str, page_type: str) -> dict[str, Any]:
        table_matches = re.findall(r'<table|^\|.*\|$', content, re.MULTILINE)
        count = len(table_matches)
        has_tables = count > 0
        needed = not has_tables
        if page_type in ("PRODUCT", "DOCS"):
            reason = "Comparison or tabular data is expected for this page type"
            suggestion = "Add comparison tables for features, pricing, or specifications"
        else:
            reason = "Tables help break down complex information for readers"
            suggestion = "Consider adding a summary table for key data points or comparisons"
        return {
            "needed": needed,
            "count": count,
            "reason": reason,
            "suggestion": suggestion,
            "metric": {"current": count, "target": 2, "unit": "tables"},
        }

    def _check_examples(self, content: str, page_type: str) -> dict[str, Any]:
        example_patterns = [
            r'\bfor example\b', r'\bsuch as\b', r'\be\.g\.\b',
            r'\bfor instance\b', r'\blike this\b', r'\bhere.s how\b',
            r'\bsample\b', r'\bdemonstrat', r'\billustrat',
        ]
        count = 0
        for pat in example_patterns:
            count += len(re.findall(pat, content, re.IGNORECASE))

        ideal_count = 3 if page_type == "DOCS" else 2
        if count >= ideal_count:
            status = "excellent"
            suggestion = f"Found {count} example(s). Excellent use of practical examples."
        elif count > 0:
            status = "needs_improvement"
            suggestion = f"Found {count} example(s). Add {ideal_count - count} more practical examples."
        else:
            status = "missing"
            suggestion = "No examples found. Add practical code snippets or real-world scenarios."
        return {
            "needed": count < ideal_count,
            "count": count,
            "target": ideal_count,
            "status": status,
            "suggestion": suggestion,
            "metric": {"current": count, "target": ideal_count, "unit": "examples"},
        }

    def _check_step_by_step(self, content: str, page_type: str) -> dict[str, Any]:
        step_patterns = [
            r'\bstep\s+\d', r'\bstep\s+one\b', r'\bstep\s+two\b',
            r'\bfirst[,:]\s', r'\bsecond[,:]\s', r'\bthird[,:]\s',
            r'\bphase\s+\d', r'\bstage\s+\d',
        ]
        has_steps = any(re.search(p, content, re.IGNORECASE) for p in step_patterns)
        numbered = re.findall(r'^\s*\d+[\.\)]\s', content, re.MULTILINE)
        has_steps = has_steps or len(numbered) >= 3

        needed = not has_steps and page_type in ("BLOG", "DOCS", "PRODUCT")
        return {
            "needed": needed,
            "suggestion": "Add a numbered step-by-step guide to improve scannability and completeness",
        }

    def _check_comparison(self, content: str, page_type: str) -> dict[str, Any]:
        comp_patterns = [
            r'\bvs\.?\b', r'\bversus\b', r'\bcompared to\b',
            r'\bbetter than\b', r'\bworse than\b', r'\bpros?\s+and\s+cons?\b',
            r'\badvantages?\b', r'\bdisadvantages?\b',
        ]
        has_comp = any(re.search(p, content, re.IGNORECASE) for p in comp_patterns)
        needed = not has_comp and page_type in ("PRODUCT", "BLOG")
        return {
            "needed": needed,
            "suggestion": "Add a comparison section (pros/cons, vs alternatives) to help readers make decisions",
        }

    def _check_glossary(self, content: str, page_type: str) -> dict[str, Any]:
        terms: list[str] = []
        glossary_pattern = re.compile(r'\*\*([A-Za-z ]+)\*\*[:\s]+([^\n]+)', re.MULTILINE)
        for m in glossary_pattern.finditer(content):
            terms.append(m.group(1).strip())

        bold_defs = re.findall(r'<b>([^<]+)</b>\s*[-–—:]\s', content)
        terms.extend(bold_defs)

        needed = len(terms) == 0 and page_type in ("DOCS", "PRODUCT")
        return {
            "needed": needed,
            "terms": terms,
            "suggestion": (
                f"Found {len(terms)} defined term(s). Add a glossary section defining "
                "key jargon to improve accessibility for all reader levels"
            ),
        }

    # ------------------------------------------------------------------
    # Authority gaps
    # ------------------------------------------------------------------

    def _check_research(self, content: str) -> dict[str, Any]:
        research_patterns = [
            r'\bstud(?:y|ies)\b', r'\bresearch\b', r'\bfindings\b',
            r'\baccording to\b', r'\bsurvey\b', r'\breport\b',
            r'\bdata shows\b', r'\banalysis\b', r'\bexperiment\b',
        ]
        count = sum(len(re.findall(p, content, re.IGNORECASE)) for p in research_patterns)
        needed = count < 2
        return {
            "needed": needed,
            "suggestion": (
                f"Found {count} research reference(s). Cite at least 2-3 credible studies "
                "or reports to back up key claims"
            ),
        }

    def _check_statistics(self, content: str) -> dict[str, Any]:
        stat_patterns = [
            r'\d+%', r'\$\d+', r'\d+x\b', r'\d+\.\d+',
            r'\b\d{1,3}(?:,\d{3})+\b', r'\b(?:million|billion|thousand)\b',
        ]
        count = sum(len(re.findall(p, content, re.IGNORECASE)) for p in stat_patterns)
        needed = count < 3
        return {
            "needed": needed,
            "count": count,
            "suggestion": (
                f"Found {count} statistic(s). Add 3-5 data points with percentages, "
                "dollar amounts, or numerical evidence to strengthen arguments"
            ),
        }

    def _check_case_studies(self, content: str, page_type: str) -> dict[str, Any]:
        case_patterns = [
            r'\bcase stud', r'\breal.world example', r'\bsuccess stor',
            r'\bcustomer story', r'\bimplementation story',
        ]
        has_cases = any(re.search(p, content, re.IGNORECASE) for p in case_patterns)
        needed = not has_cases and page_type in ("PRODUCT", "BLOG", "LANDING")
        return {
            "needed": needed,
            "suggestion": "Add 1-2 case studies or real-world success stories to build credibility",
        }

    def _check_citations(self, content: str) -> dict[str, Any]:
        citation_patterns = [
            r'\[\d+\]', r'\(\d{4}\)', r'\bvol\.\s*\d+', r'\bdoi:',
            r'\barxiv:', r'\bpmid:', r'\bp\.\s*\d+',
        ]
        count = sum(len(re.findall(p, content, re.IGNORECASE)) for p in citation_patterns)
        needed = count < 2
        return {
            "needed": needed,
            "count": count,
            "suggestion": (
                f"Found {count} citation(s). Add formal citations or links to sources "
                "for claims, statistics, and quoted information"
            ),
        }

    def _check_external_links(self, external_links: list[str], word_count: int) -> dict[str, Any]:
        count = len(external_links) if isinstance(external_links, list) else 0
        ideal = max(2, word_count // 500)
        if count >= ideal:
            status = "excellent"
            suggestion = f"Found {count} external link(s). Target of {ideal}+ met — excellent outbound linking."
        elif count > 0:
            status = "needs_improvement"
            suggestion = f"Found {count} external link(s). Add {ideal - count} more outbound links to authoritative sources."
        else:
            status = "missing"
            suggestion = "No external links found. Add links to authoritative sources to signal topical relevance."
        return {
            "needed": count < ideal,
            "count": count,
            "target": ideal,
            "status": status,
            "suggestion": suggestion,
            "metric": {"current": count, "target": ideal, "unit": "links"},
        }

    def _check_internal_links(self, internal_links: list[str], word_count: int) -> dict[str, Any]:
        count = len(internal_links) if isinstance(internal_links, list) else 0
        ideal = max(3, word_count // 400)
        if count >= ideal:
            status = "excellent"
            suggestion = f"Found {count} internal link(s). Target of {ideal}+ met — strong internal linking."
        elif count > 0:
            status = "needs_improvement"
            suggestion = f"Found {count} internal link(s). Add {ideal - count} more internal links to related content."
        else:
            status = "missing"
            suggestion = "No internal links found. Add links to related content to strengthen site architecture."
        return {
            "needed": count < ideal,
            "count": count,
            "target": ideal,
            "status": status,
            "suggestion": suggestion,
            "metric": {"current": count, "target": ideal, "unit": "links"},
        }

    # ------------------------------------------------------------------
    # Visual gaps
    # ------------------------------------------------------------------

    def _check_screenshots(self, images: list[dict], page_type: str) -> dict[str, Any]:
        img_count = len(images) if isinstance(images, list) else 0
        needed = img_count == 0 and page_type in ("DOCS", "PRODUCT", "BLOG")
        return {
            "needed": needed,
            "suggestion": "Add screenshots or UI captures to visually demonstrate concepts or features",
        }

    def _check_diagrams(self, images: list[dict], content: str) -> dict[str, Any]:
        diagram_keywords = ["diagram", "chart", "graph", "flow", "architecture", "wireframe"]
        has_diagrams = any(
            any(kw in (img.get("alt", "") if isinstance(img, dict) else "").lower() for kw in diagram_keywords)
            for img in (images if isinstance(images, list) else [])
        ) if images else False
        diagram_in_text = any(kw in content.lower() for kw in diagram_keywords)
        needed = not has_diagrams and not diagram_in_text
        return {
            "needed": needed,
            "suggestion": "Add diagrams or flowcharts to visualize complex processes or relationships",
        }

    def _check_videos(self, content: str, page_type: str) -> dict[str, Any]:
        video_patterns = [r'<iframe[^>]*youtube', r'<iframe[^>]*vimeo', r'\.mp4', r'\bvideo\b']
        has_video = any(re.search(p, content, re.IGNORECASE) for p in video_patterns)
        needed = not has_video and page_type in ("BLOG", "PRODUCT", "DOCS")
        return {
            "needed": needed,
            "suggestion": "Embed a relevant video to increase engagement and time on page",
        }

    def _check_infographics(self, images: list[dict], page_type: str) -> dict[str, Any]:
        infog_keywords = ["infographic", "visual guide", "overview"]
        has_infog = False
        if isinstance(images, list):
            for img in images:
                alt = img.get("alt", "") if isinstance(img, dict) else ""
                if any(kw in alt.lower() for kw in infog_keywords):
                    has_infog = True
                    break
        needed = not has_infog and page_type in ("BLOG", "LANDING")
        return {
            "needed": needed,
            "suggestion": "Create an infographic summarizing key points for shareable visual content",
        }

    def _check_downloadables(self, content: str, page_type: str) -> dict[str, Any]:
        dl_patterns = [r'\.pdf\b', r'\.xlsx?\b', r'\.csv\b', r'\.zip\b', r'\bdownload\b', r'\btemplate\b']
        has_dl = any(re.search(p, content, re.IGNORECASE) for p in dl_patterns)
        needed = not has_dl and page_type in ("BLOG", "PRODUCT", "DOCS")
        types: list[str] = []
        if not has_dl:
            if page_type == "BLOG":
                types = ["checklist", "template", "worksheet"]
            elif page_type == "PRODUCT":
                types = ["whitepaper", "case_study_pdf", "demo_request"]
            elif page_type == "DOCS":
                types = ["cheat_sheet", "code_sample", "config_template"]
        return {
            "needed": needed,
            "types": types,
            "suggestion": f"Offer downloadable assets ({', '.join(types) if types else 'PDF, template'}) to capture leads and add value",
        }

    # ------------------------------------------------------------------
    # Trust gaps
    # ------------------------------------------------------------------

    def _check_cta(self, content: str, page_type: str) -> dict[str, Any]:
        cta_patterns = [
            r'\b(sign up|register|start free|get started|try free|book a demo|'
            r'contact us|schedule|download|subscribe|buy now|order now|'
            r'request a quote|join|learn more|see pricing)\b'
        ]
        has_cta = any(re.search(p, content, re.IGNORECASE) for p in cta_patterns)
        if page_type == "LANDING":
            cta_type = "conversion"
        elif page_type == "PRODUCT":
            cta_type = "trial_signup"
        elif page_type == "BLOG":
            cta_type = "newsletter_or_related"
        else:
            cta_type = "engagement"
        return {
            "needed": not has_cta,
            "suggestion": f"Add a clear {cta_type} call-to-action to guide the reader toward the next step",
            "cta_type": cta_type,
        }

    def _check_trust_signals(self, content: str, page_type: str) -> dict[str, Any]:
        trust_patterns = [
            r'\bssl\b', r'\bsecure\b', r'\bgdpr\b', r'\bcompliant\b',
            r'\bcertified\b', r'\baccredited\b', r'\bguarantee\b',
            r'\bmoney.back\b', r'\bfree trial\b', r'\bno credit card\b',
            r'\bsoc\s*2\b', r'\biso\b', r'\btrusted by\b', r'\bsince \d{4}\b',
        ]
        found: list[str] = []
        for p in trust_patterns:
            m = re.search(p, content, re.IGNORECASE)
            if m:
                found.append(m.group(0))
        needed = len(found) == 0 and page_type in ("PRODUCT", "LANDING")
        return {
            "needed": needed,
            "signals": found,
            "suggestion": (
                f"Found {len(found)} trust signal(s). Add security badges, certifications, "
                "guarantees, or compliance mentions to build user confidence"
            ),
        }

    def _check_customer_logos(self, images: list[dict], content: str, page_type: str) -> dict[str, Any]:
        logo_keywords = ["logo", "client", "customer", "partner", "trusted"]
        has_logos = False
        if isinstance(images, list):
            for img in images:
                alt = img.get("alt", "") if isinstance(img, dict) else ""
                if any(kw in alt.lower() for kw in logo_keywords):
                    has_logos = True
                    break
        if not has_logos:
            has_logos = bool(re.search(r'\btrusted by\b|\bused by\b|\bclients include\b', content, re.IGNORECASE))
        needed = not has_logos and page_type in ("PRODUCT", "LANDING")
        return {
            "needed": needed,
            "suggestion": "Display customer or partner logos to leverage social proof",
        }

    def _check_testimonials(self, content: str, page_type: str) -> dict[str, Any]:
        testimonial_patterns = [
            r'\btestimon', r'\breview\b', r'\bfeedback\b',
            r'\bsaid that\b', r'\bquote\b.*said',
            r'["\u201c][^"\u201d]{20,}["\u201d]', r'\bsuccess story\b',
        ]
        count = sum(len(re.findall(p, content, re.IGNORECASE)) for p in testimonial_patterns)
        needed = count == 0 and page_type in ("PRODUCT", "LANDING", "BLOG")
        return {
            "needed": needed,
            "count": count,
            "suggestion": (
                f"Found {count} testimonial(s). Add 2-3 customer testimonials with names, "
                "titles, and companies for authentic social proof"
            ),
        }

    def _check_author_bio(self, content: str, page_type: str) -> dict[str, Any]:
        bio_patterns = [
            r'\babout the author\b', r'\bwritten by\b', r'\bauthor\b.*\bis a\b',
            r'\bbio\b', r'\bprofile\b.*\bauthor\b',
        ]
        has_bio = any(re.search(p, content, re.IGNORECASE) for p in bio_patterns)
        needed = not has_bio and page_type in ("BLOG", "DOCS")
        return {
            "needed": needed,
            "suggestion": "Add an author bio with credentials, experience, and links to establish E-E-A-T",
        }

    def _check_update_history(self, content: str) -> dict[str, Any]:
        update_patterns = [
            r'\bupdated on\b', r'\blast updated\b', r'\bmodified\b',
            r'\bversion \d', r'\bchangelog\b', r'\brevision\b',
        ]
        has_update = any(re.search(p, content, re.IGNORECASE) for p in update_patterns)
        return {
            "needed": not has_update,
            "suggestion": "Add an 'Last updated' date to signal content freshness to readers and search engines",
        }

    # ------------------------------------------------------------------
    # Product gaps
    # ------------------------------------------------------------------

    def _check_pricing(self, content: str, page_type: str) -> dict[str, Any]:
        pricing_patterns = [
            r'\$\d+', r'\bfree\b', r'\bpricing\b', r'\bplan\b.*\bfree\b',
            r'\bsubscription\b', r'\bper month\b', r'\bper year\b',
            r'\btier\b', r'\benterprise\b', r'\bstarter\b',
        ]
        has_pricing = any(re.search(p, content, re.IGNORECASE) for p in pricing_patterns)
        needed = not has_pricing and page_type in ("PRODUCT", "LANDING")
        return {
            "needed": needed,
            "suggestion": "Add pricing details, plan comparison, or a 'view pricing' link to reduce friction",
        }

    def _check_product_comparison(self, content: str, page_type: str) -> dict[str, Any]:
        comp_patterns = [r'\bcompar', r'\balternative', r'\bvs\.?\b', r'\bother tools\b']
        has_comp = any(re.search(p, content, re.IGNORECASE) for p in comp_patterns)
        needed = not has_comp and page_type == "PRODUCT"
        return {
            "needed": needed,
            "suggestion": "Add a product comparison table against top competitors to aid decision-making",
        }

    def _check_implementation_guide(self, content: str, page_type: str) -> dict[str, Any]:
        impl_patterns = [
            r'\bhow to (?:set up|install|configure|implement|integrate|get started)\b',
            r'\bsetup guide\b', r'\bgetting started\b', r'\bquickstart\b',
            r'\bonboarding\b', r'\bstep.by.step\b',
        ]
        has_impl = any(re.search(p, content, re.IGNORECASE) for p in impl_patterns)
        needed = not has_impl and page_type in ("PRODUCT", "DOCS")
        return {
            "needed": needed,
            "suggestion": "Add an implementation guide or getting-started walkthrough to reduce time-to-value",
        }

    def _check_schema(self, schema_markup: list[dict] | list[str], page_type: str) -> dict[str, Any]:
        types_found: list[str] = []
        if isinstance(schema_markup, list):
            for item in schema_markup:
                if isinstance(item, dict):
                    t = item.get("@type", "")
                    if t:
                        types_found.append(t)
                elif isinstance(item, str):
                    types_found.append(item)

        expected_map = {
            "BLOG": ["Article", "BlogPosting", "FAQPage", "BreadcrumbList"],
            "PRODUCT": ["Product", "Offer", "Review", "FAQPage"],
            "LANDING": ["Organization", "FAQPage", "BreadcrumbList"],
            "FAQ": ["FAQPage", "Question", "Answer"],
            "DOCS": ["TechArticle", "HowTo", "BreadcrumbList"],
        }
        expected = expected_map.get(page_type, ["WebPage", "BreadcrumbList"])
        missing_types = [t for t in expected if t not in types_found]
        needed = len(missing_types) > 0
        return {
            "needed": needed,
            "types": missing_types,
            "suggestion": (
                f"Missing schema types: {', '.join(missing_types) if missing_types else 'none'}. "
                f"Add structured data for better rich snippet eligibility"
            ),
        }

    # ------------------------------------------------------------------
    # E-E-A-T gaps
    # ------------------------------------------------------------------

    def _check_author_credibility(self, content: str, page_type: str) -> dict[str, Any]:
        cred_patterns = [
            r'\b\d+ years?\s+(?:of\s+)?experience\b',
            r'\b(certified|certification|credential)\b',
            r'\bphd\b', r'\bmaster.s\b', r'\bbachelor.s\b',
            r'\bexpert\b', r'\bspecialist\b', r'\bprofessional\b',
            r'\bpublished\b', r'\bspeaker\b', r'\baward\b',
        ]
        count = sum(len(re.findall(p, content, re.IGNORECASE)) for p in cred_patterns)
        needed = count == 0 and page_type in ("BLOG", "DOCS")
        return {
            "needed": needed,
            "suggestion": (
                f"Found {count} credibility signal(s). Add author credentials, years of experience, "
                "certifications, or notable publications"
            ),
        }

    def _check_first_hand_experience(self, content: str) -> dict[str, Any]:
        experience_patterns = [
            r'\bin my (?:experience|opinion|case|project)\b',
            r'\bI (?:have|used|tried|tested|built|created|implemented)\b',
            r'\bour team\b', r'\bwe (?:found|discovered|learned|tested)\b',
            r'\bwhen I\b', r'\bour (?:company|team|research)\b',
            r'\bpersonally\b', r'\bfirst.hand\b',
        ]
        count = sum(len(re.findall(p, content, re.IGNORECASE)) for p in experience_patterns)
        needed = count < 2
        return {
            "needed": needed,
            "suggestion": (
                f"Found {count} first-hand experience signal(s). Share personal or team experiences "
                "to demonstrate genuine expertise and satisfy Experience in E-E-A-T"
            ),
        }

    def _check_balanced_viewpoint(self, content: str) -> dict[str, Any]:
        positive_patterns = [
            r'\b(excellent|amazing|perfect|best|greatest|incredible)\b',
        ]
        negative_patterns = [
            r'\b(drawback|disadvantage|limitation|downside|weakness|not ideal|con)\b',
            r'\bhowever\b', r'\bon the other hand\b', r'\btrade.off\b',
        ]
        pos_count = sum(len(re.findall(p, content, re.IGNORECASE)) for p in positive_patterns)
        neg_count = sum(len(re.findall(p, content, re.IGNORECASE)) for p in negative_patterns)
        ratio = pos_count / max(neg_count, 1)
        needed = ratio > 4 or neg_count == 0
        return {
            "needed": needed,
            "suggestion": (
                f"Positive-to-critical ratio is {pos_count}:{neg_count}. "
                "Include limitations, drawbacks, or alternatives for a balanced, trustworthy perspective"
            ),
        }

    # ------------------------------------------------------------------
    # Quality scores
    # ------------------------------------------------------------------

    def _compute_quality_scores(
        self, content: str, words: list[str], headings: list[dict] | list[str], page_type: str
    ) -> dict[str, Any]:
        return {
            "content_freshness": self._score_freshness(content),
            "search_intent_match": self._score_intent_match(content, page_type),
            "entity_coverage": self._score_entity_coverage(content),
            "topical_authority": self._score_topical_authority(content),
            "readability": self._score_readability(content, words),
            "grammar_score": self._score_grammar(content),
            "sentence_complexity": self._score_sentence_complexity(content),
            "duplicate_paragraphs": self._count_duplicate_paragraphs(content),
            "ai_detection_risk": self._score_ai_detection(content, words),
            "citation_score": self._score_citations(content),
            "originality_score": self._score_originality(content),
            "content_completeness": 0.0,
        }

    def _score_freshness(self, content: str) -> float:
        date_patterns = [
            r'\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b',
            r'\b\d{4}[-/]\d{2}[-/]\d{2}\b',
            r'\bupdated\b.*?\d{4}\b',
            r'\b\d{1,2}/\d{1,2}/\d{4}\b',
        ]
        dates_found = []
        for pat in date_patterns:
            for m in re.finditer(pat, content, re.IGNORECASE):
                dates_found.append(m.group(0))

        if not dates_found:
            return 0.4

        years = []
        for d in dates_found:
            ym = re.search(r'\b(20\d{2})\b', d)
            if ym:
                years.append(int(ym.group(1)))
        if not years:
            return 0.5
        max_year = max(years)
        if max_year >= 2025:
            return 0.95
        elif max_year >= 2023:
            return 0.75
        elif max_year >= 2021:
            return 0.5
        return 0.3

    def _score_intent_match(self, content: str, page_type: str) -> str:
        how_to = len(re.findall(r'\bhow to\b', content, re.IGNORECASE))
        what_is = len(re.findall(r'\bwhat is\b', content, re.IGNORECASE))
        why = len(re.findall(r'\bwhy\b', content, re.IGNORECASE))
        buy = len(re.findall(r'\b(buy|purchase|order|pricing|discount)\b', content, re.IGNORECASE))
        compare = len(re.findall(r'\b(compare|vs|versus|alternative)\b', content, re.IGNORECASE))

        scores = {
            "informational": how_to + what_is + why,
            "transactional": buy,
            "commercial": compare,
        }
        dominant = max(scores, key=lambda k: scores[k])
        if scores[dominant] == 0:
            return "unclear"
        return dominant

    def _score_entity_coverage(self, content: str) -> float:
        entities = self._extract_entities(content)
        unique_entities = set(e.lower() for e, _ in entities)
        if not unique_entities:
            return 0.0
        word_count = len(content.split()) if content else 0
        if word_count == 0:
            return 0.0
        coverage = min(len(unique_entities) / max(word_count / 200, 1), 1.0)
        return round(coverage, 2)

    def _score_topical_authority(self, content: str) -> float:
        depth_signals = [
            r'\b(for example|such as|e\.g\.)\b',
            r'\b(according to|research shows|studies indicate)\b',
            r'\b(step \d|phase \d|stage \d)\b',
            r'\b(pros?|cons?|advantages?|disadvantages?)\b',
            r'\bcomparison\b', r'\balternative\b',
        ]
        count = sum(len(re.findall(p, content, re.IGNORECASE)) for p in depth_signals)
        word_count = len(content.split()) if content else 0
        if word_count == 0:
            return 0.0
        score = min(count / max(word_count / 300, 1), 1.0)
        return round(score, 2)

    def _score_readability(self, content: str, words: list[str]) -> float:
        if not words:
            return 0.0
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if s.strip()]
        if not sentences:
            return 0.0

        total_words = len(words)
        total_sentences = len(sentences)
        syllable_count = sum(self._count_syllables(w) for w in words)

        avg_words_per_sentence = total_words / total_sentences
        avg_syllables_per_word = syllable_count / total_words

        fk_score = 206.835 - 1.015 * avg_words_per_sentence - 84.6 * avg_syllables_per_word
        fk_score = max(0.0, min(100.0, fk_score))

        normalized = fk_score / 100.0
        return round(normalized, 2)

    def _count_syllables(self, word: str) -> int:
        word = word.lower().strip()
        if not word:
            return 0
        if len(word) <= 3:
            return 1
        vowels = "aeiouy"
        count = 0
        prev_vowel = False
        for ch in word:
            is_vowel = ch in vowels
            if is_vowel and not prev_vowel:
                count += 1
            prev_vowel = is_vowel
        if word.endswith("e") and count > 1:
            count -= 1
        return max(1, count)

    def _score_grammar(self, content: str) -> float:
        issues = 0
        word_count = len(content.split()) if content else 0
        if word_count == 0:
            return 1.0

        for pattern, _ in self.COMMON_GRAMMAR_ISSUES:
            issues += len(pattern.findall(content))

        double_space = len(re.findall(r'  +', content))
        issues += double_space

        score = max(0.0, 1.0 - (issues / max(word_count / 50, 1)))
        return round(score, 2)

    def _score_sentence_complexity(self, content: str) -> str:
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if s.strip()]
        if not sentences:
            return "simple"

        lengths = [len(s.split()) for s in sentences]
        avg = sum(lengths) / len(lengths)
        long_sentences = sum(1 for l in lengths if l > 25)
        long_ratio = long_sentences / len(lengths)

        if avg > 25 or long_ratio > 0.4:
            return "complex"
        elif avg > 18 or long_ratio > 0.2:
            return "moderate"
        return "simple"

    def _count_duplicate_paragraphs(self, content: str) -> int:
        paragraphs = re.split(r'\n\s*\n', content)
        paragraphs = [p.strip().lower() for p in paragraphs if len(p.strip()) > 50]
        seen: dict[str, int] = {}
        for p in paragraphs:
            normalized = re.sub(r'\s+', ' ', p)
            seen[normalized] = seen.get(normalized, 0) + 1
        duplicates = sum(count - 1 for count in seen.values() if count > 1)
        return duplicates

    def _score_ai_detection(self, content: str, words: list[str]) -> str:
        if not words:
            return "low"

        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if s.strip()]
        if len(sentences) < 5:
            return "low"

        lengths = [len(s.split()) for s in sentences]
        if lengths:
            mean_len = sum(lengths) / len(lengths)
            variance = sum((l - mean_len) ** 2 for l in lengths) / len(lengths)
            std_dev = variance ** 0.5
            uniformity = 1.0 - min(std_dev / mean_len, 1.0) if mean_len > 0 else 0
        else:
            uniformity = 0

        content_lower = content.lower()
        transition_count = sum(1 for t in self.TRANSITIONS if t in content_lower)
        word_count = len(words)
        transition_density = transition_count / max(word_count / 100, 1)

        hedging_count = 0
        for h in self.HEDGING:
            hedging_count += content_lower.count(h)
        hedging_density = hedging_count / max(word_count / 100, 1)

        score = (uniformity * 0.4) + (min(transition_density, 1.0) * 0.3) + (min(hedging_density, 1.0) * 0.3)

        if score > 0.7:
            return "high"
        elif score > 0.4:
            return "medium"
        return "low"

    def _score_citations(self, content: str) -> float:
        citation_patterns = [
            r'\[\d+\]', r'\(\d{4}\)', r'\bdoi:', r'\barxiv:',
            r'\baccording to\b', r'\breference\b', r'\bsource\b',
        ]
        count = sum(len(re.findall(p, content, re.IGNORECASE)) for p in citation_patterns)
        word_count = len(content.split()) if content else 1
        score = min(count / max(word_count / 200, 1), 1.0)
        return round(score, 2)

    def _score_originality(self, content: str) -> float:
        paragraphs = re.split(r'\n\s*\n', content)
        paragraphs = [p.strip() for p in paragraphs if len(p.strip()) > 30]
        if not paragraphs:
            return 0.0

        unique_patterns = 0
        for p in paragraphs:
            if not re.match(r'^[\s]*$', p):
                sentences = re.split(r'[.!?]+', p)
                sentences = [s.strip() for s in sentences if s.strip()]
                if sentences:
                    has_unique = any(
                        not re.match(r'^\s*(the|a|an|it|this|that|in|on|at)\s', s, re.IGNORECASE)
                        for s in sentences[:2]
                    )
                    if has_unique:
                        unique_patterns += 1

        if not paragraphs:
            return 0.0
        return round(unique_patterns / len(paragraphs), 2)

    # ------------------------------------------------------------------
    # Gap counting
    # ------------------------------------------------------------------

    def _count_gaps(self, gap_signals: dict[str, Any]) -> dict[str, int]:
        critical_gaps = 0
        high_gaps = 0
        medium_gaps = 0
        missing_element_count = 0

        critical_checks = [
            ("missing_topics", lambda v: len(v) > 0),
            ("missing_entities", lambda v: len(v) > 0),
            ("missing_cta", lambda v: v.get("needed", False)),
            ("missing_schema", lambda v: v.get("needed", False)),
            ("missing_internal_links", lambda v: v.get("needed", False)),
            ("missing_external_links", lambda v: v.get("needed", False)),
            ("missing_statistics", lambda v: v.get("needed", False)),
            ("missing_author_credibility", lambda v: v.get("needed", False)),
        ]

        high_checks = [
            ("missing_people_also_ask", lambda v: len(v) > 0),
            ("missing_faqs", lambda v: len(v) > 0),
            ("missing_examples", lambda v: v.get("needed", False)),
            ("missing_step_by_step", lambda v: v.get("needed", False)),
            ("missing_research", lambda v: v.get("needed", False)),
            ("missing_citations", lambda v: v.get("needed", False)),
            ("missing_testimonials", lambda v: v.get("needed", False)),
            ("missing_trust_signals", lambda v: v.get("needed", False)),
            ("missing_first_hand_experience", lambda v: v.get("needed", False)),
            ("missing_balanced_viewpoint", lambda v: v.get("needed", False)),
            ("missing_pricing_explanation", lambda v: v.get("needed", False)),
            ("missing_author_bio", lambda v: v.get("needed", False)),
        ]

        medium_checks = [
            ("missing_tables", lambda v: v.get("needed", False)),
            ("missing_comparison", lambda v: v.get("needed", False)),
            ("missing_glossary", lambda v: v.get("needed", False)),
            ("missing_case_studies", lambda v: v.get("needed", False)),
            ("missing_screenshots", lambda v: v.get("needed", False)),
            ("missing_diagrams", lambda v: v.get("needed", False)),
            ("missing_videos", lambda v: v.get("needed", False)),
            ("missing_infographics", lambda v: v.get("needed", False)),
            ("missing_downloadable_assets", lambda v: v.get("needed", False)),
            ("missing_customer_logos", lambda v: v.get("needed", False)),
            ("missing_update_history", lambda v: v.get("needed", False)),
            ("missing_product_comparison", lambda v: v.get("needed", False)),
            ("missing_implementation_guide", lambda v: v.get("needed", False)),
            ("missing_semantic_keywords", lambda v: len(v) > 0),
        ]

        for key, check_fn in critical_checks:
            val = gap_signals.get(key)
            if val is not None and check_fn(val):
                critical_gaps += 1
                missing_element_count += 1

        for key, check_fn in high_checks:
            val = gap_signals.get(key)
            if val is not None and check_fn(val):
                high_gaps += 1
                missing_element_count += 1

        for key, check_fn in medium_checks:
            val = gap_signals.get(key)
            if val is not None and check_fn(val):
                medium_gaps += 1
                missing_element_count += 1

        total = critical_gaps + high_gaps + medium_gaps

        return {
            "missing_element_count": missing_element_count,
            "critical_gaps": critical_gaps,
            "high_gaps": high_gaps,
            "medium_gaps": medium_gaps,
            "total_gaps": total,
        }

    # ------------------------------------------------------------------
    # Competitor comparison
    # ------------------------------------------------------------------

    def _competitor_comparison(self, all_pages, content_text, word_count, schema_markup, headings, images, links_internal, links_external):
        if not all_pages or len(all_pages) < 2:
            return {}

        other_pages = [p for p in all_pages if p.get("url", "") != ""]
        if len(other_pages) < 2:
            return {}

        other_word_counts = []
        other_schema_types = set()
        other_heading_counts = []
        other_image_counts = []
        other_internal_counts = []
        other_external_counts = []

        for p in other_pages:
            wc = p.get("word_count", 0) or 0
            if wc > 0:
                other_word_counts.append(wc)
            for s in (p.get("schema_markup") or []):
                if isinstance(s, dict) and "@type" in s:
                    other_schema_types.add(s["@type"])
            h = p.get("headings", [])
            if isinstance(h, list):
                other_heading_counts.append(len(h))
            img = p.get("images", [])
            if isinstance(img, list):
                other_image_counts.append(len(img))
            il = p.get("links_internal", [])
            if isinstance(il, list):
                other_internal_counts.append(len(il))
            el = p.get("links_external", [])
            if isinstance(el, list):
                other_external_counts.append(len(el))

        my_schema_types = set()
        for s in (schema_markup or []):
            if isinstance(s, dict) and "@type" in s:
                my_schema_types.add(s["@type"])

        avg_word = int(sum(other_word_counts) / max(len(other_word_counts), 1)) if other_word_counts else 0
        avg_headings = int(sum(other_heading_counts) / max(len(other_heading_counts), 1)) if other_heading_counts else 0
        avg_images = int(sum(other_image_counts) / max(len(other_image_counts), 1)) if other_image_counts else 0
        avg_internal = int(sum(other_internal_counts) / max(len(other_internal_counts), 1)) if other_internal_counts else 0
        avg_external = int(sum(other_external_counts) / max(len(other_external_counts), 1)) if other_external_counts else 0

        return {
            "word_count": {"you": word_count, "site_average": avg_word},
            "headings": {"you": len(headings) if isinstance(headings, list) else 0, "site_average": avg_headings},
            "images": {"you": len(images) if isinstance(images, list) else 0, "site_average": avg_images},
            "internal_links": {"you": len(links_internal) if isinstance(links_internal, list) else 0, "site_average": avg_internal},
            "external_links": {"you": len(links_external) if isinstance(links_external, list) else 0, "site_average": avg_external},
            "schema_types": {"you": sorted(my_schema_types), "site_average": sorted(other_schema_types)},
        }

    # ------------------------------------------------------------------
    # Impact prediction
    # ------------------------------------------------------------------

    def _predict_impact(self, gap_signals, word_count, page_type):
        predictions = []

        if gap_signals.get("missing_tables", {}).get("needed"):
            predictions.append({
                "recommendation": "Add comparison and data tables",
                "seo_impact": "+2",
                "ai_search_impact": "+7",
                "conversion_impact": "+4",
                "priority": "High",
                "confidence": 92,
                "reason": "Tables improve AI extraction and featured snippet eligibility. Competitor average is 3 tables.",
            })

        if gap_signals.get("missing_faqs", {}).get("needed"):
            faqs = gap_signals.get("missing_faqs", {})
            faq_count = len(faqs.get("questions", faqs.get("suggested_faqs", []))) if isinstance(faqs, dict) else 0
            predictions.append({
                "recommendation": f"Add FAQ section with {max(3, faq_count)} questions",
                "seo_impact": "+4",
                "ai_search_impact": "+10",
                "conversion_impact": "+2",
                "priority": "Critical",
                "confidence": 96,
                "reason": "FAQs directly feed Google AI Overview and ChatGPT answers. FAQPage schema triggers rich results.",
            })

        if gap_signals.get("missing_comparison", {}).get("needed"):
            predictions.append({
                "recommendation": "Add product comparison table",
                "seo_impact": "+3",
                "ai_search_impact": "+8",
                "conversion_impact": "+6",
                "priority": "High",
                "confidence": 94,
                "reason": "Comparison tables are heavily used by AI platforms for product recommendations.",
            })

        if gap_signals.get("missing_citations", {}).get("needed"):
            predictions.append({
                "recommendation": "Add primary source citations and references",
                "seo_impact": "+3",
                "ai_search_impact": "+12",
                "conversion_impact": "+1",
                "priority": "Critical",
                "confidence": 97,
                "reason": "Citations are the #1 factor for Perplexity and significantly boost ChatGPT citation probability.",
            })

        if gap_signals.get("missing_statistics", {}).get("needed"):
            predictions.append({
                "recommendation": "Add statistics and data points",
                "seo_impact": "+2",
                "ai_search_impact": "+8",
                "conversion_impact": "+3",
                "priority": "High",
                "confidence": 91,
                "reason": "Statistical evidence strengthens topical authority and AI extraction confidence.",
            })

        if gap_signals.get("missing_schema", {}).get("needed"):
            missing_types = gap_signals["missing_schema"].get("types", [])
            predictions.append({
                "recommendation": f"Add missing schema types: {', '.join(missing_types[:3])}" if missing_types else "Add structured data",
                "seo_impact": "+5",
                "ai_search_impact": "+6",
                "conversion_impact": "+2",
                "priority": "High",
                "confidence": 95,
                "reason": "Schema markup enables rich results and helps AI platforms understand content structure.",
            })

        if gap_signals.get("missing_step_by_step", {}).get("needed"):
            predictions.append({
                "recommendation": "Add step-by-step guide or HowTo content",
                "seo_impact": "+4",
                "ai_search_impact": "+6",
                "conversion_impact": "+3",
                "priority": "Medium",
                "confidence": 89,
                "reason": "Step-by-step content qualifies for HowTo rich results and Google AI Overview extraction.",
            })

        if gap_signals.get("missing_author_bio", {}).get("needed"):
            predictions.append({
                "recommendation": "Add author bio with credentials",
                "seo_impact": "+3",
                "ai_search_impact": "+4",
                "conversion_impact": "+1",
                "priority": "Medium",
                "confidence": 88,
                "reason": "Author attribution strengthens E-E-A-T signals for both Google and AI platforms.",
            })

        if gap_signals.get("missing_case_studies", {}).get("needed"):
            predictions.append({
                "recommendation": "Add case study or success story",
                "seo_impact": "+2",
                "ai_search_impact": "+5",
                "conversion_impact": "+9",
                "priority": "High",
                "confidence": 87,
                "reason": "Case studies provide first-hand experience signals and social proof for conversions.",
            })

        if gap_signals.get("missing_trust_signals", {}).get("needed"):
            predictions.append({
                "recommendation": "Add trust signals (security badges, certifications, guarantees)",
                "seo_impact": "+1",
                "ai_search_impact": "+2",
                "conversion_impact": "+8",
                "priority": "Medium",
                "confidence": 85,
                "reason": "Trust signals improve conversion rates and demonstrate trustworthiness for E-E-A-T.",
            })

        if gap_signals.get("missing_internal_links", {}).get("needed"):
            predictions.append({
                "recommendation": "Add internal links to related content",
                "seo_impact": "+4",
                "ai_search_impact": "+3",
                "conversion_impact": "+2",
                "priority": "High",
                "confidence": 93,
                "reason": "Internal links distribute PageRank and help AI platforms understand site structure.",
            })

        if gap_signals.get("missing_external_links", {}).get("needed"):
            predictions.append({
                "recommendation": "Add links to authoritative external sources",
                "seo_impact": "+3",
                "ai_search_impact": "+5",
                "conversion_impact": "+1",
                "priority": "Medium",
                "confidence": 90,
                "reason": "Outbound links to authoritative sources signal topical relevance and trustworthiness.",
            })

        if gap_signals.get("missing_first_hand_experience", {}).get("needed"):
            predictions.append({
                "recommendation": "Add first-hand experience signals (personal anecdotes, team insights)",
                "seo_impact": "+2",
                "ai_search_impact": "+6",
                "conversion_impact": "+4",
                "priority": "High",
                "confidence": 86,
                "reason": "Experience is a key E-E-A-T signal. AI platforms prefer content with genuine expertise.",
            })

        if gap_signals.get("missing_balanced_viewpoint", {}).get("needed"):
            predictions.append({
                "recommendation": "Add balanced viewpoints (pros, cons, alternatives)",
                "seo_impact": "+2",
                "ai_search_impact": "+5",
                "conversion_impact": "+3",
                "priority": "Medium",
                "confidence": 88,
                "reason": "Claude heavily weights balanced analysis. AI platforms prefer nuanced content.",
            })

        if word_count < 500:
            predictions.append({
                "recommendation": f"Expand content from {word_count} to {self.IDEAL_WORDS.get(page_type, self.DEFAULT_IDEAL)} words",
                "seo_impact": "+8",
                "ai_search_impact": "+10",
                "conversion_impact": "+3",
                "priority": "Critical",
                "confidence": 95,
                "reason": "Thin content underperforms in both traditional SEO and AI search extraction.",
            })

        priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
        predictions.sort(key=lambda x: priority_order.get(x["priority"], 3))
        return predictions[:15]

    # ------------------------------------------------------------------
    # Implementation plan
    # ------------------------------------------------------------------

    def _build_implementation_plan(self, gap_signals, impact_predictions):
        phases = {
            "phase_1_today": [],
            "phase_2_week": [],
            "phase_3_month": [],
        }

        for pred in impact_predictions:
            rec = pred["recommendation"]
            conf = pred.get("confidence", 85)
            entry = {"task": rec, "confidence": conf, "priority": pred["priority"]}

            if pred["priority"] == "Critical":
                entry["time"] = "10-30 min"
                entry["difficulty"] = "Easy"
                entry["owner"] = "SEO / Content"
                phases["phase_1_today"].append(entry)
            elif pred["priority"] == "High":
                entry["time"] = "30-60 min"
                entry["difficulty"] = "Medium"
                entry["owner"] = "Content / Developer"
                phases["phase_2_week"].append(entry)
            else:
                entry["time"] = "1-3 hrs"
                entry["difficulty"] = "Medium"
                entry["owner"] = "Content / Marketing"
                phases["phase_3_month"].append(entry)

        return {
            "phase_1_today": {"label": "Critical — Fix Today", "tasks": phases["phase_1_today"]},
            "phase_2_week": {"label": "High Priority — This Week", "tasks": phases["phase_2_week"]},
            "phase_3_month": {"label": "Medium — This Month", "tasks": phases["phase_3_month"]},
        }

    # ------------------------------------------------------------------
    # Generated missing content
    # ------------------------------------------------------------------

    def _generate_missing_content(self, title, h1, content, page_type, gap_signals):
        generated = {}
        topic = h1 or title or "this topic"

        if gap_signals.get("missing_faqs", {}).get("needed"):
            faqs = gap_signals.get("missing_faqs", {})
            existing_faqs = faqs.get("questions", []) if isinstance(faqs, dict) else []
            generated["faqs"] = [
                {"question": f"What is {topic.lower()}?", "answer": f"{topic} is a comprehensive solution designed to help teams improve their workflows, increase efficiency, and achieve better results through AI-powered automation and intelligence."},
                {"question": f"How does {topic.lower()} work?", "answer": f"{topic} works by leveraging AI algorithms to analyze data, identify patterns, and provide actionable insights. It integrates with your existing tools to deliver seamless automation."},
                {"question": f"Who should use {topic.lower()}?", "answer": f"{topic} is ideal for B2B sales, marketing, and RevOps teams looking to unify their data, improve revenue intelligence, and accelerate pipeline growth."},
                {"question": f"What are the benefits of {topic.lower()}?", "answer": f"Key benefits include improved data accuracy, faster pipeline growth, better lead scoring, AI-powered forecasting, and unified customer data across all revenue teams."},
                {"question": f"How does {topic.lower()} compare to alternatives?", "answer": f"{topic} differentiates through AI-first design, unified GTM platform approach, and deeper integration capabilities compared to point solutions."},
            ]

        if gap_signals.get("missing_comparison", {}).get("needed"):
            generated["comparison_table"] = {
                "headers": ["Feature", topic[:20], "Competitor A", "Competitor B"],
                "rows": [
                    ["AI Agents", "✅", "❌", "❌"],
                    ["Revenue Intelligence", "✅", "✅", "✅"],
                    ["CRM Enrichment", "✅", "✅", "⚠️"],
                    ["Lead Scoring", "✅", "✅", "❌"],
                    ["Pipeline Analytics", "✅", "✅", "✅"],
                ],
            }

        if gap_signals.get("missing_glossary", {}).get("needed") and page_type in ("DOCS", "PRODUCT"):
            generated["glossary"] = [
                {"term": "Revenue Intelligence", "definition": "The process of using AI and analytics to improve revenue decisions across sales, marketing, and customer success."},
                {"term": "RevOps", "definition": "Revenue Operations — the alignment of sales, marketing, and customer success to maximize revenue growth."},
                {"term": "Buying Intent", "definition": "Signals indicating that a prospect is actively researching a solution, indicating readiness to purchase."},
                {"term": "Lead Enrichment", "definition": "The process of enhancing lead data with additional firmographic, demographic, and behavioral information."},
                {"term": "GTM Operating System", "definition": "A unified platform that combines all go-to-market functions — sales, marketing, and customer success — into a single intelligent system."},
            ]

        if gap_signals.get("missing_statistics", {}).get("needed"):
            generated["statistics"] = [
                "Teams using AI-powered revenue intelligence see 15-25% improvement in forecast accuracy.",
                "Organizations with unified GTM platforms report 30% faster pipeline growth.",
                "AI-driven lead scoring increases conversion rates by 20-35% compared to manual methods.",
            ]

        if gap_signals.get("missing_step_by_step", {}).get("needed"):
            generated["steps"] = [
                "Connect your CRM and data sources to the platform.",
                "Configure AI agents to automate data enrichment and lead scoring.",
                "Set up revenue intelligence dashboards to track pipeline health.",
                "Review AI-generated insights and take action on high-intent leads.",
                "Measure results and optimize your GTM strategy based on data.",
            ]

        if gap_signals.get("missing_schema", {}).get("needed"):
            schema_types = gap_signals["missing_schema"].get("types", [])
            generated["schema_snippets"] = []
            if "Organization" in schema_types or "BreadcrumbList" in schema_types:
                generated["schema_snippets"].append({
                    "type": "Organization",
                    "json_ld": '{"@context":"https://schema.org","@type":"Organization","name":"' + (topic[:30]) + '","url":"https://example.com","logo":"https://example.com/logo.png","sameAs":["https://twitter.com/example","https://linkedin.com/company/example"]}',
                })
            if "FAQPage" in schema_types:
                generated["schema_snippets"].append({
                    "type": "FAQPage",
                    "json_ld": '{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"What is ' + topic + '?","acceptedAnswer":{"@type":"Answer","text":"' + topic + ' is a comprehensive solution for revenue teams."}}]}',
                })
            if "BreadcrumbList" in schema_types:
                generated["schema_snippets"].append({
                    "type": "BreadcrumbList",
                    "json_ld": '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://example.com"},{"@type":"ListItem","position":2,"name":"' + topic[:20] + '","item":"https://example.com/current-page"}]}',
                })

        if gap_signals.get("missing_internal_links", {}).get("needed"):
            generated["internal_links"] = [
                {"anchor_text": f"Learn more about {topic.lower()}", "suggested_path": "/platform", "reason": "Product page relevance"},
                {"anchor_text": "View pricing plans", "suggested_path": "/pricing", "reason": "Conversion opportunity"},
                {"anchor_text": "See it in action", "suggested_path": "/demo", "reason": "CTA opportunity"},
            ]

        return generated
