revision = "008_page_keywords"
down_revision = "007_keyword_universe"
branch_labels = None
depends_on = None

"""Attribute every keyword to the page it belongs to.

The keyword universe used to be pooled across the whole crawl, so the list a
user saw was site vocabulary ("Backlinks", "Marketing") rather than anything to
do with the page they were looking at. Adding page_url makes the attribution
explicit and queryable, which is what the per-page keyword view needs.
"""

from alembic import op
import sqlalchemy as sa

COL = "page_url"


def upgrade():
    with op.batch_alter_table("keyword_records") as batch:
        batch.add_column(sa.Column(COL, sa.String(length=1000), nullable=True))
    op.create_index("ix_kw_page_url", "keyword_records", [COL])
    op.create_index("ix_kw_audit_page", "keyword_records", ["audit_id", COL])


def downgrade():
    op.drop_index("ix_kw_audit_page", table_name="keyword_records")
    op.drop_index("ix_kw_page_url", table_name="keyword_records")
    with op.batch_alter_table("keyword_records") as batch:
        batch.drop_column(COL)