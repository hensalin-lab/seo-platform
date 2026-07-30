import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';
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

const TAB_MAP = {
  '/executive-dashboard': 'executive.sub-dashboard',
  '/compare': 'executive.sub-compare',
  '/report': 'executive.sub-report',
  '/seo-health': 'executive.sub-seo-health',
  '/geo-aeo': 'geo-aeo.sub-hub',
  '/ai-deep': 'geo-aeo.sub-ai-deep',
  '/ai-bots': 'geo-aeo.sub-ai-bots',
  '/serp-preview': 'geo-aeo.sub-serp-preview',
  '/social-seo': 'geo-aeo.sub-social-seo',
  '/local-seo': 'geo-aeo.sub-local-seo',
  '/content-studio': 'content.sub-studio',
  '/keywords': 'content.sub-keywords',
  '/content-rewrite': 'content.sub-rewriter',
  '/content-revival': 'content.sub-revival',
  '/blog-ai': 'content.sub-blog',
  '/chat': 'content.sub-chat',
  '/issues': 'technical.sub-issues',
  '/action-center': 'technical.sub-action-center',
  '/speed': 'technical.sub-speed',
  '/internal-links': 'technical.sub-links',
  '/page-experience': 'technical.sub-page-experience',
  '/mobile-seo': 'technical.sub-mobile',
  '/sitemap-robots': 'technical.sub-sitemap',
  '/security-headers': 'technical.sub-security',
  '/image-seo': 'technical.sub-image',
  '/roadmap': 'technical.sub-roadmap',
  '/competitor': 'offsite.sub-competitor',
  '/backlinks': 'offsite.sub-backlinks',
  '/offsite-authority': 'offsite.sub-authority',
  '/citations': 'offsite.sub-citations',
};

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
    label: '6. AI FIX & ROADMAP',
    items: [
      { suffix: '/issues', icon: Zap, label: 'Quick Fix Center' },
      { suffix: '/roadmap', icon: Flag, label: 'SEO Roadmap' },
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth(); // moved to top level

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
    const tab = new URLSearchParams(location.search).get('tab') || 'workspace';
    const sub = new URLSearchParams(location.search).get('sub') || '';
    const titles = {
      executive: sub ? { dashboard: 'Executive Dashboard', compare: 'Audit Compare', report: 'Audit Report', 'seo-health': 'SEO Health' }[sub] || 'Executive' : 'Executive Dashboard',
      'geo-aeo': sub ? { hub: 'GEO & AEO Hub', 'ai-deep': 'AI Search Deep', 'ai-bots': 'AI Bot Access', 'serp-preview': 'SERP & AI Preview', 'social-seo': 'Social SEO', 'local-seo': 'Local SEO' }[sub] || 'GEO/AEO' : 'GEO & AEO Center',
      content: sub ? { studio: 'Content Studio', keywords: 'Keyword Strategy', rewriter: 'Content Rewriter', revival: 'Content Revival', blog: 'Blog AI', chat: 'AI Chat' }[sub] || 'Content' : 'Content & Keywords',
      technical: sub ? { issues: 'Issue Remediation', 'action-center': 'Action Center', speed: 'Speed & CWV', links: 'Internal Links', 'page-experience': 'Page Experience', mobile: 'Mobile SEO', sitemap: 'Sitemap & Robots', security: 'Security Headers', image: 'Image SEO', roadmap: 'SEO Roadmap' }[sub] || 'Technical' : 'Technical Audit',
      offsite: sub ? { competitor: 'Competitor Analysis', backlinks: 'Backlinks', authority: 'Off-Site Authority', citations: 'Citations' }[sub] || 'Offsite' : 'Competitive & Offsite',
    };
    return titles[tab] || 'SEO Workspace';
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
              {section.items.map(item => {
                const mapping = TAB_MAP[item.suffix];
                const [tab, sub] = mapping ? mapping.split('.sub-') : ['executive', 'dashboard'];
                const searchStr = `?tab=${tab}${sub ? `&sub=${sub}` : ''}`;
                return (
                  <SidebarLink
                    key={item.suffix}
                    to={`/audit/${auditId}${searchStr}`}
                    icon={item.icon}
                    label={item.label}
                    active={location.pathname === `/audit/${auditId}` && location.search.includes(`tab=${tab}`)}
                  />
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          {isAuthenticated && user ? (
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
          )}
          <div style={{ fontSize: 10, color: 'var(--sidebar-text)', textAlign: 'center', opacity: 0.5, marginTop: 4 }}>
            SEO Intel v2.5
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
            <button className="btn btn-ghost btn-sm" onClick={() => setPaletteOpen(true)} title="Search (Cmd+K)" style={{ background: 'none', border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Search size={13} /> <kbd style={{ fontSize: 10, opacity: 0.5, border: '1px solid var(--border, #e2e8f0)', borderRadius: 3, padding: '0 4px' }}>⌘K</kbd>
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/new')}>
              <Plus size={13} /> New Audit
            </button>
          </div>
          <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} auditId={auditId} />
        </div>
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
