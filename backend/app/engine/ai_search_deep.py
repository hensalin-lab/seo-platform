from __future__ import annotations

import re
import json
from typing import Any, Dict, List, Optional, Tuple


class AISearchDeepEngine:

    def analyze(self, page: Dict[str, Any]) -> Dict[str, Any]:
        url = page.get("url", "")
        title = page.get("title", "")
        meta_desc = page.get("meta_description", "")
        h1 = page.get("h1", "")
        content = page.get("content_text", "")
        word_count = page.get("word_count", 0)
        html = page.get("html_raw", "")
        headings = page.get("headings", [])
        images = page.get("images", [])
        links_internal = page.get("links_internal", [])
        links_external = page.get("links_external", [])
        schema = page.get("schema_markup", [])
        page_type = page.get("page_type", "")

        if isinstance(schema, str):
            try:
                schema = json.loads(schema)
            except (json.JSONDecodeError, TypeError):
                schema = []
        if not isinstance(schema, list):
            schema = [schema] if schema else []

        schema_types = self._extract_schema_types(schema)
        text_lower = content.lower()
        html_lower = html.lower() if html else ""
        heading_texts = self._heading_texts(headings)
        image_list = self._image_alt_texts(images)
        internal_count = len(links_internal) if isinstance(links_internal, list) else 0
        external_count = len(links_external) if isinstance(links_external, list) else 0

        entity_data = self._extract_entities(content, schema, title, meta_desc)
        citation_data = self._assess_citations(content, text_lower, html)
        aeo_data = self._assess_aeo(
            content, text_lower, heading_texts, html, html_lower, schema_types, image_list
        )
        geo_data = self._assess_geo(
            content, text_lower, schema_types, entity_data, links_external, external_count,
            heading_texts, title, word_count
        )

        platform_scores, platform_details = self._score_platforms(
            content, text_lower, html, html_lower, title, meta_desc, h1,
            heading_texts, image_list, internal_count, external_count,
            schema_types, word_count, entity_data, citation_data, aeo_data, geo_data,
            page_type, links_external, links_internal, schema
        )

        overall = sum(platform_scores.values()) / len(platform_scores) if platform_scores else 0.0

        why_not_ranking = self._why_not_ranking(
            content, word_count, title, meta_desc, heading_texts,
            schema_types, internal_count, external_count, aeo_data, platform_scores,
            page_type, image_list, entity_data
        )
        why_not_cited = self._why_not_cited(
            citation_data, entity_data, aeo_data, platform_scores, content, word_count
        )
        optimization_actions = self._optimization_actions(
            platform_details, platform_scores, why_not_ranking, why_not_cited
        )

        return {
            "url": url,
            "platform_scores": {
                "google_ai_overview": platform_scores.get("google_ai_overview", 0.0),
                "chatgpt": platform_scores.get("chatgpt", 0.0),
                "gemini": platform_scores.get("gemini", 0.0),
                "claude": platform_scores.get("claude", 0.0),
                "perplexity": platform_scores.get("perplexity", 0.0),
                "copilot": platform_scores.get("copilot", 0.0),
            },
            "overall_ai_score": round(overall, 1),
            "entity_coverage": entity_data,
            "citation_readiness": citation_data,
            "aeo": aeo_data,
            "geo": geo_data,
            "platform_details": platform_details,
            "why_not_ranking": why_not_ranking,
            "why_not_cited": why_not_cited,
            "optimization_actions": optimization_actions,
        }

    # ------------------------------------------------------------------
    # Internal helpers – schema
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_schema_types(schema: List[Any]) -> List[str]:
        types: List[str] = []
        for entry in schema:
            if isinstance(entry, dict):
                t = entry.get("@type", "")
                if isinstance(t, str) and t:
                    types.append(t)
                elif isinstance(t, list):
                    types.extend(str(x) for x in t)
        return types

    # ------------------------------------------------------------------
    # Internal helpers – headings / images
    # ------------------------------------------------------------------

    @staticmethod
    def _heading_texts(headings: Any) -> List[str]:
        if not isinstance(headings, list):
            return []
        result: List[str] = []
        for h in headings:
            if isinstance(h, str):
                result.append(h)
            elif isinstance(h, dict):
                result.append(h.get("text", h.get("content", "")))
        return result

    @staticmethod
    def _image_alt_texts(images: Any) -> List[str]:
        if not isinstance(images, list):
            return []
        result: List[str] = []
        for img in images:
            if isinstance(img, str):
                result.append(img)
            elif isinstance(img, dict):
                result.append(img.get("alt", img.get("alt_text", "")))
        return result

    # ------------------------------------------------------------------
    # Entity extraction
    # ------------------------------------------------------------------

    _ORG_PATTERNS = [
        r"\b(?:Inc\.|LLC|Ltd\.|Corp\.|Corporation|Company|Co\.|Group|Foundation|Institute|Association|University|College)\b",
    ]
    _PRODUCT_KEYWORDS = [
        "tool", "platform", "software", "app", "plugin", "extension",
        "service", "suite", "solution", "product", "dashboard", "api",
    ]
    _PERSON_SUFFIXES = [
        "PhD", "Ph.D", "MBA", "MD", "Dr.", "Prof.", "Professor", "Sir",
    ]
    _SOFTWARE_KEYWORDS = [
        "saas", "platform", "software", "app", "dashboard", "tool",
        "api", "sdk", "plugin", "extension", "cli", "framework",
    ]

    def _extract_entities(
        self, content: str, schema: List[Any], title: str, meta_desc: str
    ) -> Dict[str, Any]:
        combined = f"{title} {meta_desc} {content}"
        org_entities: List[str] = []
        product_entities: List[str] = []
        person_entities: List[str] = []
        software_entities: List[str] = []

        capitalized_re = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b")
        found_phrases = capitalized_re.findall(combined)
        seen: set = set()
        for phrase in found_phrases:
            phrase = phrase.strip()
            if len(phrase) < 5 or phrase in seen:
                continue
            seen.add(phrase)
            if any(re.search(p, phrase) for p in self._ORG_PATTERNS):
                org_entities.append(phrase)
                continue
            if any(kw in phrase.lower() for kw in self._SOFTWARE_KEYWORDS):
                software_entities.append(phrase)
                continue
            if any(kw in phrase.lower() for kw in self._PRODUCT_KEYWORDS):
                product_entities.append(phrase)
                continue
            if any(s in phrase for s in self._PERSON_SUFFIXES):
                person_entities.append(phrase)
                continue

        for entry in schema:
            if not isinstance(entry, dict):
                continue
            t = entry.get("@type", "")
            name = entry.get("name", "")
            if isinstance(t, str) and name:
                tl = t.lower()
                if "organization" in tl and name not in org_entities:
                    org_entities.append(name)
                elif "product" in tl and name not in product_entities:
                    product_entities.append(name)
                elif "person" in tl and name not in person_entities:
                    person_entities.append(name)
                elif "software" in tl and name not in software_entities:
                    software_entities.append(name)

        brand = entry.get("brand", {}) if schema else {}
        if isinstance(brand, dict) and brand.get("name"):
            bn = brand["name"]
            if bn not in org_entities:
                org_entities.append(bn)

        entity_count = (
            len(org_entities) + len(product_entities)
            + len(person_entities) + len(software_entities)
        )
        wc = max(len(content.split()), 1)
        density = round(entity_count / (wc / 100), 2) if wc else 0.0
        has_kg = any(
            entry.get("@type", "").lower() in ("organization", "product", "person", "softwareapplication")
            for entry in schema if isinstance(entry, dict)
        )

        return {
            "organization_entity": len(org_entities) > 0,
            "product_entity": len(product_entities) > 0,
            "software_entity": len(software_entities) > 0,
            "person_entity": len(person_entities) > 0,
            "brand_entity": len(org_entities) > 0,
            "entity_count": entity_count,
            "entity_density": density,
            "knowledge_graph_ready": has_kg and entity_count >= 2,
        }

    # ------------------------------------------------------------------
    # Citation readiness
    # ------------------------------------------------------------------

    _CITATION_PATTERNS = [
        r"\[(?:\d+|[a-zA-Z]+(?:\s*[&+,/]\s*[a-zA-Z]+)*)\]",
        r"(?:according to|as reported by|cited in|source:|reference:)",
        r"(?:study|research|survey|report|data)\s+(?:by|from|shows|found|indicates)",
    ]
    _STATS_PATTERNS = [
        r"\d+(?:\.\d+)?%",
        r"\$\d+(?:,\d{3})*(?:\.\d+)?",
        r"\d+(?:\.\d+)?\s*(?:billion|million|thousand|trillion)",
        r"(?:increased|decreased|improved|grew|declined)\s+by\s+\d",
    ]
    _QUOTE_PATTERNS = [
        r'"[^"]{20,}"',
        r"'[^']{20,}'",
        r"(?:stated|said|mentioned|noted|explained|argued|wrote)\s*,?\s*[\"']",
    ]

    def _assess_citations(
        self, content: str, text_lower: str, html: str
    ) -> Dict[str, Any]:
        source_count = 0
        for pat in self._CITATION_PATTERNS:
            source_count += len(re.findall(pat, content, re.IGNORECASE))

        stat_count = 0
        for pat in self._STATS_PATTERNS:
            stat_count += len(re.findall(pat, content, re.IGNORECASE))

        quote_count = 0
        for pat in self._QUOTE_PATTERNS:
            quote_count += len(re.findall(pat, content, re.IGNORECASE))

        primary = bool(re.search(
            r"(?:original\s+(?:research|data|study|survey)|our\s+(?:own|internal)\s+(?:data|research|study))",
            text_lower
        ))
        secondary = source_count > 2

        has_original = primary or quote_count > 0
        has_expert = quote_count > 0 or bool(re.search(
            r"(?:expert|authority|specialist|professional|leader|CEO|CTO|founder)", text_lower
        ))
        has_stats = stat_count > 0
        has_primary = primary
        has_secondary = secondary

        citation_score = 0.0
        if has_original:
            citation_score += 25
        if has_expert:
            citation_score += 20
        if has_stats:
            citation_score += 20
        if has_primary:
            citation_score += 20
        if source_count >= 3:
            citation_score += 15
        citation_score = min(citation_score, 100.0)

        if citation_score >= 70:
            evidence = "STRONG"
        elif citation_score >= 45:
            evidence = "MODERATE"
        elif citation_score > 0:
            evidence = "WEAK"
        else:
            evidence = "NONE"

        return {
            "score": round(citation_score, 1),
            "has_original_research": has_original,
            "has_expert_quotes": has_expert,
            "has_statistics": has_stats,
            "has_primary_sources": has_primary,
            "has_secondary_sources": has_secondary,
            "source_count": source_count,
            "citation_score": round(citation_score, 1),
            "evidence_strength": evidence,
        }

    # ------------------------------------------------------------------
    # AEO
    # ------------------------------------------------------------------

    _QUESTION_MARKERS = [
        "what is", "what are", "what does", "how to", "how do",
        "how can", "how does", "why do", "why is", "why are",
        "where can", "where do", "when should", "when is", "which",
        "who is", "who are", "can you", "can i", "is it", "are there",
        "does", "do you", "what's", "how's", "is a", "is an",
    ]

    def _assess_aeo(
        self, content: str, text_lower: str, heading_texts: List[str],
        html: str, html_lower: str, schema_types: List[str], image_alts: List[str]
    ) -> Dict[str, Any]:
        questions_found = 0
        for marker in self._QUESTION_MARKERS:
            questions_found += text_lower.count(marker)
        for h in heading_texts:
            if "?" in h:
                questions_found += 1

        has_faq_schema = any("faq" in st.lower() for st in schema_types)
        faq_score = min((questions_found * 10) + (20 if has_faq_schema else 0), 100.0)

        voice_patterns = [
            r"(?:^|\n)\s*(?:what|how|why|where|when|who|which|can|is|are|do|does)\b",
            r"\b(?:step\s+\d|first|second|third|finally|next|then)\b",
        ]
        voice_hits = sum(len(re.findall(p, text_lower)) for p in voice_patterns)
        voice_ready = voice_hits >= 3 and word_count_min(content, 300)

        q_in_headings = sum(1 for h in heading_texts if "?" in h)
        definition_blocks = len(re.findall(
            r"(?:is\s+(?:a|an|the)\s+\w|(?:refers?\s+to|means?\s+that|defined?\s+as))",
            text_lower
        ))
        howto_steps = len(re.findall(
            r"(?:step\s+\d|^\s*\d+\.\s|first\s*,?\s|second\s*,?\s|third\s*,?\s|next\s*,?\s|finally\s*,?\s)",
            text_lower, re.MULTILINE
        ))
        table_count = html_lower.count("<table")
        list_count = html_lower.count("<ul") + html_lower.count("<ol")

        answer_comp = 0.0
        if definition_blocks > 0:
            answer_comp += min(definition_blocks * 15, 30)
        if howto_steps > 0:
            answer_comp += min(howto_steps * 10, 30)
        if q_in_headings > 0:
            answer_comp += min(q_in_headings * 10, 20)
        if table_count > 0:
            answer_comp += min(table_count * 10, 10)
        if list_count > 0:
            answer_comp += min(list_count * 5, 10)
        answer_comp = min(answer_comp, 100.0)

        if q_in_headings >= 3 and definition_blocks >= 2:
            snippet_prob = "HIGH"
        elif q_in_headings >= 1 or definition_blocks >= 1 or howto_steps >= 3:
            snippet_prob = "MEDIUM"
        else:
            snippet_prob = "LOW"

        def_quality = "STRONG" if definition_blocks >= 2 else ("MODERATE" if definition_blocks == 1 else "WEAK")
        howto_quality = "STRONG" if howto_steps >= 4 else ("MODERATE" if howto_steps >= 2 else "WEAK")

        return {
            "featured_snippet_probability": snippet_prob,
            "faq_quality": round(faq_score, 1),
            "voice_search_ready": voice_ready,
            "question_coverage": q_in_headings,
            "answer_completeness": round(answer_comp, 1),
            "definition_quality": def_quality,
            "howto_quality": howto_quality,
            "table_opportunities": max(3 - table_count, 0),
            "list_opportunities": max(5 - list_count, 0),
        }

    # ------------------------------------------------------------------
    # GEO
    # ------------------------------------------------------------------

    def _assess_geo(
        self, content: str, text_lower: str, schema_types: List[str],
        entity_data: Dict[str, Any], links_external: Any, external_count: int,
        heading_texts: List[str], title: str, word_count: int
    ) -> Dict[str, Any]:
        kg_score = 0.0
        if entity_data.get("organization_entity"):
            kg_score += 20
        if entity_data.get("product_entity"):
            kg_score += 15
        if entity_data.get("person_entity"):
            kg_score += 15
        if entity_data.get("knowledge_graph_ready"):
            kg_score += 20
        kg_schema = any(
            st.lower() in ("organization", "product", "person", "softwareapplication", "localbusiness")
            for st in schema_types
        )
        if kg_schema:
            kg_score += 15
        if entity_data.get("entity_count", 0) >= 3:
            kg_score += 15
        kg_score = min(kg_score, 100.0)

        entity_graph_ready = (
            entity_data.get("knowledge_graph_ready", False)
            and entity_data.get("entity_count", 0) >= 2
        )

        relationships: List[Dict[str, str]] = []
        if entity_data.get("organization_entity") and entity_data.get("product_entity"):
            relationships.append({
                "entity1": "Organization",
                "entity2": "Product",
                "relationship": "manufactures",
            })
        if entity_data.get("person_entity") and entity_data.get("organization_entity"):
            relationships.append({
                "entity1": "Person",
                "entity2": "Organization",
                "relationship": "affiliated_with",
            })
        if entity_data.get("software_entity") and entity_data.get("organization_entity"):
            relationships.append({
                "entity1": "Software",
                "entity2": "Organization",
                "relationship": "owned_by",
            })

        citation_graph = 0.0
        if external_count > 0:
            citation_graph += min(external_count * 8, 40)
        external_domains = self._unique_external_domains(links_external)
        if len(external_domains) >= 3:
            citation_graph += 20
        if re.search(r"(?:references?|sources?|bibliography|further reading)", text_lower):
            citation_graph += 20
        if re.search(r"\[\d+\]|\(\d{4}\)", content):
            citation_graph += 20
        citation_graph = min(citation_graph, 100.0)

        authority = 0.0
        if len(heading_texts) >= 3:
            authority += 15
        if word_count >= 1500:
            authority += 25
        elif word_count >= 800:
            authority += 15
        if entity_data.get("entity_count", 0) >= 2:
            authority += 15
        if schema_types:
            authority += min(len(schema_types) * 5, 20)
        if len(external_domains) >= 3:
            authority += 15
        if re.search(r"(?:expert|authority|professional|certified|accredited)", text_lower):
            authority += 10
        authority = min(authority, 100.0)

        return {
            "knowledge_graph_score": round(kg_score, 1),
            "entity_graph_ready": entity_graph_ready,
            "citation_graph_score": round(citation_graph, 1),
            "authority_graph_score": round(authority, 1),
            "entity_relationships": relationships,
        }

    @staticmethod
    def _unique_external_domains(links: Any) -> List[str]:
        if not isinstance(links, list):
            return []
        domains: set = set()
        for link in links:
            url = link if isinstance(link, str) else link.get("url", link.get("href", ""))
            m = re.match(r"https?://([^/]+)", url)
            if m:
                domains.add(m.group(1).lower())
        return list(domains)

    # ------------------------------------------------------------------
    # Platform scoring
    # ------------------------------------------------------------------

    def _score_platforms(
        self, content, text_lower, html, html_lower, title, meta_desc, h1,
        heading_texts, image_alts, internal_count, external_count,
        schema_types, word_count, entity_data, citation_data, aeo_data, geo_data,
        page_type, links_external, links_internal, schema
    ) -> Tuple[Dict[str, float], Dict[str, Dict[str, Any]]]:
        scores: Dict[str, float] = {}
        details: Dict[str, Dict[str, Any]] = {}

        for platform_name, scorer, tips_fn in [
            ("google_ai_overview", self._score_google_ai, self._tips_google_ai),
            ("chatgpt", self._score_chatgpt, self._tips_chatgpt),
            ("gemini", self._score_gemini, self._tips_gemini),
            ("claude", self._score_claude, self._tips_claude),
            ("perplexity", self._score_perplexity, self._tips_perplexity),
            ("copilot", self._score_copilot, self._tips_copilot),
        ]:
            score = scorer(
                content, text_lower, html, html_lower, title, meta_desc, h1,
                heading_texts, image_alts, internal_count, external_count,
                schema_types, word_count, entity_data, citation_data, aeo_data,
                geo_data, page_type, links_external, links_internal, schema
            )
            strengths, weaknesses = self._platform_strengths_weaknesses(
                platform_name, content, text_lower, html_lower, title, meta_desc,
                heading_texts, image_alts, internal_count, external_count,
                schema_types, word_count, entity_data, citation_data, aeo_data,
                geo_data
            )
            tips = tips_fn(
                score, content, word_count, heading_texts, schema_types,
                image_alts, entity_data, citation_data, aeo_data, geo_data,
                strengths, weaknesses
            )
            scores[platform_name] = round(score, 1)
            details[platform_name] = {
                "score": round(score, 1),
                "strengths": strengths,
                "weaknesses": weaknesses,
                "optimization_tips": tips,
            }

        return scores, details

    # -- Google AI Overview ------------------------------------------------

    def _score_google_ai(
        self, content, text_lower, html, html_lower, title, meta_desc, h1,
        heading_texts, image_alts, internal_count, external_count,
        schema_types, word_count, entity_data, citation_data, aeo_data,
        geo_data, page_type, links_external, links_internal, schema
    ) -> float:
        s = 0.0
        list_count = html_lower.count("<ul") + html_lower.count("<ol")
        table_count = html_lower.count("<table")
        if list_count >= 3:
            s += 15
        elif list_count >= 1:
            s += 8
        if table_count >= 1:
            s += 12
        def_blocks = len(re.findall(
            r"(?:is\s+(?:a|an|the)\s+\w|(?:refers?\s+to|means?\s+that|defined?\s+as))",
            text_lower
        ))
        if def_blocks >= 2:
            s += 15
        elif def_blocks >= 1:
            s += 8
        if aeo_data.get("faq_quality", 0) >= 40:
            s += 12
        elif aeo_data.get("faq_quality", 0) > 0:
            s += 6
        if "FAQPage" in schema_types:
            s += 8
        howto_steps = len(re.findall(r"(?:step\s+\d|^\s*\d+\.\s)", text_lower, re.MULTILINE))
        if howto_steps >= 3:
            s += 10
        elif howto_steps >= 1:
            s += 5
        if word_count >= 800:
            s += 8
        elif word_count >= 400:
            s += 4
        if aeo_data.get("answer_completeness", 0) >= 60:
            s += 10
        elif aeo_data.get("answer_completeness", 0) >= 30:
            s += 5
        if entity_data.get("entity_count", 0) >= 2:
            s += 5
        if internal_count >= 3:
            s += 5
        return min(s, 100.0)

    # -- ChatGPT -----------------------------------------------------------

    def _score_chatgpt(
        self, content, text_lower, html, html_lower, title, meta_desc, h1,
        heading_texts, image_alts, internal_count, external_count,
        schema_types, word_count, entity_data, citation_data, aeo_data,
        geo_data, page_type, links_external, links_internal, schema
    ) -> float:
        s = 0.0
        has_article = any(st.lower() in ("article", "blogposting", "newsarticle", "techarticle") for st in schema_types)
        if has_article:
            s += 12
        h_count = len(heading_texts)
        if h_count >= 5:
            s += 12
        elif h_count >= 3:
            s += 6
        def_blocks = len(re.findall(
            r"(?:is\s+(?:a|an|the)\s+\w|(?:refers?\s+to))", text_lower
        ))
        if def_blocks >= 2:
            s += 10
        elif def_blocks >= 1:
            s += 5
        if citation_data.get("source_count", 0) >= 3:
            s += 12
        elif citation_data.get("source_count", 0) >= 1:
            s += 6
        if word_count >= 1500:
            s += 12
        elif word_count >= 800:
            s += 6
        elif word_count >= 400:
            s += 3
        if schema_types:
            s += min(len(schema_types) * 3, 10)
        if meta_desc and len(meta_desc) > 80:
            s += 5
        if title and len(title.split()) >= 3:
            s += 5
        if h1 and h1.strip():
            s += 5
        if entity_data.get("entity_count", 0) >= 2:
            s += 5
        if internal_count >= 2:
            s += 5
        if aeo_data.get("answer_completeness", 0) >= 50:
            s += 7
        elif aeo_data.get("answer_completeness", 0) >= 25:
            s += 3
        return min(s, 100.0)

    # -- Gemini ------------------------------------------------------------

    def _score_gemini(
        self, content, text_lower, html, html_lower, title, meta_desc, h1,
        heading_texts, image_alts, internal_count, external_count,
        schema_types, word_count, entity_data, citation_data, aeo_data,
        geo_data, page_type, links_external, links_internal, schema
    ) -> float:
        s = 0.0
        has_faq = any("faq" in st.lower() for st in schema_types)
        has_howto = any("howto" in st.lower() for st in schema_types)
        if has_faq:
            s += 15
        if has_howto:
            s += 12
        if len(schema_types) >= 2:
            s += 10
        elif len(schema_types) >= 1:
            s += 5
        h_count = len(heading_texts)
        if h_count >= 5:
            s += 12
        elif h_count >= 3:
            s += 6
        stat_count = len(re.findall(r"\d+(?:\.\d+)?%", text_lower))
        if stat_count >= 5:
            s += 12
        elif stat_count >= 1:
            s += 6
        if word_count >= 1000:
            s += 10
        elif word_count >= 500:
            s += 5
        list_count = html_lower.count("<ul") + html_lower.count("<ol")
        if list_count >= 2:
            s += 8
        elif list_count >= 1:
            s += 4
        if entity_data.get("entity_count", 0) >= 3:
            s += 8
        elif entity_data.get("entity_count", 0) >= 1:
            s += 4
        if aeo_data.get("definition_quality") in ("STRONG", "MODERATE"):
            s += 8
        if external_count >= 2:
            s += 5
        if internal_count >= 2:
            s += 5
        return min(s, 100.0)

    # -- Claude ------------------------------------------------------------

    def _score_claude(
        self, content, text_lower, html, html_lower, title, meta_desc, h1,
        heading_texts, image_alts, internal_count, external_count,
        schema_types, word_count, entity_data, citation_data, aeo_data,
        geo_data, page_type, links_external, links_internal, schema
    ) -> float:
        s = 0.0
        if word_count >= 2000:
            s += 15
        elif word_count >= 1000:
            s += 10
        elif word_count >= 500:
            s += 5
        has_expert = citation_data.get("has_expert_quotes", False)
        if has_expert:
            s += 12
        has_original = citation_data.get("has_original_research", False)
        if has_original:
            s += 10
        balance_markers = len(re.findall(
            r"(?:however|although|on the other hand|conversely|in contrast|despite|nevertheless|nonetheless|advantage|disadvantage|pros?\s*(?:and|vs|or)\s*cons?)",
            text_lower
        ))
        if balance_markers >= 3:
            s += 15
        elif balance_markers >= 1:
            s += 7
        nuance_markers = len(re.findall(
            r"(?:it\s+depends|contextual|nuanced|generally|typically|often|usually|may\s+vary|not\s+always)",
            text_lower
        ))
        if nuance_markers >= 3:
            s += 12
        elif nuance_markers >= 1:
            s += 6
        h_count = len(heading_texts)
        if h_count >= 5:
            s += 10
        elif h_count >= 3:
            s += 5
        if citation_data.get("source_count", 0) >= 3:
            s += 10
        elif citation_data.get("source_count", 0) >= 1:
            s += 5
        if word_count >= 1500:
            s += 8
        if entity_data.get("entity_count", 0) >= 2:
            s += 5
        if schema_types:
            s += 3
        return min(s, 100.0)

    # -- Perplexity --------------------------------------------------------

    def _score_perplexity(
        self, content, text_lower, html, html_lower, title, meta_desc, h1,
        heading_texts, image_alts, internal_count, external_count,
        schema_types, word_count, entity_data, citation_data, aeo_data,
        geo_data, page_type, links_external, links_internal, schema
    ) -> float:
        s = 0.0
        source_count = citation_data.get("source_count", 0)
        if source_count >= 5:
            s += 20
        elif source_count >= 3:
            s += 14
        elif source_count >= 1:
            s += 7
        if citation_data.get("has_statistics", False):
            s += 12
        ref_markers = len(re.findall(
            r"(?:reference|source|citation|study|data|report)\s*(?:\[\d+\]|\(\d{4}\))",
            text_lower
        ))
        if ref_markers >= 3:
            s += 12
        elif ref_markers >= 1:
            s += 6
        numbered = len(re.findall(r"\[(?:\d+|[a-zA-Z]+)\]", content))
        if numbered >= 3:
            s += 10
        elif numbered >= 1:
            s += 5
        if external_count >= 5:
            s += 12
        elif external_count >= 3:
            s += 8
        elif external_count >= 1:
            s += 4
        if word_count >= 1000:
            s += 8
        elif word_count >= 500:
            s += 4
        if citation_data.get("has_primary_sources", False):
            s += 10
        if citation_data.get("has_secondary_sources", False):
            s += 6
        if len(re.findall(r"\d+(?:\.\d+)?%", text_lower)) >= 3:
            s += 7
        if len(heading_texts) >= 4:
            s += 5
        return min(s, 100.0)

    # -- Copilot -----------------------------------------------------------

    def _score_copilot(
        self, content, text_lower, html, html_lower, title, meta_desc, h1,
        heading_texts, image_alts, internal_count, external_count,
        schema_types, word_count, entity_data, citation_data, aeo_data,
        geo_data, page_type, links_external, links_internal, schema
    ) -> float:
        s = 0.0
        if schema_types:
            s += min(len(schema_types) * 4, 16)
        fact_markers = len(re.findall(
            r"(?:is\s+a|is\s+an|are\s+a|defined?\s+as|known\s+as|consists?\s+of|includes?\s+)",
            text_lower
        ))
        if fact_markers >= 5:
            s += 14
        elif fact_markers >= 2:
            s += 7
        if word_count >= 800:
            s += 10
        elif word_count >= 400:
            s += 5
        microsoft_signals = len(re.findall(
            r"(?:microsoft|azure|office|windows|power\s*bi|teams|outlook|bing|github|visual\s*studio)",
            text_lower
        ))
        if microsoft_signals >= 2:
            s += 12
        elif microsoft_signals >= 1:
            s += 6
        table_count = html_lower.count("<table")
        if table_count >= 2:
            s += 10
        elif table_count >= 1:
            s += 5
        if entity_data.get("organization_entity", False):
            s += 8
        if h1 and h1.strip():
            s += 5
        if meta_desc:
            s += 5
        if internal_count >= 3:
            s += 5
        if len(heading_texts) >= 4:
            s += 5
        if entity_data.get("entity_count", 0) >= 2:
            s += 5
        if citation_data.get("has_statistics", False):
            s += 5
        return min(s, 100.0)

    # ------------------------------------------------------------------
    # Platform strengths / weaknesses
    # ------------------------------------------------------------------

    def _platform_strengths_weaknesses(
        self, platform_name, content, text_lower, html_lower, title, meta_desc,
        heading_texts, image_alts, internal_count, external_count,
        schema_types, word_count, entity_data, citation_data, aeo_data, geo_data
    ) -> Tuple[List[str], List[str]]:
        strengths: List[str] = []
        weaknesses: List[str] = []
        list_count = html_lower.count("<ul") + html_lower.count("<ol")
        table_count = html_lower.count("<table")
        def_blocks = len(re.findall(
            r"(?:is\s+(?:a|an|the)\s+\w|(?:refers?\s+to|means?\s+that|defined?\s+as))",
            text_lower
        ))
        balance_markers = len(re.findall(
            r"(?:however|although|on the other hand|conversely|in contrast|despite|nevertheless)",
            text_lower
        ))
        nuance_markers = len(re.findall(
            r"(?:it\s+depends|contextual|nuanced|generally|typically|often|usually|may\s+vary)",
            text_lower
        ))

        if platform_name == "google_ai_overview":
            if list_count >= 2:
                strengths.append("Well-structured lists for snippet extraction")
            if table_count >= 1:
                strengths.append("Tables present for data-rich content")
            if def_blocks >= 2:
                strengths.append("Clear definitions suitable for answer boxes")
            if aeo_data.get("faq_quality", 0) >= 40:
                strengths.append("Strong FAQ content")
            if "FAQPage" in schema_types:
                strengths.append("FAQPage schema implemented")
            if aeo_data.get("answer_completeness", 0) >= 60:
                strengths.append("High answer completeness")
            if word_count < 300:
                weaknesses.append("Content too thin for comprehensive AI overview")
            if list_count < 2:
                weaknesses.append("Insufficient lists for snippet extraction")
            if def_blocks < 2:
                weaknesses.append("Missing clear definitions for answer boxes")
            if "FAQPage" not in schema_types:
                weaknesses.append("No FAQPage schema markup")
            if aeo_data.get("answer_completeness", 0) < 30:
                weaknesses.append("Low answer completeness for AI overview")

        elif platform_name == "chatgpt":
            if any(st.lower() in ("article", "blogposting", "newsarticle") for st in schema_types):
                strengths.append("Article schema markup present")
            if word_count >= 1000:
                strengths.append("Comprehensive long-form content")
            if citation_data.get("source_count", 0) >= 3:
                strengths.append("Good source citation count")
            if def_blocks >= 2:
                strengths.append("Clear definitions for context understanding")
            if len(heading_texts) >= 5:
                strengths.append("Well-structured heading hierarchy")
            if meta_desc and len(meta_desc) > 80:
                strengths.append("Descriptive meta description")
            if word_count < 500:
                weaknesses.append("Insufficient content depth for ChatGPT context")
            if citation_data.get("source_count", 0) < 2:
                weaknesses.append("Few source citations")
            if len(heading_texts) < 3:
                weaknesses.append("Poor heading structure")
            if not meta_desc:
                weaknesses.append("Missing meta description")

        elif platform_name == "gemini":
            if any("faq" in st.lower() for st in schema_types):
                strengths.append("FAQPage schema for Gemini answers")
            if any("howto" in st.lower() for st in schema_types):
                strengths.append("HowTo schema for step-by-step queries")
            if len(schema_types) >= 2:
                strengths.append("Multiple schema types implemented")
            if len(heading_texts) >= 4:
                strengths.append("Clear heading structure")
            if len(re.findall(r"\d+(?:\.\d+)?%", text_lower)) >= 3:
                strengths.append("Data-rich content with statistics")
            if word_count < 500:
                weaknesses.append("Thin content for Gemini extraction")
            if not any("faq" in st.lower() for st in schema_types) and not any("howto" in st.lower() for st in schema_types):
                weaknesses.append("No FAQ or HowTo schema")
            if len(heading_texts) < 3:
                weaknesses.append("Weak heading structure")
            if len(schema_types) < 1:
                weaknesses.append("No structured data markup")

        elif platform_name == "claude":
            if word_count >= 1500:
                strengths.append("Substantial long-form analysis")
            if citation_data.get("has_expert_quotes", False):
                strengths.append("Expert quotes present")
            if citation_data.get("has_original_research", False):
                strengths.append("Original research cited")
            if balance_markers >= 2:
                strengths.append("Balanced viewpoints presented")
            if nuance_markers >= 3:
                strengths.append("Nuanced analysis")
            if citation_data.get("source_count", 0) >= 3:
                strengths.append("Well-sourced content")
            if word_count < 800:
                weaknesses.append("Limited depth for nuanced analysis")
            if balance_markers < 1:
                weaknesses.append("Lack of balanced viewpoints")
            if nuance_markers < 1:
                weaknesses.append("Missing nuanced or contextual language")
            if not citation_data.get("has_expert_quotes", False):
                weaknesses.append("No expert quotes or authority signals")

        elif platform_name == "perplexity":
            if citation_data.get("source_count", 0) >= 5:
                strengths.append("Rich citation network")
            if citation_data.get("has_statistics", False):
                strengths.append("Statistical evidence present")
            if external_count >= 5:
                strengths.append("Many external references")
            if citation_data.get("has_primary_sources", False):
                strengths.append("Primary sources referenced")
            if word_count >= 1000:
                strengths.append("Sufficient content depth")
            if citation_data.get("source_count", 0) < 3:
                weaknesses.append("Insufficient citations for Perplexity")
            if not citation_data.get("has_statistics", False):
                weaknesses.append("No statistical data")
            if external_count < 3:
                weaknesses.append("Few external references")
            if not citation_data.get("has_primary_sources", False):
                weaknesses.append("No primary source references")

        elif platform_name == "copilot":
            if len(schema_types) >= 2:
                strengths.append("Rich structured data")
            if table_count >= 1:
                strengths.append("Data tables for factual extraction")
            if word_count >= 800:
                strengths.append("Comprehensive factual content")
            if len(heading_texts) >= 4:
                strengths.append("Clear factual structure")
            if entity_data.get("organization_entity", False):
                strengths.append("Organization entity identified")
            if len(schema_types) < 1:
                weaknesses.append("No structured data for Microsoft ecosystem")
            if fact_markers := len(re.findall(
                r"(?:is\s+a|is\s+an|defined?\s+as|known\s+as)", text_lower
            )) < 3:
                weaknesses.append("Insufficient factual statements")
            if table_count < 1:
                weaknesses.append("No data tables for factual extraction")
            if word_count < 500:
                weaknesses.append("Thin content")

        return strengths, weaknesses

    # ------------------------------------------------------------------
    # Platform-specific optimization tips
    # ------------------------------------------------------------------

    def _tips_google_ai(
        self, score, content, word_count, heading_texts, schema_types,
        image_alts, entity_data, citation_data, aeo_data, geo_data,
        strengths, weaknesses
    ) -> List[str]:
        tips: List[str] = []
        if score < 60:
            tips.append("Add numbered lists and bullet points to improve snippet extraction")
            tips.append("Create clear definitions with 'X is a Y' format")
        if "FAQPage" not in schema_types:
            tips.append("Implement FAQPage schema with 3-5 common questions")
        if aeo_data.get("answer_completeness", 0) < 50:
            tips.append("Improve answer completeness with concise 40-60 word paragraph answers")
        if len(re.findall(r"<table", content.lower())) < 1:
            tips.append("Add comparison tables for data-rich content")
        if word_count < 800:
            tips.append("Expand content to 800+ words for richer AI overview selection")
        return tips

    def _tips_chatgpt(
        self, score, content, word_count, heading_texts, schema_types,
        image_alts, entity_data, citation_data, aeo_data, geo_data,
        strengths, weaknesses
    ) -> List[str]:
        tips: List[str] = []
        if not any(st.lower() in ("article", "blogposting") for st in schema_types):
            tips.append("Add Article or BlogPosting schema markup")
        if citation_data.get("source_count", 0) < 3:
            tips.append("Add more source citations and reference links")
        if word_count < 1000:
            tips.append("Expand to 1000+ words for comprehensive context")
        if len(heading_texts) < 5:
            tips.append("Structure content with 5+ descriptive headings")
        if not citation_data.get("has_expert_quotes", False):
            tips.append("Include expert quotes or authority statements")
        if aeo_data.get("definition_quality") == "WEAK":
            tips.append("Add clear definitions at the start of each section")
        return tips

    def _tips_gemini(
        self, score, content, word_count, heading_texts, schema_types,
        image_alts, entity_data, citation_data, aeo_data, geo_data,
        strengths, weaknesses
    ) -> List[str]:
        tips: List[str] = []
        if not any("faq" in st.lower() for st in schema_types):
            tips.append("Implement FAQPage schema for direct question-answer pairing")
        if not any("howto" in st.lower() for st in schema_types):
            tips.append("Add HowTo schema for step-by-step process content")
        if len(re.findall(r"\d+(?:\.\d+)?%", content.lower())) < 3:
            tips.append("Include more statistics and numerical data")
        if len(heading_texts) < 4:
            tips.append("Add descriptive H2/H3 headings for content segmentation")
        if len(schema_types) < 2:
            tips.append("Implement at least 2 schema types for richer extraction")
        return tips

    def _tips_claude(
        self, score, content, word_count, heading_texts, schema_types,
        image_alts, entity_data, citation_data, aeo_data, geo_data,
        strengths, weaknesses
    ) -> List[str]:
        tips: List[str] = []
        balance_markers = len(re.findall(
            r"(?:however|although|on the other hand|conversely|in contrast|despite)",
            content.lower()
        ))
        if balance_markers < 2:
            tips.append("Add balanced viewpoints with contrasting perspectives")
        if word_count < 1500:
            tips.append("Expand to 1500+ words for deep nuanced analysis")
        if not citation_data.get("has_expert_quotes", False):
            tips.append("Include expert quotes with attribution")
        nuance = len(re.findall(
            r"(?:it\s+depends|contextual|nuanced|generally|typically|often|usually)",
            content.lower()
        ))
        if nuance < 2:
            tips.append("Add contextual language and nuance markers")
        if not citation_data.get("has_original_research", False):
            tips.append("Cite or present original research data")
        return tips

    def _tips_perplexity(
        self, score, content, word_count, heading_texts, schema_types,
        image_alts, entity_data, citation_data, aeo_data, geo_data,
        strengths, weaknesses
    ) -> List[str]:
        tips: List[str] = []
        if citation_data.get("source_count", 0) < 5:
            tips.append("Increase source citations to 5+ numbered references")
        if not citation_data.get("has_statistics", False):
            tips.append("Add statistical data with percentages and numbers")
        if not citation_data.get("has_primary_sources", False):
            tips.append("Reference primary sources with direct attribution")
        if word_count < 1000:
            tips.append("Expand content to 1000+ words for deeper research signals")
        if len(re.findall(r"\[\d+\]", content)) < 3:
            tips.append("Use numbered citation format [1], [2], [3] inline")
        return tips

    def _tips_copilot(
        self, score, content, word_count, heading_texts, schema_types,
        image_alts, entity_data, citation_data, aeo_data, geo_data,
        strengths, weaknesses
    ) -> List[str]:
        tips: List[str] = []
        if len(schema_types) < 2:
            tips.append("Add Organization and WebPage schema for Microsoft ecosystem")
        if len(re.findall(r"<table", content.lower())) < 1:
            tips.append("Add structured tables for factual data presentation")
        if word_count < 800:
            tips.append("Expand content to 800+ words for comprehensive coverage")
        fact_count = len(re.findall(
            r"(?:is\s+a|is\s+an|defined?\s+as|known\s+as)", content.lower()
        ))
        if fact_count < 5:
            tips.append("Add more definitive factual statements")
        if len(heading_texts) < 4:
            tips.append("Use structured headings for factual organization")
        return tips

    # ------------------------------------------------------------------
    # Why not ranking
    # ------------------------------------------------------------------

    def _why_not_ranking(
        self, content, word_count, title, meta_desc, heading_texts,
        schema_types, internal_count, external_count, aeo_data, platform_scores,
        page_type, image_alts, entity_data
    ) -> List[str]:
        reasons: List[str] = []
        if word_count < 300:
            reasons.append("Content is too thin (under 300 words) for AI selection")
        if word_count < 800:
            reasons.append("Content lacks depth — 800+ words recommended for AI answers")
        if not title or len(title) < 10:
            reasons.append("Title is missing or too short")
        if not meta_desc:
            reasons.append("Meta description missing — reduces AI preview quality")
        if len(heading_texts) < 3:
            reasons.append("Insufficient heading structure for content parsing")
        if not schema_types:
            reasons.append("No structured data schema implemented")
        if internal_count < 2:
            reasons.append("Very few internal links reduce topical authority signals")
        if aeo_data.get("answer_completeness", 0) < 30:
            reasons.append("Low answer completeness — AI cannot extract concise answers")
        if aeo_data.get("featured_snippet_probability") == "LOW":
            reasons.append("Featured snippet probability is low — not optimized for AI extraction")
        if entity_data.get("entity_count", 0) < 1:
            reasons.append("No identifiable entities — reduces knowledge graph association")
        avg = sum(platform_scores.values()) / max(len(platform_scores), 1)
        if avg < 30:
            reasons.append("Overall AI platform scores are critically low across all platforms")
        elif avg < 50:
            reasons.append("Below-average AI platform scores indicate broad optimization gaps")
        return reasons

    # ------------------------------------------------------------------
    # Why not cited
    # ------------------------------------------------------------------

    def _why_not_cited(
        self, citation_data, entity_data, aeo_data, platform_scores, content, word_count
    ) -> List[str]:
        reasons: List[str] = []
        if citation_data.get("source_count", 0) == 0:
            reasons.append("No source citations found — AI systems prefer content with references")
        if citation_data.get("source_count", 0) < 3:
            reasons.append("Too few citations (need 3+ for AI citation confidence)")
        if not citation_data.get("has_statistics", False):
            reasons.append("No statistical data present — AI cites data-rich content")
        if not citation_data.get("has_expert_quotes", False):
            reasons.append("No expert quotes — authority signals missing")
        if not citation_data.get("has_original_research", False):
            reasons.append("No original research — AI favors unique data sources")
        if not citation_data.get("has_primary_sources", False):
            reasons.append("No primary source references cited")
        if entity_data.get("entity_count", 0) < 2:
            reasons.append("Insufficient entity coverage for knowledge graph citation")
        if aeo_data.get("answer_completeness", 0) < 40:
            reasons.append("Answer completeness too low for AI to extract citable content")
        if word_count < 500:
            reasons.append("Content too brief to generate citation-worthy statements")
        avg = sum(platform_scores.values()) / max(len(platform_scores), 1)
        if avg < 40:
            reasons.append("Low platform scores indicate content is not AI-optimized")
        return reasons

    # ------------------------------------------------------------------
    # Optimization actions
    # ------------------------------------------------------------------

    def _optimization_actions(
        self, platform_details, platform_scores, why_not_ranking, why_not_cited
    ) -> List[Dict[str, str]]:
        actions: List[Dict[str, str]] = []

        for platform_name, detail in platform_details.items():
            score = detail.get("score", 0)
            tips = detail.get("optimization_tips", [])
            for tip in tips:
                if score < 30:
                    priority = "CRITICAL"
                elif score < 50:
                    priority = "HIGH"
                elif score < 70:
                    priority = "MEDIUM"
                else:
                    priority = "LOW"
                impact_map = {
                    "CRITICAL": "HIGH",
                    "HIGH": "MEDIUM",
                    "MEDIUM": "MEDIUM",
                    "LOW": "LOW",
                }
                actions.append({
                    "platform": platform_name,
                    "action": tip,
                    "impact": impact_map.get(priority, "MEDIUM"),
                    "priority": priority,
                })

        low_platforms = [p for p, s in platform_scores.items() if s < 40]
        if low_platforms:
            actions.append({
                "platform": "all",
                "action": "Focus on platforms with lowest scores: " + ", ".join(low_platforms),
                "impact": "HIGH",
                "priority": "CRITICAL",
            })

        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        actions.sort(key=lambda a: priority_order.get(a.get("priority", "LOW"), 4))

        seen: set = set()
        unique: List[Dict[str, str]] = []
        for action in actions:
            key = (action["platform"], action["action"])
            if key not in seen:
                seen.add(key)
                unique.append(action)
        return unique


def word_count_min(text: str, minimum: int) -> bool:
    return len(text.split()) >= minimum
