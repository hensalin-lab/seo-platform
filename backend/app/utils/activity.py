"""Audit-trail / activity logging helper.

Best-effort by design: logging must never break the primary action, so callers
wrap nothing and this module swallows its own errors.
"""
import datetime as _dt
import logging

logger = logging.getLogger(__name__)


async def log_activity(db, user_id: str | None, action: str, entity_type: str = "",
                       entity_id: str = "", details: dict | None = None, ip_address: str = "") -> None:
    try:
        from app.models import ActivityLog
        db.add(ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
            ip_address=ip_address,
            created_at=_dt.datetime.utcnow(),
        ))
        await db.flush()
    except Exception as e:  # noqa: BLE001 - never break the primary action
        logger.debug(f"Activity log skipped: {e}")
