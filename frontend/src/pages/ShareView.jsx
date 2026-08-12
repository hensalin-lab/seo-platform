import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { Globe, AlertTriangle, CheckCircle2, XCircle, Shield, ExternalLink } from 'lucide-react'

function scoreColor(s) {
  if (s >= 80) return '#10b981'
  if (s >= 60) return '#06b6d4'
  if (s >= 40) return '#f59e0b'
  return '#ef4444'
}

function ScoreCard({ label, value }) {
  return (
    <div style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: scoreColor(value ?? 0), marginTop: 4 }}>{value ?? '—'}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}> / 100</span></div>
    </div>
  )
}

export default function ShareView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getPublicShare(token)
        setData(res)
      } catch (e) {
        setError(e.message)
      }
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading shared report...</p></div>

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #f8fafc)', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <XCircle size={28} color="#ef4444" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Report unavailable</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>{error}</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <a href="/login" style={{ color: 'var(--accent)' }}>Sign in</a> to run your own SEO audit with Datavi RankIQ.
          </p>
        </div>
      </div>
    )
  }

  const report = data.report || {}
  const summary = report.site_summary || {}
  const issuesSummary = report.issues_summary || {}
  const critical = report.critical_issues || []
  const recs = report.top_recommendations || []
  const sevBadge = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#3b82f6' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f8fafc)' }}>
      <header style={{ background: 'var(--bg-card, #fff)', borderBottom: '1px solid var(--border, #e2e8f0)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>D</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Datavi RankIQ</div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={13} /> Shared report · read-only
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Globe size={18} style={{ color: 'var(--accent)' }} />
          <a href={data.website_url} target="_blank" rel="noreferrer" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            {data.website_url} <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} />
          </a>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
          {report.report_title} · Generated {data.completed_at ? new Date(data.completed_at).toLocaleDateString() : ''}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
          <ScoreCard label="Overall" value={summary.overall_score} />
          <ScoreCard label="SEO" value={summary.seo_score} />
          <ScoreCard label="Technical" value={summary.technical_score} />
          <ScoreCard label="Content" value={summary.content_score} />
          <ScoreCard label="AEO" value={summary.aeo_score} />
          <ScoreCard label="AI Visibility" value={summary.ai_visibility_score} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 28 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Issues by severity</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
                <div key={s} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: sevBadge[s] }}>{issuesSummary.by_severity?.[s] || 0}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Crawl summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Pages crawled:</span> <strong>{summary.total_pages}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Issues found:</span> <strong>{summary.total_issues}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Recommendations:</span> <strong>{summary.total_recommendations}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Thin content:</span> <strong>{report.content_analysis?.thin_content_count || 0}</strong></div>
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} style={{ color: '#ef4444' }} /> Critical issues ({critical.length})
        </h3>
        {critical.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>No critical issues found. Great job!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {critical.map((i, idx) => (
              <div key={idx} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: sevBadge[i.severity] || '#ef4444', padding: '2px 8px', borderRadius: 999 }}>{i.severity}</span>
                  <strong style={{ fontSize: 13 }}>{i.signal}</strong>
                  {i.page && <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>{i.page}</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{i.description}</div>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} style={{ color: '#10b981' }} /> Top recommendations ({recs.length})
        </h3>
        {recs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>No recommendations to show.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recs.map((r, idx) => (
              <div key={idx} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(99,102,241,.1)', color: 'var(--accent)' }}>{r.category}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,.12)', color: '#b45309' }}>{r.priority}</span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{r.issue}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.exact_fix || r.why_it_matters}</div>
              </div>
            ))}
          </div>
        )}

        <footer style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid var(--border, #e2e8f0)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          Powered by Datavi RankIQ · This report is shared by the audit owner. Visit <a href="/login" style={{ color: 'var(--accent)' }}>RankIQ</a> to audit your own website.
        </footer>
      </main>
    </div>
  )
}
