import { useState, useEffect } from 'react';
import { api } from '../../../api';
import { Code2, KeyRound, Webhook, Layers, BarChart3, Globe } from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, Badge,
} from './ui';

const GROUP_META = {
  audits: { label: 'Audits & Insights', icon: BarChart3, color: '#8b5cf6' },
  monitoring: { label: 'Monitoring', icon: Webhook, color: '#22c55e' },
  workspaces: { label: 'Workspaces', icon: Layers, color: '#3b82f6' },
  platform: { label: 'Platform', icon: Globe, color: '#f97316' },
};

export default function ApiReference() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getPublicApiInfo().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading API reference…" />;

  if (error) {
    return <EmptyState icon={Code2} title="Failed to load" message={error} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={Code2}
          title="Public API Reference"
          subtitle="Programmatic access to audits, monitoring, workspaces and platform data"
        />
        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontFamily: 'monospace' }}>
          <div style={{ marginBottom: 6 }}><KeyRound size={13} style={{ verticalAlign: -2, marginRight: 6 }} color="#eab308" />{data.auth}</div>
          <div style={{ marginBottom: 6 }}><Code2 size={13} style={{ verticalAlign: -2, marginRight: 6 }} color="#8b5cf6" />Base URL: <b>{data.base_url}</b></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Example: <code>GET /api/audit/history</code> with <code>Authorization: Bearer &lt;token&gt;</code></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
          {Object.entries(data.resources || {}).map(([group, endpoints]) => {
            const meta = GROUP_META[group] || { label: group, icon: Code2, color: '#8b5cf6' };
            const Icon = meta.icon;
            return (
              <div key={group} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={meta.color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{meta.label}</span>
                  <Badge color={meta.color} style={{ marginLeft: 'auto' }}>{endpoints.length}</Badge>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {endpoints.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 9px', wordBreak: 'break-all' }}>{e}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader icon={Webhook} title="Webhook events" subtitle="Subscribe via Settings → Webhooks to receive these notifications" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(data.webhook_events || []).map((ev, i) => <Badge key={i} color="#8b5cf6">{ev}</Badge>)}
        </div>
      </Card>
    </div>
  );
}
