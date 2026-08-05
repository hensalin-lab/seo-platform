import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, Badge, StatCard, ProgressBar, severityColor,
} from './ui';

export default function JsDependency() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getJsDependency(id).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner message="Analyzing JS dependency…" />;

  if (error) {
    return <EmptyState icon={Cpu} title="Analysis failed" message={error} />;
  }

  const levelColor = data.risk_level === 'HIGH' ? '#ef4444' : data.risk_level === 'MEDIUM' ? '#f97316' : '#22c55e';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={Cpu}
          title="JavaScript Dependency"
          badge={data.risk_level}
          subtitle="How much of this site's content depends on client-side rendering"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard icon={Cpu} label="Risk score" value={`${data.risk_score ?? 0}%`} color={levelColor} />
          <StatCard icon={AlertTriangle} label="JS-only pages" value={data.js_only_count ?? 0} sub={`of ${data.total_pages ?? 0} pages`} color="#ef4444" />
          <StatCard icon={CheckCircle2} label="Rendered w/ JS" value={data.rendered_with_js_count ?? 0} sub="server or prerender verified" color="#22c55e" />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Pages with empty HTML that only fills after JS runs</div>
        <ProgressBar value={data.risk_score ?? 0} color={levelColor} />
      </Card>

      {(data.frameworks && Object.keys(data.frameworks).length) ? (
        <Card>
          <CardHeader icon={Cpu} title="Framework signals" subtitle="Detected from script patterns and hydration markers" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(data.frameworks).map(([fw, n]) => (
              <Badge key={fw} color={fw === 'none' ? 'var(--text-muted)' : '#8b5cf6'}>{fw || 'none'} × {n}</Badge>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader icon={AlertTriangle} title="JS-only pages" badge={`${data.js_only_count ?? 0}`} subtitle="Content not present in the initial HTML response" />
        {data.js_only_pages?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
            {data.js_only_pages.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                <AlertTriangle size={15} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all' }}>{p.url}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.word_count} words in HTML · framework: {p.framework || 'unknown'}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No JS-only pages found. Content renders in the raw HTML.</div>
        )}
      </Card>
    </div>
  );
}
