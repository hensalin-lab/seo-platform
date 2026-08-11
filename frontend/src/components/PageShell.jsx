import SkeletonLine from './Skeleton';
import { EmptyState } from './States';

export default function PageShell({ loading, error, empty, title, subtitle, icon: Icon, children, actions }) {
  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            {Icon && <SkeletonLine width={32} height={32} />}
            <div>
              <SkeletonLine width={200} height={20} />
              {subtitle && <SkeletonLine width={140} height={12} style={{ marginTop: 6 }} />}
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border-light, #e8ecef)', borderRadius: 12, padding: 20 }}>
              <SkeletonLine width="60%" height={16} />
              <SkeletonLine width="100%" height={12} style={{ marginTop: 8 }} />
              <SkeletonLine width="80%" height={12} style={{ marginTop: 6 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#991b1b' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div style={{ padding: 24 }}>
        <EmptyState icon={Icon} title="No data available" description="Run an audit to see results here." />
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ padding: 24 }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {Icon && <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light, #eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} style={{ color: 'var(--primary, #4c6ef5)' }} />
            </div>}
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text, #1a1d29)', margin: 0 }}>{title}</h1>
              {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted, #8a8f9e)', margin: '4px 0 0' }}>{subtitle}</p>}
            </div>
          </div>
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
