import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Link2, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, Badge, StatCard, severityColor,
} from './ui';

export default function RedirectAudit() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getRedirects(id).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner message="Analyzing redirect chains…" />;

  if (error) {
    return <EmptyState icon={Link2} title="Analysis failed" message={error} />;
  }

  const counts = data.issue_counts || {};
  const byType = counts.by_type || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader icon={Link2} title="Redirect Analysis" subtitle="Redirect chains, soft redirects and HTTP→HTTPS detection captured during the crawl" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          <StatCard icon={Link2} label="Redirects" value={data.total_redirects ?? 0} color="#8b5cf6" />
          <StatCard icon={ArrowRight} label="Chains" value={data.chains ?? 0} sub="2+ hop redirects" color="#f97316" />
          <StatCard icon={ShieldCheck} label="HTTP → HTTPS" value={data.http_to_https ?? 0} color="#22c55e" />
          <StatCard icon={AlertTriangle} label="Issues" value={counts.total ?? 0} color="#ef4444" />
        </div>
        {Object.keys(byType).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {Object.entries(byType).map(([t, n]) => <Badge key={t} color={severityColor(/chain|loop/i.test(t) ? 'HIGH' : /soft|meta|refresh/i.test(t) ? 'MEDIUM' : 'LOW')}>{t} × {n}</Badge>)}
          </div>
        )}
        {(data.chains ?? 0) > 0 && (
          <div style={{ fontSize: 12.5, color: '#b45309', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '10px 12px', marginTop: 12, lineHeight: 1.55 }}>
            <strong>Why chains matter:</strong> every extra hop adds latency for users and dilutes link equity — update the original links to point directly at the final URL.
          </div>
        )}
      </Card>

      {data.records?.length ? (
        <Card>
          <CardHeader icon={Link2} title="Redirect records" badge={`${data.records.length}`} subtitle="Each entry shows the full redirect chain" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
            {data.records.map((r, idx) => (
              <div key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <Badge color={r.is_chain ? '#f97316' : r.http_to_https ? '#22c55e' : '#8b5cf6'}>{r.is_chain ? `chain (${r.chain_length})` : r.http_to_https ? 'http→https' : 'redirect'}</Badge>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>HTTP {r.status_code}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>→ {r.final_url}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {(r.chain || []).map((u, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, wordBreak: 'break-all' }}>
                      <span style={{ color: 'var(--text)', wordBreak: 'break-all' }}>{u}</span>
                      {i < r.chain.length - 1 && <ArrowRight size={12} color="var(--text-muted)" />}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="No redirects captured"
          message="None of the crawled pages carried a redirect chain. Redirects are recorded from response headers and multi-hop chains observed during the crawl."
        />
      )}
    </div>
  );
}
