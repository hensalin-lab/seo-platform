"""Shared test setup: ensure all tables exist before API tests run."""
import asyncio

import pytest

from app.database import engine, init_db

_initialized = False


@pytest.fixture(scope="session", autouse=True)
def _ensure_db_schema():
    global _initialized
    if not _initialized:
        asyncio.run(init_db())
        asyncio.run(engine.dispose())
        _initialized = True
    yield
