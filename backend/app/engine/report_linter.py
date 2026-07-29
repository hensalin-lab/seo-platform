import logging
from typing import Any

logger = logging.getLogger(__name__)


class ReportLinterError(Exception):
    def __init__(self, check_name: str, detail: str):
        self.check_name = check_name
        self.detail = detail
        super().__init__(f"[{check_name}] {detail}")


def lint_report(report: dict[str, Any]) -> list[ReportLinterError]:
    errors: list[ReportLinterError] = []
    _check_contradictions(report, errors)
    _check_duplicate_signals(report, errors)
    _check_zero_sum_impacts(report, errors)
    _check_single_render(report, errors)
    _check_fabrication_guard(report, errors)
    _check_fix_code_uniqueness(report, errors)
    _check_url_variant_inflation(report, errors)
    return errors


def _assert_no_error(report: dict[str, Any], errors: list[ReportLinterError], check: str, condition: bool, detail: str):
    if not condition:
        errors.append(ReportLinterError(check, detail))


def _check_contradictions(report: dict, errors: list[ReportLinterError]):
    signals = report.get("all_signals", report.get("signals", []))
    issues = report.get("issues", [])

    missing_claims = {}
    for sig in signals:
        name = (sig.get("signal_name") or sig.get("name") or "").lower()
        status = (sig.get("status") or sig.get("verdict") or "").lower()
        if "no " in name or "missing" in name or "not " in name:
            missing_claims[name] = True

    h2_count = sum(1 for s in signals if s.get("signal_name", "").lower() == "h2 count" and s.get("value", 0) > 0)
    h3_count = sum(1 for s in signals if s.get("signal_name", "").lower() == "h3 count" and s.get("value", 0) > 0)
    https_count = sum(1 for s in signals if "https" in s.get("signal_name", "").lower() and s.get("status") in ("pass", "PASS", "ok"))
    alt_count = sum(1 for s in signals if "alt text" in s.get("signal_name", "").lower() and s.get("value", 0) > 0)
    schema_types = set()
    for s in signals:
        stype = s.get("schema_type", "")
        if stype:
            schema_types.add(stype)
    breadcrumb_present = any("breadcrumb" in s.get("signal_name", "").lower() and s.get("status") in ("pass", "PASS") for s in signals)

    if "no h2/h3" in missing_claims and h2_count > 0:
        _assert_no_error(report, errors, "contradiction", False, f"Report claims 'No H2/H3' but {h2_count} H2 headings exist")
    if "no h2/h3" in missing_claims and h3_count > 0:
        _assert_no_error(report, errors, "contradiction", False, f"Report claims 'No H2/H3' but {h3_count} H3 headings exist")
    if "not using https" in missing_claims and https_count > 0:
        _assert_no_error(report, errors, "contradiction", False, "Report claims 'Not Using HTTPS' but HTTPS signals exist")
    if "missing alt text" in missing_claims and alt_count > 0:
        _assert_no_error(report, errors, "contradiction", False, f"Report claims 'Missing Alt Text' but {alt_count} alt texts found")
    if "missing breadcrumb schema" in missing_claims and breadcrumb_present:
        _assert_no_error(report, errors, "contradiction", False, "Report claims 'Missing Breadcrumb Schema' but breadcrumb schema detected")

    for issue in issues:
        desc = (issue.get("description") or "").lower()
        sig_name = (issue.get("signal_name") or "").lower()

        if "no subheadings" in desc and h2_count > 0:
            _assert_no_error(report, errors, "contradiction", False, f"Issue says 'no subheadings' but {h2_count} H2s exist")
        if ("no h1" in desc or "missing h1" in desc) and any(s.get("value", 0) > 0 for s in signals if s.get("signal_name", "").lower() == "h1 count"):
            _assert_no_error(report, errors, "contradiction", False, "Issue says 'No H1' but H1 count is nonzero")


def _check_duplicate_signals(report: dict, errors: list[ReportLinterError]):
    signals = report.get("all_signals", report.get("signals", []))
    fact_keys = []
    for sig in signals:
        name = (sig.get("signal_name") or sig.get("name") or "").lower()
        fact_keys.append(name)

    seen = set()
    for key in fact_keys:
        base = key.replace(" ", "_").replace("-", "_")
        norm = base.split("(")[0].strip().rstrip("_")
        if norm in seen:
            _assert_no_error(report, errors, "duplicate_signal", False, f"Signal '{norm}' appears more than once")
        seen.add(norm)


def _check_zero_sum_impacts(report: dict, errors: list[ReportLinterError]):
    issues = report.get("issues", [])
    total_issues = len(issues)

    seo = sum(1 for i in issues if "seo" in (i.get("category") or "").lower())
    technical = sum(1 for i in issues if "technical" in (i.get("category") or "").lower())
    content = sum(1 for i in issues if "content" in (i.get("category") or "").lower())
    ai_search = sum(1 for i in issues if "ai" in (i.get("category") or "").lower())

    if total_issues > 0 and total_issues != seo + technical + content + ai_search:
        _assert_no_error(report, errors, "zero_sum_impacts", False,
                         f"Issue categories ({seo}+{technical}+{content}+{ai_search}={seo+technical+content+ai_search}) "
                         f"don't sum to total issues ({total_issues})")


def _check_single_render(report: dict, errors: list[ReportLinterError]):
    deep_dives = report.get("deep_dives", report.get("pages_analyzed", report.get("page_analysis", [])))
    if deep_dives:
        url_counts = {}
        for dd in deep_dives:
            url = dd.get("url", dd.get("page_url", ""))
            if url:
                url_counts[url] = url_counts.get(url, 0) + 1
        for url, count in url_counts.items():
            if count > 1:
                _assert_no_error(report, errors, "single_render", False,
                                 f"Page '{url}' appears {count} times in deep-dive section (expected 1)")


def _check_fabrication_guard(report: dict, errors: list[ReportLinterError]):
    numerical_claims = []

    sigs = report.get("all_signals", report.get("signals", []))
    for sig in sigs:
        val = sig.get("value", sig.get("score", sig.get("percentage", -1)))
        if isinstance(val, (int, float)) and val > 0 and val <= 100:
            source = sig.get("source", sig.get("data_source", ""))
            name = sig.get("signal_name", sig.get("name", ""))

    comp = report.get("competitor_data", report.get("competitors", {}))
    if comp and isinstance(comp, dict):
        for comp_key, comp_val in comp.items():
            if isinstance(comp_val, dict):
                for k, v in comp_val.items():
                    if isinstance(v, (int, float)) and v > 0:
                        source = comp_val.get("_source", comp_val.get("data_source", ""))
                        if not source:
                            _assert_no_error(report, errors, "fabrication_guard", False,
                                             f"Competitor '{comp_key}' metric '{k}={v}' has no data source")


def _check_fix_code_uniqueness(report: dict, errors: list[ReportLinterError]):
    issues = report.get("issues", [])
    fix_codes = [i.get("fix_code", i.get("id", "")) for i in issues if i.get("fix_code", i.get("id", ""))]
    if len(fix_codes) != len(set(fix_codes)):
        _assert_no_error(report, errors, "fix_code_uniqueness", False, "Duplicate fix codes found")


def _check_url_variant_inflation(report: dict, errors: list[ReportLinterError]):
    data_keys = ["pages", "page_urls", "all_pages"]
    urls = []
    for key in data_keys:
        items = report.get(key, [])
        if isinstance(items, list):
            for item in items:
                if isinstance(item, str):
                    urls.append(item)
                elif isinstance(item, dict):
                    urls.append(item.get("url", item.get("page_url", "")))
                elif hasattr(item, "url"):
                    urls.append(getattr(item, "url", ""))

    if len(urls) > 1:
        from urllib.parse import urlparse
        base_counts = {}
        for u in urls:
            if u:
                parsed = urlparse(u)
                base = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"
                base_counts[base] = base_counts.get(base, 0) + 1
        for base, count in base_counts.items():
            if count > 1:
                variants = [u for u in urls if urlparse(u).path.rstrip('/') == urlparse(base).path.rstrip('/')]
                if len(set(variants)) > 1:
                    _assert_no_error(report, errors, "url_variant_inflation", False,
                                     f"URL '{base}' has {len(set(variants))} variants (http/https/www): {set(variants)}")
