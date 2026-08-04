import { Zap, AlertTriangle, Wrench, MessageSquare, Eye, Code, ArrowRight } from 'lucide-react';

const QUADRANTS = [
  {
    key: 'quick-wins',
    label: 'Quick Wins',
    desc: 'High Impact / Low Effort',
    icon: Zap,
    color: '#12b886',
    bg: 'rgba(18,184,134,0.06)',
    border: 'rgba(18,184,134,0.2)',
  },
  {
    key: 'major-projects',
    label: 'Major Projects',
    desc: 'High Impact / High Effort',
    icon: AlertTriangle,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.06)',
    border: 'rgba(59,130,246,0.2)',
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    desc: 'Medium Impact / Medium Effort',
    icon: Wrench,
    color: '#f59e0b',
    bg: 'rgba(245,159,11,0.06)',
    border: 'rgba(245,159,11,0.2)',
  },
  {
    key: 'fill-ins',
    label: 'Fill-Ins',
    desc: 'Low Impact / Low Effort',
    icon: MessageSquare,
    color: 'var(--text-muted)',
    bg: 'rgba(148,163,184,0.06)',
    border: 'rgba(148,163,184,0.2)',
  },
];

function categorizeIssue(issue) {
  const sev = issue.severity || '';
  const impact = issue.impact_score ?? issue.impact ?? 0;
  if (sev === 'CRITICAL' || impact >= 8) return 'quick-wins';
  if (sev === 'HIGH' || impact >= 5) return 'major-projects';
  if (sev === 'MEDIUM' || impact >= 3) return 'maintenance';
  return 'fill-ins';
}

export default function ImpactEffortMatrix({ issues = [], onGenerateFix, onPreview }) {
  const grouped = QUADRANTS.map(q => ({
    ...q,
    items: issues.filter(i => categorizeIssue(i) === q.key),
  }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {grouped.map(quad => {
        const Icon = quad.icon;
        return (
          <div key={quad.key} style={{ background: quad.bg, border: `1px solid ${quad.border}`, borderRadius: 10, padding: 14, minHeight: 100 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon size={15} color={quad.color} />
              <span style={{ fontSize: 13, fontWeight: 700, color: quad.color }}>{quad.label}</span>
              <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: quad.border, color: quad.color, fontWeight: 600 }}>{quad.items.length}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{quad.desc}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {quad.items.length > 0 ? quad.items.slice(0, 5).map((issue, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'rgba(255,255,255,0.7)', borderRadius: 6, border: '1px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: quad.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {issue.title || issue.signal_name || issue.description?.slice(0, 60) || 'Issue'}
                  </span>
                  <button onClick={() => onPreview?.(issue)} style={{ padding: '3px 6px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <Eye size={11} />
                  </button>
                  <button onClick={() => onGenerateFix?.(issue)} style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: quad.color + '20', cursor: 'pointer', color: quad.color, fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Zap size={10} /> Fix
                  </button>
                </div>
              )) : (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>No issues in this category</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
