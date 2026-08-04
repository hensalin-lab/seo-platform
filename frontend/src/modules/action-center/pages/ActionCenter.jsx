import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import ProtectedAction from '../../../components/ProtectedAction';
import { AlertTriangle, Lightbulb, Activity, CheckCircle, XCircle, Filter, RefreshCw, Clock, ArrowRight, ExternalLink } from 'lucide-react';

const SEVERITY_COLORS = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#6b7280' };
const PRIORITY_LABELS = { P0: 'Critical', P1: 'High', P2: 'Medium', P3: 'Low' };
const PRIORITY_COLORS = { P0: '#ef4444', P1: '#f59e0b', P2: '#3b82f6', P3: '#6b7280' };
const STATUS_COLORS = { open: '#f59e0b', in_progress: '#3b82f6', resolved: '#22c55e' };

const TABS = [
  { key: 'issues', label: 'Issues', icon: AlertTriangle },
  { key: 'recommendations', label: 'Recommendations', icon: Lightbulb },
  { key: 'remediation', label: 'Remediation Feed', icon: Activity },
];

function Spinner({ text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>{text || 'Loading...'}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
      {Icon && <Icon size={40} color="var(--text-muted)" />}
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{title || 'No data available'}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400 }}>{message || ''}</div>
    </div>
  );
}

const SEVERITY_COLORS2 = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e', INFO: '#64748b' };
const CAT_COLORS2 = { SEO: '#3b82f6', CONTENT: '#10b981', PERFORMANCE: '#8b5cf6', ACCESSIBILITY: '#f59e0b', SECURITY: '#ef4444', MOBILE: '#06b6d4', SOCIAL: '#ec4899', OTHER: '#64748b' };

function IssuesTab({ issues, loading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  const [allIssues, setAllIssues] = useState(issues);
  useEffect(() => { setAllIssues(issues); }, [issues]);

  const categories = useMemo(() => {
    const set = new Set(); allIssues.forEach(i => { if (i.category) set.add(i.category); });
    return [...set].sort();
  }, [allIssues]);

  const filtered = useMemo(() => {
    let result = allIssues;
    if (severityFilter !== 'ALL') result = result.filter(i => i.severity === severityFilter);
    if (categoryFilter !== 'ALL') result = result.filter(i => i.category === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        (i.title || i.signal_name || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.page_url || '').toLowerCase().includes(q) ||
        (i.fix || '').toLowerCase().includes(q) ||
        (i.impact || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [allIssues, severityFilter, categoryFilter, searchQuery]);

  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (loading) return <Spinner text="Loading issues..." />;

  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Filter size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="text" placeholder="Search issues, pages, fixes..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              style={{ width: '100%', padding: '9px 12px 9px 30px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
          </div>
          <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}
            style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            <option value="ALL">All Severities</option>
            {Object.keys(SEVERITY_COLORS2).map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
            style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            <option value="ALL">All Categories</option>
            {categories.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, padding: '0 4px' }}>
        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {allIssues.length} issues
        {searchQuery && <span> matching "{searchQuery}"</span>}
      </div>

      {paginated.length === 0 ? (
        <EmptyState icon={CheckCircle} title="No issues found" message="No issues match your current filters." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {paginated.map((issue, idx) => (
            <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ width: 60, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textAlign: 'center', color: '#fff', background: SEVERITY_COLORS2[issue.severity] || '#64748b', flexShrink: 0 }}>
                  {issue.severity}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{issue.signal_name || issue.title || issue.description}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: (CAT_COLORS2[issue.category] || '#64748b') + '20', color: CAT_COLORS2[issue.category] || '#64748b' }}>{issue.category}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 4, wordBreak: 'break-all' }}>
                    <strong>Page:</strong> {issue.page_url || 'N/A'}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                    <strong>Where:</strong> {issue.where || 'page body content'}
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 4 }}>
                    <strong>Problem:</strong> {issue.description}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                    <strong>Impact:</strong> {issue.impact || 'N/A'}
                  </div>
                  {issue.current_value && (
                    <div style={{ padding: '6px 10px', background: '#fef2f2', borderRadius: 6, fontSize: 12, color: '#b91c1c', marginBottom: 4, lineHeight: 1.5, wordBreak: 'break-word' }}>
                      <strong>Current:</strong> {issue.current_value}
                    </div>
                  )}
                  <div style={{ padding: '6px 10px', background: '#f0f9ff', borderRadius: 6, fontSize: 12, color: '#0369a1', lineHeight: 1.5 }}>
                    <strong>How to Fix:</strong> {issue.fix || 'No fix suggestion available'}
                  </div>
                  {issue.replace_with && (
                    <div style={{ padding: '6px 10px', background: '#f0fdf4', borderRadius: 6, fontSize: 12, color: '#15803d', marginTop: 4, lineHeight: 1.5, wordBreak: 'break-word' }}>
                      <strong>Replace with:</strong> {issue.replace_with}
                    </div>
                  )}
                  {issue.page_url && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                      <a href={issue.page_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <ExternalLink size={12} /> Open page
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === 0 ? '#f8fafc' : '#fff', color: page === 0 ? '#94a3b8' : '#334155', cursor: page === 0 ? 'default' : 'pointer', fontSize: 12 }}>← Prev</button>
          <span style={{ padding: '6px 12px', fontSize: 12, color: '#64748b' }}>{page + 1}/{totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: page >= totalPages - 1 ? '#f8fafc' : '#fff', color: page >= totalPages - 1 ? '#94a3b8' : '#334155', cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: 12 }}>Next →</button>
        </div>
      )}
    </div>
  );
}

function RecommendationsTab({ recommendations, loading }) {
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const filtered = useMemo(() => {
    if (priorityFilter === 'ALL') return recommendations;
    return recommendations.filter(r => r.priority === priorityFilter);
  }, [recommendations, priorityFilter]);

  const sorted = useMemo(() => {
    const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return [...filtered].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
  }, [filtered]);

  if (loading) return <Spinner text="Loading recommendations..." />;

  if (recommendations.length === 0) {
    return <EmptyState icon={Lightbulb} title="No recommendations" message="No recommendations are available for this audit." />;
  }

  return (
    <div>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Priority:</span>
          {['ALL', 'P0', 'P1', 'P2', 'P3'].map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
                background: priorityFilter === p ? (PRIORITY_COLORS[p] || '#3b82f6') : 'transparent',
                color: priorityFilter === p ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {p === 'ALL' ? 'All' : `${p} - ${PRIORITY_LABELS[p] || p}`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, padding: '0 4px' }}>
        Showing {sorted.length} of {recommendations.length} recommendations
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((rec, idx) => {
          const priColor = PRIORITY_COLORS[rec.priority] || '#6b7280';
          return (
            <div
              key={rec.id || idx}
              style={{
                background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '16px 20px', borderLeft: `3px solid ${priColor}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      color: '#fff', background: priColor,
                    }}>
                      {rec.priority || 'N/A'}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                      {rec.title || rec.issue || rec.description}
                    </span>
                  </div>
                  {rec.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>
                      {rec.description}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {rec.impact_score != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Activity size={13} color="#22c55e" />
                    <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                      Impact: {rec.impact_score}
                    </span>
                  </div>
                )}
                {rec.effort_estimate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} color="#f59e0b" />
                    <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                      Effort: {rec.effort_estimate}
                    </span>
                  </div>
                )}
                {rec.category && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                  }}>
                    {rec.category}
                  </span>
                )}
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); }}
                  style={{
                    marginLeft: 'auto', fontSize: 12, color: '#3b82f6', fontWeight: 600,
                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                    cursor: 'pointer',
                  }}
                >
                  View Details <ArrowRight size={12} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RemediationFeedTab({ feed, loading }) {
  if (loading) return <Spinner text="Loading remediation feed..." />;

  const grouped = useMemo(() => {
    const map = {};
    (feed || []).forEach(entry => {
      const date = entry.timestamp ? entry.timestamp.split('T')[0] : 'Unknown';
      if (!map[date]) map[date] = [];
      map[date].push(entry);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [feed]);

  if (!feed || feed.length === 0) {
    return <EmptyState icon={Activity} title="No remediation activity" message="No remediation actions have been recorded yet." />;
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, padding: '0 4px' }}>
        {feed.length} remediation action{feed.length !== 1 ? 's' : ''} recorded
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 15, top: 0, bottom: 0, width: 2,
          background: 'var(--border)',
        }} />

        {grouped.map(([date, entries]) => (
          <div key={date} style={{ marginBottom: 24 }}>
            <div style={{
              position: 'sticky', top: 0, zIndex: 1,
              background: 'var(--bg-white)', padding: '8px 0', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: '#3b82f6',
                border: '2px solid var(--border)', zIndex: 1, marginLeft: 11, flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {date === 'Unknown' ? 'Unknown Date' : new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({entries.length})</span>
            </div>

            <div style={{ marginLeft: 32 }}>
              {entries.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: '14px 16px', marginBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: entry.action_type === 'resolve' ? 'rgba(34,197,94,0.15)' :
                        entry.action_type === 'reassign' ? 'rgba(59,130,246,0.15)' :
                        'rgba(245,158,11,0.15)',
                    }}>
                      {entry.action_type === 'resolve' ? (
                        <CheckCircle size={16} color="#22c55e" />
                      ) : entry.action_type === 'reassign' ? (
                        <RefreshCw size={16} color="#3b82f6" />
                      ) : (
                        <AlertTriangle size={16} color="#f59e0b" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {entry.description || entry.action || 'Action taken'}
                        </span>
                        {entry.timestamp && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} />
                            {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {entry.user && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            by <strong style={{ color: '#c0c4cc' }}>{entry.user}</strong>
                          </span>
                        )}
                        {entry.action_type && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
                            background: entry.action_type === 'resolve' ? 'rgba(34,197,94,0.12)' :
                              entry.action_type === 'reassign' ? 'rgba(59,130,246,0.12)' :
                              'rgba(245,158,11,0.12)',
                            color: entry.action_type === 'resolve' ? '#22c55e' :
                              entry.action_type === 'reassign' ? '#3b82f6' : '#f59e0b',
                          }}>
                            {entry.action_type}
                          </span>
                        )}
                        {entry.status_from && entry.status_to && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <XCircle size={10} color={STATUS_COLORS[entry.status_from] || 'var(--text-muted)'} />
                            <ArrowRight size={10} />
                            <CheckCircle size={10} color={STATUS_COLORS[entry.status_to] || '#22c55e'} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ActionCenter() {
  const { id } = useParams();
  const { isAdmin, isViewer } = useAuth();
  const [activeTab, setActiveTab] = useState('issues');
  const [issues, setIssues] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [remediationFeed, setRemediationFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [issuesRes, recsRes, feedRes] = await Promise.all([
          api.getAuditIssues(id, { limit: 500 }).catch(() => ({ items: [] })),
          api.getAuditRecommendations(id, { limit: 200 }).catch(() => ({ items: [] })),
          api.getRemediationFeed(id, { limit: 100 }).catch(() => ({ items: [] })),
        ]);
        setIssues(issuesRes.items || issuesRes || []);
        setRecommendations(recsRes.items || recsRes || []);
        setRemediationFeed(feedRes.items || feedRes || []);
      } catch {
        setIssues([]);
        setRecommendations([]);
        setRemediationFeed([]);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Activity size={28} color="#3b82f6" />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Action Center</h1>
          {isAdmin && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(59,130,246,0.15)', color: '#3b82f6', letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              Admin
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          Browse issues, review recommendations, and track remediation progress
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 4, background: 'var(--bg-white)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 4,
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const counts = {
            issues: issues.length,
            recommendations: recommendations.length,
            remediation: remediationFeed.length,
          };
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '10px 16px', border: 'none', borderRadius: 8,
                cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                background: isActive ? 'var(--border)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
              }}
            >
              <Icon size={16} />
              {tab.label}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                background: isActive ? 'rgba(59,130,246,0.2)' : 'rgba(138,143,158,0.15)',
                color: isActive ? '#3b82f6' : 'var(--text-muted)',
              }}>
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === 'issues' && <IssuesTab issues={issues} loading={loading} />}
      {activeTab === 'recommendations' && <RecommendationsTab recommendations={recommendations} loading={loading} />}
      {activeTab === 'remediation' && <RemediationFeedTab feed={remediationFeed} loading={loading} />}
    </div>
  );
}
