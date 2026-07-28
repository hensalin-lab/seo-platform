import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Link, AlertTriangle, CheckCircle, XCircle, Globe, BarChart3, Info } from 'lucide-react';

export default function BacklinkProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.getBacklinkProfile(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load backlink profile');
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
          <p>Loading backlink profile...</p>
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

  if (!data) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <Link size={48} />
          <p>No backlink data available</p>
        </div>
      </div>
    );
  }

  const score = data.backlink_score ?? 0;
  const topDomains = data.top_linked_domains || data.top_referring_domains || [];
  const anchors = data.anchor_text_distribution || [];
  const pageLinks = data.pages_with_most_outbound_links || data.pages_with_most_external_links || [];
  const note = data.note || '';

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
          <Link size={24} style={{ color: 'var(--accent)' }} />
          <h1>Outbound Link Profile</h1>
        </div>
        <p>Analyze your outbound links, linked domains, and anchor text distribution</p>
        {note && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 12px', background: 'rgba(var(--accent-rgb, 99, 102, 241), 0.1)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <Info size={14} />
            <span>{note}</span>
          </div>
        )}
      </div>

      <div className="score-grid">
        <div className="score-card">
          <div className="label">Backlink Score</div>
          <div className={`score ${getScoreColor(score)}`}>{score}</div>
          <div className="out-of">out of 100</div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${score}%`, background: 'var(--gradient)' }} />
          </div>
        </div>
        <div className="score-card">
          <div className="label">Total Outbound Links</div>
          <div className="score" style={{ color: 'var(--accent)' }}>{data.outbound_link_count ?? data.total_backlinks ?? 0}</div>
          <div className="out-of">external links</div>
        </div>
        <div className="score-card">
          <div className="label">Linked Domains</div>
          <div className="score" style={{ color: 'var(--green)' }}>{data.linked_domains ?? data.referring_domains ?? 0}</div>
          <div className="out-of">unique domains</div>
        </div>
        <div className="score-card">
          <div className="label">Dofollow / Nofollow</div>
          <div className="score" style={{ color: 'var(--accent)', fontSize: '18px' }}>{data.dofollow_count ?? 0} / {data.nofollow_count ?? 0}</div>
          <div className="out-of">link ratio</div>
        </div>
      </div>

      {topDomains.length > 0 && (
        <div className="card">
          <div className="card-header">
            <Globe size={18} style={{ color: 'var(--accent)' }} />
            <h3>Top Linked Domains</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Link Count</th>
                </tr>
              </thead>
              <tbody>
                {topDomains.map((d, idx) => (
                  <tr key={idx}>
                    <td><strong>{d.domain}</strong></td>
                    <td><span className="badge badge-blue">{d.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {anchors.length > 0 && (
        <div className="card">
          <div className="card-header">
            <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
            <h3>Anchor Text Distribution</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Anchor Text</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {anchors.slice(0, 15).map((a, idx) => (
                  <tr key={idx}>
                    <td>{a.text}</td>
                    <td><span className="badge badge-blue">{a.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.issues && data.issues.length > 0 && (
        <div className="card">
          <div className="card-header">
            <AlertTriangle size={18} style={{ color: 'var(--yellow)' }} />
            <h3>Link Issues</h3>
            <span className="badge badge-yellow">{data.issues.length}</span>
          </div>
          {data.issues.map((issue, idx) => (
            <div className="issue-item" key={idx}>
              <div className="issue-header">
                <div className="issue-title">{issue.signal_name}</div>
                <span className={`badge ${issue.severity === 'HIGH' ? 'badge-red' : issue.severity === 'MEDIUM' ? 'badge-yellow' : 'badge-green'}`}>{issue.severity}</span>
              </div>
              <div className="issue-desc">{issue.description}</div>
              {issue.fix && <div className="issue-fix">Fix: {issue.fix}</div>}
            </div>
          ))}
        </div>
      )}

      {data.recommendations && (
        <div className="card">
          <div className="card-header">
            <CheckCircle size={18} style={{ color: 'var(--green)' }} />
            <h3>Recommendations</h3>
          </div>
          {data.recommendations.map((rec, idx) => (
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
