import { useState } from 'react'
import { api } from '../api'
import { Link2, Search, ExternalLink, Shield, ArrowUpDown, RefreshCw } from 'lucide-react'

export default function BacklinkExplorer() {
  const [domain, setDomain] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [page, setPage] = useState(0)
  const limit = 50

  const load = async (d, off = 0) => {
    setLoading(true); setError('')
    try {
      const res = await api.getBacklinkExplorer(d, limit, off)
      setData(res)
    } catch (e) { setError(e.message || 'Failed') }
    finally { setLoading(false) }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (domain.trim()) { setPage(0); load(domain.trim(), 0) }
  }

  const handleRefresh = async () => {
    if (!domain.trim()) return
    setRefreshing(true); setToast('')
    try {
      const res = await api.refreshBacklinks(domain.trim())
      setToast(res.message || 'Backlink ingestion started — check back in a few minutes.')
      // Auto-reload data after 90 seconds to give ingestion time to run
      setTimeout(() => { load(domain.trim(), 0) }, 90000)
    } catch (e) { setToast('Failed to start refresh: ' + (e.message || 'Unknown error')) }
    finally { setRefreshing(false) }
  }

  const handlePage = (newPage) => {
    setPage(newPage)
    load(domain, newPage * limit)
  }

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <Link2 size={26} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Backlink Explorer</h1>
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 18px', fontSize: 13 }}>View all backlinks pointing to a domain</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 480, margin: '0 auto' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com"
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <button type="submit" style={{ padding: '9px 18px', background: '#6366F1', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Search</button>
        </form>
      </div>

      {toast && (
        <div style={{ maxWidth: 560, margin: '0 auto 16px', padding: '10px 16px', background: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#22C55E', textAlign: 'center' }}>
          {toast}
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading…</div>}
      {error && <div style={{ textAlign: 'center', padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', maxWidth: 500, margin: '0 auto', fontSize: 12 }}>{error}</div>}

      {!loading && data && (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 13, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#6B7280' }}>Total: <strong style={{ color: '#F9FAFB' }}>{data.total?.toLocaleString()}</strong></span>
            {data.source === 'common_crawl' && (
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#22C55E15', color: '#22C55E' }}>
                Common Crawl
              </span>
            )}
            {data.note && <span style={{ color: '#F59E0B', fontSize: 11 }}>{data.note}</span>}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                marginLeft: 'auto',
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', background: refreshing ? '#1F2937' : '#1F293B',
                border: '1px solid #374151', borderRadius: 6, color: refreshing ? '#6B7280' : '#E5E7EB',
                fontSize: 11, cursor: refreshing ? 'default' : 'pointer',
              }}
            >
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Refreshing…' : 'Refresh Backlinks'}
            </button>
          </div>

          {data.backlinks?.length > 0 && (
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1F2937' }}>
                    {['Source', 'Target', 'Anchor', 'DA', 'Type', 'Toxic'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#6B7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.backlinks.map((bl, i) => (
                    <tr key={bl.id || i} style={{ borderBottom: '1px solid #1F2937' }}>
                      <td style={{ padding: '8px 12px', maxWidth: 220 }}>
                        <a href={bl.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366F1', textDecoration: 'none', wordBreak: 'break-all', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                          {bl.source_domain || bl.source_url?.slice(0, 40)} <ExternalLink size={10} />
                        </a>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#9CA3AF', fontSize: 11, maxWidth: 180, wordBreak: 'break-all' }}>{bl.target_url?.slice(0, 30) || '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#D1D5DB', fontSize: 11, maxWidth: 120, wordBreak: 'break-all' }}>{bl.anchor_text || '—'}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: bl.domain_authority >= 50 ? '#22C55E' : bl.domain_authority >= 20 ? '#F59E0B' : '#EF4444' }}>
                        {bl.domain_authority || '—'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: bl.is_follow ? '#22C55E15' : '#EF444415', color: bl.is_follow ? '#22C55E' : '#EF4444' }}>
                          {bl.is_follow ? 'dofollow' : 'nofollow'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ color: (bl.toxic_score || 0) >= 0.7 ? '#EF4444' : '#6B7280', fontSize: 11, fontWeight: 600 }}>
                          {bl.toxic_score != null ? bl.toxic_score.toFixed(2) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.total > limit && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => handlePage(page - 1)} disabled={page === 0} style={{ padding: '6px 14px', background: '#1F2937', border: '1px solid #374151', borderRadius: 6, color: '#E5E7EB', fontSize: 12, cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>Prev</button>
              <span style={{ padding: '6px 10px', fontSize: 12, color: '#6B7280' }}>Page {page + 1} of {Math.ceil(data.total / limit)}</span>
              <button onClick={() => handlePage(page + 1)} disabled={(page + 1) * limit >= data.total} style={{ padding: '6px 14px', background: '#1F2937', border: '1px solid #374151', borderRadius: 6, color: '#E5E7EB', fontSize: 12, cursor: (page + 1) * limit >= data.total ? 'default' : 'pointer', opacity: (page + 1) * limit >= data.total ? 0.4 : 1 }}>Next</button>
            </div>
          )}

          {!data.backlinks?.length && !data.note && (
            <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>No backlinks found for this domain</div>
          )}
        </div>
      )}

      {!loading && !data && (
        <div style={{ textAlign: 'center', padding: 50, color: '#4B5563' }}>
          <Link2 size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter a domain above to explore its backlink profile</p>
          <p style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>Backlink data sourced from Common Crawl's public web archive, refreshed monthly.</p>
        </div>
      )}
    </div>
  )
}
