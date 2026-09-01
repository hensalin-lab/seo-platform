import json
import logging
import re
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


class AIRecommendationEngine:
    """Uses OpenRouter GPT-4o with multi-provider fallback (free Gemini/CF/OpenRouter-free models) for SEO recommendations."""

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL
        self.timeout = settings.OPENROUTER_TIMEOUT

    async def _call_any_provider(self, system_prompt: str, user_prompt: str, max_tokens: int = 2900) -> dict | None:
        result = await self._call_openrouter(system_prompt, user_prompt, max_tokens)
        if result:
            return result
        try:
            from app.engine.dual_ai import _run_all
            merged = await _run_all(system_prompt, user_prompt, max_tokens=min(max_tokens, 2900), wait_for_local=False, timeout=25.0)
            merged.pop("providers_used", None)
            return merged or None
        except Exception as e:
            logger.warning("Multi-provider fallback failed: %s", e)
            return None

    async def _call_openrouter(self, system_prompt: str, user_prompt: str, max_tokens: int = 2900) -> dict | None:
        if not self.api_key:
            return None
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:5173",
                        "X-Title": "AI SEO Intelligence Platform",
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.3,
                        "max_tokens": max_tokens,
                    },
                )
                if resp.status_code != 200:
                    logger.error("OpenRouter %s: %s", resp.status_code, resp.text[:200])
                    return None
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                cleaned = content.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                return json.loads(cleaned.strip())
        except Exception as e:
            logger.error("OpenRouter call failed: %s", e)
            return None

    async def analyze_page(self, page_data: dict, audit_data: dict = None) -> dict:
        system_prompt = """CRITICAL RULE: NEVER fabricate data. Only use the provided page data. If data is missing, output empty arrays/null. NEVER make up competitor data, traffic estimates, or ranking positions.

Return ONLY valid JSON exactly matching this schema:
{"google_likes":[{"element":"...","why":"...","strength":"strong|moderate|weak"}],"google_dislikes":[{"element":"...","why":"...","severity":"critical|high|medium|low","fix":"..."}],"content_recommendations":[{"section":"...","current":"...","recommended":"...","reason":"...","priority":"high|medium|low"}],"title_tag":{"current":"...","recommended":"...","why":"..."},"meta_description":{"current":"...","recommended":"...","why":"..."},"schema_recommendations":[{"type":"...","why":"..."}],"ai_search_optimization":{"citation_readiness":"score/100","entity_coverage":"score/100","answer_completeness":"score/100","tips":["..."]},"eeat_improvements":[{"signal":"...","current_state":"...","recommended_action":"...","impact":"high|medium|low"}],"technical_fixes":[{"issue":"...","current":"...","recommended":"...","priority":"critical|high|medium|low"}],"competitor_insights":{"what_top_rankers_do_differently":["..."],"content_gaps_to_fill":["..."]},"estimated_impact":{"traffic_increase":"Available only if provided","ranking_potential":"Available only if provided","time_to_see_results":"Available only if provided"},"executive_summary":"2-3 sentence summary"}

RULE: Set any field to empty array [] or null or "Not available from provided data" when the data is not in the input."""

        page_summary = f"URL: {page_data.get('url', 'N/A')}\nTitle: {page_data.get('title', 'N/A')}\nMeta: {page_data.get('meta_description', 'N/A')}\nH1: {page_data.get('h1', 'N/A')}\nWords: {page_data.get('word_count', 0)}\nType: {page_data.get('page_type', 'UNKNOWN')}\nImages: {page_data.get('image_count', 0)} ({page_data.get('images_without_alt', 0)} missing alt)\nLinks: {page_data.get('internal_link_count', 0)} internal, {page_data.get('external_link_count', 0)} external\nSchema: {json.dumps(page_data.get('schema_types', []))}\nHeadings: {json.dumps(page_data.get('headings', [])[:10])}\nContent preview: {page_data.get('content_text', '')[:1500]}"

        if audit_data:
            page_summary += f"\nSEO Scores: {json.dumps(audit_data.get('scores', {}))}"

        result = await self._call_any_provider(system_prompt, page_summary, max_tokens=2900)
        return self._overlay(result, self._fallback_analysis(page_data))

    @staticmethod
    def _overlay(ai: dict | None, base: dict) -> dict:
        if not ai:
            return base
        merged = dict(base)
        for k, v in ai.items():
            if v is None or v == "" or v == [] or v == {}:
                continue
            if isinstance(v, list) and isinstance(merged.get(k), list):
                seen = {json.dumps(x, sort_keys=True, default=str) for x in merged[k]}
                merged[k] = merged[k] + [x for x in v if json.dumps(x, sort_keys=True, default=str) not in seen]
            elif isinstance(v, dict) and isinstance(merged.get(k), dict):
                m = dict(merged[k])
                for ik, iv in v.items():
                    if iv not in (None, "", [], {}):
                        m[ik] = iv
                merged[k] = m
            else:
                merged[k] = v
        return merged

    async def analyze_global(self, site_data: dict) -> dict:
        system_prompt = """CRITICAL RULE: NEVER fabricate data. Only use the provided site data. NEVER make up traffic estimates, competitor data, or benchmark numbers. Output empty arrays for unavailable data.

Return ONLY valid JSON matching this schema:
{"executive_summary":"2-3 sentences","site_health_grade":"A-F with explanation","google_likes":[{"element":"...","why":"..."}],"google_dislikes":[{"element":"...","why":"...","fix":"..."}],"content_strategy":{"strengths":["..."],"weaknesses":["..."],"content_calendar_suggestions":[{"topic":"...","keywords":["..."],"type":"blog|landing","priority":"high|medium|low","estimated_traffic":"Only if provided in input"}]},"technical_seo_priorities":[{"issue":"...","impact":"...","fix":"...","priority":"critical|high|medium|low"}],"ai_search_strategy":{"platform_optimizations":{"google_ai_overview":["..."],"chatgpt":["..."],"perplexity":["..."],"gemini":["..."]}},"eeat_strategy":[{"signal":"...","current_score":"...","target_score":"...","action_plan":"..."}],"competitor_positioning":{"your_advantages":["..."],"your_gaps":["..."],"quick_wins":["..."]},"90_day_action_plan":[{"week":"...","action":"...","expected_impact":"..."}],"kpis_to_track":[{"metric":"...","current_baseline":"...","target":"...","timeframe":"..."}]}

RULE: Set any field to empty array [] or null when the data is not available in the input."""

        site_summary = f"URL: {site_data.get('url', 'N/A')}\nPages: {site_data.get('total_pages', 0)}\nScore: {site_data.get('overall_score', 'N/A')}\nPage types: {json.dumps(site_data.get('page_type_distribution', {}))}\nIssues: {json.dumps(site_data.get('issue_summary', {}))}\nScores: {json.dumps(site_data.get('scores', {}))}\nThin pages: {site_data.get('thin_content_pages', 0)}\nAvg words: {site_data.get('avg_word_count', 0)}\nTop issues: {json.dumps(site_data.get('top_issues', [])[:8])}"

        result = await self._call_any_provider(system_prompt, site_summary, max_tokens=2900)
        return self._overlay(result, self._fallback_global_analysis(site_data))

    async def generate_content_suggestion(self, page_data: dict, section: str) -> dict:
        system_prompt = """CRITICAL RULE: Only use provided page data. NEVER fabricate keywords, traffic data, or competitor references. Output empty arrays if no data available.

Return ONLY valid JSON:
{"suggested_content":"...","keywords_included":["..."],"word_count":150,"why_this_works":"..."}"""

        user_prompt = f"Page: {page_data.get('url', '')} ({page_data.get('page_type', '')})\nTitle: {page_data.get('title', '')}\nSection: {section}\nCurrent: {page_data.get('current_section_content', '')[:500]}\nGenerate SEO-optimized content for this section."

        result = await self._call_any_provider(system_prompt, user_prompt, max_tokens=2000)
        return result or {"suggested_content": "AI unavailable", "keywords_included": [], "word_count": 0, "why_this_works": "N/A"}

    async def generate_link_suggestions(self, page_url: str, page_content: str, all_pages: list) -> dict:
        system_prompt = """CRITICAL RULE: Only use provided page list. NEVER fabricate backlink opportunities, traffic data, or competitor info. Only suggest internal links between existing pages in the provided list.

Return ONLY valid JSON:
{"suggested_links":[{"anchor_text":"...","source_page":"...","target_page":"...","context":"...","why":"...","priority":"high|medium|low"}],"backlink_opportunities":[{"topic":"...","source_type":"...","how_to_get":"...","estimated_difficulty":"easy|medium|hard"}],"internal_link_improvements":[{"current_link":"...","better_anchor":"...","why":"..."}]}"""

        pages_summary = [{"url": p.get("url", ""), "title": p.get("title", ""), "type": p.get("page_type", "")} for p in all_pages[:30]]

        user_prompt = f"Source page: {page_url}\nContent: {page_content[:1500]}\nSite pages: {json.dumps(pages_summary)}\nSuggest internal links, backlink opportunities, and link improvements."

        result = await self._call_any_provider(system_prompt, user_prompt, max_tokens=2500)
        return result or {"suggested_links": [], "backlink_opportunities": [], "internal_link_improvements": []}

    async def generate_keyword_insights(self, keywords: list, competitors: list = None) -> dict:
        system_prompt = """Keyword research expert. Return JSON ONLY:
{"keyword_clusters":[{"cluster_name":"...","keywords":[{"keyword":"...","difficulty":"easy|medium|hard","volume_estimate":"...","intent":"informational|commercial|transactional|navigational","content_type":"blog|landing|guide","priority":"high|medium|low"}]}],"content_gaps":[{"topic":"...","why":"...","estimated_opportunity":"..."}],"quick_wins":[{"keyword":"...","reason":"...","suggested_content":"..."}],"long_tail_opportunities":[{"keyword":"...","intent":"...","content_suggestion":"..."}]}"""

        kw_list = [{"keyword": k.get("keyword", ""), "position": k.get("position", 0), "volume": k.get("volume", 0)} for k in keywords[:20]]
        user_prompt = f"Keywords: {json.dumps(kw_list)}\nCompetitors: {json.dumps(competitors[:5] if competitors else [])}\nGenerate keyword clusters, content gaps, and quick wins."

        result = await self._call_any_provider(system_prompt, user_prompt, max_tokens=2500)
        return result or {"keyword_clusters": [], "content_gaps": [], "quick_wins": [], "long_tail_opportunities": []}

    @staticmethod
    def _ensure_obj(val, default):
        if isinstance(val, str):
            try:
                parsed = json.loads(val)
                return parsed if isinstance(parsed, type(default)) else default
            except Exception:
                return default
        return val if isinstance(val, type(default)) else default

    def _fallback_analysis(self, page_data: dict) -> dict:
        wc = page_data.get("word_count", 0)
        title = page_data.get("title", "")
        meta_desc = page_data.get("meta_description", "")
        h1 = page_data.get("h1", "")
        content = page_data.get("content_text", "")
        text_lower = content.lower() if content else ""
        url = page_data.get("url", "")
        page_type = str(page_data.get("page_type", "")).lower()
        schema_types_raw = self._ensure_obj(page_data.get("schema_types", []), [])
        if isinstance(schema_types_raw, str):
            try:
                schema_types_raw = json.loads(schema_types_raw)
            except Exception:
                schema_types_raw = []
        schema_types = {str(t) for t in (schema_types_raw or [])}
        for s in page_data.get("schema_markup", []) if isinstance(page_data.get("schema_markup"), list) else []:
            t = s.get("@type", "") if isinstance(s, dict) else ""
            if isinstance(t, str):
                schema_types.add(t)

        headings_raw = page_data.get("headings", [])
        h_list = headings_raw if isinstance(headings_raw, list) else []
        h_texts = [str(h.get("text", h) if isinstance(h, dict) else h) for h in h_list]
        q_in_headings = sum(1 for h in h_texts if "?" in h)
        has_faq = any("faq" in st.lower() for st in schema_types)
        has_article = any(st.lower() in ("article", "blogposting", "newsarticle") for st in schema_types)
        sources = len(re.findall(r"(?:according to|study|research|survey|report)\s+(?:by|from|shows)", text_lower))
        stats = len(re.findall(r"\d+(?:\.\d+)?%", text_lower))
        entities = len(re.findall(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b", f"{title} {meta_desc} {content}"))
        defs = len(re.findall(r"(?:is\s+(?:a|an|the)\s+\w|refers?\s+to|defined?\s+as)", text_lower))
        howto = len(re.findall(r"(?:step\s+\d|first|second|third|finally|next|then)", text_lower))

        citation = min(sources * 20 + stats * 10 + 10 if entities > 0 else 0, 100)
        entity_cov = min(round(entities / 3), 100)
        answer_comp = min(q_in_headings * 15 + defs * 10 + howto * 8 + (15 if has_faq else 0), 100)

        topic = re.sub(r"[^\w\s]", "", (title or h1 or "").split("|")[0].split("-")[0].strip()) or "the topic"
        img_count = page_data.get("image_count", 0)
        imgs_no_alt = page_data.get("images_without_alt", 0)
        int_links = page_data.get("internal_link_count", 0)
        ext_links = page_data.get("external_link_count", 0)
        og = self._ensure_obj(page_data.get("open_graph"), {})
        top_issues = page_data.get("top_issues", []) or []
        is_utility = any(k in url.lower() for k in ("privacy", "terms", "cookie", "404", "login", "signup", "admin")) or page_type in ("utility", "legal")

        likes = [{"element": "HTTPS", "why": "Site uses HTTPS", "strength": "moderate"}]
        if schema_types:
            likes.append({"element": "Structured data", "why": f"Found {', '.join(sorted(schema_types))} schema", "strength": "strong"})
        if wc >= 800:
            likes.append({"element": "Content depth", "why": f"{wc} words of content", "strength": "strong"})
        if title and 30 <= len(title) <= 60:
            likes.append({"element": "Title tag", "why": f"Title length ({len(title)} chars) is within the ideal 30-60 range", "strength": "strong"})
        if meta_desc and 70 <= len(meta_desc) <= 160:
            likes.append({"element": "Meta description", "why": f"Meta description ({len(meta_desc)} chars) is within the ideal 70-160 range", "strength": "moderate"})
        if og.get("og:title") or og.get("title"):
            likes.append({"element": "Open Graph tags", "why": "Social sharing preview is configured", "strength": "weak"})
        if int_links >= 5:
            likes.append({"element": "Internal linking", "why": f"{int_links} internal links help crawlers and users navigate", "strength": "moderate"})

        dislikes = []
        dislike_fix = (
            f"Add more depth to '{topic}' with specific examples, data points, and expert insights"
            if wc < 800
            else f"Page has {wc} words — consider adding supporting content like FAQs, case studies, or detailed explanations for '{topic}'"
        )
        if not is_utility:
            if wc < 300:
                dislikes.append({"element": "Thin content", "why": f"Page has only {wc} words", "severity": "high", "fix": f"Expand '{topic}' to at least 600-800 words covering subtopics users search for"})
            elif wc < 800:
                dislikes.append({"element": "Limited depth", "why": f"Page has {wc} words", "severity": "medium", "fix": dislike_fix})
            if not title:
                dislikes.append({"element": "Missing title tag", "why": "No title found", "severity": "critical", "fix": f"Add a 50-60 char title like '{topic} | Your Brand'"})
            elif len(title) > 60:
                dislikes.append({"element": "Title too long", "why": f"{len(title)} chars — Google truncates around 60", "severity": "medium", "fix": f"Shorten to under 60 chars keeping '{topic.split()[0] if topic.split() else topic}' early in the title"})
            elif len(title) < 30:
                dislikes.append({"element": "Title too short", "why": f"Only {len(title)} chars — wasting ranking space", "severity": "medium", "fix": f"Expand with descriptive keywords, e.g. '{title} — Benefits, Features & Guide'"})
            if not meta_desc:
                dislikes.append({"element": "Missing meta description", "why": "Google will auto-generate a snippet", "severity": "medium", "fix": f"Write a 140-160 char summary of '{topic}' including your main keyword and a call to action"})
            elif len(meta_desc) < 70:
                dislikes.append({"element": "Meta description short", "why": f"{len(meta_desc)} chars — below the ~70 char minimum", "severity": "low", "fix": "Extend to 140-160 chars with a benefit and call to action"})
            if not h1:
                dislikes.append({"element": "Missing H1", "why": "No primary heading detected", "severity": "high", "fix": f"Add one H1 that states the page topic, similar to your title"})
            if imgs_no_alt > 0:
                dislikes.append({"element": "Images without alt text", "why": f"{imgs_no_alt} of {img_count} images lack alt attributes", "severity": "medium", "fix": f"Add descriptive alt text to {imgs_no_alt} images (5-15 words each describing the image)"})
            if int_links < 3:
                dislikes.append({"element": "Few internal links", "why": f"Only {int_links} internal links out", "severity": "medium", "fix": "Add 3-8 contextual internal links to related pages using descriptive anchor text"})
            if ext_links == 0:
                dislikes.append({"element": "No external citations", "why": "Zero outbound references to authoritative sources", "severity": "low", "fix": "Cite 1-3 authoritative external sources to support claims"})

        content_recs = []
        if not is_utility:
            if q_in_headings == 0:
                content_recs.append({"section": "Headings", "current": "No question-style headings", "recommended": "Add 1-3 H2/H3s phrased as questions people ask about " + topic, "reason": "Question headings win featured snippets and AI Overview citations", "priority": "high" if answer_comp < 50 else "medium"})
            if stats == 0:
                content_recs.append({"section": "Body content", "current": "No statistics or data points", "recommended": "Add concrete numbers: percentages, benchmarks, survey results", "reason": "Data-backed claims increase trust and citability", "priority": "medium"})
            if has_faq is False and wc > 400:
                content_recs.append({"section": "FAQ", "current": "No FAQ section", "recommended": "Append 3-5 FAQs with concise answers near the end", "reason": "FAQ blocks capture long-tail queries and PAA results", "priority": "medium"})
            if wc >= 800:
                content_recs.append({"section": "Readability", "current": f"{wc} words in long form", "recommended": "Break dense paragraphs into 2-4 sentence chunks; use bullet lists and a table of contents", "reason": "Improves dwell time and scannability on long pages", "priority": "low"})

        title_rec = {"current": title or "(missing)", "recommended": "", "why": ""}
        if not title:
            title_rec = {"current": "(missing)", "recommended": f"{topic.title()} | Complete Guide"[:60], "why": "Title tag is required for rankings and browser tabs"}
        elif len(title) > 60:
            trimmed = title[:57].rsplit(" ", 1)[0] + "..."
            title_rec = {"current": title, "recommended": trimmed, "why": f"Current title is {len(title)} chars and will be truncated in SERPs"}
        elif len(title) < 30:
            title_rec = {"current": title, "recommended": f"{title} — Benefits, Features & How It Works"[:60], "why": f"Only {len(title)} chars; you have room for more keywords"}

        meta_rec = {"current": meta_desc[:160] or "(missing)", "recommended": "", "why": ""}
        if not meta_desc:
            first_sent = re.split(r"(?<=[.!?])\s+", content.strip())[0][:140] if content.strip() else f"Learn about {topic}, how it works, and why it matters."
            meta_rec = {"current": "(missing)", "recommended": (first_sent + ("…" if len(first_sent) >= 140 else ""))[:160], "why": "Drafted from your page's opening line — review and add a call to action"}
        elif len(meta_desc) < 70:
            meta_rec = {"current": meta_desc, "recommended": f"{meta_desc} See how it works and get started today."[:160], "why": f"Extended to reach the 140-160 char sweet spot"}

        schema_recs = []
        lower_sts = {st.lower() for st in schema_types}
        if not schema_types:
            schema_recs.append({"type": "Organization + WebSite", "why": "No structured data found anywhere on this page — these two establish your brand entity in search"})
        if not has_article and any(k in page_type for k in ("blog", "article", "news")):
            schema_recs.append({"type": "Article", "why": "This looks like an article/blog page but lacks Article schema"})
        if not has_faq and (q_in_headings > 0 or "faq" in text_lower):
            schema_recs.append({"type": "FAQPage", "why": "Your page answers questions but doesn't mark them up as FAQ schema"})
        if "breadcrumbschema" not in lower_sts and "breadcrumblist" not in lower_sts and int_links >= 3:
            schema_recs.append({"type": "BreadcrumbList", "why": "Helps Google show your site hierarchy in results"})

        tips = []
        if citation < 60:
            tips.append(f"Cite named sources and add {max(0, 2 - sources)}+ research references to raise citation readiness")
        if entity_cov < 60:
            tips.append("Mention key entities (product names, places, organizations) explicitly by name")
        if answer_comp < 60:
            tips.append("Add a direct 40-60 word answer paragraph right under your main heading")

        eeat_improvements = []
        if sources == 0:
            eeat_improvements.append({"signal": "Source citations", "current_state": "No cited studies or reports detected", "recommended_action": "Reference 2-3 authoritative sources (link them inline) to back main claims", "impact": "high"})
        if stats == 0:
            eeat_improvements.append({"signal": "Original data", "current_state": "No statistics or figures on the page", "recommended_action": "Include at least one concrete stat or benchmark per major claim", "impact": "medium"})
        if entities < 3:
            eeat_improvements.append({"signal": "Entity clarity", "current_state": "Few recognized entities mentioned", "recommended_action": "Name your brand, location, and key product/service terms consistently", "impact": "medium"})

        technical_fixes = []
        sev_map = {"CRITICAL": "critical", "HIGH": "high", "MEDIUM": "medium", "LOW": "low"}
        for ti in top_issues[:5]:
            desc = ti.get("description", "") or ti.get("issue", "")
            if desc:
                technical_fixes.append({"issue": desc, "current": "Flagged by crawler audit", "recommended": f"Resolve: {desc}", "priority": sev_map.get(str(ti.get('severity', '')).upper(), "medium")})
        seen_fixes = {t["issue"].lower() for t in technical_fixes}
        if imgs_no_alt > 0 and "alt" not in " ".join(seen_fixes):
            technical_fixes.append({"issue": f"{imgs_no_alt} images missing alt text", "current": "Empty alt attributes", "recommended": "Add descriptive alt text to each image", "priority": "medium"})
        if not meta_desc and "meta description" not in " ".join(seen_fixes).lower():
            technical_fixes.append({"issue": "Meta description missing", "current": "No meta tag", "recommended": "Add a 140-160 char meta description", "priority": "high"})

        strengths_bits = [f"{wc} words"] if wc >= 800 else ([f"only {wc} words"] if not is_utility else [])
        summary_bits = []
        if likes:
            summary_bits.append(f"What works: {'; '.join(l['element'] for l in likes[1:4])}" if len(likes) > 1 else "Basics are in place")
        if dislikes:
            summary_bits.append(f"{len(dislikes)} issue(s) to fix: {'; '.join(d['element'].lower() for d in dislikes[:3])}")
        if is_utility:
            summary_bits.append("This is a utility/legal page — depth recommendations are intentionally relaxed")
        exec_summary = (f"Rule-based analysis of {url or 'this page'}" + (f" ({', '.join(strengths_bits)})" if strengths_bits else "") + ". " + ". ".join(summary_bits))[:400]

        return {
            "google_likes": likes,
            "google_dislikes": dislikes,
            "content_recommendations": content_recs,
            "title_tag": title_rec,
            "meta_description": meta_rec,
            "schema_recommendations": schema_recs,
            "ai_search_optimization": {"citation_readiness": citation, "entity_coverage": entity_cov, "answer_completeness": answer_comp, "tips": tips},
            "eeat_improvements": eeat_improvements,
            "technical_fixes": technical_fixes,
            "competitor_insights": {"what_top_rankers_do_differently": [], "content_gaps_to_fill": []},
            "estimated_impact": {"traffic_increase": "N/A", "ranking_potential": "N/A", "time_to_see_results": "N/A"},
            "executive_summary": exec_summary,
        }

    def _fallback_global_analysis(self, site_data: dict) -> dict:
        return {
            "executive_summary": "AI analysis is not available — real-time rule-based analysis is being used instead, covering 500+ SEO signals across all categories.",
            "site_health_grade": "N/A", "google_likes": [], "google_dislikes": [],
            "content_strategy": {"strengths": [], "weaknesses": [], "content_calendar_suggestions": []},
            "technical_seo_priorities": [], "ai_search_strategy": {"platform_optimizations": {}},
            "eeat_strategy": [], "competitor_positioning": {"your_advantages": [], "your_gaps": [], "quick_wins": []},
            "90_day_action_plan": [], "kpis_to_track": [],
        }
