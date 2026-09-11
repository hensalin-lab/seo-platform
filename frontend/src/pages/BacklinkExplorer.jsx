import { useState, useMemo } from 'react'
import { api } from '../api'
import { DataSourceBadge } from '../components/DataSourceBadge'
import { UpgradeCallout } from '../components/UpgradeCallout'
import { Link2, Search, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react'

function deriveToxicReasons(bl) {
  const reasons = []
  if (bl.toxic_score != null && bl.toxic_score >= 0.7) {
    if (bl.domain_authority != null && bl.domain_authority < 10) reasons.push('Low-authority source')
    if (!bl.is_follow) reasons.push('nofollow link')
    const anchor = (bl.anchor_text || '').toLowerCase()
    if (/\b(buy|cheap|discount|free|casino|porn|viagra|payday)\b/.test(anchor)) reasons.push('Spammy anchor')
    if (anchor.length > 80) reasons.push('Over-optimized anchor')
    if (reasons.length === 0) reasons.push('High spam score')
  }
  return reasons
}

function AnchorDistribution({ backlinks }) {
  const dist = useMemo(() => {
    if (!backlinks?.length) return null
    const counts = { branded: 0, exact: 0, partial: 0, generic: 0, naked: 0 }
    for (const bl of backlinks) {
      const anchor = (bl.anchor_text || '').trim()
      if (!anchor) { counts.generic++; continue }
      if (/^https?:\/\//.test(anchor)) { counts.naked++; continue }
      if (anchor.split(/\s+/).length === 1 && anchor.length < 20) { counts.exact++; continue }
      if (anchor.split(/\s+/).length >= 2) { counts.partial++; continue }
      counts.generic++
    }
    const total = backlinks.length
    return [
      { key: 'branded', label: 'Branded', color: '#6366F1', pct: (counts.branded / total) * 100 },
      { key: 'exact', label: 'Exact match', color: '#EF4444', pct: (counts.exact / total) * 100 },
      { key: 'partial', label: 'Partial match', color: '#F59E0B', pct: (counts.partial / total) * 100 },
      { key: 'naked', label: 'Naked URL', color: '#3B82F6', pct: (counts.naked / total) * 100 },
      { key: 'generic', label: 'Generic', color: '#94A3B8', pct: (counts.generic / total) * 100 },
    ]
  }, [backlinks])

  if (!dist) return null

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link2 size={13} style={{ color: '#6366F1' }} />
        Anchor Text Distribution
      </div>
      <div style={{ height: 10, borderRadius: 999, overflow: 'hidden', display: 'flex', background: '#E5E9F2', marginBottom: 8 }}>
        {dist.map(d => d.pct > 0 && (
          <div key={d.key} style={{ width: `${d.pct}%`, background: d.color, height: '100%' }} title={`${d.label}: ${d.pct.toFixed(1)}%`} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {dist.map(d => (
          <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
            {d.label} <span style={{ fontWeight: 600 }}>{d.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BacklinkExplorer() {
  const [domain, setDomain] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState('toxic')
  const limit = 50

  const load = async (d, off = 0) => {
    setLoading(true); setError('')
    try {
      const res = await api.getBacklinkExplorer(d, limit, off)
      setData(res)
    } catch (e) { setError(e.message || 'Failed') }
    finally { setLoading(false) }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (domain.trim()) { setPage(0); load(domain.trim(), 0) }
  }

  const handleRefresh = async () => {
    if (!domain.trim()) return
    setRefreshing(true); setToast('')
    try {
      const res = await api.refreshBacklinks(domain.trim())
      setToast(res.message || 'Backlink ingestion started — check back in a few minutes.')
      setTimeout(() => { load(domain.trim(), 0) }, 90000)
    } catch (e) { setToast('Failed to start refresh: ' + (e.message || 'Unknown error')) }
    finally { setRefreshing(false) }
  }

  const handlePage = (newPage) => {
    setPage(newPage)
    load(domain, newPage * limit)
  }

  const sortedBacklinks = useMemo(() => {
    if (!data?.backlinks) return []
    const bls = [...data.backlinks]
    if (sortBy === 'toxic') bls.sort((a, b) => (b.toxic_score || 0) - (a.toxic_score || 0))
    else if (sortBy === 'da') bls.sort((a, b) => (b.domain_authority || 0) - (a.domain_authority || 0))
    else if (sortBy === 'recent') bls.sort((a, b) => new Date(b.last_seen || 0) - new Date(a.last_seen || 0))
    return bls
  }, [data, sortBy])

  return (
    <div style={{ padding: '24px 24px 40px', background: '#F4F6FB', minHeight: '100vh', color: '#0F172A' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <Link2 size={26} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Backlink Explorer</h1>
          <DataSourceBadge source={data?.source} />
        </div>
        <p style={{ color: '#64748B', margin: '0 0 18px', fontSize: 13 }}>View all backlinks pointing to a domain</p>
        <UpgradeCallout source={data?.source} capability="backlinks" />
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 480, margin: '0 auto' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com"
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, color: '#0F172A', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <button type="submit" style={{ padding: '9px 18px', background: '#6366F1', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Search</button>
        </form>
      </div>

      {toast && (
        <div style={{ maxWidth: 560, margin: '0 auto 16px', padding: '10px 16px', background: '#F1F4F9', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#22C55E', textAlign: 'center' }}>
          {toast}
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>Loading…</div>}
      {error && <div style={{ textAlign: 'center', padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', maxWidth: 500, margin: '0 auto', fontSize: 12 }}>{error}</div>}

      {!loading && data && (
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 13, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#475569' }}>Total: <strong style={{ color: '#0F172A' }}>{data.total?.toLocaleString()}</strong></span>
            {data.source === 'common_crawl' && (
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#22C55E15', color: '#22C55E' }}>
                Common Crawl
              </span>
            )}
            {data.note && <span style={{ color: '#F59E0B', fontSize: 11 }}>{data.note}</span>}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                marginLeft: 'auto',
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', background: refreshing ? '#E5E9F2' : '#E5E9F2',
                border: '1px solid #DAE0EA', borderRadius: 6, color: refreshing ? '#475569' : '#0F172A',
                fontSize: 11, cursor: refreshing ? 'default' : 'pointer',
              }}
            >
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Refreshing…' : 'Refresh Backlinks'}
            </button>
          </div>

          {data.data_status && data.data_status !== 'ready' && (
            <div style={{
              maxWidth: 560, margin: '0 auto 16px', padding: '10px 16px',
              background: data.data_status === 'fetching' ? '#FEF3C7' : '#EFF6FF',
              border: `1px solid ${data.data_status === 'fetching' ? '#FDE68A' : '#BFDBFE'}`,
              borderRadius: 8, fontSize: 12,
              color: data.data_status === 'fetching' ? '#92400E' : '#1E40AF', textAlign: 'center',
            }}>
              {data.data_status === 'fetching'
                ? 'Backlinks are being fetched from Common Crawl — check back in a few minutes.'
                : 'Backlink ingestion recently scheduled — check back in a few minutes.'}
            </div>
          )}

          <AnchorDistribution backlinks={data.backlinks} />

          {data.backlinks?.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {[
                  { key: 'toxic', label: 'Most Toxic' },
                  { key: 'da', label: 'Highest DA' },
                  { key: 'recent', label: 'Most Recent' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    style={{
                      padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                      background: sortBy === key ? '#6366F120' : 'transparent',
                      color: sortBy === key ? '#6366F1' : '#475569',
                      border: sortBy === key ? '1px solid #6366F140' : '1px solid transparent',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #DAE0EA' }}>
                      {['Source', 'Target', 'Anchor', 'DA', 'Type', 'Toxic', 'Toxic Reason', 'First Seen', 'Last Seen'].map(h => (
                        <th key={h} style={{ padding: '9px 10px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBacklinks.map((bl, i) => {
                      const reasons = deriveToxicReasons(bl)
                      return (
                        <tr key={bl.id || i} style={{ borderBottom: '1px solid #DAE0EA', background: reasons.length > 0 ? '#FEF2F210' : 'transparent' }}>
                          <td style={{ padding: '8px 10px', maxWidth: 200 }}>
                            <a href={bl.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366F1', textDecoration: 'none', wordBreak: 'break-all', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                              {bl.source_domain || bl.source_url?.slice(0, 35)} <ExternalLink size={9} />
                            </a>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748B', fontSize: 11, maxWidth: 150, wordBreak: 'break-all' }}>{bl.target_url?.slice(0, 28) || '—'}</td>
                          <td style={{ padding: '8px 10px', color: '#475569', fontSize: 11, maxWidth: 110, wordBreak: 'break-all' }}>{bl.anchor_text || '—'}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: bl.domain_authority >= 50 ? '#22C55E' : bl.domain_authority >= 20 ? '#F59E0B' : '#EF4444' }}>
                            {bl.domain_authority || '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: bl.is_follow ? '#22C55E15' : '#EF444415', color: bl.is_follow ? '#22C55E' : '#EF4444' }}>
                              {bl.is_follow ? 'dofollow' : 'nofollow'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ color: (bl.toxic_score || 0) >= 0.7 ? '#EF4444' : (bl.toxic_score || 0) >= 0.3 ? '#F59E0B' : '#475569', fontSize: 11, fontWeight: 600 }}>
                              {bl.toxic_score != null ? bl.toxic_score.toFixed(2) : '—'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {reasons.length > 0 ? (
                              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                {reasons.map((r, ri) => (
                                  <span key={ri} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 600, background: '#EF444415', color: '#EF4444' }}>
                                    <AlertTriangle size={8} />
                                    {r}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: 10 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#475569', fontSize: 11 }}>
                            {bl.first_seen ? new Date(bl.first_seen).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#475569', fontSize: 11 }}>
                            {bl.last_seen ? new Date(bl.last_seen).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {data.total > limit && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => handlePage(page - 1)} disabled={page === 0} style={{ padding: '6px 14px', background: '#E5E9F2', border: '1px solid #DAE0EA', borderRadius: 6, color: '#0F172A', fontSize: 12, cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>Prev</button>
              <span style={{ padding: '6px 10px', fontSize: 12, color: '#475569' }}>Page {page + 1} of {Math.ceil(data.total / limit)}</span>
              <button onClick={() => handlePage(page + 1)} disabled={(page + 1) * limit >= data.total} style={{ padding: '6px 14px', background: '#E5E9F2', border: '1px solid #DAE0EA', borderRadius: 6, color: '#0F172A', fontSize: 12, cursor: (page + 1) * limit >= data.total ? 'default' : 'pointer', opacity: (page + 1) * limit >= data.total ? 0.4 : 1 }}>Next</button>
            </div>
          )}

          {!data.backlinks?.length && !data.note && (
            <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
              {data.data_status === 'fetching' ? (
                <div>
                  <p style={{ fontWeight: 600, color: '#F59E0B', marginBottom: 4 }}>Backlinks are being fetched</p>
                  <p style={{ fontSize: 12 }}>Common Crawl data is being ingested — check back in a few minutes and click Refresh.</p>
                </div>
              ) : data.data_status === 'pending' ? (
                <div>
                  <p style={{ fontWeight: 600, color: '#3B82F6', marginBottom: 4 }}>Ingestion recently scheduled</p>
                  <p style={{ fontSize: 12 }}>Backlink ingestion is in progress — check back in a few minutes and click Refresh.</p>
                </div>
              ) : (
                <p>No backlinks found for this domain</p>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && !data && (
        <div style={{ textAlign: 'center', padding: 50, color: '#8B93A7' }}>
          <Link2 size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter a domain above to explore its backlink profile</p>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>Backlink data sourced from Common Crawl's public web archive, refreshed monthly.</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
