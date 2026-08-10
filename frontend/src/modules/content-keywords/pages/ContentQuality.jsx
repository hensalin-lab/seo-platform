import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { BookOpen, AlertTriangle, CheckCircle, XCircle, Award } from 'lucide-react';
import FixDetail from '../../../components/FixDetail';

export default function ContentQuality() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.getContentQuality(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load content quality data');
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
          <p>Loading content quality analysis...</p>
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

  const score = data?.content_quality_score ?? 0;
  const eeat = data?.eeat_signals || {};
  const thinPages = data?.thin_content_pages || [];
  const topPages = data?.top_content_pages || [];
  const issues = data?.issues || [];
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
          <BookOpen size={24} style={{ color: 'var(--accent)' }} />
          <h1>Content Quality Score</h1>
        </div>
        <p>E-E-A-T signals, readability, content depth, and quality metrics</p>
      </div>

      <div className="score-grid">
        <div className="score-card">
          <div className="label">Content Quality Score</div>
          <div className={`score ${getScoreColor(score)}`}>{score}</div>
          <div className="out-of">out of 100</div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${score}%`, background: 'var(--gradient)' }} />
          </div>
        </div>
        <div className="score-card">
          <div className="label">Avg Word Count</div>
          <div className="score" style={{ color: 'var(--accent)' }}>{data?.avg_word_count ?? 0}</div>
          <div className="out-of">words per page</div>
        </div>
        <div className="score-card">
          <div className="label">Thin Content</div>
          <div className="score" style={{ color: (data?.thin_content_count ?? 0) > 0 ? 'var(--red)' : 'var(--green)' }}>{data?.thin_content_count ?? 0}</div>
          <div className="out-of">pages under 300 words ({data?.thin_content_pct ?? 0}%)</div>
        </div>
        <div className="score-card">
          <div className="label">E-E-A-T Coverage</div>
          <div className="score" style={{ color: 'var(--accent)' }}>{data?.eeat_coverage_pct ?? 0}%</div>
          <div className="out-of">signals present</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <Award size={18} style={{ color: 'var(--accent)' }} />
          <h3>E-E-A-T Signals</h3>
        </div>
        <div className="grid-3" style={{ padding: '1rem' }}>
          {Object.entries(eeat).map(([key, value]) => (
            <div className="score-card" key={key}>
              <div className="label">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
              <div className="score" style={{ color: value > 0 ? 'var(--green)' : 'var(--red)' }}>{value}</div>
              <div className="out-of">{value > 0 ? '✓ Found' : '✗ Missing'}</div>
            </div>
          ))}
        </div>
      </div>

      {thinPages.length > 0 && (
        <div className="card">
          <div className="card-header">
            <AlertTriangle size={18} style={{ color: 'var(--red)' }} />
            <h3>Thin Content Pages</h3>
            <span className="badge badge-red">{thinPages.length}</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Title</th>
                  <th>Word Count</th>
                </tr>
              </thead>
              <tbody>
                {thinPages.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                    <td><span className="badge badge-red">{p.word_count} words</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {topPages.length > 0 && (
        <div className="card">
          <div className="card-header">
            <CheckCircle size={18} style={{ color: 'var(--green)' }} />
            <h3>Top Content Pages</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Title</th>
                  <th>Word Count</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                    <td><span className="badge badge-green">{p.word_count} words</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="card">
          <div className="card-header">
            <AlertTriangle size={18} style={{ color: 'var(--yellow)' }} />
            <h3>Content Issues</h3>
            <span className="badge badge-yellow">{issues.length}</span>
          </div>
          {issues.slice(0, 15).map((issue, idx) => (
            <div className="issue-item" key={idx}>
              <div className="issue-header">
                <div className="issue-title">{issue.signal_name}</div>
                <span className={`badge ${issue.severity === 'HIGH' ? 'badge-red' : issue.severity === 'MEDIUM' ? 'badge-yellow' : 'badge-green'}`}>{issue.severity}</span>
              </div>
              {issue.page_url && <div className="issue-url">{issue.page_url}</div>}
              <div className="issue-desc">{issue.description}</div>
              <FixDetail issue={issue} />
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
