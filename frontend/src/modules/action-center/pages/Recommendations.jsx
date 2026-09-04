import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Lightbulb, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../../api';
import { DataSourceBadge } from '../../../components/DataSourceBadge';

export default function Recommendations() {
  const { id } = useParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    api.getAuditRecommendations(id, { limit: 200 })
      .then(resp => setData(resp.items || resp || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card"><p>Loading recommendations...</p></div>;
  if (error) return <div className="card"><p>Error: {error}</p></div>;

  const filtered = data.filter(r => filter === 'ALL' || r.priority === filter);

  const toggle = (idx) => setExpanded(prev => ({...prev, [idx]: !prev[idx]}));

  return (
    <div>
      <div className="card" style={{marginBottom: 24}}>
        <div className="card-header">
          <div className="card-title"><Lightbulb size={20} /> AI Recommendations <DataSourceBadge source="ai-generated" size="xs" /></div>
          <div className="card-subtitle">{data.length} recommendations generated</div>
        </div>
        <div style={{display: 'flex', gap: 4}}>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.map((rec, i) => {
        const isOpen = expanded[i];
        return (
          <div key={rec.id || i} className="card" style={{marginBottom: 12}}>
            <div style={{padding: '16px 20px', cursor: 'pointer'}} onClick={() => toggle(i)}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 600, fontSize: 15, marginBottom: 4}}>{rec.issue}</div>
                  <div style={{color: '#6b7280', fontSize: 13}}>{rec.page_url}</div>
                </div>
                <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                  <span className={`badge ${rec.priority === 'HIGH' ? 'badge-red' : rec.priority === 'MEDIUM' ? 'badge-yellow' : 'badge-green'}`}>{rec.priority}</span>
                  <span className="badge badge-blue">{rec.category}</span>
                  {rec.ai_generated && <span className="badge badge-purple">AI</span>}
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </div>
            {isOpen && (
              <div style={{padding: '0 20px 16px', borderTop: '1px solid #f3f4f6'}}>
                {rec.current_problem && (
                  <div style={{marginBottom: 12}}>
                    <div style={{fontWeight: 600, fontSize: 12, color: '#ef4444', marginBottom: 4}}>CURRENT PROBLEM</div>
                    <div style={{fontSize: 14, color: '#374151'}}>{rec.current_problem}</div>
                  </div>
                )}
                {rec.why_it_matters && (
                  <div style={{marginBottom: 12}}>
                    <div style={{fontWeight: 600, fontSize: 12, color: '#f59e0b', marginBottom: 4}}>WHY IT MATTERS</div>
                    <div style={{fontSize: 14, color: '#374151'}}>{rec.why_it_matters}</div>
                  </div>
                )}
                {rec.exact_fix && (
                  <div style={{marginBottom: 12}}>
                    <div style={{fontWeight: 600, fontSize: 12, color: '#22c55e', marginBottom: 4}}>EXACT FIX</div>
                    <div style={{fontSize: 14, color: '#374151', backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, fontFamily: 'monospace', whiteSpace: 'pre-wrap'}}>{rec.exact_fix}</div>
                  </div>
                )}
                {rec.before_example && rec.after_example && (
                  <div className="grid-2" style={{marginBottom: 12}}>
                    <div>
                      <div style={{fontWeight: 600, fontSize: 12, color: '#ef4444', marginBottom: 4}}>BEFORE</div>
                      <div style={{fontSize: 13, backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, fontFamily: 'monospace', whiteSpace: 'pre-wrap'}}>{rec.before_example}</div>
                    </div>
                    <div>
                      <div style={{fontWeight: 600, fontSize: 12, color: '#22c55e', marginBottom: 4}}>AFTER</div>
                      <div style={{fontSize: 13, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, fontFamily: 'monospace', whiteSpace: 'pre-wrap'}}>{rec.after_example}</div>
                    </div>
                  </div>
                )}
                <div style={{display: 'flex', gap: 8}}>
                  {rec.expected_impact && <span className="badge badge-purple">Impact: {rec.expected_impact}</span>}
                  {rec.difficulty && <span className="badge badge-yellow">Difficulty: {rec.difficulty}</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && <div className="card empty-state"><p>No recommendations match your filter.</p></div>}
    </div>
  );
}
