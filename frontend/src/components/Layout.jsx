import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Plus, FileText, BarChart3, Search, Link2,
  Gauge, BookOpen, Key, Globe, MessageSquare, Users,
  ExternalLink, Shield, Activity, Lightbulb, GitCompare,
  Filter, Edit3, Eye, Layers, Brain, Zap, Sparkles,
  Bot, Award, FileCode, Cpu
} from 'lucide-react';

const MAIN_NAV = [
  { path: '/new', icon: Plus, label: 'New Audit' },
  { path: '/history', icon: FileText, label: 'History' },
];

const AUDIT_NAV = [
  {
    label: 'OVERVIEW',
    items: [
      { suffix: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'ANALYSIS',
    items: [
      { suffix: '/seo', icon: Search, label: 'SEO Analysis' },
      { suffix: '/page-detail', icon: Layers, label: 'Page Intelligence' },
      { suffix: '/page-deep', icon: Layers, label: 'Page Deep Dive' },
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
    ],
  },
  {
    label: 'TOOLS',
    items: [
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
          <div style={{ fontSize: 10, color: 'var(--sidebar-text)', textAlign: 'center', opacity: 0.5 }}>
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
