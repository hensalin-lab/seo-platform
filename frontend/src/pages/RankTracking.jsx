import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import { DataSourceBadge, GSCStatusBadge } from '../components/DataSourceBadge'
import { TrendingUp, Plus, Trash2, RefreshCw, Download, Monitor, Smartphone, ArrowUp, ArrowDown, Minus, Search, BarChart2 } from 'lucide-react'

const DEVICE_ICONS = { desktop: Monitor, mobile: Smartphone }
const POSITION_COLOR = (pos) => {
  if (!pos) return '#6B7280'
  if (pos <= 3) return '#22C55E'
  if (pos <= 10) return '#F59E0B'
  if (pos <= 20) return '#F97316'
  return '#EF4444'
}
const DELTA_COLOR = (delta) => {
  if (delta === '—' || delta === '=') return '#6B7280'
  if (delta.startsWith('+')) return '#EF4444'
  return '#22C55E'
}
const DELTA_ICON = (delta) => {
  if (delta === '—' || delta === '=') return <Minus size={13} />
  return delta.startsWith('+') ? <ArrowUp size={13} /> : <ArrowDown size={13} />
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

  const load = useCallback(async (d) => {
    setLoading(true); setError('')
    try {
      const data = await api.listTrackedKeywords(d)
      setKeywords(data?.keywords || [])
      setLoadedDomain(d)
    } catch (e) { setError(e.message || 'Failed to load') }
    finally { setLoading(false) }
  }, [])

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
    setRefreshing(true)
    try { await api.refreshRankTracking(loadedDomain) }
    catch (e) { setError(e.message) }
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

  const avgPos = keywords.length
    ? (keywords.reduce((s, k) => s + (k.position || 0), 0) / keywords.length).toFixed(1)
    : '—'

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      {/* Domain Input Hero */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <TrendingUp size={28} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Rank Tracking</h1>
          <DataSourceBadge source={data?.source} />
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 20px', fontSize: 14 }}>Track keyword positions over time for any domain</p>
        <form onSubmit={handleSubmitDomain} style={{ display: 'flex', gap: 8, maxWidth: 520, margin: '0 auto' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              style={{
                width: '100%', padding: '10px 12px 10px 36px', background: '#111827', border: '1px solid #374151',
                borderRadius: 8, color: '#F9FAFB', fontSize: 14, boxSizing: 'border-box', outline: 'none',
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
        <div style={{ textAlign: 'center', color: '#6B7280', padding: 60 }}>
          <BarChart2 size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>Enter a domain above to start tracking keyword positions</p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid #374151', borderTopColor: '#6366F1',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          Loading keywords…
        </div>
      )}

      {!loading && loadedDomain && (
        <>
          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20, maxWidth: 600 }}>
            {[
              { label: 'Keywords', value: keywords.length },
              { label: 'Avg. Position', value: avgPos },
              { label: 'Top 3', value: keywords.filter(k => k.position && k.position <= 3).length },
              { label: 'Top 10', value: keywords.filter(k => k.position && k.position <= 10).length },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: '#111827', border: '1px solid #1F2937', borderRadius: 8,
                padding: '12px 14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#F9FAFB' }}>{value}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Actions bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
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
                background: '#1F2937', border: '1px solid #374151', borderRadius: 6,
                color: '#E5E7EB', fontSize: 13, cursor: refreshing ? 'wait' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh all
            </button>
            <a
              href={api.exportRankTrackingCsv(loadedDomain)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: '#1F2937', border: '1px solid #374151', borderRadius: 6,
                color: '#E5E7EB', fontSize: 13, textDecoration: 'none',
              }}
            >
              <Download size={14} /> Export CSV
            </a>
          </div>

          {/* Add keyword form */}
          {addOpen && (
            <div style={{
              background: '#111827', border: '1px solid #374151', borderRadius: 8,
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
                    flex: 1, padding: '8px 10px', background: '#1F2937', border: '1px solid #374151',
                    borderRadius: 6, color: '#F9FAFB', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <select
                  value={newDevice}
                  onChange={(e) => setNewDevice(e.target.value)}
                  style={{
                    padding: '6px 10px', background: '#1F2937', border: '1px solid #374151',
                    borderRadius: 6, color: '#E5E7EB', fontSize: 12,
                  }}
                >
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  style={{
                    padding: '6px 10px', background: '#1F2937', border: '1px solid #374151',
                    borderRadius: 6, color: '#E5E7EB', fontSize: 12,
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
                    padding: '8px 12px', background: 'transparent', border: '1px solid #374151',
                    borderRadius: 6, color: '#9CA3AF', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
              {error && <div style={{ color: '#EF4444', fontSize: 12 }}>{error}</div>}
            </div>
          )}

          {/* Keywords table */}
          {keywords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
              <p>No keywords tracked yet. Click <strong>"Add keyword"</strong> to start.</p>
            </div>
          ) : (
            <div style={{
              background: '#111827', border: '1px solid #1F2937', borderRadius: 8,
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1F2937' }}>
                    {['Keyword', 'Device', 'Position', 'Δ', 'SERP Features', 'Last Checked', ''].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left', color: '#6B7280',
                        fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw) => {
                    const DevIcon = DEVICE_ICONS[kw.device] || Monitor
                    return (
                      <tr key={kw.id} style={{ borderBottom: '1px solid #1F2937' }}>
                        <td style={{ padding: '10px 14px', color: '#F9FAFB', fontWeight: 500 }}>
                          {kw.keyword}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#9CA3AF' }}>
                          <DevIcon size={14} />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-block', minWidth: 28, textAlign: 'center',
                            padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 14,
                            background: kw.position ? `${POSITION_COLOR(kw.position)}15` : '#1F2937',
                            color: POSITION_COLOR(kw.position),
                          }}>
                            {kw.position || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: DELTA_COLOR(kw.delta), fontWeight: 600, fontSize: 12 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {DELTA_ICON(kw.delta)} {kw.delta}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {kw.serp_features?.featured_snippet && (
                            <span style={{ padding: '1px 6px', background: '#6366F110', color: '#818CF8', borderRadius: 3, fontSize: 10, fontWeight: 600 }}>Featured</span>
                          )}
                          {kw.serp_features?.people_also_ask && (
                            <span style={{ padding: '1px 6px', background: '#F59E0B10', color: '#FBBF24', borderRadius: 3, fontSize: 10, fontWeight: 600 }}>PAA</span>
                          )}
                          {kw.serp_features?.ai_overview && (
                            <span style={{ padding: '1px 6px', background: '#22C55E10', color: '#4ADE80', borderRadius: 3, fontSize: 10, fontWeight: 600 }}>AI Overview</span>
                          )}
                          {!kw.serp_features?.featured_snippet && !kw.serp_features?.people_also_ask && !kw.serp_features?.ai_overview && (
                            <span style={{ color: '#4B5563', fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#6B7280', fontSize: 12 }}>
                          {kw.checked_at ? new Date(kw.checked_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </td>
                        <td style={{ padding: '10px 14px', display: 'flex', gap: 4 }}>
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

          {/* History panel */}
          {historyKw && (
            <div style={{
              marginTop: 20, background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                  Position History: <span style={{ color: '#6366F1' }}>{historyKw.keyword}</span>
                </h3>
                <button
                  onClick={() => { setHistoryKw(null); setHistory([]) }}
                  style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 13 }}
                >
                  ✕ Close
                </button>
              </div>
              {historyLoading ? (
                <div style={{ color: '#6B7280', padding: 20, textAlign: 'center' }}>Loading…</div>
              ) : history.length === 0 ? (
                <div style={{ color: '#6B7280', padding: 20, textAlign: 'center' }}>No history yet</div>
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
                        <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>{pos}</div>
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
