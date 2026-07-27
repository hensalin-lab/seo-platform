import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { MessageCircle, AlertTriangle, CheckCircle, XCircle, Zap, HelpCircle, ListChecks } from 'lucide-react';

export default function AeoAnalysis() {
  const { id } = useParams();
  const [aeo, setAeo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');

  useEffect(() => {
    async function loadAeo() {
      try {
        setLoading(true);
        const data = await api.getAeoAnalysis(id);
        setAeo(data);
      } catch (err) {
        setError(err.message || 'Failed to load AEO analysis');
      } finally {
        setLoading(false);
      }
    }
    loadAeo();
  }, [id]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Loading AEO analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <XCircle size={48} style={{ color: 'var(--red)' }} />
          <p className="error-state">{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const signals = aeo?.signals || {};
  const issues = aeo?.issues || [];
  const aeoScore = aeo?.aeo_score ?? 0;

  const getScoreColor = (score) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
  };

  const getBadgeClass = (severity) => {
    const s = (severity || '').toUpperCase();
    if (s === 'HIGH' || s === 'CRITICAL') return 'badge-red';
    if (s === 'MEDIUM') return 'badge-yellow';
    if (s === 'LOW') return 'badge-green';
    return 'badge-gray';
  };

  const filteredIssues = severityFilter === 'ALL'
    ? issues
    : issues.filter((i) => (i.severity || '').toUpperCase() === severityFilter);

  const highCount = issues.filter((i) => (i.severity || '').toUpperCase() === 'HIGH' || (i.severity || '').toUpperCase() === 'CRITICAL').length;
  const mediumCount = issues.filter((i) => (i.severity || '').toUpperCase() === 'MEDIUM').length;
  const lowCount = issues.filter((i) => (i.severity || '').toUpperCase() === 'LOW').length;

  const quickChecks = [
    { label: 'FAQ schema markup present', passed: !!signals.faq_schema || !!signals.faq_schema_markup },
    { label: 'Conversational content detected', passed: !!signals.conversational_content || !!signals.natural_language },
    { label: 'Featured snippet optimization', passed: !!signals.featured_snippets || !!signals.snippet_optimization },
    { label: 'Structured answers present', passed: !!signals.structured_answers || !!signals.direct_answers },
    { label: 'Question-based headings', passed: !!signals.question_headings || !!signals.how_to_content },
    { label: 'Knowledge panel signals', passed: !!signals.knowledge_panel || !!signals.entity_signals },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <MessageCircle size={24} style={{ color: 'var(--purple)' }} />
          <h1>AEO (Answer Engine Optimization)</h1>
        </div>
        <p>Optimization for AI-powered answer engines, featured snippets, and voice search</p>
      </div>

      <div className="score-grid">
        <div className="score-card">
          <div className="label">AEO Score</div>
          <div className={`score ${getScoreColor(aeoScore)}`}>{aeoScore}</div>
          <div className="out-of">out of 100</div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${aeoScore}%`, background: 'linear-gradient(135deg, #7c3aed, #db2777)' }} />
          </div>
        </div>
        <div className="score-card">
          <div className="label">Total Issues</div>
          <div className="score" style={{ color: issues.length > 0 ? 'var(--red)' : 'var(--green)' }}>{issues.length}</div>
          <div className="out-of">detected</div>
          <div className="bar">
            <div className="bar-fill" style={{ width: issues.length > 0 ? '100%' : '0%', background: issues.length > 0 ? 'var(--red)' : 'var(--green)' }} />
          </div>
        </div>
        <div className="score-card">
          <div className="label">Signals</div>
          <div className="score" style={{ color: 'var(--purple)' }}>{Object.keys(signals).length}</div>
          <div className="out-of">analyzed</div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${Math.min(Object.keys(signals).length * 20, 100)}%`, background: 'linear-gradient(135deg, #7c3aed, #db2777)' }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListChecks size={18} style={{ color: 'var(--purple)' }} />
            <h3>Quick Assessment</h3>
          </div>
        </div>
        <div className="grid-2">
          {quickChecks.map((check, idx) => (
            <div
              key={idx}
              className="issue-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderLeft: check.passed ? '3px solid var(--green)' : '3px solid var(--red)',
              }}
            >
              {check.passed ? (
                <CheckCircle size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
              ) : (
                <XCircle size={18} style={{ color: 'var(--red)', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '13px', fontWeight: 500, color: check.passed ? 'var(--green)' : 'var(--red)' }}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {Object.keys(signals).length > 0 && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} style={{ color: 'var(--purple)' }} />
              <h3>AEO Signals</h3>
            </div>
          </div>
          <div className="grid-3">
            {Object.entries(signals).map(([key, signal]) => (
              <div className="score-card" key={key}>
                <div className="label">{signal.name || key.replace(/_/g, ' ')}</div>
                <div className={`score ${getScoreColor(signal.score ?? 0)}`}>{signal.score ?? '—'}</div>
                <div className="out-of">{signal.description || ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} style={{ color: 'var(--yellow)' }} />
              <h3>AEO Issues</h3>
              <span className="badge badge-purple">{issues.length} found</span>
            </div>
          </div>

          <div className="filter-bar">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => (
              <button
                key={level}
                className={`tab ${severityFilter === level ? 'active' : ''}`}
                onClick={() => setSeverityFilter(level)}
              >
                {level}
                {level === 'HIGH' && highCount > 0 && (
                  <span className="badge badge-red" style={{ marginLeft: '6px' }}>{highCount}</span>
                )}
                {level === 'MEDIUM' && mediumCount > 0 && (
                  <span className="badge badge-yellow" style={{ marginLeft: '6px' }}>{mediumCount}</span>
                )}
                {level === 'LOW' && lowCount > 0 && (
                  <span className="badge badge-green" style={{ marginLeft: '6px' }}>{lowCount}</span>
                )}
                {level === 'ALL' && <span className="badge badge-purple" style={{ marginLeft: '6px' }}>{issues.length}</span>}
              </button>
            ))}
          </div>

          {filteredIssues.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={40} style={{ color: 'var(--green)' }} />
              <p>No {severityFilter !== 'ALL' ? severityFilter.toLowerCase() : ''} severity issues</p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div className="issue-item" key={issue.id}>
                <div className="issue-header">
                  <div className="issue-title">{issue.signal_name || 'AEO Issue'}</div>
                  <span className={`badge ${getBadgeClass(issue.severity)}`}>{issue.severity}</span>
                </div>
                {issue.page_url && <div className="issue-url">{issue.page_url}</div>}
                <div className="issue-desc">{issue.description}</div>
                {issue.impact && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <strong>Impact:</strong> {issue.impact}
                  </div>
                )}
                {issue.fix && <div className="issue-fix">Fix: {issue.fix}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {issues.length === 0 && Object.keys(signals).length === 0 && (
        <div className="card">
          <div className="empty-state">
            <HelpCircle size={48} style={{ color: 'var(--purple)' }} />
            <h3>No AEO Data Available</h3>
            <p>Answer Engine Optimization signals could not be detected for this site.</p>
          </div>
        </div>
      )}
    </div>
  );
}
