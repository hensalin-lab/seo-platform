import { useState, useEffect } from 'react';
import { api } from '../../../api';
import { Activity, BarChart3, History, Sparkles } from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, Badge, StatCard,
} from './ui';
import DataSourceBadge from '../../../components/DataSourceBadge';

const EVENT_LABELS = {
  'audit.started': { label: 'Audit runs', color: '#8b5cf6' },
  'audit.completed': { label: 'Audits completed', color: '#22c55e' },
  'audit.failed': { label: 'Audits failed', color: '#ef4444' },
  'demo.created': { label: 'Demo audits', color: '#3b82f6' },
  'rankings.captured': { label: 'Rank captures', color: '#f97316' },
};

export default function UsageMetering() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.getUsage(days).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [days]);

  if (loading) return <LoadingSpinner message="Loading usage data…" />;

  if (error) {
    return <EmptyState icon={Activity} title="Failed to load usage" message={error} />;
  }

  const byType = data.by_type || {};
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={Activity}
          title="Usage Metering"
          badge={`${data.total_events ?? 0} events`}
          subtitle="Track platform consumption for capacity planning and future billing"
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <DataSourceBadge source="measured" size="xs" />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }}>
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: days === d ? '#8b5cf6' : 'transparent', color: days === d ? '#fff' : 'var(--text-muted)' }}
                >
                  {d}d
                </button>
              ))}
              </div>
            </div>
          }
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          <StatCard icon={Activity} label="Total events" value={data.total_events ?? 0} sub={`last ${data.days} days`} color="#8b5cf6" />
          <StatCard icon={BarChart3} label="Event types" value={topTypes.length} color="#3b82f6" />
          <StatCard icon={Sparkles} label="Demo audits" value={byType['demo.created'] || 0} color="#f97316" />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <Card>
          <CardHeader icon={BarChart3} title="Events by type" subtitle={`Last ${data.days} days`} />
          {topTypes.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topTypes.map(([t, n]) => {
                const meta = EVENT_LABELS[t] || { label: t, color: '#8b5cf6' };
                const pct = Math.round((n / Math.max(data.total_events, 1)) * 100);
                return (
                  <div key={t}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{meta.label}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{n} ({pct}%)</span>
                    </div>
                    <div style={{ width: '100%', background: 'var(--border)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, background: meta.color, height: '100%', borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No events recorded in this period.</div>
          )}
        </Card>

        <Card>
          <CardHeader icon={History} title="Recent events" subtitle="Latest 100" />
          {data.recent?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
              {data.recent.map((e, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                  <Badge color={(EVENT_LABELS[e.event_type] || {}).color || '#8b5cf6'}>{e.event_type}</Badge>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(e.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No recent events.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
