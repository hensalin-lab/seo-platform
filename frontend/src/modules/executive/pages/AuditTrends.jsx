import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import AnimatedNumber from '../../../components/AnimatedNumber';
import { DataSourceBadge } from '../../../components/DataSourceBadge';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Gauge } from 'lucide-react';
import ThemeHero from '../../../components/ai/ThemeHero';
import ThemeStatCard from '../../../components/ai/ThemeStatCard';

const METRIC_COLORS = {
  overall: 'var(--accent)',
  seo: '#8b5cf6',
  technical: '#06b6d4',
  aeo: '#f59e0b',
  geo: '#10b981',
  content: '#ec4899',
  ai_visibility: '#f43f5e',
};

function TrendChart({ points, color }) {
  if (!points || points.length < 2) return null;
  const values = points.map(p => p.value || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const width = 760, height = 240;
  const pad = 30;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const pointsStr = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return `${x},${y}`;
  }).join(' ');
  const area = `${pad},${pad + innerH} ${pointsStr} ${pad + innerW},${pad + innerH}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(f => (
        <line key={f} x1={pad} x2={width - pad} y1={pad + innerH * f} y2={pad + innerH * f} stroke="var(--border)" strokeDasharray="4 4" />
      ))}
      <polygon points={area} fill="url(#trend-grad)" />
      <polyline points={pointsStr} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * innerW;
        const y = pad + innerH - ((v - min) / range) * innerH;
        const isLast = i === values.length - 1;
        return <circle key={i} cx={x} cy={y} r={isLast ? 6 : 4} fill={color} stroke="#fff" strokeWidth={2} />;
      })}
    </svg>
  );
}

export default function AuditTrends() {
  const { id } = useParams();
  const [metric, setMetric] = useState('overall');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.getAuditTrends(id, metric).then(res => {
      setData(res);
    }).catch(err => setError(err.message || 'Failed to load trends')).finally(() => setLoading(false));
  }, [id, metric]);

  const color = METRIC_COLORS[metric] || 'var(--accent)';
  const points = useMemo(() => data?.data_points || [], [data]);
  const current = points.length ? points[points.length - 1].value : null;
  const previous = points.length >= 2 ? points[points.length - 2].value : null;
  const change = data?.change || null;

  if (loading) return (
    <div className="page-content">
      <div className="shimmer shimmer-title" style={{ width: '30%', marginBottom: 8 }} />
      <div className="shimmer shimmer-text" style={{ width: '50%', marginBottom: 24 }} />
      <div className="shimmer" style={{ height: 320, borderRadius: 'var(--radius)' }} />
    </div>
  );

  if (error) return (
    <div className="page-content">
      <ThemeHero icon={BarChart3} title="Score Trends" subtitle="Historical score tracking for this site" />
      <div className="card empty-state" style={{ padding: 40 }}>{error}</div>
    </div>
  );

  return (
    <div className="page-content">
      <ThemeHero
        icon={BarChart3}
        title="Score Trends"
        subtitle={`Tracking ${data?.snapshot_count || 0} snapshot(s) for ${data?.website_url || 'this site'}`}
        badges={[
          { icon: Calendar, t: `${data?.snapshot_count || 0} snapshots` },
          { icon: Gauge, t: data?.label || metric },
          { icon: TrendingUp, t: 'Requires 2+ audits' },
        ]}
      />

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Metric</label>
        <select
          value={metric}
          onChange={e => setMetric(e.target.value)}
          style={{ maxWidth: 300, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}
        >
          {(data?.metrics || ['overall', 'seo', 'technical', 'aeo', 'geo', 'content', 'ai_visibility']).map(m => (
            <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>
          ))}
        </select>
      </div>

      {!data?.enough_data ? (
        <div className="empty-state animate-in" style={{ padding: '60px' }}>
          <BarChart3 size={48} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ color: 'var(--text)' }}>Need at least 2 snapshots</h3>
          <p style={{ color: 'var(--text-muted)' }}>Rerun this audit to create a second snapshot and see score trends.</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>You have {data?.snapshot_count || 0} snapshot(s). {2 - (data?.snapshot_count || 0)} more needed for a trend line.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            <DataSourceBadge source="measured" size="xs" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <ThemeStatCard icon={Gauge} label={`Current ${data.label}`} value={current ?? '-'} color={color} sub="/ 100" />
            <ThemeStatCard icon={BarChart3} label="Snapshots" value={data.snapshot_count} color="#3b82f6" />
            <ThemeStatCard
              icon={change?.direction === 'up' ? TrendingUp : change?.direction === 'down' ? TrendingDown : Minus}
              label="vs Previous"
              value={change ? `${change.value > 0 ? '+' : ''}${change.value}` : '-'}
              color={change?.direction === 'up' ? '#22c55e' : change?.direction === 'down' ? '#ef4444' : 'var(--text-muted)'}
              sub={change?.direction === 'flat' ? 'no change' : change?.direction || ''}
            />
            <ThemeStatCard
              icon={Calendar}
              label="Date Range"
              value={points.length ? new Date(points[0].date).toLocaleDateString() : '-'}
              color="#06b6d4"
              sub={points.length >= 2 ? `→ ${new Date(points[points.length - 1].date).toLocaleDateString()}` : ''}
            />
          </div>

          <div className="card animate-in">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} style={{ color }} />
                <h3>{data.label} Trend</h3>
              </div>
            </div>
            <TrendChart points={points} color={color} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
              <AnimatedNumber value={current ?? 0} />
            </div>
          </div>

          <div className="card animate-in" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} style={{ color: 'var(--accent)' }} />
                <h3>Snapshot Timeline</h3>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Date</th><th>Score</th><th>Type</th></tr>
                </thead>
                <tbody>
                  {[...points].reverse().slice(0, 20).map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{p.date ? new Date(p.date).toLocaleString() : '—'}</td>
                      <td style={{ fontSize: 14, fontWeight: 700, color }}>{p.value}</td>
                      <td style={{ fontSize: 12 }}>{p.snapshot_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
