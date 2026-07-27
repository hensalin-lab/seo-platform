import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

const STEPS = ['QUEUED', 'CRAWLING', 'SEO_ANALYSIS', 'TECHNICAL_ANALYSIS', 'AEO_ANALYSIS', 'GEO_ANALYSIS', 'CONTENT_ANALYSIS', 'COMPETITOR_ANALYSIS', 'AI_ANALYSIS', 'KEYWORD_ANALYSIS', 'REPORT_GENERATION', 'COMPLETED']
const STEP_LABELS = { QUEUED: 'Queued', CRAWLING: 'Crawling Website', SEO_ANALYSIS: 'SEO Signal Analysis', TECHNICAL_ANALYSIS: 'Technical Analysis', AEO_ANALYSIS: 'AEO Analysis', GEO_ANALYSIS: 'GEO Analysis', CONTENT_ANALYSIS: 'Content Intelligence', COMPETITOR_ANALYSIS: 'Competitor Analysis', AI_ANALYSIS: 'AI Visibility Analysis', KEYWORD_ANALYSIS: 'Keyword Intelligence', REPORT_GENERATION: 'Generating Report', COMPLETED: 'Completed', FAILED: 'Failed' }

export default function AuditProgress() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const intervalRef = useRef(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const s = await api.getAuditStatus(id)
        setStatus(s)
        if (s.status === 'COMPLETED') { clearInterval(intervalRef.current); setTimeout(() => navigate(`/audit/${id}/dashboard`), 1000) }
        else if (s.status === 'FAILED') { clearInterval(intervalRef.current) }
      } catch (err) { setError(err.message) }
    }
    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => clearInterval(intervalRef.current)
  }, [id, navigate])

  if (error) return <div><div className="error-state">{error}</div><button className="btn btn-secondary" onClick={() => navigate('/')}>Back</button></div>
  if (!status) return <div className="loading-overlay"><div className="spinner" /><p>Loading audit status...</p></div>

  const currentIdx = STEPS.indexOf(status.status)
  const failed = status.status === 'FAILED'
  const completed = status.status === 'COMPLETED'

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1>{completed ? 'Audit Complete' : failed ? 'Audit Failed' : 'Audit In Progress'}</h1>
        <p>{status.message || status.current_step || STEP_LABELS[status.status]}</p>
        {!completed && !failed && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            This usually takes <strong style={{ color: 'var(--accent, #3b82f6)' }}>3 to 5 minutes</strong> to crawl and analyze your site
          </p>
        )}
      </div>

      <div className="card">
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{status.message || 'Processing...'}</span>
            <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{status.progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${status.progress}%` }} />
          </div>
        </div>

        <div>
          {STEPS.filter(s => s !== 'QUEUED' && s !== 'COMPLETED').map(step => {
            const idx = STEPS.indexOf(step)
            const isDone = currentIdx > idx
            const isCurrent = status.status === step
            const isFailed = failed && isCurrent
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', color: isCurrent ? 'var(--accent)' : isDone ? 'var(--green)' : isFailed ? 'var(--red)' : 'var(--text-dim)', fontWeight: isCurrent ? 600 : 400, fontSize: 14 }}>
                <span style={{ width: 24, textAlign: 'center', fontSize: 14 }}>
                  {isDone ? '✓' : isCurrent ? (isFailed ? '✗' : <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />) : '○'}
                </span>
                {STEP_LABELS[step]}
                {isCurrent && !isFailed && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>In progress...</span>}
                {isDone && <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 'auto' }}>Done</span>}
              </div>
            )
          })}
        </div>

        {failed && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <div className="error-box"><p>{status.error_message || 'Audit failed'}</p></div>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  )
}
