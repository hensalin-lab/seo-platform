from __future__ import annotations

import json
import re
from typing import Any


class ContentIntelligenceDeep:

    IDEAL_WORDS: dict[str, int] = {
        "BLOG": 2000,
        "PRODUCT": 1500,
        "LANDING": 1000,
        "FAQ": 1200,
        "DOCS": 2500,
    }
    DEFAULT_IDEAL: int = 1500

    STOP_WORDS: set[str] = {
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
        "our", "you", "your", "he", "him", "his", "she", "her", "my", "me", "i",
    }

    TRANSITIONS: set[str] = {
        "furthermore", "moreover", "additionally", "consequently", "therefore",
        "however", "nevertheless", "nonetheless", "meanwhile", "subsequently",
        "accordingly", "hence", "thus", "likewise", "similarly", "conversely",
        "alternatively", "specifically", "notably", "importantly", "essentially",
    }

    HEDGING: set[str] = {
        "might", "perhaps", "possibly", "arguably", "somewhat", "relatively",
        "fairly", "quite", "rather", "presumably", "apparently", "seemingly",
        "supposedly", "allegedly", "it seems", "it appears", "it is likely",
        "it is possible", "in general", "generally speaking",
        "it is worth noting", "it should be noted",
    }

    COMMON_GRAMMAR_ISSUES: list[tuple[re.Pattern[str], str]] = [
        (re.compile(r"\b(\w+)\s+\1\b", re.IGNORECASE), "repeated_word"),
        (re.compile(r"\s{2,}"), "extra_spaces"),
    ]

    REWRITE_MODES: dict[str, dict[str, str]] = {
        "seo": {
            "label": "SEO Optimized",
            "instruction": "Optimize for search engines with primary keywords, semantic variants, and structured content.",
        },
        "aeo_geo": {
            "label": "AI Search (AEO/GEO)",
            "instruction": "Optimize for AI Overviews, ChatGPT, and Perplexity citations with concise, factual, cited content.",
        },
        "readability": {
            "label": "Readability",
            "instruction": "Simplify language, shorten sentences, use plain English for broad accessibility.",
        },
        "conversion": {
            "label": "Conversion",
            "instruction": "Emphasize benefits, social proof, urgency, and clear calls-to-action.",
        },
        "eeat": {
            "label": "E-E-A-T",
            "instruction": "Strengthen Experience, Expertise, Authoritativeness, and Trustworthiness signals.",
        },
        "technical": {
            "label": "Technical",
            "instruction": "Use precise terminology, add specifications, and provide implementation details.",
        },
        "executive_summary": {
            "label": "Executive Summary",
            "instruction": "Lead with outcomes and ROI. Concise, high-level, decision-focused.",
        },
        "beginner_friendly": {
            "label": "Beginner Friendly",
            "instruction": "Explain jargon, add analogies, use short sentences, and build from basics.",
        },
        "voice_search": {
            "label": "Voice Search",
            "instruction": "Write in natural conversational phrasing that matches spoken queries.",
        },
        "featured_snippet": {
            "label": "Featured Snippet",
            "instruction": "Structure content to win position-zero: definitions, lists, steps, tables.",
        },
    }

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def analyze(self, page: dict[str, Any], all_pages: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        url = page.get("url", "")
        page_type = (page.get("page_type") or "BLOG").upper()
        title = page.get("title") or ""
        meta = page.get("meta_description") or ""
        h1 = page.get("h1") or ""
        content_text = page.get("content_text") or ""
        word_count = page.get("word_count") or 0
        headings = page.get("headings") or []
        images = page.get("images") or []
        links_internal = page.get("links_internal") or []
        links_external = page.get("links_external") or []
        schema_markup = page.get("schema_markup") or []

        if not word_count and content_text:
            word_count = len(content_text.split())

        topic = self._extract_topic(h1, title, content_text)
        brand = self._extract_brand(title, h1, content_text, url)
        paragraphs = self._split_paragraphs(content_text)
        sentences = self._split_sentences(content_text)
        words = content_text.split() if content_text else []

        content_score = self._compute_overall_score(content_text, words, headings, title, meta, h1, word_count, schema_markup, images, links_internal, links_external, page_type)
        readability_score = self._compute_readability_score(content_text, words)
        current_level = self._flesch_kincaid_level(content_text, words)

        issues = self._collect_issues(title, meta, h1, content_text, word_count, headings, images, links_internal, links_external, schema_markup, page_type)
        recommendations = self._build_recommendations(title, meta, h1, content_text, word_count, headings, images, links_internal, links_external, schema_markup, page_type, topic, brand, paragraphs)

        rewrite_modes = self._generate_rewrite_modes(title, h1, meta, content_text, paragraphs, topic, brand, page_type)
        missing_sections = self._generate_missing_sections(title, h1, content_text, topic, brand, page_type, word_count)
        eeat = self._analyze_eeat(content_text, title, h1, topic, brand, page_type)
        entity_opt = self._analyze_entities(title, h1, content_text, topic)
        ai_preview = self._generate_ai_overview(content_text, title, h1, topic, brand, paragraphs)
        readability_out = self._generate_readability_rewrite(content_text, paragraphs, topic, current_level)
        internal_links = self._suggest_internal_links(content_text, topic, brand, page_type, all_pages)
        schema_gen = self._generate_schema(title, h1, meta, url, topic, brand, page_type, missing_sections.get("faq", []))
        score_predictions = self._predict_scores(content_score, readability_score, content_text, word_count, headings, page_type)
        before_after = self._build_before_after(title, h1, meta, content_text, paragraphs, rewrite_modes, missing_sections, topic, brand)
        implementation = self._build_implementation(issues, recommendations, missing_sections, eeat)

        missing_element_count = sum(len(v) for v in missing_sections.values() if isinstance(v, list))
        total_gaps = sum(1 for v in missing_sections.values() if isinstance(v, list) and v)

        ideal_word_count = 1500
        if page_type == "BLOG":
            ideal_word_count = 2000
        elif page_type in ("SERVICE", "PRODUCT", "LANDING"):
            ideal_word_count = 1500
        elif page_type == "HOMEPAGE":
            ideal_word_count = 800

        competitor_average_estimate = max(ideal_word_count, int(word_count * 1.2)) if word_count else ideal_word_count

        quality_scores = {
            "content_freshness": min(100, max(0, content_score)),
            "search_intent_match": min(100, max(0, 70 if word_count > 500 else 40)),
            "entity_coverage": min(100, max(0, len(entity_opt.get("entities_found", [])) * 10)),
            "topical_authority": min(100, max(0, 80 if len(headings) >= 3 else 40)),
            "readability": min(100, max(0, int(readability_score))),
            "grammar_score": min(100, max(0, 85 if content_text else 0)),
            "sentence_complexity": min(100, max(0, 80 if sentences and len(sentences) > 5 else 40)),
            "duplicate_paragraphs": min(100, max(0, 90)),
            "ai_detection_risk": min(100, max(0, 70)),
            "citation_score": min(100, max(0, 30 if links_external else 10)),
            "originality_score": min(100, max(0, 75)),
            "content_completeness": min(100, max(0, content_score)),
        }

        content_gaps = {}
        for gap_key, gap_val in missing_sections.items():
            if isinstance(gap_val, list) and gap_val:
                content_gaps[gap_key] = {"needed": True, "count": len(gap_val), "items": gap_val[:5]}
            else:
                content_gaps[gap_key] = {"needed": False, "count": 0, "items": []}

        return {
            "content_score": content_score,
            "current_word_count": word_count,
            "ideal_word_count": ideal_word_count,
            "competitor_average_estimate": competitor_average_estimate,
            "missing_element_count": missing_element_count,
            "total_gaps": total_gaps,
            "content_gaps": content_gaps,
            "quality_scores": quality_scores,
            "rewrite_modes": rewrite_modes,
            "missing_sections": missing_sections,
            "eeat_analysis": eeat,
            "entity_optimization": entity_opt,
            "ai_overview_preview": ai_preview,
            "readability": readability_out,
            "internal_link_suggestions": internal_links,
            "schema_generated": schema_gen,
            "score_predictions": score_predictions,
            "implementation_plan": implementation,
            "issues": issues,
            "recommendations": recommendations,
            "before_after": before_after,
        }

    # ------------------------------------------------------------------
    # Topic / brand extraction
    # ------------------------------------------------------------------

    def _extract_topic(self, h1: str, title: str, content: str) -> str:
        if h1:
            return h1.strip()
        if title:
            cleaned = re.sub(r"\s*[|\-–—:]\s*.*$", "", title).strip()
            if cleaned:
                return cleaned
        if content:
            first_sentence = re.split(r"[.!?\n]", content)[0].strip()
            if 5 < len(first_sentence) < 120:
                return first_sentence
        return "This topic"

    def _extract_brand(self, title: str, h1: str, content: str, url: str) -> str:
        combined = f"{title} {h1}"
        words = re.findall(r"\b([A-Z][A-Za-z0-9]+)\b", combined)
        for w in words:
            if w.lower() not in self.STOP_WORDS and len(w) > 2:
                return w

        if content:
            content_words = re.findall(r"\b([A-Z][A-Za-z0-9]+)\b", content[:300])
            for w in content_words:
                if w.lower() not in self.STOP_WORDS and len(w) > 2:
                    return w

        if url:
            domain_match = re.search(r"https?://(?:www\.)?([^/]+)", url)
            if domain_match:
                domain = domain_match.group(1).split(".")[0]
                candidate = domain.capitalize()
                if len(candidate) > 1:
                    return candidate

        return "Your Product"

    # ------------------------------------------------------------------
    # Content splitting
    # ------------------------------------------------------------------

    def _split_paragraphs(self, content: str) -> list[str]:
        if not content:
            return []
        parts = re.split(r"\n\s*\n", content)
        return [p.strip() for p in parts if p.strip() and len(p.strip()) > 20]

    def _split_sentences(self, content: str) -> list[str]:
        if not content:
            return []
        parts = re.split(r"(?<=[.!?])\s+", content)
        return [s.strip() for s in parts if s.strip() and len(s.strip()) > 5]

    # ------------------------------------------------------------------
    # Overall content score
    # ------------------------------------------------------------------

    def _compute_overall_score(
        self, content: str, words: list[str], headings: list, title: str,
        meta: str, h1: str, word_count: int, schema: list,
        images: list, internal: list, external: list, page_type: str,
    ) -> int:
        scores: list[float] = []
        ideal = self.IDEAL_WORDS.get(page_type, self.DEFAULT_IDEAL)

        if word_count >= ideal:
            scores.append(10.0)
        elif word_count >= ideal * 0.7:
            scores.append(7.5)
        elif word_count >= ideal * 0.4:
            scores.append(5.0)
        else:
            scores.append(2.5)

        if title and 30 <= len(title) <= 70:
            scores.append(10.0)
        elif title:
            scores.append(6.0)
        else:
            scores.append(0.0)

        if meta and 120 <= len(meta) <= 160:
            scores.append(10.0)
        elif meta:
            scores.append(6.0)
        else:
            scores.append(0.0)

        if h1 and h1.strip() == title.strip():
            scores.append(9.0)
        elif h1:
            scores.append(7.0)
        else:
            scores.append(1.0)

        heading_count = len(headings) if isinstance(headings, list) else 0
        if heading_count >= 5:
            scores.append(9.0)
        elif heading_count >= 3:
            scores.append(7.0)
        elif heading_count >= 1:
            scores.append(4.0)
        else:
            scores.append(1.0)

        if content:
            scores.append(self._compute_readability_score(content, words) * 10.0)
        else:
            scores.append(0.0)

        schema_count = len(schema) if isinstance(schema, list) else 0
        scores.append(min(10.0, schema_count * 3.0))

        img_count = len(images) if isinstance(images, list) else 0
        if img_count >= 3:
            scores.append(9.0)
        elif img_count >= 1:
            scores.append(6.0)
        else:
            scores.append(2.0)

        int_count = len(internal) if isinstance(internal, list) else 0
        ext_count = len(external) if isinstance(external, list) else 0
        link_score = min(10.0, (int_count * 1.5) + (ext_count * 1.0))
        scores.append(link_score)

        eeat_signals = self._count_eeat_signals(content)
        eeat_score = min(10.0, eeat_signals * 2.0)
        scores.append(eeat_score)

        avg = sum(scores) / max(len(scores), 1)
        return max(0, min(100, int(avg * 10)))

    def _count_eeat_signals(self, content: str) -> int:
        if not content:
            return 0
        patterns = [
            r"\baccording to\b", r"\bstud(?:y|ies)\b", r"\bresearch\b",
            r"\b\d{4}\b", r"\bexperts?\b", r"\bauthoritative\b",
            r"\bexperience\b", r"\bexpertise\b", r"\bcredentials?\b",
            r"\bcertified\b", r"\bpublished\b", r"\baccording to\b",
        ]
        count = 0
        for p in patterns:
            count += len(re.findall(p, content, re.IGNORECASE))
        return count

    def _compute_readability_score(self, content: str, words: list[str]) -> float:
        if not words or not content:
            return 0.0
        sentences = self._split_sentences(content)
        if not sentences:
            return 0.0
        total_words = len(words)
        total_sentences = len(sentences)
        syllables = sum(self._count_syllables(w) for w in words)
        avg_wps = total_words / total_sentences
        avg_spw = syllables / total_words
        fk = 206.835 - 1.015 * avg_wps - 84.6 * avg_spw
        fk = max(0.0, min(100.0, fk))
        return round(fk / 100.0, 2)

    def _flesch_kincaid_level(self, content: str, words: list[str]) -> str:
        if not words or not content:
            return "N/A"
        sentences = self._split_sentences(content)
        if not sentences:
            return "N/A"
        total_words = len(words)
        total_sentences = len(sentences)
        syllables = sum(self._count_syllables(w) for w in words)
        avg_wps = total_words / total_sentences
        avg_spw = syllables / total_words
        grade = 0.39 * avg_wps + 11.8 * avg_spw - 15.59
        grade = max(0.0, grade)
        if grade <= 5:
            return "Grade 5 (Elementary)"
        elif grade <= 8:
            return f"Grade {int(grade)} (Middle School)"
        elif grade <= 12:
            return f"Grade {int(grade)} (High School)"
        elif grade <= 16:
            return f"Grade {int(grade)} (College)"
        return f"Graduate Level ({int(grade)})"

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
            is_v = ch in vowels
            if is_v and not prev_vowel:
                count += 1
            prev_vowel = is_v
        if word.endswith("e") and count > 1:
            count -= 1
        return max(1, count)

    # ------------------------------------------------------------------
    # Issue collection
    # ------------------------------------------------------------------

    def _collect_issues(
        self, title: str, meta: str, h1: str, content: str, word_count: int,
        headings: list, images: list, internal: list, external: list,
        schema: list, page_type: str,
    ) -> list[dict[str, Any]]:
        issues: list[dict[str, Any]] = []

        if not title:
            issues.append({"severity": "critical", "category": "on_page", "issue": "Missing title tag", "fix": "Add a descriptive title tag (50-70 characters) with primary keyword"})
        elif len(title) < 30:
            issues.append({"severity": "high", "category": "on_page", "issue": f"Title too short ({len(title)} chars)", "fix": "Expand title to 50-70 characters to maximize SERP visibility"})
        elif len(title) > 70:
            issues.append({"severity": "medium", "category": "on_page", "issue": f"Title too long ({len(title)} chars, may truncate)", "fix": "Shorten title to under 70 characters"})

        if not meta:
            issues.append({"severity": "critical", "category": "on_page", "issue": "Missing meta description", "fix": "Write a compelling meta description (120-160 chars) with CTA"})
        elif len(meta) < 120:
            issues.append({"severity": "high", "category": "on_page", "issue": f"Meta description too short ({len(meta)} chars)", "fix": "Expand to 120-160 characters to fill SERP snippet"})
        elif len(meta) > 160:
            issues.append({"severity": "medium", "category": "on_page", "issue": f"Meta description too long ({len(meta)} chars)", "fix": "Shorten to under 160 characters"})

        if not h1:
            issues.append({"severity": "critical", "category": "on_page", "issue": "Missing H1 tag", "fix": "Add a single H1 that matches the page topic and primary keyword"})

        if h1 and title and h1.strip() != title.strip():
            issues.append({"severity": "medium", "category": "on_page", "issue": "H1 and title do not match", "fix": "Align H1 with title tag for consistent keyword signaling"})

        ideal = self.IDEAL_WORDS.get(page_type, self.DEFAULT_IDEAL)
        if word_count < ideal * 0.3:
            issues.append({"severity": "critical", "category": "content", "issue": f"Severely thin content ({word_count} words, target {ideal})", "fix": f"Expand content to at least {ideal} words with substantive, original information"})
        elif word_count < ideal * 0.6:
            issues.append({"severity": "high", "category": "content", "issue": f"Below-target word count ({word_count}/{ideal})", "fix": f"Add ~{ideal - word_count} more words covering missing subtopics"})

        heading_count = len(headings) if isinstance(headings, list) else 0
        if heading_count == 0:
            issues.append({"severity": "high", "category": "structure", "issue": "No subheadings found", "fix": "Add H2/H3 headings to break content into scannable sections"})
        elif heading_count < 3:
            issues.append({"severity": "medium", "category": "structure", "issue": f"Only {heading_count} subheading(s) found", "fix": "Add more H2/H3 headings to improve structure and featured snippet potential"})

        img_count = len(images) if isinstance(images, list) else 0
        if img_count == 0:
            issues.append({"severity": "medium", "category": "content", "issue": "No images on page", "fix": "Add relevant images, diagrams, or screenshots to increase engagement"})
        elif img_count > 0 and isinstance(images, list):
            no_alt = sum(1 for img in images if isinstance(img, dict) and not img.get("alt"))
            if no_alt > 0:
                issues.append({"severity": "medium", "category": "accessibility", "issue": f"{no_alt} image(s) missing alt text", "fix": "Add descriptive alt text to all images for accessibility and image SEO"})

        schema_count = len(schema) if isinstance(schema, list) else 0
        if schema_count == 0:
            issues.append({"severity": "high", "category": "technical", "issue": "No structured data / schema markup", "fix": "Add JSON-LD schema (FAQPage, Article, Organization) for AI answer extraction (GEO/AEO)"})

        if isinstance(internal, list):
            int_count = len(internal)
        else:
            int_count = 0
        if int_count == 0:
            issues.append({"severity": "high", "category": "seo", "issue": "No internal links", "fix": "Add 3-5 internal links to related content to strengthen site architecture"})

        if isinstance(external, list):
            ext_count = len(external)
        else:
            ext_count = 0
        if ext_count == 0:
            issues.append({"severity": "medium", "category": "seo", "issue": "No external links", "fix": "Link to 2-3 authoritative sources to boost topical relevance"})

        if content:
            stat_count = len(re.findall(r"\d+%|\$\d+|\d+x\b|\d{1,3}(?:,\d{3})+", content))
            if stat_count < 2:
                issues.append({"severity": "medium", "category": "authority", "issue": "Few statistics or data points", "fix": "Add 3-5 statistics with sources to strengthen credibility"})

            faq_signal = re.search(r"\b(?:frequently asked|faq|q:|a:)\b", content, re.IGNORECASE)
            if not faq_signal:
                issues.append({"severity": "high", "category": "ai_search", "issue": "No FAQ section detected", "fix": "Add FAQ section with schema markup for AI Overview and answer extraction eligibility"})

            author_signal = re.search(r"\b(written by|author|byline|bio)\b", content, re.IGNORECASE)
            if not author_signal and page_type in ("BLOG", "DOCS"):
                issues.append({"severity": "medium", "category": "eeat", "issue": "No author attribution", "fix": "Add author name, bio, and credentials for E-E-A-T"})

        return issues

    # ------------------------------------------------------------------
    # Recommendations with before/after
    # ------------------------------------------------------------------

    def _build_recommendations(
        self, title: str, meta: str, h1: str, content: str, word_count: int,
        headings: list, images: list, internal: list, external: list,
        schema: list, page_type: str, topic: str, brand: str,
        paragraphs: list[str],
    ) -> list[dict[str, Any]]:
        recs: list[dict[str, Any]] = []

        new_title = self._rewrite_title_for_mode(title, topic, brand, page_type, "seo")
        if title != new_title:
            recs.append({
                "section": "Title Tag",
                "before": title or "(missing)",
                "after": new_title,
                "why": "Optimized title targets primary keyword, includes brand, and stays within 70-character SERP limit. Current title " + ("is missing" if not title else "is %d chars and underoptimized" % len(title)) + ".",
                "impact": {"seo": "high", "ai_search": "medium", "conversion": "medium"},
                "confidence": 92,
            })

        new_meta = self._rewrite_meta_for_mode(meta, topic, brand, page_type, "seo")
        if meta != new_meta:
            recs.append({
                "section": "Meta Description",
                "before": meta or "(missing)",
                "after": new_meta,
                "why": "Meta description crafted with primary keyword, value proposition, and CTA within 155-character limit.",
                "impact": {"seo": "high", "ai_search": "low", "conversion": "high"},
                "confidence": 90,
            })

        new_h1 = self._rewrite_h1_for_mode(h1, topic, brand, page_type, "seo")
        if h1 != new_h1:
            recs.append({
                "section": "H1 Heading",
                "before": h1 or "(missing)",
                "after": new_h1,
                "why": "H1 aligned with title tag and primary keyword while remaining natural and compelling.",
                "impact": {"seo": "high", "ai_search": "medium", "conversion": "low"},
                "confidence": 88,
            })

        new_intro = self._rewrite_intro_for_mode(topic, brand, page_type, "seo", paragraphs)
        first_para = paragraphs[0] if paragraphs else ""
        if first_para != new_intro:
            recs.append({
                "section": "Introduction Paragraph",
                "before": first_para[:300] + ("..." if len(first_para) > 300 else "") if first_para else "(missing)",
                "after": new_intro,
                "why": "Introduction now leads with the core value proposition, includes the primary keyword in the first sentence, and establishes relevance for both human readers and AI extraction.",
                "impact": {"seo": "high", "ai_search": "high", "conversion": "medium"},
                "confidence": 87,
            })

        ideal = self.IDEAL_WORDS.get(page_type, self.DEFAULT_IDEAL)
        if word_count < ideal * 0.7:
            recs.append({
                "section": "Content Depth",
                "before": f"{word_count} words (target: {ideal})",
                "after": f"Expand to {ideal}+ words covering missing subtopics, FAQs, comparison tables, and supporting data",
                "why": f"Content is {ideal - word_count} words below target. Comprehensive content outperforms thin pages in both traditional SEO and AI extraction.",
                "impact": {"seo": "high", "ai_search": "high", "conversion": "medium"},
                "confidence": 85,
            })

        if isinstance(schema, list) and len(schema) == 0:
            recs.append({
                "section": "Structured Data",
                "before": "(none)",
                "after": "Add FAQPage, Article, Organization, and BreadcrumbList schema in JSON-LD format",
                "why": "Schema markup enables rich results in Google and provides structured context for AI platforms to understand and cite your content.",
                "impact": {"seo": "high", "ai_search": "high", "conversion": "medium"},
                "confidence": 94,
            })

        if isinstance(internal, list) and len(internal) == 0:
            recs.append({
                "section": "Internal Linking",
                "before": "0 internal links",
                "after": f"Add 3-5 internal links to related {brand} pages (documentation, pricing, case studies)",
                "why": "Internal links distribute PageRank, help crawlers discover content, and signal topical relationships to AI platforms.",
                "impact": {"seo": "high", "ai_search": "medium", "conversion": "medium"},
                "confidence": 91,
            })

        return recs

    # ------------------------------------------------------------------
    # Rewrite mode generation
    # ------------------------------------------------------------------

    def _generate_rewrite_modes(
        self, title: str, h1: str, meta: str, content: str,
        paragraphs: list[str], topic: str, brand: str, page_type: str,
    ) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for mode_key, mode_info in self.REWRITE_MODES.items():
            title_rewrite = self._rewrite_title_for_mode(title, topic, brand, page_type, mode_key)
            h1_rewrite = self._rewrite_h1_for_mode(h1, topic, brand, page_type, mode_key)
            meta_rewrite = self._rewrite_meta_for_mode(meta, topic, brand, page_type, mode_key)
            intro_rewrite = self._rewrite_intro_for_mode(topic, brand, page_type, mode_key, paragraphs)
            para_rewrites = self._rewrite_paragraphs_for_mode(paragraphs, topic, brand, mode_key)

            score = self._mode_score(mode_key, content, title, h1, meta, paragraphs)

            result[mode_key] = {
                "label": mode_info["label"],
                "score": score,
                "title_rewrite": title_rewrite,
                "h1_rewrite": h1_rewrite,
                "intro_rewrite": intro_rewrite,
                "meta_rewrite": meta_rewrite,
                "paragraphs": para_rewrites,
            }
        return result

    def _mode_score(self, mode: str, content: str, title: str, h1: str, meta: str, paragraphs: list[str]) -> int:
        if not content:
            return 20
        base = 50
        if mode == "seo":
            if title and self._extract_keywords_from_text(title):
                base += 10
            stat_count = len(re.findall(r"\d+%", content))
            base += min(15, stat_count * 3)
            if re.search(r"\bhow to\b|\bwhat is\b", content, re.IGNORECASE):
                base += 5
        elif mode == "aeo_geo":
            if re.search(r"\baccording to\b|\bresearch\b|\bstud", content, re.IGNORECASE):
                base += 10
            if re.search(r"\b\d{4}\b", content):
                base += 5
            if re.search(r"\bfaq\b|\bfrequently asked\b", content, re.IGNORECASE):
                base += 8
            sentences = self._split_sentences(content)
            short = sum(1 for s in sentences if len(s.split()) < 20)
            base += min(10, short)
        elif mode == "readability":
            words = content.split()
            if words:
                fk = self._compute_readability_score(content, words) * 100
                base = int(fk * 0.8)
        elif mode == "conversion":
            cta = re.search(r"\b(get started|sign up|try free|book a demo|contact us|pricing)\b", content, re.IGNORECASE)
            if cta:
                base += 15
            if re.search(r"\bfree\b|\btrial\b|\bguarantee\b", content, re.IGNORECASE):
                base += 10
        elif mode == "eeat":
            base += min(20, self._count_eeat_signals(content) * 3)
        elif mode == "voice_search":
            sentences = self._split_sentences(content)
            conversational = sum(1 for s in sentences if re.search(r"\b(you|your|we|our)\b", s, re.IGNORECASE))
            base += min(15, int(conversational / max(len(sentences), 1) * 20))
        elif mode == "featured_snippet":
            if re.search(r"^\s*\d+[\.\)]\s", content, re.MULTILINE):
                base += 10
            if re.search(r"^\s*[-•]\s", content, re.MULTILINE):
                base += 8
        elif mode == "beginner_friendly":
            words = content.split()
            if words:
                fk = self._compute_readability_score(content, words) * 100
                base = int(fk * 0.7) + 15
        elif mode == "executive_summary":
            if re.search(r"\b roi \b|\b revenue \b|\b growth \b|\b result", content, re.IGNORECASE):
                base += 12
        elif mode == "technical":
            tech_terms = len(re.findall(r"\bAPI\b|\bSDK\b|\bJSON\b|\bREST\b|\bwebhook\b|\bendpoint\b|\bdeploy\b", content, re.IGNORECASE))
            base += min(15, tech_terms * 3)

        return max(0, min(100, base))

    def _extract_keywords_from_text(self, text: str) -> list[str]:
        words = re.findall(r"\b[a-zA-Z]{4,}\b", text)
        kw: list[str] = []
        seen: set[str] = set()
        for w in words:
            wl = w.lower()
            if wl not in self.STOP_WORDS and wl not in seen:
                seen.add(wl)
                kw.append(w)
        return kw

    def _rewrite_title_for_mode(self, title: str, topic: str, brand: str, page_type: str, mode: str) -> str:
        primary_kw = self._extract_keywords_from_text(topic)
        kw_str = primary_kw[0].lower() if primary_kw else topic.lower()

        if mode == "seo":
            return f"{topic} | {brand} - Complete Guide for 2025"
        elif mode == "aeo_geo":
            return f"{topic}: Definition, Benefits, and How It Works | {brand}"
        elif mode == "readability":
            return f"{topic}: A Simple Guide to Getting Started"
        elif mode == "conversion":
            return f"{topic} - Boost Your Revenue by 30% | Try {brand} Free"
        elif mode == "eeat":
            return f"{topic}: Expert Analysis and Data-Backed Insights | {brand}"
        elif mode == "technical":
            return f"{topic}: Technical Overview, Architecture & Implementation Guide"
        elif mode == "executive_summary":
            return f"{topic}: ROI Guide for Revenue Leaders | {brand}"
        elif mode == "beginner_friendly":
            return f"What Is {topic}? A Beginner-Friendly Guide (No Jargon)"
        elif mode == "voice_search":
            return f"What Is {topic} and How Does It Help My Business?"
        elif mode == "featured_snippet":
            return f"{topic}: Definition, Benefits, Features & Alternatives (2025)"
        return title or f"{topic} | {brand}"

    def _rewrite_h1_for_mode(self, h1: str, topic: str, brand: str, page_type: str, mode: str) -> str:
        if mode == "seo":
            return f"Complete Guide to {topic}: Everything You Need to Know"
        elif mode == "aeo_geo":
            return f"{topic}: How It Works, Key Benefits, and Real Results"
        elif mode == "readability":
            return f"All About {topic}: Simple Explanation"
        elif mode == "conversion":
            return f"Transform Your Revenue with {topic}"
        elif mode == "eeat":
            return f"{topic}: An Evidence-Based Deep Dive"
        elif mode == "technical":
            return f"{topic}: Architecture, Integration, and Best Practices"
        elif mode == "executive_summary":
            return f"{topic}: Strategic Overview for Decision Makers"
        elif mode == "beginner_friendly":
            return f"Understanding {topic}: The Complete Beginner Guide"
        elif mode == "voice_search":
            return f"How Does {topic} Work?"
        elif mode == "featured_snippet":
            return f"What Is {topic}? (Definition + Key Benefits)"
        return h1 or topic

    def _rewrite_meta_for_mode(self, meta: str, topic: str, brand: str, page_type: str, mode: str) -> str:
        if mode == "seo":
            return f"Learn everything about {topic} with this comprehensive guide. Features, benefits, comparisons, and expert insights. Start free with {brand}."
        elif mode == "aeo_geo":
            return f"{topic} explained: definition, how it works, benefits, features, and comparison with alternatives. Data-backed analysis with expert insights from {brand}."
        elif mode == "readability":
            return f"Not sure what {topic} is? This simple guide explains it in plain English. No jargon, just clear answers."
        elif mode == "conversion":
            return f"See how {topic} helps teams increase revenue by 30%. Free trial, no credit card required. Trusted by 500+ companies."
        elif mode == "eeat":
            return f"In-depth analysis of {topic} backed by research and expert experience. Compare features, read case studies, and see real results."
        elif mode == "technical":
            return f"Technical guide to {topic}: architecture overview, API integration, SDK setup, and production deployment best practices."
        elif mode == "executive_summary":
            return f"Executive briefing on {topic}: ROI analysis, strategic impact, and competitive positioning for revenue leaders."
        elif mode == "beginner_friendly":
            return f"New to {topic}? Start here. We explain what it is, why it matters, and how to get started, step by step."
        elif mode == "voice_search":
            return f"What is {topic}? How does it work? What are the benefits? Get answers to the most common questions about {topic}."
        elif mode == "featured_snippet":
            return f"{topic} is defined as a comprehensive solution for modern revenue teams. Learn the definition, key features, benefits, pricing, and top alternatives."
        return meta or f"Learn about {topic} with {brand}. Features, benefits, and pricing."

    def _rewrite_intro_for_mode(self, topic: str, brand: str, page_type: str, mode: str, paragraphs: list[str]) -> str:
        current = paragraphs[0] if paragraphs else ""
        if mode == "seo":
            return f"In today's competitive landscape, {topic} has become essential for businesses looking to scale their revenue operations. This comprehensive guide covers everything from core features and benefits to implementation strategies and pricing, so you can make an informed decision about whether {topic} is the right solution for your team."
        elif mode == "aeo_geo":
            return f"{topic} is a {self._category_for_topic(topic, ' '.join(paragraphs))} designed to help businesses unify their revenue operations. According to industry research, organizations using {topic.lower()}-type platforms see 25-35% improvement in pipeline efficiency. Here's what you need to know about how it works, its key features, and how it compares to alternatives."
        elif mode == "readability":
            return f"Trying to figure out what {topic} is? Here's the short version: it's a tool that helps your sales and marketing teams work better together. In this guide, we'll walk you through everything in simple terms, no tech jargon required."
        elif mode == "conversion":
            return f"What if your revenue teams could close 30% more deals with half the manual work? That's exactly what {topic} delivers. Trusted by hundreds of companies, {topic} combines AI-powered automation with deep analytics to transform how you generate, manage, and close revenue. Start your free trial today."
        elif mode == "eeat":
            return f"After working extensively with {topic.lower()} and analyzing its impact across multiple organizations, we've found that it consistently delivers measurable results in pipeline growth and forecast accuracy. In this analysis, we draw on real deployment data, industry research, and hands-on experience to give you an honest assessment of what {topic} does well, where it falls short, and whether it fits your use case."
        elif mode == "technical":
            return f"{topic} provides a modern architecture for revenue operations, built on a RESTful API foundation with real-time event streaming and webhook-based integrations. This technical overview covers the system architecture, supported integration protocols, data models, and deployment options available for enterprise teams."
        elif mode == "executive_summary":
            return f"For revenue leaders evaluating {topic.lower()}, the key question is simple: does it deliver measurable ROI? Based on current market data and deployment outcomes, {topic} accelerates pipeline growth by 25-35%, improves forecast accuracy by 15-20%, and reduces manual revenue operations overhead by up to 40%. This briefing covers the strategic case for adoption."
        elif mode == "beginner_friendly":
            return f"Welcome! If you're new to {topic.lower()}, you're in the right place. We'll explain everything from scratch, what it is, why companies use it, and how you can get started, without any confusing technical language."
        elif mode == "voice_search":
            return f"Great question! {topic} is a tool that helps businesses manage their revenue operations more efficiently. Think of it as a smart assistant for your sales and marketing teams that automates repetitive tasks and provides insights to help you make better decisions."
        elif mode == "featured_snippet":
            return f"{topic} is a {self._category_for_topic(topic, ' '.join(paragraphs))} that helps businesses unify sales, marketing, and revenue operations on a single platform. Key benefits include AI-powered automation, real-time analytics, pipeline management, and CRM integration."
        return current or f"Discover how {topic} can transform your revenue operations."

    def _category_for_topic(self, topic: str, content: str = "") -> str:
        topic_lower = topic.lower()
        combined = f"{topic_lower} {(content[:500] if content else '').lower()}"
        if any(kw in combined for kw in ["gtm", "revenue", "sales", "crm", "pipeline", "intelligence"]):
            return "Go-to-market platform"
        if any(kw in combined for kw in ["seo", "search", "marketing", "content"]):
            return "Marketing platform"
        if any(kw in combined for kw in ["ai", "machine learning", "automation"]):
            return "AI-powered solution"
        if any(kw in combined for kw in ["cloud", "hosting", "infrastructure"]):
            return "Cloud infrastructure solution"
        if any(kw in combined for kw in ["data", "analytics", "intelligence"]):
            return "Data analytics platform"
        return "software platform"

    def _rewrite_paragraphs_for_mode(self, paragraphs: list[str], topic: str, brand: str, mode: str) -> list[dict[str, str]]:
        result: list[dict[str, str]] = []
        for i, para in enumerate(paragraphs[:8]):
            rewritten = self._rewrite_single_paragraph(para, topic, brand, mode)
            if rewritten != para:
                improvement = f"Optimized for {self.REWRITE_MODES.get(mode, {}).get('label', mode)} mode"
                if mode == "readability":
                    improvement = "Simplified language, shorter sentences for clarity"
                elif mode == "aeo_geo":
                    improvement = "Added factual structure and citation-friendly phrasing"
                elif mode == "seo":
                    improvement = "Integrated keywords naturally while maintaining readability"
                elif mode == "conversion":
                    improvement = "Added benefit-focused language and action-oriented phrasing"
                elif mode == "eeat":
                    improvement = "Added authority signals, evidence references, and experience markers"
                result.append({
                    "current": para[:500],
                    "rewritten": rewritten[:500],
                    "improvement": improvement,
                })
        return result

    def _rewrite_single_paragraph(self, para: str, topic: str, brand: str, mode: str) -> str:
        if not para or len(para) < 30:
            return para

        sentences = self._split_sentences(para)
        if not sentences:
            return para

        rewritten_sentences: list[str] = []
        for sent in sentences:
            rsent = sent
            if mode == "readability":
                rsent = self._simplify_sentence(sent)
            elif mode == "voice_search":
                if not re.search(r"\b(you|your|we|our)\b", sent, re.IGNORECASE):
                    rsent = "You " + sent[0].lower() + sent[1:]
            elif mode == "conversion":
                if re.search(r"\bfeature\b|\bcapability\b", sent, re.IGNORECASE):
                    rsent = re.sub(r"\bcapabilities?\b", "benefits", sent, flags=re.IGNORECASE)
            elif mode == "executive_summary":
                if len(sent.split()) > 20:
                    words = sent.split()
                    rsent = " ".join(words[:15]) + "."
            rewritten_sentences.append(rsent)

        result = " ".join(rewritten_sentences)
        return result

    def _simplify_sentence(self, sentence: str) -> str:
        result = sentence
        replacements = {
            "implement": "set up",
            "utilize": "use",
            "facilitate": "help",
            "demonstrate": "show",
            "approximately": "about",
            "subsequently": "then",
            "furthermore": "also",
            "nevertheless": "but",
            "consequently": "so",
            "leverage": "use",
            "optimal": "best",
            "methodology": "method",
            "functionality": "feature",
        }
        for formal, simple in replacements.items():
            result = re.sub(r"\b" + formal + r"\b", simple, result, flags=re.IGNORECASE)

        if len(result.split()) > 25:
            parts = re.split(r"\s*,\s*(?:which|that|who|where|when)\s+", result, maxsplit=1)
            if len(parts) > 1:
                result = parts[0] + ". " + parts[1][0].upper() + parts[1][1:]

        return result

    # ------------------------------------------------------------------
    # Missing section generation
    # ------------------------------------------------------------------

    def _generate_missing_sections(
        self, title: str, h1: str, content: str, topic: str, brand: str,
        page_type: str, word_count: int,
    ) -> dict[str, Any]:
        faqs = self._generate_faq_content(topic, brand, content, page_type)
        comparison = self._generate_comparison_table(topic, brand, content, page_type)
        lists = self._generate_lists(topic, brand, content, page_type)
        glossary = self._generate_glossary(topic, brand, content, page_type)

        sections: dict[str, Any] = {}
        if faqs:
            sections["faq"] = faqs
        if comparison:
            sections["comparison_table"] = comparison
        if lists:
            sections["lists"] = lists
        if glossary:
            sections["glossary"] = glossary

        return sections

    def _generate_faq_content(self, topic: str, brand: str, content: str, page_type: str) -> list[dict[str, str]]:
        topic_lower = topic.lower()
        brand_lower = brand.lower()
        content_lower = content.lower() if content else ""

        faqs: list[dict[str, str]] = []

        if any(kw in topic_lower for kw in ["gtm", "revenue", "sales", "crm", "pipeline", "datavi", "intelligence"]):
            faqs = [
                {
                    "question": f"What is {topic}?",
                    "answer": f"{topic} is an AI-powered {self._category_for_topic(topic, content)} that unifies sales, marketing, and revenue operations into a single intelligent system. It combines CRM enrichment, lead scoring, pipeline analytics, and AI-driven automation to help teams accelerate revenue growth.",
                },
                {
                    "question": f"How does {topic} work?",
                    "answer": f"{topic} works by ingesting data from your existing CRM, marketing tools, and sales platforms. Its AI agents analyze this data in real time, enriching records, scoring leads based on buying intent, identifying pipeline risks, and delivering actionable insights to your revenue teams.",
                },
                {
                    "question": f"What are the main features of {topic}?",
                    "answer": f"Key features include AI-powered CRM data enrichment, automated lead scoring with buying intent signals, real-time pipeline analytics, revenue forecasting, automated workflow orchestration, multi-source data integration, and executive dashboards with actionable recommendations.",
                },
                {
                    "question": f"How does {topic} compare to traditional CRMs?",
                    "answer": f"Unlike traditional CRMs that rely on manual data entry, {topic} automates data enrichment and provides AI-driven insights. While a CRM stores data, {topic} activates it by predicting buyer intent, identifying at-risk deals, and recommending next-best-actions for each opportunity.",
                },
                {
                    "question": f"Who should use {topic}?",
                    "answer": f"{topic} is designed for B2B revenue teams including VP of Sales, RevOps leaders, Marketing Operations, and CROs who want to unify their go-to-market data, improve forecast accuracy, and accelerate pipeline growth with AI-powered automation.",
                },
                {
                    "question": f"What results can I expect from {topic}?",
                    "answer": f"Organizations using {topic} typically report 25-35% improvement in pipeline growth, 15-25% improvement in forecast accuracy, 30% reduction in manual data entry, and 20-30% increase in lead-to-opportunity conversion rates within the first 90 days.",
                },
                {
                    "question": f"Is there a free trial for {topic}?",
                    "answer": f"Yes, {brand} offers a free trial that lets you experience {topic} capabilities with your own data. No credit card is required to get started, and onboarding support is included to help you see results quickly.",
                },
            ]
        else:
            faqs = [
                {
                    "question": f"What is {topic}?",
                    "answer": f"{topic} is a {self._category_for_topic(topic, content)} designed to help businesses streamline their operations, improve efficiency, and achieve measurable results through modern technology and data-driven insights.",
                },
                {
                    "question": f"How does {topic} work?",
                    "answer": f"{topic} works by integrating with your existing tools and workflows. It analyzes your data, identifies patterns and opportunities, and provides actionable recommendations to help your team make better decisions faster.",
                },
                {
                    "question": f"What are the benefits of {topic}?",
                    "answer": f"Key benefits include improved operational efficiency, better data-driven decision-making, reduced manual work, enhanced team collaboration, and measurable ROI within the first quarter of implementation.",
                },
                {
                    "question": f"How much does {topic} cost?",
                    "answer": f"{brand} offers flexible pricing plans to fit different team sizes and budgets. Contact the sales team for a custom quote, or start with a free trial to evaluate {topic} with your own data and workflows.",
                },
                {
                    "question": f"Is {topic} easy to set up?",
                    "answer": f"Yes. {topic} is designed for quick deployment with guided onboarding. Most teams are fully operational within 1-2 weeks, with dedicated support available throughout the setup process.",
                },
            ]

        content_lower_check = content_lower
        for faq in faqs:
            q_words = re.findall(r"\b[a-z]{4,}\b", faq["question"].lower())
            in_content = sum(1 for w in q_words if w in content_lower_check)
            if in_content >= len(q_words) * 0.5:
                continue

        return faqs[:7]

    def _generate_comparison_table(self, topic: str, brand: str, content: str, page_type: str) -> dict[str, Any] | None:
        if page_type not in ("PRODUCT", "LANDING", "BLOG"):
            return None

        topic_lower = topic.lower()
        if any(kw in topic_lower for kw in ["gtm", "revenue", "sales", "crm", "pipeline", "intelligence"]):
            return {
                "headers": ["Feature", topic[:25], "Salesforce", "HubSpot", "Clay"],
                "rows": [
                    ["AI-Powered CRM Enrichment", "Yes", "Limited", "No", "Yes"],
                    ["Buying Intent Signals", "Yes", "No", "Partial", "No"],
                    ["Automated Lead Scoring", "Yes (AI)", "Yes (Rules)", "Yes (ML)", "No"],
                    ["Revenue Intelligence", "Yes", "Yes (Einstein)", "No", "No"],
                    ["Real-Time Pipeline Analytics", "Yes", "Yes", "Yes", "Limited"],
                    ["Multi-Source Data Fusion", "Yes", "Partial", "Partial", "Yes"],
                    ["AI Agent Automation", "Yes", "No", "No", "No"],
                    ["Time to Value", "Days", "Weeks", "Weeks", "Days"],
                    ["Free Trial", "Yes", "No", "Free Tier", "Yes"],
                ],
            }
        else:
            return {
                "headers": ["Feature", topic[:25], "Alternative A", "Alternative B"],
                "rows": [
                    ["Core Functionality", "Yes", "Yes", "Yes"],
                    ["AI / ML Capabilities", "Yes", "Partial", "No"],
                    ["Real-Time Analytics", "Yes", "Yes", "Limited"],
                    ["Integration Support", "200+", "100+", "50+"],
                    ["Free Trial", "Yes", "No", "Free Tier"],
                    ["Enterprise Support", "Yes", "Yes", "Limited"],
                ],
            }

    def _generate_lists(self, topic: str, brand: str, content: str, page_type: str) -> list[dict[str, Any]]:
        lists: list[dict[str, Any]] = []

        lists.append({
            "title": f"Benefits of Using {topic}",
            "items": [
                "Unified data across all revenue teams eliminates silos and duplication",
                "AI-powered automation reduces manual data entry by 30-50%",
                "Real-time analytics provide actionable insights for faster decisions",
                "Predictive lead scoring improves conversion rates by 20-35%",
                "Automated pipeline alerts prevent deals from stalling",
                "Executive dashboards provide a single source of truth for forecasting",
            ],
        })

        lists.append({
            "title": f"Getting Started with {topic}: Step by Step",
            "items": [
                "Sign up for a free trial and connect your CRM",
                "Configure data sources and integration preferences",
                "Let AI agents analyze your existing data (usually 24-48 hours)",
                "Review AI-generated insights and enrichments",
                "Set up automated workflows and alert rules",
                "Track results and optimize based on initial outcomes",
            ],
        })

        if page_type in ("PRODUCT", "DOCS"):
            lists.append({
                "title": f"Best Practices for {topic}",
                "items": [
                    "Start with a focused use case and expand gradually",
                    "Ensure CRM data quality before connecting to maximize AI accuracy",
                    "Set up automated alerts for high-intent buying signals",
                    "Review AI recommendations weekly to build trust in the system",
                    "Integrate with marketing automation for end-to-end GTM visibility",
                    "Train your team on interpreting AI-generated insights",
                ],
            })

        return lists

    def _generate_glossary(self, topic: str, brand: str, content: str, page_type: str) -> list[dict[str, str]]:
        topic_lower = topic.lower()
        if any(kw in topic_lower for kw in ["gtm", "revenue", "sales", "crm", "pipeline", "intelligence"]):
            return [
                {"term": "GTM Operating System", "definition": "A unified platform that combines all go-to-market functions — sales, marketing, and customer success — into a single intelligent system for managing revenue operations."},
                {"term": "Revenue Intelligence", "definition": "The use of AI and data analytics to improve revenue-related decisions across sales, marketing, and customer success, including forecasting, pipeline management, and deal scoring."},
                {"term": "RevOps", "definition": "Revenue Operations — the strategic alignment of sales, marketing, and customer success operations to maximize revenue growth and operational efficiency."},
                {"term": "Buying Intent", "definition": "Behavioral signals indicating that a prospect is actively researching solutions and may be ready to purchase, such as website visits, content downloads, and competitor comparisons."},
                {"term": "CRM Enrichment", "definition": "The process of automatically enhancing CRM records with additional firmographic, demographic, technographic, and behavioral data to improve lead quality and sales effectiveness."},
                {"term": "Lead Scoring", "definition": "A methodology for ranking prospects based on their likelihood to convert, using demographic fit, behavioral signals, and AI-predicted buying intent."},
                {"term": "Pipeline Analytics", "definition": "The analysis of sales pipeline data to identify trends, forecast revenue, detect stalled deals, and optimize the sales process for better conversion rates."},
                {"term": "AI Agent", "definition": "An autonomous AI system that performs specific revenue operations tasks such as data enrichment, lead qualification, and outreach personalization without manual intervention."},
            ]
        return []

    # ------------------------------------------------------------------
    # E-E-A-T analysis
    # ------------------------------------------------------------------

    def _analyze_eeat(self, content: str, title: str, h1: str, topic: str, brand: str, page_type: str) -> dict[str, Any]:
        content_lower = content.lower() if content else ""

        has_author = bool(re.search(r"\b(written by|author|byline|about the author)\b", content_lower))
        author_suggestion = "" if has_author else f"Add an author bio for {brand} with credentials, years of experience in {topic.lower()}, and links to professional profiles (LinkedIn, publications)."

        ref_patterns = [r"\baccording to\b", r"\bresearch (?:from|by|shows)\b", r"\bstud(?:y|ies)\b", r"\breport (?:from|by)\b", r"\bsource[s]?:\b"]
        ref_count = sum(len(re.findall(p, content_lower)) for p in ref_patterns)
        has_refs = ref_count >= 2
        ref_suggestions: list[str] = []
        if not has_refs:
            ref_suggestions = [
                f"Cite industry research from Gartner, Forrester, or McKinsey on {topic.lower()} market trends",
                f"Link to published case studies demonstrating measurable ROI from {brand} implementations",
                f"Reference authoritative sources for any market size or growth statistics",
            ]

        stat_patterns = [r"\d+%", r"\$\d+", r"\d+x\b", r"\d{1,3}(?:,\d{3})+", r"\b(?:million|billion)\b"]
        stat_count = sum(len(re.findall(p, content_lower)) for p in stat_patterns)
        has_stats = stat_count >= 3
        stat_suggestions: list[str] = []
        if not has_stats:
            stat_suggestions = [
                f"Add specific ROI metrics (e.g., 'reduces manual data entry by 35%')",
                f"Include industry statistics on {topic.lower()} adoption and market growth",
                f"Reference customer success metrics (e.g., pipeline growth, conversion rate improvements)",
            ]

        quote_patterns = [r'["\u201c][^"\u201d]{30,}["\u201d]', r"\bsaid\b", r"\baccording to\b", r"\bexpert(?:s)?\b"]
        quote_count = sum(len(re.findall(p, content_lower)) for p in quote_patterns)
        has_quotes = quote_count >= 2
        quote_suggestion = "" if has_quotes else f"Add expert quotes or testimonials from {brand} customers and industry practitioners to strengthen credibility."

        signals = 0
        if has_author:
            signals += 2
        if has_refs:
            signals += 2
        if has_stats:
            signals += 2
        if has_quotes:
            signals += 2
        if page_type in ("BLOG", "DOCS"):
            exp_patterns = [r"\bin my (?:experience|opinion)\b", r"\bwe (?:found|tested|discovered)\b", r"\bour team\b", r"\bpersonally\b"]
            exp_count = sum(len(re.findall(p, content_lower)) for p in exp_patterns)
            if exp_count > 0:
                signals += 2

        overall_score = min(100, signals * 12 + 20)

        return {
            "author": {
                "present": has_author,
                "suggestion": author_suggestion,
            },
            "references": {
                "present": has_refs,
                "count": ref_count,
                "suggestions": ref_suggestions,
            },
            "statistics": {
                "present": has_stats,
                "count": stat_count,
                "suggestions": stat_suggestions,
            },
            "expert_quotes": {
                "present": has_quotes,
                "suggestion": quote_suggestion,
            },
            "overall_score": overall_score,
        }

    # ------------------------------------------------------------------
    # Entity optimization
    # ------------------------------------------------------------------

    def _analyze_entities(self, title: str, h1: str, content: str, topic: str) -> dict[str, Any]:
        all_text = f"{title} {h1} {content}"
        detected = self._extract_entities(all_text)

        detected_list: list[dict[str, str]] = []
        seen_entities: set[str] = set()
        for entity, etype in detected:
            el = entity.lower()
            if el not in seen_entities:
                seen_entities.add(el)
                count = all_text.lower().count(el)
                detected_list.append({"entity": entity, "type": etype, "count": count})

        topic_entities = self._infer_topic_entities(topic, content)
        missing: list[dict[str, str]] = []
        for entity, etype, reason in topic_entities:
            if entity.lower() not in seen_entities:
                missing.append({"entity": entity, "type": etype, "reason": reason})

        total_entities = len(detected_list) + len(missing)
        coverage = len(detected_list) / max(total_entities, 1)
        coverage_score = int(coverage * 100)

        suggested_paragraph = self._generate_entity_paragraph(topic, missing[:5])

        return {
            "detected": detected_list[:20],
            "missing": missing[:10],
            "suggested_paragraph": suggested_paragraph,
            "coverage_score": coverage_score,
        }

    def _infer_topic_entities(self, topic: str, content: str) -> list[tuple[str, str, str]]:
        entities: list[tuple[str, str, str]] = []
        topic_lower = topic.lower()

        if any(kw in topic_lower for kw in ["gtm", "revenue", "sales", "pipeline"]):
            entities.extend([
                ("Salesforce", "ORGANIZATION", "Major CRM competitor for comparison context"),
                ("HubSpot", "ORGANIZATION", "Leading marketing/sales platform for competitive positioning"),
                ("Clay", "ORGANIZATION", "Popular data enrichment tool used by target audience"),
                ("Marketo", "ORGANIZATION", "Enterprise marketing automation for integration context"),
                ("Gartner", "ORGANIZATION", "Authoritative research firm for credibility signals"),
                ("Forrester", "ORGANIZATION", "Leading analyst firm for market validation"),
                ("Chief Revenue Officer", "TITLE", "Target decision-maker persona"),
                ("RevOps", "CONCEPT", "Core methodology aligned with topic"),
                ("ABM", "CONCEPT", "Account-Based Marketing, related strategy"),
                ("Intent Data", "CONCEPT", "Key differentiating concept"),
            ])
        elif any(kw in topic_lower for kw in ["seo", "search", "marketing"]):
            entities.extend([
                ("Google Search Console", "PRODUCT", "Essential tool for SEO practitioners"),
                ("Ahrefs", "PRODUCT", "Leading SEO tool for competitive context"),
                ("SEMrush", "PRODUCT", "Major SEO platform for comparison"),
                ("Moz", "PRODUCT", "Established SEO authority"),
                ("PageSpeed Insights", "PRODUCT", "Google's performance tool"),
                ("Core Web Vitals", "CONCEPT", "Critical ranking factor"),
                ("Schema.org", "ORGANIZATION", "Structured data standard"),
            ])
        else:
            entities.extend([
                ("API", "CONCEPT", "Integration concept likely relevant"),
                ("Analytics", "CONCEPT", "Data-driven decision making"),
                ("Automation", "CONCEPT", "Core efficiency concept"),
                ("Integration", "CONCEPT", "Connectivity concept"),
            ])

        content_lower = content.lower() if content else ""
        filtered: list[tuple[str, str, str]] = []
        for e, etype, reason in entities:
            if e.lower() not in content_lower:
                filtered.append((e, etype, reason))
        return filtered

    def _generate_entity_paragraph(self, topic: str, missing_entities: list[dict[str, str]]) -> str:
        if not missing_entities:
            return ""
        names = [e["entity"] for e in missing_entities[:3]]
        others = len(missing_entities) - 3
        topic_lower = topic.lower()
        if any(kw in topic_lower for kw in ["gtm", "revenue", "sales"]):
            return (
                f"When evaluating {topic.lower()}, it is important to consider how it compares to established platforms "
                f"like {', '.join(names)}{' and others' if others > 0 else ''}. "
                f"Unlike traditional CRM and marketing tools that operate in silos, {topic.lower()} unifies the entire "
                f"go-to-market stack. Industry analysts at Gartner and Forrester have noted that the market is shifting "
                f"toward integrated GTM operating systems, with the category expected to grow significantly through 2026. "
                f"Organizations evaluating solutions should assess integration capabilities, AI maturity, and time-to-value "
                f"when comparing {topic.lower()} against these alternatives."
            )
        return (
            f"When considering {topic.lower()}, it is worth evaluating how it compares to solutions from "
            f"{', '.join(names)}{' and others' if others > 0 else ''}. "
            f"A comprehensive evaluation should include feature comparison, pricing models, integration capabilities, "
            f"and vendor support quality. Industry benchmarks and user reviews can provide valuable context for making "
            f"an informed decision about which solution best fits your specific requirements and budget."
        )

    # ------------------------------------------------------------------
    # AI Overview preview
    # ------------------------------------------------------------------

    def _generate_ai_overview(
        self, content: str, title: str, h1: str, topic: str, brand: str,
        paragraphs: list[str],
    ) -> dict[str, Any]:
        content_lower = content.lower() if content else ""
        sentences = self._split_sentences(content)

        factual = [s for s in sentences if re.search(r"\d+%", s) or re.search(r"\baccording to\b", s, re.IGNORECASE)]
        definition_sentence = ""
        for s in sentences[:5]:
            if re.search(r"\bis (?:a|an|the)\b", s, re.IGNORECASE):
                definition_sentence = s
                break

        if definition_sentence:
            current_answer = f"{definition_sentence} "
        elif sentences:
            current_answer = f"{sentences[0]} "
        else:
            current_answer = f"{title or topic} is a solution for businesses. "

        if factual:
            current_answer += factual[0]
        else:
            current_answer += f"It provides features and capabilities for teams looking to improve their operations."

        has_citation_signals = bool(re.search(r"\baccording to\b|\bresearch\b|\bstud(?:y|ies)\b", content_lower))
        citation_probability = 0.15
        if has_citation_signals:
            citation_probability += 0.20
        if re.search(r"\d+%", content):
            citation_probability += 0.15
        if re.search(r"\bfaq\b|\bfrequently asked\b", content_lower):
            citation_probability += 0.10
        if len(content) > 2000:
            citation_probability += 0.10
        citation_probability = min(0.92, citation_probability)

        topic_lower = topic.lower()
        if any(kw in topic_lower for kw in ["gtm", "revenue", "sales", "intelligence"]):
            optimized_answer = (
                f"{topic} is an AI-powered GTM operating system that unifies revenue operations across sales, marketing, and customer success. "
                f"According to industry research, organizations using unified GTM platforms see 25-35% improvement in pipeline growth and "
                f"15-25% better forecast accuracy. Key capabilities include AI-driven CRM enrichment, predictive lead scoring with buying intent signals, "
                f"real-time pipeline analytics, and automated workflow orchestration. Unlike point solutions such as Salesforce, HubSpot, or Clay, "
                f"{brand} provides a single platform that connects all revenue data sources and uses AI agents to automate repetitive tasks. "
                f"Teams can typically deploy {brand} within days rather than weeks, with measurable ROI within the first 90 days."
            )
        else:
            optimized_answer = (
                f"{topic} is a {self._category_for_topic(topic, content)} designed to help businesses streamline operations and improve efficiency. "
                f"Key features include data analytics, workflow automation, team collaboration tools, and integration with existing platforms. "
                f"According to industry benchmarks, organizations using {topic.lower()}-type solutions see 20-30% improvement in operational efficiency. "
                f"{brand} differentiates through ease of setup, comprehensive feature set, and dedicated customer support. "
                f"Teams can typically get started within days with guided onboarding and see measurable results within the first quarter."
            )

        return {
            "current_answer": current_answer[:500],
            "optimized_answer": optimized_answer[:600],
            "citation_probability": round(citation_probability, 2),
        }

    # ------------------------------------------------------------------
    # Readability rewrite
    # ------------------------------------------------------------------

    def _generate_readability_rewrite(
        self, content: str, paragraphs: list[str], topic: str, current_level: str,
    ) -> dict[str, Any]:
        optimized_paragraphs: list[str] = []
        for para in paragraphs[:10]:
            optimized_paragraphs.append(self._simplify_paragraph(para))

        optimized_preview = " ".join(optimized_paragraphs[:5])
        words = optimized_preview.split()
        optimized_level = self._flesch_kincaid_level(optimized_preview, words) if words else current_level

        return {
            "current_level": current_level,
            "optimized_level": optimized_level,
            "optimized_preview": optimized_preview[:800],
            "grade_score": self._compute_readability_score(optimized_preview, words) if words else 0,
        }

    def _simplify_paragraph(self, para: str) -> str:
        sentences = self._split_sentences(para)
        simplified: list[str] = []
        for sent in sentences:
            simplified.append(self._simplify_sentence(sent))
        return " ".join(simplified)

    # ------------------------------------------------------------------
    # Internal link suggestions
    # ------------------------------------------------------------------

    def _suggest_internal_links(
        self, content: str, topic: str, brand: str, page_type: str,
        all_pages: list[dict[str, Any]] | None,
    ) -> list[dict[str, str]]:
        suggestions: list[dict[str, str]] = []
        content_lower = content.lower() if content else ""

        if all_pages:
            for p in all_pages[:20]:
                p_url = p.get("url", "")
                p_title = p.get("title", "")
                p_type = (p.get("page_type") or "").upper()
                if not p_url:
                    continue
                p_words = set(re.findall(r"\b[a-z]{4,}\b", f"{p_title} {p.get('h1', '')}".lower()))
                p_words -= self.STOP_WORDS
                c_words = set(re.findall(r"\b[a-z]{4,}\b", content_lower))
                c_words -= self.STOP_WORDS
                overlap = p_words & c_words
                if len(overlap) >= 2 and p_type in ("BLOG", "DOCS", "PRODUCT", "LANDING"):
                    anchor = list(overlap)[:2]
                    anchor_text = " ".join(anchor)
                    suggestions.append({
                        "anchor_text": f"{anchor_text.title()} guide",
                        "destination": p_url,
                        "reason": f"Related content about {' and '.join(anchor)}",
                        "confidence": min(90, 60 + len(overlap) * 5),
                        "placement": "within body content",
                    })
                    if len(suggestions) >= 8:
                        break

        topic_lower = topic.lower()
        if any(kw in topic_lower for kw in ["gtm", "revenue", "sales", "intelligence"]):
            default_links = [
                {"anchor_text": "revenue intelligence platform", "destination": "/platform", "reason": "Product page for users wanting to learn more", "confidence": 85, "placement": "introduction paragraph"},
                {"anchor_text": "view pricing plans", "destination": "/pricing", "reason": "Conversion-oriented link for decision-stage readers", "confidence": 88, "placement": "mid-content or CTA section"},
                {"anchor_text": "see a live demo", "destination": "/demo", "reason": "High-intent CTA for engaged readers", "confidence": 90, "placement": "after key benefits section"},
                {"anchor_text": "AI GTM operating system", "destination": "/platform", "reason": "Core product positioning link", "confidence": 82, "placement": "first 200 words"},
            ]
        else:
            default_links = [
                {"anchor_text": f"learn more about {topic.lower()}", "destination": "/product", "reason": "Product information for interested readers", "confidence": 80, "placement": "within content"},
                {"anchor_text": "view pricing", "destination": "/pricing", "reason": "Conversion opportunity", "confidence": 85, "placement": "after benefits section"},
                {"anchor_text": "get started free", "destination": "/signup", "reason": "Low-friction conversion CTA", "confidence": 88, "placement": "conclusion or CTA section"},
            ]

        existing_urls = {s["destination"] for s in suggestions}
        for link in default_links:
            if link["destination"] not in existing_urls:
                suggestions.append(link)
                existing_urls.add(link["destination"])

        return suggestions[:10]

    # ------------------------------------------------------------------
    # Schema generation
    # ------------------------------------------------------------------

    def _generate_schema(
        self, title: str, h1: str, meta: str, url: str, topic: str,
        brand: str, page_type: str, faqs: list[dict[str, str]],
    ) -> dict[str, str]:
        safe_url = url or "https://example.com"
        safe_title = title or topic
        safe_desc = meta or f"Learn about {topic} with {brand}. Features, benefits, and pricing."

        faq_schema = ""
        if faqs:
            entities = []
            for faq in faqs:
                q_text = self._json_escape(faq.get("question", ""))
                a_text = self._json_escape(faq.get("answer", ""))
                entities.append(json.dumps({
                    "@type": "Question",
                    "name": q_text,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": a_text,
                    },
                }, ensure_ascii=False))
            faq_main = ",\n      ".join(entities)
            faq_schema = (
                '{\n'
                '  "@context": "https://schema.org",\n'
                '  "@type": "FAQPage",\n'
                '  "mainEntity": [\n'
                '    ' + faq_main + '\n'
                '  ]\n'
                '}'
            )

        article_schema = (
            '{\n'
            '  "@context": "https://schema.org",\n'
            '  "@type": "Article",\n'
            '  "headline": "' + self._json_escape(h1 or safe_title) + '",\n'
            '  "description": "' + self._json_escape(safe_desc) + '",\n'
            '  "author": {\n'
            '    "@type": "Organization",\n'
            '    "name": "' + self._json_escape(brand) + '"\n'
            '  },\n'
            '  "publisher": {\n'
            '    "@type": "Organization",\n'
            '    "name": "' + self._json_escape(brand) + '",\n'
            '    "logo": {\n'
            '      "@type": "ImageObject",\n'
            '      "url": "https://example.com/logo.png"\n'
            '    }\n'
            '  },\n'
            '  "url": "' + self._json_escape(safe_url) + '",\n'
            '  "datePublished": "' + self._current_year() + '-01-01",\n'
            '  "dateModified": "' + self._current_year() + '-01-01"\n'
            '}'
        )

        breadcrumb_schema = (
            '{\n'
            '  "@context": "https://schema.org",\n'
            '  "@type": "BreadcrumbList",\n'
            '  "itemListElement": [\n'
            '    {\n'
            '      "@type": "ListItem",\n'
            '      "position": 1,\n'
            '      "name": "Home",\n'
            '      "item": "https://example.com"\n'
            '    },\n'
            '    {\n'
            '      "@type": "ListItem",\n'
            '      "position": 2,\n'
            '      "name": "' + self._json_escape(topic[:50]) + '",\n'
            '      "item": "' + self._json_escape(safe_url) + '"\n'
            '    }\n'
            '  ]\n'
            '}'
        )

        org_schema = (
            '{\n'
            '  "@context": "https://schema.org",\n'
            '  "@type": "Organization",\n'
            '  "name": "' + self._json_escape(brand) + '",\n'
            '  "url": "https://example.com",\n'
            '  "logo": "https://example.com/logo.png",\n'
            '  "description": "' + self._json_escape(f'{brand} - {topic}') + '",\n'
            '  "sameAs": [\n'
            '    "https://twitter.com/' + brand.lower().replace(" ", "") + '",\n'
            '    "https://linkedin.com/company/' + brand.lower().replace(" ", "") + '"\n'
            '  ]\n'
            '}'
        )

        software_schema = (
            '{\n'
            '  "@context": "https://schema.org",\n'
            '  "@type": "SoftwareApplication",\n'
            '  "name": "' + self._json_escape(brand) + '",\n'
            '  "applicationCategory": "BusinessApplication",\n'
            '  "operatingSystem": "Web-based",\n'
            '  "description": "' + self._json_escape(safe_desc) + '",\n'
            '  "offers": {\n'
            '    "@type": "Offer",\n'
            '    "price": "0",\n'
            '    "priceCurrency": "USD",\n'
            '    "description": "Free trial available"\n'
            '  },\n'
            '  "aggregateRating": {\n'
            '    "@type": "AggregateRating",\n'
            '    "ratingValue": "4.8",\n'
            '    "ratingCount": "250"\n'
            '  }\n'
            '}'
        )

        return {
            "faq": faq_schema,
            "article": article_schema,
            "breadcrumb": breadcrumb_schema,
            "organization": org_schema,
            "software": software_schema,
        }

    def _json_escape(self, text: str) -> str:
        return text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ").replace("\r", "").strip()

    def _current_year(self) -> str:
        return "2025"

    # ------------------------------------------------------------------
    # Score predictions
    # ------------------------------------------------------------------

    def _predict_scores(
        self, content_score: int, readability_score: float, content: str,
        word_count: int, headings: list, page_type: str,
    ) -> dict[str, Any]:
        current_seo = content_score
        current_chatgpt = max(20, content_score - 10)
        current_gemini = max(25, content_score - 5)
        current_perplexity = max(15, content_score - 15)
        current_google_ai = max(20, content_score - 12)

        boost_seo = 0
        boost_chatgpt = 0
        boost_gemini = 0
        boost_perplexity = 0
        boost_google_ai = 0

        if word_count < self.IDEAL_WORDS.get(page_type, self.DEFAULT_IDEAL):
            boost_seo += 12
            boost_chatgpt += 8
            boost_gemini += 10
            boost_perplexity += 7
            boost_google_ai += 9

        stat_count = len(re.findall(r"\d+%", content)) if content else 0
        if stat_count < 3:
            boost_chatgpt += 8
            boost_perplexity += 10
            boost_google_ai += 6

        if content:
            faq_signal = re.search(r"\bfaq\b|\bfrequently asked\b", content, re.IGNORECASE)
            if not faq_signal:
                boost_chatgpt += 7
                boost_perplexity += 5
                boost_google_ai += 8

            ref_signal = re.search(r"\baccording to\b|\bresearch\b", content, re.IGNORECASE)
            if not ref_signal:
                boost_perplexity += 10
                boost_chatgpt += 6
                boost_gemini += 5

            cta_signal = re.search(r"\b(get started|sign up|try free|book a demo)\b", content, re.IGNORECASE)
            if not cta_signal:
                boost_seo += 3

        heading_count = len(headings) if isinstance(headings, list) else 0
        if heading_count < 3:
            boost_seo += 5
            boost_google_ai += 4

        after_seo = min(98, current_seo + boost_seo)
        after_chatgpt = min(97, current_chatgpt + boost_chatgpt)
        after_gemini = min(96, current_gemini + boost_gemini)
        after_perplexity = min(95, current_perplexity + boost_perplexity)
        after_google_ai = min(98, current_google_ai + boost_google_ai)

        return {
            "current": {
                "seo": max(0, current_seo),
                "chatgpt": max(0, current_chatgpt),
                "gemini": max(0, current_gemini),
                "perplexity": max(0, current_perplexity),
                "google_ai": max(0, current_google_ai),
            },
            "after_rewrite": {
                "seo": max(0, after_seo),
                "chatgpt": max(0, after_chatgpt),
                "gemini": max(0, after_gemini),
                "perplexity": max(0, after_perplexity),
                "google_ai": max(0, after_google_ai),
            },
        }

    # ------------------------------------------------------------------
    # Implementation plan
    # ------------------------------------------------------------------

    def _build_implementation(
        self, issues: list[dict[str, Any]], recommendations: list[dict[str, Any]],
        missing_sections: dict[str, Any], eeat: dict[str, Any],
    ) -> list[dict[str, Any]]:
        tasks: list[dict[str, Any]] = []

        critical = [i for i in issues if i.get("severity") == "critical"]
        high = [i for i in issues if i.get("severity") == "high"]
        medium = [i for i in issues if i.get("severity") == "medium"]

        for issue in critical:
            tasks.append({
                "task": f"Fix: {issue['issue']} — {issue['fix']}",
                "time": "10-30 min",
                "difficulty": "Easy",
                "owner": "SEO / Content",
                "impact": "critical",
                "confidence": 95,
            })

        for rec in recommendations[:5]:
            section = rec.get("section", "")
            tasks.append({
                "task": f"Rewrite {section}: {rec.get('after', '')[:80]}",
                "time": "30-60 min",
                "difficulty": "Medium",
                "owner": "Content",
                "impact": "high",
                "confidence": rec.get("confidence", 85),
            })

        if missing_sections.get("faq"):
            tasks.append({
                "task": f"Add FAQ section with {len(missing_sections['faq'])} questions and FAQPage schema",
                "time": "30-45 min",
                "difficulty": "Easy",
                "owner": "Content / SEO",
                "impact": "high",
                "confidence": 94,
            })

        if missing_sections.get("comparison_table"):
            tasks.append({
                "task": "Add comparison table with competitors",
                "time": "45-60 min",
                "difficulty": "Medium",
                "owner": "Content / Product Marketing",
                "impact": "high",
                "confidence": 90,
            })

        if missing_sections.get("glossary"):
            tasks.append({
                "task": f"Add glossary with {len(missing_sections['glossary'])} terms",
                "time": "20-30 min",
                "difficulty": "Easy",
                "owner": "Content",
                "impact": "medium",
                "confidence": 82,
            })

        for issue in high:
            tasks.append({
                "task": f"Fix: {issue['issue']}",
                "time": "30-60 min",
                "difficulty": "Medium",
                "owner": "Content / Developer",
                "impact": "high",
                "confidence": 88,
            })

        if not eeat.get("author", {}).get("present"):
            tasks.append({
                "task": "Add author bio with credentials and E-E-A-T signals",
                "time": "15-20 min",
                "difficulty": "Easy",
                "owner": "Content",
                "impact": "medium",
                "confidence": 85,
            })

        for issue in medium[:5]:
            tasks.append({
                "task": f"Fix: {issue['issue']}",
                "time": "1-2 hrs",
                "difficulty": "Medium",
                "owner": "Content / Marketing",
                "impact": "medium",
                "confidence": 78,
            })

        return tasks[:20]

    # ------------------------------------------------------------------
    # Before/after summary
    # ------------------------------------------------------------------

    def _build_before_after(
        self, title: str, h1: str, meta: str, content: str,
        paragraphs: list[str], rewrite_modes: dict[str, Any],
        missing_sections: dict[str, Any], topic: str, brand: str,
    ) -> list[dict[str, Any]]:
        ba: list[dict[str, Any]] = []

        seo_mode = rewrite_modes.get("seo", {})

        if title != seo_mode.get("title_rewrite"):
            ba.append({
                "section": "Title Tag",
                "current": title or "(missing)",
                "recommended": seo_mode.get("title_rewrite", title),
                "why_better": "Primary keyword placement, proper length, brand included, year tag for freshness",
                "copy_ready": True,
            })

        if meta != seo_mode.get("meta_rewrite"):
            ba.append({
                "section": "Meta Description",
                "current": meta or "(missing)",
                "recommended": seo_mode.get("meta_rewrite", meta),
                "why_better": "Keyword-rich, includes CTA, within SERP snippet length, compelling copy",
                "copy_ready": True,
            })

        if h1 != seo_mode.get("h1_rewrite"):
            ba.append({
                "section": "H1 Heading",
                "current": h1 or "(missing)",
                "recommended": seo_mode.get("h1_rewrite", h1),
                "why_better": "Aligned with title, natural keyword integration, clear value proposition",
                "copy_ready": True,
            })

        first_para = paragraphs[0] if paragraphs else ""
        intro_rewrite = seo_mode.get("intro_rewrite", "")
        if intro_rewrite and first_para != intro_rewrite:
            ba.append({
                "section": "Introduction",
                "current": first_para[:300] + ("..." if len(first_para) > 300 else ""),
                "recommended": intro_rewrite[:300],
                "why_better": "Leads with value proposition, keyword in first sentence, establishes relevance immediately",
                "copy_ready": True,
            })

        if missing_sections.get("faq"):
            faq_text = "\n\n".join(
                f"**Q: {faq['question']}**\nA: {faq['answer']}"
                for faq in missing_sections["faq"][:5]
            )
            ba.append({
                "section": "FAQ Section",
                "current": "(not present)",
                "recommended": faq_text,
                "why_better": "FAQs directly feed AI Overviews and ChatGPT answers. FAQPage schema enables AI answer extraction (GEO/AEO).",
                "copy_ready": True,
            })

        if missing_sections.get("comparison_table"):
            comp = missing_sections["comparison_table"]
            headers = " | ".join(comp.get("headers", []))
            rows = "\n".join(" | ".join(row) for row in comp.get("rows", []))
            table_text = f"{headers}\n{rows}"
            ba.append({
                "section": "Comparison Table",
                "current": "(not present)",
                "recommended": table_text,
                "why_better": "Comparison tables are heavily extracted by AI platforms for product recommendations and featured snippets",
                "copy_ready": True,
            })

        if missing_sections.get("lists"):
            for lst in missing_sections["lists"][:2]:
                items = "\n".join(f"- {item}" for item in lst.get("items", []))
                ba.append({
                    "section": f"List: {lst.get('title', 'Key Points')}",
                    "current": "(not present)",
                    "recommended": items,
                    "why_better": "Structured lists improve scannability and qualify for featured snippet list results",
                    "copy_ready": True,
                })

        if missing_sections.get("glossary"):
            terms = "\n".join(
                f"**{g['term']}**: {g['definition']}" for g in missing_sections["glossary"]
            )
            ba.append({
                "section": "Glossary",
                "current": "(not present)",
                "recommended": terms,
                "why_better": "Glossary terms are frequently extracted by AI platforms as definition snippets",
                "copy_ready": True,
            })

        return ba

    # ------------------------------------------------------------------
    # Utility: entity extraction
    # ------------------------------------------------------------------

    def _extract_entities(self, text: str) -> list[tuple[str, str]]:
        entities: list[tuple[str, str]] = []

        person_pattern = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b")
        for m in person_pattern.finditer(text):
            phrase = m.group(1)
            words_in = phrase.split()
            if not all(w.lower() in self.STOP_WORDS for w in words_in):
                entities.append((phrase, "PERSON_OR_ORG"))

        org_pattern = re.compile(
            r"\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*"
            r"(?:\s+(?:Inc|LLC|Corp|Ltd|Co|Group|Company|Foundation|Institute))\.?)\b"
        )
        for m in org_pattern.finditer(text):
            entities.append((m.group(1), "ORGANIZATION"))

        tech_pattern = re.compile(
            r"\b(Python|JavaScript|TypeScript|React|Vue|Angular|Docker|Kubernetes|"
            r"AWS|Azure|GCP|TensorFlow|PyTorch|Django|Flask|FastAPI|Node\.js|"
            r"PostgreSQL|MySQL|Redis|MongoDB|GraphQL|REST|API|SDK|SEO|Git|Linux)\b"
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
