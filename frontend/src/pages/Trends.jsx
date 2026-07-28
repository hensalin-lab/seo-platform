import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AnimatedNumber from '../components/AnimatedNumber';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';

const SCORE_FIELDS = [
  { key: 'overall_score', label: 'Overall', color: '#6366f1', icon: '📊' },
  { key: 'seo_score', label: 'SEO', color: '#8b5cf6', icon: '🔍' },
  { key: 'technical_score', label: 'Technical', color: '#06b6d4', icon: '⚙️' },
  { key: 'aeo_score', label: 'AEO', color: '#f59e0b', icon: '🤖' },
  { key: 'geo_score', label: 'GEO', color: '#10b981', icon: '🌍' },
  { key: 'content_score', label: 'Content', color: '#ec4899', icon: '📝' },
  { key: 'ai_visibility_score', label: 'AI Visibility', color: '#f43f5e', icon: '🧠' },
];

function MiniChart({ data, field, color, width = 200, height = 60 }) {
  if (!data || data.length < 2) return <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9ca3af' }}>Need 2+ audits</div>;
  const values = data.map(d => d[field] || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 20) + 10;
    const y = height - 10 - ((v - min) / range) * (height - 20);
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `10,${height - 10} ${points} ${width - 10},${height - 10}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${field}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${field})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 2px 4px ${color}40)` }} />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * (width - 20) + 10;
        const y = height - 10 - ((v - min) / range) * (height - 20);
        const isLast = i === values.length - 1;
        return <circle key={i} cx={x} cy={y} r={isLast ? 4.5 : 3} fill={color} stroke="#fff" strokeWidth={isLast ? 2 : 1.5} style={isLast ? { filter: `drop-shadow(0 0 6px ${color}60)` } : {}} />;
      })}
    </svg>
  );
}

function TrendArrow({ current, previous }) {
  if (!previous || previous === 0) return <Minus size={14} style={{ color: '#9ca3af' }} />;
  const diff = current - previous;
  if (diff > 2) return <ArrowUpRight size={14} style={{ color: '#22c55e', fontWeight: 700 }} />;
  if (diff < -2) return <ArrowDownRight size={14} style={{ color: '#ef4444', fontWeight: 700 }} />;
  return <Minus size={14} style={{ color: '#9ca3af' }} />;
}

export default function Trends() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory(50).then(data => {
      const list = Array.isArray(data) ? data : data.audits || [];
      setAudits(list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (audits.length < 2) return null;
    const latest = audits[audits.length - 1];
    const previous = audits[audits.length - 2];
    return SCORE_FIELDS.map(f => ({
      ...f,
      current: latest[f.key] || 0,
      previous: previous[f.key] || 0,
      diff: (latest[f.key] || 0) - (previous[f.key] || 0),
    }));
  }, [audits]);

  if (loading) return (
    <div className="page-content">
      <div className="shimmer shimmer-title" style={{ width: '30%', marginBottom: 8 }} />
      <div className="shimmer shimmer-text" style={{ width: '50%', marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {[1,2,3,4,5,6,7].map(i => <div key={i} className="shimmer" style={{ height: 180, borderRadius: 'var(--radius)' }} />)}
      </div>
    </div>
  );

  if (audits.length < 2) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart3 size={24} style={{ color: 'var(--accent)' }} />
            <h1>Historical Trends</h1>
          </div>
          <p>Track your SEO scores over time across multiple audits</p>
        </div>
        <div className="empty-state animate-in" style={{ padding: '60px' }}>
          <Calendar size={48} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ color: 'var(--text)' }}>Need at least 2 audits</h3>
          <p style={{ color: 'var(--text-muted)' }}>Run more audits to see score trends over time</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>You have {audits.length} audit(s). Run {2 - audits.length} more to see trends.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChart3 size={24} style={{ color: 'var(--accent)' }} />
          <h1>Historical Trends</h1>
        </div>
        <p>Tracking {audits.length} audits — latest score changes from previous audit</p>
      </div>

      {stats && (
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {stats.map(f => (
            <div key={f.key} className="card hover-lift" style={{ cursor: 'default', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${f.color}, ${f.color}88)`, opacity: 0.8 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{f.icon}</span>
                  {f.label}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <TrendArrow current={f.current} previous={f.previous} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: f.diff > 0 ? '#22c55e' : f.diff < 0 ? '#ef4444' : '#9ca3af' }}>
                    {f.diff > 0 ? '+' : ''}{f.diff.toFixed(1)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: f.color, lineHeight: 1 }}>
                  <AnimatedNumber value={f.current} duration={1200} />
                </span>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>→</span>
                <span style={{ fontSize: 18, fontWeight: 500, color: '#9ca3af' }}>{f.previous.toFixed(0)}</span>
              </div>
              <MiniChart data={audits} field={f.key} color={f.color} width={260} height={55} />
            </div>
          ))}
        </div>
      )}

      <div className="card animate-in" style={{ animationDelay: '300ms' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} style={{ color: 'var(--accent)' }} />
            <h3>Audit Timeline</h3>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>URL</th>
                {SCORE_FIELDS.slice(0, 5).map(f => <th key={f.key} style={{ color: f.color }}>{f.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...audits].reverse().slice(0, 20).map((a, i) => (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => navigate(`/audit/${a.audit_id || a.id}`)}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                  <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.website_url}</td>
                  {SCORE_FIELDS.slice(0, 5).map(f => (
                    <td key={f.key} style={{ fontSize: 13, fontWeight: 600, color: (a[f.key] || 0) >= 70 ? '#22c55e' : (a[f.key] || 0) >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {(a[f.key] || 0).toFixed(0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
