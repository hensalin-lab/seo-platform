import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Shield, AlertTriangle, CheckCircle, XCircle, Lock, Globe } from 'lucide-react';

export default function SecurityHeaders() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.getSecurityHeaders(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load security headers data');
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
          <p>Loading security audit...</p>
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

  const score = data?.security_score ?? 0;
  const checks = data?.checks || {};
  const issues = data?.issues || [];
  const recs = data?.recommendations || [];

  const getScoreColor = (s) => {
    if (s >= 80) return 'score-excellent';
    if (s >= 60) return 'score-good';
    if (s >= 40) return 'score-fair';
    return 'score-poor';
  };

  const checkItems = [
    { label: 'HTTPS Enabled', key: 'https_enabled', icon: Lock },
    { label: 'All Pages HTTPS', key: 'all_https', icon: Shield },
    { label: 'No Mixed Content', key: 'mixed_content', inverted: true, icon: Globe },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <Shield size={24} style={{ color: 'var(--accent)' }} />
          <h1>Security Headers</h1>
        </div>
        <p>HTTPS status, HSTS, CSP, and security audit</p>
      </div>

      <div className="score-grid">
        <div className="score-card">
          <div className="label">Security Score</div>
          <div className={`score ${getScoreColor(score)}`}>{score}</div>
          <div className="out-of">out of 100</div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${score}%`, background: 'var(--gradient)' }} />
          </div>
        </div>
        <div className="score-card">
          <div className="label">HTTPS Pages</div>
          <div className="score" style={{ color: 'var(--green)' }}>{data?.https_pages ?? 0}</div>
          <div className="out-of">of {data?.total_pages ?? 0} total</div>
        </div>
        <div className="score-card">
          <div className="label">HTTP Pages</div>
          <div className="score" style={{ color: (data?.http_pages ?? 0) > 0 ? 'var(--red)' : 'var(--green)' }}>{data?.http_pages ?? 0}</div>
          <div className="out-of">insecure</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <Shield size={18} style={{ color: 'var(--accent)' }} />
          <h3>Security Checks</h3>
        </div>
        <div className="grid-3" style={{ padding: '1rem' }}>
          {checkItems.map((check) => {
            const passed = check.inverted ? !checks[check.key] : checks[check.key];
            const Icon = check.icon;
            return (
              <div className="score-card" key={check.key}>
                <div className="label">{check.label}</div>
                <div className="score" style={{ color: passed ? 'var(--green)' : 'var(--red)', fontSize: '18px' }}>
                  <Icon size={20} style={{ marginRight: '6px' }} />
                  {passed ? 'Pass' : 'Fail'}
                </div>
                <div className="out-of">{passed ? '✓ Secure' : '✗ Issue detected'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {issues.length > 0 && (
        <div className="card">
          <div className="card-header">
            <AlertTriangle size={18} style={{ color: 'var(--yellow)' }} />
            <h3>Security Issues</h3>
            <span className="badge badge-red">{issues.length}</span>
          </div>
          {issues.map((issue, idx) => (
            <div className="issue-item" key={idx}>
              <div className="issue-header">
                <div className="issue-title">{issue.signal_name}</div>
                <span className="badge badge-red">{issue.severity}</span>
              </div>
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
            <h3>Security Recommendations</h3>
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
