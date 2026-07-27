import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { Gauge, AlertTriangle, CheckCircle, ArrowRight, TrendingUp, Smartphone } from 'lucide-react'

function MetricCard({ label, value, status, target }) {
  const color = status === 'good' ? '#12b886' : status === 'needs-improvement' ? '#f59f00' : '#fa5252'
  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {target && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Target: {target}</div>}
    </div>
  )
}

function IssueRow({ issue, onFix }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ minWidth: 60 }}>
        <span className={`badge ${issue.severity === 'CRITICAL' ? 'badge-red' : issue.severity === 'HIGH' ? 'badge-yellow' : 'badge-blue'}`}>
          {issue.severity}
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{issue.title || issue.message}</div>
        {issue.url && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{issue.url}</div>}
      </div>
      {issue.impact && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200 }}>{issue.impact}</div>
      )}
    </div>
  )
}

export default function SpeedAnalysis() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getReportData(id).then(res => {
      const pages = res.pages || []
      const cwv = res.core_web_vitals || {}
      const speedIssues = (res.issues || []).filter(i =>
        i.category === 'PERFORMANCE' || i.category === 'SPEED' || i.category === 'CORE_WEB_VITALS'
      )
      setData({ pages, cwv, speedIssues, summary: res.summary })
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading speed data...</p></div>
  if (error) return <div className="error-state">{error}</div>
  if (!data) return <div className="empty-state"><h3>No data available</h3></div>

  const lcp = data.cwv.lcp || {}
  const cls = data.cwv.cls || {}
  const inp = data.cwv.inp || {}
  const fcp = data.cwv.fcp || {}
  const ttfb = data.cwv.ttfb || {}

  return (
    <div>
      <div className="page-header">
        <h1>Speed & Core Web Vitals</h1>
        <p>Performance metrics and optimization opportunities</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        <MetricCard label="LCP" value={lcp.display || '-'} status={lcp.status || 'unknown'} target="< 2.5s" />
        <MetricCard label="CLS" value={cls.display || '-'} status={cls.status || 'unknown'} target="< 0.1" />
        <MetricCard label="INP" value={inp.display || '-'} status={inp.status || 'unknown'} target="< 200ms" />
        <MetricCard label="FCP" value={fcp.display || '-'} status={fcp.status || 'unknown'} target="< 1.8s" />
        <MetricCard label="TTFB" value={ttfb.display || '-'} status={ttfb.status || 'unknown'} target="< 800ms" />
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Performance Issues ({data.speedIssues.length})</h2>
        </div>
        {data.speedIssues.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No performance issues found</div>
        ) : (
          <div>
            {data.speedIssues.slice(0, 30).map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
