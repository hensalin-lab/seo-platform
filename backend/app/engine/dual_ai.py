"""Quad AI Engine - 4 AI providers running in parallel, results merged.
OpenRouter GPT-4o + Groq Llama 3.3 70B + Cerebras Gemma 4 31B + Ollama Local LLM.
All run simultaneously, best insights from each are combined.
"""
import json
import asyncio
import logging
import httpx
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

PROVIDERS = {
    "gpt-4o": {"key": "OPENROUTER_API_KEY", "model": "OPENROUTER_MODEL"},
    "groq": {"key": "GROQ_API_KEY", "model": "GROQ_MODEL"},
    "cerebras": {"key": "CEREBRAS_API_KEY", "model": "CEREBRAS_MODEL"},
    "ollama": {"key": "OLLAMA_BASE_URL", "model": "OLLAMA_MODEL"},
}


async def _openrouter_chat(system_prompt: str, user_prompt: str, max_tokens: int = 2900) -> Optional[dict]:
    """Call OpenRouter GPT-4o."""
    if not settings.OPENROUTER_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=settings.OPENROUTER_TIMEOUT) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "AI SEO Platform",
                },
                json={
                    "model": settings.OPENROUTER_MODEL,
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    "temperature": 0.3, "max_tokens": max_tokens,
                },
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            cleaned = content.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.startswith("```"): cleaned = cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
    except Exception as e:
        logger.warning("OpenRouter: %s", e)
        return None


async def _groq_chat(system_prompt: str, user_prompt: str, max_tokens: int = 3500) -> Optional[dict]:
    """Call Groq Llama 3.3 70B."""
    if not settings.GROQ_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=settings.GROQ_TIMEOUT) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    "temperature": 0.3, "max_tokens": max_tokens,
                    "response_format": {"type": "json_object"},
                },
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            return json.loads(data["choices"][0]["message"]["content"])
    except Exception as e:
        logger.warning("Groq: %s", e)
        return None


async def _cerebras_chat(system_prompt: str, user_prompt: str, max_tokens: int = 3000) -> Optional[dict]:
    """Call Cerebras Gemma 4 31B - fastest inference in the world."""
    if not settings.CEREBRAS_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=settings.CEREBRAS_TIMEOUT) as client:
            resp = await client.post(
                "https://api.cerebras.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.CEREBRAS_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": settings.CEREBRAS_MODEL,
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    "temperature": 0.2, "max_completion_tokens": max_tokens,
                    "top_p": 1, "stream": False, "reasoning_effort": "medium",
                },
            )
            if resp.status_code != 200:
                logger.warning("Cerebras %s: %s", resp.status_code, resp.text[:200])
                return None
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            cleaned = content.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.startswith("```"): cleaned = cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
    except Exception as e:
        logger.warning("Cerebras: %s", e)
        return None


async def _ollama_chat(system_prompt: str, user_prompt: str, max_tokens: int = 2000) -> Optional[dict]:
    """Call Ollama local LLM."""
    if not settings.OLLAMA_BASE_URL:
        return None
    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": max_tokens},
                    "format": "json",
                },
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            content = data.get("message", {}).get("content", "")
            return json.loads(content) if content else None
    except Exception as e:
        logger.warning("Ollama: %s", e)
        return None


def _merge_results(results: list[dict]) -> dict:
    """Merge results from all providers - take best from each, combine unique insights."""
    valid = [r for r in results if isinstance(r, dict)]
    if not valid:
        return {}
    if len(valid) == 1:
        return valid[0]

    merged = {}
    all_keys = set()
    for r in valid:
        all_keys.update(r.keys())

    for key in all_keys:
        values = [r.get(key) for r in valid if r.get(key) is not None]
        if not values:
            continue
        if all(isinstance(v, list) for v in values):
            merged[key] = _merge_lists(values)
        elif all(isinstance(v, dict) for v in values):
            merged[key] = _merge_results(values)
        else:
            merged[key] = values[0]
    return merged


def _merge_lists(lists: list[list]) -> list:
    """Merge multiple lists, combining unique items."""
    if not lists:
        return []
    if len(lists) == 1:
        return lists[0]

    first = lists[0]
    if first and isinstance(first[0], str):
        seen = set()
        result = []
        for lst in lists:
            for item in lst:
                key = item.lower().strip()
                if key not in seen:
                    seen.add(key)
                    result.append(item)
        return result

    merged = list(first)
    existing_titles = set()
    for item in first:
        if isinstance(item, dict):
            title = item.get("element", item.get("title", item.get("issue", item.get("signal", item.get("action", ""))))).lower()
            if title:
                existing_titles.add(title)

    for lst in lists[1:]:
        for item in lst:
            if isinstance(item, dict):
                title = item.get("element", item.get("title", item.get("issue", item.get("signal", item.get("action", ""))))).lower()
                if title and title not in existing_titles:
                    existing_titles.add(title)
                    merged.append(item)
    return merged


async def _run_all(system_prompt: str, user_prompt: str, max_tokens: int = 3000) -> dict:
    """Run all 4 providers in parallel, merge results. Each has its own timeout."""
    task_map = {
        "gpt-4o": _openrouter_chat(system_prompt, user_prompt, min(max_tokens, 2900)),
        "groq-llama-3.3-70b": _groq_chat(system_prompt, user_prompt, min(max_tokens, 3500)),
        "cerebras-gemma-4-31b": _cerebras_chat(system_prompt, user_prompt, min(max_tokens, 3000)),
        "ollama-local": _ollama_chat(system_prompt, user_prompt, min(max_tokens, 2000)),
    }
    tasks = {name: asyncio.create_task(coro, name=name) for name, coro in task_map.items()}
    done, _ = await asyncio.wait(tasks.values(), timeout=30, return_when=asyncio.ALL_COMPLETED)
    results = {}
    for task in done:
        if task.cancelled():
            continue
        try:
            result = task.result()
        except Exception:
            continue
        if result and isinstance(result, dict):
            results[task.get_name()] = result

    merged = _merge_results(list(results.values())) if results else {}
    merged["providers_used"] = list(results.keys())
    return merged


# ============================================================
# PUBLIC FUNCTIONS - called by all endpoints
# ============================================================

async def quad_ai_analyze_seo(url, title, meta_desc, content, headings, signals):
    sys = """SEO expert analyst. Return JSON:
{"executive_summary":"...","google_likes":[{"element":"...","why":"..."}],"google_dislikes":[{"element":"...","why":"...","fix":"..."}],"content_recommendations":[{"title":"...","action":"...","priority":"high|medium|low"}],"technical_fixes":[{"issue":"...","fix":"...","code":"..."}],"keyword_strategy":{"primary_kw":"...","missing_kws":["..."],"suggestions":["..."]},"quick_wins":["..."],"long_term_strategy":["..."],"competitor_gap":["..."]}"""
    sigs = "\n".join([f"- [{s.get('status','?')}] {s.get('name','?')}: {s.get('what_wrong','OK')}" for s in (signals or [])[:50]])
    user = f"URL: {url}\nTitle: {title}\nMeta: {meta_desc}\nWords: {len(content.split())}\nSignals:\n{sigs}"
    return await _run_all(sys, user, 3000)


async def quad_ai_content_rewrite(url, title, meta_desc, content, target_keywords, issues):
    sys = """Content strategist and SEO copywriter. Return JSON:
{"rewrite_sections":[{"section":"...","current_text":"...","improved_text":"...","reason":"...","keyword_placement":"...","impact":"high|medium|low"}],"new_content_suggestions":[{"section":"...","content":"...","why":"..."}],"title_suggestions":["..."],"meta_description_suggestions":["..."],"faq_suggestions":[{"question":"...","answer":"..."}],"schema_suggestions":["..."],"internal_link_suggestions":["..."]}"""
    issues_text = "\n".join([f"- [{i.get('severity','?')}] {i.get('issue', i.get('signal_name','?'))}" for i in (issues or [])[:20]])
    user = f"URL: {url}\nTitle: {title}\nMeta: {meta_desc}\nWords: {len(content.split())}\nKeywords: {', '.join(target_keywords or [])}\nIssues:\n{issues_text}\nContent: {content[:2000]}"
    return await _run_all(sys, user, 3000)


async def quad_ai_search_optimization(url, title, content, signals):
    sys = """AI search optimization expert for ChatGPT, Perplexity, Gemini, Claude, Google AI Overview. Return JSON:
{"overall_ai_score":75,"platform_scores":{"chatgpt":{"score":70,"reasons":["..."],"fixes":["..."]},"perplexity":{"score":80,"reasons":["..."],"fixes":["..."]},"gemini":{"score":75,"reasons":["..."],"fixes":["..."]},"claude":{"score":85,"reasons":["..."],"fixes":["..."]},"google_ai_overview":{"score":70,"reasons":["..."],"fixes":["..."]}},"improvement_actions":[{"action":"...","platforms_affected":["..."],"priority":"high|medium|low"}],"citation_signals":{"has_statistics":true,"has_expert_quotes":false,"has_definitions":true},"content_gaps_for_ai":["..."],"entity_optimization":["..."]}"""
    sigs = "\n".join([f"- [{s.get('status','?')}] {s.get('category','?')}: {s.get('name','?')}" for s in (signals or [])[:50]])
    user = f"URL: {url}\nTitle: {title}\nWords: {len(content.split())}\nContent: {content[:2000]}\nSignals:\n{sigs}"
    return await _run_all(sys, user, 3000)


async def quad_ai_page_recommendations(page_data, signals, cat_scores):
    sys = """Senior SEO consultant. Provide code-level recommendations. Return JSON:
{"executive_summary":"...","critical_fixes":[{"issue":"...","what_wrong":"...","why_it_matters":"...","how_to_fix":"...","before_code":"...","after_code":"...","impact":"high|medium|low","effort":"low|medium|high"}],"content_improvements":[{"area":"...","current":"...","improved":"...","reason":"..."}],"technical_fixes":[{"issue":"...","fix":"...","code_example":"..."}],"seo_score_prediction":{"current":0,"after_fixes":0},"priority_ranking":["Most important fixes in order"]}"""
    failing = [s for s in (signals or []) if s.get("status") in ("fail", "warn")]
    sig_text = "\n".join([f"- [{s.get('status')}] {s.get('name','?')}: {s.get('what_wrong','')}" for s in failing[:40]])
    user = f"Page: {page_data.get('url','?')}\nTitle: {page_data.get('title','?')}\nWords: {page_data.get('word_count',0)}\nScore: {page_data.get('overall_score','N/A')}\nCategories: {json.dumps({k:round(v) for k,v in (cat_scores or {}).items() if v < 100})}\nFailing:\n{sig_text}"
    return await _run_all(sys, user, 3000)


async def quad_ai_eeat_analysis(content, url, title):
    sys = """E-E-A-T expert. Analyze Experience, Expertise, Authoritativeness, Trustworthiness. Return JSON:
{"overall_eeat":62,"experience_score":60,"expertise_score":70,"authoritativeness_score":55,"trustworthiness_score":65,"strengths":["..."],"weaknesses":["..."],"missing_signals":[{"signal":"...","why":"...","how_to_add":"..."}],"author_analysis":{"author_mentioned":true,"credentials_shown":false},"source_analysis":{"external_sources_cited":2,"academic_sources":0},"trust_signals":{"contact_info":false,"privacy_policy":false,"about_page":false}}"""
    user = f"URL: {url}\nTitle: {title}\nContent: {content[:3000]}"
    return await _run_all(sys, user, 3000)


async def quad_ai_entity_extraction(content, url):
    sys = """Entity extraction expert. Return JSON:
{"entities":[{"name":"...","type":"Person|Organization|Product|Location|Concept","relevance":"high|medium|low"}],"topics":["..."],"knowledge_graph_signals":{"brand_mentioned":true,"industry_terms":["..."]},"entity_gaps":["..."],"topic_authority_score":65,"recommended_entities":["..."]}"""
    user = f"URL: {url}\nContent: {content[:3000]}"
    return await _run_all(sys, user, 3000)


async def quad_ai_full_strategy(audit_data, pages, issues):
    sys = """SEO strategist for ranking #1. Return JSON:
{"strategy_name":"...","estimated_timeline":"3-6 months","steps":[{"step":1,"title":"...","description":"...","priority":"critical|high|medium","actions":["..."],"expected_impact":"...","effort":"low|medium|high","tools_needed":["..."]}],"content_strategy":{"topics":["..."]},"technical_strategy":{"priorities":["..."]},"ai_search_strategy":{"optimizations":["..."]},"kpis":["..."]}"""
    critical = [i for i in (issues or []) if i.get("severity") in ("CRITICAL", "HIGH")]
    issues_text = "\n".join([f"- {i.get('category','?')}: {i.get('title', i.get('issue','?'))}" for i in critical[:20]])
    user = f"URL: {audit_data.get('url','?')}\nSEO: {audit_data.get('seo_score',0)}\nTech: {audit_data.get('technical_score',0)}\nAEO: {audit_data.get('aeo_score',0)}\nGEO: {audit_data.get('geo_score',0)}\nPages: {len(pages)}\nIssues:\n{issues_text}"
    return await _run_all(sys, user, 3000)


async def quad_ai_link_suggestions(url, content, pages):
    sys = """Internal linking expert. Suggest 5-10 internal links. Return JSON array:
[{"anchor_text":"...","suggested_url":"...","context_sentence":"...","reason":"..."}]"""
    pages_list = "\n".join([f"- {p.get('url','?')}" for p in (pages or [])[:50]])
    user = f"Page: {url}\nContent: {content[:1500]}\nAvailable:\n{pages_list}"
    result = await _run_all(sys, user, 2500)
    return result.get("links", result.get("suggestions", [])) if isinstance(result, dict) else []


async def quad_ai_keyword_insights(url, title, content, existing_keywords):
    sys = """Keyword strategist. Return JSON:
{"primary_keyword":{"keyword":"...","in_title":true,"in_h1":false,"in_meta":true,"density":"1.2%"},"secondary_keywords":[{"keyword":"...","present":true}],"missing_keywords":[{"keyword":"...","importance":"high|medium|low","where_to_add":"..."}],"long_tail_opportunities":["..."],"semantic_keywords":["..."],"content_keyword_suggestions":["..."]}"""
    user = f"URL: {url}\nTitle: {title}\nContent: {content[:2000]}\nKeywords: {', '.join(existing_keywords or [])}"
    return await _run_all(sys, user, 3000)


async def quad_ai_readability_analysis(content):
    sys = """Readability expert. Return JSON:
{"readability_score":65,"reading_level":"Grade 8","grade_level":8,"issues":[{"type":"...","text":"...","suggestion":"..."}],"improved_versions":[{"original":"...","improved":"...","reason":"..."}],"vocabulary_suggestions":{"word":"alternative"},"structure_suggestions":["..."]}"""
    user = f"Content: {content[:3000]}"
    return await _run_all(sys, user, 3000)


async def quad_ai_schema_generation(url, title, content, page_type):
    sys = f"""Schema.org JSON-LD expert for {page_type}. Return JSON:
{{"schemas":[{{"type":"...","json_ld":{{...}},"rich_results_eligible":true,"implementation_code":"<script type='application/ld+json'>...</script>"}}],"missing_schemas":["..."],"validation_notes":["..."]}}"""
    user = f"URL: {url}\nTitle: {title}\nType: {page_type}\nContent: {content[:2000]}"
    return await _run_all(sys, user, 3000)


# Alias for backward compatibility
dual_ai_analyze_seo = quad_ai_analyze_seo
dual_ai_content_rewrite = quad_ai_content_rewrite
dual_ai_search_optimization = quad_ai_search_optimization
dual_ai_page_recommendations = quad_ai_page_recommendations
dual_ai_eeat_analysis = quad_ai_eeat_analysis
dual_ai_entity_extraction = quad_ai_entity_extraction
dual_ai_full_strategy = quad_ai_full_strategy
dual_ai_link_suggestions = quad_ai_link_suggestions
dual_ai_keyword_insights = quad_ai_keyword_insights
dual_ai_readability_analysis = quad_ai_readability_analysis
dual_ai_schema_generation = quad_ai_schema_generation
