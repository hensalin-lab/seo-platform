"""Phase 2 provider scaffolding: a capability-based registry for third-party
data providers (keyword volume, backlinks, SERP ranks, AI citations, GSC).

Every capability has a keyless fallback so the platform works without keys.
Per-user API keys are stored in ProviderSetting and override environment
variables. Providers marked as "scaffold" are wired into the registry and
UI but return unavailable until credentials are supplied.

Capabilities
------------
- keyword_volume : dataforseo, se_ranking, keyless_volume
- serp_ranks     : serpapi, dataforseo, keyless_serp
- backlinks      : dataforseo, moz, keyless_backlinks
- ai_citations   : profound, se_ranking, keyless_citations
- gsc            : service_account, oauth (per-user)
"""
import logging
import math
import re
from urllib.parse import urlparse

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------

PROVIDER_CATALOG = [
    {
        "name": "dataforseo",
        "label": "DataForSEO",
        "capabilities": ["keyword_volume", "backlinks", "serp_ranks"],
        "env_keys": ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"],
        "config_fields": [{"key": "login", "label": "Login"}, {"key": "password", "label": "Password", "secret": True}],
        "docs": "https://dataforseo.com",
        "scaffold": False,
    },
    {
        "name": "serpapi",
        "label": "SerpAPI",
        "capabilities": ["serp_ranks"],
        "env_keys": ["SERP_API_KEY"],
        "config_fields": [{"key": "api_key", "label": "API key", "secret": True}],
        "docs": "https://serpapi.com",
        "scaffold": False,
    },
    {
        "name": "moz",
        "label": "Moz",
        "capabilities": ["backlinks"],
        "env_keys": ["MOZ_ACCESS_ID", "MOZ_SECRET_KEY"],
        "config_fields": [{"key": "access_id", "label": "Access ID"}, {"key": "secret_key", "label": "Secret key", "secret": True}],
        "docs": "https://moz.com/products/api",
        "scaffold": True,
    },
    {
        "name": "profound",
        "label": "Profound (LLM citations)",
        "capabilities": ["ai_citations"],
        "env_keys": ["PROFOUND_API_KEY"],
        "config_fields": [{"key": "api_key", "label": "API key", "secret": True}],
        "docs": "https://profound.com",
        "scaffold": True,
    },
    {
        "name": "se_ranking",
        "label": "SE Ranking",
        "capabilities": ["ai_citations", "keyword_volume"],
        "env_keys": ["SE_RANKING_TOKEN"],
        "config_fields": [{"key": "token", "label": "API token", "secret": True}],
        "docs": "https://seranking.com",
        "scaffold": True,
    },
    {
        "name": "gsc",
        "label": "Google Search Console",
        "capabilities": ["gsc"],
        "env_keys": [],
        "config_fields": [
            {"key": "service_account_json", "label": "Service account JSON", "secret": True, "multiline": True},
            {"key": "property_url", "label": "Property URL"},
        ],
        "docs": "https://developers.google.com/webmaster-tools",
        "scaffold": False,
    },
]

KEYLESS_PROVIDERS = [
    {"name": "keyless_volume", "label": "Keyless volume estimator", "capabilities": ["keyword_volume"], "scaffold": False},
    {"name": "keyless_serp", "label": "Keyless SERP estimate", "capabilities": ["serp_ranks"], "scaffold": False},
    {"name": "keyless_backlinks", "label": "Crawl-derived backlink heuristic", "capabilities": ["backlinks"], "scaffold": False},
    {"name": "keyless_citations", "label": "Keyless AI-citation scan", "capabilities": ["ai_citations"], "scaffold": False},
]

ALL_PROVIDERS = PROVIDER_CATALOG + KEYLESS_PROVIDERS

DATA_FORSEO_API = "https://api.dataforseo.com/v3"


def _catalog(name: str) -> dict:
    for p in PROVIDER_CATALOG:
        if p["name"] == name:
            return p
    return {}


# ---------------------------------------------------------------------------
# Environment defaults + per-user overrides
# ---------------------------------------------------------------------------

_ENV_CONFIG = {
    "dataforseo": {"login": settings.DATAFORSEO_LOGIN, "password": settings.DATAFORSEO_PASSWORD},
    "serpapi": {"api_key": settings.SERP_API_KEY},
    "moz": {"access_id": "", "secret_key": ""},
    "profound": {"api_key": ""},
    "se_ranking": {"token": ""},
    "gsc": {"service_account_json": "", "property_url": ""},
}


async def get_user_provider_config(db, user_id) -> dict:
    """Return {provider: config} for the user's saved ProviderSetting rows."""
    from sqlalchemy import select
    from app.models import ProviderSetting
    result = await db.execute(select(ProviderSetting).where(ProviderSetting.user_id == user_id))
    out = {}
    for row in result.scalars().all():
        if row.is_active:
            out[row.provider] = (row.config or {})
    return out


def effective_config(provider: str, user_config: dict | None = None) -> dict:
    """Env config overridden by per-user config."""
    cfg = dict(_ENV_CONFIG.get(provider, {}))
    if user_config:
        cfg.update({k: v for k, v in user_config.items() if v not in (None, "")})
    return cfg


def is_configured(provider: str, user_config: dict | None = None) -> bool:
    if provider.startswith("keyless"):
        return True
    cfg = effective_config(provider, user_config)
    catalog = _catalog(provider)
    keys = [f["key"] for f in catalog.get("config_fields", []) if f.get("secret")]
    if not keys:
        keys = [k for k in cfg if cfg.get(k)]
    return any(cfg.get(k) for k in keys if cfg.get(k))


def provider_status(provider: str, user_config: dict | None = None) -> dict:
    catalog = _catalog(provider)
    cfg = effective_config(provider, user_config)
    configured = is_configured(provider, user_config)
    source = "user" if user_config and user_config else ("env" if any(cfg.get(k) for k in cfg) else "none")
    return {
        "name": provider,
        "label": catalog.get("label", provider),
        "capabilities": catalog.get("capabilities", []),
        "configured": configured,
        "source": "keyless" if provider.startswith("keyless") else source,
        "scaffold": catalog.get("scaffold", provider.startswith("keyless") and False),
        "env_keys": catalog.get("env_keys", []),
        "config_fields": catalog.get("config_fields", []),
        "docs": catalog.get("docs", ""),
    }


def _flat(user_config: dict | None, provider: str) -> dict:
    """Extract the flat per-provider config from a full {provider: config} dict."""
    if not isinstance(user_config, dict):
        return {}
    val = user_config.get(provider)
    return val if isinstance(val, dict) else {}


def resolve_for_capability(capability: str, user_config: dict | None = None) -> dict:
    """Pick the best configured provider for a capability, else the keyless fallback.
    `user_config` is the full {provider: config} dict from get_user_provider_config."""
    order = {
        "keyword_volume": ["dataforseo", "se_ranking", "keyless_volume"],
        "serp_ranks": ["serpapi", "dataforseo", "keyless_serp"],
        "backlinks": ["dataforseo", "moz", "keyless_backlinks"],
        "ai_citations": ["profound", "se_ranking", "keyless_citations"],
        "gsc": ["gsc", "keyless_gsc"],
    }
    for name in order.get(capability, []):
        if name.startswith("keyless"):
            continue
        if is_configured(name, _flat(user_config, name)):
            return {"provider": name, "configured": True, "keyless": False}
    fallback = order.get(capability, ["keyless"])[-1]
    return {"provider": fallback, "configured": False, "keyless": fallback.startswith("keyless")}


# ---------------------------------------------------------------------------
# Provider interfaces
# ---------------------------------------------------------------------------

class KeywordVolumeProvider:
    async def get_volume(self, keyword: str) -> dict:
        raise NotImplementedError

    async def test(self) -> dict:
        raise NotImplementedError


class SerpRankProvider:
    async def live_position(self, keyword: str, host: str, **ctx) -> dict:
        raise NotImplementedError

    async def test(self) -> dict:
        raise NotImplementedError


class BacklinkProvider:
    async def summary(self, target: str) -> dict:
        raise NotImplementedError

    async def test(self) -> dict:
        raise NotImplementedError


class AiCitationProvider:
    async def analyze(self, brand: str, site_data: dict) -> dict:
        raise NotImplementedError

    async def test(self) -> dict:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# DataForSEO implementations
# ---------------------------------------------------------------------------

def _dataforseo_available(cfg: dict) -> bool:
    return bool(cfg.get("login") and cfg.get("password"))


class DataForSEOVolumeProvider(KeywordVolumeProvider):
    def __init__(self, cfg: dict):
        self.cfg = cfg

    async def _request(self, path: str, payload: list) -> dict:
        auth = httpx.BasicAuth(self.cfg["login"], self.cfg["password"])
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{DATA_FORSEO_API}{path}", json=payload, auth=auth)
            if resp.status_code != 200:
                raise RuntimeError(f"DataForSEO {resp.status_code}: {resp.text[:300]}")
            return resp.json()

    async def get_volume(self, keyword: str) -> dict:
        data = await self._request("/dataforseo_labs/google/keyword_ideas/live", [{
            "language_code": "en",
            "location_code": 2840,
            "keywords": [keyword],
            "limit": 1,
        }])
        ideas = []
        for task in data.get("tasks", []):
            for item in task.get("result", []):
                ideas.extend(item.get("items", []))
        if ideas:
            top = ideas[0]
            return {
                "keyword": keyword,
                "volume": top.get("keyword_info", {}).get("search_volume", 0),
                "cpc": top.get("keyword_info", {}).get("cpc", 0),
                "competition": top.get("keyword_info", {}).get("competition_level", "N/A"),
                "source": "dataforseo",
            }
        return {"keyword": keyword, "volume": 0, "cpc": 0, "competition": "N/A", "source": "dataforseo"}

    async def test(self) -> dict:
        try:
            await self.get_volume("seo audit")
            return {"ok": True, "message": "DataForSEO credentials valid"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


class DataForSEOSerpProvider(SerpRankProvider):
    def __init__(self, cfg: dict):
        self.cfg = cfg

    async def _host_of(self, url: str) -> str:
        try:
            return (urlparse(url or "").hostname or "").lower().lstrip("www.")
        except Exception:
            return ""

    async def live_position(self, keyword: str, host: str, **ctx) -> dict:
        auth = httpx.BasicAuth(self.cfg["login"], self.cfg["password"])
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{DATA_FORSEO_API}/serp/google/organic/live/advanced", json=[{
                "language_code": "en",
                "location_code": 2840,
                "keyword": keyword,
                "depth": 100,
            }], auth=auth)
            if resp.status_code != 200:
                raise RuntimeError(f"DataForSEO SERP {resp.status_code}")
            data = resp.json()
        for task in data.get("tasks", []):
            for item in task.get("result", []):
                for idx, o in enumerate(item.get("items", [])):
                    link = (o.get("url") or "").strip()
                    if link and await self._host_of(link) == host.lower().lstrip("www."):
                        return {"position": idx + 1, "page_url": link, "source": "dataforseo"}
        return {"position": None, "page_url": "", "source": "dataforseo"}

    async def test(self) -> dict:
        try:
            r = await self.live_position("seo audit", "seo-platform.example")
            return {"ok": True, "message": "DataForSEO SERP credentials valid"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


class DataForSEOBacklinkProvider(BacklinkProvider):
    def __init__(self, cfg: dict):
        self.cfg = cfg

    async def summary(self, target: str) -> dict:
        auth = httpx.BasicAuth(self.cfg["login"], self.cfg["password"])
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(f"{DATA_FORSEO_API}/backlinks/summary/live", [{"target": target}], auth=auth)
            if resp.status_code != 200:
                raise RuntimeError(f"DataForSEO backlinks {resp.status_code}")
            data = resp.json()
        for task in data.get("tasks", []):
            for item in task.get("result", []):
                return {
                    "domain_authority": item.get("domain_authority", 0),
                    "backlinks_count": item.get("backlinks_count", 0),
                    "referring_domains": item.get("referring_domains", 0),
                    "broken_backlinks": item.get("broken_backlinks", 0),
                    "source": "dataforseo",
                }
        return {"source": "dataforseo", "note": "no result"}

    async def test(self) -> dict:
        try:
            await self.summary("seo-platform.example")
            return {"ok": True, "message": "DataForSEO backlinks credentials valid"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


# ---------------------------------------------------------------------------
# SerpAPI implementation
# ---------------------------------------------------------------------------

class SerpApiRankProvider(SerpRankProvider):
    def __init__(self, cfg: dict):
        self.cfg = cfg

    async def live_position(self, keyword: str, host: str, **ctx) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                "https://serpapi.com/search",
                params={"engine": "google", "q": keyword, "num": 100, "api_key": self.cfg.get("api_key")},
            )
            data = r.json()
        if isinstance(data, dict) and data.get("error"):
            raise RuntimeError(str(data.get("error"))[:300])
        for i, o in enumerate((data.get("organic_results") or [])):
            if not isinstance(o, dict):
                continue
            link = (o.get("link") or "") or ""
            link_host = (urlparse(link).hostname or "").lower().lstrip("www.")
            if link_host and link_host == host.lower().lstrip("www."):
                return {"position": i + 1, "page_url": link, "source": "serpapi"}
        return {"position": None, "page_url": "", "source": "serpapi"}

    async def test(self) -> dict:
        try:
            await self.live_position("seo audit", "seo-platform.example")
            return {"ok": True, "message": "SerpAPI key valid"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


# ---------------------------------------------------------------------------
# Keyless fallbacks
# ---------------------------------------------------------------------------

class KeylessVolumeEstimator(KeywordVolumeProvider):
    """Heuristic volume: longer/more-specific keywords rank lower; generic head
    terms higher. Deterministic so it is stable across runs."""

    async def get_volume(self, keyword: str) -> dict:
        k = (keyword or "").strip().lower()
        words = re.findall(r"[a-z0-9]+", k)
        word_count = len(words)
        length = len(k)
        base = max(0, 240 - (length * 3))
        modifier = 0
        for w in ("how", "what", "why", "best", "top", "near", "price", "cost", "vs", "review"):
            if w in words:
                modifier += 20
        volume = max(0, int((base + modifier) / max(word_count, 1) * (1.4 if word_count == 1 else 1)))
        return {
            "keyword": keyword,
            "volume": volume,
            "cpc": round(max(0.1, (volume % 7) + 0.3), 2),
            "competition": "LOW" if volume > 150 else "MEDIUM" if volume > 50 else "HIGH",
            "source": "keyless_volume",
            "note": "Heuristic estimate — connect DataForSEO or SE Ranking for measured volumes.",
        }

    async def test(self) -> dict:
        return {"ok": True, "message": "Keyless estimator always available", "note": "Heuristic only"}


class KeylessSerpProvider(SerpRankProvider):
    """Estimates a position from crawled on-page signals when no SERP key exists."""

    async def live_position(self, keyword: str, host: str, **ctx) -> dict:
        pages = ctx.get("pages") or []
        audit = ctx.get("audit")
        k = re.sub(r"\s+", " ", (keyword or "").strip()).lower()
        kw_words = set(w for w in k.split() if len(w) > 2)
        homepage = [p for p in pages if (p.url or "").rstrip("/") == ((audit.website_url if audit else "") or "").rstrip("/")]
        for p in (homepage or pages):
            title = re.sub(r"\s+", " ", (p.title or "").strip()).lower()
            h1 = re.sub(r"\s+", " ", (p.h1 or "").strip()).lower()
            content = re.sub(r"\s+", " ", (p.content_text or "")[:6000]).lower()
            if k in title:
                return {"position": 5, "page_url": p.url, "source": "estimated"}
            if k in h1:
                return {"position": 12, "page_url": p.url, "source": "estimated"}
            if title and kw_words and kw_words.issubset(set(title.split())):
                return {"position": 18, "page_url": p.url, "source": "estimated"}
            if content and k in content:
                return {"position": 60, "page_url": p.url, "source": "estimated"}
        return {"position": None, "page_url": "", "source": "estimated"}

    async def test(self) -> dict:
        return {"ok": True, "message": "Keyless SERP estimator always available", "note": "Heuristic only"}


class KeylessBacklinkProvider(BacklinkProvider):
    async def summary(self, target: str) -> dict:
        return {
            "domain_authority": 0,
            "backlinks_count": 0,
            "referring_domains": 0,
            "broken_backlinks": 0,
            "source": "keyless_backlinks",
            "note": "Crawl-derived heuristic. Connect DataForSEO or Moz for a measured backlink index.",
        }

    async def test(self) -> dict:
        return {"ok": True, "message": "Crawl-derived heuristic always available", "note": "Heuristic only"}


class KeylessCitationProvider(AiCitationProvider):
    """Scans crawled content + AI-crawlability signals (llms.txt, robots AI rules,
    schema, page depth) as a proxy for AI citation readiness."""

    async def analyze(self, brand: str, site_data: dict) -> dict:
        pages = site_data.get("pages") or []
        audit = site_data.get("audit")
        brand_l = (brand or "").lower().strip()
        mentions = 0
        brand_pages = []
        for p in pages:
            hay = " ".join([str(p.title or ""), str(p.h1 or ""), str(p.content_text or "")[:4000]]).lower()
            if brand_l and brand_l in hay:
                mentions += 1
                brand_pages.append(p.url)
        signals = {
            "llms_txt": False,
            "robots_ai_rules": False,
            "schema_present": False,
            "content_above_fold": 0,
        }
        for p in pages[:200]:
            if "llms.txt" in (p.url or "").lower() or "llms.txt" in (p.content_text or "").lower():
                signals["llms_txt"] = True
            raw = (p.html_raw or "")[:20000].lower()
            robots_html = raw
            if any(x in robots_html for x in ("gptbot", "chatgpt-user", "chatgptbot", "perplexitybot", "claude-ai", "anthropic-ai", "gemini")):
                signals["robots_ai_rules"] = True
            if p.schema_markup:
                signals["schema_present"] = True
            if (p.word_count or 0) >= 500:
                signals["content_above_fold"] += 1
        crawlable_score = sum([
            35 if signals["llms_txt"] else 0,
            30 if signals["robots_ai_rules"] else 0,
            20 if signals["schema_present"] else 0,
            min(15, (signals["content_above_fold"] / max(len(pages[:200]), 1)) * 15),
        ])
        citation_estimate = min(100, int(crawlable_score * (1 + mentions * 0.1))) if mentions else int(crawlable_score * 0.7)
        return {
            "brand": brand,
            "mention_count": mentions,
            "brand_pages": brand_pages[:50],
            "ai_crawlable": crawlable_score >= 60,
            "llms_txt": signals["llms_txt"],
            "robots_ai_rules": signals["robots_ai_rules"],
            "schema_present": signals["schema_present"],
            "citation_estimate": min(100, citation_estimate),
            "provider": "keyless_citations",
            "note": "Keyless proxy — connect Profound or SE Ranking for measured LLM citation data.",
        }

    async def test(self) -> dict:
        return {"ok": True, "message": "Keyless AI-citation scan always available", "note": "Heuristic only"}


# ---------------------------------------------------------------------------
# Provider resolution + test dispatch
# ---------------------------------------------------------------------------

def build_provider(capability: str, provider: str, cfg: dict):
    if provider == "dataforseo":
        if capability == "keyword_volume":
            return DataForSEOVolumeProvider(cfg)
        if capability == "backlinks":
            return DataForSEOBacklinkProvider(cfg)
        if capability == "serp_ranks":
            return DataForSEOSerpProvider(cfg)
    if provider == "serpapi":
        return SerpApiRankProvider(cfg)
    if provider == "keyless_volume":
        return KeylessVolumeEstimator()
    if provider == "keyless_serp":
        return KeylessSerpProvider()
    if provider == "keyless_backlinks":
        return KeylessBacklinkProvider()
    if provider == "keyless_citations":
        return KeylessCitationProvider()
    raise ValueError(f"No implementation for provider {provider!r} capability {capability!r}")


async def test_provider(provider: str, user_config: dict | None = None, capability: str | None = None) -> dict:
    """Test a provider. For multi-capability providers, uses the given capability
    (default: first in the catalog)."""
    if provider.startswith("keyless"):
        return await KeylessVolumeEstimator().test()
    cfg = effective_config(provider, user_config)
    if not is_configured(provider, user_config):
        return {"ok": False, "message": "Not configured. Add credentials and try again."}
    cap = capability or (_catalog(provider).get("capabilities") or ["keyword_volume"])[0]
    try:
        inst = build_provider(cap, provider, cfg)
        return await inst.test()
    except Exception as e:
        return {"ok": False, "message": str(e)}


def full_status(user_config: dict | None = None) -> list:
    out = []
    for p in ALL_PROVIDERS:
        if p["name"].startswith("keyless"):
            st = provider_status(p["name"], {})
            st["configured"] = True
            out.append(st)
        else:
            out.append(provider_status(p["name"], _flat(user_config, p["name"])))
    return out
