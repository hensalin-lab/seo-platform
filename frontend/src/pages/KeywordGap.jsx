import { useState, useMemo } from 'react'
import { api } from '../api'
import { DataSourceBadge } from '../components/DataSourceBadge'
import { UpgradeCallout } from '../components/UpgradeCallout'
import { GitCompare, Search, Info, Zap } from 'lucide-react'

const GAP_COLOR = (gap) => {
  if (gap > 0) return '#22C55E'
  if (gap < 0) return '#EF4444'
  return '#475569'
}

const isBranded = (keyword, domain) => {
  if (!keyword || !domain) return false
  const base = domain.replace(/^www\./i, '').split('.')[0].toLowerCase()
  return keyword.toLowerCase().includes(base)
}

const classifyContentFormat = (keyword) => {
  const kw = (keyword || '').toLowerCase()
  if (/\b(best|top|list|\d+\s+(best|top|tools?|apps?|ways?|tips?))\b/.test(kw)) return { label: 'Listicle', color: '#8B5CF6', back: '#8B5CF610' }
  if (/\b(vs\.?|versus|compared|alternative|or)\b/.test(kw)) return { label: 'Comparison', color: '#3B82F6', back: '#3B82F610' }
  if (/\b(how to|guide|tutorial|tips|steps?|way to)\b/.test(kw)) return { label: 'How-To', color: '#10B981', back: '#10B98110' }
  if (/\b(review|pricing|features?|cost|plan|demo)\b/.test(kw)) return { label: 'Product', color: '#F59E0B', back: '#F59E0B10' }
  return { label: 'General', color: '#64748B', back: '#F1F4F9' }
}

function GapRow({ keyword, yourPos, compPos, gap, device, domain }) {
  const branded = isBranded(keyword, domain)
  const fmt = classifyContentFormat(keyword)
  return (
    <tr style={{ borderBottom: '1px solid #DAE0EA' }}>
      <td style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 500 }}>{keyword}</td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{
          display: 'inline-block', padding: '1px 6px', borderRadius: 3,
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          background: branded ? '#6366F115' : '#10B98115',
          color: branded ? '#6366F1' : '#10B981',
        }}>
          {branded ? 'Brand' : 'Non'}
        </span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{
          display: 'inline-block', padding: '1px 6px', borderRadius: 3,
          fontSize: 9, fontWeight: 600, background: fmt.back, color: fmt.color,
        }}>
          {fmt.label}
        </span>
      </td>
      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block', minWidth: 28, textAlign: 'center',
          padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 13,
          background: yourPos <= 10 ? '#22C55E15' : '#E5E9F2',
          color: yourPos <= 10 ? '#22C55E' : '#475569',
        }}>
          {yourPos || '—'}
        </span>
      </td>
      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block', minWidth: 28, textAlign: 'center',
          padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 13,
          background: compPos <= 10 ? '#F59E0B15' : '#E5E9F2',
          color: compPos <= 10 ? '#F59E0B' : '#475569',
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

function TheirsRow({ keyword, compPos, device, opportunity, score_source, opportunity_band, domain }) {
  const branded = isBranded(keyword, domain)
  const fmt = classifyContentFormat(keyword)
  return (
    <tr style={{ borderBottom: '1px solid #DAE0EA' }}>
      <td style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 500 }}>{keyword}</td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{
          display: 'inline-block', padding: '1px 6px', borderRadius: 3,
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          background: branded ? '#6366F115' : '#10B98115',
          color: branded ? '#6366F1' : '#10B981',
        }}>
          {branded ? 'Brand' : 'Non'}
        </span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{
          display: 'inline-block', padding: '1px 6px', borderRadius: 3,
          fontSize: 9, fontWeight: 600, background: fmt.back, color: fmt.color,
        }}>
          {fmt.label}
        </span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{
          display: 'inline-block', minWidth: 28, textAlign: 'center', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 13, background: '#F59E0B15', color: '#F59E0B',
        }}>
          {compPos}
        </span>
      </td>
      <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12 }}>{device || 'desktop'}</td>
      <td style={{ padding: '10px 14px' }}>
        {typeof opportunity === 'number' ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 4,
            fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
            background: (opportunity >= 60 ? '#22C55E15' : opportunity >= 40 ? '#F59E0B15' : '#FDE8E8'),
            color: (opportunity >= 60 ? '#16A34A' : opportunity >= 40 ? '#B45309' : '#DC2626'),
          }} title={`Opportunity = (101 - competitor_position) × estimated_volume × gap_multiplier. Source: ${score_source || 'unknown'}. Band: ${opportunity_band || 'N/A'}. Higher = easier to outrank.`}>
            <Zap size={10} />
            {opportunity} {opportunity_band || ''}
          </span>
        ) : (
          <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
        )}
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
  const [tab, setTab] = useState('both')
  const [excludeBranded, setExcludeBranded] = useState(false)

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

  const bothRank = useMemo(() => {
    const raw = data?.both_rank || []
    if (!excludeBranded) return raw
    return raw.filter(r => !isBranded(r.keyword, domain))
  }, [data, excludeBranded, domain])

  const yoursOnly = useMemo(() => {
    const raw = data?.your_only || []
    if (!excludeBranded) return raw
    return raw.filter(r => !isBranded(r.keyword, domain))
  }, [data, excludeBranded, domain])

  const theirsOnly = useMemo(() => {
    const raw = data?.competitor_only || []
    if (!excludeBranded) return raw
    return raw.filter(r => !isBranded(r.keyword, domain))
  }, [data, excludeBranded, domain])

  const quickWins = useMemo(() => {
    return theirsOnly.filter(r => r.position && r.position >= 4 && r.position <= 10)
  }, [theirsOnly])

  const gapSource = useMemo(() => {
    if (data?.source) return data.source
    const rows = [...(data?.competitor_only || []), ...(data?.both_rank || []), ...(data?.your_only || [])]
    return rows.find(r => r.score_source && r.score_source !== 'unknown')?.score_source
  }, [data])

  return (
    <div style={{ padding: '24px 24px 40px', background: '#F4F6FB', minHeight: '100vh', color: '#0F172A' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <GitCompare size={26} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Keyword Gap Analysis</h1>
          <DataSourceBadge source={data?.source} />
        </div>
        <p style={{ color: '#64748B', margin: '0 0 20px', fontSize: 13 }}>
          Compare tracked keywords between your domain and a competitor
        </p>
        <UpgradeCallout source={gapSource} capability="serp_ranks" />
        <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: 8, maxWidth: 600, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="your-domain.com"
            style={{
              width: 200, padding: '9px 12px', background: '#FFFFFF', border: '1px solid #DAE0EA',
              borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none',
            }}
          />
          <span style={{ color: '#475569', alignSelf: 'center', fontSize: 13 }}>vs</span>
          <input
            value={competitor}
            onChange={(e) => setCompetitor(e.target.value)}
            placeholder="competitor.com"
            style={{
              width: 200, padding: '9px 12px', background: '#FFFFFF', border: '1px solid #DAE0EA',
              borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none',
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
        <div style={{ textAlign: 'center', padding: 50, color: '#64748B' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid #E2E5EA', borderTopColor: '#6366F1',
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
        <div style={{ textAlign: 'center', padding: 50, color: '#8B93A7' }}>
          <GitCompare size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter two domains above to compare their tracked keywords</p>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>
            <Info size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Both domains need tracked keywords under Rank Tracking to compare
          </p>
        </div>
      )}

      {data && (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Your Keywords', value: data.summary?.your_keywords_tracked || 0, color: '#6366F1' },
              { label: 'Competitor Keywords', value: data.summary?.competitor_keywords_tracked || 0, color: '#F59E0B' },
              { label: 'Both Rank', value: bothRank.length, color: '#22C55E' },
              { label: 'Your Advantage', value: yoursOnly.length, color: '#8B5CF6' },
              { label: 'Their Advantage', value: theirsOnly.length, color: '#EF4444' },
              { label: 'Quick Wins', value: quickWins.length, color: '#10B981' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { key: 'both', label: `Both Rank (${bothRank.length})` },
              { key: 'yours', label: `Your Advantage (${yoursOnly.length})` },
              { key: 'theirs', label: `Their Advantage (${theirsOnly.length})` },
              { key: 'quick-wins', label: `Quick Wins (${quickWins.length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: tab === key ? (key === 'quick-wins' ? '#10B981' : '#6366F1') : '#E5E9F2',
                  color: tab === key ? '#fff' : '#64748B',
                }}
              >
                {label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={excludeBranded}
                  onChange={(e) => setExcludeBranded(e.target.checked)}
                  style={{ accentColor: '#6366F1' }}
                />
                Exclude branded
              </label>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, overflow: 'hidden' }}>
            {tab === 'both' && (
              bothRank.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#475569' }}>
                  {excludeBranded ? 'No non-branded keywords tracked by both' : 'No keywords tracked by both domains yet'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #DAE0EA' }}>
                      {['Keyword', 'Type', 'Format', 'Your Position', 'Competitor Position', 'Gap'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bothRank.map((r, i) => (
                      <GapRow key={i} keyword={r.keyword} yourPos={r.your_position} compPos={r.competitor_position} gap={r.gap} domain={domain} />
                    ))}
                  </tbody>
                </table>
              )
            )}

            {tab === 'yours' && (
              yoursOnly.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#475569' }}>
                  {excludeBranded ? 'No non-branded keywords where you rank' : 'No keywords where you rank but competitor doesn\'t'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #DAE0EA' }}>
                      {['Keyword', 'Type', 'Format', 'Your Position', 'Device'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yoursOnly.map((r, i) => {
                      const branded = isBranded(r.keyword, domain)
                      const fmt = classifyContentFormat(r.keyword)
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #DAE0EA' }}>
                          <td style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 500 }}>{r.keyword}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: branded ? '#6366F115' : '#10B98115', color: branded ? '#6366F1' : '#10B981' }}>
                              {branded ? 'Brand' : 'Non'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 600, background: fmt.back, color: fmt.color }}>{fmt.label}</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ display: 'inline-block', minWidth: 28, textAlign: 'center', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 13, background: '#22C55E15', color: '#22C55E' }}>
                              {r.position}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12 }}>{r.device || 'desktop'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            )}

            {tab === 'theirs' && (
              theirsOnly.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#475569' }}>
                  {excludeBranded ? 'No non-branded keywords where competitor ranks' : 'No keywords where competitor ranks but you don\'t'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #DAE0EA' }}>
                      {['Keyword', 'Type', 'Format', 'Competitor Position', 'Device', 'Opportunity'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {theirsOnly.map((r, i) => (
                      <TheirsRow key={i} keyword={r.keyword} compPos={r.position} device={r.device} opportunity={r.opportunity} score_source={r.score_source} opportunity_band={r.opportunity_band} domain={domain} />
                    ))}
                  </tbody>
                </table>
              )
            )}

            {tab === 'quick-wins' && (
              quickWins.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#475569' }}>
                  No quick wins found — competitor ranks 4–10 for these keywords and you don't rank at all
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #DAE0EA' }}>
                      {['Keyword', 'Type', 'Format', 'Competitor Pos', 'Opportunity', 'Action'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quickWins.map((r, i) => {
                      const branded = isBranded(r.keyword, domain)
                      const fmt = classifyContentFormat(r.keyword)
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #DAE0EA', background: '#F0FDF4' }}>
                          <td style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 600 }}>{r.keyword}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: branded ? '#6366F115' : '#10B98115', color: branded ? '#6366F1' : '#10B981' }}>
                              {branded ? 'Brand' : 'Non'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 600, background: fmt.back, color: fmt.color }}>{fmt.label}</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ display: 'inline-block', minWidth: 28, textAlign: 'center', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 13, background: '#F59E0B15', color: '#F59E0B' }}>
                              {r.position}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {typeof r.opportunity === 'number' ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 8px', borderRadius: 4,
                                fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
                                background: (r.opportunity >= 60 ? '#22C55E15' : r.opportunity >= 40 ? '#F59E0B15' : '#FDE8E8'),
                                color: (r.opportunity >= 60 ? '#16A34A' : r.opportunity >= 40 ? '#B45309' : '#DC2626'),
                              }} title={`Opportunity = (101 - competitor_position) × volume × gap_multiplier. Source: ${r.score_source || 'unknown'}. Band: ${r.opportunity_band || 'N/A'}.`}>
                                <Zap size={10} />
                                {r.opportunity} {r.opportunity_band || ''}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>Create content</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            )}
          </div>

          {data.note && (
            <div style={{
              marginTop: 14, padding: '10px 14px', background: '#F1F4F9', border: '1px solid #334155',
              borderRadius: 6, fontSize: 12, color: '#64748B', display: 'flex', gap: 8,
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
