import { useState } from 'react'
import { api } from '../api'
import { DataSourceBadge, GSCStatusBadge } from '../components/DataSourceBadge'
import { Globe, Search, ArrowUpDown, ExternalLink, RefreshCw } from 'lucide-react'

export default function ReferringDomains() {
  const [domain, setDomain] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('da')  // da | links | toxic
  const [refreshing, setRefreshing] = useState(false)

  const load = async (d) => {
    setLoading(true); setError('')
    try { const res = await api.getReferringDomains(d); setData(res) }
    catch (e) { setError(e.message || 'Failed') }
    finally { setLoading(false) }
  }

  const handleSubmit = (e) => { e.preventDefault(); if (domain.trim()) load(domain.trim()) }

  const handleRefresh = async () => {
    if (!domain.trim()) return
    setRefreshing(true); setError('')
    try {
      await api.refreshBacklinks(domain.trim())
      // Poll to pick up newly written rows
      for (const ms of [0, 6000, 18000]) {
        if (ms > 0) await new Promise(r => setTimeout(r, ms))
        try { await load(domain.trim()) } catch { /* best-effort */ }
      }
    } catch (e) { setError(e.message || 'Refresh failed') }
    finally { setRefreshing(false) }
  }

  const sorted = data?.domains
    ? [...data.domains].sort((a, b) => {
        if (sortBy === 'da') return (b.domain_authority || 0) - (a.domain_authority || 0)
        if (sortBy === 'links') return (b.link_count || 0) - (a.link_count || 0)
        return (b.toxic_score || 0) - (a.toxic_score || 0)
      })
    : []

  const SortBtn = ({ field, children }) => (
    <button onClick={() => setSortBy(field)} style={{
      background: sortBy === field ? '#6366F120' : 'transparent',
      border: sortBy === field ? '1px solid #6366F140' : '1px solid transparent',
      borderRadius: 4, color: sortBy === field ? '#6366F1' : '#475569', fontSize: 10, fontWeight: 600,
      cursor: 'pointer', padding: '2px 6px', textTransform: 'uppercase',
    }}>{children}</button>
  )

  return (
    <div style={{ padding: '24px 24px 40px', background: '#F4F6FB', minHeight: '100vh', color: '#0F172A' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <Globe size={26} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Referring Domains</h1>
          <DataSourceBadge source={data?.source} />
        </div>
        <p style={{ color: '#64748B', margin: '0 0 18px', fontSize: 13 }}>Backlinks grouped by referring domain, sorted by authority</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 480, margin: '0 auto' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com"
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, color: '#0F172A', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <button type="submit" style={{ padding: '9px 18px', background: '#6366F1', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Search</button>
        </form>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>Loading…</div>}
      {error && <div style={{ textAlign: 'center', padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', maxWidth: 500, margin: '0 auto', fontSize: 12 }}>{error}</div>}

      {!loading && data && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#475569' }}>Total referring domains: <strong style={{ color: '#0F172A' }}>{data.total}</strong></span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                marginLeft: 'auto',
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', background: '#E5E9F2',
                border: '1px solid #DAE0EA', borderRadius: 6, color: refreshing ? '#475569' : '#0F172A',
                fontSize: 11, cursor: refreshing ? 'default' : 'pointer',
              }}
            >
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {data.data_status && data.data_status !== 'ready' && (
            <div style={{
              marginBottom: 16, padding: '10px 16px',
              background: data.data_status === 'fetching' ? '#FEF3C7' : '#EFF6FF',
              border: `1px solid ${data.data_status === 'fetching' ? '#FDE68A' : '#BFDBFE'}`,
              borderRadius: 8, fontSize: 12,
              color: data.data_status === 'fetching' ? '#92400E' : '#1E40AF', textAlign: 'center',
            }}>
              {data.data_status === 'fetching'
                ? 'Backlinks are being fetched from Common Crawl — check back in a few minutes.'
                : 'Backlink ingestion recently scheduled — check back in a few minutes.'}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <SortBtn field="da">Authority</SortBtn>
            <SortBtn field="links">Link Count</SortBtn>
            <SortBtn field="toxic">Toxic Score</SortBtn>
          </div>

          {sorted.length > 0 ? (
            <div style={{ background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #DAE0EA' }}>
                    {['Domain', 'Links', 'DA', 'Toxic', 'First Seen', 'Last Seen'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((rd, i) => (
                    <tr key={rd.id || i} style={{ borderBottom: '1px solid #DAE0EA' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: '#6366F1', fontWeight: 500, fontSize: 13 }}>{rd.domain}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F172A' }}>{rd.link_count}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: rd.domain_authority >= 50 ? '#22C55E' : rd.domain_authority >= 20 ? '#F59E0B' : '#EF4444' }}>
                        {rd.domain_authority || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 40, height: 5, background: '#E5E9F2', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, (rd.toxic_score || 0) * 100)}%`, height: '100%', background: (rd.toxic_score || 0) >= 0.7 ? '#EF4444' : (rd.toxic_score || 0) >= 0.3 ? '#F59E0B' : '#22C55E', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#64748B' }}>{rd.toxic_score != null ? rd.toxic_score.toFixed(2) : '—'}</span>
                        </div>
                      </td>
                        <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12 }}>
                          {rd.first_seen ? new Date(rd.first_seen).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12 }}>
                          {rd.last_seen ? new Date(rd.last_seen).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
              {data?.data_status === 'fetching' ? (
                <div>
                  <p style={{ fontWeight: 600, color: '#F59E0B', marginBottom: 4 }}>Backlinks are being fetched</p>
                  <p style={{ fontSize: 12 }}>Common Crawl data is being ingested — check back in a few minutes and click Refresh.</p>
                </div>
              ) : data?.data_status === 'pending' ? (
                <div>
                  <p style={{ fontWeight: 600, color: '#3B82F6', marginBottom: 4 }}>Ingestion recently scheduled</p>
                  <p style={{ fontSize: 12 }}>Backlink ingestion is in progress — check back in a few minutes and click Refresh.</p>
                </div>
              ) : (
                <span>{data?.note || 'No referring domains found'}</span>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && !data && (
        <div style={{ textAlign: 'center', padding: 50, color: '#8B93A7' }}>
          <Globe size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter a domain above to see referring domains</p>
        </div>
      )}
    </div>
  )
}
