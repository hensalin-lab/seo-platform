"""Quad AI Engine - 4 AI providers running in parallel, results merged.
OpenRouter GPT-4o + Groq Llama 3.3 70B + Cerebras Gemma 4 31B + Ollama Local LLM.
All run simultaneously, best insights from each are combined.
"""
import json
import time
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
    "openrouter-free": {"key": "OPENROUTER_API_KEY", "model": "OPENROUTER_MODEL_FREE"},
    "gemini": {"key": "GEMINI_API_KEY", "model": "GEMINI_MODEL"},
}

# Lightweight provider health registry (status_code / last known state / guidance)
PROVIDER_HEALTH = {}

_COOLDOWN_S = 900


def _record_health(name: str, ok: bool, detail: str = ""):
    if ok:
        PROVIDER_HEALTH[name] = {"status": "ok", "detail": "", "at": time.time()}
    else:
        PROVIDER_HEALTH[name] = {"status": "error", "detail": detail[:300], "at": time.time()}


def _provider_healthy(name: str, cooldown_s: int = _COOLDOWN_S) -> bool:
    h = PROVIDER_HEALTH.get(name, {})
    if h.get("status") == "ok":
        return True
    if h.get("status") == "error":
        at = h.get("at") or 0
        if time.time() - at < cooldown_s:
            return False
    return True


def _http_error_detail(name: str, status_code: int, body: str = ""):
    guidance = ""
    if status_code == 402:
        guidance = "Provider needs credits. Add funds or paste a fresh API key."
    elif status_code == 429:
        guidance = "Rate limit hit. Add a fresh free-tier key or wait for quota reset."
    elif status_code == 401:
        guidance = "Invalid API key. Paste a new key."
    _record_health(name, False, f"HTTP {status_code}: {body[:200]} {guidance}")


async def _openrouter_chat(system_prompt: str, user_prompt: str, max_tokens: int = 2900, model: str = None) -> Optional[dict]:
    """Call OpenRouter."""
    if not settings.OPENROUTER_API_KEY:
        _record_health("gpt-4o", False, "OPENROUTER_API_KEY not configured")
        return None
    model = model or settings.OPENROUTER_MODEL
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
                    "model": model,
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    "temperature": 0.3, "max_tokens": max_tokens,
                },
            )
            if resp.status_code != 200:
                _http_error_detail("gpt-4o", resp.status_code, resp.text)
                return None
            _record_health("gpt-4o", True)
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            cleaned = content.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.startswith("```"): cleaned = cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
    except Exception as e:
        logger.warning("OpenRouter: %s", e)
        _record_health("gpt-4o", False, str(e)[:200])
        return None


FREE_MODELS = [
    "inclusionai/ling-3.0-flash:free",
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
]


async def _openrouter_free_chat(system_prompt: str, user_prompt: str, max_tokens: int = 2000) -> Optional[dict]:
    """Call OpenRouter free models (Qwen/Llama, $0). Works for all users."""
    if not settings.OPENROUTER_API_KEY:
        _record_health("openrouter-free", False, "OPENROUTER_API_KEY not configured")
        return None
    models = [m.strip() for m in (settings.OPENROUTER_MODEL_FREE or "") if m.strip()] or FREE_MODELS
    if settings.OPENROUTER_MODEL_FREE:
        models = [settings.OPENROUTER_MODEL_FREE] + FREE_MODELS
    last_detail = ""
    for model in models[:2]:
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
                        "model": model,
                        "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                        "temperature": 0.3, "max_tokens": max_tokens,
                    },
                )
                if resp.status_code != 200:
                    last_detail = f"{model} HTTP {resp.status_code}"
                    continue
                _record_health("openrouter-free", True)
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                cleaned = content.strip()
                if cleaned.startswith("```json"): cleaned = cleaned[7:]
                if cleaned.startswith("```"): cleaned = cleaned[3:]
                if cleaned.endswith("```"): cleaned = cleaned[:-3]
                return json.loads(cleaned.strip())
        except Exception as e:
            logger.warning("OpenRouter free %s: %s", model, e)
            last_detail = str(e)[:150]
            continue
    _record_health("openrouter-free", False, last_detail or "all free models failed")
    return None


async def _groq_chat(system_prompt: str, user_prompt: str, max_tokens: int = 3500) -> Optional[dict]:
    """Call Groq Llama 3.3 70B."""
    if not settings.GROQ_API_KEY:
        _record_health("groq", False, "GROQ_API_KEY not configured")
        return None
    for attempt in range(2):
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
                if resp.status_code == 429 and attempt == 0:
                    await asyncio.sleep(2.0)
                    continue
                if resp.status_code != 200:
                    _http_error_detail("groq", resp.status_code, resp.text)
                    return None
                _record_health("groq", True)
                data = resp.json()
                return json.loads(data["choices"][0]["message"]["content"])
        except Exception as e:
            logger.warning("Groq: %s", e)
            _record_health("groq", False, str(e)[:200])
            return None
    return None


async def _cerebras_chat(system_prompt: str, user_prompt: str, max_tokens: int = 3000) -> Optional[dict]:
    """Call Cerebras Gemma 4 31B - fastest inference in the world."""
    if not settings.CEREBRAS_API_KEY:
        _record_health("cerebras", False, "CEREBRAS_API_KEY not configured")
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
                _http_error_detail("cerebras", resp.status_code, resp.text)
                return None
            _record_health("cerebras", True)
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
        _record_health("ollama", False, "OLLAMA_BASE_URL not configured")
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
                _http_error_detail("ollama", resp.status_code, resp.text)
                return None
            _record_health("ollama", True)
            data = resp.json()
            content = data.get("message", {}).get("content", "")
            return json.loads(content) if content else None
    except Exception as e:
        logger.warning("Ollama: %s", e)
        _record_health("ollama", False, str(e)[:200])
        return None


async def _gemini_chat(system_prompt: str, user_prompt: str, max_tokens: int = 3000) -> Optional[dict]:
    """Call Google Gemini 2.0 Flash (free tier)."""
    if not settings.GEMINI_API_KEY:
        _record_health("gemini", False, "GEMINI_API_KEY not configured")
        return None
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": min(max_tokens, 4096), "responseMimeType": "application/json"},
        }
        async with httpx.AsyncClient(timeout=settings.GEMINI_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                logger.warning("Gemini %s: %s", resp.status_code, resp.text[:300])
                _http_error_detail("gemini", resp.status_code, resp.text)
                return None
            _record_health("gemini", True)
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            cleaned = text.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.startswith("```"): cleaned = cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
    except Exception as e:
        logger.warning("Gemini: %s", e)
        _record_health("gemini", False, str(e)[:200])
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


async def _run_all(system_prompt: str, user_prompt: str, max_tokens: int = 3000, task: str = "default", timeout: float = 30.0) -> dict:
    """Run AI providers in parallel, merged. Task routes to the best model per job:
    - default    -> all 5 providers (GPT-4o via OpenRouter, Groq, Cerebras, Ollama, Gemini)
    - rewrite    -> Qwen 3 (OpenRouter) + Gemini + Groq  (best writing quality)
    - competitor -> DeepSeek V3 (OpenRouter) + Gemini + Groq  (strong reasoning)
    """
    task_map = {"gpt-4o": _openrouter_chat(system_prompt, user_prompt, min(max_tokens, 2900))}
    if task == "rewrite":
        task_map["gpt-4o"] = _openrouter_chat(system_prompt, user_prompt, min(max_tokens, 2900), settings.OPENROUTER_MODEL_REWRITE)
        task_map["groq-llama-3.3-70b"] = _groq_chat(system_prompt, user_prompt, min(max_tokens, 3500))
        task_map["cerebras-gemma-4-31b"] = _cerebras_chat(system_prompt, user_prompt, min(max_tokens, 3000))
        task_map["openrouter-free"] = _openrouter_free_chat(system_prompt, user_prompt, min(max_tokens, 2000))
        task_map["gemini"] = _gemini_chat(system_prompt, user_prompt, min(max_tokens, 3000))
    elif task == "competitor":
        task_map["gpt-4o"] = _openrouter_chat(system_prompt, user_prompt, min(max_tokens, 2900), settings.OPENROUTER_MODEL_COMPETITOR)
        task_map["groq-llama-3.3-70b"] = _groq_chat(system_prompt, user_prompt, min(max_tokens, 3500))
        task_map["cerebras-gemma-4-31b"] = _cerebras_chat(system_prompt, user_prompt, min(max_tokens, 3000))
        task_map["openrouter-free"] = _openrouter_free_chat(system_prompt, user_prompt, min(max_tokens, 2000))
        task_map["gemini"] = _gemini_chat(system_prompt, user_prompt, min(max_tokens, 3000))
    else:
        task_map.update({
            "groq-llama-3.3-70b": _groq_chat(system_prompt, user_prompt, min(max_tokens, 3500)),
            "cerebras-gemma-4-31b": _cerebras_chat(system_prompt, user_prompt, min(max_tokens, 3000)),
            "ollama-local": _ollama_chat(system_prompt, user_prompt, min(max_tokens, 2000)),
            "openrouter-free": _openrouter_free_chat(system_prompt, user_prompt, min(max_tokens, 2000)),
            "gemini": _gemini_chat(system_prompt, user_prompt, min(max_tokens, 3000)),
        })
    task_map = {
        name: coro for name, coro in task_map.items()
        if _provider_healthy(name)
    }
    if not task_map:
        return {"providers_used": []}
    tasks = {name: asyncio.create_task(coro, name=name) for name, coro in task_map.items()}
    done, _ = await asyncio.wait(tasks.values(), timeout=timeout, return_when=asyncio.ALL_COMPLETED)
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
    sys = """CRITICAL RULE: NEVER fabricate data. Use ONLY the provided signals and content. Only use provided URL, title, meta_desc. NEVER make up competitor data, traffic numbers, or ranking positions. Output empty arrays for unavailable data.

Return ONLY valid JSON:
{"executive_summary":"...","google_likes":[{"element":"...","why":"..."}],"google_dislikes":[{"element":"...","why":"...","fix":"..."}],"content_recommendations":[{"title":"...","action":"...","priority":"high|medium|low"}],"technical_fixes":[{"issue":"...","fix":"...","code":"..."}],"keyword_strategy":{"primary_kw":"...","missing_kws":["..."],"suggestions":["..."]},"quick_wins":["..."],"long_term_strategy":["..."],"competitor_gap":["..."]}

RULE: If signals are empty, only comment on what can be determined from content alone."""
    sigs = "\n".join([f"- [{s.get('status','?')}] {s.get('name','?')}: {s.get('what_wrong','OK')}" for s in (signals or [])[:50]])
    user = f"URL: {url}\nTitle: {title}\nMeta: {meta_desc}\nWords: {len(content.split())}\nSignals:\n{sigs}"
    return await _run_all(sys, user, 3000)


async def quad_ai_content_rewrite(url, title, meta_desc, content, target_keywords, issues):
    sys = """You are an expert SEO copywriter and content optimizer. Generate a COMPLETE content rewrite package.

Return this EXACT JSON structure:
{
  "title_suggestions": ["Better Title 1 | Brand", "Title 2 with keyword | Brand"],
  "meta_description_suggestions": ["Compelling 150-char meta description with keyword..."],
  "h1_rewrite": {"before": "current H1", "after": "optimized H1 with primary keyword", "reason": "why this improves SEO"},
  "intro_rewrite": {"before": "current intro paragraph", "after": "AI-optimized intro paragraph that includes primary keyword naturally, answers search intent, and is citable by AI platforms", "improvements": ["+SEO keyword placement", "+AI citation readiness", "+Entity recognition"]},
  "rewrite_sections": [
    {"section": "Section Name", "current_text": "what's there now", "improved_text": "optimized version", "reason": "why this improves", "keyword_placement": "where keyword fits", "impact": "high|medium|low", "improvements": ["+12 SEO", "+8 AI Search"]}
  ],
  "new_content_suggestions": [
    {"section": "FAQ Section", "content": "Generated FAQ content with Q&A pairs", "why": "AI platforms extract FAQs into answers", "type": "faq|table|list|comparison|glossary|step|statistics"}
  ],
  "faq_suggestions": [{"question": "What is...?", "answer": "Definitive answer..."}],
  "comparison_table": {"headers": ["Feature", "Your Product", "Competitor"], "rows": [["Feature 1", "Yes", "No"]]},
  "schema_suggestions": ["JSON-LD schema string..."],
  "entity_suggestions": {"detected": ["Entity1", "Entity2"], "missing": ["Entity3"], "paragraph": "Suggested paragraph incorporating missing entities..."},
  "readability_rewrite": {"current_level": "Grade 12", "target_level": "Grade 8", "rewritten_intro": "Simplified version..."},
  "internal_link_suggestions": [{"anchor_text": "keyword", "destination": "/page", "reason": "contextual relevance"}],
  "ai_overview_optimization": {"current_answer": "what AI would say now", "optimized_answer": "what AI would say after rewrite", "citation_probability_current": 30, "citation_probability_optimized": 75},
  "score_predictions": {"seo_current": 0, "seo_after": 0, "ai_search_current": 0, "ai_search_after": 0, "readability_current": 0, "readability_after": 0}
}

CRITICAL RULES:
- Generate ACTUAL replacement content, not placeholders
- Every rewrite MUST include the original text and the improved version
- Generate 3-5 title suggestions, 3 meta descriptions, 5+ FAQ items
- Generate at least 3 paragraph rewrites with specific improvements
- Generate comparison tables if product/service page
- Generate entity optimization paragraph with missing entities
- Predict scores before and after
- Never return empty arrays - always generate real content"""

    h1 = ""
    headings = content[:500].split("\n")
    for h in headings:
        if h.strip() and len(h.strip()) < 100:
            h1 = h.strip()
            break

    first_300 = " ".join(content.split()[:300])
    issues_text = "\n".join([f"- [{i.get('severity','?')}] {i.get('issue', i.get('signal_name','?'))}" for i in (issues or [])[:15]])
    user = f"""URL: {url}
Title: {title}
H1: {h1}
Meta Description: {meta_desc}
Target Keywords: {', '.join(target_keywords or [])}
Word Count: {len(content.split())}

First 300 words of content:
{first_300}

Known Issues:
{issues_text}

Generate a complete content optimization package with actual before/after rewrites for every element."""
    return await _run_all(sys, user, 4000, task="rewrite")


async def quad_ai_search_optimization(url, title, content, signals):
    sys = """CRITICAL RULE: NEVER fabricate platform-specific scores. Score only what can be determined from the provided content and signals. NEVER make up competition data. Output lowest score (25) for unavailable signals.

Return ONLY valid JSON:
{"overall_ai_score":75,"platform_scores":{"chatgpt":{"score":70,"reasons":["..."],"fixes":["..."]},"perplexity":{"score":80,"reasons":["..."],"fixes":["..."]},"gemini":{"score":75,"reasons":["..."],"fixes":["..."]},"claude":{"score":85,"reasons":["..."],"fixes":["..."]},"google_ai_overview":{"score":70,"reasons":["..."],"fixes":["..."]}},"improvement_actions":[{"action":"...","platforms_affected":["..."],"priority":"high|medium|low"}],"citation_signals":{"has_statistics":true,"has_expert_quotes":false,"has_definitions":true},"content_gaps_for_ai":["..."],"entity_optimization":["..."]}"""
    sigs = "\n".join([f"- [{s.get('status','?')}] {s.get('category','?')}: {s.get('name','?')}" for s in (signals or [])[:50]])
    user = f"URL: {url}\nTitle: {title}\nWords: {len(content.split())}\nContent: {content[:2000]}\nSignals:\n{sigs}"
    return await _run_all(sys, user, 3000)


async def quad_ai_page_recommendations(page_data, signals, cat_scores):
    sys = """CRITICAL RULE: NEVER fabricate data. Use ONLY the provided page_data and signals. Only generate fixes for issues with real data in the input. NEVER make up scores, competitor data, or traffic estimates. Output empty arrays for unavailable data.

Return ONLY valid JSON:
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
    return await _run_all(sys, user, 3000, task="competitor")


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
