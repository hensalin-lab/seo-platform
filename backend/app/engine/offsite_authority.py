"""
Offsite Authority Engine (Engine 11)
Analyzes a brand's presence and authority across third-party platforms
using signals extractable from crawled page data.
"""
from __future__ import annotations

import re
import math
from collections import Counter


# ---------------------------------------------------------------------------
# Platform definitions: (key, match_patterns_in_urls, match_patterns_in_text,
#                       base_score_for_link, base_score_for_mention)
# match_patterns are (compiled_regex, label) tuples
# ---------------------------------------------------------------------------

def _compile(pattern: str, flags: int = re.IGNORECASE) -> re.Pattern:
    return re.compile(pattern, flags)


# URL patterns  –  checked against href attributes in <a> tags
_PLATFORM_URL: dict[str, list[re.Pattern]] = {
    "wikipedia":   [_compile(r'wikipedia\.org')],
    "github":      [_compile(r'github\.com')],
    "reddit":      [_compile(r'reddit\.com|redd\.it')],
    "linkedin":    [_compile(r'linkedin\.com')],
    "medium":      [_compile(r'medium\.com|medium\.co')],
    "youtube":     [_compile(r'youtube\.com|youtu\.be')],
    "stackoverflow": [_compile(r'stackoverflow\.com|stackexchange\.com')],
    "producthunt": [_compile(r'producthunt\.com')],
    "crunchbase":  [_compile(r'crunchbase\.com')],
    "g2":          [_compile(r'g2\.com|g2crowd\.com')],
    "capterra":    [_compile(r'capterra\.com')],
    "hackernews":  [_compile(r'news\.ycombinator\.com|hackernoon\.com')],
}

# Text mention patterns  –  checked against visible page text
_PLATFORM_MENTION: dict[str, list[re.Pattern]] = {
    "wikipedia":   [_compile(r'\bwikipedia\b')],
    "github":      [_compile(r'\bgithub\b')],
    "reddit":      [_compile(r'\breddit\b')],
    "linkedin":    [_compile(r'\blinkedin\b')],
    "medium":      [_compile(r'\bmedium(?:\s+publication)?\b')],
    "youtube":     [_compile(r'\byoutube\b')],
    "stackoverflow": [_compile(r'\bstack\s*overflow\b')],
    "producthunt": [_compile(r'\bproduct\s*hunt\b')],
    "crunchbase":  [_compile(r'\bcrunchbase\b')],
    "g2":          [_compile(r'\bg2\b|\bg2\s*crowd\b')],
    "capterra":    [_compile(r'\bcapterra\b')],
    "hackernews":  [_compile(r'\bhacker\s*news\b|\bhn\b|\by\s*combinator\b')],
}

# Scoring weights per platform (relative authority value 0-1)
_PLATFORM_WEIGHT: dict[str, float] = {
    "wikipedia": 1.0,
    "github": 0.7,
    "reddit": 0.4,
    "linkedin": 0.6,
    "medium": 0.3,
    "youtube": 0.5,
    "stackoverflow": 0.8,
    "producthunt": 0.5,
    "crunchbase": 0.6,
    "g2": 0.7,
    "capterra": 0.6,
    "hackernews": 0.6,
}

# ---------------------------------------------------------------------------
# Regex helpers
# ---------------------------------------------------------------------------

_HTML_TAG_RE = _compile(r'<[^>]+>')
_HREF_RE = _compile(r'href\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
_URL_RE = _compile(r'https?://[^/]+')
_DOMAIN_RE = _compile(r'https?://([^/"\'>\s]+)')
_WORD_RE = _compile(r'\b[a-z]{3,}\b', re.IGNORECASE)
_STAT_RE = _compile(r'\b\d[\d,.]*\s*%|\$\s*\d[\d,.]*|\b\d[\d,.]*\s*(?:million|billion|thousand|k\b|m\b|b\b)')
_CITATION_RE = _compile(r'\[(?:\d+)\]|\b(?:according to|source[sd]?\s*[:=]|cited\s+(?:from|by)|study\s+(?:by|from)|research\s+(?:shows|by))\b', re.IGNORECASE)
_QUOTE_RE = _compile(r'[""\u201c][^""\u201d]{20,}[""\u201d]|"[^"]{20,}"|said\s+\w+|stated\s+\w+|according\s+to\s+\w+')
_CASE_STUDY_RE = _compile(r'\bcase\s+study\b|\bcase\s+stud(?:y|ies)\b|\bcustomer\s+success\b|\bsuccess\s+story\b', re.IGNORECASE)
_DATA_TABLE_RE = _compile(r'<table[\s>]|<th[\s>]|<td[\s>]', re.IGNORECASE)
_RESEARCH_RE = _compile(r'\boriginal\s+research\b|\binternal\s+(?:data|study|research)\b|\bour\s+(?:data|research|study)\b', re.IGNORECASE)

_AUTHOR_LINK_RE = _compile(r'href\s*=\s*["\']([^"\']*(?:author|contributors?|profile|team)[^"\']*)["\']', re.IGNORECASE)
_SOCIAL_DOMAINS = frozenset([
    'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
    'tiktok.com', 'pinterest.com', 'threads.net', 'bsky.app',
    'mastodon.social', 'mastodon.cloud', 'fosstodon.org',
])

_LOW_QUALITY_DOMAINS = frozenset([
    'buycheaplinks.com', 'fiverr.com', 'seo-clerks.com',
    'freelancer.com', 'upwork.com', 'bidvertiser.com',
    'chitika.com', 'buysellads.com', 'clicksor.com',
])

_INDUSTRY_KEYWORDS = frozenset([
    'technology', 'software', 'saas', 'startup', 'innovation',
    'digital', 'cloud', 'data', 'analytics', 'security', 'ai',
    'machine learning', 'automation', 'enterprise', 'platform',
    'infrastructure', 'devops', 'fintech', 'healthtech',
    'edtech', 'martech', 'ecommerce', 'api', 'open source',
])

_NEWS_DOMAINS = frozenset([
    'techcrunch.com', 'venturebeat.com', 'theverge.com', 'arstechnica.com',
    'wired.com', 'forbes.com', 'bloomberg.com', 'reuters.com',
    'zdnet.com', 'cnet.com', 'engadget.com', 'mashable.com',
    'thenextweb.com', 'fastcompany.com', 'inc.com', 'hbr.org',
    'nytimes.com', 'bbc.com', 'cnn.com', 'guardian.com',
])

# Podcast signal patterns
_PODCAST_RE = _compile(r'\bpodcast(?:s)?\b|\bepisode\s+\d+\b|\blisten\s+(?:on|to)\b|\bspotify\.com|apple\.com\/podcasts', re.IGNORECASE)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_link_list(links: list) -> list[str]:
    """Convert list of link dicts (from DB) or plain URL strings to plain strings."""
    result: list[str] = []
    for item in links:
        if isinstance(item, dict):
            url_val = item.get("url") or item.get("href") or ""
            if url_val:
                result.append(str(url_val))
        elif isinstance(item, str):
            result.append(item)
    return result


def _safe_domain(url: str) -> str:
    m = _DOMAIN_RE.search(url)
    return m.group(1).lower() if m else ''


def _strip_html(html: str) -> str:
    return _HTML_TAG_RE.sub(' ', html)


def _extract_external_hrefs(html: str) -> list[str]:
    return _HREF_RE.findall(html)


def _unique_domains(hrefs: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for href in hrefs:
        d = _safe_domain(href)
        if d and d not in seen:
            seen.add(d)
            result.append(d)
    return result


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    if math.isnan(val) or math.isinf(val):
        return lo
    return max(lo, min(hi, val))


# ---------------------------------------------------------------------------
# Main Engine
# ---------------------------------------------------------------------------

class OffsiteAuthorityEngine:
    """Engine 11 — Offsite Authority & Third-Party Platform Presence."""

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def analyze(self, page: dict, all_pages: list | None = None) -> dict:  # noqa: C901 – intentionally one class
        page = page or {}
        all_pages = all_pages or []

        url: str = page.get('url', '')
        title: str = page.get('title', '')
        meta_desc: str = page.get('meta_description', '')
        domain: str = page.get('domain', '') or _safe_domain(url)
        brand_name: str = page.get('brand_name', '') or _extract_brand_from_title(title)

        html_raw: str = page.get('html_raw', '') or ''
        content_text: str = page.get('content_text', '') or ''
        raw_ext = page.get('links_external', []) or []
        links_external: list[str] = _normalize_link_list(raw_ext)
        raw_int = page.get('links_internal', []) or []
        links_internal: list[str] = _normalize_link_list(raw_int)
        word_count: int = page.get('word_count', 0) or len(_WORD_RE.findall(content_text))
        images: list = page.get('images', []) or []
        schema: list = page.get('schema_markup', []) or []
        headings: list = page.get('headings', []) or []
        page_type: str = page.get('page_type', '')

        # Derive a combined text blob for analysis
        text_for_analysis = f"{title} {meta_desc} {content_text}"

        # ------------------------------------------------------------------
        # 1. Platform presence
        # ------------------------------------------------------------------
        platform_presence = self._check_platform_presence(
            html_raw, text_for_analysis, links_external,
        )

        # ------------------------------------------------------------------
        # 2. External link quality
        # ------------------------------------------------------------------
        ext_link_quality = self._analyze_external_links(
            links_external, domain,
        )

        # ------------------------------------------------------------------
        # 3. Brand signals
        # ------------------------------------------------------------------
        brand_signals = self._analyze_brand_signals(
            text_for_analysis, html_raw, brand_name, links_external,
        )

        # ------------------------------------------------------------------
        # 4. Content authority signals
        # ------------------------------------------------------------------
        content_authority = self._analyze_content_authority(
            text_for_analysis, html_raw, word_count,
        )

        # ------------------------------------------------------------------
        # 5. Backlink opportunities
        # ------------------------------------------------------------------
        backlink_opps = self._suggest_backlink_opportunities(
            platform_presence, ext_link_quality, page_type,
        )

        # ------------------------------------------------------------------
        # 6. Competitor gap estimate
        # ------------------------------------------------------------------
        competitor_gap = self._estimate_competitor_gap(
            ext_link_quality, word_count,
        )

        # ------------------------------------------------------------------
        # 7. Aggregate authority score
        # ------------------------------------------------------------------
        authority_score = self._compute_authority_score(
            platform_presence, ext_link_quality, brand_signals,
            content_authority, word_count,
        )

        # ------------------------------------------------------------------
        # 8. Issues & recommendations
        # ------------------------------------------------------------------
        issues, recommendations = self._generate_issues_and_recs(
            platform_presence, ext_link_quality, brand_signals,
            content_authority, authority_score,
        )

        return {
            "authority_score": _clamp(authority_score),
            "platform_presence": platform_presence,
            "external_link_quality": ext_link_quality,
            "brand_signals": brand_signals,
            "content_authority_signals": content_authority,
            "backlink_opportunities": backlink_opps,
            "competitor_gap": competitor_gap,
            "issues": issues,
            "recommendations": recommendations,
        }

    # ------------------------------------------------------------------
    # Platform presence
    # ------------------------------------------------------------------

    def _check_platform_presence(
        self,
        html: str,
        text: str,
        links_external: list[str],
    ) -> dict[str, dict[str, object]]:
        ext_text = ' '.join(links_external)
        ext_domains = {_safe_domain(u) for u in links_external}
        presence: dict[str, dict[str, object]] = {}

        for key in _PLATFORM_URL:
            linked = any(
                pat.search(ext_text) or pat.search(ext_domains.__repr__())
                for pat in _PLATFORM_URL[key]
            )
            mentioned = any(
                pat.search(text) for pat in _PLATFORM_MENTION[key]
            )
            score = self._platform_score(key, linked, mentioned)
            notes = _platform_notes(key, linked, mentioned)
            presence[key] = {
                "mentioned": bool(mentioned),
                "linked": bool(linked),
                "score": _clamp(score),
                "notes": notes,
            }
        return presence

    def _platform_score(self, key: str, linked: bool, mentioned: bool) -> float:
        w = _PLATFORM_WEIGHT.get(key, 0.5)
        if linked:
            return 90.0 * w + 10.0
        if mentioned:
            return 50.0 * w + 10.0
        return 0.0

    # ------------------------------------------------------------------
    # External link quality
    # ------------------------------------------------------------------

    def _analyze_external_links(
        self,
        links_external: list[str],
        self_domain: str,
    ) -> dict[str, object]:
        domains = _unique_domains(links_external)
        total = len(links_external)

        authority_count = 0
        relevant_count = 0
        low_quality_count = 0
        unique_authority_domains: set[str] = set()
        unique_relevant_domains: set[str] = set()

        for href in links_external:
            d = _safe_domain(href)
            if not d or d == self_domain:
                continue
            if d in _NEWS_DOMAINS or d in _PLATFORM_URL.get('wikipedia', []) and 'wikipedia.org' in d:
                authority_count += 1
                unique_authority_domains.add(d)
            if _is_industry_relevant(d, href):
                relevant_count += 1
                unique_relevant_domains.add(d)
            if d in _LOW_QUALITY_DOMAINS:
                low_quality_count += 1

        diversity = self._link_diversity(len(domains), total)

        return {
            "total_external": total,
            "authority_links": authority_count,
            "relevant_links": relevant_count,
            "low_quality_links": low_quality_count,
            "link_diversity_score": _clamp(diversity),
            "domains_linked": domains[:50],
        }

    def _link_diversity(self, unique_domains: int, total_links: int) -> float:
        if total_links == 0:
            return 0.0
        ratio = unique_domains / total_links
        raw = ratio * 100.0
        # bonus for absolute number of unique domains
        bonus = min(unique_domains * 3.0, 30.0)
        return raw + bonus

    # ------------------------------------------------------------------
    # Brand signals
    # ------------------------------------------------------------------

    def _analyze_brand_signals(
        self,
        text: str,
        html: str,
        brand_name: str,
        links_external: list[str],
    ) -> dict[str, object]:
        brand_detected = bool(brand_name and _brand_mentioned(text, brand_name))
        mentions_count = _count_brand_mentions(text, brand_name) if brand_name else 0

        author_present = bool(_CITATION_RE.search(text) or _QUOTE_RE.search(text))
        author_links = _extract_author_links(html)

        social_profiles = _extract_social_profiles(links_external)
        contact_present = _has_contact_info(text, html)

        return {
            "brand_name_detected": brand_detected,
            "brand_mentions_count": mentions_count,
            "author_present": author_present,
            "author_links": author_links[:10],
            "social_profiles": social_profiles,
            "contact_info_present": contact_present,
        }

    # ------------------------------------------------------------------
    # Content authority signals
    # ------------------------------------------------------------------

    def _analyze_content_authority(
        self,
        text: str,
        html: str,
        word_count: int,
    ) -> dict[str, object]:
        has_statistics = bool(_STAT_RE.search(text))
        has_citations = bool(_CITATION_RE.search(text))
        has_expert_quotes = bool(_QUOTE_RE.search(text))
        has_case_studies = bool(_CASE_STUDY_RE.search(text))
        has_original_research = bool(_RESEARCH_RE.search(text))
        has_data_tables = bool(_DATA_TABLE_RE.search(html))

        signals_hit = sum([
            has_statistics,
            has_citations,
            has_expert_quotes,
            has_case_studies,
            has_original_research,
            has_data_tables,
        ])

        # Base score from signals
        base = (signals_hit / 6.0) * 70.0
        # Word count contribution
        wc_bonus = 0.0
        if word_count >= 2000:
            wc_bonus = 20.0
        elif word_count >= 1000:
            wc_bonus = 12.0
        elif word_count >= 500:
            wc_bonus = 6.0
        # Podcast bonus
        if _PODCAST_RE.search(text):
            base += 5.0

        score = base + wc_bonus
        return {
            "has_statistics": has_statistics,
            "has_citations": has_citations,
            "has_expert_quotes": has_expert_quotes,
            "has_case_studies": has_case_studies,
            "has_original_research": has_original_research,
            "has_data_tables": has_data_tables,
            "authority_content_score": _clamp(score),
        }

    # ------------------------------------------------------------------
    # Backlink opportunity suggestions
    # ------------------------------------------------------------------

    def _suggest_backlink_opportunities(
        self,
        platform_presence: dict[str, dict],
        ext_link_quality: dict[str, object],
        page_type: str,
    ) -> list[dict[str, str]]:
        opps: list[dict[str, str]] = []
        for key, info in platform_presence.items():
            if info['linked']:
                continue
            opps.append({
                "platform": key,
                "relevance": _opportunity_relevance(key, page_type),
                "difficulty": _opportunity_difficulty(key),
                "priority": _opportunity_priority(info['mentioned'], key),
                "notes": _opportunity_notes(key, info['mentioned']),
            })

        # sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        opps.sort(key=lambda o: priority_order.get(o['priority'], 3))
        return opps[:12]

    # ------------------------------------------------------------------
    # Competitor gap estimate
    # ------------------------------------------------------------------

    def _estimate_competitor_gap(
        self,
        ext_link_quality: dict[str, object],
        word_count: int,
    ) -> dict[str, int]:
        your_links = ext_link_quality.get('authority_links', 0)
        # heuristic: sites with more content and more diversity tend to have
        # more authority backlinks.  Estimate a "typical" competitor at the
        # median level for a similar content depth.
        diversity = ext_link_quality.get('link_diversity_score', 0)
        est_competitor = max(5, int(
            (word_count / 500.0) * 2.0 + diversity * 0.1
        ))
        gap = max(0, est_competitor - your_links)
        return {
            "your_authority_links": your_links,
            "estimated_competitor_links": est_competitor,
            "gap": gap,
        }

    # ------------------------------------------------------------------
    # Aggregate score
    # ------------------------------------------------------------------

    def _compute_authority_score(
        self,
        platform_presence: dict[str, dict],
        ext_link_quality: dict[str, object],
        brand_signals: dict[str, object],
        content_authority: dict[str, object],
        word_count: int,
    ) -> float:
        # Platform score (0-100) — average of all platform scores
        platform_scores = [p['score'] for p in platform_presence.values()]
        platform_avg = sum(platform_scores) / max(len(platform_scores), 1)

        # External link quality score
        ext_total = ext_link_quality.get('total_external', 0)
        ext_diversity = ext_link_quality.get('link_diversity_score', 0)
        ext_low = ext_link_quality.get('low_quality_links', 0)
        link_score = min(40.0, ext_diversity * 0.4)
        link_score -= ext_low * 5.0
        if ext_total >= 10:
            link_score += 20.0
        elif ext_total >= 5:
            link_score += 10.0

        # Brand score
        brand_score = 0.0
        if brand_signals.get('brand_name_detected'):
            brand_score += 20.0
        brand_score += min(20.0, brand_signals.get('brand_mentions_count', 0) * 4.0)
        if brand_signals.get('author_present'):
            brand_score += 10.0
        brand_score += min(10.0, len(brand_signals.get('social_profiles', [])) * 5.0)
        if brand_signals.get('contact_info_present'):
            brand_score += 5.0

        content_score = content_authority.get('authority_content_score', 0.0)

        # Weighted composite
        composite = (
            platform_avg * 0.30
            + _clamp(link_score) * 0.25
            + _clamp(brand_score) * 0.25
            + content_score * 0.20
        )
        return _clamp(composite)

    # ------------------------------------------------------------------
    # Issues & recommendations
    # ------------------------------------------------------------------

    def _generate_issues_and_recs(
        self,
        platform_presence: dict[str, dict],
        ext_link_quality: dict[str, object],
        brand_signals: dict[str, object],
        content_authority: dict[str, object],
        authority_score: float,
    ) -> tuple[list[str], list[str]]:
        issues: list[str] = []
        recs: list[str] = []

        linked_platforms = [k for k, v in platform_presence.items() if v['linked']]
        mentioned_only = [k for k, v in platform_presence.items() if v['mentioned'] and not v['linked']]

        if not linked_platforms:
            issues.append("No external links found to any authority platforms.")
            recs.append("Add links to relevant authority platforms (GitHub, LinkedIn, Crunchbase, etc.) to signal credibility.")

        if len(linked_platforms) < 4:
            issues.append(f"Only {len(linked_platforms)} authority platform(s) linked — low cross-platform visibility.")
            recs.append("Aim for presence on at least 4–6 relevant third-party platforms.")

        if mentioned_only:
            issues.append(f"Mentioned but not linked: {', '.join(mentioned_only)}.")
            recs.append("Convert plain-text platform mentions into actual hyperlinks where appropriate.")

        if ext_link_quality.get('low_quality_links', 0) > 0:
            issues.append(f"{ext_link_quality['low_quality_links']} low-quality outbound link(s) detected.")
            recs.append("Audit and remove or nofollow links to low-quality or link-market domains.")

        if ext_link_quality.get('total_external', 0) == 0:
            issues.append("No outbound external links found on this page.")
            recs.append("Include relevant outbound links to authoritative resources — this signals topical trust.")

        if not brand_signals.get('brand_name_detected') and brand_signals.get('brand_mentions_count', 0) == 0:
            issues.append("Brand name was not detected in the page content.")
            recs.append("Ensure your brand name appears naturally in the page content.")

        if not brand_signals.get('author_present'):
            issues.append("No author attribution or expert quotes detected.")
            recs.append("Add author bios, expert quotes, or contributor information to boost credibility signals.")

        if not brand_signals.get('social_profiles'):
            issues.append("No social media profile links detected.")
            recs.append("Link to your social media profiles (LinkedIn, Twitter/X, YouTube, GitHub) in the footer or about section.")

        if not brand_signals.get('contact_info_present'):
            issues.append("No contact information detected on the page.")
            recs.append("Include contact details (email, phone, address) to strengthen E-E-A-T signals.")

        ca = content_authority
        if not ca.get('has_statistics'):
            issues.append("No statistics or quantitative data found in content.")
            recs.append("Include relevant statistics, benchmarks, or data points to strengthen authority claims.")
        if not ca.get('has_citations'):
            issues.append("No citations or source attributions found.")
            recs.append("Cite reputable sources using inline references or footnotes.")
        if not ca.get('has_expert_quotes'):
            issues.append("No expert quotes or testimonials detected.")
            recs.append("Include quotes from recognized experts or named sources in your industry.")
        if not ca.get('has_data_tables'):
            issues.append("No data tables found in the content.")
            recs.append("Use structured data tables to present comparisons, benchmarks, or results.")

        if authority_score < 30:
            issues.append(f"Overall offsite authority score is low ({authority_score:.0f}/100).")
            recs.append("Focus on building a consistent cross-platform brand presence and earning mentions on high-authority sites.")
        elif authority_score < 60:
            recs.append("Moderate authority — strengthen weak platform areas and increase outbound link diversity.")

        return issues, recs


# ---------------------------------------------------------------------------
# Standalone helper functions
# ---------------------------------------------------------------------------

def _extract_brand_from_title(title: str) -> str:
    """Heuristic: brand is usually the first word(s) before a separator."""
    if not title:
        return ''
    parts = re.split(r'\s*[\|\-–—:]\s*', title, maxsplit=1)
    candidate = parts[0].strip()
    # If very long, take first two words
    words = candidate.split()
    if len(words) > 4:
        candidate = ' '.join(words[:3])
    return candidate


def _brand_mentioned(text: str, brand: str) -> bool:
    if not brand or len(brand) < 2:
        return False
    pattern = re.compile(re.escape(brand), re.IGNORECASE)
    return bool(pattern.search(text))


def _count_brand_mentions(text: str, brand: str) -> int:
    if not brand or len(brand) < 2:
        return 0
    pattern = re.compile(re.escape(brand), re.IGNORECASE)
    return len(pattern.findall(text))


def _extract_author_links(html: str) -> list[str]:
    return _AUTHOR_LINK_RE.findall(html)


def _extract_social_profiles(links: list[str]) -> list[str]:
    profiles: list[str] = []
    seen: set[str] = set()
    for href in links:
        d = _safe_domain(href)
        if d in _SOCIAL_DOMAINS and href not in seen:
            seen.add(href)
            profiles.append(href)
    return profiles


def _has_contact_info(text: str, html: str) -> bool:
    contact_patterns = [
        _compile(r'[\w.+-]+@[\w-]+\.[\w.]+'),
        _compile(r'\+?\d[\d\s().-]{7,}\d'),
        _compile(r'\b(?:contact\s+(?:us|me|page)|get\s+in\s+touch)\b', re.IGNORECASE),
        _compile(r'\b\d{1,5}\s+\w+\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b', re.IGNORECASE),
    ]
    for pat in contact_patterns:
        if pat.search(text) or pat.search(html):
            return True
    return False


def _is_industry_relevant(domain: str, href: str) -> bool:
    """Heuristic: domain or URL path contains industry-relevant keywords."""
    combined = f"{domain} {href}".lower()
    return any(kw in combined for kw in _INDUSTRY_KEYWORDS)


def _platform_notes(key: str, linked: bool, mentioned: bool) -> str:
    if linked:
        return f"Page links to {key}."
    if mentioned:
        return f"{key.capitalize()} is mentioned in text but not linked."
    return f"No {key} presence detected."


def _opportunity_relevance(key: str, page_type: str) -> str:
    relevance_map = {
        'github': 'High for tech/SaaS products',
        'producthunt': 'High for new products & launches',
        'crunchbase': 'High for company profiles',
        'g2': 'High for B2B software reviews',
        'capterra': 'High for B2B software comparison',
        'stackoverflow': 'High for developer-facing products',
        'hackernews': 'High for tech startups',
        'linkedin': 'High for all business types',
        'wikipedia': 'Medium — requires notability',
        'reddit': 'Medium — community engagement',
        'youtube': 'Medium — video content presence',
        'medium': 'Medium — thought leadership',
    }
    return relevance_map.get(key, 'Relevant for brand visibility')


def _opportunity_difficulty(key: str) -> str:
    difficulty_map = {
        'wikipedia': 'Hard',
        'github': 'Easy',
        'stackoverflow': 'Hard',
        'crunchbase': 'Medium',
        'g2': 'Medium',
        'capterra': 'Medium',
        'producthunt': 'Easy',
        'hackernews': 'Medium',
        'linkedin': 'Easy',
        'reddit': 'Easy',
        'youtube': 'Easy',
        'medium': 'Easy',
    }
    return difficulty_map.get(key, 'Medium')


def _opportunity_priority(mentioned: bool, key: str) -> str:
    high_priority = {'linkedin', 'github', 'crunchbase', 'g2'}
    medium_priority = {'producthunt', 'hackernews', 'capterra', 'stackoverflow'}
    if key in high_priority:
        return 'high'
    if key in medium_priority:
        return 'medium'
    return 'low'


def _opportunity_notes(key: str, mentioned: bool) -> str:
    if mentioned:
        return f"Already mentioned on page — convert to a live link."
    notes_map = {
        'wikipedia': 'Create a notable company/person article if criteria are met.',
        'github': 'Create an open-source repo or official org page.',
        'linkedin': 'Ensure company page and key employees have profiles.',
        'crunchbase': 'Claim and complete your company profile.',
        'g2': 'Encourage satisfied customers to leave verified reviews.',
        'capterra': 'Claim listing and gather user reviews.',
        'producthunt': 'Launch product or create a company page.',
        'hackernews': 'Share genuine content; build karma organically.',
        'stackoverflow': 'Contribute to relevant Q&A threads.',
        'reddit': 'Engage authentically in relevant subreddits.',
        'youtube': 'Create a branded channel with tutorial/demo content.',
        'medium': 'Publish thought-leadership articles on a brand publication.',
    }
    return notes_map.get(key, 'Create or claim a profile on this platform.')
