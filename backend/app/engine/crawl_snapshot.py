import hashlib
import json
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)


def _normalize_url(url: str) -> str:
    url = url.strip().rstrip("/")
    url = url.replace("http://", "https://")
    url = url.replace("www.", "", 1) if url.startswith("https://www.") else url
    return url


class CrawlSnapshot:
    __slots__ = (
        "_url", "_normalized_url", "_snapshot_hash", "_timestamp",
        "_title", "_meta_description", "_canonical", "_h1",
        "_content_text", "_word_count", "_html_raw",
        "_headings", "_images", "_links_internal", "_links_external",
        "_schema_markup", "_open_graph", "_twitter_card",
        "_status_code", "_crawl_depth", "_response_time_ms",
        "_content_hash", "_redirect_chain", "_headers_response",
        "_is_indexable", "_robots_meta", "_language", "_https", "_page_type",
        "_all_signals", "_context_issues",
    )

    def __init__(self, page) -> None:
        self._url = str(getattr(page, "url", page.get("url", "") if isinstance(page, dict) else ""))
        self._normalized_url = _normalize_url(self._url)
        self._timestamp = time.time()

        self._title = str(getattr(page, "title", page.get("title", "") if isinstance(page, dict) else "") or "")
        self._meta_description = str(getattr(page, "meta_description", page.get("meta_description", "") if isinstance(page, dict) else "") or "")
        self._canonical = str(getattr(page, "canonical", page.get("canonical", "") if isinstance(page, dict) else "") or "")
        self._h1 = str(getattr(page, "h1", page.get("h1", "") if isinstance(page, dict) else "") or "")
        self._content_text = str(getattr(page, "content_text", page.get("content_text", "") if isinstance(page, dict) else "") or "")
        self._word_count = int(getattr(page, "word_count", page.get("word_count", 0) if isinstance(page, dict) else 0) or 0)
        self._html_raw = str(getattr(page, "html_raw", page.get("html_raw", "") if isinstance(page, dict) else "") or "")
        self._status_code = int(getattr(page, "status_code", page.get("status_code", 200) if isinstance(page, dict) else 200) or 200)
        self._crawl_depth = int(getattr(page, "crawl_depth", page.get("crawl_depth", 0) if isinstance(page, dict) else 0) or 0)
        self._response_time_ms = int(getattr(page, "response_time_ms", page.get("response_time_ms", 0) if isinstance(page, dict) else 0) or 0)
        self._content_hash = str(getattr(page, "content_hash", page.get("content_hash", "") if isinstance(page, dict) else "") or "")
        self._is_indexable = bool(getattr(page, "is_indexable", page.get("is_indexable", True) if isinstance(page, dict) else True))
        self._robots_meta = str(getattr(page, "robots_meta", page.get("robots_meta", "") if isinstance(page, dict) else "") or "")
        self._language = str(getattr(page, "language", page.get("language", "") if isinstance(page, dict) else "") or "")
        self._https = bool(getattr(page, "https", page.get("https", False) if isinstance(page, dict) else False))
        self._page_type = str(getattr(page, "page_type", page.get("page_type", "") if isinstance(page, dict) else "") or "")

        self._redirect_chain = list(getattr(page, "redirect_chain", page.get("redirect_chain", []) if isinstance(page, dict) else []) or [])
        self._headers_response = dict(getattr(page, "headers_response", page.get("headers_response", {}) if isinstance(page, dict) else {}) or {})

        def _safe_list(val):
            if isinstance(val, list):
                return val
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    return []
            return []

        def _safe_dict(val):
            if isinstance(val, dict):
                return val
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    return {}
            return {}

        raw_headings = getattr(page, "headings", page.get("headings", page.get("headers", [])) if isinstance(page, dict) else [])
        self._headings = _safe_list(raw_headings)
        self._images = _safe_list(getattr(page, "images", page.get("images", []) if isinstance(page, dict) else []))
        self._links_internal = _safe_list(getattr(page, "links_internal", page.get("links_internal", []) if isinstance(page, dict) else []))
        self._links_external = _safe_list(getattr(page, "links_external", page.get("links_external", []) if isinstance(page, dict) else []))
        self._schema_markup = _safe_list(getattr(page, "schema_markup", page.get("schema_markup", []) if isinstance(page, dict) else []))
        self._open_graph = _safe_dict(getattr(page, "open_graph", page.get("open_graph", {}) if isinstance(page, dict) else {}))
        self._twitter_card = _safe_dict(getattr(page, "twitter_card", page.get("twitter_card", {}) if isinstance(page, dict) else {}))

        self._all_signals = _safe_list(getattr(page, "signals", page.get("signals", getattr(page, "all_signals", []))) if isinstance(page, dict) else [])
        self._context_issues = _safe_list(getattr(page, "context_issues", page.get("context_issues", []) if isinstance(page, dict) else []))

        raw = json.dumps({
            "url": self._url, "norm": self._normalized_url,
            "title": self._title, "canonical": self._canonical,
            "h1": self._h1, "content_len": len(self._content_text),
            "html_len": len(self._html_raw), "wc": self._word_count,
            "h_count": len(self._headings), "img_count": len(self._images),
            "schema_count": len(self._schema_markup),
            "status": self._status_code,
        }, sort_keys=True)
        self._snapshot_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]

    def get(self, key: str, default: Any = None) -> Any:
        mapping = {
            "url": self._url,
            "normalized_url": self._normalized_url,
            "snapshot_hash": self._snapshot_hash,
            "timestamp": self._timestamp,
            "title": self._title,
            "meta_description": self._meta_description,
            "canonical": self._canonical,
            "h1": self._h1,
            "content_text": self._content_text,
            "word_count": self._word_count,
            "html_raw": self._html_raw,
            "headings": self._headings,
            "images": self._images,
            "links_internal": self._links_internal,
            "links_external": self._links_external,
            "schema_markup": self._schema_markup,
            "open_graph": self._open_graph,
            "twitter_card": self._twitter_card,
            "status_code": self._status_code,
            "crawl_depth": self._crawl_depth,
            "response_time_ms": self._response_time_ms,
            "content_hash": self._content_hash,
            "redirect_chain": self._redirect_chain,
            "headers_response": self._headers_response,
            "is_indexable": self._is_indexable,
            "robots_meta": self._robots_meta,
            "language": self._language,
            "https": self._https,
            "page_type": self._page_type,
            "signals": self._all_signals,
            "all_signals": self._all_signals,
            "context_issues": self._context_issues,
            "headers": self._headings,
            "url_variant": self._normalized_url,
        }
        return mapping.get(key, default)

    def __getitem__(self, key: str) -> Any:
        val = self.get(key)
        if val is None:
            raise KeyError(key)
        return val

    @property
    def url(self) -> str:
        return self._url

    @property
    def normalized_url(self) -> str:
        return self._normalized_url

    @property
    def snapshot_hash(self) -> str:
        return self._snapshot_hash

    @property
    def word_count(self) -> int:
        return self._word_count

    @property
    def content_text(self) -> str:
        return self._content_text

    @property
    def html_raw(self) -> str:
        return self._html_raw

    @property
    def title(self) -> str:
        return self._title

    @property
    def headings(self) -> list:
        return self._headings

    def to_dict(self) -> dict[str, Any]:
        d = {}
        for attr in self.__slots__:
            key = attr.lstrip("_")
            val = getattr(self, attr)
            d[key] = val
        d["snapshot_hash"] = self._snapshot_hash
        d["timestamp"] = self._timestamp
        d["normalized_url"] = self._normalized_url
        return d

    def __getattr__(self, name: str) -> Any:
        _MISSING = object()
        val = self.get(name, _MISSING)
        if val is not _MISSING:
            return val
        raise AttributeError(f"'{type(self).__name__}' has no attribute '{name}'")


def page_to_snapshot(page) -> CrawlSnapshot:
    return CrawlSnapshot(page)


def build_snapshots(pages: list) -> list[CrawlSnapshot]:
    seen: set[str] = set()
    snapshots: list[CrawlSnapshot] = []
    for p in pages:
        snap = CrawlSnapshot(p)
        if snap.normalized_url not in seen:
            seen.add(snap.normalized_url)
            snapshots.append(snap)
    variant_count = len(pages) - len(snapshots)
    if variant_count:
        logger.info(f"Deduplicated {variant_count} URL variants")
    return snapshots
