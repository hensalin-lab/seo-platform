"""Granular recommendation engine for SEO SaaS platform.

Generates hyper-specific, implementable recommendations with exact code snippets,
SERP previews, and page-type-specific guidance instead of generic suggestions.
"""

from __future__ import annotations

import re
import math
from dataclasses import dataclass, field
from typing import Any


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

REC_ID_COUNTER = 0


def _next_id() -> str:
    global REC_ID_COUNTER
    REC_ID_COUNTER += 1
    return f"REC-{REC_ID_COUNTER:03d}"


def _reset_id_counter() -> None:
    global REC_ID_COUNTER
    REC_ID_COUNTER = 0


def _estimate_pixel_width(text: str, font_size: int = 16) -> int:
    """Estimate pixel width of text rendered in a SERP result.

    Uses average character-width ratios for proportional fonts.
    Narrow chars (i, l, t) ~0.3em, wide chars (m, w) ~0.8em, average ~0.55em.
    """
    narrow = set("iltj1|!.,;:'\"")
    wide = set("mwMW")
    total_em = 0.0
    for ch in text:
        if ch in narrow:
            total_em += 0.3
        elif ch in wide:
            total_em += 0.8
        else:
            total_em += 0.55
    return int(total_em * font_size)


def _serp_preview(title: str, url: str, description: str) -> dict[str, Any]:
    char_count = len(title)
    pixel_width = _estimate_pixel_width(title)
    desktop_url_max = 65
    display_url = url if len(url) <= desktop_url_max else url[:desktop_url_max - 3] + "..."
    display_title = title if char_count <= 60 else title[:57] + "..."
    display_desc = description[:155] + "..." if len(description) > 155 else description
    desktop = f"{display_title}\n{display_url}\n{display_desc}"
    mobile_title = title if char_count <= 50 else title[:47] + "..."
    mobile = f"{mobile_title}\n{display_url}\n{display_desc}"
    return {
        "desktop": desktop,
        "mobile": mobile,
        "pixel_width": pixel_width,
        "char_count": char_count,
    }


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _strip_html(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html).strip()


def _extract_text_content(html: str) -> str:
    for tag in ("script", "style", "noscript"):
        html = re.sub(rf"<{tag}[^>]*>.*?</{tag}>", "", html, flags=re.IGNORECASE | re.DOTALL)
    return _strip_html(html)


def _heading_tag(tag: str) -> int:
    m = re.match(r"h(\d)", tag)
    return int(m.group(1)) if m else 0


# ---------------------------------------------------------------------------
# Recommendation data
# ---------------------------------------------------------------------------

@dataclass
class Recommendation:
    id: str
    priority: str
    group: str
    element: str
    current_value: str
    recommended_value: str
    reason: str
    expected_impact: str
    estimated_time: str
    difficulty: str
    dependencies: list[str]
    verification_method: str
    status: str
    implementation_code: str
    documentation_ref: str
    before_code: str = ""
    after_code: str = ""
    serp_preview: dict[str, Any] | None = None
    image_data: dict[str, str] | None = None
    heading_data: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "id": self.id,
            "priority": self.priority,
            "group": self.group,
            "element": self.element,
            "current_value": self.current_value,
            "recommended_value": self.recommended_value,
            "reason": self.reason,
            "expected_impact": self.expected_impact,
            "estimated_time": self.estimated_time,
            "difficulty": self.difficulty,
            "dependencies": self.dependencies,
            "verification_method": self.verification_method,
            "status": self.status,
            "implementation_code": self.implementation_code,
            "documentation_ref": self.documentation_ref,
            "before_code": self.before_code,
            "after_code": self.after_code,
        }
        if self.serp_preview is not None:
            d["serp_preview"] = self.serp_preview
        if self.image_data is not None:
            d["image_data"] = self.image_data
        if self.heading_data is not None:
            d["heading_data"] = self.heading_data
        return d


# ---------------------------------------------------------------------------
# Core engine
# ---------------------------------------------------------------------------

class RecommendationEngine:
    """Analyzes a page object and returns granular, implementable recommendations."""

    def analyze(self, page: dict[str, Any]) -> dict[str, Any]:
        _reset_id_counter()
        recs: list[Recommendation] = []

        self._check_title(page, recs)
        self._check_meta_description(page, recs)
        self._check_canonical(page, recs)
        self._check_headings(page, recs)
        self._check_images(page, recs)
        self._check_links(page, recs)
        self._check_schema(page, recs)
        self._check_open_graph(page, recs)
        self._check_twitter_card(page, recs)
        self._check_content(page, recs)
        self._check_technical(page, recs)
        self._check_crawl_depth(page, recs)
        self._check_response_time(page, recs)
        self._check_marketing_signals(page, recs)

        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        recs.sort(key=lambda r: priority_order.get(r.priority, 9))

        by_priority = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        by_group = {"DEVELOPER": 0, "SEO": 0, "CONTENT": 0, "DESIGNER": 0, "MARKETING": 0}
        for r in recs:
            by_priority[r.priority] = by_priority.get(r.priority, 0) + 1
            by_group[r.group] = by_group.get(r.group, 0) + 1

        total_time = self._estimate_total_time(recs)
        impact = self._estimate_impact(recs, page)

        return {
            "url": page.get("url", ""),
            "recommendations": [r.to_dict() for r in recs],
            "summary": {
                "total_recommendations": len(recs),
                "by_priority": by_priority,
                "by_group": by_group,
                "estimated_total_time": total_time,
                "estimated_impact": impact,
            },
        }

    # ----- title -----------------------------------------------------------

    def _check_title(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        title = page.get("title") or ""
        url = page.get("url", "")
        h1 = page.get("h1") or ""
        title_stripped = title.strip()

        if not title_stripped:
            recs.append(Recommendation(
                id=_next_id(),
                priority="CRITICAL",
                group="SEO",
                element="title",
                current_value="(missing)",
                recommended_value="(add a descriptive title tag)",
                reason=(
                    "The &lt;title&gt; tag is one of the strongest on-page ranking signals. "
                    "Google uses it to understand page topic and display it as the clickable "
                    "headline in search results. Without a title, the page may be indexed "
                    "with auto-generated text that doesn't match your target keywords."
                ),
                expected_impact="Can improve rankings by 10-30 positions for target keywords.",
                estimated_time="15 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="View page source and confirm <title> tag exists with target keyword.",
                status="NEW",
                implementation_code=(
                    f"<title>{_escape_html(h1) if h1 else 'Primary Keyword - Secondary Keyword | Brand Name'}</title>"
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/title-link",
                before_code="(no <title> tag present)",
                after_code=(
                    f"<title>{_escape_html(h1) if h1 else 'Primary Keyword - Secondary Keyword | Brand Name'}</title>"
                ),
                serp_preview=_serp_preview(
                    h1 or "Primary Keyword - Secondary Keyword | Brand Name",
                    url,
                    page.get("meta_description") or "Add a compelling meta description here...",
                ),
            ))
            return

        title_len = len(title_stripped)
        title_words = title_stripped.split()
        primary_keyword = (page.get("h1") or "").strip().lower()

        # Length checks
        if title_len < 30:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="SEO",
                element="title",
                current_value=title_stripped,
                recommended_value="Title should be 50-60 characters for optimal SERP display.",
                reason=(
                    f"Your title is only {title_len} characters. Short titles waste valuable SERP "
                    "real estate and miss keyword opportunities. Google displays up to 60 characters "
                    "or ~580px before truncation."
                ),
                expected_impact="Expanding to optimal length can improve CTR by 10-20% and help rank for more keywords.",
                estimated_time="15 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Check page source for <title> tag length between 50-60 characters.",
                status="NEW",
                implementation_code=(
                    f"<title>{_escape_html(title_stripped)} - Additional Context | Brand Name</title>"
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/title-link",
                before_code=f"<title>{_escape_html(title_stripped)}</title>",
                after_code=(
                    f"<title>{_escape_html(title_stripped)} - Additional Context | Brand Name</title>"
                ),
                serp_preview=_serp_preview(
                    f"{title_stripped} - Additional Context | Brand Name",
                    url,
                    page.get("meta_description") or "",
                ),
            ))

        if title_len > 60:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="SEO",
                element="title",
                current_value=f"{title_stripped} ({title_len} chars)",
                recommended_value="Title should be under 60 characters to prevent truncation in SERP.",
                reason=(
                    f"Your title is {title_len} characters and will be truncated in search results. "
                    "Truncated titles lose ~10-15% CTR because users can't read the full message. "
                    "Google cuts off around 60 characters or 580 pixels."
                ),
                expected_impact="Shortening to under 60 characters can improve CTR by 10-15%.",
                estimated_time="15 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Check that <title> tag content is under 60 characters.",
                status="NEW",
                implementation_code=(
                    f"<title>{_escape_html(title_stripped[:57])}...</title>"
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/title-link",
                before_code=f"<title>{_escape_html(title_stripped)}</title>",
                after_code=(
                    f"<title>{_escape_html(title_stripped[:57])}...</title>"
                ),
                serp_preview=_serp_preview(
                    f"{title_stripped[:57]}...",
                    url,
                    page.get("meta_description") or "",
                ),
            ))

        # Keyword in title
        if primary_keyword and primary_keyword not in title_stripped.lower():
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="SEO",
                element="title",
                current_value=title_stripped,
                recommended_value=f"Include '{primary_keyword}' in the title tag.",
                reason=(
                    f"The primary keyword '{primary_keyword}' derived from your H1 does not appear "
                    "in the title tag. Matching keywords between title and H1 reinforces topical "
                    "relevance and improves ranking signals."
                ),
                expected_impact="Including target keyword in title can improve ranking by 5-15 positions.",
                estimated_time="10 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method=f"Verify '{primary_keyword}' appears in <title> tag in page source.",
                status="NEW",
                implementation_code=(
                    f"<title>{_escape_html(primary_keyword.title())} - {title_stripped} | Brand</title>"
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/title-link",
                before_code=f"<title>{_escape_html(title_stripped)}</title>",
                after_code=(
                    f"<title>{_escape_html(primary_keyword.title())} - {title_stripped} | Brand</title>"
                ),
                serp_preview=_serp_preview(
                    f"{primary_keyword.title()} - {title_stripped} | Brand",
                    url,
                    page.get("meta_description") or "",
                ),
            ))

        # Duplicate title/H1
        if h1 and title_stripped.lower() == h1.strip().lower():
            recs.append(Recommendation(
                id=_next_id(),
                priority="MEDIUM",
                group="SEO",
                element="title",
                current_value=title_stripped,
                recommended_value="Differentiate title from H1 to target more keywords.",
                reason=(
                    "Your title and H1 are identical. While this isn't harmful, using a slightly "
                    "different title allows you to target additional keywords and provides a broader "
                    "keyword footprint. Use the H1 for the main topic and the title for a variation."
                ),
                expected_impact="Minor ranking improvement by expanding keyword targeting.",
                estimated_time="10 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Confirm title tag differs from <h1> content in page source.",
                status="NEW",
                implementation_code=(
                    f"<title>{_escape_html(primary_keyword.title())} - Guide for 2024 | Brand</title>"
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/title-link",
                before_code=f"<title>{_escape_html(title_stripped)}</title>",
                after_code=(
                    f"<title>{_escape_html(primary_keyword.title())} - Guide for 2024 | Brand</title>"
                ),
                serp_preview=_serp_preview(
                    f"{primary_keyword.title()} - Guide for 2024 | Brand",
                    url,
                    page.get("meta_description") or "",
                ),
            ))

    # ----- meta description ------------------------------------------------

    def _check_meta_description(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        meta = page.get("meta_description") or ""
        url = page.get("url", "")
        title = page.get("title") or ""
        meta_stripped = meta.strip()

        if not meta_stripped:
            recs.append(Recommendation(
                id=_next_id(),
                priority="CRITICAL",
                group="SEO",
                element="meta[name='description']",
                current_value="(missing)",
                recommended_value="(add a meta description of 120-158 characters)",
                reason=(
                    "Meta description is missing. While not a direct ranking factor, it heavily "
                    "influences click-through rate. Google shows ~155-160 characters on desktop. "
                    "Without one, Google auto-generates a snippet from page content that may not "
                    "be compelling."
                ),
                expected_impact="Adding a meta description can improve CTR by 5-15%.",
                estimated_time="15 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Check page source for <meta name='description'> tag.",
                status="NEW",
                implementation_code=(
                    '<meta name="description" content="Write a compelling 120-158 character description '
                    'that includes your target keyword and a call-to-action to encourage clicks." />'
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/meta-snippets",
                before_code="(no <meta name='description'> tag present)",
                after_code=(
                    '<meta name="description" content="Write a compelling 120-158 character description '
                    'that includes your target keyword and a call-to-action to encourage clicks." />'
                ),
                serp_preview=_serp_preview(
                    title or "Page Title | Brand",
                    url,
                    "Write a compelling 120-158 character description that includes your target keyword...",
                ),
            ))
            return

        meta_len = len(meta_stripped)

        if meta_len < 120:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="SEO",
                element="meta[name='description']",
                current_value=f"{meta_stripped} ({meta_len} chars)",
                recommended_value="Expand to 120-158 characters for optimal SERP display.",
                reason=(
                    f"Your meta description is only {meta_len} characters. Descriptions under 120 "
                    "characters waste SERP real estate and don't provide enough information to "
                    "entice clicks. Aim for 120-155 characters to maximize CTR."
                ),
                expected_impact="Expanding meta description can improve CTR by 10-20%.",
                estimated_time="10 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Confirm meta description is 120-158 characters in page source.",
                status="NEW",
                implementation_code=(
                    f'<meta name="description" content="{_escape_html(meta_stripped)} '
                    'Add additional compelling information here to reach 120-155 characters." />'
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/meta-snippets",
                before_code=(
                    f'<meta name="description" content="{_escape_html(meta_stripped)}" />'
                ),
                after_code=(
                    f'<meta name="description" content="{_escape_html(meta_stripped)} '
                    'Add additional compelling information here to reach 120-155 characters." />'
                ),
                serp_preview=_serp_preview(
                    title or "Page Title",
                    url,
                    f"{meta_stripped} Add additional compelling information here to reach 120-155 characters.",
                ),
            ))

        if meta_len > 158:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="SEO",
                element="meta[name='description']",
                current_value=f"{meta_stripped} ({meta_len} chars)",
                recommended_value="Trim to under 155 characters to prevent truncation.",
                reason=(
                    f"Your meta description is {meta_len} characters. Google truncates descriptions "
                    "around 155-160 characters. Truncated descriptions look unprofessional and lose "
                    "the CTA. Trim to under 155 characters or restructure for impact."
                ),
                expected_impact="Trimming to optimal length can improve CTR by 5-10%.",
                estimated_time="10 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Confirm meta description is under 155 characters.",
                status="NEW",
                implementation_code=(
                    f'<meta name="description" content="{_escape_html(meta_stripped[:152])}..." />'
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/meta-snippets",
                before_code=(
                    f'<meta name="description" content="{_escape_html(meta_stripped)}" />'
                ),
                after_code=(
                    f'<meta name="description" content="{_escape_html(meta_stripped[:152])}..." />'
                ),
                serp_preview=_serp_preview(
                    title or "Page Title",
                    url,
                    f"{meta_stripped[:152]}...",
                ),
            ))

        # No CTA in meta
        cta_words = {
            "learn", "discover", "find", "get", "read", "see", "try", "start",
            "download", "shop", "buy", "sign up", "register", "explore", "compare",
            "click", "visit", "claim", "join", "subscribe", "browse",
        }
        meta_lower = meta_stripped.lower()
        has_cta = any(w in meta_lower for w in cta_words)
        if not has_cta:
            recs.append(Recommendation(
                id=_next_id(),
                priority="MEDIUM",
                group="MARKETING",
                element="meta[name='description']",
                current_value=meta_stripped,
                recommended_value="Add a call-to-action (e.g., 'Learn more', 'Discover how').",
                reason=(
                    "Meta descriptions without a call-to-action get 5-10% lower CTR. "
                    "Action-oriented language encourages users to click your result over competitors."
                ),
                expected_impact="Adding a CTA can improve CTR by 5-10%.",
                estimated_time="5 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Check meta description contains action words like 'Learn', 'Discover', 'Find out'.",
                status="NEW",
                implementation_code=(
                    f'<meta name="description" content="{_escape_html(meta_stripped)} Learn more today." />'
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/meta-snippets",
                before_code=(
                    f'<meta name="description" content="{_escape_html(meta_stripped)}" />'
                ),
                after_code=(
                    f'<meta name="description" content="{_escape_html(meta_stripped)} Learn more today." />'
                ),
                serp_preview=_serp_preview(
                    title or "Page Title",
                    url,
                    f"{meta_stripped} Learn more today.",
                ),
            ))

    # ----- canonical -------------------------------------------------------

    def _check_canonical(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        canonical = page.get("canonical") or ""
        url = page.get("url", "")
        canonical_stripped = canonical.strip()

        if not canonical_stripped:
            recs.append(Recommendation(
                id=_next_id(),
                priority="CRITICAL",
                group="DEVELOPER",
                element="link[rel='canonical']",
                current_value="(missing)",
                recommended_value=f'<link rel="canonical" href="{url}" />',
                reason=(
                    "Canonical tag is missing. Without it, Google may index duplicate or "
                    "near-duplicate versions of this page (with/without trailing slash, www/non-www, "
                    "HTTP/HTTPS, query parameters), diluting link equity and confusing ranking signals."
                ),
                expected_impact="Can consolidate ranking signals from duplicate pages, improving rank by 5-20 positions.",
                estimated_time="5 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Check page source for <link rel='canonical'> pointing to this page's URL.",
                status="NEW",
                implementation_code=f'<link rel="canonical" href="{url}" />',
                documentation_ref="https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
                before_code="(no <link rel='canonical'> tag present)",
                after_code=f'<link rel="canonical" href="{url}" />',
            ))
        elif canonical_stripped != url:
            recs.append(Recommendation(
                id=_next_id(),
                priority="CRITICAL",
                group="DEVELOPER",
                element="link[rel='canonical']",
                current_value=canonical_stripped,
                recommended_value=f'<link rel="canonical" href="{url}" />',
                reason=(
                    f"The canonical URL ({canonical_stripped}) doesn't match the page URL ({url}). "
                    "This tells Google to index a different page instead of this one, which will "
                    "prevent this page from ranking and waste crawl budget."
                ),
                expected_impact="Fixing canonical mismatch can restore indexing and ranking for this page.",
                estimated_time="5 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method=f"Verify canonical href equals '{url}'.",
                status="NEW",
                implementation_code=f'<link rel="canonical" href="{url}" />',
                documentation_ref="https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
                before_code=f'<link rel="canonical" href="{canonical_stripped}" />',
                after_code=f'<link rel="canonical" href="{url}" />',
            ))

    # ----- headings --------------------------------------------------------

    def _check_headings(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        headings = page.get("headings") or []
        h1 = page.get("h1") or ""
        url = page.get("url", "")
        content_text = page.get("content_text") or ""
        content_lower = content_text.lower()

        h1_text = h1.strip()

        # No H1
        if not h1_text:
            recs.append(Recommendation(
                id=_next_id(),
                priority="CRITICAL",
                group="SEO",
                element="h1",
                current_value="(missing)",
                recommended_value="<h1>Primary Keyword - Descriptive Phrase</h1>",
                reason=(
                    "H1 tag is missing. The H1 is the most important heading signal to search "
                    "engines. It should clearly describe the page topic and contain the primary "
                    "target keyword. Google uses it to understand page content."
                ),
                expected_impact="Adding an H1 with target keyword can improve rankings by 5-20 positions.",
                estimated_time="10 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Check page source for exactly one <h1> tag.",
                status="NEW",
                implementation_code="<h1>Primary Keyword - Descriptive Phrase</h1>",
                documentation_ref="https://developers.google.com/search/docs/appearance/structured-data/article",
                before_code="(no <h1> tag present)",
                after_code="<h1>Primary Keyword - Descriptive Phrase</h1>",
            ))

        # Multiple H1s
        h1_count = sum(1 for tag in headings if isinstance(tag, str) and tag.lower() == "h1")
        if h1_count > 1:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="SEO",
                element="h1",
                current_value=f"{h1_count} <h1> tags found",
                recommended_value="Use exactly one <h1> tag per page.",
                reason=(
                    f"There are {h1_count} H1 tags on this page. Having multiple H1s confuses "
                    "search engines about the page's primary topic. Each page should have exactly "
                    "one H1 that describes the main topic."
                ),
                expected_impact="Consolidating to one H1 can improve topical clarity and ranking.",
                estimated_time="15 minutes",
                difficulty="MODERATE",
                dependencies=[],
                verification_method="Search page source and confirm only one <h1> tag exists.",
                status="NEW",
                implementation_code=(
                    "<!-- Keep the most relevant H1 and convert others to H2 -->\n"
                    "<h1>Most Important Topic</h1>\n"
                    "<!-- Change secondary H1s to: -->\n"
                    "<h2>Secondary Topic</h2>"
                ),
                documentation_ref="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements",
            ))

        # H1 too long
        if h1_text and len(h1_text) > 70:
            recs.append(Recommendation(
                id=_next_id(),
                priority="MEDIUM",
                group="SEO",
                element="h1",
                current_value=f"{h1_text} ({len(h1_text)} chars)",
                recommended_value="H1 should be under 70 characters for clarity.",
                reason=(
                    f"The H1 is {len(h1_text)} characters. While Google doesn't have a strict "
                    "character limit for H1s, keeping it under 70 characters ensures the topic "
                    "is clear to both users and search engines."
                ),
                expected_impact="Minor improvement in topical clarity.",
                estimated_time="10 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Confirm H1 content is under 70 characters.",
                status="NEW",
                implementation_code=f"<h1>{_escape_html(h1_text[:67])}</h1>",
                documentation_ref="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements",
                heading_data={
                    "current_structure": [f"H1 ({len(h1_text)} chars): {h1_text[:50]}..."],
                    "suggested_structure": [f"H1 ({min(len(h1_text), 70)} chars): {h1_text[:67]}..."],
                    "missing_keywords": [],
                    "missing_entities": [],
                },
            ))

        # Heading hierarchy
        heading_levels = []
        for tag in headings:
            level = _heading_tag(tag) if isinstance(tag, str) else 0
            if 1 <= level <= 6:
                heading_levels.append(level)

        skipped_levels = []
        for i in range(1, len(heading_levels)):
            if heading_levels[i] > heading_levels[i - 1] + 1:
                skipped_levels.append(
                    f"H{heading_levels[i - 1]} -> H{heading_levels[i]}"
                )

        if skipped_levels:
            skipped_str = ", ".join(skipped_levels)
            current_struct = [f"H{l}" for l in heading_levels]
            suggested_struct = self._suggest_heading_hierarchy(heading_levels)
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="SEO",
                element="headings",
                current_value=f"Skipped levels: {skipped_str}",
                recommended_value="Heading levels should not skip (e.g., H1 -> H3 without H2).",
                reason=(
                    f"Skipped heading levels found: {skipped_str}. Search engines and screen "
                    "readers rely on heading hierarchy to understand content structure. Skipping "
                    "levels makes content harder to crawl and creates accessibility issues."
                ),
                expected_impact="Fixing heading hierarchy can improve content indexing and accessibility.",
                estimated_time="15 minutes",
                difficulty="MODERATE",
                dependencies=[],
                verification_method="Review heading tags in page source for sequential hierarchy (H1->H2->H3).",
                status="NEW",
                implementation_code=(
                    "<!-- Restructure headings to avoid skipping levels:\n"
                    + "\n".join(
                        f"  <h{min(i+1, 6)}>Section {i+1}</h{min(i+1, 6)}>"
                        for i in range(min(len(suggested_struct), 6))
                    )
                    + "\n-->"
                ),
                documentation_ref="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements",
                heading_data={
                    "current_structure": current_struct,
                    "suggested_structure": suggested_struct,
                    "missing_keywords": [],
                    "missing_entities": [],
                },
            ))

        # Missing H2 structure
        has_h2 = any(
            (_heading_tag(t) == 2) if isinstance(t, str) else False
            for t in headings
        )
        if h1_text and not has_h2:
            recs.append(Recommendation(
                id=_next_id(),
                priority="MEDIUM",
                group="SEO",
                element="headings",
                current_value="No H2 tags found",
                recommended_value="Add H2 tags for major content sections.",
                reason=(
                    "This page has an H1 but no H2 subheadings. H2 tags help Google understand "
                    "the content structure and can appear as featured snippet candidates. They "
                    "also improve readability for users scanning the page."
                ),
                expected_impact="Adding H2 subheadings can improve featured snippet chances and user engagement.",
                estimated_time="30 minutes",
                difficulty="MODERATE",
                dependencies=[],
                verification_method="Check page source for at least 2-3 <h2> tags within the main content.",
                status="NEW",
                implementation_code=(
                    "<!-- Add H2 subheadings for each major section -->\n"
                    "<h2>Subtopic 1: Key Aspect</h2>\n"
                    "<p>Content about this aspect...</p>\n\n"
                    "<h2>Subtopic 2: Another Aspect</h2>\n"
                    "<p>Content about this aspect...</p>"
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/structured-data/article",
                heading_data={
                    "current_structure": [f"H{l}" for l in heading_levels] if heading_levels else [],
                    "suggested_structure": ["H1", "H2 - Subtopic 1", "H3", "H2 - Subtopic 2", "H3"],
                    "missing_keywords": [],
                    "missing_entities": [],
                },
            ))

    # ----- images ----------------------------------------------------------

    def _check_images(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        images = page.get("images") or []
        url = page.get("url", "")

        for img in images:
            src = img.get("src", "") if isinstance(img, dict) else ""
            alt = img.get("alt", None) if isinstance(img, dict) else None
            filename = src.split("/")[-1].split("?")[0] if src else "unknown"
            is_decorative = img.get("role") == "presentation" if isinstance(img, dict) else False

            if is_decorative:
                continue

            # Missing alt
            if alt is None:
                suggested_alt = self._generate_alt_from_filename(filename)
                recs.append(Recommendation(
                    id=_next_id(),
                    priority="HIGH",
                    group="DESIGNER",
                    element=f"img[src='{_escape_html(filename)}']",
                    current_value="(no alt attribute)",
                    recommended_value=f'alt="{suggested_alt}"',
                    reason=(
                        f"Image '{filename}' is missing an alt attribute. Alt text is critical for "
                        "accessibility (screen readers), image search rankings, and helps Google "
                        "understand the image content. Missing alt text is an accessibility violation "
                        "(WCAG 2.1 Level A)."
                    ),
                    expected_impact="Adding descriptive alt text can improve image search rankings and accessibility score.",
                    estimated_time="5 minutes",
                    difficulty="EASY",
                    dependencies=[],
                    verification_method=f"Check <img src='{filename}'> has an alt attribute with descriptive text.",
                    status="NEW",
                    implementation_code=f'<img src="{_escape_html(src)}" alt="{_escape_html(suggested_alt)}" />',
                    documentation_ref="https://developers.google.com/search/docs/appearance/google-images",
                    before_code=f'<img src="{_escape_html(src)}">',
                    after_code=f'<img src="{_escape_html(src)}" alt="{_escape_html(suggested_alt)}" />',
                    image_data={
                        "filename": filename,
                        "current_alt": "(missing)",
                        "suggested_alt": suggested_alt,
                        "suggested_caption": f"Descriptive caption for {filename}",
                        "suggested_surrounding_text": f"Surround the image with contextual text about {suggested_alt}.",
                    },
                ))
            elif len(alt.strip()) < 10:
                suggested_alt = self._generate_alt_from_filename(filename)
                recs.append(Recommendation(
                    id=_next_id(),
                    priority="MEDIUM",
                    group="DESIGNER",
                    element=f"img[src='{_escape_html(filename)}']",
                    current_value=f'alt="{alt}" ({len(alt)} chars)',
                    recommended_value=f'alt="{suggested_alt}"',
                    reason=(
                        f"Alt text for '{filename}' is only {len(alt)} characters. Brief alt text "
                        "misses keyword opportunities and doesn't adequately describe the image "
                        "for screen readers. Aim for 10-15 words that describe the image content."
                    ),
                    expected_impact="More descriptive alt text improves image search visibility by 10-30%.",
                    estimated_time="5 minutes",
                    difficulty="EASY",
                    dependencies=[],
                    verification_method=f"Verify <img src='{filename}'> alt text is descriptive (10+ words).",
                    status="NEW",
                    implementation_code=f'<img src="{_escape_html(src)}" alt="{_escape_html(suggested_alt)}" />',
                    documentation_ref="https://developers.google.com/search/docs/appearance/google-images",
                    image_data={
                        "filename": filename,
                        "current_alt": alt,
                        "suggested_alt": suggested_alt,
                        "suggested_caption": f"Descriptive caption for {filename}",
                        "suggested_surrounding_text": f"Add surrounding text describing the context of this image.",
                    },
                ))

            # Check for lazy loading
            loading = img.get("loading") if isinstance(img, dict) else None
            if loading != "lazy" and src:
                recs.append(Recommendation(
                    id=_next_id(),
                    priority="MEDIUM",
                    group="DEVELOPER",
                    element=f"img[src='{_escape_html(filename)}']",
                    current_value=f'loading="{loading or "(not set)"}"',
                    recommended_value='loading="lazy"',
                    reason=(
                        f"Image '{filename}' doesn't use lazy loading. Adding loading='lazy' "
                        "defers off-screen image loading, improving initial page load time "
                        "and Core Web Vitals (LCP, FID)."
                    ),
                    expected_impact="Can improve LCP by 0.5-2 seconds on image-heavy pages.",
                    estimated_time="5 minutes",
                    difficulty="EASY",
                    dependencies=[],
                    verification_method=f"Check <img src='{filename}'> has loading='lazy' attribute.",
                    status="NEW",
                    implementation_code=f'<img src="{_escape_html(src)}" alt="{_escape_html(alt or "")}" loading="lazy" />',
                    documentation_ref="https://web.dev/lazy-loading-images/",
                    before_code=f'<img src="{_escape_html(src)}" alt="{_escape_html(alt or "")}">',
                    after_code=f'<img src="{_escape_html(src)}" alt="{_escape_html(alt or "")}" loading="lazy">',
                ))

            # Check for width/height attributes (CLS)
            width = img.get("width") if isinstance(img, dict) else None
            height = img.get("height") if isinstance(img, dict) else None
            if not width and not height and src:
                recs.append(Recommendation(
                    id=_next_id(),
                    priority="MEDIUM",
                    group="DEVELOPER",
                    element=f"img[src='{_escape_html(filename)}']",
                    current_value="(no width/height attributes)",
                    recommended_value='width="W" height="H" (use actual image dimensions)',
                    reason=(
                        f"Image '{filename}' is missing width and height attributes. Without them, "
                        "the browser can't reserve space, causing Cumulative Layout Shift (CLS) "
                        "when the image loads. This negatively impacts Core Web Vitals."
                    ),
                    expected_impact="Setting dimensions eliminates CLS from this image, improving CWV score.",
                    estimated_time="5 minutes",
                    difficulty="EASY",
                    dependencies=[],
                    verification_method=f"Check <img src='{filename}'> has width and height attributes.",
                    status="NEW",
                    implementation_code=(
                        f'<img src="{_escape_html(src)}" alt="{_escape_html(alt or "")}" '
                        'width="800" height="600" loading="lazy" />'
                    ),
                    documentation_ref="https://web.dev/optimize-cls/",
                    before_code=f'<img src="{_escape_html(src)}" alt="{_escape_html(alt or "")}">',
                    after_code=(
                        f'<img src="{_escape_html(src)}" alt="{_escape_html(alt or "")}" '
                        'width="800" height="600" loading="lazy">'
                    ),
                ))

    # ----- links -----------------------------------------------------------

    def _check_links(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        internal = page.get("links_internal") or []
        external = page.get("links_external") or []
        url = page.get("url", "")
        content_text = page.get("content_text") or ""
        word_count = page.get("word_count") or 0

        # Too few internal links
        min_internal = max(3, word_count // 200) if word_count else 3
        if len(internal) < min_internal:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="SEO",
                element="a[href] (internal)",
                current_value=f"{len(internal)} internal links",
                recommended_value=f"At least {min_internal} internal links (currently {len(internal)}).",
                reason=(
                    f"This page has only {len(internal)} internal links. Internal links distribute "
                    "PageRank, help Google discover related content, and improve crawlability. "
                    f"With {word_count} words, aim for at least {min_internal} internal links "
                    "(roughly 1 per 200 words)."
                ),
                expected_impact="Adding internal links can improve rankings for linked pages and distribute authority.",
                estimated_time="20 minutes",
                difficulty="MODERATE",
                dependencies=[],
                verification_method=f"Count internal links on page; should be {min_internal}+.",
                status="NEW",
                implementation_code=(
                    "<!-- Add contextual internal links within your content:\n"
                    "  <a href=\"/related-page\">related anchor text</a>\n"
                    "  Place links naturally within paragraphs.\n"
                    "-->"
                ),
                documentation_ref="https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers",
            ))

        # Too many external links without nofollow
        followed_external = 0
        for link in external:
            if isinstance(link, dict):
                rel = link.get("rel", "")
                if "nofollow" not in str(rel).lower():
                    followed_external += 1
            else:
                followed_external += 1

        if followed_external > 10:
            recs.append(Recommendation(
                id=_next_id(),
                priority="MEDIUM",
                group="SEO",
                element="a[href] (external, dofollow)",
                current_value=f"{followed_external} dofollow external links",
                recommended_value="Add rel='nofollow' to external links that you don't editorially endorse.",
                reason=(
                    f"There are {followed_external} dofollow external links. Linking out freely "
                    "passes PageRank to other sites. Add rel='nofollow' to non-editorial links "
                    "(user-generated content, paid links, affiliate links) to preserve link equity."
                ),
                expected_impact="Nofollow on non-editorial links preserves internal PageRank flow.",
                estimated_time="15 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Check external <a> tags for rel='nofollow' on non-editorial links.",
                status="NEW",
                implementation_code=(
                    '<a href="external-url" rel="nofollow noreferrer">external link text</a>'
                ),
                documentation_ref="https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links",
            ))

        # Empty anchor text links
        if internal:
            empty_anchors = 0
            for link in internal:
                if isinstance(link, dict):
                    text = (link.get("text") or "").strip()
                    href = (link.get("href") or "").strip()
                    if href and not text and not any(
                        ext in href.lower()
                        for ext in (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".pdf")
                    ):
                        empty_anchors += 1

            if empty_anchors > 0:
                recs.append(Recommendation(
                    id=_next_id(),
                    priority="MEDIUM",
                    group="SEO",
                    element="a[href] (internal, empty anchor)",
                    current_value=f"{empty_anchors} internal links with empty anchor text",
                    recommended_value="Use descriptive, keyword-relevant anchor text for all internal links.",
                    reason=(
                        f"{empty_anchors} internal links have empty or missing anchor text. "
                        "Anchor text helps Google understand what the linked page is about. "
                        "Use descriptive text that includes relevant keywords (but avoid exact-match "
                        "over-optimization)."
                    ),
                    expected_impact="Descriptive anchor text can improve rankings for linked target pages.",
                    estimated_time="15 minutes",
                    difficulty="EASY",
                    dependencies=[],
                    verification_method="Inspect internal links to confirm all have meaningful anchor text.",
                    status="NEW",
                    implementation_code=(
                        '<a href="/target-page">Descriptive anchor text with relevant keyword</a>'
                    ),
                    documentation_ref="https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers",
                ))

    # ----- schema ----------------------------------------------------------

    def _check_schema(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        schema = page.get("schema_markup") or []
        url = page.get("url", "")
        title = page.get("title") or ""
        page_type = page.get("page_type") or ""
        headings = page.get("headings") or []
        h1 = page.get("h1") or ""
        content_text = page.get("content_text") or ""
        content_lower = content_text.lower()

        # No schema at all
        if not schema:
            recs.append(Recommendation(
                id=_next_id(),
                priority="CRITICAL",
                group="DEVELOPER",
                element="script[type='application/ld+json']",
                current_value="(no structured data found)",
                recommended_value="Add Organization + BreadcrumbList schema at minimum.",
                reason=(
                    "No structured data (JSON-LD) was found on this page. Structured data helps "
                    "Google understand your content and can enable rich results (star ratings, "
                    "FAQ dropdowns, breadcrumbs, sitelinks search box) that significantly increase "
                    "SERP real estate and CTR."
                ),
                expected_impact="Rich results can increase CTR by 15-35% depending on result type.",
                estimated_time="30 minutes",
                difficulty="MODERATE",
                dependencies=[],
                verification_method="Validate with Google Rich Results Test (https://search.google.com/test/rich-results).",
                status="NEW",
                implementation_code=self._generate_org_schema(page),
                documentation_ref="https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
                before_code="(no <script type='application/ld+json'> tag)",
                after_code=self._generate_org_schema_snippet(),
            ))

        schema_types = set()
        for item in schema:
            if isinstance(item, dict):
                t = item.get("@type", "")
                if isinstance(t, str):
                    schema_types.add(t)
                elif isinstance(t, list):
                    schema_types.update(t)

        # Missing Organization schema
        if "Organization" not in schema_types and "LocalBusiness" not in schema_types:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="DEVELOPER",
                element="script[type='application/ld+json'] (Organization)",
                current_value="No Organization schema",
                recommended_value="Add Organization schema with name, logo, URL, and social profiles.",
                reason=(
                    "Organization schema is missing. This schema helps Google understand your brand, "
                    "enables the Knowledge Panel in search results, and is required for sitelinks "
                    "search box. It also supports Google's understanding of entity relationships."
                ),
                expected_impact="Organization schema enables Knowledge Panel and improves brand visibility.",
                estimated_time="20 minutes",
                difficulty="MODERATE",
                dependencies=[],
                verification_method="Validate Organization schema at https://search.google.com/test/rich-results.",
                status="NEW",
                implementation_code=self._generate_org_schema(page),
                documentation_ref="https://developers.google.com/search/docs/appearance/structured-data/organization",
                before_code="(no Organization schema)",
                after_code=self._generate_org_schema_snippet(),
            ))

        # Missing BreadcrumbList
        if "BreadcrumbList" not in schema_types:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="DEVELOPER",
                element="script[type='application/ld+json'] (BreadcrumbList)",
                current_value="No BreadcrumbList schema",
                recommended_value="Add BreadcrumbList schema reflecting the page hierarchy.",
                reason=(
                    "BreadcrumbList schema is missing. Breadcrumbs help Google understand site "
                    "hierarchy and can display breadcrumb navigation in search results, improving "
                    "user experience and increasing SERP click-through rates."
                ),
                expected_impact="Breadcrumb rich results can improve CTR by 10-20%.",
                estimated_time="15 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Validate BreadcrumbList schema at Rich Results Test.",
                status="NEW",
                implementation_code=self._generate_breadcrumb_schema(url),
                documentation_ref="https://developers.google.com/search/docs/appearance/structured-data/breadcrumb",
                before_code="(no BreadcrumbList schema)",
                after_code=self._generate_breadcrumb_schema_snippet(url),
            ))

        # FAQ schema for FAQ content
        has_faq_content = any(
            phrase in content_lower
            for phrase in (
                "frequently asked", "faq", "common questions",
                "how do i", "what is", "how to", "is it possible",
            )
        )
        if has_faq_content and "FAQPage" not in schema_types:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="DEVELOPER",
                element="script[type='application/ld+json'] (FAQPage)",
                current_value="FAQ-like content without FAQPage schema",
                recommended_value="Add FAQPage schema to enable FAQ rich results in SERP.",
                reason=(
                    "This page appears to contain FAQ-like content but has no FAQPage schema. "
                    "Adding FAQPage schema can display expandable Q&A pairs directly in search "
                    "results, significantly increasing SERP visibility and CTR."
                ),
                expected_impact="FAQ rich results can increase CTR by 15-25% and occupy more SERP space.",
                estimated_time="30 minutes",
                difficulty="MODERATE",
                dependencies=["Identify and structure FAQ pairs from existing content"],
                verification_method="Validate FAQPage schema at Rich Results Test.",
                status="NEW",
                implementation_code=(
                    "<script type=\"application/ld+json\">\n"
                    "{\n"
                    '  "@context": "https://schema.org",\n'
                    '  "@type": "FAQPage",\n'
                    '  "mainEntity": [{\n'
                    '    "@type": "Question",\n'
                    '    "name": "What is the main question?",\n'
                    '    "acceptedAnswer": {\n'
                    '      "@type": "Answer",\n'
                    '      "text": "Provide a comprehensive answer here (40-50 words recommended)."\n'
                    "    }\n"
                    "  }, {\n"
                    '    "@type": "Question",\n'
                    '    "name": "Another common question?",\n'
                    '    "acceptedAnswer": {\n'
                    '      "@type": "Answer",\n'
                    '      "text": "Provide a comprehensive answer here."\n'
                    "    }\n"
                    "  }]\n"
                    "}\n"
                    "</script>"
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/structured-data/faqpage",
            ))

        # Article schema for blog-like content
        is_article = any(
            indicator in url.lower()
            for indicator in ("/blog/", "/post/", "/article/", "/news/", "/guide/")
        )
        if is_article and "Article" not in schema_types and "BlogPosting" not in schema_types:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="DEVELOPER",
                element="script[type='application/ld+json'] (Article)",
                current_value="Article content without Article schema",
                recommended_value="Add Article or BlogPosting schema with author, datePublished, and image.",
                reason=(
                    "This appears to be article/blog content but has no Article schema. Article "
                    "schema helps Google understand authorship, publication date, and can enable "
                    "Top Stories carousel and other article-specific rich results."
                ),
                expected_impact="Article schema can enable Top Stories carousel and improve content visibility.",
                estimated_time="20 minutes",
                difficulty="MODERATE",
                dependencies=[],
                verification_method="Validate Article schema at Rich Results Test.",
                status="NEW",
                implementation_code=self._generate_article_schema(page),
                documentation_ref="https://developers.google.com/search/docs/appearance/structured-data/article",
            ))

    # ----- open graph ------------------------------------------------------

    def _check_open_graph(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        og = page.get("open_graph") or {}
        url = page.get("url", "")
        title = page.get("title") or ""
        meta = page.get("meta_description") or ""

        if not og:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="MARKETING",
                element="meta[property='og:*']",
                current_value="(no Open Graph tags found)",
                recommended_value="Add og:title, og:description, og:image, og:url, og:type.",
                reason=(
                    "Open Graph tags are missing. When this page is shared on social media "
                    "(Facebook, LinkedIn, Slack, Discord, etc.), platforms will scrape the page "
                    "and may display incorrect or incomplete information. OG tags give you full "
                    "control over how your page appears when shared."
                ),
                expected_impact="OG tags can increase social media CTR by 20-40% when content is shared.",
                estimated_time="15 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Use Facebook Sharing Debugger or check page source for og:* meta tags.",
                status="NEW",
                implementation_code=(
                    '<meta property="og:type" content="website" />\n'
                    f'<meta property="og:url" content="{url}" />\n'
                    f'<meta property="og:title" content="{_escape_html(title or "Page Title")}" />\n'
                    f'<meta property="og:description" content="{_escape_html(meta or "Page description")}" />\n'
                    '<meta property="og:image" content="https://example.com/image.jpg" />\n'
                    '<meta property="og:site_name" content="Brand Name" />'
                ),
                documentation_ref="https://ogp.me/",
                before_code="(no Open Graph meta tags)",
                after_code=(
                    '<meta property="og:type" content="website" />\n'
                    f'<meta property="og:url" content="{url}" />\n'
                    f'<meta property="og:title" content="{_escape_html(title or "Page Title")}" />\n'
                    f'<meta property="og:description" content="{_escape_html(meta or "Description")}" />\n'
                    '<meta property="og:image" content="https://example.com/image.jpg" />'
                ),
            ))
            return

        missing_og = []
        for prop in ("og:title", "og:description", "og:image", "og:url", "og:type"):
            if prop not in og:
                missing_og.append(prop)

        for prop in missing_og:
            default_values = {
                "og:title": title or "Page Title",
                "og:description": meta or "Page description",
                "og:image": "https://example.com/image.jpg",
                "og:url": url,
                "og:type": "website",
            }
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="MARKETING",
                element=f"meta[property='{prop}']",
                current_value="(missing)",
                recommended_value=f'<meta property="{prop}" content="{default_values[prop]}" />',
                reason=(
                    f"Missing {prop}. This tag controls how the page appears when shared on "
                    "social media. Without it, platforms use default scraping which may show "
                    "incorrect information."
                ),
                expected_impact=f"Adding {prop} improves social sharing appearance and CTR.",
                estimated_time="5 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method=f"Check page source for <meta property='{prop}' ...> tag.",
                status="NEW",
                implementation_code=f'<meta property="{prop}" content="{_escape_html(default_values[prop])}" />',
                documentation_ref="https://ogp.me/",
                before_code=f"(no {prop} tag)",
                after_code=f'<meta property="{prop}" content="{_escape_html(default_values[prop])}" />',
            ))

    # ----- twitter card ----------------------------------------------------

    def _check_twitter_card(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        tc = page.get("twitter_card") or {}
        title = page.get("title") or ""
        meta = page.get("meta_description") or ""

        if not tc:
            recs.append(Recommendation(
                id=_next_id(),
                priority="MEDIUM",
                group="MARKETING",
                element="meta[name='twitter:*']",
                current_value="(no Twitter Card tags found)",
                recommended_value="Add twitter:card, twitter:title, twitter:description, twitter:image.",
                reason=(
                    "Twitter Card tags are missing. When this page is shared on Twitter/X, "
                    "it won't display a rich card preview with image, title, and description. "
                    "Twitter Cards can significantly increase engagement on the platform."
                ),
                expected_impact="Twitter Cards can increase tweet engagement by 10-30%.",
                estimated_time="10 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Use Twitter Card Validator or check page source for twitter:* meta tags.",
                status="NEW",
                implementation_code=(
                    '<meta name="twitter:card" content="summary_large_image" />\n'
                    f'<meta name="twitter:title" content="{_escape_html(title or "Page Title")}" />\n'
                    f'<meta name="twitter:description" content="{_escape_html(meta or "Page description")}" />\n'
                    '<meta name="twitter:image" content="https://example.com/image.jpg" />'
                ),
                documentation_ref="https://developer.x.com/en/docs/twitter-for-websites/cards/overview/abouts-cards",
                before_code="(no Twitter Card meta tags)",
                after_code=(
                    '<meta name="twitter:card" content="summary_large_image" />\n'
                    f'<meta name="twitter:title" content="{_escape_html(title or "Page Title")}" />\n'
                    f'<meta name="twitter:description" content="{_escape_html(meta or "Description")}" />\n'
                    '<meta name="twitter:image" content="https://example.com/image.jpg" />'
                ),
            ))
            return

        missing_tc = []
        for name in ("twitter:card", "twitter:title", "twitter:description", "twitter:image"):
            if name not in tc:
                missing_tc.append(name)

        for name in missing_tc:
            defaults = {
                "twitter:card": "summary_large_image",
                "twitter:title": title or "Page Title",
                "twitter:description": meta or "Page description",
                "twitter:image": "https://example.com/image.jpg",
            }
            recs.append(Recommendation(
                id=_next_id(),
                priority="MEDIUM",
                group="MARKETING",
                element=f"meta[name='{name}']",
                current_value="(missing)",
                recommended_value=f'<meta name="{name}" content="{defaults[name]}" />',
                reason=(
                    f"Missing {name}. This tag controls how the page appears when shared on Twitter/X."
                ),
                expected_impact=f"Adding {name} improves Twitter sharing appearance.",
                estimated_time="5 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method=f"Check page source for <meta name='{name}' ...> tag.",
                status="NEW",
                implementation_code=f'<meta name="{name}" content="{_escape_html(str(defaults[name]))}" />',
                documentation_ref="https://developer.x.com/en/docs/twitter-for-websites/cards/overview/abouts-cards",
            ))

    # ----- content ---------------------------------------------------------

    def _check_content(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        word_count = page.get("word_count") or 0
        content_text = page.get("content_text") or ""
        url = page.get("url", "")
        page_type = page.get("page_type") or ""
        content_lower = content_text.lower()

        # Thin content
        min_words = self._get_min_words(page_type)
        if word_count < min_words:
            priority = "CRITICAL" if word_count < 100 else "HIGH"
            recs.append(Recommendation(
                id=_next_id(),
                priority=priority,
                group="CONTENT",
                element="body (main content)",
                current_value=f"{word_count} words",
                recommended_value=f"At least {min_words} words of unique, valuable content.",
                reason=(
                    f"This page has only {word_count} words. Pages with thin content are less "
                    f"likely to rank because they don't provide enough value to users. For a "
                    f"'{page_type or 'general'}' page, aim for at least {min_words} words of "
                    "in-depth, unique content that satisfies user intent."
                ),
                expected_impact=f"Increasing to {min_words}+ words can improve ranking potential by 20-50%.",
                estimated_time="2 hours" if word_count < 100 else "1 hour",
                difficulty="HARD" if word_count < 100 else "MODERATE",
                dependencies=["Content research and outline required"],
                verification_method=f"Use word counter to verify {min_words}+ words of visible content.",
                status="NEW",
                implementation_code=(
                    f"<!-- Current word count: {word_count}. Target: {min_words}+ words. -->\n"
                    "<!-- Add comprehensive content covering: -->\n"
                    "<!-- 1. Introduction with primary keyword in first 100 words -->\n"
                    "<!-- 2. Key subtopics as H2 sections -->\n"
                    "<!-- 3. Specific examples, data, and actionable advice -->\n"
                    "<!-- 4. FAQ section addressing common questions -->\n"
                    "<!-- 5. Conclusion with clear next steps -->"
                ),
                documentation_ref="https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
            ))

        # No lists or structured content
        has_lists = bool(re.search(r"<[ou]l|<li|<table|<tr", page.get("html_raw") or "", re.IGNORECASE))
        if word_count > 300 and not has_lists:
            recs.append(Recommendation(
                id=_next_id(),
                priority="MEDIUM",
                group="CONTENT",
                element="body (content structure)",
                current_value="No lists, tables, or structured content",
                recommended_value="Add bullet points, numbered lists, or tables to break up content.",
                reason=(
                    "This page has no lists, tables, or structured content. Lists improve "
                    "readability, help Google generate featured snippets, and make content more "
                    "scannable for users. Google often selects list content for featured snippets."
                ),
                expected_impact="Structured content is 40% more likely to appear in featured snippets.",
                estimated_time="30 minutes",
                difficulty="MODERATE",
                dependencies=[],
                verification_method="Check HTML source for <ul>, <ol>, or <table> elements in main content.",
                status="NEW",
                implementation_code=(
                    "<!-- Convert paragraphs to lists where appropriate: -->\n"
                    "<ul>\n"
                    "  <li><strong>Key Point 1:</strong> Explanation with details</li>\n"
                    "  <li><strong>Key Point 2:</strong> Explanation with details</li>\n"
                    "  <li><strong>Key Point 3:</strong> Explanation with details</li>\n"
                    "</ul>"
                ),
                documentation_ref="https://developers.google.com/search/docs/appearance/google-managed-content#featured-snippets",
            ))

        # No statistics or data
        has_statistics = bool(
            re.search(
                r"\d+%|\d+\.\d+|\$\d+|\d{4}\s*(study|survey|research|report|data)",
                content_text,
                re.IGNORECASE,
            )
        )
        if word_count > 500 and not has_statistics:
            recs.append(Recommendation(
                id=_next_id(),
                priority="MEDIUM",
                group="CONTENT",
                element="body (content depth)",
                current_value="No statistics or data points found",
                recommended_value="Add relevant statistics, data, and references to strengthen authority.",
                reason=(
                    "No statistics or data points were found in the content. Content with specific "
                    "data, statistics, and research citations is perceived as more authoritative "
                    "by both users and search engines. It also increases time-on-page and "
                    "reduces bounce rate."
                ),
                expected_impact="Data-rich content gets 30% more backlinks and 20% more engagement.",
                estimated_time="1 hour",
                difficulty="MODERATE",
                dependencies=["Research and source data from reputable sources"],
                verification_method="Check content for numerical data, percentages, or citations.",
                status="NEW",
                implementation_code=(
                    "<!-- Add statistics and data points:\n"
                    "  According to [Source] (year), [relevant statistic].\n"
                    "  Research shows that [finding] with [X]% [improvement/impact].\n"
                    "  A study by [Organization] found [specific data point].\n"
                    "-->"
                ),
                documentation_ref="https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
            ))

    # ----- technical -------------------------------------------------------

    def _check_technical(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        status = page.get("status_code")
        url = page.get("url", "")

        if status and status >= 400:
            priority = "CRITICAL" if status >= 500 else "HIGH"
            recs.append(Recommendation(
                id=_next_id(),
                priority=priority,
                group="DEVELOPER",
                element=f"HTTP {status} response",
                current_value=f"Status code: {status}",
                recommended_value="Ensure page returns HTTP 200 status.",
                reason=(
                    f"This page returns HTTP {status}. "
                    + (
                        "Server errors (5xx) prevent search engines from crawling and indexing "
                        "the page entirely."
                        if status >= 500
                        else "Client errors (4xx) mean the page cannot be accessed. 404 pages "
                        "are deindexed and lose all ranking authority."
                    )
                ),
                expected_impact=f"Fixing HTTP {status} is critical for any ranking or indexing to occur.",
                estimated_time="30 minutes" if status < 500 else "1 hour",
                difficulty="MODERATE",
                dependencies=["Investigate root cause of server/client error"],
                verification_method=f"Use HTTP status checker to confirm 200 response for {url}.",
                status="NEW",
                implementation_code=(
                    f"<!-- Investigate and fix the {status} error: -->\n"
                    f"<!-- For 404: Create the page, set up redirect, or fix the internal link -->\n"
                    f"<!-- For 500: Check server logs, fix the server configuration -->\n"
                    f"<!-- Verify with: curl -I {url} -->"
                ),
                documentation_ref="https://developers.google.com/search/docs/crawling-indexing/http-status-codes",
            ))

        # Missing robots meta
        html_raw = page.get("html_raw") or ""
        has_robots_meta = bool(
            re.search(r'<meta\s+name=["\']robots["\']', html_raw, re.IGNORECASE)
        )
        if not has_robots_meta:
            recs.append(Recommendation(
                id=_next_id(),
                priority="LOW",
                group="DEVELOPER",
                element="meta[name='robots']",
                current_value="(no robots meta tag)",
                recommended_value='<meta name="robots" content="index, follow" />',
                reason=(
                    "No robots meta tag was found. While the default behavior is to index and "
                    "follow, explicitly declaring it prevents issues with conflicting directives "
                    "from other sources (XML sitemap, HTTP headers, etc.)."
                ),
                expected_impact="Minimal direct ranking impact, but prevents potential indexing issues.",
                estimated_time="5 minutes",
                difficulty="EASY",
                dependencies=[],
                verification_method="Check page source for <meta name='robots'> tag.",
                status="NEW",
                implementation_code='<meta name="robots" content="index, follow" />',
                documentation_ref="https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag",
                before_code="(no robots meta tag)",
                after_code='<meta name="robots" content="index, follow" />',
            ))

    # ----- crawl depth -----------------------------------------------------

    def _check_crawl_depth(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        depth = page.get("crawl_depth")
        if depth is None:
            return

        if depth > 4:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH" if depth > 6 else "MEDIUM",
                group="SEO",
                element="crawl_depth",
                current_value=f"Depth: {depth} clicks from homepage",
                recommended_value="Reduce to 3 clicks or fewer from homepage.",
                reason=(
                    f"This page is {depth} clicks from the homepage. Pages deeper than 3-4 "
                    "clicks get crawled less frequently and receive less PageRank. Important "
                    "pages should be accessible within 3 clicks of any page on the site."
                ),
                expected_impact="Reducing crawl depth can improve crawl frequency and PageRank flow.",
                estimated_time="1 hour",
                difficulty="MODERATE",
                dependencies=["Restructure internal linking or add navigation paths"],
                verification_method="Use a site crawler to verify the page is within 3 clicks of the homepage.",
                status="NEW",
                implementation_code=(
                    "<!-- Add internal links to reduce depth: -->\n"
                    "<!-- 1. Add to main navigation or footer -->\n"
                    "<!-- 2. Link from higher-authority pages -->\n"
                    "<!-- 3. Create category/hub pages that link to deeper content -->\n"
                    "<!-- 4. Add breadcrumbs: -->\n"
                    '<nav aria-label="Breadcrumb">\n'
                    '  <ol>\n'
                    '    <li><a href="/">Home</a></li>\n'
                    '    <li><a href="/category">Category</a></li>\n'
                    '    <li aria-current="page">Current Page</li>\n'
                    "  </ol>\n"
                    "</nav>"
                ),
                documentation_ref="https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers",
            ))

    # ----- response time ---------------------------------------------------

    def _check_response_time(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        response_ms = page.get("response_time_ms")
        if response_ms is None:
            return

        if response_ms > 3000:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="DEVELOPER",
                element="response_time_ms",
                current_value=f"{response_ms}ms",
                recommended_value="Under 200ms server response time (TTFB).",
                reason=(
                    f"Server response time is {response_ms}ms. Google recommends TTFB under 200ms. "
                    "Slow server response times directly impact Core Web Vitals (TTFB metric) and "
                    "can cause Googlebot to reduce crawl rate, delaying indexing."
                ),
                expected_impact="Improving TTFB can improve CWV scores and crawl efficiency.",
                estimated_time="2 hours",
                difficulty="HARD",
                dependencies=["Server optimization, CDN setup, or database query optimization"],
                verification_method="Measure TTFB using PageSpeed Insights or WebPageTest.",
                status="NEW",
                implementation_code=(
                    "<!-- Server optimization steps: -->\n"
                    "<!-- 1. Enable server-side caching (Redis/Memcached) -->\n"
                    "<!-- 2. Use a CDN (Cloudflare, AWS CloudFront) -->\n"
                    "<!-- 3. Optimize database queries -->\n"
                    "<!-- 4. Enable gzip/brotli compression -->\n"
                    "<!-- 5. Use HTTP/2 or HTTP/3 -->\n"
                    "<!-- 6. Consider upgrading server resources -->"
                ),
                documentation_ref="https://web.dev/articles/time-to-first-byte",
            ))
        elif response_ms > 600:
            recs.append(Recommendation(
                id=_next_id(),
                priority="MEDIUM",
                group="DEVELOPER",
                element="response_time_ms",
                current_value=f"{response_ms}ms",
                recommended_value="Under 200ms server response time (TTFB).",
                reason=(
                    f"Server response time is {response_ms}ms. While not critical, optimizing "
                    "server response time below 200ms improves Core Web Vitals and user experience."
                ),
                expected_impact="Server speed optimization can marginally improve rankings and user experience.",
                estimated_time="1 hour",
                difficulty="MODERATE",
                dependencies=["Server-level optimization"],
                verification_method="Measure TTFB using PageSpeed Insights.",
                status="NEW",
                implementation_code=(
                    "<!-- Optimize server response time: -->\n"
                    "<!-- 1. Enable caching -->\n"
                    "<!-- 2. Optimize queries -->\n"
                    "<!-- 3. Enable compression -->"
                ),
                documentation_ref="https://web.dev/articles/time-to-first-byte",
            ))

    # ----- marketing signals -----------------------------------------------

    def _check_marketing_signals(self, page: dict[str, Any], recs: list[Recommendation]) -> None:
        content_text = (page.get("content_text") or "").lower()
        word_count = page.get("word_count") or 0
        page_type = page.get("page_type") or ""

        cta_words = [
            "buy", "purchase", "sign up", "register", "download", "subscribe",
            "get started", "try free", "start free", "contact us", "schedule",
            "request", "book", "order", "add to cart", "learn more",
            "request demo", "start trial", "join", "apply",
        ]
        has_cta = any(w in content_text for w in cta_words)

        # Product/service pages without CTA
        if page_type in ("product", "service", "landing") and not has_cta:
            recs.append(Recommendation(
                id=_next_id(),
                priority="HIGH",
                group="MARKETING",
                element="body (call-to-action)",
                current_value="No clear call-to-action found",
                recommended_value="Add a prominent CTA button with action-oriented text.",
                reason=(
                    f"This appears to be a {page_type} page but contains no call-to-action. "
                    "Without a clear CTA, users don't know what to do next, resulting in lost "
                    "conversions. CTA buttons should be visually prominent and use action-oriented "
                    "language."
                ),
                expected_impact="Clear CTAs can increase conversion rates by 20-50%.",
                estimated_time="30 minutes",
                difficulty="MODERATE",
                dependencies=["Design team may need to create CTA button styling"],
                verification_method="Check page for visible CTA buttons with action text.",
                status="NEW",
                implementation_code=(
                    '<!-- Add a prominent CTA section: -->\n'
                    '<div class="cta-section" style="text-align: center; padding: 2rem;">\n'
                    '  <h2>Ready to Get Started?</h2>\n'
                    '  <p>Join thousands of satisfied customers today.</p>\n'
                    '  <a href="/signup" class="cta-button" style="background: #007bff; color: white; '
                    'padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 18px;">'
                    'Start Your Free Trial</a>\n'
                    '</div>'
                ),
                documentation_ref="https://developers.google.com/marketing-platform/articles/optimizing-conversion-rates",
            ))

        # No trust signals
        trust_words = [
            "testimonial", "review", "case study", "trusted by", "clients include",
            "certified", "award", "guarantee", "money back", "ssl", "secure",
            "privacy", "satisfaction", "partner", "enterprise", "industry leader",
        ]
        has_trust = any(w in content_text for w in trust_words)

        if page_type in ("product", "service", "landing", "homepage") and not has_trust and word_count > 200:
            recs.append(Recommendation(
                id=_next_id(),
                priority="MEDIUM",
                group="MARKETING",
                element="body (trust signals)",
                current_value="No trust signals found (testimonials, reviews, certifications)",
                recommended_value="Add trust signals: testimonials, reviews, certifications, guarantees.",
                reason=(
                    "No trust signals were found on this page. Trust signals (customer testimonials, "
                    "reviews, certifications, security badges, guarantee language) significantly "
                    "improve conversion rates by building credibility. Users are 70% more likely "
                    "to convert when they see social proof."
                ),
                expected_impact="Trust signals can increase conversion rates by 15-30%.",
                estimated_time="1 hour",
                difficulty="MODERATE",
                dependencies=["Gather testimonials and review content from customers"],
                verification_method="Check page for testimonial sections, review widgets, or certification badges.",
                status="NEW",
                implementation_code=(
                    '<!-- Add trust signals section: -->\n'
                    '<section class="social-proof">\n'
                    "  <h2>Trusted by 10,000+ Companies</h2>\n"
                    '  <div class="testimonials">\n'
                    '    <blockquote>\n'
                    '      <p>"This product transformed our workflow. We saw 40% improvement in efficiency."</p>\n'
                    '      <cite>- Jane Doe, CEO at Company</cite>\n'
                    "    </blockquote>\n"
                    "  </div>\n"
                    '  <div class="certifications">\n'
                    "    <img src=\"soc2-badge.png\" alt=\"SOC 2 Certified\" />\n"
                    "    <img src=\"gdpr-badge.png\" alt=\"GDPR Compliant\" />\n"
                    "  </div>\n"
                    "</section>"
                ),
                documentation_ref="https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
            ))

    # ----- helper methods --------------------------------------------------

    def _get_min_words(self, page_type: str) -> int:
        minimums = {
            "homepage": 300,
            "product": 800,
            "service": 800,
            "blog": 1200,
            "article": 1200,
            "landing": 500,
            "category": 600,
            "about": 400,
            "contact": 200,
            "faq": 1000,
            "guide": 2000,
        }
        return minimums.get(page_type.lower() if page_type else "", 800)

    def _generate_alt_from_filename(self, filename: str) -> str:
        name = filename.rsplit(".", 1)[0] if "." in filename else filename
        name = re.sub(r"[-_]+", " ", name)
        name = re.sub(r"([a-z])([A-Z])", r"\1 \2", name)
        return name.strip().title()

    def _generate_org_schema(self, page: dict[str, Any]) -> str:
        url = page.get("url", "")
        origin = "/".join(url.split("/")[:3]) if url else "https://example.com"
        return (
            '<script type="application/ld+json">\n'
            "{\n"
            '  "@context": "https://schema.org",\n'
            '  "@type": "Organization",\n'
            '  "name": "Your Company Name",\n'
            '  "url": "' + origin + '",\n'
            '  "logo": "' + origin + '/logo.png",\n'
            '  "sameAs": [\n'
            '    "https://twitter.com/yourcompany",\n'
            '    "https://linkedin.com/company/yourcompany",\n'
            '    "https://facebook.com/yourcompany"\n'
            "  ],\n"
            '  "contactPoint": {\n'
            '    "@type": "ContactPoint",\n'
            '    "telephone": "+1-555-555-5555",\n'
            '    "contactType": "customer service"\n'
            "  }\n"
            "}\n"
            "</script>"
        )

    def _generate_org_schema_snippet(self) -> str:
        return (
            '<script type="application/ld+json">\n'
            "{\n"
            '  "@context": "https://schema.org",\n'
            '  "@type": "Organization",\n'
            '  "name": "Your Company Name",\n'
            '  "url": "https://example.com",\n'
            '  "logo": "https://example.com/logo.png"\n'
            "}\n"
            "</script>"
        )

    def _generate_breadcrumb_schema(self, url: str) -> str:
        parts = [p for p in url.split("/") if p]
        items = []
        for i, part in enumerate(parts[1:], 1):
            name = part.replace("-", " ").replace("_", " ").title()
            item_url = "/".join(parts[:i + 1])
            if not item_url.startswith("http"):
                item_url = f"https://example.com/{item_url}"
            items.append(
                f'    {{\n'
                f'      "@type": "ListItem",\n'
                f'      "position": {i},\n'
                f'      "name": "{name}",\n'
                f'      "item": "{item_url}"\n'
                f"    }}"
            )
        list_items = ",\n".join(items)
        return (
            '<script type="application/ld+json">\n'
            "{\n"
            '  "@context": "https://schema.org",\n'
            '  "@type": "BreadcrumbList",\n'
            '  "itemListElement": [\n'
            f"    {{\n"
            f'      "@type": "ListItem",\n'
            f'      "position": 1,\n'
            f'      "name": "Home",\n'
            f'      "item": "https://example.com"\n'
            f"    }},\n"
            f"{list_items}\n"
            "  ]\n"
            "}\n"
            "</script>"
        )

    def _generate_breadcrumb_schema_snippet(self, url: str) -> str:
        return self._generate_breadcrumb_schema(url)

    def _generate_article_schema(self, page: dict[str, Any]) -> str:
        title = _escape_html(page.get("title") or "Article Title")
        url = page.get("url", "")
        return (
            '<script type="application/ld+json">\n'
            "{\n"
            '  "@context": "https://schema.org",\n'
            '  "@type": "Article",\n'
            f'  "headline": "{title}",\n'
            '  "author": {\n'
            '    "@type": "Person",\n'
            '    "name": "Author Name"\n'
            "  },\n"
            '  "datePublished": "2024-01-01",\n'
            '  "dateModified": "2024-01-01",\n'
            f'  "url": "{url}",\n'
            '  "image": "https://example.com/article-image.jpg",\n'
            '  "publisher": {\n'
            '    "@type": "Organization",\n'
            '    "name": "Brand Name",\n'
            '    "logo": {\n'
            '      "@type": "ImageObject",\n'
            '      "url": "https://example.com/logo.png"\n'
            "    }\n"
            "  },\n"
            '  "mainEntityOfPage": {\n'
            '    "@type": "WebPage",\n'
            f'    "@id": "{url}"\n'
            "  }\n"
            "}\n"
            "</script>"
        )

    def _suggest_heading_hierarchy(self, levels: list[int]) -> list[str]:
        result: list[str] = []
        prev_level = 0
        for level in levels:
            if level > prev_level + 1 and prev_level > 0:
                level = prev_level + 1
            result.append(f"H{level}")
            prev_level = level
        return result

    def _estimate_total_time(self, recs: list[Recommendation]) -> str:
        total_minutes = 0
        for r in recs:
            time_str = r.estimated_time.lower()
            if "hour" in time_str:
                num = re.search(r"(\d+)", time_str)
                total_minutes += int(num.group(1)) * 60 if num else 60
            elif "minute" in time_str:
                num = re.search(r"(\d+)", time_str)
                total_minutes += int(num.group(1)) if num else 15

        if total_minutes < 60:
            return f"{total_minutes} minutes"
        hours = total_minutes // 60
        mins = total_minutes % 60
        if mins:
            return f"{hours} hour{'s' if hours > 1 else ''} {mins} minutes"
        return f"{hours} hour{'s' if hours > 1 else ''}"

    def _estimate_impact(self, recs: list[Recommendation], page: dict[str, Any]) -> str:
        critical = sum(1 for r in recs if r.priority == "CRITICAL")
        high = sum(1 for r in recs if r.priority == "HIGH")
        total = len(recs)

        if critical > 0:
            return (
                f"SIGNIFICANT: {critical} critical issues are blocking indexing or ranking. "
                f"Fix these first. {high} high-priority items for additional impact."
            )
        if high > 3:
            return (
                f"MODERATE-HIGH: {high} high-priority issues found. "
                f"Addressing these can substantially improve rankings and visibility."
            )
        if high > 0:
            return (
                f"MODERATE: {high} high-priority and {total - high} other improvements recommended. "
                f"Implementing all will meaningfully improve SEO performance."
            )
        return (
            f"LOW-MODERATE: {total} minor improvements found. "
            f"Implementing these will provide incremental ranking and UX benefits."
        )
