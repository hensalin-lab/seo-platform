"""MCP (Model Context Protocol) server for OpenSEO-style agent access.

Exposes the platform's SEO data capabilities as MCP tools that any MCP
client (Claude Desktop, Cursor, etc.) can call: keyword volume, SERP ranks,
backlinks, AI citations, free data lookups and full site audits.

The endpoint is mounted into the FastAPI app at ``/api/mcp`` using the
Streamable HTTP transport. If the ``mcp`` package is unavailable the server
degrades gracefully (``mcp_app`` returns ``None``) so the rest of the API
still boots.
"""
from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)

try:  # pragma: no cover - guarded import
    from mcp.server.mcpserver import MCPServer

    _MCP_AVAILABLE = True
except Exception as e:  # pragma: no cover
    logger.warning(f"MCP server unavailable: {e}")
    _MCP_AVAILABLE = False
    MCPServer = None

from app.engine.providers import (
    get_user_provider_config,
    resolve_for_capability,
)

from app.database import async_session

# ---------------------------------------------------------------------------
# Tool implementations (keep them thin; delegate to existing engines)
# ---------------------------------------------------------------------------


async def _user_provider_config(user_id: str | None = None) -> dict:
    """Load the user's per-user provider config, or env defaults."""
    if user_id:
        try:
            async with async_session() as db:
                return await get_user_provider_config(db, user_id)
        except Exception as e:
            logger.warning(f"Provider config load failed for {user_id}: {e}")
    return {}


def _provider_cfg(provider: str, user_config: dict) -> dict:
    """Extract one provider's flat config from the full {provider: config} dict."""
    if isinstance(user_config, dict):
        cfg = user_config.get(provider)
        if isinstance(cfg, dict):
            return cfg
    return {}


# ---------------------------------------------------------------------------
# Register tools
# ---------------------------------------------------------------------------


def _build_mcp_server() -> "MCPServer":
    server = MCPServer(
        name="rankiq-seo",
        title="RankIQ SEO Intelligence MCP Server",
        description=(
            "OpenSEO-style MCP server for the RankIQ SEO platform. Call SEO "
            "data tools: keyword volume, SERP positions, backlinks, AI/LLM "
            "citations, free domain lookups and full site audits. Uses the "
            "platform's configured providers (DataForSEO, SerpAPI, Moz, etc.) "
            "with keyless fallbacks."
        ),
        version="1.0.0",
    )

    @server.tool()
    async def keyword_volume(keyword: str, user_id: str | None = None) -> str:
        """Get estimated search volume and keyword ideas for a keyword.

        Args:
            keyword: The search term to look up.
            user_id: Optional platform user id whose provider keys to use.
        """
        try:
            from app.engine.providers import build_provider as bp

            user_config = await _user_provider_config(user_id)
            chosen = resolve_for_capability("keyword_volume", user_config)
            provider = bp("keyword_volume", chosen["provider"], _provider_cfg(chosen["provider"], user_config))
            data = await provider.get_volume(keyword)
            return json.dumps({"provider": chosen["provider"], **data}, default=str)
        except Exception as e:
            logger.warning(f"keyword_volume failed: {e}")
            return json.dumps({"error": str(e)})

    @server.tool()
    async def serp_position(keyword: str, host: str, user_id: str | None = None) -> str:
        """Get the live SERP position (rank) for a keyword on a given host.

        Args:
            keyword: The search term.
            host: Domain to check ranking for, e.g. example.com.
            user_id: Optional platform user id whose provider keys to use.
        """
        try:
            from app.engine.providers import build_provider as bp

            user_config = await _user_provider_config(user_id)
            chosen = resolve_for_capability("serp_ranks", user_config)
            provider = bp("serp_ranks", chosen["provider"], _provider_cfg(chosen["provider"], user_config))
            data = await provider.live_position(keyword, host)
            return json.dumps({"provider": chosen["provider"], **data}, default=str)
        except Exception as e:
            logger.warning(f"serp_position failed: {e}")
            return json.dumps({"error": str(e)})

    @server.tool()
    async def backlink_summary(target: str, user_id: str | None = None) -> str:
        """Get backlink profile summary (referring domains, total backlinks) for a target.

        Args:
            target: Domain to analyze, e.g. example.com.
            user_id: Optional platform user id whose provider keys to use.
        """
        try:
            from app.engine.providers import build_provider as bp

            user_config = await _user_provider_config(user_id)
            chosen = resolve_for_capability("backlinks", user_config)
            provider = bp("backlinks", chosen["provider"], _provider_cfg(chosen["provider"], user_config))
            data = await provider.summary(target)
            return json.dumps({"provider": chosen["provider"], **data}, default=str)
        except Exception as e:
            logger.warning(f"backlink_summary failed: {e}")
            return json.dumps({"error": str(e)})

    @server.tool()
    async def ai_citations(brand: str, site_url: str = "", user_id: str | None = None) -> str:
        """Check AI/LLM (ChatGPT, Perplexity, etc.) citations/mentions for a brand.

        Args:
            brand: Company or brand name to check.
            site_url: Optional site URL context.
            user_id: Optional platform user id whose provider keys to use.
        """
        try:
            from app.engine.providers import build_provider as bp

            user_config = await _user_provider_config(user_id)
            chosen = resolve_for_capability("ai_citations", user_config)
            provider = bp("ai_citations", chosen["provider"], _provider_cfg(chosen["provider"], user_config))
            data = await provider.analyze(brand, {"url": site_url})
            return json.dumps({"provider": chosen["provider"], **data}, default=str)
        except Exception as e:
            logger.warning(f"ai_citations failed: {e}")
            return json.dumps({"error": str(e)})

    @server.tool()
    async def free_site_checks(url: str) -> str:
        """Run free, keyless site checks (robots.txt, sitemap, headers, https).

        Args:
            url: Full URL including scheme, e.g. https://example.com.
        """
        try:
            from app.engine.free_data import site_checks

            data = await site_checks(url)
            return json.dumps({"provider": "keyless", **data}, default=str)
        except Exception as e:
            logger.warning(f"free_site_checks failed: {e}")
            return json.dumps({"error": str(e)})

    @server.tool()
    async def free_autocomplete(q: str) -> str:
        """Get Google autocomplete suggestions for a query (keyless).

        Args:
            q: The search query prefix.
        """
        try:
            from app.engine.free_data import google_autocomplete

            data = await google_autocomplete(q)
            return json.dumps({"provider": "keyless", "suggestions": data}, default=str)
        except Exception as e:
            logger.warning(f"free_autocomplete failed: {e}")
            return json.dumps({"error": str(e)})

    @server.tool()
    async def free_whois(url: str) -> str:
        """Get WHOIS registration data for a domain (keyless, RDAP).

        Args:
            url: Domain or URL, e.g. example.com.
        """
        try:
            from app.engine.free_data import rdap_whois

            data = await rdap_whois(url)
            return json.dumps({"provider": "keyless", **data}, default=str)
        except Exception as e:
            logger.warning(f"free_whois failed: {e}")
            return json.dumps({"error": str(e)})

    @server.tool()
    async def free_dns(url: str) -> str:
        """Resolve DNS records for a domain (keyless, DoH).

        Args:
            url: Domain to resolve, e.g. example.com.
        """
        try:
            from app.engine.free_data import dns_over_https

            data = await dns_over_https(url)
            return json.dumps({"provider": "keyless", **data}, default=str)
        except Exception as e:
            logger.warning(f"free_dns failed: {e}")
            return json.dumps({"error": str(e)})

    @server.tool()
    async def free_ssl(url: str) -> str:
        """Get SSL/TLS grade for a domain (keyless, SSL Labs).

        Args:
            url: Domain to grade, e.g. example.com.
        """
        try:
            from app.engine.free_data import ssl_labs_grade

            data = await ssl_labs_grade(url)
            return json.dumps({"provider": "keyless", **data}, default=str)
        except Exception as e:
            logger.warning(f"free_ssl failed: {e}")
            return json.dumps({"error": str(e)})

    @server.tool()
    async def audit_website(website_url: str, competitor_url: str = "") -> str:
        """Start a full SEO audit of a website (returns an audit id; the audit
        runs in the background and results are available via the platform).

        Args:
            website_url: The site to audit, e.g. https://example.com.
            competitor_url: Optional competitor URL to compare against.
        """
        try:
            from app.models import Audit, AuditStatus
            from app.api.audit import run_audit_task
            from app.database import async_session as session

            async with session() as db:
                audit = Audit(
                    website_url=website_url.rstrip("/"),
                    competitor_url=competitor_url.rstrip("/") if competitor_url else None,
                    status=AuditStatus.QUEUED.value,
                    progress=0,
                    user_id=None,
                )
                db.add(audit)
                await db.flush()
                await db.commit()
                await db.refresh(audit)
                audit_id = audit.id
            import asyncio

            asyncio.create_task(run_audit_task(audit_id))
            return json.dumps(
                {"audit_id": audit_id, "status": "queued", "website_url": website_url}, default=str
            )
        except Exception as e:
            logger.warning(f"audit_website failed: {e}")
            return json.dumps({"error": str(e)})

    @server.tool()
    async def apply_issue_fix(audit_id: str, issue_id: str) -> str:
        """Generate ready-to-copy fix snippets (schema JSON-LD, meta tags,
        headings, llms.txt) for a specific audit issue.

        Args:
            audit_id: The audit id the issue belongs to.
            issue_id: The issue id to generate a fix for.
        """
        try:
            from sqlalchemy import select
            from app.database import async_session as session
            from app.models import Audit, Issue, Page
            from app.api.apply_fix import _schema_fix, _meta_fix, _heading_fix, _robots_fix, _text_fix, _brand

            async with session() as db:
                audit = (await db.execute(select(Audit).where(Audit.id == audit_id))).scalar_one_or_none()
                if not audit:
                    return json.dumps({"error": "Audit not found"})
                issue = (await db.execute(
                    select(Issue).where(Issue.id == issue_id, Issue.audit_id == audit_id)
                )).scalar_one_or_none()
                if not issue:
                    return json.dumps({"error": "Issue not found for audit"})
                page = None
                if issue.page_url:
                    page = (await db.execute(
                        select(Page).where(Page.audit_id == audit_id, Page.url == issue.page_url)
                    )).scalar_one_or_none()

            brand = _brand(audit.website_url or "")
            cat = (issue.category or "") + " " + (issue.signal_name or "")
            fixes = []
            if any(k in cat.lower() for k in ("schema", "structured", "json-ld", "jsonld", "faq", "rich")):
                fixes.append(_schema_fix(cat, issue.page_url or "", audit.website_url or ""))
            if any(k in cat.lower() for k in ("title", "meta", "description", "snippet")):
                fixes.append(_meta_fix(cat, page, brand))
            if any(k in cat.lower() for k in ("heading", "h1", "h2", "h3", "structure")):
                fixes.append(_heading_fix(page, brand))
            if any(k in cat.lower() for k in ("robots", "llms", "crawl")):
                fixes.append(_robots_fix(audit))
            if any(k in cat.lower() for k in ("content", "e-e-a-t", "eeat", "thin", "depth", "keyword", "word")):
                fixes.append(_text_fix(issue, brand))
            if not fixes:
                fixes = [
                    _schema_fix(cat, issue.page_url or "", audit.website_url or ""),
                    _meta_fix(cat, page, brand),
                    _heading_fix(page, brand),
                ]
            return json.dumps({"issue_id": issue_id, "signal": issue.signal_name, "fix_snippets": fixes}, default=str)
        except Exception as e:
            logger.warning(f"apply_issue_fix failed: {e}")
            return json.dumps({"error": str(e)})

    @server.tool()
    async def providers_status() -> str:
        """List configured SEO data providers and their capabilities."""
        try:
            from app.engine.providers import full_status

            data = full_status()
            out = [
                {"name": p["name"], "label": p["label"], "capabilities": p["capabilities"], "configured": p["configured"]}
                for p in data
            ]
            return json.dumps({"providers": out}, default=str)
        except Exception as e:
            logger.warning(f"providers_status failed: {e}")
            return json.dumps({"error": str(e)})

    return server


def _build_mcp_app():
    """Build (asgi_app, session_manager) where session_manager.run() is the
    async context manager a Starlette lifespan must drive. Returns (None, None)
    if the mcp package is unavailable."""
    if not _MCP_AVAILABLE:
        return None, None
    try:
        from mcp.server.streamable_http_manager import StreamableHTTPASGIApp
        from mcp.server.transport_security import TransportSecuritySettings

        server = _build_mcp_server()
        lowlevel = server._lowlevel_server
        # Trigger lazy creation of the low-level session manager. Pass an explicit
        # transport_security that disables DNS-rebinding host checks: the platform
        # is reached through its own domain/proxy in production, so restricting to
        # "127.0.0.1" would wrongly reject real Host headers.
        lowlevel.streamable_http_app(
            streamable_http_path="/",
            json_response=True,
            transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
        )
        session_manager = lowlevel.session_manager
        asgi_app = StreamableHTTPASGIApp(session_manager)
        return asgi_app, session_manager
    except Exception as e:  # pragma: no cover
        logger.warning(f"MCP app build failed: {e}")
        return None, None


# Lazy singleton built at import/mount time.
_server, _mcp_app, _mcp_session = None, None, None


def get_mcp_app():
    """Return the ASGI app to mount at /mcp, or None if mcp is unavailable."""
    global _server, _mcp_app, _mcp_session
    if _mcp_app is None and _MCP_AVAILABLE:
        _mcp_app, _mcp_session = _build_mcp_app()
    return _mcp_app


def get_mcp_session_manager():
    """Return the session manager whose run() a Starlette lifespan must drive.
    Returns None if mcp is unavailable."""
    global _mcp_app, _mcp_session
    if _mcp_app is None and _MCP_AVAILABLE:
        _mcp_app, _mcp_session = _build_mcp_app()
    return _mcp_session
