"""Unified diagnostic schema (product spec §2).

Every issue in the platform renders as one consistent diagnostic object, so the
AI Suggestions card, action hub, and issue tables all speak the same contract.

Confidence methodology (documented here and surfaced in the UI via the
`confidence_basis` string + a tooltip):

  Rule-detected issues (no AI refinement):
      score = rule_certainty(severity) x data_completeness(issue)
      basis = "Heuristic: rule certainty for {severity} ({certainty}) x
               data completeness ({completeness})"

  AI-refined issues:
      score = 0.6 x rule_certainty x data_completeness + 0.4 x ai_confidence
      basis = "Blend: {heuristic basis}, refined by {source_model} agreement"

This is a deliberate choice: rule issues get a reproducible, deterministic
score; AI issues keep the model's signal but never let it override the
rule/data evidence by more than 40%. Hedged language ("estimated", "likely")
is preserved in outputs; only vague, non-actionable advice is banned.
"""

import datetime as _dt

_FRAMEWORKS = ("html", "react", "nextjs", "wordpress", "shopify", "framer")

_SEV_CERTAINTY = {"CRITICAL": 0.90, "HIGH": 0.80, "MEDIUM": 0.70, "LOW": 0.60, "INFO": 0.50}
_SEVERITY_IMPACT = {"CRITICAL": 92, "HIGH": 76, "MEDIUM": 52, "LOW": 28, "INFO": 15}


def _sev_certainty(issue) -> float:
    return _SEV_CERTAINTY.get(str(getattr(issue, "severity", "") or "").upper(), 0.65)


def _data_completeness(issue) -> float:
    """0.0-1.0 how much verified signal data backs this issue."""
    fields = [
        getattr(issue, "description", None),
        getattr(issue, "fix", None),
        getattr(issue, "impact", None),
        getattr(issue, "root_cause", None),
        getattr(issue, "fix_code", None),
        int(getattr(issue, "pages_affected", 0) or 0),
    ]
    filled = sum(1 for f in fields if f not in (None, ""))
    ratio = filled / len(fields)
    if ratio >= 0.83:
        return 1.0
    if ratio >= 0.5:
        return 0.9
    return 0.75


def confidence_meta(issue) -> dict:
    """Returns {"score": int 0-100, "basis": str} per the methodology above."""
    completeness = _data_completeness(issue)
    certainty = _sev_certainty(issue)
    heuristic = round(certainty * completeness * 100)
    ai_conf = int(getattr(issue, "ai_confidence", 0) or 0)
    source = getattr(issue, "source_model", "") or ""
    ai_generated = int(getattr(issue, "ai_generated", 0) or 0)
    sev = str(getattr(issue, "severity", "") or "LOW").upper()

    base = (
        f"heuristic rule certainty for {sev} ({certainty:.2f}) "
        f"x data completeness ({completeness:.2f})"
    )
    if ai_generated and ai_conf:
        score = round(0.6 * certainty * completeness * 100 + 0.4 * ai_conf)
        basis = f"Blend: {base}, refined by {source or 'AI provider'} agreement (0.4 weight)"
    else:
        score = heuristic
        basis = f"Heuristic: {base}; deterministic, no live model call"
    return {"score": min(100, max(0, score)), "basis": basis}


def _split_steps(fix: str) -> list[str]:
    text = str(fix or "").strip()
    if not text:
        return []
    lines = [ln.strip(" -•\t") for ln in text.splitlines() if ln.strip()]
    if len(lines) >= 2:
        return lines
    import re

    parts = re.split(r"(?<=[.;])\s+", text)
    return [p for p in parts if p][:8]


def _iso(ts) -> str | None:
    if not ts:
        return None
    return ts.isoformat() + "Z"


def render_issue_diagnostic(issue) -> dict:
    """Render any Issue (ORM or attribute-compatible object) as the §2 object."""
    signal_name = str(getattr(issue, "signal_name", "") or "").strip()
    description = str(getattr(issue, "description", "") or "").strip()
    fix = str(getattr(issue, "fix", "") or "").strip()
    fix_code = str(getattr(issue, "fix_code", "") or "").strip()
    if not fix_code:
        fix_code = f"FIX-{int(getattr(issue, 'signal_id', 0) or 0):04d}"

    why = str(getattr(issue, "why_it_matters", "") or "").strip()
    if not why:
        why = str(getattr(issue, "ai_why", "") or "").strip()
    if not why:
        why = str(getattr(issue, "root_cause", "") or "").strip()

    business = str(getattr(issue, "business_impact", "") or "").strip()
    if not business:
        business = str(getattr(issue, "impact", "") or "").strip()

    snippets = getattr(issue, "framework_snippets", None) or {}
    if not isinstance(snippets, dict):
        snippets = {}
    framework_snippets = {
        k: (v if isinstance(v, dict) else {})
        for k, v in snippets.items()
        if k in _FRAMEWORKS
    }

    confidence = confidence_meta(issue)

    return {
        "issue_id": str(getattr(issue, "id", "") or ""),
        "problem": signal_name or description or "Detected issue",
        "description": description,
        "category": str(getattr(issue, "category", "") or ""),
        "severity": str(getattr(issue, "severity", "") or "LOW").upper(),
        "priority": _priority_for(issue),
        "location": str(getattr(issue, "page_url", "") or ""),
        "why_it_matters": why,
        "business_impact": business,
        "root_cause": str(getattr(issue, "root_cause", "") or ""),
        "recommended_fix": {
            "summary": fix,
            "fix_code": fix_code,
            "steps": _split_steps(fix),
            "framework_snippets": framework_snippets,
            "copy_button": True,
        },
        "expected_improvement": str(getattr(issue, "expected_improvement", "") or ""),
        "difficulty": str(getattr(issue, "effort", "") or "MEDIUM").upper(),
        "estimated_time_minutes": int(getattr(issue, "estimated_time_minutes", 0) or 0),
        "ai_confidence": confidence["score"],
        "confidence_basis": confidence["basis"],
        "dependencies": list(getattr(issue, "dependencies", None) or []),
        "source_model": str(getattr(issue, "source_model", "") or ""),
        "status": str(getattr(issue, "status", "") or "open"),
        "last_checked": _iso(getattr(issue, "last_checked", None)),
        "ai_generated": int(getattr(issue, "ai_generated", 0) or 0),
    }


def _priority_for(issue) -> str:
    sev = str(getattr(issue, "severity", "") or "").upper()
    if sev == "CRITICAL":
        return "P0"
    if sev == "HIGH":
        return "P1"
    if sev == "MEDIUM":
        return "P2"
    return "P3"


def render_diagnostics(issues) -> dict:
    """Render a list of issues plus the methodology the UI shows in tooltips."""
    return {
        "items": [render_issue_diagnostic(i) for i in issues],
        "total": len(issues),
        "methodology": {
            "label": "Confidence methodology",
            "description": (
                "Rule-detected issues score = rule certainty x data completeness "
                "(deterministic). AI-refined issues blend that with the model's "
                "reported confidence (40% weight). Hover any confidence bar for the "
                "exact basis for that issue."
            ),
        },
    }
