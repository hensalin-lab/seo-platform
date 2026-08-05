import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Award, Link2, Shield, FileText, Cpu, Smartphone } from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, StatCard, ProgressBar,
} from './ui';

const FACTOR_META = {
  referring_domains: { label: 'Referring domains', color: '#8b5cf6' },
  backlinks: { label: 'Backlinks', color: '#3b82f6' },
  link_follow_ratio: { label: 'Link follow ratio', color: '#22c55e' },
  onpage_quality: { label: 'On-page quality', color: '#f97316' },
  content_depth: { label: 'Content depth', color: '#eab308' },
  brand_signal: { label: 'Brand signal', color: '#ec4899' },
  performance: { label: 'Performance', color: '#14b8a6' },
};

function FactorRow({ key, factor, meta }) {
  const { count, ratio, score, overall, technical, pages, avg_words } = factor;
  const sub = count !== undefined ? `${count}` : ratio !== undefined ? `${Math.round(ratio * 100)}%` : pages !== undefined ? `${pages} pages · ${avg_words} words avg` : overall !== undefined ? `overall ${overall} · technical ${technical}` : null;
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{meta.label}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: meta.color }}>{score}</div>
      </div>
      <ProgressBar value={score} color={meta.color} height={6} />
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

export default function DomainAuthority() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getDomainAuthority(id).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner message="Computing domain authority…" />;

  if (error) {
    return <EmptyState icon={Award} title="Computation failed" message={error} />;
  }

  const factors = data.factors || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={Award}
          title="Domain Authority"
          badge={data.method}
          subtitle="Keyless heuristic combining link data, on-page quality, content depth, brand and performance signals"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              background: `conic-gradient(#8b5cf6 ${data.score}%, var(--border) 0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 108, height: 108, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)' }}>{data.score}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>/ 100</span>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 260, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <StatCard icon={Link2} label="Ref. domains" value={factors.referring_domains?.count ?? 0} color="#8b5cf6" />
            <StatCard icon={Link2} label="Backlinks" value={factors.backlinks?.count ?? 0} color="#3b82f6" />
            <StatCard icon={FileText} label="Pages crawled" value={factors.content_depth?.pages ?? 0} color="#eab308" />
            <StatCard icon={Cpu} label="Avg. words" value={(factors.content_depth?.avg_words ?? 0).toLocaleString()} color="#14b8a6" />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon={Shield} title="Score factors" subtitle="How the domain authority score is built" />
        <div style={{ marginTop: 4 }}>
          {Object.keys(FACTOR_META).filter(k => factors[k] !== undefined).map(k => (
            <FactorRow key={k} factor={factors[k]} meta={FACTOR_META[k]} />
          ))}
        </div>
      </Card>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, padding: '0 4px' }}>
        <Smartphone size={12} style={{ verticalAlign: -2, marginRight: 5 }} />
        This is a lightweight, keyless estimate. Connect a backlink index provider or Google Search Console to replace the heuristic link factors with measured data.
      </div>
    </div>
  );
}
