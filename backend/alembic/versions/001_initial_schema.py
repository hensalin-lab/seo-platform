"""initial schema — baseline with all tables and indexes

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    def if_sqlite(suffix=""):
        return "" if dialect == "sqlite" else suffix

    def if_not_exists():
        return "" if dialect == "sqlite" else ""

    def create_index_if_not_exists(name, table, columns, unique=False):
        if dialect == "sqlite":
            op.execute(f"CREATE {'UNIQUE ' if unique else ''}INDEX IF NOT EXISTS {name} ON {table} ({', '.join(columns)})")
        else:
            op.create_index(name, table, columns, unique=unique)

    # --- users ---
    op.execute(f"CREATE TABLE IF NOT EXISTS users ({if_sqlite('id VARCHAR PRIMARY KEY, ')}email VARCHAR NOT NULL, username VARCHAR NOT NULL, hashed_password VARCHAR NOT NULL, role VARCHAR DEFAULT 'VIEWER', is_active BOOLEAN DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    create_index_if_not_exists("ix_users_email", "users", ["email"], unique=True)
    create_index_if_not_exists("ix_users_username", "users", ["username"], unique=True)

    # --- api_keys ---
    op.execute("CREATE TABLE IF NOT EXISTS api_keys (id VARCHAR PRIMARY KEY, user_id VARCHAR, key VARCHAR NOT NULL, name VARCHAR DEFAULT '', is_active BOOLEAN DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_used_at DATETIME)")
    create_index_if_not_exists("ix_api_keys_key", "api_keys", ["key"], unique=True)
    create_index_if_not_exists("ix_api_keys_user_id", "api_keys", ["user_id"])

    # --- sessions ---
    op.execute("CREATE TABLE IF NOT EXISTS sessions (id VARCHAR PRIMARY KEY, user_id VARCHAR, token VARCHAR NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, ip_address VARCHAR DEFAULT '', user_agent VARCHAR DEFAULT '')")
    create_index_if_not_exists("ix_sessions_token", "sessions", ["token"], unique=True)
    create_index_if_not_exists("ix_sessions_user_id", "sessions", ["user_id"])

    # --- webhooks ---
    op.execute("CREATE TABLE IF NOT EXISTS webhooks (id VARCHAR PRIMARY KEY, user_id VARCHAR, url VARCHAR NOT NULL, events JSON DEFAULT '[]', secret VARCHAR DEFAULT '', is_active BOOLEAN DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_triggered_at DATETIME)")
    create_index_if_not_exists("ix_webhooks_user_id", "webhooks", ["user_id"])

    # --- scheduled_audits ---
    op.execute("CREATE TABLE IF NOT EXISTS scheduled_audits (id VARCHAR PRIMARY KEY, user_id VARCHAR, website_url VARCHAR NOT NULL, competitor_url VARCHAR, frequency VARCHAR DEFAULT 'weekly', next_run DATETIME, is_active BOOLEAN DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    create_index_if_not_exists("ix_scheduled_user_id", "scheduled_audits", ["user_id"])

    # --- whitelabel_settings ---
    op.execute("CREATE TABLE IF NOT EXISTS whitelabel_settings (id VARCHAR PRIMARY KEY, user_id VARCHAR, company_name VARCHAR DEFAULT '', logo_url VARCHAR DEFAULT '', primary_color VARCHAR DEFAULT '#3B82F6', secondary_color VARCHAR DEFAULT '#1E293B', custom_domain VARCHAR DEFAULT '', is_active BOOLEAN DEFAULT 0)")
    create_index_if_not_exists("ix_wl_user_id", "whitelabel_settings", ["user_id"])

    # --- audits ---
    op.execute("CREATE TABLE IF NOT EXISTS audits (id VARCHAR PRIMARY KEY, website_url VARCHAR NOT NULL, competitor_url VARCHAR, gsc_property VARCHAR, ga_property VARCHAR, status VARCHAR DEFAULT 'QUEUED', progress INTEGER DEFAULT 0, current_step VARCHAR DEFAULT '', error_message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, completed_at DATETIME, user_id VARCHAR)")
    create_index_if_not_exists("ix_audits_status", "audits", ["status"])
    create_index_if_not_exists("ix_audits_created_at", "audits", ["created_at"])

    # --- audit_scores ---
    op.execute("CREATE TABLE IF NOT EXISTS audit_scores (id VARCHAR PRIMARY KEY, audit_id VARCHAR, overall_score FLOAT DEFAULT 0.0, seo_score FLOAT DEFAULT 0.0, technical_score FLOAT DEFAULT 0.0, aeo_score FLOAT DEFAULT 0.0, geo_score FLOAT DEFAULT 0.0, content_score FLOAT DEFAULT 0.0, ai_visibility_score FLOAT DEFAULT 0.0, signals JSON DEFAULT '{}')")
    create_index_if_not_exists("ix_audit_scores_audit_id", "audit_scores", ["audit_id"])

    # --- pages ---
    op.execute("CREATE TABLE IF NOT EXISTS pages (id VARCHAR PRIMARY KEY, audit_id VARCHAR, url VARCHAR NOT NULL, status_code INTEGER DEFAULT 0, title TEXT DEFAULT '', meta_description TEXT DEFAULT '', canonical VARCHAR DEFAULT '', h1 TEXT DEFAULT '', content_text TEXT DEFAULT '', word_count INTEGER DEFAULT 0, html_raw TEXT DEFAULT '', headers JSON DEFAULT '[]', images JSON DEFAULT '[]', links_internal JSON DEFAULT '[]', links_external JSON DEFAULT '[]', schema_markup JSON DEFAULT '[]', open_graph JSON DEFAULT '{}', twitter_card JSON DEFAULT '{}', crawl_depth INTEGER DEFAULT 0, response_time_ms INTEGER DEFAULT 0, content_hash VARCHAR DEFAULT '', page_type VARCHAR DEFAULT 'UNKNOWN', context_issues JSON DEFAULT '[]', signals JSON DEFAULT '{}', snapshot_hash VARCHAR DEFAULT '')")
    create_index_if_not_exists("ix_pages_audit_id", "pages", ["audit_id"])
    create_index_if_not_exists("ix_pages_url", "pages", ["url"])
    create_index_if_not_exists("ix_pages_page_type", "pages", ["page_type"])
    create_index_if_not_exists("ix_pages_audit_url", "pages", ["audit_id", "url"])
    create_index_if_not_exists("ix_pages_word_count", "pages", ["word_count"])
    create_index_if_not_exists("ix_pages_content_hash", "pages", ["content_hash"])

    # --- issues ---
    op.execute("CREATE TABLE IF NOT EXISTS issues (id VARCHAR PRIMARY KEY, audit_id VARCHAR, page_url VARCHAR DEFAULT '', category VARCHAR DEFAULT '', severity VARCHAR DEFAULT 'LOW', signal_id INTEGER DEFAULT 0, signal_name VARCHAR DEFAULT '', description TEXT DEFAULT '', impact TEXT DEFAULT '', fix TEXT DEFAULT '', effort VARCHAR DEFAULT 'MEDIUM', root_cause TEXT DEFAULT '', fix_code VARCHAR DEFAULT '', snapshot_hash VARCHAR DEFAULT '', pages_affected INTEGER DEFAULT 1, detected_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    create_index_if_not_exists("ix_issues_audit_id", "issues", ["audit_id"])
    create_index_if_not_exists("ix_issues_page_url", "issues", ["page_url"])
    create_index_if_not_exists("ix_issues_category", "issues", ["category"])
    create_index_if_not_exists("ix_issues_severity", "issues", ["severity"])
    create_index_if_not_exists("ix_issues_audit_severity", "issues", ["audit_id", "severity"])

    # --- recommendations ---
    op.execute("CREATE TABLE IF NOT EXISTS recommendations (id VARCHAR PRIMARY KEY, audit_id VARCHAR, page_url VARCHAR DEFAULT '', category VARCHAR DEFAULT '', priority VARCHAR DEFAULT 'LOW', issue TEXT DEFAULT '', current_problem TEXT DEFAULT '', why_it_matters TEXT DEFAULT '', exact_fix TEXT DEFAULT '', before_example TEXT DEFAULT '', after_example TEXT DEFAULT '', suggested_content TEXT DEFAULT '', suggested_heading TEXT DEFAULT '', keywords JSON DEFAULT '[]', entities JSON DEFAULT '[]', schema_recommendation JSON DEFAULT '{}', expected_impact VARCHAR DEFAULT '', difficulty VARCHAR DEFAULT '', ai_generated INTEGER DEFAULT 0)")
    create_index_if_not_exists("ix_recs_audit_id", "recommendations", ["audit_id"])
    create_index_if_not_exists("ix_recs_page_url", "recommendations", ["page_url"])
    create_index_if_not_exists("ix_recs_priority", "recommendations", ["priority"])

    # --- competitor_data ---
    op.execute("CREATE TABLE IF NOT EXISTS competitor_data (id VARCHAR PRIMARY KEY, audit_id VARCHAR, competitor_url VARCHAR DEFAULT '', keyword_opportunities JSON DEFAULT '[]', content_opportunities JSON DEFAULT '[]', entity_gaps JSON DEFAULT '[]', topic_gaps JSON DEFAULT '[]', seo_comparison JSON DEFAULT '{}', ai_visibility_comparison JSON DEFAULT '{}', strengths JSON DEFAULT '[]', weaknesses JSON DEFAULT '[]', winning_strategy JSON DEFAULT '[]', backlink_gap JSON DEFAULT '[]', serp_gap JSON DEFAULT '[]')")
    create_index_if_not_exists("ix_comp_data_audit_id", "competitor_data", ["audit_id"])

    # --- roadmap_items ---
    op.execute("CREATE TABLE IF NOT EXISTS roadmap_items (id VARCHAR PRIMARY KEY, audit_id VARCHAR, phase VARCHAR DEFAULT '', task TEXT DEFAULT '', category VARCHAR DEFAULT '', priority VARCHAR DEFAULT 'MEDIUM', page VARCHAR DEFAULT '', impact TEXT DEFAULT '', fix TEXT DEFAULT '', details JSON DEFAULT '[]', keywords JSON DEFAULT '[]')")
    create_index_if_not_exists("ix_roadmap_audit_id", "roadmap_items", ["audit_id"])

    # --- keyword_data ---
    op.execute("CREATE TABLE IF NOT EXISTS keyword_data (id VARCHAR PRIMARY KEY, audit_id VARCHAR, top_keywords JSON DEFAULT '[]', keyword_density JSON DEFAULT '[]', keyword_clusters JSON DEFAULT '[]', missing_keywords JSON DEFAULT '[]', keyword_opportunities JSON DEFAULT '[]', content_gaps JSON DEFAULT '[]')")
    create_index_if_not_exists("ix_kw_data_audit_id", "keyword_data", ["audit_id"])

    # --- content_data ---
    op.execute("CREATE TABLE IF NOT EXISTS content_data (id VARCHAR PRIMARY KEY, audit_id VARCHAR, content_quality JSON DEFAULT '[]', content_gaps JSON DEFAULT '[]', topic_authority JSON DEFAULT '{}', content_recommendations JSON DEFAULT '[]', search_intent JSON DEFAULT '[]', entity_analysis JSON DEFAULT '{}')")
    create_index_if_not_exists("ix_content_data_audit_id", "content_data", ["audit_id"])

    # --- ai_visibility_data ---
    op.execute("CREATE TABLE IF NOT EXISTS ai_visibility_data (id VARCHAR PRIMARY KEY, audit_id VARCHAR, chatgpt_visibility FLOAT DEFAULT 0.0, gemini_visibility FLOAT DEFAULT 0.0, perplexity_visibility FLOAT DEFAULT 0.0, citation_opportunities JSON DEFAULT '[]', ai_recommendations JSON DEFAULT '[]', geo_score FLOAT DEFAULT 0.0, aeo_score FLOAT DEFAULT 0.0)")
    create_index_if_not_exists("ix_ai_vis_data_audit_id", "ai_visibility_data", ["audit_id"])

    # --- audit_history ---
    op.execute("CREATE TABLE IF NOT EXISTS audit_history (id VARCHAR PRIMARY KEY, audit_id VARCHAR, website_url VARCHAR DEFAULT '', competitor_url VARCHAR DEFAULT '', overall_score FLOAT DEFAULT 0.0, seo_score FLOAT DEFAULT 0.0, aeo_score FLOAT DEFAULT 0.0, geo_score FLOAT DEFAULT 0.0, ai_score FLOAT DEFAULT 0.0, total_pages INTEGER DEFAULT 0, total_issues INTEGER DEFAULT 0, status VARCHAR DEFAULT 'COMPLETED', linter_warnings INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    create_index_if_not_exists("ix_history_created_at", "audit_history", ["created_at"])
    create_index_if_not_exists("ix_history_website_url", "audit_history", ["website_url"])

    # --- audit_linter_results ---
    op.execute("CREATE TABLE IF NOT EXISTS audit_linter_results (id VARCHAR PRIMARY KEY, audit_id VARCHAR, passed INTEGER DEFAULT 0, failed INTEGER DEFAULT 0, details JSON DEFAULT '[]', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    create_index_if_not_exists("ix_linter_audit_id", "audit_linter_results", ["audit_id"])

    # --- page_analysis_records ---
    op.execute("CREATE TABLE IF NOT EXISTS page_analysis_records (id VARCHAR PRIMARY KEY, audit_id VARCHAR, page_url VARCHAR DEFAULT '', scores JSON DEFAULT '{}', issue_count INTEGER DEFAULT 0, signal_count INTEGER DEFAULT 0, issues JSON DEFAULT '[]', recommendations JSON DEFAULT '[]')")
    create_index_if_not_exists("ix_par_audit_id", "page_analysis_records", ["audit_id"])
    create_index_if_not_exists("ix_par_page_url", "page_analysis_records", ["page_url"])

    # --- keyword_records ---
    op.execute("CREATE TABLE IF NOT EXISTS keyword_records (id VARCHAR PRIMARY KEY, audit_id VARCHAR, keyword VARCHAR DEFAULT '', frequency INTEGER DEFAULT 0, opportunity VARCHAR DEFAULT '', action VARCHAR DEFAULT '')")
    create_index_if_not_exists("ix_kw_audit_id", "keyword_records", ["audit_id"])
    create_index_if_not_exists("ix_kw_keyword", "keyword_records", ["keyword"])

    # --- roadmap_records ---
    op.execute("CREATE TABLE IF NOT EXISTS roadmap_records (id VARCHAR PRIMARY KEY, audit_id VARCHAR, immediate JSON DEFAULT '[]', week1 JSON DEFAULT '[]', month1 JSON DEFAULT '[]', month3 JSON DEFAULT '[]')")
    create_index_if_not_exists("ix_roadmap_rec_audit_id", "roadmap_records", ["audit_id"])

    # --- chat_messages ---
    op.execute("CREATE TABLE IF NOT EXISTS chat_messages (id VARCHAR PRIMARY KEY, audit_id VARCHAR, role VARCHAR DEFAULT 'user', content TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    create_index_if_not_exists("ix_chat_audit_id", "chat_messages", ["audit_id"])


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS chat_messages")
    op.execute("DROP TABLE IF EXISTS roadmap_records")
    op.execute("DROP TABLE IF EXISTS keyword_records")
    op.execute("DROP TABLE IF EXISTS page_analysis_records")
    op.execute("DROP TABLE IF EXISTS audit_linter_results")
    op.execute("DROP TABLE IF EXISTS audit_history")
    op.execute("DROP TABLE IF EXISTS ai_visibility_data")
    op.execute("DROP TABLE IF EXISTS content_data")
    op.execute("DROP TABLE IF EXISTS keyword_data")
    op.execute("DROP TABLE IF EXISTS roadmap_items")
    op.execute("DROP TABLE IF EXISTS competitor_data")
    op.execute("DROP TABLE IF EXISTS recommendations")
    op.execute("DROP TABLE IF EXISTS issues")
    op.execute("DROP TABLE IF EXISTS pages")
    op.execute("DROP TABLE IF EXISTS audit_scores")
    op.execute("DROP TABLE IF EXISTS audits")
    op.execute("DROP TABLE IF EXISTS whitelabel_settings")
    op.execute("DROP TABLE IF EXISTS scheduled_audits")
    op.execute("DROP TABLE IF EXISTS webhooks")
    op.execute("DROP TABLE IF EXISTS sessions")
    op.execute("DROP TABLE IF EXISTS api_keys")
    op.execute("DROP TABLE IF EXISTS users")
