import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../../api';
import { Map, ArrowLeft, Clock, AlertTriangle, Target, TrendingUp, Calendar } from 'lucide-react';

const phases = [
  { key: 'immediate', label: 'Immediate Actions', sublabel: 'Fix now', severity: 'critical', icon: AlertTriangle, time: 'This week' },
  { key: 'week1', label: 'Week 1 - Quick Wins', sublabel: 'Prioritize', severity: 'high', icon: Clock, time: 'Days 1-7' },
  { key: 'month1', label: 'Month 1 - Strategic', sublabel: 'Plan & build', severity: 'medium', icon: Target, time: 'Weeks 1-4' },
  { key: 'month3', label: 'Month 3 - Growth', sublabel: 'Scale up', severity: 'low', icon: TrendingUp, time: 'Months 1-3' },
];

function scoreBadgeClass(score) {
  if (score >= 80) return 'badge-green';
  if (score >= 50) return 'badge-yellow';
  return 'badge-red';
}

function renderTaskItem(task, idx) {
  if (typeof task === 'string') {
    return (
      <div className="roadmap-item" key={idx}>
        <div className="roadmap-item-title">{task}</div>
      </div>
    );
  }
  return (
    <div className="roadmap-item" key={idx}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div className="roadmap-item-title">{task.task || task.title || task.description || 'Task'}</div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {task.priority && <span className={`badge badge-${task.priority === 'CRITICAL' || task.priority === 'HIGH' ? 'red' : task.priority === 'MEDIUM' ? 'yellow' : 'green'}`}>{task.priority}</span>}
          {task.category && <span className="badge badge-blue">{task.category}</span>}
        </div>
      </div>
      {task.page && <div className="roadmap-item-detail" style={{ marginTop: 4 }}>{task.page}</div>}
      {task.impact && <div className="roadmap-item-detail">Impact: {task.impact}</div>}
      {task.fix && <div className="roadmap-item-fix">Fix: {task.fix}</div>}
      {task.details && task.details.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {task.details.map((d, j) => (
            <div key={j} style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 12, paddingTop: 2 }}>
              &bull; {typeof d === 'string' ? d : JSON.stringify(d)}
            </div>
          ))}
        </div>
      )}
      {task.keywords && task.keywords.length > 0 && (
        <div className="tags" style={{ marginTop: 6 }}>
          {task.keywords.map((kw, j) => <span className="tag" key={j}>{kw}</span>)}
        </div>
      )}
    </div>
  );
}

export default function AiRoadmap() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRoadmap() {
      try {
        setLoading(true);
        const data = await api.getRoadmap(id);
        setRoadmap(data);
      } catch (err) {
        setError(err.message || 'Failed to load roadmap');
      } finally {
        setLoading(false);
      }
    }
    loadRoadmap();
  }, [id]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Loading SEO roadmap...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="error-state">{error}</div>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Go Back
        </button>
      </div>
    );
  }

  const hasData = roadmap && phases.some(p => roadmap[p.key] && roadmap[p.key].length > 0);

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1><Map size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} /> SEO Roadmap</h1>
          <p>Prioritized action plan to improve your SEO performance</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {!hasData ? (
        <div className="card">
          <div className="empty-state">
            <Calendar size={48} />
            <h3>No roadmap data available</h3>
            <p>The roadmap will be generated once your audit is complete with enough data.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {phases.map(({ key, label, sublabel, severity, icon: Icon, time }) => {
            const items = roadmap[key];
            if (!items || items.length === 0) return null;
            return (
              <div key={key} className={`roadmap-phase ${severity}`}>
                <div className="roadmap-phase-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={16} />
                  {label}
                  <span className="badge badge-gray" style={{ marginLeft: 4, fontSize: 10, textTransform: 'none' }}>{sublabel}</span>
                </div>
                <div className="roadmap-phase-time">{time} &middot; {items.length} {items.length === 1 ? 'task' : 'tasks'}</div>
                <div>
                  {items.map((task, i) => renderTaskItem(task, i))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
