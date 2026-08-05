"""Free, keyless, server-side data endpoints. Available to all authenticated
users at zero cost. All underlying calls are best-effort and never raise."""
import logging
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.engine.free_data import (
    dns_over_https,
    google_autocomplete,
    rdap_whois,
    site_checks,
    ssl_labs_grade,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/free", tags=["free-data"])


def _validate_url(url: str) -> str:
    parsed = urlparse(url or "")
    if not parsed.scheme or not parsed.hostname:
        raise HTTPException(status_code=422, detail="Provide a valid URL with scheme and host")
    return url


class AutocompleteResponse(BaseModel):
    q: str
    suggestions: list


@router.get("/autocomplete", response_model=AutocompleteResponse)
async def autocomplete(q: str = Query(..., min_length=1, max_length=120)):
    suggestions = await google_autocomplete(q)
    return {"q": q, "suggestions": suggestions}


@router.get("/site-checks")
async def site_checks_endpoint(url: str = Query(...)):
    _validate_url(url)
    return await site_checks(url)


@router.get("/whois")
async def whois_endpoint(url: str = Query(...)):
    _validate_url(url)
    return await rdap_whois(url)


@router.get("/dns")
async def dns_endpoint(url: str = Query(...)):
    _validate_url(url)
    return await dns_over_https(url)


@router.get("/ssl")
async def ssl_endpoint(url: str = Query(...)):
    _validate_url(url)
    return await ssl_labs_grade(url)
