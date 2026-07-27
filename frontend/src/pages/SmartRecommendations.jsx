import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import {
  Lightbulb, ArrowRight, Clock, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, Zap, Target, BookOpen, Link2,
  Database, Image, Globe, Shield, HelpCircle, ExternalLink
} from 'lucide-react'

const CATEGORY_ICONS = {
  'Title Tag': Target,
  'Meta Description': BookOpen,
  'Headings': Target,
  'Content': BookOpen,
  'Images': Image,
  'Internal Links': Link2,
  'External Links': ExternalLink,
  'Schema': Database,
  'E-E-A-T': Shield,
  'Trust Signals': Shield,
  'Content Structure': BookOpen,
  'Entities': Globe,
  'CTA': Target,
  'Freshness': Clock,
}

function PriorityBadge({ priority }) {
  const colors = {
    CRITICAL: { bg: '#fff5f5', color: '#fa5252', border: '#fecaca' },
    HIGH: { bg: '#fff9db', color: '#e67700', border: '#ffec99' },
    MEDIUM: { bg: '#edf2ff', color: '#4c6ef5', border: '#bac8ff' },
    LOW: { bg: '#e6fcf5', color: '#12b886', border: '#96f2d7' },
  }
  const c = colors[priority] || colors.MEDIUM
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: c.bg, color: c.color, border: `1px solid ${c.border}`, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
      {priority}
    </span>
  )
}

function DifficultyBadge({ difficulty }) {
  const colors = {
    EASY: { bg: '#e6fcf5', color: '#12b886' },
    MEDIUM: { bg: '#fff9db', color: '#e67700' },
    HARD: { bg: '#fff5f5', color: '#fa5252' },
  }
  const c = colors[difficulty] || colors.MEDIUM
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: c.bg, color: c.color, textTransform: 'uppercase' }}>
      {difficulty}
    </span>
  )
}

function ComparisonBlock({ current, recommended, label }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'start', marginTop: 10 }}>
      <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#fa5252', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>Current</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, fontFamily: current?.startsWith('<') ? 'monospace' : 'inherit' }}>{current || 'Not set'}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 12, color: 'var(--text-dim)', fontSize: 16 }}>→</div>
      <div style={{ background: '#e6fcf5', border: '1px solid #96f2d7', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#12b886', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>Recommended</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, fontFamily: recommended?.startsWith('<') ? 'monospace' : 'inherit' }}>{recommended}</div>
      </div>
    </div>
  )
}

function RecommendationCard({ rec, index }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = CATEGORY_ICONS[rec.category] || Lightbulb

  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 8, overflow: 'hidden' }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.1s' }}>
        <div style={{ minWidth: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {expanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{rec.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{rec.page_url ? rec.page_url.split('/').pop() || '/' : 'Site-wide'}</span>
            {rec.estimated_time && <span>· {rec.estimated_time}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <PriorityBadge priority={rec.priority} />
          <DifficultyBadge difficulty={rec.difficulty} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 18px 16px 54px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ paddingTop: 14 }}>
            {/* Why */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>Why this matters</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{rec.reason || rec.description}</div>
            </div>

            {/* SEO Impact */}
            {rec.seo_impact && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>SEO Impact</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{rec.seo_impact}</div>
              </div>
            )}

            {/* Business Impact */}
            {rec.business_impact && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>Business Impact</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{rec.business_impact}</div>
              </div>
            )}

            {/* Before / After */}
            {rec.current_value && (
              <ComparisonBlock current={rec.current_value} recommended={rec.recommended_value} />
            )}

            {/* How to implement */}
            {rec.implementation && (
              <div style={{ marginTop: 12, background: 'var(--bg-page)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>How to implement</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{rec.implementation}</div>
              </div>
            )}

            {/* Google Guideline */}
            {rec.google_guideline && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={11} />
                <span>{rec.google_guideline}</span>
              </div>
            )}

            {/* Meta */}
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: wrap }}>
              {rec.estimated_time && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={11} /> {rec.estimated_time}
                </div>
              )}
              {rec.category && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {rec.category}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SmartRecommendations() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.getRecommendations(id).then(res => {
      setData(res)
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner" />
      <p>Analyzing site and generating recommendations...</p>
    </div>
  )

  if (error) return <div className="error-state">{error}</div>

  const recommendations = data?.recommendations || data?.items || data || []
  const items = Array.isArray(recommendations) ? recommendations : []

  const filtered = filter === 'all' ? items : items.filter(r => r.priority === filter.toUpperCase())

  const counts = {
    all: items.length,
    critical: items.filter(r => r.priority === 'CRITICAL').length,
    high: items.filter(r => r.priority === 'HIGH').length,
    medium: items.filter(r => r.priority === 'MEDIUM').length,
    low: items.filter(r => r.priority === 'LOW').length,
  }

  return (
    <div>
      <div className="page-header">
        <h1>Smart Recommendations</h1>
        <p>Page-specific analysis with implementation guidance</p>
      </div>

      <div className="stats-row">
        <div className="stat-card" style={{ cursor: 'pointer', border: filter === 'all' ? '2px solid var(--accent)' : undefined }} onClick={() => setFilter('all')}>
          <div className="stat-info">
            <div className="stat-value">{counts.all}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', border: filter === 'critical' ? '2px solid #fa5252' : undefined }} onClick={() => setFilter('critical')}>
          <div className="stat-icon" style={{ background: '#fff5f5' }}><Zap size={16} style={{ color: '#fa5252' }} /></div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#fa5252' }}>{counts.critical}</div>
            <div className="stat-label">Critical</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', border: filter === 'high' ? '2px solid #e67700' : undefined }} onClick={() => setFilter('high')}>
          <div className="stat-icon" style={{ background: '#fff9db' }}><AlertTriangle size={16} style={{ color: '#e67700' }} /></div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#e67700' }}>{counts.high}</div>
            <div className="stat-label">High</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', border: filter === 'medium' ? '2px solid var(--accent)' : undefined }} onClick={() => setFilter('medium')}>
          <div className="stat-icon" style={{ background: 'var(--accent-light)' }}><Target size={16} style={{ color: 'var(--accent)' }} /></div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{counts.medium}</div>
            <div className="stat-label">Medium</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', border: filter === 'low' ? '2px solid #12b886' : undefined }} onClick={() => setFilter('low')}>
          <div className="stat-icon" style={{ background: '#e6fcf5' }}><CheckCircle size={16} style={{ color: '#12b886' }} /></div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#12b886' }}>{counts.low}</div>
            <div className="stat-label">Low</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="tab-bar">
          {[
            { key: 'all', label: `All (${counts.all})` },
            { key: 'critical', label: `Critical (${counts.critical})` },
            { key: 'high', label: `High (${counts.high})` },
            { key: 'medium', label: `Medium (${counts.medium})` },
            { key: 'low', label: `Low (${counts.low})` },
          ].map(tab => (
            <button key={tab.key} className={`tab ${filter === tab.key ? 'active' : ''}`} onClick={() => setFilter(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={40} style={{ color: '#12b886', marginBottom: 12 }} />
          <h3>No {filter !== 'all' ? filter : ''} recommendations</h3>
          <p>This site looks good for this priority level.</p>
        </div>
      ) : (
        <div>
          {filtered.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
