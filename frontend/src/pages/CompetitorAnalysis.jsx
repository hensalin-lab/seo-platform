import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { Users, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'

export default function CompetitorAnalysis() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getReportData(id).then(res => {
      setData(res)
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading competitor data...</p></div>
  if (error) return <div className="error-state">{error}</div>

  const competitor = data?.competitor_analysis || {}
  const gaps = competitor.keyword_gaps || []
  const advantages = competitor.advantages || []

  return (
    <div>
      <div className="page-header">
        <h1>Competitor Analysis</h1>
        <p>Keyword gaps and competitive advantages</p>
      </div>

      {!competitor.competitor_url ? (
        <div className="empty-state">
          <Users size={40} style={{ color: 'var(--text-dim)', marginBottom: 12 }} />
          <h3>No competitor specified</h3>
          <p>Run an audit with a competitor URL to see comparison data</p>
        </div>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon"><Users size={16} style={{ color: 'var(--accent)' }} /></div>
              <div className="stat-info">
                <div className="stat-value" style={{ fontSize: 14, fontWeight: 600 }}>{competitor.competitor_url}</div>
                <div className="stat-label">Competitor</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><AlertTriangle size={16} style={{ color: '#f59f00' }} /></div>
              <div className="stat-info">
                <div className="stat-value">{gaps.length}</div>
                <div className="stat-label">Keyword Gaps</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><TrendingUp size={16} style={{ color: '#12b886' }} /></div>
              <div className="stat-info">
                <div className="stat-value">{advantages.length}</div>
                <div className="stat-label">Advantages</div>
              </div>
            </div>
          </div>

          {gaps.length > 0 && (
            <div className="card">
              <div className="card-header"><h2>Keyword Gaps</h2></div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Keyword</th>
                      <th>Competitor Freq</th>
                      <th>Your Freq</th>
                      <th>Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaps.map((g, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500, color: 'var(--text)' }}>{g.keyword}</td>
                        <td style={{ fontWeight: 600 }}>{g.competitor_frequency}</td>
                        <td>{g.your_frequency || 0}</td>
                        <td><span className="badge badge-red">-{g.competitor_frequency - (g.your_frequency || 0)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {advantages.length > 0 && (
            <div className="card">
              <div className="card-header"><h2>Your Advantages</h2></div>
              {advantages.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <TrendingUp size={14} style={{ color: '#12b886', marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{a.keyword || a.description}</div>
                    {a.detail && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{a.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
