import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, ArrowRight, BarChart3, Zap, Brain, Target, Sparkles } from 'lucide-react'
import { api } from '../api'

export default function NewAudit() {
  const navigate = useNavigate()
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
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

  async function handleDemo() {
    if (submitting.current) return
    setError('')
    submitting.current = true
    setDemoLoading(true)
    try {
      const result = await api.createDemo()
      navigate(`/audit/${result.audit_id}/dashboard`)
    } catch (e) {
      setError(e.message || 'Failed to create demo audit')
    } finally { setDemoLoading(false); submitting.current = false }
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', paddingTop: 32 }}>
      <div style={{
        borderRadius: 20, padding: '34px 34px 30px', color: '#fff', marginBottom: 24, position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(130% 170% at 0% 0%, rgba(99,102,241,0.92), rgba(139,92,246,0.85) 45%, rgba(217,70,239,0.78))',
        boxShadow: '0 24px 48px -20px rgba(124,58,237,0.55)',
      }}>
        <div style={{ position: 'absolute', right: -50, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
        <div style={{ position: 'absolute', right: 70, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.16)', marginBottom: 14 }}>
            <Sparkles size={11} /> AI-Powered SEO Intelligence
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.15 }}>Run a full AI SEO audit</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', maxWidth: 460, lineHeight: 1.6 }}>
            Analyze any website for technical SEO, on-page signals, Core Web Vitals, schema, and AI-search readiness — with ready-to-apply AI fixes.
          </p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><Globe size={13} /> Website URL</label>
            <input type="text" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="example.com" autoFocus style={{ fontSize: 14, padding: '12px 14px' }} />
          </div>
          <div className="form-group">
            <label><Globe size={13} /> Competitor URL (optional)</label>
            <input type="text" value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)}
              placeholder="competitor.com" style={{ fontSize: 14, padding: '12px 14px' }} />
          </div>
          {error && <div className="error-box"><p>{error}</p></div>}
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Starting Audit...</> : <>Start Audit <ArrowRight size={14} /></>}
          </button>
          {loading && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
            Crawling your website and running AI analysis. This usually takes <strong>3 to 5 minutes</strong> depending on site size.
          </p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <button type="button" className="btn" disabled={demoLoading} onClick={handleDemo} style={{ width: '100%', marginTop: 14 }}>
            {demoLoading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating sample audit...</> : <><Sparkles size={14} /> Try a sample audit</>}
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
        {[
          { icon: BarChart3, label: '200+ Signals', desc: 'Technical & on-page', color: '#6366f1', bg: '#eef2ff' },
          { icon: Zap, label: 'AEO Analysis', desc: 'AI search readiness', color: '#8b5cf6', bg: '#f5f3ff' },
          { icon: Brain, label: 'AI Visibility', desc: 'ChatGPT, Gemini, Perplexity', color: '#ec4899', bg: '#fdf2f8' },
          { icon: Target, label: 'Competitor Intel', desc: 'Gap analysis', color: '#06b6d4', bg: '#ecfeff' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 12, transition: 'all 0.2s ease', cursor: 'default' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <item.icon size={16} style={{ color: item.color }} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
