"""Shared rule-based search-intent classifier.

Single implementation used across tools (Keyword Difficulty, Keyword Gap
Analysis). Heuristic, rule-based — matches the original logic embedded in
app/api/status.py so behavior is unchanged when reused.

Returns one of:
    Transactional / Commercial / Navigational / Informational / Mixed
"""
from __future__ import annotations

_TRANSACTIONAL = [
    "buy", "get", "download", "sign up", "register", "free trial", "demo",
    "contact", "hire",
]
_COMMERCIAL = [
    "best", "top", "review", "comparison", "vs", "alternative", "alternatives",
    "pricing", "cost", "cheap", "affordable", "coupon", "discount", "worth",
]
_NAVIGATIONAL = [
    "login", "dashboard", "support", "docs", "api", "pricing page", "about us",
]
_INFORMATIONAL = [
    "what", "how", "why", "when", "where", "who", "guide", "tutorial", "learn",
    "example", "tips", "best practices",
]


def classify_intent(query: str) -> str:
    """Return the rule-based search intent for a keyword/query."""
    q = (query or "").lower().strip()
    if not q:
        return "Mixed"
    if any(w in q for w in _TRANSACTIONAL):
        return "Transactional"
    if any(w in q for w in _COMMERCIAL):
        return "Commercial"
    if any(w in q for w in _NAVIGATIONAL):
        return "Navigational"
    if "?" in q or any(w in q for w in _INFORMATIONAL):
        return "Informational"
    return "Mixed"