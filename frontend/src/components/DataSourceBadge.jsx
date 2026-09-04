import React from 'react'

const SOURCE_CONFIG = {
  serper: { label: 'Google SERP (Serper)', color: '#4285f4', icon: 'G' },
  openserp: { label: 'Google SERP (OpenSerp)', color: '#4285f4', icon: 'G' },
  google_cse: { label: 'Google Search', color: '#4285f4', icon: 'G' },
  ddg: { label: 'DuckDuckGo SERP', color: '#de5833', icon: 'D' },
  ddg_serp: { label: 'DuckDuckGo SERP', color: '#de5833', icon: 'D' },
  ddg_estimate: { label: 'DDG Estimate', color: '#de5833', icon: 'D' },
  serp_estimate: { label: 'SERP Estimate', color: '#4285f4', icon: 'S' },
  ddg_probe: { label: 'SERP Probe', color: '#4285f4', icon: 'S' },
  serp_probe: { label: 'SERP Probe', color: '#4285f4', icon: 'S' },
  gsc: { label: 'Google Search Console', color: '#34a853', icon: 'GSC' },
  common_crawl: { label: 'Common Crawl', color: '#f59e0b', icon: 'CC' },
  'common_crawl + open_pagerank': { label: 'Common Crawl + PageRank', color: '#f59e0b', icon: 'CC' },
  open_pagerank: { label: 'Open PageRank', color: '#6366f1', icon: 'PR' },
  pagerank: { label: 'Open PageRank', color: '#6366f1', icon: 'PR' },
  heuristic: { label: 'Heuristic', color: '#94a3b8', icon: 'H' },
  dataforseo: { label: 'DataForSEO', color: '#8b5cf6', icon: 'DFS' },
  serpapi: { label: 'SerpAPI', color: '#0ea5e9', icon: 'S' },
}

const STATUS_CONFIG = {
  connected: { label: 'GSC Connected', color: '#34a853', icon: '✓' },
  unconfigured: { label: 'GSC Not Connected', color: '#f59e0b', icon: '!' },
  error: { label: 'GSC Error', color: '#ef4444', icon: '✗' },
  no_data: { label: 'No GSC Data', color: '#94a3b8', icon: '—' },
}

export function DataSourceBadge({ source }) {
  const config = SOURCE_CONFIG[source] || { label: source || 'Unknown', color: '#94a3b8', icon: '?' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        background: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        background: config.color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 700,
      }}>
        {config.icon}
      </span>
      {config.label}
    </span>
  )
}

export function GSCStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unconfigured
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        background: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      <span style={{ fontSize: 12 }}>{config.icon}</span>
      {config.label}
    </span>
  )
}

export function DataQualityNote({ source, note }) {
  const isHeuristic = source === 'heuristic' || source === 'ddg_estimate' || source === 'ddg' || source === 'ddg_serp'
  const isReal = source === 'serper' || source === 'openserp' || source === 'google_cse' || source === 'gsc' || source === 'common_crawl + open_pagerank'
  const quality = isReal ? 'real' : isHeuristic ? 'estimate' : 'mixed'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <DataSourceBadge source={source} />
      {note && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {note}
        </span>
      )}
    </div>
  )
}
