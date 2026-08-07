import datetime as _dt
import uuid as _uuid
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey, JSON, Boolean, Index
from sqlalchemy.orm import relationship
from app.database import Base
import enum


def generate_uuid():
    return str(_uuid.uuid4())


class AuditStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    CRAWLING = "CRAWLING"
    SITEMAP_ANALYSIS = "SITEMAP_ANALYSIS"
    SEO_ANALYSIS = "SEO_ANALYSIS"
    TECHNICAL_ANALYSIS = "TECHNICAL_ANALYSIS"
    AEO_ANALYSIS = "AEO_ANALYSIS"
    GEO_ANALYSIS = "GEO_ANALYSIS"
    CONTENT_ANALYSIS = "CONTENT_ANALYSIS"
    KEYWORD_ANALYSIS = "KEYWORD_ANALYSIS"
    COMPETITOR_ANALYSIS = "COMPETITOR_ANALYSIS"
    AI_ANALYSIS = "AI_ANALYSIS"
    ROADMAP_GENERATION = "ROADMAP_GENERATION"
    REPORT_GENERATION = "REPORT_GENERATION"
    REPORT_QA = "REPORT_QA"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Audit(Base):
    __tablename__ = "audits"
    __table_args__ = (
        Index("ix_audits_status", "status"),
        Index("ix_audits_created_at", "created_at"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    website_url = Column(String, nullable=False)
    competitor_url = Column(String, nullable=True)
    gsc_property = Column(String, nullable=True)
    ga_property = Column(String, nullable=True)
    status = Column(String, default=AuditStatus.QUEUED.value)
    progress = Column(Integer, default=0)
    current_step = Column(String, default="")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    pages = relationship("Page", back_populates="audit", cascade="all, delete-orphan")
    issues = relationship("Issue", back_populates="audit", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="audit", cascade="all, delete-orphan")
    competitor = relationship("CompetitorData", back_populates="audit", uselist=False, cascade="all, delete-orphan")
    scores = relationship("AuditScore", back_populates="audit", uselist=False, cascade="all, delete-orphan")
    roadmap = relationship("RoadmapItem", back_populates="audit", cascade="all, delete-orphan")
    keyword_data = relationship("KeywordData", back_populates="audit", uselist=False, cascade="all, delete-orphan")
    content_data = relationship("ContentData", back_populates="audit", uselist=False, cascade="all, delete-orphan")
    ai_visibility_data = relationship("AIVisibilityData", back_populates="audit", uselist=False, cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="audit", cascade="all, delete-orphan")
    backlinks = relationship("Backlink", back_populates="audit", cascade="all, delete-orphan")
    referring_domains = relationship("ReferringDomain", back_populates="audit", cascade="all, delete-orphan")
    core_web_vitals = relationship("CoreWebVitals", back_populates="audit", cascade="all, delete-orphan")


class AuditScore(Base):
    __tablename__ = "audit_scores"
    __table_args__ = (
        Index("ix_audit_scores_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"), unique=True)
    overall_score = Column(Float, default=0.0)
    seo_score = Column(Float, default=0.0)
    technical_score = Column(Float, default=0.0)
    aeo_score = Column(Float, default=0.0)
    geo_score = Column(Float, default=0.0)
    content_score = Column(Float, default=0.0)
    ai_visibility_score = Column(Float, default=0.0)
    signals = Column(JSON, default=dict)
    audit = relationship("Audit", back_populates="scores")


class Page(Base):
    __tablename__ = "pages"
    __table_args__ = (
        Index("ix_pages_audit_id", "audit_id"),
        Index("ix_pages_url", "url"),
        Index("ix_pages_page_type", "page_type"),
        Index("ix_pages_audit_url", "audit_id", "url"),
        Index("ix_pages_word_count", "word_count"),
        Index("ix_pages_content_hash", "content_hash"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    url = Column(String, nullable=False)
    status_code = Column(Integer, default=0)
    title = Column(Text, default="")
    meta_description = Column(Text, default="")
    canonical = Column(String, default="")
    h1 = Column(Text, default="")
    content_text = Column(Text, default="")
    word_count = Column(Integer, default=0)
    html_raw = Column(Text, default="")
    headers = Column(JSON, default=list)
    images = Column(JSON, default=list)
    links_internal = Column(JSON, default=list)
    links_external = Column(JSON, default=list)
    schema_markup = Column(JSON, default=list)
    open_graph = Column(JSON, default=dict)
    twitter_card = Column(JSON, default=dict)
    crawl_depth = Column(Integer, default=0)
    response_time_ms = Column(Integer, default=0)
    content_hash = Column(String, default="")
    page_type = Column(String, default="UNKNOWN")
    context_issues = Column(JSON, default=list)
    signals = Column(JSON, default=dict)
    snapshot_hash = Column(String, default="")
    audit = relationship("Audit", back_populates="pages")


class Issue(Base):
    __tablename__ = "issues"
    __table_args__ = (
        Index("ix_issues_audit_id", "audit_id"),
        Index("ix_issues_page_url", "page_url"),
        Index("ix_issues_category", "category"),
        Index("ix_issues_severity", "severity"),
        Index("ix_issues_audit_severity", "audit_id", "severity"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    page_url = Column(String, default="")
    category = Column(String, default="")
    severity = Column(String, default="LOW")
    signal_id = Column(Integer, default=0)
    signal_name = Column(String, default="")
    description = Column(Text, default="")
    impact = Column(Text, default="")
    fix = Column(Text, default="")
    effort = Column(String, default="MEDIUM")
    root_cause = Column(Text, default="")
    fix_code = Column(String, default="")
    ai_generated = Column(Integer, default=0)
    ai_why = Column(Text, default="")
    ai_impact_pct = Column(Integer, default=0)
    ai_confidence = Column(Integer, default=0)
    snapshot_hash = Column(String, default="")
    pages_affected = Column(Integer, default=1)
    detected_at = Column(DateTime, default=_dt.datetime.utcnow)
    why_it_matters = Column(Text, default="")
    business_impact = Column(Text, default="")
    expected_improvement = Column(String, default="")
    confidence_basis = Column(String, default="")
    dependencies = Column(JSON, default=list)
    estimated_time_minutes = Column(Integer, default=0)
    framework_snippets = Column(JSON, default=dict)
    source_model = Column(String, default="")
    status = Column(String, default="open")
    last_checked = Column(DateTime, default=_dt.datetime.utcnow, onupdate=_dt.datetime.utcnow)
    audit = relationship("Audit", back_populates="issues")

    def to_business_schema(self):
        return {
            "issue_name": self.signal_name,
            "severity": self.severity,
            "category": self.category,
            "what_is_wrong": self.description,
            "root_cause": self.root_cause or "detected by rule-based analysis (platform-agnostic)",
            "impact": self.impact,
            "exact_pages_affected": self.pages_affected or 1,
            "exact_fix": self.fix,
            "effort": self.effort or "MEDIUM",
            "fix_code": self.fix_code or f"FIX-{self.signal_id:04d}",
        }


class Recommendation(Base):
    __tablename__ = "recommendations"
    __table_args__ = (
        Index("ix_recs_audit_id", "audit_id"),
        Index("ix_recs_page_url", "page_url"),
        Index("ix_recs_priority", "priority"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    page_url = Column(String, default="")
    category = Column(String, default="")
    priority = Column(String, default="LOW")
    issue = Column(Text, default="")
    current_problem = Column(Text, default="")
    why_it_matters = Column(Text, default="")
    exact_fix = Column(Text, default="")
    before_example = Column(Text, default="")
    after_example = Column(Text, default="")
    suggested_content = Column(Text, default="")
    suggested_heading = Column(Text, default="")
    keywords = Column(JSON, default=list)
    entities = Column(JSON, default=list)
    schema_recommendation = Column(JSON, default=dict)
    expected_impact = Column(String, default="")
    difficulty = Column(String, default="")
    ai_generated = Column(Integer, default=0)
    audit = relationship("Audit", back_populates="recommendations")


class CompetitorData(Base):
    __tablename__ = "competitor_data"
    __table_args__ = (
        Index("ix_comp_data_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"), unique=True)
    competitor_url = Column(String, default="")
    keyword_opportunities = Column(JSON, default=list)
    content_opportunities = Column(JSON, default=list)
    entity_gaps = Column(JSON, default=list)
    topic_gaps = Column(JSON, default=list)
    seo_comparison = Column(JSON, default=dict)
    ai_visibility_comparison = Column(JSON, default=dict)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    winning_strategy = Column(JSON, default=list)
    backlink_gap = Column(JSON, default=list)
    serp_gap = Column(JSON, default=list)
    audit = relationship("Audit", back_populates="competitor")


class RoadmapItem(Base):
    __tablename__ = "roadmap_items"
    __table_args__ = (
        Index("ix_roadmap_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    phase = Column(String, default="")
    task = Column(Text, default="")
    category = Column(String, default="")
    priority = Column(String, default="MEDIUM")
    page = Column(String, default="")
    impact = Column(Text, default="")
    fix = Column(Text, default="")
    details = Column(JSON, default=list)
    keywords = Column(JSON, default=list)
    audit = relationship("Audit", back_populates="roadmap")


class KeywordData(Base):
    __tablename__ = "keyword_data"
    __table_args__ = (
        Index("ix_kw_data_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"), unique=True)
    top_keywords = Column(JSON, default=list)
    keyword_density = Column(JSON, default=list)
    keyword_clusters = Column(JSON, default=list)
    missing_keywords = Column(JSON, default=list)
    keyword_opportunities = Column(JSON, default=list)
    content_gaps = Column(JSON, default=list)
    audit = relationship("Audit", back_populates="keyword_data")


class ContentData(Base):
    __tablename__ = "content_data"
    __table_args__ = (
        Index("ix_content_data_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"), unique=True)
    content_quality = Column(JSON, default=list)
    content_gaps = Column(JSON, default=list)
    topic_authority = Column(JSON, default=dict)
    content_recommendations = Column(JSON, default=list)
    search_intent = Column(JSON, default=list)
    entity_analysis = Column(JSON, default=dict)
    audit = relationship("Audit", back_populates="content_data")


class AIVisibilityData(Base):
    __tablename__ = "ai_visibility_data"
    __table_args__ = (
        Index("ix_ai_vis_data_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"), unique=True)
    chatgpt_visibility = Column(Float, default=0.0)
    gemini_visibility = Column(Float, default=0.0)
    perplexity_visibility = Column(Float, default=0.0)
    citation_opportunities = Column(JSON, default=list)
    ai_recommendations = Column(JSON, default=list)
    geo_score = Column(Float, default=0.0)
    aeo_score = Column(Float, default=0.0)
    audit = relationship("Audit", back_populates="ai_visibility_data")


class AuditHistory(Base):
    __tablename__ = "audit_history"
    __table_args__ = (
        Index("ix_history_created_at", "created_at"),
        Index("ix_history_website_url", "website_url"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, unique=True)
    website_url = Column(String, default="")
    competitor_url = Column(String, default="")
    overall_score = Column(Float, default=0.0)
    seo_score = Column(Float, default=0.0)
    aeo_score = Column(Float, default=0.0)
    geo_score = Column(Float, default=0.0)
    ai_score = Column(Float, default=0.0)
    total_pages = Column(Integer, default=0)
    total_issues = Column(Integer, default=0)
    status = Column(String, default="COMPLETED")
    linter_warnings = Column(Integer, default=0)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class AuditLinterResult(Base):
    __tablename__ = "audit_linter_results"
    __table_args__ = (
        Index("ix_linter_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    passed = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    details = Column(JSON, default=list)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class PageAnalysisRecord(Base):
    __tablename__ = "page_analysis_records"
    __table_args__ = (
        Index("ix_par_audit_id", "audit_id"),
        Index("ix_par_page_url", "page_url"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    page_url = Column(String, default="")
    scores = Column(JSON, default=dict)
    issue_count = Column(Integer, default=0)
    signal_count = Column(Integer, default=0)
    issues = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)


class KeywordRecord(Base):
    __tablename__ = "keyword_records"
    __table_args__ = (
        Index("ix_kw_audit_id", "audit_id"),
        Index("ix_kw_keyword", "keyword"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    keyword = Column(String, default="")
    frequency = Column(Integer, default=0)
    opportunity = Column(String, default="")
    action = Column(String, default="")


class RoadmapRecord(Base):
    __tablename__ = "roadmap_records"
    __table_args__ = (
        Index("ix_roadmap_rec_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"), unique=True)
    immediate = Column(JSON, default=list)
    week1 = Column(JSON, default=list)
    month1 = Column(JSON, default=list)
    month3 = Column(JSON, default=list)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (
        Index("ix_chat_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    role = Column(String, default="user")
    content = Column(Text, default="")
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    audit = relationship("Audit", back_populates="chat_messages")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_email", "email", unique=True),
        Index("ix_users_username", "username", unique=True),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="VIEWER")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    updated_at = Column(DateTime, default=_dt.datetime.utcnow, onupdate=_dt.datetime.utcnow)
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    webhooks = relationship("Webhook", back_populates="user", cascade="all, delete-orphan")
    scheduled_audits = relationship("ScheduledAudit", back_populates="user", cascade="all, delete-orphan")
    white_label = relationship("WhiteLabelSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")


class APIKey(Base):
    __tablename__ = "api_keys"
    __table_args__ = (
        Index("ix_api_keys_key", "key", unique=True),
        Index("ix_api_keys_user_id", "user_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    key = Column(String, unique=True, nullable=False)
    name = Column(String, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    user = relationship("User", back_populates="api_keys")


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        Index("ix_sessions_token", "token", unique=True),
        Index("ix_sessions_user_id", "user_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    token = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    ip_address = Column(String, default="")
    user_agent = Column(String, default="")
    user = relationship("User", back_populates="sessions")


class Webhook(Base):
    __tablename__ = "webhooks"
    __table_args__ = (
        Index("ix_webhooks_user_id", "user_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    url = Column(String, nullable=False)
    events = Column(JSON, default=list)
    secret = Column(String, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    last_triggered_at = Column(DateTime, nullable=True)
    user = relationship("User", back_populates="webhooks")


class ScheduledAudit(Base):
    __tablename__ = "scheduled_audits"
    __table_args__ = (
        Index("ix_scheduled_user_id", "user_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    website_url = Column(String, nullable=False)
    competitor_url = Column(String, nullable=True)
    frequency = Column(String, default="weekly")
    next_run = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    user = relationship("User", back_populates="scheduled_audits")


class WhiteLabelSettings(Base):
    __tablename__ = "whitelabel_settings"
    __table_args__ = (
        Index("ix_wl_user_id", "user_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    company_name = Column(String, default="")
    logo_url = Column(String, default="")
    primary_color = Column(String, default="#3B82F6")
    secondary_color = Column(String, default="#1E293B")
    custom_domain = Column(String, default="")
    is_active = Column(Boolean, default=False)
    user = relationship("User", back_populates="white_label")


class GSCSettings(Base):
    __tablename__ = "gsc_settings"
    __table_args__ = (
        Index("ix_gsc_settings_user_id", "user_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    service_account_json = Column(Text, default="")
    property_url = Column(String, default="")
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    updated_at = Column(DateTime, default=_dt.datetime.utcnow, onupdate=_dt.datetime.utcnow)


class DigestPreference(Base):
    __tablename__ = "digest_preferences"
    __table_args__ = (
        Index("ix_digest_prefs_user_id", "user_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    enabled = Column(Boolean, default=True)
    frequency = Column(String, default="weekly")
    last_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class Backlink(Base):
    __tablename__ = "backlinks"
    __table_args__ = (
        Index("ix_backlinks_audit_id", "audit_id"),
        Index("ix_backlinks_target", "target_url"),
        Index("ix_backlinks_source", "source_domain"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    source_url = Column(String, default="")
    source_domain = Column(String, default="")
    target_url = Column(String, default="")
    anchor_text = Column(Text, default="")
    is_follow = Column(Boolean, default=True)
    first_seen = Column(DateTime, default=_dt.datetime.utcnow)
    last_seen = Column(DateTime, default=_dt.datetime.utcnow)
    dofollow_density = Column(Float, default=0.0)
    domain_authority = Column(Float, default=0.0)
    toxic_score = Column(Float, default=0.0)
    audit = relationship("Audit")


class ReferringDomain(Base):
    __tablename__ = "referring_domains"
    __table_args__ = (
        Index("ix_rd_audit_id", "audit_id"),
        Index("ix_rd_domain", "domain"),
        Index("ix_rd_audit_domain", "audit_id", "domain"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    domain = Column(String, default="")
    link_count = Column(Integer, default=0)
    domain_authority = Column(Float, default=0.0)
    toxic_score = Column(Float, default=0.0)
    first_seen = Column(DateTime, default=_dt.datetime.utcnow)
    last_seen = Column(DateTime, default=_dt.datetime.utcnow)
    audit = relationship("Audit")


class FixAction(Base):
    __tablename__ = "fix_actions"
    __table_args__ = (
        Index("ix_fix_actions_audit_id", "audit_id"),
        Index("ix_fix_actions_issue_id", "issue_id"),
        Index("ix_fix_actions_page_url", "page_url"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"), nullable=False)
    issue_id = Column(String, default="")
    page_url = Column(String, default="")
    signal_name = Column(String, default="")
    category = Column(String, default="")
    severity = Column(String, default="LOW")
    applied_at = Column(DateTime, default=_dt.datetime.utcnow)
    audit = relationship("Audit")


class CoreWebVitals(Base):
    __tablename__ = "core_web_vitals"
    __table_args__ = (
        Index("ix_cwv_audit_id", "audit_id"),
        Index("ix_cwv_url", "url"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    url = Column(String, default="")
    strategy = Column(String, default="mobile")
    lcp_ms = Column(Float, nullable=True)
    cls = Column(Float, nullable=True)
    inp_ms = Column(Float, nullable=True)
    fcp_ms = Column(Float, nullable=True)
    ttfb_ms = Column(Float, nullable=True)
    performance_score = Column(Float, default=0.0)
    field_data = Column(JSON, default=dict)
    lab_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    audit = relationship("Audit")


class RankPosition(Base):
    __tablename__ = "rank_positions"
    __table_args__ = (
        Index("ix_rank_audit_id", "audit_id"),
        Index("ix_rank_keyword", "keyword"),
        Index("ix_rank_audit_keyword", "audit_id", "keyword"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"), nullable=False)
    keyword = Column(String, default="")
    position = Column(Integer, nullable=True)
    previous_position = Column(Integer, nullable=True)
    page_url = Column(String, default="")
    source = Column(String, default="estimated")  # live | estimated
    captured_at = Column(DateTime, default=_dt.datetime.utcnow)
    audit = relationship("Audit")


class ProgrammaticTemplate(Base):
    __tablename__ = "programmatic_templates"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    audit_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    base_url = Column(String, default="")
    url_pattern = Column(String, default="")
    title_template = Column(Text, default="")
    meta_template = Column(Text, default="")
    h1_template = Column(Text, default="")
    sections = Column(JSON, default=list)
    schema_type = Column(String, default="Article")
    schema_fields = Column(JSON, default=dict)
    faq_enabled = Column(Boolean, default=False)
    faq_section = Column(JSON, default=list)
    min_words_target = Column(Integer, default=800)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    updated_at = Column(DateTime, default=_dt.datetime.utcnow, onupdate=_dt.datetime.utcnow)


class ProgrammaticEntry(Base):
    __tablename__ = "programmatic_entries"
    id = Column(String, primary_key=True, default=generate_uuid)
    template_id = Column(String, ForeignKey("programmatic_templates.id"), index=True)
    user_id = Column(String, index=True)
    data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class ProgrammaticPage(Base):
    __tablename__ = "programmatic_pages"
    __table_args__ = (
        Index("ix_programmatic_pages_url", "url"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    template_id = Column(String, ForeignKey("programmatic_templates.id"), index=True)
    entry_id = Column(String, nullable=True)
    user_id = Column(String, index=True)
    url = Column(String, nullable=False)
    slug = Column(String, default="")
    title = Column(Text, default="")
    meta_description = Column(Text, default="")
    h1 = Column(Text, default="")
    sections = Column(JSON, default=list)
    faq = Column(JSON, default=list)
    schema_markup = Column(JSON, default=list)
    internal_links = Column(JSON, default=list)
    word_count = Column(Integer, default=0)
    warnings = Column(JSON, default=list)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class Workspace(Base):
    __tablename__ = "workspaces"
    __table_args__ = (
        Index("ix_workspaces_user_id", "user_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    audit_links = relationship("WorkspaceAudit", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (
        Index("ix_ws_members_workspace_id", "workspace_id"),
        Index("ix_ws_members_user_id", "user_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"))
    user_id = Column(String, ForeignKey("users.id"))
    role = Column(String, default="viewer")  # owner | editor | viewer
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    workspace = relationship("Workspace", back_populates="members")


class WorkspaceAudit(Base):
    __tablename__ = "workspace_audits"
    __table_args__ = (
        Index("ix_ws_audits_workspace_id", "workspace_id"),
        Index("ix_ws_audits_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"))
    audit_id = Column(String, ForeignKey("audits.id"))
    added_at = Column(DateTime, default=_dt.datetime.utcnow)
    workspace = relationship("Workspace", back_populates="audit_links")


class UptimeTarget(Base):
    __tablename__ = "uptime_targets"
    __table_args__ = (
        Index("ix_uptime_user_id", "user_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String, default="")
    url = Column(String, nullable=False)
    interval_minutes = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    last_checked_at = Column(DateTime, nullable=True)
    last_status_code = Column(Integer, nullable=True)
    last_is_up = Column(Boolean, nullable=True)
    checks = relationship("UptimeCheck", back_populates="target", cascade="all, delete-orphan")


class UptimeCheck(Base):
    __tablename__ = "uptime_checks"
    __table_args__ = (
        Index("ix_uptime_checks_target_id", "target_id"),
        Index("ix_uptime_checks_checked_at", "checked_at"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    target_id = Column(String, ForeignKey("uptime_targets.id"))
    status_code = Column(Integer, nullable=True)
    is_up = Column(Boolean, default=False)
    response_time_ms = Column(Integer, default=0)
    error = Column(String, default="")
    checked_at = Column(DateTime, default=_dt.datetime.utcnow)
    target = relationship("UptimeTarget", back_populates="checks")


class DriftReport(Base):
    __tablename__ = "drift_reports"
    __table_args__ = (
        Index("ix_drift_audit_id", "audit_id"),
        Index("ix_drift_website_url", "website_url"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"), nullable=False)
    previous_audit_id = Column(String, default="")
    website_url = Column(String, default="")
    score_delta = Column(Float, default=0.0)
    regression_count = Column(Integer, default=0)
    improvement_count = Column(Integer, default=0)
    summary = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class DuplicateGroup(Base):
    __tablename__ = "duplicate_groups"
    __table_args__ = (
        Index("ix_dupes_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    kind = Column(String, default="content")  # content | title
    key = Column(String, default="")
    count = Column(Integer, default=0)
    urls = Column(JSON, default=list)
    title = Column(Text, default="")
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class RedirectRecord(Base):
    __tablename__ = "redirect_records"
    __table_args__ = (
        Index("ix_redirects_audit_id", "audit_id"),
        Index("ix_redirects_url", "url"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    url = Column(String, default="")
    status_code = Column(Integer, default=0)
    final_url = Column(String, default="")
    chain = Column(JSON, default=list)
    chain_length = Column(Integer, default=0)
    is_chain = Column(Boolean, default=False)
    http_to_https = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class HreflangAnalysis(Base):
    __tablename__ = "hreflang_analyses"
    __table_args__ = (
        Index("ix_hreflang_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"), unique=True)
    has_hreflang = Column(Boolean, default=False)
    coverage = Column(Float, default=0.0)
    language_count = Column(Integer, default=0)
    pages = Column(JSON, default=list)
    issues = Column(JSON, default=list)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class DomainAuthority(Base):
    __tablename__ = "domain_authority"
    __table_args__ = (
        Index("ix_da_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"), unique=True)
    score = Column(Float, default=0.0)
    factors = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class UsageEvent(Base):
    __tablename__ = "usage_events"
    __table_args__ = (
        Index("ix_usage_user_id", "user_id"),
        Index("ix_usage_event_type", "event_type"),
        Index("ix_usage_created_at", "created_at"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    event_type = Column(String, default="")
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class TopicCluster(Base):
    __tablename__ = "topic_clusters"
    __table_args__ = (
        Index("ix_topic_clusters_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    name = Column(String, default="")
    keywords = Column(JSON, default=list)
    opportunity = Column(String, default="MEDIUM")
    pages = Column(JSON, default=list)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class ContentBrief(Base):
    __tablename__ = "content_briefs"
    __table_args__ = (
        Index("ix_briefs_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    cluster_id = Column(String, default="")
    title = Column(Text, default="")
    target_keyword = Column(String, default="")
    search_intent = Column(String, default="informational")
    outline = Column(JSON, default=list)
    word_count_target = Column(Integer, default=1200)
    related_keywords = Column(JSON, default=list)
    competitor_pages = Column(JSON, default=list)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)


class ProviderSetting(Base):
    """Per-user third-party provider configuration (keyword volume, backlinks,
    SERP ranks, AI citations, GSC). Config holds provider-specific API keys."""
    __tablename__ = "provider_settings"
    __table_args__ = (
        Index("ix_provider_user", "user_id", "provider", unique=True),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    provider = Column(String, default="")
    config = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
    updated_at = Column(DateTime, default=_dt.datetime.utcnow, onupdate=_dt.datetime.utcnow)


class AiCitationRecord(Base):
    """Brand / AI-citation monitoring results for an audit."""
    __tablename__ = "ai_citation_records"
    __table_args__ = (
        Index("ix_ai_citations_audit_id", "audit_id"),
    )
    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(String, ForeignKey("audits.id"))
    brand_name = Column(String, default="")
    mention_count = Column(Integer, default=0)
    ai_crawlable = Column(Boolean, default=False)
    llms_txt = Column(Boolean, default=False)
    robots_ai_rules = Column(Boolean, default=False)
    citation_estimate = Column(Integer, default=0)
    provider = Column(String, default="keyless")
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_dt.datetime.utcnow)
