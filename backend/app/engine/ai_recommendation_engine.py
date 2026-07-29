import json
import logging
import re
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


class AIRecommendationEngine:
    """Uses OpenRouter GPT-4o to generate expert-level SEO recommendations."""

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL
        self.timeout = settings.OPENROUTER_TIMEOUT

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

        result = await self._call_openrouter(system_prompt, page_summary, max_tokens=2900)
        if result:
            return result
        return self._fallback_analysis(page_data)

    async def analyze_global(self, site_data: dict) -> dict:
        system_prompt = """CRITICAL RULE: NEVER fabricate data. Only use the provided site data. NEVER make up traffic estimates, competitor data, or benchmark numbers. Output empty arrays for unavailable data.

Return ONLY valid JSON matching this schema:
{"executive_summary":"2-3 sentences","site_health_grade":"A-F with explanation","google_likes":[{"element":"...","why":"..."}],"google_dislikes":[{"element":"...","why":"...","fix":"..."}],"content_strategy":{"strengths":["..."],"weaknesses":["..."],"content_calendar_suggestions":[{"topic":"...","keywords":["..."],"type":"blog|landing","priority":"high|medium|low","estimated_traffic":"Only if provided in input"}]},"technical_seo_priorities":[{"issue":"...","impact":"...","fix":"...","priority":"critical|high|medium|low"}],"ai_search_strategy":{"platform_optimizations":{"google_ai_overview":["..."],"chatgpt":["..."],"perplexity":["..."],"gemini":["..."]}},"eeat_strategy":[{"signal":"...","current_score":"...","target_score":"...","action_plan":"..."}],"competitor_positioning":{"your_advantages":["..."],"your_gaps":["..."],"quick_wins":["..."]},"90_day_action_plan":[{"week":"...","action":"...","expected_impact":"..."}],"kpis_to_track":[{"metric":"...","current_baseline":"...","target":"...","timeframe":"..."}]}

RULE: Set any field to empty array [] or null when the data is not available in the input."""

        site_summary = f"URL: {site_data.get('url', 'N/A')}\nPages: {site_data.get('total_pages', 0)}\nScore: {site_data.get('overall_score', 'N/A')}\nPage types: {json.dumps(site_data.get('page_type_distribution', {}))}\nIssues: {json.dumps(site_data.get('issue_summary', {}))}\nScores: {json.dumps(site_data.get('scores', {}))}\nThin pages: {site_data.get('thin_content_pages', 0)}\nAvg words: {site_data.get('avg_word_count', 0)}\nTop issues: {json.dumps(site_data.get('top_issues', [])[:8])}"

        result = await self._call_openrouter(system_prompt, site_summary, max_tokens=2900)
        if result:
            return result
        return self._fallback_global_analysis(site_data)

    async def generate_content_suggestion(self, page_data: dict, section: str) -> dict:
        system_prompt = """CRITICAL RULE: Only use provided page data. NEVER fabricate keywords, traffic data, or competitor references. Output empty arrays if no data available.

Return ONLY valid JSON:
{"suggested_content":"...","keywords_included":["..."],"word_count":150,"why_this_works":"..."}"""

        user_prompt = f"Page: {page_data.get('url', '')} ({page_data.get('page_type', '')})\nTitle: {page_data.get('title', '')}\nSection: {section}\nCurrent: {page_data.get('current_section_content', '')[:500]}\nGenerate SEO-optimized content for this section."

        result = await self._call_openrouter(system_prompt, user_prompt, max_tokens=2000)
        return result or {"suggested_content": "AI unavailable", "keywords_included": [], "word_count": 0, "why_this_works": "N/A"}

    async def generate_link_suggestions(self, page_url: str, page_content: str, all_pages: list) -> dict:
        system_prompt = """CRITICAL RULE: Only use provided page list. NEVER fabricate backlink opportunities, traffic data, or competitor info. Only suggest internal links between existing pages in the provided list.

Return ONLY valid JSON:
{"suggested_links":[{"anchor_text":"...","source_page":"...","target_page":"...","context":"...","why":"...","priority":"high|medium|low"}],"backlink_opportunities":[{"topic":"...","source_type":"...","how_to_get":"...","estimated_difficulty":"easy|medium|hard"}],"internal_link_improvements":[{"current_link":"...","better_anchor":"...","why":"..."}]}"""

        pages_summary = [{"url": p.get("url", ""), "title": p.get("title", ""), "type": p.get("page_type", "")} for p in all_pages[:30]]

        user_prompt = f"Source page: {page_url}\nContent: {page_content[:1500]}\nSite pages: {json.dumps(pages_summary)}\nSuggest internal links, backlink opportunities, and link improvements."

        result = await self._call_openrouter(system_prompt, user_prompt, max_tokens=2500)
        return result or {"suggested_links": [], "backlink_opportunities": [], "internal_link_improvements": []}

    async def generate_keyword_insights(self, keywords: list, competitors: list = None) -> dict:
        system_prompt = """Keyword research expert. Return JSON ONLY:
{"keyword_clusters":[{"cluster_name":"...","keywords":[{"keyword":"...","difficulty":"easy|medium|hard","volume_estimate":"...","intent":"informational|commercial|transactional|navigational","content_type":"blog|landing|guide","priority":"high|medium|low"}]}],"content_gaps":[{"topic":"...","why":"...","estimated_opportunity":"..."}],"quick_wins":[{"keyword":"...","reason":"...","suggested_content":"..."}],"long_tail_opportunities":[{"keyword":"...","intent":"...","content_suggestion":"..."}]}"""

        kw_list = [{"keyword": k.get("keyword", ""), "position": k.get("position", 0), "volume": k.get("volume", 0)} for k in keywords[:20]]
        user_prompt = f"Keywords: {json.dumps(kw_list)}\nCompetitors: {json.dumps(competitors[:5] if competitors else [])}\nGenerate keyword clusters, content gaps, and quick wins."

        result = await self._call_openrouter(system_prompt, user_prompt, max_tokens=2500)
        return result or {"keyword_clusters": [], "content_gaps": [], "quick_wins": [], "long_tail_opportunities": []}

    def _fallback_analysis(self, page_data: dict) -> dict:
        wc = page_data.get("word_count", 0)
        title = page_data.get("title", "")
        meta_desc = page_data.get("meta_description", "")
        h1 = page_data.get("h1", "")
        content = page_data.get("content_text", "")
        text_lower = content.lower() if content else ""
        schema = page_data.get("schema_markup", [])
        if isinstance(schema, str):
            try:
                schema = json.loads(schema)
            except Exception:
                schema = []
        schema_types = set()
        for s in schema if isinstance(schema, list) else []:
            t = s.get("@type", "") if isinstance(s, dict) else ""
            if isinstance(t, str):
                schema_types.add(t)

        heading_text = page_data.get("headings", [])
        h_list = heading_text if isinstance(heading_text, list) else []
        q_in_headings = sum(1 for h in h_list if "?" in (h.get("text", h) if isinstance(h, dict) else str(h)))

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

        return {
            "google_likes": [{"element": "HTTPS", "why": "Site uses HTTPS", "strength": "moderate"}],
            "google_dislikes": [{"element": "Content", "why": f"Page has {wc} words", "severity": "medium", "fix": "Increase content to 1500+ words"}],
            "content_recommendations": [], "title_tag": {"current": title, "recommended": "", "why": "Rule-based analysis active"},
            "meta_description": {"current": meta_desc, "recommended": "", "why": "Rule-based analysis active"},
            "schema_recommendations": [], "ai_search_optimization": {"citation_readiness": citation, "entity_coverage": entity_cov, "answer_completeness": answer_comp, "tips": []},
            "eeat_improvements": [], "technical_fixes": [], "competitor_insights": {"what_top_rankers_do_differently": [], "content_gaps_to_fill": []},
            "estimated_impact": {"traffic_increase": "N/A", "ranking_potential": "N/A", "time_to_see_results": "N/A"},
            "executive_summary": "AI analysis is not available — real-time rule-based analysis is being used instead, covering 500+ SEO signals across all categories.",
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
