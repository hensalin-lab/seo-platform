import { useState } from 'react'
import { api } from '../api'
import { DataSourceBadge } from '../components/DataSourceBadge'
import { UpgradeCallout } from '../components/UpgradeCallout'
import {
  Gauge, Search, ExternalLink, Info, Target, TrendingUp, FileText,
  AlertTriangle, ShieldAlert, ShieldCheck, Lightbulb, BarChart3,
} from 'lucide-react'

const BAND_META = {
  EASY: { color: '#22C55E', back: '#ECFDF5' },
  MEDIUM: { color: '#F59E0B', back: '#FFFBEB' },
  HARD: { color: '#F97316', back: '#FFF7ED' },
  'VERY HARD': { color: '#DC2626', back: '#FEF2F2' },
}

function DifficultyGauge({ score, label }) {
  const meta = BAND_META[label] || BAND_META['EASY']
  const color = meta.color
  return (
    <div style={{ textAlign: 'center', padding: 24, background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 12, maxWidth: 320, margin: '0 auto 18px' }}>
      <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 12px' }}>
        <svg viewBox="0 0 140 140" width="140" height="140">
          <circle cx="70" cy="70" r="60" fill="none" stroke="#E5E9F2" strokeWidth="12" />
          <circle
            cx="70" cy="70" r="60" fill="none"
            stroke={color} strokeWidth="12"
            strokeDasharray={`${Math.max(0, Math.min(100, score || 0)) / 100 * 377} 377`}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 30, fontWeight: 800, color }}>{score}</span>
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>/ 100</span>
        </div>
      </div>
      <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color, background: meta.back, borderRadius: 999, padding: '4px 14px', letterSpacing: 1 }}>{label}</div>
    </div>
  )
}

function Section({ icon, title, subtitle, children }) {
  const Icon = icon || Info
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #DAE0EA', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color: '#6366F1', flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{title}</span>
        {subtitle && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748B' }}>{subtitle}</span>}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

function Chip({ children, color = '#6366F1', back = '#EEF2FF' }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color, background: back, borderRadius: 999, padding: '3px 10px', margin: '2px 4px 2px 0' }}>
      {children}
    </span>
  )
}

function DABadge({ da, isHard }) {
  if (da == null) return <Chip color="#64748B" back="#F1F5F9">N/A</Chip>
  const color = da >= 80 ? '#DC2626' : da >= 40 ? '#F59E0B' : '#22C55E'
  const back = da >= 80 ? '#FEF2F2' : da >= 40 ? '#FFFBEB' : '#ECFDF5'
  return <Chip color={color} back={back}>{da}</Chip>
}

export default function KeywordDifficulty() {
  const [keyword, setKeyword] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const analyze = async (e) => {
    e.preventDefault()
    if (!keyword.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await api.getKeywordDifficulty(keyword.trim())
      setData(res)
    } catch (err) {
      setError(err.message || 'Request failed')
    } finally { setLoading(false) }
  }

  const src = data?.data_source?.serp_provider
  const meta = BAND_META[data?.difficulty_label] || BAND_META['EASY']
  const overview = data?.serp_overview || []
  const weakness = data?.serp_weakness
  const gap = data?.content_gap
  const rec = data?.recommendation

  return (
    <div style={{ padding: '24px 24px 40px', background: '#F4F6FB', minHeight: '100vh', color: '#0F172A' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <Gauge size={26} style={{ color: '#6366F1' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Keyword Difficulty</h1>
          <DataSourceBadge source={src} />
        </div>
        <p style={{ color: '#64748B', margin: '0 0 18px', fontSize: 13 }}>
          Real competitive difficulty (0–100) from SERP + authority analysis of the ranking domains
        </p>
        <UpgradeCallout source={src} capability="serp_ranks" />
        <form onSubmit={analyze} style={{ display: 'flex', gap: 8, maxWidth: 460, margin: '0 auto' }}>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. best seo tools"
            style={{
              flex: 1, padding: '9px 12px', background: '#FFFFFF', border: '1px solid #DAE0EA',
              borderRadius: 8, color: '#0F172A', fontSize: 13, outline: 'none',
            }}
          />
          <button type="submit" style={{
            padding: '9px 20px', background: '#6366F1', border: 'none', borderRadius: 8,
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            <Search size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Analyze
          </button>
        </form>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 50, color: '#64748B' }}>
          Fetching SERP, resolving authority, extracting content gap…
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', maxWidth: 500, margin: '0 auto' }}>{error}</div>
      )}

      {data && (data.state === 'PROVIDER_ERROR' || data.state === 'INVALID_KEYWORD') && (
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: 16, background: data.state === 'INVALID_KEYWORD' ? '#F1F4F9' : '#FEF2F2', border: '1px solid', borderColor: data.state === 'INVALID_KEYWORD' ? '#CBD5E1' : '#FECACA', borderRadius: 8, color: data.state === 'INVALID_KEYWORD' ? '#475569' : '#DC2626' }}>
          {data.rate_limited && <div style={{ fontWeight: 700, marginBottom: 4 }}>Rate limited by the SERP provider — try again in a minute.</div>}
          {data.serp_error && <div style={{ fontSize: 12 }}>{data.serp_error}</div>}
          {data.note && <div style={{ fontSize: 12 }}>{data.note}</div>}
        </div>
      )}

      {data?.difficulty != null && (
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <DifficultyGauge score={data.difficulty} label={data.difficulty_label} />

          {(data.state === 'PARTIAL_DATA') && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6, fontSize: 12, color: '#92400E', display: 'flex', gap: 8 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              Partial data — some ranking domains had no authority value (N/A), so the difficulty score leans on the data that was available.
            </div>
          )}

          <div style={{ marginBottom: 14, padding: '10px 14px', background: '#F1F4F9', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, color: '#64748B', display: 'flex', gap: 8 }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {data.data_source?.disclosure || data.note}
              {data.note ? <span> — {data.note}</span> : null}
            </span>
          </div>

          {/* Key stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: meta.color }}>{data.why_hard?.average_da ?? '—'}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Avg DA of winners{data.why_hard?.average_da_basis ? ` (n=${data.why_hard.average_da_basis})` : ''}</div>
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>{Math.round((data.why_hard?.strong_domain_pct || 0) * 100)}%</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Strong domains (DA ≥ 40)</div>
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>{data.serp_strength?.results_analyzed ?? 0}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Ranking pages analyzed</div>
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>{data.why_hard?.serp_feature_count ?? 0}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>SERP features</div>
            </div>
          </div>

          {/* Why hard — formula transparency */}
          <Section icon={Target} title="Why this difficulty" subtitle="Documented weighted formula">
            {data.difficulty_formula?.components?.map((c, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{c.label}</span>
                  <span style={{ color: '#475569' }}>
                    <Chip color="#6366F1" back="#EEF2FF">weight {Math.round(c.weight * 100)}%</Chip>
                    <span style={{ marginLeft: 6 }}>{c.points} pts</span>
                  </span>
                </div>
                <div style={{ height: 6, background: '#E5E9F2', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: 6, width: `${Math.max(2, (c.points / 40) * 100)}%`, background: meta.color, borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{c.description}</div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #E5E9F2', paddingTop: 10, fontSize: 12, color: '#475569' }}>
              Total <strong>{data.difficulty}</strong> / 100 — {data.why_hard?.note}
            </div>
          </Section>

          {/* SERP strength + weakness */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Section icon={ShieldCheck} title="SERP strength" subtitle={`${data.serp_strength?.results_analyzed ?? 0} results`}>
              {['da_80_plus', 'da_40_79', 'da_below_40'].map((k) => {
                const n = data.serp_strength?.buckets?.[k] ?? 0
                const label = { da_80_plus: 'DA 80+', da_40_79: 'DA 40–79', da_below_40: 'DA < 40' }[k]
                const color = { da_80_plus: '#DC2626', da_40_79: '#F59E0B', da_below_40: '#22C55E' }[k]
                return (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: color, fontWeight: 700 }}>{label}</span>
                    <span style={{ color: '#0F172A', fontWeight: 700 }}>{n}</span>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0' }}>
                <span style={{ color: '#64748B', fontWeight: 700 }}>Unknown / N/A</span>
                <span style={{ color: '#64748B', fontWeight: 700 }}>{data.serp_strength?.unknown_na ?? 0}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>{data.serp_strength?.note}</div>
            </Section>

            <Section icon={ShieldAlert} title="SERP weakness" subtitle={`${weakness?.level || '—'} opening`}>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>{weakness?.note}</div>
              {weakness && [
                ['below_average_authority', 'Below-average DA'],
                ['below_40_da', 'DA below 40'],
                ['community_editorial', 'Community / editorial (e.g. Reddit, Quora)'],
              ].map(([k, label]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#0F172A' }}>{label}</span>
                  <span style={{ fontWeight: 700, color: (weakness[k]?.count || 0) >= (weakness[k]?.of || 1) / 2 ? '#DC2626' : '#22C55E' }}>
                    {weakness[k]?.count} / {weakness[k]?.of}
                  </span>
                </div>
              ))}
              {weakness && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Categories overlap — a result may count in more than one.</div>}
            </Section>
          </div>

          {/* Opportunity + volume + intent */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Section icon={TrendingUp} title="Opportunity score" subtitle="Shared module — same formula as Keyword Gap">
              {data.opportunity?.status === 'SUCCESS' ? (
                <>
                  <div style={{ fontSize: 28, fontWeight: 800, color: (data.opportunity.score || 0) >= 60 ? '#22C55E' : (data.opportunity.score || 0) >= 40 ? '#F59E0B' : '#64748B' }}>
                    {data.opportunity.score}
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginLeft: 8 }}>{data.opportunity.band}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{data.difficulty_formula?.weights ? Object.entries(data.difficulty_formula.weights).map(([k, v]) => `${k.replace(/_/g, ' ')} ${Math.round(v * 100)}%`).join(' + ') : ''}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{data.opportunity.inputs?.formula}</div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#92400E' }}>{data.opportunity?.reason || 'Opportunity unavailable.'}</div>
              )}
            </Section>

            <Section icon={BarChart3} title="Search volume" subtitle="Real provider only — never guessed">
              {typeof data.search_volume?.volume === 'number' ? (
                <>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A' }}>
                    {data.search_volume.volume.toLocaleString()}
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginLeft: 8 }}>/ month</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
                    CPC <strong>${data.search_volume.cpc ?? '—'}</strong> · Competition <strong>{data.search_volume.competition || '—'}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{data.search_volume.note}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#94A3B8' }}>N/A</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>{data.search_volume?.note || 'Search volume requires DataForSEO credentials.'}</div>
                </>
              )}
            </Section>

            <Section icon={Lightbulb} title="Search intent" subtitle="Shared rule-based classifier">
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>{data.why_hard?.intent || '—'}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Classified from the query pattern (transactional / commercial / navigational / informational).</div>
            </Section>
          </div>

          {/* Content gap */}
          <Section icon={FileText} title="Content gap" subtitle={`${gap?.pages_analyzed ?? 0}/${gap?.pages_total ?? 0} ranking pages analyzed`}>
            {gap?.topics?.length ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  {gap.topics.map((t, i) => (
                    <Chip key={i} color="#475569" back="#F1F5F9">{t.topic} <strong>({t.count}/{t.total})</strong></Chip>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>{gap.note}</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#64748B' }}>{gap?.note || 'No topics extracted.'}</div>
            )}
          </Section>

          {/* Recommendation / content brief handoff */}
          {rec && (
            <Section icon={FileText} title="What a winning page should cover" subtitle="Content-brief handoff">
              <div style={{ marginBottom: 8 }}>
                <Chip color="#6366F1" back="#EEF2FF">{rec.page_type_label}</Chip>
                <span style={{ fontSize: 12, color: '#475569', marginLeft: 6 }}>{rec.rationale}</span>
              </div>
              {rec.suggested_title && (
                <div style={{ fontSize: 12, color: '#0F172A', marginBottom: 2 }}>
                  <strong>Title tag:</strong> {rec.suggested_title}
                </div>
              )}
              {rec.suggested_h1 && (
                <div style={{ fontSize: 12, color: '#0F172A', marginBottom: 8 }}>
                  <strong>H1:</strong> {rec.suggested_h1}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>Pass into Content Studio / Content Brief (secondary keywords):</div>
              <div>{(rec.secondary_keywords || []).map((k, i) => <Chip key={i} color="#6366F1" back="#EEF2FF">{k}</Chip>)}</div>
            </Section>
          )}

          {/* SERP overview */}
          {overview.length > 0 && (
            <Section icon={Search} title="SERP overview" subtitle="Deduplicated by full URL">
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: '#475569', textAlign: 'left', borderBottom: '1px solid #E5E9F2' }}>
                      <th style={{ padding: '6px 8px' }}>Pos</th>
                      <th style={{ padding: '6px 8px' }}>URL</th>
                      <th style={{ padding: '6px 8px' }}>Path</th>
                      <th style={{ padding: '6px 8px' }}>DA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' }}>
                        <td style={{ padding: '8px', color: i < 3 ? '#6366F1' : '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.position}</td>
                        <td style={{ padding: '8px', maxWidth: 260 }}>
                          <div style={{ fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.title || r.domain}
                          </div>
                          <a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#6366F1', fontSize: 11, textDecoration: 'none' }}>
                            {r.domain} <ExternalLink size={9} style={{ verticalAlign: 'middle' }} />
                          </a>
                          {r.snippet && <div style={{ color: '#64748B', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.snippet}</div>}
                        </td>
                        <td style={{ padding: '8px', color: '#94A3B8', fontSize: 11, whiteSpace: 'nowrap' }}>{r.path || '/'}</td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}><DABadge da={r.da} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Data source disclosure */}
          <div style={{ maxWidth: 820, margin: '0 auto', padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
            <strong>Data sources:</strong> SERP — <span style={{ fontWeight: 600 }}>{data.data_source?.serp_provider || 'unknown'}</span> · Authority (DA) — {data.data_source?.authority_provider || 'not configured'} · Volume — {data.data_source?.volume_configured ? 'DataForSEO' : 'not configured (not used)'}. Analyzed at{' '}
            {data.data_source?.analyzed_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(data.data_source.analyzed_at)) : '—'}.
            <div style={{ marginTop: 4 }}>{data.data_source?.disclosure}</div>
          </div>
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: 50, color: '#8B93A7' }}>
          <Gauge size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter a keyword to see its competitive difficulty</p>
        </div>
      )}
    </div>
  )
}