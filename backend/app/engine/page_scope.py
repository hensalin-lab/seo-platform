"""Page-scope classification — which pages should be judged as citation-worthy
editorial content and which are utility/listing pages where depth, E-E-A-T and
citation findings are pure noise (a 404 page does not need 1500+ words).

Segment-based matching so /blog/how-to-start-a-podcast is NOT treated as a
podcast listing hub."""
import re

_LEGAL_PREFIXES = ("privacy", "cookie", "terms", "disclaimer", "legal", "agreement", "gdpr")
_EXACT_UTILITY = {
    "login", "signin", "sign-in", "signup", "sign-up", "register",
    "cart", "checkout", "basket", "account", "unsubscribe",
    "sitemap", "sitemap.xml", "404", "404.html", "404.htm",
    "page-not-found", "not-found", "wp-login.php", "wp-admin",
}
_LISTING_SEGMENTS = {
    "podcast", "podcasts", "video", "videos", "ebook", "ebooks",
    "webinar", "webinars", "whitepaper", "whitepapers", "case-studies",
    "infographic", "infographics", "downloads", "glossary",
}
_LISTING_ROOTS = {"resources", "resource"}


def _segments(url: str) -> list:
    path = re.sub(r"[?#].*$", "", (url or "").lower())
    path = path.split("://", 1)[-1]
    path = re.sub(r"^[^/]*", "", path)  # drop host
    return [s for s in path.split("/") if s]


def is_utility_page(page) -> bool:
    """404s, legal, auth and cart pages are never citation-worthy content."""
    status_code = getattr(page, "status_code", 0) or 0
    if status_code in (404, 410):
        return True
    for seg in _segments(getattr(page, "url", "") or ""):
        s = re.sub(r"\.\w{2,5}$", "", seg)
        if s in _EXACT_UTILITY or s.startswith(_LEGAL_PREFIXES):
            return True
    title = (getattr(page, "title", "") or "").strip().lower()
    h1 = (getattr(page, "h1", "") or "").strip().lower()
    combined = f"{title} {h1}".strip()
    if not combined:
        return False
    if combined in ("404", "page not found", "not found"):
        return True
    return any(k in combined for k in (
        "privacy policy", "cookie policy", "terms of service", "terms of use",
        "page not found",
    ))


def is_listing_page(page) -> bool:
    """Resource index / listing hubs (/resources/podcast etc.) are legitimately
    short navigation pages — they never need 1500+ word long-form depth."""
    segs = _segments(getattr(page, "url", "") or "")
    if not segs:
        return False
    last = re.sub(r"\.\w{2,5}$", "", segs[-1])
    if len(segs) >= 2 and last in _LISTING_SEGMENTS:
        return True
    return len(segs) == 1 and segs[0] in _LISTING_ROOTS


def page_scope(page) -> str:
    """'utility' | 'listing' | 'standard'"""
    if is_utility_page(page):
        return "utility"
    if is_listing_page(page):
        return "listing"
    return "standard"
