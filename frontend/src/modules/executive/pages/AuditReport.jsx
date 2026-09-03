import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BarChart3, AlertTriangle, Sparkles, Globe, Gauge, Search, Settings, Bot, Eye, FileText } from 'lucide-react'
import { api } from '../../../api'
import DataSourceBadge from '../../../components/DataSourceBadge'
import AIChatWidget from '../../../components/AIChatWidget'
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip'
import ThemeHero from '../../../components/ai/ThemeHero'
import ThemeStatCard from '../../../components/ai/ThemeStatCard'
import FixDetail from '../../../components/FixDetail'
import ShareAuditPanel from '../../../components/share/ShareAuditPanel'

function severityBadge(s) {
  if (s === 'CRITICAL') return 'badge-red'
  if (s === 'HIGH') return 'badge-red'
  if (s === 'MEDIUM') return 'badge-yellow'
  return 'badge-blue'
}

function priorityBadge(p) {
  if (p === 'CRITICAL') return 'badge-red'
  if (p === 'HIGH') return 'badge-red'
  if (p === 'MEDIUM') return 'badge-yellow'
  return 'badge-green'
}

function categoryBadge(c) {
  const map = { SEO: 'badge-blue', TECHNICAL: 'badge-cyan', AEO: 'badge-purple', GEO: 'badge-cyan', CONTENT: 'badge-green', AI_SEARCH: 'badge-pink', KEYWORDS: 'badge-orange', IMAGES: 'badge-orange' }
  return map[c] || 'badge-blue'
}

function scoreBadge(s) {
  if (s >= 80) return 'badge-green'
  if (s >= 60) return 'badge-cyan'
  if (s >= 40) return 'badge-yellow'
  return 'badge-red'
}

export default function AuditReport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [issues, setIssues] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [competitor, setCompetitor] = useState(null)
  const [pages, setPages] = useState([])
  const [keywords, setKeywords] = useState(null)
  const [contentData, setContentData] = useState(null)
  const [roadmap, setRoadmap] = useState(null)
  const [aiVis, setAiVis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('overview')
  const [issueFilter, setIssueFilter] = useState('all')
  const [issueCategory, setIssueCategory] = useState('all')
  const [selectedPage, setSelectedPage] = useState(null)
  const [pageDetail, setPageDetail] = useState(null)
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const d = await api.getAuditDetail(id)
        if (d.status !== 'COMPLETED' && d.status !== 'FAILED') {
          navigate(`/audit/${id}/progress`)
          return
        }
        setDetail(d)
        setPages(d.pages || [])
      } catch (err) { setError(err.message); return }
      try {
        const issuesResp = await api.getAuditIssues(id, { limit: 500 });
        setIssues(issuesResp.items || issuesResp || []);
      } catch {}
      try {
        const recsResp = await api.getAuditRecommendations(id, { limit: 200 });
        setRecommendations(recsResp.items || recsResp || []);
      } catch {}
      try { setCompetitor(await api.getCompetitorData(id)) } catch {}
      try { setKeywords(await api.getKeywordData(id)) } catch {}
      try { setContentData(await api.getContentData(id)) } catch {}
      try { setRoadmap(await api.getRoadmap(id)) } catch {}
      try { setAiVis(await api.getAIVisibility(id)) } catch {}
      setLoading(false)
    }
    load()
  }, [id, navigate])

  const loadPageDetail = async (pageIdx) => {
    try {
      const pd = await api.getPageDetail(id, pageIdx)
      setPageDetail(pd)
      setSelectedPage(pageIdx)
      setTab('page-detail')
    } catch {}
  }

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading report...</p></div>
  if (error) return <div><div className="error-state">{error}</div><button className="btn btn-secondary" onClick={() => navigate('/')}>Back</button></div>
  if (!detail) return null

  const scores = detail.scores || {}
  const aiVisData = detail.ai_visibility || aiVis || {}
  const filteredIssues = issues.filter(i => {
    if (issueFilter !== 'all' && i.severity !== issueFilter) return false
    if (issueCategory !== 'all' && i.category !== issueCategory) return false
    return true
  })

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'issues', label: `Issues (${issues.length})` },
    { id: 'recommendations', label: `AI Recs (${recommendations.length})` },
    { id: 'pages', label: `Pages (${pages.length})` },
    { id: 'keywords', label: 'Keywords' },
    { id: 'content', label: 'Content' },
    { id: 'competitor', label: 'Competitor' },
    { id: 'ai-visibility', label: 'AI Visibility' },
    { id: 'roadmap', label: 'Roadmap' },
    { id: 'signals', label: 'Signals' },
    { id: 'share', label: 'Share' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <ThemeHero
        icon={BarChart3}
        title="SEO Intelligence Report"
        subtitle={detail.competitor_url ? `${detail.website_url} vs ${detail.competitor_url.replace('https://', '').replace('http://', '')}` : detail.website_url}
        badges={[
          { icon: AlertTriangle, t: `${issues.length} issues` },
          { icon: Sparkles, t: `${recommendations.length} AI recs` },
          { icon: Globe, t: `${pages.length} pages` },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowChat(!showChat)}>AI Assistant</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/new')}>New Audit</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>History</button>
          </div>
        }
      />

      <AiSuggestionStrip auditId={id} tool="report" title="AI fixes" />

      <div style={{ marginBottom: 8 }}>
        <DataSourceBadge source="estimated" size="xs" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Overall', value: scores.overall_score, icon: Gauge, color: '#7c3aed' },
          { label: 'SEO', value: scores.seo_score, icon: Search, color: '#3b82f6' },
          { label: 'Technical', value: scores.technical_score, icon: Settings, color: '#06b6d4' },
          { label: 'AEO', value: scores.aeo_score, icon: Bot, color: '#f59e0b' },
          { label: 'GEO', value: scores.geo_score, icon: Globe, color: '#10b981' },
          { label: 'Content', value: scores.content_score, icon: FileText, color: '#ec4899' },
          { label: 'AI Visibility', value: scores.ai_visibility_score, icon: Eye, color: '#f43f5e' },
        ].map(s => (
          <ThemeStatCard key={s.label} icon={s.icon} label={s.label} value={s.value ?? '-'} color={s.color} sub="/ 100" />
        ))}
      </div>

      <div className="tab-bar">
        {tabs.map(t => (
          <div key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => { setTab(t.id); setPageDetail(null) }}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div className="grid-2">
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Issues Summary</h3>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'Critical', count: issues.filter(i => i.severity === 'CRITICAL').length, cls: 'badge-red' },
                  { label: 'High', count: issues.filter(i => i.severity === 'HIGH').length, cls: 'badge-red' },
                  { label: 'Medium', count: issues.filter(i => i.severity === 'MEDIUM').length, cls: 'badge-yellow' },
                  { label: 'Low', count: issues.filter(i => i.severity === 'LOW').length, cls: 'badge-blue' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div className={`badge ${s.cls}`} style={{ fontSize: 14, padding: '4px 12px' }}>{s.count}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Crawl Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Pages:</span> <strong>{detail.total_pages}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Issues:</span> <strong>{issues.length}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Recommendations:</span> <strong>{recommendations.length}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Keywords:</span> <strong>{keywords?.top_keywords?.length || 0}</strong></div>
              </div>
            </div>
          </div>

          {issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').slice(0, 5).length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Top Critical Issues</h3>
              <div className="issue-list">
                {issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').slice(0, 5).map(i => (
                  <div className="issue-item" key={i.id}>
                    <div className="issue-header">
                      <span className="issue-title">{i.signal_name || i.description}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span className={`badge ${severityBadge(i.severity)}`}>{i.severity}</span>
                        <span className={`badge ${categoryBadge(i.category)}`}>{i.category}</span>
                      </div>
                    </div>
                    {i.page_url && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{i.page_url}</div>}
                    <div className="issue-desc">{i.description}</div>
                    {i.problem && <div style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 4 }}>Problem: {i.problem}</div>}
                    {i.fix && <FixDetail issue={i} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendations.slice(0, 3).length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Top AI Recommendations</h3>
              {recommendations.slice(0, 3).map(r => (
                <div className="rec-card" key={r.id}>
                  <div className="rec-header">
                    <span className="rec-title">{r.issue || 'Recommendation'}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span className={`badge ${priorityBadge(r.priority)}`}>{r.priority}</span>
                      <span className={`badge ${categoryBadge(r.category)}`}>{r.category}</span>
                    </div>
                  </div>
                  {r.current_problem && <div className="rec-desc" style={{ marginBottom: 4 }}><strong>Problem:</strong> {r.current_problem}</div>}
                  {r.why_it_matters && <div className="rec-desc" style={{ marginBottom: 4 }}><strong>Why:</strong> {r.why_it_matters}</div>}
                  {r.exact_fix && <div style={{ fontSize: 12, color: 'var(--accent-green)', padding: '8px 12px', background: 'rgba(34,197,94,0.06)', borderRadius: 6, marginTop: 6 }}>Fix: {r.exact_fix}</div>}
                </div>
              ))}
            </div>
          )}

          {aiVisData.chatgpt_visibility != null && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>AI Search Visibility</h3>
              <div className="ai-visibility-grid">
                {[
                  { platform: 'ChatGPT', score: aiVisData.chatgpt_visibility, color: 'var(--accent-green)' },
                  { platform: 'Gemini', score: aiVisData.gemini_visibility, color: 'var(--accent-blue)' },
                  { platform: 'Perplexity', score: aiVisData.perplexity_visibility, color: 'var(--accent-purple)' },
                ].map(p => (
                  <div key={p.platform} className="ai-vis-card">
                    <div className="platform">{p.platform}</div>
                    <div className="score" style={{ color: p.color }}>{p.score ?? '-'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 100</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'issues' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
              <button key={f} className={`btn btn-xs ${issueFilter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIssueFilter(f)}>
                {f === 'all' ? `All (${issues.length})` : `${f} (${issues.filter(i => i.severity === f).length})`}
              </button>
            ))}
            <span style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
            {['all', 'SEO', 'TECHNICAL', 'AEO', 'GEO', 'CONTENT', 'AI_SEARCH'].map(c => (
              <button key={c} className={`btn btn-xs ${issueCategory === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIssueCategory(c)}>
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
          <div className="issue-list">
            {filteredIssues.map(i => (
              <div className="issue-item" key={i.id}>
                <div className="issue-header">
                  <span className="issue-title">{i.signal_name || i.description}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <span className={`badge ${severityBadge(i.severity)}`}>{i.severity}</span>
                    <span className={`badge ${categoryBadge(i.category)}`}>{i.category}</span>
                  </div>
                </div>
                {i.page_url && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{i.page_url}</div>}
                <div className="issue-desc">{i.description}</div>
                {i.problem && <div style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 4 }}>Problem: {i.problem}</div>}
                {i.why && <div style={{ fontSize: 12, color: 'var(--accent-yellow)', marginTop: 2 }}>Why it matters: {i.why}</div>}
                {i.fix && <FixDetail issue={i} />}
              </div>
            ))}
            {filteredIssues.length === 0 && <div className="empty-state"><h3>No issues match filters</h3></div>}
          </div>
        </div>
      )}

      {tab === 'recommendations' && (
        <div>
          {recommendations.map(r => (
            <div className="rec-card" key={r.id}>
              <div className="rec-header">
                <span className="rec-title">{r.issue || 'Recommendation'}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span className={`badge ${priorityBadge(r.priority)}`}>{r.priority}</span>
                  <span className={`badge ${categoryBadge(r.category)}`}>{r.category}</span>
                  {r.difficulty && <span className="badge badge-blue">{r.difficulty}</span>}
                </div>
              </div>
              {r.current_problem && <div className="rec-desc" style={{ marginBottom: 4 }}><strong>Problem:</strong> {r.current_problem}</div>}
              {r.why_it_matters && <div className="rec-desc" style={{ marginBottom: 4 }}><strong>Why it matters:</strong> {r.why_it_matters}</div>}
              {r.exact_fix && <div style={{ fontSize: 12, color: 'var(--accent-green)', padding: '8px 12px', background: 'rgba(34,197,94,0.06)', borderRadius: 6, marginBottom: 8 }}>Fix: {r.exact_fix}</div>}
              {r.before_example && <div className="rec-desc" style={{ fontSize: 12 }}><span style={{ color: 'var(--accent-red)' }}>Before:</span> {r.before_example}</div>}
              {r.after_example && <div className="rec-desc" style={{ fontSize: 12 }}><span style={{ color: 'var(--accent-green)' }}>After:</span> {r.after_example}</div>}
              {r.suggested_heading && <div className="rec-desc" style={{ fontSize: 12, color: 'var(--accent-cyan)' }}>Suggested heading: {r.suggested_heading}</div>}
              {r.suggested_content && <div className="rec-desc" style={{ fontSize: 12, color: 'var(--accent-purple)', marginTop: 4 }}>Suggested content: {r.suggested_content}</div>}
              {r.keywords && r.keywords.length > 0 && (
                <div className="tags" style={{ marginTop: 8 }}>{r.keywords.map((k, i) => <span className="tag" key={i}>{k}</span>)}</div>
              )}
              {r.expected_impact && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Expected impact: {r.expected_impact}</div>}
            </div>
          ))}
          {recommendations.length === 0 && <div className="empty-state"><h3>No recommendations</h3><p>Set GEMINI_API_KEY for AI-powered recommendations</p></div>}
        </div>
      )}

      {tab === 'pages' && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>URL</th><th>Score</th><th>Status</th><th>Title</th><th>Words</th><th>Links</th><th>Schema</th><th></th></tr>
              </thead>
              <tbody>
                {pages.map((p, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: 300 }} className="truncate"><span style={{ color: 'var(--text)' }}>{p.url}</span></td>
                    <td><span className={`badge ${scoreBadge(p.page_score || 0)}`}>{p.page_score ?? '-'}</span></td>
                    <td><span className={`badge ${p.status_code === 200 ? 'badge-green' : 'badge-red'}`}>{p.status_code || '-'}</span></td>
                    <td style={{ maxWidth: 200 }} className="truncate">{p.title || <span style={{ color: 'var(--accent-red)' }}>Missing</span>}</td>
                    <td>{p.word_count}</td>
                    <td>{p.links_internal_count ?? '-'}i / {p.links_external_count ?? '-'}e</td>
                    <td>{p.schema_count ?? p.schema_markup?.length ?? 0}</td>
                    <td><button className="btn btn-secondary btn-xs" onClick={() => loadPageDetail(i)}>Detail</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'keywords' && keywords && (
        <div>
          {keywords.top_keywords && keywords.top_keywords.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Top Keywords</h3>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Keyword</th><th>Frequency</th></tr></thead>
                  <tbody>
                    {keywords.top_keywords.slice(0, 20).map((kw, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text)' }}>{Array.isArray(kw) ? kw[0] : kw.keyword || kw}</td>
                        <td>{Array.isArray(kw) ? kw[1] : kw.frequency || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {keywords.missing_keywords && keywords.missing_keywords.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Missing Keywords (Competitor Has, You Don't)</h3>
              <div className="issue-list">
                {keywords.missing_keywords.slice(0, 15).map((kw, i) => (
                  <div className="issue-item" key={i}>
                    <div className="issue-header">
                      <span className="issue-title">{kw.keyword}</span>
                      <span className="badge badge-orange">Missing</span>
                    </div>
                    <div className="issue-desc">Competitor frequency: {kw.competitor_frequency}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {keywords.keyword_clusters && keywords.keyword_clusters.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Keyword Clusters</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                {keywords.keyword_clusters.map((cluster, i) => (
                  <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--accent-blue)' }}>{cluster.cluster}</div>
                    <div className="tags">{cluster.keywords?.map((kw, j) => <span className="tag" key={j}>{kw.keyword || kw}</span>)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Total frequency: {cluster.total_frequency}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'content' && contentData && (
        <div>
          {contentData.content_quality && contentData.content_quality.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Content Quality Analysis</h3>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>URL</th><th>Score</th><th>Grade</th><th>Words</th><th>H1</th><th>H2s</th><th>Links</th></tr></thead>
                  <tbody>
                    {contentData.content_quality.slice(0, 20).map((cq, i) => (
                      <tr key={i}>
                        <td style={{ maxWidth: 250 }} className="truncate">{cq.url}</td>
                        <td><span className={`badge ${scoreBadge(cq.score)}`}>{cq.score}</span></td>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{cq.grade}</td>
                        <td>{cq.word_count}</td>
                        <td>{cq.headings?.h1 || 0}</td>
                        <td>{cq.headings?.h2 || 0}</td>
                        <td>{cq.internal_links || 0}i / {cq.external_links || 0}e</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {contentData.search_intent && contentData.search_intent.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Search Intent Analysis</h3>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>URL</th><th>Primary Intent</th><th>Commercial</th><th>Informational</th><th>Transactional</th></tr></thead>
                  <tbody>
                    {contentData.search_intent.slice(0, 15).map((si, i) => (
                      <tr key={i}>
                        <td style={{ maxWidth: 250 }} className="truncate">{si.url}</td>
                        <td><span className={`badge ${si.primary_intent === 'commercial' ? 'badge-green' : si.primary_intent === 'informational' ? 'badge-blue' : 'badge-purple'}`}>{si.primary_intent}</span></td>
                        <td>{si.intent_scores?.commercial || 0}</td>
                        <td>{si.intent_scores?.informational || 0}</td>
                        <td>{si.intent_scores?.transactional || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {contentData.content_recommendations && contentData.content_recommendations.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Content Recommendations</h3>
              {contentData.content_recommendations.map((rec, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${rec.priority === 'HIGH' ? 'badge-red' : 'badge-yellow'}`}>{rec.priority}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{rec.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{rec.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'competitor' && (
        <div>
          {competitor && competitor.competitor_url ? (
            <>
              {competitor.seo_comparison && Object.keys(competitor.seo_comparison).length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 14, marginBottom: 16 }}>SEO Comparison</h3>
                  <div className="grid-2">
                    <div>
                      <h4 style={{ fontSize: 13, color: 'var(--accent-blue)', marginBottom: 8, fontWeight: 600 }}>Your Website</h4>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
                        Pages: <strong>{competitor.seo_comparison.your_pages}</strong><br />
                        Avg words: <strong>{competitor.seo_comparison.your_avg_words}</strong><br />
                        Schema: <strong>{competitor.seo_comparison.your_schema_coverage}%</strong><br />
                        Internal links: <strong>{competitor.seo_comparison.your_internal_links}</strong>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 13, color: 'var(--accent-red)', marginBottom: 8, fontWeight: 600 }}>Competitor</h4>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
                        Pages: <strong>{competitor.seo_comparison.competitor_pages}</strong><br />
                        Avg words: <strong>{competitor.seo_comparison.competitor_avg_words}</strong><br />
                        Schema: <strong>{competitor.seo_comparison.competitor_schema_coverage}%</strong><br />
                        Internal links: <strong>{competitor.seo_comparison.competitor_internal_links}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {competitor.strengths?.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 14, marginBottom: 12 }}>Your Strengths</h3>
                  {competitor.strengths.map((s, i) => (
                    <div key={i} style={{ padding: '6px 0', fontSize: 13, color: 'var(--accent-green)' }}>+ {typeof s === 'string' ? s : JSON.stringify(s)}</div>
                  ))}
                </div>
              )}

              {competitor.weaknesses?.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 14, marginBottom: 12 }}>Weaknesses to Address</h3>
                  {competitor.weaknesses.map((w, i) => (
                    <div key={i} style={{ padding: '6px 0', fontSize: 13, color: 'var(--accent-yellow)' }}>! {typeof w === 'string' ? w : JSON.stringify(w)}</div>
                  ))}
                </div>
              )}

              {competitor.winning_strategy?.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 14, marginBottom: 12 }}>Winning Strategy</h3>
                  {competitor.winning_strategy.map((w, i) => (
                    <div key={i} style={{ padding: '6px 0', fontSize: 13, color: 'var(--accent-cyan)' }}>{'→ '}{typeof w === 'string' ? w : JSON.stringify(w)}</div>
                  ))}
                </div>
              )}

              {competitor.keyword_opportunities?.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 14, marginBottom: 12 }}>Keyword Opportunities</h3>
                  <div className="issue-list">
                    {competitor.keyword_opportunities.map((k, i) => (
                      <div className="issue-item" key={i}>
                        <div className="issue-title">{k.topic || k.url || 'Opportunity'}</div>
                        <div className="issue-desc">{k.reason || ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state"><h3>No competitor data</h3><p>Add a competitor URL in your next audit</p></div>
          )}
        </div>
      )}

      {tab === 'ai-visibility' && (
        <div>
          <div className="ai-visibility-grid">
            {[
              { platform: 'ChatGPT', score: aiVisData.chatgpt_visibility ?? 0, color: 'var(--accent-green)', desc: 'Citation readiness for ChatGPT web search' },
              { platform: 'Google Gemini', score: aiVisData.gemini_visibility ?? 0, color: 'var(--accent-blue)', desc: 'Visibility in AI Overviews' },
              { platform: 'Perplexity', score: aiVisData.perplexity_visibility ?? 0, color: 'var(--accent-purple)', desc: 'Citation in Perplexity answers' },
            ].map(p => (
              <div key={p.platform} className="ai-vis-card">
                <div className="platform">{p.platform}</div>
                <div className="score" style={{ color: p.color }}>{p.score}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>/ 100</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{p.desc}</div>
              </div>
            ))}
          </div>

          {(aiVisData.citation_opportunities || []).length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Citation Opportunities</h3>
              <div className="tags">
                {(aiVisData.citation_opportunities || []).map((opp, i) => (
                  <span className="tag" key={i}>{typeof opp === 'string' ? opp : JSON.stringify(opp)}</span>
                ))}
              </div>
            </div>
          )}

          {(aiVisData.ai_recommendations || []).length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>AI Optimization Tips</h3>
              {(aiVisData.ai_recommendations || []).map((rec, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {typeof rec === 'string' ? rec : JSON.stringify(rec)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'roadmap' && roadmap && (
        <div>
          {[
            { key: 'immediate', label: 'Immediate Actions (This Week)', color: 'var(--accent-red)' },
            { key: 'week_1', label: 'Week 1 - Quick Wins', color: 'var(--accent-yellow)' },
            { key: 'month_1', label: 'Month 1 - Strategic Improvements', color: 'var(--accent-blue)' },
            { key: 'month_3', label: 'Month 3 - Long-term Growth', color: 'var(--accent-green)' },
          ].map(({ key, label, color }) => (
            roadmap[key] && roadmap[key].length > 0 && (
              <div key={key} className="roadmap-phase">
                <div className="roadmap-phase-label" style={{ color }}>{label}</div>
                {roadmap[key].map((task, i) => (
                  <div key={i} className="roadmap-task">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span className={`badge ${priorityBadge(task.priority)}`}>{task.priority}</span>
                      <span className="roadmap-task-title">{task.task}</span>
                    </div>
                    {task.category && <span className={`badge ${categoryBadge(task.category)}`} style={{ marginBottom: 4 }}>{task.category}</span>}
                    {task.page && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Page: {task.page}</div>}
                    {task.impact && <div className="roadmap-task-desc">Impact: {task.impact}</div>}
                    {task.fix && <FixDetail issue={task} />}
                    {task.details && task.details.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {task.details.map((d, j) => (
                          <div key={j} style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 12, paddingTop: 2 }}>* {d}</div>
                        ))}
                      </div>
                    )}
                    {task.keywords && task.keywords.length > 0 && (
                      <div className="tags" style={{ marginTop: 6 }}>
                        {task.keywords.map((kw, j) => <span className="tag" key={j}>{kw}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ))}
        </div>
      )}

      {tab === 'signals' && scores.signals && (
        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 16 }}>All Signals ({Object.keys(scores.signals).length})</h3>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>ID</th><th>Signal</th><th>Category</th><th>Score</th><th>Weight</th><th>Description</th></tr></thead>
              <tbody>
                {Object.entries(scores.signals).map(([key, sig]) => (
                  <tr key={key}>
                    <td>{sig.id}</td>
                    <td style={{ color: 'var(--text)' }}>{sig.name}</td>
                    <td><span className={`badge ${categoryBadge(sig.category)}`}>{sig.category}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${sig.score * 100}%`, borderRadius: 3, background: sig.score >= 0.7 ? 'var(--accent-green)' : sig.score >= 0.4 ? 'var(--accent-yellow)' : 'var(--accent-red)' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: sig.score >= 0.7 ? 'var(--accent-green)' : sig.score >= 0.4 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                          {Math.round(sig.score * 100)}%
                        </span>
                      </div>
                    </td>
                    <td>{sig.weight}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sig.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'share' && <ShareAuditPanel auditId={id} />}

      {tab === 'page-detail' && pageDetail && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setTab('pages'); setPageDetail(null) }}>Back to Pages</button>
          </div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14 }}>Page Analysis</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className={`badge ${scoreBadge(pageDetail.page_score)}`}>{pageDetail.page_score}/100</span>
                <span className={`badge ${pageDetail.status_code === 200 ? 'badge-green' : 'badge-red'}`}>{pageDetail.status_code}</span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
              <div><strong>URL:</strong> {pageDetail.url}</div>
              <div><strong>Title:</strong> {pageDetail.title || <span style={{ color: 'var(--accent-red)' }}>Missing</span>}</div>
              <div><strong>Meta:</strong> {pageDetail.meta_description || <span style={{ color: 'var(--accent-red)' }}>Missing</span>}</div>
              <div><strong>H1:</strong> {pageDetail.h1 || <span style={{ color: 'var(--accent-red)' }}>Missing</span>}</div>
              <div><strong>Words:</strong> {pageDetail.word_count}</div>
              <div><strong>Speed:</strong> {pageDetail.response_time_ms}ms</div>
            </div>
            {pageDetail.page_score_breakdown && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 13, marginBottom: 8 }}>Score Breakdown</h4>
                {Object.entries(pageDetail.page_score_breakdown).map(([cat, score]) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize', minWidth: 100 }}>{cat}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${score * 100}%`, borderRadius: 3, background: score >= 0.7 ? 'var(--accent-green)' : score >= 0.4 ? 'var(--accent-yellow)' : 'var(--accent-red)' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{Math.round(score * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pageDetail.issues && pageDetail.issues.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Issues ({pageDetail.issues.length})</h3>
              <div className="issue-list">
                {pageDetail.issues.map((issue, i) => (
                  <div className="issue-item" key={i}>
                    <div className="issue-header">
                      <span className="issue-title">{issue.signal_name}</span>
                      <span className={`badge ${severityBadge(issue.severity)}`}>{issue.severity}</span>
                    </div>
                    <div className="issue-desc">{issue.description}</div>
                    {issue.fix && <FixDetail issue={issue} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pageDetail.schema_markup && pageDetail.schema_markup.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Schema Markup</h3>
              <pre style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'auto', maxHeight: 300, padding: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                {JSON.stringify(pageDetail.schema_markup, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {showChat && <AIChatWidget auditId={id} onClose={() => setShowChat(false)} />}
    </div>
  )
}
