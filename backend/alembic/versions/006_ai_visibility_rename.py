"""Rename AIVisibilitySnapshot fields to honest readiness signals.

Revision ID: 006_ai_visibility_rename
"""
from alembic import op
import sqlalchemy as sa

revision = "006_ai_visibility_rename"
down_revision = "005_backlink_target_domain"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("ai_visibility_snapshots", sa.Column("ai_crawlable_llms_txt", sa.Boolean(), server_default=sa.false()))
    op.add_column("ai_visibility_snapshots", sa.Column("ai_overview_eligible_schema", sa.Boolean(), server_default=sa.false()))
    op.add_column("ai_visibility_snapshots", sa.Column("manually_logged_cited", sa.Boolean(), server_default=sa.false()))
    # Drop the old mislabeled columns
    op.drop_column("ai_visibility_snapshots", "cited_by_chatgpt")
    op.drop_column("ai_visibility_snapshots", "cited_by_perplexity")
    op.drop_column("ai_visibility_snapshots", "cited_by_google_ai_overview")


def downgrade():
    op.add_column("ai_visibility_snapshots", sa.Column("cited_by_chatgpt", sa.Boolean(), server_default=sa.false()))
    op.add_column("ai_visibility_snapshots", sa.Column("cited_by_perplexity", sa.Boolean(), server_default=sa.false()))
    op.add_column("ai_visibility_snapshots", sa.Column("cited_by_google_ai_overview", sa.Boolean(), server_default=sa.false()))
    op.drop_column("ai_visibility_snapshots", "manually_logged_cited")
    op.drop_column("ai_visibility_snapshots", "ai_overview_eligible_schema")
    op.drop_column("ai_visibility_snapshots", "ai_crawlable_llms_txt")
