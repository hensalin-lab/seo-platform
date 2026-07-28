import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Plus, FileText, BarChart3, Search, Link2,
  Gauge, BookOpen, Key, Globe, MessageSquare, Users,
  ExternalLink, Shield, Activity, Lightbulb, GitCompare,
  Filter, Edit3, Eye, Layers, Brain, Zap, Sparkles,
  Bot, Award, FileCode, Cpu, Camera, Smartphone, MapPin,
  FileSearch, HeartPulse, TrendingUp, BarChart2,
  Megaphone, Flag, RefreshCw, ShieldAlert, Network,
  Hash, MessageCircle, Rss, ClipboardList, FolderOpen, ShieldCheck,
  PenTool, Star, Sparkle, Settings, LogIn, LogOut, User, AlertTriangle
} from 'lucide-react';

const MAIN_NAV = [
  { path: '/new', icon: Plus, label: 'New Audit' },
  { path: '/history', icon: FileText, label: 'History' },
  { path: '/portfolio', icon: FolderOpen, label: 'Portfolio' },
  { path: '/trends', icon: TrendingUp, label: 'Trends' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const AUDIT_NAV = [
  {
    label: 'OVERVIEW',
    items: [
      { suffix: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { suffix: '/compare', icon: GitCompare, label: 'Audit Compare' },
      { suffix: '/report', icon: FileSearch, label: 'Audit Report' },
    ],
  },
  {
    label: 'ANALYSIS',
    items: [
      { suffix: '/seo', icon: Search, label: 'SEO Analysis' },
      { suffix: '/page-detail', icon: Layers, label: 'Page Intelligence' },
      { suffix: '/page-deep', icon: Layers, label: 'Page Deep Dive' },
      { suffix: '/page-speed', icon: Gauge, label: 'Page Speed' },
      { suffix: '/page-experience', icon: HeartPulse, label: 'Page Experience' },
      { suffix: '/image-seo', icon: Camera, label: 'Image SEO' },
      { suffix: '/mobile-seo', icon: Smartphone, label: 'Mobile SEO' },
      { suffix: '/sitemap-robots', icon: Globe, label: 'Sitemap & Robots' },
      { suffix: '/security-headers', icon: ShieldAlert, label: 'Security Headers' },
      { suffix: '/speed', icon: Gauge, label: 'Speed & CWV' },
      { suffix: '/speed-intel', icon: Cpu, label: 'Speed Intelligence' },
      { suffix: '/internal-links', icon: Link2, label: 'Internal Links' },
      { suffix: '/schema-intel', icon: FileCode, label: 'Schema Intelligence' },
    ],
  },
  {
    label: 'CONTENT & KEYWORDS',
    items: [
      { suffix: '/keywords', icon: Key, label: 'Keywords' },
      { suffix: '/content-intel', icon: BookOpen, label: 'Content Intelligence' },
      { suffix: '/content-rewrite', icon: Edit3, label: 'Content Rewriter' },
      { suffix: '/content-quality', icon: BarChart2, label: 'Content Quality' },
      { suffix: '/content-revival', icon: RefreshCw, label: 'Content Revival' },
      { suffix: '/content-opportunities', icon: TrendingUp, label: 'Content Opportunities' },
      { suffix: '/keyword-opportunities', icon: Hash, label: 'Keyword Opportunities' },
      { suffix: '/blog-ai', icon: PenTool, label: 'Blog AI' },
    ],
  },
  {
    label: 'AI & SEARCH',
    items: [
      { suffix: '/ai-recommendations', icon: Sparkles, label: 'AI Recommendations' },
      { suffix: '/ai-deep', icon: Brain, label: 'AI Search Deep' },
      { suffix: '/ai-bots', icon: Bot, label: 'AI Bot Access' },
      { suffix: '/eeat', icon: Activity, label: 'E-E-A-T' },
      { suffix: '/serp-preview', icon: Eye, label: 'SERP & AI Preview' },
      { suffix: '/ai-roadmap', icon: Flag, label: 'AI Roadmap' },
      { suffix: '/ai-suggestions', icon: Star, label: 'AI Suggestions' },
      { suffix: '/social-seo', icon: Megaphone, label: 'Social SEO' },
      { suffix: '/citations', icon: MessageCircle, label: 'Citations' },
      { suffix: '/local-seo', icon: MapPin, label: 'Local SEO' },
    ],
  },
  {
    label: 'ENTERPRISE',
    items: [
      { suffix: '/recommendations-deep', icon: Zap, label: 'Recommendations' },
      { suffix: '/competitor-deep', icon: Users, label: 'Competitor Intel' },
      { suffix: '/offsite-authority', icon: Award, label: 'Off-Site Authority' },
      { suffix: '/remediation', icon: Filter, label: 'Remediation Feed' },
      { suffix: '/roadmap', icon: GitCompare, label: 'Roadmap' },
      { suffix: '/recommendations-list', icon: ClipboardList, label: 'Recommendations' },
      { suffix: '/competitor-gap', icon: Network, label: 'Competitor Gap' },
      { suffix: '/backlinks', icon: Link2, label: 'Backlinks' },
      { suffix: '/seo-health', icon: ShieldCheck, label: 'SEO Health' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { suffix: '/issues', icon: AlertTriangle, label: 'All Issues' },
      { suffix: '/chat', icon: MessageSquare, label: 'AI Chat' },
    ],
  },
];

function SidebarLink({ to, icon: Icon, label, active }) {
  return (
    <Link to={to} className={`sidebar-link ${active ? 'active' : ''}`}>
      <Icon size={15} />
      <span>{label}</span>
    </Link>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const match = location.pathname.match(/\/audit\/([^/]+)/);
  const auditId = match ? match[1] : null;
  const isReport = !!auditId;

  const getPageTitle = () => {
    if (!isReport) {
      if (location.pathname === '/new') return 'New Audit';
      if (location.pathname === '/history') return 'Audit History';
      if (location.pathname === '/portfolio') return 'Portfolio Dashboard';
      if (location.pathname === '/settings') return 'Settings';
      if (location.pathname === '/login') return 'Sign In';
      if (location.pathname === '/register') return 'Sign Up';
      return 'SEO Platform';
    }
    const path = location.pathname;
    if (path.endsWith('/dashboard')) return 'Dashboard';
    if (path.endsWith('/seo')) return 'SEO Analysis';
    if (path.endsWith('/page-detail')) return 'Page Intelligence';
    if (path.endsWith('/gsc')) return 'Search Console';
    if (path.endsWith('/schema')) return 'Schema';
    if (path.endsWith('/internal-links')) return 'Internal Links';
    if (path.endsWith('/speed')) return 'Speed & CWV';
    if (path.endsWith('/content')) return 'Content';
    if (path.endsWith('/content-intel')) return 'Content Intelligence';
    if (path.endsWith('/keywords')) return 'Keywords';
    if (path.endsWith('/ai-visibility')) return 'AI Visibility';
    if (path.endsWith('/ai-deep')) return 'AI Search Deep';
    if (path.endsWith('/eeat')) return 'E-E-A-T';
    if (path.endsWith('/recommendations')) return 'Recommendations';
    if (path.endsWith('/recommendations-deep')) return 'Deep Recommendations';
    if (path.endsWith('/competitor')) return 'Competitors';
    if (path.endsWith('/competitor-deep')) return 'Competitor Intel';
    if (path.endsWith('/roadmap')) return 'Roadmap';
    if (path.endsWith('/remediation')) return 'Remediation Feed';
    if (path.endsWith('/content-rewrite')) return 'Content Rewriter';
    if (path.endsWith('/serp-preview')) return 'SERP & AI Preview';
    if (path.endsWith('/chat')) return 'AI Chat';
    if (path.endsWith('/ai-recommendations')) return 'AI Recommendations';
    if (path.endsWith('/ai-bots')) return 'AI Bot Intelligence';
    if (path.endsWith('/offsite-authority')) return 'Off-Site Authority';
    if (path.endsWith('/schema-intel')) return 'Schema Intelligence';
    if (path.endsWith('/speed-intel')) return 'Speed Intelligence';
    if (path.endsWith('/page-deep')) return 'Page Deep Dive';
    if (path.endsWith('/progress')) return 'Audit Progress';
    if (path.endsWith('/pages')) return 'Page Analysis';
    if (path.endsWith('/compare')) return 'Audit Compare';
    if (path.endsWith('/report')) return 'Audit Report';
    if (path.endsWith('/backlinks')) return 'Backlink Profile';
    if (path.endsWith('/blog-ai')) return 'Blog AI';
    if (path.endsWith('/citations')) return 'Citation Analysis';
    if (path.endsWith('/competitor-gap')) return 'Competitor Gap';
    if (path.endsWith('/content-opportunities')) return 'Content Opportunities';
    if (path.endsWith('/content-quality')) return 'Content Quality';
    if (path.endsWith('/content-revival')) return 'Content Revival';
    if (path.endsWith('/image-seo')) return 'Image SEO';
    if (path.endsWith('/keyword-opportunities')) return 'Keyword Opportunities';
    if (path.endsWith('/local-seo')) return 'Local SEO';
    if (path.endsWith('/mobile-seo')) return 'Mobile SEO';
    if (path.endsWith('/page-experience')) return 'Page Experience';
    if (path.endsWith('/page-improvements')) return 'Page Improvements';
    if (path.endsWith('/page-intel-detail')) return 'Page Intelligence Detail';
    if (path.endsWith('/page-speed')) return 'Page Speed';
    if (path.endsWith('/recommendations-list')) return 'Recommendations';
    if (path.endsWith('/security-headers')) return 'Security Headers';
    if (path.endsWith('/seo-health')) return 'SEO Health';
    if (path.endsWith('/sitemap-robots')) return 'Sitemap & Robots';
    if (path.endsWith('/social-seo')) return 'Social SEO';
    if (path.endsWith('/ai-roadmap')) return 'AI Roadmap';
    if (path.endsWith('/ai-suggestions')) return 'AI Suggestions';
    if (path.endsWith('/issues')) return 'Issues Explorer';
    return 'Report';
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">S</div>
          <div className="sidebar-logo-text">SEO Intel</div>
        </div>
        <nav className="sidebar-nav">
          {!isReport && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">MAIN</div>
              {MAIN_NAV.map(item => (
                <SidebarLink
                  key={item.path}
                  to={item.path}
                  icon={item.icon}
                  label={item.label}
                  active={location.pathname === item.path}
                />
              ))}
            </div>
          )}
          {isReport && AUDIT_NAV.map(section => (
            <div className="sidebar-section" key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map(item => (
                <SidebarLink
                  key={item.suffix}
                  to={`/audit/${auditId}${item.suffix}`}
                  icon={item.icon}
                  label={item.label}
                  active={location.pathname.endsWith(item.suffix)}
                />
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          {(() => { const { user, isAuthenticated, logout } = useAuth(); return isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff' }}>
                {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--sidebar-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username || user.email}</div>
                <div style={{ fontSize: 10, color: 'var(--sidebar-text)', opacity: 0.5 }}>{user.role}</div>
              </div>
              <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--sidebar-text)', cursor: 'pointer', padding: 4, opacity: 0.6 }} title="Sign out">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, color: 'var(--sidebar-text)', textDecoration: 'none', fontSize: 12 }}>
              <LogIn size={14} /> Sign In
            </Link>
          ); })()}
          <div style={{ fontSize: 10, color: 'var(--sidebar-text)', textAlign: 'center', opacity: 0.5, marginTop: 4 }}>
            SEO Intel v2.0
          </div>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <div>
              <div className="topbar-title">{getPageTitle()}</div>
              {isReport && (
                <div className="topbar-subtitle">
                  {location.pathname.split('/').slice(0, 4).join('/')}
                </div>
              )}
            </div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/new')}>
              <Plus size={13} /> New Audit
            </button>
          </div>
        </div>
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
