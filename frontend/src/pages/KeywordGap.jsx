import { useState } from 'react'
import { api } from '../api'
import { DataSourceBadge, GSCStatusBadge } from '../components/DataSourceBadge'
import { GitCompare, Search, ArrowRight, ArrowUp, ArrowDown, Minus, Info, TrendingUp } from 'lucide-react'

const GAP_COLOR = (gap) => {
  if (gap > 0) return '#22C55E'  // you rank higher (lower number = better)
  if (gap < 0) return '#EF4444'
  return '#6B7280'
}

function GapRow({ keyword, yourPos, compPos, gap, device }) {
  return (
    <tr style={{ borderBottom: '1px solid #1F2937' }}>
      <td style={{ padding: '10px 14px', color: '#F9FAFB', fontWeight: 500 }}>{keyword}</td>
      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block', minWidth: 28, textAlign: 'center',
          padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 13,
          background: yourPos <= 10 ? '#22C55E15' : '#1F2937',
          color: yourPos <= 10 ? '#22C55E' : '#E5E7EB',
        }}>
          {yourPos || '—'}
        </span>
      </td>
      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block', minWidth: 28, textAlign: 'center',
          padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 13,
          background: compPos <= 10 ? '#F59E0B15' : '#1F2937',
          color: compPos <= 10 ? '#F59E0B' : '#E5E7EB',
        }}>
          {compPos || '—'}
        </span>
      </td>
      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
        <span style={{ color: GAP_COLOR(gap), fontWeight: 700, fontSize: 13 }}>
          {gap > 0 ? `+${gap}` : gap}
        </span>
      </td>
    </tr>
  )
}

export default function KeywordGap() {
  const [domain, setDomain] = useState('')
  const [competitor, setCompetitor] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('both')  // both | yours | theirs

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!domain.trim() || !competitor.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await api.getKeywordGap(domain.trim(), competitor.trim())
      setData(res)
    } catch (e) { setError(e.message || 'Failed to analyze gap') }
    finally { setLoading(false) }
  }

  const bothRank = data?.both_rank || []
  const yoursOnly = data?.your_only || []
  const theirsOnly = data?.competitor_only || []

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <GitCompare size={26} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Keyword Gap Analysis</h1>
          <DataSourceBadge source={data?.source} />
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 20px', fontSize: 13 }}>
          Compare tracked keywords between your domain and a competitor
        </p>
        <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: 8, maxWidth: 600, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="your-domain.com"
            style={{
              width: 200, padding: '9px 12px', background: '#111827', border: '1px solid #374151',
              borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none',
            }}
          />
          <span style={{ color: '#6B7280', alignSelf: 'center', fontSize: 13 }}>vs</span>
          <input
            value={competitor}
            onChange={(e) => setCompetitor(e.target.value)}
            placeholder="competitor.com"
            style={{
              width: 200, padding: '9px 12px', background: '#111827', border: '1px solid #374151',
              borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none',
            }}
          />
          <button type="submit" style={{
            padding: '9px 20px', background: '#6366F1', border: 'none', borderRadius: 8,
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            <Search size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Compare
          </button>
        </form>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid #374151', borderTopColor: '#6366F1',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          Analyzing keyword gap…
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', maxWidth: 500, margin: '0 auto' }}>
          {error}
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: 50, color: '#4B5563' }}>
          <GitCompare size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter two domains above to compare their tracked keywords</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
            <Info size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Both domains need tracked keywords under Rank Tracking to compare
          </p>
        </div>
      )}

      {data && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Your Keywords', value: data.summary?.your_keywords_tracked || 0, color: '#6366F1' },
              { label: 'Competitor Keywords', value: data.summary?.competitor_keywords_tracked || 0, color: '#F59E0B' },
              { label: 'Both Rank', value: data.summary?.both_rank_count || 0, color: '#22C55E' },
              { label: 'Your Advantage', value: data.summary?.your_only_count || 0, color: '#8B5CF6' },
              { label: 'Competitor Advantage', value: data.summary?.competitor_only_count || 0, color: '#EF4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {[
              { key: 'both', label: `Both Rank (${bothRank.length})` },
              { key: 'yours', label: `Your Advantage (${yoursOnly.length})` },
              { key: 'theirs', label: `Their Advantage (${theirsOnly.length})` },
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

          {/* Table */}
          <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, overflow: 'hidden' }}>
            {tab === 'both' && (
              bothRank.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#6B7280' }}>
                  No keywords tracked by both domains yet
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1F2937' }}>
                      {['Keyword', `Your Position`, `Competitor Position`, 'Gap'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bothRank.map((r, i) => (
                      <GapRow key={i} keyword={r.keyword} yourPos={r.your_position} compPos={r.competitor_position} gap={r.gap} />
                    ))}
                  </tbody>
                </table>
              )
            )}

            {tab === 'yours' && (
              yoursOnly.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#6B7280' }}>
                  No keywords where you rank but competitor doesn't
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1F2937' }}>
                      {['Keyword', 'Your Position', 'Device'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yoursOnly.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1F2937' }}>
                        <td style={{ padding: '10px 14px', color: '#F9FAFB', fontWeight: 500 }}>{r.keyword}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ display: 'inline-block', minWidth: 28, textAlign: 'center', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 13, background: '#22C55E15', color: '#22C55E' }}>
                            {r.position}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#6B7280', fontSize: 12 }}>{r.device || 'desktop'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {tab === 'theirs' && (
              theirsOnly.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#6B7280' }}>
                  No keywords where competitor ranks but you don't
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1F2937' }}>
                      {['Keyword', 'Competitor Position', 'Device'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {theirsOnly.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1F2937' }}>
                        <td style={{ padding: '10px 14px', color: '#F9FAFB', fontWeight: 500 }}>{r.keyword}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ display: 'inline-block', minWidth: 28, textAlign: 'center', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 13, background: '#F59E0B15', color: '#F59E0B' }}>
                            {r.position}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#6B7280', fontSize: 12 }}>{r.device || 'desktop'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>

          {data.note && (
            <div style={{
              marginTop: 14, padding: '10px 14px', background: '#1E293B', border: '1px solid #334155',
              borderRadius: 6, fontSize: 12, color: '#94A3B8', display: 'flex', gap: 8,
            }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {data.note}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
