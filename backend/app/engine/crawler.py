import asyncio
import hashlib
import logging
import time
import random
import re
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
from typing import Optional

import httpx
from bs4 import BeautifulSoup
import tldextract

from app.config import settings

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
]

HTML_CONTENT_TYPES = ("text/html", "application/xhtml+xml", "application/xhtml", "text/plain")


def _collapse_duplicate_lines(text: str) -> str:
    """Drop immediately-repeated lines (>12 chars). Marquee/animation widgets
    render the same tagline 2-3x in the DOM, which inflated word counts and
    made 'current text' excerpts look duplicated."""
    out = []
    prev = ""
    for ln in (text or "").splitlines():
        s = ln.strip()
        if len(s) > 12 and s == prev:
            continue
        out.append(s)
        prev = s
    return "\n".join(out)


def _detect_js_framework(html: str) -> str:
    """Best-effort client-side framework detection from raw HTML."""
    if not html:
        return "none"
    markers = {
        "next.js": ["__NEXT_DATA__", "/_next/", "data-next-head"],
        "nuxt": ["__NUXT__", "data-v-app"],
        "vue": ["data-v-", "__VUE__", "vue@"],
        "react": ["data-reactroot", "data-reactid", "react@", "react-dom"],
        "angular": ["ng-version", "ng-app", "ng-controller"],
        "gatsby": ["___gatsby", "gatsby-"],
        "svelte": ["__svelte", "svelte-hmr"],
        "astro": ["data-astro-", "astro-island"],
        "remix": ["__remixContext"],
    }
    lowered = html.lower()
    for name, patterns in markers.items():
        if any(p.lower() in lowered for p in patterns):
            return name
    return "none"


def _has_hydration_marker(html: str) -> bool:
    if not html:
        return False
    lowered = html.lower()
    markers = ("__next_data__", "__nuxt__", "data-reactroot", "ng-version", "___gatsby", "__remixcontext", 'id="root"', 'id="app"', "data-server-rendered", "window.__")
    return any(m in lowered for m in markers)


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
        self.rendered_with_js: bool = False


class CrawlerEngine:
    def __init__(self):
        self.visited: set = set()
        self.pages: list[PageData] = []
        self.crawl_diagnostics: list[str] = []
        self._semaphore = asyncio.Semaphore(settings.CRAWLER_CONCURRENCY)
        self._client: Optional[httpx.AsyncClient] = None
        self._robot_parsers: dict[str, RobotFileParser] = {}
        self._robots_cache: dict[str, Optional[RobotFileParser]] = {}
        self._last_request_time: float = 0.0

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(settings.CRAWLER_TIMEOUT),
                follow_redirects=True,
                headers={"User-Agent": settings.CRAWLER_USER_AGENT},
                verify=settings.CRAWLER_VERIFY_SSL,
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _next_user_agent(self) -> str:
        return random.choice(USER_AGENTS)

    async def _respect_polite_delay(self):
        delay = max(settings.CRAWLER_POLITE_DELAY, 0.05)
        elapsed = time.time() - self._last_request_time
        if elapsed < delay:
            await asyncio.sleep(delay - elapsed)
        self._last_request_time = time.time()

    async def _robots_allowed(self, url: str) -> bool:
        try:
            parsed = urlparse(url)
            domain_key = f"{parsed.scheme}://{parsed.netloc}"
            if domain_key in self._robots_cache:
                rp = self._robots_cache[domain_key]
                if rp is None:
                    return True
                return rp.can_fetch(settings.CRAWLER_USER_AGENT, url)
            rp = None
            robots_url = f"{domain_key}/robots.txt"
            try:
                client = await self._get_client()
                resp = await client.get(robots_url, timeout=8)
                if resp.status_code == 200 and "text/plain" in resp.headers.get("content-type", ""):
                    rp = RobotFileParser()
                    rp.parse(resp.text.splitlines())
            except Exception:
                pass
            self._robots_cache[domain_key] = rp
            if rp is None:
                return True
            return rp.can_fetch(settings.CRAWLER_USER_AGENT, url)
        except Exception:
            return True

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

    async def _fetch_sitemap_urls(self, start_url: str) -> list[str]:
        parsed = urlparse(start_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        candidates = [
            f"{base}/sitemap.xml",
            f"{base}/sitemap_index.xml",
            f"{base}/sitemap-index.xml",
            f"{base}/sitemap/sitemap.xml",
        ]
        client = await self._get_client()
        for sitemap_url in candidates:
            try:
                resp = await client.get(sitemap_url, timeout=10)
                if resp.status_code != 200:
                    continue
                text = resp.text
                if "<urlset" not in text and "<sitemapindex" not in text:
                    continue
                urls = []
                if "<sitemapindex" in text:
                    for loc in re.findall(r"<loc>\s*([^<]+?)\s*</loc>", text):
                        try:
                            sub_resp = await client.get(loc.strip(), timeout=10)
                            if sub_resp.status_code == 200:
                                urls.extend(re.findall(r"<loc>\s*([^<]+?)\s*</loc>", sub_resp.text))
                        except Exception:
                            continue
                else:
                    urls = re.findall(r"<loc>\s*([^<]+?)\s*</loc>", text)
                normalized = []
                seen = set()
                for u in urls:
                    nu = self._normalize_url(u.strip(), base)
                    if nu and self._is_same_domain(nu, start_url) and nu not in seen:
                        seen.add(nu)
                        normalized.append(nu)
                if normalized:
                    logger.info(f"Sitemap seeding: {len(normalized)} URLs from {sitemap_url}")
                    return normalized[: settings.CRAWLER_SITEMAP_MAX_PAGES]
            except Exception:
                continue
        return []

    async def _render_with_js(self, url: str) -> str:
        """Render page with headless Chromium via Playwright. Returns '' if unavailable."""
        if not settings.CRAWLER_JS_RENDER:
            return ""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.warning("Playwright not installed — JS rendering skipped (pip install playwright + playwright install chromium)")
            return ""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
                try:
                    page = await browser.new_page(user_agent=self._next_user_agent())
                    await page.goto(url, wait_until="domcontentloaded", timeout=min(settings.CRAWLER_TIMEOUT * 1000, 25000))
                    await page.wait_for_timeout(2500)
                    html = await page.content()
                    return html
                finally:
                    await browser.close()
        except Exception as e:
            logger.warning(f"JS rendering failed for {url}: {e}")
            return ""

    async def _crawl_page(self, url: str, depth: int, base_url: str, max_pages: int) -> list[str]:
        if url in self.visited or len(self.visited) >= max_pages:
            return []
        if self._is_resource_url(url):
            return []
        if settings.CRAWLER_RESPECT_ROBOTS and not await self._robots_allowed(url):
            logger.debug(f"Skipping disallowed by robots.txt: {url}")
            if len(self.crawl_diagnostics) < 10:
                self.crawl_diagnostics.append(f"Blocked by robots.txt: {url}")
            return []

        async with self._semaphore:
            self.visited.add(url)
            new_urls = []
            try:
                client = await self._get_client()
                await self._respect_polite_delay()
                start = time.time()
                response = await client.get(url, headers={"User-Agent": self._next_user_agent()})
                response_time_ms = int((time.time() - start) * 1000)

                content_type = response.headers.get("content-type", "").lower()
                if response.status_code < 400 and not any(ct in content_type for ct in HTML_CONTENT_TYPES):
                    logger.debug(f"Skipping non-HTML response {url} (Content-Type: {content_type})")
                    if len(self.crawl_diagnostics) < 10:
                        self.crawl_diagnostics.append(f"Non-HTML response ({content_type or 'no content-type'}): {url}")
                    return []

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
                page.html_raw = html[:settings.CRAWLER_HTML_RAW_LIMIT]
                page.headers_response = {k: v for k, v in response.headers.items()}
                page.signals = {
                    "redirect_chain": redirect_chain,
                    "response_status": response.status_code,
                    "response_headers": {
                        k: v for k, v in response.headers.items()
                        if k.lower() in ("content-type", "server", "x-robots-tag", "cache-control", "content-encoding", "x-redirect-by", "location", "link")
                    },
                    "scheme": "https" if url.startswith("https") else "http",
                    "http_version": getattr(response, "http_version", ""),
                    "rendered_with_js": False,
                    "hreflang_tags": [],
                    "language": "",
                    "has_viewport": bool(re.search(r'<meta[^>]*name=["\']viewport["\']', html, re.I)),
                    "js_signals": {},
                }

                if settings.CRAWLER_JS_RENDER and response.status_code == 200:
                    rendered = await self._render_with_js(url)
                    if rendered and len(rendered) > len(html) * 1.1:
                        page.rendered_with_js = True
                        html = rendered
                        page.html_raw = rendered[:settings.CRAWLER_HTML_RAW_LIMIT]

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
                        raw_text = body.get_text(separator="\n", strip=True)
                        cleaned = _collapse_duplicate_lines(raw_text)
                        page.content_text = re.sub(r"\s*\n\s*", " ", cleaned)[:settings.CRAWLER_CONTENT_LIMIT]
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

                    # ---- Enrichment signals: hreflang, language, JS dependency ----
                    html_tag = soup.find("html")
                    if html_tag and html_tag.get("lang"):
                        page.signals["language"] = html_tag.get("lang", "")[:20]
                    hreflang_tags = []
                    for link in soup.find_all("link", rel="alternate"):
                        hl = link.get("hreflang") or ""
                        href = link.get("href") or ""
                        if hl and href:
                            hreflang_tags.append({"hreflang": hl.strip(), "href": href.strip()})
                    xdefault = soup.find("link", attrs={"rel": "alternate", "hreflang": "x-default"})
                    if hreflang_tags:
                        page.signals["hreflang_tags"] = hreflang_tags
                        page.signals["hreflang_x_default"] = bool(xdefault)
                    script_tags = soup.find_all("script")
                    inline_scripts = [s for s in script_tags if not (s.get("src") or "")]
                    external_scripts = [s for s in script_tags if s.get("src")]
                    raw_html = page.html_raw or ""
                    page.signals["js_signals"] = {
                        "script_count": len(script_tags),
                        "external_scripts": len(external_scripts),
                        "inline_scripts": len(inline_scripts),
                        "content_empty_with_js": page.word_count == 0 and len(script_tags) > 0,
                        "framework": _detect_js_framework(raw_html),
                        "hydration_marker": _has_hydration_marker(raw_html),
                        "inline_handler_count": len(re.findall(r"\son\w+=", raw_html)),
                    }
                    if page.rendered_with_js:
                        page.signals["rendered_with_js"] = True

                    if response.status_code == 200 and depth < settings.CRAWLER_MAX_DEPTH:
                        for link in page.links_internal:
                            link_url = link["url"]
                            if link_url not in self.visited:
                                new_urls.append(link_url)

                self.pages.append(page)

            except httpx.TimeoutException:
                if len(self.crawl_diagnostics) < 10:
                    self.crawl_diagnostics.append(f"Timed out: {url}")
                page = PageData()
                page.url = url
                page.status_code = 0
                self.pages.append(page)
            except Exception as e:
                logger.warning(f"Crawl error {url}: {e}")
                if len(self.crawl_diagnostics) < 10:
                    self.crawl_diagnostics.append(f"{type(e).__name__}: {url} ({e})")

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
        crawl_start = time.time()

        if settings.CRAWLER_SITEMAP_SEEDING:
            try:
                sitemap_urls = await self._fetch_sitemap_urls(start_url)
                for su in sitemap_urls[: max_pages - 1]:
                    if su not in self.visited:
                        queue.append((su, 0))
                if sitemap_urls and on_progress:
                    on_progress(f"Sitemap found: {len(sitemap_urls)} URLs", 10)
            except Exception as e:
                logger.warning(f"Sitemap seeding failed: {e}")

        while queue and len(self.visited) < max_pages:
            if time.time() - crawl_start > settings.CRAWLER_CRAWL_TIMEOUT:
                logger.warning(f"Crawl timed out after {settings.CRAWLER_CRAWL_TIMEOUT}s ({len(self.pages)} pages)")
                break
            batch = []
            while queue and len(batch) < settings.CRAWLER_CONCURRENCY:
                url, depth = queue.pop(0)
                if url not in self.visited:
                    batch.append((url, depth))

            if not batch:
                break

            tasks = [self._crawl_page(url, depth, base_url, max_pages) for url, depth in batch]
            results = await asyncio.gather(*[
                asyncio.wait_for(t, timeout=settings.CRAWLER_PAGE_TIMEOUT)
                for t in tasks
            ], return_exceptions=True)

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

    def get_diagnostics(self) -> list[str]:
        return list(self.crawl_diagnostics)
