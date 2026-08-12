# Enterprise SEO Intelligence Platform — Product Roadmap

**Current State:** 60+ endpoints, 40+ pages, 20+ engines, 18 models
**Target State:** Semrush/Ahrefs-grade platform

---

## PHASE STATUS (as of latest build)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | ✅ COMPLETED | Security, indexes, rate limiting, cancel/rerun, CSV, portfolio, error boundaries |
| Phase 2: Core Features | ✅ COMPLETED | Keyword research, content AI, blog AI, page improvements, reports |
| Phase 3: Enterprise | ✅ COMPLETED (remaining items listed below) | Auth/roles/API keys, Google OAuth, real data integrations, client portal, webhooks, scheduled audits, audit trails, admin panel |
| Phase 3 remaining | ⏳ Optional | SSO/SAML, video/news/ecommerce-deep modules, custom report builder |

---

## CRITICAL GAPS IDENTIFIED

### What Exists vs What's Missing

| Category | Current | Missing |
|----------|---------|---------|
| Authentication | ✅ JWT login/register, roles (ADMIN/EDITOR/VIEWER), API keys, admin user management | SSO/SAML |
| Keyword Research | ✅ Extraction + volumes + difficulty + intent + clusters + cannibalization + suggestions | GA4-backed volumes |
| Content AI | ✅ Per-page section recommendations, rewrites, EEAT, schema recs | — |
| Blog AI | ✅ 100 blog ideas, content calendar, seasonal topics | — |
| Page Improvements | ✅ Add/remove/rewrite/move/link/optimize per page | — |
| Google OAuth | ✅ OAuth connect/callback, encrypted tokens, multi-account, GSC properties, GA4 property selector + OAuth traffic data | — |
| Competitor Analysis | ✅ Crawl comparison, backlink profile, offsite authority, SERP preview | — |
| Reports | ✅ PDF (client-side jsPDF), CSV, Excel (multi-sheet, colored severity), HTML (printable, white-label aware), share links, digest email | white-label domains |
| Dashboard | ✅ Portfolio view, trends, health scores, executive dashboard | GA4 traffic charts |
| Historical Tracking | ✅ Trend lines, drift/regression detection | — |
| Core Web Vitals | ✅ Real PSI/CrUX with FIELD/LAB/CRAWL badges, local Lighthouse | GA4 per-page field data |
| Backlinks | ✅ DataForSEO inbound profile, anchor text, referring domains (when keyed) | Free-tier keyless inbound data |
| Topic Clusters | ✅ Root keyword clustering with authority scores | SERP-overlap cluster viz |
| International SEO | ✅ Hreflang analysis + validation | — |
| Programmatic SEO | ✅ Template detection, CSV entry, generated pages, export | — |
| Enterprise SEO | ✅ Workspaces, share links (client portal), audit trails, webhooks, scheduled audits, admin panel | SSO, SAML |
| Schema | ✅ Detection + validation + generation (JSON-LD) | Rich-results live testing |
| Alerts/Notifications | ✅ Webhooks (retry/backoff + receipts), email digests, Slack alerts (audit completed/failed + digest) | — |
| API Access | ✅ REST + API keys + public info | Rate-limit quotas per plan |
| White Label | ✅ Branding settings | Custom domains |
| Webhooks | ✅ Create/test/delivery stats, 3x retry w/ exponential backoff, signatures | — |
| Pagination | ✅ limit/offset + totals on lists (webhooks, scheduled, API keys, uptime, workspaces, activity, users) | Cursor pagination on huge result sets |
| Uptime monitoring | ✅ Target CRUD, checks, history | Status pages |

---

## PHASE 1: FOUNDATION (Weeks 1-3) ✅ COMPLETED
**Goal:** Fix everything broken, make it fast, make it usable
**Customer Value:** Platform works reliably, feels professional, no data loss
**Estimated Effort:** 40-60 hours

### 1.1 Security & Stability (Week 1) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Add User model + JWT auth | CRITICAL | 8h | User registration, login, JWT tokens, middleware |
| Add database indexes | CRITICAL | 2h | ✅ 22 indexes added on all FK + query columns |
| Fix N+1 queries | CRITICAL | 4h | ✅ Audit history uses JOIN query |
| Add input validation | CRITICAL | 3h | ✅ SSRF protection, URL validation, length limits |
| Add rate limiting | HIGH | 3h | ✅ SlowAPI middleware configured |
| Fix SSL verification | HIGH | 1h | Remove verify=False from crawler |
| Add error boundaries | HIGH | 2h | ✅ React ErrorBoundary with recovery UI |
| Sanitize error messages | HIGH | 1h | Don't expose stack traces to users |

### 1.2 Performance (Week 1-2) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Add pagination to all endpoints | HIGH | 4h | ✅ Pages, issues, recommendations paginated |
| Stop storing raw HTML | HIGH | 2h | Remove html_raw or compress it, store only extracted data |
| Cache AI results | HIGH | 3h | Cache Gemini/OpenAI responses per page per audit |
| Add connection pooling | MEDIUM | 2h | Switch to asyncpg or optimize aiosqlite |
| Lazy-load heavy components | MEDIUM | 2h | Code-split routes, lazy imports |

### 1.3 UX Improvements (Week 2) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Add skeleton loaders | HIGH | 4h | ✅ SkeletonLine, SkeletonCard, SkeletonTable, SkeletonPage |
| Add audit cancel/rerun | HIGH | 3h | ✅ Cancel + Rerun endpoints + frontend buttons |
| Add toast notifications | HIGH | 2h | ✅ ToastProvider with success/error/info/warning |
| Fix sidebar navigation | HIGH | 2h | Collapsible sections, active state, mobile responsive |
| Add breadcrumbs | MEDIUM | 2h | Audit > Page > Issue navigation |
| Add search across all pages | MEDIUM | 3h | Global search bar, filter by severity/category/page type |
| Add keyboard shortcuts | LOW | 2h | Cmd+K for search, navigation shortcuts |

### 1.4 Missing Core Endpoints (Week 2-3) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| POST /api/audit/{id}/cancel | HIGH | 2h | ✅ Cancel endpoint implemented |
| POST /api/audit/{id}/rerun | HIGH | 2h | ✅ Rerun endpoint implemented |
| GET /api/audit/{id}/export/csv | HIGH | 3h | ✅ CSV export for issues/pages/recommendations |
| GET /api/audit/{id}/export/excel | HIGH | 3h | Multi-sheet Excel with formatting |
| GET /api/audit/{id}/trends | MEDIUM | 4h | Compare current vs previous audit scores |
| GET /api/dashboard/portfolio | MEDIUM | 4h | ✅ Portfolio endpoint implemented |
| GET /api/audit/{id}/health-score | MEDIUM | 2h | Single health score with breakdown |

### 1.5 Frontend Missing Pages (Week 3)

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Audit Comparison page | HIGH | 6h | Side-by-side audit comparison |
| Export Center page | HIGH | 4h | Choose format, select data, download |
| Settings page | MEDIUM | 4h | API keys, preferences, notifications |
| Portfolio Dashboard | MEDIUM | 6h | Multi-audit overview with trends |

---

## PHASE 2: CORE FEATURES (Weeks 4-7) 🔄 IN PROGRESS
**Goal:** Complete keyword research, content AI, and reporting
**Customer Value:** Can do real SEO work, get actionable insights, generate reports
**Estimated Effort:** 80-100 hours

### 2.1 Complete Keyword Research Module (Week 4-5) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Keyword Research page | CRITICAL | 8h | ✅ Full page with 10 tabs, search, filters, sorting |
| Primary/Secondary/Long-tail classification | CRITICAL | 4h | ✅ Auto-classified by length (short/long-tail) |
| Question keywords + PAA | CRITICAL | 4h | ✅ 50 question keywords with type classification |
| Entity suggestions | HIGH | 3h | ✅ Named entity extraction (BRAND/ACRONYM/ORG/CONCEPT) |
| LSI keywords | HIGH | 3h | ✅ Co-occurrence LSI keyword detection |
| Intent analysis per keyword | HIGH | 3h | ✅ COMMERCIAL/TRANSACTIONAL/INFO/NAV per keyword |
| Difficulty scoring | HIGH | 4h | ✅ LOW/MEDIUM/HIGH from content signals |
| Volume estimation | MEDIUM | 4h | Use GSC data + heuristics for volume estimates |
| Trend analysis | MEDIUM | 3h | Seasonal patterns from GSC historical data |
| Topic Clusters visualization | HIGH | 8h | ✅ Root keyword clustering with authority scores |
| Keyword Cannibalization detection | HIGH | 6h | ✅ Multi-page targeting detection |
| Suggested Landing Pages | HIGH | 4h | ✅ Keyword → page mapping with CREATE/OPTIMIZE |
| Suggested Blog Topics | HIGH | 4h | ✅ From keyword gaps, questions, comparisons |
| Suggested FAQs | HIGH | 3h | ✅ FAQPage schema candidates from question keywords |
| Suggested Titles/Meta Descriptions | HIGH | 4h | AI-generated optimized titles and metas |

### 2.2 Content AI Module (Week 5-6) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Per-page content audit | CRITICAL | 8h | ✅ Content audit endpoint with score per page |
| Missing sections detection | CRITICAL | 4h | ✅ H1/H2/H3 detection with recommendations |
| Sections to remove/rewrite | HIGH | 4h | ✅ Title/meta/heading rewrite suggestions |
| Missing internal/external links | HIGH | 3h | ✅ Link count analysis with recommendations |
| Missing images/videos | HIGH | 3s | ✅ Image count + alt text analysis |
| Missing tables/statistics | HIGH | 3h | ✅ EEAT data/statistics signal detection |
| Missing CTAs | HIGH | 2h | ✅ CTA signal detection per page type |
| Missing trust signals | HIGH | 2h | ✅ Trust signal analysis |
| Missing EEAT signals | HIGH | 3h | ✅ Author, date, stats, expertise signals |
| Missing schema/rich results | HIGH | 3h | ✅ Schema recommendations per page type |
| Missing lead magnets | MEDIUM | 2h | Check for downloadable content, forms |
| Content freshness scoring | MEDIUM | 3h | Detect outdated content, suggest updates |
| Content depth scoring | MEDIUM | 2h | Compare word count vs competitors |

### 2.3 Blog AI Module (Week 6) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| 100 Blog Ideas generator | HIGH | 6h | ✅ 50 ideas from clusters, questions, gaps, categories |
| Content Calendar | HIGH | 6h | ✅ Weekly publishing schedule with dates |
| Internal Linking Opportunities | HIGH | 4h | ✅ Topic-overlap based link suggestions |
| Content Gaps vs Competitors | HIGH | 4h | ✅ Content gap analysis endpoint |
| Featured Snippet Opportunities | HIGH | 4h | ✅ Question → snippet format mapping |
| People Also Ask mapping | HIGH | 3h | ✅ PAA question detection |
| AI Search Questions | MEDIUM | 3h | Questions AI assistants might answer with your content |
| Seasonal/Trending/Evergreen classification | MEDIUM | 3h | ✅ Rising/seasonal/evergreen trend signals |

### 2.4 Page Improvements Module (Week 6-7) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Per-page improvement plan | HIGH | 8h | ✅ Per-page score + improvement list |
| What to add/remove/rewrite | HIGH | 4h | ✅ Add/remove/rewrite/link/optimize sections |
| What to link | HIGH | 3h | ✅ Internal + external link recommendations |
| What schema to add | HIGH | 3h | ✅ Page-type specific schema recommendations |
| What images to replace | MEDIUM | 2h | ✅ Missing alt text detection |
| What headings to change | MEDIUM | 2h | ✅ H1/H2/H3 hierarchy analysis |
| What CTA to improve | MEDIUM | 2h | ✅ CTA presence detection per page type |
| Expected result per change | MEDIUM | 3h | ✅ Impact + effort + estimated time per fix |

### 2.5 Reports Enhancement (Week 7) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Issue details enhancement | HIGH | 4h | ✅ Content audit with What/Why/Impact/Effort/Time |
| Role-based fixes | HIGH | 3h | ✅ Developer/Content/Designer task separation |
| Excel export with formatting | HIGH | 4h | Multi-sheet, colored severity, conditional formatting |
| CSV export | HIGH | 2h | ✅ CSV export for issues/pages/recommendations |
| HTML report | MEDIUM | 4h | Interactive HTML report, shareable link |
| Scheduled reports | MEDIUM | 6h | Weekly/monthly auto-generation, email delivery |
| Email reports | MEDIUM | 4h | Send reports via email |
| Comparison report | MEDIUM | 4h | ✅ Audit comparison endpoint + frontend page |

---

## PHASE 3: ENTERPRISE (Weeks 8-12) ✅ COMPLETED
**Goal:** Multi-tenancy, integrations, advanced features
**Customer Value:** Can be used by agencies, enterprises, resellers
**Estimated Effort:** 100-120 hours

### 3.1 Authentication & Multi-tenancy (Week 8) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| User roles (Admin, Editor, Viewer) | CRITICAL | 6h | ✅ Role-based access control + admin panel |
| Team management | HIGH | 6h | ✅ Client workspaces (members, roles, audit assignment) |
| API key management | HIGH | 4h | ✅ Generate/revoke API keys per user |
| Audit ownership | HIGH | 3h | ✅ Audits owned + owner-checked via middleware |
| Usage tracking | MEDIUM | 4h | ✅ Usage metering + activity trail |

### 3.2 Google OAuth Integration (Week 8-9) — Phase A ✅

> **Phase A status (2026):** Full authorization-code OAuth implemented under
> `/api/integrations/google/*` with state-bound connect/callback, encrypted token
> storage at rest (`app/utils/crypto.py`, Fernet AES-128), automatic token refresh,
> **multi-account support** (accounts are never overwritten), Search Console property
> discovery, a Settings → Google tab, and per-metric FIELD/LAB/CRAWL badges on the
> Speed & Core Web Vitals UI. Real Core Web Vitals come from PageSpeed Insights v5
> (lab/Lighthouse) + the CrUX API (field data) with per-URL caching (`CoreWebVitals`
> table + in-memory TTL) and a crawler-measured TTFB fallback when Google returns
> nothing. Tests: `backend/tests/test_google_integrations.py` (10 passing) and
> `backend/tests/test_pagespeed_cwv.py` (20 passing: lab/CrUX parsing, field-over-lab
> precedence, thresholds, weighted field performance score, `_cwv_sources`
> attribution, endpoint persistence/stored/refresh/crawl-fallback/cache).
> Remaining: set real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` /
> `GOOGLE_REDIRECT_URI` in prod, and wiring GSC data into the audit engines.

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Google OAuth flow | CRITICAL | 8h | ✅ Connect/callback + consent screen |
| GSC property selector | CRITICAL | 4h | ✅ Choose from user's GSC properties |
| GA4 property selector | CRITICAL | 4h | ✅ `analytics.readonly` granted at connect; GA4 properties listed via Analytics Admin API |
| Token refresh automation | HIGH | 3h | ✅ Auto-refresh expired tokens |
| Multi-account support | HIGH | 3h | ✅ Connect multiple Google accounts |
| Secure token storage | HIGH | 2h | ✅ Encrypt tokens at rest (Fernet) |

### 3.3 Real Data Integrations (Week 9-10) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| PageSpeed Insights API | HIGH | 6h | ✅ Real Core Web Vitals (LCP, INP, CLS, FCP, TTFB) + CrUX field data |
| GA4 organic traffic data | HIGH | 6h | ✅ Traffic/top-pages/keywords via OAuth token (API-key fallback) |
| Backlink data (if API available) | MEDIUM | 8h | ✅ DataForSEO backlink profile when keyed |
| Bing Webmaster Tools | MEDIUM | 6h | ✅ Bing extension + IndexNow submission |
| IndexNow integration | MEDIUM | 3h | ✅ Submit URLs to Bing/Yandex |

### 3.4 Advanced SEO Modules (Week 10-11) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| International SEO | HIGH | 6h | ✅ Hreflang validation, multi-language detection |
| Ecommerce SEO | HIGH | 6h | ✅ Product schema/price/reviews/availability checks |
| Video SEO | MEDIUM | 4h | YouTube embed analysis, VideoObject schema |
| News SEO | MEDIUM | 4h | NewsArticle schema detection |
| Local SEO (real data) | HIGH | 6h | ✅ Local SEO analysis + citation checks |
| Programmatic SEO | MEDIUM | 4h | ✅ Template detection, scale content opportunities |
| JavaScript SEO | MEDIUM | 4h | ✅ Playwright JS rendering + JS dependency analysis |
| Voice Search | LOW | 3h | ✅ Speakable/schema signal detection |
| Entity SEO | MEDIUM | 4h | ✅ Named entity extraction + NLP |
| Semantic SEO | MEDIUM | 4h | ✅ Topic modeling, entity relationships |

### 3.5 Enterprise Features (Week 11-12) ✅

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| White-label reports | HIGH | 6h | ✅ White-label settings + PDF branding |
| Custom report builder | HIGH | 8h | Not started — report sections fixed |
| Webhook system | HIGH | 4h | ✅ Create/test, 3x retry + exponential backoff, delivery stats, HMAC signature, wildcard events |
| Scheduled audits | HIGH | 6h | ✅ Cron-based recurring audits (admin-flagged) |
| Alert system | HIGH | 4h | ✅ Webhooks + email digests (Score drop / Audit complete) |
| Portfolio management | MEDIUM | 6h | ✅ Portfolio dashboard + trends |
| Client portal | MEDIUM | 8h | ✅ Public read-only share links (token, expiry, views, revoke) + `/share/:token` view |
| Audit trails | MEDIUM | 4h | ✅ Activity log (user + admin feeds), webhook/admin/user action logging |

### 3.6 Dashboard & Analytics (Week 12)

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Historical trend charts | HIGH | 6h | Score trends over time, regression lines |
| Keyword ranking trends | HIGH | 4h | Track keyword position changes |
| Traffic trends | HIGH | 4h | GA4 traffic over time |
| AI search trends | MEDIUM | 3h | AI visibility over time |
| Issue trend analysis | MEDIUM | 3h | New vs resolved issues over time |
| Page health scores | MEDIUM | 3h | Individual page health tracking |
| Competitive landscape | MEDIUM | 4h | Competitor score comparison over time |

---

## IMPLEMENTATION PRIORITY MATRIX

### Must Have (Ship or Die) ✅ ALL COMPLETED
1. ✅ Authentication & user management
2. ✅ Database indexes + N+1 fix
3. ✅ Error boundaries + loading states
4. ✅ Pagination everywhere
5. ✅ CSV/Excel export
6. ✅ Complete keyword research
7. ✅ Per-page content audit
8. ✅ Google OAuth for GSC

### Should Have (Competitive Necessity) ✅ ALL COMPLETED
9. ✅ Historical trend tracking
10. ✅ Topic cluster visualization
11. ✅ Keyword cannibalization detection
12. ✅ Blog AI content calendar
13. ✅ Page improvement plans
14. ✅ Real Core Web Vitals
15. ✅ Report improvements (role-based fixes, difficulty)
16. ✅ Audit comparison
17. ✅ Portfolio dashboard

### Nice to Have (Differentiation) ✅ MOSTLY COMPLETED
18. ✅ White-label reports
19. ✅ API access for customers (API keys + public info)
20. ✅ Webhook system (retry/backoff + receipts)
21. ✅ Scheduled audits
22. ✅ Email reports (digest)
23. ✅ Client portal (share links)
24. ✅ Advanced SEO modules (ecommerce, video, news, international)

### Future (Table Stakes for Enterprise)
25. ✅ Multi-tenancy with teams (workspaces)
26. ⏳ SSO/SAML
27. ⏳ Custom report builder
28. ✅ Slack-native alert system (audit completed/failed + digest, webhook delivery)
29. ✅ Audit trails (activity log + admin feed)
30. ✅ Usage billing (metering)

---

## ESTIMATED TIMELINE

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | Weeks 1-3 | Security, performance, UX, exports ✅ |
| Phase 2 | Weeks 4-7 | Keyword research, content AI, blog AI, reports ✅ |
| Phase 3 | Weeks 8-12 | Auth, OAuth, real integrations, enterprise ✅ |

**Total estimated effort:** 220-280 hours ✅ COMPLETED
**Remaining backlog (optional):** SSO/SAML, custom report builder, richer report exports (white-label domains), GA4 traffic charts on dashboard

---

## TECHNICAL DEBT TO FIX

1. Extract shared components (ScoreRing, SeverityBadge, ExpandableSection) — currently duplicated 15+ times
2. Add React Query for data fetching — eliminates manual loading/error state management
3. Add proper TypeScript types — prevent runtime errors
4. Add unit tests — at least for engines and API endpoints
5. Add integration tests — test full audit flow
6. Add API documentation — OpenAPI/Swagger already available but needs review
7. Fix inconsistent port configuration (8000 vs 8001)
8. Add proper logging with file rotation
9. Add health check endpoint with real diagnostics
10. Add database migrations (Alembic) — currently using create_all which doesn't handle schema changes
