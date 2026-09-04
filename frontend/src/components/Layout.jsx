import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';
import { Search, Plus, Moon, Sun, LogIn, LogOut, ChevronDown, Wrench } from 'lucide-react';
import { mainNav, reportSidebarNav, getIcon, getPageTitleForPath } from '../config/routes.config';

function SidebarLink({ to, icon: Icon, label, active, nested }) {
  return (
    <Link to={to} className={`sidebar-link ${active ? 'active' : ''} ${nested ? 'sidebar-link-nested' : ''}`}>
      <Icon size={15} />
      <span>{label}</span>
    </Link>
  );
}

function isActive(suffix, segment) {
  return suffix && segment === suffix.slice(1);
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [toolsOpen, setToolsOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState({});
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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
  const segment = isReport ? location.pathname.slice(location.pathname.lastIndexOf('/') + 1) : '';
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  const title = getPageTitleForPath(location.pathname, isReport);

  const navItems = mainNav.filter(item => !item.adminOnly || isAdmin);
  const mainItems = navItems.filter(item => item.group !== 'tools');
  const toolItems = navItems.filter(item => item.group === 'tools');

  if (isAuthPage) {
    return <div className="auth-layout" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to={isReport ? `/audit/${auditId}/dashboard` : '/history'} className="sidebar-logo" title="Go to Dashboard">
          <div className="sidebar-logo-icon">D</div>
          <div className="sidebar-logo-text">Datavi RankIQ</div>
        </Link>
        <nav className="sidebar-nav">
          {!isReport && (
            <>
              <div className="sidebar-section">
                <div className="sidebar-section-label">MAIN</div>
                {mainItems.map(item => (
                  <SidebarLink
                    key={item.path}
                    to={item.path}
                    icon={getIcon(item.icon)}
                    label={item.label}
                    active={location.pathname === item.path}
                  />
                ))}
              </div>
              {toolItems.length > 0 && (
                <div className="sidebar-section">
                  <button
                    className={`sidebar-link-group ${toolsOpen ? 'active' : ''}`}
                    onClick={() => setToolsOpen(o => !o)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Wrench size={16} />
                      Tools
                    </span>
                    <ChevronDown size={14} style={{ transform: toolsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
                  </button>
                  {toolsOpen && toolItems.map(item => (
                    <SidebarLink
                      key={item.path}
                      to={item.path}
                      icon={getIcon(item.icon)}
                      label={item.label}
                      active={location.pathname === item.path}
                      nested
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {isReport && reportSidebarNav.map(group => (
            <div className="sidebar-section" key={group.section}>
              <div className="sidebar-section-label">{group.section}</div>
              {group.main.map(item => {
                const to = item.path ? item.path : `/audit/${auditId}${item.suffix}`;
                return (
                  <SidebarLink
                    key={item.path || item.suffix}
                    to={to}
                    icon={getIcon(item.icon)}
                    label={item.label}
                    active={item.path ? location.pathname === item.path : isActive(item.suffix, segment)}
                  />
                );
              })}
              {group.moreGroups && group.moreGroups.map(sub => {
                const key = `${group.section}:${sub.label}`;
                const open = moreOpen[key] !== false;
                return (
                  <div key={key}>
                    <button
                      className="sidebar-link-group"
                      onClick={() => setMoreOpen(s => ({ ...s, [key]: !open }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}
                    >
                      <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s', opacity: 0.6 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.75 }}>{sub.label}</span>
                    </button>
                    {open && sub.items.map(item => {
                      const to = item.path ? item.path : `/audit/${auditId}${item.suffix}`;
                      return (
                        <SidebarLink
                          key={item.path || item.suffix}
                          to={to}
                          icon={getIcon(item.icon)}
                          label={item.label}
                          active={item.path ? location.pathname === item.path : isActive(item.suffix, segment)}
                          nested
                        />
                      );
                    })}
                  </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} style={{ background: 'none', border: 'none', color: 'var(--sidebar-text)', cursor: 'pointer', padding: 4, opacity: 0.6 }} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <div style={{ fontSize: 9.5, color: 'var(--sidebar-text)', textAlign: 'center', opacity: 0.35, marginLeft: 'auto', letterSpacing: '1px' }}>
              DATAVI RANKIQ v2.6
            </div>
          </div>
        </div>
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
