"""Grammar accuracy evaluation API — measures the shared correction rules
against embedded gold pairs or downloaded datasets (15k GEC, C4-200M subset,
GEC subset, 36-category pairs) in backend/data.

POST /api/grammar-eval/evaluate  body: {dataset, limit}
GET  /api/grammar-eval/rules     rule table summary + rule counts
GET  /api/grammar-eval/datasets  files currently available in backend/data
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.models import User
from app.api.auth import get_current_active_user
from app.engine.grammar_eval import (
    run_eval,
    rule_summary,
    scan_datasets,
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