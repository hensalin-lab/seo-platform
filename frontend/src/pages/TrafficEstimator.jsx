import { useState } from 'react'
import { api } from '../api'
import { TrendingUp, Search, Info, BarChart3 } from 'lucide-react'

export default function TrafficEstimator() {
  const [domain, setDomain] = useState('')
  const [isOwn, setIsOwn] = useState(false)
  const [property, setProperty] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const estimate = async (e) => {
    e.preventDefault()
    if (!domain.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await api.getTrafficEstimate(domain.trim(), isOwn, property.trim())
      setData(res)
    } catch (err) { setError(err.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <TrendingUp size={26} style={{ color: '#10B981' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Organic Traffic Estimator</h1>
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 18px', fontSize: 13 }}>
          Estimate monthly organic visits — real GSC data for your domains, DDG-based estimate for any domain
        </p>
        <form onSubmit={estimate} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 460, margin: '0 auto' }}>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="competitor.com"
            style={{ padding: '9px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9CA3AF', cursor: 'pointer' }}>
            <input type="checkbox" checked={isOwn} onChange={(e) => setIsOwn(e.target.checked)} />
            This is my own domain (use connected Google Search Console data)
          </label>
          {isOwn && (
            <input
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              placeholder="sc-domain:https://example.com (GSC property URL)"
              style={{ padding: '9px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 12, outline: 'none' }}
            />
          )}
          <button type="submit" style={{ padding: '9px 20px', background: '#10B981', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Search size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Estimate
          </button>
        </form>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF' }}>Estimating traffic…</div>}
      {error && <div style={{ textAlign: 'center', padding: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', maxWidth: 500, margin: '0 auto' }}>{error}</div>}

      {data && !data.error && (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '16px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>
                {data.estimated_monthly_visits?.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Monthly est. visits</div>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '16px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: data.is_estimate ? '#F59E0B' : '#22C55E' }}>
                {data.is_estimate ? 'Estimate' : 'Real'}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Data source</div>
            </div>
            {data.total_clicks != null && (
              <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '16px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#22C55E' }}>{data.total_clicks?.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>GSC clicks (28d)</div>
              </div>
            )}
          </div>

          {data.note && (
            <div style={{ marginBottom: 20, padding: '10px 14px', background: '#1E293B', border: '1px solid #334155', borderRadius: 6, fontSize: 12, color: '#94A3B8', display: 'flex', gap: 8 }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {data.note}
            </div>
          )}

          {data.keywords_analyzed?.length > 0 && (
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', fontWeight: 600, fontSize: 13, color: '#F9FAFB', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={14} style={{ color: '#10B981' }} /> Per-Keyword Breakdown
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1F2937' }}>
                    {['Keyword', 'Position', 'Est. Volume', 'CTR', 'Est. Visits'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#6B7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.keywords_analyzed.map((k, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1F2937' }}>
                      <td style={{ padding: '9px 14px', color: '#F9FAFB' }}>{k.keyword}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ padding: '1px 7px', borderRadius: 4, background: k.position <= 3 ? '#22C55E15' : k.position <= 10 ? '#F59E0B15' : '#1F2937', color: k.position <= 3 ? '#22C55E' : k.position <= 10 ? '#F59E0B' : '#9CA3AF', fontWeight: 600 }}>{k.position}</span>
                      </td>
                      <td style={{ padding: '9px 14px', color: '#9CA3AF' }}>{k.estimated_volume?.toLocaleString()}</td>
                      <td style={{ padding: '9px 14px', color: '#9CA3AF' }}>{(k.ctr * 100).toFixed(1)}%</td>
                      <td style={{ padding: '9px 14px', color: '#10B981', fontWeight: 600 }}>{k.estimated_monthly_visits?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: 50, color: '#4B5563' }}>
          <TrendingUp size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter any domain to estimate its organic search traffic</p>
        </div>
      )}
    </div>
  )
}
