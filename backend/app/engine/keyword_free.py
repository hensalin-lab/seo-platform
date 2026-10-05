"""Free, keyless, unlimited keyword suggestions for any URL.

The existing free autocomplete tool only echoes ten rows back for one typed
string, which is a curiosity rather than a keyword source. This module turns a
single URL into a large, genuinely useful set of suggestions using only Google's
public Suggest endpoint -- no API key, no quota, no provider account.

Two things make it work at volume:

1. Seed extraction reads what the page itself claims to be about (title, H1,
   meta description, headings, URL slug) rather than guessing a topic from the
   domain name.
2. Suggest is expanded, not just queried. Each seed is probed with qualifier
   stems ("how", "best", "vs", "near me"...) and with the alphabet trick --
   asking for "seed a", "seed b", "seed c" surfaces completions that a single
   query never reaches. That is what turns ~10 rows into thousands.

Every call is best-effort: a suggestion that fails to load is skipped, never
raised, so the tool degrades to fewer results rather than an error.
"""

from __future__ import annotations

import asyncio
import logging
import re
from collections import Counter

import httpx

from app.engine.free_data import GOOGLE_SUGGEST, host_of

logger = logging.getLogger(__name__)

# Stems prepended to a seed. Google returns a different slice of the suggestion
# space for each, which is how one seed becomes a dozen themed long-tails.
QUALIFIER_STEMS = [
    "how to", "how much", "what is", "why use", "when to", "where to",
    "best", "top", "cheap", "affordable", "free", "diy",
    "vs", "alternatives", "comparison", "review", "reviews",
    "near me", "in india", "for small business", "for beginners", "for enterprise",
    "services", "agency", "company", "consultant", "freelancer",
    "cost", "price", "pricing", "rates", "quote", "estimate",
    "checklist", "template", "guide", "tutorial", "examples", "tools", "software",
    "with", "without", "using", "for", "to",
]

# Alphabet expansion is the single biggest multiplier but also the biggest
# request count, so it only runs for the strongest seeds.
ALPHABET = "abcdefghijklmnopqrstuvwxyz"

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0 Safari/537.36"
)

# URL path segments that describe the site's plumbing rather than its topic.
# Without this, "/blog/seo-checklist/" on a WordPress site yields the seeds
# "com blog" and "wp-content uploads", which send the whole expansion sideways.
_SLUG_NOISE = {
    "www", "http", "https", "com", "net", "org", "io", "co", "uk", "de", "in",
    "blog", "news", "posts", "post", "page", "pages", "index", "html", "htm",
    "php", "aspx", "jsp", "wp", "wp-content", "uploads", "upload", "images",
    "img", "media", "assets", "static", "cdn", "files", "content", "docs",
    "en", "us", "home", "default", "amp", "category", "tag", "author",
    "sitemap", "feed", "rss", "wp-json", "admin", "login", "about-us",
}
# Bare numbers and date fragments are never topics.
_SLUG_NOISE_RE = re.compile(r"^(?:\d+|v\d+)$|^\d{4}-\d{2}-\d{2}$")


def _slug_segments(url: str) -> list[str]:
    path = re.sub(r"^https?://[^/]+", "", url or "")
    out = []
    for seg in re.split(r"[-_/]+", path):
        seg = seg.strip().lower()
        if not seg or "." in seg:  # file names carry extensions, not topics
            seg = seg.split(".")[0]
            if not seg:
                continue
        if seg in _SLUG_NOISE or _SLUG_NOISE_RE.match(seg):
            continue
        if seg in _SEED_STOPWORDS:
            continue
        out.append(seg)
    return out


def _strip_brackets(text: str) -> str:
    """Drop the [Incl. Template]-style suffixes titles love to carry."""
    t = re.sub(r"\[[^\]]*\]|\([^)]*\)", " ", text or "")
    t = re.sub(r"\s*[-|–—]\s*[^-–—|]{0,40}$", " ", t) if len(t.split()) > 6 else t
    return re.sub(r"\s+", " ", t).strip()


def _clean_body(html: str) -> str:
    """Reduce a page to the prose a reader would actually see.

    Stripping tags alone is not enough. Attribute values (href, src, content)
    and chrome elements (nav, header, footer, aside, form) survive naive tag
    removal and dominate the resulting bigram counts -- a page's footer link
    farm then becomes its "topic". Chromium words are filtered separately.
    """
    h = html or ""
    # Whole subtrees that are never page content.
    h = re.sub(
        r"<(script|style|noscript|svg|iframe)\b.*?</\1>", " ", h, flags=re.I | re.S
    )
    h = re.sub(
        r"<(nav|header|footer|aside|form|button)\b.*?</\1>", " ", h, flags=re.I | re.S
    )
    # Attribute values before tags go: href/src/class/style carry no prose.
    h = re.sub(r"<[^>]+>", " ", h)
    # Menu-label runs separated by pipes/bullets are navigation, not content.
    h = re.sub(r"\s*[|•·»›]\s*", " ", h)
    h = _unescape(h)
    h = re.sub(r"\s+", " ", h).strip()
    return h[:60000]


def _clean(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text or "")


def _unescape(text: str) -> str:
    """Turn &rsquo; into ' rather than leaving the literal 'rsquo' in the text."""
    import html as _html

    try:
        return _html.unescape(text or "")
    except Exception:
        return text or ""


def _tokens(text: str) -> list[str]:
    # Normalise curly quotes/dashes to ASCII first: otherwise "website’s" is
    # chopped into "website" plus a stray token and the phrase is lost.
    t = (text or "").lower()
    for src, dst in (("\u2019", "'"), ("\u2018", "'"), ("\u201c", '"'),
                     ("\u201d", '"'), ("\u2013", "-"), ("\u2014", "-"),
                     ("\u00a0", " ")):
        t = t.replace(src, dst)
    return re.findall(r"[a-z0-9][a-z0-9'\-]{2,}", t)


def _usable(term: str) -> bool:
    term = re.sub(r"\s+", " ", (term or "").strip().lower())
    if len(term) < 3 or len(term) > 80:
        return False
    words = term.split()
    if not words or len(words) > 8:
        return False
    if term.isdigit():
        return False
    return True


# Fragments that read like a topic to a bigram counter but mean nothing to
# Google. Left in as seeds they drag the whole expansion off-topic -- "you need"
# pulls back "you need album" and "for you need is love".
_SEED_STOPWORDS = {
    "you", "your", "yours", "we", "our", "us", "they", "them", "their", "it", "its",
    "this", "that", "these", "those", "there", "here", "only", "just", "also",
    "need", "needs", "needed", "want", "wants", "use", "used", "using", "get",
    "gets", "make", "makes", "made", "take", "takes", "come", "comes", "go",
    "goes", "know", "knows", "think", "thinks", "see", "sees", "look", "looks",
    "find", "finds", "give", "gives", "best", "better", "good", "great", "new",
    "own", "same", "other", "others", "more", "most", "some", "any", "all",
    "can", "will", "would", "should", "could", "does", "did", "has", "have",
    "was", "were", "are", "is", "be", "been", "being", "and", "but", "for",
    "with", "without", "from", "into", "about", "the", "a", "an", "of", "to",
    "in", "on", "at", "by", "as", "if", "or", "not", "no", "so", "than", "then",
    "one", "two", "what", "why", "when", "where", "which", "who", "how",
    "more", "over", "under", "up", "down", "out", "off", "per", "via",
    # Site chrome and URL plumbing. These survive tag-stripping inside link
    # text and href fragments, and as seeds they are pure noise.
    "http", "https", "www", "com", "net", "org", "html", "htm", "php", "aspx",
    "jsp", "amp", "xml", "json", "rss", "sitemap", "wp", "cdn", "href", "src",
    "alt", "class", "id", "rel", "target", "cookie", "cookies", "privacy",
    "policy", "terms", "login", "logout", "signup", "signin", "register",
    "account", "cart", "checkout", "menu", "search", "subscribe", "newsletter",
    "copyright", "rights", "reserved", "skip", "content", "toggle", "close",
    "loading", "searching", "click", "here", "read", "learn", "view", "show",
    "hide", "yes", "no", "ok", "back", "next", "prev", "previous", "first",
    "last", "home", "main", "left", "right", "top", "bottom", "page", "post",
    "blog", "news", "category", "tag", "author", "archive", "author",
    # Literal HTML entity names. Pages that double-encode (or scripts that
    # print entities) leave these as words, which then look like topics.
    "apos", "quot", "nbsp", "rsquo", "lsquo", "ldquo", "rdquo", "amp",
    "lt", "gt", "mdash", "ndash", "hellip", "reg", "copy", "trade", "deg",
}


def _seed_ok(phrase: str) -> bool:
    """Reject fragments that would send the expansion somewhere useless."""
    p = re.sub(r"\s+", " ", (phrase or "").strip().lower())
    if not _usable(p):
        return False
    words = p.split()
    # A phrase made entirely of function/filler words is not a topic.
    if all(w in _SEED_STOPWORDS for w in words):
        return False
    # Leading or trailing filler reads as a clause, not a search topic.
    if words[0] in _SEED_STOPWORDS or words[-1] in _SEED_STOPWORDS:
        return False
    # Two filler words in a row ("of the", "to your") is boilerplate.
    filler_run = 0
    for w in words:
        filler_run = filler_run + 1 if w in _SEED_STOPWORDS else 0
        if filler_run >= 2:
            return False
    return True


async def _suggest(client: httpx.AsyncClient, q: str, limit: int = 10) -> list[str]:
    try:
        resp = await client.get(
            GOOGLE_SUGGEST,
            params={"client": "firefox", "hl": "en", "q": q.strip()},
        )
        if resp.status_code != 200:
            return []
        data = resp.json()
    except Exception:
        return []
    items = data[1] if isinstance(data, list) and len(data) > 1 else []
    out = [str(s).strip() for s in items if s]
    return [s for s in out if _usable(s)][:limit]


async def fetch_page_signals(url: str) -> dict:
    """Pull the topic signals out of a live page. Returns {} if unreachable."""
    if not url or not host_of(url):
        return {}
    html = ""
    final_url = url
    try:
        async with httpx.AsyncClient(
            timeout=15, follow_redirects=True, headers={"User-Agent": _USER_AGENT}
        ) as client:
            resp = await client.get(url)
            if resp.status_code >= 400:
                return {}
            html = resp.text or ""
            final_url = str(resp.url)
    except Exception as e:
        logger.warning(f"Page fetch failed for {url}: {e}")
        return {}

    title = ""
    meta = ""
    canonical = ""
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    if m:
        title = re.sub(r"\s+", " ", _clean(m.group(1))).strip()
    m = re.search(
        r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"'](.*?)[\"']", html, re.I | re.S
    ) or re.search(
        r"<meta[^>]+content=[\"'](.*?)[\"'][^>]+name=[\"']description[\"']", html, re.I | re.S
    )
    if m:
        meta = re.sub(r"\s+", " ", _clean(m.group(1))).strip()
    m = re.search(r"<link[^>]+rel=[\"']canonical[\"'][^>]+href=[\"'](.*?)[\"']", html, re.I)
    if m:
        canonical = m.group(1).strip()

    h1s = [_clean(h) for h in re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.I | re.S)]
    headings = []
    for tag in ("h2", "h3"):
        for h in re.findall(rf"<{tag}[^>]*>(.*?)</{tag}>", html, re.I | re.S):
            t = re.sub(r"\s+", " ", _clean(h)).strip()
            if t:
                headings.append(t)

    body = _clean_body(html)

    return {
        "url": final_url,
        "host": host_of(final_url),
        "title": title,
        "meta_description": meta,
        "canonical": canonical,
        "h1s": [re.sub(r"\s+", " ", h).strip() for h in h1s if h.strip()],
        "headings": headings[:80],
        "text": body[:60000],
        "word_count": len(body.split()),
    }


def build_page_seeds(page: dict, limit: int = 12) -> list[str]:
    """Turn one page into a small set of strong seed phrases."""
    if not page:
        return []
    scored: Counter = Counter()
    order: dict[str, int] = {}

    def add(phrase: str, weight: int) -> None:
        p = re.sub(r"\s+", " ", (phrase or "").strip().lower())
        if not _seed_ok(p):
            return
        scored[p] += weight
        order.setdefault(p, len(order))

    for t in (page.get("title"), page.get("meta_description")):
        if t:
            clean = _strip_brackets(t)
            add(clean, 10)
            toks = _tokens(clean)
            for i in range(len(toks) - 1):
                add(" ".join(toks[i:i + 2]), 6)
            for i in range(len(toks) - 2):
                add(" ".join(toks[i:i + 3]), 5)

    for h in page.get("h1s") or []:
        clean = _strip_brackets(h)
        add(clean, 12)
        toks = _tokens(clean)
        for i in range(len(toks) - 1):
            add(" ".join(toks[i:i + 2]), 7)

    for h in (page.get("headings") or [])[:40]:
        clean = _strip_brackets(h)
        add(clean, 4)
        toks = _tokens(clean)
        for i in range(len(toks) - 1):
            add(" ".join(toks[i:i + 2]), 3)

    # URL slug words are the site's own naming of the page. Pairing consecutive
    # segments catches "seo-checklist" even when the path splits on other words.
    segs = _slug_segments(page.get("url") or "")
    for seg in segs:
        add(seg, 5)
    for i in range(len(segs) - 1):
        add(f"{segs[i]} {segs[i + 1]}", 6)

    # Frequent body phrases, which catch the vocabulary the page never titles.
    body_toks = [w for w in _tokens(page.get("text") or "") if len(w) > 2]
    for phrase, c in Counter(
        " ".join(body_toks[i:i + 2]) for i in range(len(body_toks) - 1)
    ).most_common(40):
        if c >= 4:
            add(phrase, min(c, 8))

    ranked = sorted(scored.items(), key=lambda kv: (-kv[1], order.get(kv[0], 999)))
    return [k for k, _v in ranked[:limit]]


async def expand_from_seeds(
    seeds: list[str],
    max_requests: int = 260,
    max_results: int = 1500,
    concurrency: int = 12,
) -> tuple[list[dict], int]:
    """Fan Suggest out across qualifiers and the alphabet.

    Returns (suggestions, requests_made) so the caller can be honest about what
    the result cost.
    """
    if not seeds:
        return [], 0

    queries: list[str] = []
    seen_q: set[str] = set()

    def queue(q: str) -> None:
        q = re.sub(r"\s+", " ", (q or "").strip())
        if not _usable(q) or q in seen_q:
            return
        seen_q.add(q)
        queries.append(q)

    # Strongest seeds get the full treatment: every qualifier plus the alphabet.
    for s in seeds[:4]:
        queue(s)
        for stem in QUALIFIER_STEMS:
            queue(f"{stem} {s}")
        for letter in ALPHABET:
            queue(f"{s} {letter}")

    # Weaker seeds get a cheaper pass: qualifiers only.
    for s in seeds[4:]:
        queue(s)
        for stem in QUALIFIER_STEMS[:18]:
            queue(f"{stem} {s}")

    queries = queries[:max_requests]
    if not queries:
        return [], 0

    sem = asyncio.Semaphore(concurrency)
    found: dict[str, dict] = {}
    made = 0

    async with httpx.AsyncClient(
        timeout=8, follow_redirects=True, headers={"User-Agent": _USER_AGENT}
    ) as client:
        async def run(q: str) -> None:
            nonlocal made
            async with sem:
                made += 1
                sugg = await _suggest(client, q)
            for s in sugg:
                key = s.lower().strip()
                if key in found:
                    found[key]["matched"] += 1
                    continue
                found[key] = {"keyword": s, "norm": key, "matched": 1, "from": q}

        await asyncio.gather(*[run(q) for q in queries], return_exceptions=True)

    rows = list(found.values())
    # How many distinct seeds/qualifiers reached a suggestion is a decent proxy
    # for how entrenched the term is.
    rows.sort(key=lambda r: (-r["matched"], len(r["norm"])))
    return rows[:max_results], made


def _classify(keyword: str) -> tuple[str, str]:
    k = keyword.lower()
    tail = "short-tail" if len(k.split()) <= 2 else "long-tail"
    if any(m in k for m in ("buy", "price", "cost", "hire", "quote", "free trial", "demo", "discount")):
        return "transactional", tail
    if any(m in k for m in ("best", "top", "review", "vs", "alternative", "compare", "pricing")):
        return "commercial", tail
    if k.startswith(("how", "what", "why", "when", "where", "who", "which")):
        return "informational", tail
    return "commercial", tail


async def page_keywords(url: str, max_requests: int = 260, max_results: int = 1500) -> dict:
    """Entry point: URL in, large keyword set out. Never raises."""
    page = await fetch_page_signals(url)
    if not page:
        return {
            "url": url,
            "error": "Could not fetch that page. Check the URL is public and reachable.",
            "keywords": [], "seeds": [], "stats": {},
        }

    seeds = build_page_seeds(page)
    raw, requests_made = await expand_from_seeds(
        seeds, max_requests=max_requests, max_results=max_results
    )

    keywords = []
    for r in raw:
        kw = re.sub(r"\s+", " ", r["keyword"]).strip()
        intent, tail = _classify(kw)
        keywords.append({
            "keyword": kw,
            "intent": intent,
            "tail": tail,
            "word_count": len(kw.split()),
            # More distinct matched probes means broader, more entrenched demand.
            "demand_score": min(100, 30 + r["matched"] * 7),
            "source": "autocomplete",
        })

    by_intent: Counter = Counter(k["intent"] for k in keywords)
    by_tail: Counter = Counter(k["tail"] for k in keywords)

    return {
        "url": page.get("url"),
        "host": page.get("host"),
        "page": {
            "title": page.get("title"),
            "meta_description": page.get("meta_description"),
            "canonical": page.get("canonical"),
            "h1s": page.get("h1s"),
            "word_count": page.get("word_count"),
        },
        "seeds": seeds,
        "keywords": keywords,
        "stats": {
            "total": len(keywords),
            "seeds": len(seeds),
            "requests_made": requests_made,
            "intent_breakdown": dict(by_intent),
            "tail_breakdown": dict(by_tail),
            "long_tail": by_tail.get("long-tail", 0),
            "short_tail": by_tail.get("short-tail", 0),
        },
        "data_source": "google_suggest",
        "data_source_note": (
            "Every keyword here is a real autocomplete suggestion Google returned for "
            "this page's own topic. No API key and no paid provider involved. Search "
            "volume is not available from Suggest, so ordering uses how many distinct "
            "query variants reached each suggestion."
        ),
    }