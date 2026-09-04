import { lazy } from 'react';
import {
  LayoutDashboard, Plus, FileText, BarChart3, Search, Link2, Gauge, BookOpen,
  Key, Globe, MessageSquare, Users, ExternalLink, Shield, Activity, Lightbulb,
  GitCompare, Filter, Edit3, Eye, Layers, Brain, Zap, Sparkles, Bot, Award,
  FileCode, Cpu, Camera, Smartphone, MapPin, FileSearch, HeartPulse, TrendingUp,
  BarChart2, Megaphone, Flag, RefreshCw, ShieldAlert, Network, Hash,
  MessageCircle, Rss, ClipboardList, FolderOpen, ShieldCheck, PenTool, Star,
  Sparkle, Settings, LogIn, LogOut, User, AlertTriangle, ChevronRight, Moon, Sun,
  LayoutGrid, Copy, Code2, KeyRound, Webhook, Languages, Play, Pause, ArrowRight, Plug,
  LineChart,
} from 'lucide-react';

const SeoAnalysis = lazy(() => import('../modules/technical-audit/pages/SeoAnalysis'));
const SpeedAnalysis = lazy(() => import('../modules/technical-audit/pages/SpeedAnalysis'));
const SchemaAnalysis = lazy(() => import('../modules/technical-audit/pages/SchemaAnalysis'));
const InternalLinks = lazy(() => import('../modules/technical-audit/pages/InternalLinks'));
const GscData = lazy(() => import('../modules/technical-audit/pages/GscData'));
const KeywordStrategy = lazy(() => import('../modules/content-keywords/pages/KeywordStrategy'));
const ContentAnalysis = lazy(() => import('../modules/content-keywords/pages/ContentAnalysis'));
const AiVisibility = lazy(() => import('../modules/geo-aeo/pages/AiVisibility'));
const AiOverviews = lazy(() => import('../modules/geo-aeo/pages/AiOverviews'));
const EeatAnalysis = lazy(() => import('../modules/geo-aeo/pages/EeatAnalysis'));
const CompetitorAnalysis = lazy(() => import('../modules/competitive/pages/CompetitorAnalysis'));
const SeoRoadmap = lazy(() => import('../modules/content-keywords/pages/SeoRoadmap'));
const RemediationFeed = lazy(() => import('../modules/action-center/pages/RemediationFeed'));
const ContentRewriter = lazy(() => import('../modules/content-keywords/pages/ContentRewriter'));
const SerpPreview = lazy(() => import('../modules/geo-aeo/pages/SerpPreview'));
const AiChat = lazy(() => import('../modules/settings/pages/AiChat'));
const PageDetail = lazy(() => import('../modules/technical-audit/pages/PageDetail'));
const ContentIntelligence = lazy(() => import('../modules/content-keywords/pages/ContentIntelligence'));
const AiRecommendations = lazy(() => import('../modules/content-keywords/pages/AiRecommendations'));
const EnterprisePage = lazy(() => import('../modules/enterprise/pages/EnterprisePage'));
const AiBotIntelligence = lazy(() => import('../modules/geo-aeo/pages/AiBotIntelligence'));
const OffsiteAuthority = lazy(() => import('../modules/competitive/pages/OffsiteAuthority'));
const SchemaIntelligence = lazy(() => import('../modules/geo-aeo/pages/SchemaIntelligence'));
const PagesHub = lazy(() => import('../pages/hubs/TechnicalHubs').then(m => ({ default: m.PagesHub })));
const AuditCompare = lazy(() => import('../modules/executive/pages/AuditCompare'));
const AuditReport = lazy(() => import('../modules/executive/pages/AuditReport'));
const BacklinkProfile = lazy(() => import('../modules/competitive/pages/BacklinkProfile'));
const BlogAi = lazy(() => import('../modules/content-keywords/pages/BlogAi'));
const CitationAnalysis = lazy(() => import('../modules/geo-aeo/pages/CitationAnalysis'));
const ContentOpportunities = lazy(() => import('../modules/content-keywords/pages/ContentOpportunities'));
const ContentQuality = lazy(() => import('../modules/content-keywords/pages/ContentQuality'));
const ContentRevival = lazy(() => import('../modules/content-keywords/pages/ContentRevival'));
const ImageSeo = lazy(() => import('../modules/technical-audit/pages/ImageSeo'));
const KeywordOpportunities = lazy(() => import('../modules/content-keywords/pages/KeywordOpportunities'));
const LocalSeo = lazy(() => import('../modules/geo-aeo/pages/LocalSeo'));
const MobileSeo = lazy(() => import('../modules/technical-audit/pages/MobileSeo'));
const PageExperience = lazy(() => import('../modules/technical-audit/pages/PageExperience'));
const PageImprovements = lazy(() => import('../modules/technical-audit/pages/PageImprovements'));
const PageIntelligenceDetail = lazy(() => import('../modules/technical-audit/pages/PageIntelligenceDetail'));
const PageSpeed = lazy(() => import('../modules/technical-audit/pages/PageSpeed'));
const PortfolioDashboard = lazy(() => import('../modules/enterprise/pages/PortfolioDashboard'));
const ExecutiveDashboard = lazy(() => import('../modules/executive/pages/ExecutiveDashboard'));
const Recommendations = lazy(() => import('../modules/action-center/pages/Recommendations'));
const SecurityHeaders = lazy(() => import('../modules/technical-audit/pages/SecurityHeaders'));
const SeoHealth = lazy(() => import('../modules/executive/pages/SeoHealth'));
const SitemapRobots = lazy(() => import('../modules/technical-audit/pages/SitemapRobots'));
const SocialSeo = lazy(() => import('../modules/geo-aeo/pages/SocialSeo'));
const AiRoadmap = lazy(() => import('../modules/content-keywords/pages/AiRoadmap'));
const AiSuggestions = lazy(() => import('../modules/content-keywords/pages/AiSuggestions'));
const IssuesExplorer = lazy(() => import('../modules/action-center/pages/IssuesExplorer'));
const Trends = lazy(() => import('../modules/executive/pages/Trends'));
const AuditTrends = lazy(() => import('../modules/executive/pages/AuditTrends'));
const AeoAnalysis = lazy(() => import('../modules/geo-aeo/pages/AeoAnalysis'));
const GeoAnalysis = lazy(() => import('../modules/geo-aeo/pages/GeoAnalysis'));
const ActionCenter = lazy(() => import('../modules/action-center/pages/ActionCenter'));
const ActionStudio = lazy(() => import('../modules/action-center/pages/ActionStudio'));
const ContentStudio = lazy(() => import('../modules/content-keywords/pages/ContentStudio'));
const RankBoost = lazy(() => import('../modules/geo-aeo/pages/RankBoost'));
const Rankings = lazy(() => import('../modules/technical-audit/pages/Rankings'));
const NewAudit = lazy(() => import('../pages/NewAudit'));
const History = lazy(() => import('../pages/History'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const SettingsPage = lazy(() => import('../modules/settings/pages/SettingsPage'));
const ProgrammaticSeo = lazy(() => import('../modules/content-keywords/pages/ProgrammaticSeo'));
const DriftDetection = lazy(() => import('../modules/advanced/pages/DriftDetection'));
const HreflangAnalysis = lazy(() => import('../modules/advanced/pages/HreflangAnalysis'));
const RedirectAudit = lazy(() => import('../modules/advanced/pages/RedirectAudit'));
const DuplicateContent = lazy(() => import('../modules/advanced/pages/DuplicateContent'));
const DomainAuthority = lazy(() => import('../modules/advanced/pages/DomainAuthority'));
const JsDependency = lazy(() => import('../modules/advanced/pages/JsDependency'));
const ContentBriefs = lazy(() => import('../modules/advanced/pages/ContentBriefs'));
const UptimeMonitor = lazy(() => import('../modules/advanced/pages/UptimeMonitor'));
const Workspaces = lazy(() => import('../modules/advanced/pages/Workspaces'));
const UsageMetering = lazy(() => import('../modules/advanced/pages/UsageMetering'));
const ApiReference = lazy(() => import('../modules/advanced/pages/ApiReference'));
const Providers = lazy(() => import('../modules/advanced/pages/Providers'));
const KeywordVolumes = lazy(() => import('../modules/advanced/pages/KeywordVolumes'));
const BrandMonitor = lazy(() => import('../modules/advanced/pages/BrandMonitor'));
const FreeTools = lazy(() => import('../modules/advanced/pages/FreeTools'));
const McpAgents = lazy(() => import('../modules/advanced/pages/McpAgents'));
const AdminPage = lazy(() => import('../pages/AdminPage'));
const RankTrackingPage = lazy(() => import('../pages/RankTracking'));
const DomainOverviewPage = lazy(() => import('../pages/DomainOverview'));
const KeywordGapPage = lazy(() => import('../pages/KeywordGap'));
const LiveContentEditorPage = lazy(() => import('../pages/LiveContentEditor'));
const BacklinkExplorerPage = lazy(() => import('../pages/BacklinkExplorer'));
const ReferringDomainsPage = lazy(() => import('../pages/ReferringDomains'));
const ToxicLinksPage = lazy(() => import('../pages/ToxicLinks'));
const BacklinkGapPage = lazy(() => import('../pages/BacklinkGapAnalysis'));
const KeywordDifficultyPage = lazy(() => import('../pages/KeywordDifficulty'));
const TrafficEstimatorPage = lazy(() => import('../pages/TrafficEstimator'));
const KeywordUniversePage = lazy(() => import('../pages/KeywordUniverse'));
const TrustFlowPage = lazy(() => import('../pages/TrustFlow'));
const UrlInspectionPage = lazy(() => import('../pages/UrlInspection'));

const DashboardHub = lazy(() => import('../pages/hubs/DashboardHub'));
const ActionHub = lazy(() => import('../pages/hubs/ActionHub'));
const SeoHub = lazy(() => import('../pages/hubs/TechnicalHubs').then(m => ({ default: m.SeoHub })));
const PageDetailHub = lazy(() => import('../pages/hubs/TechnicalHubs').then(m => ({ default: m.PageDetailHub })));
const SchemaHub = lazy(() => import('../pages/hubs/TechnicalHubs').then(m => ({ default: m.SchemaHub })));
const SpeedHub = lazy(() => import('../pages/hubs/TechnicalHubs').then(m => ({ default: m.SpeedHub })));
const RoadmapHub = lazy(() => import('../pages/hubs/TechnicalHubs').then(m => ({ default: m.RoadmapHub })));
const GeoAeoHubTabs = lazy(() => import('../pages/hubs/GeoContentHubs').then(m => ({ default: m.GeoAeoHubTabs })));
const ContentIntelHub = lazy(() => import('../pages/hubs/GeoContentHubs').then(m => ({ default: m.ContentIntelHub })));
const KeywordHub = lazy(() => import('../pages/hubs/GeoContentHubs').then(m => ({ default: m.KeywordHub })));
const OffsiteHub = lazy(() => import('../pages/hubs/GeoContentHubs').then(m => ({ default: m.OffsiteHub })));
const ContentStudioHub = lazy(() => import('../pages/hubs/GeoContentHubs').then(m => ({ default: m.ContentStudioHub })));
const DiagnoseHub = lazy(() => import('../pages/hubs/DiagnoseHub'));
const FixHub = lazy(() => import('../pages/hubs/FixHub'));
const CreateTrackHub = lazy(() => import('../pages/hubs/CreateTrackHub'));

export const ICON_MAP = {
  LayoutDashboard, Plus, FileText, BarChart3, Search, Link2, Gauge, BookOpen,
  Key, Globe, MessageSquare, Users, ExternalLink, Shield, Activity, Lightbulb,
  GitCompare, Filter, Edit3, Eye, Layers, Brain, Zap, Sparkles, Bot, Award,
  FileCode, Cpu, Camera, Smartphone, MapPin, FileSearch, HeartPulse, TrendingUp,
  BarChart2, Megaphone, Flag, RefreshCw, ShieldAlert, Network, Hash,
  MessageCircle, Rss, ClipboardList, FolderOpen, ShieldCheck, PenTool, Star,
  Sparkle, Settings, LogIn, LogOut, User, AlertTriangle, ChevronRight, Moon, Sun,
  LayoutGrid, Copy, Code2, KeyRound, Webhook, Languages, Play, Pause, ArrowRight, Plug,
  LineChart,
};

export function getIcon(name) {
  return ICON_MAP[name] || FileText;
}

export const mainNav = [
  { path: '/domain-overview', icon: 'Globe', label: 'Domain Overview', title: 'Domain Overview', component: DomainOverviewPage },
  { path: '/new', icon: 'Plus', label: 'New Audit', title: 'New Audit', component: NewAudit },
  { path: '/history', icon: 'FileText', label: 'History', title: 'Audit History', component: History },
  { path: '/portfolio', icon: 'FolderOpen', label: 'Portfolio', title: 'Portfolio Dashboard', component: PortfolioDashboard },
  { path: '/trends', icon: 'TrendingUp', label: 'Trends', title: 'Trends', component: Trends },
  { path: '/programmatic', icon: 'LayoutGrid', label: 'Programmatic SEO', title: 'Programmatic SEO', component: ProgrammaticSeo, group: 'tools' },
  { path: '/workspaces', icon: 'FolderOpen', label: 'Workspaces', title: 'Client Workspaces', component: Workspaces, group: 'tools' },
  { path: '/rank-tracking', icon: 'TrendingUp', label: 'Rank Tracking', title: 'Rank Tracking', component: RankTrackingPage, group: 'tools' },
  { path: '/keyword-gap', icon: 'GitCompare', label: 'Keyword Gap', title: 'Keyword Gap Analysis', component: KeywordGapPage, group: 'tools' },
  { path: '/backlinks', icon: 'Link2', label: 'Backlink Explorer', title: 'Backlink Explorer', component: BacklinkExplorerPage, group: 'tools' },
  { path: '/referring-domains', icon: 'Globe', label: 'Referring Domains', title: 'Referring Domains', component: ReferringDomainsPage, group: 'tools' },
  { path: '/toxic-links', icon: 'ShieldAlert', label: 'Toxic Links', title: 'Toxic Links', component: ToxicLinksPage, group: 'tools' },
  { path: '/backlink-gap', icon: 'Network', label: 'Backlink Gap', title: 'Backlink Gap Analysis', component: BacklinkGapPage, group: 'tools' },
  { path: '/keyword-difficulty', icon: 'Gauge', label: 'Keyword Difficulty', title: 'Keyword Difficulty', component: KeywordDifficultyPage, group: 'tools' },
  { path: '/traffic-estimator', icon: 'TrendingUp', label: 'Traffic Estimator', title: 'Organic Traffic Estimator', component: TrafficEstimatorPage, group: 'tools' },
  { path: '/keyword-universe', icon: 'Search', label: 'Keyword Universe', title: 'Keyword Universe Discovery', component: KeywordUniversePage, group: 'tools' },
  { path: '/trust-flow', icon: 'Layers', label: 'Trust / Citation Flow', title: 'Trust Flow / Citation Flow', component: TrustFlowPage, group: 'tools' },
  { path: '/url-inspection', icon: 'FileSearch', label: 'URL Inspection', title: 'URL Inspection', component: UrlInspectionPage, group: 'tools' },
  { path: '/live-editor', icon: 'Edit3', label: 'Live Editor', title: 'Live Content Editor', component: LiveContentEditorPage, group: 'tools' },
  { path: '/uptime', icon: 'Activity', label: 'Uptime', title: 'Uptime Monitoring', component: UptimeMonitor, group: 'tools' },
  { path: '/usage', icon: 'BarChart3', label: 'Usage', title: 'Usage Metering', component: UsageMetering, group: 'tools' },
  { path: '/api-reference', icon: 'Code2', label: 'API Reference', title: 'API Reference', component: ApiReference, group: 'tools' },
  { path: '/free-tools', icon: 'Zap', label: 'Free Tools', title: 'Free Data Tools', component: FreeTools, group: 'tools' },
  { path: '/agents', icon: 'Bot', label: 'AI Agents & MCP', title: 'AI Agents & MCP', component: McpAgents, group: 'tools' },
  { path: '/integrations', icon: 'Plug', label: 'Integrations', title: 'Data Provider Integrations', component: Providers },
  { path: '/settings', icon: 'Settings', label: 'Settings', title: 'Settings', component: SettingsPage },
  { path: '/admin', icon: 'Shield', label: 'Admin', title: 'Admin', component: AdminPage, adminOnly: true },
];

export const auditSections = [
  {
    label: '1. OVERVIEW',
    items: [
      { suffix: '/dashboard', icon: 'LayoutDashboard', label: 'Dashboard', title: 'Overview', component: DashboardHub },
      { suffix: '/report', icon: 'FileSearch', label: 'Audit Report', title: 'Audit Report', component: AuditReport },
      { suffix: '/compare', icon: 'GitCompare', label: 'Audit Compare', title: 'Audit Compare', component: AuditCompare },
    ],
  },
  {
    label: '2. DIAGNOSE',
    hub: '/diagnose',
    hubIcon: 'AlertTriangle',
    items: [
      { suffix: '/diagnose', icon: 'AlertTriangle', label: 'Diagnose', title: 'Diagnose', component: DiagnoseHub },
      {
        label: 'Technical',
        icon: 'Search',
        group: true,
        children: [
          { suffix: '/seo', icon: 'Search', label: 'SEO Analysis', title: 'SEO Analysis', component: SeoHub },
          { suffix: '/pages', icon: 'FileCode', label: 'Pages', title: 'Pages', component: PagesHub },
          { suffix: '/page-detail', icon: 'Layers', label: 'Page Detail', title: 'Page Detail', component: PageDetailHub },
          { suffix: '/schema', icon: 'Network', label: 'Schema', title: 'Schema', component: SchemaHub },
          { suffix: '/speed', icon: 'Gauge', label: 'Speed & CWV', title: 'Speed & CWV', component: SpeedHub },
          { suffix: '/internal-links', icon: 'Link2', label: 'Internal Links', title: 'Internal Links', component: InternalLinks },
          { suffix: '/mobile-seo', icon: 'Smartphone', label: 'Mobile SEO', title: 'Mobile SEO', component: MobileSeo },
          { suffix: '/sitemap-robots', icon: 'Globe', label: 'Sitemap & Robots', title: 'Sitemap & Robots', component: SitemapRobots },
          { suffix: '/roadmap', icon: 'Flag', label: 'Roadmap', title: 'Roadmap', component: RoadmapHub },
        ],
      },
      {
        label: 'Crawlability & Indexation',
        icon: 'Globe',
        group: true,
        children: [
          { suffix: '/security-headers', icon: 'ShieldAlert', label: 'Security Headers', title: 'Security Headers', component: SecurityHeaders },
          { suffix: '/image-seo', icon: 'Camera', label: 'Image SEO', title: 'Image SEO', component: ImageSeo },
          { suffix: '/hreflang', icon: 'Languages', label: 'Hreflang', title: 'Hreflang & i18n', component: HreflangAnalysis },
          { suffix: '/redirects', icon: 'ArrowRight', label: 'Redirects', title: 'Redirect Analysis', component: RedirectAudit },
          { suffix: '/duplicates', icon: 'Copy', label: 'Duplicates', title: 'Duplicate Content', component: DuplicateContent },
          { suffix: '/js-dependency', icon: 'Cpu', label: 'JS Dependency', title: 'JavaScript Dependency', component: JsDependency },
        ],
      },
      {
        label: 'GEO & AEO',
        icon: 'Brain',
        group: true,
        children: [
          { suffix: '/geo-aeo', icon: 'Brain', label: 'GEO & AEO Hub', title: 'GEO & AEO Hub', component: GeoAeoHubTabs },
          { suffix: '/ai-bots', icon: 'Bot', label: 'AI Bot Access', title: 'AI Bot Access', component: AiBotIntelligence },
          { suffix: '/serp-preview', icon: 'Eye', label: 'SERP & AI Preview', title: 'SERP & AI Preview', component: SerpPreview },
          { suffix: '/eeat', icon: 'Award', label: 'E-E-A-T Analysis', title: 'E-E-A-T Analysis', component: EeatAnalysis },
          { suffix: '/social-seo', icon: 'Megaphone', label: 'Social SEO', title: 'Social SEO', component: SocialSeo },
          { suffix: '/local-seo', icon: 'MapPin', label: 'Local SEO', title: 'Local SEO', component: LocalSeo },
        ],
      },
      {
        label: 'Content & Keywords',
        icon: 'Cpu',
        group: true,
        children: [
          { suffix: '/content-intel', icon: 'Cpu', label: 'Content Intelligence', title: 'Content Intelligence', component: ContentIntelHub },
          { suffix: '/keywords', icon: 'Key', label: 'Keyword Strategy', title: 'Keyword Strategy', component: KeywordHub },
        ],
      },
      {
        label: 'Competitive & Offsite',
        icon: 'Users',
        group: true,
        children: [
          { suffix: '/competitor', icon: 'Users', label: 'Competitor Analysis', title: 'Competitor Analysis', component: CompetitorAnalysis },
          { suffix: '/backlinks', icon: 'Link2', label: 'Backlinks', title: 'Backlink Profile', component: BacklinkProfile },
          { suffix: '/offsite-authority', icon: 'Award', label: 'Off-Site Authority', title: 'Off-Site Authority', component: OffsiteHub },
          { suffix: '/citations', icon: 'MessageCircle', label: 'Citations', title: 'Citation Analysis', component: CitationAnalysis },
        ],
      },
    ],
  },
  {
    label: '3. FIX',
    hub: '/fix',
    hubIcon: 'ClipboardList',
    items: [
      { suffix: '/fix', icon: 'ClipboardList', label: 'Fix', title: 'Fix', component: FixHub },
      { suffix: '/action-hub', icon: 'ClipboardList', label: 'Action Hub', title: 'Action Hub', component: ActionHub },
      { suffix: '/issues', icon: 'AlertTriangle', label: 'Issue Remediation', title: 'Issue Remediation' },
      { suffix: '/rank-boost', icon: 'Star', label: 'Rank Boost', title: 'Rank Boost', component: RankBoost },
      { suffix: '/content-rewrite', icon: 'Edit3', label: 'Content Rewriter', title: 'Content Rewriter', component: ContentRewriter },
    ],
  },
  {
    label: '4. CREATE & TRACK',
    hub: '/create-track',
    hubIcon: 'Lightbulb',
    items: [
      { suffix: '/create-track', icon: 'Lightbulb', label: 'Create & Track', title: 'Create & Track', component: CreateTrackHub },
      { suffix: '/content-studio', icon: 'BookOpen', label: 'Content Studio', title: 'Content Studio', component: ContentStudioHub },
      { suffix: '/blog-ai', icon: 'PenTool', label: 'Blog AI', title: 'Blog AI', component: BlogAi },
      { suffix: '/content-revival', icon: 'RefreshCw', label: 'Content Revival', title: 'Content Revival', component: ContentRevival },
      { suffix: '/chat', icon: 'MessageSquare', label: 'AI Chat', title: 'AI Chat', component: AiChat },
      { suffix: '/rankings', icon: 'TrendingUp', label: 'Rank Tracking', title: 'Rank Tracking', component: Rankings },
      { suffix: '/trends', icon: 'LineChart', label: 'Score Trends', title: 'Score Trends', component: AuditTrends },
      { suffix: '/ai-overviews', icon: 'Zap', label: 'AI Overviews Monitor', title: 'AI Overviews Monitor', component: AiOverviews },
      { suffix: '/drift', icon: 'GitCompare', label: 'Drift & Changes', title: 'Drift & Change Detection', component: DriftDetection },
      { suffix: '/gsc', icon: 'Search', label: 'Google Search Console', title: 'Google Search Console', component: GscData },
    ],
  },
  {
    label: '5. SETTINGS',
    items: [
      { path: '/settings', icon: 'Settings', label: 'Settings', title: 'Settings' },
    ],
  },
];

export const reportSidebarNav = [
  { section: '1. OVERVIEW', group: 'Overview', main: [
    { suffix: '/dashboard', icon: 'LayoutDashboard', label: 'Dashboard' },
    { suffix: '/report', icon: 'FileSearch', label: 'Audit Report' },
    { suffix: '/compare', icon: 'GitCompare', label: 'Audit Compare' },
  ] },
  { section: '2. DIAGNOSE', group: 'Diagnose', main: [
    { suffix: '/seo', icon: 'Search', label: 'SEO Analysis' },
    { suffix: '/pages', icon: 'FileCode', label: 'Pages' },
    { suffix: '/page-detail', icon: 'Layers', label: 'Page Detail' },
    { suffix: '/speed', icon: 'Gauge', label: 'Speed & CWV' },
    { suffix: '/internal-links', icon: 'Link2', label: 'Internal Links' },
    { suffix: '/geo-aeo', icon: 'Brain', label: 'GEO & AEO Hub' },
    { suffix: '/content-intel', icon: 'Cpu', label: 'Content Intelligence' },
    { suffix: '/keywords', icon: 'Key', label: 'Keyword Strategy' },
    { suffix: '/competitor', icon: 'Users', label: 'Competitor Analysis' },
    { suffix: '/backlinks', icon: 'Link2', label: 'Backlinks' },
    { suffix: '/offsite-authority', icon: 'Award', label: 'Off-Site Authority' },
  ], moreGroups: [
    { label: 'Technical', items: [
      { suffix: '/schema', icon: 'Network', label: 'Schema' },
      { suffix: '/sitemap-robots', icon: 'Globe', label: 'Sitemap & Robots' },
      { suffix: '/roadmap', icon: 'Flag', label: 'Roadmap' },
      { suffix: '/mobile-seo', icon: 'Smartphone', label: 'Mobile SEO' },
      { suffix: '/security-headers', icon: 'ShieldAlert', label: 'Security Headers' },
      { suffix: '/image-seo', icon: 'Camera', label: 'Image SEO' },
      { suffix: '/hreflang', icon: 'Languages', label: 'Hreflang & i18n' },
      { suffix: '/redirects', icon: 'ArrowRight', label: 'Redirects' },
      { suffix: '/duplicates', icon: 'Copy', label: 'Duplicates' },
      { suffix: '/js-dependency', icon: 'Cpu', label: 'JS Dependency' },
    ] },
    { label: 'GEO & AEO', items: [
      { suffix: '/ai-bots', icon: 'Bot', label: 'AI Bot Access' },
      { suffix: '/serp-preview', icon: 'Eye', label: 'SERP & AI Preview' },
      { suffix: '/eeat', icon: 'Award', label: 'E-E-A-T Analysis' },
      { suffix: '/social-seo', icon: 'Megaphone', label: 'Social SEO' },
      { suffix: '/local-seo', icon: 'MapPin', label: 'Local SEO' },
      { suffix: '/citations', icon: 'MessageCircle', label: 'Citations' },
    ] },
  ] },
  { section: '3. FIX', group: 'Fix', main: [
    { suffix: '/action-hub', icon: 'ClipboardList', label: 'Action Hub' },
    { suffix: '/issues', icon: 'AlertTriangle', label: 'Issue Remediation' },
    { suffix: '/rank-boost', icon: 'Star', label: 'Rank Boost' },
  ], moreGroups: [
    { label: 'More', items: [
      { suffix: '/content-rewrite', icon: 'Edit3', label: 'Content Rewriter' },
    ] },
  ] },
  { section: '4. CREATE & TRACK', group: 'Create & Track', main: [
    { suffix: '/content-studio', icon: 'BookOpen', label: 'Content Studio' },
    { suffix: '/blog-ai', icon: 'PenTool', label: 'Blog AI' },
    { suffix: '/content-revival', icon: 'RefreshCw', label: 'Content Revival' },
    { suffix: '/chat', icon: 'MessageSquare', label: 'AI Chat' },
    { suffix: '/rankings', icon: 'TrendingUp', label: 'Rank Tracking' },
    { suffix: '/drift', icon: 'GitCompare', label: 'Drift & Changes' },
    { suffix: '/gsc', icon: 'Search', label: 'Google Search Console' },
  ], moreGroups: [
    { label: 'Tracking', items: [
      { suffix: '/trends', icon: 'LineChart', label: 'Score Trends' },
      { suffix: '/ai-overviews', icon: 'Zap', label: 'AI Overviews Monitor' },
    ] },
  ] },
  { section: '5. TOOLS', group: 'Tools', main: [
    { path: '/rank-tracking', icon: 'TrendingUp', label: 'Rank Tracking' },
    { path: '/keyword-gap', icon: 'GitCompare', label: 'Keyword Gap' },
    { path: '/backlinks', icon: 'Link2', label: 'Backlink Explorer' },
    { path: '/referring-domains', icon: 'Globe', label: 'Referring Domains' },
    { path: '/toxic-links', icon: 'ShieldAlert', label: 'Toxic Links' },
    { path: '/backlink-gap', icon: 'Network', label: 'Backlink Gap' },
    { path: '/keyword-difficulty', icon: 'Gauge', label: 'Keyword Difficulty' },
    { path: '/traffic-estimator', icon: 'TrendingUp', label: 'Traffic Estimator' },
    { path: '/keyword-universe', icon: 'Search', label: 'Keyword Universe' },
    { path: '/trust-flow', icon: 'Layers', label: 'Trust / Citation Flow' },
    { path: '/url-inspection', icon: 'FileSearch', label: 'URL Inspection' },
  ], moreGroups: [
    { label: 'Platform', items: [
      { path: '/programmatic', icon: 'LayoutGrid', label: 'Programmatic SEO' },
      { path: '/live-editor', icon: 'Edit3', label: 'Live Editor' },
      { path: '/uptime', icon: 'Activity', label: 'Uptime' },
      { path: '/usage', icon: 'BarChart3', label: 'Usage' },
      { path: '/api-reference', icon: 'Code2', label: 'API Reference' },
      { path: '/free-tools', icon: 'Zap', label: 'Free Tools' },
      { path: '/agents', icon: 'Bot', label: 'AI Agents & MCP' },
    ] },
  ] },
];

export const auditSectionNav = auditSections.map(section => ({
  label: section.label,
  hub: section.hub || null,
  hubIcon: section.hubIcon || null,
  items: section.items,
}));

export const auditRedirects = [
  { suffix: '/recommendations', to: '/action-hub' },
  { suffix: '/recommendations-deep', to: '/action-hub' },
  { suffix: '/ai-deep', to: '/geo-aeo?tab=ai-visibility' },
  { suffix: '/competitor-deep', to: '/competitor' },
  { suffix: '/competitor-gap', to: '/competitor' },
  { suffix: '/speed-intel', to: '/speed' },
  { suffix: '/page-deep', to: '/pages' },
  { suffix: '/executive-dashboard', to: '/dashboard?tab=executive-dashboard' },
  { suffix: '/seo-health', to: '/dashboard?tab=seo-health' },
  { suffix: '/enterprise', to: '/seo?tab=enterprise' },
  { suffix: '/page-intel-detail', to: '/page-detail?tab=page-intel-detail' },
  { suffix: '/page-improvements', to: '/page-detail?tab=page-improvements' },
  { suffix: '/page-speed', to: '/page-detail?tab=page-speed' },
  { suffix: '/schema-intel', to: '/schema?tab=schema-intel' },
  { suffix: '/page-experience', to: '/speed?tab=page-experience' },
  { suffix: '/ai-roadmap', to: '/roadmap?tab=ai-roadmap' },
  { suffix: '/aeo-analysis', to: '/geo-aeo?tab=aeo-analysis' },
  { suffix: '/geo-analysis', to: '/geo-aeo?tab=geo-analysis' },
  { suffix: '/ai-visibility', to: '/geo-aeo?tab=ai-visibility' },
  { suffix: '/content', to: '/content-intel?tab=content' },
  { suffix: '/content-quality', to: '/content-intel?tab=content-quality' },
  { suffix: '/content-opportunities', to: '/content-intel?tab=content-opportunities' },
  { suffix: '/keyword-opportunities', to: '/keywords?tab=keyword-opportunities' },
  { suffix: '/keyword-volumes', to: '/keywords?tab=keyword-volumes' },
  { suffix: '/domain-authority', to: '/offsite-authority?tab=domain-authority' },
  { suffix: '/brand-monitor', to: '/offsite-authority?tab=brand-monitor' },
  { suffix: '/content-briefs', to: '/content-studio?tab=content-briefs' },
  { suffix: '/ai-suggestions', to: '/action-hub?tab=ai-suggestions' },
  { suffix: '/ai-recommendations', to: '/action-hub?tab=ai-recommendations' },
  { suffix: '/issues', to: '/action-hub?tab=issues' },
  { suffix: '/remediation', to: '/action-hub?tab=remediation' },
  { suffix: '/action-studio', to: '/action-hub?tab=action-studio' },
  { suffix: '/action-center', to: '/action-hub?tab=action-center' },
  { suffix: '/recommendations-list', to: '/action-hub?tab=recommendations-list' },
];

export function flattenAuditItems() {
  return auditSections.flatMap(section =>
    section.items.flatMap(item => (item.group ? item.children : [item]))
  );
}

export function getAuditTitleBySuffix(suffix) {
  const item = flattenAuditItems().find(i => i.suffix === suffix);
  return item ? item.title || item.label : null;
}

export const mainTitles = Object.fromEntries(mainNav.map(m => [m.path, m.title || m.label]));

export function getPageTitleForPath(pathname, isReport) {
  if (!isReport) {
    if (mainTitles[pathname]) return mainTitles[pathname];
    if (pathname === '/login') return 'Sign In';
    if (pathname === '/register') return 'Sign Up';
    return 'SEO Platform';
  }
  const segment = pathname.slice(pathname.lastIndexOf('/') + 1);
  const title = getAuditTitleBySuffix(`/${segment}`);
  if (title) return title;
  if (segment === 'progress') return 'Audit Progress';
  return 'Report';
}

export function getAuditSegment(pathname) {
  return pathname.slice(pathname.lastIndexOf('/') + 1);
}
