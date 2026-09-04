"""Live Content Editor API — scores a draft against the current top-3
ranking pages for a target keyword, surfacing gaps in word count,
headings, and key entities.

POST /api/content-editor/score  body: {content, target_keyword}
"""
import logging
import re
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.api.auth import get_current_active_user
from app.services.ddg_serp_client import DDGSerpClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/content-editor", tags=["content-editor"])


class ScoreBody(BaseModel):
    content: str
    target_keyword: str


def _extract_text(html_or_text: str) -> str:
    """Strip HTML tags and return plain text."""
    return re.sub(r"<[^>]+>", " ", html_or_text).strip()


def _word_count(text: str) -> int:
    return len(text.split())


def _extract_headings(html: str) -> dict:
    """Extract h1-h6 headings from HTML."""
    headings = {}
    for level in range(1, 7):
        pattern = re.compile(rf"<h{level}[^>]*>(.*?)</h{level}>", re.IGNORECASE | re.DOTALL)
        matches = pattern.findall(html)
        headings[f"h{level}"] = [_extract_text(m) for m in matches]
    return headings


def _extract_entities(text: str, min_len: int = 3) -> list[str]:
    """Extract significant words (entities proxy) from text."""
    words = re.findall(r"[A-Za-z]{%d,}" % min_len, text.lower())
    freq = {}
    for w in words:
        if w not in {"the", "and", "for", "are", "but", "not", "you", "all",
                      "can", "had", "her", "was", "one", "our", "out", "has",
                      "his", "how", "its", "may", "new", "now", "old", "see",
                      "way", "who", "did", "get", "got", "let", "say", "too",
                      "use", "with", "that", "this", "will", "your", "from",
                      "they", "been", "have", "each", "make", "like", "than",
                      "them", "then", "what", "when", "much", "some", "time",
                      "very", "just", "over", "such", "after", "also", "make",
                      "about", "into", "could", "other", "which", "their"}:
            freq[w] = freq.get(w, 0) + 1
    return sorted(freq.keys(), key=lambda x: freq[x], reverse=True)[:50]


def _compute_score(word_count: int, heading_count: int, entity_count: int) -> float:
    """Simple 0-100 content quality score."""
    wc_score = min(100, word_count / 15)       # ~1500 words = 100
    hd_score = min(100, heading_count * 12)     # ~8 headings = 96
    en_score = min(100, entity_count * 3)       # ~30 entities = 90
    return round(wc_score * 0.4 + hd_score * 0.3 + en_score * 0.3, 1)


def _score_content(text: str, html: str = "") -> dict:
    """Score a piece of content."""
    plain = _extract_text(html or text)
    wc = _word_count(plain)
    headings = _extract_headings(html) if html else {}
    total_headings = sum(len(v) for v in headings.values())
    entities = _extract_entities(plain)
    score = _compute_score(wc, total_headings, len(entities))
    return {
        "score": score,
        "word_count": wc,
        "headings": headings,
        "heading_count": total_headings,
        "entities": entities,
        "entity_count": len(entities),
    }


async def _fetch_page_content(url: str) -> tuple[str, str]:
    """Fetch a URL and return (html, text)."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; SEOPlatform/1.0)"})
            html = resp.text
            return html, _extract_text(html)
    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return "", ""


@router.post("/score")
async def score_content(body: ScoreBody,
                        user: User = Depends(get_current_active_user),
                        db: AsyncSession = Depends(get_db)):
    """Score a draft against current top-3 ranking pages for target_keyword.

    Steps:
    1. Fetch top-3 URLs from DuckDuckGo for the keyword (free, no API key)
    2. Crawl each competitor page
    3. Score both draft and each competitor page
    4. Return comparison data
    """
    if not body.target_keyword.strip():
        raise HTTPException(400, "target_keyword is required")
    if not body.content.strip():
        raise HTTPException(400, "content is required")

    # 1. Get top 3 URLs from SERP (DuckDuckGo — free, no API key)
    ddg = DDGSerpClient()
    competitor_data = []
    top_urls = []

    serp = await ddg.get_serp(body.target_keyword)
    top_urls = serp.get("top_3_urls", [])[:3]

    # 2. Fetch and score competitor pages
    for url in top_urls:
        try:
            html, text = await _fetch_page_content(url)
            if text:
                competitor_data.append({
                    "url": url,
                    **_score_content(text, html),
                })
        except Exception as e:
            logger.warning(f"Competitor fetch failed for {url}: {e}")

    # 3. Score the draft
    draft_plain = _extract_text(body.content)
    draft_score = _score_content(draft_plain, body.content)

    # 4. Compute gaps
    competitor_avg_score = 0
    competitor_avg_wc = 0
    all_competitor_entities = set()
    all_competitor_headings = set()

    if competitor_data:
        competitor_avg_score = round(
            sum(c["score"] for c in competitor_data) / len(competitor_data), 1
        )
        competitor_avg_wc = round(
            sum(c["word_count"] for c in competitor_data) / len(competitor_data)
        )
        for c in competitor_data:
            all_competitor_entities.update(c["entities"][:20])
            for headings in c["headings"].values():
                all_competitor_headings.update(headings)

    draft_entity_set = set(draft_score["entities"][:20])
    draft_heading_set = set()
    for headings in draft_score["headings"].values():
        draft_heading_set.update(headings)

    missing_entities = sorted(all_competitor_entities - draft_entity_set)[:15]
    missing_headings = sorted(all_competitor_headings - draft_heading_set)[:10]

    return {
        "draft": draft_score,
        "competitor_average": {
            "score": competitor_avg_score,
            "word_count": competitor_avg_wc,
        },
        "competitors": competitor_data,
        "gaps": {
            "word_count_vs_competitors": competitor_avg_wc - draft_score["word_count"],
            "missing_entities": missing_entities,
            "missing_headings": missing_headings,
            "score_gap": round(competitor_avg_score - draft_score["score"], 1),
        },
    }
