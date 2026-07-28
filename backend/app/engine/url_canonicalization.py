"""
URL Canonicalization Engine v1.0
Normalizes URLs, detects duplicates, merges pages with same canonical target.
Fixes fake duplicate titles, H1s, canonical issues, and page count inflation.
"""
import logging
import re
from urllib.parse import urlparse, urljoin, urlunparse, parse_qs, urlencode, unquote
from collections import defaultdict

logger = logging.getLogger(__name__)

UTM_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "utm_id", "utm_cid", "gclid", "gclsrc", "fbclid", "mc_cid", "mc_eid",
    "msclkid", "twclid", "li_fat_id", "oly_enc_id", "_hsenc", "_hsmi",
    "ref", "source", "via", "share",
}

TRACKING_PARAMS = {
    "spm", "sc_campaign", "sc_channel", "sc_content", "sc_medium", "sc_outcome",
    "tag", "yclid", "dclid", "gbraid", "wbraid", "_ga", "_gl", "hc_ref",
    "feature", "t", "v", "si", "pp", "pa", "ipp", "si", "xtor", "msclkid",
}


class URLCanonicalizer:
    """Normalize, deduplicate, and merge URLs from crawled pages."""

    def __init__(self):
        self.canonical_map = {}  # normalized_url -> [original_urls]
        self.redirect_map = {}   # original -> final_url
        self.page_groups = {}    # canonical_url -> list of page dicts

    def normalize(self, url: str) -> str:
        """Full normalization pipeline: scheme→lowercase host→strip www→remove fragment→strip utm→strip trailing slash."""
        if not url:
            return url

        parsed = urlparse(url)

        # Lowercase scheme and host
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()

        # Remove www. prefix
        if netloc.startswith("www."):
            netloc = netloc[4:]

        # Remove default ports
        if netloc.endswith(":80") and scheme == "http":
            netloc = netloc[:-3]
        elif netloc.endswith(":443") and scheme == "https":
            netloc = netloc[:-4]

        # Remove fragment
        path = parsed.path or "/"
        fragment = ""

        # Remove trailing slash (except for root)
        if path != "/" and path.endswith("/"):
            path = path.rstrip("/")

        # Decode percent-encoded chars that are safe
        try:
            path = unquote(path)
        except Exception:
            pass

        # Remove UTM and tracking query params
        query_params = parse_qs(parsed.query, keep_blank_values=False)
        clean_params = {}
        for k, v in query_params.items():
            k_lower = k.lower()
            if k_lower not in UTM_PARAMS and k_lower not in TRACKING_PARAMS:
                clean_params[k] = v[0] if len(v) == 1 else v

        # Sort params for consistency
        clean_query = urlencode(clean_params, doseq=True) if clean_params else ""

        # Rebuild
        normalized = urlunparse((scheme, netloc, path, parsed.params, clean_query, fragment))
        return normalized

    def detect_redirects(self, url_chain: list) -> dict:
        """Given a list of URLs from redirect chain, map original to final."""
        if not url_chain or len(url_chain) < 2:
            return {}
        redirects = {}
        for i in range(len(url_chain) - 1):
            redirects[url_chain[i]] = url_chain[i + 1]
            self.redirect_map[url_chain[i]] = url_chain[-1]
        return redirects

    def find_canonical(self, page: dict, all_pages: list) -> str:
        """Determine the canonical URL for a page.

        Priority:
        1. Explicit <link rel="canonical"> if it points to a crawled page
        2. Self-referencing canonical
        3. Redirect target
        4. Normalized URL
        """
        url = page.get("url", "")
        canonical = page.get("canonical", "")
        redirect_target = self.redirect_map.get(url, "")

        # If canonical points to another crawled page
        if canonical:
            norm_canonical = self.normalize(canonical)
            for other in all_pages:
                if self.normalize(other.get("url", "")) == norm_canonical:
                    return norm_canonical

        # If self-referencing canonical
        if canonical and self.normalize(canonical) == self.normalize(url):
            return self.normalize(url)

        # Redirect target
        if redirect_target:
            return self.normalize(redirect_target)

        # Default: normalized self
        return self.normalize(url)

    def deduplicate_pages(self, pages: list) -> dict:
        """Group pages by their canonical URL. Returns {canonical_url: [pages]}."""
        groups = defaultdict(list)

        for page in pages:
            canonical = self.find_canonical(page, pages)
            groups[canonical].append(page)

        self.page_groups = dict(groups)
        return self.page_groups

    def merge_page_data(self, page_group: list) -> dict:
        """Merge multiple pages with same canonical into one best representation.

        Priority: pages with 200 status > pages with more content > first crawled.
        """
        if not page_group:
            return {}

        # Sort by quality: 200 status first, then by word count
        sorted_pages = sorted(
            page_group,
            key=lambda p: (
                1 if p.get("status_code") == 200 else 0,
                p.get("word_count", 0),
                len(p.get("content_text", "")),
            ),
            reverse=True,
        )

        best = sorted_pages[0]

        # Merge signals
        all_urls = [p.get("url", "") for p in page_group]
        status_codes = [p.get("status_code", 0) for p in page_group]
        has_redirects = any(
            self.redirect_map.get(p.get("url", "")) for p in page_group
        )

        merged = {
            **best,
            "merged_from": all_urls,
            "merged_count": len(page_group),
            "has_redirects": has_redirects,
            "status_codes_seen": list(set(status_codes)),
            "duplicate_variants": len(page_group) - 1,
        }

        return merged

    def analyze(self, pages: list) -> dict:
        """Full canonicalization analysis. Returns analysis with dedup results."""
        # Step 1: Build redirect map from pages that have redirect info
        for page in pages:
            url = page.get("url", "")
            redirect_url = page.get("redirect_url", "") or page.get("final_url", "")
            if redirect_url:
                self.redirect_map[url] = redirect_url

        # Step 2: Normalize all URLs
        normalized_map = {}
        for page in pages:
            url = page.get("url", "")
            norm = self.normalize(url)
            normalized_map[url] = norm
            page["normalized_url"] = norm

        # Step 3: Deduplicate
        groups = self.deduplicate_pages(pages)

        # Step 4: Merge groups
        merged_pages = []
        duplicate_groups = []
        for canonical_url, group in groups.items():
            merged = self.merge_page_data(group)
            merged_pages.append(merged)
            if len(group) > 1:
                duplicate_groups.append({
                    "canonical_url": canonical_url,
                    "variants": [p.get("url", "") for p in group],
                    "variant_count": len(group),
                    "issues_found": self._find_merge_issues(group),
                })

        # Step 5: Compute stats
        total_before = len(pages)
        total_after = len(merged_pages)
        duplicates_removed = total_before - total_after

        # Count specific issue reductions
        original_titles = [p.get("title", "") for p in pages if p.get("title")]
        unique_titles = set(original_titles)

        original_h1s = [p.get("h1", "") for p in pages if p.get("h1")]
        unique_h1s = set(original_h1s)

        original_canonicals = [p.get("canonical", "") for p in pages if p.get("canonical")]
        canonical_conflicts = len(original_canonicals) - len(set(original_canonicals))

        # WWW vs non-www split
        www_count = sum(1 for p in pages if "www." in urlparse(p.get("url", "")).netloc)
        non_www_count = total_before - www_count

        # HTTP vs HTTPS split
        http_count = sum(1 for p in pages if urlparse(p.get("url", "")).scheme == "http")
        https_count = total_before - http_count

        # Trailing slash duplicates
        trailing_slash = sum(
            1 for p in pages
            if p.get("url", "").rstrip("/") != p.get("url", "")
            and p.get("url", "").rstrip("/") + "/" in [pp.get("url", "") for pp in pages]
        )

        return {
            "summary": {
                "total_urls_crawled": total_before,
                "unique_pages_after_merge": total_after,
                "duplicates_removed": duplicates_removed,
                "duplicate_reduction_pct": round((duplicates_removed / max(total_before, 1)) * 100, 1),
            },
            "canonicalization_issues": {
                "www_vs_non_www": {
                    "www_count": www_count,
                    "non_www_count": non_www_count,
                    "mixed": www_count > 0 and non_www_count > 0,
                    "fix": "Pick one (non-www preferred) and 301 redirect the other" if www_count > 0 and non_www_count > 0 else None,
                },
                "http_vs_https": {
                    "http_count": http_count,
                    "https_count": https_count,
                    "mixed": http_count > 0 and https_count > 0,
                    "fix": "Force HTTPS with 301 redirect" if http_count > 0 else None,
                },
                "trailing_slash": {
                    "affected_pages": trailing_slash,
                    "fix": "Pick one convention and redirect" if trailing_slash > 0 else None,
                },
                "canonical_conflicts": {
                    "count": canonical_conflicts,
                    "fix": "Ensure each page has a self-referencing canonical" if canonical_conflicts > 0 else None,
                },
                "duplicate_titles": {
                    "total_titles": len(original_titles),
                    "unique_titles": len(unique_titles),
                    "duplicates": len(original_titles) - len(unique_titles),
                },
                "duplicate_h1s": {
                    "total_h1s": len(original_h1s),
                    "unique_h1s": len(unique_h1s),
                    "duplicates": len(original_h1s) - len(unique_h1s),
                },
            },
            "redirect_chains": [
                {"from": orig, "to": target}
                for orig, target in list(self.redirect_map.items())[:20]
            ],
            "duplicate_groups": sorted(duplicate_groups, key=lambda g: g["variant_count"], reverse=True)[:20],
            "merged_pages": merged_pages,
        }

    def _find_merge_issues(self, group: list) -> list:
        """Find issues within a group of duplicate pages."""
        issues = []
        titles = [p.get("title", "") for p in group if p.get("title")]
        if len(set(titles)) > 1:
            issues.append("conflicting_titles")
        h1s = [p.get("h1", "") for p in group if p.get("h1")]
        if len(set(h1s)) > 1:
            issues.append("conflicting_h1s")
        canonicals = [p.get("canonical", "") for p in group if p.get("canonical")]
        if len(set(canonicals)) > 1:
            issues.append("conflicting_canonicals")
        statuses = [p.get("status_code", 0) for p in group]
        if 200 in statuses and any(s != 200 for s in statuses):
            issues.append("mixed_status_codes")
        return issues
