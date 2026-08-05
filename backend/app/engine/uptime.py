"""Uptime / downtime monitoring engine. Lightweight HEAD/GET checks with
uptime-percentage tracking and webhook alerts on down transitions."""
import logging
import datetime as _dt

import httpx
from sqlalchemy import select, func

from app.models import UptimeTarget, UptimeCheck

logger = logging.getLogger(__name__)


async def check_url(client: httpx.AsyncClient, url: str) -> dict:
    try:
        resp = await client.head(url, follow_redirects=True)
        if resp.status_code in (0, 405, 501) or resp.status_code >= 500:
            resp = await client.get(url, follow_redirects=True)
        return {
            "status_code": resp.status_code,
            "is_up": resp.status_code < 500,
            "response_time_ms": int(resp.elapsed.total_seconds() * 1000),
            "error": "",
        }
    except Exception as e:
        return {
            "status_code": None,
            "is_up": False,
            "response_time_ms": 0,
            "error": str(e)[:200],
        }


async def get_uptime_percent(db, target_id: str, hours: int = 168) -> float:
    since = _dt.datetime.utcnow() - _dt.timedelta(hours=hours)
    rows = (await db.execute(
        select(UptimeCheck).where(UptimeCheck.target_id == target_id, UptimeCheck.checked_at >= since)
    )).scalars().all()
    if not rows:
        return None
    up = sum(1 for c in rows if c.is_up)
    return round(up / len(rows) * 100, 1)


async def run_check_for_target(db, target: UptimeTarget) -> dict:
    from app.models import UptimeTarget as _T
    was_up = target.last_is_up
    async with httpx.AsyncClient(timeout=20) as client:
        result = await check_url(client, target.url)

    check = UptimeCheck(
        target_id=target.id,
        status_code=result["status_code"],
        is_up=result["is_up"],
        response_time_ms=result["response_time_ms"],
        error=result["error"],
    )
    db.add(check)
    target.last_status_code = result["status_code"]
    target.last_is_up = result["is_up"]
    target.last_checked_at = _dt.datetime.utcnow()
    await db.commit()

    uptime = await get_uptime_percent(db, target.id)
    result["uptime_percent"] = uptime

    if was_up is True and result["is_up"] is False:
        try:
            from app.api.webhooks import fire_webhook
            await fire_webhook(target.user_id or "", "uptime.down", {
                "event": "uptime.down",
                "target_id": target.id,
                "name": target.name or target.url,
                "url": target.url,
                "status_code": result["status_code"],
                "error": result["error"],
            })
        except Exception as e:
            logger.warning(f"Uptime down webhook failed: {e}")
    return result


async def run_due_checks(db) -> dict:
    targets = (await db.execute(
        select(UptimeTarget).where(UptimeTarget.is_active == True)
    )).scalars().all()
    now = _dt.datetime.utcnow()
    checked = 0
    for target in targets:
        last = target.last_checked_at
        interval = _dt.timedelta(minutes=max(1, target.interval_minutes or 5))
        if last is None or (now - last) >= interval:
            try:
                await run_check_for_target(db, target)
                checked += 1
            except Exception as e:
                logger.warning(f"Uptime check failed for {target.url}: {e}")
    return {"checked": checked, "targets": len(targets)}
