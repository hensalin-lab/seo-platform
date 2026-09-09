"""Verify the detached crawl watchdog: a wedged crawl task (one that absorbs
cancellation on an await that never resolves) must NOT hold the audit past its
deadline. The watchdog monitors the engine's in-memory page list and lets the
audit salvage a partial result the moment the crawl stops making progress,
instead of waiting 26 minutes for the orphan reaper to fail the audit.
"""
import asyncio
import time

from app.api.audit import wait_for_crawl
from app.config import settings


async def _wedged():
    try:
        await asyncio.sleep(3600)
    except asyncio.CancelledError:
        await asyncio.sleep(3600)


async def _quick():
    await asyncio.sleep(0.05)
    return ["salvaged"]


class _FakeEngine:
    def __init__(self, pages):
        self.pages = pages


def test_wedged_crawl_is_salvaged_not_awaited():
    async def scenario():
        engine = _FakeEngine([{"url": "https://x/1"}])
        task = asyncio.create_task(_wedged())
        old_idle = settings.CRAWLER_IDLE_TIMEOUT
        settings.CRAWLER_IDLE_TIMEOUT = 1
        try:
            start = time.monotonic()
            finished = await wait_for_crawl(engine, task, crawl_deadline=3600, idle_cutoff=1.0, poll_interval=0.05)
            elapsed = time.monotonic() - start
            assert finished is False, "wedged crawl must be detected as unfinished"
            assert elapsed < 5, f"watchdog took {elapsed:.1f}s to fire"
            assert engine.pages == [{"url": "https://x/1"}], "partial pages salvageable"
            task.cancel()
        finally:
            settings.CRAWLER_IDLE_TIMEOUT = old_idle
        for _ in range(20):
            await asyncio.sleep(0.05)

    asyncio.run(scenario())


def test_normal_crawl_completion_is_returned():
    async def scenario():
        engine = _FakeEngine([])
        task = asyncio.create_task(_quick())
        finished = await wait_for_crawl(engine, task, crawl_deadline=3600, idle_cutoff=1.0, poll_interval=0.05)
        assert finished is True, "normal crawl must be reported as finished"
        assert await task == ["salvaged"]

    asyncio.run(scenario())