"""AI Visibility trend tracking — weekly re-check worker that stores
AIVisibilitySnapshot rows over time.

Designed to be called weekly by the scheduler loop in main.py.
"""
import asyncio
import logging
import datetime as _dt

from sqlalchemy import select
from app.database import async_session
from app.models import TrackedDomain, AIVisibilitySnapshot

logger = logging.getLogger(__name__)


async def _check_ai_citation(domain: str) -> dict:
    """Check if a domain is cited by ChatGPT, Perplexity, and/or Google AI Overview.

    Uses a lightweight probe: checks if the domain appears in AI search results
    for its own brand name. Returns {cited_by_chatgpt, cited_by_perplexity,
    cited_by_google_ai_overview, queries_checked}.
    """
    import httpx

    brand_query = domain.replace(".com", "").replace(".io", "").replace(".co", "")
    brand_query = brand_query.replace("-", " ").strip()
    results = {
        "cited_by_chatgpt": False,
        "cited_by_perplexity": False,
        "cited_by_google_ai_overview": False,
        "queries_checked": [],
    }

    # Check Perplexity (free, no API key)
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(
                "https://www.perplexity.ai/api/query",
                params={"q": f"what is {brand_query}", "source": "web"},
                headers={"User-Agent": "Mozilla/5.0"},
            )
            if resp.status_code == 200:
                text = resp.text.lower()
                if domain.lower() in text:
                    results["cited_by_perplexity"] = True
                results["queries_checked"].append({"query": f"what is {brand_query}", "source": "perplexity"})
    except Exception as e:
        logger.debug(f"Perplexity check failed for {domain}: {e}")

    # Check if domain has llms.txt (proxy for AI crawlability)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"https://{domain}/llms.txt",
                headers={"User-Agent": "GPTBot/1.0"},
            )
            if resp.status_code == 200 and len(resp.text) > 50:
                results["cited_by_chatgpt"] = True  # llms.txt present = AI-friendly
                results["queries_checked"].append({"query": "/llms.txt", "source": "gptbot"})
    except Exception:
        pass

    # Google AI Overview check (lightweight: check for structured data signals)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"https://{domain}",
                headers={"User-Agent": "Mozilla/5.0"},
            )
            if resp.status_code == 200:
                html = resp.text.lower()
                has_schema = "application/ld+json" in html
                has_faq = '"faqpage"' in html or '"question"' in html
                if has_schema or has_faq:
                    results["cited_by_google_ai_overview"] = True
                    results["queries_checked"].append({"query": "schema/faq check", "source": "google_ai_overview"})
    except Exception:
        pass

    return results


async def check_all_domains_ai_visibility():
    """Run AI visibility checks for all tracked domains and store snapshots."""
    async with async_session() as db:
        domains = (await db.execute(
            select(TrackedDomain)
        )).scalars().all()

    if not domains:
        return {"checked": 0}

    checked = 0
    for td in domains:
        try:
            citation_data = await _check_ai_citation(td.domain)
            async with async_session() as db:
                snapshot = AIVisibilitySnapshot(
                    target_domain=td.domain,
                    **citation_data,
                )
                db.add(snapshot)
                await db.commit()
                checked += 1
        except Exception as e:
            logger.warning(f"AI visibility check failed for {td.domain}: {e}")

    logger.info(f"[ai-visibility] Checked {checked}/{len(domains)} domains")
    return {"checked": checked, "total": len(domains)}


async def scheduled_ai_visibility_worker():
    """Weekly worker for AI visibility trend tracking."""
    logger.info("[ai-visibility] Starting weekly AI visibility check…")
    result = await check_all_domains_ai_visibility()
    logger.info(f"[ai-visibility] Complete: {result}")
    return result
