import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../../api'
import DataSourceBadge from '../../../components/DataSourceBadge'
import { BookOpen, FileText, AlertTriangle, CheckCircle, ArrowRight, Image, Link2, FileSearch } from 'lucide-react'
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip'
import ThemeHero from '../../../components/ai/ThemeHero'
import ThemeStatCard from '../../../components/ai/ThemeStatCard'
import ThemePillTabs from '../../../components/ai/ThemePillTabs'

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

function IssueGroup({ group }) {
  const [expanded, setExpanded] = useState(false)
  const showPages = expanded ? group.pages : group.pages.slice(0, 5)
  const extra = group.pages.length - showPages.length
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
      <span className={`badge ${group.severity === 'HIGH' || group.severity === 'CRITICAL' ? 'badge-red' : group.severity === 'MEDIUM' ? 'badge-yellow' : 'badge-blue'}`} style={{ minWidth: 60, textAlign: 'center' }}>
        {group.severity}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{group.title}</span>
          {group.pages.length > 1 && <span className="badge badge-blue">{group.pages.length} pages</span>}
        </div>
        {group.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{group.description}</div>}
        {group.pages.length > 0 && (
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {showPages.map((p, i) => <div key={i} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</div>)}
            {extra > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: 11, fontFamily: 'inherit', marginTop: 3 }}
              >
                {expanded ? 'Show fewer' : `+${extra} more pages`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ContentIssues({ issues }) {
  const groups = useMemo(() => {
    const byKey = new Map()
    for (const issue of issues) {
      const title = issue.title || issue.signal_name || issue.message || 'Issue'
      const key = `${issue.severity || 'MEDIUM'}::${title}::${issue.description || ''}`
      if (!byKey.has(key)) byKey.set(key, { severity: issue.severity || 'MEDIUM', title, description: issue.description, pages: [] })
      const page = issue.page || issue.url
      if (page && !byKey.get(key).pages.includes(page)) byKey.get(key).pages.push(page)
    }
    return [...byKey.values()].sort((a, b) => {
      const w = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      return ((w[a.severity] ?? 9) - (w[b.severity] ?? 9)) || (b.pages.length - a.pages.length)
    })
  }, [issues])
  if (!issues?.length) return <div className="empty-state"><h3>No content issues</h3><p>No content or on-page issues were detected for this site.</p></div>
  return (
    <div className="card">
      <div className="card-header"><h2>Content Issues</h2><span className="badge badge-red">{issues.length}</span></div>
      {groups.map((group, i) => <IssueGroup key={i} group={group} />)}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <ThemeHero
        icon={FileSearch}
        title="Content Analysis"
        subtitle="Content quality, word counts, and optimization opportunities from crawled data"
        badges={[
          { icon: FileText, t: 'Word counts' },
          { icon: BookOpen, t: 'Optimization' },
          { icon: AlertTriangle, t: 'Crawl-based' },
        ]}
        actions={<DataSourceBadge source="crawler" size="xs" />}
      />
      <div className="empty-state"><h3>Content data unavailable</h3><p>{error}</p></div>
    </div>
  )

  const audit = data?.audit || {}
  const summary = audit.summary || {}
  const pages = data?.pages || []
  const tabs = [
    { key: 'pages', label: 'Pages', icon: FileText, count: pages.length },
    { key: 'issues', label: 'Issues', icon: AlertTriangle, count: data?.contentIssues?.length || 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <ThemeHero
        icon={FileSearch}
        title="Content Analysis"
        subtitle="Content quality, word counts, and optimization opportunities from crawled data"
        badges={[
          { icon: FileText, t: 'Word counts' },
          { icon: BookOpen, t: 'Optimization' },
          { icon: AlertTriangle, t: 'Crawl-based' },
        ]}
        actions={<DataSourceBadge source="crawler" size="xs" />}
      />

      <div>
        <AiSuggestionStrip auditId={id} tool="content" title="AI content fixes" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <ThemeStatCard icon={FileText} label="Total Pages" value={audit.total_pages ?? pages.length} color="#3b82f6" />
        <ThemeStatCard icon={BookOpen} label="Avg Content Score" value={audit.overall_score ?? '-'} color="#7950f2" />
        <ThemeStatCard icon={CheckCircle} label="Pages Good" value={summary.pages_good ?? '-'} color="#12b886" />
        <ThemeStatCard icon={AlertTriangle} label="Need Work" value={summary.pages_needing_work ?? '-'} color="#f59f00" />
      </div>

      <ThemePillTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'pages' && <PageContentTable pages={pages} />}
      {activeTab === 'issues' && <ContentIssues issues={data?.contentIssues} />}
    </div>
  )
}
