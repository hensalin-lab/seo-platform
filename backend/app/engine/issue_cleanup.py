"""
One-time/idempotent cleanup of stale analyzer issues in existing audits.

Fixes audits created before the analyzer started gating author-attribution
(and other editorial-only) checks by page type. Deleting here is safe: the
affected issues are re-computed (and now correctly filtered) on the next audit.
"""
import logging

from sqlalchemy import delete, or_, select

logger = logging.getLogger(__name__)

EDITORIAL_TYPES = {"BLOG", "RESOURCE", "CASE_STUDY", "CONTENT", "ARTICLE", "NEWS", "PUBLICATION", "PODCAST"}
NON_EDITORIAL_TYPES = {
    "HOMEPAGE", "PRICING", "PRODUCT", "SOLUTIONS", "SERVICES", "FEATURE",
    "DOCUMENTATION", "FAQ", "ABOUT", "CONTACT", "DEMO", "LEGAL", "LANDING_PAGE",
    "CAREERS", "AUTHOR", "TAG", "ARCHIVE", "CATEGORY", "SEARCH", "PAGINATION",
    "ERROR_404", "PROFILE", "ACCOUNT", "CART", "CHECKOUT",
}
JUNK_URL_PATTERNS = [
    "/privacy", "/terms", "/cookie", "/legal", "/policy", "/disclaimer", "/agreement",
    "/get-a-demo", "/demo", "/signup", "/login", "/register", "/cart", "/checkout",
    "/account", "/status", "/careers", "/jobs", "/pricing", "/contact", "/about",
    "/404", "page-not-found", "mailto:", "tel:", "#",
]


def _page_expects_author_attribution(page_type: str, url: str) -> bool:
    pt = (page_type or "").upper()
    if pt in EDITORIAL_TYPES:
        return True
    if pt in NON_EDITORIAL_TYPES:
        return False
    u = (url or "").lower()
    if any(k in u for k in JUNK_URL_PATTERNS):
        return False
    return any(k in u for k in [
        "/blog", "/post", "/article", "/news", "/journal", "/case-stud",
        "/resource", "/whitepaper", "/ebook", "/podcast", "/story",
    ])


async def cleanup_stale_no_author_issues(db) -> int:
    from app.models import Issue, Page

    pages = (await db.execute(select(Page.audit_id, Page.url, Page.page_type))).all()
    non_editorial = {
        (aid, url)
        for aid, url, pt in pages
        if not _page_expects_author_attribution(pt or "", url or "")
    }
    if not non_editorial:
        return 0

    issue_rows = (await db.execute(
        select(Issue.id, Issue.audit_id, Issue.page_url).where(
            or_(
                Issue.signal_name == "No Author",
                Issue.signal_name == "No Author Attribution",
                Issue.description.like("%no author%"),
            )
        )
    )).all()
    ids = [i.id for i in issue_rows if (i.audit_id, (i.page_url or "")) in non_editorial]
    if not ids:
        return 0

    await db.execute(delete(Issue).where(Issue.id.in_(ids)))
    await db.commit()
    logger.info("Issue cleanup: removed %d stale 'No Author' issues from non-editorial pages", len(ids))
    return len(ids)
