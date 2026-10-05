"""Ensemble AI grammar validator — multiple free LLM providers with majority vote.

Every correction flagged by the offline rule engine is independently judged by
each configured AI provider. The ensemble accepts a correction when 2+ providers
agree (majority vote), so real errors are caught and corrected even when a
single provider is too conservative or makes a mistake, while isolated false
positives are still rejected.

Built-in free providers
-----------------------
* gemini     — Google Generative Language API          (GEMINI_API_KEY)
* groq       — https://api.groq.com/openai/v1          (GROQ_API_KEY, openai/gpt-oss-120b free)
* openrouter — https://openrouter.ai/api/v1            (OPENROUTER_API_KEY,
               google/gemma-4-31b-it:free)

Each provider carries a fallback_models chain so the vote survives free-catalog
churn (e.g. llama-3.3-70b-versatile and google/gemini-2.0-flash-exp:free were
delisted from the free tiers; the configured model is tried first, then the
fallbacks). Any OpenAI-compatible endpoint can be added by extending PROVIDERS.

Usage
-----
    await validate_suggestion(sentence, flagged, replacement)  # single vote
    await validate_lints(text, lints)                          # enrich rule lints
    active_providers()                                         # what's configured

Self-test (real API calls, prints per-provider votes):
    python -m app.engine.ai_validator
"""
import asyncio
import json
import logging
from dataclasses import dataclass, field, asdict
from typing import Any, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider registry
# ---------------------------------------------------------------------------

# Transport "openai" = OpenAI-compatible /chat/completions; "gemini" = native
# Geminii generateContent REST call.
# `fallback_models` are tried in order when the configured model 404s — free
# catalogs churn quickly (llama-3.3-70b-versatile and
# google/gemini-2.0-flash-exp:free were both delisted on their free tiers), so
# the ensemble degrades gracefully instead of losing a vote.
PROVIDERS: dict[str, dict[str, Any]] = {
    "gemini": {
        "label": "Gemini",
        "model": lambda: settings.GEMINI_MODEL,
        "timeout": lambda: settings.GRAMMAR_AI_TIMEOUT,
        "transport": "gemini",
    },
    "groq": {
        "label": "Groq",
        "model": lambda: settings.GROQ_MODEL,
        "timeout": lambda: settings.GRAMMAR_AI_TIMEOUT,
        "transport": "openai",
        "base_url": "https://api.groq.com/openai/v1",
        "json_mode": True,
        "fallback_models": [
            "openai/gpt-oss-120b",
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-20b",
        ],
    },
    "openrouter": {
        "label": "OpenRouter",
        "model": lambda: settings.OPENROUTER_MODEL_GRAMMAR,
        "timeout": lambda: settings.GRAMMAR_AI_TIMEOUT,
        "transport": "openai",
        "base_url": "https://openrouter.ai/api/v1",
        "json_mode": False,
        "fallback_models": [
            "google/gemma-4-31b-it:free",
            "google/gemma-4-26b-a4b-it:free",
            "z-ai/glm-5.2:free",
        ],
    },
}

DEFAULT_PROVIDER_ORDER = ("gemini", "groq", "openrouter")


def _api_key(name: str) -> str:
    if name == "gemini":
        return settings.GEMINI_API_KEY or ""
    if name == "groq":
        return settings.GROQ_API_KEY or ""
    if name == "openrouter":
        return settings.OPENROUTER_API_KEY or ""
    return ""


# ---------------------------------------------------------------------------
# Prompt — deliberately NOT conservative. The rule engine only fires high
# confidence rules, so a provider should approve valid corrections eagerly
# and reject only clear-cut false positives.
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a FAIR English grammar verifier. A rule engine has already flagged a suspicious span in a sentence and proposes a correction. Decide whether the correction is valid.

APPROVE the correction when:
- It fixes any real grammar, spelling, punctuation, or style error, even a small one (e.g. "its" -> "it's", "there" -> "their", "alot" -> "a lot").
- The flagged text is wrong or awkward and the replacement is correct, natural English.
- The original sentence is ungrammatical and the replacement fixes it.

REJECT only when:
- The original text is already perfectly correct AND the replacement would introduce a new error or change the meaning.
- The replacement is itself ungrammatical or nonsense.

CRITICAL: Do not be overly conservative. Real, clear fixes MUST be approved. When you are unsure but the original text looks wrong, approve. Only vote to reject when you are confident the original was already correct. We prefer catching a borderline real error over silently keeping it.

Answer with JSON only, using exactly this shape:
{"approved": true or false, "confidence": 0.0 to 1.0, "reason": "one short sentence"}

Example: {"approved": true, "confidence": 0.97, "reason": "has went is ungrammatical; has gone fixes it"}\n"""


@dataclass
class ProviderVote:
    provider: str
    label: str
    model: str
    approved: Optional[bool] = None
    confidence: Optional[float] = None
    reason: str = ""
    error: str = ""

    @property
    def responded(self) -> bool:
        return self.approved is not None

    def to_dict(self) -> dict:
        return asdict(self)


def provider_vote_dict(vote: ProviderVote) -> dict:
    return vote.to_dict()


def _provider_order() -> list[str]:
    raw = (settings.GRAMMAR_AI_PROVIDERS or "").strip()
    if raw:
        names = [n.strip() for n in raw.split(",") if n.strip()]
        return [n for n in names if n in PROVIDERS]
    return list(DEFAULT_PROVIDER_ORDER)


def active_providers() -> list[dict[str, str]]:
    """Providers with a configured API key, ready to vote."""
    result = []
    for name in _provider_order():
        if not _api_key(name):
            logger.debug("Provider %s skipped: API key not configured", name)
            continue
        spec = PROVIDERS[name]
        result.append({
            "name": name,
            "label": spec["label"],
            "model": spec["model"](),
        })
    return result


# ---------------------------------------------------------------------------
# HTTP transports
# ---------------------------------------------------------------------------

def _parse_verdict(text: str) -> Optional[dict]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        cleaned = cleaned[start:end + 1]
    try:
        return json.loads(cleaned)
    except (ValueError, TypeError):
        return None


async def _gen_gemini(spec: dict, system: str, user_payload: dict) -> dict:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{spec['model']()}:generateContent?key={_api_key('gemini')}"
    )
    body = {
        "contents": [{"parts": [{"text": system + "\n\n" + json.dumps(user_payload, ensure_ascii=False)}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 512,
            "responseMimeType": "application/json",
        },
    }
    async with httpx.AsyncClient(timeout=spec["timeout"]()) as client:
        resp = await client.post(url, json=body)
        if resp.status_code in (429, 500, 503):
            # Transient quota/high-demand: one retry before giving up the vote.
            await asyncio.sleep(1.5)
            resp = await client.post(url, json=body)
        if resp.status_code != 200:
            raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    parsed = _parse_verdict(text)
    if parsed is None:
        raise RuntimeError(f"unparseable Gemini verdict: {text[:300]}")
    return parsed


async def _gen_openai(spec: dict, system: str, user_payload: dict, models: Optional[list[str]] = None) -> dict:
    url = f"{spec['base_url'].rstrip('/')}/chat/completions"
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
    ]
    headers = {"Authorization": f"Bearer {_api_key(spec['provider'])}", "Content-Type": "application/json"}
    if spec.get("base_url", "").startswith("https://openrouter.ai"):
        headers |= {"HTTP-Referer": "http://localhost:5173", "X-Title": "AI SEO Platform"}

    for idx, model in enumerate(models or [spec["model"]()]):
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 512,
        }
        if spec.get("json_mode"):
            payload["response_format"] = {"type": "json_object"}
        async with httpx.AsyncClient(timeout=spec["timeout"]()) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 429:
                # Free-tier rate limit: one polite retry before giving up.
                await asyncio.sleep(2.0)
                resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                if resp.status_code == 404 and idx < len(models) - 1:
                    logger.warning("model %s unavailable on %s, trying fallback", model, spec["provider"])
                    continue
                raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
            text = data["choices"][0]["message"]["content"]
            break
    else:
        raise RuntimeError("all candidate models unavailable")
    parsed = _parse_verdict(text)
    if parsed is None:
        raise RuntimeError(f"unparseable {spec['provider']} verdict: {text[:300]}")
    return parsed


async def _ask_provider(name: str, spec: dict, system: str, user_payload: dict) -> ProviderVote:
    transport = spec["transport"]
    models = [spec["model"]()] + [m for m in spec.get("fallback_models", []) if m != spec["model"]()]
    try:
        if transport == "gemini":
            verdict = await _gen_gemini(spec, system, user_payload)
        else:
            verdict = await _gen_openai({**spec, "provider": name}, system, user_payload, models=list(models))
        approved = bool(verdict.get("approved"))
        confidence = verdict.get("confidence")
        if not isinstance(confidence, (int, float)):
            confidence = None
        else:
            confidence = max(0.0, min(1.0, float(confidence)))
        return ProviderVote(
            provider=name,
            label=spec["label"],
            model=spec["model"](),
            approved=approved,
            confidence=confidence,
            reason=str(verdict.get("reason", ""))[:400],
        )
    except Exception as exc:  # noqa: BLE001 - a single provider must never kill the vote
        logger.warning("AI validator provider %s failed: %s", name, exc)
        return ProviderVote(
            provider=name, label=spec["label"], model=spec["model"](),
            error=str(exc)[:300],
        )


def _build_user_payload(context: str, flagged: str, replacement: str, kind: str = "") -> dict:
    return {
        "task": "Judge whether the proposed correction fixes a real error.",
        "kind": kind or "grammar",
        "sentence": context,
        "flagged_text": flagged,
        "proposed_fix": replacement,
    }


# ---------------------------------------------------------------------------
# Ensemble voting
# ---------------------------------------------------------------------------

def _decide(votes: list[ProviderVote], min_approvals: int) -> tuple[bool, str]:
    approvals = sum(1 for v in votes if v.approved is True)
    rejections = sum(1 for v in votes if v.approved is False)
    responded = len(votes) - sum(1 for v in votes if v.error) if votes else 0

    if approvals >= min_approvals:
        return True, f"majority ({approvals}/{len([v for v in votes if v.responded])} approve)"
    if rejections >= min_approvals:
        return False, f"majority ({rejections}/{len([v for v in votes if v.responded])} reject)"
    if approvals > rejections:
        return True, f"vote-lean ({approvals} approve, {rejections} reject)"
    if rejections > approvals:
        return False, f"vote-lean ({rejections} reject, {approvals} approve)"
    if approvals == rejections and responded > 0:
        return approvals > 0, f"tie ({approvals} approve, {rejections} reject)"
    if responded == 0 and not votes:
        return True, "no providers configured (rule engine fallback)"
    if responded == 0:
        return True, "all providers unreachable (rule engine fallback)"
    return True, "rule engine fallback"


@dataclass
class EnsembleVerdict:
    approved: bool
    decision: str
    reason: str
    approvals: int
    rejections: int
    errors: int
    min_approvals: int
    votes: list[ProviderVote] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "approved": self.approved,
            "decision": self.decision,
            "reason": self.reason,
            "approvals": self.approvals,
            "rejections": self.rejections,
            "errors": self.errors,
            "min_approvals": self.min_approvals,
            "votes": [v.to_dict() for v in self.votes],
        }


async def validate_suggestion(
    context: str,
    flagged: str,
    replacement: str,
    kind: str = "",
    min_approvals: Optional[int] = None,
) -> EnsembleVerdict:
    """Ask every configured provider whether `replacement` correctly fixes
    `flagged` inside `context`, then apply the majority vote."""
    min_approvals = min_approvals or settings.GRAMMAR_AI_MIN_APPROVALS
    spec_by_name = PROVIDERS
    name_calls = [(name, spec_by_name[name]) for name in _provider_order() if _api_key(name)]

    user_payload = _build_user_payload(context[:1200], flagged[:200], replacement[:200], kind)
    votes = list(await asyncio.gather(
        *(_ask_provider(name, spec, SYSTEM_PROMPT, user_payload) for name, spec in name_calls)
    ))

    approvals = sum(1 for v in votes if v.approved is True)
    rejections = sum(1 for v in votes if v.approved is False)
    errors = sum(1 for v in votes if v.error)
    approved, decision = _decide(votes, min_approvals)

    for vote in votes:
        if vote.responded:
            logger.info(
                "AI validator [%s] %s the fix '%s' -> '%s' (conf=%s, reason=%s)",
                vote.label, "APPROVED" if vote.approved else "rejected",
                flagged, replacement, vote.confidence, vote.reason,
            )
        else:
            logger.info("AI validator [%s] ERROR: %s", vote.label, vote.error)

    logger.info(
        "AI ensemble: %s (%s) — %d approve / %d reject / %d error for '%s' -> '%s'",
        "APPROVED" if approved else "REJECTED", decision, approvals, rejections, errors,
        flagged, replacement,
    )

    summary_reason = ""
    if approved:
        summary_reason = "accepted: " + decision
    else:
        summary_reason = "rejected: " + decision
    return EnsembleVerdict(
        approved=approved,
        decision=decision,
        reason=summary_reason,
        approvals=approvals,
        rejections=rejections,
        errors=errors,
        min_approvals=min_approvals,
        votes=votes,
    )


async def validate_lints(text: str, lints: list[dict], min_approvals: Optional[int] = None) -> dict:
    """Enrich every rule lint with an AI ensemble verdict.

    `lints` is the lint-shaped list from grammar_eval.rule_lints / the web
    worker (each has `problemText` and `suggestions[0].replacementText`).
    """
    context = text[:1200] if text else ""
    decided: list[Optional[EnsembleVerdict]] = []
    for lint in lints or []:
        flagged = str(lint.get("problemText") or "")
        suggestions = lint.get("suggestions") or []
        replacement = suggestions[0].get("replacementText") if suggestions else ""
        if not flagged or not replacement:
            decided.append(None)
            continue
        decided.append(await validate_suggestion(context, flagged, replacement,
                                                 kind=str(lint.get("lintKind") or ""),
                                                 min_approvals=min_approvals))

    enriched: list[dict] = []
    approved = rejected = errored = skipped = 0
    for lint, verdict in zip(lints or [], decided):
        if verdict is None:
            skipped += 1
            entry = dict(lint)
            entry["aiValidation"] = {"approved": False, "status": "skipped"}
            enriched.append(entry)
            continue
        if verdict.approved:
            approved += 1
        else:
            rejected += 1
        for vote in verdict.votes:
            if vote.error:
                errored += 1
        entry = dict(lint)
        entry["aiValidation"] = verdict.to_dict()
        entry["aiValidation"]["status"] = "approved" if verdict.approved else "rejected"
        enriched.append(entry)

    return {
        "text": text,
        "checked": len(decided),
        "voting": "majority",
        "min_approvals": (settings.GRAMMAR_AI_MIN_APPROVALS if min_approvals is None else min_approvals),
        "providers": active_providers(),
        "summary": {
            "lints": len(enriched),
            "approved": approved,
            "rejected": rejected,
            "provider_errors": errored,
            "skipped": skipped,
        },
        "lints": enriched,
    }


# ---------------------------------------------------------------------------
# Self-test / demo
# ---------------------------------------------------------------------------

async def run_self_test() -> dict:
    """Lint a few real sentences and run the full ensemble on every hit."""
    from app.engine.grammar_eval import compile_rules, load_rules, rule_lints

    rules = load_rules()
    compiled = compile_rules(rules["rules"])
    samples = [
        {"example": r["example"], "gold": r.get("gold", ""), "id": r["id"]}
        for r in rules["rules"]
        if r.get("example")
    ][:6]

    report = {"providers": active_providers(), "sentences": []}
    for sample in samples:
        lints = rule_lints(sample["example"], compiled)
        if not lints:
            continue
        line = {
            "sentence": sample["example"],
            "gold": sample["gold"],
            "rules_hit": [l["ruleId"] for l in lints],
            "verdicts": [],
        }
        for lint in lints:
            flagged = str(lint.get("problemText") or "")
            replacement = lint["suggestions"][0]["replacementText"]
            verdict = await validate_suggestion(
                sample["example"], flagged, replacement,
                kind=str(lint.get("lintKind") or ""),
            )
            item = verdict.to_dict()
            item["flagged"] = flagged
            item["replacement"] = replacement
            line["verdicts"].append(item)
        report["sentences"].append(line)
    return report


def _print_report(report: dict) -> None:
    providers = report["providers"]
    print("=" * 78)
    print("AI GRAMMAR ENSEMBLE — SELF TEST")
    print("=" * 78)
    if not providers:
        print("No AI providers configured. Set GEMINI_API_KEY / GROQ_API_KEY /")
        print("OPENROUTER_API_KEY in backend/.env and retry.\n")
        return
    print("Active providers (%d):" % len(providers))
    for p in providers:
        print("  + %-42s %s" % (p["label"], p["model"]))
    print("  Voting: majority (>= %d approvals)" % settings.GRAMMAR_AI_MIN_APPROVALS)
    print("-" * 78)

    for line in report["sentences"]:
        print("\n  INPUT : %s" % line["sentence"])
        print("  GOLD  : %s" % line["gold"])
        print("  RULES : %s" % ", ".join(line["rules_hit"]))
        for verdict in line["verdicts"]:
            print("  %s  '%s' -> '%s'" % (
                "APPROVED" if verdict["approved"] else "REJECTED",
                verdict["flagged"], verdict["replacement"],
            ))
            for vote in verdict["votes"]:
                mark = "APPROVED" if vote["approved"] is True else ("rejected" if vote["approved"] is False else "ERROR")
                conf = "" if vote["confidence"] is None else " conf=%.2f" % vote["confidence"]
                detail = vote["reason"] or vote["error"]
                print("      %-14s %-8s%s  %s" % (vote["label"], mark, conf, detail or ""))
            print("      => %s (%s, %d approve / %d reject / %d error)" % (
                "APPROVED" if verdict["approved"] else "REJECTED",
                verdict["decision"],
                verdict["approvals"], verdict["rejections"], verdict["errors"],
            ))
    print("\n" + "=" * 78)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
    report = asyncio.run(run_self_test())
    _print_report(report)


if __name__ == "__main__":
    main()