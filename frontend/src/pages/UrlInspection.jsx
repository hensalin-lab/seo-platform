import { useState } from 'react'
import { api } from '../api'
import { DataSourceBadge, GSCStatusBadge } from '../components/DataSourceBadge'
import { FileSearch, Search, Info, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function UrlInspection() {
  const [url, setUrl] = useState('')
  const [property, setProperty] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inspect = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await api.getUrlInspection(url.trim(), property.trim())
      setData(res)
    } catch (err) { setError(err.message || 'Failed') }
    finally { setLoading(false) }
  }

  const statusColor = (s) => {
    if (!s) return '#6B7280'
    if (s.includes('INDEXED')) return '#22C55E'
    if (s.includes('ERROR') || s.includes('NOT_FOUND') || s.includes('EXCLUDED')) return '#EF4444'
    if (s.includes('UNAVAILABLE')) return '#F59E0B'
    return '#F59E0B'
  }

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <FileSearch size={26} style={{ color: '#3B82F6' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>URL Inspection</h1>
          <DataSourceBadge source={data?.source} />
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 18px', fontSize: 13 }}>
          Live indexing status via Google Search Console URL Inspection API
        </p>
        <form onSubmit={inspect} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 460, margin: '0 auto' }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yoursite.com/page"
            style={{ padding: '9px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none' }}
          />
          <input
            value={property}
            onChange={(e) => setProperty(e.target.value)}
            placeholder="GSC property URL (optional, e.g. sc-domain:example.com)"
            style={{ padding: '9px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 12, outline: 'none' }}
          />
          <button type="submit" style={{ padding: '9px 20px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Search size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Inspect
          </button>
        </form>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF' }}>Running live inspection…</div>}
      {error && <div style={{ textAlign: 'center', padding: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', maxWidth: 500, margin: '0 auto' }}>{error}</div>}

      {data && (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ background: '#111827', border: `1px solid ${statusColor(data.status)}40`, borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
              {data.status === 'INDEXED' ? <CheckCircle2 size={20} style={{ color: '#22C55E' }} /> : <AlertTriangle size={20} style={{ color: statusColor(data.status) }} />}
              <span style={{ fontSize: 20, fontWeight: 800, color: statusColor(data.status) }}>{data.status || 'UNKNOWN'}</span>
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', wordBreak: 'break-all' }}>{data.url}</div>
          </div>

          {data.note && (
            <div style={{ marginBottom: 20, padding: '10px 14px', background: '#1E293B', border: '1px solid #334155', borderRadius: 6, fontSize: 12, color: '#94A3B8', display: 'flex', gap: 8 }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {data.note}
            </div>
          )}

          {data.status !== 'UNAVAILABLE' && data.source === 'gsc_url_inspection' && data.status !== 'ERROR' && (
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', fontWeight: 600, fontSize: 13, color: '#F9FAFB' }}>Indexing Details</div>
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: 12 }}>
                {[
                  ['Coverage state', data.coverage_state],
                  ['Indexing state', data.indexing_state],
                  ['Page fetch', data.page_fetch_state],
                  ['Last crawl', data.last_crawl_time],
                  ['Crawled as', data.crawled_as],
                  ['Robots.txt', data.robots_txt_state],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                    <div style={{ color: val ? '#E5E7EB' : '#6B7280' }}>{val || '—'}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '0 16px 16px', fontSize: 11, color: '#6B7280' }}>
                <div>Google canonical: <span style={{ color: '#9CA3AF' }}>{data.google_canonical || '—'}</span></div>
                <div>Submitted/User canonical: <span style={{ color: '#9CA3AF' }}>{data.user_canonical || '—'}</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: 50, color: '#4B5563' }}>
          <FileSearch size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter any URL to check its live indexing status</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Requires a connected Google Search Console service account</p>
        </div>
      )}
    </div>
  )
}
