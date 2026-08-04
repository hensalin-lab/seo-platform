import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Layers, CheckCircle, XCircle, AlertTriangle, Brain, Copy, Target, TrendingUp, ArrowRight, FileCode, Link2, User } from 'lucide-react';

function ScoreRing({ score, size = 70, label }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const offset = c - (pct / 100) * c;
  const color = pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(pct)}</span>
        {label && <span style={{ fontSize: 7, color: 'var(--text-muted)', marginTop: 1 }}>{label}</span>}
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children, color = '#3b82f6' }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-white)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function CopyBlock({ title, content }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ marginBottom: 8 }}>
      {title && <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{title}</div>}
      <div style={{ position: 'relative' }}>
        <div style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 120, overflow: 'auto' }}>{content}</div>
        <button onClick={copy} style={{ position: 'absolute', top: 4, right: 4, padding: '2px 8px', borderRadius: 4, background: copied ? '#059669' : '#e2e8f0', color: copied ? '#fff' : '#64748b', border: 'none', fontSize: 10, cursor: 'pointer' }}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  );
}

export default function PageIntelligenceV2() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scores');

  useEffect(() => {
    api.getAuditPages(id, { limit: 100 }).then(d => { setPages(d.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    api.getPageIntelligenceV2(id, selectedIdx).then(d => setData(d)).catch(() => {});
  }, [id, selectedIdx, pages]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No data available</div>;

  const scores = data.category_scores || {};
  const beforeAfter = data.before_after_fixes || {};
  const competitor = data.competitor_comparison || {};
  const aiSearch = data.ai_search_readiness || {};
  const entities = data.entity_analysis || {};
  const internalLinks = data.internal_linking_intelligence || {};
  const predictions = data.predicted_improvements || {};
  const actionPlan = data.action_plan || {};
  const business = data.business_impact || {};
  const rankingImpact = data.ranking_impact_analysis || [];

  const tabs = [
    { key: 'scores', label: 'Scores' }, { key: 'fixes', label: 'Before/After' },
    { key: 'ranking', label: 'Ranking Impact' }, { key: 'ai', label: 'AI Search' },
    { key: 'entities', label: 'Entities' }, { key: 'links', label: 'Links' },
    { key: 'plan', label: 'Action Plan' }, { key: 'business', label: 'Business Impact' },
  ];

  return (
    <div style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
          {pages.map((p, i) => <option key={i} value={i}>{p.url?.substring(0, 70)}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: activeTab === t.key ? '#1e293b' : '#f1f5f9', color: activeTab === t.key ? '#fff' : '#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'scores' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {Object.entries(scores).map(([cat, info]) => (
            <Card key={cat} title={cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} icon={Layers} color="#3b82f6">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ScoreRing score={info.score} size={60} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  <div>Target: {info.target}</div>
                  <div>Passed: {info.passed || 0}</div>
                  <div>Failed: {info.failed || 0}</div>
                </div>
              </div>
              {(info.passed || info.failed) && <div style={{ marginTop: 8, fontSize: 11 }}>
                {(info.passed || []).slice(0, 2).map((s, i) => (
                  <div key={`p-${i}`} style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
                    <CheckCircle size={10} color="#059669" />
                    <span style={{ color: '#059669' }}>{typeof s === 'string' ? s : s.name || s}</span>
                  </div>
                ))}
                {(info.failed || []).slice(0, 2).map((s, i) => (
                  <div key={`f-${i}`} style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
                    <XCircle size={10} color="#dc2626" />
                    <span style={{ color: '#dc2626' }}>{typeof s === 'string' ? s : s.name || s}</span>
                  </div>
                ))}
              </div>}
            </Card>
          ))}
          {Object.keys(scores).length === 0 && <div style={{ padding: 20, color: 'var(--text-muted)' }}>No score breakdown available</div>}
        </div>
      )}

      {activeTab === 'fixes' && (
        <>
          {beforeAfter.title && <Card title="Title" icon={Layers} color="#3b82f6"><CopyBlock title="Current" content={beforeAfter.title.current} /><CopyBlock title="Recommended" content={beforeAfter.title.recommended} /></Card>}
          {beforeAfter.h1 && <Card title="H1" icon={Layers} color="#3b82f6"><CopyBlock title="Current" content={beforeAfter.h1.current} /><CopyBlock title="Recommended" content={beforeAfter.h1.recommended} /></Card>}
          {beforeAfter.meta_description && <Card title="Meta Description" icon={Layers} color="#3b82f6"><CopyBlock title="Current" content={beforeAfter.meta_description.current} /><CopyBlock title="Recommended" content={beforeAfter.meta_description.recommended} /></Card>}
          {beforeAfter.intro && <Card title="Introduction" icon={Layers} color="#3b82f6"><CopyBlock title="Current" content={beforeAfter.intro.current} /><CopyBlock title="Recommended" content={beforeAfter.intro.recommended} /></Card>}
          {beforeAfter.generated_faq && <Card title="FAQ" icon={Layers} color="#8b5cf6"><CopyBlock title="Generated FAQ" content={Array.isArray(beforeAfter.generated_faq) ? beforeAfter.generated_faq.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n') : beforeAfter.generated_faq} /></Card>}
          {beforeAfter.generated_schema && <Card title="Schema" icon={FileCode} color="#059669"><CopyBlock title="Generated JSON-LD" content={typeof beforeAfter.generated_schema === 'string' ? beforeAfter.generated_schema : JSON.stringify(beforeAfter.generated_schema, null, 2)} /></Card>}
          {!beforeAfter.title && !beforeAfter.h1 && <div style={{ padding: 20, color: 'var(--text-muted)' }}>No before/after data available</div>}
        </>
      )}

      {activeTab === 'ranking' && rankingImpact.length > 0 && (
        <Card title="Ranking Impact Analysis" icon={Target} color="#dc2626">
          {rankingImpact.map((item, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < rankingImpact.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <div style={{ fontWeight: 600 }}>{item.issue}</div>
              <div>SEO: <span style={{ color: item.seo_impact === 'High' ? '#dc2626' : '#d97706' }}>{item.seo_impact}</span></div>
              <div>AI: <span style={{ color: item.ai_impact === 'High' ? '#dc2626' : '#d97706' }}>{item.ai_impact}</span></div>
              <div style={{ color: 'var(--text-muted)' }}>{item.difficulty}</div>
              <div style={{ color: 'var(--text-muted)' }}>{item.time}</div>
              <div style={{ color: '#059669', fontSize: 11 }}>{item.expected_effect}</div>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'ai' && (
        <Card title="AI Search Readiness by Platform" icon={Brain} color="#8b5cf6">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {Object.entries(aiSearch.platforms || {}).map(([platform, info]) => (
              <div key={platform} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, textTransform: 'capitalize' }}>{platform.replace(/_/g, ' ')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <ScoreRing score={info.score} size={45} />
                </div>
                {info.improvement && <div style={{ fontSize: 11, color: '#059669' }}>+ {info.improvement}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'entities' && (
        <Card title="Entity Analysis" icon={Target} color="#d97706">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#059669' }}>Detected</div>
              {(entities.detected_entities || []).map((e, i) => (
                <span key={i} style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 4, fontSize: 11, background: '#f0fdf4', color: '#059669', margin: '0 4px 4px 0', border: '1px solid #d1fae5' }}>{typeof e === 'string' ? e : e.entity || e.name || JSON.stringify(e)}</span>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#dc2626' }}>Missing</div>
              {(entities.missing_entities || []).map((e, i) => (
                <span key={i} style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 4, fontSize: 11, background: '#fef2f2', color: '#dc2626', margin: '0 4px 4px 0', border: '1px solid #fecaca' }}>{typeof e === 'string' ? e : e.entity || e.name || JSON.stringify(e)}</span>
              ))}
            </div>
          </div>
          {entities.suggested_paragraph && <div style={{ marginTop: 12 }}><CopyBlock title="Suggested Paragraph" content={entities.suggested_paragraph} /></div>}
        </Card>
      )}

      {activeTab === 'links' && (internalLinks.suggestions?.length > 0 || internalLinks.suggested_links?.length > 0) && (
        <Card title="Internal Link Suggestions" icon={Link2} color="#059669">
          {(internalLinks.suggestions || internalLinks.suggested_links || []).map((s, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < (internalLinks.suggestions || internalLinks.suggested_links || []).length - 1 ? '1px solid #f1f5f9' : 'none', display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: '#2563eb' }}>{s.anchor_text}</div>
              <div style={{ color: 'var(--text-muted)' }}>{s.destination || s.destination_url}</div>
              <div style={{ color: '#374151' }}>{s.reason}</div>
              <div style={{ color: '#059669' }}>{Math.round(s.confidence || s.confidence_score || 0)}% confidence</div>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'plan' && (
        <Card title="Action Plan" icon={TrendingUp} color="#059669">
          {[
            { key: 'critical_today', label: 'critical', time: 'Today' },
            { key: 'high_this_week', label: 'high', time: 'This Week' },
            { key: 'medium_next_month', label: 'medium', time: 'This Month' },
          ].map(({ key, label, time }) => {
            const items = actionPlan[key] || [];
            if (!items.length) return null;
            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: label === 'critical' ? '#dc2626' : label === 'high' ? '#d97706' : '#2563eb', marginBottom: 8 }}>{label} ({time})</div>
                {items.map((item, i) => (
                  <div key={i} style={{ padding: '6px 0', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <ArrowRight size={12} color={label === 'critical' ? '#dc2626' : label === 'high' ? '#d97706' : '#2563eb'} />
                    <span style={{ flex: 1 }}>{item.task || item.recommendation || item.issue}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{item.time || item.time_to_fix}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{item.effort || item.difficulty}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </Card>
      )}

      {activeTab === 'business' && (
        <Card title="Business Impact Estimates" icon={TrendingUp} color="#059669">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {Object.entries(business).map(([key, value]) => (
              <div key={key} style={{ padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 4 }}>{key.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
              </div>
            ))}
          </div>
          {predictions.current_score && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Score Predictions</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current</div><div style={{ fontSize: 20, fontWeight: 800 }}>{Math.round(predictions.current_score)}</div></div>
                <ArrowRight size={20} color="#3b82f6" />
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>After Critical</div><div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{Math.round(predictions.after_critical_fixes || 0)}</div></div>
                <ArrowRight size={20} color="#3b82f6" />
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>After All</div><div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{Math.round(predictions.after_all_fixes || 0)}</div></div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
