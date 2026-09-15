"""Grammar correction rule engine + accuracy evaluation harness.

Loads the shared, language-neutral rule table from the frontend bundle
(frontend/src/shared/grammar-rules/rules.json) so the Python harness measures
the exact same rules that ship to the browser. Runs zero network calls.

Two modes:
  * embedded  — precision/recall/F1 on the gold examples + noop sentences
                embedded in rules.json (works with no datasets downloaded)
  * dataset   — same metrics over downloaded gold pairs, e.g.
                backend/data/*.csv with columns like
                (incorrect/corrected | input/target | ungrammatical/standard)
"""
import csv
import json
import logging
import pathlib
import re

logger = logging.getLogger(__name__)

ROOT = pathlib.Path(__file__).resolve().parents[3]
DEFAULT_RULE_FILE = ROOT / "frontend" / "src" / "shared" / "grammar-rules" / "rules.json"
DATA_DIR = ROOT / "backend" / "data"

_KIND_PRETTY = {
    "grammar": "Grammar",
    "spelling": "Spelling",
    "punctuation": "Punctuation",
    "style": "Style",
}

_rules_cache = {"path": None, "data": None}


def load_rules(path=DEFAULT_RULE_FILE):
    cached = _rules_cache.get("data")
    if cached is not None and _rules_cache.get("path") == str(path):
        return cached
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    _rules_cache["path"] = str(path)
    _rules_cache["data"] = data
    return data


def compile_rules(rules):
    """Build list of compiled (rule, regex) matching the JS semantics."""
    compiled = []
    for rule in rules:
        flags = re.IGNORECASE if rule.get("caseInsensitive") else 0
        try:
            regex = re.compile(rule["pattern"], flags)
        except re.error as exc:
            logger.warning("Skipping rule %s: bad regex %r (%s)", rule.get("id"), rule["pattern"], exc)
            continue
        compiled.append((rule, regex))
    return compiled


def _to_python_replacement(template):
    """Convert JS-style '$1' placeholders to Python '\\1' for re.sub."""
    return re.sub(r"\$(\d+)", r"\\\1", template)


def apply_replacement(template, match):
    return match.expand(_to_python_replacement(template))


def _capitalize_first(text):
    return text[0].upper() + text[1:] if text else text


def _overlaps(a_start, a_end, b_start, b_end):
    return a_start < b_end and b_start < a_end


def rule_lints(text, compiled):
    """Return rule hits over `text` as lint-shaped records (JS-compatible shape)."""
    results = []
    used = []
    for rule, regex in compiled:
        for m in regex.finditer(text):
            start, end = m.start(), m.end()
            if any(_overlaps(s, e, start, end) for s, e in used):
                continue
            replacement = apply_replacement(rule["replacement"], m)
            if m.group(0) and m.group(0)[0].isupper() and replacement and replacement[0].islower():
                replacement = _capitalize_first(replacement)
            kind = rule.get("category", "grammar")
            message = "%s issue: '%s' should be '%s'" % (
                _KIND_PRETTY.get(kind, "Grammar"), m.group(0), replacement)
            used.append((start, end))
            results.append({
                "message": message,
                "lintKind": kind,
                "lintKindPretty": _KIND_PRETTY.get(kind, "Grammar"),
                "problemText": m.group(0),
                "span": {"start": start, "end": end},
                "suggestions": [{"replacementText": replacement, "kind": "replacement"}],
                "_key": f"{message}|{kind}|{start}|{end}",
                "source": "rules",
                "ruleId": rule["id"],
                "confidence": rule.get("confidence", 1.0),
            })
    return results


def apply_rules(text, compiled):
    """Correct `text` by applying every rule fix once (overlap-safe, descending)."""
    lints = rule_lints(text, compiled)
    if not lints:
        return text, lints
    candidates = sorted(
        [(l["span"]["start"], l["span"]["end"], l["suggestions"][0]["replacementText"], l["ruleId"])
         for l in lints],
        key=lambda x: x[0], reverse=True)
    output = text
    applied_ranges = []
    applied = 0
    for start, end, replacement, rule_id in candidates:
        if any(_overlaps(s, e, start, end) for s, e in applied_ranges):
            continue
        output = output[:start] + replacement + output[end:]
        applied_ranges.append((start, end))
        applied += 1
    return output, lints


def normalize(text):
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def ws_only(text):
    """Collapse whitespace but keep case. Used to decide whether a pair is an
    error at all (a case-only fix like i -> I must still count as an error)."""
    return re.sub(r"\s+", " ", str(text or "").strip())


def embedded_eval_set(rule_data):
    pairs = [
        {"input": r["example"], "gold": r["gold"], "rule_id": r["id"]}
        for r in rule_data.get("rules", [])
        if r.get("example") and r.get("gold")
    ]
    noops = rule_data.get("noops", [])
    return pairs, noops


def _fuzzy_column(headers, candidates):
    norm = {h.strip().lower().replace("-", "_"): h for h in headers}
    for cand in candidates:
        if cand in norm:
            return norm[cand]
    for key, header in norm.items():
        for cand in candidates:
            if cand in key or key in cand:
                return header
    return None


def load_dataset(filename):
    """Load (input, gold, meta) rows from a dataset file. Fuzzy column detection."""
    path = pathlib.Path(filename)
    if not path.is_absolute():
        path = DATA_DIR / path.name
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    rows = []
    if path.suffix.lower() in (".csv", ".tsv"):
        delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
        with open(path, "r", encoding="utf-8-sig", newline="") as fh:
            reader = csv.DictReader(fh, delimiter=delimiter)
            headers = reader.fieldnames or []
            in_col = _fuzzy_column(headers, ["incorrect", "input", "original", "bad", "ungrammatical", "source"])
            gold_col = _fuzzy_column(headers, ["corrected", "correct", "gold", "target", "standard", "output"])
            if not in_col or not gold_col:
                raise ValueError(
                    f"Could not detect input/gold columns in {path.name}. Headers: {headers}")
            category_col = _fuzzy_column(headers, ["category", "error_category", "error", "type", "label"])
            quality_col = _fuzzy_column(headers, ["quality_score", "quality", "score"])
            for row in reader:
                inp = (row.get(in_col) or "").strip()
                gold = (row.get(gold_col) or "").strip()
                if not inp or not gold:
                    continue
                meta = {"source": path.name}
                if category_col and row.get(category_col):
                    meta["category"] = row[category_col].strip()
                if quality_col and row.get(quality_col):
                    try:
                        meta["quality"] = float(row[quality_col])
                    except (TypeError, ValueError):
                        pass
                rows.append({"input": inp, "gold": gold, **meta})
        return rows

    if path.suffix.lower() == ".jsonl":
        with open(path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                obj = json.loads(line)
                inp = obj.get("input") or obj.get("incorrect") or obj.get("ungrammatical")
                gold = obj.get("target") or obj.get("corrected") or obj.get("gold") or obj.get("standard")
                if inp and gold:
                    rows.append({"input": str(inp).strip(), "gold": str(gold).strip(), "source": path.name})
    return rows


def scan_datasets():
    if not DATA_DIR.exists():
        return []
    return sorted(p.name for p in DATA_DIR.iterdir() if p.suffix.lower() in (".csv", ".tsv", ".jsonl"))


def evaluate(pairs, noops, rule_data, compiled=None, limit=None, return_samples=True):
    compiled = compiled or compile_rules(rule_data.get("rules", []))
    if limit:
        pairs = pairs[:limit]
        noops = noops[:max(1, limit // 4)]

    stats = {
        "total_pairs": len(pairs),
        "errors": 0,
        "noop": 0,
        "fixes_applied": 0,
        "correct_fixes": 0,
        "false_fixes": 0,
        "missed_errors": 0,
        "harmed_noops": 0,
    }
    by_rule = {}
    samples = []
    for pair in pairs:
        input_text, gold = pair["input"], pair["gold"]
        is_error = ws_only(input_text) != ws_only(gold)
        if is_error:
            stats["errors"] += 1
        output, lints = apply_rules(input_text, compiled)
        changed = ws_only(output) != ws_only(input_text)
        matched_rule = [l["ruleId"] for l in lints]
        if changed:
            stats["fixes_applied"] += 1
        if is_error and normalize(output) == normalize(gold):
            stats["correct_fixes"] += 1
        elif is_error and not changed:
            stats["missed_errors"] += 1
        elif not is_error and changed:
            stats["false_fixes"] += 1
        for rid in matched_rule:
            bucket = by_rule.setdefault(rid, {"fixed": 0, "matched": 0})
            bucket["matched"] += 1
            if not is_error or normalize(output) != normalize(gold):
                continue
            if normalize(output) == normalize(gold):
                bucket["fixed"] += 1
        if return_samples and is_error and len(samples) < 12:
            samples.append({
                "rule": matched_rule or None,
                "input": input_text,
                "gold": gold,
                "result": output,
                "correct": normalize(output) == normalize(gold),
            })

    for clean in noops:
        unchanged = normalize(apply_rules(clean, compiled)[0]) == normalize(clean)
        if not unchanged:
            stats["harmed_noops"] += 1
    stats["noop"] = len(noops)

    precision = stats["correct_fixes"] / stats["fixes_applied"] if stats["fixes_applied"] else None
    recall = stats["correct_fixes"] / stats["errors"] if stats["errors"] else None
    f1 = (2 * precision * recall / (precision + recall)) if (precision and recall and precision + recall > 0) else None
    noop_preserve = 1 - stats["harmed_noops"] / stats["noop"] if stats["noop"] else None
    by_category = {}
    for rule in rule_data.get("rules", []):
        cnt = by_rule.get(rule["id"], {"matched": 0, "fixed": 0})
        by_category[rule["category"]] = by_category.get(rule["category"], {"rules": 0, "fixes": 0, "correct": 0})
        if cnt["matched"]:
            by_category[rule["category"]]["rules"] += 1
            by_category[rule["category"]]["fixes"] += cnt["matched"]
            by_category[rule["category"]]["correct"] += cnt["fixed"]

    return {
        **stats,
        "precision": round(precision, 6) if precision is not None else None,
        "recall": round(recall, 6) if recall is not None else None,
        "f1": round(f1, 6) if f1 is not None else None,
        "noop_preserve_rate": round(noop_preserve, 6) if noop_preserve is not None else None,
        "by_rule": by_rule,
        "by_category": by_category,
        "samples": samples,
    }


def run_eval(dataset="", limit=None, rule_file=DEFAULT_RULE_FILE):
    rule_data = load_rules(rule_file)
    compiled = compile_rules(rule_data.get("rules", []))
    pairs, noops = embedded_eval_set(rule_data)
    source = "embedded"
    if dataset:
        pairs = load_dataset(dataset)
        noops = []
        source = pairs[0]["source"] if pairs else dataset
    return source, evaluate(pairs, noops, rule_data, compiled=compiled, limit=limit)


def rule_summary(rule_file=DEFAULT_RULE_FILE):
    rule_data = load_rules(rule_file)
    rules = rule_data.get("rules", [])
    by_category = {}
    confidences = []
    for rule in rules:
        by_category[rule.get("category", "other")] = by_category.get(rule.get("category", "other"), 0) + 1
        c = rule.get("confidence")
        if isinstance(c, (int, float)):
            confidences.append(float(c))
    min_c = min(confidences) if confidences else None
    max_c = max(confidences) if confidences else None
    avg_c = round(sum(confidences) / len(confidences), 4) if confidences else None
    return {
        "version": rule_data.get("version"),
        "source": rule_data.get("source"),
        "total_rules": len(rules),
        "by_category": by_category,
        "examples": sum(1 for r in rules if r.get("example") and r.get("gold")),
        "noops": len(rule_data.get("noops", [])),
        "confidence": {"min": min_c, "max": max_c, "avg": avg_c},
        "datasets_available": scan_datasets(),
    }


def run_smoke():
    source, metrics = run_eval()
    print(f"source={source} pairs={metrics['total_pairs']}")
    for key in ("errors", "fixes_applied", "correct_fixes", "missed_errors", "harmed_noops"):
        print(f"  {key}={metrics[key]}")
    for key in ("precision", "recall", "f1", "noop_preserve_rate"):
        print(f"  {key}={metrics[key]}")


if __name__ == "__main__":
    run_smoke()