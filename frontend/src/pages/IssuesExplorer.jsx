import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AlertTriangle, Filter, Search, ChevronDown, ChevronUp, ExternalLink, ArrowLeft, Download, X, Zap, BarChart3 } from 'lucide-react';
import AnimatedNumber from '../components/AnimatedNumber';

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const SEVERITY_COLORS = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#6b7280' };
const CATEGORY_COLORS = { SEO: '#6366f1', TECHNICAL: '#8b5cf6', CONTENT: '#10b981', AEO: '#f59e0b', GEO: '#06b6d4', AI_SEARCH: '#ec4899' };

export default function IssuesExplorer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [allIssues, setAllIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('severity');
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const pageSize = 100;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let allLoaded = [];
        let offset = 0;
        while (true) {
          const result = await api.getAuditIssues(id, { limit: 100, offset });
          const items = result.items || [];
          allLoaded = [...allLoaded, ...items];
          if (allLoaded.length >= result.total || items.length === 0) break;
          offset += 100;
        }
        setAllIssues(allLoaded);
        setTotalCount(allLoaded.length);
      } catch (err) {
        setAllIssues([]); setError(err.message || 'Failed to load issues');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const filtered = useMemo(() => {
    let result = allIssues;
    if (severityFilter !== 'ALL') result = result.filter(i => i.severity === severityFilter);
    if (categoryFilter !== 'ALL') result = result.filter(i => i.category === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        (i.description || '').toLowerCase().includes(q) ||
        (i.signal_name || '').toLowerCase().includes(q) ||
        (i.page_url || '').toLowerCase().includes(q) ||
        (i.fix || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'severity') result = [...result].sort((a, b) => (SEVERITY_ORDER[a.severity] || 9) - (SEVERITY_ORDER[b.severity] || 9));
    else if (sortBy === 'page') result = [...result].sort((a, b) => (a.page_url || '').localeCompare(b.page_url || ''));
    else if (sortBy === 'category') result = [...result].sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    return result;
  }, [allIssues, severityFilter, categoryFilter, searchQuery, sortBy]);

  const paginated = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const stats = useMemo(() => {
    const bySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const byCategory = {};
    const byPage = {};
    allIssues.forEach(i => {
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
      byCategory[i.category] = (byCategory[i.category] || 0) + 1;
      if (i.page_url) byPage[i.page_url] = (byPage[i.page_url] || 0) + 1;
    });
    return { bySeverity, byCategory, byPage, uniquePages: Object.keys(byPage).length };
  }, [allIssues]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  if (error) return <div className="empty-state"><AlertTriangle size={40} style={{ color: 'var(--red)' }} /><p>{error}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button></div>;

  if (loading) {
    return (
      <div className="page-content">
        <div className="shimmer shimmer-title" style={{ width: '40%', marginBottom: 8 }} />
        <div className="shimmer shimmer-text" style={{ width: '60%', marginBottom: 24 }} />
        <div className="score-grid">
          {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 100, borderRadius: 'var(--radius)' }} />)}
        </div>
        <div className="shimmer shimmer-bar" style={{ height: 40, marginBottom: 16 }} />
        {[1,2,3,4,5].map(i => <div key={i} className="shimmer" style={{ height: 48, borderRadius: 'var(--radius-sm)', marginBottom: 4 }} />)}
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header animate-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ padding: '4px' }}>
            <ArrowLeft size={18} />
          </button>
          <AlertTriangle size={24} style={{ color: 'var(--yellow)' }} />
          <h1>Issues Explorer</h1>
        </div>
        <p>All <AnimatedNumber value={totalCount} duration={800} /> issues across <AnimatedNumber value={stats.uniquePages} duration={800} /> pages — filter, search, and sort to find exactly what to fix</p>
      </div>

      <div className="score-grid stagger" style={{ marginBottom: '16px' }}>
        {Object.entries(stats.bySeverity).filter(([, c]) => c > 0).map(([sev, count]) => (
          <div className="score-card hover-lift" key={sev}
            style={{ cursor: 'pointer', border: severityFilter === sev ? `2px solid ${SEVERITY_COLORS[sev]}` : '2px solid transparent', transition: 'all 0.3s ease' }}
            onClick={() => setSeverityFilter(severityFilter === sev ? 'ALL' : sev)}>
            <div className="label">{sev}</div>
            <div className="score" style={{ color: SEVERITY_COLORS[sev] }}><AnimatedNumber value={count} duration={1000} /></div>
          </div>
        ))}
        <div className="score-card hover-lift">
          <div className="label">Unique Pages</div>
          <div className="score" style={{ color: 'var(--accent)' }}><AnimatedNumber value={stats.uniquePages} duration={1000} /></div>
        </div>
      </div>

      <div className="card animate-in" style={{ animationDelay: '100ms', padding: 16 }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search issues, pages, fixes..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '14px', background: 'var(--bg-white)', color: 'var(--text)', transition: 'all 0.2s' }} />
            {searchQuery && <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}><X size={14} /></button>}
          </div>
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
            style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '14px', background: 'var(--bg-white)', color: 'var(--text)' }}>
            <option value="ALL">All Categories</option>
            {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <option key={cat} value={cat}>{cat} ({count})</option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '14px', background: 'var(--bg-white)', color: 'var(--text)' }}>
            <option value="severity">Sort by Severity</option>
            <option value="page">Sort by Page</option>
            <option value="category">Sort by Category</option>
          </select>
        </div>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', padding: '0 4px' }}>
        Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of <AnimatedNumber value={filtered.length} duration={600} /> issues
        {searchQuery && <span> matching "<strong>{searchQuery}</strong>"</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {paginated.map((issue, idx) => {
          const isExpanded = expandedIssue === idx;
          return (
            <div key={idx} className="animate-in" style={{ animationDelay: `${Math.min(idx * 30, 500)}ms`, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-white)', overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <div onClick={() => setExpandedIssue(isExpanded ? null : idx)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; }}>
                <span style={{ width: '70px', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', textAlign: 'center', color: '#fff', background: SEVERITY_COLORS[issue.severity] || '#6b7280', boxShadow: `0 2px 8px ${SEVERITY_COLORS[issue.severity] || '#6b7280'}30` }}>
                  {issue.severity}
                </span>
                <span style={{ width: '70px', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', textAlign: 'center', color: CATEGORY_COLORS[issue.category] || '#6b7280', background: `${CATEGORY_COLORS[issue.category] || '#6b7280'}15` }}>
                  {issue.category}
                </span>
                <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{issue.signal_name}</span>
                {issue.page_url && <span style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{issue.page_url}</span>}
                <ChevronDown size={14} style={{ color: 'var(--text-dim)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
              </div>
              {isExpanded && (
                <div className="animate-in" style={{ padding: '16px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-secondary)', fontSize: '13px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={12} style={{ color: 'var(--red)' }} /> Description
                      </div>
                      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{issue.description}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={12} style={{ color: 'var(--green)' }} /> How to Fix
                      </div>
                      <div style={{ color: 'var(--green)', lineHeight: 1.6 }}>{issue.fix || 'No fix suggestion available'}</div>
                    </div>
                  </div>
                  {issue.page_url && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <a href={issue.page_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '4px 10px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-light)'}>
                        <ExternalLink size={12} /> Visit page
                      </a>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/audit/${id}/page-detail?url=${encodeURIComponent(issue.page_url)}`); }}
                        style={{ fontSize: '12px', color: 'var(--accent)', background: 'var(--accent-light)', border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-light)'}>
                        View analysis →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous</button>
          <span style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>Page {page + 1} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="empty-state animate-in" style={{ padding: '40px' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>✅</div>
          <p style={{ color: 'var(--text-muted)' }}>No issues match your filters</p>
        </div>
      )}
    </div>
  );
}
