import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { api } from '../api';

export default function CompetitorGap() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCompetitorData(id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card"><p>Analyzing competitor data...</p></div>;
  if (error) return <div className="card"><p>Error: {error}</p></div>;
  if (!data || data.message) return (
    <div className="card empty-state">
      <Users size={48} style={{marginBottom: '12px', color: '#9ca3af'}} />
      <p>{data?.message || 'No competitor data available. Run an audit with a competitor URL to see this analysis.'}</p>
    </div>
  );

  const comparison = data.seo_comparison || {};
  const keywords = data.keyword_opportunities || [];
  const contentOpps = data.content_opportunities || [];
  const strengths = data.strengths || [];
  const weaknesses = data.weaknesses || [];
  const strategy = data.winning_strategy || [];

  return (
    <div>
      <div className="card" style={{marginBottom: '24px'}}>
        <div className="card-header">
          <div className="card-title"><Users size={20} /> Competitor Gap Analysis</div>
          <div className="card-subtitle">Comparing against {data.competitor_url || 'competitor'}</div>
        </div>
      </div>

      {Object.keys(comparison).length > 0 && (
        <div className="card" style={{marginBottom: '24px'}}>
          <div className="card-header">
            <div className="card-title"><Target size={20} /> SEO Comparison</div>
          </div>
          <div className="grid-3">
            {Object.entries(comparison).map(([metric, val]) => (
              <div key={metric} className="metric-card">
                <div className="metric-label">{metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                <div className="metric-value">{typeof val === 'number' ? Math.round(val) : String(val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2" style={{marginBottom: '24px'}}>
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{color: '#22c55e'}}><TrendingUp size={20} /> Your Strengths</div>
          </div>
          {strengths.length > 0 ? (
            <ul style={{listStyle: 'none', padding: 0}}>
              {strengths.map((s, i) => (
                <li key={i} style={{padding: '8px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <CheckCircle size={16} style={{color: '#22c55e', flexShrink: 0}} />
                  <span>{typeof s === 'string' ? s : s.description || JSON.stringify(s)}</span>
                </li>
              ))}
            </ul>
          ) : <p style={{color: '#9ca3af', padding: '16px'}}>No strengths identified yet.</p>}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{color: '#ef4444'}}><TrendingDown size={20} /> Weaknesses</div>
          </div>
          {weaknesses.length > 0 ? (
            <ul style={{listStyle: 'none', padding: 0}}>
              {weaknesses.map((w, i) => (
                <li key={i} style={{padding: '8px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <XCircle size={16} style={{color: '#ef4444', flexShrink: 0}} />
                  <span>{typeof w === 'string' ? w : w.description || JSON.stringify(w)}</span>
                </li>
              ))}
            </ul>
          ) : <p style={{color: '#9ca3af', padding: '16px'}}>No weaknesses identified yet.</p>}
        </div>
      </div>

      {keywords.length > 0 && (
        <div className="card" style={{marginBottom: '24px'}}>
          <div className="card-header">
            <div className="card-title">Keyword Opportunities</div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Keyword / Topic</th><th>Source</th><th>Details</th></tr>
              </thead>
              <tbody>
                {keywords.map((kw, i) => (
                  <tr key={i}>
                    <td style={{fontWeight: '600'}}>{kw.topic || kw.keyword || JSON.stringify(kw)}</td>
                    <td><span className="badge badge-blue">{kw.source || 'gap'}</span></td>
                    <td style={{color: '#6b7280'}}>{kw.reason || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {contentOpps.length > 0 && (
        <div className="card" style={{marginBottom: '24px'}}>
          <div className="card-header">
            <div className="card-title">Content Opportunities</div>
          </div>
          {contentOpps.map((opp, i) => (
            <div key={i} style={{padding: '12px 0', borderBottom: '1px solid #f3f4f6'}}>
              <div style={{fontWeight: '600'}}>{typeof opp === 'string' ? opp : opp.topic || opp.title || JSON.stringify(opp)}</div>
              {opp.reason && <div style={{color: '#6b7280', fontSize: '13px'}}>{opp.reason}</div>}
            </div>
          ))}
        </div>
      )}

      {strategy.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Winning Strategy</div>
          </div>
          {strategy.map((s, i) => (
            <div key={i} style={{padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <AlertCircle size={16} style={{color: '#f59e0b', flexShrink: 0}} />
              <span>{typeof s === 'string' ? s : JSON.stringify(s)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
