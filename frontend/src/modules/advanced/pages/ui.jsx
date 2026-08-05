import React from 'react';

export const ACCENT = '#8b5cf6';

export function LoadingSpinner({ message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: ACCENT, animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>{message || 'Loading...'}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', ...style }}>
      {children}
    </div>
  );
}

export function CardHeader({ icon: Icon, title, badge, iconColor = ACCENT, actions, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
      {Icon && (
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={iconColor} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {title}
          {badge && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.14)', color: ACCENT }}>{badge}</span>}
        </div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px', gap: 10 }}>
      {Icon && <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={22} color={ACCENT} /></div>}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {message && <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, lineHeight: 1.5 }}>{message}</div>}
      {action}
    </div>
  );
}

export function Badge({ color, children, style }) {
  const bg = color || ACCENT;
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `${bg}1f`, color: bg, whiteSpace: 'nowrap', ...style }}>
      {children}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, color = ACCENT, sub }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={19} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, color = ACCENT, height = 8 }) {
  return (
    <div style={{ width: '100%', background: 'var(--border)', borderRadius: 999, height, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color, height: '100%', borderRadius: 999, transition: 'width .4s ease' }} />
    </div>
  );
}

export function severityColor(severity) {
  const s = (severity || '').toUpperCase();
  if (s === 'CRITICAL') return '#ef4444';
  if (s === 'HIGH') return '#f97316';
  if (s === 'MEDIUM') return '#eab308';
  return '#22c55e';
}

export const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: 13, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};

export const labelStyle = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 6, display: 'block',
};

export const btnPrimary = {
  padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 7,
};

export const btnGhost = {
  padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
  background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 7,
};
