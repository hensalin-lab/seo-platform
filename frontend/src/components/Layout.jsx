import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';
import { Search, Plus, ChevronRight, Moon, Sun, LogIn, LogOut } from 'lucide-react';
import { mainNav, auditSections, getIcon, getPageTitleForPath } from '../config/routes.config';

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
  const [collapsedSections, setCollapsedSections] = useState({});
  const [openGroups, setOpenGroups] = useState({});
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
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

  const title = getPageTitleForPath(location.pathname, isReport);

  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to={isReport ? `/audit/${auditId}/dashboard` : '/history'} className="sidebar-logo" title="Go to Dashboard">
          <div className="sidebar-logo-icon">D</div>
          <div className="sidebar-logo-text">Datavi RankIQ</div>
        </Link>
        <nav className="sidebar-nav">
          {!isReport && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">MAIN</div>
              {mainNav.filter(item => !item.adminOnly || isAdmin).map(item => (
                <SidebarLink
                  key={item.path}
                  to={item.path}
                  icon={getIcon(item.icon)}
                  label={item.label}
                  active={location.pathname === item.path}
                />
              ))}
            </div>
          )}
          {isReport && auditSections.map(section => {
            const sectionKey = section.label;
            const hasActiveItem = section.items.some(item =>
              item.group
                ? item.children.some(c => isActive(c.suffix, segment))
                : isActive(item.suffix, segment)
            );
            const isCollapsed = collapsedSections[sectionKey] && !hasActiveItem;
            return (
              <div className="sidebar-section" key={sectionKey}>
                <button
                  onClick={() => setCollapsedSections(s => ({ ...s, [sectionKey]: !s[sectionKey] }))}
                  className="sidebar-section-label"
                  title={isCollapsed ? 'Expand section' : 'Collapse section'}
                >
                  <span>{section.label}</span>
                  <ChevronRight size={12} style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s', opacity: 0.6 }} />
                </button>
                {!isCollapsed && section.items.map(item => {
                  if (item.group) {
                    const open = openGroups[item.label] ?? item.children.some(c => isActive(c.suffix, segment));
                    const GroupIcon = getIcon(item.icon);
                    return (
                      <div key={item.label}>
                        <button
                          onClick={() => setOpenGroups(g => ({ ...g, [item.label]: !open }))}
                          className={`sidebar-link-group ${item.children.some(c => isActive(c.suffix, segment)) ? 'active' : ''}`}
                          title={open ? 'Collapse group' : 'Expand group'}
                        >
                          <GroupIcon size={15} />
                          <span>{item.label}</span>
                          <ChevronRight size={12} style={{ marginLeft: 'auto', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', opacity: 0.6 }} />
                        </button>
                        {open && item.children.map(child => (
                          <SidebarLink
                            key={child.suffix}
                            to={`/audit/${auditId}${child.suffix}`}
                            icon={getIcon(child.icon)}
                            label={child.label}
                            active={isActive(child.suffix, segment)}
                            nested
                          />
                        ))}
                      </div>
                    );
                  }
                  const to = item.path || `/audit/${auditId}${item.suffix}`;
                  return (
                    <SidebarLink
                      key={item.suffix || item.path}
                      to={to}
                      icon={getIcon(item.icon)}
                      label={item.label}
                      active={item.suffix ? isActive(item.suffix, segment) : location.pathname === item.path}
                    />
                  );
                })}
              </div>
            );
          })}
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
