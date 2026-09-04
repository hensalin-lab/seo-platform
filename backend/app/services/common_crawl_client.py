"""Common Crawl backlink client — free, no API key required.

Queries the Common Crawl Index API to find pages across the web that
reference a target domain, then fetches outbound <a href> tags from
the WARC files to extract backlinks with anchor text and rel attributes.

Rate-limited to ~1 request / 4 seconds. Results are cached per domain
for 30 days in the database (via backlink_ingestion.py).
"""
import asyncio
import gzip
import logging
import re
import time
import zlib
from typing import Optional
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

CC_INDEX_URL = "https://index.commoncrawl.org/CC-MAIN-2025-08-index"
CC_S3_PREFIX = "https://data.commoncrawl.org"
LINK_PATTERN = re.compile(
    r'<a\s[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
    re.IGNORECASE | re.DOTALL,
)
REL_NOFOLLOW = re.compile(r'rel=["\'][^"\']*nofollow[^"\']*["\']', re.IGNORECASE)

# Max pages of index results to scan per domain (each page = 100 results)
MAX_INDEX_PAGES = 3
# This is fixed at the last known crawl below the current date, so it
# generally still resolves; note the public index is shared and often
# returns 502/503 under load, so we retry transient failures.
CC_INDEX_RETRIES = 3
CC_INDEX_RETRY_DELAY = 3.0
# WARC fetch resilience (the public S3 + DNS can flake under load)
WARC_FETCH_RETRIES = 3
WARC_RETRY_DELAY = 2.0
# Delay between requests to the public Common Crawl index
REQUEST_DELAY = 4.0
# Timeout for HTTP requests
HTTP_TIMEOUT = 60


async def query_common_crawl_index(
    domain: str,
    max_pages: int = MAX_INDEX_PAGES,
) -> list[dict]:
    """Query the Common Crawl Index API for pages mentioning `domain`.

    Returns a list of dicts: {url, offset, length, filename, status}.
    Each dict represents a WARC record that contains a reference to the domain.
    """
    url_pattern = f"*.{domain}"
    results: list[dict] = []

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        for page_num in range(max_pages):
            for attempt in range(CC_INDEX_RETRIES):
                try:
                    resp = await client.get(
                        CC_INDEX_URL,
                        params={
                            "url": url_pattern,
                            "output": "json",
                            "page": page_num,
                        },
                    )
                    if resp.status_code in (502, 503) and attempt + 1 < CC_INDEX_RETRIES:
                        logger.warning(
                            f"Common Crawl index HTTP {resp.status_code}, retrying {attempt + 1}/{CC_INDEX_RETRIES}"
                        )
                        await asyncio.sleep(CC_INDEX_RETRY_DELAY * (attempt + 1))
                        continue
                    if resp.status_code in (502, 503):
                        logger.warning(f"Common Crawl index unavailable (HTTP {resp.status_code})")
                        break
                    if resp.status_code == 404:
                        logger.info(f"Common Crawl index: no more pages for {domain} at page {page_num}")
                        return results
                    if resp.status_code == 429:
                        logger.warning(f"Common Crawl index: rate limited, backing off 30s")
                        await asyncio.sleep(30)
                        continue
                    if resp.status_code != 200:
                        logger.warning(f"Common Crawl index: HTTP {resp.status_code} for {domain} page {page_num}")
                        break
                    break
                except httpx.TimeoutException:
                    logger.warning(f"Common Crawl index timeout for {domain} page {page_num}")
                    if attempt + 1 < CC_INDEX_RETRIES:
                        await asyncio.sleep(CC_INDEX_RETRY_DELAY * (attempt + 1))
                        continue
                    break
                except Exception as e:
                    logger.error(f"Common Crawl index error for {domain} page {page_num}: {e}")
                    break

            if resp.status_code not in (200,):
                continue

            lines = resp.text.strip().split("\n")
            if not lines:
                break

            for line in lines:
                try:
                    import json
                    record = json.loads(line)
                    results.append({
                        "url": record.get("url", ""),
                        "offset": int(record.get("offset", 0)),
                        "length": int(record.get("length", 0)),
                        "filename": record.get("filename", ""),
                        "status": record.get("status", ""),
                    })
                except (json.JSONDecodeError, ValueError):
                    continue

            await asyncio.sleep(REQUEST_DELAY)

    logger.info(f"Common Crawl index: found {len(results)} WARC records for {domain}")
    return results


def _decompress_warc(data: bytes) -> bytes:
    """Decompress a WARC byte-range.

    CC WARC segments are stored gzip-compressed. The CDX offset/length point
    at the compressed record within the segment, so the fetched range is a
    gzip stream (possibly spanning one or more concatenated members). We try
    full gzip.decompress first, then a progressive zlib stream that tolerates
    a truncated tail (the common case for a byte-range that cuts a member).
    """
    if data[:2] != b"\x1f\x8b":
        return data
    try:
        return gzip.decompress(data)
    except Exception:
        pass
    try:
        d = zlib.decompressobj(31)
        out = d.decompress(data)
        return out
    except Exception as e:
        logger.debug(f"WARC gzip decompress failed: {e}")
        return b""


async def fetch_warc_links(
    client: httpx.AsyncClient,
    filename: str,
    offset: int,
    length: int,
    target_domain: str,
) -> list[dict]:
    """Fetch a byte-range from a WARC file on S3 and extract outbound links.

    Returns a list of dicts: {source_url, anchor_text, is_nofollow}.
    Only returns links that point at the target domain.

    Uses a shared `client` (caller-owned) so DNS/connections are reused —
    creating a fresh AsyncClient per record causes intermittent
    `getaddrinfo` failures under concurrency.
    """
    end_offset = offset + length - 1
    byte_range = f"bytes={offset}-{end_offset}"
    url = f"{CC_S3_PREFIX}{filename}"
    links = []

    for attempt in range(WARC_FETCH_RETRIES):
        try:
            resp = await client.get(url, headers={"Range": byte_range})
        except (httpx.TimeoutException, httpx.ConnectError, OSError):
            if attempt + 1 < WARC_FETCH_RETRIES:
                await asyncio.sleep(WARC_RETRY_DELAY * (attempt + 1))
                continue
            return []
        if resp.status_code not in (200, 206):
            logger.warning(f"WARC fetch failed: HTTP {resp.status_code} for {filename}")
            return []
        break

    content_bytes = _decompress_warc(resp.content)[:500_000]  # cap at 500KB per record
    try:
        content = content_bytes.decode("utf-8", "replace")
    except Exception:
        content = ""

    for match in LINK_PATTERN.finditer(content):
        href = match.group(1)
        inner_html = match.group(2)
        is_nofollow = bool(REL_NOFOLLOW.search(match.group(0)))

        try:
            parsed_href = urlparse(href)
            href_domain = (parsed_href.netloc or "").lower().lstrip("www.")
            if href_domain == target_domain.lower().lstrip("www."):
                anchor_text = re.sub(r"<[^>]+>", "", inner_html).strip()[:200]
                links.append({
                    "source_url": href[:500],
                    "anchor_text": anchor_text,
                    "is_nofollow": is_nofollow,
                })
        except Exception:
            continue

    return links


async def get_backlinks_for_domain(
    domain: str,
    max_index_pages: int = MAX_INDEX_PAGES,
) -> list[dict]:
    """Full pipeline: query Common Crawl index, then fetch links from WARC files.

    Returns a deduplicated list of backlinks:
    [{source_url, source_domain, anchor_text, is_nofollow}, ...]
    """
    domain = domain.lower().strip().lstrip("www.")
    records = await query_common_crawl_index(domain, max_index_pages)

    if not records:
        logger.info(f"No Common Crawl records found for {domain}")
        return []

    seen = set()
    backlinks = []
    # Limit WARC fetches to keep runtime reasonable
    max_fetches = min(len(records), 50)

    # Use a single shared AsyncClient for all WARC fetches (connection + DNS
    # reuse). Keep concurrency low (2) — parallel DNS lookups for new hosts
    # intermittently fail with `getaddrinfo` errors on the public CC S3.
    sem = asyncio.Semaphore(2)

    async def _fetch(record: dict) -> list:
        async with sem:
            return await fetch_warc_links(
                client, record["filename"], int(record["offset"]),
                int(record["length"]), domain,
            )

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        for i in range(0, max_fetches, 5):
            batch = records[i:i + 5]
            tasks = [_fetch(r) for r in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in batch_results:
                if isinstance(result, Exception):
                    logger.warning(f"WARC link fetch failed: {result}")
                    continue
                for link in result:
                    key = (link["source_url"], link["anchor_text"])
                    if key not in seen:
                        seen.add(key)
                        try:
                            source_domain = (urlparse(link["source_url"]).netloc or "").lower().lstrip("www.")
                        except Exception:
                            source_domain = ""
                        backlinks.append({
                            "source_url": link["source_url"],
                            "source_domain": source_domain,
                            "anchor_text": link["anchor_text"],
                            "is_nofollow": link["is_nofollow"],
                        })

            if i + 5 < max_fetches:
                await asyncio.sleep(REQUEST_DELAY)

    logger.info(f"Common Crawl: extracted {len(backlinks)} unique backlinks for {domain}")
    return backlinks
