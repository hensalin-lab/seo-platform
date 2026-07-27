import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
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

function PageContentTable({ pages }) {
  if (!pages?.length) return <div className="empty-state"><h3>No content data</h3></div>
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
              <th>Links</th>
              <th>Schema</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p, i) => (
              <tr key={i}>
                <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--text)' }}>
                  {p.url || p.title}
                </td>
                <td style={{ fontWeight: 600 }}>{p.word_count ?? '-'}</td>
                <td>{p.heading_count ?? '-'}</td>
                <td>{p.image_count ?? '-'}</td>
                <td>{p.link_count ?? '-'}</td>
                <td>{p.has_schema ? <CheckCircle size={13} style={{ color: '#12b886' }} /> : <AlertTriangle size={13} style={{ color: '#f59f00' }} />}</td>
                <td>
                  <span className={`badge ${(p.content_score || 0) >= 70 ? 'badge-green' : (p.content_score || 0) >= 40 ? 'badge-yellow' : 'badge-red'}`}>
                    {p.content_score ?? '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ContentIssues({ issues }) {
  if (!issues?.length) return <div className="empty-state"><h3>No content issues</h3></div>
  return (
    <div className="card">
      <div className="card-header"><h2>Content Issues</h2></div>
      {issues.map((issue, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
          <span className={`badge ${issue.severity === 'HIGH' ? 'badge-red' : issue.severity === 'MEDIUM' ? 'badge-yellow' : 'badge-blue'}`} style={{ minWidth: 50, textAlign: 'center' }}>
            {issue.severity}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{issue.title || issue.message}</div>
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
  const [activeTab, setActiveTab] = useState('pages')

  useEffect(() => {
    Promise.all([
      api.getReportData(id).catch(() => null),
      api.getContentAudit(id).catch(() => null),
    ]).then(([report, audit]) => {
      const pages = report?.pages || []
      const contentIssues = (report?.issues || []).filter(i =>
        i.category === 'CONTENT' || i.category === 'ON_PAGE'
      )
      setData({ pages, contentIssues, audit })
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Analyzing content...</p></div>

  const tabs = [
    { key: 'pages', label: 'Pages', count: data?.pages?.length || 0 },
    { key: 'issues', label: 'Issues', count: data?.contentIssues?.length || 0 },
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Content Analysis</h1>
        <p>Content quality, word counts, and optimization opportunities</p>
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'pages' && <PageContentTable pages={data?.pages} />}
      {activeTab === 'issues' && <ContentIssues issues={data?.contentIssues} />}
    </div>
  )
}
