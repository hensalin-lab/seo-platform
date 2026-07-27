import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Activity, AlertTriangle, CheckCircle, XCircle, Gauge, Zap } from 'lucide-react';

export default function PageExperience() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.getPageExperience(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load page experience data');
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
          <p>Loading page experience analysis...</p>
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

  const score = data?.page_experience_score ?? 0;
  const dist = data?.speed_distribution || {};
  const cwvIssues = data?.cwv_issues || [];
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
          <Activity size={24} style={{ color: 'var(--accent)' }} />
          <h1>Page Experience</h1>
        </div>
        <p>Core Web Vitals detail, UX signals, and performance metrics</p>
      </div>

      <div className="score-grid">
        <div className="score-card">
          <div className="label">Page Experience Score</div>
          <div className={`score ${getScoreColor(score)}`}>{score}</div>
          <div className="out-of">out of 100</div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${score}%`, background: 'var(--gradient)' }} />
          </div>
        </div>
        <div className="score-card">
          <div className="label">Avg Response Time</div>
          <div className="score" style={{ color: (data?.avg_response_time_ms ?? 0) < 2000 ? 'var(--green)' : (data?.avg_response_time_ms ?? 0) < 3000 ? 'var(--yellow)' : 'var(--red)' }}>
            {data?.avg_response_time_ms ?? 0}ms
          </div>
          <div className="out-of">across {data?.total_pages ?? 0} pages</div>
        </div>
        <div className="score-card">
          <div className="label">CWV Issues</div>
          <div className="score" style={{ color: cwvIssues.length > 0 ? 'var(--red)' : 'var(--green)' }}>{cwvIssues.length}</div>
          <div className="out-of">detected</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <Gauge size={18} style={{ color: 'var(--accent)' }} />
          <h3>Core Web Vitals Distribution</h3>
        </div>
        <div className="grid-3" style={{ padding: '1rem' }}>
          <div className="score-card">
            <div className="label">Fast (&lt;1s)</div>
            <div className="score" style={{ color: 'var(--green)' }}>{dist.fast_under_1s ?? 0}</div>
            <div className="out-of">pages</div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${(dist.fast_under_1s ?? 0) / Math.max((dist.fast_under_1s ?? 0) + (dist.moderate_1s_3s ?? 0) + (dist.slow_over_3s ?? 0), 1) * 100}%`, background: 'var(--green)' }} />
            </div>
          </div>
          <div className="score-card">
            <div className="label">Moderate (1-3s)</div>
            <div className="score" style={{ color: 'var(--yellow)' }}>{dist.moderate_1s_3s ?? 0}</div>
            <div className="out-of">pages</div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${(dist.moderate_1s_3s ?? 0) / Math.max((dist.fast_under_1s ?? 0) + (dist.moderate_1s_3s ?? 0) + (dist.slow_over_3s ?? 0), 1) * 100}%`, background: 'var(--yellow)' }} />
            </div>
          </div>
          <div className="score-card">
            <div className="label">Slow (&gt;3s)</div>
            <div className="score" style={{ color: 'var(--red)' }}>{dist.slow_over_3s ?? 0}</div>
            <div className="out-of">pages</div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${(dist.slow_over_3s ?? 0) / Math.max((dist.fast_under_1s ?? 0) + (dist.moderate_1s_3s ?? 0) + (dist.slow_over_3s ?? 0), 1) * 100}%`, background: 'var(--red)' }} />
            </div>
          </div>
        </div>
      </div>

      {cwvIssues.length > 0 && (
        <div className="card">
          <div className="card-header">
            <Zap size={18} style={{ color: 'var(--yellow)' }} />
            <h3>Core Web Vitals Issues</h3>
            <span className="badge badge-yellow">{cwvIssues.length}</span>
          </div>
          {cwvIssues.map((issue, idx) => (
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
