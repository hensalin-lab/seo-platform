import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { Globe, Search, ChevronRight, AlertTriangle, CheckCircle, BarChart3, RefreshCw } from 'lucide-react';
import { EmptyState, ErrorState } from '../../../components/States';

const PAGE_TYPE_COLORS = {
  HOMEPAGE: { bg: '#dbeafe', text: '#1e40af' }, PRICING: { bg: '#fce7f3', text: '#9d174d' },
  PRODUCT: { bg: '#d1fae5', text: '#065f46' }, BLOG: { bg: '#fef3c7', text: '#92400e' },
  SERVICES: { bg: '#d1fae5', text: '#047857' }, SOLUTIONS: { bg: '#ede9fe', text: '#5b21b6' },
  DEMO: { bg: '#fce7f3', text: '#be185d' }, LEGAL: { bg: '#f3f4f6', text: '#374151' },
  RESOURCE: { bg: '#e0e7ff', text: '#3730a3' }, ABOUT: { bg: '#cffafe', text: '#155e75' },
  UNKNOWN: { bg: '#f3f4f6', text: '#6b7280' },
};

function ScoreBadge({ score }) {
  const s = Math.round(score || 0);
  const bg = s >= 80 ? '#d3f9d8' : s >= 60 ? '#fff3bf' : s >= 40 ? '#ffe8cc' : '#ffe3e3';
  const fg = s >= 80 ? '#2b8a3e' : s >= 60 ? '#e67700' : s >= 40 ? '#d9480f' : '#c92a2a';
  return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: bg, color: fg }}>{s}</span>;
}

function TypeBadge({ type }) {
  const c = PAGE_TYPE_COLORS[type] || PAGE_TYPE_COLORS.UNKNOWN;
  return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>{type || 'UNKNOWN'}</span>;
}

function ScoreBar({ value, max = 100, color = '#4c6ef5' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 40, fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{Math.round(value ?? 0)}</div>
      <div style={{ flex: 1, height: 5, background: '#eef0f2', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (value / max) * 100)}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '10px 14px' }}><div style={{ height: 14, background: '#e2e8f0', borderRadius: 4, width: '80%', animation: 'pulse 1.5s infinite' }} /></td>
      <td style={{ padding: '10px 14px', textAlign: 'center' }}><div style={{ height: 20, background: '#e2e8f0', borderRadius: 10, width: 60, margin: '0 auto', animation: 'pulse 1.5s infinite' }} /></td>
      <td style={{ padding: '10px 14px', textAlign: 'center' }}><div style={{ height: 20, background: '#e2e8f0', borderRadius: 10, width: 36, margin: '0 auto', animation: 'pulse 1.5s infinite' }} /></td>
      <td style={{ padding: '10px 14px' }}><div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, width: '100%', animation: 'pulse 1.5s infinite' }} /></td>
      <td style={{ padding: '10px 14px', textAlign: 'center' }}><div style={{ height: 24, background: '#e2e8f0', borderRadius: 6, width: 70, margin: '0 auto', animation: 'pulse 1.5s infinite' }} /></td>
    </tr>
  );
}

export default function EnterprisePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [basicData, setBasicData] = useState(null);
  const [entData, setEntData] = useState(null);
  const [basicLoading, setBasicLoading] = useState(true);
  const [entLoading, setEntLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('health_asc');
  const perPage = 25;

  useEffect(() => {
    let cancelled = false;
    api.getAuditDetail(id).then(d => { if (!cancelled) setBasicData(d); }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setBasicLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    api.getEnterpriseAudit(id).then(d => { if (!cancelled) setEntData(d); }).catch(() => {}).finally(() => { if (!cancelled) setEntLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const basicPages = React.useMemo(() => basicData?.pages || [], [basicData]);
  const entPages = React.useMemo(() => entData?.page_results || [], [entData]);

  const merged = useMemo(() => {
    if (entPages.length > 0) {
      let list = [...entPages];
      if (typeFilter !== 'ALL') list = list.filter(p => p.page_type === typeFilter);
      if (search) { const q = search.toLowerCase(); list = list.filter(p => p.url?.toLowerCase().includes(q)); }
      if (sort === 'health_asc') list.sort((a, b) => (a.overall_health_score || 0) - (b.overall_health_score || 0));
      else if (sort === 'health_desc') list.sort((a, b) => (b.overall_health_score || 0) - (a.overall_health_score || 0));
      else if (sort === 'url') list.sort((a, b) => (a.url || '').localeCompare(b.url || ''));
      return list;
    }
    if (basicPages.length > 0) {
      let list = basicPages.map(p => ({ url: p.url, page_type: 'UNKNOWN', overall_health_score: null, title: p.title, word_count: p.word_count }));
      if (search) { const q = search.toLowerCase(); list = list.filter(p => p.url?.toLowerCase().includes(q)); }
      list.sort((a, b) => (a.url || '').localeCompare(b.url || ''));
      return list;
    }
    return [];
  }, [entPages, basicPages, typeFilter, search, sort]);

  const paged = merged.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(merged.length / perPage);

  const types = useMemo(() => {
    const source = entPages.length > 0 ? entPages : basicPages;
    const m = {};
    source.forEach(p => { const t = (entPages.length > 0 ? (p.page_type || 'UNKNOWN') : 'UNKNOWN'); m[t] = (m[t] || 0) + 1; });
    return m;
  }, [entPages, basicPages]);

  const summary = entData?.summary || {};
  const score = entData?.overall_health_score || 0;

  if (basicLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Enterprise Page Analysis</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Loading pages...</p>
        </div>
        <div className="stats-row" style={{ marginBottom: 16 }}>
          {[1,2,3,4].map(i => <div key={i} className="stat-card"><div style={{ height: 28, background: '#e2e8f0', borderRadius: 6, width: 60, animation: 'pulse 1.5s infinite' }} /></div>)}
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
            {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
          </tbody></table>
        </div>
      </div>
    </div>
  );

  if (error) return <ErrorState message={error} />;
  if (!basicData) return <EmptyState title="No enterprise data yet" description="Run an audit to analyze enterprise SEO signals across all pages." />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Enterprise Page Analysis</h1>
          <p>{basicData.website_url} - {basicData.total_pages} pages analyzed</p>
        </div>
        {entLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>
            <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
            Loading scores...
          </div>
        )}
      </div>

      <div className="stats-row" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-icon"><Globe size={16} style={{ color: 'var(--accent)' }} /></div>
          <div className="stat-info">
            <div className="stat-value">{basicData.total_pages}</div>
            <div className="stat-label">Total Pages</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><BarChart3 size={16} style={{ color: score >= 70 ? '#12b886' : '#f59f00' }} /></div>
          <div className="stat-info">
            <div className="stat-value">{score ? Math.round(score) : entLoading ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>...</span> : '-'}</div>
            <div className="stat-label">Health Score</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><AlertTriangle size={16} style={{ color: '#fa5252' }} /></div>
          <div className="stat-info">
            <div className="stat-value">{summary.critical_fixes ?? (entLoading ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>...</span> : '-')}</div>
            <div className="stat-label">Critical Fixes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CheckCircle size={16} style={{ color: '#12b886' }} /></div>
          <div className="stat-info">
            <div className="stat-value">{summary.low_fixes ?? (entLoading ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>...</span> : '-')}</div>
            <div className="stat-label">Low Priority</div>
          </div>
        </div>
      </div>

      {entPages.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <button onClick={() => { setTypeFilter('ALL'); setPage(0); }}
            style={{ padding: '5px 12px', borderRadius: 16, border: typeFilter === 'ALL' ? '2px solid var(--accent)' : '1px solid var(--border)', background: typeFilter === 'ALL' ? 'var(--accent-light)' : 'var(--bg-white)', color: typeFilter === 'ALL' ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            All ({merged.length})
          </button>
          {Object.entries(types).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <button key={type} onClick={() => { setTypeFilter(type); setPage(0); }}
              style={{ padding: '5px 12px', borderRadius: 16, border: typeFilter === type ? '2px solid var(--accent)' : '1px solid var(--border)', background: typeFilter === type ? 'var(--accent-light)' : 'var(--bg-white)', color: typeFilter === type ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              {type} ({count})
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px' }}>
          <Search size={14} style={{ color: 'var(--text-dim)' }} />
          <input type="text" placeholder="Search URLs..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', padding: '8px 0' }} />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', background: 'var(--bg-white)', fontFamily: 'inherit' }}>
          <option value="health_asc">Lowest Score First</option>
          <option value="health_desc">Highest Score First</option>
          <option value="url">URL A-Z</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
        Showing {page * perPage + 1}-{Math.min((page + 1) * perPage, merged.length)} of {merged.length} pages
      </div>

      <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>URL</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Type</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Score</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, minWidth: 120 }}>Health</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entLoading && paged.length === 0 && [1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
            {paged.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 14px', maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Globe size={12} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{p.url?.replace('https://www.', '').replace('http://', '') || ''}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  {entLoading && p.page_type === 'UNKNOWN' ? (
                    <div style={{ height: 20, background: '#e2e8f0', borderRadius: 10, width: 60, margin: '0 auto', animation: 'pulse 1.5s infinite' }} />
                  ) : <TypeBadge type={p.page_type} />}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  {p.overall_health_score != null ? <ScoreBadge score={p.overall_health_score} /> : entLoading ? (
                    <div style={{ height: 20, background: '#e2e8f0', borderRadius: 10, width: 36, margin: '0 auto', animation: 'pulse 1.5s infinite' }} />
                  ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {p.overall_health_score != null ? (
                    <ScoreBar value={p.overall_health_score || 0} color={p.overall_health_score >= 70 ? '#12b886' : p.overall_health_score >= 50 ? '#f59f00' : '#fa5252'} />
                  ) : entLoading ? (
                    <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, width: '100%', animation: 'pulse 1.5s infinite' }} />
                  ) : <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, width: '40%' }} />}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <button onClick={() => navigate(`/audit/${id}/page-detail?url=${encodeURIComponent(p.url)}`)}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-white)', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Details <ChevronRight size={11} style={{ display: 'inline' }} />
                  </button>
                </td>
              </tr>
            ))}
            {paged.length === 0 && !entLoading && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No pages match your search</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-white)', color: page === 0 ? 'var(--text-dim)' : 'var(--text)', fontSize: 12, cursor: page === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            Prev
          </button>
          <span style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-white)', color: page >= totalPages - 1 ? 'var(--text-dim)' : 'var(--text)', fontSize: 12, cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
