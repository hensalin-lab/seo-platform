import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import DataSourceBadge from '../../../components/DataSourceBadge';
import { Heart, AlertTriangle, CheckCircle, XCircle, Shield, Zap } from 'lucide-react';

export default function SeoHealth() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.getSeoHealth(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load SEO health data');
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
          <p>Loading SEO health overview...</p>
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

  const score = data?.seo_health_score ?? 0;
  const grade = data?.grade ?? 'F';
  const scores = data?.scores || {};
  const stats = data?.site_stats || {};
  const checks = data?.health_checks || [];
  const topIssues = data?.top_issues || [];
  const catScores = data?.category_scores || {};

  const getScoreColor = (s) => {
    if (s >= 80) return 'score-excellent';
    if (s >= 60) return 'score-good';
    if (s >= 40) return 'score-fair';
    return 'score-poor';
  };

  const getGradeColor = (g) => {
    if (g === 'A') return 'var(--green)';
    if (g === 'B') return 'var(--accent)';
    if (g === 'C') return 'var(--yellow)';
    if (g === 'D') return '#f97316';
    return 'var(--red)';
  };

  const getStatusColor = (status) => {
    if (status === 'pass') return 'var(--green)';
    if (status === 'warn') return 'var(--yellow)';
    return 'var(--red)';
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <Heart size={24} style={{ color: 'var(--accent)' }} />
          <h1>SEO Health Score</h1>
        </div>
        <p>Master overview combining all scores into one comprehensive health check</p>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '0 0 200px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', fontWeight: '800', color: getGradeColor(grade), lineHeight: 1 }}>{grade}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginTop: '8px' }}>{score}/100</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Overall Health</div>
            <div style={{ marginTop: '8px' }}><DataSourceBadge source="crawler" size="xs" /></div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="grid-2">
            {Object.entries(scores).map(([key, value]) => (
              <div className="score-card" key={key}>
                <div className="label">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                <div className={`score ${getScoreColor(value)}`}>{value}</div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${value}%`, background: 'var(--gradient)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon"><Shield size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.total_pages ?? 0}</div>
            <div className="stat-label">Total Pages</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><AlertTriangle size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.total_issues ?? 0}</div>
            <div className="stat-label">Total Issues</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Zap size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.high_issues ?? 0}</div>
            <div className="stat-label">High Priority</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Zap size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.avg_response_time_ms ?? 0}ms</div>
            <div className="stat-label">Avg Response</div>
          </div>
        </div>
      </div>

      {checks.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <Heart size={18} style={{ color: 'var(--accent)' }} />
            <h3>Health Checks</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>What to do</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((check, idx) => (
                  <tr key={idx}>
                    <td><strong>{check.name}</strong></td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                        background: check.status === 'pass' ? 'rgba(34,197,94,0.15)' : check.status === 'warn' ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)',
                        color: getStatusColor(check.status),
                      }}>
                        {check.status === 'pass' ? '✓ Pass' : check.status === 'warn' ? '⚠ Warn' : '✗ Fail'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="progress-bar" style={{ width: '80px', height: '6px' }}>
                          <div className="progress-fill" style={{ width: `${check.score}%`, background: getStatusColor(check.status) }} />
                        </div>
                        <span style={{ fontSize: '13px' }}>{check.score}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: 320 }}>
                      {check.status === 'pass'
                        ? 'Healthy — no action needed.'
                        : (check.fix || check.recommendation || check.how_to_fix || `Improve this area to raise the score above ${check.score >= 60 ? '75' : '50'}% — open the related tab in the sidebar for step-by-step fixes.`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {Object.keys(catScores).length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <Zap size={18} style={{ color: 'var(--accent)' }} />
            <h3>Category Scores</h3>
          </div>
          <div className="grid-3" style={{ padding: '1rem' }}>
            {Object.entries(catScores).map(([cat, catScore]) => (
              <div className="score-card" key={cat}>
                <div className="label">{cat}</div>
                <div className={`score ${getScoreColor(catScore)}`}>{catScore}</div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${catScore}%`, background: 'var(--gradient)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topIssues.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <AlertTriangle size={18} style={{ color: 'var(--yellow)' }} />
            <h3>Top Issues</h3>
            <span className="badge badge-yellow">{topIssues.length}</span>
          </div>
          {topIssues.map((issue, idx) => (
            <div className="issue-item" key={idx}>
              <div className="issue-header">
                <div className="issue-title">{issue.signal_name}</div>
                <span className={`badge ${issue.severity === 'HIGH' || issue.severity === 'CRITICAL' ? 'badge-red' : issue.severity === 'MEDIUM' ? 'badge-yellow' : 'badge-green'}`}>{issue.severity}</span>
              </div>
              {issue.page_url && <div className="issue-url">{issue.page_url}</div>}
              <div className="issue-desc">{issue.description}</div>
              {(issue.fix || issue.recommendation) && (
                <div style={{ fontSize: 12.5, color: 'var(--accent)', marginTop: 6, background: 'rgba(99,102,241,0.06)', padding: '8px 10px', borderRadius: 8, lineHeight: 1.5 }}>
                  <strong>How to fix:</strong> {issue.fix || issue.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {checks.length === 0 && topIssues.length === 0 && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', marginTop: '1rem' }}>
          <CheckCircle size={32} style={{ color: 'var(--green)', marginBottom: 8 }} />
          <h3 style={{ margin: '0 0 6px' }}>All health checks passed</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto' }}>
            Every category scored healthy in this audit — there are no failing checks or top issues to review right now.
          </p>
        </div>
      )}
    </div>
  );
}
