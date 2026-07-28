import asyncio
import hashlib
import logging
import time
from urllib.parse import urljoin, urlparse
from typing import Optional

import httpx
from bs4 import BeautifulSoup
import tldextract

from app.config import settings

logger = logging.getLogger(__name__)


class PageData:
    def __init__(self):
        self.url: str = ""
        self.status_code: int = 0
        self.title: str = ""
        self.meta_description: str = ""
        self.canonical: str = ""
        self.h1: str = ""
        self.headings: list = []
        self.content_text: str = ""
        self.word_count: int = 0
        self.html_raw: str = ""
        self.images: list = []
        self.links_internal: list = []
        self.links_external: list = []
        self.schema_markup: list = []
        self.open_graph: dict = {}
        self.twitter_card: dict = {}
        self.crawl_depth: int = 0
        self.response_time_ms: int = 0
        self.content_hash: str = ""
        self.redirect_chain: list = []
        self.headers_response: dict = {}
        self.is_indexable: bool = True
        self.robots_meta: str = ""
        self.language: str = ""
        self.https: bool = False
        self.page_type: str = ""


class CrawlerEngine:
    def __init__(self):
        self.visited: set = set()
        self.pages: list[PageData] = []
        self._semaphore = asyncio.Semaphore(settings.CRAWLER_CONCURRENCY)
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(settings.CRAWLER_TIMEOUT),
                follow_redirects=True,
                headers={"User-Agent": settings.CRAWLER_USER_AGENT},
                verify=False,
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _normalize_url(self, url: str, base_url: str) -> Optional[str]:
        try:
            full = urljoin(base_url, url)
            parsed = urlparse(full)
            if parsed.scheme not in ("http", "https"):
                return None
            normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            if parsed.query:
                normalized += f"?{parsed.query}"
            return normalized.rstrip("/") or f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            return None

    def _is_same_domain(self, url: str, base_url: str) -> bool:
        try:
            ext = tldextract.extract(url)
            domain = f"{ext.domain}.{ext.suffix}"
            base_ext = tldextract.extract(base_url)
            base = f"{base_ext.domain}.{base_ext.suffix}"
            return domain == base
        except Exception:
            return False

    def _is_resource_url(self, url: str) -> bool:
        skip_ext = (
            ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
            ".pdf", ".doc", ".docx", ".xls", ".xlsx",
            ".zip", ".rar", ".tar", ".gz",
            ".mp3", ".mp4", ".avi", ".mov",
            ".css", ".js", ".woff", ".woff2", ".ttf", ".eot",
        )
        path = urlparse(url).path.lower()
        return any(path.endswith(ext) for ext in skip_ext)

    async def _crawl_page(self, url: str, depth: int, base_url: str, max_pages: int) -> list[str]:
        if url in self.visited or len(self.visited) >= max_pages:
            return []
        if self._is_resource_url(url):
            return []

        async with self._semaphore:
            self.visited.add(url)
            new_urls = []
            try:
                client = await self._get_client()
                start = time.time()
                response = await client.get(url)
                response_time_ms = int((time.time() - start) * 1000)

                redirect_chain = []
                if hasattr(response, "history") and response.history:
                    redirect_chain = [str(r.url) for r in response.history]

                html = response.text if response.status_code < 500 else ""
                page = PageData()
                page.url = url
                page.status_code = response.status_code
                page.response_time_ms = response_time_ms
                page.redirect_chain = redirect_chain
                page.https = url.startswith("https")
                page.html_raw = html[:200000]
                page.headers_response = {k: v for k, v in response.headers.items()}

                if html:
                    soup = BeautifulSoup(html, "html.parser")
                    page.title = (soup.title.string or "").strip() if soup.title else ""

                    meta_desc = soup.find("meta", attrs={"name": "description"})
                    page.meta_description = (meta_desc.get("content", "") or "").strip() if meta_desc else ""

                    canonical = soup.find("link", attrs={"rel": "canonical"})
                    page.canonical = (canonical.get("href", "") or "").strip() if canonical else ""

                    robots_meta = soup.find("meta", attrs={"name": "robots"})
                    page.robots_meta = (robots_meta.get("content", "") or "").strip() if robots_meta else ""
                    if "noindex" in page.robots_meta.lower():
                        page.is_indexable = False

                    h1_tag = soup.find("h1")
                    page.h1 = h1_tag.get_text(strip=True) if h1_tag else ""

                    page.headings = []
                    for level in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                        for tag in soup.find_all(level):
                            text = tag.get_text(strip=True)
                            if text:
                                page.headings.append({"level": level.upper(), "text": text[:200]})

                    import json as _json
                    for script in soup.find_all("script", type="application/ld+json"):
                        try:
                            data = _json.loads(script.string)
                            if isinstance(data, list):
                                page.schema_markup.extend(data)
                            elif isinstance(data, dict):
                                page.schema_markup.append(data)
                        except Exception:
                            pass

                    for tag in soup.find_all("meta", property=True):
                        prop = tag.get("property", "")
                        content = tag.get("content", "")
                        if prop.startswith("og:"):
                            page.open_graph[prop] = content
                    for tag in soup.find_all("meta", attrs={"name": True}):
                        name = tag.get("name", "").lower()
                        if name.startswith("twitter:"):
                            page.twitter_card[name] = tag.get("content", "")

                    body = soup.find("body")
                    if body:
                        for t in body.find_all(["script", "style", "noscript"]):
                            t.decompose()
                        page.content_text = body.get_text(separator=" ", strip=True)
                        page.word_count = len(page.content_text.split())

                    page.images = []
                    for img in soup.find_all("img"):
                        page.images.append({"src": img.get("src", ""), "alt": img.get("alt", ""), "loading": img.get("loading", "")})

                    page.links_internal = []
                    page.links_external = []
                    for a in soup.find_all("a", href=True):
                        href = a.get("href", "").strip()
                        if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
                            continue
                        normalized = self._normalize_url(href, url)
                        if not normalized:
                            continue
                        if self._is_same_domain(normalized, url):
                            page.links_internal.append({"url": normalized, "text": a.get_text(strip=True)[:100]})
                        else:
                            page.links_external.append({"url": normalized, "text": a.get_text(strip=True)[:100]})

                    page.content_hash = hashlib.md5(page.content_text.encode()).hexdigest()

                    if response.status_code == 200 and depth < 4:
                        for link in page.links_internal:
                            link_url = link["url"]
                            if link_url not in self.visited:
                                new_urls.append(link_url)

                self.pages.append(page)

            except httpx.TimeoutException:
                page = PageData()
                page.url = url
                page.status_code = 0
                self.pages.append(page)
            except Exception as e:
                logger.warning(f"Crawl error {url}: {e}")

            return new_urls

    async def crawl(self, start_url: str, max_pages: int = None, on_page=None, on_progress=None) -> list[PageData]:
        max_pages = max_pages or settings.CRAWLER_MAX_PAGES
        self.visited.clear()
        self.pages.clear()

        parsed = urlparse(start_url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"

        logger.info(f"Starting crawl of {start_url} (max {max_pages} pages)")

        if on_progress:
            on_progress("Starting crawler...", 5)

        queue = [(start_url, 0)]
        pages_crawled = 0

        while queue and len(self.visited) < max_pages:
            batch = []
            while queue and len(batch) < settings.CRAWLER_CONCURRENCY:
                url, depth = queue.pop(0)
                if url not in self.visited:
                    batch.append((url, depth))

            if not batch:
                break

            tasks = [self._crawl_page(url, depth, base_url, max_pages) for url, depth in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in results:
                if isinstance(result, list):
                    for new_url in result:
                        queue.append((new_url, depth + 1))

            pages_crawled = len(self.visited)
            if on_progress:
                progress = min(5 + int((pages_crawled / max_pages) * 35), 40)
                on_progress(f"Crawled {pages_crawled}/{max_pages} pages", progress)

            await asyncio.sleep(0.05)

        logger.info(f"Crawl complete: {len(self.pages)} pages")
        return self.pages
