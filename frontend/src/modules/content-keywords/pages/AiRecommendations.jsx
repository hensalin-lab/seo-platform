import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Brain, Target, BarChart3, ChevronDown, CheckCircle, AlertTriangle, Lightbulb, TrendingUp, Shield, Globe, Search, Zap } from 'lucide-react';
import ThemeHero from '../../../components/ai/ThemeHero';
import ThemeStatCard from '../../../components/ai/ThemeStatCard';
import ThemePillTabs from '../../../components/ai/ThemePillTabs';
import ScoreRing from '../../../components/ScoreRing';

function IssueCard({ issue, index }) {
  const [expanded, setExpanded] = useState(index < 5);
  const sevColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb' };
  const sevColor = sevColors[issue.severity] || '#64748b';
  return (
    <div style={{ border: `1px solid ${sevColor}25`, borderRadius: 10, marginBottom: 8, background: 'var(--bg-white)', borderLeft: `3px solid ${sevColor}` }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: sevColor, minWidth: 20 }}>{index + 1}.</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{issue.title || issue.signal_name || issue.description}</span>
        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: `${sevColor}12`, color: sevColor, fontWeight: 700 }}>{issue.severity}</span>
        <ChevronDown size={12} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {issue.what_wrong && <div style={{ padding: '8px 10px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca', marginBottom: 6, fontSize: 12, color: '#7f1d1d', lineHeight: 1.5 }}><strong>What is wrong:</strong> {issue.what_wrong}</div>}
          {issue.why_it_matters && <div style={{ padding: '8px 10px', background: '#fef3c7', borderRadius: 6, border: '1px solid #fde68a', marginBottom: 6, fontSize: 12, color: '#78350f', lineHeight: 1.5 }}><strong>Why it matters:</strong> {issue.why_it_matters}</div>}
          {issue.how_to_fix && <div style={{ padding: '8px 10px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', fontSize: 12, color: '#065f46', lineHeight: 1.5 }}><strong>How to fix:</strong> {issue.how_to_fix}</div>}
          {issue.affected_pages?.length > 0 && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>Affects {issue.affected_pages.length} page(s)</div>}
        </div>
      )}
    </div>
  );
}

export default function AiRecommendations() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mega, setMega] = useState(null);
  const [globalData, setGlobalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('site-wide');
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getAuditPages(id, { limit: 100 }).then(d => { if (!cancelled) setPages(d.items || []); }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    api.getAllPagesMega(id).then(d => { if (!cancelled) setGlobalData(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    setPageLoading(true);
    api.getMegaAnalysis(id, selectedIdx).then(d => { setMega(d); setPageLoading(false); }).catch(() => setPageLoading(false));
  }, [id, selectedIdx, pages.length]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /><p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Loading pages...</p></div>;

  const topFixes = globalData?.prioritized_fixes || [];
  const catScores = globalData?.category_scores || {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <ThemeHero
            icon={Brain}
            title="AI SEO Recommendations"
            subtitle={`Data-driven recommendations from ${globalData?.total_signals || 0} signals across ${globalData?.total_pages || 0} pages`}
            badges={[
              { icon: Zap, t: 'Impact scored' },
              { icon: CheckCircle, t: 'Priority ranked' },
              { icon: Globe, t: 'Site-wide + per page' },
            ]}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <ThemePillTabs
            tabs={[
              { key: 'site-wide', label: 'Site-Wide', count: topFixes.length },
              { key: 'page', label: 'Page Analysis' },
              { key: 'priority', label: 'Priority Matrix' },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {activeTab === 'site-wide' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              <ThemeStatCard icon={AlertTriangle} label="Critical" value={globalData?.critical_count || 0} color="#dc2626" />
              <ThemeStatCard icon={TrendingUp} label="High" value={globalData?.high_count || 0} color="#ea580c" />
              <ThemeStatCard icon={BarChart3} label="Total Issues" value={globalData?.total_issues || 0} color="#d97706" />
              <ThemeStatCard icon={Lightbulb} label="Signals Checked" value={globalData?.total_signals || 0} color="#7c3aed" />
            </div>

            <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Category Scores</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {Object.entries(catScores).sort((a, b) => a[1] - b[1]).map(([cat, score]) => (
                  <div key={cat} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{cat.replace(/_/g, ' ')}</div>
                      <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, marginTop: 4 }}>
                        <div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626', borderRadius: 2 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626' }}>{Math.round(score)}</span>
                  </div>
                ))}
              </div>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>Prioritized Fixes (across all pages)</h3>
            {topFixes.slice(0, 30).map((fix, i) => <IssueCard key={i} issue={fix} index={i} />)}
          </div>
        )}

        {activeTab === 'page' && (
          <div>
            <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: 'var(--bg-white)', cursor: 'pointer', marginBottom: 16 }}>
              {pages.map((p, i) => <option key={i} value={i}>{p.title || p.url} ({p.word_count || 0}w)</option>)}
            </select>
            {pageLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /><p style={{ marginTop: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Analyzing page...</p><p style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>First visit ~45s (cached after)</p></div>
            ) : mega ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <ScoreRing score={mega.overall_score} size={80} label="PAGE SCORE" stroke={6} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{mega.page_title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{mega.word_count} words | {mega.signals_checked} signals | {mega.issues.length} issues</div>
                  </div>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Issues to Fix ({mega.issues.length})</h3>
                {mega.issues.map((issue, i) => <IssueCard key={i} issue={issue} index={i} />)}
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'priority' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>Impact vs Effort Matrix</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { title: 'Quick Wins (High Impact, Low Effort)', color: '#059669', icon: Zap, fixes: topFixes.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').slice(0, 10) },
                { title: 'Major Projects (High Impact, High Effort)', color: '#3b82f6', icon: Target, fixes: topFixes.filter(f => f.severity === 'MEDIUM').slice(0, 10) },
                { title: 'Fill-Ins (Low Impact, Low Effort)', color: '#d97706', icon: BarChart3, fixes: topFixes.filter(f => f.severity === 'LOW').slice(0, 10) },
                { title: 'Thankless Tasks (Low Impact, High Effort)', color: 'var(--text-muted)', icon: Shield, fixes: [] },
              ].map((q, i) => {
                const Icon = q.icon;
                return (
                  <div key={i} style={{ padding: 16, borderRadius: 10, border: `1px solid ${q.color}30`, background: `${q.color}05` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: q.color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} /> {q.title}</div>
                    {q.fixes.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</div> :
                      q.fixes.map((f, j) => (
                        <div key={j} style={{ padding: '4px 0', fontSize: 12, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>{f.signal_name || f.title || f.description}</div>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
