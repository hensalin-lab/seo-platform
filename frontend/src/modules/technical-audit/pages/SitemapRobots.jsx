import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { FileText, AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';

export default function SitemapRobots() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.getSitemapRobots(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load sitemap & robots data');
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
          <p>Loading sitemap & robots analysis...</p>
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

  const score = data?.sitemap_robots_score ?? 0;
  const urlPatterns = data?.url_structure || [];
  const errorPages = data?.error_pages || [];
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
          <FileText size={24} style={{ color: 'var(--accent)' }} />
          <h1>Sitemap & Robots</h1>
        </div>
        <p>XML sitemap analysis, robots.txt validation, and indexation health</p>
      </div>

      <div className="score-grid">
        <div className="score-card">
          <div className="label">Sitemap & Robots Score</div>
          <div className={`score ${getScoreColor(score)}`}>{score}</div>
          <div className="out-of">out of 100</div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${score}%`, background: 'var(--gradient)' }} />
          </div>
        </div>
        <div className="score-card">
          <div className="label">Indexed Pages</div>
          <div className="score" style={{ color: 'var(--green)' }}>{data?.indexed_pages ?? 0}</div>
          <div className="out-of">of {data?.total_pages ?? 0} total</div>
        </div>
        <div className="score-card">
          <div className="label">Canonical Coverage</div>
          <div className="score" style={{ color: 'var(--accent)' }}>{data?.canonical_coverage_pct ?? 0}%</div>
          <div className="out-of">{data?.pages_with_canonical ?? 0} pages</div>
        </div>
        <div className="score-card">
          <div className="label">Errors Found</div>
          <div className="score" style={{ color: (data?.error_count ?? 0) > 0 ? 'var(--red)' : 'var(--green)' }}>{data?.error_count ?? 0}</div>
          <div className="out-of">error pages</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <Shield size={18} style={{ color: 'var(--accent)' }} />
          <h3>Indexation Overview</h3>
        </div>
        <div className="grid-3" style={{ padding: '1rem' }}>
          <div className="score-card">
            <div className="label">Indexed</div>
            <div className="score" style={{ color: 'var(--green)' }}>{data?.indexed_pages ?? 0}</div>
            <div className="out-of">pages</div>
          </div>
          <div className="score-card">
            <div className="label">Non-Indexed</div>
            <div className="score" style={{ color: 'var(--yellow)' }}>{data?.non_indexed_pages ?? 0}</div>
            <div className="out-of">pages</div>
          </div>
          <div className="score-card">
            <div className="label">Redirects</div>
            <div className="score" style={{ color: 'var(--accent)' }}>{data?.redirect_count ?? 0}</div>
            <div className="out-of">redirect chains</div>
          </div>
        </div>
      </div>

      {urlPatterns.length > 0 && (
        <div className="card">
          <div className="card-header">
            <FileText size={18} style={{ color: 'var(--accent)' }} />
            <h3>URL Structure Patterns</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>URL Pattern</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {urlPatterns.map((p, idx) => (
                  <tr key={idx}>
                    <td><code>{p.pattern}</code></td>
                    <td><span className="badge badge-blue">{p.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {errorPages.length > 0 && (
        <div className="card">
          <div className="card-header">
            <AlertTriangle size={18} style={{ color: 'var(--red)' }} />
            <h3>Error Pages (4xx/5xx)</h3>
            <span className="badge badge-red">{errorPages.length}</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {errorPages.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</td>
                    <td><span className="badge badge-red">{p.status_code}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className="card">
          <div className="card-header">
            <CheckCircle size={18} style={{ color: 'var(--green)' }} />
            <h3>Recommendations</h3>
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
    </div>
  );
}
