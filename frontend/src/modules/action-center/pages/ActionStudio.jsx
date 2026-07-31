import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sparkles, AlertTriangle, MapPin, FileText, CheckCircle2, Circle,
  RefreshCw, Copy, Wrench, Search, ArrowRight, Target
} from 'lucide-react';
import { api } from '../../../api';
import { useToast } from '../../../components/Toast';

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#3b82f6',
  LOW: '#6b7280',
};
const CATEGORY_COLORS = {
  SEO: '#3b82f6',
  CONTENT: '#a855f7',
  AEO: '#f59e0b',
  GEO: '#22c55e',
  AI_SEARCH: '#ec4899',
  TECHNICAL: '#06b6d4',
  LINKS: '#14b8a6',
  IMAGES: '#f97316',
  ACCESSIBILITY: '#eab308',
  PERFORMANCE: '#ef4444',
  SCHEMA: '#8b5cf6',
};

function SeverityBadge({ severity }) {
  const color = SEVERITY_COLORS[severity] || '#6b7280';
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 20, background: `${color}1a`, color }}>
      {severity}
    </span>
  );
}

function CategoryBadge({ category }) {
  const color = CATEGORY_COLORS[category] || 'var(--text-muted)';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${color}1a`, color }}>
      {category}
    </span>
  );
}

function CopyBlock({ label, text, tone }) {
  const { addToast } = useToast();
  const bg = tone === 'after'
    ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }
    : { background: 'var(--bg-primary)', border: '1px solid var(--border)' };
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: tone === 'after' ? '#16a34a' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        {text && (
          <button onClick={() => { navigator.clipboard.writeText(text); addToast('Copied to clipboard', 'success'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Copy size={11} /> Copy
          </button>
        )}
      </div>
      <pre style={{ margin: 0, padding: '10px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...bg }}>
        {text || '—'}
      </pre>
    </div>
  );
}

export default function ActionStudio() {
  const { id } = useParams();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [done, setDone] = useState({});
  const [generating, setGenerating] = useState({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`action-studio-done:${id}`) || '{}');
      setDone(stored);
    } catch (e) { /* ignore */ }
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.request(`/audit/${id}/action-studio`);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load action studio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const toggleDone = (actionId) => {
    setDone(prev => {
      const next = { ...prev, [actionId]: !prev[actionId] };
      localStorage.setItem(`action-studio-done:${id}`, JSON.stringify(next));
      return next;
    });
  };

  const generateFix = async (action) => {
    setGenerating(prev => ({ ...prev, [action.issue_id]: true }));
    try {
      const result = await api.request(`/audit/${id}/action-studio/generate-fix`, {
        method: 'POST',
        body: JSON.stringify({ issue_id: action.issue_id }),
      });
      const updated = { ...action, ...result };
      setData(prev => ({ ...prev, actions: prev.actions.map(a => a.issue_id === action.issue_id ? updated : a) }));
      addToast(result.generated ? 'AI fix generated' : 'Using rule-based fix (AI unavailable)', result.generated ? 'success' : 'warning');
    } catch (err) {
      addToast(err.message || 'Failed to generate fix', 'error');
    } finally {
      setGenerating(prev => ({ ...prev, [action.issue_id]: false }));
    }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.actions.filter(a => {
      if (severityFilter !== 'ALL' && a.priority !== severityFilter) return false;
      if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (a.what + ' ' + a.whats_wrong + ' ' + a.page_url + ' ' + a.where).toLowerCase().includes(q);
      }
      return true;
    });
  }, [data, severityFilter, categoryFilter, query]);

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '24px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>Building your action plan...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '24px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
          <AlertTriangle size={40} color="#ef4444" />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Failed to Load</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 400, textAlign: 'center' }}>{error}</div>
          <button onClick={load} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const bySeverity = summary.by_severity || {};
  const total = summary.total_actions || 0;
  const doneCount = Object.values(done).filter(Boolean).length;
  const donePct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '24px 0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
              <Sparkles size={20} color="var(--accent)" /> AI Action Studio
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Every mistake on your site — what it is, which page, exactly where, and how to fix it.
            </p>
          </div>
          <button onClick={load} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: '16px 0 20px' }}>
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{total}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Actions to fix</div>
          </div>
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{(bySeverity.CRITICAL || 0) + (bySeverity.HIGH || 0)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Critical + High</div>
          </div>
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>+{summary.est_total_points || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Est. score points</div>
          </div>
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: summary.ai_available ? '#22c55e' : 'var(--text-muted)' }}>{summary.ai_available ? 'Live' : 'Fallback'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI fix generation</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>{doneCount} of {total} done</span>
            <span>{donePct}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${donePct}%`, background: 'linear-gradient(90deg, #22c55e, #3b82f6)', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
            <button key={s} onClick={() => setSeverityFilter(s)}
              style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', background: severityFilter === s ? 'var(--accent)' : 'var(--bg-white)', color: severityFilter === s ? '#fff' : 'var(--text-secondary)' }}>
              {s === 'ALL' ? 'All' : s}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search page, issue, location..."
              style={{ padding: '7px 12px 7px 30px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', minWidth: 220, boxSizing: 'border-box' }} />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            style={{ padding: '7px 12px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}>
            <option value="ALL">All categories</option>
            {[...new Set(data.actions.map(a => a.category))].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '60px 20px', textAlign: 'center' }}>
            <Target size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px', color: 'var(--text)' }}>Nothing to fix here</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No issues match the current filters.</p>
          </div>
        ) : filtered.map(action => (
          <div key={action.issue_id} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12, overflow: 'hidden', opacity: done[action.issue_id] ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            <div style={{ borderLeft: `4px solid ${SEVERITY_COLORS[action.priority] || '#6b7280'}`, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <SeverityBadge severity={action.priority} />
                  <CategoryBadge category={action.category} />
                  {action.ai_generated && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: 'var(--accent)' }}>AI</span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Difficulty: {action.difficulty}</span>
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>+{action.est_points_gain} pts</span>
                </div>
                <button onClick={() => toggleDone(action.issue_id)} title="Mark as done"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: done[action.issue_id] ? '#16a34a' : 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  {done[action.issue_id] ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  {done[action.issue_id] ? 'Done' : 'Mark done'}
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={15} color="var(--accent)" /> {action.what}
                </div>
                {action.whats_wrong && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{action.whats_wrong}</div>
                )}
              </div>

              <div style={{ marginTop: 12, background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  <FileText size={12} color="var(--accent)" /> WHICH PAGE
                </div>
                <a href={action.page_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'monospace' }}>
                  {action.page_url}
                </a>
                {action.page_title && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{action.page_title}</div>}
              </div>

              <div style={{ marginTop: 10, background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  <MapPin size={12} color="#f59e0b" /> WHERE
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{action.where}</div>
                {action.content_snippet && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic', lineHeight: 1.5 }}>"{action.content_snippet}"</div>
                )}
              </div>

              {action.why_it_matters && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text)' }}>Why it matters:</strong> {action.why_it_matters}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  <Wrench size={12} color="#22c55e" /> HOW TO FIX
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{action.how_to_fix}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <CopyBlock label="Before" text={action.before} tone="before" />
                  <CopyBlock label="After" text={action.after} tone="after" />
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => generateFix(action)} disabled={generating[action.issue_id]}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
                    {generating[action.issue_id] ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={13} />}
                    {generating[action.issue_id] ? 'Generating...' : 'Generate AI Fix'}
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
