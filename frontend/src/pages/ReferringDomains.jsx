import { useState } from 'react'
import { api } from '../api'
import { DataSourceBadge, GSCStatusBadge } from '../components/DataSourceBadge'
import { Globe, Search, ArrowUpDown, ExternalLink } from 'lucide-react'

export default function ReferringDomains() {
  const [domain, setDomain] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('da')  // da | links | toxic

  const load = async (d) => {
    setLoading(true); setError('')
    try { const res = await api.getReferringDomains(d); setData(res) }
    catch (e) { setError(e.message || 'Failed') }
    finally { setLoading(false) }
  }

  const handleSubmit = (e) => { e.preventDefault(); if (domain.trim()) load(domain.trim()) }

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
      borderRadius: 4, color: sortBy === field ? '#6366F1' : '#6B7280', fontSize: 10, fontWeight: 600,
      cursor: 'pointer', padding: '2px 6px', textTransform: 'uppercase',
    }}>{children}</button>
  )

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <Globe size={26} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Referring Domains</h1>
          <DataSourceBadge source={data?.source} />
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 18px', fontSize: 13 }}>Backlinks grouped by referring domain, sorted by authority</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 480, margin: '0 auto' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com"
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <button type="submit" style={{ padding: '9px 18px', background: '#6366F1', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Search</button>
        </form>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading…</div>}
      {error && <div style={{ textAlign: 'center', padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', maxWidth: 500, margin: '0 auto', fontSize: 12 }}>{error}</div>}

      {!loading && data && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13 }}>
            <span style={{ color: '#6B7280' }}>Total referring domains: <strong style={{ color: '#F9FAFB' }}>{data.total}</strong></span>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <SortBtn field="da">Authority</SortBtn>
            <SortBtn field="links">Link Count</SortBtn>
            <SortBtn field="toxic">Toxic Score</SortBtn>
          </div>

          {sorted.length > 0 ? (
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1F2937' }}>
                    {['Domain', 'Links', 'DA', 'Toxic', 'First Seen'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#6B7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((rd, i) => (
                    <tr key={rd.id || i} style={{ borderBottom: '1px solid #1F2937' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: '#6366F1', fontWeight: 500, fontSize: 13 }}>{rd.domain}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#F9FAFB' }}>{rd.link_count}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: rd.domain_authority >= 50 ? '#22C55E' : rd.domain_authority >= 20 ? '#F59E0B' : '#EF4444' }}>
                        {rd.domain_authority || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 40, height: 5, background: '#1F2937', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, (rd.toxic_score || 0) * 100)}%`, height: '100%', background: (rd.toxic_score || 0) >= 0.7 ? '#EF4444' : (rd.toxic_score || 0) >= 0.3 ? '#F59E0B' : '#22C55E', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{rd.toxic_score != null ? rd.toxic_score.toFixed(2) : '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6B7280', fontSize: 12 }}>
                        {rd.first_seen ? new Date(rd.first_seen).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
              {data.note || 'No referring domains found'}
            </div>
          )}
        </div>
      )}

      {!loading && !data && (
        <div style={{ textAlign: 'center', padding: 50, color: '#4B5563' }}>
          <Globe size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter a domain above to see referring domains</p>
        </div>
      )}
    </div>
  )
}
