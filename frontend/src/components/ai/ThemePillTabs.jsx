export default function ThemePillTabs({ tabs, active, onChange, style }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', ...style }}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9,
              border: isActive ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border-light)',
              background: isActive ? 'rgba(139,92,246,0.08)' : 'var(--bg-white)',
              cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 750 : 600, color: isActive ? '#7c3aed' : 'var(--text-secondary)',
              boxShadow: isActive ? '0 4px 12px -6px rgba(139,92,246,0.4)' : 'none',
            }}
          >
            {Icon && <Icon size={13} color={isActive ? '#7c3aed' : 'var(--text-muted)'} />}
            {t.label}
            {t.count != null && (
              <span style={{ marginLeft: 2, fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 8, background: isActive ? 'rgba(139,92,246,0.15)' : 'var(--bg-secondary)', color: isActive ? '#7c3aed' : 'var(--text-muted)' }}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
