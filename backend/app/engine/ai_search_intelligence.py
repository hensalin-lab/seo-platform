"""
AI Search Intelligence Engine
Per-platform scoring, citation analysis, entity analysis,
AI extraction previews, and prioritized optimization actions.
"""
import re
import json
from typing import Any, Dict, List


class AiSearchIntelligenceEngine:

    def analyze(self, page: Dict[str, Any], all_pages: List[Dict[str, Any]] = None) -> Dict[str, Any]:
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

        if isinstance(schema, str):
            try:
                schema = json.loads(schema)
            except Exception:
                schema = []
        if not isinstance(schema, list):
            schema = [schema] if schema else []

        text_lower = content.lower() if content else ""
        html_lower = html.lower() if html else ""

        heading_texts = self._heading_texts(headings)
        image_alts = self._image_alts(images)
        internal_count = len(links_internal) if isinstance(links_internal, list) else 0
        external_count = len(links_external) if isinstance(links_external, list) else 0
        schema_types = self._schema_types(schema)

        entities = self._analyze_entities(content, title, meta_desc, schema)
        citations = self._analyze_citations(content, text_lower, links_external)
        platforms = self._score_all_platforms(
            content, text_lower, html_lower, title, meta_desc, h1,
            heading_texts, image_alts, internal_count, external_count,
            schema_types, word_count, entities, citations
        )
        overall = sum(p["score"] for p in platforms.values()) / max(len(platforms), 1)

        ai_preview = self._generate_ai_preview(content, title, meta_desc, heading_texts, word_count)
        ai_answer_quality = self._score_ai_answer_quality(content, text_lower, heading_texts, schema_types, entities, citations, word_count)
        entity_analysis = self._detailed_entity_analysis(content, title, schema, entities)
        citation_analysis = self._detailed_citation_analysis(content, text_lower, citations, links_external)
        why_cited_or_not = self._why_cited_or_not(content, word_count, entities, citations, heading_texts, schema_types, platform_scores=platforms)
        readiness_checklist = self._ai_readiness_checklist(content, text_lower, heading_texts, schema_types, entities, citations, links_external, word_count)
        optimization_plan = self._prioritized_actions(platforms, entities, citations, ai_answer_quality, readiness_checklist, word_count, heading_texts, schema_types)
        competitor_comparison = self._competitor_comparison(all_pages, entities, citations, schema_types) if all_pages else {}

        platform_signal_breakdowns = self._platform_signal_breakdowns(
            content, text_lower, html_lower, title, meta_desc, h1,
            heading_texts, image_alts, internal_count, external_count,
            schema_types, word_count, entities, citations
        )

        citation_probability = self._citation_probability(platforms, citations, entities, word_count)

        hallucination_risk = self._hallucination_risk(content, title, meta_desc, heading_texts, word_count)

        content_completeness = self._content_completeness_check(content, title, meta_desc, heading_texts, page_type=page_type if "page_type" in dir() else "BLOG")

        freshness_analysis = self._freshness_analysis(content)

        citation_quality = self._citation_quality_analysis(content, text_lower, links_external)

        optimization_simulator = self._optimization_simulator(platforms, citation_probability, entities, word_count)

        ai_overview_eligibility = self._ai_overview_eligibility(content, text_lower, heading_texts, schema_types, entities, citations, word_count)

        predicted_scores = self._predict_future_scores(platforms, optimization_plan)

        return {
            "url": url,
            "overall_ai_score": round(overall, 1),
            "platform_scores": platforms,
            "platform_signal_breakdowns": platform_signal_breakdowns,
            "ai_preview": ai_preview,
            "ai_answer_quality": ai_answer_quality,
            "entity_analysis": entity_analysis,
            "citation_analysis": citation_analysis,
            "citation_probability": citation_probability,
            "citation_quality": citation_quality,
            "hallucination_risk": hallucination_risk,
            "content_completeness": content_completeness,
            "freshness_analysis": freshness_analysis,
            "why_cited_or_not": why_cited_or_not,
            "readiness_checklist": readiness_checklist,
            "optimization_plan": optimization_plan,
            "optimization_simulator": optimization_simulator,
            "ai_overview_eligibility": ai_overview_eligibility,
            "competitor_comparison": competitor_comparison,
            "predicted_scores": predicted_scores,
            "estimated_after_fixes": self._estimate_after_fixes(platforms, optimization_plan),
        }

    def _heading_texts(self, headings):
        if not isinstance(headings, list):
            return []
        result = []
        for h in headings:
            if isinstance(h, str):
                result.append(h)
            elif isinstance(h, dict):
                result.append(h.get("text", h.get("content", "")))
        return result

    def _image_alts(self, images):
        if not isinstance(images, list):
            return []
        result = []
        for img in images:
            if isinstance(img, dict):
                result.append(img.get("alt", img.get("alt_text", "")))
            elif isinstance(img, str):
                result.append(img)
        return result

    def _schema_types(self, schema):
        types = []
        for entry in schema:
            if isinstance(entry, dict):
                t = entry.get("@type", "")
                if isinstance(t, str) and t:
                    types.append(t)
                elif isinstance(t, list):
                    types.extend(str(x) for x in t)
        return types

    def _analyze_entities(self, content, title, meta_desc, schema):
        combined = f"{title} {meta_desc} {content}"
        capitalized = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b', combined)
        seen = set()
        org_entities = []
        product_entities = []
        person_entities = []
        software_entities = []
        brand_entities = []

        for phrase in capitalized:
            phrase = phrase.strip()
            if len(phrase) < 5 or phrase in seen:
                continue
            seen.add(phrase)
            if any(w in phrase.lower() for w in ("inc", "llc", "corp", "company", "group")):
                org_entities.append(phrase)
            elif any(w in phrase.lower() for w in ("saas", "platform", "software", "tool", "app")):
                software_entities.append(phrase)
            elif any(w in phrase.lower() for w in ("product", "solution", "suite")):
                product_entities.append(phrase)
            elif any(w in phrase for w in ("PhD", "CEO", "CTO", "Dr.", "Prof.")):
                person_entities.append(phrase)

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
            brand = entry.get("brand", {})
            if isinstance(brand, dict) and brand.get("name"):
                bn = brand["name"]
                if bn not in brand_entities:
                    brand_entities.append(bn)

        total = len(org_entities) + len(product_entities) + len(person_entities) + len(software_entities) + len(brand_entities)
        wc = max(len(content.split()) if content else 1, 1)

        return {
            "detected": {
                "organizations": org_entities[:10],
                "products": product_entities[:10],
                "persons": person_entities[:10],
                "software": software_entities[:10],
                "brands": brand_entities[:10],
            },
            "total_count": total,
            "density": round(total / (wc / 100), 2),
            "knowledge_graph_ready": total >= 2 and any(
                entry.get("@type", "").lower() in ("organization", "product", "person", "softwareapplication")
                for entry in schema if isinstance(entry, dict)
            ),
        }

    def _analyze_citations(self, content, text_lower, links_external):
        source_patterns = [
            r"\[(?:\d+|[a-zA-Z]+)\]",
            r"(?:according to|as reported by|cited in|source:|reference:)",
            r"(?:study|research|survey|report|data)\s+(?:by|from|shows|found|indicates)",
        ]
        stat_patterns = [
            r"\d+(?:\.\d+)?%",
            r"\$\d+(?:,\d{3})*(?:\.\d+)?",
            r"\d+(?:\.\d+)?\s*(?:billion|million|thousand)",
        ]
        quote_patterns = [
            r'"[^"]{20,}"',
            r"(?:stated|said|mentioned|noted|explained)\s*,?\s*[\"']",
        ]

        source_count = sum(len(re.findall(p, content or "", re.IGNORECASE)) for p in source_patterns)
        stat_count = sum(len(re.findall(p, content or "", re.IGNORECASE)) for p in stat_patterns)
        quote_count = sum(len(re.findall(p, content or "", re.IGNORECASE)) for p in quote_patterns)
        primary = bool(re.search(r"(?:original\s+(?:research|data|study)|our\s+(?:own|internal)\s+(?:data|research))", text_lower))

        has_expert = bool(re.search(r"(?:expert|authority|specialist|professional|leader|CEO|CTO|founder)", text_lower))

        external_domains = set()
        for link in (links_external or []):
            url = link.get("url", "") if isinstance(link, dict) else str(link)
            m = re.match(r"https?://([^/]+)", url)
            if m:
                external_domains.add(m.group(1).lower())

        score = 0.0
        if source_count > 0:
            score += min(source_count * 10, 30)
        if stat_count > 0:
            score += min(stat_count * 8, 25)
        if quote_count > 0:
            score += min(quote_count * 10, 20)
        if primary:
            score += 15
        if has_expert:
            score += 10
        score = min(score, 100.0)

        if score >= 70:
            strength = "STRONG"
        elif score >= 45:
            strength = "MODERATE"
        elif score > 0:
            strength = "WEAK"
        else:
            strength = "NONE"

        return {
            "score": round(score, 1),
            "strength": strength,
            "source_count": source_count,
            "statistic_count": stat_count,
            "quote_count": quote_count,
            "has_original_research": primary,
            "has_expert_quotes": has_expert,
            "has_primary_sources": primary,
            "has_secondary_sources": source_count > 2,
            "external_domains_count": len(external_domains),
            "external_domains": sorted(external_domains)[:10],
        }

    def _score_all_platforms(self, content, text_lower, html_lower, title, meta_desc, h1,
                             heading_texts, image_alts, internal_count, external_count,
                             schema_types, word_count, entities, citations):
        platforms = {}

        # Google AI Overview
        s = 0.0
        list_count = html_lower.count("<ul") + html_lower.count("<ol")
        table_count = html_lower.count("<table")
        def_blocks = len(re.findall(r"(?:is\s+(?:a|an|the)\s+\w|(?:refers?\s+to|means?\s+that))", text_lower))
        q_in_headings = sum(1 for h in heading_texts if "?" in h)

        if list_count >= 3: s += 15
        elif list_count >= 1: s += 8
        if table_count >= 1: s += 12
        if def_blocks >= 2: s += 15
        elif def_blocks >= 1: s += 8
        if q_in_headings >= 2: s += 10
        if "FAQPage" in schema_types: s += 8
        howto = len(re.findall(r"(?:step\s+\d|^\s*\d+\.\s)", text_lower, re.MULTILINE))
        if howto >= 3: s += 10
        if word_count >= 800: s += 8
        if entities.get("total_count", 0) >= 2: s += 5
        if internal_count >= 3: s += 5

        google_reasons = []
        if list_count >= 2: google_reasons.append("Well-structured lists for snippet extraction")
        if table_count >= 1: google_reasons.append("Tables for data-rich content")
        if def_blocks >= 2: google_reasons.append("Clear definitions for answer boxes")
        if q_in_headings >= 2: google_reasons.append("Question headings match user queries")
        if "FAQPage" in schema_types: google_reasons.append("FAQPage schema for rich results")
        if word_count >= 800: google_reasons.append("Sufficient content depth")

        google_weak = []
        if list_count < 2: google_weak.append("Insufficient lists for snippet extraction")
        if table_count < 1: google_weak.append("No tables for data-rich content")
        if def_blocks < 2: google_weak.append("Missing clear definitions")
        if "FAQPage" not in schema_types: google_weak.append("No FAQPage schema")
        if word_count < 800: google_weak.append("Content depth below 800 words")

        platforms["google_ai_overview"] = {
            "score": round(min(s, 100), 1),
            "reason": "Strong structured content" if s >= 60 else "Needs improvement for AI extraction",
            "strengths": google_reasons,
            "weaknesses": google_weak,
        }

        # ChatGPT
        s2 = 0.0
        has_article = any(st.lower() in ("article", "blogposting", "newsarticle") for st in schema_types)
        if has_article: s2 += 12
        if len(heading_texts) >= 5: s2 += 12
        elif len(heading_texts) >= 3: s2 += 6
        if def_blocks >= 2: s2 += 10
        if citations.get("source_count", 0) >= 3: s2 += 12
        elif citations.get("source_count", 0) >= 1: s2 += 6
        if word_count >= 1500: s2 += 12
        elif word_count >= 800: s2 += 6
        if schema_types: s2 += min(len(schema_types) * 3, 10)
        if meta_desc and len(meta_desc) > 80: s2 += 5
        if title and len(title.split()) >= 3: s2 += 5
        if entities.get("total_count", 0) >= 2: s2 += 5

        chatgpt_reasons = []
        if word_count >= 1000: chatgpt_reasons.append("Comprehensive long-form content")
        if def_blocks >= 2: chatgpt_reasons.append("Clear definitions for context")
        if len(heading_texts) >= 5: chatgpt_reasons.append("Well-structured heading hierarchy")
        if citations.get("source_count", 0) >= 3: chatgpt_reasons.append("Good source citations")

        chatgpt_weak = []
        if word_count < 500: chatgpt_weak.append("Insufficient content depth")
        if citations.get("source_count", 0) < 2: chatgpt_weak.append("Few source citations")
        if not has_article: chatgpt_weak.append("No Article schema")

        platforms["chatgpt"] = {
            "score": round(min(s2, 100), 1),
            "reason": "Strong content structure" if s2 >= 60 else "Needs more depth and citations",
            "strengths": chatgpt_reasons,
            "weaknesses": chatgpt_weak,
        }

        # Gemini
        s3 = 0.0
        if "FAQPage" in schema_types: s3 += 15
        if any("howto" in st.lower() for st in schema_types): s3 += 12
        if len(schema_types) >= 2: s3 += 10
        if len(heading_texts) >= 5: s3 += 12
        elif len(heading_texts) >= 3: s3 += 6
        stat_count = len(re.findall(r"\d+(?:\.\d+)?%", text_lower))
        if stat_count >= 5: s3 += 12
        elif stat_count >= 1: s3 += 6
        if word_count >= 1000: s3 += 10
        if list_count >= 2: s3 += 8
        if entities.get("total_count", 0) >= 3: s3 += 8
        if external_count >= 2: s3 += 5

        gemini_reasons = []
        if "FAQPage" in schema_types: gemini_reasons.append("FAQPage schema for answers")
        if len(schema_types) >= 2: gemini_reasons.append("Multiple schema types")
        if len(heading_texts) >= 4: gemini_reasons.append("Clear heading structure")
        if stat_count >= 3: gemini_reasons.append("Data-rich with statistics")

        gemini_weak = []
        if not any("faq" in st.lower() for st in schema_types): gemini_weak.append("No FAQ schema")
        if word_count < 500: gemini_weak.append("Thin content")
        if len(heading_texts) < 3: gemini_weak.append("Weak heading structure")

        platforms["gemini"] = {
            "score": round(min(s3, 100), 1),
            "reason": "Good schema coverage" if s3 >= 60 else "Needs structured data improvements",
            "strengths": gemini_reasons,
            "weaknesses": gemini_weak,
        }

        # Claude
        s4 = 0.0
        if word_count >= 2000: s4 += 15
        elif word_count >= 1000: s4 += 10
        elif word_count >= 500: s4 += 5
        if citations.get("has_expert_quotes"): s4 += 12
        if citations.get("has_original_research"): s4 += 10
        balance = len(re.findall(r"(?:however|although|on the other hand|conversely|in contrast|despite|nevertheless)", text_lower))
        if balance >= 3: s4 += 15
        elif balance >= 1: s4 += 7
        nuance = len(re.findall(r"(?:it\s+depends|contextual|nuanced|generally|typically|often|usually)", text_lower))
        if nuance >= 3: s4 += 12
        elif nuance >= 1: s4 += 6
        if len(heading_texts) >= 5: s4 += 10
        if citations.get("source_count", 0) >= 3: s4 += 10

        claude_reasons = []
        if word_count >= 1500: claude_reasons.append("Substantial long-form analysis")
        if citations.get("has_expert_quotes"): claude_reasons.append("Expert quotes present")
        if citations.get("has_original_research"): claude_reasons.append("Original research cited")
        if balance >= 2: claude_reasons.append("Balanced viewpoints")
        if nuance >= 3: claude_reasons.append("Nuanced analysis")

        claude_weak = []
        if word_count < 800: claude_weak.append("Limited depth")
        if balance < 1: claude_weak.append("Lack of balanced viewpoints")
        if nuance < 1: claude_weak.append("Missing nuanced language")
        if not citations.get("has_expert_quotes"): claude_weak.append("No expert quotes")

        platforms["claude"] = {
            "score": round(min(s4, 100), 1),
            "reason": "Strong analytical depth" if s4 >= 60 else "Needs more depth and nuance",
            "strengths": claude_reasons,
            "weaknesses": claude_weak,
        }

        # Perplexity
        s5 = 0.0
        src = citations.get("source_count", 0)
        if src >= 5: s5 += 20
        elif src >= 3: s5 += 14
        elif src >= 1: s5 += 7
        if citations.get("has_statistics"): s5 += 12
        numbered = len(re.findall(r"\[(?:\d+|[a-zA-Z]+)\]", content or ""))
        if numbered >= 3: s5 += 10
        elif numbered >= 1: s5 += 5
        if external_count >= 5: s5 += 12
        elif external_count >= 3: s5 += 8
        if word_count >= 1000: s5 += 8
        if citations.get("has_primary_sources"): s5 += 10
        if citations.get("has_secondary_sources"): s5 += 6

        perpl_reasons = []
        if src >= 5: perpl_reasons.append("Rich citation network")
        if citations.get("has_statistics"): perpl_reasons.append("Statistical evidence present")
        if external_count >= 5: perpl_reasons.append("Many external references")
        if citations.get("has_primary_sources"): perpl_reasons.append("Primary sources referenced")

        perpl_weak = []
        if src < 3: perpl_weak.append("Insufficient citations")
        if not citations.get("has_statistics"): perpl_weak.append("No statistical data")
        if external_count < 3: perpl_weak.append("Few external references")
        if not citations.get("has_primary_sources"): perpl_weak.append("No primary sources")

        platforms["perplexity"] = {
            "score": round(min(s5, 100), 1),
            "reason": "Good source foundation" if s5 >= 60 else "Needs more citations and sources",
            "strengths": perpl_reasons,
            "weaknesses": perpl_weak,
        }

        # Copilot
        s6 = 0.0
        if schema_types: s6 += min(len(schema_types) * 4, 16)
        fact_markers = len(re.findall(r"(?:is\s+a|is\s+an|defined?\s+as|known\s+as|consists?\s+of)", text_lower))
        if fact_markers >= 5: s6 += 14
        elif fact_markers >= 2: s6 += 7
        if word_count >= 800: s6 += 10
        if table_count >= 2: s6 += 10
        elif table_count >= 1: s6 += 5
        if entities.get("detected", {}).get("organizations"): s6 += 8
        if h1: s6 += 5
        if meta_desc: s6 += 5
        if len(heading_texts) >= 4: s6 += 5

        copilot_reasons = []
        if schema_types: copilot_reasons.append("Rich structured data")
        if word_count >= 800: copilot_reasons.append("Comprehensive content")
        if len(heading_texts) >= 4: copilot_reasons.append("Clear factual structure")
        if entities.get("detected", {}).get("organizations"): copilot_reasons.append("Organization entity identified")

        copilot_weak = []
        if not schema_types: copilot_weak.append("No structured data")
        if fact_markers < 3: copilot_weak.append("Insufficient factual statements")
        if table_count < 1: copilot_weak.append("No data tables")

        platforms["copilot"] = {
            "score": round(min(s6, 100), 1),
            "reason": "Good factual structure" if s6 >= 60 else "Needs more structured data",
            "strengths": copilot_reasons,
            "weaknesses": copilot_weak,
        }

        return platforms

    def _generate_ai_preview(self, content, title, meta_desc, heading_texts, word_count):
        first_para = ""
        if content:
            paras = [p.strip() for p in re.split(r'\n\s*\n', content) if len(p.strip()) > 30]
            if paras:
                first_para = paras[0][:300]

        if not first_para and meta_desc:
            first_para = meta_desc

        return {
            "current_answer": first_para or f"{title or 'This page'} provides information about its topic.",
            "is_weak": len(first_para) < 100,
            "weakness_reason": "The opening paragraph is too short or vague for AI extraction" if len(first_para) < 100 else "",
            "recommended_answer": self._build_recommended_answer(title, content, heading_texts, word_count),
        }

    def _build_recommended_answer(self, title, content, heading_texts, word_count):
        brand = ""
        if title and "|" in title:
            brand = title.split("|")[-1].strip()
        elif title and "-" in title:
            parts = title.split("-")
            brand = parts[-1].strip() if len(parts) > 1 else ""

        topic = title.split("|")[0].strip() if title else "This page"

        first_sentence = ""
        if content:
            paras = [p.strip() for p in re.split(r'\n\s*\n', content) if len(p.strip()) > 30]
            if paras:
                first_sentence = paras[0][:200]

        if not first_sentence:
            first_sentence = f"{topic} provides comprehensive information and solutions for its target audience."

        return first_sentence

    def _score_ai_answer_quality(self, content, text_lower, heading_texts, schema_types, entities, citations, word_count):
        definition_blocks = len(re.findall(r"(?:is\s+(?:a|an|the)\s+\w|(?:refers?\s+to|means?\s+that|defined?\s+as))", text_lower))
        howto_steps = len(re.findall(r"(?:step\s+\d|^\s*\d+\.\s|first\s*,?\s|second\s*,?\s|third\s*,?\s|finally\s*,?\s)", text_lower, re.MULTILINE))
        question_headings = sum(1 for h in heading_texts if "?" in h)

        def_score = min(100, definition_blocks * 25) if definition_blocks else 0
        entity_score = min(100, entities.get("total_count", 0) * 15) if entities.get("total_count") else 0
        citation_score = min(100, citations.get("score", 0))
        readability_score = min(100, max(0, 100 - (word_count / 50))) if word_count > 0 else 30
        trust_score = 0
        if entities.get("knowledge_graph_ready"): trust_score += 30
        if citations.get("has_expert_quotes"): trust_score += 20
        if citations.get("has_original_research"): trust_score += 20
        freshness_score = 50
        structured_score = min(100, len(schema_types) * 20) if schema_types else 0

        overall = (def_score + entity_score + citation_score + readability_score + trust_score + freshness_score + structured_score) / 7

        return {
            "overall": round(overall, 1),
            "definition_clarity": round(def_score, 1),
            "entity_coverage": round(entity_score, 1),
            "citation_readiness": round(citation_score, 1),
            "readability": round(readability_score, 1),
            "trust_signals": round(trust_score, 1),
            "freshness": round(freshness_score, 1),
            "structured_formatting": round(structured_score, 1),
        }

    def _detailed_entity_analysis(self, content, title, schema, entities):
        combined = f"{title} {content}"
        common_entities = {
            "CRM", "SEO", "SaaS", "B2B", "API", "AI", "ML", "GTM",
            "Revenue", "Pipeline", "Sales", "Marketing", "Automation",
            "Analytics", "Intelligence", "Platform", "Software",
        }
        detected_in_content = []
        missing = []
        for ent in common_entities:
            if re.search(r'\b' + re.escape(ent) + r'\b', combined, re.IGNORECASE):
                detected_in_content.append(ent)
            else:
                missing.append(ent)

        all_detected = []
        for cat, items in entities.get("detected", {}).items():
            for item in items:
                all_detected.append({"name": item, "type": cat.rstrip("s")})

        return {
            "detected_in_content": detected_in_content,
            "missing_from_content": missing[:10],
            "schema_entities": all_detected,
            "total_detected": len(all_detected) + len(detected_in_content),
            "coverage_score": round(len(detected_in_content) / max(len(common_entities), 1) * 100, 1),
        }

    def _detailed_citation_analysis(self, content, text_lower, citations, links_external):
        strengths = []
        weaknesses = []

        if citations.get("source_count", 0) >= 3:
            strengths.append(f"Has {citations['source_count']} source citations")
        else:
            weaknesses.append(f"Only {citations.get('source_count', 0)} source citations (need 3+)")

        if citations.get("has_statistics"):
            strengths.append("Contains statistical evidence")
        else:
            weaknesses.append("No statistical data")

        if citations.get("has_expert_quotes"):
            strengths.append("Includes expert quotes")
        else:
            weaknesses.append("No expert quotes")

        if citations.get("has_original_research"):
            strengths.append("References original research")
        else:
            weaknesses.append("No original research citations")

        if citations.get("has_primary_sources"):
            strengths.append("Cites primary sources")
        else:
            weaknesses.append("No primary source references")

        if citations.get("external_domains_count", 0) >= 3:
            strengths.append(f"Links to {citations['external_domains_count']} external domains")
        else:
            weaknesses.append(f"Only links to {citations.get('external_domains_count', 0)} external domains (need 3+)")

        likelihood = {}
        base = citations.get("score", 0) / 100
        for platform, factor in [("chatgpt", 0.95), ("gemini", 0.9), ("claude", 0.88), ("perplexity", 1.1), ("copilot", 0.85)]:
            pct = min(98, max(5, round(base * factor * 100)))
            likelihood[platform] = pct

        return {
            "strengths": strengths,
            "weaknesses": weaknesses,
            "citation_score": citations.get("score", 0),
            "citation_strength": citations.get("strength", "NONE"),
            "likelihood": likelihood,
        }

    def _why_cited_or_not(self, content, word_count, entities, citations, heading_texts, schema_types, platform_scores):
        strengths = []
        weaknesses = []

        if word_count >= 1000: strengths.append("Comprehensive long-form content")
        else: weaknesses.append(f"Content only {word_count} words (1000+ recommended)")

        if len(heading_texts) >= 5: strengths.append("Well-structured heading hierarchy")
        else: weaknesses.append(f"Only {len(heading_texts)} headings (5+ recommended)")

        if entities.get("total_count", 0) >= 2: strengths.append("Good entity coverage")
        else: weaknesses.append("Low entity coverage")

        if citations.get("has_statistics"): strengths.append("Contains statistics")
        else: weaknesses.append("No statistical data")

        if citations.get("has_expert_quotes"): strengths.append("Expert attribution present")
        else: weaknesses.append("No expert attribution")

        if schema_types: strengths.append(f"Has {len(schema_types)} schema types")
        else: weaknesses.append("No structured data")

        if citations.get("source_count", 0) >= 3: strengths.append("Good citation count")
        else: weaknesses.append("Insufficient source citations")

        avg_score = sum(p["score"] for p in platform_scores.values()) / max(len(platform_scores), 1)

        return {
            "strengths": strengths,
            "weaknesses": weaknesses,
            "average_ai_score": round(avg_score, 1),
            "citationLikelihood": "High" if avg_score >= 70 else "Medium" if avg_score >= 50 else "Low",
        }

    def _ai_readiness_checklist(self, content, text_lower, heading_texts, schema_types, entities, citations, links_external, word_count):
        checklist = []
        def_blocks = len(re.findall(r"(?:is\s+(?:a|an|the)\s+\w|(?:refers?\s+to))", text_lower))

        checklist.append({"item": "Definition paragraph", "present": def_blocks > 0, "importance": "HIGH"})
        checklist.append({"item": "Short introduction (first 2 sentences)", "present": word_count > 50, "importance": "HIGH"})
        checklist.append({"item": "H2 hierarchy (3+ headings)", "present": len(heading_texts) >= 3, "importance": "HIGH"})
        checklist.append({"item": "FAQ section", "present": any("faq" in st.lower() for st in schema_types), "importance": "HIGH"})
        checklist.append({"item": "Research citations", "present": citations.get("source_count", 0) > 0, "importance": "HIGH"})
        checklist.append({"item": "Statistics", "present": citations.get("has_statistics"), "importance": "MEDIUM"})
        checklist.append({"item": "Comparison table", "present": False, "importance": "MEDIUM"})
        checklist.append({"item": "Expert author", "present": citations.get("has_expert_quotes"), "importance": "MEDIUM"})
        checklist.append({"item": "References/bibliography", "present": citations.get("has_secondary_sources"), "importance": "MEDIUM"})
        checklist.append({"item": "Glossary", "present": False, "importance": "LOW"})
        checklist.append({"item": "Product Schema", "present": any("product" in st.lower() for st in schema_types), "importance": "HIGH"})
        checklist.append({"item": "Organization Schema", "present": any("organization" in st.lower() for st in schema_types), "importance": "HIGH"})
        checklist.append({"item": "External links (3+)", "present": len(links_external) >= 3 if isinstance(links_external, list) else False, "importance": "MEDIUM"})
        checklist.append({"item": "Lists (2+)", "present": False, "importance": "MEDIUM"})
        checklist.append({"item": "Entity coverage (3+)", "present": entities.get("total_count", 0) >= 3, "importance": "MEDIUM"})

        present_count = sum(1 for c in checklist if c["present"])
        total = len(checklist)

        return {
            "items": checklist,
            "present_count": present_count,
            "total_count": total,
            "readiness_pct": round(present_count / max(total, 1) * 100),
        }

    def _prioritized_actions(self, platforms, entities, citations, ai_quality, checklist, word_count, heading_texts, schema_types):
        actions = []
        missing_items = [c for c in checklist.get("items", []) if not c["present"]]

        for item in missing_items:
            importance = item["importance"]
            if importance == "HIGH":
                impact = "+8%"
                effort = "Easy" if word_count > 200 else "Medium"
                priority = "CRITICAL"
            elif importance == "MEDIUM":
                impact = "+5%"
                effort = "Medium"
                priority = "HIGH"
            else:
                impact = "+3%"
                effort = "Easy"
                priority = "MEDIUM"

            actions.append({
                "recommendation": f"Add {item['item']}",
                "ai_impact": impact,
                "difficulty": effort,
                "priority": priority,
            })

        if word_count < 800:
            actions.append({
                "recommendation": f"Expand content from {word_count} to 1500+ words",
                "ai_impact": "+12%",
                "difficulty": "Medium",
                "priority": "CRITICAL",
            })

        avg = sum(p["score"] for p in platforms.values()) / max(len(platforms), 1)
        if avg < 50:
            actions.append({
                "recommendation": "Rewrite opening paragraph with clear definition and entity mentions",
                "ai_impact": "+10%",
                "difficulty": "Easy",
                "priority": "CRITICAL",
            })

        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        actions.sort(key=lambda a: priority_order.get(a["priority"], 3))
        return actions[:15]

    def _competitor_comparison(self, all_pages, my_entities, my_citations, my_schema_types):
        if not all_pages:
            return {}

        other_pages = [p for p in all_pages if p.get("url") != my_entities.get("url", "")]
        if not other_pages:
            return {}

        other_citations = 0
        other_schema = set()
        for p in other_pages:
            content = p.get("content_text", "")
            other_citations += len(re.findall(r"(?:according to|source:|study|research)", content or "", re.IGNORECASE))
            for s in (p.get("schema_markup") or []):
                if isinstance(s, dict) and "@type" in s:
                    other_schema.add(s["@type"])

        other_count = len(other_pages)
        my_count = my_entities.get("total_count", 0)
        my_src = my_citations.get("source_count", 0)

        return {
            "your_entities": my_count,
            "competitor_entities": max(other_count * 3, 5),
            "your_citations": my_src,
            "competitor_citations": max(other_citations, 5),
            "your_schema_types": len(my_schema_types),
            "competitor_schema_types": len(other_schema),
        }

    def _estimate_after_fixes(self, platforms, optimization_plan):
        current = sum(p["score"] for p in platforms.values()) / max(len(platforms), 1)
        critical_count = sum(1 for a in optimization_plan if a["priority"] == "CRITICAL")
        high_count = sum(1 for a in optimization_plan if a["priority"] == "HIGH")
        estimated_boost = critical_count * 5 + high_count * 3

        return {
            "current_overall": round(current, 1),
            "estimated_after": round(min(98, current + estimated_boost), 1),
            "estimated_increase": round(estimated_boost, 1),
            "critical_tasks": critical_count,
            "high_tasks": high_count,
        }

    def _platform_signal_breakdowns(self, content, text_lower, html_lower, title, meta_desc, h1,
                                     heading_texts, image_alts, internal_count, external_count,
                                     schema_types, word_count, entities, citations):
        breakdowns = {}

        definition_blocks = len(re.findall(r"(?:is\s+(?:a|an|the)\s+\w|(?:refers?\s+to|means?\s+that))", text_lower))
        list_count = html_lower.count("<ul") + html_lower.count("<ol")
        table_count = html_lower.count("<table")
        q_in_headings = sum(1 for h in heading_texts if "?" in h)
        howto_steps = len(re.findall(r"(?:step\s+\d|^\s*\d+\.\s)", text_lower, re.MULTILINE))

        breakdowns["google_ai_overview"] = {
            "signals": [
                {"name": "Definition paragraphs", "weight": "15%", "status": "pass" if definition_blocks >= 2 else "fail" if definition_blocks == 0 else "warn", "detail": f"Found {definition_blocks} definition blocks (target: 2+)"},
                {"name": "Lists", "weight": "15%", "status": "pass" if list_count >= 3 else "fail" if list_count == 0 else "warn", "detail": f"Found {list_count} lists (target: 3+)"},
                {"name": "Tables", "weight": "12%", "status": "pass" if table_count >= 1 else "fail", "detail": f"Found {table_count} tables (target: 1+)"},
                {"name": "FAQ Schema", "weight": "8%", "status": "pass" if "FAQPage" in schema_types else "fail", "detail": "FAQPage schema for rich results"},
                {"name": "Question headings", "weight": "10%", "status": "pass" if q_in_headings >= 2 else "warn" if q_in_headings >= 1 else "fail", "detail": f"Found {q_in_headings} question headings (target: 2+)"},
                {"name": "HowTo steps", "weight": "10%", "status": "pass" if howto_steps >= 3 else "warn" if howto_steps >= 1 else "fail", "detail": f"Found {howto_steps} step indicators (target: 3+)"},
                {"name": "Content depth", "weight": "8%", "status": "pass" if word_count >= 800 else "fail", "detail": f"{word_count} words (target: 800+)"},
                {"name": "Entity coverage", "weight": "5%", "status": "pass" if entities.get("total_count", 0) >= 2 else "fail", "detail": f"{entities.get('total_count', 0)} entities (target: 2+)"},
                {"name": "Internal links", "weight": "5%", "status": "pass" if internal_count >= 3 else "warn" if internal_count >= 1 else "fail", "detail": f"{internal_count} internal links (target: 3+)"},
            ],
        }

        has_article = any(st.lower() in ("article", "blogposting", "newsarticle") for st in schema_types)
        src_count = citations.get("source_count", 0)

        breakdowns["chatgpt"] = {
            "signals": [
                {"name": "Article schema", "weight": "12%", "status": "pass" if has_article else "fail", "detail": "Article/BlogPosting schema for content classification"},
                {"name": "Heading hierarchy", "weight": "12%", "status": "pass" if len(heading_texts) >= 5 else "warn" if len(heading_texts) >= 3 else "fail", "detail": f"{len(heading_texts)} headings (target: 5+)"},
                {"name": "Definitions", "weight": "10%", "status": "pass" if definition_blocks >= 2 else "fail", "detail": f"{definition_blocks} definitions (target: 2+)"},
                {"name": "Source citations", "weight": "12%", "status": "pass" if src_count >= 3 else "warn" if src_count >= 1 else "fail", "detail": f"{src_count} citations (target: 3+)"},
                {"name": "Content depth", "weight": "12%", "status": "pass" if word_count >= 1500 else "warn" if word_count >= 800 else "fail", "detail": f"{word_count} words (target: 1500+)"},
                {"name": "Schema richness", "weight": "10%", "status": "pass" if len(schema_types) >= 3 else "warn" if len(schema_types) >= 1 else "fail", "detail": f"{len(schema_types)} schema types (target: 3+)"},
                {"name": "Meta description", "weight": "5%", "status": "pass" if meta_desc and len(meta_desc) > 80 else "warn" if meta_desc else "fail", "detail": f"{len(meta_desc) if meta_desc else 0} chars (target: 80+)"},
                {"name": "Entity coverage", "weight": "5%", "status": "pass" if entities.get("total_count", 0) >= 2 else "fail", "detail": f"{entities.get('total_count', 0)} entities (target: 2+)"},
            ],
        }

        stat_count = len(re.findall(r"\d+(?:\.\d+)?%", text_lower))

        breakdowns["gemini"] = {
            "signals": [
                {"name": "FAQ Schema", "weight": "15%", "status": "pass" if "FAQPage" in schema_types else "fail", "detail": "FAQPage schema for answer extraction"},
                {"name": "HowTo schema", "weight": "12%", "status": "pass" if any("howto" in st.lower() for st in schema_types) else "fail", "detail": "HowTo schema for step-by-step"},
                {"name": "Schema count", "weight": "10%", "status": "pass" if len(schema_types) >= 2 else "warn" if len(schema_types) >= 1 else "fail", "detail": f"{len(schema_types)} schema types (target: 2+)"},
                {"name": "Heading structure", "weight": "12%", "status": "pass" if len(heading_texts) >= 5 else "warn" if len(heading_texts) >= 3 else "fail", "detail": f"{len(heading_texts)} headings (target: 5+)"},
                {"name": "Statistics", "weight": "12%", "status": "pass" if stat_count >= 5 else "warn" if stat_count >= 1 else "fail", "detail": f"{stat_count} statistics (target: 5+)"},
                {"name": "Content depth", "weight": "10%", "status": "pass" if word_count >= 1000 else "fail", "detail": f"{word_count} words (target: 1000+)"},
                {"name": "Lists", "weight": "8%", "status": "pass" if list_count >= 2 else "warn" if list_count >= 1 else "fail", "detail": f"{list_count} lists (target: 2+)"},
                {"name": "External links", "weight": "5%", "status": "pass" if external_count >= 2 else "warn" if external_count >= 1 else "fail", "detail": f"{external_count} external links (target: 2+)"},
            ],
        }

        balance = len(re.findall(r"(?:however|although|on the other hand|conversely|in contrast|despite|nevertheless)", text_lower))
        nuance = len(re.findall(r"(?:it\s+depends|contextual|nuanced|generally|typically|often|usually)", text_lower))

        breakdowns["claude"] = {
            "signals": [
                {"name": "Content depth", "weight": "15%", "status": "pass" if word_count >= 2000 else "warn" if word_count >= 1000 else "fail", "detail": f"{word_count} words (target: 2000+)"},
                {"name": "Expert quotes", "weight": "12%", "status": "pass" if citations.get("has_expert_quotes") else "fail", "detail": "Expert attribution present"},
                {"name": "Original research", "weight": "10%", "status": "pass" if citations.get("has_original_research") else "fail", "detail": "Original research cited"},
                {"name": "Balanced viewpoints", "weight": "15%", "status": "pass" if balance >= 3 else "warn" if balance >= 1 else "fail", "detail": f"{balance} balance markers (target: 3+)"},
                {"name": "Nuanced language", "weight": "12%", "status": "pass" if nuance >= 3 else "warn" if nuance >= 1 else "fail", "detail": f"{nuance} nuance markers (target: 3+)"},
                {"name": "Heading hierarchy", "weight": "10%", "status": "pass" if len(heading_texts) >= 5 else "warn" if len(heading_texts) >= 3 else "fail", "detail": f"{len(heading_texts)} headings (target: 5+)"},
                {"name": "Citations", "weight": "10%", "status": "pass" if src_count >= 3 else "warn" if src_count >= 1 else "fail", "detail": f"{src_count} citations (target: 3+)"},
            ],
        }

        breakdowns["perplexity"] = {
            "signals": [
                {"name": "Source citations", "weight": "20%", "status": "pass" if src_count >= 5 else "warn" if src_count >= 3 else "fail", "detail": f"{src_count} sources (target: 5+)"},
                {"name": "Statistics", "weight": "12%", "status": "pass" if citations.get("has_statistics") else "fail", "detail": "Statistical data present"},
                {"name": "External links", "weight": "12%", "status": "pass" if external_count >= 5 else "warn" if external_count >= 3 else "fail", "detail": f"{external_count} external links (target: 5+)"},
                {"name": "Primary sources", "weight": "10%", "status": "pass" if citations.get("has_primary_sources") else "fail", "detail": "Primary source references"},
                {"name": "Content depth", "weight": "8%", "status": "pass" if word_count >= 1000 else "fail", "detail": f"{word_count} words (target: 1000+)"},
            ],
        }

        fact_markers = len(re.findall(r"(?:is\s+a|is\s+an|defined?\s+as|known\s+as|consists?\s+of)", text_lower))

        breakdowns["copilot"] = {
            "signals": [
                {"name": "Schema richness", "weight": "16%", "status": "pass" if len(schema_types) >= 3 else "warn" if len(schema_types) >= 1 else "fail", "detail": f"{len(schema_types)} schema types (target: 3+)"},
                {"name": "Factual statements", "weight": "14%", "status": "pass" if fact_markers >= 5 else "warn" if fact_markers >= 2 else "fail", "detail": f"{fact_markers} factual markers (target: 5+)"},
                {"name": "Content depth", "weight": "10%", "status": "pass" if word_count >= 800 else "fail", "detail": f"{word_count} words (target: 800+)"},
                {"name": "Tables", "weight": "10%", "status": "pass" if table_count >= 2 else "warn" if table_count >= 1 else "fail", "detail": f"{table_count} tables (target: 2+)"},
                {"name": "Organization entity", "weight": "8%", "status": "pass" if entities.get("detected", {}).get("organizations") else "fail", "detail": "Organization entity identified"},
                {"name": "H1 tag", "weight": "5%", "status": "pass" if h1 else "fail", "detail": "H1 heading present"},
            ],
        }

        return breakdowns

    def _citation_probability(self, platforms, citations, entities, word_count):
        base = citations.get("score", 0) / 100
        entity_factor = min(1.0, entities.get("total_count", 0) / 5)
        word_factor = min(1.0, word_count / 1500)

        probabilities = {}
        multipliers = {
            "google_ai_overview": 0.85,
            "chatgpt": 0.95,
            "gemini": 0.90,
            "claude": 0.88,
            "perplexity": 1.10,
            "copilot": 0.82,
        }

        for platform, mult in multipliers.items():
            pct = min(98, max(5, round((base * 0.5 + entity_factor * 0.25 + word_factor * 0.25) * mult * 100)))
            probabilities[platform] = pct

        return {
            "by_platform": probabilities,
            "overall": round(sum(probabilities.values()) / max(len(probabilities), 1), 1),
        }

    def _hallucination_risk(self, content, title, meta_desc, heading_texts, word_count):
        risks = []

        ambiguous_terms = len(re.findall(r"\b(it|this|that|these|those)\b", content or "", re.IGNORECASE))
        if ambiguous_terms > 20:
            risks.append({"risk": "Ambiguous terminology", "severity": "High", "detail": f"Found {ambiguous_terms} ambiguous pronouns that could confuse AI extraction"})
        elif ambiguous_terms > 10:
            risks.append({"risk": "Ambiguous terminology", "severity": "Medium", "detail": f"Found {ambiguous_terms} ambiguous pronouns"})

        definitions = len(re.findall(r"(?:is\s+(?:a|an|the)\s+\w|(?:refers?\s+to|defined?\s+as))", content or "", re.IGNORECASE))
        if definitions == 0 and word_count > 300:
            risks.append({"risk": "Missing definitions", "severity": "High", "detail": "No clear definitions found — AI may misinterpret the topic"})

        brand_consistency = len(re.findall(r"(?:DataviCloud|datavicloud|DATAVICLOUD)", content or ""))
        if brand_consistency > 0 and brand_consistency < 3:
            risks.append({"risk": "Inconsistent product naming", "severity": "Medium", "detail": f"Brand mentioned only {brand_consistency} times — inconsistent entity signals"})

        claims = len(re.findall(r"\b(best|only|first|guaranteed|100%|always|never)\b", content or "", re.IGNORECASE))
        if claims > 5:
            risks.append({"risk": "Unsupported claims", "severity": "Medium", "detail": f"Found {claims} absolute claims without citations"})

        if word_count < 300:
            risks.append({"risk": "Insufficient content", "severity": "High", "detail": "Content too thin for reliable AI extraction"})

        if not risks:
            risks.append({"risk": "Low hallucination risk", "severity": "Low", "detail": "Content appears well-structured with clear definitions"})

        return {
            "risks": risks,
            "overall_risk": next((r["severity"] for r in risks if r["severity"] == "High"), "Low"),
            "risk_count": len([r for r in risks if r["severity"] in ("High", "Medium")]),
        }

    def _content_completeness_check(self, content, title, meta_desc, heading_texts, page_type="BLOG"):
        text_lower = (content or "").lower()
        questions = [
            {"question": "What is it?", "covered": bool(re.search(r"(?:is\s+(?:a|an|the)\s+\w|(?:refers?\s+to|means?\s+that))", text_lower))},
            {"question": "Who is it for?", "covered": bool(re.search(r"(?:designed for|built for|teams?|companies|businesses|users|customers)", text_lower))},
            {"question": "Benefits", "covered": bool(re.search(r"(?:benefit|advantage|help|improve|increase|reduce|save)", text_lower))},
            {"question": "How it works", "covered": bool(re.search(r"(?:how\s+(?:it\s+)?works|step|process|workflow)", text_lower))},
            {"question": "Pricing", "covered": bool(re.search(r"(?:price|pricing|plan|cost|free|trial|\$)", text_lower))},
            {"question": "Integrations", "covered": bool(re.search(r"(?:integrat|connect|plugin|api|compatible)", text_lower))},
            {"question": "Competitors", "covered": bool(re.search(r"(?:compared|alternative|vs|versus|competitor)", text_lower))},
            {"question": "Limitations", "covered": bool(re.search(r"(?:limitation|drawback|disadvantage|not\s+ideal|downside)", text_lower))},
            {"question": "Customer proof", "covered": bool(re.search(r"(?:customer|client|case\s+stud|testimonial|review|success\s+stor)", text_lower))},
            {"question": "Getting started", "covered": bool(re.search(r"(?:get\s+started|setup|onboard|quick\s+start|sign\s+up)", text_lower))},
        ]
        covered_count = sum(1 for q in questions if q["covered"])
        return {
            "questions": questions,
            "covered_count": covered_count,
            "total_count": len(questions),
            "completeness_pct": round(covered_count / max(len(questions), 1) * 100),
        }

    def _freshness_analysis(self, content):
        date_patterns = [
            r'\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b',
            r'\b\d{4}[-/]\d{2}[-/]\d{2}\b',
            r'\bupdated\b.*?\d{4}\b',
        ]
        dates_found = []
        for pat in date_patterns:
            for m in re.finditer(pat, content or "", re.IGNORECASE):
                dates_found.append(m.group(0))

        years = []
        for d in dates_found:
            ym = re.search(r'\b(20\d{2})\b', d)
            if ym:
                years.append(int(ym.group(1)))

        outdated_refs = len(re.findall(r"\b(201[0-9]|2020)\b", content or ""))
        current_year = 2026
        old_references = outdated_refs

        return {
            "dates_found": len(dates_found),
            "latest_year": max(years) if years else None,
            "outdated_references": old_references,
            "freshness_score": "Fresh" if (years and max(years) >= 2025) else "Moderate" if (years and max(years) >= 2023) else "Outdated",
            "recommendation": "Update pages older than 6 months" if old_references > 0 else "Content appears current",
        }

    def _citation_quality_analysis(self, content, text_lower, links_external):
        gov_links = 0
        academic_links = 0
        industry_links = 0
        news_links = 0
        customer_links = 0

        gov_patterns = [r"\.gov\b", r"\.edu\b", r"government", r"official"]
        academic_patterns = [r"\.edu\b", r"university", r"journal", r"arxiv", r"pubmed", r"research"]
        industry_patterns = [r"gartner", r"forrester", r"mckinsey", r"deloitte", r"idc", r"report"]
        news_patterns = [r"reuters", r"bloomberg", r"techcrunch", r"venturebeat", r"prnewswire"]
        customer_patterns = [r"customer", r"client", r"case.study", r"testimonial", r"review"]

        for link in (links_external or []):
            url = link.get("url", "") if isinstance(link, dict) else str(link)
            url_lower = url.lower()
            if any(re.search(p, url_lower) for p in gov_patterns):
                gov_links += 1
            if any(re.search(p, url_lower) for p in academic_patterns):
                academic_links += 1
            if any(re.search(p, url_lower) for p in industry_patterns):
                industry_links += 1
            if any(re.search(p, url_lower) for p in news_patterns):
                news_links += 1
            if any(re.search(p, url_lower) for p in customer_patterns):
                customer_links += 1

        return {
            "types": [
                {"type": "Government", "count": gov_links, "quality": "Good" if gov_links > 0 else "Missing"},
                {"type": "Academic", "count": academic_links, "quality": "Good" if academic_links > 0 else "Missing"},
                {"type": "Industry Reports", "count": industry_links, "quality": "Good" if industry_links > 0 else "Missing"},
                {"type": "News/Media", "count": news_links, "quality": "Good" if news_links > 0 else "Missing"},
                {"type": "Customer Data", "count": customer_links, "quality": "Good" if customer_links > 0 else "Missing"},
            ],
            "total_quality_sources": gov_links + academic_links + industry_links,
            "overall_quality": "Strong" if (gov_links + academic_links + industry_links) >= 3 else "Moderate" if (gov_links + academic_links + industry_links) >= 1 else "Weak",
        }

    def _optimization_simulator(self, platforms, citation_probability, entities, word_count):
        current_overall = sum(p["score"] for p in platforms.values()) / max(len(platforms), 1)
        actions = [
            {"action": "Add FAQ Schema", "chatgpt": "+3", "gemini": "+5", "perplexity": "+2", "google_ai": "+4", "effort": "Easy"},
            {"action": "Add primary source citations", "chatgpt": "+4", "gemini": "+3", "perplexity": "+15", "google_ai": "+2", "effort": "Easy"},
            {"action": "Add comparison tables", "chatgpt": "+2", "gemini": "+4", "perplexity": "+3", "google_ai": "+5", "effort": "Medium"},
            {"action": "Add HowTo schema", "chatgpt": "+2", "gemini": "+5", "perplexity": "+1", "google_ai": "+3", "effort": "Easy"},
            {"action": "Add Person/Author schema", "chatgpt": "+3", "gemini": "+2", "perplexity": "+1", "google_ai": "+2", "effort": "Easy"},
            {"action": "Expand to 1500+ words", "chatgpt": "+5", "gemini": "+4", "perplexity": "+3", "google_ai": "+4", "effort": "Medium"},
            {"action": "Add expert quotes", "chatgpt": "+4", "gemini": "+2", "perplexity": "+3", "google_ai": "+1", "effort": "Medium"},
            {"action": "Add definition paragraphs", "chatgpt": "+3", "gemini": "+3", "perplexity": "+2", "google_ai": "+6", "effort": "Easy"},
        ]
        return {"actions": actions, "current_score": round(current_overall, 1)}

    def _ai_overview_eligibility(self, content, text_lower, heading_texts, schema_types, entities, citations, word_count):
        eligible_signals = []
        missing_signals = []

        definition_blocks = len(re.findall(r"(?:is\s+(?:a|an|the)\s+\w|(?:refers?\s+to|means?\s+that))", text_lower))
        if definition_blocks >= 2:
            eligible_signals.append("Strong definition paragraphs")
        else:
            missing_signals.append("Add clear definition paragraphs")

        if any("faq" in st.lower() for st in schema_types):
            eligible_signals.append("FAQ Schema present")
        else:
            missing_signals.append("Add FAQ Schema")

        if "FAQPage" in schema_types:
            eligible_signals.append("FAQPage schema for rich results")
        else:
            missing_signals.append("Add FAQPage schema")

        list_count = text_lower.count("<ul") + text_lower.count("<ol")
        if list_count >= 2:
            eligible_signals.append("Well-structured lists")
        else:
            missing_signals.append("Add structured lists")

        table_count = text_lower.count("<table")
        if table_count >= 1:
            eligible_signals.append("Data tables present")
        else:
            missing_signals.append("Add comparison or data tables")

        if citations.get("has_statistics"):
            eligible_signals.append("Statistics present")
        else:
            missing_signals.append("Add statistics and data points")

        if citations.get("source_count", 0) >= 3:
            eligible_signals.append("Good source citations")
        else:
            missing_signals.append("Add research citations")

        if entities.get("total_count", 0) >= 3:
            eligible_signals.append("Strong entity coverage")
        else:
            missing_signals.append("Add more entity mentions")

        if word_count >= 800:
            eligible_signals.append("Sufficient content depth")
        else:
            missing_signals.append("Expand content to 800+ words")

        total_signals = len(eligible_signals) + len(missing_signals)
        eligibility_pct = round(len(eligible_signals) / max(total_signals, 1) * 100)

        return {
            "eligible": eligibility_pct >= 60,
            "eligible_signals": eligible_signals,
            "missing_signals": missing_signals,
            "eligibility_pct": eligibility_pct,
            "target_pct": 95,
        }

    def _predict_future_scores(self, platforms, optimization_plan):
        current = {k: v["score"] for k, v in platforms.items()}
        critical_count = sum(1 for a in optimization_plan if a["priority"] == "CRITICAL")
        high_count = sum(1 for a in optimization_plan if a["priority"] == "HIGH")

        predicted = {}
        for platform, score in current.items():
            boost = critical_count * 4 + high_count * 2
            if platform == "perplexity":
                boost = critical_count * 5 + high_count * 3
            predicted[platform] = round(min(98, score + boost), 1)

        return {
            "current": current,
            "predicted": predicted,
            "estimated_overall": round(sum(predicted.values()) / max(len(predicted), 1), 1),
        }
