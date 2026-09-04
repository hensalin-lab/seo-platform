import { useState } from 'react'
import { api } from '../api'
import { DataSourceBadge, GSCStatusBadge } from '../components/DataSourceBadge'
import { Search, Info, Layers } from 'lucide-react'

function FlowBar({ label, value, color, desc }) {
  return (
    <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#F9FAFB' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      </div>
      <div style={{ height: 8, background: '#1F2937', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>{desc}</div>
    </div>
  )
}

export default function TrustFlow() {
  const [domain, setDomain] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const analyze = async (e) => {
    e.preventDefault()
    if (!domain.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await api.getTrustFlow(domain.trim())
      setData(res)
    } catch (err) { setError(err.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <Layers size={26} style={{ color: '#F59E0B' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Trust Flow / Citation Flow</h1>
          <DataSourceBadge source={data?.source} />
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 18px', fontSize: 13 }}>
          Majestic-style two-metric link quality — trust vs raw link popularity
        </p>
        <form onSubmit={analyze} style={{ display: 'flex', gap: 8, maxWidth: 460, margin: '0 auto' }}>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            style={{ flex: 1, padding: '9px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none' }}
          />
          <button type="submit" style={{ padding: '9px 20px', background: '#F59E0B', border: 'none', borderRadius: 8, color: '#1F2937', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Search size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Analyze
          </button>
        </form>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF' }}>Analyzing link quality…</div>}
      {error && <div style={{ textAlign: 'center', padding: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', maxWidth: 500, margin: '0 auto' }}>{error}</div>}

      {data && (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <FlowBar label="Trust Flow" value={data.trust_flow} color="#22C55E" desc="Quality of the link neighborhood — share of links from trusted high-authority sites" />
            <FlowBar label="Citation Flow" value={data.citation_flow} color="#6366F1" desc="Raw link popularity — influence regardless of quality" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB' }}>{data.trust_citation_ratio}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Trust : Citation ratio</div>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB' }}>{data.referring_domains}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Referring domains</div>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: data.toxic_links > 0 ? '#EF4444' : '#22C55E' }}>{data.toxic_links}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Toxic links</div>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB' }}>{data.trusted_links}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Trusted links</div>
            </div>
          </div>

          {data.note && (
            <div style={{ padding: '10px 14px', background: '#1E293B', border: '1px solid #334155', borderRadius: 6, fontSize: 12, color: '#94A3B8', display: 'flex', gap: 8 }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {data.note}
            </div>
          )}
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: 50, color: '#4B5563' }}>
          <Layers size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter a domain to see its link neighborhood quality</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Refresh backlinks for this domain first if there's no data</p>
        </div>
      )}
    </div>
  )
}
