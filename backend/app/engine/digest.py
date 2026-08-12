import asyncio
import datetime as _dt
import logging

from sqlalchemy import select

from app.database import async_session
from app.models import Audit, AuditScore, Issue, FixAction, User, DigestPreference, WhiteLabelSettings
from app.api.action_studio import _norm_url

logger = logging.getLogger(__name__)

_FREQ_DAYS = {"daily": 1, "weekly": 7, "monthly": 30}


async def build_digest(user_id: str) -> dict:
    async with async_session() as db:
        audits = (await db.execute(
            select(Audit).where(Audit.user_id == user_id).order_by(Audit.created_at.desc())
        )).scalars().all()

        by_site = {}
        for a in audits:
            if a.status != "COMPLETED":
                continue
            by_site.setdefault(a.website_url, []).append(a)

        async def _score(aid):
            return (await db.execute(select(AuditScore).where(AuditScore.audit_id == aid))).scalar_one_or_none()

        sites = []
        for url, lst in by_site.items():
            lst = sorted(lst, key=lambda a: a.created_at or _dt.datetime.min, reverse=True)
            latest = lst[0]
            prev = lst[1] if len(lst) > 1 else None

            s_latest = await _score(latest.id)
            s_prev = await _score(prev.id) if prev else None
            latest_score = round(s_latest.overall_score or 0, 1) if s_latest else None
            prev_score = round(s_prev.overall_score or 0, 1) if s_prev else None
            delta = round(latest_score - prev_score, 1) if latest_score is not None and prev_score is not None else None

            issues = (await db.execute(select(Issue).where(Issue.audit_id == latest.id))).scalars().all()
            critical = sum(1 for i in issues if i.severity == "CRITICAL")
            high = sum(1 for i in issues if i.severity == "HIGH")

            validated_wins = 0
            if prev:
                fixes = (await db.execute(select(FixAction).where(FixAction.audit_id == prev.id))).scalars().all()
                if fixes:
                    fix_keys = {(_norm_url(f.page_url), (f.signal_name or "").lower()) for f in fixes}
                    present = {(_norm_url(i.page_url), (i.signal_name or "").lower()) for i in issues}
                    validated_wins = sum(1 for k in fix_keys if k not in present)

            sites.append({
                "website_url": url,
                "audit_id": latest.id,
                "latest_score": latest_score,
                "previous_score": prev_score,
                "delta": delta,
                "critical": critical,
                "high": high,
                "total_issues": len(issues),
                "validated_wins": validated_wins,
            })

        sites.sort(key=lambda s: (s["latest_score"] is None, -(s["latest_score"] or 0)))
        scored = [s for s in sites if s["latest_score"] is not None]
        total_sites = len(sites)
        avg_score = round(sum(s["latest_score"] for s in scored) / len(scored), 1) if scored else None
        total_issues = sum(s["total_issues"] for s in sites)
        total_critical = sum(s["critical"] for s in sites)
        total_high = sum(s["high"] for s in sites)
        total_wins = sum(s["validated_wins"] for s in sites)
        improved = [s for s in sites if (s["delta"] or 0) > 0.05]
        declined = [s for s in sites if (s["delta"] or 0) < -0.05]
        lowest = min(scored, key=lambda s: s["latest_score"]) if scored else None

    coach = _coach_text(avg_score, total_sites, total_wins, improved, declined, lowest, total_critical, total_high)

    return {
        "generated_at": _dt.datetime.utcnow().isoformat(),
        "totals": {
            "total_sites": total_sites,
            "avg_score": avg_score,
            "total_issues": total_issues,
            "total_critical": total_critical,
            "total_high": total_high,
            "total_wins": total_wins,
            "improved": len(improved),
            "declined": len(declined),
        },
        "sites": sites,
        "focus": {
            "site": lowest["website_url"] if lowest else None,
            "audit_id": lowest["audit_id"] if lowest else None,
            "score": lowest["latest_score"] if lowest else None,
            "critical": lowest["critical"] if lowest else 0,
            "high": lowest["high"] if lowest else 0,
        },
        "coach": coach,
    }


def _coach_text(avg_score, total_sites, total_wins, improved, declined, lowest, total_critical, total_high):
    if total_sites == 0:
        return "Run your first audit to get a weekly score snapshot and AI coaching."
    parts = []
    if avg_score is not None:
        if avg_score >= 80:
            parts.append(f"Strong overall health at {avg_score}/100 across {total_sites} site(s) — keep up the momentum.")
        elif avg_score >= 60:
            parts.append(f"Average score is {avg_score}/100 across {total_sites} site(s). Focus on high-impact fixes to break past 80.")
        else:
            parts.append(f"Average score is {avg_score}/100 — there's meaningful headroom. Start with critical issues, then high.")
    if improved:
        parts.append(f"{len(improved)} site(s) improved since the last audit.")
    if declined:
        parts.append(f"{len(declined)} site(s) declined — re-run and check for regressions.")
    if total_wins:
        parts.append(f"{total_wins} previously-applied fix(es) validated as resolved.")
    if total_critical:
        parts.append(f"{total_critical} critical + {total_high} high issues are still open across your sites.")
    if lowest:
        parts.append(f"Biggest opportunity: {lowest['website_url']} at {lowest['latest_score']}/100 with {lowest['critical']} critical and {lowest['high']} high issues — open Action Studio and work the impact-ranked queue.")
    return " ".join(parts)


async def send_digest(user_id: str) -> dict:
    from app.config import settings
    from app.engine.emailer import send_digest_email

    async with async_session() as db:
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user or not user.email:
            return {"sent": False, "reason": "no user email"}

    stats = await build_digest(user_id)
    if not stats["sites"]:
        async with async_session() as db:
            pref = (await db.execute(select(DigestPreference).where(DigestPreference.user_id == user_id))).scalar_one_or_none()
            if pref:
                pref.last_sent_at = _dt.datetime.utcnow()
                await db.commit()
        return {"sent": False, "reason": "no audits"}

    branding = {}
    async with async_session() as db:
        wl = (await db.execute(select(WhiteLabelSettings).where(WhiteLabelSettings.user_id == user_id))).scalar_one_or_none()
        if wl and wl.is_active:
            branding = {
                "primary": wl.primary_color or "#3b82f6",
                "secondary": wl.secondary_color or "#8b5cf6",
                "company": wl.company_name or "",
                "logo": wl.logo_url or "",
            }

    sent = await send_digest_email(user.email, stats=stats, app_url=settings.APP_URL or "", **branding)
    slack_sent = False
    try:
        from app.engine.slack import send_digest_alert
        slack_sent = await send_digest_alert(user_id, stats)
    except Exception as e:
        logger.warning(f"Slack digest delivery failed for {user_id}: {e}")
    if sent or slack_sent:
        async with async_session() as db:
            pref = (await db.execute(select(DigestPreference).where(DigestPreference.user_id == user_id))).scalar_one_or_none()
            if pref:
                pref.last_sent_at = _dt.datetime.utcnow()
                await db.commit()
    return {"sent": sent, "slack_sent": slack_sent, "stats": stats}


async def check_and_send_digests():
    """Send digests to users whose schedule is due. Called by the background worker."""
    now = _dt.datetime.utcnow()
    async with async_session() as db:
        prefs = (await db.execute(select(DigestPreference).where(DigestPreference.enabled == True))).scalars().all()
        due_users = []
        for p in prefs:
            days = _FREQ_DAYS.get(p.frequency, 7)
            if p.last_sent_at is None or (now - p.last_sent_at).total_seconds() / 86400 >= days:
                has_audits = (await db.execute(
                    select(Audit.id).where(Audit.user_id == p.user_id, Audit.status == "COMPLETED").limit(1)
                )).scalar_one_or_none()
                if not has_audits:
                    p.last_sent_at = now
                    await db.commit()
                    continue
                due_users.append(p.user_id)
    for uid in due_users:
        asyncio.create_task(send_digest(uid))
    if due_users:
        logger.info(f"Digest worker queued sends for {len(due_users)} user(s)")
