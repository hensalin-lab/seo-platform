"""AI Visibility Trend API — returns historical AIVisibilitySnapshot data
for a domain, enabling trend line charts.

GET /api/ai-visibility-trend/{domain} — returns snapshots ordered by date.
"""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AIVisibilitySnapshot, User
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai-visibility-trend", tags=["ai-visibility-trend"])


@router.get("/{domain}")
async def ai_visibility_trend(domain: str,
                              user: User = Depends(get_current_active_user),
                              db: AsyncSession = Depends(get_db)):
    """Return AI visibility snapshots over time for a domain."""
    d = domain.lower().strip()
    snapshots = (await db.execute(
        select(AIVisibilitySnapshot)
        .where(AIVisibilitySnapshot.target_domain == d)
        .order_by(desc(AIVisibilitySnapshot.checked_at))
        .limit(52)  # ~1 year of weekly checks
    )).scalars().all()

    return {
        "domain": d,
        "snapshots": [
            {
                "date": s.checked_at.isoformat() if s.checked_at else None,
                "chatgpt": s.cited_by_chatgpt,
                "perplexity": s.cited_by_perplexity,
                "google_ai_overview": s.cited_by_google_ai_overview,
                "queries_checked": s.queries_checked,
            }
            for s in reversed(snapshots)  # oldest first for chart
        ],
    }
