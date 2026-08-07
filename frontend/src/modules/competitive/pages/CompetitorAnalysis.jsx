import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../../api'
import { Users, TrendingUp, AlertTriangle, ArrowRight, BarChart3, Shield, BookOpen, Link2, Gauge, Award, Brain, ExternalLink, RefreshCw, Play, Loader, Star } from 'lucide-react'

const DIMENSION_ICONS = { authority: Shield, content: BookOpen, schema: Brain, internal_links: Link2, cwv: Gauge, titles: TrendingUp, eeat: Award, brand_signals: TrendingUp, ai_visibility: Brain }
const DIMENSION_LABELS = { authority: 'Authority', content: 'Content', schema: 'Schema', internal_links: 'Internal Links', cwv: 'CWV', titles: 'Titles', eeat: 'E-E-A-T', brand_signals: 'Brand', ai_visibility: 'AI Visibility' }

const starRating = (score) => {
  const filled = Math.max(0, Math.min(5, Math.round((score || 0) / 20)))
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginTop: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={13} style={n <= filled ? { fill: '#f59e0b', color: '#f59e0b' } : { fill: '#e2e8f0', color: '#e2e8f0' }} />
      ))}
    </div>
  )
}

export default function CompetitorAnalysis() {
  const { id } = useParams()
  const [basic, setBasic] = useState(null)
  const [deep, setDeep] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [compUrl, setCompUrl] = useState('')
  const [analyzeError, setAnalyzeError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.getCompetitorData(id).catch(() => null),
      api.request(`/audit/${id}/competitor-deep/0`).catch(() => null),
    ]).then(([b, d]) => { setBasic(b); setDeep(d); }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const runAnalyze = async () => {
    setAnalyzing(true); setAnalyzeError('')
    try {
      await api.runCompetitorAnalysis(id, compUrl.trim() || null)
      load()
    } catch (e) {
      setAnalyzeError(e?.message || 'Analysis failed. Check the competitor URL and try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" }}>Loading...</div>

  const competitorUrl = basic?.competitor_url || deep?.my_profile?.competitor_url || null
  const position = deep?.competitive_position || {}
  const profile = deep?.my_profile || {}
  const gaps = deep?.gaps || {}
  const hasRealComparison = !!(deep && Object.keys(gaps).length > 0)

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px 0' }}>Competitor Analysis</h1>
        {competitorUrl ? (
          <p style={{ fontSize: 13, color: '#2563eb', margin: 0 }}>vs <strong>{competitorUrl}</strong></p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No competitor specified in this audit</p>
        )}
      </div>

      {!hasRealComparison && (
        <div style={{ marginBottom: 20, padding: '18px 20px', borderRadius: 12, border: '1px solid #fbbf24', background: '#fffbeb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertTriangle size={18} color="#d97706" />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>
              {competitorUrl ? 'Competitor comparison not computed yet' : 'Add a competitor to compare'}
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#78350f', margin: '0 0 12px 0', lineHeight: 1.5 }}>
            {competitorUrl
              ? 'Run AI competitor analysis now — it crawls the competitor site, compares it to your pages, and tells you exactly how to improve.'
              : 'Enter your competitor domain (e.g. apollo.io) and run analysis to see gaps and how to improve.'}
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={compUrl}
              onChange={e => setCompUrl(e.target.value)}
              placeholder={competitorUrl || 'https://competitor.com'}
              style={{ flex: 1, minWidth: 260, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }}
            />
            <button
              onClick={runAnalyze}
              disabled={analyzing}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: analyzing ? 'wait' : 'pointer' }}
            >
              {analyzing ? <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Play size={15} />}
              {analyzing ? 'Analyzing (1-2 min)...' : 'Run AI Competitor Analysis'}
            </button>
          </div>
          {analyzeError && <div style={{ marginTop: 10, fontSize: 12, color: '#dc2626' }}>{analyzeError}</div>}
        </div>
      )}

      {hasRealComparison && (
        <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Analysis complete — gaps below show exactly what to fix.</span>
          <button
            onClick={() => { setCompUrl(competitorUrl || ''); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-white)', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={14} /> Re-run with different competitor
          </button>
        </div>
      )}

      {Object.keys(position).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Competitive Position</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {Object.entries(position).map(([dim, val]) => {
              const Icon = DIMENSION_ICONS[dim] || BarChart3
              const score = val?.mine ?? 0
              const isReal = (val?.avg_competitor ?? 0) > 0
              const adv = !isReal ? null : (val?.advantage === 'US' ? '✅' : val?.advantage === 'COMPETITOR' ? '⚠️' : '—')
              return (
                <div key={dim} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>{DIMENSION_LABELS[dim] || dim}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444' }}>{score}</div>
                  {starRating(score)}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {adv}{' '}
                    {isReal ? (val?.delta > 0 ? `+${val.delta} vs competitor` : `${val.delta} vs competitor`) : 'no competitor data'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {basic?.keyword_opportunities?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Keyword Opportunities ({basic.keyword_opportunities.length})</h2>
          {basic.keyword_opportunities.map((k, i) => {
            const kw = k.keyword || k.topic || k.term || k.description
            const intent = k.intent || ''
            const difficulty = k.difficulty || ''
            const opportunity = k.opportunity || k.importance || ''
            const diffColor = difficulty === 'HIGH' ? '#dc2626' : difficulty === 'MEDIUM' ? '#d97706' : '#059669'
            const intentColor = intent === 'COMMERCIAL' ? '#2563eb' : intent === 'TRANSACTIONAL' ? '#7c3aed' : '#0891b2'
            return (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{kw}</span>
                  {intent && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: intentColor + '15', color: intentColor }}>{intent}</span>}
                  {difficulty && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: diffColor + '15', color: diffColor }}>{difficulty}</span>}
                  {opportunity && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: '#f59e0b15', color: '#d97706' }}>{opportunity}</span>}
                  {k.competitor_frequency != null && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: '#33415515', color: '#334155' }}>{k.competitor_frequency}× on competitor</span>}
                </div>
                {k.reason && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2, lineHeight: 1.5 }}>{k.reason}</div>}
                {k.action && <div style={{ fontSize: 12, color: '#059669', lineHeight: 1.5 }}>{k.action}</div>}
              </div>
            )
          })}
        </div>
      )}

      {profile?.backlink_signals && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Your Profile</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {['authority', 'content', 'schema', 'internal_links', 'cwv', 'eeat', 'ai_visibility'].filter(k => profile[k]?.score != null).map(key => {
              const val = profile[key]
              return (
                <div key={key} style={{ padding: '8px 10px', background: 'var(--bg-white)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{DIMENSION_LABELS[key] || key}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: val.score >= 70 ? '#22c55e' : val.score >= 40 ? '#eab308' : '#ef4444' }}>{val.score}</div>
                  {starRating(val.score)}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {Object.entries(gaps).map(([url, gap]) => {
        const dims = gap?.dimension_gaps || {}
        const toImprove = Object.entries(dims).filter(([, d]) => d?.status === 'LOSS' || d?.status === 'TIE')
        if (!toImprove.length) return null
        return (
          <div key={url} style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              How to Improve{' '}
              <span style={{ fontSize: 12, fontWeight: 500, color: '#2563eb' }}>
                <ExternalLink size={11} style={{ verticalAlign: -1 }} /> {url}
              </span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {toImprove.map(([key, d]) => {
                const Icon = DIMENSION_ICONS[key] || BarChart3
                const target = Math.min(Math.max(d?.competitor ?? 0, 70) + 10, 100)
                return (
                  <div key={key} style={{ padding: '12px 14px', background: 'var(--bg-white)', borderRadius: 8, border: '1px solid var(--border)', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Icon size={15} color="#d97706" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{d?.label || key}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                        You: <strong>{d?.mine}</strong> vs Competitor: <strong>{d?.competitor}</strong>
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                      Target <strong style={{ color: '#d97706' }}>{target}</strong> — fix the related on-page issues for this dimension (see Issues), add the missing signals, and improve your content depth in this area.
                    </div>
                  </div>
                )
              })}
            </div>
            {gap?.their_advantages?.length > 0 && (
              <div style={{ marginTop: 8, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', fontSize: 13, color: '#7f1d1d' }}>
                <strong>Competitor wins:</strong> {gap.their_advantages.join(', ')}
              </div>
            )}
            {gap?.our_advantages?.length > 0 && (
              <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 13, color: '#14532d' }}>
                <strong>You already win:</strong> {gap.our_advantages.join(', ')}
              </div>
            )}
          </div>
        )
      })}

      {!competitorUrl && !hasRealComparison && (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>
          <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p>Add a competitor URL above and run analysis to see comparison data</p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
