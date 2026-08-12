import logging
import hashlib
import hmac
import json
import asyncio
import datetime as _dt
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import Webhook
from app.config import settings
from app.api.auth import get_current_active_user
from app.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

_MAX_ATTEMPTS = 3
_RETRY_BACKOFF = [2, 6, 12]


@router.get("/email-status")
async def get_email_status(user: User = Depends(get_current_active_user)):
    from app.engine.emailer import email_configured
    return {
        "configured": email_configured(),
        "host": settings.SMTP_HOST or "",
        "port": settings.SMTP_PORT or 587,
        "from_email": settings.EMAIL_FROM or "",
        "app_url": settings.APP_URL or "",
        "setup_help": "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and EMAIL_FROM environment variables to enable audit email alerts.",
    }


class WebhookRequest(BaseModel):
    url: str
    events: list[str] = ["audit.completed", "audit.failed"]


class WebhookTestRequest(BaseModel):
    payload: dict = {}


def _build_body(event_type: str, payload: dict) -> dict:
    return {"event": event_type, "data": payload, "timestamp": _dt.datetime.utcnow().isoformat()}


def _sign(body_bytes: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest() if secret else ""


async def _deliver_once(wh: Webhook, body: dict, event_type: str):
    """Single delivery attempt. Returns (status_code | None, error | None)."""
    body_bytes = json.dumps(body, default=str).encode()
    signature = _sign(body_bytes, wh.secret)
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Secret": signature,
        "X-Webhook-Event": event_type,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(wh.url, json=body, headers=headers)
        return resp.status_code, None
    except Exception as e:  # noqa: BLE001
        return None, str(e)


async def fire_webhook(user_id: str, event_type: str, payload: dict):
    """Deliver a webhook event with retry + exponential backoff.

    Per-webhook delivery count/status/error are persisted for the UI, and
    delivery failures are recorded to the activity trail (best-effort)."""
    from app.database import async_session
    from app.utils.activity import log_activity
    try:
        async with async_session() as db:
            result = await db.execute(
                select(Webhook).where(Webhook.user_id == user_id, Webhook.is_active == True)
            )
            webhooks = result.scalars().all()
            for wh in webhooks:
                if event_type not in wh.events and "*" not in wh.events:
                    continue
                body = _build_body(event_type, payload)
                last_status = None
                last_error = ""
                for attempt in range(_MAX_ATTEMPTS):
                    status, err = await _deliver_once(wh, body, event_type)
                    if status is not None and 200 <= status < 300:
                        last_status = status
                        break
                    last_error = err or f"HTTP {status}"
                    if attempt < _MAX_ATTEMPTS - 1:
                        await asyncio.sleep(_RETRY_BACKOFF[min(attempt, len(_RETRY_BACKOFF) - 1)])
                wh.last_triggered_at = _dt.datetime.utcnow()
                wh.delivery_count = (wh.delivery_count or 0) + 1
                wh.last_delivery_status = last_status
                wh.last_delivery_error = last_error[:500] if last_error else ""
                if last_error:
                    logger.error(f"Webhook delivery failed for {wh.id} after {_MAX_ATTEMPTS} attempts: {last_error}")
                await log_activity(
                    db, user_id, "webhook.delivered", "webhook", wh.id,
                    {"event": event_type, "success": not last_error, "attempts": _MAX_ATTEMPTS if last_error else "1-3", "error": last_error or None},
                )
            await db.commit()
    except Exception as e:
        logger.error(f"Fire webhook error: {e}")


@router.post("")
async def create_webhook(req: WebhookRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    import secrets
    webhook = Webhook(
        user_id=user.id, url=req.url, events=req.events,
        secret=f"whsec_{secrets.token_urlsafe(24)}",
    )
    db.add(webhook)
    await db.flush()

    from app.utils.activity import log_activity
    await log_activity(db, user.id, "webhook.created", "webhook", webhook.id, {"url": req.url, "events": req.events})
    await db.commit()
    await db.refresh(webhook)
    return {
        "id": webhook.id, "url": webhook.url, "events": webhook.events,
        "secret": webhook.secret, "is_active": webhook.is_active,
        "created_at": webhook.created_at.isoformat() if webhook.created_at else "",
    }


@router.get("")
async def list_webhooks(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    count_q = select(func.count()).select_from(Webhook).where(Webhook.user_id == user.id)
    total = (await db.execute(count_q)).scalar()
    result = await db.execute(
        select(Webhook).where(Webhook.user_id == user.id).order_by(Webhook.created_at.desc()).limit(limit).offset(offset)
    )
    webhooks = result.scalars().all()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [{
            "id": w.id, "url": w.url, "events": w.events, "is_active": w.is_active,
            "created_at": w.created_at.isoformat() if w.created_at else "",
            "last_triggered_at": w.last_triggered_at.isoformat() if w.last_triggered_at else None,
            "delivery_count": w.delivery_count or 0,
            "last_delivery_status": w.last_delivery_status,
            "last_delivery_error": w.last_delivery_error or "",
        } for w in webhooks],
    }


@router.delete("/{webhook_id}")
async def delete_webhook(webhook_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id, Webhook.user_id == user.id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")

    from app.utils.activity import log_activity
    await log_activity(db, user.id, "webhook.deleted", "webhook", webhook_id, {"url": wh.url})
    await db.delete(wh)
    await db.commit()
    return {"status": "deleted"}


@router.post("/{webhook_id}/test")
async def test_webhook(webhook_id: str, req: WebhookTestRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id, Webhook.user_id == user.id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")
    body = {"event": "webhook.test", "data": req.payload or {"message": "Test webhook from SEO Intel"}, "timestamp": _dt.datetime.utcnow().isoformat()}
    status, err = await _deliver_once(wh, body, "webhook.test")
    wh.last_triggered_at = _dt.datetime.utcnow()
    wh.delivery_count = (wh.delivery_count or 0) + 1
    wh.last_delivery_status = status
    wh.last_delivery_error = (err or "")[:500]
    await db.commit()
    if status is None or not (200 <= status < 300):
        raise HTTPException(status_code=500, detail=f"Delivery failed: {err or f'HTTP {status}'}")
    return {"status": "delivered", "status_code": status}
