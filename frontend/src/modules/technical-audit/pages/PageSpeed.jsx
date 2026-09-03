import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { Zap, CheckCircle, XCircle, Clock, AlertTriangle, Gauge, Timer, RefreshCw, Sparkles, CloudDownload, MonitorSmartphone } from 'lucide-react';
import DataSourceBadge from '../../../components/DataSourceBadge';

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
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [runningLocal, setRunningLocal] = useState(false);
  const [form, setForm] = useState({ url: '', lcp_ms: '', inp_ms: '', cls: '', fcp_ms: '', ttfb_ms: '', source: 'lighthouse' });

  const loadCwv = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getCoreWebVitals(auditId, '', force);
      setCwv(result);
      setForm(f => ({ ...f, url: result?.url || f.url }));
    } catch (err) {
      setError(err.message || 'Failed to load Core Web Vitals');
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => { loadCwv(); }, [loadCwv]);

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const fetchLive = async () => {
    if (fetchingLive) return;
    try {
      setFetchingLive(true);
      setError(null);
      const url = form.url.trim();
      const res = await api.getPageSpeedLive(auditId, url, 'mobile');
      const lab = res.core_web_vitals || {};
      const field = res.field_data || {};
      const hasField = field._available;
      const get = (fkey, lkey) => {
        const v = hasField ? field[fkey]?.p75 : undefined;
        return v !== undefined && v !== null ? v : (lab[lkey]?.numeric_value ?? null);
      };
      const payload = {
        url,
        source: hasField ? 'crux' : 'lighthouse',
        lcp_ms: get('largest_contentful_paint', 'largest-contentful-paint'),
        inp_ms: get('interaction_to_next_paint', 'interaction-to-next-paint'),
        cls: get('cumulative_layout_shift', 'cumulative-layout-shift'),
        fcp_ms: get('first_contentful_paint', 'first-contentful-paint'),
        ttfb_ms: get('time_to_first_byte', 'time-to-first-byte'),
      };
      if (!payload.lcp_ms && !payload.inp_ms && !payload.cls && !payload.fcp_ms && !payload.ttfb_ms) {
        // Google PSI returned no metrics (typical for Framer/JS-heavy sites it can't render).
        // Fall back to a local Lighthouse run in Chrome on the server so real data still comes through.
        const saved = await api.runLocalLighthouse(auditId, url);
        setCwv(saved);
        setShowForm(false);
        return;
      }
      const saved = await api.saveCoreWebVitals(auditId, payload);
      setCwv(saved);
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Auto-fetch from PageSpeed Insights failed');
    } finally {
      setFetchingLive(false);
    }
  };

  const runLocal = async () => {
    if (runningLocal) return;
    try {
      setRunningLocal(true);
      setError(null);
      const saved = await api.runLocalLighthouse(auditId, form.url.trim());
      setCwv(saved);
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Local Lighthouse run failed');
    } finally {
      setRunningLocal(false);
    }
  };

  const saveCwv = async () => {
    if (saving) return;
    try {
      setSaving(true);
      setError(null);
      const payload = {
        url: form.url.trim(),
        source: form.source,
        lcp_ms: form.lcp_ms === '' ? null : Number(form.lcp_ms),
        inp_ms: form.inp_ms === '' ? null : Number(form.inp_ms),
        cls: form.cls === '' ? null : Number(form.cls),
        fcp_ms: form.fcp_ms === '' ? null : Number(form.fcp_ms),
        ttfb_ms: form.ttfb_ms === '' ? null : Number(form.ttfb_ms),
      };
      const result = await api.saveCoreWebVitals(auditId, payload);
      setCwv(result);
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Failed to save Core Web Vitals');
    } finally {
      setSaving(false);
    }
  };

  const metrics = [
    { key: 'lcp_ms', label: 'LCP', desc: 'Largest Contentful Paint', thresholds: { good: 2500, poor: 4000 }, fmt: (v) => v ? `${Math.round(v)}ms` : '—' },
    { key: 'inp_ms', label: 'INP', desc: 'Interaction to Next Paint', thresholds: { good: 200, poor: 500 }, fmt: (v) => v ? `${Math.round(v)}ms` : '—' },
    { key: 'cls', label: 'CLS', desc: 'Cumulative Layout Shift', thresholds: { good: 0.1, poor: 0.25 }, fmt: (v) => v !== null && v !== undefined ? v.toFixed(3) : '—' },
    { key: 'fcp_ms', label: 'FCP', desc: 'First Contentful Paint', thresholds: { good: 1800, poor: 3000 }, fmt: (v) => v ? `${Math.round(v)}ms` : '—' },
    { key: 'ttfb_ms', label: 'TTFB', desc: 'Time to First Byte', thresholds: { good: 800, poor: 1800 }, fmt: (v) => v ? `${Math.round(v)}ms` : '—' },
  ];

  const inputStyle = {
    width: '100%', padding: '8px 10px', background: '#12141a', border: '1px solid var(--border)',
    borderRadius: 8, color: '#e6eaf2', fontSize: 13, outline: 'none',
  };

  const suggestions = cwv?.ai_suggestions || cwv?.field_data?.ai_suggestions || [];

  const csMap = cwv?.category_scores || {};
  const csRows = [
    { label: 'Performance', v: csMap.Performance ?? csMap.performance ?? null },
    { label: 'Accessibility', v: csMap.Accessibility ?? csMap.accessibility ?? null },
    { label: 'Best Practices', v: csMap['Best Practices'] ?? csMap['best-practices'] ?? null },
    { label: 'SEO', v: csMap.SEO ?? csMap.seo ?? null },
  ].filter(r => r.v != null);

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="card-header">
        <Gauge size={18} />
        <div style={{ flex: 1 }}>
          <h3 className="card-title">Core Web Vitals (Real Field Data)</h3>
          <p className="card-subtitle">
            {cwv?.field_data?._available
              ? `From ${cwv?.field_data?.source === 'manual' ? 'your entered Lighthouse/CrUX results' : 'Google CrUX field data (real users)'}`
              : 'Lab data — enter your Lighthouse/CrUX results below for real-user field data'}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={fetchLive} disabled={fetchingLive} style={{ marginLeft: 'auto' }}>
          <CloudDownload size={14} style={{ marginRight: 4 }} />
          {fetchingLive ? 'Running Lighthouse in cloud (~30s)...' : 'Auto-fetch from PageSpeed Insights'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={runLocal} disabled={runningLocal} title="Runs Lighthouse in Chrome on this server — works even when Google's cloud Lighthouse can't render the site">
          <MonitorSmartphone size={14} style={{ marginRight: 4 }} />
          {runningLocal ? 'Running local Chrome (~2 min)...' : 'Run Local Lighthouse'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : 'Enter Results'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => loadCwv(true)} disabled={loading} style={{ marginLeft: 8 }}>
          <RefreshCw size={14} style={{ marginRight: 4 }} />
          {loading ? 'Analyzing...' : 'Re-analyze'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 10, margin: '0 1rem 0.25rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            Paste your Lighthouse or CrUX results
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>URL (blank = audit site)</label>
              <input value={form.url} onChange={setField('url')} placeholder="https://..." style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>LCP (ms)</label>
              <input value={form.lcp_ms} onChange={setField('lcp_ms')} placeholder="2500" type="number" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>INP (ms)</label>
              <input value={form.inp_ms} onChange={setField('inp_ms')} placeholder="200" type="number" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>CLS</label>
              <input value={form.cls} onChange={setField('cls')} placeholder="0.10" type="number" step="0.001" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>FCP (ms)</label>
              <input value={form.fcp_ms} onChange={setField('fcp_ms')} placeholder="1800" type="number" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>TTFB (ms)</label>
              <input value={form.ttfb_ms} onChange={setField('ttfb_ms')} placeholder="800" type="number" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <select value={form.source} onChange={setField('source')} style={{ ...inputStyle, width: 180, cursor: 'pointer' }}>
              <option value="lighthouse">Lighthouse (lab)</option>
              <option value="crux">CrUX (real users)</option>
              <option value="manual">Manual</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={saveCwv} disabled={saving}>
              {saving ? 'Analyzing + getting AI fixes...' : 'Save & Get AI Suggestions'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI will give what / where / when / how fixes for each metric.</span>
          </div>
        </div>
      )}

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
                    {v.label || k.toUpperCase()}: {v.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="stat-label">{v.value !== undefined ? `${Math.round(v.value)}${k === 'cls' ? '' : 'ms'}` : '—'} ({v.source || 'n/a'})</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {csRows.length > 0 && (
        <div className="stats-row" style={{ margin: '0.75rem 0 0' }}>
          {csRows.map(({ label, v }) => (
            <div className="stat-card" key={label}>
              <div className="stat-icon"><Gauge size={20} /></div>
              <div className="stat-info">
                <div className="stat-value">
                  <span className={`badge ${v >= 90 ? 'badge-green' : v >= 50 ? 'badge-yellow' : 'badge-red'}`}>{v}</span>
                </div>
                <div className="stat-label">{label} (Lighthouse)</div>
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

      {suggestions.length > 0 && (
        <div style={{ padding: '0.25rem 1rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0.75rem 0 0.5rem' }}>
            <Sparkles size={16} color="#8b5cf6" />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>AI Improvement Suggestions</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>what · where · when · how</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {suggestions.map((s, i) => {
              const st = s?.status || '';
              const color = st === 'good' ? '#10b981' : st === 'needs_improvement' ? '#f59e0b' : '#ef4444';
              return (
                <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s?.metric || 'Metric'}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 6, background: `${color}22`, color }}>{st.replace('_', ' ')}</span>
                  </div>
                  {s?.what && <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 }}>{s.what}</div>}
                  {s?.where && (
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong style={{ color: '#3b82f6' }}>WHERE: </strong><span style={{ color: 'var(--text-muted)' }}>{s.where}</span>
                    </div>
                  )}
                  {s?.when && (
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong style={{ color: '#8b5cf6' }}>WHEN: </strong><span style={{ color: 'var(--text-muted)' }}>{s.when}</span>
                    </div>
                  )}
                  {s?.how && (
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong style={{ color: '#059669' }}>HOW: </strong><span style={{ color: 'var(--text-muted)' }}>{s.how}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          <DataSourceBadge source="crawler" size="xs" />
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
