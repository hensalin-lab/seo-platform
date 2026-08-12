"""audit_snapshots — per-run score snapshot table for historical trends

Revision ID: 002_audit_snapshots
Revises: 001_initial
Create Date: 2026-01-01
"""
from typing import Sequence, Union
from alembic import op

revision: str = '002_audit_snapshots'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    op.execute("CREATE TABLE IF NOT EXISTS audit_snapshots ("
               "id VARCHAR PRIMARY KEY, "
               "audit_id VARCHAR UNIQUE, "
               "website_url VARCHAR DEFAULT '', "
               "overall_score FLOAT DEFAULT 0.0, "
               "seo_score FLOAT DEFAULT 0.0, "
               "technical_score FLOAT DEFAULT 0.0, "
               "aeo_score FLOAT DEFAULT 0.0, "
               "geo_score FLOAT DEFAULT 0.0, "
               "content_score FLOAT DEFAULT 0.0, "
               "ai_visibility_score FLOAT DEFAULT 0.0, "
               "total_pages INTEGER DEFAULT 0, "
               "total_issues INTEGER DEFAULT 0, "
               "snapshot_type VARCHAR DEFAULT 'initial', "
               "created_at DATETIME DEFAULT CURRENT_TIMESTAMP)")

    def create_index_if_not_exists(name, table, columns):
        if dialect == "sqlite":
            op.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({', '.join(columns)})")
        else:
            op.create_index(name, table, columns)

    create_index_if_not_exists("ix_snapshots_website_url", "audit_snapshots", ["website_url"])
    create_index_if_not_exists("ix_snapshots_website_created", "audit_snapshots", ["website_url", "created_at"])
    create_index_if_not_exists("ix_snapshots_audit_id", "audit_snapshots", ["audit_id"])


def downgrade() -> None:
    op.drop_index("ix_snapshots_audit_id", table_name="audit_snapshots")
    op.drop_index("ix_snapshots_website_created", table_name="audit_snapshots")
    op.drop_index("ix_snapshots_website_url", table_name="audit_snapshots")
    op.execute("DROP TABLE IF EXISTS audit_snapshots")
