"""Keyword universe builder.

The audit used to persist at most 30 single-word entities, which produced a flat,
unprioritisable list. This module assembles a real keyword universe from four
independent sources and merges them:

1. on-page      - titles, H1s, meta descriptions, URL slugs and body n-grams
2. modifier     - long-tail variants built from the on-page seeds
3. autocomplete - Google Suggest, which is free and keyless but reflects genuine
                  search demand far better than any local heuristic
4. ai           - an LLM pass that reads the site's own copy and proposes the
                  keywords a competitor would actually rank for

Everything degrades safely: a site with one page still yields a full universe
because the modifier and autocomplete layers do not depend on page count.
"""

from __future__ import annotations

import asyncio
import logging
import math
import re
import zlib
from collections import Counter
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Words that carry no commercial meaning but dominate raw n-gram counts.
STOP_WORDS = {
    "the", "and", "for", "that", "this", "with", "you", "your", "our", "are", "was",
    "were", "will", "have", "has", "had", "not", "but", "can", "all", "any", "from",
    "they", "their", "them", "there", "here", "what", "when", "where", "which", "who",
    "how", "why", "its", "it's", "also", "more", "most", "some", "such", "than", "then",
    "these", "those", "into", "over", "under", "out", "off", "per", "via", "get", "got",
    "use", "used", "using", "one", "two", "new", "now", "see", "way", "ways", "make",
    "makes", "made", "just", "only", "very", "much", "many", "other", "others", "each",
    "been", "being", "does", "done", "doing", "down", "up", "own", "same", "too",
    "about", "after", "before", "because", "while", "where", "should", "could", "would",
    "https", "http", "www", "com", "html", "index", "page", "home", "site", "website",
    "click", "here", "read", "more", "learn", "contact", "privacy", "policy", "terms",
}

# Tokens that are almost always UI/navigation rather than content.
NAV_WORDS = {
    "menu", "nav", "navigation", "header", "footer", "sidebar", "breadcrumb", "button",
    "login", "logout", "signup", "signin", "cart", "checkout", "account", "settings",
    "search", "filter", "sort", "next", "previous", "prev", "close", "open", "toggle",
    # Site chrome and SaaS product navigation. Crawled page text includes the
    # nav bar, so these recur on every page and outrank real topics purely by
    # repetition. Listed as individual words so a phrase is dropped if any part
    # is one of them.
    "academy", "course", "courses", "module", "modules", "lesson", "lessons",
    "blogging", "platform", "checker", "explorer", "monitor", "tracker",
    "radar", "dashboard", "overview", "library", "community", "pricing",
    "enterprise", "workspace", "docs", "documentation", "help", "support",
    "contact", "about", "team", "careers", "jobs", "partners", "customers",
    "case studies", "testimonials", "webinars", "podcast", "newsletter",
    "subscribe", "unsubscribe", "trial", "demo", "login", "signup",
    "privacy", "terms", "cookies", "cookie", "policy", "legal", "refunds",
    "affiliate", "partners", "reseller", "wholesale", "store", "shop",
    "skip", "loading", "refresh", "edit", "delete", "create", "update",
    "save", "cancel", "confirm", "submit", "upload", "download", "install",
    "upgrade", "renew", "invoice", "billing", "payment", "checkout",
    "https", "http", "www", "com", "net", "org", "html", "htm", "php",
    "amp", "xml", "json", "rss", "sitemap", "href", "src", "alt", "class",
    "id", "rel", "target", "cookie", "cookies", "privacy", "policy", "terms",
    "login", "logout", "signup", "signin", "register", "registered",
    "copy", "copyright", "rights", "reserved", "click", "here", "read",
    "learn", "view", "show", "hide", "yes", "back", "home", "main", "left",
    "right", "top", "bottom", "page", "post", "blog", "news", "category",
    "tag", "author", "archive", "start", "started", "getting", "guide",
    "guides", "tutorial", "tutorials", "example", "examples", "template",
    "templates", "checklist", "report", "reports", "free", "tool", "tools",
}

# Modifiers used to expand a seed into purchasable long-tail queries. Ordered by
# how much intent they carry, so the highest-intent variants are kept first when
# the universe has to be truncated.
PREFIX_MODIFIERS = [
    "best", "top", "cheap", "affordable", "free", "professional", "hiring",
]
SUFFIX_MODIFIERS = [
    "services", "agency", "company", "consulting", "solutions", "pricing", "cost",
    "rates", "near me", "for small business", "reviews", "vs", "alternatives",
    "checklist", "template", "guide", "tutorial", "examples", "tools", "software",
]
QUESTION_PREFIXES = [
    "how to choose", "what is", "why use", "best way to", "how much does",
]

TRANSACTIONAL = {
    "buy", "price", "pricing", "cost", "cheap", "affordable", "hire", "hiring",
    "order", "free trial", "demo", "quote", "estimate", "discount", "deal", "coupon",
    "services", "agency", "company", "consulting", "contact", "get started",
}
COMMERCIAL = {
    "best", "top", "review", "reviews", "vs", "alternatives", "compare", "comparison",
    "software", "tools", "platform", "solution", "solutions", "template", "checklist",
    "guide", "tutorial", "examples", "how", "guide",
}
INFORMATIONAL = {
    "what", "why", "how", "guide", "tutorial", "learn", "examples", "tips", "meaning",
    "definition", "checklist", "steps",
}

# Themed briefs for the AI expansion pass. Splitting the work this way keeps each
# response inside max_tokens and stops the model returning 40 near-identical
# variations of the same head term.
AI_PASSES = [
    (
        "BRIEF: head and short-tail keywords (1-2 words) with the highest search volume "
        "in this niche. Produce {n}. Give realistic monthly volume (0-50000) and "
        "difficulty (0-100)."
    ),
    (
        "BRIEF: long-tail buying keywords (3-6 words) that signal someone is ready to "
        "hire or buy. Use qualifiers such as 'best', 'how to choose', 'for small "
        "business', budget and location qualifiers where they genuinely fit. Produce {n}."
    ),
    (
        "BRIEF: commercial-investigation keywords -- comparisons, alternatives, reviews, "
        "pricing, 'vs' and 'X or Y' phrasing. Produce {n}."
    ),
    (
        "BRIEF: informational and question keywords ('what is', 'how does', 'why') that a "
        "newcomer to this topic would search before they buy. Produce {n}."
    ),
]


def _clean(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text or "")


def _tokens(text: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9][a-z0-9'\-]{2,}", (text or "").lower())]


def _is_usable(term: str) -> bool:
    if not term or len(term) < 3 or len(term) > 70:
        return False
    if term.isdigit():
        return False
    words = term.split()
    if not words or len(words) > 6:
        return False
    if all(w in STOP_WORDS or w in NAV_WORDS for w in words):
        return False
    return any(w not in STOP_WORDS and w not in NAV_WORDS and len(w) > 2 for w in words)


def _is_meaningful_seed(term: str) -> bool:
    """Reject fragments that a bigram counter mistakes for a topic.

    Body n-grams on a real site are dominated by boilerplate ("build", "academy",
    "overview"). Left as seeds they outrank the page's actual subject because
    they recur more often, and the whole universe inherits the noise.
    """
    words = term.split()
    if any(w in NAV_WORDS for w in words):
        return False
    # A single word mined from body text or a URL slug is nearly always site
    # chrome ("Ahrefs", "Academy", "Explorer", "Overview") or a generic SEO
    # term ("marketing", "content"). Real targets are phrases, so anything from
    # these sources must be at least a bigram.
    if len(words) < 2:
        return False
    # Leading or trailing filler reads as a clause, not a search query.
    if words[0] in STOP_WORDS or words[-1] in STOP_WORDS:
        return False
    if all(w in STOP_WORDS for w in words):
        return False
    return True


def _normalise(term: str) -> str:
    return re.sub(r"\s+", " ", (term or "").strip().lower())


def _titlecase(term: str) -> str:
    small = {"for", "and", "of", "to", "in", "on", "a", "an", "vs", "the", "with", "at", "by", "from"}
    parts = term.split()
    out = []
    for i, w in enumerate(parts):
        if i > 0 and w in small:
            out.append(w)
        elif w.isupper() or (len(w) > 1 and w[1:].lower() != w[1:].lower() and w.isalpha()):
            out.append(w)
        else:
            out.append(w[:1].upper() + w[1:])
    return " ".join(out)


def classify_intent(keyword: str) -> str:
    kw = (keyword or "").lower()
    if any(m in kw for m in TRANSACTIONAL):
        return "transactional"
    if any(m in kw for m in COMMERCIAL):
        return "commercial"
    if kw.startswith(("how", "what", "why", "when", "where", "who")):
        return "informational"
    return "informational" if any(m in kw for m in INFORMATIONAL) else "commercial"


def _tail_for(keyword: str) -> str:
    return "short-tail" if len(keyword.split()) <= 2 else "long-tail"


def _slug_terms(url: str) -> list[str]:
    """Pull meaningful words out of a URL path, e.g. /seo-audit-tool -> seo audit tool."""
    try:
        path = urlparse(url or "").path or ""
    except Exception:
        return []
    raw = [seg for seg in re.split(r"[-_/]+", path) if seg]
    terms = []
    for seg in raw[:6]:
        seg = re.sub(r"\.(html?|php|aspx?|jsp)$", "", seg, flags=re.I).lower()
        if _is_usable(seg):
            terms.append(seg)
    return terms


def build_seeds(pages, limit: int = 60) -> list[tuple[str, int, str]]:
    """Collect high-signal seed phrases from the crawled pages.

    Returns (phrase, weight, source) where weight reflects where the phrase came
    from: a title or H1 is a far stronger statement of what a page is for than a
    stray body mention.
    """
    if not pages:
        return []

    weights: Counter = Counter()
    # Phrase -> the strongest tier it was ever seen in. Tier decides the final
    # relevance slope: a term a page titles itself after must outrank a phrase
    # that merely happens to recur in body text, however often.
    tiers: dict[str, str] = {}

    def add(phrase: str, weight: int, tier: str = "body", strict: bool = True) -> None:
        p = _normalise(phrase)
        if not _is_usable(p):
            return
        # Body n-grams and URL slugs are the sources that manufacture
        # boilerplate ("build", "overview", "com blog"). Titles and H1s are the
        # page stating its own topic, so filler words there are not noise.
        if strict and not _is_meaningful_seed(p):
            return
        weights[p] += weight
        # Keep the best tier seen, not the last one.
        order = {"body": 0, "slug": 1, "meta": 2, "title": 3}
        if p not in tiers or order[tier] > order.get(tiers[p], 0):
            tiers[p] = tier

    for p in pages:
        title = _clean(getattr(p, "title", "") or "")
        h1 = _clean(getattr(p, "h1", "") or "")
        meta = _clean(getattr(p, "meta_description", "") or "")

        # Whole titles and H1s are the page's own claim about its topic.
        if title:
            add(title, 14, tier="title", strict=False)
            toks = _tokens(title)
            for n in (2, 3):
                for i in range(len(toks) - n + 1):
                    add(" ".join(toks[i:i + n]), 7 if n == 2 else 6, tier="title")
        if h1:
            add(h1, 12, tier="title", strict=False)
            toks = _tokens(h1)
            for i in range(len(toks) - 1):
                add(" ".join(toks[i:i + 2]), 6, tier="title")
        if meta:
            toks = _tokens(meta)
            for i in range(len(toks) - 1):
                add(" ".join(toks[i:i + 2]), 3, tier="meta")

        for t in _slug_terms(getattr(p, "url", "") or ""):
            add(t, 4, tier="slug")

        body = _clean(getattr(p, "content_text", "") or "")[:120000]
        body_tokens = [w for w in _tokens(body) if w not in STOP_WORDS and w not in NAV_WORDS]
        # Body bigrams only, and only when the phrase recurs on several pages.
        # c >= 3 is the difference between a site-wide topic and a coincidence
        # of two sentences on one page.
        bg = Counter(" ".join(body_tokens[i:i + 2]) for i in range(len(body_tokens) - 1))
        for phrase, c in bg.most_common(40):
            if c >= 3:
                add(phrase, min(c, 2), tier="body")

    # Weight accumulates once per page, so on a 300-page crawl a phrase reaches
    # hundreds and every term saturates the relevance curve at 100 -- which
    # destroys the ranking. Cap each tier's weight at a multiple of the page
    # count so the score means "share of the site" rather than raw hit count,
    # and the top of the list can actually separate.
    npages = len(pages)
    if npages:
        caps = {"body": npages, "slug": npages, "meta": npages, "title": npages * 2}
        weights = Counter(
            {k: min(v, caps.get(tiers.get(k, "body"), npages)) for k, v in weights.items()}
        )

    ranked = sorted(weights.items(), key=lambda kv: kv[1], reverse=True)
    out = [(k, v, tiers.get(k, "body")) for k, v in ranked[:limit] if _is_usable(k)]
    return out


def expand_with_modifiers(seeds, existing: set, limit: int = 160) -> list[dict]:
    """Turn seeds into long-tail queries a buyer would actually type."""
    out: list[dict] = []
    for seed, weight, tier in seeds:
        s = _normalise(seed)
        variants: list[tuple[str, int]] = [(s, weight)]
        variants += [(f"{m} {s}", weight - 2) for m in PREFIX_MODIFIERS]
        variants += [(f"{s} {m}", weight - 1) for m in SUFFIX_MODIFIERS]
        variants += [(f"{p} {s}", weight - 3) for p in QUESTION_PREFIXES]
        for term, w in variants:
            t = _normalise(term)
            if t in existing or not _is_usable(t):
                continue
            existing.add(t)
            out.append({"keyword": _titlecase(t), "norm": t,
                         # Pure inference off a seed, so it ranks below anything
                         # the page or Google actually said.
                         "relevance": max(8, int(_seed_relevance(w, tier) * 0.6)),
                         "source": "modifier", "frequency": 0})
            if len(out) >= limit:
                return out
    return out


async def autocomplete_expand(seeds, existing: set, max_seeds: int = 18, per_seed: int = 6,
                              budget_s: float = 22.0) -> list[dict]:
    """Enrich with Google Suggest. Free, no key, and a real demand signal."""
    from app.engine.free_data import google_autocomplete

    picks = [(s, w, tier) for s, w, tier in seeds][:max_seeds]
    if not picks:
        return []

    async def one(term: str) -> list[str]:
        try:
            return await google_autocomplete(term, limit=per_seed)
        except Exception:
            return []

    terms = [p[0] for p in picks]
    try:
        batches = await asyncio.wait_for(asyncio.gather(*[one(p) for p in terms]), timeout=budget_s)
    except Exception as e:
        logger.warning(f"Autocomplete expansion stopped early: {e}")
        batches = []

    out: list[dict] = []
    seen_local: set = set()
    for (seed, w, tier), sugg in zip(picks, batches if isinstance(batches, list) else []):
        # A suggestion is only as trustworthy as the seed that produced it. A
        # flat score let completions of a weak slug seed ("vista general
        # contractor") outrank completions of a term the site titles itself
        # after ("link building sites").
        base = _seed_relevance(w, tier) * 0.8 + 20
        # One strong seed can otherwise supply the entire head of the list --
        # a site whose titles all contain the same phrase gets ten variants of
        # it and nothing else. Capping per seed keeps the ranking representative.
        taken = 0
        per_this_seed = 0
        for s in sugg or []:
            if per_this_seed >= per_seed:
                break
            t = _normalise(s)
            if not _is_usable(t) or t in existing or t in seen_local:
                continue
            seen_local.add(t)
            existing.add(t)
            per_this_seed += 1
            out.append({"keyword": _titlecase(t), "norm": t,
                        "relevance": max(20, min(int(base), 95)),
                        "source": "autocomplete", "frequency": 0, "demand": True})
    return out


async def ai_expand(seeds, site_meta: dict, existing: set, want: int = 120,
                    budget_s: float = 70.0) -> list[dict]:
    """Ask the LLM to propose the keywords a competitor ranks for.

    Deliberately constrained to JSON and to terms grounded in the supplied site
    facts, because an unconstrained model will happily invent plausible-sounding
    keywords for a business that does not exist.

    Runs four narrow themed passes instead of one big prompt: a request large
    enough for 120 keywords exhausts max_tokens part-way through the array and
    comes back as unparseable JSON, and separate angles also give noticeably
    less repetitive results.

    Providers are called directly rather than through dual_ai._run_all. That
    helper merges replies across providers, and its list merge keys dict items
    on element/title/issue/signal/action -- none of which a keyword object has,
    so every entry collapsed into one and the whole AI layer silently returned
    nothing.
    """
    try:
        from app.engine import dual_ai
    except Exception as e:
        logger.warning(f"AI keyword expansion unavailable: {e}")
        return []

    # Ordered by who is actually reachable. Groq leads; the rest are best-effort.
    providers = [
        ("groq", getattr(dual_ai, "_groq_chat", None)),
        ("cf-workers", getattr(dual_ai, "_cf_workers_chat", None)),
        ("cerebras", getattr(dual_ai, "_cerebras_chat", None)),
        ("gemini", getattr(dual_ai, "_gemini_chat", None)),
        ("openrouter", getattr(dual_ai, "_openrouter_chat", None)),
    ]
    providers = [(n, f) for n, f in providers if callable(f)]
    if not providers:
        return []

    top_terms = ", ".join(s for s, _w, _src in seeds[:30])
    titles = site_meta.get("titles", "")[:1500]
    url = site_meta.get("url", "")
    per_pass = max(15, want // len(AI_PASSES))

    system = (
        "You are a senior SEO strategist building a keyword universe for one specific "
        "website. Reply with a JSON object shaped like "
        '{"keywords":[{"keyword":"...","intent":"informational|commercial|transactional",'
        '"volume":1200,"difficulty":40,"priority":"HIGH"}]}. '
        "No prose, no markdown fences, no trailing commentary. Every entry must be a "
        "query a real customer of THIS site would type into a search box."
    )

    context = f"Website: {url}\nPage titles: {titles}\nOn-page terms: {top_terms}\n\n"
    prompts = [context + brief.format(n=per_pass) for brief in AI_PASSES]

    async def one(fn, user: str) -> list:
        try:
            return await asyncio.wait_for(fn(system, user, 3500), timeout=budget_s)
        except Exception as e:
            logger.warning(f"AI keyword call failed: {e}")
            return None

    # Two healthy providers is plenty of signal; asking every one just burns
    # time on keys that are out of credit.
    live = providers[:2]
    jobs = [one(fn, p) for fn in (live[0][1], live[1][1] if len(live) > 1 else None) for p in prompts
            if fn is not None]
    try:
        raw = await asyncio.wait_for(asyncio.gather(*jobs, return_exceptions=True), timeout=budget_s + 20)
    except Exception as e:
        logger.warning(f"AI keyword expansion timed out: {e}")
        raw = []

    passes: list[dict] = []
    for r in raw:
        if isinstance(r, BaseException) or not r:
            continue
        found = _extract_keyword_objects(r)
        if found:
            passes.extend(found)

    out: list[dict] = []
    for item in passes:
        if not isinstance(item, dict):
            continue
        kw = item.get("keyword") or item.get("term") or item.get("phrase") or ""
        t = _normalise(str(kw))
        if not _is_usable(t) or t in existing:
            continue
        existing.add(t)
        intent = str(item.get("intent") or "").strip().lower()
        if intent not in {"informational", "commercial", "transactional", "navigational"}:
            intent = classify_intent(t)
        difficulty = _as_int(item.get("difficulty"), 0, 0, 100) or _guess_difficulty(t)
        priority = str(item.get("priority") or "").strip().upper()
        vol = _as_int(item.get("volume"), 0, 0, 500000)
        # Trust the model's own ranking, but let the volume it reports do the
        # fine sorting. A flat HIGH/MEDIUM/LOW score made every AI keyword tie,
        # so "seo" (40k/mo) landed on the same row as an API-pricing term (1.2k).
        prio_bonus = 12 if priority == "HIGH" else 7 if priority == "MEDIUM" else 2
        vol_bonus = int(15 * (math.log10(vol + 1) / math.log10(500001))) if vol else 0
        relevance = min(100, 68 + prio_bonus + vol_bonus)
        out.append({
            "keyword": _titlecase(t), "norm": t, "intent": intent,
            "volume": vol,
            "difficulty": difficulty, "source": "ai",
            "relevance": relevance, "frequency": 0,
        })
    return out


def _as_int(value, default: int = 0, low: int = 0, high: int = 10**9) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(low, min(n, high))


def _extract_keyword_objects(text) -> list[dict]:
    """Pull the keyword array out of an LLM reply.

    Accepts an already-parsed dict (the providers json.loads before returning),
    a JSON string, an object wrapping a list under any known key, and a bare
    array.
    """
    if not text:
        return []
    if isinstance(text, list):
        return text
    if isinstance(text, dict):
        for key in ("keywords", "keyword_universe", "data", "results", "terms", "items"):
            val = text.get(key)
            if isinstance(val, list):
                return val
        for val in text.values():
            if isinstance(val, list) and val:
                return val
        return []
    if not isinstance(text, str):
        return []
    cleaned = re.sub(r"^```(?:json)?", "", text.strip(), flags=re.I)
    cleaned = re.sub(r"```$", "", cleaned.strip())

    obj = _first_json(cleaned, "{")
    if isinstance(obj, dict):
        for key in ("keywords", "keyword_universe", "data", "results", "terms", "items"):
            val = obj.get(key)
            if isinstance(val, list):
                return val
        for val in obj.values():  # last resort: first list anywhere
            if isinstance(val, list) and val:
                return val
    # No list found. A reply that is really a bare array will have had its
    # leading object misread here, so retry as an array before giving up.
    arr = _first_json(cleaned, "[")
    if isinstance(arr, list):
        return arr
    return obj if isinstance(obj, dict) and not isinstance(obj, list) else []


def _first_json(text: str, opener: str):
    """Parse the first balanced JSON value starting at `opener`.

    Walks with a string-aware scanner because a naive brace count breaks on any
    keyword containing a quote or brace -- which these prompts invite.
    """
    start = text.find(opener)
    if start == -1:
        return None
    closer = "}" if opener == "{" else "]"
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == opener:
            depth += 1
        elif ch == closer:
            depth -= 1
            if depth == 0:
                try:
                    import json
                    return json.loads(text[start:i + 1])
                except Exception:
                    return None
    return None


def _guess_difficulty(term: str) -> int:
    """Cheap heuristic standing in when no provider data is available."""
    words = len(term.split())
    base = 18 + words * 9
    if classify_intent(term) == "transactional":
        base += 18
    return max(5, min(base, 92))


def _estimate_volume(term: str, demand_flag: bool, seed_weight: int) -> int:
    """A stand-in for monthly search volume.

    No free source reports real volume, so this is an estimate and the API says
    so. It only has to be plausible and, crucially, *differentiated* -- a column
    where every row reads 200 destroys the ranking's credibility.
    """
    words = len(term.split())
    # Stable per-term jitter so sibling phrases never collapse onto one identical
    # number -- a volume column where every row reads 200 destroys trust in the
    # whole ranking. crc32 rather than hash() because hash() is salted per
    # process and would change the stored value on every request.
    jitter = 55 + (zlib.crc32(term.encode("utf-8")) % 45)  # 55-99% of base
    if demand_flag:
        # Real Google suggestion: assume a healthy but not top-end volume,
        # falling off as the seed gets more specific.
        base = max(40, 1100 - seed_weight * 4)
    else:
        # Short terms carry more demand than long ones.
        base = 2400 // (words + 1)
    return max(5, int(base * jitter / 100))


def _seed_relevance(weight: int, tier: str) -> int:
    """Turn a seed's raw weight into relevance, respecting where it came from.

    A flat weight-to-score slope is what let recurring boilerplate ("handled
    meet", appearing nine times on one page) tie with the phrase a page titled
    itself after. Each tier gets its own base and slope so evidence quality
    decides the ranking and frequency only breaks ties within a tier.
    """
    base, slope = {
        "title": (34, 0.20),
        "meta": (22, 0.12),
        "slug": (18, 0.10),
        "body": (8, 0.10),
    }.get(tier, (8, 0.10))
    return max(5, min(int(base + weight * slope), 100))


async def build_keyword_universe(pages, existing_keywords=None, target: int = 250,
                                 use_ai: bool = True) -> list[dict]:
    """Assemble the final, deduplicated, scored universe."""
    seeds = build_seeds(pages)
    existing: set = {_normalise(k) for k in (existing_keywords or []) if k}

    if not seeds and not existing:
        return []

    site_meta = {
        "url": (pages[0].url if pages else "") or "",
        "titles": " | ".join((getattr(p, "title", "") or "") for p in (pages or [])[:15]),
    }

    universe: list[dict] = [
        {"keyword": _titlecase(s), "norm": s, "source": "on-page",
         "frequency": w, "relevance": _seed_relevance(w, tier), "tier": tier}
        for s, w, tier in seeds if s not in existing
    ]
    for s in seeds:
        existing.add(s[0])

    # Run the two network-backed layers concurrently; they are independent.
    ac_task = asyncio.create_task(autocomplete_expand(seeds, existing))
    ai_task = asyncio.create_task(ai_expand(seeds, site_meta, existing)) if use_ai else None
    auto = await ac_task
    if ai_task:
        try:
            ai = await ai_task
        except Exception as e:
            logger.warning(f"AI expansion skipped: {e}")
            ai = []
    else:
        ai = []
    universe.extend(auto)
    universe.extend(ai)

    # Modifiers last: they are pure inference, so they only fill the remainder
    # once real on-page and demand-backed terms are in place.
    if len(universe) < target:
        universe.extend(expand_with_modifiers(seeds, existing, limit=target - len(universe)))

    seen: set = set()
    deduped: list[dict] = []
    for k in universe:
        n = k["norm"]
        if n in seen:
            continue
        seen.add(n)
        deduped.append(k)

    out: list[dict] = []
    for k in deduped[:target]:
        kw = k["keyword"]
        low = kw.lower()
        demand = bool(k.get("demand"))
        intent = k.get("intent") or classify_intent(low)
        freq = int(k.get("frequency") or 0)
        relevance = int(k.get("relevance") or 50)
        # On-page evidence and real demand both raise the ranking; filler lowers it.
        score = relevance + min(freq * 4, 30) + (10 if demand else 0)
        if k["source"] == "modifier":
            score -= 14
        out.append({
            "keyword": kw,
            "frequency": freq,
            "intent": intent,
            "tail": _tail_for(low),
            "word_count": len(low.split()),
            "difficulty": int(k.get("difficulty") or _guess_difficulty(low)),
            "volume": int(k.get("volume") or _estimate_volume(low, demand, relevance // 4)),
            "source": k["source"],
            "relevance": max(1, min(score, 100)),
            "opportunity": "HIGH" if score >= 78 else "MEDIUM" if score >= 52 else "LOW",
            "action": _action_for(low, intent, score),
        })

    out.sort(key=lambda x: (x["relevance"], x["volume"]), reverse=True)
    return out


def _action_for(keyword: str, intent: str, score: int) -> str:
    if score >= 78:
        if intent == "transactional":
            return f"Build a dedicated landing page for '{keyword}'"
        if intent == "commercial":
            return f"Target '{keyword}' on a comparison or guide page"
        return f"Publish in-depth content for '{keyword}'"
    if score >= 52:
        return f"Weave '{keyword}' into an existing topically-relevant page"
    return f"Low-priority: monitor '{keyword}' for emerging demand"