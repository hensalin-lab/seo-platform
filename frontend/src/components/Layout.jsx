import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';
import {
  Search, Plus, Moon, Sun, LogIn, LogOut, Menu, X,
  ChevronDown, ChevronRight, Wrench
} from 'lucide-react';
import { getPageTitleForPath, getIcon } from '../config/routes.config';
import {
  NAV_CONTEXTS, OVERVIEW_ITEMS, AUDIT_GROUPS,
  SITE_TOOLS, PLATFORM
} from '../config/sidebar.config';
import { api } from '../api';

function SidebarLink({ to, icon: Icon, label, active, nested, badge }) {
  return (
    <Link to={to} className={`sidebar-link ${active ? 'active' : ''} ${nested ? 'sidebar-link-nested' : ''}`}>
      <Icon size={15} />
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className="sidebar-badge">{badge > 99 ? '99+' : badge}</span>
      )}
    </Link>
  );
}

function isActive(suffix, segment) {
  return suffix && segment === suffix.slice(1);
}

function resolveContext(pathname) {
  if (pathname.startsWith('/audit/')) return 'audit';
  const toolPaths = SITE_TOOLS.flatMap(g => g.items.map(i => i.path));
  if (toolPaths.includes(pathname)) return 'tools';
  const platformPaths = PLATFORM.flatMap(g => g.items.map(i => i.path));
  if (platformPaths.includes(pathname)) return 'platform';
  return 'overview';
}

const COLLAPSE_KEY = 'sidebar-audit-collapse';

function loadCollapseState() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || {}; }
  catch { return {}; }
}

function saveCollapseState(state) {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state)); }
  catch { /* ignore */ }
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [activeContext, setActiveContext] = useState(() => resolveContext(location.pathname));
  const [groupCollapse, setGroupCollapse] = useState(() => loadCollapseState());
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState({ issues: 0, drift: 0 });
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const searchRef = useRef(null);
  const panelRef = useRef(null);

  // ── Theme ────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ── Cmd+K ───────────────────────────────────────────────────────────
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

  // ── Audit context detection + auto-switch ────────────────────────────
  const match = location.pathname.match(/\/audit\/([^/]+)/);
  const auditId = match ? match[1] : null;
  const isReport = !!auditId;
  const segment = isReport
    ? location.pathname.slice(location.pathname.lastIndexOf('/') + 1)
    : '';
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  // Auto-switch context when navigating into an audit
  useEffect(() => {
    setActiveContext(resolveContext(location.pathname));
  }, [location.pathname]);

  // ── Close mobile nav on navigate ─────────────────────────────────────
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // ── Badge fetching (audit context only) ──────────────────────────────
  useEffect(() => {
    if (!auditId) { setBadges({ issues: 0, drift: 0 }); return; }
    let cancelled = false;
    (async () => {
      try {
        const [issuesResp, driftResp] = await Promise.all([
          api.getAuditIssues(auditId, { limit: 500 }).catch(() => ({ items: [] })),
          api.getDrift(auditId).catch(() => ({ changes: [] })),
        ]);
        if (cancelled) return;
        const openCount = (issuesResp.items || []).filter(
          i => i.status !== 'dismissed' && i.status !== 'fixed'
        ).length;
        const driftCount = (driftResp.changes || []).length;
        setBadges({ issues: openCount, drift: driftCount });
      } catch { if (!cancelled) setBadges({ issues: 0, drift: 0 }); }
    })();
    return () => { cancelled = true; };
  }, [auditId]);

  // ── Collapse persistence ─────────────────────────────────────────────
  useEffect(() => { saveCollapseState(groupCollapse); }, [groupCollapse]);

  const toggleGroup = useCallback((label) => {
    setGroupCollapse(prev => ({ ...prev, [label]: !prev[label] }));
  }, []);

  // ── Search filtering for audit groups ────────────────────────────────
  const filteredAuditGroups = useMemo(() => {
    if (!search.trim()) return AUDIT_GROUPS;
    const q = search.toLowerCase();
    return AUDIT_GROUPS.map(g => ({
      ...g,
      items: g.items.filter(i =>
        i.label.toLowerCase().includes(q) ||
        (i.suffix && i.suffix.replace('/', '').includes(q))
      ),
    })).filter(g => g.items.length > 0);
  }, [search]);

  // Auto-expand groups that match search
  useEffect(() => {
    if (!search.trim()) return;
    setGroupCollapse(prev => {
      const next = { ...prev };
      filteredAuditGroups.forEach(g => { next[g.label] = false; }); // false = expanded
      return next;
    });
  }, [search, filteredAuditGroups]);

  // ── Context resolution from config ───────────────────────────────────
  const currentCtx = NAV_CONTEXTS.find(c => c.id === activeContext) || NAV_CONTEXTS[1];
  const CurrentCtxIcon = getIcon(currentCtx.icon);

  const navItems = useMemo(() => {
    if (activeContext === 'tools') {
      return SITE_TOOLS.map(g => ({
        ...g,
        items: g.items.map(i => ({ ...i, href: i.path })),
      }));
    }
    if (activeContext === 'platform') {
      return PLATFORM.map(g => ({
        ...g,
        items: g.items.map(i => ({ ...i, href: i.path })),
      }));
    }
    if (activeContext === 'overview') {
      return [{ label: 'Quick links', items: OVERVIEW_ITEMS.map(i => ({ ...i, href: i.path })) }];
    }
    // audit context
    return filteredAuditGroups.map(g => ({
      ...g,
      items: g.items.map(i => ({
        ...i,
        href: i.suffix ? `/audit/${auditId}${i.suffix}` : i.path,
      })),
    }));
  }, [activeContext, auditId, filteredAuditGroups]);

  // ── Click outside to close panel on mobile ───────────────────────────
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  const title = getPageTitleForPath(location.pathname, isReport);

  if (isAuthPage) {
    return <div className="auth-layout" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>;
  }

  const sidebarContent = (
    <>
      {/* ── Rail ──────────────────────────────────────────────────── */}
      <div className="sidebar-rail">
        <Link to={isReport ? `/audit/${auditId}/dashboard` : '/history'} className="sidebar-logo" title="Go to Dashboard">
          <div className="sidebar-logo-icon">D</div>
        </Link>

        <div className="sidebar-rail-contexts">
          {NAV_CONTEXTS.map(ctx => {
            const Icon = getIcon(ctx.icon);
            return (
              <button
                key={ctx.id}
                className={`sidebar-rail-btn ${activeContext === ctx.id ? 'active' : ''}`}
                onClick={() => setActiveContext(ctx.id)}
                title={ctx.label}
              >
                <Icon size={20} />
                <span className="sidebar-rail-label">{ctx.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-rail-bottom">
          {isAuthenticated && user ? (
            <div className="sidebar-rail-user" title={user.username || user.email}>
              <div className="sidebar-rail-avatar">
                {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>
            </div>
          ) : (
            <Link to="/login" className="sidebar-rail-btn" title="Sign In">
              <LogIn size={18} />
            </Link>
          )}
          <button
            className="sidebar-rail-btn"
            onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* ── Panel ─────────────────────────────────────────────────── */}
      <div className="sidebar-panel">
        <div className="sidebar-panel-header">
          <CurrentCtxIcon size={16} />
          <span className="sidebar-panel-title">{currentCtx.label}</span>
          {isReport && (
            <span className="sidebar-audit-id">{auditId.slice(0, 8)}</span>
          )}
        </div>

        {/* Search (audit context only) */}
        {activeContext === 'audit' && (
          <div className={`sidebar-search ${searchFocused ? 'focused' : ''}`}>
            <Search size={14} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search pages…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setSearch('');
                  searchRef.current?.blur();
                }
              }}
            />
            {search && (
              <button className="sidebar-search-clear" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>
        )}

        <div className="sidebar-panel-nav">
          {navItems.map(group => (
            <div className="sidebar-section" key={group.label}>
              {activeContext === 'audit' ? (
                <button
                  className={`sidebar-section-label ${groupCollapse[group.label] !== true ? 'expanded' : ''}`}
                  onClick={() => toggleGroup(group.label)}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={13}
                    style={{
                      transform: groupCollapse[group.label] === true ? 'rotate(-90deg)' : 'rotate(0)',
                      transition: 'transform 0.18s',
                    }}
                  />
                </button>
              ) : (
                <div className="sidebar-section-label">{group.label}</div>
              )}

              {(activeContext !== 'audit' || groupCollapse[group.label] !== true) && (
                <div className="sidebar-section-items">
                  {group.items.map(item => {
                    const isItemActive = item.suffix
                      ? isActive(item.suffix, segment)
                      : location.pathname === item.href;
                    return (
                      <SidebarLink
                        key={item.path || item.suffix}
                        to={item.href}
                        icon={getIcon(item.icon)}
                        label={item.label}
                        active={isItemActive}
                        nested={false}
                        badge={item.badge === 'issues' ? badges.issues : item.badge === 'drift' ? badges.drift : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Logout in panel footer */}
        {isAuthenticated && (
          <div className="sidebar-panel-footer">
            <button className="sidebar-logout-btn" onClick={logout} title="Sign out">
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">{sidebarContent}</aside>

      {/* Mobile hamburger + overlay */}
      <button className="mobile-hamburger" onClick={() => setMobileOpen(o => !o)}>
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar sidebar-mobile ${mobileOpen ? 'open' : ''}`}>
        {sidebarContent}
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <div>
              <div className="topbar-title">{title}</div>
              {isReport && (
                <div className="topbar-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, letterSpacing: '0.2px' }}>
                  <span style={{ color: 'var(--text-dim)' }}>audit</span>
                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{auditId.slice(0, 8)}</span>
                  <span style={{ color: 'var(--text-dim)' }}>/</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{segment || 'dashboard'}</span>
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
