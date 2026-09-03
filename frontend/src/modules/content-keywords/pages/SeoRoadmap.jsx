import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { GitBranch, Clock, AlertTriangle, CheckCircle, ChevronDown, Target, Zap, ArrowRight, Calendar, BarChart3, Code, FileText, Search } from 'lucide-react';
import DataSourceBadge from '../../../components/DataSourceBadge';
import { LoadingState, EmptyState } from '../../../components/States';

function PhaseCard({ phase, phaseIndex }) {
  const [expanded, setExpanded] = useState(phaseIndex === 0);
  const phaseColors = ['#dc2626', '#ea580c', '#2563eb', '#059669', '#8b5cf6'];
  const phaseLabels = ['Immediate', 'Short-term', 'Medium-term', 'Long-term', 'Ongoing'];
  const color = phaseColors[phaseIndex] || '#64748b';
  const label = phaseLabels[phaseIndex] || `Phase ${phaseIndex + 1}`;

  return (
    <div style={{ border: `1px solid ${color}25`, borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: 'var(--bg-white)', borderLeft: `4px solid ${color}` }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', background: `${color}06`, border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color, flexShrink: 0 }}>
          {phaseIndex + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{phase.title || phase.label || label}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{phase.timeframe || phase.timeline || 'Timeline TBD'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{(phase.items || phase.tasks || []).length} tasks</span>
          <ChevronDown size={16} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
        </div>
      </button>
      {expanded && (
        <div style={{ padding: 18 }}>
          {phase.description && <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 14 }}>{phase.description}</div>}
          {(phase.items || phase.tasks || []).map((item, i) => {
            const sevColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb' };
            const sevColor = sevColors[item.severity] || '#64748b';
            return (
              <div key={i} style={{ padding: '12px 14px', borderRadius: 8, marginBottom: 8, border: `1px solid ${sevColor}20`, background: '#fafbfc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 5, background: `${sevColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: sevColor }}>{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1 }}>{item.title || item.issue || item.description}</span>
                  {item.severity && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: `${sevColor}15`, color: sevColor, fontWeight: 600 }}>{item.severity}</span>}
                </div>
                {item.description && <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginTop: 4, paddingLeft: 28 }}>{item.description}</div>}
                {item.how_to_fix && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', marginLeft: 28, fontSize: 12, color: '#065f46' }}>
                    <strong>How to fix:</strong> {item.how_to_fix}
                  </div>
                )}
                {item.code_example && (
                  <div style={{ marginTop: 8, background: '#1e293b', borderRadius: 6, padding: 10, marginLeft: 28 }}>
                    <pre style={{ fontSize: 11, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{item.code_example}</pre>
                  </div>
                )}
                {item.estimated_effort && <div style={{ marginTop: 6, marginLeft: 28, fontSize: 11, color: 'var(--text-muted)' }}>Estimated effort: {item.estimated_effort}</div>}
              </div>
            );
          })}
          {phase.milestones?.length > 0 && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Milestones</div>
              {phase.milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, padding: '4px 0', fontSize: 12, color: '#475569' }}>
                  <CheckCircle size={12} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{typeof m === 'string' ? m : m.title || m.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SeoRoadmap() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.getReportData(id).then(res => {
      setData(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState message="Loading roadmap…" />;
  if (!data) return <EmptyState title="No roadmap yet" description="Run an audit to generate your prioritized SEO roadmap." />;

  const roadmap = data.roadmap || data.recommendations?.roadmap || [];
  const topRecs = data.top_recommendations || data.recommendations?.items || [];
  const criticalIssues = data.critical_issues || [];

  const phases = roadmap.length > 0 ? roadmap : [
    { title: 'Immediate (Week 1-2)', items: topRecs.filter(r => (r.priority || r.severity) === 'CRITICAL').map(r => ({
      title: r.issue || r.description || 'Fix critical issue',
      severity: 'CRITICAL',
      description: r.why_it_matters || r.current_problem || '',
      how_to_fix: r.exact_fix || r.fix || '',
      category: r.category,
    })).concat(criticalIssues.slice(0, 10).map(ci => ({
      title: ci.signal + ': ' + (ci.description || ci.fix || ''),
      severity: ci.severity,
      description: ci.impact || '',
      how_to_fix: ci.fix || '',
    }))), timeframe: 'Week 1-2', description: 'Fix critical issues that are actively harming your rankings' },
    { title: 'Short-term (Week 3-4)', items: topRecs.filter(r => (r.priority || r.severity) === 'HIGH').map(r => ({
      title: r.issue || r.description || 'Fix high priority issue',
      severity: 'HIGH',
      description: r.why_it_matters || '',
      how_to_fix: r.exact_fix || '',
      category: r.category,
    })), timeframe: 'Week 3-4', description: 'Fix high-priority issues and improve core pages' },
    { title: 'Medium-term (Month 2-3)', items: topRecs.filter(r => (r.priority || r.severity) === 'MEDIUM').map(r => ({
      title: r.issue || r.description || 'Improve',
      severity: 'MEDIUM',
      description: r.why_it_matters || '',
      how_to_fix: r.exact_fix || '',
      category: r.category,
    })), timeframe: 'Month 2-3', description: 'Build content, improve UX, and expand keyword coverage' },
    { title: 'Long-term (Month 4-6)', items: topRecs.filter(r => (r.priority || r.severity) === 'LOW').map(r => ({
      title: r.issue || r.description || 'Optimize',
      severity: 'LOW',
      description: r.why_it_matters || '',
      how_to_fix: r.exact_fix || '',
      category: r.category,
    })), timeframe: 'Month 4-6', description: 'Advanced optimizations and continuous improvement' },
  ];

  const recommendations = topRecs;

  const totalTasks = phases.reduce((sum, p) => sum + (p.items || p.tasks || []).length, 0);
  const criticalTasks = phases[0]?.items?.length || 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <GitBranch size={24} color="#3b82f6" /> SEO Implementation Roadmap
            <DataSourceBadge source="formula" size="xs" />
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '6px 0 0' }}>Prioritized implementation plan with timelines and milestones</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: Target, label: 'Total Tasks', value: totalTasks, color: '#3b82f6' },
            { icon: Zap, label: 'Critical First', value: criticalTasks, color: '#dc2626' },
            { icon: Calendar, label: 'Phases', value: phases.length, color: '#8b5cf6' },
            { icon: Clock, label: 'Timeline', value: '6 months', color: '#059669' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '14px 16px', background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <s.icon size={20} color={s.color} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          {[
            { key: 'timeline', label: 'Timeline View', icon: Calendar },
            { key: 'priority', label: 'Priority Matrix', icon: AlertTriangle },
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

        {activeTab === 'timeline' && (
          <div>
            {phases.map((phase, i) => (
              <PhaseCard key={i} phase={phase} phaseIndex={i} />
            ))}
          </div>
        )}

        {activeTab === 'priority' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>Priority Impact Matrix</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { title: 'Critical & Quick', desc: 'Fix immediately - highest ROI', color: '#dc2626', items: recommendations.filter(r => (r.priority === 'CRITICAL' || r.severity === 'CRITICAL')) },
                { title: 'Critical & Complex', desc: 'Plan carefully - high impact but needs time', color: '#ea580c', items: recommendations.filter(r => (r.priority === 'HIGH' || r.severity === 'HIGH')) },
                { title: 'Easy Wins', desc: 'Low effort, decent reward - batch these', color: '#2563eb', items: recommendations.filter(r => r.priority === 'MEDIUM' || r.severity === 'MEDIUM') },
                { title: 'Long-term Bets', desc: 'Strategic improvements for later phases', color: '#059669', items: recommendations.filter(r => r.priority === 'LOW' || r.severity === 'LOW') },
              ].map((quadrant, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 10, border: `1px solid ${quadrant.color}25`, background: `${quadrant.color}05` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: quadrant.color, marginBottom: 4 }}>{quadrant.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{quadrant.desc}</div>
                  {quadrant.items.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No items</div>
                  ) : (
                    quadrant.items.slice(0, 5).map((item, j) => (
                      <div key={j} style={{ padding: '6px 8px', fontSize: 12, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                        {item.title || item.issue || item.description}
                      </div>
                    ))
                  )}
                  {quadrant.items.length > 5 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>+{quadrant.items.length - 5} more</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
