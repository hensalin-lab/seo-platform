"""Centralised rate limiting for the platform.

A single shared :class:`slowapi.Limiter` lives here so every router can import
and decorate endpoints with :func:`@limiter.limit(...)` without hitting the
circular import that would occur if it lived in ``app.main``.

Keying strategy:
  * authenticated requests are keyed by ``user:<id>`` so limits are per-user,
  * anonymous requests fall back to the client IP.

Global defaults apply platform-wide; individual (usually costly) endpoints add
their own stricter ``@limiter.limit`` decorators.
"""
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

logger = logging.getLogger(__name__)


def rate_limit_key(request: Request) -> str:
    """Use the authenticated user id when present, otherwise the client IP."""
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    return get_remote_address(request)


limiter = Limiter(
    key_func=rate_limit_key,
    default_limits=["200/minute"],
)
