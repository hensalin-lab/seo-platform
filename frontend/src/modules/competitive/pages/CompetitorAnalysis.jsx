import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../../api'
import { Users, TrendingUp, AlertTriangle, ArrowRight, BarChart3, Shield, BookOpen, Link2, Gauge, Award, Brain, ExternalLink } from 'lucide-react'

const DIMENSION_ICONS = { authority: Shield, content: BookOpen, schema: Brain, internal_links: Link2, cwv: Gauge, titles: TrendingUp, eeat: Award, brand_signals: TrendingUp, ai_visibility: Brain }
const DIMENSION_LABELS = { authority: 'Authority', content: 'Content', schema: 'Schema', internal_links: 'Internal Links', cwv: 'CWV', titles: 'Titles', eeat: 'E-E-A-T', brand_signals: 'Brand', ai_visibility: 'AI Visibility' }

export default function CompetitorAnalysis() {
  const { id } = useParams()
  const [basic, setBasic] = useState(null)
  const [deep, setDeep] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getCompetitorData(id).catch(() => null),
      api.request(`/audit/${id}/competitor-deep/0`).catch(() => null),
    ]).then(([b, d]) => { setBasic(b); setDeep(d); }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontFamily: "'Inter', sans-serif" }}>Loading...</div>

  const competitorUrl = basic?.competitor_url || deep?.my_profile?.competitor_url || null
  const position = deep?.competitive_position || {}
  const profile = deep?.my_profile || {}

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Competitor Analysis</h1>
        {competitorUrl ? (
          <p style={{ fontSize: 13, color: '#2563eb', margin: 0 }}>vs <strong>{competitorUrl}</strong></p>
        ) : (
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>No competitor specified in this audit</p>
        )}
      </div>

      {!competitorUrl ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          <Users size={40} style={{ color: '#94a3b8', marginBottom: 12 }} />
          <p>Run an audit with a competitor URL to see comparison data</p>
        </div>
      ) : (
        <>
          {Object.keys(position).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>Competitive Position</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {Object.entries(position).map(([dim, val]) => {
                  const Icon = DIMENSION_ICONS[dim] || BarChart3
                  const score = val?.mine ?? 0
                  const adv = val?.advantage === 'US' ? '✅' : val?.advantage === 'THEM' ? '⚠️' : '—'
                  return (
                    <div key={dim} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{DIMENSION_LABELS[dim] || dim}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444' }}>{score}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{adv} {val?.delta > 0 ? `+${val.delta}` : ''}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {basic?.keyword_opportunities?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Keyword Opportunities ({basic.keyword_opportunities.length})</h2>
              {basic.keyword_opportunities.map((k, i) => (
                <div key={i} style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#334155' }}>{k.keyword || k.description}</div>
              ))}
            </div>
          )}

          {profile?.backlink_signals && (
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Your Profile</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {['authority', 'content', 'schema', 'internal_links', 'cwv', 'eeat', 'ai_visibility'].filter(k => profile[k]?.score != null).map(key => {
                  const val = profile[key]
                  return (
                    <div key={key} style={{ padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{DIMENSION_LABELS[key] || key}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: val.score >= 70 ? '#22c55e' : val.score >= 40 ? '#eab308' : '#ef4444' }}>{val.score}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {basic?.strengths?.length === 0 && basic?.keyword_opportunities?.length === 0 && !profile?.authority && (
            <div style={{ textAlign: 'center', padding: 30, color: '#64748b', fontSize: 13 }}>
              No competitor comparison data was generated. The audit found the competitor URL but gaps and opportunities were not computed.
            </div>
          )}
        </>
      )}
    </div>
  )
}
