import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';

const SEVERITY_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e', INFO: '#64748b' };

export default function GlobalIssuePanel({ auditId }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [total, setTotal] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const PAGE_SIZE = 50;

  useEffect(() => {
    if (!auditId) return;
    loadIssues();
  }, [auditId]);

  const loadIssues = async (append = false) => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: append ? issues.length : 0 };
      if (filterCat !== 'all') params.category = filterCat;
      if (filter !== 'all') params.severity = filter;
      const data = await api.getAuditIssues(auditId, params);
      if (data && data.items) {
        setIssues(prev => append ? [...prev, ...data.items] : data.items);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load issues', e);
    }
    setLoading(false);
  };

  const grouped = useMemo(() => {
    const groups = {};
    for (const issue of issues) {
      const cat = issue.category || 'OTHER';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(issue);
    }
    return groups;
  }, [issues]);

  const severities = ['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const categories = ['all', 'SEO', 'CONTENT', 'PERFORMANCE', 'ACCESSIBILITY', 'SECURITY', 'MOBILE', 'SOCIAL', 'OTHER'];

  if (!auditId) return null;

  return (
    <div style={{ marginTop: 32, borderTop: '1px solid #e2e8f0', paddingTop: 20, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>AI Issue Fix Center</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{total} issues found across your site</div>
        </div>
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
          {collapsed ? '▶ Show All Issues' : '▼ Hide Issues'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginRight: 2 }}>Severity:</span>
              {severities.map(s => (
                <button key={s} onClick={() => { setFilter(s); setIssues([]); }}
                  style={{
                    padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 11,
                    background: filter === s ? '#3b82f6' : '#fff', color: filter === s ? '#fff' : '#334155',
                    cursor: 'pointer', fontWeight: 500
                  }}>{s}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginRight: 2 }}>Category:</span>
              {categories.map(c => (
                <button key={c} onClick={() => { setFilterCat(c); setIssues([]); }}
                  style={{
                    padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 11,
                    background: filterCat === c ? '#3b82f6' : '#fff', color: filterCat === c ? '#fff' : '#334155',
                    cursor: 'pointer', fontWeight: 500
                  }}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            {loading && issues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>Loading issues...</div>
            ) : Object.keys(grouped).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>No issues match the current filters.</div>
            ) : Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div onClick={() => setCollapsedGroups(prev => ({ ...prev, [cat]: !prev[cat] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', cursor: 'pointer', borderRadius: 6, background: '#f8fafc', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', flex: 1 }}>{cat} ({items.length})</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{collapsedGroups[cat] ? '▶' : '▼'}</span>
                </div>
                {!collapsedGroups[cat] && items.map(issue => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            ))}
            {total > issues.length && (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <button onClick={() => loadIssues(true)}
                  style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #3b82f6', background: '#fff', color: '#3b82f6', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Load More ({Math.min(PAGE_SIZE, total - issues.length)} more)
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function IssueCard({ issue }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ padding: '8px 10px', marginBottom: 4, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ minWidth: 8, height: 8, borderRadius: '50%', background: SEVERITY_COLORS[issue.severity] || '#64748b', marginTop: 5 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{issue.signal_name || issue.category}</span>
            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: SEVERITY_COLORS[issue.severity] || '#64748b', color: '#fff', fontWeight: 600 }}>{issue.severity}</span>
          </div>
          <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 2 }}>{issue.page_url}</div>
          {expanded && (
            <div style={{ marginTop: 6, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
              <div style={{ fontSize: 12, color: '#334155', marginBottom: 4, lineHeight: 1.4 }}>{issue.description}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}><strong>Impact:</strong> {issue.impact}</div>
              <div style={{ padding: '6px 8px', background: '#f0f9ff', borderRadius: 4, fontSize: 12, color: '#0369a1', lineHeight: 1.4 }}>
                <strong>AI Fix:</strong> {issue.fix}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
