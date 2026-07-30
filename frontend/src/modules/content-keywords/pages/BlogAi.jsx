import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  BookOpen, Calendar, Link2, MessageCircle, RefreshCw, TrendingUp,
  AlertTriangle, CheckCircle, ChevronRight, ChevronDown, Lightbulb,
  BarChart3, FileText, Clock, Target, Zap, HelpCircle, Layers
} from 'lucide-react';
import { api } from '../../../api';

const TYPE_COLORS = {
  GUIDE: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  LISTICLE: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  'Q&A': { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
  HOWTO: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  COMPARISON: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  CASE_STUDY: { bg: 'rgba(20,184,166,0.12)', color: '#14b8a6' },
};

const PRIORITY_COLORS = {
  HIGH: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  MEDIUM: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  LOW: { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af' },
};

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

function BlogIdeas({ ideas }) {
  const [expanded, setExpanded] = useState(null);
  if (!ideas || ideas.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #9ca3af)' }}>No blog ideas generated yet.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ideas.map((idea, i) => {
        const tc = TYPE_COLORS[idea.type] || TYPE_COLORS.GUIDE;
        const pc = PRIORITY_COLORS[idea.priority] || PRIORITY_COLORS.MEDIUM;
        const isOpen = expanded === i;
        return (
          <div key={idea.id || i} style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
            <div onClick={() => setExpanded(isOpen ? null : i)} style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              {isOpen ? <ChevronDown size={16} color="var(--text-muted, #6b7280)" /> : <ChevronRight size={16} color="var(--text-muted, #6b7280)" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)' }}>{idea.title}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: tc.bg, color: tc.color }}>{idea.type}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: pc.bg, color: pc.color }}>{idea.priority}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--border, #e5e7eb)', color: 'var(--text-muted, #6b7280)' }}>~{idea.target_words} words</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>{(idea.source || '').replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
            {isOpen && (
              <div style={{ padding: '12px 18px 16px 46px', borderTop: '1px solid var(--border, #e5e7eb)', background: 'rgba(59,130,246,0.02)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)', marginBottom: 8 }}><strong>Primary Keyword:</strong> {idea.primary_keyword}</div>
                {idea.related_keywords?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {idea.related_keywords.map((rk, j) => (
                      <span key={j} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(168,85,247,0.08)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.15)' }}>{rk}</span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
                  Traffic Potential: <strong style={{ color: idea.estimated_traffic_potential === 'HIGH' ? '#22c55e' : '#f59e0b' }}>{idea.estimated_traffic_potential}</strong>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ContentCalendar({ calendar }) {
  if (!calendar || calendar.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #9ca3af)' }}>No content calendar items.</div>;
  const grouped = {};
  calendar.forEach(item => {
    grouped[item.week] = grouped[item.week] || [];
    grouped[item.week].push(item);
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(grouped).map(([week, items]) => (
        <div key={week} style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color="#3b82f6" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)' }}>{week}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— {items.length} articles planned</span>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, i) => {
              const tc = TYPE_COLORS[item.type] || TYPE_COLORS.GUIDE;
              return (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', minWidth: 90 }}>{item.publish_date}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text, #111827)', flex: 1 }}>{item.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: tc.bg, color: tc.color }}>{item.type}</span>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--border, #e5e7eb)', color: 'var(--text-muted, #6b7280)' }}>{item.target_words}w</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function InternalLinking({ opportunities }) {
  if (!opportunities || opportunities.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #9ca3af)' }}>No internal linking opportunities found.</div>;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Internal Linking Opportunities</span>
      </div>
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {opportunities.map((opp, i) => (
          <div key={i} style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border, #e5e7eb)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Link2 size={14} color="#3b82f6" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent, #3b82f6)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.source_page}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>→</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text, #111827)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.target_page}</span>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontWeight: 700 }}>Score: {opp.overlap_score}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {opp.shared_topics.slice(0, 6).map((t, j) => (
                <span key={j} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'rgba(168,85,247,0.08)', color: '#a855f7' }}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedSnippets({ snippets }) {
  if (!snippets || snippets.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #9ca3af)' }}>No featured snippet opportunities found.</div>;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Featured Snippet Opportunities</span>
      </div>
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {snippets.map((s, i) => (
          <div key={i} style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border, #e5e7eb)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)', marginBottom: 6 }}>{s.question}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{s.type}</span>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: s.priority === 'HIGH' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: s.priority === 'HIGH' ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>{s.priority}</span>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: s.current_content_match === 'STRONG' ? 'rgba(34,197,94,0.12)' : s.current_content_match === 'PARTIAL' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', color: s.current_content_match === 'STRONG' ? '#22c55e' : s.current_content_match === 'PARTIAL' ? '#f59e0b' : '#ef4444' }}>{s.current_content_match}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)' }}>{s.suggested_format}</div>
            {s.target_page && <div style={{ fontSize: 11, color: 'var(--accent, #3b82f6)', marginTop: 4 }}>Target: {s.target_page}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Repurposing({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #9ca3af)' }}>No repurposing suggestions.</div>;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Content Repurposing</span>
      </div>
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {suggestions.map((s, i) => (
          <div key={i} style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border, #e5e7eb)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)', marginBottom: 4 }}>{s.source_title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginBottom: 8 }}>{s.source_words} words · {s.source_url}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {s.repurpose_into.map((r, j) => (
                <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12 }}>
                  <RefreshCw size={12} color="#a855f7" />
                  <span style={{ fontWeight: 600, color: 'var(--text, #111827)', minWidth: 100 }}>{r.type}</span>
                  <span style={{ color: 'var(--text-muted, #6b7280)' }}>{r.platform}</span>
                  <span style={{ color: 'var(--text-secondary, #4b5563)', flex: 1 }}>{r.description}</span>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--border, #e5e7eb)', color: 'var(--text-muted, #6b7280)' }}>{r.estimated_time}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendSignals({ signals }) {
  if (!signals || signals.length === 0) return null;
  const TYPE_COLOR = { RISING: '#ef4444', SEASONAL: '#f59e0b', EVERGREEN: '#22c55e' };
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <TrendingUp size={18} color="#f59e0b" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Trend Signals</span>
      </div>
      <div style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {signals.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: `1px solid ${TYPE_COLOR[s.type]}20`, background: `${TYPE_COLOR[s.type]}08` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLOR[s.type], flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text, #111827)' }}>{s.topic}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${TYPE_COLOR[s.type]}15`, color: TYPE_COLOR[s.type] }}>{s.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BlogAi() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ideas');

  useEffect(() => {
    api.getBlogAi(id).then(res => setData(res)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border, #e5e7eb)', borderTopColor: '#a855f7', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>Generating blog intelligence...</div>
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
      <BookOpen size={40} color="var(--text-muted, #9ca3af)" />
      <div style={{ fontSize: 16, fontWeight: 600 }}>No Data</div>
    </div>
  );

  const s = data.summary || {};
  const tabs = [
    { key: 'ideas', label: 'Blog Ideas', count: s.total_blog_ideas || 0 },
    { key: 'calendar', label: 'Content Calendar', count: s.content_calendar_items || 0 },
    { key: 'links', label: 'Internal Links', count: s.internal_linking_opportunities || 0 },
    { key: 'snippets', label: 'Featured Snippets', count: s.featured_snippet_targets || 0 },
    { key: 'repurpose', label: 'Repurposing', count: s.repurposing_suggestions || 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #111827)', margin: '0 0 4px' }}>Blog AI Engine</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>AI-powered blog strategy: ideas, calendar, linking, snippets, and repurposing.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <StatCard icon={Lightbulb} label="Blog Ideas" value={s.total_blog_ideas || 0} color="#a855f7" />
        <StatCard icon={Zap} label="High Priority" value={s.high_priority_ideas || 0} color="#22c55e" />
        <StatCard icon={Calendar} label="Calendar Items" value={s.content_calendar_items || 0} color="#3b82f6" />
        <StatCard icon={Link2} label="Link Opportunities" value={s.internal_linking_opportunities || 0} color="#f59e0b" />
        <StatCard icon={Target} label="Snippet Targets" value={s.featured_snippet_targets || 0} color="#ef4444" />
        <StatCard icon={TrendingUp} label="Trend Signals" value={s.trend_signals || 0} color="#14b8a6" />
      </div>

      <TrendSignals signals={data.trend_signals} />

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'ideas' && <BlogIdeas ideas={data.blog_ideas} />}
      {activeTab === 'calendar' && <ContentCalendar calendar={data.content_calendar} />}
      {activeTab === 'links' && <InternalLinking opportunities={data.internal_linking} />}
      {activeTab === 'snippets' && <FeaturedSnippets snippets={data.featured_snippets} />}
      {activeTab === 'repurpose' && <Repurposing suggestions={data.content_repurposing} />}
    </div>
  );
}
