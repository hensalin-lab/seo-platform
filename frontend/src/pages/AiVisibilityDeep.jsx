import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import DataSourceBadge from '../components/DataSourceBadge';
import { Globe, MessageSquare, Search, Eye, Brain, AlertCircle, Zap, Target, Shield, TrendingUp,
  CheckCircle, AlertTriangle, ChevronDown, BarChart3, Clock, ExternalLink, ArrowRight, Database } from 'lucide-react';

const PLATFORMS = [
  { key: 'google_ai_overview', label: 'Google AI Overview', color: '#4285f4', icon: Globe },
  { key: 'chatgpt', label: 'ChatGPT', color: '#10a37f', icon: MessageSquare },
  { key: 'gemini', label: 'Gemini', color: '#4285f4', icon: Globe },
  { key: 'claude', label: 'Claude', color: '#d97706', icon: Brain },
  { key: 'perplexity', label: 'Perplexity', color: '#20b2aa', icon: Search },
  { key: 'copilot', label: 'Copilot', color: '#7c3aed', icon: Eye },
];

function ScoreRing({ score, size = 70, label }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const offset = c - (pct / 100) * c;
  const color = pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(pct)}</span>
        {label && <span style={{ fontSize: 7, color: '#94a3b8', marginTop: 1 }}>{label}</span>}
      </div>
    </div>
  );
}

function BarMeter({ value, max = 100, color, height = 6, label, showPct = true }) {
  const c = color || (value >= 70 ? '#059669' : value >= 50 ? '#d97706' : '#dc2626');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label && <span style={{ fontSize: 10, color: '#64748b', minWidth: 80 }}>{label}</span>}
      <div style={{ flex: 1, height, background: '#eef0f2', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (value / max) * 100)}%`, background: c, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      {showPct && <span style={{ fontSize: 10, fontWeight: 700, color: c, minWidth: 28, textAlign: 'right' }}>{Math.round(value)}%</span>}
    </div>
  );
}

function Card({ title, icon, children, color, extra }) {
  const Icon = icon || Eye;
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color: color || '#3b82f6' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', flex: 1 }}>{title}</span>
        {extra}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

export default function AiVisibilityDeep() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.getAuditPages(id, { limit: 100 }).then(d => { setPages(d.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    setPageLoading(true);
    api.getAiSearchIntelligence(id, selectedIdx).then(d => { setData(d); setPageLoading(false); }).catch(() => {
      api.getAiSearchDeep(id, selectedIdx).then(d => { setData(d); setPageLoading(false); }).catch(() => setPageLoading(false));
    });
  }, [id, selectedIdx, pages]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /><p style={{ marginTop: 12, color: '#64748b' }}>Loading...</p></div>;
  if (!pages.length) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No pages found</div>;

  const d = data || {};
  const platforms = d.platform_scores || {};
  const breakdowns = d.platform_signal_breakdowns || {};
  const citationProb = d.citation_probability || {};
  const hallRisk = d.hallucination_risk || {};
  const completeness = d.content_completeness || {};
  const freshness = d.freshness_analysis || {};
  const citQuality = d.citation_quality || {};
  const simulator = d.optimization_simulator || {};
  const aeoEligibility = d.ai_overview_eligibility || {};
  const predicted = d.predicted_scores || {};
  const entityAnalysis = d.entity_analysis || {};
  const citationAnalysis = d.citation_analysis || {};
  const whyCited = d.why_cited_or_not || {};
  const plan = d.optimization_plan || [];
  const competitorComp = d.competitor_comparison || {};
  const afterFixes = d.estimated_after_fixes || {};

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={20} color="#e64980" /> AI Search Intelligence
            <DataSourceBadge source="simulated" size="xs" />
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Estimated per-platform scoring based on content signals — connect real AI APIs for measured data</p>
        </div>

        <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, background: '#fff', marginBottom: 16, cursor: 'pointer' }}>
          {pages.map((p, i) => <option key={i} value={i}>{p.title || p.url}</option>)}
        </select>

        {pageLoading ? (
          <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div className="spinner" />
            <p style={{ marginTop: 10, fontSize: 13, color: '#64748b', fontWeight: 600 }}>Analyzing AI search signals...</p>
            <p style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>First load ~15s, cached after</p>
          </div>
        ) : d && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <Card title="Overall AI Score" icon={Brain} color="#e64980"
                extra={<span style={{ fontSize: 10, color: '#64748b' }}>{d.url}</span>}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <ScoreRing score={d.overall_ai_score} size={90} label="SCORE" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#1e293b', marginBottom: 8 }}>{pages[selectedIdx]?.title || pages[selectedIdx]?.url}</div>
                    <BarMeter value={d.overall_ai_score || 0} color="#e64980" />
                    {afterFixes.overall_ai_score && (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#059669', fontWeight: 600 }}>
                        After fixes: {Math.round(afterFixes.overall_ai_score)} (+{Math.round(afterFixes.overall_ai_score - (d.overall_ai_score || 0))})
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card title="AI Overview Eligibility" icon={Globe} color="#4285f4">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ textAlign: 'center', padding: 10, background: aeoEligibility.eligible ? '#f0fdf4' : '#fef2f2', borderRadius: 8, border: `1px solid ${aeoEligibility.eligible ? '#bbf7d0' : '#fecaca'}` }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: aeoEligibility.eligible ? '#059669' : '#dc2626' }}>{aeoEligibility.eligible ? 'Yes' : 'No'}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Eligible</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6' }}>{aeoEligibility.confidence || 0}%</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Confidence</div>
                  </div>
                </div>
                {aeoEligibility.missing_signals?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>MISSING FOR AI OVERVIEW</div>
                    {aeoEligibility.missing_signals.map((s, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#7f1d1d', padding: '2px 0', display: 'flex', gap: 4 }}>
                        <AlertTriangle size={10} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} /> {s}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Citation Probability" icon={Target} color="#12b886">
                {citationProb.platforms ? (
                  Object.entries(citationProb.platforms).map(([platform, data]) => (
                    <div key={platform} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#1e293b', marginBottom: 2, textTransform: 'capitalize' }}>
                        {platform.replace(/_/g, ' ')}: {data.probability || 0}%
                      </div>
                      <BarMeter value={data.probability || 0} color={data.probability >= 60 ? '#059669' : '#d97706'} height={4} />
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Run full analysis for citation probability</div>
                )}
              </Card>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 3, flexWrap: 'wrap' }}>
              {[
                { key: 'overview', label: 'Platform Scores', icon: BarChart3 },
                { key: 'signals', label: 'Signal Breakdowns', icon: Zap },
                { key: 'hallucination', label: 'Hallucination Risk', icon: AlertTriangle },
                { key: 'completeness', label: 'Content Completeness', icon: CheckCircle },
                { key: 'freshness', label: 'Freshness', icon: Clock },
                { key: 'citations', label: 'Citation Quality', icon: ExternalLink },
                { key: 'simulator', label: 'Optimization Sim', icon: TrendingUp },
                { key: 'entities', label: 'Entities', icon: Database },
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                    flex: 1, minWidth: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 8px',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                    background: activeTab === t.key ? '#1e293b' : 'transparent',
                    color: activeTab === t.key ? '#fff' : '#64748b',
                  }}>
                    <Icon size={11} /> {t.label}
                  </button>
                );
              })}
            </div>

            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {PLATFORMS.map(p => {
                  const score = platforms[p.key]?.score || platforms[p.key] || 0;
                  const scoreNum = typeof score === 'number' ? score : 0;
                  const details = platforms[p.key]?.reasons || platforms[p.key]?.fixes || [];
                  const pred = predicted[p.key];
                  const Icon = p.icon;
                  return (
                    <div key={p.key} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, background: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Icon size={18} style={{ color: p.color }} />
                        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{p.label}</span>
                        <ScoreRing score={scoreNum} size={50} />
                      </div>
                      <BarMeter value={scoreNum} color={p.color} height={4} />
                      {typeof platforms[p.key] === 'object' && platforms[p.key]?.reasons?.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>REASONS</div>
                          {platforms[p.key].reasons.slice(0, 3).map((r, i) => (
                            <div key={i} style={{ fontSize: 10, color: '#475569', padding: '1px 0' }}>· {r}</div>
                          ))}
                        </div>
                      )}
                      {typeof platforms[p.key] === 'object' && platforms[p.key]?.fixes?.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#2563eb', marginBottom: 2 }}>FIXES</div>
                          {platforms[p.key].fixes.slice(0, 2).map((f, i) => (
                            <div key={i} style={{ fontSize: 10, color: '#2563eb', padding: '1px 0' }}>→ {f}</div>
                          ))}
                        </div>
                      )}
                      {pred && (
                        <div style={{ marginTop: 6, padding: '4px 8px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0', fontSize: 10, color: '#059669', fontWeight: 600 }}>
                          Predicted after fix: {Math.round(pred)} (+{Math.round(pred - scoreNum)})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'signals' && (
              <Card title="Per-Platform Signal Breakdowns" icon={Zap} color="#f59e0b">
                {Object.keys(breakdowns).length > 0 ? Object.entries(breakdowns).map(([platform, signals]) => (
                  <div key={platform} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6, textTransform: 'capitalize' }}>{platform.replace(/_/g, ' ')}</div>
                    {Array.isArray(signals) && signals.map((s, i) => (
                      <div key={i} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 3, background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, flex: 1, color: '#1e293b' }}>{s.name || s.signal || `Signal ${i + 1}`}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                          background: s.present ? '#f0fdf4' : '#fef2f2', color: s.present ? '#059669' : '#dc2626' }}>
                          {s.present !== undefined ? (s.present ? 'Present' : 'Missing') : (s.status || '—')}
                        </span>
                        {s.weight && <span style={{ fontSize: 9, color: '#64748b' }}>Weight: {Math.round(s.weight * 100)}%</span>}
                        {s.score !== undefined && <span style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6' }}>{Math.round(s.score)}</span>}
                      </div>
                    ))}
                  </div>
                )) : (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No breakdown data available. Run analysis on a specific page.</div>
                )}
              </Card>
            )}

            {activeTab === 'hallucination' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Card title="Hallucination Risk" icon={AlertTriangle} color="#dc2626">
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: (hallRisk.risk_score || 0) >= 50 ? '#dc2626' : '#059669' }}>
                      {hallRisk.risk_score || 0}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Risk Score (lower is better)</div>
                    <div style={{ height: 8, background: '#eef0f2', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
                      <div style={{ height: '100%', width: `${hallRisk.risk_score || 0}%`, background: (hallRisk.risk_score || 0) >= 50 ? '#dc2626' : '#059669', borderRadius: 4 }} />
                    </div>
                  </div>
                  {hallRisk.ambiguous_terms?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>AMBIGUOUS TERMS</div>
                      {hallRisk.ambiguous_terms.map((t, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#7f1d1d', padding: '2px 0' }}>· {t}</div>
                      ))}
                    </div>
                  )}
                  {hallRisk.missing_definitions?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#d97706', marginBottom: 4 }}>MISSING DEFINITIONS</div>
                      {hallRisk.missing_definitions.map((d, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#92400e', padding: '2px 0' }}>· {d}</div>
                      ))}
                    </div>
                  )}
                  {hallRisk.unsupported_claims?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>UNSUPPORTED CLAIMS</div>
                      {hallRisk.unsupported_claims.map((c, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#7f1d1d', padding: '2px 0' }}>· {c}</div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title="Why AI Cites (or Doesn't)" icon={MessageSquare} color="#7950f2">
                  {whyCited.cited_reasons?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 4 }}>CITED REASONS</div>
                      {whyCited.cited_reasons.map((r, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#065f46', padding: '3px 0', display: 'flex', gap: 4 }}>
                          <CheckCircle size={10} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} /> {r}
                        </div>
                      ))}
                    </div>
                  )}
                  {whyCited.not_cited_reasons?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>NOT CITED REASONS</div>
                      {whyCited.not_cited_reasons.map((r, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#7f1d1d', padding: '3px 0', display: 'flex', gap: 4 }}>
                          <AlertCircle size={10} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} /> {r}
                        </div>
                      ))}
                    </div>
                  )}
                  {whyCited.platform_specific && (
                    <div style={{ marginTop: 10, padding: 10, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>PLATFORM-SPECIFIC</div>
                      {Object.entries(whyCited.platform_specific).map(([platform, reasons]) => (
                        <div key={platform} style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{platform.replace(/_/g, ' ')}</div>
                          {(Array.isArray(reasons) ? reasons : []).slice(0, 2).map((r, i) => (
                            <div key={i} style={{ fontSize: 10, color: '#475569', paddingLeft: 8 }}>· {r}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {activeTab === 'completeness' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Card title="Content Completeness" icon={CheckCircle} color="#059669">
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <ScoreRing score={completeness.score || 0} size={80} label="COMPLETENESS" />
                  </div>
                  {completeness.items?.length > 0 && completeness.items.map((item, i) => (
                    <div key={i} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.present ? <CheckCircle size={12} color="#059669" /> : <AlertTriangle size={12} color="#dc2626" />}
                      <span style={{ fontSize: 11, flex: 1, color: '#1e293b' }}>{item.name || item.question || `Item ${i + 1}`}</span>
                      {item.count !== undefined && <span style={{ fontSize: 10, color: '#64748b' }}>Count: {item.count}</span>}
                    </div>
                  ))}
                  {completeness.missing?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>MISSING CONTENT</div>
                      {completeness.missing.map((m, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#7f1d1d', padding: '2px 0' }}>· {m}</div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title="AI Answer Quality" icon={Brain} color="#7950f2">
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <ScoreRing score={d.ai_answer_quality?.score || 0} size={80} label="QUALITY" />
                  </div>
                  {d.ai_answer_quality?.strengths?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 4 }}>STRENGTHS</div>
                      {d.ai_answer_quality.strengths.map((s, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#065f46', padding: '2px 0' }}>· {s}</div>
                      ))}
                    </div>
                  )}
                  {d.ai_answer_quality?.weaknesses?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>WEAKNESSES</div>
                      {d.ai_answer_quality.weaknesses.map((w, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#7f1d1d', padding: '2px 0' }}>· {w}</div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {activeTab === 'freshness' && (
              <Card title="Freshness Analysis" icon={Clock} color="#0ea5e9">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{ textAlign: 'center', padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: freshness.has_dates ? '#059669' : '#dc2626' }}>{freshness.has_dates ? 'Yes' : 'No'}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Has Dates</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: freshness.is_fresh ? '#059669' : '#d97706' }}>{freshness.is_fresh ? 'Yes' : 'Aging'}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Fresh Content</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{freshness.score || 0}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Score</div>
                  </div>
                </div>
                {freshness.outdated_references?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>OUTDATED REFERENCES</div>
                    {freshness.outdated_references.map((ref, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#7f1d1d', padding: '2px 0' }}>· {ref}</div>
                    ))}
                  </div>
                )}
                {freshness.recommendations?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>RECOMMENDATIONS</div>
                    {freshness.recommendations.map((rec, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#1e40af', padding: '3px 0', display: 'flex', gap: 4 }}>
                        <ArrowRight size={10} color="#2563eb" style={{ flexShrink: 0, marginTop: 3 }} /> {rec}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'citations' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Card title="Citation Quality" icon={ExternalLink} color="#7950f2">
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <ScoreRing score={citQuality.score || 0} size={80} label="QUALITY" />
                  </div>
                  {citQuality.sources?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>SOURCE TYPES</div>
                      {citQuality.sources.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                          <span style={{ fontSize: 11, flex: 1, color: '#1e293b' }}>{s.type || s.source}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#3b82f6' }}>{s.count || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title="Competitor Comparison" icon={Target} color="#f59e0b">
                  {competitorComp.summary && (
                    <div style={{ padding: 10, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 8, fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                      {competitorComp.summary}
                    </div>
                  )}
                  {competitorComp.your_advantages?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 4 }}>YOUR ADVANTAGES</div>
                      {competitorComp.your_advantages.map((a, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#065f46', padding: '2px 0' }}>+ {a}</div>
                      ))}
                    </div>
                  )}
                  {competitorComp.competitor_advantages?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>COMPETITOR ADVANTAGES</div>
                      {competitorComp.competitor_advantages.map((a, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#7f1d1d', padding: '2px 0' }}>− {a}</div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {activeTab === 'simulator' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Card title="Optimization Simulator" icon={TrendingUp} color="#059669">
                  <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 12px' }}>See predicted score impact of each optimization</p>
                  {simulator.actions?.length > 0 ? simulator.actions.map((action, i) => (
                    <div key={i} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 6, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', flex: 1 }}>{action.action || action.optimization || `Action ${i + 1}`}</span>
                        {action.platform_impact && Object.entries(action.platform_impact).map(([p, impact]) => (
                          <span key={p} style={{ fontSize: 8, padding: '2px 4px', borderRadius: 3, background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>
                            {p.replace(/_/g, ' ').slice(0, 8)} +{impact}
                          </span>
                        ))}
                      </div>
                      {action.impact !== undefined && (
                        <BarMeter value={action.impact} color="#059669" height={4} label="Impact" />
                      )}
                    </div>
                  )) : (
                    <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No optimization actions computed.</div>
                  )}
                </Card>

                <Card title="Prioritized Action Plan" icon={Target} color="#f59e0b">
                  {Array.isArray(plan) && plan.length > 0 ? plan.slice(0, 10).map((step, i) => {
                    const priorityColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb' };
                    const pc = priorityColors[step.priority] || '#64748b';
                    return (
                      <div key={i} style={{ padding: '8px 10px', border: `1px solid ${pc}30`, borderRadius: 6, marginBottom: 4, borderLeft: `3px solid ${pc}`, background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 18, height: 18, borderRadius: 4, background: `${pc}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: pc, flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', flex: 1 }}>{step.action || step.title || step.step}</span>
                          <span style={{ fontSize: 8, padding: '2px 4px', borderRadius: 3, background: `${pc}15`, color: pc, fontWeight: 700 }}>{step.priority || 'MED'}</span>
                        </div>
                        {step.description && <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, paddingLeft: 24 }}>{step.description}</div>}
                      </div>
                    );
                  }) : (
                    <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No optimization plan available.</div>
                  )}
                </Card>
              </div>
            )}

            {activeTab === 'entities' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Card title="Entity Analysis" icon={Eye} color="#059669">
                  {entityAnalysis.entities?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>EXTRACTED ENTITIES ({entityAnalysis.entities.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {entityAnalysis.entities.map((e, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4,
                            background: e.relevance === 'high' ? '#f0fdf4' : '#f8fafc',
                            color: e.relevance === 'high' ? '#059669' : '#64748b',
                            border: `1px solid ${e.relevance === 'high' ? '#bbf7d0' : '#e2e8f0'}`, fontWeight: 500 }}>
                            {e.name} <span style={{ fontSize: 8, color: '#94a3b8' }}>({e.type || '?'})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {entityAnalysis.entity_gaps?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>MISSING ENTITIES</div>
                      {entityAnalysis.entity_gaps.map((g, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#7f1d1d', padding: '2px 0' }}>· {g}</div>
                      ))}
                    </div>
                  )}
                  {entityAnalysis.topic_authority_score !== undefined && (
                    <div style={{ marginTop: 8, textAlign: 'center', padding: 8, background: '#f8fafc', borderRadius: 6 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{entityAnalysis.topic_authority_score}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Topic Authority Score</div>
                    </div>
                  )}
                </Card>

                <Card title="Readiness Checklist" icon={CheckCircle} color="#3b82f6">
                  {d.readiness_checklist?.length > 0 ? d.readiness_checklist.map((item, i) => (
                    <div key={i} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8, background: item.present ? '#f0fdf4' : '#fef2f2' }}>
                      {item.present ? <CheckCircle size={12} color="#059669" /> : <AlertTriangle size={12} color="#dc2626" />}
                      <span style={{ fontSize: 11, flex: 1, color: '#1e293b' }}>{item.name || item.check || item}</span>
                      {item.count !== undefined && <span style={{ fontSize: 10, color: '#64748b' }}>×{item.count}</span>}
                    </div>
                  )) : (
                    <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No checklist data.</div>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
