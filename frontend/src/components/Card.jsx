import { useState, useEffect } from 'react';

export function Card({ children, title, subtitle, icon: Icon, action, className = '', style = {}, animate = true }) {
  return (
    <div className={`${animate ? 'hover-lift animate-in' : ''} ${className}`}
      style={{
        background: 'var(--bg-white, #fff)',
        border: '1px solid var(--border-light, #e8ecef)',
        borderRadius: 'var(--radius, 12px)',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: title ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {Icon && <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light, #eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={16} style={{ color: 'var(--primary, #4c6ef5)' }} />
            </div>}
            <div>
              {title && <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text, #1a1d29)' }}>{title}</div>}
              {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted, #8a8f9e)', marginTop: 2 }}>{subtitle}</div>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function ScoreBar({ value, max = 100, color = '#4c6ef5', label, showValue = true }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth((value / max) * 100), 100); return () => clearTimeout(t); }, [value, max]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {label && <span style={{ fontSize: 12, color: 'var(--text-muted, #8a8f9e)', minWidth: 80 }}>{label}</span>}
      <div style={{ flex: 1, height: 6, background: 'var(--border-light, #eef0f2)', borderRadius: 3, overflow: 'hidden' }} className="live-shimmer">
        <div style={{ height: '100%', width: `${width}%`, background: `linear-gradient(90deg, ${color}, ${color}dd)`, borderRadius: 3, transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: `0 0 8px ${color}40` }} />
      </div>
      {showValue && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text, #1a1d29)', minWidth: 35, textAlign: 'right' }}>{Math.round(value)}</span>}
    </div>
  );
}

export function Badge({ children, color = '#4c6ef5', bg, size = 'sm', style = {} }) {
  const bgMap = { sm: { padding: '2px 8px', fontSize: 11 }, md: { padding: '4px 12px', fontSize: 12 }, lg: { padding: '6px 16px', fontSize: 14 } };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600,
      color, background: bg || `${color}18`, borderRadius: 6,
      ...bgMap[size], ...style,
    }}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, icon: Icon, color = 'var(--primary, #4c6ef5)', suffix = '', style = {} }) {
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border-light, #e8ecef)', borderRadius: 'var(--radius, 12px)', padding: 16, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {Icon && <Icon size={14} style={{ color }} />}
        <span style={{ fontSize: 12, color: 'var(--text-muted, #8a8f9e)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text, #1a1d29)' }}>
        {value}{suffix}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Search, title = 'No data available', description = '', action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center' }}>
      <Icon size={48} style={{ color: 'var(--text-muted, #d1d5db)', marginBottom: 16 }} />
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #1a1d29)', marginBottom: 4 }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--text-muted, #8a8f9e)', maxWidth: 300 }}>{description}</div>}
      {action}
    </div>
  );
}
