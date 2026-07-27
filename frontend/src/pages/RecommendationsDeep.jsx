import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Lightbulb, AlertTriangle, CheckCircle, ChevronDown, Code, Target, Zap, Globe, Brain, ArrowRight, Calendar, BarChart3, TrendingUp } from 'lucide-react';

function Rank1Step({ step, index }) {
  const [expanded, setExpanded] = useState(index < 3);
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 12, background: '#fff', borderLeft: `4px solid ${index < 3 ? '#dc2626' : index < 6 ? '#ea580c' : '#3b82f6'}` }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#f8fafc', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: index < 3 ? '#dc262615' : index < 6 ? '#ea580c15' : '#3b82f615', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: index < 3 ? '#dc2626' : index < 6 ? '#ea580c' : '#3b82f6', flexShrink: 0 }}>{step.step}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{step.title}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{step.timeline} | Impact: {step.impact}</div>
        </div>
        <ChevronDown size={14} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, marginBottom: 10 }}>{step.description}</div>
          {step.actions?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', marginBottom: 6 }}>Actions:</div>
              {step.actions.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', fontSize: 12, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                  <ArrowRight size={12} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{typeof a === 'string' ? a : a.title || a.text || JSON.stringify(a)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionCard({ action, index }) {
  const sevColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb' };
  const sevColor = sevColors[action.severity] || '#64748b';
  return (
    <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 6, border: `1px solid ${sevColor}20`, borderLeft: `3px solid ${sevColor}`, background: '#fafbfc' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 20, height: 20, borderRadius: 5, background: `${sevColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: sevColor, flexShrink: 0 }}>{index + 1}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1 }}>{action.title}</span>
        {action.severity && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: `${sevColor}12`, color: sevColor, fontWeight: 600 }}>{action.severity}</span>}
      </div>
      {action.how_to_fix && <div style={{ fontSize: 12, color: '#065f46', marginTop: 4, paddingLeft: 28, lineHeight: 1.5 }}>{action.how_to_fix}</div>}
    </div>
  );
}

export default function RecommendationsDeep() {
  const { id } = useParams();
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('how-to-rank');

  useEffect(() => {
    api.getFullStrategy(id).then(d => { setStrategy(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /><p style={{ marginTop: 12, color: '#64748b' }}>Generating comprehensive strategy...</p></div>;
  if (!strategy) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No data available</div>;

  const { executive_summary: es, how_to_rank_1: steps, action_plan: plan, keyword_strategy: kwStrategy, content_strategy: contentStrat, competitor_insights: compInsights } = strategy;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lightbulb size={24} color="#f59f00" /> Complete Ranking Strategy
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '6px 0 0' }}>Step-by-step guide to reach #1 in Google — based on {es?.total_pages || 0} pages and {es?.total_issues || 0} issues analyzed</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'SEO Score', value: `${es?.seo_score || 0}`, color: '#3b82f6' },
            { label: 'Technical', value: `${es?.technical_score || 0}`, color: '#059669' },
            { label: 'AEO', value: `${es?.aeo_score || 0}`, color: '#8b5cf6' },
            { label: 'GEO', value: `${es?.geo_score || 0}`, color: '#d97706' },
            { label: 'Critical', value: `${es?.critical_issues || 0}`, color: '#dc2626' },
          ].map((s, i) => (
            <div key={i} style={{ padding: 12, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', borderLeft: `3px solid ${s.color}`, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {es?.top_3_priorities && (
          <div style={{ padding: 16, background: '#dc262610', borderRadius: 10, border: '1px solid #dc262630', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Top 3 Priorities</div>
            {es.top_3_priorities.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 12, color: '#7f1d1d' }}>
                <span style={{ fontWeight: 700 }}>{i + 1}.</span> {p}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 4 }}>
          {[
            { key: 'how-to-rank', label: 'How to Rank #1', icon: Target },
            { key: 'week-1', label: `Week 1 (${plan?.week_1?.length || 0})`, icon: Zap },
            { key: 'month-1', label: `Month 1 (${(plan?.week_2_to_4?.length || 0) + (plan?.month_2_to_3?.length || 0)})`, icon: Calendar },
            { key: 'keywords', label: 'Keywords', icon: BarChart3 },
            { key: 'competitor', label: 'Competitor', icon: Globe },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: activeTab === t.key ? '#3b82f6' : 'transparent',
                color: activeTab === t.key ? '#fff' : '#64748b',
              }}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'how-to-rank' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>How to Get to #1 on Google — 10-Step Plan</h3>
            {steps?.map((step, i) => <Rank1Step key={i} step={step} index={i} />)}
          </div>
        )}

        {activeTab === 'week-1' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', margin: '0 0 14px' }}>Week 1: Critical Fixes ({plan?.week_1?.length || 0} items)</h3>
            {plan?.week_1?.map((a, i) => <ActionCard key={i} action={a} index={i} />)}
            {(!plan?.week_1 || plan.week_1.length === 0) && <p style={{ color: '#059669', fontWeight: 600 }}>No critical issues!</p>}
          </div>
        )}

        {activeTab === 'month-1' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ea580c', margin: '0 0 14px' }}>Week 2-4: High Priority ({plan?.week_2_to_4?.length || 0} items)</h3>
            {plan?.week_2_to_4?.map((a, i) => <ActionCard key={i} action={a} index={i} />)}
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#d97706', margin: '20px 0 14px' }}>Month 2-3: Medium Priority ({plan?.month_2_to_3?.length || 0} items)</h3>
            {plan?.month_2_to_3?.map((a, i) => <ActionCard key={i} action={a} index={i} />)}
          </div>
        )}

        {activeTab === 'keywords' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>Keyword Strategy ({kwStrategy?.length || 0} keywords)</h3>
            {kwStrategy?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>Keyword</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {kwStrategy.map((kw, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{kw.keyword}</td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>{kw.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p style={{ color: '#64748b' }}>No keyword data available</p>}
          </div>
        )}

        {activeTab === 'competitor' && (
          <div>
            {compInsights?.length > 0 ? compInsights.map((insight, i) => (
              <div key={i} style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 6, border: `1px solid ${insight.type === 'competitor_strength' ? '#dc262630' : insight.type === 'our_opportunity' ? '#05966930' : '#3b82f630'}`, background: insight.type === 'competitor_strength' ? '#fef2f2' : insight.type === 'our_opportunity' ? '#f0fdf4' : '#eff6ff' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: insight.type === 'competitor_strength' ? '#dc2626' : insight.type === 'our_opportunity' ? '#059669' : '#3b82f6', textTransform: 'uppercase' }}>{insight.type.replace(/_/g, ' ')}</span>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{insight.text}</div>
              </div>
            )) : <p style={{ color: '#64748b' }}>No competitor data available</p>}
          </div>
        )}
      </div>
    </div>
  );
}
