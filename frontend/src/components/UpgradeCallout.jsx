import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, X, ArrowRight } from 'lucide-react'

const FREE_SOURCES = {
  serp_ranks: ['ddg', 'ddg_serp', 'ddg_estimate', 'serp_estimate', 'ddg_probe', 'serp_probe', 'unmeasured', 'keyless_serp', 'heuristic', 'free_probe'],
  backlinks: ['common_crawl', 'common_crawl + open_pagerank', 'open_pagerank', 'pagerank', 'keyless_backlinks', 'heuristic'],
  keyword_volume: ['keyless_volume', 'heuristic'],
  ai_citations: ['keyless_citations', 'heuristic'],
}

const SOURCE_CAPABILITY = {
  ddg: 'serp_ranks',
  ddg_serp: 'serp_ranks',
  ddg_estimate: 'serp_ranks',
  serp_estimate: 'serp_ranks',
  ddg_probe: 'serp_ranks',
  serp_probe: 'serp_ranks',
  unmeasured: 'serp_ranks',
  keyless_serp: 'serp_ranks',
  free_probe: 'serp_ranks',
  common_crawl: 'backlinks',
  'common_crawl + open_pagerank': 'backlinks',
  open_pagerank: 'backlinks',
  pagerank: 'backlinks',
  keyless_backlinks: 'backlinks',
  keyless_volume: 'keyword_volume',
  keyless_citations: 'ai_citations',
}

const CAP_META = {
  serp_ranks: {
    title: 'Estimated search positions',
    body: 'This tool is using a free keyless SERP estimate. Add Google Custom Search (free, 100 queries/day) or connect Serper / SerpAPI / DataForSEO for measured Google positions.',
    cta: 'Connect a SERP provider',
    accent: '#4285f4',
  },
  backlinks: {
    title: 'Crawl-derived backlink data',
    body: 'Links come from the free Common Crawl archive, which undercounts. Add a free Open PageRank key, or connect DataForSEO / Moz for a measured backlink index.',
    cta: 'Connect a backlink provider',
    accent: '#f59e0b',
  },
  keyword_volume: {
    title: 'Estimated search volumes',
    body: 'Volumes are heuristic estimates. Connect DataForSEO or SE Ranking for real monthly search volumes.',
    cta: 'Connect a volume provider',
    accent: '#8b5cf6',
  },
  ai_citations: {
    title: 'AI citation readiness proxy',
    body: 'Citation signals are a crawl-based proxy. Add a free Gemini key or connect Profound to check real AI citations.',
    cta: 'Connect a citation provider',
    accent: '#14b8a6',
  },
}

/**
 * Inline, dismissible upgrade prompt shown whenever a tool is running on a
 * free/keyless data source. Points the user at /integrations to connect a
 * paid (or free-with-key) provider. Renders nothing when the tool is already
 * using a configured provider or the source is unknown.
 */
export function UpgradeCallout({ source, capability, style }) {
  const navigate = useNavigate()
  const cap = capability || SOURCE_CAPABILITY[source]
  const meta = CAP_META[cap]
  const isFree = Boolean(cap && FREE_SOURCES[cap]?.includes(source))
  const storageKey = `upgrade-callout:${cap}`
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1' } catch { return false }
  })

  if (!meta || !isFree || dismissed) return null

  const dismiss = () => {
    try { localStorage.setItem(storageKey, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px', marginTop: 10,
        background: `${meta.accent}10`,
        border: `1px solid ${meta.accent}35`,
        borderLeft: `3px solid ${meta.accent}`,
        borderRadius: 8, textAlign: 'left', maxWidth: 760, marginLeft: 'auto', marginRight: 'auto',
        ...style,
      }}
    >
      <Sparkles size={16} style={{ color: meta.accent, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{meta.title}</div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 2, lineHeight: 1.5 }}>{meta.body}</div>
      </div>
      <button
        onClick={() => navigate('/integrations')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
          padding: '6px 10px', background: meta.accent, color: '#fff', border: 'none',
          borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {meta.cta} <ArrowRight size={12} />
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss upgrade prompt"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', flexShrink: 0, padding: 2 }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default UpgradeCallout
