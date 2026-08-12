"""Per-user Slack alert preferences and test delivery."""
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.engine.slack import get_pref, post_to_slack
from app.models import User
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/alerts/slack", tags=["alerts"])


class SlackRequest(BaseModel):
    webhook_url: str = ""
    enabled: bool = True
    notify_audit_completed: bool = True
    notify_audit_failed: bool = True
    notify_digest: bool = True


class SlackTestRequest(BaseModel):
    webhook_url: str = ""


def _pref_payload(pref) -> dict:
    return {
        "configured": bool(pref and pref.webhook_url),
        "webhook_url": pref.webhook_url if pref else "",
        "enabled": bool(pref.enabled) if pref else True,
        "notify_audit_completed": bool(pref.notify_audit_completed) if pref else True,
        "notify_audit_failed": bool(pref.notify_audit_failed) if pref else True,
        "notify_digest": bool(pref.notify_digest) if pref else True,
    }


@router.get("")
async def get_slack_settings(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models import SlackPreference
    pref = (await db.execute(select(SlackPreference).where(SlackPreference.user_id == user.id))).scalar_one_or_none()
    return _pref_payload(pref)


@router.put("")
async def save_slack_settings(body: SlackRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    webhook_url = (body.webhook_url or "").strip()
    if webhook_url and "hooks.slack.com" not in webhook_url:
        raise HTTPException(status_code=400, detail="webhook_url must be a valid Slack incoming-webhook URL (hooks.slack.com)")
    pref = await get_pref(db, user.id)
    pref.webhook_url = webhook_url
    pref.enabled = body.enabled
    pref.notify_audit_completed = body.notify_audit_completed
    pref.notify_audit_failed = body.notify_audit_failed
    pref.notify_digest = body.notify_digest
    await db.commit()
    await db.refresh(pref)
    return _pref_payload(pref)


@router.post("/test")
async def test_slack_settings(body: SlackTestRequest, user: User = Depends(get_current_active_user)):
    webhook_url = (body.webhook_url or "").strip()
    if not webhook_url:
        raise HTTPException(status_code=400, detail="webhook_url is required")
    if "hooks.slack.com" not in webhook_url:
        raise HTTPException(status_code=400, detail="webhook_url must be a valid Slack incoming-webhook URL (hooks.slack.com)")
    ok = await post_to_slack(webhook_url, f"*SEO Intelligence* · Slack integration test from {user.email} — everything is wired up.")
    return {"ok": ok}


@router.delete("")
async def delete_slack_settings(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models import SlackPreference
    pref = (await db.execute(select(SlackPreference).where(SlackPreference.user_id == user.id))).scalar_one_or_none()
    if pref:
        await db.delete(pref)
        await db.commit()
    return _pref_payload(None)
