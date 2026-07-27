"""
AI Readiness Engine
Analyzes page readiness for AI search platforms:
- ChatGPT, Gemini, Claude, Perplexity, Google AI Overview
- Per-platform readiness scores
- Missing citations, statistics, expert quotes, structured answers
- Featured snippet opportunities
"""
import re
import json
import logging

logger = logging.getLogger(__name__)


class AIReadinessEngine:
    def analyze_page(self, page):
        text = page.content_text or ""
        wc = page.word_count or 0
        schema = page.schema_markup or []
        headings = page.headings or []
        images = page.images or []
        links_ext = page.links_external or []

        result = {
            "url": page.url,
            "title": page.title or "",
            "scores": {},
            "platform_details": {},
            "featured_snippet_opportunities": [],
            "voice_search_opportunities": [],
            "missing_for_ai": {},
            "overall_readiness": 0,
        }

        signals = self._extract_signals(text, wc, headings, schema, images, links_ext)

        result["platform_details"]["chatgpt"] = self._score_chatgpt(signals, page)
        result["platform_details"]["gemini"] = self._score_gemini(signals, page)
        result["platform_details"]["claude"] = self._score_claude(signals, page)
        result["platform_details"]["perplexity"] = self._score_perplexity(signals, page)
        result["platform_details"]["google_ai_overview"] = self._score_ai_overview(signals, page)

        result["scores"] = {
            k: v["score"] for k, v in result["platform_details"].items()
        }

        result["featured_snippet_opportunities"] = self._find_snippet_opportunities(page, headings, text)
        result["voice_search_opportunities"] = self._find_voice_opportunities(page, text)

        result["missing_for_ai"] = self._identify_ai_gaps(signals, wc)

        total = sum(result["scores"].values())
        result["overall_readiness"] = round(total / max(len(result["scores"]), 1), 1)

        return result

    def _extract_signals(self, text, wc, headings, schema, images, links_ext):
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 20]

        lists = bool(re.search(r'(<ul|<ol|\n[-•*]|\n\d+\.)', text, re.IGNORECASE))

        tables = bool(re.search(r'<table|<tr|<td|\|.*\|', text, re.IGNORECASE))

        questions = re.findall(r'[^.!?]*\?', text)
        questions = [q.strip() for q in questions if len(q.strip()) > 10]

        definitions = re.findall(r'(?:is|are|refers to|means|defined as)\s+(?:a|an|the)?\s*[^.!?]+', text, re.IGNORECASE)

        has_statistics = bool(re.search(r'\d+%|\d+x|\$\d+|\d+ (?:million|billion|thousand)|according to|study shows|research indicates|data from', text, re.IGNORECASE))

        has_sources = bool(re.search(r'source:|according to|research by|study by|published in|journal of|harvard|stanford|mit|oxford|cambridge', text, re.IGNORECASE))

        has_author = any(s in text.lower() for s in ["author:", "written by:", "by ", "contributor:", "expert:"])

        has_citations = bool(re.search(r'\[\d+\]|\(\d{4}\)|et al\.|doi:|isbn:', text, re.IGNORECASE))

        has_expert_quotes = bool(re.search(r'["""].*?["""]|said:|stated:|according to|noted:|explained:', text))

        has_original_data = bool(re.search(r'(?:our|the) (?:research|study|analysis|data|survey|report) (?:found|shows|reveals|indicates)', text, re.IGNORECASE))

        has_structured_answers = len(sentences) > 0 and any(len(s.split()) <= 30 for s in sentences[:5])

        has_clear_definition = len(definitions) > 0

        word_count_avg = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)

        schema_types = [s.get("@type", "") for s in schema if isinstance(s, dict)]

        return {
            "word_count": wc,
            "sentence_count": len(sentences),
            "paragraph_count": len(paragraphs),
            "avg_sentence_length": word_count_avg,
            "has_lists": lists,
            "has_tables": tables,
            "question_count": len(questions),
            "questions": questions[:10],
            "definition_count": len(definitions),
            "definitions": [d.strip() for d in definitions[:5]],
            "has_statistics": has_statistics,
            "has_sources": has_sources,
            "has_author": has_author,
            "has_citations": has_citations,
            "has_expert_quotes": has_expert_quotes,
            "has_original_data": has_original_data,
            "has_structured_answers": has_structured_answers,
            "has_clear_definition": has_clear_definition,
            "schema_types": schema_types,
            "image_count": len(images),
            "external_link_count": len(links_ext),
            "heading_count": len(headings),
        }

    def _score_chatgpt(self, signals, page):
        score = 0
        reasons = []
        missing = []

        if signals["has_clear_definition"]:
            score += 15
        else:
            missing.append("Clear definition of main topic")

        if signals["has_statistics"]:
            score += 15
        else:
            missing.append("Statistics and data points")

        if signals["has_sources"]:
            score += 15
        else:
            missing.append("Source citations")

        if signals["has_expert_quotes"]:
            score += 10
        else:
            missing.append("Expert quotes or references")

        if signals["has_original_data"]:
            score += 10
            reasons.append("Original research/data present")
        else:
            missing.append("Original research or data")

        if signals["question_count"] >= 3:
            score += 10
            reasons.append("Questions addressed in content")
        else:
            missing.append("Questions answered directly")

        if signals["has_lists"]:
            score += 5
        else:
            missing.append("Bullet points or numbered lists")

        if signals["has_tables"]:
            score += 5
        else:
            missing.append("Comparison tables")

        if signals["word_count"] >= 1000:
            score += 10
            reasons.append(f"Comprehensive content ({signals['word_count']} words)")
        elif signals["word_count"] >= 500:
            score += 5
        else:
            missing.append("More comprehensive content (1000+ words)")

        if signals["has_author"]:
            score += 5
        else:
            missing.append("Author attribution")

        return {
            "score": min(100, score),
            "reasons": reasons,
            "missing": missing,
            "readiness": "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW",
        }

    def _score_gemini(self, signals, page):
        score = 0
        reasons = []
        missing = []

        if signals["has_clear_definition"]:
            score += 15
        else:
            missing.append("Clear, concise definition")

        if signals["has_statistics"]:
            score += 12
        else:
            missing.append("Statistics with sources")

        if signals["has_sources"]:
            score += 12
        else:
            missing.append("Named sources and citations")

        if signals["has_expert_quotes"]:
            score += 10
        else:
            missing.append("Expert quotes")

        if signals["has_citations"]:
            score += 10
            reasons.append("Academic/formal citations present")
        else:
            missing.append("Formal citations")

        if signals["has_structured_answers"]:
            score += 10
            reasons.append("Concise answer sentences present")
        else:
            missing.append("Short, direct answer sentences")

        if "FAQPage" in signals["schema_types"]:
            score += 10
            reasons.append("FAQPage schema detected")
        else:
            missing.append("FAQPage schema markup")

        if signals["question_count"] >= 3:
            score += 8
        else:
            missing.append("Questions answered in content")

        if signals["has_lists"]:
            score += 5
        else:
            missing.append("Structured lists")

        if signals["has_tables"]:
            score += 3
        else:
            missing.append("Data tables")

        return {
            "score": min(100, score),
            "reasons": reasons,
            "missing": missing,
            "readiness": "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW",
        }

    def _score_claude(self, signals, page):
        score = 0
        reasons = []
        missing = []

        if signals["has_clear_definition"]:
            score += 15
        else:
            missing.append("Clear topic definition")

        if signals["has_statistics"]:
            score += 12
        else:
            missing.append("Supporting statistics")

        if signals["has_sources"]:
            score += 12
        else:
            missing.append("Source attribution")

        if signals["has_expert_quotes"]:
            score += 10
        else:
            missing.append("Expert perspectives")

        if signals["has_original_data"]:
            score += 10
        else:
            missing.append("Original analysis or data")

        if signals["has_citations"]:
            score += 10
        else:
            missing.append("Reference citations")

        if signals["has_structured_answers"]:
            score += 10
        else:
            missing.append("Direct answer format")

        if signals["has_lists"]:
            score += 5
        else:
            missing.append("Structured lists")

        if signals["word_count"] >= 1200:
            score += 10
        elif signals["word_count"] >= 600:
            score += 5
        else:
            missing.append("More comprehensive content")

        if signals["has_author"]:
            score += 6
        else:
            missing.append("Author credentials")

        return {
            "score": min(100, score),
            "reasons": reasons,
            "missing": missing,
            "readiness": "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW",
        }

    def _score_perplexity(self, signals, page):
        score = 0
        reasons = []
        missing = []

        if signals["has_statistics"]:
            score += 15
            reasons.append("Statistics present")
        else:
            missing.append("Statistics and data")

        if signals["has_sources"]:
            score += 15
            reasons.append("Sources cited")
        else:
            missing.append("Named sources (critical for Perplexity)")

        if signals["has_citations"]:
            score += 12
            reasons.append("Formal citations")
        else:
            missing.append("Citation format (links, DOIs, etc.)")

        if signals["has_expert_quotes"]:
            score += 10
        else:
            missing.append("Expert quotes")

        if signals["has_original_data"]:
            score += 10
        else:
            missing.append("Original research")

        if signals["has_clear_definition"]:
            score += 10
        else:
            missing.append("Clear topic definition")

        if signals["has_structured_answers"]:
            score += 8
        else:
            missing.append("Direct answer sentences")

        if signals["question_count"] >= 3:
            score += 5
        else:
            missing.append("Questions addressed")

        if signals["external_link_count"] >= 3:
            score += 5
            reasons.append(f"{signals['external_link_count']} external references")
        else:
            missing.append("More external references (3+)")

        return {
            "score": min(100, score),
            "reasons": reasons,
            "missing": missing,
            "readiness": "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW",
        }

    def _score_ai_overview(self, signals, page):
        score = 0
        reasons = []
        missing = []

        if signals["has_clear_definition"]:
            score += 15
            reasons.append("Clear definition present")
        else:
            missing.append("Direct definition of topic (critical for AI Overview)")

        if signals["has_statistics"]:
            score += 12
        else:
            missing.append("Supporting statistics")

        if signals["has_sources"]:
            score += 12
        else:
            missing.append("Source attribution")

        if signals["has_structured_answers"]:
            score += 12
            reasons.append("Concise answer sentences")
        else:
            missing.append("Short, direct answers (30 words or less)")

        if signals["has_lists"]:
            score += 10
        else:
            missing.append("Structured lists for scannability")

        if signals["has_tables"]:
            score += 8
        else:
            missing.append("Comparison tables")

        if signals["question_count"] >= 3:
            score += 8
        else:
            missing.append("Questions answered directly")

        if "FAQPage" in signals["schema_types"]:
            score += 8
            reasons.append("FAQPage schema")
        else:
            missing.append("FAQPage schema for rich results")

        if signals["has_expert_quotes"]:
            score += 5
        else:
            missing.append("Expert references")

        if signals["has_author"]:
            score += 5
        else:
            missing.append("Author attribution for E-E-A-T")

        if signals["has_original_data"]:
            score += 5
        else:
            missing.append("Original data or research")

        return {
            "score": min(100, score),
            "reasons": reasons,
            "missing": missing,
            "readiness": "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW",
        }

    def _find_snippet_opportunities(self, page, headings, text):
        opportunities = []
        questions = re.findall(r'[^.!?]*\?', text)
        questions = [q.strip() for q in questions if 15 < len(q.strip()) < 200]

        for q in questions[:10]:
            q_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', q.lower()))
            sentences = re.split(r'[.!?]+', text)
            best_match = None
            best_score = 0
            for s in sentences:
                s_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', s.lower()))
                overlap = len(q_words & s_words)
                if overlap > best_score:
                    best_score = overlap
                    best_match = s.strip()

            if best_match and best_score >= 2:
                word_count = len(best_match.split())
                if word_count <= 60:
                    snippet_type = "Paragraph"
                elif best_match.strip().endswith(":"):
                    snippet_type = "List"
                else:
                    snippet_type = "Paragraph"

                opportunities.append({
                    "question": q,
                    "current_answer": best_match[:200],
                    "word_count": word_count,
                    "snippet_type": snippet_type,
                    "readiness": "READY" if word_count <= 60 else "NEEDS_TRIMMING",
                    "suggestion": f"{'Keep answer concise (40-60 words)' if word_count > 60 else 'Good length for featured snippet'}",
                })

        for h in headings:
            if h.get("level") == "H2":
                h_text = h.get("text", "")
                if "?" in h_text:
                    opportunities.append({
                        "question": h_text,
                        "current_answer": "Heading found but answer may need formatting",
                        "word_count": 0,
                        "snippet_type": "Heading + Answer",
                        "readiness": "NEEDS_ANSWER",
                        "suggestion": f"Add a direct 40-60 word answer immediately after '{h_text}' heading",
                    })

        return opportunities

    def _find_voice_opportunities(self, page, text):
        opportunities = []
        questions = re.findall(r'[^.!?]*\?', text)
        voice_friendly = ["how to", "what is", "what are", "why", "when", "where", "who", "which", "can", "does", "is", "should", "will"]

        for q in questions[:15]:
            q_lower = q.lower().strip()
            for starter in voice_friendly:
                if q_lower.startswith(starter):
                    opportunities.append({
                        "question": q.strip(),
                        "voice_type": starter.upper().replace(" ", "_"),
                        "answer_format": "Direct conversational answer (2-3 sentences)",
                        "priority": "HIGH" if starter in ("how to", "what is", "what are") else "MEDIUM",
                    })
                    break

        return opportunities[:10]

    def _identify_ai_gaps(self, signals, wc):
        gaps = {}

        if not signals["has_statistics"]:
            gaps["statistics"] = {
                "current": "No statistics found",
                "recommended": "Add 3-5 statistics with source citations",
                "impact": "HIGH — AI platforms heavily cite statistics",
            }

        if not signals["has_sources"]:
            gaps["sources"] = {
                "current": "No source citations",
                "recommended": "Cite 3-5 authoritative sources with links",
                "impact": "HIGH — Perplexity and AI Overview prioritize cited content",
            }

        if not signals["has_expert_quotes"]:
            gaps["expert_quotes"] = {
                "current": "No expert quotes",
                "recommended": "Include 1-2 quotes from recognized industry experts",
                "impact": "MEDIUM — Expert quotes increase citation likelihood",
            }

        if not signals["has_original_data"]:
            gaps["original_data"] = {
                "current": "No original research or data",
                "recommended": "Conduct or reference original research with unique findings",
                "impact": "HIGH — Original data is the most cited content type in AI responses",
            }

        if not signals["has_citations"]:
            gaps["citations"] = {
                "current": "No formal citations",
                "recommended": "Add reference links, DOIs, or publication details",
                "impact": "MEDIUM — Formal citations increase citation probability",
            }

        if not signals["has_structured_answers"]:
            gaps["structured_answers"] = {
                "current": "No concise answer sentences",
                "recommended": "Add direct 2-3 sentence answers to common questions",
                "impact": "HIGH — AI platforms extract concise answers directly",
            }

        if not signals["has_lists"]:
            gaps["lists"] = {
                "current": "No bullet points or numbered lists",
                "recommended": "Use lists for features, steps, comparisons, and FAQ",
                "impact": "MEDIUM — Lists are easily extracted by AI crawlers",
            }

        if not signals["has_tables"]:
            gaps["tables"] = {
                "current": "No comparison or data tables",
                "recommended": "Add comparison tables, feature matrices, or pricing tables",
                "impact": "MEDIUM — Tables provide structured data AI can parse",
            }

        if not signals["has_author"]:
            gaps["author"] = {
                "current": "No author attribution",
                "recommended": "Add author name, title, and credentials",
                "impact": "MEDIUM — Author signals increase content trustworthiness",
            }

        if wc < 1000:
            gaps["content_depth"] = {
                "current": f"{wc} words",
                "recommended": "1000+ words with comprehensive coverage",
                "impact": "MEDIUM — Deeper content is cited more frequently",
            }

        return gaps
