"""Add target_domain columns to backlinks and referring_domains tables.

Revision ID: 005
"""
from alembic import op
import sqlalchemy as sa

revision = "005_backlink_target_domain"
down_revision = "004_domain_tracking_foundation"
branch_labels = None
depends_on = None


def _column_exists(table, column):
    """Check if a column already exists (idempotent migration)."""
    bind = op.get_bind()
    from sqlalchemy import inspect as sa_inspect
    cols = [c["name"] for c in sa_inspect(bind).get_columns(table)]
    return column in cols


def upgrade():
    if not _column_exists("backlinks", "target_domain"):
        op.add_column("backlinks", sa.Column("target_domain", sa.String(), server_default=""))
    if not _column_exists("referring_domains", "target_domain"):
        op.add_column("referring_domains", sa.Column("target_domain", sa.String(), server_default=""))
    # Create indexes only if they don't already exist
    bind = op.get_bind()
    from sqlalchemy import inspect as sa_inspect
    ix_names = {ix["name"] for ix in sa_inspect(bind).get_indexes("backlinks") if "target_domain" in ix.get("column_names", [])}
    if "ix_backlinks_target_domain" not in ix_names:
        op.create_index("ix_backlinks_target_domain", "backlinks", ["target_domain"])
    ix_names_rd = {ix["name"] for ix in sa_inspect(bind).get_indexes("referring_domains") if "target_domain" in ix.get("column_names", [])}
    if "ix_rd_target_domain" not in ix_names_rd:
        op.create_index("ix_rd_target_domain", "referring_domains", ["target_domain"])


def downgrade():
    op.drop_index("ix_rd_target_domain", "referring_domains")
    op.drop_index("ix_backlinks_target_domain", "backlinks")
    op.drop_column("referring_domains", "target_domain")
    op.drop_column("backlinks", "target_domain")
