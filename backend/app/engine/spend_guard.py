"""Per-user / per-provider daily spend guard for paid third-party APIs.

Every paid provider call is recorded as a ``UsageEvent`` (event_type
``provider.usage``) with ``details`` carrying the provider name and a synthetic
cost. Before a call is allowed, the guard counts today's recorded usage for the
(user, provider) pair and refuses once the configured daily budget is reached.

Budget configuration lives in ``app.config.settings`` (``PROVIDER_DAILY_BUDGET_*``).
A budget of 0 hard-blocks a provider; -1 means unlimited.

Design goal: never break the primary action on guard errors. If the DB write for
recording usage fails, the call is still allowed (fail-open) so the platform
keeps working even if the audit trail is unavailable.
"""
import datetime as _dt
import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


# Canonical provider ids used across the codebase, mapped to their budget
# setting attribute on settings.
_PROVIDER_BUDGET_ATTR = {
    "dataforseo": "PROVIDER_DAILY_BUDGET_DATAFORSEO",
    "dataforseo_volumes": "PROVIDER_DAILY_BUDGET_DATAFORSEO",
    "dataforseo_serp": "PROVIDER_DAILY_BUDGET_DATAFORSEO",
    "dataforseo_backlinks": "PROVIDER_DAILY_BUDGET_DATAFORSEO",
    "moz": "PROVIDER_DAILY_BUDGET_MOZ",
    "openpagerank": "PROVIDER_DAILY_BUDGET_PAGERANK",
    "pagerank": "PROVIDER_DAILY_BUDGET_PAGERANK",
    "serpapi": "PROVIDER_DAILY_BUDGET_SERPAPI",
    "pagespeed": "PROVIDER_DAILY_BUDGET_PAGESPEED",
    "pagespeed_insights": "PROVIDER_DAILY_BUDGET_PAGESPEED",
    "citations": "PROVIDER_DAILY_BUDGET_CITATIONS",
    "ai_citations": "PROVIDER_DAILY_BUDGET_CITATIONS",
    "profound": "PROVIDER_DAILY_BUDGET_CITATIONS",
    "se_ranking": "PROVIDER_DAILY_BUDGET_CITATIONS",
}


def provider_budget(provider: Optional[str]) -> int:
    """Return the configured daily budget for a provider id (0=block, -1=unlimited)."""
    attr = _PROVIDER_BUDGET_ATTR.get((provider or "").lower())
    if attr:
        try:
            return int(getattr(settings, attr, 0) or 0)
        except (TypeError, ValueError):
            return int(settings.PROVIDER_DEFAULT_DAILY_BUDGET)
    return int(settings.PROVIDER_DEFAULT_DAILY_BUDGET)


class ProviderBudgetExceeded(Exception):
    """Raised when a user has hit the daily budget for a provider."""

    def __init__(self, provider: str, budget: int):
        self.provider = provider
        self.budget = budget
        super().__init__(
            f"Daily budget exceeded for provider '{provider}' "
            f"(limit {budget} calls/day). Try again tomorrow or increase the budget."
        )


async def check_provider_budget(db, user_id: Optional[str], provider: str, cost: int = 1) -> bool:
    """Return True if a call is allowed, False if blocked by the daily budget.

    If ``user_id`` is None (anonymous / system call) the guard is skipped so
    unauthenticated internal tasks are never blocked.
    """
    if not user_id:
        return True
    budget = provider_budget(provider)
    if budget == 0:
        raise ProviderBudgetExceeded(provider, 0)
    if budget < 0:
        return True
    try:
        from sqlalchemy import select, func
        from sqlalchemy.ext.asyncio import AsyncSession
        from app.models import UsageEvent

        now = _dt.datetime.utcnow()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        result = await db.execute(
            select(func.count(UsageEvent.id)).where(
                UsageEvent.user_id == user_id,
                UsageEvent.event_type == "provider.usage",
                UsageEvent.created_at >= start,
                UsageEvent.details["provider"].as_string() == provider,
            )
        )
        used = result.scalar() or 0
        if used + cost > budget:
            raise ProviderBudgetExceeded(provider, budget)
        return True
    except ProviderBudgetExceeded:
        raise
    except Exception as e:  # noqa: BLE001 - fail-open on guard/DB errors
        logger.warning(f"Spend guard check failed (fail-open): {e}")
        return True


async def record_provider_usage(db, user_id: Optional[str], provider: str, cost: int = 1,
                                details: Optional[dict] = None) -> None:
    """Record a paid provider call for spend auditing. Best-effort (never raises)."""
    try:
        from app.models import UsageEvent
        merged = dict(details or {})
        merged.setdefault("provider", provider)
        merged.setdefault("cost", cost)
        db.add(UsageEvent(
            user_id=user_id or None,
            event_type="provider.usage",
            details=merged,
        ))
        await db.commit()
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Provider usage record failed: {e}")


async def guard_provider_call(db, user_id: Optional[str], provider: str, cost: int = 1,
                              details: Optional[dict] = None):
    """Check the budget then record the call atomically.

    Raises :class:`ProviderBudgetExceeded` when the daily cap is reached;
    otherwise records and returns normally. The caller should let the exception
    propagate to produce an HTTP 429/403-style response.
    """
    await check_provider_budget(db, user_id, provider, cost)
    await record_provider_usage(db, user_id, provider, cost, details)
