"""Add Growth AI Engine foundation tables: tracked_domains, tracked_keywords,
rank_snapshots, ai_visibility_snapshots.

Revision ID: 004_domain_tracking_foundation
Revises: 003_model_metadata_sync
Create Date: 2026-09-04
"""
from typing import Sequence, Union

from alembic import op

from app.database import Base

revision: str = '004_domain_tracking_foundation'
down_revision: Union[str, None] = '003_model_metadata_sync'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _run_sync(bind, fn):
    if hasattr(bind, "run_sync"):
        bind.run_sync(fn)
    else:
        fn(bind)


def upgrade() -> None:
    conn = op.get_bind()
    _run_sync(conn, Base.metadata.create_all)


def downgrade() -> None:
    conn = op.get_bind()
    for table in reversed(Base.metadata.sorted_tables):
        _run_sync(conn, table.drop)
