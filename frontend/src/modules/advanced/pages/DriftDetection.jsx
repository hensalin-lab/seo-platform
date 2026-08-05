import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../api';
import {
  GitCompare, TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
  CheckCircle2, FilePlus2, Layers,
} from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, Badge, StatCard, severityColor,
} from './ui';

function ScoreDelta({ current, previous }) {
  const delta = Math.round(((current || 0) - (previous || 0)) * 10) / 10;
  const up = delta > 0;
  const color = delta === 0 ? 'var(--text-muted)' : up ? '#22c55e' : '#ef4444';
  const Icon = delta === 0 ? GitCompare : up ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 800, color }}>
      <Icon size={15} /> {delta > 0 ? '+' : ''}{delta}
    </span>
  );
}

function ScoreRow({ label, a, b }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 80px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{b ?? '—'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>→</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{a ?? '—'}</div>
    </div>
  );
}

function IssueList({ items, emptyText, tone }) {
  if (!items || items.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>{emptyText}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
      {items.map((it, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
          <span style={{ color: severityColor(it.severity), marginTop: 2 }}>
            {tone === 'fix' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all' }}>{it.page_url || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{it.signal_name}</div>
          </div>
          <Badge color={severityColor(it.severity)} style={{ alignSelf: 'center', marginLeft: 'auto' }}>{it.severity}</Badge>
        </div>
      ))}
    </div>
  );
}

export default function DriftDetection() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await api.getDrift(id);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <LoadingSpinner message="Comparing audits…" />;

  if (data && data.available === false) {
    return (
      <EmptyState
        icon={GitCompare}
        title={data.reason === 'no previous audit for this site yet' ? 'No baseline yet' : 'Drift not available'}
        message={data.reason === 'no previous audit for this site yet'
          ? 'Run the same website again to detect changes. Drift compares the current audit against the previous completed audit of the same URL and flags score deltas, regressions, and newly added/removed pages.'
          : data.reason}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to={`/audit/${id}/dashboard`} style={{ textDecoration: 'none' }}><button style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>View dashboard</button></Link>
            <Link to="/history" style={{ textDecoration: 'none' }}><button style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#8b5cf6', color: '#fff', fontSize: 13, fontWeight: 600 }}>Open history</button></Link>
          </div>
        }
      />
    );
  }

  const s = data?.summary || {};
  const scores = s.scores || {};
  const counts = s.issue_counts || {};
  const pages = s.pages || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={GitCompare}
          title="Drift & Change Detection"
          badge={data?.cached ? 'cached' : 'live'}
          subtitle={`${s.website_url || '—'} · comparing ${s.previous_audit_id || '—'} → ${s.current_audit_id || '—'}`}
          actions={
            <button style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw size={14} style={refreshing ? { animation: 'spin 0.8s linear infinite' } : {}} /> Recompute
            </button>
          }
        />
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          <StatCard icon={TrendingUp} label="Score delta" value={<ScoreDelta current={scores.current?.overall} previous={scores.previous?.overall} />} sub="overall score" color="#8b5cf6" />
          <StatCard icon={AlertTriangle} label="Regressions" value={counts.regressions ?? 0} color="#ef4444" sub="new critical/high issues" />
          <StatCard icon={CheckCircle2} label="Fixed" value={counts.fixed ?? 0} color="#22c55e" sub="issues resolved" />
          <StatCard icon={FilePlus2} label="New pages" value={pages.added_count ?? 0} color="#3b82f6" sub={`${pages.removed_count ?? 0} removed`} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <Card>
          <CardHeader icon={Layers} title="Score comparison" subtitle="Current vs previous audit" />
          <ScoreRow label="Overall" a={scores.current?.overall} b={scores.previous?.overall} />
          <ScoreRow label="SEO" a={scores.current?.seo} b={scores.previous?.seo} />
          <ScoreRow label="Technical" a={scores.current?.technical} b={scores.previous?.technical} />
          <ScoreRow label="Content" a={scores.current?.content} b={scores.previous?.content} />
          <ScoreRow label="AEO" a={scores.current?.aeo} b={scores.previous?.aeo} />
          <ScoreRow label="GEO" a={scores.current?.geo} b={scores.previous?.geo} />
        </Card>

        <Card>
          <CardHeader icon={Layers} title="Pages" subtitle={`${pages.current_total ?? 0} now vs ${pages.previous_total ?? 0} before`} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Added</div>
              {pages.added?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                  {pages.added.map((u, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{u}</div>)}
                </div>
              ) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</div>}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Removed</div>
              {pages.removed?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                  {pages.removed.map((u, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{u}</div>)}
                </div>
              ) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</div>}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <Card>
          <CardHeader icon={AlertTriangle} title="New issues" badge={`${counts.new ?? 0}`} subtitle="Present in current, absent in previous" />
          <IssueList items={s.new_issues} emptyText="No new issues." tone="new" />
        </Card>
        <Card>
          <CardHeader icon={CheckCircle2} title="Fixed issues" badge={`${counts.fixed ?? 0}`} subtitle="Present in previous, absent in current" />
          <IssueList items={s.fixed_issues} emptyText="No fixed issues." tone="fix" />
        </Card>
      </div>
    </div>
  );
}
