import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { BarChart3, Search, TrendingUp, RefreshCw, DollarSign, Tag } from 'lucide-react';
import ThemeHero from '../../../components/ai/ThemeHero';
import ThemeStatCard from '../../../components/ai/ThemeStatCard';
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, Badge,
  inputStyle, btnGhost,
} from './ui';

function competitionColor(level) {
  const s = (level || '').toUpperCase();
  if (s === 'LOW') return '#22c55e';
  if (s === 'MEDIUM') return '#eab308';
  if (s === 'HIGH') return '#ef4444';
  return '#94a3b8';
}

export default function KeywordVolumes() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(50);
  const [sort, setSort] = useState('volume');

  const load = async (l) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getKeywordVolumes(id, l);
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(limit); }, [id, limit]);

  if (loading) return <LoadingSpinner message="Estimating keyword volumes…" />;
  if (error) return <EmptyState icon={BarChart3} title="Volume lookup failed" message={error} />;

  const volumes = [...(data.volumes || [])].sort((a, b) => sort === 'volume' ? (b.volume || 0) - (a.volume || 0) : a.keyword.localeCompare(b.keyword));
  const avg = data.total ? Math.round(data.sum_volume / data.total) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ThemeHero
        icon={BarChart3}
        title="Keyword Volumes"
        subtitle={data.configured ? 'Measured via a configured volume provider' : 'Keyless heuristic estimates — connect DataForSEO or SE Ranking for measured volumes'}
        badges={[
          { icon: Tag, t: data.provider || 'Heuristic estimates' },
          { icon: TrendingUp, t: `${data.total || 0} keywords` },
          { icon: Search, t: 'Volumes + CPC + competition' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ ...inputStyle, width: 'auto', background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}>
              {[25, 50, 100, 200].map(n => <option key={n} value={n} style={{ color: '#1e293b' }}>{n} keywords</option>)}
            </select>
            <button style={{ ...btnGhost, color: '#fff', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)' }} onClick={() => load(limit)}><RefreshCw size={13} /> Refresh</button>
          </div>
        }
      />
      <div>
        <AiSuggestionStrip auditId={id} tool="keywords" title="AI keyword fixes" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <ThemeStatCard icon={Tag} label="Keywords" value={data.total} color="#8b5cf6" />
        <ThemeStatCard icon={TrendingUp} label="Total volume" value={data.sum_volume.toLocaleString()} color="#3b82f6" />
        <ThemeStatCard icon={Search} label="Avg volume" value={avg.toLocaleString()} color="#22c55e" />
      </div>

      <Card>
        <CardHeader
          icon={BarChart3}
          title="Volume breakdown"
          badge={`${volumes.length} rows`}
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {['volume', 'alpha'].map(mode => (
                <button
                  key={mode}
                  style={{ ...btnGhost, padding: '6px 12px', fontSize: 12, ...(sort === mode ? { background: 'rgba(139,92,246,0.14)', borderColor: 'rgba(139,92,246,0.5)' } : {}) }}
                  onClick={() => setSort(mode)}
                >
                  {mode === 'volume' ? 'By volume' : 'A–Z'}
                </button>
              ))}
            </div>
          }
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px' }}>Keyword</th>
                <th style={{ textAlign: 'right', padding: '8px 10px' }}>Volume</th>
                <th style={{ textAlign: 'right', padding: '8px 10px' }}>CPC</th>
                <th style={{ textAlign: 'left', padding: '8px 10px' }}>Competition</th>
                <th style={{ textAlign: 'left', padding: '8px 10px' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {volumes.map((v, i) => (
                <tr key={`${v.keyword}-${i}`} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text)' }}>{v.keyword}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{(v.volume || 0).toLocaleString()}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><DollarSign size={11} />{(v.cpc || 0).toFixed(2)}</span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <Badge color={competitionColor(v.competition)}>{v.competition || 'N/A'}</Badge>
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>{v.source || '—'}</td>
                </tr>
              ))}
              {volumes.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No keywords found for this audit.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, padding: '0 4px' }}>
        Volumes come from the audit's keyword data (top keywords, opportunities, clusters, content gaps and missing keywords). Configure a volume provider in Integrations to replace heuristics with measured data.
      </div>
    </div>
  );
}
