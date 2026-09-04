# UX_ISSUES.md — Phase 2 UI/UX Audit

Generated from automated audit of the seo-platform frontend.
Last updated: 2026-09-04

---

## Executive Summary

| Category | Issues Found |
|---|---|
| Loading/empty/error states | 8 |
| Navigation & IA | 3 |
| Consistency | 5 |
| Responsiveness | 4 |
| Performance | 3 |
| **Total** | **23** |

---

## 1. Loading / Empty / Error States

### L1: No global skeleton system
- **File**: All page components
- **Issue**: Most pages use `ShimmerLoader` or `Skeleton` inconsistently. Some pages show a spinner, some show shimmer, some show nothing while loading.
- **Recommendation**: Standardize on `PageShell` component for all data-fetching pages with consistent skeleton → data → empty/error transitions.

### L2: Empty states not actionable
- **Files**: `ContentIntelligence.jsx`, `KeywordStrategy.jsx`, `BacklinkProfile.jsx`, `OffsiteAuthority.jsx`
- **Issue**: When API returns empty data, pages show generic "No data available" without explaining why or what to do next.
- **Fix**: Add contextual empty states with clear CTAs (e.g., "No backlink data yet. Connect a backlink provider in Settings → Integrations.").

### L3: Error states inconsistent
- **Files**: `SpeedAnalysis.jsx`, `InternalLinks.jsx`, `SchemaAnalysis.jsx`
- **Issue**: Some pages show error messages in red boxes, others show nothing, others show a retry button without the error message.
- **Fix**: Use `ErrorState` component consistently across all pages.

### L4: Loading states for dependent data
- **File**: `Dashboard.jsx`, `ExecutiveDashboard.jsx`
- **Issue**: These pages fetch 6+ endpoints in parallel. Some sections render before all data arrives, causing layout shifts.
- **Fix**: Use `Promise.all` with a single loading gate, or skeleton per section.

### L5: No skeleton for tabbed pages
- **Files**: `GeoAeoOverview.jsx`, `TechnicalHubs.jsx`, `ContentStudio.jsx`
- **Issue**: Tab content shows blank until loaded. No skeleton placeholder for tab panels.
- **Fix**: Add skeleton states to `TabbedPage` component.

### L6: AuditProgress doesn't handle completion
- **File**: `AuditProgress.jsx`
- **Issue**: When audit completes, page shows "completed" status but doesn't auto-redirect or show a clear "View Dashboard" CTA.
- **Fix**: Add auto-redirect after 3s or prominent CTA button.

### L7: No loading state for AI operations
- **Files**: `ContentRewriter.jsx`, `BlogAi.jsx`, `AiChat.jsx`
- **Issue**: AI generation requests can take 30+ seconds. No progress indicator or estimated time shown.
- **Fix**: Add streaming/progress feedback for long-running AI operations.

### L8: Stale data after navigation
- **File**: `AuditCompare.jsx`
- **Issue**: When switching between compared audits, previous audit data briefly flashes before new data loads.
- **Fix**: Clear state before fetching new data.

---

## 2. Navigation & IA

### N1: AI Overviews Monitor dead link
- **File**: `sidebar.config.js` — OVERVIEW_ITEMS
- **Issue**: `path: '/audit-ai-overviews'` has no matching route. Clicking this sidebar item shows a blank page or 404.
- **Fix**: Remove this item from OVERVIEW_ITEMS or create a proper route.

### N2: Issue Remediation redirect inconsistency
- **File**: `sidebar.config.js` — AUDIT_GROUPS > Actions & Roadmap
- **Issue**: `/issues` redirects to `/action-hub?tab=issues` instead of rendering directly. All other sidebar items render their own component.
- **Fix**: Either create a dedicated IssuesExplorer route or update the sidebar to show the redirect destination.

### N3: Duplicate "Rank Tracking" labels
- **File**: `sidebar.config.js`
- **Issue**: "Rank Tracking" appears in both Audit Workspace (Keywords & Competitors group) and Site Tools context. Both link to different routes (`/audit/:id/rankings` vs `/rank-tracking`).
- **Fix**: Rename one to clarify (e.g., "Rank Tracking (this audit)" vs "Rank Tracking (all sites)").

---

## 3. Consistency

### C1: Score color thresholds inconsistent
- **Files**: `ScoreRing.jsx`, `ScoreGauge.jsx`, `ThemeStatCard.jsx`
- **Issue**: ScoreRing uses 0-40 red, 40-70 yellow, 70+ green. ScoreGauge uses 0-30 red, 30-60 orange, 60-80 yellow, 80+ green. ThemeStatCard uses different thresholds entirely.
- **Fix**: Define shared score thresholds in `components/ai/theme.js` and use everywhere.

### C2: Button styles inconsistent
- **Files**: Multiple pages
- **Issue**: Some pages use `btn btn-primary`, others use inline `style={{ background: '...' }}`, others use `btn btn-ghost`. No single primary action style.
- **Fix**: Standardize on CSS classes, remove inline button styles.

### C3: Card padding inconsistent
- **Files**: `Dashboard.jsx`, `ExecutiveDashboard.jsx`, `PortfolioDashboard.jsx`
- **Issue**: Dashboard uses `padding: 20px`, Executive uses `padding: 24px`, Portfolio uses `padding: 16px`.
- **Fix**: Use `var(--radius)` and consistent padding from design tokens.

### C4: Color for "danger" varies
- **Files**: `IssuesExplorer.jsx`, `SecurityHeaders.jsx`, `ToxicLinks.jsx`
- **Issue**: IssuesExplorer uses `#ef4444`, SecurityHeaders uses `#dc2626`, ToxicLinks uses `#b91c1c` for the same semantic meaning (danger/critical).
- **Fix**: Use `var(--red)` consistently.

### C5: Font sizes inconsistent
- **Files**: `AuditReport.jsx`, `SeoHealth.jsx`, `ContentQuality.jsx`
- **Issue**: Score displays use 36px, 42px, and 48px respectively for the same type of metric.
- **Fix**: Use consistent font sizes per component tier from design tokens.

---

## 4. Responsiveness

### R1: Tables overflow on mobile
- **Files**: `PagesList.jsx`, `IssuesExplorer.jsx`, `Keywords.jsx`, `InternalLinks.jsx`
- **Issue**: Wide tables cause horizontal scroll on screens < 768px. No card/stack layout fallback.
- **Fix**: Add responsive table wrapper or card layout for mobile.

### R2: Dashboard grid breaks on tablet
- **File**: `Dashboard.jsx`
- **Issue**: `grid-4` becomes `grid-2` at 1024px but stat cards become too narrow.
- **Fix**: Adjust grid breakpoints or use `auto-fill` with `minmax()`.

### R3: Sidebar panel overflow
- **File**: `Layout.jsx`
- **Issue**: With many audit groups expanded, the sidebar panel can overflow its container on shorter screens.
- **Fix**: Ensure sidebar panel has proper `overflow-y: auto` and max-height.

### R4: Topbar hamburger on tablet
- **File**: `Layout.jsx`
- **Issue**: At 1024px, the hamburger appears but the sidebar rail is still visible, creating a cramped layout.
- **Fix**: At 1024px, hide the rail entirely and show only the hamburger.

---

## 5. Performance

### P1: No request deduplication
- **File**: `api.js`
- **Issue**: React strict mode causes double-fetching. No AbortController per-component to cancel stale requests.
- **Fix**: Add AbortController support to `request()` and cleanup in `useEffect` return.

### P2: Large tables unpaginated
- **Files**: `PagesList.jsx` (hardcoded limit=200), `IssuesExplorer.jsx` (fetches all issues)
- **Issue**: Pages with 200+ rows render all at once, causing slow initial paint.
- **Fix**: Implement virtual scrolling or pagination with server-side offset/limit.

### P3: No image lazy loading
- **Files**: `Dashboard.jsx`, `ExecutiveDashboard.jsx`, `AuditReport.jsx`
- **Issue**: Dashboard charts and report images load eagerly even when below the fold.
- **Fix**: Add `loading="lazy"` to below-fold images and use `React.lazy` for chart components.

---

## 6. Accessibility

### A1: No keyboard focus indicators
- **File**: All pages
- **Issue**: Custom styled buttons and links don't show visible focus rings for keyboard navigation.
- **Fix**: Add `:focus-visible` styles to all interactive elements.

### A2: Color-only status signals
- **Files**: `ScoreRing.jsx`, `ScoreGauge.jsx`, `SecurityHeaders.jsx`
- **Issue**: Score colors (red/yellow/green) are the only signal for status. No icon or text label.
- **Fix**: Add icons (check/warning/x) alongside color indicators.

### A3: Form inputs without labels
- **Files**: `NewAudit.jsx`, `SettingsPage.jsx`, `LiveContentEditor.jsx`
- **Issue**: Some form inputs use placeholder text as the only label. Screen readers can't identify the field.
- **Fix**: Add `<label>` elements or `aria-label` attributes.

### A4: Missing ARIA landmarks
- **File**: `Layout.jsx`
- **Issue**: Sidebar doesn't use `<nav>` with `aria-label`. Main content doesn't use `<main>`.
- **Fix**: Add proper ARIA landmarks to the layout shell.
