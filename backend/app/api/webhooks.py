import logging
import hashlib
import hmac
import json
import datetime as _dt
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import Webhook
from app.config import settings
from app.api.auth import get_current_active_user
from app.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


class WebhookRequest(BaseModel):
    url: str
    events: list[str] = ["audit.completed", "audit.failed"]


class WebhookTestRequest(BaseModel):
    payload: dict = {}


async def fire_webhook(user_id: str, event_type: str, payload: dict):
    from app.database import async_session
    try:
        async with async_session() as db:
            result = await db.execute(
                select(Webhook).where(Webhook.user_id == user_id, Webhook.is_active == True)
            )
            webhooks = result.scalars().all()
            for wh in webhooks:
                if event_type not in wh.events and "*" not in wh.events:
                    continue
                body = {"event": event_type, "data": payload, "timestamp": _dt.datetime.utcnow().isoformat()}
                body_bytes = json.dumps(body, default=str).encode()
                signature = hmac.new(wh.secret.encode(), body_bytes, hashlib.sha256).hexdigest() if wh.secret else ""
                try:
                    async with httpx.AsyncClient(timeout=10) as client:
                        headers = {"Content-Type": "application/json", "X-Webhook-Secret": signature, "X-Webhook-Event": event_type}
                        await client.post(wh.url, json=body, headers=headers)
                    wh.last_triggered_at = _dt.datetime.utcnow()
                except Exception as e:
                    logger.error(f"Webhook delivery failed for {wh.id}: {e}")
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
    await db.commit()
    await db.refresh(webhook)
    return {
        "id": webhook.id, "url": webhook.url, "events": webhook.events,
        "secret": webhook.secret, "is_active": webhook.is_active,
        "created_at": webhook.created_at.isoformat() if webhook.created_at else "",
    }


@router.get("")
async def list_webhooks(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Webhook).where(Webhook.user_id == user.id))
    webhooks = result.scalars().all()
    return [{
        "id": w.id, "url": w.url, "events": w.events, "is_active": w.is_active,
        "created_at": w.created_at.isoformat() if w.created_at else "",
        "last_triggered_at": w.last_triggered_at.isoformat() if w.last_triggered_at else None,
    } for w in webhooks]


@router.delete("/{webhook_id}")
async def delete_webhook(webhook_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id, Webhook.user_id == user.id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")
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
    body_bytes = json.dumps(body, default=str).encode()
    signature = hmac.new(wh.secret.encode(), body_bytes, hashlib.sha256).hexdigest() if wh.secret else ""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            headers = {"Content-Type": "application/json", "X-Webhook-Secret": signature, "X-Webhook-Event": "webhook.test"}
            resp = await client.post(wh.url, json=body, headers=headers)
        wh.last_triggered_at = _dt.datetime.utcnow()
        await db.commit()
        return {"status": "delivered", "status_code": resp.status_code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delivery failed: {str(e)}")
