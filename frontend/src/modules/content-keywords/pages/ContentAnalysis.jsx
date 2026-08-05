import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../../api'
import DataSourceBadge from '../../../components/DataSourceBadge'
import { BookOpen, FileText, AlertTriangle, CheckCircle, ArrowRight, Image, Link2 } from 'lucide-react'

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="tab-bar">
      {tabs.map(t => (
        <button key={t.key} className={`tab ${active === t.key ? 'active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count != null && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 8, background: active === t.key ? 'rgba(76,110,245,0.12)' : 'var(--bg-secondary)', color: active === t.key ? 'var(--accent)' : 'var(--text-muted)' }}>{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = 'var(--accent)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )
}

function imageStatus(p) {
  const mi = p.missing_images || []
  if (!mi.length) return { count: null, ok: true }
  if (mi.some(m => m.type === 'no_images')) return { count: 0, ok: false }
  const alt = mi.find(m => m.type === 'missing_alt')
  if (alt && alt.count) return { count: `>=${alt.count}`, ok: true }
  return { count: null, ok: true }
}

function PageContentTable({ pages }) {
  if (!pages?.length) return <div className="empty-state"><h3>No content data</h3><p>Run an audit to crawl pages and see content metrics here.</p></div>
  return (
    <div className="card">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Page</th>
              <th>Words</th>
              <th>Headings</th>
              <th>Images</th>
              <th>Missing</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p, i) => {
              const headings = (p.heading_counts?.h1 || 0) + (p.heading_counts?.h2 || 0) + (p.heading_counts?.h3 || 0)
              const img = imageStatus(p)
              const missing = (p.missing_sections?.length || 0) + (p.missing_links?.length || 0) + (p.missing_schema?.length || 0)
              const score = p.score ?? 0
              return (
                <tr key={i}>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--text)' }}>
                    {p.url || p.title}
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.word_count ?? '-'}</td>
                  <td>{headings || '-'}</td>
                  <td>{img.count != null ? img.count : (img.ok ? <CheckCircle size={13} style={{ color: '#12b886' }} /> : <AlertTriangle size={13} style={{ color: '#f59f00' }} />)}</td>
                  <td style={{ fontWeight: 600, color: missing > 0 ? '#f59f00' : '#12b886' }}>{missing || '0'}</td>
                  <td>
                    <span className={`badge ${score >= 70 ? 'badge-green' : score >= 40 ? 'badge-yellow' : 'badge-red'}`}>
                      {score}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ContentIssues({ issues }) {
  if (!issues?.length) return <div className="empty-state"><h3>No content issues</h3><p>No content or on-page issues were detected for this site.</p></div>
  return (
    <div className="card">
      <div className="card-header"><h2>Content Issues</h2></div>
      {issues.map((issue, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
          <span className={`badge ${issue.severity === 'HIGH' || issue.severity === 'CRITICAL' ? 'badge-red' : issue.severity === 'MEDIUM' ? 'badge-yellow' : 'badge-blue'}`} style={{ minWidth: 60, textAlign: 'center' }}>
            {issue.severity || 'MEDIUM'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{issue.title || issue.signal_name || issue.message}</div>
            {issue.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{issue.description}</div>}
            {issue.url && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{issue.url}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ContentAnalysis() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('pages')

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      api.getReportData(id).catch(() => null),
      api.getContentAudit(id).catch(() => null),
    ]).then(([report, audit]) => {
      const byCat = report?.issues_by_category || {}
      const contentIssues = [
        ...(byCat.CONTENT || []),
        ...(byCat.ON_PAGE || []),
        ...(byCat['ON-PAGE'] || []),
      ]
      const fallbackIssues = (report?.critical_issues || []).map(i => ({
        severity: i.severity, signal_name: i.signal, description: i.description, url: i.page,
      }))
      const pages = audit?.page_audits || []
      if (!pages.length && !contentIssues.length && report?.site_summary?.total_pages) {
        setError('Content analysis returned no per-page detail, but the audit has pages. Try refreshing.')
      }
      setData({ pages, contentIssues: contentIssues.length ? contentIssues : fallbackIssues, audit, report })
    }).catch(e => setError(e.message || 'Failed to load content data'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Analyzing content...</p></div>
  if (error && !data?.pages?.length) return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1>Content Analysis</h1>
          <DataSourceBadge source="crawler" size="xs" />
        </div>
        <p>Content quality, word counts, and optimization opportunities from crawled data</p>
      </div>
      <div className="empty-state"><h3>Content data unavailable</h3><p>{error}</p></div>
    </div>
  )

  const audit = data?.audit || {}
  const summary = audit.summary || {}
  const pages = data?.pages || []
  const tabs = [
    { key: 'pages', label: 'Pages', count: pages.length },
    { key: 'issues', label: 'Issues', count: data?.contentIssues?.length || 0 },
  ]

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1>Content Analysis</h1>
          <DataSourceBadge source="crawler" size="xs" />
        </div>
        <p>Content quality, word counts, and optimization opportunities from crawled data</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 18 }}>
        <StatCard icon={FileText} label="Total Pages" value={audit.total_pages ?? pages.length} color="#3b82f6" />
        <StatCard icon={BookOpen} label="Avg Content Score" value={audit.overall_score ?? '-'} color="#7950f2" />
        <StatCard icon={CheckCircle} label="Pages Good" value={summary.pages_good ?? '-'} color="#12b886" />
        <StatCard icon={AlertTriangle} label="Need Work" value={summary.pages_needing_work ?? '-'} color="#f59f00" />
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'pages' && <PageContentTable pages={pages} />}
      {activeTab === 'issues' && <ContentIssues issues={data?.contentIssues} />}
    </div>
  )
}
