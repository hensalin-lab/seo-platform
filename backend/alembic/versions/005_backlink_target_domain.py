"""Add target_domain columns to backlinks and referring_domains tables.

Revision ID: 005
"""
from alembic import op
import sqlalchemy as sa

revision = "005_backlink_target_domain"
down_revision = "004_domain_tracking_foundation"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("backlinks", sa.Column("target_domain", sa.String(), server_default=""))
    op.add_column("referring_domains", sa.Column("target_domain", sa.String(), server_default=""))
    op.create_index("ix_backlinks_target_domain", "backlinks", ["target_domain"])
    op.create_index("ix_rd_target_domain", "referring_domains", ["target_domain"])


def downgrade():
    op.drop_index("ix_rd_target_domain", "referring_domains")
    op.drop_index("ix_backlinks_target_domain", "backlinks")
    op.drop_column("referring_domains", "target_domain")
    op.drop_column("backlinks", "target_domain")
