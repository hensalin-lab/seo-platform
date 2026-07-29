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


class AuditScore(Base):
    __tablename__ = "audit_scores"
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
    snapshot_hash = Column(String, default="")
    pages_affected = Column(Integer, default=1)
    detected_at = Column(DateTime, default=_dt.datetime.utcnow)
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
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    company_name = Column(String, default="")
    logo_url = Column(String, default="")
    primary_color = Column(String, default="#3B82F6")
    secondary_color = Column(String, default="#1E293B")
    custom_domain = Column(String, default="")
    is_active = Column(Boolean, default=False)
    user = relationship("User", back_populates="white_label")
