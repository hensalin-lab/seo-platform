import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Brain, Sparkles, Zap, Target, Lightbulb, RefreshCw, CheckCircle,
  AlertTriangle, ArrowRight, Clock, BarChart3, TrendingUp
} from 'lucide-react';
import { api } from '../api';

const IMPACT_COLORS = {
  HIGH: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  MEDIUM: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  LOW: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
};

const EFFORT_COLORS = {
  LOW: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  MEDIUM: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  HIGH: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

function ProviderBadge({ provider }) {
  const map = {
    openai: { bg: 'rgba(16,163,127,0.1)', color: '#10a37f', label: 'OpenAI' },
    gemini: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Gemini' },
    fallback: { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', label: 'Rule-Based' },
  };
  const s = map[provider] || map.fallback;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function SectionCard({ icon: Icon, title, count, children }) {
  return (
    <div style={{
      background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 'var(--radius, 12px)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon size={18} color="var(--accent, #3b82f6)" />
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>{title}</span>
        </div>
        {count != null && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            background: 'var(--bg-secondary, #f3f4f6)', color: 'var(--text-muted, #6b7280)',
          }}>{count}</span>
        )}
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}

export default function AiSuggestions() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const result = await api.getAiSuggestions(id);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to generate suggestions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(168,85,247,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s ease-in-out infinite' }}>
          <Brain size={28} color="var(--accent, #3b82f6)" />
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>AI is analyzing your site...</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>Generating personalized recommendations</div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <AlertTriangle size={40} color="#ef4444" />
        <div style={{ fontSize: 16, fontWeight: 600 }}>Failed to Generate Suggestions</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>{error}</div>
        <button onClick={() => load()} style={{ marginTop: 8, padding: '8px 20px', borderRadius: 'var(--radius-sm, 6px)', background: 'var(--accent, #3b82f6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Retry</button>
      </div>
    );
  }

  const suggestions = data?.suggestions || {};
  const provider = data?.provider || 'fallback';
  const {
    priority_actions = [],
    quick_wins = [],
    strategic_insights = [],
    content_recommendations = [],
    summary = '',
  } = suggestions;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #111827)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={22} color="var(--accent, #3b82f6)" /> AI SEO Suggestions
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>
            Personalized, AI-powered recommendations for your website
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ProviderBadge provider={provider} />
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border, #e5e7eb)',
              background: 'var(--bg-white, #fff)', cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500,
              color: 'var(--text, #111827)', opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(168,85,247,0.05))',
          border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius, 12px)', padding: '18px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Brain size={20} color="var(--accent, #3b82f6)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent, #3b82f6)', marginBottom: 4 }}>AI Executive Summary</div>
              <div style={{ fontSize: 14, color: 'var(--text, #111827)', lineHeight: 1.6 }}>{summary}</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { icon: Target, label: 'Priority Actions', value: priority_actions.length, color: '#ef4444' },
          { icon: Zap, label: 'Quick Wins', value: quick_wins.length, color: '#22c55e' },
          { icon: Lightbulb, label: 'Insights', value: strategic_insights.length, color: '#f59e0b' },
          { icon: BarChart3, label: 'Content Ideas', value: content_recommendations.length, color: '#3b82f6' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)',
            borderRadius: 'var(--radius, 12px)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm, 6px)', background: `${stat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <stat.icon size={18} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Priority Actions */}
      {priority_actions.length > 0 && (
        <SectionCard icon={Target} title="Priority Actions" count={priority_actions.length}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {priority_actions.map((action, i) => {
              const imp = IMPACT_COLORS[action.impact] || IMPACT_COLORS.MEDIUM;
              const eff = EFFORT_COLORS[action.effort] || EFFORT_COLORS.MEDIUM;
              return (
                <div key={i} style={{
                  border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius-sm, 8px)',
                  padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
                  borderLeft: `3px solid ${imp.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)' }}>{action.title}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: imp.bg, color: imp.color }}>
                        {action.impact} impact
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: eff.bg, color: eff.color }}>
                        {action.effort} effort
                      </span>
                      {action.category && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                          {action.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.5 }}>{action.description}</div>
                  {action.specific_steps && action.specific_steps.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                      {action.specific_steps.map((step, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-secondary, #4b5563)' }}>
                          <ArrowRight size={12} color="var(--accent, #3b82f6)" style={{ marginTop: 3, flexShrink: 0 }} />
                          {step}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Quick Wins */}
      {quick_wins.length > 0 && (
        <SectionCard icon={Zap} title="Quick Wins" count={quick_wins.length}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {quick_wins.map((win, i) => (
              <div key={i} style={{
                border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-sm, 8px)',
                padding: '14px 16px', background: 'rgba(34,197,94,0.03)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)', marginBottom: 6 }}>{win.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.5, marginBottom: 8 }}>{win.description}</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {win.estimated_time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>
                      <Clock size={12} /> {win.estimated_time}
                    </div>
                  )}
                  {win.expected_improvement && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
                      <TrendingUp size={12} /> {win.expected_improvement}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Strategic Insights */}
      {strategic_insights.length > 0 && (
        <SectionCard icon={Lightbulb} title="Strategic Insights" count={strategic_insights.length}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {strategic_insights.map((insight, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                borderRadius: 'var(--radius-sm, 8px)', background: 'rgba(245,158,11,0.04)',
                border: '1px solid rgba(245,158,11,0.12)',
              }}>
                <CheckCircle size={16} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text, #111827)', lineHeight: 1.6 }}>{insight}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Content Recommendations */}
      {content_recommendations.length > 0 && (
        <SectionCard icon={BarChart3} title="Content Recommendations" count={content_recommendations.length}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {content_recommendations.map((rec, i) => {
              const pri = IMPACT_COLORS[rec.priority] || IMPACT_COLORS.MEDIUM;
              return (
                <div key={i} style={{
                  display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 'var(--radius-sm, 8px)',
                  border: '1px solid var(--border, #e5e7eb)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{rec.topic}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: pri.bg, color: pri.color }}>{rec.priority}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>{rec.type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
                      {rec.target_words && `~${rec.target_words} words`}
                      {rec.keywords && rec.keywords.length > 0 && ` · ${rec.keywords.slice(0, 3).join(', ')}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Empty State */}
      {!summary && priority_actions.length === 0 && quick_wins.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px', background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)',
          borderRadius: 'var(--radius, 12px)', textAlign: 'center',
        }}>
          <Brain size={48} color="var(--text-muted, #9ca3af)" />
          <h3 style={{ margin: '16px 0 8px', color: 'var(--text, #111827)' }}>No Suggestions Yet</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', maxWidth: 400 }}>
            AI is still analyzing your website. Click "Regenerate" to try again.
          </p>
        </div>
      )}
    </div>
  );
}
