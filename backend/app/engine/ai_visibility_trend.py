"""AI Visibility trend tracking — weekly re-check worker that stores
AIVisibilitySnapshot rows over time.

Designed to be called weekly by the scheduler loop in main.py.

The stored fields are AI-search READINESS signals, not confirmed citations:
  - ai_crawlable_llms_txt: does the domain publish /llms.txt (GPTBot-accessible)?
  - ai_overview_eligible_schema: does the domain have structured data (JSON-LD
    / FAQ) that makes it eligible to appear in AI Overviews?
  - manually_logged_cited: set by the user after checking ChatGPT/Perplexity/AI
    Overview by hand for their brand query (there is no free reliable
    programmatic citation-checking API, so we do not fake one).
"""
import asyncio
import logging
import datetime as _dt

from sqlalchemy import select
from app.database import async_session
from app.models import TrackedDomain, AIVisibilitySnapshot

logger = logging.getLogger(__name__)


async def _check_ai_citation(domain: str) -> dict:
    """Check a domain's AI-search readiness signals.

    Returns {ai_crawlable_llms_txt, ai_overview_eligible_schema,
    manually_logged_cited, queries_checked}. These are honestly-labeled
    eligibility/crawlability signals, not confirmed citations.
    """
    import httpx

    queries_checked = []

    # Check if domain has llms.txt (AI crawlability signal for GPTBot/ClaudeBot)
    ai_crawlable_llms_txt = False
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"https://{domain}/llms.txt",
                headers={"User-Agent": "GPTBot/1.0"},
            )
            if resp.status_code == 200 and len(resp.text) > 20:
                ai_crawlable_llms_txt = True
                queries_checked.append({"query": "/llms.txt", "source": "gptbot"})
    except Exception:
        pass

    # Check for structured data that makes a page eligible for AI Overviews
    ai_overview_eligible_schema = False
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
                    ai_overview_eligible_schema = True
                    queries_checked.append({"query": "schema/faq check", "source": "google_ai_overview"})
    except Exception:
        pass

    return {
        "ai_crawlable_llms_txt": ai_crawlable_llms_txt,
        "ai_overview_eligible_schema": ai_overview_eligible_schema,
        "manually_logged_cited": False,
        "queries_checked": queries_checked,
    }


async def check_all_domains_ai_visibility():
    """Run AI-search readiness checks for all tracked domains and store snapshots."""
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
    logger.info("[ai-visibility] Starting weekly AI-search readiness check…")
    result = await check_all_domains_ai_visibility()
    logger.info(f"[ai-visibility] Complete: {result}")
    return result
