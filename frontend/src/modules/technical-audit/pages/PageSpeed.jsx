import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { Zap, CheckCircle, XCircle, Clock, AlertTriangle, Gauge, Timer } from 'lucide-react';

export default function PageSpeed() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('response_time_ms');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    async function loadSpeed() {
      try {
        setLoading(true);
        const result = await api.getPageSpeed(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load page speed data');
      } finally {
        setLoading(false);
      }
    }
    loadSpeed();
  }, [id]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Loading page speed analysis...</p>
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
          <Zap size={48} />
          <p>No page speed data available</p>
        </div>
      </div>
    );
  }

  const totalPages = data.total_pages ?? 0;
  const avgResponseTime = data.avg_response_time_ms ?? 0;
  const slowPagesCount = data.slow_pages_count ?? 0;
  const slowThreshold = data.slow_threshold_ms ?? 2000;
  const slowPages = data.slow_pages || [];
  const pages = data.pages || [];

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedPages = [...pages].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const getResponseBadge = (ms) => {
    if (ms < 1000) return 'badge-green';
    if (ms < slowThreshold) return 'badge-yellow';
    return 'badge-red';
  };

  const getStatusBadge = (code) => {
    if (code >= 200 && code < 300) return 'badge-green';
    if (code >= 300 && code < 400) return 'badge-yellow';
    return 'badge-red';
  };

  return (
    <div className="page-content">
      <div className="card page-header">
        <div className="card-header">
          <Zap size={20} />
          <div>
            <h2 className="card-title">Page Speed & Core Web Vitals</h2>
            <p className="card-subtitle">{totalPages} pages analyzed</p>
          </div>
        </div>
      </div>

      <div className="stats-row" style={{ marginTop: '1rem' }}>
        <div className="stat-card">
          <div className="stat-icon"><Timer size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{Math.round(avgResponseTime)}ms</div>
            <div className="stat-label">Avg Response Time</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><AlertTriangle size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{slowPagesCount}</div>
            <div className="stat-label">Slow Pages</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Gauge size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{slowThreshold}ms</div>
            <div className="stat-label">Slow Threshold</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{totalPages - slowPagesCount}</div>
            <div className="stat-label">Acceptable Pages</div>
          </div>
        </div>
      </div>

      {slowPages.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <Clock size={18} />
            <h3 className="card-title">Slow Pages</h3>
            <span className="badge badge-red">{slowPagesCount}</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Page URL</th>
                  <th>Response Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {slowPages.map((page, idx) => (
                  <tr key={idx}>
                    <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {page.url}
                    </td>
                    <td>
                      <span className={`badge ${getResponseBadge(page.response_time_ms)}`}>
                        {page.response_time_ms}ms
                      </span>
                    </td>
                    <td>
                      {page.status_code && (
                        <span className={`badge ${getStatusBadge(page.status_code)}`}>
                          {page.status_code}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <Gauge size={18} />
            <h3 className="card-title">All Pages ({pages.length})</h3>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('url')} style={{ cursor: 'pointer' }}>URL</th>
                  <th onClick={() => handleSort('response_time_ms')} style={{ cursor: 'pointer' }}>
                    Response Time {sortKey === 'response_time_ms' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('status_code')} style={{ cursor: 'pointer' }}>
                    Status {sortKey === 'status_code' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('word_count')} style={{ cursor: 'pointer' }}>
                    Words {sortKey === 'word_count' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPages.map((page, idx) => (
                  <tr
                    key={idx}
                    style={page.response_time_ms > slowThreshold ? { backgroundColor: 'rgba(239, 68, 68, 0.05)' } : {}}
                  >
                    <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {page.url}
                    </td>
                    <td>
                      <span className={`badge ${getResponseBadge(page.response_time_ms)}`}>
                        {page.response_time_ms}ms
                      </span>
                    </td>
                    <td>
                      {page.status_code && (
                        <span className={`badge ${getStatusBadge(page.status_code)}`}>
                          {page.status_code}
                        </span>
                      )}
                    </td>
                    <td>{page.word_count ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages.length === 0 && slowPages.length === 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="empty-state">
            <CheckCircle size={48} />
            <p>No speed data available</p>
          </div>
        </div>
      )}
    </div>
  );
}
