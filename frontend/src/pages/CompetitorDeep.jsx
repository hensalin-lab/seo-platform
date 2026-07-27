import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Users, Target, AlertTriangle, CheckCircle, ChevronDown, Lightbulb, Shield, TrendingUp, BarChart3, Globe, Search } from 'lucide-react';

function ScoreRing({ score, size = 80, stroke = 6, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const offset = c - (pct / 100) * c;
  const color = pct >= 80 ? '#059669' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#d97706' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(pct)}</span>
        {label && <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{label}</span>}
      </div>
    </div>
  );
}

function GapCard({ item, index }) {
  const [expanded, setExpanded] = useState(index < 5);
  const impactColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb' };
  const ic = impactColors[item.impact || item.severity] || '#64748b';

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 8, background: '#fff', borderLeft: `3px solid ${ic}` }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ width: 24, height: 24, borderRadius: 6, background: `${ic}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: ic, flexShrink: 0 }}>{index + 1}</span>
        <span style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block' }}>{item.dimension || item.keyword || item.topic || item.title || `Gap ${index + 1}`}</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.type || item.category || ''}</span>
        </span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${ic}15`, color: ic, fontWeight: 700 }}>{item.impact || item.severity || 'MEDIUM'}</span>
        <ChevronDown size={14} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {item.description && <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginBottom: 10 }}>{item.description}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {item.your_status && <div style={{ padding: 10, background: '#fef3c7', borderRadius: 6, border: '1px solid #fde68a' }}><div style={{ fontSize: 9, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>Your Position</div><div style={{ fontSize: 12, color: '#78350f' }}>{item.your_status}</div></div>}
            {(item.competitor_status || item.benchmark) && <div style={{ padding: 10, background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}><div style={{ fontSize: 9, fontWeight: 700, color: '#166534', marginBottom: 2 }}>Competitor Benchmark</div><div style={{ fontSize: 12, color: '#14532d' }}>{item.competitor_status || item.benchmark}</div></div>}
          </div>
          {(item.action || item.recommendation || item.strategy) && (
            <div style={{ padding: '8px 10px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#166534', marginBottom: 2 }}>Recommended Action</div>
              <div style={{ fontSize: 12, color: '#065f46', lineHeight: 1.5 }}>{item.action || item.recommendation || item.strategy}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompetitorDeep() {
  const { id } = useParams();
  const [reportData, setReportData] = useState(null);
  const [competitor, setCompetitor] = useState(null);
  const [mega, setMega] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    Promise.allSettled([
      api.getReportData(id),
      api.getCompetitorData(id),
      api.getMegaAnalysis(id, 0),
    ]).then(([repRes, compRes, megaRes]) => {
      if (repRes.status === 'fulfilled') setReportData(repRes.value);
      if (compRes.status === 'fulfilled') setCompetitor(compRes.value);
      if (megaRes.status === 'fulfilled') setMega(megaRes.value);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /><p style={{ marginTop: 12, color: '#64748b' }}>Loading competitor data...</p></div>;

  const siteSummary = reportData?.site_summary || {};
  const strengths = competitor?.strengths || [];
  const weaknesses = competitor?.weaknesses || [];
  const winningStrategy = competitor?.winning_strategy || [];
  const keywordOpps = competitor?.keyword_opportunities || [];
  const contentOpps = competitor?.content_opportunities || [];
  const seoComparison = competitor?.seo_comparison || {};
  const backlinkGap = competitor?.backlink_gap || [];
  const serpGap = competitor?.serp_gap || [];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} color="#8b5cf6" /> Competitor Intelligence
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '6px 0 0' }}>Deep analysis of your competitive landscape and gap opportunities</p>
        </div>

        {competitor?.competitor_url && (
          <div style={{ padding: 12, background: '#f5f3ff', borderRadius: 8, border: '1px solid #ddd6fe', marginBottom: 16, fontSize: 13, color: '#5b21b6' }}>
            Analyzing competitor: <strong>{competitor.competitor_url}</strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 4 }}>
          {[
            { key: 'overview', label: 'Overview', icon: Users },
            { key: 'gaps', label: `Gaps & Opportunities (${keywordOpps.length + contentOpps.length})`, icon: Target },
            { key: 'seo', label: 'SEO Comparison', icon: BarChart3 },
            { key: 'strategy', label: 'Winning Strategy', icon: Lightbulb },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: activeTab === t.key ? '#8b5cf6' : 'transparent',
                color: activeTab === t.key ? '#fff' : '#64748b',
              }}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'SEO Score', value: siteSummary.seo_score || 0, color: '#3b82f6' },
                { label: 'Technical', value: siteSummary.technical_score || 0, color: '#059669' },
                { label: 'AEO', value: siteSummary.aeo_score || 0, color: '#8b5cf6' },
                { label: 'GEO', value: siteSummary.geo_score || 0, color: '#d97706' },
                { label: 'AI Visibility', value: siteSummary.ai_visibility_score || 0, color: '#ec4899' },
              ].map((s, i) => (
                <div key={i} style={{ padding: 14, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <ScoreRing score={s.value} size={60} label={s.label} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {strengths.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={15} /> Competitor Strengths</div>
                  {strengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 12, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                      <CheckCircle size={12} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{typeof s === 'string' ? s : s.text || s.description || JSON.stringify(s)}</span>
                    </div>
                  ))}
                </div>
              )}
              {weaknesses.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={15} /> Competitor Weaknesses</div>
                  {weaknesses.map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 12, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                      <Target size={12} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{typeof w === 'string' ? w : w.text || w.description || JSON.stringify(w)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'gaps' && (
          <div>
            {keywordOpps.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>Keyword Opportunities ({keywordOpps.length})</h3>
                {keywordOpps.map((opp, i) => <GapCard key={i} item={{ ...opp, type: 'Keyword Gap' }} index={i} />)}
              </div>
            )}
            {contentOpps.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>Content Opportunities ({contentOpps.length})</h3>
                {contentOpps.map((opp, i) => <GapCard key={i} item={{ ...opp, type: 'Content Gap' }} index={i} />)}
              </div>
            )}
            {backlinkGap.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>Backlink Gaps ({backlinkGap.length})</h3>
                {backlinkGap.map((gap, i) => <GapCard key={i} item={{ ...gap, type: 'Backlink Gap' }} index={i} />)}
              </div>
            )}
            {serpGap.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>SERP Feature Gaps ({serpGap.length})</h3>
                {serpGap.map((gap, i) => <GapCard key={i} item={{ ...gap, type: 'SERP Gap' }} index={i} />)}
              </div>
            )}
            {keywordOpps.length === 0 && contentOpps.length === 0 && backlinkGap.length === 0 && serpGap.length === 0 && (
              <div style={{ padding: 30, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <CheckCircle size={32} color="#059669" />
                <p style={{ marginTop: 8, color: '#059669', fontWeight: 600 }}>No significant gaps found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'seo' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>SEO Comparison</h3>
            {Object.keys(seoComparison).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {Object.entries(seoComparison).map(([key, value]) => (
                  <div key={key} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize', marginBottom: 4 }}>{key.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{typeof value === 'object' ? JSON.stringify(value).slice(0, 80) : String(value)}</div>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: '#64748b', fontSize: 13 }}>No SEO comparison data available</p>}

            {mega && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Your Site's Category Scores</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                  {Object.entries(mega.category_scores).sort((a, b) => a[1] - b[1]).slice(0, 12).map(([cat, score]) => (
                    <div key={cat} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{cat.replace(/_/g, ' ')}</div>
                        <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, marginTop: 3 }}><div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626', borderRadius: 2 }} /></div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626' }}>{Math.round(score)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'strategy' && (
          <div>
            {winningStrategy.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#5b21b6', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}><Lightbulb size={16} /> Winning Strategy Insights</h3>
                {winningStrategy.map((ws, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 8, background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                    <div style={{ fontSize: 12, color: '#5b21b6', lineHeight: 1.6 }}>{typeof ws === 'string' ? ws : ws.text || ws.description || JSON.stringify(ws)}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>How to Beat Competitors</h3>
              {[
                { title: 'Content Gap Attack', desc: 'Identify keywords competitors rank for that you dont. Create comprehensive content targeting those terms with better depth.', num: '1' },
                { title: 'Technical Superiority', desc: 'Ensure faster load times, better Core Web Vitals, and more structured data than competitors.', num: '2' },
                { title: 'Backlink Strategy', desc: 'Study where competitors get their backlinks and pursue the same sources with even better content.', num: '3' },
                { title: 'AI Search Optimization', desc: 'Optimize for Google AI Overviews, ChatGPT, and Perplexity. Structured content gets cited more.', num: '4' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#fafbfc', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#8b5cf615', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#8b5cf6', flexShrink: 0 }}>{item.num}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
