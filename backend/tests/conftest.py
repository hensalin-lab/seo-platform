"""Shared test setup: use an isolated test DB so runs are hermetic and idempotent.

Must set DATABASE_URL before any app import so the engine binds to the test DB.
"""
import asyncio
import os

_TEST_DB = os.path.join(os.path.dirname(__file__), "test_seo_platform.db")
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///" + _TEST_DB.replace("\\", "/")

# The whole suite runs through a single TestClient, so every anonymous request
# shares one client IP. The production per-endpoint throttles would otherwise
# be tripped across tests (e.g. RATE_LIMIT_REGISTER=10/hour breaks the first
# 11th registration). Lift them here ONLY for the test env; production config
# (config.py / dashboard env) is untouched.
os.environ["RATE_LIMIT_AUDIT"] = "100000/minute"
os.environ["RATE_LIMIT_KEYWORD_VOLUME"] = "100000/minute"
os.environ["RATE_LIMIT_SERP"] = "100000/minute"
os.environ["RATE_LIMIT_BACKLINKS"] = "100000/minute"
os.environ["RATE_LIMIT_PAGESPEED"] = "100000/minute"
os.environ["RATE_LIMIT_BRAND_MONITOR"] = "100000/minute"
os.environ["RATE_LIMIT_PROVIDER_TEST"] = "100000/minute"
os.environ["RATE_LIMIT_REGISTER"] = "100000/hour"
os.environ["RATE_LIMIT_AI_ANALYSIS"] = "100000/minute"

import pytest  # noqa: E402

from app.database import engine, init_db  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _ensure_db_schema():
    if os.path.exists(_TEST_DB):
        os.remove(_TEST_DB)
    asyncio.run(init_db())
    asyncio.run(engine.dispose())
    yield
