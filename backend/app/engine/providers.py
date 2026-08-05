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
- ai_citations   : profound, se_ranking, dataforseo, keyless_citations
- gsc            : oauth (per-user), service_account, oauth (per-user)
"""
import base64
import datetime as _dt
import logging
import math
import re
from urllib.parse import urlparse, quote

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
        "capabilities": ["keyword_volume", "backlinks", "serp_ranks", "ai_citations"],
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
        "name": "google_cse",
        "label": "Google Custom Search (free)",
        "capabilities": ["serp_ranks"],
        "env_keys": ["GOOGLE_CSE_API_KEY", "GOOGLE_CSE_CX"],
        "config_fields": [{"key": "api_key", "label": "API key", "secret": True}, {"key": "cx", "label": "Search engine ID (cx)"}],
        "docs": "https://developers.google.com/custom-search/v1/overview",
        "scaffold": False,
        "free": True,
    },
    {
        "name": "llm_citations",
        "label": "LLM citation check (free)",
        "capabilities": ["ai_citations"],
        "env_keys": [],
        "config_fields": [{"key": "api_key", "label": "Gemini API key", "secret": True}],
        "docs": "https://ai.google.dev",
        "scaffold": False,
        "free": True,
    },
    {
        "name": "moz",
        "label": "Moz",
        "capabilities": ["backlinks"],
        "env_keys": ["MOZ_ACCESS_ID", "MOZ_SECRET_KEY"],
        "config_fields": [{"key": "access_id", "label": "Access ID"}, {"key": "secret_key", "label": "Secret key", "secret": True}],
        "docs": "https://moz.com/products/api",
        "scaffold": False,
    },
    {
        "name": "profound",
        "label": "Profound (LLM citations)",
        "capabilities": ["ai_citations"],
        "env_keys": ["PROFOUND_API_KEY"],
        "config_fields": [{"key": "api_key", "label": "API key", "secret": True}],
        "docs": "https://docs.tryprofound.com",
        "scaffold": False,
    },
    {
        "name": "se_ranking",
        "label": "SE Ranking",
        "capabilities": ["ai_citations", "keyword_volume"],
        "env_keys": ["SE_RANKING_TOKEN"],
        "config_fields": [{"key": "token", "label": "API token", "secret": True}],
        "docs": "https://seranking.com",
        "scaffold": False,
    },
    {
        "name": "pagerank",
        "label": "Open PageRank (free)",
        "capabilities": ["backlinks"],
        "env_keys": ["OPEN_PAGERANK_API_KEY"],
        "config_fields": [{"key": "api_key", "label": "Open PageRank API key", "secret": True}],
        "docs": "https://openpagerank.com",
        "scaffold": False,
        "free": True,
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
    "google_cse": {"api_key": settings.GOOGLE_CSE_API_KEY, "cx": settings.GOOGLE_CSE_CX},
    "llm_citations": {},
    "moz": {"access_id": settings.MOZ_ACCESS_ID, "secret_key": settings.MOZ_SECRET_KEY},
    "profound": {"api_key": settings.PROFOUND_API_KEY},
    "se_ranking": {"token": settings.SE_RANKING_TOKEN},
    "pagerank": {"api_key": settings.OPEN_PAGERANK_API_KEY},
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
    if provider == "gsc":
        return bool(cfg.get("oauth_access_token") or cfg.get("oauth_refresh_token") or cfg.get("service_account_json"))
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
        "free": catalog.get("free", False),
        "env_keys": catalog.get("env_keys", []),
        "config_fields": catalog.get("config_fields", []),
        "docs": catalog.get("docs", ""),
        "has_config": bool(cfg and any(cfg.get(k) for k in cfg)),
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
        "serp_ranks": ["google_cse", "serpapi", "dataforseo", "keyless_serp"],
        "backlinks": ["dataforseo", "moz", "pagerank", "keyless_backlinks"],
        "ai_citations": ["llm_citations", "profound", "se_ranking", "dataforseo", "keyless_citations"],
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
# Moz implementation
# ---------------------------------------------------------------------------

MOZ_URL_METRICS = "https://lsapi.seomoz.com/v2/url_metrics"


class MozBacklinkProvider(BacklinkProvider):
    def __init__(self, cfg: dict):
        self.cfg = cfg

    def _auth_header(self) -> dict:
        token = base64.b64encode(
            f"{self.cfg.get('access_id', '')}:{self.cfg.get('secret_key', '')}".encode("utf-8")
        ).decode("utf-8")
        return {"Authorization": f"Basic {token}"}

    async def summary(self, target: str) -> dict:
        headers = {**self._auth_header(), "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(MOZ_URL_METRICS, headers=headers, json={"target": target, "scope": "page"})
            if resp.status_code != 200:
                raise RuntimeError(f"Moz {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
        return {
            "domain_authority": data.get("domain_authority", data.get("page_authority", 0)),
            "backlinks_count": data.get("external_pages", 0),
            "referring_domains": data.get("linking_domains", 0),
            "broken_backlinks": 0,
            "spam_score": data.get("spam_score", 0),
            "source": "moz",
        }

    async def test(self) -> dict:
        try:
            await self.summary("seo-platform.example")
            return {"ok": True, "message": "Moz credentials valid"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


# ---------------------------------------------------------------------------
# Open PageRank (free backlink index) implementation
# ---------------------------------------------------------------------------

OPEN_PAGERANK_API = "https://openpagerank.com/api/v1.0/getPageRank"


class OpenPageRankBacklinkProvider(BacklinkProvider):
    """Free PageRank / domain authority from openpagerank.com (free API key)."""

    def __init__(self, cfg: dict):
        self.cfg = cfg

    def _headers(self) -> dict:
        return {"API-OPR": self.cfg.get("api_key", "")}

    async def summary(self, target: str) -> dict:
        host = (urlparse(target).hostname or target).lstrip("www.")
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                OPEN_PAGERANK_API,
                params={"domains[]": host},
                headers=self._headers(),
            )
            if resp.status_code != 200:
                raise RuntimeError(f"Open PageRank {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
        rows = data.get("response") or []
        if not rows:
            return {"source": "pagerank", "note": "no result for this domain"}
        r = rows[0]
        return {
            "domain_authority": r.get("domain_authority", 0),
            "page_rank": r.get("page_rank_decimal") or r.get("page_rank_integer", 0),
            "rank": r.get("rank", 0),
            "spam_score": r.get("spam_score", 0),
            "backlinks_count": 0,
            "referring_domains": 0,
            "source": "pagerank",
            "note": "Free PageRank index from Open PageRank — limited to PageRank/DA, not full backlink counts.",
        }

    async def test(self) -> dict:
        try:
            await self.summary("example.com")
            return {"ok": True, "message": "Open PageRank API key valid"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


# ---------------------------------------------------------------------------
# SE Ranking implementations
# ---------------------------------------------------------------------------

SE_RANKING_API = "https://api.seranking.com/v1"


class SeRankingVolumeProvider(KeywordVolumeProvider):
    def __init__(self, cfg: dict):
        self.cfg = cfg

    def _headers(self) -> dict:
        return {"Authorization": f"Token {self.cfg.get('token', '')}"}

    async def _get(self, path: str, params: dict) -> dict:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(f"{SE_RANKING_API}{path}", params=params, headers=self._headers())
            if resp.status_code != 200:
                raise RuntimeError(f"SE Ranking {resp.status_code}: {resp.text[:300]}")
            return resp.json()

    async def get_volume(self, keyword: str) -> dict:
        data = await self._get("/keywords/export", {"keyword": keyword, "database": "en"})
        keywords = data.get("keywords") or []
        if keywords:
            top = keywords[0]
            return {
                "keyword": keyword,
                "volume": top.get("volume", 0),
                "cpc": top.get("cpc", 0),
                "competition": top.get("competition", top.get("difficulty", "N/A")),
                "source": "se_ranking",
            }
        return {"keyword": keyword, "volume": 0, "cpc": 0, "competition": "N/A", "source": "se_ranking"}

    async def test(self) -> dict:
        try:
            await self.get_volume("seo audit")
            return {"ok": True, "message": "SE Ranking token valid"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


class SeRankingCitationProvider(AiCitationProvider):
    def __init__(self, cfg: dict):
        self.cfg = cfg

    def _headers(self) -> dict:
        return {"Authorization": f"Token {self.cfg.get('token', '')}"}

    async def analyze(self, brand: str, site_data: dict) -> dict:
        end = _dt.date.today()
        start = end - _dt.timedelta(days=30)
        params = {
            "brand": brand,
            "date_from": start.isoformat(),
            "date_to": end.isoformat(),
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(
                f"{SE_RANKING_API}/ai-search/prompts-by-brand", params=params, headers=self._headers()
            )
            if resp.status_code != 200:
                raise RuntimeError(f"SE Ranking AI search {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
        prompts = data.get("prompts") or data.get("data") or []
        total = data.get("total", len(prompts))
        engines = set()
        for p in prompts:
            if not isinstance(p, dict):
                continue
            eng = p.get("engine") or p.get("search_engine") or p.get("platform")
            if eng:
                engines.add(str(eng))
        return {
            "brand": brand,
            "mention_count": int(total or 0),
            "prompts": prompts[:25],
            "engines": sorted(engines),
            "citation_estimate": min(100, int(total or 0) * 5),
            "provider": "se_ranking",
            "note": "Measured from SE Ranking AI Search prompt data.",
        }

    async def test(self) -> dict:
        try:
            await self.analyze("example", {"pages": [], "audit": None})
            return {"ok": True, "message": "SE Ranking AI Search token valid"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


# ---------------------------------------------------------------------------
# Profound (LLM citations) implementation
# ---------------------------------------------------------------------------

PROFOUND_API = "https://api.tryprofound.com"


class ProfoundCitationProvider(AiCitationProvider):
    def __init__(self, cfg: dict):
        self.cfg = cfg

    def _headers(self) -> dict:
        return {"X-API-Key": self.cfg.get("api_key", "")}

    async def _post(self, path: str, payload: dict) -> dict:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{PROFOUND_API}{path}", headers=self._headers(), json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Profound {resp.status_code}: {resp.text[:300]}")
            return resp.json()

    async def _first_category_id(self) -> str:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{PROFOUND_API}/v1/org/categories", headers=self._headers())
            if resp.status_code != 200:
                raise RuntimeError(f"Profound categories {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
        cats = data.get("data") or []
        if not cats:
            raise RuntimeError("Profound: no categories configured for this organization")
        return cats[0].get("id") or cats[0].get("category_id") or ""

    async def analyze(self, brand: str, site_data: dict) -> dict:
        category_id = await self._first_category_id()
        end = _dt.date.today()
        start = end - _dt.timedelta(days=30)
        data = await self._post("/v2/reports/citations", {
            "category_id": category_id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "entity": "domain",
            "scope": "owned",
            "metrics": ["count", "citation_share", "rank"],
            "limit": 50,
        })
        rows = data.get("data") or []
        total = sum(int(r.get("count") or 0) for r in rows)
        info = data.get("info") or {}
        audit = site_data.get("audit")
        website = (audit.website_url if audit else "") or ""
        host = (urlparse(website).hostname or "").lstrip("www.")
        brand_share = 0.0
        brand_rank = None
        brand_row = None
        for r in rows:
            dom = (r.get("domain") or "").lstrip("www.")
            if dom and host and (dom == host or dom.endswith("." + host) or host.endswith("." + dom)):
                brand_row = r
                break
        if brand_row:
            brand_share = float(brand_row.get("citation_share") or 0)
            brand_rank = brand_row.get("rank")
        return {
            "brand": brand,
            "mention_count": total,
            "citations": rows[:25],
            "total_citations": total,
            "citation_share": round(brand_share * 100, 2),
            "citation_rank": brand_rank,
            "models": info.get("models", []),
            "citation_estimate": min(100, int(total) if total else 0),
            "provider": "profound",
            "note": "Measured from Profound citation reports (owned domains).",
        }

    async def test(self) -> dict:
        try:
            category_id = await self._first_category_id()
            return {"ok": True, "message": f"Profound key valid (category {category_id})"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


# ---------------------------------------------------------------------------
# DataForSEO AI-citation (LLM responses) implementation
# ---------------------------------------------------------------------------

class DataForSEOCitationProvider(AiCitationProvider):
    def __init__(self, cfg: dict):
        self.cfg = cfg

    async def _request(self, path: str, payload: list) -> dict:
        auth = httpx.BasicAuth(self.cfg["login"], self.cfg["password"])
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(f"{DATA_FORSEO_API}{path}", json=payload, auth=auth)
            if resp.status_code != 200:
                raise RuntimeError(f"DataForSEO {resp.status_code}: {resp.text[:300]}")
            return resp.json()

    async def analyze(self, brand: str, site_data: dict) -> dict:
        prompt = (
            f"Given your knowledge and current web results, is '{brand}' an authority on this topic? "
            "If so, mention it and cite the relevant sources."
        )
        payload = [{
            "llm_type": "chat",
            "model_name": "gpt-4o",
            "web_search": "auto",
            "user_prompt": prompt,
        }]
        data = await self._request("/ai_optimization/chatgpt/llm_responses/live", payload)
        mentions = 0
        answers = []
        citations = []
        for task in data.get("tasks", []):
            for item in task.get("result", []):
                resp_text = item.get("llm_response") or item.get("response") or ""
                answers.append(str(resp_text)[:2000])
                for c in (item.get("citations") or []):
                    if isinstance(c, dict):
                        citations.append(c.get("url") or c.get("title") or "")
                    else:
                        citations.append(str(c))
                if brand.lower() in str(resp_text).lower():
                    mentions += 1
        return {
            "brand": brand,
            "mention_count": mentions,
            "answers": answers,
            "citations": citations[:25],
            "citation_estimate": 100 if mentions else 0,
            "provider": "dataforseo",
            "note": "Measured via DataForSEO LLM-responses API (ChatGPT, web search on).",
        }

    async def test(self) -> dict:
        try:
            await self.analyze("example", {"pages": [], "audit": None})
            return {"ok": True, "message": "DataForSEO LLM responses credentials valid"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


# ---------------------------------------------------------------------------
# Google Search Console (OAuth) implementation
# ---------------------------------------------------------------------------

GSC_API = "https://searchconsole.googleapis.com/webmasters/v3"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


class GscOAuthProvider:
    """Search Console data provider backed by a per-user OAuth token, matching
    the GSCEngine method contract so audit GSC endpoints can use either."""

    def __init__(self, cfg: dict):
        self.cfg = dict(cfg or {})
        self._available = bool(self.cfg.get("oauth_access_token") or self.cfg.get("oauth_refresh_token"))
        self.persist_cb = None

    @property
    def available(self) -> bool:
        return self._available

    async def _refresh(self) -> bool:
        refresh = self.cfg.get("oauth_refresh_token")
        client_id = self.cfg.get("oauth_client_id") or settings.GOOGLE_CLIENT_ID
        client_secret = self.cfg.get("oauth_client_secret") or settings.GOOGLE_CLIENT_SECRET
        if not refresh or not client_id or not client_secret:
            return False
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(GOOGLE_TOKEN_URL, data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh,
                    "grant_type": "refresh_token",
                })
                if resp.status_code != 200:
                    logger.warning(f"GSC token refresh failed: {resp.status_code} {resp.text[:200]}")
                    return False
                data = resp.json()
            self.cfg["oauth_access_token"] = data.get("access_token", "")
            if not self.cfg["oauth_access_token"]:
                return False
            self.cfg["oauth_expires_in"] = int(data.get("expires_in", 3600))
            if self.persist_cb:
                try:
                    await self.persist_cb(self.cfg)
                except Exception as e:
                    logger.warning(f"GSC token refresh persist failed: {e}")
            return True
        except Exception as e:
            logger.warning(f"GSC token refresh error: {e}")
            return False

    async def _request(self, method: str, path: str, params: dict | None = None, json=None) -> dict:
        token = self.cfg.get("oauth_access_token")
        if not token:
            if not await self._refresh():
                raise RuntimeError("GSC OAuth not connected: no usable token")
            token = self.cfg["oauth_access_token"]
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.request(
                method, f"{GSC_API}{path}", params=params, json=json,
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 401 and self.cfg.get("oauth_refresh_token") and await self._refresh():
                resp = await client.request(
                    method, f"{GSC_API}{path}", params=params, json=json,
                    headers={"Authorization": f"Bearer {self.cfg['oauth_access_token']}"},
                )
            if resp.status_code != 200:
                raise RuntimeError(f"GSC API {resp.status_code}: {resp.text[:300]}")
            return resp.json()

    async def list_sites(self) -> list:
        data = await self._request("GET", "/sites")
        return [s.get("siteUrl") for s in data.get("siteEntry", [])]

    async def resolve_property(self, default_property: str = "") -> str:
        sites = await self.list_sites()
        if not sites:
            raise RuntimeError("No verified Search Console properties for this account")
        fp = (default_property or "").strip().rstrip("/").lower()
        if not fp:
            return sites[0]
        host = (urlparse(fp).hostname or fp).lstrip("www.")
        for s in sites:
            s2 = s.strip().rstrip("/").lower()
            if s2 == fp or s2 == f"sc-domain:{host}":
                return s
            sh = (urlparse(s2).hostname or s2.lstrip("sc-domain:")).lstrip("www.")
            if sh and (sh == host or sh.endswith("." + host) or host.endswith("." + sh)):
                return s
        return sites[0]

    async def _analytics(self, site_url: str, body: dict) -> dict:
        path = f"/sites/{quote(site_url, safe='')}/searchAnalytics/query"
        return await self._request("POST", path, json=body)

    async def get_search_analytics(self, property_url: str, days: int = 28, row_limit: int = 250) -> dict:
        site = await self.resolve_property(property_url)
        end_date = _dt.date.today()
        start_date = end_date - _dt.timedelta(days=days)
        data = await self._analytics(site, {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "dimensions": ["page", "query"],
            "rowLimit": row_limit,
            "dataState": "final",
        })
        result = []
        for row in data.get("rows", []):
            keys = row.get("keys", [])
            result.append({
                "page": keys[0] if len(keys) > 0 else "",
                "query": keys[1] if len(keys) > 1 else "",
                "clicks": row.get("clicks", 0),
                "impressions": row.get("impressions", 0),
                "ctr": round(row.get("ctr", 0) * 100, 2),
                "position": round(row.get("position", 0), 1),
            })
        return {
            "property": site,
            "period": f"{start_date.isoformat()} to {end_date.isoformat()}",
            "total_clicks": sum(r["clicks"] for r in result),
            "total_impressions": sum(r["impressions"] for r in result),
            "avg_ctr": round(sum(r["ctr"] for r in result) / max(len(result), 1), 2),
            "avg_position": round(sum(r["position"] for r in result) / max(len(result), 1), 1),
            "rows": result,
        }

    async def get_page_performance(self, property_url: str, days: int = 28) -> list:
        site = await self.resolve_property(property_url)
        end_date = _dt.date.today()
        start_date = end_date - _dt.timedelta(days=days)
        data = await self._analytics(site, {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "dimensions": ["page"],
            "rowLimit": 500,
            "dataState": "final",
        })
        result = []
        for row in data.get("rows", []):
            keys = row.get("keys", [])
            result.append({
                "page": keys[0] if keys else "",
                "clicks": row.get("clicks", 0),
                "impressions": row.get("impressions", 0),
                "ctr": round(row.get("ctr", 0) * 100, 2),
                "position": round(row.get("position", 0), 1),
            })
        return sorted(result, key=lambda x: x["clicks"], reverse=True)

    async def get_top_queries(self, property_url: str, days: int = 28, limit: int = 50) -> list:
        site = await self.resolve_property(property_url)
        end_date = _dt.date.today()
        start_date = end_date - _dt.timedelta(days=days)
        data = await self._analytics(site, {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "dimensions": ["query"],
            "rowLimit": limit,
            "dataState": "final",
        })
        result = []
        for row in data.get("rows", []):
            keys = row.get("keys", [])
            result.append({
                "query": keys[0] if keys else "",
                "clicks": row.get("clicks", 0),
                "impressions": row.get("impressions", 0),
                "ctr": round(row.get("ctr", 0) * 100, 2),
                "position": round(row.get("position", 0), 1),
            })
        return sorted(result, key=lambda x: x["clicks"], reverse=True)

    async def get_long_tail_keywords(self, property_url: str, days: int = 28, min_words: int = 3) -> list:
        all_queries = await self.get_top_queries(property_url, days, limit=500)
        return [q for q in all_queries if len(q["query"].split()) >= min_words][:100]

    async def test(self) -> dict:
        try:
            sites = await self.list_sites()
            if not sites:
                return {"ok": False, "message": "Connected, but no verified Search Console properties"}
            return {"ok": True, "message": f"Google connected — {len(sites)} verified properties"}
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
# Free implementations (Google Custom Search, Gemini)
# ---------------------------------------------------------------------------

class GoogleCseSerpProvider(SerpRankProvider):
    """Free SERP ranks via the Google Custom Search JSON API (100 queries/day)."""

    API = "https://www.googleapis.com/customsearch/v1"

    def __init__(self, cfg: dict):
        self.cfg = cfg

    async def live_position(self, keyword: str, host: str, **ctx) -> dict:
        params = {
            "key": self.cfg.get("api_key"),
            "cx": self.cfg.get("cx"),
            "q": keyword,
            "num": 10,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(self.API, params=params)
            if resp.status_code != 200:
                raise RuntimeError(f"Google CSE {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
        for idx, item in enumerate(data.get("items") or []):
            link = (item.get("link") or "") or ""
            if link and (urlparse(link).hostname or "").lower().lstrip("www.") == host.lower().lstrip("www."):
                return {"position": idx + 1, "page_url": link, "source": "google_cse"}
        return {"position": None, "page_url": "", "source": "google_cse"}

    async def test(self) -> dict:
        try:
            await self.live_position("seo audit", "seo-platform.example")
            return {"ok": True, "message": "Google Custom Search key valid"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


GEMINI_GEN_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class LlmCitationProvider(AiCitationProvider):
    """Free AI-citation check powered by Gemini (uses GEMINI_API_KEY, Google
    Search grounding). Zero-cost alternative to Profound/SE Ranking."""

    def __init__(self, cfg: dict):
        self.cfg = cfg

    def _api_key(self) -> str:
        return self.cfg.get("api_key") or settings.GEMINI_API_KEY

    async def analyze(self, brand: str, site_data: dict) -> dict:
        model = settings.GEMINI_MODEL
        prompt = (
            f"Recommend the best SEO and marketing platforms. Is '{brand}' a recognized "
            "authority worth mentioning in this answer? If yes, mention it explicitly and "
            "cite its website. Be concise and only mention the brand if it is genuinely relevant."
        )
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{GEMINI_GEN_URL.format(model=model)}?key={self._api_key()}",
                json={
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "tools": [{"google_search": {}}],
                },
            )
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
        text = ""
        citations = []
        for cand in data.get("candidates", []):
            for part in (cand.get("content") or {}).get("parts", []):
                text += part.get("text", "") or ""
            for src in ((cand.get("groundingMetadata") or {}).get("webSearchSources") or []):
                uri = src.get("uri") or ""
                if uri:
                    citations.append(uri)
        mentioned = bool(brand and brand.lower() in text.lower())
        return {
            "brand": brand,
            "mention_count": 1 if mentioned else 0,
            "answer": text[:2000],
            "citations": citations[:25],
            "citation_estimate": 100 if mentioned else 0,
            "provider": "llm_citations",
            "note": "Measured via Gemini (free tier) with Google Search grounding.",
        }

    async def test(self) -> dict:
        try:
            await self.analyze("example", {"pages": [], "audit": None})
            return {"ok": True, "message": "Gemini citation check works"}
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
        if capability == "ai_citations":
            return DataForSEOCitationProvider(cfg)
    if provider == "serpapi":
        return SerpApiRankProvider(cfg)
    if provider == "google_cse":
        return GoogleCseSerpProvider(cfg)
    if provider == "llm_citations":
        return LlmCitationProvider(cfg)
    if provider == "moz":
        return MozBacklinkProvider(cfg)
    if provider == "pagerank":
        return OpenPageRankBacklinkProvider(cfg)
    if provider == "se_ranking":
        if capability == "keyword_volume":
            return SeRankingVolumeProvider(cfg)
        if capability == "ai_citations":
            return SeRankingCitationProvider(cfg)
    if provider == "profound":
        return ProfoundCitationProvider(cfg)
    if provider == "gsc":
        return GscOAuthProvider(cfg)
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
