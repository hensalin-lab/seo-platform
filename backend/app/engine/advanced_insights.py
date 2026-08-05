"""Advanced insights: drift detection, hreflang/i18n, redirect chains,
duplicate content, domain authority heuristic, JS dependency, content briefs,
and usage metering. All lightweight, rule-based, keyless."""
import logging
import math
import re
import datetime as _dt
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

_LOCALE_RE = re.compile(r"^[a-z]{2,3}(-[a-zA-Z]{2,4})?(;x=[a-z]+)?$")

_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "for", "of", "in", "on", "to", "with",
    "for", "your", "our", "best", "top", "how", "what", "why", "is", "are", "vs",
    "vs.", "versus", "near", "me", "guide", "services", "service", "company",
}


def _norm_href(url: str) -> str:
    """Normalize a URL for comparison: scheme+netloc+path, lowercase host, strip trailing slash."""
    try:
        parsed = urlparse((url or "").strip())
        scheme = (parsed.scheme or "https").lower()
        host = (parsed.netloc or "").lower()
        path = parsed.path or ""
        if path in ("", "/"):
            path = ""
        else:
            path = path.rstrip("/")
        out = f"{scheme}://{host}{path}"
        if parsed.query:
            out += f"?{parsed.query}"
        return out
    except Exception:
        return (url or "").strip()


def _host_of(url: str) -> str:
    try:
        return (urlparse(url or "").hostname or "").lower().lstrip("www.")
    except Exception:
        return ""


def _page_signals(page) -> dict:
    signals = getattr(page, "signals", None) or {}
    if not isinstance(signals, dict):
        return {}
    return signals


# ---------------------------------------------------------------------------
# Drift / change detection
# ---------------------------------------------------------------------------

async def compute_drift(db, audit_id: str) -> dict:
    """Compare the current audit against the previous completed audit for the
    same website. Persists a DriftReport and returns the summary dict."""
    from sqlalchemy import select
    from app.models import Audit, AuditScore, Issue, Page, DriftReport

    audit = (await db.execute(select(Audit).where(Audit.id == audit_id))).scalar_one_or_none()
    if not audit:
        return {"available": False, "reason": "audit not found"}
    website_url = audit.website_url or ""

    prev = (await db.execute(
        select(Audit)
        .where(Audit.website_url == website_url, Audit.id != audit_id, Audit.status == "COMPLETED")
        .order_by(Audit.created_at.desc())
        .limit(1)
    )).scalar_one_or_none()

    if not prev:
        return {"available": False, "reason": "no previous audit for this site yet"}

    async def _scores(aid):
        return (await db.execute(select(AuditScore).where(AuditScore.audit_id == aid))).scalar_one_or_none()

    async def _issues(aid):
        rows = (await db.execute(
            select(Issue).where(Issue.audit_id == aid)
        )).scalars().all()
        out = {}
        for i in rows:
            key = (i.page_url or "", (i.signal_name or "").lower())
            out.setdefault(key, i.severity or "LOW")
        return out

    async def _pages(aid):
        rows = (await db.execute(select(Page).where(Page.audit_id == aid))).scalars().all()
        return {(_norm_href(p.url), p.word_count or 0) for p in rows}

    current_scores = await _scores(audit_id)
    prev_scores = await _scores(prev.id)
    current_issues = await _issues(audit_id)
    prev_issues = await _issues(prev.id)
    current_pages = await _pages(audit_id)
    prev_pages = await _pages(prev.id)

    cur_urls = {u for u, _ in current_pages}
    prev_urls = {u for u, _ in prev_pages}
    added_pages = sorted(cur_urls - prev_urls)
    removed_pages = sorted(prev_urls - cur_urls)

    new_issues = sorted({k for k in current_issues if k not in prev_issues})
    fixed_issues = sorted({k for k in prev_issues if k not in current_issues})
    regressions = sorted(
        {k for k in new_issues if current_issues.get(k) in ("CRITICAL", "HIGH")},
    )

    def _score(obj, attr):
        return round(getattr(obj, attr) or 0, 1) if obj else 0

    score_delta = round(_score(current_scores, "overall_score") - _score(prev_scores, "overall_score"), 1)

    summary = {
        "website_url": website_url,
        "current_audit_id": audit_id,
        "previous_audit_id": prev.id,
        "score_delta": score_delta,
        "scores": {
            "current": {
                "overall": _score(current_scores, "overall_score"),
                "seo": _score(current_scores, "seo_score"),
                "technical": _score(current_scores, "technical_score"),
                "content": _score(current_scores, "content_score"),
                "aeo": _score(current_scores, "aeo_score"),
                "geo": _score(current_scores, "geo_score"),
            },
            "previous": {
                "overall": _score(prev_scores, "overall_score"),
                "seo": _score(prev_scores, "seo_score"),
                "technical": _score(prev_scores, "technical_score"),
                "content": _score(prev_scores, "content_score"),
                "aeo": _score(prev_scores, "aeo_score"),
                "geo": _score(prev_scores, "geo_score"),
            },
        },
        "issue_counts": {
            "current_total": len(current_issues),
            "previous_total": len(prev_issues),
            "new": len(new_issues),
            "fixed": len(fixed_issues),
            "regressions": len(regressions),
        },
        "new_issues": [{"page_url": k[0], "signal_name": k[1], "severity": current_issues[k]} for k in new_issues][:200],
        "fixed_issues": [{"page_url": k[0], "signal_name": k[1], "severity": prev_issues[k]} for k in fixed_issues][:200],
        "regressions": [{"page_url": k[0], "signal_name": k[1], "severity": current_issues[k]} for k in regressions][:100],
        "pages": {
            "current_total": len(current_urls_of(current_pages)),
            "previous_total": len(prev_urls),
            "added": added_pages[:200],
            "removed": removed_pages[:200],
            "added_count": len(added_pages),
            "removed_count": len(removed_pages),
        },
    }

    report = DriftReport(
        audit_id=audit_id,
        previous_audit_id=prev.id,
        website_url=website_url,
        score_delta=score_delta,
        regression_count=len(regressions),
        improvement_count=len(fixed_issues),
        summary=summary,
    )
    db.add(report)
    await db.commit()

    if regressions:
        try:
            from app.api.webhooks import fire_webhook
            await fire_webhook(audit.user_id or "", "drift.regression", {
                "event": "drift.regression",
                "website_url": website_url,
                "audit_id": audit_id,
                "previous_audit_id": prev.id,
                "score_delta": score_delta,
                "regression_count": len(regressions),
                "regressions": summary["regressions"][:25],
            })
        except Exception as e:
            logger.warning(f"Drift regression webhook failed: {e}")

    return {"available": True, "report_id": report.id, "summary": summary}


def current_urls_of(page_set):
    return {u for u, _ in page_set}


# ---------------------------------------------------------------------------
# hreflang / i18n
# ---------------------------------------------------------------------------

def analyze_hreflang(pages, website_url: str = "") -> dict:
    by_url = {}
    for p in pages:
        sig = _page_signals(p)
        tags = sig.get("hreflang_tags") or []
        if tags:
            by_url[_norm_href(p.url)] = {"url": p.url, "tags": tags, "signals": sig}
    language_count = set()
    for entry in by_url.values():
        for t in entry["tags"]:
            locale = (t.get("hreflang") or "").strip()
            if locale != "x-default" and _LOCALE_RE.match(locale):
                language_count.add(locale.split(";")[0])

    site_host = _host_of(website_url or "")
    issues = []
    for entry in by_url.values():
        seen_locales = set()
        for t in entry["tags"]:
            locale = (t.get("hreflang") or "").strip()
            href = (t.get("href") or "").strip()
            if not locale:
                issues.append({"type": "missing_hreflang_code", "page_url": entry["url"], "detail": "hreflang attribute missing a value"})
                continue
            if locale != "x-default" and not _LOCALE_RE.match(locale):
                issues.append({"type": "invalid_hreflang_code", "page_url": entry["url"], "detail": f"'{locale}' is not a valid language/locale code"})
            if locale in seen_locales:
                issues.append({"type": "duplicate_hreflang_locale", "page_url": entry["url"], "detail": f"locale '{locale}' appears more than once"})
            seen_locales.add(locale)
            target_host = _host_of(href)
            if target_host and site_host and target_host != site_host:
                issues.append({"type": "cross_domain_hreflang", "page_url": entry["url"], "detail": f"{locale} points to different domain {target_host}"})
        if len(seen_locales) > 1 and not entry["signals"].get("hreflang_x_default"):
            issues.append({"type": "missing_x_default", "page_url": entry["url"], "detail": "Multiple languages declared without an x-default"})

    coverage = round(len(by_url) / max(len(pages), 1) * 100, 1) if pages else 0.0
    return {
        "has_hreflang": bool(by_url),
        "coverage": coverage,
        "language_count": len(language_count),
        "languages": sorted(language_count)[:50],
        "pages": [
            {"url": e["url"], "tags": e["tags"]} for e in by_url.values()
        ][:300],
        "issues": issues[:300],
        "issue_counts": {
            "total": len(issues),
            "by_type": {t: len([i for i in issues if i["type"] == t]) for t in set(i["type"] for i in issues)},
        },
    }


# ---------------------------------------------------------------------------
# Redirect chains
# ---------------------------------------------------------------------------

def analyze_redirects(pages) -> dict:
    records = []
    for p in pages:
        sig = _page_signals(p)
        chain = sig.get("redirect_chain") or []
        if not chain:
            continue
        chain = [str(u) for u in chain]
        final_url = chain[-1] if chain else p.url
        http_to_https = _norm_href(p.url).startswith("http://") and _norm_href(final_url).startswith("https://")
        records.append({
            "url": p.url,
            "status_code": p.status_code,
            "final_url": final_url,
            "chain": chain,
            "chain_length": len(chain),
            "is_chain": len(chain) > 1,
            "http_to_https": http_to_https,
        })

    issues = []
    for r in records:
        if r["is_chain"]:
            issues.append({
                "type": "redirect_chain",
                "page_url": r["url"],
                "detail": f"{r['chain_length']} hop redirect chain ending at {r['final_url']}",
                "chain": r["chain"],
            })
        if r["status_code"] == 200 and r["chain_length"] >= 1:
            issues.append({
                "type": "soft_redirect",
                "page_url": r["url"],
                "detail": "URL redirects but returns 200 (soft 404 / JS redirect risk)",
            })
        if r["chain"][0].lower() != _norm_href(r["url"]).lower().replace("http://", "https://"):
            pass

    return {
        "total_redirects": len(records),
        "chains": len([r for r in records if r["is_chain"]]),
        "http_to_https": len([r for r in records if r["http_to_https"]]),
        "records": records[:300],
        "issues": issues[:300],
        "issue_counts": {
            "total": len(issues),
            "by_type": {t: len([i for i in issues if i["type"] == t]) for t in set(i["type"] for i in issues)},
        },
    }


# ---------------------------------------------------------------------------
# Duplicate content
# ---------------------------------------------------------------------------

def analyze_duplicates(pages) -> dict:
    content_groups = {}
    title_groups = {}
    for p in pages:
        if not p.content_hash:
            continue
        if (p.word_count or 0) < 50:
            continue
        content_groups.setdefault(p.content_hash, []).append(p)
        title = re.sub(r"\s+", " ", (p.title or "").strip()).lower()
        if title:
            title_groups.setdefault(title, []).append(p)

    content_groups_out = []
    for ch, group in content_groups.items():
        if len(group) < 2:
            continue
        content_groups_out.append({
            "kind": "content",
            "key": ch[:12],
            "count": len(group),
            "title": group[0].title or "",
            "word_count": group[0].word_count or 0,
            "urls": [p.url for p in group],
        })
    title_groups_out = []
    for title, group in title_groups.items():
        if len(group) < 2:
            continue
        hashes = {p.content_hash for p in group}
        if len(hashes) == 1:
            continue
        title_groups_out.append({
            "kind": "title",
            "key": title,
            "count": len(group),
            "title": group[0].title or "",
            "word_count": group[0].word_count or 0,
            "urls": [p.url for p in group],
        })

    content_groups_out.sort(key=lambda g: g["count"], reverse=True)
    title_groups_out.sort(key=lambda g: g["count"], reverse=True)
    groups = content_groups_out + title_groups_out
    return {
        "total_groups": len(groups),
        "duplicate_pages": sum(g["count"] for g in groups),
        "content_groups": content_groups_out[:100],
        "title_groups": title_groups_out[:100],
        "groups": groups[:100],
    }


# ---------------------------------------------------------------------------
# Domain authority heuristic
# ---------------------------------------------------------------------------

def compute_domain_authority(audit, pages, scores, backlinks, referring_domains, core_web_vitals) -> dict:
    def _log_score(value, base=10):
        return round(min(100, max(0, math.log(max(value, 1)) * (100 / math.log(base)))), 1) if value else 0

    rd = len(referring_domains)
    bl = len(backlinks)
    rd_score = _log_score(rd, 100) * 0.6
    bl_score = _log_score(bl, 1000) * 0.15
    follow_count = sum(1 for b in backlinks if getattr(b, "is_follow", True))
    follow_ratio = (follow_count / max(len(backlinks), 1)) * 15 if backlinks else 0

    overall = scores.overall_score if scores else 0
    technical = scores.technical_score if scores else 0
    onpage_score = (overall * 0.7 + technical * 0.3) * 0.35

    avg_words = sum((p.word_count or 0) for p in pages) / max(len(pages), 1)
    depth_score = min(12, (len(pages) / 20) * 4 + (avg_words / 1500) * 8)

    homepage_title = ""
    for p in pages:
        if (p.url or "").rstrip("/") == (audit.website_url or "").rstrip("/"):
            homepage_title = p.title or ""
            break
    brand_score = 5.0 if homepage_title and (audit.website_url or "").lower().find(_host_of(audit.website_url or "").split(".")[0]) != -1 else 0.0

    perf = 0.0
    if core_web_vitals:
        valid = [c for c in core_web_vitals if c.performance_score is not None]
        if valid:
            perf = (sum(c.performance_score or 0 for c in valid) / len(valid)) * 0.08

    total = round(min(100, rd_score + bl_score + follow_ratio + onpage_score + depth_score + brand_score + perf), 1)
    factors = {
        "referring_domains": {"count": rd, "score": round(rd_score, 1)},
        "backlinks": {"count": bl, "score": round(bl_score, 1)},
        "link_follow_ratio": {"ratio": round(follow_ratio / 15, 2), "score": round(follow_ratio, 1)},
        "onpage_quality": {"overall": overall, "technical": technical, "score": round(onpage_score, 1)},
        "content_depth": {"pages": len(pages), "avg_words": int(avg_words), "score": round(depth_score, 1)},
        "brand_signal": {"score": brand_score},
        "performance": {"score": round(perf, 1)},
    }
    return {"score": total, "factors": factors, "method": "heuristic (keyless)"}


# ---------------------------------------------------------------------------
# JS dependency heuristic
# ---------------------------------------------------------------------------

def analyze_js_dependency(pages) -> dict:
    js_only = []
    rendered = 0
    frameworks = {}
    for p in pages:
        sig = _page_signals(p)
        js = sig.get("js_signals") or {}
        if js.get("content_empty_with_js"):
            js_only.append({"url": p.url, "word_count": p.word_count or 0, "framework": js.get("framework", "unknown")})
        if sig.get("rendered_with_js"):
            rendered += 1
        fw = js.get("framework") or "none"
        frameworks[fw] = frameworks.get(fw, 0) + 1

    total = max(len(pages), 1)
    risk_score = round(min(100, len(js_only) / total * 100), 1) if pages else 0
    return {
        "risk_score": risk_score,
        "risk_level": "LOW" if risk_score < 20 else "MEDIUM" if risk_score < 50 else "HIGH",
        "js_only_pages": js_only[:200],
        "js_only_count": len(js_only),
        "rendered_with_js_count": rendered,
        "frameworks": frameworks,
        "total_pages": len(pages),
    }


# ---------------------------------------------------------------------------
# Content briefs + topic clusters
# ---------------------------------------------------------------------------

def _keyword_entries(keyword_data):
    """Flatten keyword data into candidate keyword objects."""
    out = []
    if not keyword_data:
        return out
    seen = set()
    for field in ("top_keywords", "keyword_opportunities", "keyword_clusters", "content_gaps", "missing_keywords"):
        for item in getattr(keyword_data, field) or []:
            if isinstance(item, dict):
                k = item.get("keyword") or item.get("key") or item.get("name") or ""
                opp = item.get("opportunity") or item.get("priority") or "MEDIUM"
            else:
                k = str(item or "")
                opp = "MEDIUM"
            key = re.sub(r"\s+", " ", k.strip().lower())
            if key and key not in seen:
                seen.add(key)
                out.append({"keyword": k.strip(), "opportunity": str(opp).upper()})
    return out


def _cluster_name(keyword: str) -> str:
    words = [w for w in re.sub(r"[^\w\s]", " ", keyword).lower().split() if w not in _STOPWORDS and len(w) > 2]
    return words[0] if words else keyword


def build_content_briefs(keyword_data, content_data, pages) -> dict:
    entries = _keyword_entries(keyword_data)
    clusters_map = {}
    for e in entries:
        name = _cluster_name(e["keyword"])
        clusters_map.setdefault(name, []).append(e)
    if not clusters_map and pages:
        return {"clusters": [], "briefs": [], "note": "No keyword data available yet."}

    cluster_out = []
    briefs = []
    for name, items in sorted(clusters_map.items(), key=lambda kv: -len(kv[1]))[:20]:
        opps = [i["opportunity"] for i in items]
        opportunity = "HIGH" if "HIGH" in opps else "MEDIUM" if "MEDIUM" in opps else "LOW"
        keywords = [i["keyword"] for i in items]
        cluster_pages = [p.url for p in pages if any(k.lower() in (p.title or "").lower() for k in keywords[:3])][:8]
        cluster_out.append({
            "name": name,
            "keywords": keywords[:30],
            "opportunity": opportunity,
            "page_count": len(cluster_pages),
            "pages": cluster_pages,
        })

    intent_map = {
        "how": "informational", "what": "informational", "why": "informational",
        "guide": "informational", "tutorial": "informational",
        "best": "commercial", "top": "commercial", "review": "commercial", "vs": "commercial", "alternative": "commercial",
        "buy": "transactional", "price": "transactional", "near me": "local", "near": "local",
    }

    for cluster in cluster_out:
        kw = cluster["keywords"][0]
        target = kw
        low = kw.lower()
        intent = "informational"
        for marker, detected in intent_map.items():
            if marker in low:
                intent = detected
                break
        word_target = 1600 if intent in ("commercial", "transactional") else 1200
        outline = [
            {"section": "Introduction", "subheading": f"What is {kw}?", "word_count": 200, "focus": f"Define {kw} and why it matters"},
            {"section": "Main Body", "subheading": f"How {kw} works", "word_count": 400, "focus": f"Cover the core concepts around {kw}"},
            {"section": "Options & Comparison", "subheading": f"Comparing approaches to {kw}", "word_count": 300, "focus": "Compare the common options"},
            {"section": "Step-by-Step", "subheading": f"Getting started with {kw}", "word_count": 300, "focus": "Actionable steps"},
            {"section": "FAQ", "subheading": f"Frequently asked questions about {kw}", "word_count": 250, "focus": "Answer 4-6 questions"},
        ]
        briefs.append({
            "title": f"{kw}: The Complete Guide",
            "target_keyword": target,
            "search_intent": intent,
            "word_count_target": word_target,
            "outline": outline,
            "related_keywords": cluster["keywords"][1:15],
            "competitor_pages": cluster["pages"],
            "opportunity": cluster["opportunity"],
        })

    return {"clusters": cluster_out, "briefs": briefs[:20]}


# ---------------------------------------------------------------------------
# Usage metering
# ---------------------------------------------------------------------------

async def record_usage(db, user_id, event_type: str, details: dict = None):
    try:
        from app.models import UsageEvent
        db.add(UsageEvent(user_id=user_id or None, event_type=event_type, details=details or {}))
        await db.commit()
    except Exception as e:
        logger.warning(f"Usage record failed: {e}")


async def get_usage_summary(db, user_id, days: int = 30):
    from sqlalchemy import select, func
    from app.models import UsageEvent
    since = _dt.datetime.utcnow() - _dt.timedelta(days=max(1, days))
    result = await db.execute(
        select(UsageEvent.event_type, func.count(UsageEvent.id))
        .where(UsageEvent.user_id == user_id, UsageEvent.created_at >= since)
        .group_by(UsageEvent.event_type)
    )
    by_type = {row[0]: row[1] for row in result}
    total = sum(by_type.values())
    recent = (await db.execute(
        select(UsageEvent).where(UsageEvent.user_id == user_id, UsageEvent.created_at >= since).order_by(UsageEvent.created_at.desc()).limit(100)
    )).scalars().all()
    return {
        "days": days,
        "total_events": total,
        "by_type": by_type,
        "recent": [{
            "event_type": e.event_type,
            "details": e.details or {},
            "created_at": e.created_at.isoformat() if e.created_at else "",
        } for e in recent],
    }
