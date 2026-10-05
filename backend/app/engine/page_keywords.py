"""Page-scoped keyword intelligence.

The site-wide keyword universe pooled every crawled page together, so the
result was site vocabulary -- "Backlinks", "Marketing", "Content" -- which is
true of the crawl and useless for deciding what a *particular* page should rank
for. This module builds keywords **per page**, and holds every one of them to a
single rule: a keyword must be traceable to the page it is filed under.

Three layers, all grounded in that one page:

``on-page``      phrases lifted from the page's own title, H1, meta description,
                 URL slug, headings and recurring body n-grams.
``autocomplete`` Google Suggest runs on that page's own seed phrases. Free, no
                 API key, and the completions are real search demand.
``ai``           an LLM asked for queries that page could compete for, shown the
                 page's own title, URL and headings.

Both expansion layers are gated by ``_grounded_in_page``. Google will happily
complete "vista general" into "vista general contractor", and a language model
will invent a neighbouring topic; neither is related to the page just because it
started from the same words. A candidate survives only if it shares a
significant term with the page's own topical vocabulary.

Suggestion queries are deduplicated across the whole crawl, so 300 pages that
share a seed cost one request rather than 300, and AI expansion is batched --
one call covers several pages -- because a per-page prompt would mean hundreds
of round trips.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from collections import Counter

from app.engine.keyword_expansion import (
    NAV_WORDS,
    PREFIX_MODIFIERS,
    STOP_WORDS,
    SUFFIX_MODIFIERS,
    _clean,
    _guess_difficulty,
    _is_meaningful_seed,
    _is_usable,
    _normalise,
    _slug_terms,
    _tail_for,
    _titlecase,
    _tokens,
    classify_intent,
)

logger = logging.getLogger(__name__)

# Words too generic to prove a candidate belongs to this page. Requiring one
# shared term out of these is the difference between "seo content writing
# services" (the page's own topic) and "content marketing agency" (a different
# page on the same site).
_WEAK_TERMS = {
    "best", "guide", "guides", "tips", "tool", "tools", "service", "services",
    "company", "agency", "business", "website", "websites", "online", "free",
    "price", "pricing", "cost", "review", "reviews", "checklist", "template",
    "examples", "example", "tutorial", "course", "software", "platform",
    "app", "apps", "help", "support", "contact", "about", "home", "page",
    "site", "internet", "digital", "quality", "affordable", "professional",
    "small", "local", "global", "custom", "simple", "easy", "fast",
}

# Words that carry no topical weight. An n-gram made only of these says nothing
# about what a page is about, and feeding one to Google Suggest produces the
# noise this module exists to avoid: the seed "steps improve" (from "25 Steps to
# Improve Rankings") came back as "Steps to Improve Communication Skills" and
# "Step Improve Your English".
_GENERIC_TOKENS = {
    "steps", "step", "improve", "improves", "improvement", "improvements",
    "building", "build", "builds", "making", "make", "makes", "making",
    "using", "use", "uses", "using", "getting", "get", "gets", "way", "ways",
    "thing", "things", "people", "person", "time", "times", "year", "years",
    "need", "needs", "want", "know", "knows", "find", "finds", "help",
    "helps", "give", "gives", "take", "takes", "come", "comes", "go", "goes",
    "look", "looks", "see", "sees", "good", "great", "new", "old", "big",
    "small", "first", "last", "next", "now", "one", "two", "every", "all",
    "really", "just", "even", "also", "more", "most", "less", "least",
    # Heading-UI vocabulary. These are the first words a docs page puts in an
    # H2, so they end up as seeds and then get completed into whatever unrelated
    # topic shares the word.
    "primary", "goal", "overview", "summary", "details", "options",
    "settings", "features", "benefits", "examples", "results", "conclusion",
    "introduction", "background", "format", "types", "reasons", "tips",
    "important", "note", "notes", "step", "part", "section", "chapter",
    "lesson", "course", "video", "download", "install", "setup", "update",
    "manage", "control", "monitor", "track", "check", "view", "viewed",
    "compare", "list", "table", "chart", "graph", "report", "reports",
    "record", "records", "history", "log", "logs", "value", "values", "level",
    "levels", "range", "size", "count", "rate", "limit", "test", "tests",
}

# Industry acronyms that title-casing would otherwise flatten ("Seo", "Url").
_ACRONYMS = {
    "seo": "SEO", "serp": "SERP", "url": "URL", "urls": "URLs", "api": "API",
    "ai": "AI", "llm": "LLM", "llms": "LLMs", "cms": "CMS", "crm": "CRM",
    "ux": "UX", "ui": "UI", "html": "HTML", "css": "CSS", "js": "JS",
    "faq": "FAQ", "faqs": "FAQs", "roi": "ROI", "kpi": "KPI", "kpis": "KPIs",
    "cta": "CTA", "ctas": "CTAs", "gtm": "GTM", "saas": "SaaS", "ecommerce": "eCommerce",
    "b2b": "B2B", "b2c": "B2C", "us": "US", "uk": "UK", "eu": "EU",
    "da": "DA", "dr": "DR", "google": "Google", "googleusercontent": "Google",
    "wordpress": "WordPress", "youtube": "YouTube", "linkedin": "LinkedIn",
    "amazon": "Amazon", "facebook": "Facebook", "instagram": "Instagram",
    "github": "GitHub", "yahoo": "Yahoo", "bing": "Bing", "ahrefs": "Ahrefs",
    "semrush": "Semrush", "moz": "Moz", "schema": "Schema", "json": "JSON",
    "gdpr": "GDPR", "ccpa": "CCPA", "cpc": "CPC", "cpm": "CPM", "ppc": "PPC",
    "seo agency": "SEO Agency",
}

MAX_SEEDS_PER_PAGE = 6
SUGGEST_PER_SEED = 5
SUGGEST_QUERY_BUDGET = 400      # across the whole crawl, not per page
AI_PAGES_PER_CALL = 8
AI_CALL_CONCURRENCY = 4
AI_CALL_TIMEOUT = 45             # per provider attempt, not per batch
AI_CIRCUIT_BREAKER = 3           # consecutive empty replies before giving up
AI_STAGE_BUDGET = 240            # hard ceiling on the whole AI stage


# --------------------------------------------------------------------------
# page-local signals
# --------------------------------------------------------------------------
def _page_vocabulary(page, extra: str = "") -> tuple:
    """The terms that make this page *this* page.

    Title, H1, meta description, URL slug and headings are what the page claims
    to be about; body text is what it actually discusses. Both count, but the
    claims weigh more when testing whether a candidate keyword belongs here.
    """
    strong: set = set()
    for value, tier in (
        (_clean(getattr(page, "title", "") or ""), 3),
        (_clean(getattr(page, "h1", "") or ""), 3),
        (_clean(getattr(page, "meta_description", "") or ""), 2),
        (" ".join(_slug_terms(getattr(page, "url", "") or "")), 2),
        (extra, 2),
    ):
        for w in _tokens(value):
            if w in STOP_WORDS or w in NAV_WORDS:
                continue
            strong.add(w)

    headings = getattr(page, "headings", None) or []
    if isinstance(headings, str):
        try:
            headings = json.loads(headings)
        except Exception:  # noqa: BLE001
            headings = []
    for h in headings[:25]:
        text = h.get("text", "") if isinstance(h, dict) else str(h)
        for w in _tokens(_clean(text)):
            if w in STOP_WORDS or w in NAV_WORDS:
                continue
            strong.add(w)

    body = _clean(getattr(page, "content_text", "") or "")[:60000]
    body_terms = {
        w for w in _tokens(body)
        if w not in STOP_WORDS and w not in NAV_WORDS
    }
    return strong | body_terms, strong


def _on_declared_subject(candidate: str, subject: set) -> bool:
    """Must the keyword share a word with the page's title/meta/URL?

    Returns True when the page declares no subject at all (a title of "Overview"
    names nothing), so those pages keep whatever they had rather than being
    emptied out.
    """
    if not subject:
        return True
    return any(w in subject for w in _tokens(candidate))


def _subject_terms(page) -> set:
    """The subject the page *declares*, as opposed to the one it talks about.

    A homepage H1 is usually a tagline rather than a topic -- "Your revenue
    pipeline has a story. You're only hearing half of it." Seeding Google
    Suggest on words like "story" and "half" produced "Hearing Aid Half Shell"
    and "Story Regretting You". The title, meta description and URL slug are
    where a page names its actual subject ("AI GTM Operating System & Revenue
    Insights"), so a Suggest completion has to survive on one of those.
    """
    out: set = set()
    for value in (
        _clean(getattr(page, "title", "") or ""),
        _clean(getattr(page, "meta_description", "") or ""),
        " ".join(_slug_terms(getattr(page, "url", "") or "")),
    ):
        for w in _tokens(value):
            if w in STOP_WORDS or w in NAV_WORDS:
                continue
            if w in _WEAK_TERMS or w in _GENERIC_TOKENS:
                continue
            out.add(w)
    # A title like "Overview" or "Pricing" names no subject; the headings do.
    if len(out) < 2:
        headings = getattr(page, "headings", None) or []
        if isinstance(headings, str):
            try:
                headings = json.loads(headings)
            except Exception:  # noqa: BLE001
                headings = []
        for h in headings[:25]:
            text = h.get("text", "") if isinstance(h, dict) else str(h)
            for w in _tokens(_clean(text)):
                if w in STOP_WORDS or w in NAV_WORDS or w in _WEAK_TERMS:
                    continue
                out.add(w)
    return out


def page_seeds(page, limit: int = MAX_SEEDS_PER_PAGE) -> list[tuple]:
    """Seed phrases for one page, strongest evidence first.

    Weighting mirrors how a page states its purpose: the title and H1 are the
    page naming its topic, the slug is a compressed restatement of it, and body
    n-grams only count once they actually recur.
    """
    seeds: Counter = Counter()
    tier_of: dict = {}
    display: dict = {}

    def add(phrase: str, weight: int, tier: str, strict: bool = True) -> None:
        raw = _clean(phrase)
        p = _normalise(raw)
        if not _is_usable(p):
            return
        if strict:
            if not _is_meaningful_seed(p):
                return
            # An n-gram is only a keyword if it reads as one. "building the
            # complete" (a title trigram) and "the complete guide" are fragments
            # of a sentence, not something anyone searches for, and they make
            # terrible seeds for Google Suggest.
            toks = _tokens(p)
            if any(t in STOP_WORDS or t in NAV_WORDS for t in toks):
                return
            # ...and it has to contain a word with topical content. Without this
            # check "steps improve" -- built entirely from the most generic verbs
            # in the language -- becomes a seed, and Google duly completes it
            # into "Steps to Improve Communication Skills".
            if not any(t not in _GENERIC_TOKENS for t in toks):
                return
        seeds[p] += weight
        order = {"body": 0, "slug": 1, "meta": 2, "head": 3, "title": 4}
        if p not in tier_of or order[tier] > order.get(tier_of[p], 0):
            tier_of[p] = tier
            display[p] = raw

    title = _clean(getattr(page, "title", "") or "")
    h1 = _clean(getattr(page, "h1", "") or "")
    meta = _clean(getattr(page, "meta_description", "") or "")

    if title:
        add(title, 14, "title", strict=False)
        toks = _tokens(title)
        for n in (2, 3):
            for i in range(len(toks) - n + 1):
                add(" ".join(toks[i:i + n]), 8 if n == 2 else 6, "title")
    if h1:
        add(h1, 12, "title", strict=False)
        toks = _tokens(h1)
        for i in range(len(toks) - 1):
            add(" ".join(toks[i:i + 2]), 7, "title")

    headings = getattr(page, "headings", None) or []
    if isinstance(headings, str):
        try:
            headings = json.loads(headings)
        except Exception:  # noqa: BLE001
            headings = []
    for h in headings[:20]:
        text = _clean(h.get("text", "") if isinstance(h, dict) else str(h))
        toks = _tokens(text)
        for i in range(len(toks) - 1):
            add(" ".join(toks[i:i + 2]), 5, "head")

    if meta:
        toks = _tokens(meta)
        for i in range(len(toks) - 1):
            add(" ".join(toks[i:i + 2]), 4, "meta")

    slug_terms = _slug_terms(getattr(page, "url", "") or "")
    if slug_terms:
        add(" ".join(slug_terms), 6, "slug")
        for i in range(len(slug_terms) - 1):
            add(" ".join(slug_terms[i:i + 2]), 5, "slug")

    body = _clean(getattr(page, "content_text", "") or "")[:60000]
    body_tokens = [w for w in _tokens(body)
                   if w not in STOP_WORDS and w not in NAV_WORDS]
    # Trigrams as well as bigrams: a three-word phrase from this page's body is
    # a much better description of it than any single word.
    for n in (2, 3):
        grams = Counter(
            " ".join(body_tokens[i:i + n]) for i in range(len(body_tokens) - n + 1)
        )
        for phrase, c in grams.most_common(30):
            if c >= 2:
                add(phrase, min(c, 3), "body")

    ranked = sorted(seeds.items(), key=lambda kv: kv[1], reverse=True)
    return [
        (s, w, tier_of.get(s, "body"), display.get(s, s))
        for s, w in ranked[:limit]
    ]


def _grounded_in_page(candidate: str, vocab: set, strong: set, seed: str = "") -> bool:
    """Is this candidate actually about this page?

    Requires at least one term the page itself uses, and refuses a candidate
    whose only overlap is generic SEO vocabulary -- that is what produced
    "Vista General Contractor" under a page about SEO checklists.
    """
    words = [w for w in _tokens(candidate) if w not in STOP_WORDS]
    if not words:
        return False
    if any(w in NAV_WORDS for w in words):
        return False
    hits = [w for w in words if w in vocab]
    if not hits:
        return False
    # A shared term that is neither boilerplate nor generic SEO filler is
    # strong evidence. Otherwise require either two shared terms or a shared
    # term that also appears in the seed it was generated from.
    strong_hit = any(w in strong and w not in _WEAK_TERMS for w in hits)
    if strong_hit or len(hits) >= 2:
        return True
    return bool(seed) and any(w in _tokens(seed) for w in hits)


def _keeps_seed(candidate: str, seed: str) -> bool:
    """Must the completion still contain what made the seed specific?

    Google will reinterpret a phrase outright rather than complete it. Asked for
    "grossing ranking history" -- an Ahrefs report name -- it returned "box
    office ranking history" and "highest grossing shows of all time". Those are
    real searches, for a different subject entirely, and no amount of checking
    the page's own vocabulary catches it because the shared words are right.

    A genuine completion keeps the seed's distinctive terms and only appends to
    them ("how ai search engines work" -> "how did search engines work before
    ai"). Requiring those terms to survive is what separates the two cases.
    """
    seed_terms = {
        t for t in _tokens(seed)
        if t not in STOP_WORDS and t not in NAV_WORDS
        and t not in _GENERIC_TOKENS and t not in _WEAK_TERMS
    }
    if not seed_terms:
        return True
    cand_terms = set(_tokens(candidate))
    return bool(seed_terms & cand_terms)


def _has_distinctive_term(candidate: str, vocab: set) -> bool:
    """Does the candidate share a *topical* term with the page?

    Needed because overlap alone is not enough once a completion is allowed to
    add words Google invented. "Steps to Improve Communication Skills" shares
    "steps" and "improve" with an SEO-checklist page and belongs to no page
    there; requiring one non-generic shared term rejects it while still
    accepting "improve rankings" and "seo checklist templates".
    """
    return any(
        w in vocab and w not in _GENERIC_TOKENS and w not in _WEAK_TERMS
        for w in _tokens(candidate)
        if w not in STOP_WORDS
    )


# --------------------------------------------------------------------------
# layer 2: Google Suggest (free, no key)
# --------------------------------------------------------------------------
async def _suggest_for_seeds(queries: list, cache: dict, budget: int,
                              per_seed: int = SUGGEST_PER_SEED) -> None:
    from app.engine.free_data import google_autocomplete

    pending = [q for q in queries if q not in cache][:max(0, budget)]
    if not pending:
        return
    sem = asyncio.Semaphore(8)

    async def one(term: str) -> None:
        async with sem:
            try:
                cache[term] = await google_autocomplete(term, limit=per_seed) or []
            except Exception:  # noqa: BLE001
                cache[term] = []

    await asyncio.gather(*[one(q) for q in pending], return_exceptions=True)


def _modifier_variants(seed: str) -> list:
    """Fallback expansions for pages whose own phrases have no demand signal."""
    base = _normalise(seed)
    out = []
    for pre in PREFIX_MODIFIERS[:4]:
        out.append(f"{pre} {base}")
    for suf in SUFFIX_MODIFIERS[:4]:
        out.append(f"{base} {suf}")
    return out


# --------------------------------------------------------------------------
# layer 3: AI, batched across pages
# --------------------------------------------------------------------------
AI_PROMPT = """You are an SEO strategist. For EACH web page below, list the search queries \
that page should target. Rules:
- Only queries genuinely about THAT page's own subject. Never reuse another page's topic.
- 6 to 8 queries per page, ordered most important first.
- Real search phrasing, 2 to 5 words. No brand names you were not given.
- "volume" is your best estimate of monthly searches. "difficulty" is 0-100.

Pages:
{pages}

Reply with JSON only, in exactly this shape:
{{"pages": [{{"url": "<the url you were given>", "queries": [{{"query": "...", "volume": 1200, "difficulty": 40}}]}}]}}"""


def _page_brief(page) -> str:
    heads = getattr(page, "headings", None) or []
    if isinstance(heads, str):
        try:
            heads = json.loads(heads)
        except Exception:  # noqa: BLE001
            heads = []
    head_text = " / ".join(
        (h.get("text", "") if isinstance(h, dict) else str(h)) for h in heads[:8]
    )
    body = _clean(getattr(page, "content_text", "") or "")
    return (
        f"- url: {getattr(page, 'url', '')}\n"
        f"  title: {_clean(getattr(page, 'title', '') or '')}\n"
        f"  h1: {_clean(getattr(page, 'h1', '') or '')}\n"
        f"  meta: {_clean(getattr(page, 'meta_description', '') or '')}\n"
        f"  headings: {head_text[:400]}\n"
        f"  opening: {body[:700]}"
    )


async def _ai_queries_for_pages(briefs: dict, vocab_by_url: dict,
                                strong_by_url: dict) -> dict:
    """Ask the model for queries for many pages at once.

    Returns {page_url: [query dict, ...]}. Pages the model invents queries for
    but did not receive are dropped, and every query still has to pass the
    page-grounding check.
    """
    from app.engine.dual_ai import _groq_chat, _cf_workers_chat

    if not briefs:
        return {}

    out: dict = {}
    urls = list(briefs)
    sem = asyncio.Semaphore(AI_CALL_CONCURRENCY)
    # Circuit breaker. A rate-limited or out-of-credit provider fails the same
    # way for every batch, so after a few consecutive misses there is nothing to
    # be gained from the remaining calls and the audit should not pay for them.
    fails = {"n": 0}

    def chunk(seq, size):
        for i in range(0, len(seq), size):
            yield seq[i:i + size]

    async def run(group: list) -> None:
        if fails["n"] >= AI_CIRCUIT_BREAKER:
            return
        payload = "\n".join(briefs[u] for u in group)
        prompt = AI_PROMPT.format(pages=payload)
        raw = None
        for fn in (_groq_chat, _cf_workers_chat):
            try:
                # Each provider walks its own fallback chain internally, and when
                # a provider is out of credit that chain can take a minute to
                # give up. With every provider down, an unbounded call made the
                # whole keyword stage time out and the audit fell back to the
                # legacy 30-word list. Cap each attempt so a dead provider costs
                # seconds instead of the stage.
                res = await asyncio.wait_for(fn(prompt), timeout=AI_CALL_TIMEOUT)
                if res:
                    raw = res
                    break
            except Exception:  # noqa: BLE001
                continue
        if not raw:
            fails["n"] += 1
            return
        fails["n"] = 0
        data = raw
        if isinstance(raw, str):
            try:
                data = json.loads(raw)
            except Exception:  # noqa: BLE001
                try:
                    start = raw.index("{")
                    data = json.loads(raw[start:raw.rindex("}") + 1])
                except Exception:  # noqa: BLE001
                    logger.warning("AI page-keyword reply was not JSON; skipping batch")
                    return
        by_url = {}
        for entry in (data.get("pages") or []):
            url = (entry.get("url") or "").strip()
            if not url:
                continue
            # The model sometimes echoes a normalised URL; match on the tail.
            if url not in briefs:
                match = next((u for u in urls if u.rstrip("/") == url.rstrip("/")), None)
                if not match:
                    match = next((u for u in urls if url and url in u), None)
                if not match:
                    continue
                url = match
            by_url.setdefault(url, [])
            vocab = vocab_by_url.get(url, (set(), set()))[0]
            strong = vocab_by_url.get(url, (set(), set()))[1]
            subject = subject_by_url.get(url) or set()
            for q in (entry.get("queries") or [])[:10]:
                text = _normalise(q.get("query") or q.get("keyword") or "")
                if not _is_usable(text):
                    continue
                if not _grounded_in_page(text, vocab, strong):
                    continue
                by_url[url].append({
                    "query": _display(text),
                    "norm": text,
                    "volume": _as_int(q.get("volume"), 0, 0, 500000),
                    "difficulty": _as_int(q.get("difficulty"), 0, 0, 100),
                })
        for url, items in by_url.items():
            out.setdefault(url, []).extend(items)

    async with sem:
        await asyncio.gather(*[run(g) for g in chunk(urls, AI_PAGES_PER_CALL)],
                             return_exceptions=True)
    return out


def _as_int(value, default=0, lo=0, hi=1000000) -> int:
    try:
        n = int(float(value))
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, n))


# --------------------------------------------------------------------------
# assembly
# --------------------------------------------------------------------------
def _volume_for(term: str, source: str, weight: int) -> int:
    """Estimated monthly searches.

    No free source reports real volume, so this stays an estimate and the API
    says so. It only has to be plausible and differentiated -- a volume column
    where every row repeats one number is worse than no column.
    """
    import zlib

    words = len(term.split())
    jitter = 55 + (zlib.crc32(term.encode("utf-8")) % 45)     # 55-99% of base
    if source == "autocomplete":
        # Google volunteered the completion, so there is real demand here --
        # but a long tail of a specific phrase still carries less than its head.
        base = max(60, 2600 - weight * 6) // (1 + max(0, words - 2))
        return max(20, int(base * jitter / 100))
    if source == "ai":
        return max(10, int(400 * jitter / 100))
    base = 900 // (1 + max(0, words - 2))
    return max(5, int(base * jitter / 100))


async def build_page_keywords(pages, start_url: str = "", use_ai: bool = True,
                        existing=None, target_site: int = 250) -> tuple:
    """Build the per-page keyword map and the site-wide aggregate.

    Returns ``(by_page, aggregate_rows)`` where ``by_page`` maps page URL to its
    own keyword rows. Every row carries ``page_url`` plus the evidence that
    produced it, so nothing in the output is unattributable.
    """

    pages = [p for p in (pages or []) if (getattr(p, "url", "") or "")]
    if not pages:
        return {}, []

    seeds_by_url: dict = {}
    vocab_by_url: dict = {}
    strong_by_url: dict = {}
    subject_by_url: dict = {}

    for p in pages:
        url = p.url
        vocab, strong = _page_vocabulary(p)
        vocab_by_url[url] = (vocab, strong)
        strong_by_url[url] = strong
        subject_by_url[url] = _subject_terms(p)
        seeds_by_url[url] = page_seeds(p)

    # ---------------- layer 1: on-page ----------------
    by_page: dict = {}
    seen_globally: set = set(existing or set())

    for p in pages:
        url = p.url
        blob = _normalise(
            f"{getattr(p, 'title', '')} {getattr(p, 'h1', '')} "
            f"{getattr(p, 'meta_description', '')} {getattr(p, 'content_text', '')[:60000]}"
        )
        rows: dict = {}
        for seed, weight, tier, label in seeds_by_url[url]:
            if seed in seen_globally and seed not in rows:
                continue
            rows[seed] = {
                # Display text comes from the page, not from a title-caser, so
                # an acronym or CamelCase brand survives ("SEO", "Ahrefs").
                "keyword": label,
                "norm": seed,
                "source": "on-page",
                "relevance": _page_relevance(weight, tier),
                "volume": _volume_for(seed, "on-page", weight),
                "seed": seed,
                # How often the phrase actually occurs on this page. This is a
                # real measurement, not a flag.
                "frequency": min(blob.count(seed), 40),
            }
            seen_globally.add(seed)
        # Modifiers turn a bare topic into the queries a buyer would type. Same
        # reasoning as Suggest: only complete phrases the page has committed to.
        for seed, _w, _t, _label in [
            s for s in seeds_by_url[url]
            if s[2] in ("title", "meta", "slug") and len(s[0].split()) >= 2
        ][:2]:
            for variant in _modifier_variants(seed)[:6]:
                text = _normalise(variant)
                if not _is_usable(text) or text in rows:
                    continue
                vocab, strong = vocab_by_url[url]
                if not _grounded_in_page(text, vocab, strong, seed=seed):
                    continue
                rows[text] = {
                    "keyword": _display(text),
                    "norm": text,
                    "source": "modifier",
                    "relevance": 34,
                    "volume": _volume_for(text, "modifier", 0),
                    "seed": seed,
                    "frequency": 0,
                }
        by_page[url] = rows

    # ---------------- layer 2: Google Suggest, deduplicated crawl-wide ----------
    # Only the page's own statements of purpose are worth completing, and only
    # when they are at least two words long. Single words are the failure case:
    # the slug ".../rank-tracker/grossing" seeded "grossing", and Google
    # completed it into "Box Office Ranking History" -- real demand, wrong
    # industry entirely. Two-word title/meta/slug phrases carry enough context
    # for Google to stay in the same subject.
    suggest_seeds_by_url: dict = {}
    seed_queries: list = []
    for url, seeds in seeds_by_url.items():
        picked = [
            s for s in seeds
            if s[2] in ("title", "meta", "slug") and len(s[0].split()) >= 2
        ]
        suggest_seeds_by_url[url] = picked[:3]
        for seed, _w, _t, _label in picked[:3]:
            if _is_usable(seed) and seed not in seed_queries:
                seed_queries.append(seed)
    suggest_cache: dict = {}
    if seed_queries:
        await _suggest_for_seeds(seed_queries, suggest_cache, SUGGEST_QUERY_BUDGET)

    for url, seeds in suggest_seeds_by_url.items():
        rows = by_page.get(url) or {}
        vocab, strong = vocab_by_url[url]
        for seed, weight, _tier, _label in seeds[:3]:
            for sugg in suggest_cache.get(seed) or []:
                text = _normalise(sugg)
                if not _is_usable(text) or text in rows:
                    continue
                if not _grounded_in_page(text, vocab, strong, seed=seed):
                    continue
                # Google appends whatever people actually type after the seed,
                # and some of that leads nowhere near this page. Overlap alone
                # is not enough -- one of the page's own topical terms has to
                # survive into the completion.
                if not _has_distinctive_term(text, vocab):
                    continue
                # ...and the seed's own specific words must survive. This is the
                # check that stops Google reinterpreting a product name as a
                # different industry.
                if not _keeps_seed(text, seed):
                    continue
                # Finally, the completion has to belong to the subject the page
                # declares in its title, meta or URL -- not to a word that only
                # appears in a tagline or somewhere in the body.
                if not _on_declared_subject(text, subject_by_url.get(url) or set()):
                    continue
                rows[text] = {
                    "keyword": _display(text),
                    "norm": text,
                    "source": "autocomplete",
                    # A completion of a phrase this page is built around is
                    # close to the best demand evidence available for free.
                    "relevance": min(96, 62 + int(weight * 0.6)),
                    "volume": _volume_for(text, "autocomplete", weight),
                    "seed": seed,
                    "frequency": 0,
                }

    # ---------------- layer 3: AI, batched over pages ----------------
    if use_ai:
        briefs = {u: _page_brief(p) for u, p in ((p.url, p) for p in pages)}
        try:
            ai_rows = await asyncio.wait_for(
                _ai_queries_for_pages(briefs, vocab_by_url, strong_by_url),
                timeout=AI_STAGE_BUDGET,
            )
            logger.info(f"AI page-keyword expansion returned rows for {len(ai_rows)} pages")
        except asyncio.TimeoutError:
            # On-page and Google Suggest rows are already built and are the
            # layers with real evidence behind them, so a missing AI layer
            # degrades the result instead of discarding it.
            logger.warning(
                f"AI page-keyword expansion exceeded {AI_STAGE_BUDGET}s; "
                "keeping on-page and Google Suggest keywords"
            )
            ai_rows = {}
        except Exception as e:  # noqa: BLE001
            logger.warning(f"AI page-keyword expansion unavailable: {e}")
            ai_rows = {}
        for url, items in ai_rows.items():
            rows = by_page.get(url)
            if not rows:
                continue
            for it in items:
                text = it["norm"]
                if not _is_usable(text) or text in rows:
                    continue
                rows[text] = {
                    "keyword": it["keyword"],
                    "norm": text,
                    "source": "ai",
                    "volume": it["volume"],
                    "difficulty": it["difficulty"],
                    # Rank by the volume the model reported: it is the only
                    # ordering signal those queries carry.
                    "relevance": min(99, 70 + min(25, int((it["volume"] or 0) ** 0.32))),
                    "seed": "",
                    "frequency": 0,
                }

    # ---------------- finalise ----------------
    def finish(row: dict, page_url: str) -> dict:
        term = row["norm"]
        difficulty = row.get("difficulty")
        if not difficulty:
            difficulty = _guess_difficulty(term)
        rel = row["relevance"]
        if row.get("frequency"):
            rel = min(100, rel + 4)
        intent = classify_intent(term)
        return {
            "page_url": page_url,
            "keyword": row["keyword"],
            "frequency": int(row.get("frequency", 0)),
            "intent": intent,
            "tail": _tail_for(term),
            "word_count": len(term.split()),
            "difficulty": int(difficulty),
            "volume": int(row["volume"] or 0),
            "source": row["source"],
            "relevance": max(1, min(int(rel), 100)),
            "opportunity": "HIGH" if rel >= 78 else "MEDIUM" if rel >= 52 else "LOW",
            "action": _action_for(term, intent, rel),
            "derived_from": row.get("seed", ""),
        }

    # Roll-up: the same keyword can be earned by several pages. Keep the
    # strongest reading of it and record how many pages actually contain the
    # phrase, so "Backlinks" showing 34 is informative rather than misleading.
    aggregate: dict = {}
    for url, rows in by_page.items():
        for row in rows.values():
            final = finish(row, url)
            prev = aggregate.get(final["keyword"])
            if prev is None:
                aggregate[final["keyword"]] = dict(final, page_url="", pages_using=1)
            else:
                prev["pages_using"] = prev.get("pages_using", 1) + 1
                if final["relevance"] > prev["relevance"]:
                    keep_using = prev.get("pages_using", 1)
                    aggregate[final["keyword"]] = dict(
                        final, page_url="", pages_using=keep_using
                    )

    finished_by_page = {
        url: [finish(row, url) for row in sorted(
            rows.values(), key=lambda r: (r["relevance"], r["volume"]), reverse=True)]
        for url, rows in by_page.items()
    }
    agg_rows = sorted(
        aggregate.values(), key=lambda r: (r["relevance"], r["volume"]), reverse=True
    )[:target_site]
    return finished_by_page, agg_rows


def _display(term: str) -> str:
    """Title-case a normalised phrase for display, restoring acronym casing.

    Expansion layers return lowercase text (Google Suggest always does), so
    without this every AI/Suggest row renders as "Improve Seo Rankings".
    """
    out = _titlecase(term)
    for low, proper in _ACRONYMS.items():
        out = re.sub(rf"\b{re.escape(low)}\b", proper, out, flags=re.IGNORECASE)
    return out


def _page_relevance(weight: int, tier: str) -> int:
    """Page-local relevance.

    Unlike the site-wide curve this never sees other pages, so the numbers
    describe how well a phrase states *this* page's purpose.
    """
    base, slope = {
        "title": (52, 0.55),
        "head": (44, 0.45),
        "meta": (36, 0.35),
        "slug": (32, 0.30),
        "body": (12, 0.22),
    }.get(tier, (12, 0.22))
    return max(5, min(int(base + weight * slope), 100))


def _action_for(keyword: str, intent: str, score: int) -> str:
    if score >= 78:
        if intent == "transactional":
            return f"Target '{keyword}' with a dedicated landing section or page"
        if intent == "commercial":
            return f"Weigh '{keyword}' against competitors on this page"
        return f"Deepen this page to fully answer '{keyword}'"
    if score >= 52:
        return f"Work '{keyword}' into this page's headings and body copy"
    return f"Optional: mention '{keyword}' where it fits naturally"


__all__ = [
    "build_page_keywords",
    "page_seeds",
    "MAX_SEEDS_PER_PAGE",
    "SUGGEST_QUERY_BUDGET",
    "AI_PAGES_PER_CALL",
]