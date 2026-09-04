"""GSC-based rank client for own domains.

Wraps the existing ``GSCEngine`` to provide a per-keyword average position
lookup, used by the rank tracking engine whenever ``TrackedDomain.is_own_domain``
is True (avoids burning DataForSEO credits on your own domains).
"""
import logging
from typing import Optional

from app.engine.gsc_engine import GSCEngine

logger = logging.getLogger(__name__)


class GSCRankClient:
    """Thin wrapper around GSCEngine.get_top_queries for per-keyword lookup."""

    def __init__(self):
        self._engine = GSCEngine()

    @property
    def available(self) -> bool:
        return self._engine.available

    async def get_average_position(self, property_url: str,
                                   keyword: str) -> Optional[float]:
        """Return the average position for *keyword* in *property_url* (last 28d).

        Returns None if GSC is unavailable or the keyword has no data.
        """
        try:
            queries = self._engine.get_top_queries(property_url, days=28, limit=1000)
            for row in queries:
                if row.get("query", "").lower() == keyword.lower():
                    return float(row.get("position", 0))
        except Exception as e:
            logger.warning(f"GSC rank lookup failed for '{keyword}': {e}")
        return None
