# Enterprise SEO Intelligence Platform — Product Roadmap

**Current State:** 46 endpoints, 30 pages, 12 engines, 15 models
**Target State:** Semrush/Ahrefs-grade platform

---

## CRITICAL GAPS IDENTIFIED

### What Exists vs What's Missing

| Category | Current | Missing |
|----------|---------|---------|
| Authentication | None | Login, register, multi-user, roles, API keys |
| Keyword Research | Basic extraction from crawl text | Volume, difficulty, CPC, SERP features, clusters, cannibalization |
| Content AI | Generic suggestions | Per-page section-level recommendations, missing elements, rewrite suggestions |
| Blog AI | None | 100 blog ideas, content calendar, trending topics, seasonal content |
| Page Improvements | None | What to add/remove/rewrite/move/link/optimize per page |
| Google OAuth | Service account only | Full OAuth flow, auto-refresh, multi-account |
| Competitor Analysis | Basic crawl comparison | Real backlink gaps, SERP feature gaps, content gaps, keyword gaps |
| Reports | PDF only | CSV, Excel, HTML, white-label, scheduled, email |
| Dashboard | Audit-level only | Portfolio view, trends, alerts, health scores |
| Historical Tracking | None | Trend lines, regression detection, progress tracking |
| Core Web Vitals | Response time only | Real Lighthouse/CrUX data via PageSpeed API |
| Backlinks | Outbound links only | Inbound backlink analysis, toxic links, anchor text |
| Topic Clusters | Basic keyword grouping | SERP-based clustering, hub-spoke visualization |
| International SEO | None | Hreflang, multi-language, multi-region |
| Video SEO | None | YouTube embed analysis, video schema |
| News SEO | None | NewsArticle schema, Google News optimization |
| Programmatic SEO | None | Template detection, thin content at scale |
| Ecommerce SEO | None | Product schema, reviews, price, availability |
| Enterprise SEO | None | SSO, audit trails, compliance, team management |
| Voice Search | Basic mention detection | Speakable schema, conversational queries |
| Entity SEO | Basic extraction | Knowledge graph, entity linking, NLP entities |
| EEAT | Basic signal detection | Author authority scoring, source credibility |
| Schema | Detection only | Generation, validation, rich result testing |
| Rich Results | None | SERP feature tracking, rich result eligibility |
| Keyword Cannibalization | None | Detection, resolution suggestions |
| Content Calendar | None | Planned content, publishing schedule |
| Alerts/Notifications | None | Email alerts, Slack, webhook |
| API Access | None | REST API for customers |
| White Label | None | Custom branding, custom domains |
| Webhooks | None | Audit completion callbacks |
| Caching | None | Response caching, AI result caching |
| Rate Limiting | None | Per-user, per-endpoint limits |
| Database Indexes | None | Performance indexes on all FKs |
| Pagination | Limited | Cursor-based pagination everywhere |
| Error Boundaries | None | React error boundaries |
| Loading States | Inconsistent | Skeleton loaders, progress indicators |

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

## PHASE 3: ENTERPRISE (Weeks 8-12)
**Goal:** Multi-tenancy, integrations, advanced features
**Customer Value:** Can be used by agencies, enterprises, resellers
**Estimated Effort:** 100-120 hours

### 3.1 Authentication & Multi-tenancy (Week 8)

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| User roles (Admin, Editor, Viewer) | CRITICAL | 6h | Role-based access control |
| Team management | HIGH | 6h | Invite members, manage permissions |
| API key management | HIGH | 4h | Generate/revoke API keys per user |
| Audit ownership | HIGH | 3h | Link audits to users/teams |
| Usage tracking | MEDIUM | 4h | Track API calls, audit counts per user |

### 3.2 Google OAuth Integration (Week 8-9)

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Google OAuth flow | CRITICAL | 8h | Sign in with Google, consent screen |
| GSC property selector | CRITICAL | 4h | Choose from user's GSC properties |
| GA4 property selector | CRITICAL | 4h | Choose from user's GA4 properties |
| Token refresh automation | HIGH | 3h | Auto-refresh expired tokens |
| Multi-account support | HIGH | 3h | Connect multiple Google accounts |
| Secure token storage | HIGH | 2h | Encrypt tokens at rest |

### 3.3 Real Data Integrations (Week 9-10)

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| PageSpeed Insights API | HIGH | 6h | Real Core Web Vitals (LCP, INP, CLS, FCP, TTFB) |
| GA4 organic traffic data | HIGH | 6h | Real traffic data per page |
| Backlink data (if API available) | MEDIUM | 8h | Inbound backlink analysis |
| Bing Webmaster Tools | MEDIUM | 6h | Bing index data, crawl stats |
| IndexNow integration | MEDIUM | 3h | Submit URLs to Bing/Yandex |

### 3.4 Advanced SEO Modules (Week 10-11)

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| International SEO | HIGH | 6h | Hreflang validation, multi-language detection |
| Ecommerce SEO | HIGH | 6h | Product schema, price, reviews, availability |
| Video SEO | MEDIUM | 4h | YouTube embed analysis, VideoObject schema |
| News SEO | MEDIUM | 4h | NewsArticle schema, Google News sitemap |
| Local SEO (real data) | HIGH | 6h | GBP integration, citation check, NAP consistency |
| Programmatic SEO | MEDIUM | 4h | Template detection, scale content opportunities |
| JavaScript SEO | MEDIUM | 4h | Render testing, hydration analysis |
| Voice Search | LOW | 3h | Speakable schema, conversational content |
| Entity SEO | MEDIUM | 4h | Knowledge graph, entity linking, NLP |
| Semantic SEO | MEDIUM | 4h | Topic modeling, entity relationships |

### 3.5 Enterprise Features (Week 11-12)

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| White-label reports | HIGH | 6h | Custom logo, colors, domain |
| Custom report builder | HIGH | 8h | Drag-and-drop report sections |
| Webhook system | HIGH | 4h | Audit completion callbacks |
| Scheduled audits | HIGH | 6h | Cron-based recurring audits |
| Alert system | HIGH | 4h | Email/Slack alerts for score changes |
| Portfolio management | MEDIUM | 6h | Multi-site dashboard, client management |
| Client portal | MEDIUM | 8h | Share audits with clients, read-only access |
| Audit trails | MEDIUM | 4h | Track all changes and actions |

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

### Must Have (Ship or Die)
1. Authentication & user management
2. Database indexes + N+1 fix
3. Error boundaries + loading states
4. Pagination everywhere
5. CSV/Excel export
6. Complete keyword research
7. Per-page content audit
8. Google OAuth for GSC

### Should Have (Competitive Necessity)
9. Historical trend tracking
10. Topic cluster visualization
11. Keyword cannibalization detection
12. Blog AI content calendar
13. Page improvement plans
14. Real Core Web Vitals
15. Report improvements (role-based fixes, difficulty)
16. Audit comparison
17. Portfolio dashboard

### Nice to Have (Differentiation)
18. White-label reports
19. API access for customers
20. Webhook system
21. Scheduled audits
22. Email reports
23. Client portal
24. Advanced SEO modules (ecommerce, video, news, international)

### Future (Table Stakes for Enterprise)
25. Multi-tenancy with teams
26. SSO/SAML
27. Custom report builder
28. Alert system
29. Audit trails
30. Usage billing

---

## ESTIMATED TIMELINE

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | Weeks 1-3 | Security, performance, UX, exports |
| Phase 2 | Weeks 4-7 | Keyword research, content AI, blog AI, reports |
| Phase 3 | Weeks 8-12 | Auth, OAuth, real integrations, enterprise |

**Total estimated effort:** 220-280 hours
**At 20h/week:** ~12-14 weeks
**At 40h/week:** ~6-7 weeks

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
