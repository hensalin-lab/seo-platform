import logging

import httpx

from sqlalchemy import select

from app.database import async_session
from app.models import SlackPreference

logger = logging.getLogger(__name__)


async def get_pref(db, user_id: str) -> SlackPreference:
    pref = (await db.execute(select(SlackPreference).where(SlackPreference.user_id == user_id))).scalar_one_or_none()
    if pref is None:
        pref = SlackPreference(user_id=user_id)
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
    return pref


async def post_to_slack(webhook_url: str, text: str, blocks: list | None = None) -> bool:
    """Deliver a message to a Slack incoming-webhook URL."""
    if not webhook_url or "hooks.slack.com" not in webhook_url:
        return False
    payload: dict = {"text": text}
    if blocks:
        payload["blocks"] = blocks
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
        if resp.status_code == 200:
            return True
        logger.warning(f"Slack webhook returned {resp.status_code}: {resp.text[:300]}")
    except Exception as e:
        logger.warning(f"Slack webhook delivery failed: {e}")
    return False


def _markdown(text: str) -> list:
    return [{
        "type": "section",
        "text": {"type": "mrkdwn", "text": text},
    }]


async def send_alert(user_id: str, event: str, **fields) -> bool:
    """Send a Slack alert for an audit/notification event if the user has it enabled."""
    try:
        async with async_session() as db:
            pref = (await db.execute(select(SlackPreference).where(SlackPreference.user_id == user_id))).scalar_one_or_none()
            if not pref or not pref.enabled or not pref.webhook_url:
                return False
            flag = {
                "audit.completed": pref.notify_audit_completed,
                "audit.failed": pref.notify_audit_failed,
                "digest": pref.notify_digest,
            }.get(event, True)
            if not flag:
                return False
            webhook_url = pref.webhook_url

        text = fields.pop("text", None)
        if text is None:
            text = f"*{event}*"
            if fields:
                text += "\n" + "\n".join(f"• {k}: {v}" for k, v in fields.items())
        return await post_to_slack(webhook_url, text)
    except Exception as e:
        logger.warning(f"Slack alert failed for {event} on user {user_id}: {e}")
        return False


async def send_digest_alert(user_id: str, stats: dict) -> bool:
    totals = stats.get("totals", {})
    focus = stats.get("focus", {})
    lines = [
        f"*SEO Intelligence Digest* · {totals.get('total_sites', 0)} site(s)",
        f"Average score: {totals.get('avg_score', '—')}/100",
        f"Open issues: {totals.get('total_issues', 0)} "
        f"({totals.get('total_critical', 0)} critical, {totals.get('total_high', 0)} high)",
    ]
    if totals.get("total_wins"):
        lines.append(f"Validated wins: {totals.get('total_wins')}")
    if totals.get("improved"):
        lines.append(f"Improved: {totals.get('improved')} · Declined: {totals.get('declined')}")
    if focus.get("site"):
        lines.append(f"Focus: {focus['site']} at {focus.get('score', '—')}/100")
    text = "\n".join(lines)
    return await send_alert(user_id, "digest", text=text)
