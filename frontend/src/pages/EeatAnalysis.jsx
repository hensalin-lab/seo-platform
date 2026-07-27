import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Shield, CheckCircle, XCircle, Award, BookOpen, Users, Star, AlertTriangle, Target, Search } from 'lucide-react';

export default function EeatAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    async function loadEeat() {
      try {
        setLoading(true);
        const result = await api.getEeatAnalysis(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load E-E-A-T analysis');
      } finally {
        setLoading(false);
      }
    }
    loadEeat();
  }, [id]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Loading E-E-A-T analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="error-state">
          <XCircle size={48} />
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <Shield size={48} />
          <p>No E-E-A-T data available</p>
        </div>
      </div>
    );
  }

  const eeatScore = data.eeat_score ?? 0;
  const signals = data.signals || {};
  const issues = data.issues || [];

  const getScoreColor = (score) => {
    if (score >= 80) return 'badge-green';
    if (score >= 50) return 'badge-yellow';
    return 'badge-red';
  };

  const getSeverityColor = (severity) => {
    const s = (severity || '').toLowerCase();
    if (s === 'critical') return 'badge-red';
    if (s === 'high') return 'badge-red';
    if (s === 'medium') return 'badge-yellow';
    return 'badge-green';
  };

  const getSignalIcon = (key) => {
    const lower = key.toLowerCase();
    if (lower.includes('author')) return <Users size={20} />;
    if (lower.includes('date')) return <BookOpen size={20} />;
    if (lower.includes('source')) return <Search size={20} />;
    if (lower.includes('expert')) return <Award size={20} />;
    if (lower.includes('trust')) return <Shield size={20} />;
    return <Star size={20} />;
  };

  const signalEntries = Object.entries(signals);
  const filteredIssues = severityFilter === 'all'
    ? issues
    : issues.filter((i) => (i.severity || '').toLowerCase() === severityFilter);

  return (
    <div className="page-content">
      <div className="card page-header">
        <div className="card-header">
          <Shield size={20} />
          <div>
            <h2 className="card-title">E-E-A-T Analysis</h2>
            <p className="card-subtitle">Expertise, Experience, Authoritativeness & Trustworthiness</p>
          </div>
        </div>
      </div>

      <div className="score-grid" style={{ marginTop: '1rem' }}>
        <div className="score-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="score-ring">
            <div className="score-value">{eeatScore}</div>
            <div className="score-label">E-E-A-T Score</div>
          </div>
        </div>
      </div>

      {signalEntries.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <Target size={18} />
            <h3 className="card-title">E-E-A-T Signals</h3>
            <span className="badge badge-blue">{signals.total_pages ?? signalEntries.length} signals</span>
          </div>
          <div className="grid-3" style={{ padding: '1rem' }}>
            {signalEntries.map(([key, signal]) => {
              const count = typeof signal === 'number' ? signal : signal.count ?? signal.value ?? 0;
              const label = typeof signal === 'object' ? (signal.name || key.replace(/_/g, ' ')) : key.replace(/_/g, ' ');
              return (
                <div className="issue-item" key={key}>
                  <div className="issue-header">
                    <div className="issue-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getSignalIcon(key)}
                      <span>{label}</span>
                    </div>
                    <span className="badge badge-blue">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <AlertTriangle size={18} />
            <h3 className="card-title">E-E-A-T Issues</h3>
            <span className="badge badge-red">{issues.length}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                className="btn btn-sm btn-secondary"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div style={{ padding: '0' }}>
            {filteredIssues.map((issue, idx) => (
              <div className="issue-item" key={issue.id || idx}>
                <div className="issue-header">
                  <div className="issue-title">
                    {issue.signal_name || 'E-E-A-T Issue'}
                  </div>
                  <span className={`badge ${getSeverityColor(issue.severity)}`}>
                    {issue.severity || 'unknown'}
                  </span>
                </div>
                <div className="issue-desc">
                  <strong>Page:</strong> {issue.page_url || '—'}
                </div>
                <div className="issue-desc">{issue.description || '—'}</div>
                {issue.impact && (
                  <div className="issue-desc" style={{ color: 'var(--color-warning, #eab308)' }}>
                    <strong>Impact:</strong> {issue.impact}
                  </div>
                )}
                {issue.fix && (
                  <div className="issue-desc" style={{ color: 'var(--color-success, #22c55e)' }}>
                    <strong>Fix:</strong> {issue.fix}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {signalEntries.length === 0 && issues.length === 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="empty-state">
            <CheckCircle size={48} />
            <p>No E-E-A-T issues detected</p>
          </div>
        </div>
      )}
    </div>
  );
}
