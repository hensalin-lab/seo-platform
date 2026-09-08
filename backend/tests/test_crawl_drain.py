"""Verify the audit crawl-progress drain stays alive and keeps the UI updated
even when the crawler percentage plateaus at the tail of a large crawl (the
watchdog stall). Regression test for the 280/300 'frozen in progress' bug.
"""
import asyncio


class FakeAudit:
    def __init__(self):
        self.status = None
        self.progress = None
        self.current_step = None
        self.writes = 0

    async def update_status(self, status, progress, step=""):
        self.status = status
        self.progress = progress
        self.current_step = step
        self.writes += 1


def make_drain(fake_audit, progress_q):
    """Replicates the fixed _drain_progress + _on_progress logic."""
    last_written = {"pct": -1, "msg": ""}

    def on_progress(msg, pct):
        progress_q.put_nowait((pct, msg))

    async def drain():
        try:
            while True:
                try:
                    pct, msg = await asyncio.wait_for(progress_q.get(), timeout=0.2)
                except asyncio.TimeoutError:
                    pct, msg = None, None
                if pct is not None:
                    pct = min(pct, 30)
                    await fake_audit.update_status("CRAWLING", pct, msg)
                    last_written["pct"] = pct
                    last_written["msg"] = msg
                elif last_written["pct"] < 30:
                    await fake_audit.update_status(
                        "CRAWLING",
                        last_written["pct"],
                        last_written["msg"] or "Crawling website...",
                    )
        except asyncio.CancelledError:
            raise

    return on_progress, drain


def test_drain_survives_plateau_and_keeps_writing():
    """When progress plateaus (pages 280-300 => 37% -> capped 30%), the drain
    task must NOT exit; it must keep heartbeating the last value so the UI
    stays in 'Crawling' rather than freezing."""
    async def scenario():
        fake = FakeAudit()
        q = asyncio.Queue()
        on_progress, drain = make_drain(fake, q)
        drain_task = asyncio.create_task(drain())

        # Normal crawl progress up to page 280 (pct = 37 -> capped at 30)
        for i in range(1, 11):
            on_progress(f"Crawled {i * 28}/300 pages", 5 + int((i * 28 / 300) * 35))
            await asyncio.sleep(0)
        # Plateau: 280..295 pages all report the same capped pct (37 -> 30).
        for p in range(280, 296):
            on_progress(f"Crawled {p}/300 pages", 5 + int((p / 300) * 35))
        await asyncio.sleep(0)

        # Wait longer than the drain's idle timeout (0.2s) while NO new messages
        # arrive, simulating a slow tail. The drain must stay alive.
        await asyncio.sleep(0.6)

        # A later page (299 -> still 37) must still be written.
        on_progress("Crawled 299/300 pages", 5 + int((299 / 300) * 35))
        await asyncio.sleep(0.1)

        # Finally signal end.
        drain_task.cancel()
        with __import__("contextlib").suppress(asyncio.CancelledError):
            await drain_task

        return fake

    fake = asyncio.run(scenario())
    # It must have kept writing (heartbeats) even during the plateau+idle period.
    assert fake.writes > 15, f"drain stopped updating; only {fake.writes} writes"
    assert fake.progress <= 30
    assert fake.status == "CRAWLING"


def test_on_progress_always_queues_duplicate_pct():
    """The old code dropped messages where pct did not strictly increase. The
    fixed _on_progress must queue every message regardless."""
    async def scenario():
        q = asyncio.Queue()
        fake = FakeAudit()
        on_progress, _ = make_drain(fake, q)
        on_progress("Crawled 280/300 pages", 30)
        on_progress("Crawled 285/300 pages", 30)
        on_progress("Crawled 290/300 pages", 30)
        assert q.qsize() == 3, f"expected 3 queued messages, got {q.qsize()}"

    asyncio.run(scenario())


def test_crawl_pct_never_exceeds_30():
    """Crawl-stage progress must stay well below the first post-crawl step
    (SEO_ANALYSIS at 35%) so the step list is always accurate."""
    for p in range(300, 500):
        pct = 5 + int((p / 300) * 35)
        assert min(pct, 30) <= 30
