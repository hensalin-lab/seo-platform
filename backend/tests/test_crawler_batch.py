"""Verify the crawler's bounded batch runner always returns within its budget
even when a page task refuses cancellation. Regression test for the large-site
hang where a sticky page froze the batch gather, the whole crawl, AND the outer
26-minute rescue deadline, leaving audits stuck at 'Crawled N/300 / In progress'
until the orphan reaper failed them.
"""
import asyncio
import time

from app.engine.crawler import CrawlerEngine
from app.config import settings


async def _sticky():
    try:
        await asyncio.sleep(3600)
    except asyncio.CancelledError:
        await asyncio.sleep(3600)


async def _quick():
    await asyncio.sleep(0.05)
    return ["https://example.com/1"]


def test_batch_abandons_sticky_task_and_keeps_results():
    async def scenario():
        engine = CrawlerEngine()
        old = settings.CRAWLER_PAGE_TIMEOUT
        settings.CRAWLER_PAGE_TIMEOUT = 2
        try:
            start = time.monotonic()
            results = await engine._run_batch([_sticky(), _quick()])
            elapsed = time.monotonic() - start
            budget = settings.CRAWLER_PAGE_TIMEOUT + 10
            assert elapsed < budget + 1, f"batch took {elapsed:.1f}s over budget {budget}s"
            assert results[1] == ["https://example.com/1"], "fast task result lost"
            assert results[0] == [], "sticky task should contribute nothing"
            assert any("Stuck page abandoned" in d for d in engine.crawl_diagnostics)
            await asyncio.wait_for(engine.close(), timeout=10)
        finally:
            settings.CRAWLER_PAGE_TIMEOUT = old

    asyncio.run(scenario())


def test_batch_order_matches_input():
    async def scenario():
        engine = CrawlerEngine()
        results = await engine._run_batch([_quick(), _quick()])
        assert results == [["https://example.com/1"], ["https://example.com/1"]]
        await asyncio.wait_for(engine.close(), timeout=10)

    asyncio.run(scenario())