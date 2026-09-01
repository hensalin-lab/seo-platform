import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Globe, Languages, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, Badge, StatCard, ProgressBar, severityColor,
} from './ui';

export default function HreflangAnalysis() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getHreflang(id).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner message="Analyzing hreflang signals…" />;

  if (error) {
    return <EmptyState icon={Globe} title="Analysis failed" message={error} />;
  }

  if (!data.has_hreflang) {
    return (
      <EmptyState
        icon={Globe}
        title="No hreflang detected"
        message="The crawler found no hreflang tags on any crawled page. If this site targets multiple languages or regions, add hreflang link tags (or the hreflang header) so search engines serve the correct language version to each locale."
      />
    );
  }

  const counts = data.issue_counts || {};
  const byType = counts.by_type || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={Globe}
          title="Hreflang & International SEO"
          badge={data.cached ? 'cached' : 'live'}
          subtitle={`Detected on ${data.pages?.length || 0} pages · ${data.language_count || 0} languages`}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard icon={Globe} label="Coverage" value={`${data.coverage ?? 0}%`} sub="pages with hreflang" color="#8b5cf6" />
          <StatCard icon={Languages} label="Languages" value={data.language_count ?? 0} sub={(data.languages || []).join(', ') || '—'} color="#3b82f6" />
          <StatCard icon={AlertTriangle} label="Issues" value={counts.total ?? 0} color="#ef4444" />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Coverage</div>
        <ProgressBar value={data.coverage ?? 0} color="#8b5cf6" />
      </Card>

      {counts.total > 0 && (
        <Card>
          <CardHeader icon={AlertTriangle} title="Issues" badge={`${counts.total ?? 0}`} subtitle="By type" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(byType).map(([t, n]) => (
              <Badge key={t} color={severityColor(/missing|invalid|error/i.test(t) ? 'HIGH' : /conflict|mismatch/i.test(t) ? 'MEDIUM' : 'LOW')}>{t} × {n}</Badge>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, maxHeight: 320, overflowY: 'auto' }}>
            {(data.issues || []).map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                <AlertTriangle size={15} color={/missing|invalid|error/i.test(it.type || '') ? '#ef4444' : '#f59e0b'} style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{it.type}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all' }}>{it.page_url}</div>
                  {it.detail && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{it.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader icon={CheckCircle2} title="Pages with hreflang" badge={`${data.pages?.length || 0}`} subtitle="Declared locales and targets" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
          {(data.pages || []).map((p, idx) => (
            <div key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all', marginBottom: 8 }}>{p.url}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(p.tags || []).map((t, ti) => (
                  <span key={ti} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.1)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    <Languages size={11} color="#8b5cf6" />
                    <b style={{ color: 'var(--text)' }}>{t.hreflang}</b>
                    <span>{t.href}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
