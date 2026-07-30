import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, ArrowRight, BarChart3, Zap, Brain, Target } from 'lucide-react'
import { api } from '../api'

export default function NewAudit() {
  const navigate = useNavigate()
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting.current) return
    setError('')
    let url = websiteUrl.trim()
    if (!url) { setError('Please enter a website URL'); return }
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
    try { new URL(url) } catch { setError('Please enter a valid URL'); return }

    submitting.current = true
    setLoading(true)
    try {
      let compUrl = competitorUrl.trim()
      if (compUrl && !compUrl.startsWith('http://') && !compUrl.startsWith('https://')) compUrl = 'https://' + compUrl
      if (compUrl) { try { new URL(compUrl) } catch { compUrl = '' } }
      const result = await api.startAudit(url, compUrl)
      navigate(`/audit/${result.audit_id}/progress`)
    } catch (e) {
      setError(e.message || 'Failed to start audit')
    } finally { setLoading(false); submitting.current = false }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: 40 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 6, letterSpacing: '-0.5px' }}>New Audit</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
          Analyze any website for SEO, technical, and AI search readiness.
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><Globe size={13} /> Website URL</label>
            <input type="text" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="example.com" autoFocus style={{ fontSize: 14, padding: '10px 14px' }} />
          </div>
          <div className="form-group">
            <label><Globe size={13} /> Competitor URL (optional)</label>
            <input type="text" value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)}
              placeholder="competitor.com" style={{ fontSize: 14, padding: '10px 14px' }} />
          </div>
          {error && <div className="error-box"><p>{error}</p></div>}
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Starting Audit...</> : <>Start Audit <ArrowRight size={14} /></>}
          </button>
          {loading && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
            Crawling your website and running AI analysis. This usually takes <strong>3 to 5 minutes</strong> depending on site size.
          </p>}
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
        {[
          { icon: BarChart3, label: '200+ Signals', desc: 'Technical & on-page' },
          { icon: Zap, label: 'AEO Analysis', desc: 'AI search readiness' },
          { icon: Brain, label: 'AI Visibility', desc: 'ChatGPT, Gemini, Perplexity' },
          { icon: Target, label: 'Competitor Intel', desc: 'Gap analysis' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <item.icon size={15} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
