"""Rename AIVisibilitySnapshot fields to honest readiness signals.

Revision ID: 006_ai_visibility_rename
"""
from alembic import op
import sqlalchemy as sa

revision = "006_ai_visibility_rename"
down_revision = "005_backlink_target_domain"
branch_labels = None
depends_on = None


def _column_exists(table, column):
    bind = op.get_bind()
    from sqlalchemy import inspect as sa_inspect
    try:
        cols = [c["name"] for c in sa_inspect(bind).get_columns(table)]
        return column in cols
    except Exception:
        return False


def upgrade():
    table = "ai_visibility_snapshots"
    for col_name in ("ai_crawlable_llms_txt", "ai_overview_eligible_schema", "manually_logged_cited"):
        if not _column_exists(table, col_name):
            op.add_column(table, sa.Column(col_name, sa.Boolean(), server_default=sa.false()))
    for col_name in ("cited_by_chatgpt", "cited_by_perplexity", "cited_by_google_ai_overview"):
        if _column_exists(table, col_name):
            op.drop_column(table, col_name)


def downgrade():
    op.add_column("ai_visibility_snapshots", sa.Column("cited_by_chatgpt", sa.Boolean(), server_default=sa.false()))
    op.add_column("ai_visibility_snapshots", sa.Column("cited_by_perplexity", sa.Boolean(), server_default=sa.false()))
    op.add_column("ai_visibility_snapshots", sa.Column("cited_by_google_ai_overview", sa.Boolean(), server_default=sa.false()))
    op.drop_column("ai_visibility_snapshots", "manually_logged_cited")
    op.drop_column("ai_visibility_snapshots", "ai_overview_eligible_schema")
    op.drop_column("ai_visibility_snapshots", "ai_crawlable_llms_txt")
