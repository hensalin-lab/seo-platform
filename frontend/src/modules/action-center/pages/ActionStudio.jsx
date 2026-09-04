import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sparkles, AlertTriangle, MapPin, FileText, CheckCircle2, Circle,
  RefreshCw, Copy, Wrench, Search, ArrowRight, Target,
  TrendingUp, ShieldCheck, History, ListOrdered, Flame, Send
} from 'lucide-react';
import { api } from '../../../api';
import { useToast } from '../../../components/Toast';
import { SEVERITY_COLORS } from '../../../components/ai/theme';

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
  const [fixes, setFixes] = useState({});
  const [fixLoading, setFixLoading] = useState(false);
  const [validation, setValidation] = useState(null);
  const [indexnow, setIndexnow] = useState(null);
  const [pushing, setPushing] = useState(false);
  const [generating, setGenerating] = useState({});

  const load = useCallback(async () => {
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
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    api.request(`/audit/${id}/fixes`).then((res) => {
      if (cancelled) return;
      const map = {};
      (res.fixes || []).forEach(f => { map[f.issue_id] = f; });
      setFixes(map);
    }).catch(() => {});
    api.request(`/audit/${id}/fix-validation`).then((res) => {
      if (!cancelled) setValidation(res);
    }).catch(() => {});
    api.request(`/audit/${id}/indexnow/status`).then((res) => {
      if (!cancelled) setIndexnow(res);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const toggleDone = async (issueId) => {
    if (fixLoading) return;
    const existing = fixes[issueId];
    setFixLoading(true);
    try {
      if (existing) {
        await api.request(`/audit/${id}/fixes/${existing.id}`, { method: 'DELETE' });
        setFixes(prev => { const next = { ...prev }; delete next[issueId]; return next; });
        addToast('Fix marked as not applied', 'info');
      } else {
        const res = await api.request(`/audit/${id}/fixes`, {
          method: 'POST',
          body: JSON.stringify({ issue_id: issueId }),
        });
        setFixes(prev => ({ ...prev, [issueId]: { id: res.id, issue_id: issueId } }));
        addToast('Fix marked as applied', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to update fix status', 'error');
    } finally {
      setFixLoading(false);
    }
  };

  const pushIndexNow = async () => {
    if (pushing) return;
    setPushing(true);
    try {
      const res = await api.request(`/audit/${id}/indexnow/push`, { method: 'POST', body: JSON.stringify({}) });
      if (res.configured === false) {
        addToast(res.message || 'IndexNow not configured', 'warning');
      } else if (res.submitted > 0) {
        addToast(`${res.submitted} URL${res.submitted > 1 ? 's' : ''} pushed to IndexNow`, 'success');
        setIndexnow(prev => ({ ...prev, applied_fix_urls: 0 }));
      } else if (res.error) {
        addToast(res.error, 'error');
      } else {
        addToast(res.message || 'Nothing to push', 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to push to IndexNow', 'error');
    } finally {
      setPushing(false);
    }
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
  const doneCount = Object.keys(fixes).length;
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
            <span>{doneCount} of {total} applied</span>
            <span>{donePct}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${donePct}%`, background: 'linear-gradient(90deg, #22c55e, #3b82f6)', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Impact roadmap */}
        {data?.impact_plan?.batches?.length > 0 && (
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Flame size={16} color="#f97316" />
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>What to fix first — ranked by impact</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Score now <b style={{ color: 'var(--text)' }}>{data.summary.current_score}</b> → fixing all <b style={{ color: 'var(--text)' }}>+{data.impact_plan.total_points} pts</b> →
                projected <b style={{ color: '#22c55e' }}>{data.impact_plan.projected_score_full}</b>
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 12 }}>
              Fixes grouped in batches of 3, highest estimated score gain first. Click a fix to jump to its card below.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
              {data.impact_plan.batches.map((b, bi) => (
                <div key={bi} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg-page)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Batch {bi + 1} · {b.count} fixes
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: '#16a34a' }}>+{b.cumulative_points} pts</span>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>projected {b.projected_score}</div>
                    </div>
                  </div>
                  {b.actions.map(a => (
                    <button key={a.issue_id}
                      onClick={() => document.getElementById(`action-${a.issue_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', marginBottom: 5, cursor: 'pointer' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 12, background: SEVERITY_COLORS[a.priority] || '#6b7280', color: '#fff', flexShrink: 0 }}>{a.priority}</span>
                      <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.what}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>+{a.est_points_gain}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            {data.impact_plan.by_category && Object.keys(data.impact_plan.by_category).length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {Object.entries(data.impact_plan.by_category).map(([cat, v]) => (
                  <span key={cat} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {cat} · {v.count} fixes · <span style={{ color: '#16a34a' }}>+{v.points} pts</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fix validation */}
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ShieldCheck size={16} color="#22c55e" />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Fix validation</span>
            {validation?.newer_audit_id && (
              <a href={`/audit/${validation.newer_audit_id}/action-studio`} style={{ fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                <History size={12} /> Validated against latest audit <ArrowRight size={11} />
              </a>
            )}
          </div>
          {!validation ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Loading validation…</div>
          ) : validation.newer_audit_id ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{validation.applied_count}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>FIXES APPLIED</div>
                </div>
                <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{validation.resolved}</div>
                  <div style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 600 }}>RESOLVED</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{validation.still_present}</div>
                  <div style={{ fontSize: 10.5, color: '#ef4444', fontWeight: 600 }}>STILL PRESENT</div>
                </div>
                {validation.score_delta != null && (
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: validation.score_delta >= 0 ? '#16a34a' : '#ef4444' }}>
                      {validation.score_delta >= 0 ? '+' : ''}{validation.score_delta}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                      SCORE {validation.score_before} → {validation.score_after}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                {validation.items.map(it => (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                      background: it.status === 'RESOLVED' ? 'rgba(34,197,94,0.12)' : it.status === 'STILL_PRESENT' ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.12)',
                      color: it.status === 'RESOLVED' ? '#16a34a' : it.status === 'STILL_PRESENT' ? '#ef4444' : '#6b7280' }}>
                      {it.status === 'RESOLVED' ? 'Resolved' : it.status === 'STILL_PRESENT' ? 'Still present' : 'Unchecked'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.signal_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{it.page_url}</span>
                  </div>
                ))}
              </div>
            </>
          ) : validation.applied_count > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-muted)' }}>
              <RefreshCw size={13} /> {validation.applied_count} fix{validation.applied_count > 1 ? 'es' : ''} marked as applied — run a new audit to validate which ones are actually resolved.
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Mark fixes as <strong style={{ color: 'var(--text)' }}>applied</strong> below to build a validated win list. After you re-run the audit, this panel shows exactly which fixes are resolved and how your score moved.
            </div>
          )}
        </div>

        {/* IndexNow */}
        {indexnow && (
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Send size={16} color={indexnow.configured ? '#3b82f6' : '#9ca3af'} />
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>IndexNow</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: indexnow.configured ? 'rgba(34,197,94,0.12)' : 'var(--bg-secondary)', color: indexnow.configured ? '#16a34a' : 'var(--text-muted)' }}>
                {indexnow.configured ? 'Configured' : 'Not configured'}
              </span>
            </div>
            {indexnow.configured ? (
              <>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Ask search engines to re-crawl the pages you've fixed — host <b style={{ color: 'var(--text)' }}>{indexnow.host}</b>, key file at{' '}
                  <span style={{ fontFamily: 'monospace', fontSize: 11.5 }}>{indexnow.key_location}</span>.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={pushIndexNow} disabled={pushing || (indexnow.applied_fix_urls === 0 && !pushing)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
                    {pushing ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={13} />}
                    {pushing ? 'Pushing…' : `Push ${indexnow.applied_fix_urls} applied-fix URL${indexnow.applied_fix_urls === 1 ? '' : 's'} to IndexNow`}
                  </button>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {indexnow.applied_fix_urls === 0 ? 'Mark fixes as applied above to push them. Falls back to all crawled pages.' : 'Sends one request with all changed URLs.'}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {indexnow.setup_help || 'Set INDEXNOW_KEY in the backend environment to enable instant re-indexing of fixed pages.'}
              </div>
            )}
          </div>
        )}

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
          <div key={action.issue_id} id={`action-${action.issue_id}`} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12, overflow: 'hidden', opacity: fixes[action.issue_id] ? 0.6 : 1, transition: 'opacity 0.2s' }}>
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
                <button onClick={() => toggleDone(action.issue_id)} disabled={fixLoading} title={fixes[action.issue_id] ? 'Mark as not applied' : 'Mark as applied'}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: fixes[action.issue_id] ? '#16a34a' : 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  {fixes[action.issue_id] ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  {fixes[action.issue_id] ? 'Applied' : 'Mark applied'}
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
