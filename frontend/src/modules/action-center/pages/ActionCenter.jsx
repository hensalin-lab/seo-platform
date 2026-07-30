import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import ProtectedAction from '../../../components/ProtectedAction';
import { AlertTriangle, Lightbulb, Activity, CheckCircle, XCircle, Filter, RefreshCw, Clock, ArrowRight } from 'lucide-react';

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
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #2a2d35', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 15, color: '#8a8f9e', fontWeight: 500 }}>{text || 'Loading...'}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
      {Icon && <Icon size={40} color="#8a8f9e" />}
      <div style={{ fontSize: 16, fontWeight: 600, color: '#e0e0e0' }}>{title || 'No data available'}</div>
      <div style={{ fontSize: 13, color: '#8a8f9e', textAlign: 'center', maxWidth: 400 }}>{message || ''}</div>
    </div>
  );
}

function IssuesTab({ issues, loading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [expandedIssue, setExpandedIssue] = useState(null);

  const categories = useMemo(() => {
    const set = new Set();
    issues.forEach(i => { if (i.category) set.add(i.category); });
    return [...set].sort();
  }, [issues]);

  const filtered = useMemo(() => {
    let result = issues;
    if (severityFilter !== 'ALL') result = result.filter(i => i.severity === severityFilter);
    if (categoryFilter !== 'ALL') result = result.filter(i => i.category === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        (i.title || i.signal_name || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.page_url || '').toLowerCase().includes(q) ||
        (i.fix || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [issues, severityFilter, categoryFilter, searchQuery]);

  if (loading) return <Spinner text="Loading issues..." />;

  return (
    <div>
      <div style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Filter size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8a8f9e' }} />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px 9px 30px', border: '1px solid #2a2d35', borderRadius: 8,
                fontSize: 13, background: '#1a1c23', color: '#e0e0e0', outline: 'none',
              }}
            />
          </div>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            style={{
              padding: '9px 12px', border: '1px solid #2a2d35', borderRadius: 8, fontSize: 13,
              background: '#1a1c23', color: '#e0e0e0', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="ALL">All Severities</option>
            {Object.keys(SEVERITY_COLORS).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              padding: '9px 12px', border: '1px solid #2a2d35', borderRadius: 8, fontSize: 13,
              background: '#1a1c23', color: '#e0e0e0', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#8a8f9e', marginBottom: 12, padding: '0 4px' }}>
        Showing {filtered.length} of {issues.length} issues
        {searchQuery && <span> matching "<strong style={{ color: '#e0e0e0' }}>{searchQuery}</strong>"</span>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckCircle} title="No issues found" message="No issues match your current filters." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((issue, idx) => {
            const isExpanded = expandedIssue === idx;
            const sevColor = SEVERITY_COLORS[issue.severity] || '#6b7280';
            const statusColor = STATUS_COLORS[issue.status] || '#8a8f9e';
            return (
              <div
                key={idx}
                style={{
                  background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 10,
                  overflow: 'hidden', transition: 'all 0.2s',
                }}
              >
                <div
                  onClick={() => setExpandedIssue(isExpanded ? null : idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    color: '#fff', background: sevColor, whiteSpace: 'nowrap', minWidth: 56,
                    textAlign: 'center',
                  }}>
                    {issue.severity}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#e0e0e0' }}>
                    {issue.title || issue.signal_name || issue.description}
                  </span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    background: `${statusColor}18`, color: statusColor, fontWeight: 600,
                  }}>
                    {issue.status || 'open'}
                  </span>
                  {issue.page_count > 0 && (
                    <span style={{ fontSize: 11, color: '#8a8f9e', whiteSpace: 'nowrap' }}>
                      {issue.page_count} page{issue.page_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid #2a2d35', background: '#15171d' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a8f9e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Description
                        </div>
                        <div style={{ fontSize: 13, color: '#c0c4cc', lineHeight: 1.6 }}>{issue.description || 'No description'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a8f9e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Remediation
                        </div>
                        <div style={{ fontSize: 13, color: '#22c55e', lineHeight: 1.6 }}>{issue.fix || 'No fix suggestion available'}</div>
                      </div>
                    </div>
                    {issue.category && (
                      <div style={{ marginTop: 12 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
                          background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                        }}>
                          {issue.category}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <ProtectedAction requiredRole="ADMIN">
                        <button style={{
                          padding: '6px 14px', borderRadius: 6, border: '1px solid #22c55e',
                          background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
                          gap: 6,
                        }}>
                          <CheckCircle size={14} /> Resolve
                        </button>
                      </ProtectedAction>
                      <ProtectedAction requiredRole="ADMIN">
                        <button style={{
                          padding: '6px 14px', borderRadius: 6, border: '1px solid #3b82f6',
                          background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
                          gap: 6,
                        }}>
                          <RefreshCw size={14} /> Reassign
                        </button>
                      </ProtectedAction>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
      <div style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#8a8f9e', fontWeight: 600 }}>Priority:</span>
          {['ALL', 'P0', 'P1', 'P2', 'P3'].map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2d35', fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
                background: priorityFilter === p ? (PRIORITY_COLORS[p] || '#3b82f6') : 'transparent',
                color: priorityFilter === p ? '#fff' : '#8a8f9e',
                transition: 'all 0.15s',
              }}
            >
              {p === 'ALL' ? 'All' : `${p} - ${PRIORITY_LABELS[p] || p}`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#8a8f9e', marginBottom: 12, padding: '0 4px' }}>
        Showing {sorted.length} of {recommendations.length} recommendations
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((rec, idx) => {
          const priColor = PRIORITY_COLORS[rec.priority] || '#6b7280';
          return (
            <div
              key={rec.id || idx}
              style={{
                background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12,
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
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0' }}>
                      {rec.title || rec.issue || rec.description}
                    </span>
                  </div>
                  {rec.description && (
                    <div style={{ fontSize: 13, color: '#8a8f9e', lineHeight: 1.5, marginTop: 4 }}>
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
      <div style={{ fontSize: 12, color: '#8a8f9e', marginBottom: 16, padding: '0 4px' }}>
        {feed.length} remediation action{feed.length !== 1 ? 's' : ''} recorded
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 15, top: 0, bottom: 0, width: 2,
          background: '#2a2d35',
        }} />

        {grouped.map(([date, entries]) => (
          <div key={date} style={{ marginBottom: 24 }}>
            <div style={{
              position: 'sticky', top: 0, zIndex: 1,
              background: '#1a1c23', padding: '8px 0', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: '#3b82f6',
                border: '2px solid #2a2d35', zIndex: 1, marginLeft: 11, flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e0' }}>
                {date === 'Unknown' ? 'Unknown Date' : new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
              <span style={{ fontSize: 11, color: '#8a8f9e' }}>({entries.length})</span>
            </div>

            <div style={{ marginLeft: 32 }}>
              {entries.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 10,
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
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>
                          {entry.description || entry.action || 'Action taken'}
                        </span>
                        {entry.timestamp && (
                          <span style={{ fontSize: 11, color: '#8a8f9e', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} />
                            {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {entry.user && (
                          <span style={{ fontSize: 11, color: '#8a8f9e' }}>
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
                          <span style={{ fontSize: 11, color: '#8a8f9e', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <XCircle size={10} color={STATUS_COLORS[entry.status_from] || '#8a8f9e'} />
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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>Action Center</h1>
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
        <p style={{ fontSize: 14, color: '#8a8f9e', margin: 0 }}>
          Browse issues, review recommendations, and track remediation progress
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 4, background: '#1a1c23', border: '1px solid #2a2d35',
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
                background: isActive ? '#2a2d35' : 'transparent',
                color: isActive ? '#e0e0e0' : '#8a8f9e',
              }}
            >
              <Icon size={16} />
              {tab.label}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                background: isActive ? 'rgba(59,130,246,0.2)' : 'rgba(138,143,158,0.15)',
                color: isActive ? '#3b82f6' : '#8a8f9e',
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
