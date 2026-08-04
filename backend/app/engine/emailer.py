import logging
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def email_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.EMAIL_FROM)


def _smtp_send(to_email: str, subject: str, html: str):
    host = settings.SMTP_HOST
    port = int(settings.SMTP_PORT or 587)
    user = settings.SMTP_USER or ""
    password = settings.SMTP_PASSWORD or ""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    if port == 465:
        server = smtplib.SMTP_SSL(host, port, timeout=20)
    else:
        server = smtplib.SMTP(host, port, timeout=20)
        server.ehlo()
        server.starttls()
        server.ehlo()
    try:
        if user and password:
            server.login(user, password)
        server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
    finally:
        try:
            server.quit()
        except Exception:
            pass


async def send_email(to_email: str, subject: str, html: str) -> bool:
    if not email_configured():
        logger.info("Email not configured (SMTP_HOST/EMAIL_FROM); skipping notification to %s", to_email)
        return False
    try:
        await asyncio.to_thread(_smtp_send, to_email, subject, html)
        return True
    except Exception as exc:
        logger.error("Email send failed to %s: %s", to_email, exc)
        return False


def _shell(title, subtitle, stats_html, body_html, app_url, audit_id, primary="#3b82f6", secondary="#8b5cf6", company=None, logo=None):
    dash_url = f"{app_url}/audit/{audit_id}/dashboard" if app_url else ""
    studio_url = f"{app_url}/audit/{audit_id}/action-studio" if app_url else ""
    logo_html = f'<img src="{logo}" alt="" style="height:34px;max-width:220px;display:block;margin-bottom:10px;border-radius:6px" />' if logo else ""
    company_html = f'<div style="font-size:11px;color:#dbeafe;margin-top:5px;font-weight:700;letter-spacing:0.04em">{company}</div>' if company else ""
    footer = f"Sent by {company}." if company else "Sent by your SEO intelligence platform."
    return f"""\
<div style="font-family:Arial,Helvetica,sans-serif;background:#f6f7f9;padding:24px;color:#111827">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:linear-gradient(135deg,{primary},{secondary});padding:20px 24px">
      {logo_html}
      <div style="font-size:18px;font-weight:800;color:#ffffff">{title}</div>
      <div style="font-size:12.5px;color:#dbeafe;margin-top:4px">{subtitle}</div>
      {company_html}
    </div>
    <div style="padding:20px 24px">
      {stats_html}
      {body_html}
      <div style="margin-top:18px;display:flex;gap:8px">
        <a href="{dash_url}" style="background:{primary};color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 16px;border-radius:8px">View full report</a>
        <a href="{studio_url}" style="background:#f3f4f6;color:#111827;text-decoration:none;font-size:13px;font-weight:700;padding:10px 16px;border-radius:8px">Open Action Studio</a>
      </div>
      <div style="margin-top:18px;font-size:11px;color:#9ca3af">{footer}</div>
    </div>
  </div>
</div>"""


async def send_audit_completed(to_email, *, website_url, audit_id, score, score_delta,
                               total_issues, total_pages, resolved=None, still_present=None,
                               validated_points=None, app_url="", primary=None, secondary=None,
                               company=None, logo=None):
    delta_txt = f"{score_delta:+.1f}" if score_delta is not None else "n/a"
    delta_color = "#16a34a" if (score_delta or 0) >= 0 else "#ef4444"
    stats = (
        f'<table style="width:100%;border-collapse:collapse;margin-bottom:14px">'
        f'<tr>'
        f'<td style="background:#f3f4f6;border-radius:8px;padding:10px;text-align:center;width:33%">'
        f'<div style="font-size:20px;font-weight:800;color:#111827">{score}</div>'
        f'<div style="font-size:10px;color:#6b7280;font-weight:700">SCORE / 100</div></td>'
        f'<td style="background:#f3f4f6;border-radius:8px;padding:10px;text-align:center;width:33%">'
        f'<div style="font-size:20px;font-weight:800;color:{delta_color}">{delta_txt}</div>'
        f'<div style="font-size:10px;color:#6b7280;font-weight:700">VS LAST AUDIT</div></td>'
        f'<td style="background:#f3f4f6;border-radius:8px;padding:10px;text-align:center;width:33%">'
        f'<div style="font-size:20px;font-weight:800;color:#111827">{total_issues}</div>'
        f'<div style="font-size:10px;color:#6b7280;font-weight:700">ISSUES · {total_pages} PAGES</div></td>'
        f'</tr></table>'
    )
    body = ""
    if resolved is not None and (resolved + (still_present or 0)) > 0:
        body += (
            f'<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;margin-bottom:12px">'
            f'<div style="font-size:13px;font-weight:700;color:#16a34a;margin-bottom:6px">✔ {resolved} of {resolved + (still_present or 0)} applied fixes validated as resolved</div>'
            f'<div style="font-size:12.5px;color:#374151">'
            + (f'{still_present or 0} fixes are still present on the site. ' if still_present else '')
            + (f'Estimated score gain already realized: +{validated_points} pts.' if validated_points else '')
            + '</div></div>'
        )
    elif resolved is not None:
        body += (
            f'<div style="background:#f3f4f6;border-radius:8px;padding:12px 14px;margin-bottom:12px;font-size:12.5px;color:#374151">'
            f'Mark fixes in Action Studio to start tracking validated wins across audits.</div>'
        )
    body += '<div style="font-size:12.5px;color:#374151;line-height:1.5">Your audit is complete. Open Action Studio to fix issues ranked by estimated impact, then re-run to validate results.</div>'
    return await send_email(to_email, f"Audit complete: {website_url} — {score}/100", _shell(
        "Audit complete", website_url, stats, body, app_url, audit_id,
        primary=primary or "#3b82f6", secondary=secondary or "#8b5cf6", company=company, logo=logo))


async def send_audit_failed(to_email, *, website_url, audit_id, error, app_url="", primary=None, secondary=None, company=None, logo=None):
    body = (
        '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;font-size:12.5px;color:#991b1b">'
        f'<b>Reason:</b> {error or "Unknown error"}'
        '</div>'
        '<div style="font-size:12.5px;color:#374151;line-height:1.5;margin-top:12px">Re-run the audit from the dashboard. If this keeps failing, check that the site is reachable and robots.txt does not block crawling.</div>'
    )
    return await send_email(to_email, f"Audit failed: {website_url}", _shell(
        "Audit failed", website_url, "", body, app_url, audit_id,
        primary=primary or "#3b82f6", secondary=secondary or "#8b5cf6", company=company, logo=logo))


async def send_digest_email(to_email, *, stats, app_url="", primary=None, secondary=None, company=None, logo=None):
    t = stats.get("totals", {})
    sites = stats.get("sites", [])
    focus = stats.get("focus", {}) or {}

    if not sites:
        return await send_email(to_email, "Your AI SEO digest", _shell(
            "Your AI SEO digest",
            "No audits yet this period",
            '<div style="font-size:12.5px;color:#374151">Run an audit from the dashboard to start tracking your SEO health week over week.</div>',
            "", app_url, ""))

    delta_color = lambda d: "#16a34a" if (d or 0) >= 0 else "#ef4444"
    delta_txt = lambda d: f"{d:+.1f}" if d is not None else "n/a"

    stats_html = (
        f'<table style="width:100%;border-collapse:collapse;margin-bottom:14px">'
        f'<tr>'
        f'<td style="background:#f3f4f6;border-radius:8px;padding:10px;text-align:center;width:25%">'
        f'<div style="font-size:20px;font-weight:800;color:#111827">{t.get("avg_score", "—")}</div>'
        f'<div style="font-size:10px;color:#6b7280;font-weight:700">AVG SCORE</div></td>'
        f'<td style="background:#f3f4f6;border-radius:8px;padding:10px;text-align:center;width:25%">'
        f'<div style="font-size:20px;font-weight:800;color:#111827">{t.get("total_sites", 0)}</div>'
        f'<div style="font-size:10px;color:#6b7280;font-weight:700">SITES</div></td>'
        f'<td style="background:#f3f4f6;border-radius:8px;padding:10px;text-align:center;width:25%">'
        f'<div style="font-size:20px;font-weight:800;color:{ "#ef4444" if t.get("total_critical", 0) else "#111827" }">{t.get("total_critical", 0)}</div>'
        f'<div style="font-size:10px;color:#6b7280;font-weight:700">CRITICAL ISSUES</div></td>'
        f'<td style="background:#f3f4f6;border-radius:8px;padding:10px;text-align:center;width:25%">'
        f'<div style="font-size:20px;font-weight:800;color:#16a34a">{t.get("total_wins", 0)}</div>'
        f'<div style="font-size:10px;color:#6b7280;font-weight:700">VALIDATED FIXES</div></td>'
        f'</tr></table>'
    )

    rows = ""
    for s in sites:
        rows += (
            '<tr style="border-bottom:1px solid #f1f5f9">'
            f'<td style="padding:8px 10px;font-size:12px;color:#0f172a;font-weight:600">{s["website_url"]}</td>'
            f'<td style="padding:8px 10px;text-align:center;font-size:13px;font-weight:800;color:#111827">{s.get("latest_score", "—")}</td>'
            f'<td style="padding:8px 10px;text-align:center;font-size:12px;font-weight:700;color:{delta_color(s.get("delta"))}">{delta_txt(s.get("delta"))}</td>'
            f'<td style="padding:8px 10px;text-align:center;font-size:12px;color:{"#ef4444" if s.get("critical") else "#6b7280"}">{s.get("critical", 0)} / {s.get("high", 0)}</td>'
            f'<td style="padding:8px 10px;text-align:center;font-size:12px;color:#16a34a">{s.get("validated_wins", 0)}</td>'
            f'</tr>'
        )

    body = (
        f'<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;font-size:12.5px;color:#1e3a8a;line-height:1.5;margin-bottom:12px">'
        f'<b>Coach:</b> {stats.get("coach", "")}</div>'
        '<div style="font-size:12.5px;color:#374151;font-weight:700;margin-bottom:6px">Score movement by site</div>'
        '<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">'
        '<thead><tr style="background:#f8fafc">'
        '<th style="padding:8px 10px;text-align:left;font-size:10px;color:#6b7280;font-weight:700">SITE</th>'
        '<th style="padding:8px 10px;text-align:center;font-size:10px;color:#6b7280;font-weight:700">SCORE</th>'
        '<th style="padding:8px 10px;text-align:center;font-size:10px;color:#6b7280;font-weight:700">DELTA</th>'
        '<th style="padding:8px 10px;text-align:center;font-size:10px;color:#6b7280;font-weight:700">CRIT/HIGH</th>'
        '<th style="padding:8px 10px;text-align:center;font-size:10px;color:#6b7280;font-weight:700">WINS</th>'
        '</tr></thead><tbody>' + rows + '</tbody></table>'
    )

    focus_url = f"{app_url}/audit/{focus.get('audit_id', '')}/dashboard" if app_url and focus.get("audit_id") else (app_url or "")
    if focus.get("site") and focus_url:
        body += (
            '<div style="margin-top:14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px;font-size:12.5px;color:#7c2d12">'
            f'<b>Priority:</b> {focus["site"]} at {focus.get("score", "—")}/100 with {focus.get("critical", 0)} critical + {focus.get("high", 0)} high issues. '
            f'<a href="{focus_url}" style="color:#ea580c;font-weight:700">Open dashboard</a> and work the impact-ranked queue.</div>'
        )

    return await send_email(to_email, f"Your AI SEO digest — {t.get('avg_score', '—')} avg", _shell(
        "Your AI SEO digest", "Weekly score movement, issues, and validated wins", stats_html, body, app_url, "",
        primary=primary or "#3b82f6", secondary=secondary or "#8b5cf6", company=company, logo=logo))
