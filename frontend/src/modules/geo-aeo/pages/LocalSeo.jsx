import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { MapPin, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { DataSourceBadge } from '../../../components/DataSourceBadge';
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip';
import ThemeHero from '../../../components/ai/ThemeHero';
import ThemeStatCard from '../../../components/ai/ThemeStatCard';

export default function LocalSeo() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.getLocalSeo(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load local SEO data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Loading local SEO analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <XCircle size={48} style={{ color: 'var(--red)' }} />
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const score = data?.local_seo_score ?? 0;
  const nap = data?.nap_signals || {};
  const recs = data?.recommendations || [];

  return (
    <div className="page-content">
      <ThemeHero
        icon={MapPin}
        title="Local SEO"
        subtitle="NAP consistency, local signals, and Google Business Profile optimization"
        badges={[
          { icon: MapPin, t: 'NAP checks' },
          { icon: CheckCircle, t: 'Local signals' },
          { icon: AlertTriangle, t: 'GBP optimization' },
        ]}
      />
      <DataSourceBadge source="estimated" size="xs" />

      <div>
        <AiSuggestionStrip auditId={id} tool="local" title="AI local SEO fixes" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <ThemeStatCard icon={MapPin} label="Local SEO Score" value={score} color="#7c3aed" sub="out of 100" />
        <ThemeStatCard icon={CheckCircle} label="Pages w/ Local Signals" value={data?.pages_with_local_signals ?? 0} color="#3b82f6" sub={`of ${data?.total_pages ?? 0} pages`} />
        <ThemeStatCard icon={MapPin} label="NAP Signals Found" value={Object.values(nap).filter(Boolean).length} color="#12b886" sub={`of ${Object.keys(nap).length} checks`} />
      </div>

      <div className="card">
        <div className="card-header">
          <MapPin size={18} style={{ color: 'var(--accent)' }} />
          <h3>NAP Signal Checks</h3>
        </div>
        <div className="grid-3" style={{ padding: '1rem' }}>
          {Object.entries(nap).map(([key, found]) => {
            const k = key.toLowerCase();
            const hint =
              !found && k.includes('phone') ? 'Add a visible phone number in your footer/contact page — crawlers match it against your Google Business Profile.' :
              !found && (k.includes('address') || k.includes('street')) ? 'Publish a full street address in schema and footer text so maps and AI engines can verify your location.' :
              !found && k.includes('name') ? 'Use your exact legal business name consistently in the title tag, footer, and Organization schema.' :
              !found ? 'Add this signal to your contact page, footer, or LocalBusiness JSON-LD to strengthen local relevance.' :
              null;
            return (
              <div className="score-card" key={key}>
                <div className="label">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                <div className="score" style={{ color: found ? 'var(--green)' : 'var(--red)' }}>
                  {found ? 'Found' : 'Missing'}
                </div>
                {hint ? (
                  <div className="out-of" style={{ color: '#b45309', fontSize: 12.5, lineHeight: 1.5 }}>{hint}</div>
                ) : (
                  <div className="out-of">✓ Detected</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {recs.length > 0 && (
        <div className="card">
          <div className="card-header">
            <CheckCircle size={18} style={{ color: 'var(--green)' }} />
            <h3>Local SEO Recommendations</h3>
          </div>
          {recs.map((rec, idx) => (
            <div className="issue-item" key={idx}>
              <div className="issue-header">
                <div className="issue-title">{rec.action}</div>
                <span className={`badge ${rec.priority === 'HIGH' ? 'badge-red' : 'badge-yellow'}`}>{rec.priority}</span>
              </div>
              <div className="issue-desc">{rec.impact}</div>
            </div>
          ))}
        </div>
      )}

      {score === 0 && Object.values(nap).every(v => !v) && (
        <div className="card">
          <div className="empty-state">
            <MapPin size={48} />
            <p>No local SEO signals detected. Add local business schema and NAP information to your pages.</p>
          </div>
        </div>
      )}
    </div>
  );
}
