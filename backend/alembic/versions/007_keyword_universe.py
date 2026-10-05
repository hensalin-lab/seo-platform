"""Expand keyword_records into a real keyword universe.

The table could only hold a word, an on-page frequency and an opportunity label,
so the keyword view had nothing to filter, group or prioritise on. Adds intent,
tail length, word count, difficulty, volume, provenance and a relevance score,
plus a composite index for the ranked per-audit read.

Revision ID: 007_keyword_universe
"""
from alembic import op
import sqlalchemy as sa

revision = "007_keyword_universe"
down_revision = "006_ai_visibility_rename"
branch_labels = None
depends_on = None

_NEW_COLUMNS = (
    ("intent", sa.String()),
    ("tail", sa.String()),
    ("word_count", sa.Integer()),
    ("difficulty", sa.Integer()),
    ("volume", sa.Integer()),
    ("source", sa.String()),
    ("relevance", sa.Integer()),
)


def _columns(table):
    bind = op.get_bind()
    from sqlalchemy import inspect as sa_inspect
    try:
        return [c["name"] for c in sa_inspect(bind).get_columns(table)]
    except Exception:
        return []


def upgrade():
    table = "keyword_records"
    existing = _columns(table)
    if not existing:
        return
    for name, col_type in _NEW_COLUMNS:
        if name not in existing:
            op.add_column(table, sa.Column(name, col_type, server_default=sa.text("''")))

    bind = op.get_bind()
    from sqlalchemy import inspect as sa_inspect
    idx = {i["name"] for i in sa_inspect(bind).get_indexes(table)}
    if "ix_kw_audit_relevance" not in idx:
        op.create_index("ix_kw_audit_relevance", table, ["audit_id", "relevance"])


def downgrade():
    table = "keyword_records"
    bind = op.get_bind()
    from sqlalchemy import inspect as sa_inspect
    try:
        idx = {i["name"] for i in sa_inspect(bind).get_indexes(table)}
        if "ix_kw_audit_relevance" in idx:
            op.drop_index("ix_kw_audit_relevance", table_name=table)
    except Exception:
        pass
    existing = _columns(table)
    for name, _t in _NEW_COLUMNS:
        if name in existing:
            op.drop_column(table, name)