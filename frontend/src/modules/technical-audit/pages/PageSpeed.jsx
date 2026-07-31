import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { Zap, CheckCircle, XCircle, Clock, AlertTriangle, Gauge, Timer, RefreshCw } from 'lucide-react';

function cwvStatus(value, thresholds) {
  if (value === null || value === undefined) return { label: 'Unknown', cls: 'badge-gray' };
  if (value <= thresholds.good) return { label: 'Good', cls: 'badge-green' };
  if (value < thresholds.poor) return { label: 'Needs Work', cls: 'badge-yellow' };
  return { label: 'Poor', cls: 'badge-red' };
}

function CoreWebVitalsPanel({ auditId }) {
  const [cwv, setCwv] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCwv = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getCoreWebVitals(auditId);
      setCwv(result);
    } catch (err) {
      setError(err.message || 'Failed to load Core Web Vitals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCwv(); }, [auditId]);

  const metrics = [
    { key: 'lcp_ms', label: 'LCP', desc: 'Largest Contentful Paint', thresholds: { good: 2500, poor: 4000 }, fmt: (v) => v ? `${Math.round(v)}ms` : '—' },
    { key: 'inp_ms', label: 'INP', desc: 'Interaction to Next Paint', thresholds: { good: 200, poor: 500 }, fmt: (v) => v ? `${Math.round(v)}ms` : '—' },
    { key: 'cls', label: 'CLS', desc: 'Cumulative Layout Shift', thresholds: { good: 0.1, poor: 0.25 }, fmt: (v) => v !== null && v !== undefined ? v.toFixed(3) : '—' },
    { key: 'fcp_ms', label: 'FCP', desc: 'First Contentful Paint', thresholds: { good: 1800, poor: 3000 }, fmt: (v) => v ? `${Math.round(v)}ms` : '—' },
    { key: 'ttfb_ms', label: 'TTFB', desc: 'Time to First Byte', thresholds: { good: 800, poor: 1800 }, fmt: (v) => v ? `${Math.round(v)}ms` : '—' },
  ];

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="card-header">
        <Gauge size={18} />
        <div style={{ flex: 1 }}>
          <h3 className="card-title">Core Web Vitals (Real Field Data)</h3>
          <p className="card-subtitle">
            {cwv?.field_data?._available ? 'From Google CrUX field data (real users)' : 'Lab data — configure PAGESPEED_API_KEY for real-user field data'}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadCwv} disabled={loading}>
          <RefreshCw size={14} style={{ marginRight: 4 }} />
          {loading ? 'Analyzing...' : 'Re-analyze'}
        </button>
      </div>
      {cwv?.performance_score > 0 && (
        <div className="stats-row" style={{ margin: '0.75rem 0 0' }}>
          <div className="stat-card">
            <div className="stat-icon"><Gauge size={20} /></div>
            <div className="stat-info">
              <div className="stat-value">{cwv.performance_score}/100</div>
              <div className="stat-label">Performance Score</div>
            </div>
          </div>
          {cwv.assessment && Object.entries(cwv.assessment).filter(([k]) => k !== '_summary').map(([k, v]) => (
            <div className="stat-card" key={k}>
              <div className="stat-icon"><Timer size={20} /></div>
              <div className="stat-info">
                <div className="stat-value">
                  <span className={`badge ${v.status === 'good' ? 'badge-green' : v.status === 'needs_improvement' ? 'badge-yellow' : 'badge-red'}`}>
                    {v.label}: {v.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="stat-label">{v.value !== undefined ? `${Math.round(v.value)}${k === 'cls' ? '' : 'ms'}` : '—'} ({v.source})</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Status</th>
              <th>Good</th>
              <th>Poor</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const raw = cwv ? cwv[m.key] : null;
              const status = cwvStatus(raw, m.thresholds);
              return (
                <tr key={m.key}>
                  <td>
                    <strong>{m.label}</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{m.desc}</div>
                  </td>
                  <td>{m.fmt(raw)}</td>
                  <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                  <td>{m.fmt(m.thresholds.good)}</td>
                  <td>{m.fmt(m.thresholds.poor)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && <p style={{ color: 'var(--danger)', padding: '0.5rem 1rem' }}>{error}</p>}
    </div>
  );
}

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

      <CoreWebVitalsPanel auditId={id} />

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
