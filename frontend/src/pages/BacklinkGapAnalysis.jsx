import { useState } from 'react'
import { api } from '../api'
import { DataSourceBadge, GSCStatusBadge } from '../components/DataSourceBadge'
import { Network, Search, Info, ArrowUp, ArrowDown, Minus } from 'lucide-react'

const TYPE_LABEL = {
  unique_to_you: { label: 'Links Only To You', color: '#22C55E' },
  unique_to_competitor: { label: 'Links Only To Competitors', color: '#EF4444' },
  overlap: { label: 'Links To Both', color: '#6366F1' },
}

export default function BacklinkGapAnalysis() {
  const [domain, setDomain] = useState('')
  const [competitors, setCompetitors] = useState(['', '', ''])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('combined')

  const handleAnalyze = async (e) => {
    e.preventDefault()
    const compList = competitors.map(c => c.trim()).filter(Boolean)
    if (!domain.trim() || compList.length === 0) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await api.getBacklinkGap(domain.trim(), compList.join(','))
      setData(res)
    } catch (err) { setError(err.message || 'Failed to analyze backlink gap') }
    finally { setLoading(false) }
  }

  const updateCompetitor = (idx, val) => {
    const next = [...competitors]
    next[idx] = val
    setCompetitors(next)
  }

  const combined = data?.combined || []
  const uniqueComp = (data?.link_that_to_competitor || []).length
  const uniqueYou = (data?.link_to_you_but_not_competitor || []).length
  const overlap = (data?.overlap || []).length

  const rows = tab === 'combined'
    ? combined
    : tab === 'competitor'
      ? data?.link_that_to_competitor?.map(d => ({ ...d, type: 'unique_to_competitor' })) || []
      : tab === 'you'
        ? data?.link_to_you_but_not_competitor?.map(d => ({ ...d, type: 'unique_to_you' })) || []
        : data?.overlap?.map(d => ({ ...d, type: 'overlap' })) || []

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <Network size={26} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Backlink Gap Analysis</h1>
          <DataSourceBadge source={data?.source} />
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 20px', fontSize: 13 }}>
          Find referring domains that link to your competitors but not to you
        </p>
        <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 520, margin: '0 auto' }}>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="your-domain.com"
            style={{
              padding: '9px 12px', background: '#111827', border: '1px solid #374151',
              borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none',
            }}
          />
          {competitors.map((c, i) => (
            <input
              key={i}
              value={c}
              onChange={(e) => updateCompetitor(i, e.target.value)}
              placeholder={`competitor${i + 1}.com${i === 0 ? ' (required)' : ' (optional)'}`}
              style={{
                padding: '9px 12px', background: '#111827', border: '1px solid #374151',
                borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none',
              }}
            />
          ))}
          <button type="submit" style={{
            padding: '9px 20px', background: '#6366F1', border: 'none', borderRadius: 8,
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            <Search size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Analyze Gap
          </button>
        </form>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid #374151', borderTopColor: '#6366F1',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          Analyzing backlink gap…
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', maxWidth: 500, margin: '0 auto' }}>
          {error}
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: 50, color: '#4B5563' }}>
          <Network size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter your domain and up to 3 competitors to find link gaps</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
            <Info size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Backlink data sourced from Common Crawl's public web archive, refreshed monthly.
          </p>
        </div>
      )}

      {data && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Your Referring Domains', value: data.summary?.your_domains || 0, color: '#6366F1' },
              { label: 'Unique To Competitors', value: uniqueComp, color: '#EF4444' },
              { label: 'Unique To You', value: uniqueYou, color: '#22C55E' },
              { label: 'Overlap (Both)', value: overlap, color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { key: 'combined', label: `All Gaps (${combined.length})` },
              { key: 'competitor', label: `Competitor-Only (${uniqueComp})` },
              { key: 'you', label: `Your-Only (${uniqueYou})` },
              { key: 'overlap', label: `Overlap (${overlap})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: tab === key ? '#6366F1' : '#1F2937',
                  color: tab === key ? '#fff' : '#9CA3AF',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, overflow: 'hidden' }}>
            {rows.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#6B7280' }}>
                No referring domain gaps found. Try refreshing backlinks for this domain first.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1F2937' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Referring Domain</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Type</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Links To</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r, i) => {
                    const t = TYPE_LABEL[r.type] || TYPE_LABEL.overlap
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #1F2937' }}>
                        <td style={{ padding: '10px 14px', color: '#F9FAFB', fontWeight: 500 }}>{r.domain}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${t.color}15`, color: t.color }}>
                            {t.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#6B7280', fontSize: 12 }}>
                          {r.competitors?.length ? r.competitors.join(', ') : 'You only'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {data.summary && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#1E293B', border: '1px solid #334155', borderRadius: 6, fontSize: 12, color: '#94A3B8', display: 'flex', gap: 8 }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              Backlink data sourced from Common Crawl's public web archive, refreshed monthly. Gap analysis is based on the most recent backlink refresh.
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
