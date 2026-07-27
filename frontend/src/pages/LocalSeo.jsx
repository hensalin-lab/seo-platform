import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { MapPin, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

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

  const getScoreColor = (s) => {
    if (s >= 80) return 'score-excellent';
    if (s >= 60) return 'score-good';
    if (s >= 40) return 'score-fair';
    return 'score-poor';
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <MapPin size={24} style={{ color: 'var(--accent)' }} />
          <h1>Local SEO</h1>
        </div>
        <p>NAP consistency, local signals, and Google Business Profile optimization</p>
      </div>

      <div className="score-grid">
        <div className="score-card">
          <div className="label">Local SEO Score</div>
          <div className={`score ${getScoreColor(score)}`}>{score}</div>
          <div className="out-of">out of 100</div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${score}%`, background: 'var(--gradient)' }} />
          </div>
        </div>
        <div className="score-card">
          <div className="label">Pages with Local Signals</div>
          <div className="score" style={{ color: 'var(--accent)' }}>{data?.pages_with_local_signals ?? 0}</div>
          <div className="out-of">of {data?.total_pages ?? 0} pages</div>
        </div>
        <div className="score-card">
          <div className="label">NAP Signals Found</div>
          <div className="score" style={{ color: 'var(--green)' }}>{Object.values(nap).filter(Boolean).length}</div>
          <div className="out-of">of {Object.keys(nap).length} checks</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <MapPin size={18} style={{ color: 'var(--accent)' }} />
          <h3>NAP Signal Checks</h3>
        </div>
        <div className="grid-3" style={{ padding: '1rem' }}>
          {Object.entries(nap).map(([key, found]) => (
            <div className="score-card" key={key}>
              <div className="label">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
              <div className="score" style={{ color: found ? 'var(--green)' : 'var(--red)' }}>
                {found ? 'Found' : 'Missing'}
              </div>
              <div className="out-of">
                {found ? '✓ Detected' : '✗ Not found'}
              </div>
            </div>
          ))}
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
