"""Quad AI Engine - 4 AI providers running in parallel, results merged.
OpenRouter GPT-4o + Groq Llama 3.3 70B + Cerebras Gemma 4 31B + Ollama Local LLM.
All run simultaneously, best insights from each are combined.
"""
import json
import re
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
    "lmstudio": {"key": "LMSTUDIO_BASE_URL", "model": "LMSTUDIO_MODEL"},
    "vllm": {"key": "VLLM_BASE_URL", "model": "VLLM_MODEL"},
    "llamacpp": {"key": "LLAMACPP_BASE_URL", "model": "LLAMACPP_MODEL"},
    "openrouter-free": {"key": "OPENROUTER_API_KEY", "model": "OPENROUTER_MODEL_FREE"},
    "gemini": {"key": "GEMINI_API_KEY", "model": "GEMINI_MODEL"},
    "cf-workers": {"key": "CLOUDFLARE_API_TOKEN", "model": "CLOUDFLARE_AI_MODEL"},
    "mistral": {"key": "MISTRAL_API_KEY", "model": "MISTRAL_MODEL"},
    "nvidia": {"key": "NVIDIA_API_KEY", "model": "NVIDIA_MODEL"},
    "huggingface": {"key": "HUGGINGFACE_API_KEY", "model": "HUGGINGFACE_MODEL"},
    "github-models": {"key": "GITHUB_TOKEN", "model": "GITHUB_MODEL"},
    "sambanova": {"key": "SAMBANOVA_API_KEY", "model": "SAMBANOVA_MODEL"},
}

# Lightweight provider health registry (status_code / last known state / guidance)
PROVIDER_HEALTH = {}

# Map _run_all task names to the provider names used in the health registry,
# so error cooldowns actually apply instead of dead providers being retried.
_HEALTH_NAME = {
    "groq-llama-3.3-70b": "groq",
    "cerebras-gemma-4-31b": "cerebras",
    "lmstudio-local": "lmstudio",
    "ollama-local": "ollama",
    "vllm-local": "vllm",
    "llamacpp-local": "llamacpp",
}

_COOLDOWN_S = 900

# Local providers are free/unlimited and often just slow (CPU inference).
# Never lock them out for the full cloud cooldown — retry them quickly.
_LOCAL_PROVIDERS = {"ollama", "lmstudio", "vllm", "llamacpp"}


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
        if name in _LOCAL_PROVIDERS:
            cooldown_s = min(cooldown_s, 30)
        if time.time() - at < cooldown_s:
            return False
    return True


def has_healthy_provider() -> bool:
    """True when live LLM work is worth attempting.

    Returns True if any provider is confirmed healthy, OR if providers haven't
    been tested yet. Returns False only when every tested provider is currently
    inside an error cooldown (all down / rate-limited) — callers should then use
    stored/rule data instead of wasting time racing dead providers.
    """
    if any(h.get("status") == "ok" for h in PROVIDER_HEALTH.values()):
        return True
    if not PROVIDER_HEALTH:
        return True
    in_cooldown = [h for h in PROVIDER_HEALTH.values()
                   if h.get("status") == "error" and time.time() - (h.get("at") or 0) < _COOLDOWN_S]
    return len(in_cooldown) < len(PROVIDER_HEALTH)


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
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "openai/gpt-oss-20b:free",
    "poolside/laguna-s-2.1:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "cohere/north-mini-code:free",
]

_DEPRECATED_FREE_ALIASES = {"openrouter/free", "inclusionai/ling-3.0-flash:free"}


async def _openrouter_free_chat(system_prompt: str, user_prompt: str, max_tokens: int = 2000) -> Optional[dict]:
    """Call OpenRouter free models (Gemma/Nemotron/GPT-OSS, $0). Works for all users."""
    if not settings.OPENROUTER_API_KEY:
        _record_health("openrouter-free", False, "OPENROUTER_API_KEY not configured")
        return None
    env_models = [m.strip() for m in (settings.OPENROUTER_MODEL_FREE or "").split(",") if m.strip()]
    env_models = [m for m in env_models if m not in _DEPRECATED_FREE_ALIASES]
    models = list(dict.fromkeys(env_models + FREE_MODELS))
    last_detail = ""
    for model in models[:5]:
        try:
            async with httpx.AsyncClient(timeout=min(settings.OPENROUTER_TIMEOUT, 40)) as client:
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
                    if resp.status_code in (429, 402, 401):
                        last_detail = f"{model} {resp.text[:120]}"
                    continue
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                cleaned = content.strip()
                if cleaned.startswith("```json"): cleaned = cleaned[7:]
                if cleaned.startswith("```"): cleaned = cleaned[3:]
                if cleaned.endswith("```"): cleaned = cleaned[:-3]
                try:
                    parsed = json.loads(cleaned.strip())
                except Exception:
                    last_detail = f"{model} returned non-JSON"
                    continue
                _record_health("openrouter-free", True)
                return parsed
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
    """Call Ollama local LLM (fast model so suggestions finish inside the grace window)."""
    if not settings.OLLAMA_BASE_URL:
        _record_health("ollama", False, "OLLAMA_BASE_URL not configured")
        return None
    model = settings.OLLAMA_MODEL_FAST or settings.OLLAMA_MODEL
    # Cap output so a CPU model can finish within the local grace window.
    num_predict = min(max_tokens or 2000, 2200)
    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    "stream": False,
                    "think": False,
                    "keep_alive": "30m",
                    "options": {"temperature": 0.3, "num_predict": num_predict},
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
    except (TimeoutError, httpx.TimeoutException) as e:
        logger.warning("Ollama busy (timed out after %ss): %s", settings.OLLAMA_TIMEOUT, e)
        _record_health("ollama", True)
        return None
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


async def _cf_workers_chat(system_prompt: str, user_prompt: str, max_tokens: int = 3000) -> Optional[dict]:
    """Call Cloudflare Workers AI (free always-on tier, ~10k neurons/day)."""
    if not settings.CLOUDFLARE_ACCOUNT_ID or not settings.CLOUDFLARE_API_TOKEN:
        _record_health("cf-workers", False, "CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not configured")
        return None
    cf_fallbacks = [
        "@cf/openai/gpt-oss-120b",
        "@cf/openai/gpt-oss-20b",
        "@cf/qwen/qwen2.5-coder-32b-instruct",
        "@cf/google/gemma-4-26b-a4b-it",
    ]
    cf_models = [settings.CLOUDFLARE_AI_MODEL] + [m for m in cf_fallbacks if m != settings.CLOUDFLARE_AI_MODEL]
    last_detail = ""
    for model in cf_models:
        try:
            url = f"https://api.cloudflare.com/client/v4/accounts/{settings.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions"
            async with httpx.AsyncClient(timeout=settings.CLOUDFLARE_AI_TIMEOUT) as client:
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {settings.CLOUDFLARE_API_TOKEN}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                        "temperature": 0.3, "max_tokens": max_tokens,
                    },
                )
                if resp.status_code != 200:
                    logger.warning("Cloudflare Workers AI %s %s: %s", resp.status_code, model, resp.text[:160])
                    _http_error_detail("cf-workers", resp.status_code, resp.text)
                    last_detail = f"{resp.status_code} {resp.text[:160]}"
                    continue
                _record_health("cf-workers", True)
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                cleaned = content.strip()
                if cleaned.startswith("```json"): cleaned = cleaned[7:]
                if cleaned.startswith("```"): cleaned = cleaned[3:]
                if cleaned.endswith("```"): cleaned = cleaned[:-3]
                return json.loads(cleaned.strip())
        except Exception as e:
            logger.warning("Cloudflare Workers AI: %s", e)
            _record_health("cf-workers", False, str(e)[:200])
            last_detail = str(e)[:200]
    if last_detail:
        _record_health("cf-workers", False, last_detail[:200])
    return None


async def _openai_compat_chat(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    *,
    base_url: str,
    api_key: str,
    model: str,
    health_name: str,
    timeout: float,
    extra_json: dict | None = None,
) -> Optional[dict]:
    """Generic OpenAI-compatible /chat/completions call shared by every provider."""
    if not api_key:
        _record_health(health_name, False, f"{health_name} API key not configured")
        return None
    url = f"{base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
        "temperature": 0.3,
        "max_tokens": max_tokens,
    }
    if extra_json:
        payload.update(extra_json)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json=payload)
            if resp.status_code != 200:
                _http_error_detail(health_name, resp.status_code, resp.text)
                return None
            _record_health(health_name, True)
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            cleaned = content.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.startswith("```"): cleaned = cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            try:
                return json.loads(cleaned.strip())
            except Exception:
                start, end = cleaned.find("{"), cleaned.rfind("}")
                if start != -1 and end > start:
                    return json.loads(cleaned[start:end + 1])
                raise
    except Exception as e:
        logger.warning("%s: %s", health_name, e)
        _record_health(health_name, False, str(e)[:200])
        return None


async def _mistral_chat(system_prompt: str, user_prompt: str, max_tokens: int = 2500) -> Optional[dict]:
    """Mistral La Plateforme - free Experiment tier ~1B tokens/mo."""
    return await _openai_compat_chat(
        system_prompt, user_prompt, max_tokens,
        base_url="https://api.mistral.ai/v1", api_key=settings.MISTRAL_API_KEY,
        model=settings.MISTRAL_MODEL, health_name="mistral", timeout=settings.MISTRAL_TIMEOUT,
    )


async def _nvidia_chat(system_prompt: str, user_prompt: str, max_tokens: int = 2500) -> Optional[dict]:
    """NVIDIA NIM build.nvidia.com - free eval credits, fast open models."""
    return await _openai_compat_chat(
        system_prompt, user_prompt, max_tokens,
        base_url="https://integrate.api.nvidia.com/v1", api_key=settings.NVIDIA_API_KEY,
        model=settings.NVIDIA_MODEL, health_name="nvidia", timeout=settings.NVIDIA_TIMEOUT,
    )


async def _huggingface_chat(system_prompt: str, user_prompt: str, max_tokens: int = 2500) -> Optional[dict]:
    """HuggingFace Inference router - free community tier ~300 req/hr."""
    return await _openai_compat_chat(
        system_prompt, user_prompt, max_tokens,
        base_url="https://router.huggingface.co/v1", api_key=settings.HUGGINGFACE_API_KEY,
        model=settings.HUGGINGFACE_MODEL, health_name="huggingface", timeout=settings.HUGGINGFACE_TIMEOUT,
    )


async def _github_chat(system_prompt: str, user_prompt: str, max_tokens: int = 2500) -> Optional[dict]:
    """GitHub Models - free via any GitHub PAT, GPT-4o/Llama/Phi."""
    return await _openai_compat_chat(
        system_prompt, user_prompt, max_tokens,
        base_url="https://models.inference.ai.azure.com/v1", api_key=settings.GITHUB_TOKEN,
        model=settings.GITHUB_MODEL, health_name="github-models", timeout=settings.GITHUB_TIMEOUT,
    )


async def _sambanova_chat(system_prompt: str, user_prompt: str, max_tokens: int = 2500) -> Optional[dict]:
    """SambaNova - trial credits, Llama 3.3 70B."""
    return await _openai_compat_chat(
        system_prompt, user_prompt, max_tokens,
        base_url="https://api.sambanova.ai/v1", api_key=settings.SAMBANOVA_API_KEY,
        model=settings.SAMBANOVA_MODEL, health_name="sambanova", timeout=settings.SAMBANOVA_TIMEOUT,
    )


async def _lmstudio_chat(system_prompt: str, user_prompt: str, max_tokens: int = 3000) -> Optional[dict]:
    """Call LM Studio local server (OpenAI-compatible, e.g. Qwen 3 32B)."""
    if not settings.LMSTUDIO_BASE_URL:
        _record_health("lmstudio", False, "LMSTUDIO_BASE_URL not configured")
        return None
    try:
        url = f"{settings.LMSTUDIO_BASE_URL.rstrip('/')}/chat/completions"
        async with httpx.AsyncClient(timeout=min(settings.LMSTUDIO_TIMEOUT, 45)) as client:
            resp = await client.post(
                url,
                json={
                    "model": settings.LMSTUDIO_MODEL,
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    "temperature": 0.3, "max_tokens": max_tokens,
                },
            )
            if resp.status_code != 200:
                logger.warning("LM Studio %s: %s", resp.status_code, resp.text[:200])
                _http_error_detail("lmstudio", resp.status_code, resp.text)
                return None
            _record_health("lmstudio", True)
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            cleaned = content.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.startswith("```"): cleaned = cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            try:
                return json.loads(cleaned.strip())
            except Exception:
                start, end = cleaned.find("{"), cleaned.rfind("}")
                if start != -1 and end > start:
                    return json.loads(cleaned[start:end + 1])
                raise
    except Exception as e:
        logger.warning("LM Studio: %s", e)
        _record_health("lmstudio", False, str(e)[:200])
        return None


async def _vllm_chat(system_prompt: str, user_prompt: str, max_tokens: int = 3000) -> Optional[dict]:
    """Call vLLM OpenAI-compatible server (e.g. `vllm serve <model> --port 8000`)."""
    if not settings.VLLM_BASE_URL or not settings.VLLM_MODEL:
        _record_health("vllm", False, "VLLM_BASE_URL / VLLM_MODEL not configured")
        return None
    try:
        url = f"{settings.VLLM_BASE_URL.rstrip('/')}/chat/completions"
        async with httpx.AsyncClient(timeout=min(settings.VLLM_TIMEOUT, 120)) as client:
            resp = await client.post(
                url,
                json={
                    "model": settings.VLLM_MODEL,
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    "temperature": 0.3, "max_tokens": max_tokens,
                },
            )
            if resp.status_code != 200:
                logger.warning("vLLM %s: %s", resp.status_code, resp.text[:200])
                _http_error_detail("vllm", resp.status_code, resp.text)
                return None
            _record_health("vllm", True)
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            cleaned = content.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.startswith("```"): cleaned = cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            try:
                return json.loads(cleaned.strip())
            except Exception:
                start, end = cleaned.find("{"), cleaned.rfind("}")
                if start != -1 and end > start:
                    return json.loads(cleaned[start:end + 1])
                raise
    except Exception as e:
        logger.warning("vLLM: %s", e)
        _record_health("vllm", False, str(e)[:200])
        return None


async def _llamacpp_chat(system_prompt: str, user_prompt: str, max_tokens: int = 3000) -> Optional[dict]:
    """Call llama.cpp server (OpenAI-compatible, e.g. `llama-server -m model.gguf --port 8080`)."""
    if not settings.LLAMACPP_BASE_URL:
        _record_health("llamacpp", False, "LLAMACPP_BASE_URL not configured")
        return None
    try:
        url = f"{settings.LLAMACPP_BASE_URL.rstrip('/')}/chat/completions"
        async with httpx.AsyncClient(timeout=min(settings.LLAMACPP_TIMEOUT, 120)) as client:
            resp = await client.post(
                url,
                json={
                    "model": settings.LLAMACPP_MODEL,
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    "temperature": 0.3, "max_tokens": max_tokens,
                },
            )
            if resp.status_code != 200:
                logger.warning("llama.cpp %s: %s", resp.status_code, resp.text[:200])
                _http_error_detail("llamacpp", resp.status_code, resp.text)
                return None
            _record_health("llamacpp", True)
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            cleaned = content.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.startswith("```"): cleaned = cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            try:
                return json.loads(cleaned.strip())
            except Exception:
                start, end = cleaned.find("{"), cleaned.rfind("}")
                if start != -1 and end > start:
                    return json.loads(cleaned[start:end + 1])
                raise
    except Exception as e:
        logger.warning("llama.cpp: %s", e)
        _record_health("llamacpp", False, str(e)[:200])
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


async def _run_all(system_prompt: str, user_prompt: str, max_tokens: int = 3000, task: str = "default", timeout: float = 30.0, wait_for_local: bool = True, local_grace: float = None, local_system_prompt: str = None, local_user_prompt: str = None) -> dict:
    """Run AI providers in parallel, merged. Task routes to the best model per job:
    - default    -> all providers (local Ollama/LM Studio/vLLM/llama.cpp + OpenRouter/Groq/Cerebras/Gemini/CF/Mistral/NVIDIA/HF/GitHub)
    - rewrite    -> Qwen 3 (OpenRouter) + Gemini + Groq  (best writing quality)
    - competitor -> DeepSeek V3 (OpenRouter) + Gemini + Groq  (strong reasoning)

    Returns as soon as the first provider answers; slow stragglers (e.g. local
    models on a laptop CPU) are cancelled so they never block the response.
    With wait_for_local=True the full `timeout` window is kept so the unlimited
    local providers (Ollama/LM Studio/vLLM/llama.cpp) can finish and contribute.
    Once a cloud provider answers the deadline tightens to ~6s UNLESS an alive
    local provider is working — then it gets `local_grace` extra seconds (default
    from LOCAL_GRACE_SECONDS) so its free/unlimited suggestions actually merge in.
    local_system_prompt/local_user_prompt: a COMPACT prompt used only for slow
    CPU local providers (Ollama) so they can finish inside the grace window.
    """
    if local_grace is None:
        local_grace = settings.LOCAL_GRACE_SECONDS
    if local_system_prompt and local_user_prompt:
        lsp, lup = local_system_prompt, local_user_prompt
    else:
        lsp, lup = system_prompt, user_prompt
    def _build():
        base = [
            ("gpt-4o", _openrouter_chat, (system_prompt, user_prompt, min(max_tokens, 2900))),
            ("groq-llama-3.3-70b", _groq_chat, (system_prompt, user_prompt, min(max_tokens, 3500))),
            ("cerebras-gemma-4-31b", _cerebras_chat, (system_prompt, user_prompt, min(max_tokens, 3000))),
            ("lmstudio-local", _lmstudio_chat, (system_prompt, user_prompt, min(max_tokens, 3000))),
            ("ollama-local", _ollama_chat, (lsp, lup, min(max_tokens, 2000))),
            ("vllm-local", _vllm_chat, (system_prompt, user_prompt, min(max_tokens, 2000))),
            ("llamacpp-local", _llamacpp_chat, (system_prompt, user_prompt, min(max_tokens, 2000))),
            ("openrouter-free", _openrouter_free_chat, (system_prompt, user_prompt, min(max_tokens, 2000))),
            ("gemini", _gemini_chat, (system_prompt, user_prompt, min(max_tokens, 3000))),
            ("cf-workers", _cf_workers_chat, (system_prompt, user_prompt, min(max_tokens, 3000))),
            ("mistral", _mistral_chat, (system_prompt, user_prompt, min(max_tokens, 2500))),
            ("nvidia", _nvidia_chat, (system_prompt, user_prompt, min(max_tokens, 2500))),
            ("huggingface", _huggingface_chat, (system_prompt, user_prompt, min(max_tokens, 2500))),
            ("github-models", _github_chat, (system_prompt, user_prompt, min(max_tokens, 2500))),
            ("sambanova", _sambanova_chat, (system_prompt, user_prompt, min(max_tokens, 2500))),
        ]
        if task == "rewrite":
            return [(n, f, a) for n, f, a in base if n != "gpt-4o"] + [
                ("gpt-4o", _openrouter_chat, (system_prompt, user_prompt, min(max_tokens, 2900), settings.OPENROUTER_MODEL_REWRITE)),
            ]
        if task == "competitor":
            return [(n, f, a) for n, f, a in base if n != "gpt-4o"] + [
                ("gpt-4o", _openrouter_chat, (system_prompt, user_prompt, min(max_tokens, 2900), settings.OPENROUTER_MODEL_COMPETITOR)),
            ]
        return base

    task_map = {}
    for name, fn, args in _build():
        if _provider_healthy(_HEALTH_NAME.get(name, name)):
            task_map[name] = fn(*args)
    if not task_map:
        return {"providers_used": []}

    tasks = {name: asyncio.create_task(coro, name=name) for name, coro in task_map.items()}
    deadline = time.monotonic() + timeout
    results = {}
    remaining = set(tasks.values())
    while remaining and time.monotonic() < deadline:
        done, remaining = await asyncio.wait(
            remaining, timeout=max(0.0, deadline - time.monotonic()), return_when=asyncio.FIRST_COMPLETED
        )
        for t in done:
            if t.cancelled():
                continue
            try:
                result = t.result()
            except Exception:
                continue
            if result and isinstance(result, dict):
                results[t.get_name()] = result
        if results and not wait_for_local and deadline - time.monotonic() > 6.0:
            deadline = time.monotonic() + 6.0
        elif wait_for_local and results:
            local_names = {"lmstudio-local", "ollama-local", "vllm-local", "llamacpp-local"}
            if any(n not in local_names for n in results):
                alive_local = any(
                    _provider_healthy(_HEALTH_NAME.get(n, n), cooldown_s=10) for n in local_names
                )
                if alive_local:
                    deadline = min(deadline, time.monotonic() + local_grace)
                else:
                    deadline = min(deadline, time.monotonic() + 6.0)
    for t in remaining:
        t.cancel()
    if remaining:
        await asyncio.gather(*remaining, return_exceptions=True)

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


async def dual_ai_ai_overview(keyword, domain, site_snippet):
    sys = """You are a Google AI Overview generator. For the given keyword, write the concise, fact-based answer Google's AI Overview would show a user, and judge whether the given site would be cited in that answer. Use the site content as the primary basis, then general knowledge to complete the answer. Return ONLY valid JSON:
{"ai_overview_text":"the answer a user would see (40-80 words, conversational)","mentioned":true,"cited_domains":["example.com"],"confidence":80}
Keep the answer neutral and informative. Never fabricate statistics."""
    user = f"Keyword: {keyword}\nSite domain: {domain}\n\nSite content excerpt:\n{site_snippet}"
    return await _run_all(sys, user, 1200, task="ai_overview")


async def dual_ai_geo_fixes(domain, failing_signals):
    sys = """GEO (Generative Engine Optimization) expert. For each failing signal, give a concrete fix: WHAT to add or change, HOW (specific instructions with an example), and WHERE on the site it should go. Return ONLY valid JSON:
{"fixes":{"<signal name>":{"fix":"one-sentence summary","steps":["concrete step 1","step 2","step 3"],"where":"which page/placement"}}}
Keep every fix specific and actionable for the given domain. Never fabricate data about the site."""
    user = f"Domain: {domain}\nFailing signals:\n" + "\n".join(f"- {n}" for n in (failing_signals or []))
    result = await _run_all(sys, user, 2000)
    fixes = result.get("fixes", result) if isinstance(result, dict) else {}
    return fixes if isinstance(fixes, dict) else {}


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


async def _ollama_simple_fixes(issues: list[dict]) -> Optional[dict]:
    """Local-only fallback: asks Ollama for a smaller JSON so a fix is always produced,
    even when every cloud/free provider is down or rate-limited."""
    if not settings.OLLAMA_BASE_URL:
        return None
    sys = """You are a senior SEO engineer. For EVERY issue in the JSON array, return ONLY valid JSON, no markdown fences:
{"fixes":[{"id":"<exact issue id>","fix":"step-by-step fix under 120 words, concrete and ready to paste","fix_code":"FIX-####","root_cause":"one-sentence cause","effort":"LOW|MEDIUM|HIGH","impact_pct":40,"confidence":70,"why_it_matters":"one sentence on how this hurts rankings or traffic","estimated_time_minutes":30}]}
Rules: exactly one entry per issue preserving the exact id; impact_pct and confidence are integers."""
    user = "Issues:\n" + json.dumps(issues, default=str)
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "stream": False,
                    "messages": [{"role": "system", "content": sys}, {"role": "user", "content": user}],
                    "options": {"temperature": 0.3, "num_predict": 1500},
                },
            )
            if resp.status_code != 200:
                logger.warning("Ollama simple fallback %s: %s", resp.status_code, resp.text[:160])
                _http_error_detail("ollama", resp.status_code, resp.text)
                return None
            _record_health("ollama", True)
            content = resp.json().get("message", {}).get("content", "")
            cleaned = content.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.startswith("```"): cleaned = cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            data = json.loads(cleaned.strip())
            if isinstance(data, dict) and isinstance(data.get("fixes"), list):
                return data
            if isinstance(data, list):
                return {"fixes": data}
            return None
    except Exception as e:
        logger.warning("Ollama simple fallback: %s", e)
        _record_health("ollama", False, str(e)[:200])
        return None


async def quad_ai_batch_fixes(issues: list[dict]) -> dict:
    """Generate ready-to-paste fixes for a batch of issues.
    Runs through the full provider set (LM Studio/Ollama local + cloud) so every
    fix gets an AI suggestion. When an issue includes `page_content`, the fix
    quotes the EXACT offending text (`exact_text`), says where it is (`location`)
    and gives a copy-paste `replacement`. Returns {"fixes":[{id,fix,fix_code,root_cause,effort,before_code,after_code,why,impact_pct,confidence,priority,why_it_matters,business_impact,expected_improvement,confidence_basis,estimated_time_minutes,dependencies,snippets,exact_text,location,replacement}], "providers_used":[...]}.
    """
    sys = """You are a senior SEO engineer. For EVERY issue in the provided JSON array, write a precise fix. Return ONLY valid JSON:
{"fixes":[{"id":"<exact issue id>","fix":"step-by-step fix, under 150 words, concrete and ready to paste","fix_code":"FIX-####","root_cause":"one-sentence cause","effort":"LOW|MEDIUM|HIGH","before_code":"...","after_code":"...","why":"one plain-language sentence a non-technical person understands about why this hurts rankings","impact_pct":"integer 0-100 estimating how much ranking lift fixing this gives","confidence":"integer 0-100 estimating how certain you are this fix is correct for this site","priority":"P0|P1|P2|P3","why_it_matters":"one specific sentence on how this issue affects this site's rankings, traffic or conversions","business_impact":"one sentence on the practical business effect (lost traffic, lower conversion, slower pages)","expected_improvement":"short estimate like '+8-15% CTR (estimate)'","confidence_basis":"short methodology phrase describing WHY you set that confidence, e.g. 'directly verifiable rule check with full page data'","estimated_time_minutes":"integer minutes to implement","dependencies":["FIX-####" or other issue ids this fix depends on, empty array if none],"exact_text":"VERBATIM quote of the offending sentence/paragraph taken word-for-word from the issue's page_content (40-400 chars). REQUIRED whenever page_content is present.","location":"where exactly on the page this text sits, e.g. '2nd paragraph after the H1' or 'meta description'. REQUIRED whenever page_content is present.","replacement":"the EXACT replacement text, ready to paste in place of exact_text, fixing the issue. REQUIRED whenever page_content is present.","snippets":{"html":{"before":"...","after":"..."},"react":{"before":"","after":""},"nextjs":{"before":"","after":""},"wordpress":{"before":"","after":""},"shopify":{"before":"","after":""},"framer":{"before":"","after":""}}}]}
CRITICAL RULES:
- Include exactly one entry per input issue, preserving the exact id.
- Never invent data beyond what is provided in the issue description and page_content.
- If the issue includes page_content, you MUST quote real text verbatim from it. Do NOT paraphrase or make up the exact_text. If page_content is empty, set exact_text, location and replacement to empty strings.
- Make the replacement concrete: a rewritten sentence/paragraph or exact code the user can paste.
- If code is not applicable, set before_code and after_code to empty strings.
- Keep the fix practical: tell the user exactly what to change and where.
- For every framework where a code change applies, give a copy-paste-ready before/after snippet pair. Leave frameworks that do not apply as empty strings.
- impact_pct and confidence must be integers, never strings or decimals."""
    user = "Issues:\n" + json.dumps(issues, default=str)
    # Compact prompt for slow CPU local providers (Ollama): short per-fix JSON
    # so a 1.7B model can finish inside the local grace window and contribute.
    local_sys = "You are a senior SEO engineer. Return ONLY valid JSON: {\"fixes\":[{\"id\":\"<exact issue id>\",\"fix\":\"short concrete fix under 60 words\",\"fix_code\":\"FIX-####\",\"root_cause\":\"one short sentence\",\"effort\":\"LOW|MEDIUM|HIGH\",\"impact_pct\":\"0-100\",\"confidence\":\"0-100\",\"exact_text\":\"verbatim quote from page_content if provided else empty\",\"location\":\"where on the page\",\"replacement\":\"exact text to replace it with\"}]}. Include exactly one entry per input issue, preserving exact ids. Never invent data beyond the issue description and page_content."
    local_user = "Write short fixes for these issues:\n" + json.dumps(
        [{"id": it.get("id"), "signal_name": it.get("signal_name"), "severity": it.get("severity"), "description": it.get("description"), "page_content": (it.get("page_content") or "")[:800]} for it in issues], default=str)
    result = await _run_all(sys, user, 6000, task="rewrite", timeout=70, wait_for_local=True,
                            local_system_prompt=local_sys, local_user_prompt=local_user)
    if isinstance(result, dict) and result.get("fixes"):
        return {"fixes": _enrich_detailed_fixes(result["fixes"], issues), "providers_used": result.get("providers_used", [])}
    simple = await _ollama_simple_fixes(issues)
    if simple and simple.get("fixes"):
        return {"fixes": _enrich_detailed_fixes(simple["fixes"], issues), "providers_used": ["ollama-local"]}
    return result


def _split_long_paragraph(text: str, max_words: int = 70) -> str:
    """Break a wall-of-text paragraph into 3-5 sentence chunks."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    chunks, cur, wc = [], [], 0
    for s in sentences:
        cur.append(s)
        wc += len(s.split())
        if wc >= max_words:
            chunks.append(" ".join(cur))
            cur, wc = [], 0
    if cur:
        chunks.append(" ".join(cur))
    if len(chunks) > 1:
        return "\n\n".join(chunks)
    return text


def _extract_exact(issue: dict) -> dict:
    """Deterministically find the offending text, its location and a replacement
    from the page content so every card shows WHAT / WHERE / REPLACE-WITH even
    when the AI model returns no exact_text."""
    content = (issue.get("page_content") or "").strip()
    signal = (issue.get("signal_name") or "").lower()
    if not content:
        return {"exact_text": "", "location": "", "replacement": ""}

    paras = [p.strip() for p in re.split(r"\n\s*\n", content) if p.strip()]
    target = ""
    location = ""

    # Wall-of-text / long paragraph issues
    if any(k in signal for k in ("paragraph", "word", "wall", "long")):
        for i, p in enumerate(paras):
            if len(p.split()) > 150:
                target = p
                location = f"Paragraph {i + 1} of the body content (about {len(p.split())} words, over the 150-word limit)"
                break
        if not target:
            for i, p in enumerate(paras):
                if len(p.split()) > 80:
                    target = p
                    location = f"Paragraph {i + 1} of the body content"
                    break
        if target:
            return {
                "exact_text": target[:700],
                "location": location,
                "replacement": _split_long_paragraph(target),
            }

    # Keyword density / stuffing issues
    if any(k in signal for k in ("keyword", "density", "stuff", "repetit")):
        if paras:
            target = max(paras, key=lambda p: len(p.split()))
            location = f"Paragraph {paras.index(target) + 1} of the body content (densest keyword use)"
            return {
                "exact_text": target[:700],
                "location": location,
                "replacement": _split_long_paragraph(target),
            }

    # Default: the longest paragraph (most likely the substantive content block)
    if paras:
        target = max(paras, key=lambda p: len(p))
        location = f"Paragraph {paras.index(target) + 1} of the body content"
        return {
            "exact_text": target[:700],
            "location": location,
            "replacement": _split_long_paragraph(target) if len(target.split()) > 120 else target,
        }
    return {"exact_text": content[:700], "location": "Body content", "replacement": content[:700]}


def _enrich_detailed_fixes(fixes: list, issues: list[dict]) -> list:
    """Ensure every fix carries exact_text / location / replacement so the UI can
    show WHAT to change, WHERE it is, and the exact REPLACE-WITH text."""
    by_id = {str(it.get("id")): it for it in issues}
    out = []
    for f in fixes:
        if not isinstance(f, dict):
            out.append(f)
            continue
        issue = by_id.get(str(f.get("id") or ""), {})
        detail = {}
        if not (f.get("exact_text") or f.get("replacement")):
            detail = _extract_exact(issue)
        exact = str(f.get("exact_text") or detail.get("exact_text") or "").strip()
        location = str(f.get("location") or detail.get("location") or "").strip()
        replacement = str(f.get("replacement") or detail.get("replacement") or "").strip()
        if exact and not replacement:
            replacement = exact
        fix = str(f.get("fix") or "").strip()
        if exact and location and fix:
            f["fix"] = f"{fix}\n\nExact text to change ({location}): \"{exact[:400]}\"\n\nReplace with: \"{replacement[:400]}\""
        elif exact and fix:
            f["fix"] = f"{fix}\n\nExact text to change: \"{exact[:400]}\"\n\nReplace with: \"{replacement[:400]}\""
        f["exact_text"] = exact
        f["location"] = location
        f["replacement"] = replacement
        out.append(f)
    return out


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
dual_ai_batch_fixes = quad_ai_batch_fixes
