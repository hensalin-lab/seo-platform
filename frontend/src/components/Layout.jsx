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
    label: '1. EXECUTIVE DASHBOARD',
    items: [
      { suffix: '/executive-dashboard', icon: LayoutDashboard, label: 'Executive Dashboard' },
      { suffix: '/compare', icon: GitCompare, label: 'Audit Compare' },
      { suffix: '/report', icon: FileSearch, label: 'Audit Report' },
      { suffix: '/seo-health', icon: ShieldCheck, label: 'SEO Health' },
    ],
  },
  {
    label: '2. GEO & AEO AI CENTER',
    items: [
      { suffix: '/geo-aeo', icon: Brain, label: 'GEO & AEO Hub' },
      { suffix: '/ai-deep', icon: Sparkles, label: 'AI Search Deep' },
      { suffix: '/ai-bots', icon: Bot, label: 'AI Bot Access' },
      { suffix: '/serp-preview', icon: Eye, label: 'SERP & AI Preview' },
      { suffix: '/social-seo', icon: Megaphone, label: 'Social SEO' },
      { suffix: '/local-seo', icon: MapPin, label: 'Local SEO' },
    ],
  },
  {
    label: '3. AI CONTENT & KEYWORDS',
    items: [
      { suffix: '/content-studio', icon: BookOpen, label: 'Content Studio' },
      { suffix: '/keywords', icon: Key, label: 'Keyword Strategy' },
      { suffix: '/content-rewrite', icon: Edit3, label: 'Content Rewriter' },
      { suffix: '/content-revival', icon: RefreshCw, label: 'Content Revival' },
      { suffix: '/blog-ai', icon: PenTool, label: 'Blog AI' },
      { suffix: '/chat', icon: MessageSquare, label: 'AI Chat' },
    ],
  },
  {
    label: '4. TECHNICAL AUDIT & REMEDIATION',
    items: [
      { suffix: '/issues', icon: AlertTriangle, label: 'Issue Remediation' },
      { suffix: '/action-center', icon: ClipboardList, label: 'Action Center' },
      { suffix: '/speed', icon: Gauge, label: 'Speed & CWV' },
      { suffix: '/internal-links', icon: Link2, label: 'Internal Links' },
      { suffix: '/page-experience', icon: HeartPulse, label: 'Page Experience' },
      { suffix: '/mobile-seo', icon: Smartphone, label: 'Mobile SEO' },
      { suffix: '/sitemap-robots', icon: Globe, label: 'Sitemap & Robots' },
      { suffix: '/security-headers', icon: ShieldAlert, label: 'Security Headers' },
      { suffix: '/image-seo', icon: Camera, label: 'Image SEO' },
      { suffix: '/roadmap', icon: Flag, label: 'SEO Roadmap' },
    ],
  },
  {
    label: '5. COMPETITIVE & OFFSITE',
    items: [
      { suffix: '/competitor', icon: Users, label: 'Competitor Analysis' },
      { suffix: '/backlinks', icon: Link2, label: 'Backlinks' },
      { suffix: '/offsite-authority', icon: Award, label: 'Off-Site Authority' },
      { suffix: '/citations', icon: MessageCircle, label: 'Citations' },
    ],
  },
  {
    label: '6. SETTINGS & ADMIN',
    items: [
      { suffix: '/page-detail', icon: Layers, label: 'Page Analysis' },
      { suffix: '/ai-roadmap', icon: Flag, label: 'AI Roadmap' },
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
    const p = location.pathname;
    if (p.endsWith('/executive-dashboard')) return 'Executive Dashboard';
    if (p.endsWith('/geo-aeo')) return 'GEO & AEO Hub';
    if (p.endsWith('/dashboard')) return 'Dashboard';
    if (p.endsWith('/seo')) return 'SEO Analysis';
    if (p.endsWith('/page-detail')) return 'Page Analysis';
    if (p.endsWith('/internal-links')) return 'Internal Links';
    if (p.endsWith('/speed')) return 'Speed & CWV';
    if (p.endsWith('/keywords')) return 'Keywords';
    if (p.endsWith('/ai-deep')) return 'AI Search Deep';
    if (p.endsWith('/competitor')) return 'Competitor Analysis';
    if (p.endsWith('/competitor-deep')) return 'Competitor Intel';
    if (p.endsWith('/roadmap')) return 'SEO Roadmap';
    if (p.endsWith('/content-rewrite')) return 'Content Rewriter';
    if (p.endsWith('/content-revival')) return 'Content Revival';
    if (p.endsWith('/serp-preview')) return 'SERP & AI Preview';
    if (p.endsWith('/chat')) return 'AI Chat';
    if (p.endsWith('/ai-bots')) return 'AI Bot Intelligence';
    if (p.endsWith('/offsite-authority')) return 'Off-Site Authority';
    if (p.endsWith('/progress')) return 'Audit Progress';
    if (p.endsWith('/action-center')) return 'Action Center';
    if (p.endsWith('/content-studio')) return 'Content Studio';
    if (p.endsWith('/pages')) return 'Page Analysis';
    if (p.endsWith('/compare')) return 'Audit Compare';
    if (p.endsWith('/report')) return 'Audit Report';
    if (p.endsWith('/backlinks')) return 'Backlink Profile';
    if (p.endsWith('/blog-ai')) return 'Blog AI';
    if (p.endsWith('/citations')) return 'Citation Analysis';
    if (p.endsWith('/image-seo')) return 'Image SEO';
    if (p.endsWith('/local-seo')) return 'Local SEO';
    if (p.endsWith('/mobile-seo')) return 'Mobile SEO';
    if (p.endsWith('/page-experience')) return 'Page Experience';
    if (p.endsWith('/page-improvements')) return 'Page Improvements';
    if (p.endsWith('/security-headers')) return 'Security Headers';
    if (p.endsWith('/seo-health')) return 'SEO Health';
    if (p.endsWith('/sitemap-robots')) return 'Sitemap & Robots';
    if (p.endsWith('/social-seo')) return 'Social SEO';
    if (p.endsWith('/ai-roadmap')) return 'AI Roadmap';
    if (p.endsWith('/issues')) return 'Issue Remediation';
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
