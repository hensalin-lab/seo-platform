import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../../api'
import { DataSourceBadge } from '../../../components/DataSourceBadge'
import { Key, AlertTriangle, CheckCircle, TrendingUp, HelpCircle, GitMerge, Target, Search, Filter, BarChart3, ArrowUpRight, Lightbulb, ChevronDown, Sparkles, Brain, ArrowRight, Clock, RefreshCw, Wand2 } from 'lucide-react'
import ThemeHero from '../../../components/ai/ThemeHero'
import ThemeStatCard from '../../../components/ai/ThemeStatCard'
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip'
import { Spinner } from '../../../components/States'

function KeywordTable({ keywords, search }) {
  const [sortBy, setSortBy] = useState('frequency')
  const [sortDir, setSortDir] = useState('desc')

  const filtered = useMemo(() => {
    let list = keywords
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(kw => kw.keyword?.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const aVal = a[sortBy] ?? 0
      const bVal = b[sortBy] ?? 0
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [keywords, search, sortBy, sortDir])

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('desc') }
  }

  const intentColors = { Informational: '#3b82f6', Commercial: '#8b5cf6', Transactional: '#059669', Navigational: '#64748b' }
  const diffColors = { LOW: '#059669', MEDIUM: '#d97706', HIGH: '#dc2626' }
  const oppColors = { HIGH: '#059669', MEDIUM: '#d97706', LOW: '#94a3b8' }

  return (
    <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {[
                { key: 'keyword', label: 'Keyword', width: '25%' },
                { key: 'frequency', label: 'Frequency' },
                { key: 'type', label: 'Type' },
                { key: 'intent', label: 'Intent' },
                { key: 'difficulty', label: 'Difficulty' },
                { key: 'opportunity', label: 'Opportunity' },
                { key: 'pages_using', label: 'Pages' },
              ].map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)}
                  style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', width: col.width }}>
                  {col.label} {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((kw, i) => (
              <tr key={kw.keyword + i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Search size={12} color="#94a3b8" />
                    {kw.keyword}
                  </div>
                  {kw.source && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>via {kw.source}</div>}
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>{kw.frequency || kw.volume || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: kw.type === 'long-tail' ? '#f0fdf4' : '#eff6ff', color: kw.type === 'long-tail' ? '#059669' : '#3b82f6' }}>
                    {kw.type === 'long-tail' ? 'Long-tail' : 'Short-tail'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: (intentColors[kw.intent] || '#64748b') + '18', color: intentColors[kw.intent] || '#64748b' }}>
                    {kw.intent || kw.source || '—'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {kw.difficulty ? (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: (diffColors[kw.difficulty] || '#64748b') + '18', color: diffColors[kw.difficulty] || '#64748b' }}>
                      {kw.difficulty}
                    </span>
                  ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {kw.opportunity ? (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: (oppColors[kw.opportunity] || '#94a3b8') + '18', color: oppColors[kw.opportunity] || '#94a3b8' }}>
                      {kw.opportunity}
                    </span>
                  ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{kw.pages_using ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e8f0', fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Showing {filtered.length} of {keywords.length} keywords</span>
        <span style={{ color: '#059669', fontWeight: 600 }}>{keywords.filter(k => k.opportunity === 'HIGH').length} high-opportunity keywords</span>
      </div>
    </div>
  )
}

function TopicClusters({ clusters }) {
  if (!clusters?.length) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No topic clusters detected</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
      {clusters.map((cl, i) => {
        const authColors = { HIGH: '#059669', MEDIUM: '#d97706', LOW: '#94a3b8' }
        return (
          <div key={i} style={{ padding: '16px 18px', background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{cl.root_keyword}</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: (authColors[cl.topic_authority] || '#94a3b8') + '18', color: authColors[cl.topic_authority] || '#94a3b8' }}>
                {cl.topic_authority} Authority
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{cl.keyword_count} keywords · {cl.total_frequency} total frequency</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {cl.keywords.slice(0, 8).map((kw, j) => (
                <span key={j} style={{ fontSize: 11, padding: '2px 8px', background: '#f1f5f9', borderRadius: 4, color: '#475569' }}>{kw}</span>
              ))}
              {cl.keywords.length > 8 && <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 4px' }}>+{cl.keywords.length - 8} more</span>}
            </div>
            {cl.content_suggestion && (
              <div style={{ marginTop: 8, padding: '6px 8px', background: '#f0fdf4', borderRadius: 4, fontSize: 11, color: '#059669', border: '1px solid #bbf7d0' }}>
                <Lightbulb size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {cl.content_suggestion}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function QuestionKeywords({ questions }) {
  if (!questions?.length) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No question keywords detected</div>
  return (
    <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>People Also Ask</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>Questions your audience is searching — create content to answer these</p>
      {questions.slice(0, 20).map((q, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
          <HelpCircle size={14} color="#8b5cf6" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{q.question}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#eff6ff', color: '#3b82f6', fontWeight: 600 }}>{q.type}</span>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: q.difficulty === 'LOW' ? '#f0fdf4' : '#fffbeb', color: q.difficulty === 'LOW' ? '#059669' : '#d97706', fontWeight: 600 }}>{q.difficulty}</span>
              {q.suggested_content_type && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#f5f3ff', color: '#8b5cf6' }}>{q.suggested_content_type}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Cannibalization({ cannibalization }) {
  if (!cannibalization?.length) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No keyword cannibalization detected</div>
  return (
    <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={16} color="#dc2626" /> Keyword Cannibalization
      </h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>Multiple pages competing for the same keyword — consolidate or differentiate</p>
      {cannibalization.map((c, i) => (
        <div key={i} style={{ padding: '12px 14px', background: '#fef2f2', borderRadius: 8, marginBottom: 10, border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>"{c.keyword}"</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: c.severity === 'HIGH' ? '#dc2626' : '#d97706', color: '#fff', fontWeight: 600 }}>{c.severity}</span>
          </div>
          <div style={{ fontSize: 12, color: '#059669', marginBottom: 6, padding: '6px 8px', background: '#f0fdf4', borderRadius: 4 }}>
            <strong>Fix:</strong> {c.recommendation}
          </div>
          {c.competing_pages?.map((p, j) => (
            <div key={j} style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, paddingLeft: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.has_in_title ? '#059669' : '#d97706', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.url}</span>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{p.word_count}w</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function QuickWins({ keywords }) {
  const wins = keywords.filter(k => k.opportunity === 'HIGH' && k.difficulty !== 'HIGH').slice(0, 10)
  if (!wins.length) return null
  return (
    <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20, marginBottom: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#059669', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Target size={16} color="#059669" /> Quick Win Keywords
      </h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>High-opportunity keywords you can rank for quickly</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
        {wins.map((kw, i) => (
          <div key={i} style={{ padding: '10px 12px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowUpRight size={14} color="#059669" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>{kw.keyword}</div>
              <div style={{ fontSize: 11, color: '#059669' }}>Frequency: {kw.frequency || kw.volume || '—'}{kw.difficulty ? ` · ${kw.difficulty} difficulty` : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const IMPACT_COLORS = {
  HIGH: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  MEDIUM: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  LOW: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
};

export default function KeywordStrategy() {
  const { id } = useParams()
  const [research, setResearch] = useState(null)
  const [enhanced, setEnhanced] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [activeTab, setActiveTab] = useState('keywords')
  const [search, setSearch] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.getKeywordResearch(id).catch(e => ({ __error: e?.message || 'failed' })),
      api.getKeywordsEnhanced(id).catch(e => ({ __error: e?.message || 'failed' })),
    ]).then(([res, enh]) => {
      const bothFailed = res?.__error && enh?.__error
      if (bothFailed) setLoadError(res.__error || 'Could not reach the keyword endpoints')
      setResearch(res?.__error ? null : res);
      setEnhanced(enh?.__error ? null : enh);
    }).finally(() => setLoading(false))
  }, [id])

  const loadAiSuggestions = async () => {
    setAiLoading(true);
    const data = await api.getAiSuggestions(id).catch(() => null);
    setAiSuggestions(data);
    if (!data) {
      const e = new CustomEvent('show-toast', { detail: { message: 'AI suggestions unavailable right now — try again shortly', type: 'error' } });
      window.dispatchEvent(e);
    }
    setAiLoading(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /><p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Researching keywords...</p></div>
  if (loadError && !research && !enhanced) return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <AlertTriangle size={32} color="#dc2626" style={{ marginBottom: 12 }} />
      <h3 style={{ margin: '0 0 6px' }}>Couldn't load keyword data</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{String(loadError)}</p>
      <button onClick={() => window.location.reload()} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Retry</button>
    </div>
  )

  const allKeywords = research?.keywords || enhanced?.keywords || []
  const summary = research?.summary || {}
  const totalVolume = allKeywords.reduce((sum, kw) => sum + (kw.frequency || kw.volume || 0), 0)
  const highOpp = allKeywords.filter(k => k.opportunity === 'HIGH').length

  const tabs = [
    { key: 'keywords', label: 'Keywords', icon: Key, count: allKeywords.length },
    { key: 'quickwins', label: 'Quick Wins', icon: Target, count: allKeywords.filter(k => k.opportunity === 'HIGH' && k.difficulty !== 'HIGH').length },
    { key: 'clusters', label: 'Topic Clusters', icon: GitMerge, count: research?.topic_clusters?.length || 0 },
    { key: 'questions', label: 'Questions', icon: HelpCircle, count: research?.question_keywords?.length || 0 },
    { key: 'cannibal', label: 'Cannibalization', icon: AlertTriangle, count: research?.cannibalization?.length || 0 },
    { key: 'ai', label: 'AI Suggestions', icon: Sparkles, count: aiSuggestions ? Object.values(aiSuggestions?.suggestions || {}).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0) : 0 },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <ThemeHero
          icon={Wand2}
          title="Keyword Strategy"
          subtitle="Keyword analysis from crawled content — frequency, intent, and topic clusters"
          badges={[
            { icon: Target, t: 'High opportunity' },
            { icon: GitMerge, t: 'Topic clusters' },
            { icon: Sparkles, t: 'AI suggestions' },
          ]}
          actions={<DataSourceBadge source="crawler" size="xs" />}
        />

        <div>
          <AiSuggestionStrip auditId={id} tool="keywords" title="AI keyword fixes" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          <ThemeStatCard icon={Key} label="Total Keywords" value={summary.total_keywords || allKeywords.length} color="#3b82f6" />
          <ThemeStatCard icon={BarChart3} label="Total Frequency" value={totalVolume.toLocaleString()} color="#8b5cf6" />
          <ThemeStatCard icon={Target} label="High Opportunity" value={highOpp} color="#059669" />
          <ThemeStatCard icon={AlertTriangle} label="Cannibalization" value={summary.cannibalization_issues || research?.cannibalization?.length || 0} color="#dc2626" />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder="Search keywords..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: 'var(--bg-white)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: '1px solid', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  background: activeTab === t.key ? '#1e293b' : '#fff', color: activeTab === t.key ? '#fff' : '#475569', borderColor: activeTab === t.key ? '#1e293b' : '#e2e8f0' }}>
                <Icon size={13} /> {t.label}
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: activeTab === t.key ? '#ffffff30' : '#f1f5f9', color: activeTab === t.key ? '#fff' : '#64748b' }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {activeTab === 'quickwins' && <QuickWins keywords={allKeywords} />}
        {activeTab === 'keywords' && <KeywordTable keywords={allKeywords} search={search} />}
        {activeTab === 'clusters' && <TopicClusters clusters={research?.topic_clusters} />}
        {activeTab === 'questions' && <QuestionKeywords questions={research?.question_keywords} />}
        {activeTab === 'cannibal' && <Cannibalization cannibalization={research?.cannibalization} />}
        {activeTab === 'ai' && (
          <div>
            {!aiSuggestions && !aiLoading && (
              <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 40, textAlign: 'center' }}>
                <Sparkles size={40} color="#3b82f6" style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>AI-Powered Keyword Suggestions</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>Get personalized AI recommendations for keyword strategy</p>
                <button onClick={loadAiSuggestions} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} /> Generate AI Suggestions
                </button>
              </div>
            )}
            {aiLoading && (
              <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 40, textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <Spinner size={48} />
                </div>
                <div style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>AI is analyzing keywords...</div>
              </div>
            )}
            {aiSuggestions && (() => {
              const s = aiSuggestions.suggestions || {};
              const summary = s.summary || '';
              const priority = s.priority_actions || [];
              const quick = s.quick_wins || [];
              const insights = s.strategic_insights || [];
              const content = s.content_recommendations || [];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {summary && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(168,85,247,0.05))', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: '18px 22px' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <Brain size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', marginBottom: 4 }}>AI Executive Summary</div>
                          <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.6 }}>{summary}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {priority.length > 0 && (
                    <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Priority Actions</h3>
                      {priority.map((a, i) => (
                        <div key={i} style={{ borderLeft: `3px solid ${IMPACT_COLORS[a.impact]?.color || '#f59e0b'}`, padding: '12px 16px', marginBottom: 8, background: 'var(--bg-secondary)', borderRadius: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{a.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.description}</div>
                          {a.specific_steps?.map((step, j) => (
                            <div key={j} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#475569', marginTop: 4 }}>
                              <ArrowRight size={12} color="#3b82f6" style={{ flexShrink: 0, marginTop: 3 }} /> {step}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {insights.length > 0 && (
                    <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Strategic Insights</h3>
                      {insights.map((i, j) => (
                        <div key={j} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#475569' }}>
                          <CheckCircle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} /> {i}
                        </div>
                      ))}
                    </div>
                  )}
                  {quick.length > 0 && (
                    <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Quick Wins</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                        {quick.map((w, k) => (
                          <div key={k} style={{ border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: 14, background: 'rgba(34,197,94,0.03)' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 4 }}>{w.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 6 }}>{w.description}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                              {w.estimated_time && <span><Clock size={12} /> {w.estimated_time}</span>}
                              {w.expected_improvement && <span style={{ color: '#059669' }}>{w.expected_improvement}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
