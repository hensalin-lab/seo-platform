import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { ListChecks, AlertTriangle, CheckCircle, ChevronDown, Clock, Users, Code, FileText, Search, BarChart3, Settings, Target } from 'lucide-react';
import { LoadingState, EmptyState } from '../../../components/States';
import DataSourceBadge from '../../../components/DataSourceBadge';

const ROLE_CONFIG = {
  DEVELOPER: { label: 'Developer Tasks', icon: Code, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  CONTENT_WRITER: { label: 'Content Tasks', icon: FileText, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  SEO_SPECIALIST: { label: 'SEO Tasks', icon: Search, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  DESIGNER: { label: 'Design Tasks', icon: Target, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  MANAGER: { label: 'Manager Tasks', icon: Users, color: 'var(--accent)', bg: '#eef2ff', border: '#c7d2fe' },
  OTHER: { label: 'General Tasks', icon: Settings, color: 'var(--text-muted)', bg: '#f8fafc', border: '#e2e8f0' },
};

function TaskCard({ task, index }) {
  const [expanded, setExpanded] = useState(false);
  const sevColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb' };
  const sevColor = sevColors[task.severity] || '#64748b';

  return (
    <div style={{ border: `1px solid ${sevColor}25`, borderRadius: 10, marginBottom: 8, background: 'var(--bg-white)', borderLeft: `3px solid ${sevColor}` }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: `${sevColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: sevColor, flexShrink: 0 }}>{index + 1}</span>
        <span style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{task.title || task.issue || task.description}</span>
        </span>
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: `${sevColor}15`, color: sevColor, fontWeight: 600 }}>{task.severity}</span>
        {task.estimated_time && <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {task.estimated_time}</span>}
        <ChevronDown size={14} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {task.description && <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginBottom: 10 }}>{task.description}</div>}
          {task.why_it_matters && (
            <div style={{ padding: '10px 12px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>Why It Matters</div>
              <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>{task.why_it_matters}</div>
            </div>
          )}
          {task.how_to_fix && (
            <div style={{ padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', marginBottom: 2 }}>How to Fix</div>
              <div style={{ fontSize: 12, color: '#065f46', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.how_to_fix}</div>
            </div>
          )}
          {task.code_example && (
            <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginTop: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Code Example:</div>
              <pre style={{ fontSize: 11, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{task.code_example}</pre>
            </div>
          )}
          {task.pages_affected?.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              <strong>Affects {task.pages_affected.length} page{task.pages_affected.length > 1 ? 's' : ''}:</strong> {task.pages_affected.slice(0, 3).join(', ')}{task.pages_affected.length > 3 ? ` +${task.pages_affected.length - 3} more` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RoleGroup({ role, tasks }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.OTHER;
  const Icon = config.icon;
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ marginBottom: 20 }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: config.bg, border: `1px solid ${config.border}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', marginBottom: expanded ? 8 : 0 }}>
        <Icon size={18} color={config.color} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: config.color }}>{config.label}</span>
        <span style={{ fontSize: 12, color: config.color, opacity: 0.7 }}>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        <ChevronDown size={16} color={config.color} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
      </button>
      {expanded && tasks.map((task, i) => <TaskCard key={i} task={task} index={i} />)}
    </div>
  );
}

export default function RemediationFeed() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('by-role');
  const [completedTasks, setCompletedTasks] = useState(new Set());

  useEffect(() => {
    api.getReportData(id).then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const toggleTask = (taskId) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  if (loading) return <LoadingState message="Loading remediation feed…" />;
  if (!data) return <EmptyState title="No remediation data yet" description="Run an audit to generate a prioritized remediation feed." />;

  const allTasks = data.top_recommendations || data.recommendations?.items || data.action_items || data.tasks || [];
  const issuesByCategory = data.issues_by_category || {};
  const allIssues = [];
  Object.entries(issuesByCategory).forEach(([cat, items]) => {
    if (Array.isArray(items)) {
      items.forEach(item => {
        allIssues.push({ ...item, category: cat });
      });
    }
  });
  const issues = data.critical_issues || allIssues;

  const mappedTasks = allTasks.map(t => ({
    title: t.issue || t.title || t.description,
    severity: t.priority || t.severity || 'MEDIUM',
    description: t.why_it_matters || t.current_problem || t.description || '',
    how_to_fix: t.exact_fix || t.how_to_fix || t.fix || '',
    code_example: t.before_example || t.after_example || t.code_example || '',
    category: t.category || 'OTHER',
    assigned_role: t.category?.includes('content') || t.category?.includes('CONTENT') ? 'CONTENT_WRITER' :
      t.category?.includes('technical') || t.category?.includes('TECHNICAL') ? 'DEVELOPER' :
      t.category?.includes('seo') || t.category?.includes('SEO') ? 'SEO_SPECIALIST' :
      t.category?.includes('schema') || t.category?.includes('SCHEMA') ? 'DEVELOPER' :
      t.category?.includes('conversion') ? 'DESIGNER' : 'OTHER',
    why_it_matters: t.why_it_matters || t.expected_impact || '',
    pages_affected: t.pages_affected || [],
  }));

  const grouped = {};
  mappedTasks.forEach(t => {
    const role = t.assigned_role || 'OTHER';
    if (!grouped[role]) grouped[role] = [];
    grouped[role].push(t);
  });

  if (Object.keys(grouped).length === 0 && issues.length > 0) {
    issues.forEach(issue => {
      const cat = (issue.category || '').toUpperCase();
      const role = cat.includes('CONTENT') ? 'CONTENT_WRITER' :
        cat.includes('TECHNICAL') ? 'DEVELOPER' :
        cat.includes('SEO') || cat.includes('META') ? 'SEO_SPECIALIST' : 'OTHER';
      if (!grouped[role]) grouped[role] = [];
      grouped[role].push({
        title: issue.signal_name || issue.description || issue.issue || 'Fix issue',
        severity: issue.severity || 'MEDIUM',
        description: issue.impact || issue.fix || '',
        how_to_fix: issue.fix || '',
        category: cat,
      });
    });
  }

  const totalTasks = mappedTasks.length || issues.length;
  const criticalCount = [...mappedTasks, ...issues].filter(t => t.severity === 'CRITICAL').length;
  const highCount = [...mappedTasks, ...issues].filter(t => t.severity === 'HIGH').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ListChecks size={24} color="#3b82f6" /> Remediation Feed
            <DataSourceBadge source="ai-generated" size="xs" />
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '6px 0 0' }}>Role-grouped implementation tasks with detailed instructions</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total', value: totalTasks, color: '#3b82f6' },
            { label: 'Critical', value: criticalCount, color: '#dc2626' },
            { label: 'High', value: highCount, color: '#ea580c' },
            { label: 'Roles', value: Object.keys(grouped).length, color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '12px 14px', background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          {[
            { key: 'by-role', label: 'By Role', icon: Users },
            { key: 'by-severity', label: 'By Severity', icon: AlertTriangle },
            { key: 'all', label: 'All Tasks', icon: ListChecks },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: activeTab === t.key ? '#3b82f6' : 'transparent',
                color: activeTab === t.key ? '#fff' : '#64748b',
              }}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'by-role' && Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).map(([role, tasks]) => (
          <RoleGroup key={role} role={role} tasks={tasks} />
        ))}

        {activeTab === 'by-severity' && (
          <div>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
              const sevTasks = [...mappedTasks, ...issues].filter(t => t.severity === sev);
              if (sevTasks.length === 0) return null;
              const sevColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb' };
              return (
                <div key={sev} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: sevColors[sev] }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: sevColors[sev] }}>{sev} ({sevTasks.length})</span>
                  </div>
                  {sevTasks.map((task, i) => <TaskCard key={i} task={task} index={i} />)}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'all' && (
          <div>
            {allTasks.length > 0 ? allTasks.map((task, i) => <TaskCard key={i} task={{ ...task, severity: task.priority || task.severity }} index={i} />) :
              issues.length > 0 ? issues.map((issue, i) => <TaskCard key={i} task={issue} index={i} />) :
                <div style={{ padding: 30, background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <CheckCircle size={32} color="#059669" />
                  <p style={{ marginTop: 8, color: '#059669', fontWeight: 600 }}>No tasks to implement</p>
                </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}
