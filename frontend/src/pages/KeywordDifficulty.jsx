import { useState } from 'react'
import { api } from '../api'
import { DataSourceBadge, GSCStatusBadge } from '../components/DataSourceBadge'
import { Gauge, Search, ExternalLink, Info } from 'lucide-react'

function DifficultyGauge({ score }) {
  const color = score >= 70 ? '#EF4444' : score >= 40 ? '#F59E0B' : '#22C55E'
  const label = score >= 70 ? 'Hard' : score >= 40 ? 'Medium' : 'Easy'
  return (
    <div style={{ textAlign: 'center', padding: 28, background: '#111827', border: '1px solid #1F2937', borderRadius: 12, maxWidth: 320, margin: '0 auto 20px' }}>
      <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 12px' }}>
        <svg viewBox="0 0 140 140" width="140" height="140">
          <circle cx="70" cy="70" r="60" fill="none" stroke="#1F2937" strokeWidth="12" />
          <circle
            cx="70" cy="70" r="60" fill="none"
            stroke={color} strokeWidth="12"
            strokeDasharray={`${(score / 100) * 377} 377`}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 30, fontWeight: 800, color }}>{score}</span>
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>/ 100</span>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  )
}

export default function KeywordDifficulty() {
  const [keyword, setKeyword] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const analyze = async (e) => {
    e.preventDefault()
    if (!keyword.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await api.getKeywordDifficulty(keyword.trim())
      setData(res)
    } catch (err) { setError(err.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <Gauge size={26} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Keyword Difficulty</h1>
          <DataSourceBadge source={data?.source} />
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 18px', fontSize: 13 }}>
          Real competitive difficulty (0–100) from SERP analysis of the ranking domains
        </p>
        <form onSubmit={analyze} style={{ display: 'flex', gap: 8, maxWidth: 460, margin: '0 auto' }}>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. best seo tools"
            style={{
              flex: 1, padding: '9px 12px', background: '#111827', border: '1px solid #374151',
              borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none',
            }}
          />
          <button type="submit" style={{
            padding: '9px 20px', background: '#6366F1', border: 'none', borderRadius: 8,
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            <Search size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Analyze
          </button>
        </form>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF' }}>Analyzing SERP…</div>}
      {error && <div style={{ textAlign: 'center', padding: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', maxWidth: 500, margin: '0 auto' }}>{error}</div>}

      {data?.difficulty != null && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <DifficultyGauge score={data.difficulty} />
          {data.note && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#1E293B', border: '1px solid #334155', borderRadius: 6, fontSize: 12, color: '#94A3B8', display: 'flex', gap: 8 }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {data.note}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB' }}>{data.top10_da_avg}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Avg. DA of top 10</div>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB' }}>{Math.round((data.strong_domain_pct || 0) * 100)}%</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Strong domains (DA ≥ 40)</div>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB' }}>{data.serp_overview?.length || 0}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Ranking pages analyzed</div>
            </div>
          </div>

          {data.serp_overview?.length > 0 && (
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', fontWeight: 600, fontSize: 13, color: '#F9FAFB' }}>SERP Overview</div>
              {data.serp_overview.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 4, background: i < 3 ? '#6366F115' : '#1F2937', color: i < 3 ? '#818CF8' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || r.domain}</div>
                    <div style={{ fontSize: 11, color: '#6366F1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.domain} <ExternalLink size={9} style={{ verticalAlign: 'middle' }} />
                    </div>
                    {r.snippet && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.snippet}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', flexShrink: 0, textAlign: 'right' }}>
                    <div>DA</div>
                    <strong style={{ color: r.referring_strength >= 40 ? '#22C55E' : r.referring_strength >= 15 ? '#F59E0B' : '#EF4444' }}>{r.referring_strength}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: 50, color: '#4B5563' }}>
          <Gauge size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter a keyword to see its competitive difficulty</p>
        </div>
      )}
    </div>
  )
}
