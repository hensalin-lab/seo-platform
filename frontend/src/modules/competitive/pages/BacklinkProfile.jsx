import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Link, AlertTriangle, CheckCircle, XCircle, Globe, BarChart3, Info, FileText } from 'lucide-react';
import FixDetail from '../../../components/FixDetail';
import DataSourceBadge from '../../../components/DataSourceBadge';

export default function BacklinkProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
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
          <button className="btn btn-primary" onClick={() => { setError(null); setLoading(true); api.getBacklinkProfile(id).then(setData).catch(err => setError(err.message || 'Still failing — try again shortly.')).finally(() => setLoading(false)); }}>Retry</button>
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
  const hasLive = !!data.has_live_backlinks;
  const source = hasLive ? 'measured' : 'crawler';
  const sourceNote = data.backlink_note || '';
  const pageTitle = hasLive ? 'Backlink Profile' : 'Outbound Link Intelligence';

  const getScoreColor = (s) => {
    if (s >= 80) return 'score-excellent';
    if (s >= 60) return 'score-good';
    if (s >= 40) return 'score-fair';
    return 'score-poor';
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <Link size={24} style={{ color: 'var(--accent)' }} />
          <h1 style={{ display: 'inline' }}>{pageTitle}</h1>
          <DataSourceBadge source={source} size="sm" />
        </div>
        <p>{hasLive
          ? 'Real inbound backlink data from DataForSEO — total backlinks, referring domains, anchor text and domain authority.'
          : 'No backlink provider is connected. These results are derived from links discovered while crawling your website and do not represent your complete backlink profile. Connect DataForSEO, Moz or Ahrefs to see real inbound backlinks.'}</p>
        {note && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 12px', background: 'rgba(var(--accent-rgb, 99, 102, 241), 0.1)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <Info size={14} />
            <span>{note}</span>
          </div>
        )}
        {sourceNote && sourceNote !== note && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 12px', background: '#713f12', borderRadius: '6px', fontSize: '13px', color: '#fef08a' }}>
            <Info size={14} />
            <span>{sourceNote}</span>
          </div>
        )}
      </div>

      <div className="score-grid">
        <div className="score-card">
          <div className="label">Link Score</div>
          <div className={`score ${getScoreColor(score)}`}>{score}</div>
          <div className="out-of">out of 100</div>
          <DataSourceBadge source={source} size="xs" style={{ marginBottom: 8 }} />
          <div className="bar">
            <div className="bar-fill" style={{ width: `${score}%`, background: 'var(--gradient)' }} />
          </div>
        </div>
        <div className="score-card">
          <div className="label">{hasLive ? 'Total Backlinks' : 'Total Outbound Links'}</div>
          <div className="score" style={{ color: 'var(--accent)' }}>{data.outbound_link_count ?? data.total_backlinks ?? 0}</div>
          <div className="out-of">{hasLive ? 'backlinks' : 'external links (crawl-derived)'}</div>
          <DataSourceBadge source={source} size="xs" style={{ marginBottom: 8 }} />
        </div>
        <div className="score-card">
          <div className="label">{hasLive ? 'Referring Domains' : 'Linked Domains'}</div>
          <div className="score" style={{ color: 'var(--green)' }}>{data.linked_domains ?? data.referring_domains ?? 0}</div>
          <div className="out-of">{hasLive ? 'referring domains' : 'unique domains linked to (crawl-derived)'}</div>
          <DataSourceBadge source={source} size="xs" style={{ marginBottom: 8 }} />
        </div>
        <div className="score-card">
          <div className="label">Dofollow / Nofollow</div>
          <div className="score" style={{ color: 'var(--accent)', fontSize: '18px' }}>{data.dofollow_count ?? 0} / {data.nofollow_count ?? 0}</div>
          <div className="out-of">link ratio</div>
          <DataSourceBadge source={source} size="xs" style={{ marginBottom: 8 }} />
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
                  <th>Anchor Text</th>                  <th>Count</th>
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

      {pageLinks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <FileText size={18} style={{ color: 'var(--accent)' }} />
            <h3>Pages With Most Outbound Links</h3>
            <span className="badge badge-blue">{pageLinks.length}</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Outbound Links</th>
                </tr>
              </thead>
              <tbody>
                {pageLinks.slice(0, 15).map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ maxWidth: 380 }}>
                      <strong>{p.title || 'Untitled'}</strong>
                      {p.url && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{p.url}</div>}
                    </td>
                    <td><span className="badge badge-blue">{p.outbound_links ?? p.count ?? 0}</span></td>
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
              <FixDetail issue={issue} />
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
