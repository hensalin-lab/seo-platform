"""Reconcile full current model metadata (all tables + indexes).

Revision ID: 003_model_metadata_sync
Revises: 002_audit_snapshots
Create Date: 2026-09-02

The 001/002 migrations are hand-written baselines for a subset of tables.
This migration closes the gap: it runs ``Base.metadata.create_all`` so every
table and index defined by the current models exists, while being idempotent
on databases that already have older create_all-managed schemas. Downgrade
drops every metadata-owned table (destructive teardown, only used in tests /
controlled rollback).
"""
from typing import Sequence, Union

from alembic import op

from app.database import Base

revision: str = '003_model_metadata_sync'
down_revision: Union[str, None] = '002_audit_snapshots'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _run_sync(bind, fn):
    """Run a metadata op against either a sync Connection or the async proxy."""
    if hasattr(bind, "run_sync"):
        bind.run_sync(fn)
    else:
        fn(bind)


def upgrade() -> None:
    conn = op.get_bind()
    _run_sync(conn, Base.metadata.create_all)


def downgrade() -> None:
    conn = op.get_bind()
    # Teardown: drop every table tracked by the current models. The hand-written
    # 001/002 tables are part of Base.metadata, so this fully reverses head -> base.
    _run_sync(conn, Base.metadata.drop_all)