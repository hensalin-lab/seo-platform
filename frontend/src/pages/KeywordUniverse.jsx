import { useState } from 'react'
import { api } from '../api'
import { FileSearch, Search, Info, Target } from 'lucide-react'

export default function KeywordUniverse() {
  const [domain, setDomain] = useState('')
  const [seed, setSeed] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const discover = async (e) => {
    e.preventDefault()
    if (!domain.trim() || !seed.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await api.getKeywordUniverse(domain.trim(), seed.trim(), 25)
      setData(res)
    } catch (err) { setError(err.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <FileSearch size={26} style={{ color: '#8B5CF6' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Keyword Universe Discovery</h1>
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 18px', fontSize: 13 }}>
          Discover what keywords a competitor organically ranks for — beyond manual tracking
        </p>
        <form onSubmit={discover} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 460, margin: '0 auto' }}>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="competitor.com"
            style={{ padding: '9px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none' }}
          />
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="seed keyword (e.g. seo audit)"
            style={{ padding: '9px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none' }}
          />
          <button type="submit" style={{ padding: '9px 20px', background: '#8B5CF6', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Search size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Discover Keywords
          </button>
        </form>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF' }}>Probing competitor pages… (can take ~30s)</div>}
      {error && <div style={{ textAlign: 'center', padding: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', maxWidth: 500, margin: '0 auto' }}>{error}</div>}

      {data && (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '12px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#8B5CF6' }}>{data.keyword_count}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Keywords discovered</div>
            </div>
            {data.found_pages?.length > 0 && (
              <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '12px 18px', fontSize: 11, color: '#6B7280', flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#9CA3AF', marginBottom: 4 }}>Probed competitor pages</div>
                {data.found_pages.map((p, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#6366F1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</div>
                ))}
              </div>
            )}
          </div>

          {data.note && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#1E293B', border: '1px solid #334155', borderRadius: 6, fontSize: 12, color: '#94A3B8', display: 'flex', gap: 8 }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {data.note}
            </div>
          )}

          {data.keywords?.length > 0 ? (
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', fontWeight: 600, fontSize: 13, color: '#F9FAFB', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Target size={14} style={{ color: '#8B5CF6' }} /> Keywords {data.domain} ranks for
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                {data.keywords.map((kw, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #1F2937', borderRight: '1px solid #1F2937', fontSize: 12, color: '#E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 3, background: '#8B5CF615', color: '#8B5CF6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    {kw}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
              No keywords discovered — the competitor may not rank for that seed, or probing was limited.
            </div>
          )}
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: 50, color: '#4B5563' }}>
          <FileSearch size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter a competitor domain + seed keyword to discover their organic keyword universe</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Fills the "full keyword universe" gap vs SE Ranking / Serpstat</p>
        </div>
      )}
    </div>
  )
}
