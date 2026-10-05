"""Grammar accuracy evaluation API — measures the shared correction rules
against embedded gold pairs or downloaded datasets (15k GEC, C4-200M subset,
GEC subset, 36-category pairs) in backend/data.

POST /api/grammar-eval/evaluate  body: {dataset, limit}
GET  /api/grammar-eval/rules     rule table summary + rule counts
GET  /api/grammar-eval/datasets  files currently available in backend/data
GET  /api/grammar-eval/providers active AI ensemble providers
POST /api/grammar-eval/vet      AI majority-vote validation of rule lints
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.models import User
from app.api.auth import get_current_active_user
from app.engine.grammar_eval import (
    run_eval,
    rule_summary,
    scan_datasets,
)
from app.engine.ai_validator import (
    active_providers,
    validate_lints,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/grammar-eval", tags=["grammar-eval"])


class EvaluateBody(BaseModel):
    dataset: str = ""
    """Filename inside backend/data (e.g. grammar_correction.csv). Empty = embedded set."""

    limit: int = 100
    """Max gold pairs to evaluate (0 / None = all)."""


@router.post("/evaluate")
async def evaluate_corrections(body: EvaluateBody,
                               user: User = Depends(get_current_active_user)):
    """Run the correction rules over a gold set and return accuracy metrics."""
    if body.limit and (body.limit < 1 or body.limit > 10000):
        raise HTTPException(400, "limit must be between 1 and 10000")
    try:
        source, metrics = run_eval(dataset=body.dataset, limit=body.limit or None)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, KeyError) as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"source": source, **metrics}


@router.get("/rules")
async def grammar_rules(user: User = Depends(get_current_active_user)):
    return rule_summary()


@router.get("/datasets")
async def available_datasets(user: User = Depends(get_current_active_user)):
    return {"datasets": scan_datasets(), "data_dir": "backend/data"}


class VetBody(BaseModel):
    text: str
    """Full sentence/paragraph the lints were generated from."""

    lints: list = []
    """Lint-shaped records from the rule engine: problemText + suggestions."""

    min_approvals: Optional[int] = None


@router.get("/providers")
async def ensemble_providers(user: User = Depends(get_current_active_user)):
    """List free AI providers available for majority-vote grammar validation."""
    return {
        "voting": "majority",
        "min_approvals": settings.GRAMMAR_AI_MIN_APPROVALS,
        "enabled": settings.GRAMMAR_AI_ENABLED,
        "providers": active_providers(),
    }


@router.post("/vet")
async def vet_corrections(body: VetBody, user: User = Depends(get_current_active_user)):
    """Run the AI ensemble over rule-engine lints.

    Each provider independently judges every correction; the majority vote
    decides. Returns the lints enriched with per-vote `aiValidation` data.
    """
    if not body.text:
        raise HTTPException(400, "text is required")
    if not settings.GRAMMAR_AI_ENABLED:
        raise HTTPException(400, "GRAMMAR_AI_ENABLED is False; no AI validation running")
    if not active_providers():
        raise HTTPException(412, "No AI providers configured. Set GEMINI_API_KEY, GROQ_API_KEY and/or OPENROUTER_API_KEY in .env.")
    try:
        return await validate_lints(body.text, body.lints or [], min_approvals=body.min_approvals)
    except Exception as exc:
        logger.exception("AI ensemble vet failed")
        raise HTTPException(500, f"AI ensemble failed: {exc}") from exc