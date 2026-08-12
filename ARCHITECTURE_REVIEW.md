# Enterprise SEO Intelligence Platform — Complete Architecture Review

**Date:** 2026-07-30 | **Version:** 1.0
**Scope:** Full audit against the 14-part Master Product Rebuild Prompt + 15 flagship modules

> ## ⚠️ STATUS UPDATE (latest build)
> This review is **stale** — a re-verification pass against the actual codebase confirmed that
> nearly all gaps flagged here have since been implemented. Specifically:
> - **AI providers:** 9 providers (OpenAI, Claude, Gemini, Perplexity, Grok, DeepSeek, Llama, Mistral, Cohere) with streaming.
> - **Crawler:** Playwright JS rendering + robots.txt parsing + sitemap seeding now live.
> - **Core Web Vitals:** Real PageSpeed Insights v5 + CrUX field data (FIELD/LAB/CRAWL sources).
> - **Backlinks:** DataForSEO inbound profile (when keyed), anchor text, referring domains.
> - **Enterprise:** Client portal share links, admin panel (stats/users/activity), audit-trail activity log,
>   workspaces, webhooks (retry/backoff + receipts), scheduled audits, uptime monitoring, email digests, brand monitor.
> - **Reporting:** PDF export (client-side jsPDF), CSV, Excel (multi-sheet, colored severity), HTML (printable, white-label aware), share links, white-label branding.
> - **Schema:** Validation + JSON-LD generation. **hreflang/i18n, mobile SEO, security headers** all present.
> - **Slack alerts:** Audit completed/failed + weekly digest delivery via incoming webhooks, per-user preferences + test endpoint.
> - **GA4 data path:** `analytics.readonly` granted at OAuth connect; GA4 property selector via Analytics Admin API; OAuth-token GA4 traffic/top-pages/keywords (API-key fallback).
> - **Tests:** 129 backend tests passing (`backend/tests`, isolated test DB).
> Remaining backlog is optional-only: SSO/SAML, custom report builder.
> See `ROADMAP.md` Phase 3 ✅ for the completed status table.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Part 1: Core Product Mission & Vision](#2-part-1-core-product-mission--vision)
3. [Part 2: Site Crawler (Engine)](#3-part-2-site-crawler-engine)
4. [Part 3: Technical SEO Analyzer](#4-part-3-technical-seo-analyzer)
5. [Part 4: SEO Content Intelligence Engine](#5-part-4-seo-content-intelligence-engine)
6. [Part 5: AI Search / GEO Intelligence Engine](#6-part-5-ai-search--geo-intelligence-engine)
7. [Part 6: Backlink Intelligence System](#7-part-6-backlink-intelligence-system)
8. [Part 7: Competitor Analysis](#8-part-7-competitor-analysis)
9. [Part 8: Performance & Core Web Vitals](#9-part-8-performance--core-web-vitals)
10. [Part 9: Enterprise / Agency Features](#10-part-9-enterprise--agency-features)
11. [Part 10: Automation & Scheduling](#11-part-10-automation--scheduling)
12. [Part 11: Reporting & Export](#12-part-11-reporting--export)
13. [Part 12: UI/UX Redesign](#13-part-12-uiux-redesign)
14. [Part 13: AI Engine / Recommendation Engine](#14-part-13-ai-engine--recommendation-engine)
15. [Part 14: Database Architecture](#15-part-14-database-architecture)
16. [15 Flagship Modules Assessment](#16-15-flagship-modules-assessment)
17. [Bug Catalog (All Known Bugs)](#17-bug-catalog-all-known-bugs)
18. [Priority Matrix](#18-priority-matrix)
19. [Implementation Roadmap (12-Week)](#19-implementation-roadmap-12-week)

---

## 1. Executive Summary

### Current State (verified against code, latest build)
- **Backend:** FastAPI app, 60+ endpoints, 18 models, 9 AI providers (streaming), Playwright JS rendering, real PSI/CrUX/DataForSEO integrations, admin + activity-trail APIs
- **Frontend:** React (JSX), 65+ page components, 40+ pages, ~100 API functions in `api.js`, client-side PDF (jsPDF)
- **Deployment:** Railway (backend) + Vercel (frontend), auto-deploys from `main`
- **Auth:** JWT-based, roles (ADMIN/EDITOR/VIEWER), API keys, admin user management
- **AI:** 9 providers via `ai_engine.py` with streaming + rule-based fallback
- **Crawler:** `httpx` + BeautifulSoup + Playwright JS rendering + robots.txt parsing
- **Enterprise:** client portal share links, admin panel, activity audit trail, workspaces, webhooks (retry/backoff/receipts), scheduled audits, uptime, digests, brand monitor
- **Tests:** 116 passing in `backend/tests` (isolated test DB)

### Traffic Light Assessment (updated)

| Area | Status | Details |
|------|--------|---------|
| Site Crawler | 🟢 GOOD | HTTP + Playwright JS rendering + robots.txt + sitemap seeding |
| Technical SEO | 🟢 GOOD | ~130 signals + mobile, CWV, hreflang, security headers, accessibility |
| Content Intelligence | 🟢 GOOD | Per-page + site-wide analysis, section detection, EEAT signals |
| AI Search / GEO | 🟢 GOOD | 9 AI providers, AI visibility + brand mention tracking across providers |
| Backlink System | 🟡 PARTIAL | DataForSEO profile when keyed; free tier is outbound-only |
| Competitor Analysis | 🟢 GOOD | One competitor URL, keyword/entity/topic gap analysis, backlinks, offsite authority |
| Core Web Vitals | 🟢 GOOD | PageSpeed v5 + CrUX field data, LCP/CLS/INP/FCP/TTFB, local Lighthouse |
| Enterprise Features | 🟢 GOOD | Roles, admin panel, share links, audit trails, workspaces, API keys |
| Automation | 🟢 GOOD | ScheduledAudit runner + webhooks w/ retry/backoff + uptime monitor |
| Reporting | 🟢 GOOD | PDF (jsPDF), CSV/HTML export, share links, digest email, white-label |
| UI/UX | 🟢 GOOD | 65+ pages, skeleton loaders, toasts, error boundaries |
| AI Engine | 🟢 GOOD | 9 providers, streaming, structured output validation |
| Database | 🟡 PARTIAL | 18 models, Alembic migration `001_initial_schema.py`, indexes on query columns; SQLite default (asyncpg for prod) |
| Flagship Modules | 🟢 GOOD | 15 modules implemented (see Part 16 assessment in ROADMAP.md) |

---

## 2. Part 1: Core Product Mission & Vision

### Status: ✅ Foundation exists
- Audit-based workflow works end-to-end (create → crawl → analyze → report)
- 184-page audit completes successfully
- Dashboard with health scoring (73.0 overall) operational

### Gaps
- No landing/marketing page for the product itself
- No onboarding flow for new users (wizard, sample audit)
- No portfolio view showing all audits at a glance
- No usage limits or tier differentiation
- No public API documentation (Swagger exists internally)

### Required Actions
1. Build landing page with product positioning
2. Create onboarding wizard (first-run experience)
3. Implement portfolio dashboard with multi-audit overview
4. Define and enforce usage tiers (Free/Pro/Enterprise)

---

## 3. Part 2: Site Crawler (Engine)

**File:** `backend/app/engine/crawler.py` (264 lines)

### What Works
- BFS crawl with configurable concurrency/max pages/timeout
- Extracts 26 fields per page (title, meta desc, headings, images, links, schema, OG, etc.)
- Depth limiting (hardcoded max 4)
- Duplicate detection via MD5 content hash
- Redirect chain tracking
- robots meta detection (meta robots, x-robots-tag)
- Language detection
- HTTPS detection

### Critical Gaps

| Gap | Impact | Severity |
|-----|--------|----------|
| **NO JS rendering** | SPA/React/Angular pages return empty HTML | CRITICAL |
| **NO Playwright/Puppeteer/Selenium** | Cannot crawl modern web apps | CRITICAL |
| **NO robots.txt parsing** | May crawl disallowed paths, get blocked | HIGH |
| **verify=False hardcoded** | SSL disabled, security risk | HIGH |
| **NO user-agent rotation** | Easy to block after few requests | HIGH |
| **NO rate limiting / crawl-delay** | Polite crawling not supported | MEDIUM |
| **NO sitemap seeding** | May miss important pages not linked | MEDIUM |
| **Max depth 4 hardcoded** | Deep sites partially crawled | MEDIUM |
| **No Content-Type validation** | Binary files parsed as HTML | MEDIUM |
| **html_raw truncated at 200k** | Large pages lose data | MEDIUM |
| **No nofollow spec compliance** | Follows nofollow links | LOW |
| **Extension-based resource skip** | URLs without extensions slip through | LOW |

### Required Actions
1. Integrate Playwright for JS rendering (headless Chromium)
2. Implement robots.txt parsing (respect Disallow, Crawl-delay)
3. Add user-agent rotation + polite crawl delays
4. Fix SSL verification (use proper cert validation)
5. Add sitemap-based crawl seeding
6. Make max depth configurable per-audit
7. Add Content-Type validation before HTML parsing

---

## 4. Part 3: Technical SEO Analyzer

**File:** `backend/app/engine/analyzer.py` (892 lines)

### What Works
- **6 analysis categories:** SEO, TECHNICAL, AEO, GEO, CONTENT, AI_SEARCH
- **~130 individual signals** across 8 per-page + 6 site-wide methods
- Weighted scoring system (0-100 per category, composite overall)
- Page type detection (heuristic keyword matching)
- Content structure analysis (heading hierarchy, readability)
- Schema detection (JSON-LD, Microdata, RDFa)
- OpenGraph + Twitter Card detection

### Analysis Methods
| Method | Signals | Lines |
|--------|---------|-------|
| `_analyze_page_technical` | HTTPS, Status, Response Time, Canonical, Indexability, Robots Meta, Redirect Chain, Language, Content Hash | 228-273 |
| `_analyze_page_seo` | Title (exists/length/uniqueness/keywords), Meta Description, H1/H2/H3, Content Length, Image Alt, Lazy Loading, Internal/External Links | 274-371 |
| `_analyze_page_content` | Readability, Content Structure, Sentence Complexity, Lists, Bold, Freshness, Data/Stats, CTA, Author, ToC, Video | 372-428 |
| `_analyze_page_aeo` | Question Headings, FAQ Schema, Lists, Tables, Definitions, How-To, Featured Snippet, Voice Search, Speakable Schema | 429-480 |
| `_analyze_page_geo` | Brand Signals, Author/Organization Schema, Expertise, About Page, Trust, Reviews, Citations, SameAs, Entity Density | 481-524 |
| `_analyze_page_ai_search` | Structured Data, Article/Breadcrumb/WebPage Schema, Citation-Ready Content, Freshness, Code Examples, Uniqueness, AI Readability, Comparison | 525-566 |
| `_analyze_page_internal_links` | Link Count, Anchor Text Quality, Link Diversity | 567-583 |
| `_analyze_page_schema` | Schema Types, Organization/WebPage Schema, OG, Twitter, JSON-LD Validity | 584-611 |
| Site-wide (6 methods) | Total Pages, Canonical Coverage, Indexability, Schema Coverage, Title/Meta Coverage, Broken Pages, Duplicate Content, Freshness | 612-847 |

### Gaps

| Missing Signal | Impact |
|----------------|--------|
| **Core Web Vitals** (LCP, CLS, INP, FCP, TTFB) | Cannot assess page experience |
| **Mobile friendliness** (viewport, tap targets, font size) | Missing mobile SEO |
| **Hreflang validation** | No international SEO |
| **Security headers** (HSTS, CSP, X-Frame-Options) | In separate engine, not integrated |
| **Accessibility** (aria, contrast, keyboard nav) | Missing a11y SEO |
| **JS rendering detection** | Cannot flag SPA issues |
| **Structured data validation** | Only checks presence, not correctness |
| **Sitemap analysis** (noindex in sitemap, coverage) | Incomplete indexability |
| **Entity extraction** is regex-only, no NLP/NER | Low quality entities |

### Required Actions
1. Integrate PageSpeed Insights API for real CWV data
2. Add mobile-friendliness checks (viewport, tap targets, font-size)
3. Add hreflang validation
4. Add structured data validation (Schema.org validator)
5. Add accessibility checks
6. Add JS rendering detection heuristic
7. Replace regex entity extraction with spaCy or similar NER
8. Make scoring weights configurable

---

## 5. Part 4: SEO Content Intelligence Engine

### What Works
- Per-page content quality scoring (readability, structure, freshness)
- Missing section detection (H1/H2/H3, internal/external links, images/videos, tables/stats)
- EEAT signal detection (author, date, expertise, trust)
- Thin content detection (word count thresholds)
- Content opportunity identification (long-form recommendations)
- Section-level rewrite suggestions (title, meta, headings)
- Topic authority scoring from content coverage

### Endpoints
| Endpoint | Status |
|----------|--------|
| `GET /api/audit/{id}/content` | ✅ Works |
| `GET /api/audit/{id}/content/intelligence` | ✅ Works |
| `GET /api/audit/{id}/content-intelligence-deep/{idx}` | ✅ Works |
| `GET /api/audit/{id}/content-opportunities` | ✅ Works |
| `GET /api/audit/{id}/content-quality` | ✅ Works |

### Gaps
- No competitor content comparison (word count, structure, keywords vs competitors)
- No content freshness scoring over time (no historical data)
- No content decay detection (pages losing rankings/engagement)
- No topical authority scoring against known entities
- No content clustering into topic pillars
- No AI-generated content detection
- No duplicate/similar content detection across pages

### Required Actions
1. Add competitor content comparison
2. Add content freshness decay tracking
3. Add topical authority scoring
4. Add content clustering (pillar/cluster model)
5. Integrate with Content Revival module for outdated content

---

## 6. Part 5: AI Search / GEO Intelligence Engine

**File:** `backend/app/engine/ai_engine.py` (237 lines) + `backend/app/engine/analyzer.py` (GEO/AEO sections)

### What Works
- Gemini API integration for AI recommendations
- Qualitative AI visibility assessment (6 factors: schema, author bios, statistics, FAQ, structure, freshness)
- AEO analysis (featured snippets, voice search, FAQ/HowTo)
- GEO analysis (brand signals, trust signals, citations, entity density)
- AI search readiness scoring (structured data, citation-ready content, freshness)

### Current AI Search Analysis: Purely Qualitative
The AI visibility analysis assess 6 factors as "present / partial / missing":
1. Schema markup presence
2. Author bio/expertise signals
3. Statistics/data citations
4. FAQ structures
5. Content organization
6. Content freshness

### Gaps

| Gap | Impact |
|-----|--------|
| **Gemini-only** — no OpenAI, Claude, or Perplexity | Single point of failure |
| **No real AI mention tracking** | Cannot measure actual citations in ChatGPT/Perplexity/Gemini |
| **No AI Overviews (SGE) analysis** | Cannot optimize for Google's AI Overviews |
| **No GEO scoring benchmark** | No comparison against competitors |
| **No LLMs.txt/llms.txt support** | Cannot optimize AI crawler access |
| **No passage-level citability scoring** | Cannot identify most citable sections |
| **No RAG / vector database** | Chat is context-window only |
| **No conversation memory** | Each chat stateless |
| **No streaming AI responses** | Slow UX for chat/recommendations |
| **No structured output validation** | Silent failures on malformed JSON |

### Required Actions
1. Add OpenAI (GPT-4o) + Claude (Sonnet) providers
2. Add real AI mention tracking (DataForSEO / SE Ranking / Profound APIs)
3. Add AI Overviews (SGE) optimization analysis
4. Add passage-level citability scoring
5. Implement llms.txt generation and validation
6. Add GEO benchmarking against competitors
7. Implement RAG with vector database (pgvector or similar)
8. Add streaming support for AI responses
9. Add structured output validation with fallback to rule-based analysis

---

## 7. Part 6: Backlink Intelligence System

### Current State: 🟥 NOT IMPLEMENTED
- **No `Backlink` database model** — backlinks exist only as a JSON field in `CompetitorData`
- **No DataForSEO integration** — no API client configured
- **No Majestic/Moz integration** — no external backlink data sources
- **No anchor text analysis**
- **No referring domains tracking**
- **No toxic link detection**
- **No backlink gap analysis**
- **No backlink growth trends**

### What Exists (very minimal)
- Outbound link extraction from crawled pages (links_external field on Page model)
- Outbound link quality analysis (nofollow vs follow ratio, link diversity)
- CompetitorData.backlink_gap JSON field (can store comparison data)

### Required Additions
1. `Backlink` model (domain, page_url, referring_domain, anchor_text, is_follow, first_seen, last_seen)
2. `ReferringDomain` model (domain, domain_authority, link_count, toxic_score)
3. DataForSEO API client for backlink data
4. Majestic/Moz API client as secondary source
5. Anchor text distribution analysis
6. Toxic link detection (spam score, PBN detection)
7. Backlink gap analysis (your backlinks vs competitor backlinks)
8. Backlink growth over time (new links, lost links)
9. Backlink profile comparison page in frontend
10. Link building opportunity identification

### Frontend Pages
- `BacklinkProfile.jsx` — exists but needs real data
- No referring domains page
- No toxic links page
- No anchor text distribution page
- No link gap analysis page

---

## 8. Part 7: Competitor Analysis

### What Works
- Single competitor URL per audit
- Competitor crawling + analysis
- Keyword opportunity identification
- Content opportunity identification
- Entity gap analysis
- Topic gap analysis
- SEO comparison scores
- AI visibility comparison
- Strengths/weaknesses/winning strategy generation

### Endpoints
| Endpoint | Status |
|----------|--------|
| `GET /api/audit/{id}/competitor` | ✅ Returns data + live intelligence |
| `GET /api/audit/{id}/competitor-deep/{idx}` | ✅ Available |
| `GET /api/audit/{id}/competitor-deep/url` | ✅ Available |

### Gaps
- **Single competitor only** — no multi-competitor comparison
- **No SERP gap analysis** (what keywords competitors rank for that you don't)
- **No backlink gap analysis** (what referring domains competitors have that you don't)
- **No content gap scoring** (quantified content deficiency by topic)
- **No competitive landscape dashboard** (positioning map, market share)
- **No share of voice analysis**
- **No rank tracking integration** (no DataForSEO SERP data)
- **No historical competitor tracking** (score changes over time)

### Required Actions
1. Support multiple competitors per audit (3-5)
2. Add SERP gap analysis (keyword overlap/Venn diagrams)
3. Add backlink gap analysis
4. Add competitive landscape visualization
5. Add share of voice tracking
6. Add rank tracking via DataForSEO
7. Add historical competitor score comparison

---

## 9. Part 8: Performance & Core Web Vitals

### Current State: 🟥 NOT IMPLEMENTED
- **No PageSpeed Insights API integration**
- **No CrUX field data** (real-user metrics)
- **No Lighthouse lab data**
- **No LCP, CLS, INP, FCP, TTFB measurements**
- **No mobile vs desktop performance comparison**
- **No performance trend tracking**

### What Exists (minimal)
- `response_time_ms` on Page model (crawler-measured)
- Response time distribution in site-wide analysis
- `PageExperience.jsx` frontend page (exists but no real data)
- `PageSpeed.jsx` frontend page (exists but no real data)
- `SpeedAnalysis.jsx` frontend page (exists but no real data)
- `SpeedIntelligence.jsx` frontend page (no real data)

### Required Additions
1. Google PageSpeed Insights API v5 client
2. CrUX API client (field data with 25-week history)
3. Lighthouse lab data collection (per-page performance audit)
4. Core Web Vitals assessment (LCP <2.5s, CLS <0.1, INP <200ms)
5. Performance score calculation (0-100 based on real metrics)
6. Mobile vs desktop performance comparison
7. Performance trend tracking over multiple audits
8. Performance recommendations (image optimization, JS reduction, caching)
9. Performance budget tracking

---

## 10. Part 9: Enterprise / Agency Features

### What Works
- **User model** with email, username, hashed_password, role
- **Session model** with token, expiry, IP, user-agent
- **APIKey model** with key, name, active status, last_used
- **WhiteLabelSettings model** with company_name, logo, colors, custom_domain
- **Role-based access:** ADMIN, EDITOR, VIEWER (enum values exist)
- JWT authentication middleware
- Owner check on audit GET requests

### Gaps

| Feature | Status | Required Action |
|---------|--------|-----------------|
| **Team/Organization model** | 🟡 Partial | Workspaces exist; no org/billing hierarchy |
| **Multi-tenancy** | 🟡 Partial | Data scoped by user_id; workspace scoping partial |
| **SSO/SAML/OAuth** | 🟡 Partial | Google OAuth flow done (connect/callback/refresh, GSC + GA4); SSO/SAML optional |
| **Billing/Subscription** | 🔴 Missing | No Stripe/subscription models |
| **Audit trails** | ✅ Works | ActivityLog + admin activity feed |
| **Usage tracking** | ✅ Works | `record_usage` metering on key events |
| **Feature flags** | 🔴 Missing | No per-tier feature gating |
| **Client portal** | ✅ Works | Read-only share links (tokenized, revocable) |
| **Custom domain** | 🟡 Partial | Model exists, no routing |
| **White-label reports** | 🟡 Partial | Model exists, no report generation |

### Required Actions
1. Add Organization, Team, TeamMembership models
2. Scope all queries by organization_id
3. Implement Google OAuth flow (consent screen, token refresh, multi-account)
4. Add Subscription/Billing models (Stripe integration)
5. Add AuditLog model for all changes
6. Add usage tracking middleware
7. Implement feature flag system (per-tier gating)
8. Build admin dashboard (users, teams, usage, billing)
9. Implement client portal (share audit via read-only link)
10. Implement custom domain routing

---

## 11. Part 10: Automation & Scheduling

### What Works
- **ScheduledAudit model** (user_id, website_url, competitor_url, frequency, next_run, is_active)
- **Webhook model** (user_id, url, events, secret, is_active, last_triggered_at)
- Frontend pages for webhook management
- Frontend pages for scheduled audit management
- Audit cancel + rerun endpoints

### Gaps

| Feature | Status | Required Action |
|---------|--------|-----------------|
| **Celery/RQ task queue** | 🟡 Partial | `asyncio.create_task` background work (warm cache, notifications, digests); no real queue broker |
| **Redis** | 🔴 Missing | No Redis for task broker/cache (in-process TTL cache used) |
| **Cron scheduler** | 🟡 Partial | Background worker loop runs due digests; no cron-based audit executor |
| **Scheduled audit executor** | 🟡 Partial | ScheduledAudit CRUD + next_run tracking; executor runner optional |
| **Webhook delivery** | ✅ Works | 3x retry with exponential backoff `[2,6,12]s`, HMAC signature, delivery receipts |
| **Email notification system** | 🟡 Partial | Email digests + audit completed/failed emails via SMTP; SMTP vars optional |
| **Slack/Teams integration** | ✅ Works | Slack incoming webhooks for audit completed/failed + digest, per-user prefs, test endpoint |
| **Alert thresholds** | 🟡 Partial | Digest/coach call-outs; no score-drop threshold alerts yet |
| **Batch operations** | 🔴 Missing | No bulk audit creation |

### Required Actions
1. Install Celery + Redis for async task processing (optional; create_task suffices today)
2. Implement scheduled audit runner (cron-like scheduler)
3. ✅ Webhook delivery system (retry logic, signing) — done
4. Add email notification integration (SMTP/SendGrid) — partial; digest + audit emails exist
5. ✅ Slack/Teams webhook notifications — Slack done, Teams optional
6. Implement alert thresholds (score drops, new critical issues)
7. Add batch audit operations (create, rerun, delete multiple)
8. Build automation dashboard (scheduled audits, webhooks, history)

---

## 12. Part 11: Reporting & Export

### What Works
- **CSV export** for issues, pages, recommendations
- **Excel export** with multi-sheet, colored severity, conditional formatting
- **HTML export** — printable, self-contained, white-label aware (user branding colors/company)
- **PDF export** — client-side jsPDF (`PdfDownloadButton`)
- Frontend pages: AuditReport, Export Center
- Report comparison view

### Endpoints
| Endpoint | Status |
|----------|--------|
| `GET /api/audit/{id}/export/csv` | ✅ Works |
| `GET /api/audit/{id}/export/excel` | ✅ Works |
| `GET /api/audit/{id}/export/html` | ✅ Works |
| `GET /api/audit/{id}/export/pdf` | 🟡 Client-side via jsPDF |

### Gaps
- **No scheduled reports** — auto-generate + email delivery
- **No custom report builder** — choose sections, order, metrics
- **No branded report templates**
- **No comparison reports** (audit 1 vs audit 2 in single report)

### Required Actions
1. Add scheduled report generation + email delivery
2. Build custom report builder (drag-and-drop sections)
3. Add comparison report format (side-by-side metrics)
4. Add report templates (executive summary, technical deep-dive, client-ready)

---

## 13. Part 12: UI/UX Redesign

### What Works
- **65 page components** covering audits, SEO analysis, content, AEO/GEO, competitors, schema, keywords, auth, enterprise
- **36 shared components** (ScoreRing, SeverityBadge, StatusBadge, RiskIndicator, ProgressBar, Tabs, Cards, Skeletons, etc.)
- **Toast notification system** (ToastProvider)
- **Error boundaries** (ErrorBoundary with recovery UI)
- **Skeleton loaders** (SkeletonLine, SkeletonCard, SkeletonTable, SkeletonPage)
- **Sidebar navigation** with collapsible sections, active state, mobile responsive
- **Breadcrumbs component**
- **Dark mode support** via CSS variables in theme.json

### Page Component Inventory (65 total)

| Category | Pages | Status |
|----------|-------|--------|
| **Audit Core (10)** | AuditCompare, AuditProgress, AuditReport, NewAudit, IssuesExplorer, Recommendations, RecommendationsDeep, SmartRecommendations, RemediationFeed, Report | 🟢 Most work |
| **SEO Analysis (12)** | SeoAnalysis, SeoHealth, SeoRoadmap, PageSpeed, SpeedAnalysis, SpeedIntelligence, MobileSeo, ImageSeo, SecurityHeaders, SitemapRobots, SocialSeo, PageExperience | 🟡 Several lack real data |
| **Content (11)** | ContentAnalysis, ContentIntelligence, ContentOpportunities, ContentQuality, ContentRevival, ContentRewriter, PageImprovements, PageIntelligence, PageIntelligenceDetail, PageIntelligenceV2, PageDetail | 🟢 Most work |
| **AEO/GEO/AI (9)** | AeoAnalysis, GeoAnalysis, AiVisibility, AiVisibilityDeep, AiBotIntelligence, AiChat, AiRecommendations, AiRoadmap, AiSuggestions | 🟡 Real data in some |
| **Competitor (5)** | CompetitorAnalysis, CompetitorDeep, CompetitorGap, OffsiteAuthority, BacklinkProfile | 🟡 Data partial |
| **Schema (3)** | SchemaAnalysis, SchemaIntelligence, SerpPreview | 🟢 Good |
| **Keyword (2)** | KeywordOpportunities, KeywordStrategy | 🟢 Excellent |
| **Data (3)** | GscData, History, Trends | 🟡 Stub data |
| **Auth (3)** | LoginPage, RegisterPage, SettingsPage | 🟢 Working |
| **Enterprise (4)** | EnterprisePage, PortfolioDashboard, Dashboard, PageDetail | 🟡 Partial data |
| **Local (1)** | LocalSeo | 🟡 Exists |
| **E-E-A-T (2)** | EeatAnalysis, BlogAi | 🟢 Good |

### Critical UI Bugs Found
1. **PageDetail.jsx:263-274** — Missing `pages.length` in `useEffect` dependency array → deep data never fetches → FIXED commit `891583c`
2. Several pages show "No data available" when data is present in backend (likely similar dependency issues)
3. No loading state transitions on slow API responses (stuck on "Loading...")
4. Multiple pages fetch data on every render (no dependency memoization)

### Missing Pages
- No 404/error page
- No onboarding wizard
- No landing/marketing page
- No admin/team management page
- No billing/subscription management page
- No API documentation page
- No notification preferences page
- No white-label settings page
- No webhook management page (models exist)
- No scheduled audit management page (models exist)
- No sitemap visualization page
- No robots.txt editor
- No keyword rank tracker page

### Required Actions
1. Audit ALL 65 pages for missing `useEffect` dependencies — many likely have same bug as PageDetail
2. Add consistent loading state transitions (Skeleton → Content vs Skeleton → Empty vs Skeleton → Error)
3. Fix data fetching to use proper caching (React Query recommended)
4. Add missing pages listed above
5. Implement proper error recovery for all data-fetching components
6. Add page transition animations
7. Standardize empty states across all pages
8. Add keyboard shortcuts (Cmd+K for search)

---

## 14. Part 13: AI Engine / Recommendation Engine

### What Works
- **AIEngine class** wrapping Google Gemini with two modes: JSON recommendations + text chat
- **Rule-based recommendations** in `ai_recommendations.py` and `generate_ai_recommendations` in status.py
- **ConfidenceEngine** rating recommendations as HIGH/MEDIUM/LOW
- **Content suggestion generation** (title, meta, heading rewrites)
- **Chat with context** about audit results
- **AiRecommendations sidebar** on PageDetail working with real data

### Endpoints
| Endpoint | Status |
|----------|--------|
| `GET /api/audit/{id}/ai-recommendations/{idx}` | ✅ Real data |
| `GET /api/audit/{id}/ai-recommendations-global` | ✅ Available |
| `POST /api/audit/{id}/chat` | ✅ Working |
| `GET /api/audit/{id}/ai-content-suggestion/{idx}` | ✅ Available |

### AI Engine Architecture

```
status.py (rule-based) ──────► ConfidenceEngine (rating)
         │
         └──► ai_engine.py (Gemini) ──► JSON recommendations
                  │
                  └──► ai_engine.py (Text) ──► Chat responses
```

### Gaps
1. **Gemini-only** — no fallback if Gemini fails (429 rate limits seen)
2. **No structured output validation** — assumes Gemini returns valid JSON
3. **No streaming** — all responses synchronous
4. **No RAG** — chat limited to context window
5. **No conversation memory** — each chat stateless
6. **No token usage tracking**
7. **No cost estimation**
8. **No A/B testing of prompts**
9. **No AI recommendation quality scoring** — no feedback loop
10. **No batch AI processing** — recommendations generated one at a time

### Required Actions
1. Add OpenAI + Claude providers with automatic fallback
2. Add structured output validation with error recovery (fallback to rule-based)
3. Add streaming for chat and recommendations
4. Implement RAG with vector database for chat
5. Add conversation persistence (ChatMessage model exists)
6. Add token usage + cost tracking
7. Add feedback mechanism (thumbs up/down on recommendations)
8. Add batch processing for large audits (parallel AI calls)
9. Add prompt versioning and A/B testing
10. Add caching for identical AI requests

---

## 15. Part 14: Database Architecture

### Current Schema: 23 Tables

| # | Table | Type | Issues |
|---|-------|------|--------|
| 1 | `audits` | Core | No config JSON, no team_id |
| 2 | `audit_scores` | 1:1 | No mobile_score, no performance_score, no accessibility_score |
| 3 | `pages` | Detail | No last_crawled_at, no mobile_friendly, no cumulative_layout_shift |
| 4 | `issues` | Detail | No source field (rule vs AI), no resolved_at |
| 5 | `recommendations` | Detail | No rating stored (computed at query time) |
| 6 | `competitor_data` | 1:1 | JSON blob for complex data |
| 7 | `roadmap_items` | Detail | OK |
| 8 | `keyword_data` | 1:1 | JSON blob |
| 9 | `content_data` | 1:1 | JSON blob |
| 10 | `ai_visibility_data` | 1:1 | JSON blob |
| 11 | `audit_history` | 1:1 | Missing technical_score |
| 12 | `audit_linter_results` | Detail | OK |
| 13 | `page_analysis_records` | Detail | OK |
| 14 | `keyword_records` | Detail | OK |
| 15 | `roadmap_records` | 1:1 | OK |
| 16 | `chat_messages` | Detail | No cascade delete |
| 17 | `users` | Core | No team_id, no org_id, no stripe_customer_id |
| 18 | `api_keys` | Detail | OK |
| 19 | `sessions` | Detail | OK |
| 20 | `webhooks` | Detail | OK |
| 21 | `scheduled_audits` | Detail | No last_run, no success_count, no fail_count |
| 22 | `whitelabel_settings` | 1:1 | OK |
| 23 | `audit_status` | Enum | OK |

### Critical Database Issues

| Issue | Impact | Severity |
|-------|--------|----------|
| **SQLite in production** | No concurrent writes, no connection pooling, 5GB size limit | CRITICAL |
| **No real Alembic migrations** | `upgrade()` and `downgrade()` both `pass` — cannot evolve schema | CRITICAL |
| **No database indexes** | No indexes on FKs (audit_id, page_url, user_id) — full table scans | HIGH |
| **JSON blobs for relational data** | competitor_data, keyword_data, content_data, ai_visibility_data use JSON columns | HIGH |
| **No cascade deletes** | ChatMessage orphans when audit deleted | MEDIUM |
| **No enum tables** | Category, severity, priority stored as strings | MEDIUM |
| **Missing critical models** | No backlink, organization, team, billing, notification models | HIGH |
| **No `technical_score` in AuditHistory** | Incomplete historical data | LOW |
| **No `config` JSON on Audit** | Cannot pass per-audit configuration | MEDIUM |

### Required Actions
1. Migrate to PostgreSQL for production
2. Create real Alembic migrations covering all tables
3. Add database indexes on all foreign keys + query columns
4. Normalize JSON blobs into relational tables (backlinks, keyword_data, etc.)
5. Add cascade deletes on all child tables
6. Add missing models (backlink, organization, team, billing, notification, audit_log)
7. Add missing fields (config on audit, rating on recommendation, source on issue, team_id on user)
8. Add updated_at timestamps to all tables
9. Add soft delete support

---

## 16. 15 Flagship Modules Assessment

Each module assessed as: 🟢 Complete | 🟡 Partial | 🟥 Not Started

| # | Module | Status | Coverage | Missing |
|---|--------|--------|----------|---------|
| 1 | **Site Crawler with JS Rendering** | 🟡 Partial | 264-line BFS crawler, 26 fields, depth 4 | No Playwright, no robots.txt, no sitemap seeding |
| 2 | **Technical SEO Analyzer (1000+ Signals)** | 🟡 Partial | ~130 signals across 6 categories | Missing 800+ signals: CWV, mobile, a11y, hreflang, security, schema validation |
| 3 | **Content Intelligence Engine** | 🟡 Partial | Per-page + site-wide analysis, section detection | No competitor comparison, no decay detection, no clustering |
| 4 | **AI Search / GEO Intelligence** | 🟡 Partial | Qualitative Gemini-based analysis | No real AI mention tracking, no AI Overviews, no GEO benchmarks |
| 5 | **Backlink Intelligence (DataForSEO/Majestic/Moz)** | 🟥 Not Started | Outbound link analysis only | No backlink model, no API integration, no anchor text, no toxic detection |
| 6 | **Competitor Deep Analysis** | 🟡 Partial | Single competitor, keyword/entity/topic gaps | No multi-competitor, no SERP gaps, no rank tracking |
| 7 | **Core Web Vitals & PageSpeed Integration** | 🟥 Not Started | response_time_ms only | No PageSpeed API, no CrUX, no Lighthouse, no LCP/CLS/INP |
| 8 | **Enterprise Multi-Tenant Platform** | 🟢 Complete | Roles, workspaces, share links, audit trails, admin panel, webhooks, scheduled audits, Slack alerts | SSO/billing optional |
| 9 | **Automated Scheduling & Alerts** | 🟢 Complete | Scheduled audits, webhook retries, email + Slack notifications, digest worker | Celery/Redis optional |
| 10 | **Professional Reporting Suite** | 🟢 Complete | CSV + Excel + HTML exports, PDF (jsPDF), white-label aware HTML, share links | Scheduled reports + custom builder optional |
| 11 | **SEO Content Strategy & Blog AI** | 🟢 Complete | Blog ideas, content calendar, gaps, featured snippets | Working in current audits |
| 12 | **Keyword Research Intelligence** | 🟢 Complete | 10-tab page, classification, entity suggestions, LSI, intent, difficulty | Working in current audits |
| 13 | **Schema Markup Engine** | 🟢 Complete | Detection + validation + JSON-LD generation, rich-results checks | Live rich-results testing optional |
| 14 | **Client Portal & White-Label** | 🟢 Complete | Tokenized share links, white-label branding, admin client management | Custom domains optional |
| 15 | **Real-time AI Chat & Audit Assistant** | 🟡 Partial | Chat with audit context | No streaming, no RAG, no memory, no feedback |

### Flagship Module Priority

| Priority | Modules |
|----------|---------|
| **P0 — Critical** | 7 (Core Web Vitals), 5 (Backlinks) |
| **P1 — High** | 1 (JS Crawler), 9 (Scheduling), 10 (Reports PDF), 14 (Client Portal) |
| **P2 — Medium** | 2 (Expand to 1000+ signals), 15 (RAG Chat), 8 (Full Multi-Tenant) |
| **P3 — Low** | 4 (AI Search benchmarks), 6 (Multi-competitor), 13 (Schema generation) |

---

## 17. Bug Catalog (All Known Bugs)

### Critical Bugs (Data Loss / Wrong Results)

| # | File | Line(s) | Bug | Fix |
|---|------|---------|-----|-----|
| B1 | `frontend/src/pages/PageDetail.jsx` | 263-274 | Missing `pages.length` in useEffect deps → deep data never fetches | ✅ FIXED: Added `pages.length` to `[id, selectedIdx, pages.length]` |
| B2 | `backend/app/engine/crawler.py` | 60 | `verify=False` hardcoded — SSL verification disabled | Remove param or use verify from settings |
| B3 | `backend/app/engine/crawler.py` | 204 | Max depth hardcoded to 4 | Make configurable via audit settings |
| B4 | `backend/app/engine/ai_engine.py` | 17-18 | Timeout too tight (5s connect, 15s read), max_retries=1 | Increase timeouts, implement actual retry |

### High Bugs (Broken Feature / Poor UX)

| # | File | Line(s) | Bug | Fix |
|---|------|---------|-----|-----|
| B5 | `backend/app/api/status.py` | 20 | In-memory cache, lost on restart | Use Redis or at least file-based |
| B6 | `backend/app/api/status.py` | 126 | Pages limit hardcoded to 200 | Add offset/limit pagination |
| B7 | `backend/app/engine/analyzer.py` | 378-379 | Readability silently degrades if textstat not installed | Add proper dependency or fallback with warning |
| B8 | `backend/app/models.py` | — | No cascade delete on ChatMessage → orphan records | Add cascade="all, delete-orphan" |
| B9 | `frontend/src/api.js` | — | No request timeout, no retry logic, no interceptors | Add timeout, retry, 401 auto-redirect |
| B10 | `frontend/src/api.js` | — | _authToken in memory only, lost on refresh | Persist to localStorage + httpOnly cookie |
| B11 | `backend/app/engine/crawler.py` | — | No robots.txt parsing | Implement with urllib.robotparser |
| B12 | `backend/app/engine/crawler.py` | — | No Content-Type validation | Skip non-HTML responses |

### Medium Bugs (Annoyance / Incomplete)

| # | File | Line(s) | Bug | Fix |
|---|------|---------|-----|-----|
| B13 | All frontend pages | — | Many likely have same useEffect dependency bug as PageDetail | Audit all 65 pages |
| B14 | `backend/app/models.py` | — | No database indexes on FK columns | Add indexes |
| B15 | `backend/alembic/versions/001_initial_schema.py` | — | Migration stub with `pass` | Write real migration |
| B16 | `backend/app/engine/analyzer.py` | 883-892 | Entity extraction is regex-only | Use spaCy NER |
| B17 | `backend/app/engine/ai_engine.py` | — | No 429 rate limit handling | Add exponential backoff |
| B18 | `backend/app/engine/analyzer.py` | 102 | Scoring weights hardcoded | Make configurable |
| B19 | `frontend/src/api.js` | — | exportCsv returns URL string, caller must window.open() | Return Blob + trigger download |
| B20 | `backend/app/engine/crawler.py` | 93-100 | Extension-based resource skip misses URLs without extensions | Use Content-Type header instead |

---

## 18. Priority Matrix

### P0 — Critical (Ship or Die)

| # | Item | Area | Effort | Dependencies |
|---|------|------|--------|-------------|
| P0.1 | Fix all useEffect dependency bugs across 65 pages | Frontend | 8h | None |
| P0.2 | Fix SSL verify=False in crawler | Backend | 1h | None |
| P0.3 | Remove html_raw from DB or compress | Backend | 4h | Migration |
| P0.4 | Add database indexes on all FKs | Backend | 2h | Migration |
| P0.5 | Add pagination to all list endpoints | Backend | 8h | None |
| P0.6 | Migrate to PostgreSQL | Backend | 16h | DB migration |
| P0.7 | Add real Alembic migrations | Backend | 8h | None |

### P1 — High (Competitive Necessity)

| # | Item | Area | Effort | Dependencies |
|---|------|------|--------|-------------|
| P1.1 | Integrate Playwright for JS rendering | Crawler | 16h | Deployment env |
| P1.2 | Add robots.txt parsing | Crawler | 4h | None |
| P1.3 | Integrate PageSpeed Insights API | Backend | 8h | Google API key |
| P1.4 | Integrate CrUX API | Backend | 6h | Google API key |
| P1.5 | Add PDF export | Backend | 12h | ReportLab |
| P1.6 | Add OpenAI + Claude AI providers | AI Engine | 8h | API keys |
| P1.7 | Add streaming AI responses | AI Engine | 4h | None |
| P1.8 | Backlink model + DataForSEO integration | Backend | 16h | DataForSEO API |
| P1.9 | Add request timeout + retry + interceptors to api.js | Frontend | 4h | None |
| P1.10 | Persist auth token in localStorage | Frontend | 2h | None |

### P2 — Medium (Differentiation)

| # | Item | Area | Effort | Dependencies |
|---|------|------|--------|-------------|
| P2.1 | Add AI mention tracking (DataForSEO/SE Ranking) | AI Engine | 12h | Third-party API |
| P2.2 | Add AI Overviews (SGE) optimization | AI Engine | 8h | None |
| P2.3 | Implement Celery + Redis task queue | Backend | 12h | Redis deployment |
| P2.4 | Add scheduled audit executor | Backend | 8h | Celery |
| P2.5 | Add email notification integration | Backend | 6h | SendGrid/SMTP |
| P2.6 | Add webhook delivery system | Backend | 6h | Celery |
| P2.7 | Build white-label report branding | Reporting | 8h | PDF export |
| P2.8 | Add Organization + Team models | Enterprise | 12h | Migration |
| P2.9 | Implement Google OAuth flow | Enterprise | 8h | Google Cloud project |
| P2.10 | Add RAG for AI chat | AI Engine | 12h | Vector DB |

### P3 — Low (Nice to Have)

| # | Item | Area | Effort | Dependencies |
|---|------|------|--------|-------------|
| P3.1 | Replace regex entity extraction with spaCy | Analyzer | 8h | spaCy model |
| P3.2 | Add mobile-friendliness checks | Analyzer | 4h | None |
| P3.3 | Add hreflang validation | Analyzer | 6h | None |
| P3.4 | Add structured data validation | Analyzer | 8h | Schema.org API |
| P3.5 | Support multiple competitors per audit | Backend | 8h | Migration |
| P3.6 | Add subscription/billing models | Enterprise | 12h | Stripe |
| P3.7 | Add client portal (read-only share links) | Frontend | 12h | Auth system |
| P3.8 | Add custom domain routing | Enterprise | 8h | DNS infra |
| P3.9 | Build admin dashboard | Frontend | 16h | Enterprise models |
| P3.10 | Add A/B testing for AI prompts | AI Engine | 8h | None |

---

## 19. Implementation Roadmap (12-Week)

### Sprint 1-2: Stabilize Foundation (Weeks 1-2)
**Goal:** Fix all critical bugs, no data loss, all pages render

| Task | Hours | Owner |
|------|-------|-------|
| Fix useEffect dependency bugs across ALL pages | 8 | Frontend |
| Fix SSL verify=False in crawler | 1 | Backend |
| Add database indexes | 2 | Backend |
| Add pagination to all endpoints | 8 | Backend |
| Add request timeout + retry to api.js | 4 | Frontend |
| Persist auth token properly | 2 | Frontend |
| Add error boundaries to remaining pages | 4 | Frontend |
| Remove html_raw or compress | 4 | Backend |
| **Total** | **33h** | |

### Sprint 3-4: Core Platform Upgrades (Weeks 3-4)
**Goal:** Production-ready database, JS rendering, performance data

| Task | Hours | Owner |
|------|-------|-------|
| Migrate SQLite → PostgreSQL | 16 | Backend |
| Create real Alembic migrations | 8 | Backend |
| Integrate Playwright for JS rendering | 16 | Backend |
| Add robots.txt parsing | 4 | Backend |
| Add PageSpeed Insights API | 8 | Backend |
| Add CrUX API | 6 | Backend |
| **Total** | **58h** | |

### Sprint 5-6: AI & Backlinks (Weeks 5-6)
**Goal:** Multi-provider AI, backlink system

| Task | Hours | Owner |
|------|-------|-------|
| Add OpenAI + Claude providers | 8 | Backend |
| Add streaming AI responses | 4 | Backend |
| Add structured output validation | 4 | Backend |
| Create Backlink model | 4 | Backend |
| Integrate DataForSEO backlinks | 12 | Backend |
| Add anchor text + toxic link detection | 8 | Backend |
| **Total** | **40h** | |

### Sprint 7-8: Automation & Reporting (Weeks 7-8)
**Goal:** Scheduled tasks, professional reports

| Task | Hours | Owner |
|------|-------|-------|
| Install Celery + Redis | 6 | Backend |
| Implement scheduled audit executor | 8 | Backend |
| Implement webhook delivery system | 6 | Backend |
| Add PDF export | 12 | Backend |
| Add white-label report branding | 8 | Backend |
| Add email notification integration | 6 | Backend |
| **Total** | **46h** | |

### Sprint 9-10: Enterprise Features (Weeks 9-10)
**Goal:** Multi-tenant, OAuth, competitive differentiation

| Task | Hours | Owner |
|------|-------|-------|
| Add Organization + Team models | 12 | Backend |
| Implement Google OAuth flow | 8 | Backend |
| Add usage tracking middleware | 4 | Backend |
| Add subscription/billing models | 12 | Backend |
| Build admin dashboard | 16 | Frontend |
| Add client portal (share links) | 12 | Frontend |
| **Total** | **64h** | |

### Sprint 11-12: Advanced SEO & Polish (Weeks 11-12)
**Goal:** AI search GEO, 1000+ signals, flagship modules

| Task | Hours | Owner |
|------|-------|-------|
| Add AI mention tracking | 12 | Backend |
| Add AI Overviews optimization | 8 | Backend |
| Add RAG for AI chat | 12 | Backend |
| Expand to 1000+ technical signals | 16 | Backend |
| Add mobile-friendliness, hreflang, a11y | 10 | Backend |
| Add structured data validation | 8 | Backend |
| Replace regex entities with spaCy | 8 | Backend |
| **Total** | **74h** | |

### Total: ~315 hours | ~26h/week average

---

## Appendix A: File Index

### Backend Core (15 files)
| File | Lines | Purpose |
|------|-------|---------|
| `backend/app/api/status.py` | 5577 | Main API endpoints monolith |
| `backend/app/models.py` | 438 | 23 SQLAlchemy models |
| `backend/app/database.py` | ~50 | SQLite async config |
| `backend/app/auth_middleware.py` | ~130 | JWT auth middleware |
| `backend/app/security.py` | ~80 | Password hashing, token creation |
| `backend/app/engine/crawler.py` | 264 | BFS crawler engine |
| `backend/app/engine/analyzer.py` | 892 | SEO analysis engine |
| `backend/app/engine/ai_engine.py` | 237 | Gemini AI engine |
| `backend/app/engine/confidence_engine.py` | ~150 | Recommendation confidence scoring |
| `backend/app/engine/page_intelligence_engine.py` | ~200 | Deep page analysis |
| `backend/app/engine/ai_recommendations.py` | ~300 | Rule-based AI recommendations |
| `backend/app/engine/enterprise_engine.py` | ~150 | Enterprise analysis |
| `backend/alembic/versions/001_initial_schema.py` | ~30 | Stub migration (PASS) |
| `frontend/src/api.js` | 165 | All API functions |
| `frontend/src/App.jsx` | ~50 | Route definitions |

### Frontend Pages (65 files in `frontend/src/pages/`)
See section 13 for full inventory.

### Shared Components (36 files in `frontend/src/components/`)
| Category | Components |
|----------|-----------|
| **Layout** | AppLayout, Sidebar, Header, TabNavigation, Breadcrumbs |
| **Feedback** | ToastProvider, ErrorBoundary, LoadingSpinner, EmptyState |
| **Skeletons** | SkeletonLine, SkeletonCard, SkeletonTable, SkeletonPage |
| **Data Display** | ScoreRing, SeverityBadge, StatusBadge, RiskIndicator, ProgressBar, TrendIndicator |
| **Charts** | ScoreRadar, MetricCard, BarChart, LineChart, PieChart, ScoreGauge |
| **SEO Specific** | KeywordChip, EntityTag, SchemaPreview, SerpPreviewCard |
| **Cards** | InsightCard, RecommendationCard, IssueCard, AuditCard |

---

## Appendix B: API Endpoint Catalog

| Endpoint | Method | Returns | Status |
|----------|--------|---------|--------|
| `/api/health` | GET | Server status | ✅ |
| `/api/auth/register` | POST | User created | ✅ |
| `/api/auth/login` | POST | JWT token | ✅ |
| `/api/auth/me` | GET | Current user | ✅ |
| `/api/auth/update` | PUT | Updated user | ✅ |
| `/api/auth/change-password` | POST | OK | ✅ |
| `/api/auth/api-keys` | GET/POST | API keys | ✅ |
| `/api/auth/api-keys/{id}` | DELETE | Removed | ✅ |
| `/api/auth/webhooks` | GET/POST | Webhooks | ✅ |
| `/api/auth/webhooks/{id}` | DELETE | Removed | ✅ |
| `/api/auth/webhooks/{id}/test` | POST | Test result | ✅ |
| `/api/auth/scheduled` | GET/POST | Scheduled audits | ✅ |
| `/api/auth/scheduled/{id}` | PUT/DELETE | Updated/removed | ✅ |
| `/api/auth/whitelabel` | GET/PUT | White label settings | ✅ |
| `/api/audit/start` | POST | New audit | ✅ |
| `/api/audit/status/{id}` | GET | Status + progress | ✅ |
| `/api/audit/{id}` | GET | Full audit detail | ✅ |
| `/api/audit/{id}/cancel` | POST | Cancelled | ✅ |
| `/api/audit/{id}/rerun` | POST | Rerun started | ✅ |
| `/api/audit/{id}/delete` | DELETE | Removed | ✅ |
| `/api/audit/{id}/issues` | GET | Filtered issues | ✅ |
| `/api/audit/{id}/recommendations` | GET | Enriched recommendations | ✅ |
| `/api/audit/{id}/competitor` | GET | Competitor data | ✅ |
| `/api/audit/{id}/pages` | GET | Paginated pages | ✅ |
| `/api/audit/{id}/page-detail/{idx}` | GET | Page detail + analysis | ✅ |
| `/api/audit/{id}/seo-analysis` | GET | SEO scores | ✅ |
| `/api/audit/{id}/aeo-analysis` | GET | AEO scores | ✅ |
| `/api/audit/{id}/geo-analysis` | GET | GEO scores | ✅ |
| `/api/audit/{id}/ai-visibility` | GET | AI visibility | ✅ |
| `/api/audit/{id}/schema-analysis` | GET | Schema analysis | ✅ |
| `/api/audit/{id}/internal-links` | GET | Internal link analysis | ✅ |
| `/api/audit/{id}/page-speed` | GET | Page speed data | ✅ |
| `/api/audit/{id}/eeat-analysis` | GET | EEAT analysis | ✅ |
| `/api/audit/{id}/keyword-data` | GET | Keyword data | ✅ |
| `/api/audit/{id}/content-data` | GET | Content data | ✅ |
| `/api/audit/{id}/content-quality` | GET | Content quality | ✅ |
| `/api/audit/{id}/content-analysis` | GET | Content analysis | ✅ |
| `/api/audit/{id}/roadmap` | GET | Roadmap items | ✅ |
| `/api/audit/{id}/dashboard-deep` | GET | Dashboard deep data | ✅ |
| `/api/audit/{id}/page-intelligence-deep/{idx}` | GET | Deep page intelligence | ✅ |
| `/api/audit/{id}/mega-analysis/{idx}` | GET | Mega analysis | ✅ |
| `/api/audit/{id}/ai-recommendations/{idx}` | GET | AI recommendations | ✅ |
| `/api/audit/{id}/chat` | POST | Chat response | ✅ |
| `/api/audit/{id}/chat/history` | GET | Chat history | ✅ |
| `/api/audit/{id}/export/csv` | GET | CSV export | ✅ |
| `/api/audit/{id}/export/excel` | GET | Excel export (multi-sheet) | ✅ |
| `/api/audit/{id}/export/html` | GET | HTML report export | ✅ |
| `/api/audit/{id}/google-properties` | PUT | Save GSC/GA4 property on audit | ✅ |
| `/api/audit/{id}/ga4-traffic` | GET | GA4 organic traffic | ✅ |
| `/api/audit/{id}/ga4-top-pages` | GET | GA4 top pages | ✅ |
| `/api/integrations/google/ga4-properties` | GET | List GA4 properties | ✅ |
| `/api/alerts/slack` | GET/PUT/DELETE | Slack alert preferences | ✅ |
| `/api/alerts/slack/test` | POST | Test Slack webhook delivery | ✅ |
| `/api/audit/compare` | POST | Comparison data | ✅ |
| `/api/dashboard/portfolio` | GET | Portfolio data | ✅ |
| `/api/audit/{id}/trends` | GET | Trend data | ✅ |
| `/api/audit/{id}/full-strategy` | GET | Full strategy | ✅ |
| `/api/audit/{id}/content-intelligence-deep/{idx}` | GET | Deep content | ✅ |
| `/api/audit/{id}/content-opportunities` | GET | Content opportunities | ✅ |
| `/api/audit/{id}/competitor-deep/{idx}` | GET | Deep competitor | ✅ |
| `/api/audit/{id}/seo-health` | GET | SEO health | ✅ |
| `/api/audit/{id}/mobile-seo` | GET | Mobile SEO | ✅ |
| `/api/audit/{id}/image-seo` | GET | Image SEO | ✅ |
| `/api/audit/{id}/security-headers` | GET | Security headers | ✅ |
| `/api/audit/{id}/sitemap-robots` | GET | Sitemap/robots | ✅ |
| `/api/audit/{id}/social-seo` | GET | Social SEO | ✅ |
| `/api/audit/{id}/page-experience` | GET | Page experience | ✅ |
| `/api/audit/{id}/local-seo` | GET | Local SEO | ✅ |
| `/api/audit/{id}/backlink-profile` | GET | Backlink profile | ✅ |
| `/api/audit/{id}/gsc-overview` | GET | GSC overview | ✅ |
| `/api/audit/{id}/gsc-keywords` | GET | GSC keywords | ✅ |

**Total: ~75 unique endpoints, many with multiple HTTP methods**

---

*Document generated 2026-07-30. Audit performed against codebase at commit `891583c`.*
