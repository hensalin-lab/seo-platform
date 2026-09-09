"""Verify host quarantine: a page that times out once marks its host as bad and
subsequent URLs on that host are skipped instantly, so a poisoned enclave cannot
collapse crawl throughput at the frontier tail.
"""
import asyncio

import httpx

from app.engine.crawler import CrawlerEngine
from app.config import settings


class _FakeResponse:
    status_code = 200
    text = "<html><title>x</title><body>hi</body></html>"

    def __init__(self):
        self.headers = {"content-type": "text/html"}
        self.history = []
        self.http_version = "HTTP/1.1"


class _FakeClient:
    is_closed = False

    def __init__(self):
        self.hits = []

    async def get(self, url, headers=None, timeout=None):
        self.hits.append(url)
        if url.startswith("https://bad.example"):
            raise httpx.TimeoutException(f"stall: {url}")
        if "/robots.txt" in url:
            resp = _FakeResponse()
            resp.status_code = 404
            resp.text = ""
            return resp
        return _FakeResponse()


def test_timeout_quarantines_host_and_skips_later_urls():
    async def scenario():
        old_robots = settings.CRAWLER_RESPECT_ROBOTS
        settings.CRAWLER_RESPECT_ROBOTS = True
        try:
            engine = CrawlerEngine()
            engine._client = _FakeClient()
            first = await engine._crawl_page("https://bad.example/a", 0, "https://bad.example", 300)
            second = await engine._crawl_page("https://bad.example/b", 0, "https://bad.example", 300)
            assert engine._client.hits.count("https://bad.example/a") == 1
            assert engine._client.hits.count("https://bad.example/b") == 0, "quarantined host must be skipped"
            assert second == []
            assert any("Quarantined host skipped" in d for d in engine.crawl_diagnostics)
            assert engine.pages and engine.pages[0].status_code == 0
            await asyncio.wait_for(engine.close(), timeout=5)
        finally:
            settings.CRAWLER_RESPECT_ROBOTS = old_robots

    asyncio.run(scenario())


def test_healthy_hosts_are_not_quarantined():
    async def scenario():
        old_timeout = settings.CRAWLER_TIMEOUT
        settings.CRAWLER_TIMEOUT = 5
        try:
            engine = CrawlerEngine()
            engine._client = _FakeClient()
            urls = await engine._crawl_page("https://good.example/a", 0, "https://good.example", 300)
            assert "https://good.example/a" in engine._client.hits
            assert engine._quarantined_hosts == set()
            assert engine.pages and engine.pages[0].status_code == 200
            await asyncio.wait_for(engine.close(), timeout=5)
        finally:
            settings.CRAWLER_TIMEOUT = old_timeout

    asyncio.run(scenario())