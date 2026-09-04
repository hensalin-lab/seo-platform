import { useState } from 'react'
import { api } from '../api'
import { Globe, TrendingUp, Link2, FileText, ArrowRight, BarChart2, Search, ExternalLink } from 'lucide-react'

const SCORE_COLOR = (s) => {
  if (s >= 80) return '#22C55E'
  if (s >= 60) return '#F59E0B'
  if (s >= 40) return '#F97316'
  return '#EF4444'
}

function StatCard({ icon: Icon, label, value, color, cta, ctaLabel, ctaHref }) {
  return (
    <div style={{
      background: '#111827', border: '1px solid #1F2937', borderRadius: 10,
      padding: '18px 16px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: `${color || '#6366F1'}15`,
        }}>
          <Icon size={17} style={{ color: color || '#6366F1' }} />
        </div>
        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', marginBottom: 4 }}>
        {value ?? '—'}
      </div>
      {cta && ctaHref && (
        <a href={ctaHref} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
          fontSize: 11, color: '#6366F1', textDecoration: 'none', fontWeight: 600,
        }}>
          {ctaLabel || 'Get started'} <ArrowRight size={11} />
        </a>
      )}
    </div>
  )
}

function ScoreRing({ score, size = 64 }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1F2937" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={SCORE_COLOR(score)}
        strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="#F9FAFB"
        fontSize="15" fontWeight="700" style={{ transform: `rotate(90deg)`, transformOrigin: 'center' }}>
        {score}
      </text>
    </svg>
  )
}

export default function DomainOverview() {
  const [domain, setDomain] = useState('')
  const [loadedDomain, setLoadedDomain] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async (d) => {
    setLoading(true); setError(''); setData(null)
    try {
      const res = await api.getDomainOverview(d)
      setData(res)
      setLoadedDomain(d)
    } catch (e) { setError(e.message || 'Failed to load overview') }
    finally { setLoading(false) }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (domain.trim()) load(domain.trim())
  }

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      {/* Hero search */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <Globe size={30} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Domain Overview</h1>
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 24px', fontSize: 14 }}>
          Enter any domain to see authority, rankings, backlinks, and audit status at a glance
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 560, margin: '0 auto' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              autoFocus
              style={{
                width: '100%', padding: '12px 14px 12px 40px', background: '#111827',
                border: '1px solid #374151', borderRadius: 10, color: '#F9FAFB', fontSize: 15,
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
          <button type="submit" style={{
            padding: '12px 24px', background: '#6366F1', border: 'none', borderRadius: 10,
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            Analyze
          </button>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{
            width: 36, height: 36, border: '3px solid #374151', borderTopColor: '#6366F1',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px',
          }} />
          Fetching overview for {loadedDomain || domain}…
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          textAlign: 'center', padding: 20, background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, color: '#DC2626', maxWidth: 500, margin: '0 auto',
        }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: 60, color: '#4B5563' }}>
          <Globe size={56} style={{ opacity: 0.2, marginBottom: 16 }} />
          <p style={{ fontSize: 15 }}>Enter a domain above to see its SEO profile</p>
        </div>
      )}

      {/* Results */}
      {data && (
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={18} style={{ color: '#6366F1' }} />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{data.domain}</h2>
          </div>

          {/* Stat cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
            <StatCard
              icon={BarChart2}
              label="Last Audit Score"
              value={data.last_audit?.score
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ScoreRing score={Math.round(data.last_audit.score.overall || 0)} size={46} />
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(data.last_audit.score.overall || 0)}%</div>
                      <div style={{ fontSize: 10, color: '#6B7280' }}>
                        {data.last_audit.completed_at ? new Date(data.last_audit.completed_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </div>
                : '—'}
              color="#6366F1"
              cta={data.ctas?.run_audit}
              ctaLabel="Run full audit"
              ctaHref="/new"
            />
            <StatCard
              icon={Link2}
              label="Backlinks"
              value={data.backlinks?.total != null ? data.backlinks.total.toLocaleString() : '—'}
              color="#F59E0B"
              cta={data.ctas?.analyze_backlinks}
              ctaLabel="Analyze backlinks"
              ctaHref="#backlinks"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg. Keyword Position"
              value={data.rank_tracking?.avg_position ?? '—'}
              color="#22C55E"
              cta={data.ctas?.track_keywords}
              ctaLabel="Track keywords"
              ctaHref="/rank-tracking"
            />
            <StatCard
              icon={FileText}
              label="Tracked Keywords"
              value={data.rank_tracking?.tracked_keywords ?? 0}
              color="#8B5CF6"
              cta={data.ctas?.track_keywords}
              ctaLabel="Add keywords"
              ctaHref="/rank-tracking"
            />
          </div>

          {/* Top pages */}
          {data.top_pages && data.top_pages.length > 0 && (
            <div style={{
              background: '#111827', border: '1px solid #1F2937', borderRadius: 10, padding: 18,
            }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#E5E7EB' }}>
                Top Pages
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1F2937' }}>
                    {['URL', 'Title', 'Words', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.top_pages.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1F2937' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <a href={p.url} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#6366F1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {p.url.length > 50 ? p.url.slice(0, 50) + '…' : p.url}
                          <ExternalLink size={11} />
                        </a>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#D1D5DB' }}>{p.title || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#9CA3AF' }}>{p.word_count?.toLocaleString() || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                          background: p.status_code === 200 ? '#22C55E15' : '#EF444415',
                          color: p.status_code === 200 ? '#22C55E' : '#EF4444',
                        }}>
                          {p.status_code}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
