import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { api } from '../api'
import { DataSourceBadge } from '../components/DataSourceBadge'
import {
  TrendingUp, Plus, Trash2, RefreshCw, Download, Monitor, Smartphone,
  ArrowUp, ArrowDown, Minus, Search, BarChart2, MapPin,
  Image, Video, ShoppingCart,
} from 'lucide-react'

const DEVICE_ICONS = { desktop: Monitor, mobile: Smartphone }
const POSITION_COLOR = (pos) => {
  if (!pos) return '#475569'
  if (pos <= 3) return '#22C55E'
  if (pos <= 10) return '#F59E0B'
  if (pos <= 20) return '#F97316'
  return '#EF4444'
}
const DELTA_COLOR = (delta) => {
  const d = delta || ''
  if (d === '—' || d === '=') return '#475569'
  if (d.startsWith('+')) return '#EF4444'
  return '#22C55E'
}
const DELTA_ICON = (delta) => {
  const d = delta || ''
  if (d === '—' || d === '=') return <Minus size={13} />
  return d.startsWith('+') ? <ArrowUp size={13} /> : <ArrowDown size={13} />
}

const SERP_FEATURE_META = [
  { key: 'featured_snippet', label: 'Featured', color: '#6366F1', back: '#6366F110' },
  { key: 'people_also_ask', label: 'PAA', color: '#F59E0B', back: '#F59E0B10' },
  { key: 'ai_overview', label: 'AI Overview', color: '#22C55E', back: '#22C55E10' },
  { key: 'local_pack', label: 'Local', color: '#3B82F6', back: '#3B82F610', Icon: MapPin },
  { key: 'image_pack', label: 'Images', color: '#8B5CF6', back: '#8B5CF610', Icon: Image },
  { key: 'video_pack', label: 'Video', color: '#EF4444', back: '#EF444410', Icon: Video },
  { key: 'shopping', label: 'Shopping', color: '#10B981', back: '#10B98110', Icon: ShoppingCart },
]

const isBranded = (keyword, domain) => {
  if (!keyword || !domain) return false
  const base = domain.replace(/^www\./i, '').split('.')[0].toLowerCase()
  const kw = keyword.toLowerCase()
  return kw.includes(base)
}

const volatilityColor = (score) => {
  if (score == null) return '#94A3B8'
  if (score <= 2) return '#22C55E'
  if (score <= 5) return '#F59E0B'
  return '#EF4444'
}

const VOLATILITY_LABEL = (score) => {
  if (score == null) return 'N/A'
  if (score <= 2) return 'Stable'
  if (score <= 5) return 'Moderate'
  return 'Volatile'
}

function VolatilitySparkline({ history }) {
  if (!history || history.length < 2) {
    return <span style={{ color: '#94A3B8', fontSize: 11 }}>—</span>
  }
  const positions = history.map(h => h.position).filter(p => p != null)
  if (positions.length < 2) return <span style={{ color: '#94A3B8', fontSize: 11 }}>—</span>

  const mean = positions.reduce((a, b) => a + b, 0) / positions.length
  const variance = positions.reduce((a, b) => a + (b - mean) ** 2, 0) / positions.length
  const stdDev = Math.sqrt(variance)

  const maxPos = Math.max(...positions)
  const minPos = Math.min(...positions)
  const range = maxPos - minPos || 1

  const w = 60
  const h = 20
  const points = positions.map((p, i) => {
    const x = (i / (positions.length - 1)) * w
    const y = ((p - minPos) / range) * (h - 4) + 2
    return `${x},${y}`
  }).join(' ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width={w} height={h} style={{ overflow: 'visible' }}>
        <polyline points={points} fill="none" stroke={volatilityColor(stdDev)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: 9, fontWeight: 600, color: volatilityColor(stdDev) }}>
        {stdDev.toFixed(1)} σ
      </span>
    </div>
  )
}

export default function RankTracking() {
  const [domain, setDomain] = useState('')
  const [loadedDomain, setLoadedDomain] = useState('')
  const [keywords, setKeywords] = useState([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newKw, setNewKw] = useState('')
  const [newDevice, setNewDevice] = useState('desktop')
  const [newLocation, setNewLocation] = useState('us')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [historyKw, setHistoryKw] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [filterTab, setFilterTab] = useState('all')
  const [kwHistories, setKwHistories] = useState({})
  const [sparklineLoading, setSparklineLoading] = useState(false)

  const SUGGESTIONS = [
    'seo services', 'seo audit', 'technical seo', 'on page seo',
    'keyword research', 'content marketing', 'link building', 'local seo',
  ]

  const load = useCallback(async (d) => {
    setLoading(true); setError('')
    try {
      const data = await api.listTrackedKeywords(d)
      setKeywords(data?.keywords || [])
      setLoadedDomain(d)
    } catch (e) { setError(e.message || 'Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (keywords.length > 0 && loadedDomain && Object.keys(kwHistories).length === 0) {
      setSparklineLoading(true)
      const fetchHistory = async () => {
        const results = {}
        for (const kw of keywords) {
          try {
            const data = await api.keywordHistory(loadedDomain, kw.id)
            if (data?.history?.length > 1) results[kw.id] = data.history
          } catch { /* skip */ }
        }
        setKwHistories(results)
        setSparklineLoading(false)
      }
      fetchHistory()
    }
  }, [keywords, loadedDomain])

  const handleAdd = async () => {
    if (!newKw.trim() || !loadedDomain) return
    setAdding(true); setError('')
    try {
      await api.addTrackedKeyword(loadedDomain, newKw.trim(), newDevice, newLocation)
      setNewKw(''); setAddOpen(false)
      await load(loadedDomain)
    } catch (e) { setError(e.message || 'Failed to add') }
    finally { setAdding(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this keyword from tracking?')) return
    try { await api.deleteTrackedKeyword(id); setKeywords(ks => ks.filter(k => k.id !== id)) }
    catch (e) { setError(e.message) }
  }

  const handleRefresh = async () => {
    setRefreshing(true); setError('')
    try {
      await api.refreshRankTracking(loadedDomain)
      const poll = [0, 6000, 18000]
      for (const ms of poll) {
        if (ms > 0) await new Promise(r => setTimeout(r, ms))
        try { await load(loadedDomain) } catch { /* best-effort */ }
      }
    } catch (e) { setError(e.message || 'Refresh failed — try again in a minute.') }
    finally { setRefreshing(false) }
  }

  const loadHistory = async (kw) => {
    setHistoryKw(kw); setHistoryLoading(true); setHistory([])
    try {
      const data = await api.keywordHistory(loadedDomain, kw.id)
      setHistory(data?.history || [])
    } catch { setHistory([]) }
    finally { setHistoryLoading(false) }
  }

  const handleSubmitDomain = (e) => {
    e.preventDefault()
    if (domain.trim()) load(domain.trim())
  }

  const quickAdd = async (kw) => {
    if (!loadedDomain || adding) return
    setAdding(true); setError('')
    try {
      await api.addTrackedKeyword(loadedDomain, kw, newDevice, newLocation)
      await load(loadedDomain)
    } catch (e) { setError(e.message || 'Failed to add keyword') }
    finally { setAdding(false) }
  }

  const avgPos = keywords.length
    ? (() => {
        const withPos = keywords.filter(k => k.position)
        if (!withPos.length) return '—'
        return (withPos.reduce((s, k) => s + k.position, 0) / withPos.length).toFixed(1)
      })()
    : '—'

  const filteredKeywords = useMemo(() => {
    if (filterTab === 'all') return keywords
    if (filterTab === 'branded') return keywords.filter(k => isBranded(k.keyword, loadedDomain))
    if (filterTab === 'non-branded') return keywords.filter(k => !isBranded(k.keyword, loadedDomain))
    if (filterTab === 'quick-wins') return keywords.filter(k => k.position && k.position >= 4 && k.position <= 10)
    return keywords
  }, [keywords, filterTab, loadedDomain])

  const brandedCount = keywords.filter(k => isBranded(k.keyword, loadedDomain)).length
  const nonBrandedCount = keywords.length - brandedCount
  const quickWinsCount = keywords.filter(k => k.position && k.position >= 4 && k.position <= 10).length

  return (
    <div style={{ padding: '24px 24px 40px', background: '#F4F6FB', minHeight: '100vh', color: '#0F172A' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <TrendingUp size={28} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Rank Tracking</h1>
          <DataSourceBadge source="ddg" />
        </div>
        <p style={{ color: '#64748B', margin: '0 0 20px', fontSize: 14 }}>Track keyword positions over time for any domain</p>
        <form onSubmit={handleSubmitDomain} style={{ display: 'flex', gap: 8, maxWidth: 520, margin: '0 auto' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              style={{
                width: '100%', padding: '10px 12px 10px 36px', background: '#FFFFFF', border: '1px solid #DAE0EA',
                borderRadius: 8, color: '#0F172A', fontSize: 14, boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '10px 18px', background: '#6366F1', border: 'none', borderRadius: 8,
              color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Track
          </button>
        </form>
      </div>

      {!loadedDomain && !loading && (
        <div style={{ textAlign: 'center', color: '#475569', padding: 60 }}>
          <BarChart2 size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>Enter a domain above to start tracking keyword positions</p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748B' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid #E2E5EA', borderTopColor: '#6366F1',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          Loading keywords…
        </div>
      )}

      {!loading && loadedDomain && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20, maxWidth: 700 }}>
            {[
              { label: 'Keywords', value: keywords.length },
              { label: 'Avg. Position', value: avgPos },
              { label: 'Top 3', value: keywords.filter(k => k.position && k.position <= 3).length },
              { label: 'Top 10', value: keywords.filter(k => k.position && k.position <= 10).length },
              { label: 'Branded', value: brandedCount, color: '#6366F1' },
              { label: 'Non-Branded', value: nonBrandedCount, color: '#10B981' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8,
                padding: '12px 14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: color || '#0F172A' }}>{value}</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          {loadedDomain && keywords.length > 0 && avgPos === '—' && (
            <div style={{ maxWidth: 700, marginBottom: 16, padding: '10px 14px', background: '#F1F4F9', border: '1px solid #DAE0EA', borderRadius: 8, fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={13} color="#6366F1" />
              <span>Rankings haven't been fetched yet — click <strong>"Refresh all"</strong> to run the first position check.</span>
            </div>
          )}

          {keywords.length < 15 && (
            <div style={{ marginBottom: 16, maxWidth: 700 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Quick add</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SUGGESTIONS.filter(s => !keywords.some(k => k.keyword.toLowerCase() === s.toLowerCase())).map(s => (
                  <button key={s} onClick={() => quickAdd(s)} disabled={adding} title={`Track "${s}"`}
                    style={{ padding: '5px 10px', border: '1px solid #DAE0EA', borderRadius: 6, background: '#E5E9F2', color: '#0F172A', fontSize: 11, cursor: adding ? 'wait' : 'pointer', opacity: adding ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setAddOpen(!addOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: '#6366F1', border: 'none', borderRadius: 6, color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Add keyword
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: '#E5E9F2', border: '1px solid #DAE0EA', borderRadius: 6,
                color: '#0F172A', fontSize: 13, cursor: refreshing ? 'wait' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh all
            </button>
            <button
              onClick={async () => {
                try { await api.downloadRankTrackingCsv(loadedDomain); }
                catch (e) { setError(e.message || 'Export failed') }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: '#E5E9F2', border: '1px solid #DAE0EA', borderRadius: 6,
                color: '#0F172A', fontSize: 13, textDecoration: 'none',
              }}
            >
              <Download size={14} /> Export CSV
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {[
                { key: 'all', label: 'All', count: keywords.length },
                { key: 'branded', label: 'Branded', count: brandedCount },
                { key: 'non-branded', label: 'Non-Branded', count: nonBrandedCount },
                { key: 'quick-wins', label: `Quick Wins (${quickWinsCount})`, count: quickWinsCount },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilterTab(key)}
                  style={{
                    padding: '5px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    background: filterTab === key ? '#6366F1' : '#E5E9F2',
                    color: filterTab === key ? '#fff' : '#64748B',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {addOpen && (
            <div style={{
              background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8,
              padding: 16, marginBottom: 16, maxWidth: 500,
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  value={newKw}
                  onChange={(e) => setNewKw(e.target.value)}
                  placeholder="Enter keyword…"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  style={{
                    flex: 1, padding: '8px 10px', background: '#E5E9F2', border: '1px solid #DAE0EA',
                    borderRadius: 6, color: '#0F172A', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <select
                  value={newDevice}
                  onChange={(e) => setNewDevice(e.target.value)}
                  style={{
                    padding: '6px 10px', background: '#E5E9F2', border: '1px solid #DAE0EA',
                    borderRadius: 6, color: '#0F172A', fontSize: 12,
                  }}
                >
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  style={{
                    padding: '6px 10px', background: '#E5E9F2', border: '1px solid #DAE0EA',
                    borderRadius: 6, color: '#0F172A', fontSize: 12,
                  }}
                >
                  <option value="us">United States</option>
                  <option value="uk">United Kingdom</option>
                  <option value="ca">Canada</option>
                  <option value="au">Australia</option>
                </select>
                <button
                  onClick={handleAdd}
                  disabled={adding || !newKw.trim()}
                  style={{
                    padding: '8px 16px', background: '#22C55E', border: 'none', borderRadius: 6,
                    color: '#fff', fontSize: 13, fontWeight: 600, cursor: adding ? 'wait' : 'pointer',
                    opacity: adding || !newKw.trim() ? 0.5 : 1,
                  }}
                >
                  {adding ? 'Adding…' : 'Add'}
                </button>
                <button
                  onClick={() => { setAddOpen(false); setNewKw('') }}
                  style={{
                    padding: '8px 12px', background: 'transparent', border: '1px solid #DAE0EA',
                    borderRadius: 6, color: '#64748B', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
              {error && <div style={{ color: '#EF4444', fontSize: 12 }}>{error}</div>}
            </div>
          )}

          {filteredKeywords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
              <p>{filterTab === 'all' ? 'No keywords tracked yet. Click "Add keyword" to start.' : `No ${filterTab} keywords found.`}</p>
            </div>
          ) : (
            <div style={{
              background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8,
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #DAE0EA' }}>
                    {['Keyword', 'Type', 'Device', 'Position', 'Δ', 'SERP Features', 'Volatility', 'Last Checked', ''].map(h => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: 'left', color: '#475569',
                        fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.map((kw) => {
                    const DevIcon = DEVICE_ICONS[kw.device] || Monitor
                    const branded = isBranded(kw.keyword, loadedDomain)
                    const kwHistory = kwHistories[kw.id]
                    return (
                      <tr key={kw.id} style={{ borderBottom: '1px solid #DAE0EA' }}>
                        <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: 500 }}>
                          {kw.keyword}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '1px 6px', borderRadius: 3,
                            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                            background: branded ? '#6366F115' : '#10B98115',
                            color: branded ? '#6366F1' : '#10B981',
                          }}>
                            {branded ? 'Brand' : 'Non'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748B' }}>
                          <DevIcon size={14} />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            display: 'inline-block', minWidth: 28, textAlign: 'center',
                            padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 14,
                            background: kw.position ? `${POSITION_COLOR(kw.position)}15` : '#E5E9F2',
                            color: POSITION_COLOR(kw.position),
                          }}>
                            {kw.position || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: DELTA_COLOR(kw.delta), fontWeight: 600, fontSize: 12 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {DELTA_ICON(kw.delta)} {kw.delta}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {SERP_FEATURE_META.map(({ key, label, color, back, Icon }) => {
                            if (!kw.serp_features?.[key]) return null
                            return (
                              <span key={key} style={{ padding: '1px 6px', background: back, color, borderRadius: 3, fontSize: 9, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                {Icon && <Icon size={9} />}
                                {label}
                              </span>
                            )
                          })}
                          {!SERP_FEATURE_META.some(({ key }) => kw.serp_features?.[key]) && (
                            <span style={{ color: '#8B93A7', fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', minWidth: 70 }}>
                          <VolatilitySparkline history={kwHistory} />
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569', fontSize: 11 }}>
                          {kw.checked_at ? new Date(kw.checked_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </td>
                        <td style={{ padding: '10px 12px', display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => loadHistory(kw)}
                            title="View history"
                            style={{ background: 'transparent', border: 'none', color: '#6366F1', cursor: 'pointer', padding: 4 }}
                          >
                            <BarChart2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(kw.id)}
                            title="Remove"
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {historyKw && (
            <div style={{
              marginTop: 20, background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                  Position History: <span style={{ color: '#6366F1' }}>{historyKw.keyword}</span>
                </h3>
                <button
                  onClick={() => { setHistoryKw(null); setHistory([]) }}
                  style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13 }}
                >
                  ✕ Close
                </button>
              </div>
              {historyLoading ? (
                <div style={{ color: '#475569', padding: 20, textAlign: 'center' }}>Loading…</div>
              ) : history.length === 0 ? (
                <div style={{ color: '#475569', padding: 20, textAlign: 'center' }}>No history yet</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, padding: '12px 0' }}>
                  {history.slice().reverse().map((snap, i) => {
                    const pos = snap.position || 0
                    const barH = Math.max(10, Math.min(100, 100 - (pos * 2.5)))
                    return (
                      <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                        <div
                          style={{
                            height: barH, background: POSITION_COLOR(pos), borderRadius: '3px 3px 0 0',
                            minWidth: 8, maxWidth: 28, margin: '0 auto', opacity: 0.8,
                          }}
                          title={`${pos} — ${snap.checked_at ? new Date(snap.checked_at).toLocaleDateString() : ''}`}
                        />
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{pos}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}
