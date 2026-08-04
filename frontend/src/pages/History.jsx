import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Globe, ArrowRight, Download } from 'lucide-react'
import AuditTable from '../components/AuditTable'
import { toCsv, downloadFile } from '../utils/exportCsv'

export default function History() {
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = 20
  const navigate = useNavigate()

  useEffect(() => {
    api.getHistory(limit, page * limit).then(d => {
      const items = Array.isArray(d) ? d : d?.items || []
      setAudits(prev => page === 0 ? items : [...prev, ...items])
      setHasMore(items.length === limit)
    }).catch(() => setAudits([])).finally(() => setLoading(false))
  }, [page])

  const handleDelete = async (id) => {
    if (!confirm('Delete this audit?')) return
    try {
      await api.deleteAudit(id)
      setAudits(prev => prev.filter(a => a.audit_id !== id))
    } catch {}
  }

  const handleExportCsv = () => {
    const rows = audits.map(a => ({
      website: a.website_url,
      score: a.overall_score ?? '',
      seo: a.seo_score ?? '',
      aeo: a.aeo_score ?? '',
      pages: a.total_pages ?? '',
      issues: a.total_issues ?? '',
      status: a.status,
      date: a.created_at ? new Date(a.created_at).toLocaleDateString() : '',
    }))
    downloadFile(toCsv(rows, [
      { key: 'website', label: 'Website' },
      { key: 'score', label: 'Score' },
      { key: 'seo', label: 'SEO' },
      { key: 'aeo', label: 'AEO' },
      { key: 'pages', label: 'Pages' },
      { key: 'issues', label: 'Issues' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Date' },
    ]), `seo-audits-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')
  }

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading...</p></div>

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Audit History</h1>
          <p>{audits.length} audit{audits.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCsv} disabled={audits.length === 0}>
            <Download size={13} /> Export CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/new')}>
            New Audit <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {audits.length === 0 ? (
        <div className="empty-state">
          <Globe size={40} style={{ color: 'var(--text-dim)', marginBottom: 12 }} />
          <h3>No audits yet</h3>
          <p>Run your first audit to get started</p>
          <button className="btn btn-primary" onClick={() => navigate('/new')}>Start Audit</button>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <AuditTable audits={audits} showIssues onDelete={(a) => handleDelete(a.audit_id)} />
          </div>
          {hasMore && (
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)}>Load More</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
