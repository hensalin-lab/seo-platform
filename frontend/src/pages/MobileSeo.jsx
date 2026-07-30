import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Smartphone, AlertTriangle, CheckCircle, XCircle, Gauge } from 'lucide-react';

export default function MobileSeo() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.getMobileSeo(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load mobile SEO data');
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
          <p>Loading mobile SEO analysis...</p>
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

  const score = data?.mobile_seo_score ?? 0;
  const slowPages = data?.slow_pages || [];
  const mobileIssues = data?.mobile_issues || [];
  const dist = data?.speed_distribution || { fast_under_1s: data?.mobile_issues_count || 0, moderate_1s_3s: 0, slow_over_3s: data?.slow_pages?.length || 0 };
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
          <Smartphone size={24} style={{ color: 'var(--accent)' }} />
          <h1>Mobile SEO</h1>
        </div>
        <p>Mobile-specific issues, mobile-first indexing readiness, and responsive design</p>
      </div>

      <div className="score-grid">
        <div className="score-card">
          <div className="label">Mobile SEO Score</div>
          <div className={`score ${getScoreColor(score)}`}>{score}</div>
          <div className="out-of">out of 100</div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${score}%`, background: 'var(--gradient)' }} />
          </div>
        </div>
        <div className="score-card">
          <div className="label">Responsive Score</div>
          <div className="score" style={{ color: 'var(--accent)' }}>{data?.responsive_score ?? 0}%</div>
          <div className="out-of">viewport coverage</div>
        </div>
        <div className="score-card">
          <div className="label">Mobile Issues</div>
          <div className="score" style={{ color: mobileIssues.length > 0 ? 'var(--red)' : 'var(--green)' }}>{mobileIssues.length}</div>
          <div className="out-of">detected</div>
        </div>
        <div className="score-card">
          <div className="label">Slow Pages</div>
          <div className="score" style={{ color: slowPages.length > 0 ? 'var(--yellow)' : 'var(--green)' }}>{slowPages.length}</div>
          <div className="out-of">over 3 seconds</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <Gauge size={18} style={{ color: 'var(--accent)' }} />
          <h3>Speed Distribution</h3>
        </div>
        <div className="grid-3" style={{ padding: '1rem' }}>
          <div className="score-card">
            <div className="label">Fast (&lt;1s)</div>
            <div className="score" style={{ color: 'var(--green)' }}>{dist.fast_under_1s ?? 0}</div>
            <div className="out-of">pages</div>
          </div>
          <div className="score-card">
            <div className="label">Moderate (1-3s)</div>
            <div className="score" style={{ color: 'var(--yellow)' }}>{dist.moderate_1s_3s ?? 0}</div>
            <div className="out-of">pages</div>
          </div>
          <div className="score-card">
            <div className="label">Slow (&gt;3s)</div>
            <div className="score" style={{ color: 'var(--red)' }}>{dist.slow_over_3s ?? 0}</div>
            <div className="out-of">pages</div>
          </div>
        </div>
      </div>

      {slowPages.length > 0 && (
        <div className="card">
          <div className="card-header">
            <AlertTriangle size={18} style={{ color: 'var(--yellow)' }} />
            <h3>Slowest Pages</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Response Time</th>
                </tr>
              </thead>
              <tbody>
                {slowPages.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</td>
                    <td><span className="badge badge-red">{p.response_time_ms}ms</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mobileIssues.length > 0 && (
        <div className="card">
          <div className="card-header">
            <AlertTriangle size={18} style={{ color: 'var(--yellow)' }} />
            <h3>Mobile Issues</h3>
            <span className="badge badge-yellow">{mobileIssues.length}</span>
          </div>
          {mobileIssues.map((issue, idx) => (
            <div className="issue-item" key={idx}>
              <div className="issue-header">
                <div className="issue-title">{issue.signal_name}</div>
                <span className={`badge ${issue.severity === 'HIGH' ? 'badge-red' : 'badge-yellow'}`}>{issue.severity}</span>
              </div>
              {issue.page_url && <div className="issue-url">{issue.page_url}</div>}
              <div className="issue-desc">{issue.description}</div>
              {issue.fix && <div className="issue-fix">Fix: {issue.fix}</div>}
            </div>
          ))}
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
