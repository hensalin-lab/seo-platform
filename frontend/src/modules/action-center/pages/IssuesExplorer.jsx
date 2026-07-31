import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { AlertTriangle, Search, X, ExternalLink, ArrowLeft } from 'lucide-react';

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const SEVERITY_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e', INFO: '#64748b' };
const CATEGORY_COLORS = { SEO: '#3b82f6', CONTENT: '#10b981', PERFORMANCE: '#8b5cf6', ACCESSIBILITY: '#f59e0b', SECURITY: '#ef4444', MOBILE: '#06b6d4', SOCIAL: '#ec4899', OTHER: '#64748b' };

export default function IssuesExplorer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [allIssues, setAllIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [catFilter, setCatFilter] = useState('ALL');
  const [sort, setSort] = useState('severity');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const PAGE_SIZE = 100;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let all = [];
        let offset = 0;
        while (true) {
          const result = await api.getAuditIssues(id, { limit: 100, offset });
          const items = result.items || [];
          all = [...all, ...items];
          if (all.length >= result.total || items.length === 0) break;
          offset += 100;
        }
        setAllIssues(all);
        setTotalCount(all.length);
      } catch (err) {
        setAllIssues([]); setError(err.message || 'Failed to load issues');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const filtered = useMemo(() => {
    let r = allIssues;
    if (sevFilter !== 'ALL') r = r.filter(i => i.severity === sevFilter);
    if (catFilter !== 'ALL') r = r.filter(i => i.category === catFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(i => (i.signal_name + ' ' + i.description + ' ' + i.page_url + ' ' + i.fix + ' ' + i.impact).toLowerCase().includes(q));
    }
    if (sort === 'severity') r = [...r].sort((a, b) => (SEVERITY_ORDER[a.severity] || 9) - (SEVERITY_ORDER[b.severity] || 9));
    else if (sort === 'page') r = [...r].sort((a, b) => (a.page_url || '').localeCompare(b.page_url || ''));
    else if (sort === 'category') r = [...r].sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    return r;
  }, [allIssues, sevFilter, catFilter, search, sort]);

  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const stats = useMemo(() => {
    const bySev = {}; const byCat = {}; const pages = new Set();
    allIssues.forEach(i => { bySev[i.severity] = (bySev[i.severity] || 0) + 1; byCat[i.category] = (byCat[i.category] || 0) + 1; if (i.page_url) pages.add(i.page_url); });
    return { bySev, byCat, uniquePages: pages.size };
  }, [allIssues]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}><AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: 12 }} /><p>{error}</p><button onClick={() => window.location.reload()} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #3b82f6', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}>Retry</button></div>;

  if (loading) return (
    <div style={{ padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {[1,2,3,4,5].map(i => <div key={i} style={{ height: 80, background: '#f1f5f9', borderRadius: 8, marginBottom: 8, animation: 'pulse 1.5s infinite' }} />)}
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", padding: '0 4px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}><ArrowLeft size={16} /></button>
          <AlertTriangle size={22} style={{ color: '#eab308' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Issue Remediation</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{totalCount} issues across {stats.uniquePages} pages — every problem, page, impact, and fix in one place</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {Object.entries(stats.bySev).sort((a, b) => SEVERITY_ORDER[a[0]] - SEVERITY_ORDER[b[0]]).map(([sev, count]) => (
          <button key={sev} onClick={() => setSevFilter(sevFilter === sev ? 'ALL' : sev)}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: sevFilter === sev ? SEVERITY_COLORS[sev] : '#f1f5f9', color: sevFilter === sev ? '#fff' : '#334155' }}>
            {sev} <span style={{ opacity: 0.7, marginLeft: 4 }}>{count}</span>
          </button>
        ))}
        <span style={{ padding: '6px 14px', fontSize: 12, color: '#64748b' }}>{stats.uniquePages} pages affected</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input placeholder="Search problems, pages, fixes..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, outline: 'none' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={14} /></button>}
        </div>
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(0); }}
          style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: '#fff' }}>
          <option value="ALL">All Categories</option>
          {Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: '#fff' }}>
          <option value="severity">Sort: Severity</option>
          <option value="page">Sort: Page</option>
          <option value="category">Sort: Category</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, padding: '0 4px' }}>
        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {paginated.map((issue, idx) => (
          <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ width: 60, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textAlign: 'center', color: '#fff', background: SEVERITY_COLORS[issue.severity] || '#64748b', flexShrink: 0 }}>
                {issue.severity}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{issue.signal_name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: (CATEGORY_COLORS[issue.category] || '#64748b') + '20', color: CATEGORY_COLORS[issue.category] || '#64748b' }}>{issue.category}</span>
                </div>
                <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 4, wordBreak: 'break-all' }}>
                  <strong>Page:</strong> {issue.page_url}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                  <strong>Where:</strong> {issue.where || 'page body content'}
                </div>
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 4 }}>
                  <strong>Problem:</strong> {issue.description}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  <strong>Impact:</strong> {issue.impact}
                </div>
                {issue.current_value && (
                  <div style={{ padding: '6px 10px', background: '#fef2f2', borderRadius: 6, fontSize: 12, color: '#b91c1c', lineHeight: 1.5, marginBottom: 4, wordBreak: 'break-word' }}>
                    <strong>Current:</strong> {issue.current_value}
                  </div>
                )}
                <div style={{ padding: '6px 10px', background: '#f0f9ff', borderRadius: 6, fontSize: 12, color: '#0369a1', lineHeight: 1.5, marginBottom: 4 }}>
                  <strong>How to Fix:</strong> {issue.fix}
                </div>
                {issue.replace_with && (
                  <div style={{ padding: '6px 10px', background: '#f0fdf4', borderRadius: 6, fontSize: 12, color: '#15803d', lineHeight: 1.5, marginBottom: 6, wordBreak: 'break-word' }}>
                    <strong>Replace with:</strong> {issue.replace_with}
                  </div>
                )}
                {issue.page_url && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={issue.page_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <ExternalLink size={12} /> Open page
                    </a>
                    <button onClick={() => navigate(`/audit/${id}/page-detail?url=${encodeURIComponent(issue.page_url)}`)}
                      style={{ fontSize: 12, color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                      Full page analysis →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No issues match your filters</div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, marginBottom: 24 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === 0 ? '#f8fafc' : '#fff', color: page === 0 ? '#94a3b8' : '#334155', cursor: page === 0 ? 'default' : 'pointer', fontSize: 12 }}>← Previous</button>
          <span style={{ padding: '6px 12px', fontSize: 12, color: '#64748b' }}>{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: page >= totalPages - 1 ? '#f8fafc' : '#fff', color: page >= totalPages - 1 ? '#94a3b8' : '#334155', cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: 12 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
