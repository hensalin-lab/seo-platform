import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { FileText, Search, CheckCircle, XCircle, Clock, Link2, BarChart3, AlertTriangle, ExternalLink, Tag } from 'lucide-react';

const PAGE_TYPE_COLORS = {
  HOMEPAGE: { bg: '#dbeafe', text: '#1e40af' },
  PRICING: { bg: '#fce7f3', text: '#9d174d' },
  PRODUCT: { bg: '#d1fae5', text: '#065f46' },
  BLOG: { bg: '#fef3c7', text: '#92400e' },
  CASE_STUDY: { bg: '#ede9fe', text: '#5b21b6' },
  ABOUT: { bg: '#e0e7ff', text: '#3730a3' },
  CONTACT: { bg: '#cffafe', text: '#155e75' },
  DEMO: { bg: '#fce7f3', text: '#be185d' },
  SERVICES: { bg: '#d1fae5', text: '#047857' },
  FAQ: { bg: '#fef9c3', text: '#854d0e' },
  LEGAL: { bg: '#f3f4f6', text: '#374151' },
  LANDING_PAGE: { bg: '#ede9fe', text: '#6d28d9' },
  DOCUMENTATION: { bg: '#e0e7ff', text: '#4338ca' },
  UNKNOWN: { bg: '#f3f4f6', text: '#6b7280' },
};

function getPageTypeBadge(type) {
  const colors = PAGE_TYPE_COLORS[type] || PAGE_TYPE_COLORS.UNKNOWN;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: colors.bg, color: colors.text, whiteSpace: 'nowrap',
    }}>
      <Tag size={10} />
      {type || 'UNKNOWN'}
    </span>
  );
}

function scoreBadgeClass(score) {
  if (score >= 80) return 'badge-green';
  if (score >= 50) return 'badge-yellow';
  return 'badge-red';
}

function getStatusBadge(code) {
  if (code >= 200 && code < 300) return 'badge-green';
  if (code >= 300 && code < 400) return 'badge-yellow';
  return 'badge-red';
}

export default function PageIntelligence() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [analysesData, pagesData] = await Promise.allSettled([
          api.getPageAnalyses(id),
          api.getAuditPages(id, { limit: 200 }),
        ]);
        if (analysesData.status === 'fulfilled') {
          setAnalyses(Array.isArray(analysesData.value) ? analysesData.value : []);
        }
        if (pagesData.status === 'fulfilled') {
          const pd = pagesData.value;
          setPages(Array.isArray(pd) ? pd : pd.items || []);
        }
        if (analysesData.status === 'rejected' && pagesData.status === 'rejected') {
          setError(analysesData.reason?.message || pagesData.reason?.message || 'Failed to load page data');
        }
      } catch (err) {
        setError(err.message || 'Failed to load page data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const totalPages = pages.length;
  const avgIssues = analyses.length > 0
    ? (analyses.reduce((sum, a) => sum + (a.issue_count || 0), 0) / analyses.length).toFixed(1)
    : '—';
  const avgScore = analyses.length > 0
    ? Math.round(analyses.reduce((sum, a) => sum + (a.scores?.overall || 0), 0) / analyses.length)
    : '—';
  const pagesWithIssues = analyses.filter(a => (a.issue_count || 0) > 0).length;

  const searchLower = search.toLowerCase();
  const filteredPages = pages.filter(p =>
    !search || (p.url && p.url.toLowerCase().includes(searchLower)) ||
    (p.title && p.title.toLowerCase().includes(searchLower))
  );

  const getAnalysisForPage = (pageUrl) => {
    return analyses.find(a => a.page_url === pageUrl);
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Loading page intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="error-state">{error}</div>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1><FileText size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} /> Page Intelligence</h1>
        <p>Crawled pages and their SEO performance metrics</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-light)' }}><FileText size={20} style={{ color: 'var(--accent)' }} /></div>
          <div className="stat-info">
            <div className="stat-value">{totalPages}</div>
            <div className="stat-label">Total Pages</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--red-light)' }}><AlertTriangle size={20} style={{ color: 'var(--red)' }} /></div>
          <div className="stat-info">
            <div className="stat-value">{pagesWithIssues}</div>
            <div className="stat-label">Pages with Issues</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--yellow-light)' }}><BarChart3 size={20} style={{ color: 'var(--yellow)' }} /></div>
          <div className="stat-info">
            <div className="stat-value">{avgIssues}</div>
            <div className="stat-label">Avg Issues/Page</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--green-light)' }}><CheckCircle size={20} style={{ color: 'var(--green)' }} /></div>
          <div className="stat-info">
            <div className="stat-value">{avgScore}</div>
            <div className="stat-label">Avg Score</div>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Filter pages by URL or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              background: 'var(--bg-white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontFamily: 'inherit',
              color: 'var(--text)',
            }}
          />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
          {filteredPages.length} of {totalPages} pages
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Type</th>
                <th>Title</th>
                <th>Words</th>
                <th>Status</th>
                <th>Issues</th>
                <th>Context</th>
                <th>Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page, idx) => {
                const analysis = getAnalysisForPage(page.url);
                const score = analysis?.scores?.overall || analysis?.scores?.score || 0;
                const issueCount = analysis?.issue_count ?? '—';
                return (
                  <tr
                    key={page.id || idx}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/audit/${id}/pages/detail?url=${encodeURIComponent(page.url)}`)}
                  >
                    <td style={{ maxWidth: 260 }}>
                      <span className="truncate" style={{ display: 'block', color: 'var(--text)', fontSize: 13 }}>{page.url}</span>
                    </td>
                    <td>{getPageTypeBadge(page.page_type)}</td>
                    <td style={{ maxWidth: 180 }}>
                      <span className="truncate" style={{ display: 'block' }}>
                        {page.title || <span style={{ color: 'var(--red)' }}>Missing</span>}
                      </span>
                    </td>
                    <td>{page.word_count ?? '—'}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(page.status_code)}`}>{page.status_code}</span>
                    </td>
                    <td>
                      {typeof issueCount === 'number' ? (
                        <span className={`badge ${issueCount === 0 ? 'badge-green' : issueCount <= 3 ? 'badge-yellow' : 'badge-red'}`}>{issueCount}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {page.context_issues_count > 0 ? (
                        <span className="badge badge-yellow">{page.context_issues_count}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                    <td>
                      {score > 0 ? (
                        <span className={`badge ${scoreBadgeClass(score)}`}>{score}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPages.length === 0 && pages.length > 0 && (
          <div className="empty-state" style={{ padding: 32 }}>
            <h3>No pages match your search</h3>
            <p>Try a different search term.</p>
          </div>
        )}

        {pages.length === 0 && (
          <div className="empty-state" style={{ padding: 48 }}>
            <FileText size={48} />
            <h3>No pages found</h3>
            <p>No pages were crawled in this audit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
