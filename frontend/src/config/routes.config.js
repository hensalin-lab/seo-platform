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

export const ICON_MAP = {
  LayoutDashboard, Plus, FileText, BarChart3, Search, Link2, Gauge, BookOpen,
  Key, Globe, MessageSquare, Users, ExternalLink, Shield, Activity, Lightbulb,
  GitCompare, Filter, Edit3, Eye, Layers, Brain, Zap, Sparkles, Bot, Award,
  FileCode, Cpu, Camera, Smartphone, MapPin, FileSearch, HeartPulse, TrendingUp,
  BarChart2, Megaphone, Flag, RefreshCw, ShieldAlert, Network, Hash,
  MessageCircle, Rss, ClipboardList, FolderOpen, ShieldCheck, PenTool, Star,
  Sparkle, Settings, LogIn, LogOut, User, AlertTriangle, ChevronRight, Moon, Sun,
  LayoutGrid, Copy, Code2, KeyRound, Webhook, Languages, Play, Pause, ArrowRight, Plug,
};

export function getIcon(name) {
  return ICON_MAP[name] || FileText;
}

export const mainNav = [
  { path: '/new', icon: 'Plus', label: 'New Audit', title: 'New Audit', component: NewAudit },
  { path: '/history', icon: 'FileText', label: 'History', title: 'Audit History', component: History },
  { path: '/portfolio', icon: 'FolderOpen', label: 'Portfolio', title: 'Portfolio Dashboard', component: PortfolioDashboard },
  { path: '/trends', icon: 'TrendingUp', label: 'Trends', title: 'Trends', component: Trends },
  { path: '/programmatic', icon: 'LayoutGrid', label: 'Programmatic SEO', title: 'Programmatic SEO', component: ProgrammaticSeo },
  { path: '/workspaces', icon: 'FolderOpen', label: 'Workspaces', title: 'Client Workspaces', component: Workspaces },
  { path: '/uptime', icon: 'Activity', label: 'Uptime', title: 'Uptime Monitoring', component: UptimeMonitor },
  { path: '/usage', icon: 'BarChart3', label: 'Usage', title: 'Usage Metering', component: UsageMetering },
  { path: '/api-reference', icon: 'Code2', label: 'API Reference', title: 'API Reference', component: ApiReference },
  { path: '/free-tools', icon: 'Zap', label: 'Free Tools', title: 'Free Data Tools', component: FreeTools },
  { path: '/integrations', icon: 'Plug', label: 'Integrations', title: 'Data Provider Integrations', component: Providers },
  { path: '/settings', icon: 'Settings', label: 'Settings', title: 'Settings', component: SettingsPage },
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
    label: '2. DIAGNOSE · TECHNICAL',
    items: [
      { suffix: '/seo', icon: 'Search', label: 'SEO Analysis', title: 'SEO Analysis', component: SeoHub },
      { suffix: '/pages', icon: 'FileCode', label: 'Pages', title: 'Pages', component: PagesHub },
      { suffix: '/page-detail', icon: 'Layers', label: 'Page Detail', title: 'Page Detail', component: PageDetailHub },
      { suffix: '/schema', icon: 'Network', label: 'Schema', title: 'Schema', component: SchemaHub },
      { suffix: '/speed', icon: 'Gauge', label: 'Speed & CWV', title: 'Speed & CWV', component: SpeedHub },
      { suffix: '/internal-links', icon: 'Link2', label: 'Internal Links', title: 'Internal Links', component: InternalLinks },
      { suffix: '/mobile-seo', icon: 'Smartphone', label: 'Mobile SEO', title: 'Mobile SEO', component: MobileSeo },
      { suffix: '/sitemap-robots', icon: 'Globe', label: 'Sitemap & Robots', title: 'Sitemap & Robots', component: SitemapRobots },
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
      { suffix: '/roadmap', icon: 'Flag', label: 'Roadmap', title: 'Roadmap', component: RoadmapHub },
    ],
  },
  {
    label: '3. DIAGNOSE · GEO & AEO',
    items: [
      { suffix: '/geo-aeo', icon: 'Brain', label: 'GEO & AEO Hub', title: 'GEO & AEO Hub', component: GeoAeoHubTabs },
      { suffix: '/ai-bots', icon: 'Bot', label: 'AI Bot Access', title: 'AI Bot Access', component: AiBotIntelligence },
      { suffix: '/serp-preview', icon: 'Eye', label: 'SERP & AI Preview', title: 'SERP & AI Preview', component: SerpPreview },
      { suffix: '/eeat', icon: 'Award', label: 'E-E-A-T Analysis', title: 'E-E-A-T Analysis', component: EeatAnalysis },
      { suffix: '/social-seo', icon: 'Megaphone', label: 'Social SEO', title: 'Social SEO', component: SocialSeo },
      { suffix: '/local-seo', icon: 'MapPin', label: 'Local SEO', title: 'Local SEO', component: LocalSeo },
    ],
  },
  {
    label: '4. DIAGNOSE · CONTENT & KEYWORDS',
    items: [
      { suffix: '/content-intel', icon: 'Cpu', label: 'Content Intelligence', title: 'Content Intelligence', component: ContentIntelHub },
      { suffix: '/keywords', icon: 'Key', label: 'Keyword Strategy', title: 'Keyword Strategy', component: KeywordHub },
    ],
  },
  {
    label: '5. DIAGNOSE · COMPETITIVE & OFFSITE',
    items: [
      { suffix: '/competitor', icon: 'Users', label: 'Competitor Analysis', title: 'Competitor Analysis', component: CompetitorAnalysis },
      { suffix: '/backlinks', icon: 'Link2', label: 'Backlinks', title: 'Backlink Profile', component: BacklinkProfile },
      { suffix: '/offsite-authority', icon: 'Award', label: 'Off-Site Authority', title: 'Off-Site Authority', component: OffsiteHub },
      { suffix: '/citations', icon: 'MessageCircle', label: 'Citations', title: 'Citation Analysis', component: CitationAnalysis },
    ],
  },
  {
    label: '6. FIX',
    items: [
      { suffix: '/action-hub', icon: 'ClipboardList', label: 'Action Hub', title: 'Action Hub', component: ActionHub },
      { suffix: '/rank-boost', icon: 'Star', label: 'Rank Boost', title: 'Rank Boost', component: RankBoost },
      { suffix: '/content-rewrite', icon: 'Edit3', label: 'Content Rewriter', title: 'Content Rewriter', component: ContentRewriter },
    ],
  },
  {
    label: '7. CREATE',
    items: [
      { suffix: '/content-studio', icon: 'BookOpen', label: 'Content Studio', title: 'Content Studio', component: ContentStudioHub },
      { suffix: '/blog-ai', icon: 'PenTool', label: 'Blog AI', title: 'Blog AI', component: BlogAi },
      { suffix: '/content-revival', icon: 'RefreshCw', label: 'Content Revival', title: 'Content Revival', component: ContentRevival },
      { suffix: '/chat', icon: 'MessageSquare', label: 'AI Chat', title: 'AI Chat', component: AiChat },
    ],
  },
  {
    label: '8. TRACK',
    items: [
      { suffix: '/rankings', icon: 'TrendingUp', label: 'Rank Tracking', title: 'Rank Tracking', component: Rankings },
      { suffix: '/ai-overviews', icon: 'Zap', label: 'AI Overviews Monitor', title: 'AI Overviews Monitor', component: AiOverviews },
      { suffix: '/drift', icon: 'GitCompare', label: 'Drift & Changes', title: 'Drift & Change Detection', component: DriftDetection },
      { suffix: '/gsc', icon: 'Search', label: 'Google Search Console', title: 'Google Search Console', component: GscData },
    ],
  },
  {
    label: '9. SETTINGS',
    items: [
      { path: '/settings', icon: 'Settings', label: 'Settings', title: 'Settings' },
    ],
  },
];

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
