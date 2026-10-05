// Single source of truth for the redesigned sidebar navigation.
//
// Two navigation contexts are kept deliberately separate:
//   - Audit-scoped items (href built as /audit/:id<suffix>)
//   - Account-level items (root paths, NOT tied to any one audit)
//
// Adding a page just means adding one entry here — the layout reads this
// model and never needs to change.

// ── Icon names (resolved via getIcon() in routes.config.js) ──────────────

// The standalone Tools context was removed: those pages duplicated audit-scoped
// analysis (keywords, backlinks, ranks) and every one of them needed a paid data
// provider to return anything useful. Their routes still resolve if linked
// directly, they are just no longer surfaced in navigation.
export const NAV_CONTEXTS = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard', shortLabel: 'Overview' },
  { id: 'audit', label: 'Audit', icon: 'FileSearch', shortLabel: 'Audit', default: true },
  { id: 'platform', label: 'Platform', icon: 'Settings', shortLabel: 'Platform' },
];

// ── Overview rail panel (quick shortcuts across the app) ─────────────────
export const OVERVIEW_ITEMS = [
  { path: '/trends', icon: 'LineChart', label: 'Score Trends' },
  { path: '/uptime', icon: 'Activity', label: 'Uptime' },
];

// ── Audit Workspace panel — 8 collapsible sections (default context) ─────
// Each item uses `suffix` → renders as /audit/:id<suffix>.
export const AUDIT_GROUPS = [
  {
    label: 'Overview',
    items: [
      { suffix: '/dashboard', icon: 'LayoutDashboard', label: 'Dashboard' },
      { suffix: '/report', icon: 'FileSearch', label: 'Audit Report' },
      { suffix: '/compare', icon: 'GitCompare', label: 'Audit Compare' },
    ],
  },
  {
    label: 'On-Page & Content',
    items: [
      { suffix: '/seo', icon: 'Search', label: 'SEO Analysis' },
      { suffix: '/pages', icon: 'FileCode', label: 'Pages' },
      { suffix: '/page-detail', icon: 'Layers', label: 'Page Detail' },
      { suffix: '/content-intel', icon: 'Cpu', label: 'Content Intelligence' },
      { suffix: '/content-studio', icon: 'BookOpen', label: 'Content Studio' },
      { suffix: '/content-rewrite', icon: 'Edit3', label: 'Content Rewriter' },
      { suffix: '/content-revival', icon: 'RefreshCw', label: 'Content Revival' },
      { suffix: '/blog-ai', icon: 'PenTool', label: 'Blog AI' },
    ],
  },
  {
    label: 'Technical SEO',
    items: [
      { suffix: '/speed', icon: 'Gauge', label: 'Speed & CWV' },
      { suffix: '/internal-links', icon: 'Link2', label: 'Internal Links' },
      { suffix: '/schema', icon: 'Network', label: 'Schema' },
      { suffix: '/sitemap-robots', icon: 'Globe', label: 'Sitemap & Robots' },
      { suffix: '/mobile-seo', icon: 'Smartphone', label: 'Mobile SEO' },
      { suffix: '/security-headers', icon: 'ShieldAlert', label: 'Security Headers' },
      { suffix: '/image-seo', icon: 'Camera', label: 'Image SEO' },
      { suffix: '/hreflang', icon: 'Languages', label: 'Hreflang & i18n' },
      { suffix: '/redirects', icon: 'ArrowRight', label: 'Redirects' },
      { suffix: '/duplicates', icon: 'Copy', label: 'Duplicates' },
      { suffix: '/js-dependency', icon: 'Cpu', label: 'JS Dependency' },
    ],
  },
  {
    label: 'GEO & AEO (AI Search)',
    items: [
      { suffix: '/geo-aeo', icon: 'Brain', label: 'GEO & AEO Hub' },
      { suffix: '/ai-bots', icon: 'Bot', label: 'AI Bot Access' },
      { suffix: '/serp-preview', icon: 'Eye', label: 'SERP & AI Preview' },
      { suffix: '/eeat', icon: 'Award', label: 'E-E-A-T Analysis' },
      { suffix: '/ai-overviews', icon: 'Zap', label: 'AI Overviews Monitor' },
    ],
  },
  {
    label: 'Off-Site Authority',
    items: [
      { suffix: '/backlinks', icon: 'Link2', label: 'Backlinks' },
      { suffix: '/offsite-authority', icon: 'Award', label: 'Off-Site Authority' },
      { suffix: '/social-seo', icon: 'Megaphone', label: 'Social SEO' },
      { suffix: '/local-seo', icon: 'MapPin', label: 'Local SEO' },
      { suffix: '/citations', icon: 'MessageCircle', label: 'Citations' },
    ],
  },
  {
    label: 'Keywords & Competitors',
    items: [
      { suffix: '/keywords', icon: 'Key', label: 'Keyword Strategy' },
      { suffix: '/competitor', icon: 'Users', label: 'Competitor Analysis' },
      { suffix: '/rankings', icon: 'TrendingUp', label: 'Rankings (audit)' },
    ],
  },
  {
    label: 'Actions & Roadmap',
    items: [
      { suffix: '/action-hub', icon: 'ClipboardList', label: 'Action Hub' },
      { suffix: '/issues', icon: 'AlertTriangle', label: 'Issue Remediation', badge: 'issues' },
      { suffix: '/rank-boost', icon: 'Star', label: 'Rank Boost' },
      { suffix: '/roadmap', icon: 'Flag', label: 'Roadmap' },
      { suffix: '/trends', icon: 'LineChart', label: 'Score Trends' },
      { suffix: '/drift', icon: 'GitCompare', label: 'Drift & Changes', badge: 'drift' },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { suffix: '/gsc', icon: 'Search', label: 'Google Search Console' },
      { suffix: '/chat', icon: 'MessageSquare', label: 'AI Chat' },
    ],
  },
];

// ── Platform panel (flat) ────────────────────────────────────────────────
export const PLATFORM = [
  {
    label: 'Build & automate',
    items: [
      { path: '/programmatic', icon: 'LayoutGrid', label: 'Programmatic SEO' },
      { path: '/live-editor', icon: 'Edit3', label: 'Live Editor' },
      { path: '/agents', icon: 'Bot', label: 'AI Agents & MCP' },
      { path: '/api-reference', icon: 'Code2', label: 'API Reference' },
    ],
  },
  {
    label: 'Monitor & account',
    items: [
      { path: '/uptime', icon: 'Activity', label: 'Uptime' },
      { path: '/usage', icon: 'BarChart3', label: 'Usage' },
      { path: '/free-tools', icon: 'Zap', label: 'Free Tools' },
      { path: '/settings', icon: 'Settings', label: 'Settings' },
    ],
  },
];
