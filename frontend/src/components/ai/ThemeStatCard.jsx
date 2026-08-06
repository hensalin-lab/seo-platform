export default function ThemeStatCard({ icon: Icon, label, value, color = '#7c3aed', sub }) {
  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 13, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.85, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}
