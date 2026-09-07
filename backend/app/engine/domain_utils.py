"""Domain normalization helpers for Growth tools.

Handles the fact that users paste full URLs (https://www.example.com/),
bare domains (example.com), and subdomains (sub.example.com). All tools
use one function so a URL and a bare domain resolve to the same key.
"""
from urllib.parse import urlparse


def normalize_domain(value: str) -> str:
    """Return a bare domain (lowercase, no scheme, no path/query, no www).

    Examples:
        "https://www.datavicloud.ai/" -> "datavicloud.ai"
        "datavicloud.ai"              -> "datavicloud.ai"
        "HTTP://APOLLO.IO/pricing?x=1" -> "apollo.io"
        "blog.datavicloud.ai"          -> "blog.datavicloud.ai"
    """
    if not value:
        return ""
    raw = (value or "").strip().strip("/")
    if not raw:
        return ""
    # If it looks like a bare domain (no scheme, no slashes), just clean it.
    if raw.startswith(("http://", "https://")):
        try:
            host = urlparse(raw).hostname or raw
        except Exception:
            host = raw
    else:
        # strip any path/query if the user included them without a scheme
        host = raw.split("/")[0].split("?")[0].split("#")[0]
    return host.lower().lstrip("www.") or ""