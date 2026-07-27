import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Zap, Globe, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const navSections = [
  {
    label: 'Main',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/new', label: 'New Audit', icon: Globe },
      { path: '/history', label: 'Audit History', icon: History },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sidebar__logo-icon">S</div>
          {!collapsed && <span className="sidebar__logo">SEO Intel</span>}
        </Link>
        <button className="btn btn-ghost btn-xs" onClick={() => setCollapsed(!collapsed)} style={{ padding: '4px' }}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar__nav">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && <div className="sidebar__section-label">{section.label}</div>}
            {section.items.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path} className={`sidebar__link ${isActive(path) ? 'sidebar__link--active' : ''}`} title={collapsed ? label : undefined}>
                <Icon size={18} />
                {!collapsed && <span>{label}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        {!collapsed && <p className="sidebar__version">AI SEO Intelligence v2.0</p>}
      </div>
    </aside>
  );
}
