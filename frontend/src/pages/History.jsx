import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Globe, Trash2, ArrowRight } from 'lucide-react'

function scoreBadge(s) {
  if (s >= 80) return 'badge-green'
  if (s >= 60) return 'badge-blue'
  if (s >= 40) return 'badge-yellow'
  return 'badge-red'
}

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

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading...</p></div>

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Audit History</h1>
          <p>{audits.length} audit{audits.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/new')}>
          New Audit <ArrowRight size={13} />
        </button>
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
            <table>
              <thead>
                <tr>
                  <th>Website</th>
                  <th>Score</th>
                  <th>SEO</th>
                  <th>AEO</th>
                  <th>Pages</th>
                  <th>Issues</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {audits.map(a => (
                  <tr key={a.id}>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Globe size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                        {a.website_url}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${scoreBadge(a.overall_score || 0)}`}>{a.overall_score ?? '-'}</span>
                    </td>
                    <td>{a.seo_score ?? '-'}</td>
                    <td>{a.aeo_score ?? '-'}</td>
                    <td>{a.total_pages ?? '-'}</td>
                    <td>{a.total_issues ?? '-'}</td>
                    <td>
                      <span className={`badge ${a.status === 'COMPLETED' ? 'badge-green' : a.status === 'FAILED' ? 'badge-red' : 'badge-blue'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {a.status === 'COMPLETED' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/audit/${a.audit_id}/dashboard`)}>
                            Report
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a.audit_id)} title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
