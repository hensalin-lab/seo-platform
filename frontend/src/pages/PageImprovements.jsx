import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Wrench, Code, PenTool, Palette, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, Target, Clock, Zap, Layers, Filter,
  ArrowRight, Info, BarChart3
} from 'lucide-react';
import { api } from '../api';

const IMPACT_COLORS = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  HIGH: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  MEDIUM: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  LOW: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
};

const ROLE_ICONS = { developer: Code, content: PenTool, designer: Palette };
const ROLE_COLORS = { developer: '#3b82f6', content: '#22c55e', designer: '#a855f7' };

function StatCard({ icon: Icon, label, value, color = 'var(--accent, #3b82f6)' }) {
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm, 6px)', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border, #e5e7eb)', overflowX: 'auto' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding: '10px 18px', fontSize: 13, fontWeight: active === t.key ? 600 : 500,
          color: active === t.key ? 'var(--accent, #3b82f6)' : 'var(--text-muted, #6b7280)',
          background: 'none', border: 'none', borderBottom: active === t.key ? '2px solid var(--accent, #3b82f6)' : '2px solid transparent',
          marginBottom: -2, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
        }}>
          {t.label}
          {t.count != null && (
            <span style={{
              marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
              background: active === t.key ? 'rgba(59,130,246,0.15)' : 'var(--border, #e5e7eb)',
              color: active === t.key ? 'var(--accent, #3b82f6)' : 'var(--text-muted, #6b7280)',
            }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function ScoreBar({ score, size = 'normal' }) {
  let color = '#ef4444';
  if (score >= 80) color = '#22c55e';
  else if (score >= 60) color = '#f59e0b';
  const w = size === 'small' ? 50 : 80;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: w, height: 6, borderRadius: 3, background: 'var(--border, #e5e7eb)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: size === 'small' ? 11 : 13, fontWeight: 700, color, minWidth: 28 }}>{score}</span>
    </div>
  );
}

function PageImprovementList({ improvements }) {
  const [expanded, setExpanded] = useState(null);
  if (!improvements || improvements.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {improvements.map((page, i) => {
        const isOpen = expanded === i;
        const totalItems = page.what_to_add.length + page.what_to_remove.length + page.what_to_rewrite.length + page.what_to_link.length + page.what_to_optimize.length;
        return (
          <div key={page.url + i} style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
            <div onClick={() => setExpanded(isOpen ? null : i)} style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              {isOpen ? <ChevronDown size={16} color="var(--text-muted, #6b7280)" /> : <ChevronRight size={16} color="var(--text-muted, #6b7280)" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent, #3b82f6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.url}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{page.title || 'Untitled'} · {totalItems} improvements</div>
              </div>
              <ScoreBar score={page.current_score} size="small" />
            </div>
            {isOpen && (
              <div style={{ padding: '12px 18px 16px 46px', borderTop: '1px solid var(--border, #e5e7eb)', display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(59,130,246,0.02)' }}>
                {[
                  { label: 'Add', items: page.what_to_add, icon: '➕', color: '#22c55e' },
                  { label: 'Remove', items: page.what_to_remove, icon: '➖', color: '#ef4444' },
                  { label: 'Rewrite', items: page.what_to_rewrite, icon: '✏️', color: '#f59e0b' },
                  { label: 'Link', items: page.what_to_link, icon: '🔗', color: '#3b82f6' },
                  { label: 'Optimize', items: page.what_to_optimize, icon: '⚡', color: '#a855f7' },
                ].map(section => section.items.length > 0 && (
                  <div key={section.label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: section.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      {section.icon} {section.label} ({section.items.length})
                    </div>
                    {section.items.map((item, j) => {
                      const ic = IMPACT_COLORS[item.impact] || IMPACT_COLORS.MEDIUM;
                      return (
                        <div key={j} style={{ padding: '10px 14px', borderRadius: 6, border: `1px solid ${ic.color}20`, background: `${ic.color}05`, marginBottom: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{item.item}</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ic.bg, color: ic.color }}>{item.impact}</span>
                              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--border, #e5e7eb)', color: 'var(--text-muted, #6b7280)' }}>{item.effort}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.5 }}>{item.detail}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', marginTop: 4 }}>Est: {item.estimated_time}</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RoleTasks({ tasks, role }) {
  if (!tasks || tasks.length === 0) return null;
  const Icon = ROLE_ICONS[role] || Wrench;
  const color = ROLE_COLORS[role] || '#6b7280';
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sorted = [...tasks].sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={18} color={color} />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)', textTransform: 'capitalize' }}>{role} Tasks</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— {tasks.length} tasks</span>
      </div>
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.slice(0, 15).map((task, i) => {
          const ic = IMPACT_COLORS[task.priority] || IMPACT_COLORS.MEDIUM;
          return (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 6, border: `1px solid ${ic.color}15`, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ic.bg, color: ic.color, marginTop: 2, flexShrink: 0 }}>{task.priority}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text, #111827)' }}>{task.task}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>
                  {task.difficulty} · {task.estimated_time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriorityMatrix({ matrix }) {
  if (!matrix || matrix.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <BarChart3 size={18} color="#f59e0b" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Priority Matrix</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— sorted by impact × ease</span>
      </div>
      <div style={{ padding: '12px 20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border, #e5e7eb)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Page</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Effort</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {matrix.slice(0, 30).map((m, i) => {
              const ic = IMPACT_COLORS[m.impact] || IMPACT_COLORS.MEDIUM;
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--accent, #3b82f6)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.page_url}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: 'var(--text, #111827)' }}>{m.item}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ic.bg, color: ic.color }}>{m.impact}</span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary, #4b5563)' }}>{m.effort}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{m.estimated_time}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PageImprovements() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pages');

  useEffect(() => {
    api.getPageImprovements(id).then(res => setData(res)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border, #e5e7eb)', borderTopColor: '#22c55e', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>Analyzing page improvements...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
      <AlertTriangle size={40} color="#ef4444" />
      <div style={{ fontSize: 16, fontWeight: 600 }}>Failed to Load</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>{error}</div>
    </div>
  );

  if (!data) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
      <Wrench size={40} color="var(--text-muted, #9ca3af)" />
      <div style={{ fontSize: 16, fontWeight: 600 }}>No Data</div>
    </div>
  );

  const s = data.summary || {};
  const tabs = [
    { key: 'pages', label: 'By Page', count: s.total_pages || 0 },
    { key: 'dev', label: 'Developer', count: s.by_role?.developer || 0 },
    { key: 'content', label: 'Content', count: s.by_role?.content || 0 },
    { key: 'design', label: 'Designer', count: s.by_role?.designer || 0 },
    { key: 'matrix', label: 'Priority Matrix', count: data.priority_matrix?.length || 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #111827)', margin: '0 0 4px' }}>Page Improvements</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>Per-page fixes with role-based tasks and priority scoring.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <StatCard icon={Wrench} label="Total Improvements" value={s.total_improvements || 0} color="var(--accent, #3b82f6)" />
        <StatCard icon={AlertTriangle} label="Critical Items" value={s.critical_items || 0} color="#ef4444" />
        <StatCard icon={Zap} label="High Priority" value={s.high_items || 0} color="#f59e0b" />
        <StatCard icon={Target} label="Avg Score" value={s.avg_score || 0} color="#22c55e" />
        <StatCard icon={Code} label="Dev Tasks" value={s.by_role?.developer || 0} color="#3b82f6" />
        <StatCard icon={PenTool} label="Content Tasks" value={s.by_role?.content || 0} color="#22c55e" />
        <StatCard icon={Palette} label="Design Tasks" value={s.by_role?.designer || 0} color="#a855f7" />
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'pages' && <PageImprovementList improvements={data.page_improvements} />}
      {activeTab === 'dev' && <RoleTasks tasks={data.role_based_tasks?.developer || []} role="developer" />}
      {activeTab === 'content' && <RoleTasks tasks={data.role_based_tasks?.content || []} role="content" />}
      {activeTab === 'design' && <RoleTasks tasks={data.role_based_tasks?.designer || []} role="designer" />}
      {activeTab === 'matrix' && <PriorityMatrix matrix={data.priority_matrix} />}
    </div>
  );
}
