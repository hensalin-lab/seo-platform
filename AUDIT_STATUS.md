# AUDIT_STATUS.md — Phase 1 Inventory Audit

Generated from automated audit of the seo-platform codebase.
Last updated: 2026-09-04

---

## Executive Summary

| Metric | Count |
|---|---|
| Frontend page components | 82 |
| Backend API endpoints | ~250 |
| Sidebar nav items | 67 |
| Pages with correct useEffect deps | 82/82 (100%) |
| Sidebar items with working routes | 65/67 (97%) |
| Sidebar items with NO_ROUTE | 2 |
| Backend endpoints in status.py | 105 |
| Backend endpoints total (all routers) | ~250 |

---

## Sidebar Route Audit

### Overview Context

| Sidebar Label | Path | Route | Component | Status |
|---|---|---|---|---|
| Score Trends | `/trends` | mainNav | `modules/executive/pages/Trends.jsx` | ✅ WORKING |
| Rank Tracking | `/rank-tracking` | mainNav | `pages/RankTracking.jsx` | ✅ WORKING |
| AI Overviews Monitor | `/audit-ai-overviews` | mainNav | — | ❌ NO_ROUTE (dead path) |
| Uptime | `/uptime` | mainNav | `modules/advanced/pages/UptimeMonitor.jsx` | ✅ WORKING |

### Audit Workspace Groups

#### 1. Overview

| Sidebar Label | Suffix | Component | Status |
|---|---|---|---|
| Dashboard | `/dashboard` | `pages/hubs/DashboardHub.jsx` | ✅ WORKING |
| Audit Report | `/report` | `modules/executive/pages/AuditReport.jsx` | ✅ WORKING |
| Audit Compare | `/compare` | `modules/executive/pages/AuditCompare.jsx` | ✅ WORKING |

#### 2. On-Page & Content

| Sidebar Label | Suffix | Component | Status |
|---|---|---|---|
| SEO Analysis | `/seo` | `pages/hubs/TechnicalHubs.jsx` (SeoHub) | ✅ WORKING |
| Pages | `/pages` | `pages/hubs/TechnicalHubs.jsx` (PagesHub) | ✅ WORKING |
| Page Detail | `/page-detail` | `pages/hubs/TechnicalHubs.jsx` (PageDetailHub) | ✅ WORKING |
| Content Intelligence | `/content-intel` | `pages/hubs/GeoContentHubs.jsx` (ContentIntelHub) | ✅ WORKING |
| Content Studio | `/content-studio` | `pages/hubs/GeoContentHubs.jsx` (ContentStudioHub) | ✅ WORKING |
| Content Rewriter | `/content-rewrite` | `modules/content-keywords/pages/ContentRewriter.jsx` | ✅ WORKING |
| Content Revival | `/content-revival` | `modules/content-keywords/pages/ContentRevival.jsx` | ✅ WORKING |
| Blog AI | `/blog-ai` | `modules/content-keywords/pages/BlogAi.jsx` | ✅ WORKING |

#### 3. Technical SEO

| Sidebar Label | Suffix | Component | Status |
|---|---|---|---|
| Speed & CWV | `/speed` | `pages/hubs/TechnicalHubs.jsx` (SpeedHub) | ✅ WORKING |
| Internal Links | `/internal-links` | `modules/technical-audit/pages/InternalLinks.jsx` | ✅ WORKING |
| Schema | `/schema` | `pages/hubs/TechnicalHubs.jsx` (SchemaHub) | ✅ WORKING |
| Sitemap & Robots | `/sitemap-robots` | `modules/technical-audit/pages/SitemapRobots.jsx` | ✅ WORKING |
| Mobile SEO | `/mobile-seo` | `modules/technical-audit/pages/MobileSeo.jsx` | ✅ WORKING |
| Security Headers | `/security-headers` | `modules/technical-audit/pages/SecurityHeaders.jsx` | ✅ WORKING |
| Image SEO | `/image-seo` | `modules/technical-audit/pages/ImageSeo.jsx` | ✅ WORKING |
| Hreflang & i18n | `/hreflang` | `modules/advanced/pages/HreflangAnalysis.jsx` | ✅ WORKING |
| Redirects | `/redirects` | `modules/advanced/pages/RedirectAudit.jsx` | ✅ WORKING |
| Duplicates | `/duplicates` | `modules/advanced/pages/DuplicateContent.jsx` | ✅ WORKING |
| JS Dependency | `/js-dependency` | `modules/advanced/pages/JsDependency.jsx` | ✅ WORKING |

#### 4. GEO & AEO (AI Search)

| Sidebar Label | Suffix | Component | Status |
|---|---|---|---|
| GEO & AEO Hub | `/geo-aeo` | `pages/hubs/GeoContentHubs.jsx` (GeoAeoHubTabs) | ✅ WORKING |
| AI Bot Access | `/ai-bots` | `modules/geo-aeo/pages/AiBotIntelligence.jsx` | ✅ WORKING |
| SERP & AI Preview | `/serp-preview` | `modules/geo-aeo/pages/SerpPreview.jsx` | ✅ WORKING |
| E-E-A-T Analysis | `/eeat` | `modules/geo-aeo/pages/EeatAnalysis.jsx` | ✅ WORKING |
| AI Overviews Monitor | `/ai-overviews` | `modules/geo-aeo/pages/AiOverviews.jsx` | ✅ WORKING |

#### 5. Off-Site Authority

| Sidebar Label | Suffix | Component | Status |
|---|---|---|---|
| Backlinks | `/backlinks` | `modules/competitive/pages/BacklinkProfile.jsx` | ✅ WORKING |
| Off-Site Authority | `/offsite-authority` | `pages/hubs/GeoContentHubs.jsx` (OffsiteHub) | ✅ WORKING |
| Social SEO | `/social-seo` | `modules/geo-aeo/pages/SocialSeo.jsx` | ✅ WORKING |
| Local SEO | `/local-seo` | `modules/geo-aeo/pages/LocalSeo.jsx` | ✅ WORKING |
| Citations | `/citations` | `modules/geo-aeo/pages/CitationAnalysis.jsx` | ✅ WORKING |

#### 6. Keywords & Competitors

| Sidebar Label | Suffix | Component | Status |
|---|---|---|---|
| Keyword Strategy | `/keywords` | `pages/hubs/GeoContentHubs.jsx` (KeywordHub) | ✅ WORKING |
| Competitor Analysis | `/competitor` | `modules/competitive/pages/CompetitorAnalysis.jsx` | ✅ WORKING |
| Rank Tracking (this audit) | `/rankings` | `modules/technical-audit/pages/Rankings.jsx` | ✅ WORKING |

#### 7. Actions & Roadmap

| Sidebar Label | Suffix | Component | Status |
|---|---|---|---|
| Action Hub | `/action-hub` | `pages/hubs/ActionHub.jsx` | ✅ WORKING |
| Issue Remediation | `/issues` | — (redirects to `/action-hub?tab=issues`) | ⚠️ REDIRECT_ONLY |
| Rank Boost | `/rank-boost` | `modules/geo-aeo/pages/RankBoost.jsx` | ✅ WORKING |
| Roadmap | `/roadmap` | `pages/hubs/TechnicalHubs.jsx` (RoadmapHub) | ✅ WORKING |
| Score Trends | `/trends` | `modules/executive/pages/AuditTrends.jsx` | ✅ WORKING |
| Drift & Changes | `/drift` | `modules/advanced/pages/DriftDetection.jsx` | ✅ WORKING |

#### 8. Integrations

| Sidebar Label | Suffix | Component | Status |
|---|---|---|---|
| Google Search Console | `/gsc` | `modules/technical-audit/pages/GscData.jsx` | ✅ WORKING |
| AI Chat | `/chat` | `modules/settings/pages/AiChat.jsx` | ✅ WORKING |

### Site Tools Context

| Sidebar Label | Path | Component | Status |
|---|---|---|---|
| Rank Tracking | `/rank-tracking` | `pages/RankTracking.jsx` | ✅ WORKING |
| Keyword Gap | `/keyword-gap` | `pages/KeywordGap.jsx` | ✅ WORKING |
| Keyword Difficulty | `/keyword-difficulty` | `pages/KeywordDifficulty.jsx` | ✅ WORKING |
| Keyword Universe | `/keyword-universe` | `pages/KeywordUniverse.jsx` | ✅ WORKING |
| Traffic Estimator | `/traffic-estimator` | `pages/TrafficEstimator.jsx` | ✅ WORKING |
| Backlink Explorer | `/backlinks` | `pages/BacklinkExplorer.jsx` | ✅ WORKING |
| Referring Domains | `/referring-domains` | `pages/ReferringDomains.jsx` | ✅ WORKING |
| Toxic Links | `/toxic-links` | `pages/ToxicLinks.jsx` | ✅ WORKING |
| Backlink Gap | `/backlink-gap` | `pages/BacklinkGapAnalysis.jsx` | ✅ WORKING |
| Trust / Citation Flow | `/trust-flow` | `pages/TrustFlow.jsx` | ✅ WORKING |
| URL Inspection | `/url-inspection` | `pages/UrlInspection.jsx` | ✅ WORKING |

### Platform Context

| Sidebar Label | Path | Component | Status |
|---|---|---|---|
| Programmatic SEO | `/programmatic` | `modules/content-keywords/pages/ProgrammaticSeo.jsx` | ✅ WORKING |
| Live Editor | `/live-editor` | `pages/LiveContentEditor.jsx` | ✅ WORKING |
| AI Agents & MCP | `/agents` | `modules/advanced/pages/McpAgents.jsx` | ✅ WORKING |
| API Reference | `/api-reference` | `modules/advanced/pages/ApiReference.jsx` | ✅ WORKING |
| Uptime | `/uptime` | `modules/advanced/pages/UptimeMonitor.jsx` | ✅ WORKING |
| Usage | `/usage` | `modules/advanced/pages/UsageMetering.jsx` | ✅ WORKING |
| Free Tools | `/free-tools` | `modules/advanced/pages/FreeTools.jsx` | ✅ WORKING |
| Settings | `/settings` | `modules/settings/pages/SettingsPage.jsx` | ✅ WORKING |

---

## Frontend Page Audit — useEffect Dependency Arrays

All 82 pages checked. **No missing dependency bugs found.**

Pattern: Audit-routed pages use `const { id } = useParams()` + `deps: [id]`. Form-driven/standalone pages use `deps: []`. Multi-effect pages (SerpPreview, AiBotIntelligence) correctly separate independent effects.

| Category | Files | Status |
|---|---|---|
| Executive | 6 | ✅ All OK |
| GEO/AEO | 13 | ✅ All OK |
| Content/Keywords | 15 | ✅ All OK |
| Competitive | 3 | ✅ All OK |
| Action Center | 5 | ✅ All OK |
| Technical Audit | 17 | ✅ All OK |
| Advanced | 12 | ✅ All OK |
| Settings | 4 | ✅ All OK |
| Enterprise | 2 | ✅ All OK |
| Top-level | 12 | ✅ All OK |
| Hubs | 7 | ✅ All OK (no data fetching) |

---

## Backend Endpoint Audit — status.py (105 endpoints)

| Endpoint | Function | Real/Stub | Notes |
|---|---|---|---|
| GET /audit/status/{id} | `get_audit_status` | ✅ real | Queries DB |
| GET /audit/{id} | `get_audit_detail` | ✅ real | Queries DB |
| GET /audit/{id}/scores | `get_audit_scores` | ✅ real | Computed from audit data |
| GET /audit/{id}/audit-compare | `get_audit_compare` | ✅ real | Compares two audits |
| GET /audit/{id}/issues | `get_audit_issues` | ✅ real | Queries DB, paginated |
| GET /audit/{id}/recommendations | `get_audit_recommendations` | ✅ real | Queries DB |
| GET /audit/{id}/competitor | `get_competitor_data` | ✅ real | Queries DB |
| POST /audit/{id}/competitor/analyze | `run_competitor_analysis` | ✅ real | Runs analysis |
| GET /audit/{id}/pages | `get_audit_pages` | ✅ real | Queries DB |
| GET /audit/{id}/page-detail | `get_page_detail` | ✅ real | Queries DB |
| GET /audit/{id}/page-analysis/{url} | `get_page_analysis` | ✅ real | Queries DB |
| GET /audit/{id}/page-analyses | `get_page_analyses` | ✅ real | Queries DB |
| GET /audit/{id}/seo-analysis | `get_seo_analysis` | ✅ real | Queries DB |
| GET /audit/{id}/keywords | `get_keyword_data` | ✅ real | Queries DB |
| GET /audit/{id}/roadmap | `get_roadmap` | ⚠️ computed | Generates from issues |
| GET /audit/{id}/aeo-analysis | `get_aeo_analysis` | ✅ real | Queries DB |
| GET /audit/{id}/geo-analysis | `get_geo_analysis` | ✅ real | Queries DB |
| GET /audit/{id}/ai-visibility | `get_ai_visibility` | ⚠️ computed | Generates from crawl data |
| GET /ai/providers-status | `get_providers_status` | ✅ real | Checks provider configs |
| POST /ai/prompt-test | `test_ai_prompt` | ✅ real | Calls AI provider |
| GET /audit/{id}/schema-analysis | `get_schema_analysis` | ✅ real | Queries DB |
| GET /audit/{id}/canonicalization | `get_canonicalization` | ✅ real | Queries DB |
| GET /audit/{id}/confidence | `get_confidence` | ✅ real | Queries DB |
| GET /audit/{id}/internal-links | `get_internal_links` | ✅ real | Queries DB |
| GET /audit/{id}/page-speed | `get_page_speed` | ⚠️ partial | Depends on external API |
| GET /audit/{id}/eeat-analysis | `get_eeat_analysis` | ✅ real | Queries DB |
| GET /audit/{id}/content-analysis | `get_content_analysis` | ✅ real | Queries DB |
| GET /audit/{id}/conversion-analysis | `get_conversion_analysis` | ⚠️ computed | Generates from audit data |
| GET /audit/{id}/chat-history | `get_chat_history` | ✅ real | Queries DB |
| POST /audit/{id}/chat | `chat_with_audit` | ✅ real | Calls AI provider |
| DELETE /audit/{id} | `delete_audit` | ✅ real | Deletes from DB |
| GET /audit/{id}/ai/summary | `get_ai_summary` | ✅ real | Calls AI provider |
| POST /audit/{id}/ai/write-meta | `write_meta` | ✅ real | Calls AI provider |
| POST /audit/{id}/ai/write-content | `write_content` | ✅ real | Calls AI provider |
| POST /audit/{id}/ai/fix | `ai_fix` | ✅ real | Calls AI provider |
| POST /audit/{id}/ai/fixes | `ai_fixes` | ✅ real | Calls AI provider |
| POST /audit/{id}/ai/tool-suggestions | `tool_suggestions` | ✅ real | Calls AI provider |
| GET /audit/{id}/diagnostics | `get_diagnostics` | ✅ real | Queries DB |
| POST /audit/{id}/ai/schema | `ai_schema` | ✅ real | Calls AI provider |
| POST /audit/{id}/ai/optimize | `ai_optimize` | ✅ real | Calls AI provider |
| GET /audit/{id}/page-intelligence/{url} | `get_page_intelligence` | ✅ real | Queries DB |
| GET /audit/{id}/content-revival | `get_content_revival` | ⚠️ computed | Generates from audit data |
| POST /audit/{id}/generate-content | `generate_content` | ✅ real | Calls AI provider |
| GET /audit/{id}/report-data | `get_report_data` | ✅ real | Queries DB |
| GET /audit/{id}/gsc-overview | `get_gsc_overview` | ⚠️ depends on GSC | Requires Google auth |
| GET /audit/{id}/gsc-keywords | `get_gsc_keywords` | ⚠️ depends on GSC | Requires Google auth |
| GET /audit/{id}/backlink-profile | `get_backlink_profile` | ⚠️ depends on API | Requires backlink provider |
| GET /audit/{id}/local-seo | `get_local_seo` | ✅ real | Queries DB |
| GET /audit/{id}/mobile-seo | `get_mobile_seo` | ✅ real | Queries DB |
| GET /audit/{id}/image-seo | `get_image_seo` | ✅ real | Queries DB |
| GET /audit/{id}/sitemap-robots | `get_sitemap_robots` | ✅ real | Queries DB |
| GET /audit/{id}/security-headers | `get_security_headers` | ✅ real | Queries DB |
| GET /audit/{id}/social-seo | `get_social_seo` | ✅ real | Queries DB |
| GET /audit/{id}/page-experience | `get_page_experience` | ✅ real | Queries DB |
| GET /audit/{id}/content-quality | `get_content_quality` | ✅ real | Queries DB |
| GET /audit/{id}/ai-overviews | `get_ai_overviews` | ⚠️ computed | Generates from crawl data |
| GET /audit/{id}/seo-health | `get_seo_health` | ✅ real | Queries DB |
| POST /audit/{id}/ai-suggestions | `get_ai_suggestions` | ✅ real | Calls AI provider |
| GET /audit/{id}/keywords-enhanced | `get_keywords_enhanced` | ⚠️ computed | Enhances keyword data |
| GET /audit/{id}/keyword-research | `get_keyword_research` | ⚠️ computed | Generates from audit data |
| GET /audit/{id}/content-audit | `get_content_audit` | ✅ real | Queries DB |
| GET /audit/{id}/blog-ai | `get_blog_ai` | ✅ real | Queries DB |
| GET /audit/{id}/page-improvements | `get_page_improvements` | ✅ real | Queries DB |
| GET /audit/{id}/compare/{other_id} | `compare_audits` | ✅ real | Compares two audits |
| GET /portfolio | `get_portfolio` | ✅ real | Queries DB |
| GET /audit/{id}/enterprise | `get_enterprise` | ✅ real | Queries DB |
| GET /audit/{id}/enterprise/{idx} | `get_enterprise_page` | ✅ real | Queries DB |
| GET /audit/{id}/remediation-feed | `get_remediation_feed` | ⚠️ computed | Generates from issues |
| GET /audit/{id}/content-rewrite/{idx} | `get_content_rewrite` | ✅ real | Queries DB |
| GET /audit/{id}/content-opportunities | `get_content_opportunities` | ⚠️ computed | Generates from audit data |
| GET /audit/{id}/page-intelligence-deep/{idx} | `get_page_intelligence_deep` | ✅ real | Queries DB |
| GET /audit/{id}/page-intelligence-deep-by-url | `get_page_intelligence_deep_by_url` | ✅ real | Queries DB |
| GET /audit/{id}/content-deep/{idx} | `get_content_deep` | ✅ real | Queries DB |
| GET /audit/{id}/content-deep-by-url | `get_content_deep_by_url` | ✅ real | Queries DB |
| GET /audit/{id}/recommendations-deep/{idx} | `get_recommendations_deep` | ✅ real | Queries DB |
| GET /audit/{id}/recommendations-deep-by-url | `get_recommendations_deep_by_url` | ✅ real | Queries DB |
| GET /audit/{id}/ai-search-deep/{idx} | `get_ai_search_deep` | ✅ real | Queries DB |
| GET /audit/{id}/ai-search-deep-by-url | `get_ai_search_deep_by_url` | ✅ real | Queries DB |
| GET /audit/{id}/ai-search-intelligence/{idx} | `get_ai_search_intelligence` | ✅ real | Queries DB |
| GET /audit/{id}/ai-search-intelligence-by-url | `get_ai_search_intelligence_by_url` | ✅ real | Queries DB |
| GET /audit/{id}/competitor-deep/{idx} | `get_competitor_deep` | ✅ real | Queries DB |
| GET /audit/{id}/competitor-deep-by-url | `get_competitor_deep_by_url` | ✅ real | Queries DB |
| GET /audit/{id}/dashboard-deep | `get_dashboard_deep` | ✅ real | Queries DB |
| GET /audit/{id}/ai-recommendations/{idx} | `get_ai_recommendations` | ✅ real | Queries DB |
| GET /audit/{id}/ai-recommendations-global | `get_ai_recommendations_global` | ✅ real | Queries DB |
| GET /audit/{id}/ai-content-suggestion/{idx} | `get_ai_content_suggestion` | ✅ real | Queries DB |
| GET /mega-analysis/{id}/by-url | `get_mega_analysis_by_url` | ✅ real | Queries DB |
| GET /mega-analysis/{id}/{idx} | `get_mega_analysis` | ✅ real | Queries DB |
| GET /full-strategy/{id} | `get_full_strategy` | ✅ real | Queries DB |
| GET /all-pages-mega/{id} | `get_all_pages_mega` | ✅ real | Queries DB |
| GET /audit/{id}/ai-bot-intelligence/{idx} | `get_ai_bot_intelligence` | ✅ real | Queries DB |
| GET /audit/{id}/offsite-authority/{idx} | `get_offsite_authority` | ✅ real | Queries DB |
| GET /audit/{id}/schema-intelligence/{idx} | `get_schema_intelligence` | ✅ real | Queries DB |
| GET /audit/{id}/speed-intelligence/{idx} | `get_speed_intelligence` | ✅ real | Queries DB |
| GET /audit/{id}/content-deep-v2/{idx} | `get_content_deep_v2` | ✅ real | Queries DB |
| GET /audit/{id}/enterprise-dashboard | `get_enterprise_dashboard` | ✅ real | Queries DB |
| GET /audit/{id}/page-intelligence-v2/{idx} | `get_page_intelligence_v2` | ✅ real | Queries DB |
| GET /audit/{id}/page-speed-live | `get_page_speed_live` | ⚠️ depends on PSI | Requires PageSpeed API |
| GET /audit/{id}/core-web-vitals | `get_core_web_vitals` | ⚠️ depends on CrUX | Requires CrUX API |
| POST /audit/{id}/core-web-vitals | `save_core_web_vitals` | ✅ real | Saves to DB |
| POST /audit/{id}/run-local-lighthouse | `run_local_lighthouse` | ⚠️ depends on LH | Requires Lighthouse CLI |
| GET /audit/{id}/ga4-traffic | `get_ga4_traffic` | ⚠️ depends on GA4 | Requires GA4 auth |
| GET /audit/{id}/ga4-top-pages | `get_ga4_top_pages` | ⚠️ depends on GA4 | Requires GA4 auth |
| GET /audit/{id}/historical | `get_historical` | ✅ real | Queries DB |
| GET /audit/{id}/trends | `get_trends` | ✅ real | Queries DB |

---

## Backend Endpoint Audit — Other Routers

| Router | Endpoints | Notes |
|---|---|---|
| audit.py | 8 | Start, history, cancel, rerun, export (csv/excel/html) |
| insights.py | 11 | Drift, hreflang, redirects, duplicates, domain authority, JS dep, content briefs, usage, demo, public info, keyword volumes |
| rank_boost.py | 4 | Rank boost generate, win proof generate |
| action_studio.py | 9 | Action items, enhance, etc. |
| auth.py | 8 | Login, register, me, API keys, password |
| webhooks.py | 5 | CRUD + test |
| scheduled.py | 4 | CRUD |
| whitelabel.py | 2 | Get/update |
| oauth.py | 4 | Google OAuth flow |
| digest.py | 4 | Preferences, send |
| rankings.py | 2 | Capture rankings |
| gsc_settings.py | 4 | CRUD GSC settings |
| programmatic.py | 14 | Templates, entries, preview, generate |
| uptime.py | 6 | Targets CRUD + check |
| workspaces.py | 10 | CRUD + members + audits |
| providers.py | 7 | CRUD + test |
| brand_monitor.py | 2 | History + monitor |
| apply_fix.py | 2 | Apply fix, dismiss issue |
| free_data.py | 8 | Autocomplete, site-checks, whois, dns, ssl, page-inspector, schema-detector, sitemap-robots |
| backlink_explorer.py | 5 | Explorer, referring domains, toxic, gap |
| backlink_gap.py | 1 | Backlink gap |
| keyword_gap.py | 1 | Keyword gap |
| domain_overview.py | 1 | Domain overview |
| rank_tracking.py | 6 | Keywords CRUD + refresh |
| research.py | 5 | Keyword difficulty, traffic estimate, keyword universe, trust flow, URL inspection |
| ai_visibility_trend.py | 1 | AI visibility trend |
| content_editor.py | 1 | Live content editor |
| shares.py | 4 | Create, get, revoke, list shares |
| alerts.py | 4 | Slack settings CRUD + test |
| activity.py | 1 | Activity log |
| admin.py | 4 | Admin dashboard, users, API keys |

---

## API Client Issues (from Phase 1 audit)

### Critical

| Issue | Location | Detail |
|---|---|---|
| Export methods bypass all error handling | `api.js:158-196` | `exportCsv`, `exportExcel`, `exportHtml` use raw `fetch()` — no timeout, no retry, no 401 handling |
| No token refresh / expiry detection | `AuthContext.jsx` / `api.js` | No refresh token flow. Stale tokens cause silent 401 redirects |
| User object not cleared on 401 | `api.js:24-29` | Only `token` is removed from localStorage; `user` persists, creating inconsistent state |

### High

| Issue | Location | Detail |
|---|---|---|
| 200-second timeout is excessive | `api.js:2` | Most GET endpoints should timeout at 30-60s |
| `generateContent` sends raw `data` not JSON | `api.js:132` | Missing `JSON.stringify()` — sends `[object Object]` |
| Memory leak in export blob URLs | `api.js:169,182,195` | `URL.revokeObjectURL()` called synchronously before download completes |
| Duplicate endpoint definitions | `api.js:92,123` | `getContentData` and `getContentAnalysis` both call `/content-analysis` |

---

## Known Gaps (not yet implemented)

| Feature | Backend Status | Frontend Status |
|---|---|---|
| Core Web Vitals (CrUX) | Endpoint exists but depends on CrUX API | Page renders |
| PageSpeed Insights | Endpoint exists but depends on PSI API | Page renders |
| Lighthouse | Endpoint exists but requires Lighthouse CLI | Page renders |
| Backlink data | Endpoint exists but depends on external provider | Page renders |
| GSC data | Endpoint exists but requires Google OAuth | Page renders |
| GA4 data | Endpoint exists but requires GA4 auth | Page renders |
| Rank tracking | Endpoint exists but depends on SERP API | Page renders |
| SSL verification | `verify=False` hardcoded in crawler | N/A |
| Robots.txt compliance | Not implemented in crawler | N/A |
