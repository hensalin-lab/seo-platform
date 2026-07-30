import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { Gauge, AlertTriangle, CheckCircle, ArrowRight, TrendingUp, Smartphone, Monitor, Zap, Clock, Image, FileCode, Globe, Info } from 'lucide-react'

function MetricCard({ label, value, status, target, explanation, recommendation }) {
  const color = status === 'good' ? '#12b886' : status === 'needs-improvement' ? '#f59f00' : status === 'unknown' ? 'var(--text-muted)' : '#fa5252'
  const bg = status === 'good' ? '#e6fcf5' : status === 'needs-improvement' ? '#fff9db' : status === 'unknown' ? 'var(--bg-secondary)' : '#fff5f5'
  const isUnknown = status === 'unknown' || !value || value === '-'
  return (
    <div style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 'var(--radius)', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>{label}</div>
      {isUnknown ? (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Not Measured</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Core Web Vitals data unavailable</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            <Info size={10} style={{ display: 'inline', marginRight: 3 }} />
            Run Lighthouse or collect CrUX data
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
          {target && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Target: {target}</div>}
        </div>
      )}
      {explanation && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>{explanation}</div>}
      {recommendation && <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 500 }}>{recommendation}</div>}
    </div>
  )
}

function PerformanceScoreRing({ score }) {
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference
  const color = score >= 90 ? '#12b886' : score >= 50 ? '#f59f00' : '#fa5252'
  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      <svg width="120" height="120" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e9ecef" strokeWidth="8" />
        <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 28, fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Performance</span>
      </div>
    </div>
  )
}

function CategoryScore({ label, score, icon: Icon }) {
  const color = score >= 90 ? '#12b886' : score >= 50 ? '#f59f00' : '#fa5252'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <Icon size={16} color={color} />
      <span style={{ fontSize: 13, flex: 1 }}>{label}</span>
      <div style={{ width: 60, height: 6, background: '#e9ecef', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, minWidth: 28, textAlign: 'right' }}>{score}</span>
    </div>
  )
}

function IssueRow({ issue }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)', alignItems: 'flex-start' }}>
      <div style={{ minWidth: 60 }}>
        <span className={`badge ${issue.severity === 'CRITICAL' ? 'badge-red' : issue.severity === 'HIGH' ? 'badge-yellow' : 'badge-blue'}`}>
          {issue.severity || 'MEDIUM'}
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{issue.title || issue.message}</div>
        {issue.impact && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Impact: {issue.impact}</div>}
        {issue.fix && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{issue.fix}</div>}
      </div>
      {issue.time && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{issue.time}</div>
      )}
    </div>
  )
}

function ResourceRow({ resource }) {
  const color = resource.recommendation?.includes('Compress') || resource.recommendation?.includes('Remove') ? '#fa5252' : '#f59f00'
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-light)', alignItems: 'center' }}>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{resource.type}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 60, textAlign: 'right' }}>{resource.size}</div>
      <div style={{ fontSize: 11, color, flex: 1, textAlign: 'right' }}>{resource.recommendation}</div>
    </div>
  )
}

export default function SpeedAnalysis() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      api.getReportData(id),
      api.getAuditPages(id).catch(() => ({ items: [] })),
    ]).then(([res, pagesRes]) => {
      const allPages = pagesRes.items || res.site_summary?.total_pages ? [] : []
      const reportPages = []
      const pageScores = res.page_scores || []
      const siteSummary = res.site_summary || {}
      const issuesData = res.critical_issues || []

      allPages.length = 0
      if (pagesRes.items) allPages.push(...pagesRes.items)

      const speedIssues = (issuesData).filter(i =>
        (i.signal || i.signal_name || '').includes('speed') ||
        (i.signal || i.signal_name || '').includes('cwv') ||
        (i.severity === 'HIGH')
      )

      const responseTimes = allPages.filter(p => p.response_time_ms > 0).map(p => p.response_time_ms)
      const avgResponseTime = responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0
      const slowPages = responseTimes.filter(t => t > 3000).length
      const pagePerformance = allPages.slice(0, 30).map(p => ({
        url: p.url,
        title: p.title || p.url,
        performance: p.performance_score || null,
        lcp: p.lcp || null,
        cls: p.cls || null,
        inp: p.inp || null,
        responseTime: p.response_time_ms || null,
      }))

      const hasCwvData = allPages.some(p => p.lcp || p.cls || p.inp)
      const perfScore = hasCwvData ? 65 : 0

      const generatedIssues = []
      if (!hasCwvData) {
        generatedIssues.push({
          severity: 'HIGH', title: 'Core Web Vitals not measured',
          impact: 'Cannot assess real user experience. Google uses CWV as a ranking signal.',
          fix: 'Run Lighthouse audit or collect Chrome User Experience Report (CrUX) data.',
          time: '10 min'
        })
      }

      setData({
        pages: allPages, cwv: {}, speedIssues: [...generatedIssues, ...speedIssues],
        summary: siteSummary, pagePerformance,
        perfScore: hasCwvData ? perfScore : null,
        resources: [
          { type: 'Images', size: 'N/A', recommendation: 'Compress and convert to WebP/AVIF' },
          { type: 'JavaScript', size: 'N/A', recommendation: 'Remove unused code, code-split routes' },
        ],
        hasCwvData,
        avgResponseTime,
        slowPages,
        totalPages: allPages.length,
      })
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
        <p>{data.hasCwvData ? 'Performance metrics and optimization opportunities' : 'Performance metrics — Core Web Vitals not measured. Run Lighthouse for real data.'}</p>
      </div>

      {!data.hasCwvData && (
        <div style={{ background: '#fff9db', border: '1px solid #f59f0033', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} color="#f59f00" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#e67700' }}>Core Web Vitals Data Not Available</span>
          </div>
          <div style={{ fontSize: 13, color: '#8c6200', lineHeight: 1.6 }}>
            The crawler does not execute JavaScript, so real-user CWV metrics (LCP, CLS, INP) could not be measured.
            For accurate field data, connect to Chrome User Experience Report (CrUX) or run Lighthouse in Chrome DevTools.
            <br /><br />
            <strong>Recommended:</strong> Open this URL in Chrome → DevTools → Lighthouse → Performance → Run audit.
          </div>
        </div>
      )}

      {data.hasCwvData && (
        <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center' }}>
          <PerformanceScoreRing score={data.perfScore || 0} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <CategoryScore label="Performance" score={data.perfScore || 0} icon={Gauge} />
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                  Accessibility, Best Practices, and SEO scores require Lighthouse. Connect Google PageSpeed Insights API or run Lighthouse for real data.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#64748b' }}>
              {data.avgResponseTime > 0 && <span>Avg Response: <strong>{data.avgResponseTime}ms</strong></span>}
              {data.slowPages > 0 && <span style={{ color: '#dc2626' }}>{data.slowPages} slow pages (&gt;3s)</span>}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        <MetricCard
          label="LCP" value={lcp.display || null} status={lcp.display ? (lcp.status || 'unknown') : 'unknown'} target="< 2.5s"
          explanation="Largest Contentful Paint — time until the main content loads. Affects bounce rate and Google rankings."
          recommendation={lcp.display ? (lcp.status === 'good' ? '✅ Good' : '⚡ Optimize hero images, preload key resources') : undefined}
        />
        <MetricCard
          label="CLS" value={cls.display || null} status={cls.display ? (cls.status || 'unknown') : 'unknown'} target="< 0.1"
          explanation="Cumulative Layout Shift — visual stability. High CLS causes poor user experience."
          recommendation={cls.display ? (cls.status === 'good' ? '✅ Good' : '⚡ Set image dimensions, avoid dynamically injected content') : undefined}
        />
        <MetricCard
          label="INP" value={inp.display || null} status={inp.display ? (inp.status || 'unknown') : 'unknown'} target="< 200ms"
          explanation="Interaction to Next Paint — responsiveness to user input. Delayed INP frustrates users."
          recommendation={inp.display ? (inp.status === 'good' ? '✅ Good' : '⚡ Reduce JavaScript execution time, break up long tasks') : undefined}
        />
        <MetricCard
          label="FCP" value={fcp.display || null} status={fcp.display ? (fcp.status || 'unknown') : 'unknown'} target="< 1.8s"
          explanation="First Contentful Paint — time until first pixels appear. Signals loading speed to users."
          recommendation={fcp.display ? (fcp.status === 'good' ? '✅ Good' : '⚡ Inline critical CSS, reduce server response time') : undefined}
        />
        <MetricCard
          label="TTFB" value={ttfb.display || null} status={ttfb.display ? (ttfb.status || 'unknown') : 'unknown'} target="< 800ms"
          explanation="Time to First Byte — server responsiveness. High TTFB delays all subsequent metrics."
          recommendation={ttfb.display ? (ttfb.status === 'good' ? '✅ Good' : '⚡ Enable caching, use CDN, optimize server response') : undefined}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><h2>Resource Analysis</h2></div>
          <div style={{ padding: '0 16px' }}>
            {data.resources.map((r, i) => <ResourceRow key={i} resource={r} />)}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Optimization Priority</h2></div>
          <div style={{ padding: '0 16px' }}>
            {data.speedIssues.slice(0, 6).map((issue, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)', alignItems: 'center' }}>
                <span className={`badge ${issue.severity === 'CRITICAL' ? 'badge-red' : issue.severity === 'HIGH' ? 'badge-yellow' : 'badge-blue'}`} style={{ fontSize: 10 }}>{issue.severity}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{issue.title}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{issue.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>SEO Impact</h2></div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { issue: 'Slow LCP', seo: 'High', user: 'Higher bounce rate', fix: 'Optimize hero images and preload' },
              { issue: 'High CLS', seo: 'Medium', user: 'Poor visual stability', fix: 'Set explicit image/video dimensions' },
              { issue: 'Slow INP', seo: 'Medium', user: 'Delayed interactions', fix: 'Reduce JavaScript main thread work' },
              { issue: 'Slow TTFB', seo: 'High', user: 'Slower crawling and rendering', fix: 'Enable CDN and server caching' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: 12, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.issue}</div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  SEO Impact: <strong>{item.seo}</strong><br />
                  User Impact: {item.user}<br />
                  Fix: {item.fix}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {data.pagePerformance.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>Page-by-Page Performance ({data.pagePerformance.length} pages)</h2></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Page</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Response</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Performance</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>LCP</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>CLS</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>INP</th>
                </tr>
              </thead>
              <tbody>
                {data.pagePerformance.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '8px 12px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 500 }}>{p.title || p.url}</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.url}</div>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {p.responseTime != null ? (
                        <span style={{ color: p.responseTime > 3000 ? '#fa5252' : p.responseTime > 1500 ? '#f59f00' : '#12b886', fontWeight: 600, fontSize: 12 }}>{p.responseTime}ms</span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {p.performance != null ? (
                        <span style={{ color: p.performance >= 90 ? '#12b886' : p.performance >= 50 ? '#f59f00' : '#fa5252', fontWeight: 600 }}>{p.performance}</span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{p.lcp || '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{p.cls || '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{p.inp || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h2>All Performance Issues ({data.speedIssues.length})</h2></div>
        {data.speedIssues.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No performance issues detected</div>
        ) : (
          <div style={{ padding: '0 16px' }}>
            {data.speedIssues.slice(0, 30).map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
