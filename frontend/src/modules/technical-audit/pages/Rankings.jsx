import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import {
  Target, RefreshCw, TrendingUp, TrendingDown, Minus,
  Search, BarChart3, Globe, ExternalLink, Info, MapPin, Download,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, color = '#3b82f6', subtitle }) {
  return (
    <div style={{
      background: 'var(--card-bg, #fff)',
      border: '1px solid var(--border-color, #e5e7eb)',
      borderRadius: 12,
      padding: '20px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '12px 12px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary, #111827)', lineHeight: 1.1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--text-tertiary, #9ca3af)', marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

function positionColor(pos) {
  if (pos === null || pos === undefined) return '#9ca3af';
  if (pos < 10) return '#22c55e';
  if (pos < 20) return '#f59e0b';
  return '#ef4444';
}

function positionBg(pos) {
  if (pos === null || pos === undefined) return 'rgba(156,163,175,0.12)';
  if (pos < 10) return 'rgba(34,197,94,0.12)';
  if (pos < 20) return 'rgba(245,158,11,0.12)';
  return 'rgba(239,68,68,0.12)';
}

function ChangeBadge({ change }) {
  if (change === null || change === undefined) {
    return <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>;
  }
  if (change > 0) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600, color: '#22c55e' }}><TrendingUp size={13} /> +{change}</span>;
  if (change < 0) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600, color: '#ef4444' }}><TrendingDown size={13} /> {change}</span>;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600, color: '#9ca3af' }}><Minus size={13} /> 0</span>;
}

function SourceBadge({ source }) {
  if (!source) return null;
  const live = source === 'live' || source === 'serpapi' || source === 'dataforseo' || source === 'googleserp';
  const unmeasured = source === 'unmeasured' || source === 'estimated';
  const bg = live ? 'rgba(34,197,94,0.1)' : unmeasured ? 'rgba(107,114,128,0.14)' : 'rgba(245,158,11,0.12)';
  const color = live ? '#16a34a' : unmeasured ? '#6b7280' : '#b45309';
  const label = source === 'estimated' ? 'Estimated' : source === 'unmeasured' ? 'Not measured' : live ? 'Live' : source;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
      background: bg, color, letterSpacing: '0.03em', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function Sparkline({ history, color }) {
  const pts = (history || []).filter(p => p.position !== null).map(p => p.position);
  if (pts.length < 2) return <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>;
  const w = 72, h = 28;
  const min = Math.min(...pts, 1), max = Math.max(...pts, 1);
  const range = Math.max(max - min, 1);
  const x = (i) => (i / (pts.length - 1)) * (w - 4) + 2;
  const y = (v) => h - 4 - ((v - min) / range) * (h - 8);
  const points = pts.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color || '#3b82f6'} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={1.8} fill={color || '#3b82f6'} />)}
    </svg>
  );
}

export default function Rankings() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [newKeywords, setNewKeywords] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await api.getRankings(id);
      setData(res);
    } catch (e) {
      setError(e.message || 'Failed to load rankings');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const capture = async (keywords) => {
    setCapturing(true);
    setError('');
    try {
      const list = (keywords || []).map(k => k.trim()).filter(Boolean);
      const res = await api.captureRankings(id, list);
      await load();
      setNewKeywords('');
      return res;
    } catch (e) {
      setError(e.message || 'Capture failed');
      return null;
    } finally {
      setCapturing(false);
    }
  };

  const exportCsv = () => {
    if (!data || !data.keywords) return;
    const lines = ['keyword,latest_position,previous_position,first_position,change,source,page_url'];
    for (const k of data.keywords) {
      lines.push([k.keyword, k.latest_position ?? '', k.previous_position ?? '', k.first_position ?? '', k.change ?? '', k.source, k.page_url || ''].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rankings-${id}.csv`;
    a.click();
  };

  if (loading) return <div style={{ padding: 24, color: 'var(--text-secondary, #6b7280)' }}>Loading rankings…</div>;

  const keywords = data?.keywords || [];
  const ranked = keywords.filter(k => k.latest_position !== null && k.latest_position !== undefined);
  const top10 = ranked.filter(k => k.latest_position < 10).length;
  const improved = keywords.filter(k => k.change > 0).length;
  const dropped = keywords.filter(k => k.change < 0).length;
  const avgPos = ranked.length ? (ranked.reduce((s, k) => s + k.latest_position, 0) / ranked.length).toFixed(1) : '—';

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={20} color="#3b82f6" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary, #111827)' }}>Keyword Rank Tracking</h1>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary, #6b7280)' }}>{data?.audit_id ? `Audit: ${data.audit_id}` : '—'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11.5, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
            background: data?.mode === 'live' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
            color: data?.mode === 'live' ? '#16a34a' : '#b45309',
          }}>
            {data?.mode === 'live' ? <><Globe size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />Live Google positions</> : <><Info size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />Positions not measured</>}
          </span>
          <button onClick={() => capture()} disabled={capturing} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            border: 'none', borderRadius: 10, background: '#3b82f6', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <RefreshCw size={14} className={capturing ? 'spin' : ''} /> {capturing ? 'Capturing…' : 'Capture now'}
          </button>
          <button onClick={exportCsv} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 10,
            background: 'var(--card-bg, #fff)', color: 'var(--text-secondary, #6b7280)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {!data?.configured && (
        <div style={{ marginBottom: 18, fontSize: 12.5, color: 'var(--text-secondary, #6b7280)', display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.5 }}>
          <Info size={13} style={{ flexShrink: 0 }} />
          <span>No SERP provider is connected, so real Google positions are <b>not measured</b> and show as "Not measured". Connect a provider (DataForSEO, SerpAPI, Google CSE) or press <b>Capture now</b> after connecting to record real positions.</span>
        </div>
      )}

      {error && <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#b91c1c', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard icon={Search} label="Keywords tracked" value={keywords.length} color="#3b82f6" />
        <StatCard icon={BarChart3} label="Top 10 rankings" value={top10} color="#22c55e" subtitle={`of ${ranked.length} with positions`} />
        <StatCard icon={TrendingUp} label="Improved" value={improved} color="#16a34a" subtitle={`${dropped} dropped`} />
        <StatCard icon={MapPin} label="Avg position" value={avgPos} color="#8b5cf6" subtitle="ranked keywords only" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <input
          value={newKeywords}
          onChange={e => setNewKeywords(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') capture(newKeywords.split(',')); }}
          placeholder="Add keywords to track (comma separated)…"
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--border-color, #e5e7eb)',
            background: 'var(--card-bg, #fff)', color: 'var(--text-primary, #111827)',
            fontSize: 13,
          }}
        />
        <button onClick={() => capture(newKeywords.split(','))} disabled={capturing || !newKeywords.trim()} style={{
          padding: '9px 16px', border: 'none', borderRadius: 10, background: 'var(--text-primary, #111827)', color: 'var(--card-bg, #fff)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Add & capture</button>
      </div>

      {keywords.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px', borderRadius: 14,
          border: '1px dashed var(--border-color, #e5e7eb)',
          background: 'var(--card-bg, #fff)', color: 'var(--text-secondary, #6b7280)',
        }}>
          <Target size={36} color="#9ca3af" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary, #111827)' }}>No rankings captured yet</div>
          <div style={{ fontSize: 13, maxWidth: 460, margin: '0 auto 18px' }}>Connect a SERP provider (DataForSEO, SerpAPI, Google CSE) to record real Google positions for keywords found in this audit, or add your own keywords above.</div>
          <button onClick={() => capture()} disabled={capturing} style={{
            padding: '10px 18px', border: 'none', borderRadius: 10, background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}><RefreshCw size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Capture now</button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid var(--border-color, #e5e7eb)', background: 'var(--card-bg, #fff)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary, #6b7280)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Keyword</th>
                <th style={{ textAlign: 'center', padding: '12px 10px' }}>Position</th>
                <th style={{ textAlign: 'center', padding: '12px 10px' }}>Change</th>
                <th style={{ textAlign: 'center', padding: '12px 10px' }}>First</th>
                <th style={{ textAlign: 'left', padding: '12px 10px' }}>Trend</th>
                <th style={{ textAlign: 'left', padding: '12px 10px' }}>Source</th>
                <th style={{ textAlign: 'left', padding: '12px 10px' }}>Captures</th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>Ranking page</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map(k => (
                <tr key={k.keyword} style={{ borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary, #111827)' }}>{k.keyword}</td>
                  <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                    <span title={k.latest_position == null ? 'Not measured — connect a SERP provider to see real Google position' : undefined} style={{
                      display: 'inline-block', minWidth: 44, padding: '5px 10px', borderRadius: 8,
                      background: positionBg(k.latest_position), color: positionColor(k.latest_position),
                      fontWeight: 700, fontSize: 14,
                    }}>{k.latest_position ?? '–'}</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 10px' }}><ChangeBadge change={k.change} /></td>
                  <td style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--text-secondary, #6b7280)' }}>{k.first_position ?? '—'}</td>
                  <td style={{ padding: '12px 10px' }}><Sparkline history={k.history} color={positionColor(k.latest_position)} /></td>
                  <td style={{ padding: '12px 10px' }}><SourceBadge source={k.source} /></td>
                  <td style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--text-secondary, #6b7280)' }}>{k.captures}</td>
                  <td style={{ textAlign: 'right', padding: '12px 16px' }}>
                    {k.page_url ? (
                      <a href={k.page_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ExternalLink size={13} /> open
                      </a>
                    ) : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.last_captured_at && (
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-tertiary, #9ca3af)' }}>
          Last captured: {new Date(data.last_captured_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
