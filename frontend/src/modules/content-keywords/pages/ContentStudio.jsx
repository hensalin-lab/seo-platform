import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import ProtectedAction from '../../../components/ProtectedAction';
import {
  FileText, Edit3, PenTool, RefreshCw,
  Star, BarChart3, BookOpen, Sparkles, Eye, EyeOff, MessageSquare,
  Search, ChevronLeft, ChevronRight, CalendarDays, Link2, Target, AlertTriangle,
  FileJson, FileSearch, Smartphone, Shield, Image as ImageIcon, Languages,
  ArrowRight, Copy, Cpu, Wrench,
} from 'lucide-react';
import PromptTestingLab from '../components/PromptTestingLab';
import { DataSourceBadge } from '../../../components/DataSourceBadge';
import ThemeHero from '../../../components/ai/ThemeHero';
import ThemeStatCard from '../../../components/ai/ThemeStatCard';
import ThemePillTabs from '../../../components/ai/ThemePillTabs';
import { EmptyState, LoadingBlock } from '../../../components/States';

const TABS = [
  { key: 'overview', label: 'Content Overview', icon: BarChart3 },
  { key: 'rewriter', label: 'Rewriter', icon: Edit3 },
  { key: 'blog', label: 'Blog AI', icon: PenTool },
  { key: 'revival', label: 'Revival', icon: RefreshCw },
  { key: 'prompts', label: 'Prompt Lab', icon: MessageSquare },
  { key: 'technical', label: 'Technical SEO', icon: Wrench },
];

function ScoreCard({ label, score, color, icon: Icon }) {
  const hasScore = score !== null && score !== undefined;
  const scoreVal = hasScore ? Math.max(0, Math.min(100, Number(score) || 0)) : 0;
  const scoreColor = hasScore ? (scoreVal >= 80 ? '#22c55e' : scoreVal >= 50 ? '#f59e0b' : '#ef4444') : '#6b7280';
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>{hasScore ? Math.round(scoreVal) : '—'}</div>
        </div>
      </div>
      <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--border)' }}>
        <div style={{ width: `${scoreVal}%`, height: '100%', borderRadius: 3, background: scoreColor, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: hasScore ? (scoreVal >= 80 ? 'rgba(34,197,94,0.15)' : scoreVal >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(107,114,128,0.15)', color: scoreColor }}>
          {hasScore ? (scoreVal >= 80 ? 'Good' : scoreVal >= 50 ? 'Needs Work' : 'Poor') : 'N/A'}
        </span>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconColor, badge, children, unavailable }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {Icon && <Icon size={18} color={iconColor || '#3b82f6'} />}
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h2>
        {badge && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>{badge}</span>}
        {unavailable && (
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 4, background: 'rgba(107,114,128,0.12)', color: 'var(--text-muted)' }}>
            Data unavailable
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function LoadingSpinner({ message }) {
  return <LoadingBlock text={message || 'Loading...'} size={48} style={{ minHeight: 400 }} />;
}

function OverviewTab({ contentData, qualityData, opportunitiesData }) {
  const qualityScore = qualityData?.content_quality_score ?? qualityData?.quality_score ?? qualityData?.score ?? null;
  const readabilityScore = qualityData?.readability_score ?? qualityData?.readability ?? null;
  const seoScore = contentData?.content_score ?? contentData?.seo_score ?? contentData?.score ?? null;

  const rawIssues = contentData?.issues ?? contentData?.pages ?? [];
  const issueRows = Array.isArray(rawIssues) ? rawIssues : [];
  const byPage = new Map();
  for (const p of issueRows) {
    const url = p.page_url || p.url || p.page || 'Unknown page';
    if (!byPage.has(url)) byPage.set(url, { url, issues: [] });
    byPage.get(url).issues.push({
      signal_name: p.signal_name || p.issue || p.title || 'Content issue',
      description: p.description || '',
      fix: p.fix || '',
      impact: p.impact || '',
      severity: p.severity || 'LOW',
    });
  }
  const pageList = [...byPage.values()];
  const totalIssues = pageList.reduce((sum, p) => sum + p.issues.length, 0);

  const typeCount = new Map();
  for (const p of pageList) for (const i of p.issues) typeCount.set(i.signal_name, (typeCount.get(i.signal_name) || 0) + 1);
  const typeSummary = [...typeCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const sevCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const i of issueRows) sevCounts[i.severity] = (sevCounts[i.severity] || 0) + 1;

  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [pageIdx, setPageIdx] = useState(0);
  const PAGE_SIZE = 25;

  const filtered = pageList.filter(p => {
    const urlOk = !search.trim() || p.url.toLowerCase().includes(search.trim().toLowerCase());
    const sevOk = sevFilter === 'ALL' || p.issues.some(i => i.severity === sevFilter);
    return urlOk && sevOk;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(pageIdx, totalPages - 1);
  const rows = filtered.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => { setPageIdx(0); }, [search, sevFilter]);

  const opps = opportunitiesData?.opportunities ?? opportunitiesData?.keywords_to_add ?? [];
  const oppList = Array.isArray(opps) ? opps : [];

  const quickStats = [
    { label: 'Total Pages', value: pageList.length, color: '#3b82f6', icon: FileText },
    { label: 'Issues Found', value: totalIssues, color: '#ef4444', icon: AlertTriangle },
    { label: 'Issue Types', value: typeSummary.length, color: '#f59e0b', icon: Sparkles },
    { label: 'Avg Quality', value: qualityScore ?? '—', color: '#22c55e', icon: Star },
  ];

  const severityColor = (s) => s === 'CRITICAL' ? '#ef4444' : s === 'HIGH' ? '#f59e0b' : s === 'MEDIUM' ? '#3b82f6' : '#6b7280';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <ScoreCard label="Content Quality" score={qualityScore} color="#22c55e" icon={Star} />
        <ScoreCard label="Readability" score={readabilityScore} color="#0891b2" icon={BookOpen} />
        <ScoreCard label="SEO Score" score={seoScore} color="#3b82f6" icon={BarChart3} />
      </div>

      {typeSummary.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {typeSummary.map(([name, count]) => (
            <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ fontWeight: 800, color: '#ef4444' }}>{count}</span>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{name}</span>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionCard title="Page Content Analysis" icon={FileText} iconColor="#3b82f6" badge={`${pageList.length} pages · ${totalIssues} issues`} unavailable={!contentData}>
            {contentData ? (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    <Search size={15} color="var(--text-muted)" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pages..." style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)' }} />
                  </div>
                  <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: 13, color: 'var(--text)' }}>
                    <option value="ALL">All severities</option>
                    <option value="CRITICAL">Critical ({sevCounts.CRITICAL})</option>
                    <option value="HIGH">High ({sevCounts.HIGH})</option>
                    <option value="MEDIUM">Medium ({sevCounts.MEDIUM})</option>
                    <option value="LOW">Low ({sevCounts.LOW})</option>
                  </select>
                </div>
                {rows.length > 0 ? (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Page</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Issues</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>What's Wrong</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>How to Fix</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((p, i) => {
                            const issueCount = p.issues.length;
                            const top = p.issues[0];
                            const more = p.issues.length - 1;
                            const topSev = top.severity;
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid var(--bg-secondary)', verticalAlign: 'top' }}>
                                <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: severityColor(topSev) }} />
                                    <span style={{ fontWeight: 700, color: issueCount > 1 ? '#ef4444' : severityColor(topSev) }}>{issueCount}</span>
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--text)', maxWidth: 320 }}>
                                  <div>{top.signal_name}</div>
                                  {top.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{top.description}</div>}
                                  {top.impact && <div style={{ fontSize: 11, color: severityColor(topSev), marginTop: 2 }}>{top.impact}</div>}
                                  {more > 0 && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>+{more} more issue{more > 1 ? 's' : ''}</div>}
                                </td>
                                <td style={{ padding: '10px 12px', color: '#2563eb', maxWidth: 320 }}>{top.fix || 'No fix suggested'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing {rows.length} of {filtered.length} pages</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => setPageIdx(Math.max(0, cur - 1))}
                          disabled={cur === 0}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', cursor: cur === 0 ? 'not-allowed' : 'pointer', opacity: cur === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>{cur + 1} / {totalPages}</span>
                        <button
                          onClick={() => setPageIdx(Math.min(totalPages - 1, cur + 1))}
                          disabled={cur >= totalPages - 1}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', cursor: cur >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: cur >= totalPages - 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>No pages match the current filter.</div>
                )}
              </>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Content analysis data was not returned from the API.</div>
            )}
          </SectionCard>

          <SectionCard title="Content Opportunities" icon={Sparkles} iconColor="#22c55e" badge={`${oppList.length} found`} unavailable={!opportunitiesData}>
            {opportunitiesData ? (
              oppList.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {oppList.map((opp, i) => {
                    const oppLabel = opp.title || opp.keyword || opp.opportunity || opp.description || opp.label || opp.action || `Opportunity ${i + 1}`;
                    const oppType = opp.priority || opp.type || opp.category || 'fix';
                    const isPriority = oppType === 'HIGH' || oppType === 'MEDIUM' || oppType === 'LOW' || oppType === 'CRITICAL';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 4, background: oppType === 'HIGH' || oppType === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : oppType === 'MEDIUM' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', color: oppType === 'HIGH' || oppType === 'CRITICAL' ? '#ef4444' : oppType === 'MEDIUM' ? '#f59e0b' : '#22c55e', whiteSpace: 'nowrap', marginTop: 1 }}>
                          {oppType}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, flex: 1 }}>
                          {oppLabel}
                          {opp.action && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{opp.action}</span>}
                          {opp.issues?.length > 0 && <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opp.issues.join(', ')}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>No opportunities found.</div>
              )
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Opportunities data was not returned from the API.</div>
            )}
          </SectionCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Quick Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              {quickStats.map((stat, i) => (
                <ThemeStatCard key={i} icon={stat.icon} label={stat.label} value={stat.value} color={stat.color} />
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ProtectedAction requiredRole="VIEWER">
                <button style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <Eye size={14} /> View Issues
                </button>
              </ProtectedAction>
              <ProtectedAction requiredRole="VIEWER">
                <button style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <Sparkles size={14} /> Generate Report
                </button>
              </ProtectedAction>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RewriterTab() {
  const { id } = useParams();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [rewriteReady, setRewriteReady] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setAnalyzeError(null);
    const data = await api.getContentRewriteByUrl(id, url.trim()).catch(err => { setAnalyzeError(err.message || 'Analysis failed — check the URL and try again.'); return null; });
    setResult(data);
    setRewriteReady(false);
    setLoading(false);
  };

  const handleGenerateRewrite = () => {
    if (!result) return;
    setRewriteReady(true);
  };

  const composeRewrite = (ai) => {
    if (!ai) return '';
    const parts = [];
    if (ai.h1_rewrite?.after) parts.push(`## H1\n${ai.h1_rewrite.after}`);
    if (ai.intro_rewrite?.after) parts.push(`## Intro\n${ai.intro_rewrite.after}`);
    if (Array.isArray(ai.rewrite_sections) && ai.rewrite_sections.length) {
      ai.rewrite_sections.forEach((s) => {
        if (s.improved_text) parts.push(`## ${s.section || 'Section'}\n${s.improved_text}`);
      });
    }
    if (Array.isArray(ai.title_suggestions) && ai.title_suggestions.length) {
      parts.push(`## Title Suggestions\n${ai.title_suggestions.map((t) => `- ${t}`).join('\n')}`);
    }
    return parts.join('\n\n');
  };

  const original = result?.current_content || result?.original || result?.original_content || '';
  const rewritten = result?.rewritten || result?.rewritten_content || result?.content || '';
  const composed = composeRewrite(result?.ai_rewrite || {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title="Content Rewriter" icon={Edit3} iconColor="#8b5cf6">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter page URL to analyze..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: loading ? '#374151' : '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600,
              opacity: loading || !url.trim() ? 0.6 : 1,
            }}
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {result ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={14} /> Original
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, fontSize: 13, color: 'var(--text)', lineHeight: 1.6, maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {original || 'No original content available.'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <EyeOff size={14} /> Rewritten
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, fontSize: 13, color: 'var(--text)', lineHeight: 1.6, maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {rewriteReady && composed ? composed : rewritten ? rewritten : !rewriteReady ? 'Click "Generate Rewrite" to create an AI-optimized version of this content.' : 'No rewritten content available.'}
              </div>
            </div>
          </div>
        ) : (
          !loading && (
            <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              Enter a URL and click Analyze to see the original vs rewritten content.
            </div>
          )
        )}
        {loading && <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Analyzing content...</div>}
        {!loading && analyzeError && (
          <div style={{ fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 12px' }}>
            {analyzeError}
          </div>
        )}
      </SectionCard>

      <ProtectedAction requiredRole="VIEWER">
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Sparkles size={18} color="#8b5cf6" />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Generate Rewrite</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
            Automatically rewrite the analyzed content with AI-optimized improvements.
          </p>
          <button
            onClick={handleGenerateRewrite}
            disabled={!result}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: result ? 'pointer' : 'not-allowed',
              background: result ? '#8b5cf6' : '#374151', color: '#fff', fontSize: 13, fontWeight: 600,
              opacity: result ? 1 : 0.5,
            }}
          >
            Generate Rewrite
          </button>
        </div>
      </ProtectedAction>
    </div>
  );
}

function BlogAiTab() {
  const { id } = useParams();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await Promise.race([
        api.getBlogAi(id),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timed out after 45s. Try again in a moment.')), 45000)
        ),
      ]);
      setData(res);
    } catch (e) {
      setError(e?.message || 'Failed to generate blog post');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const allIdeas = Array.isArray(data?.blog_ideas) ? data.blog_ideas : [];
  const hasTopic = !!topic.trim();
  const matched = hasTopic ? allIdeas.filter((idea) => {
    const t = topic.trim().toLowerCase();
    const hay = `${idea.title || ''} ${idea.primary_keyword || ''} ${(idea.related_keywords || []).join(' ')}`.toLowerCase();
    return hay.includes(t) || t.split(/\s+/).some((w) => w.length > 2 && hay.includes(w));
  }) : allIdeas;
  const ideas = hasTopic && matched.length ? matched : allIdeas;

  const summary = data?.summary || {};
  const summaryCards = [
    { label: 'Blog Ideas', value: summary.total_blog_ideas ?? allIdeas.length, color: '#f59e0b', icon: PenTool },
    { label: 'Calendar Items', value: summary.content_calendar_items ?? data?.content_calendar?.length ?? 0, color: '#0891b2', icon: CalendarDays },
    { label: 'Internal Linking', value: summary.internal_linking_opportunities ?? data?.internal_linking?.length ?? 0, color: '#22c55e', icon: Link2 },
    { label: 'Featured Snippets', value: summary.featured_snippet_targets ?? data?.featured_snippets?.length ?? 0, color: '#8b5cf6', icon: Target },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title="AI Blog Post Generator" icon={PenTool} iconColor="#f59e0b">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a blog topic..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: 13, outline: 'none',
            }}
          />
          <ProtectedAction requiredRole="VIEWER">
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#374151' : '#f59e0b', color: '#111827', fontSize: 13, fontWeight: 600,
                opacity: loading || !topic.trim() ? 0.6 : 1,
              }}
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </ProtectedAction>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Generating blog post...</div>
        ) : error ? (
          <div style={{ padding: 14, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, color: '#ef4444', lineHeight: 1.6 }}>
            {error}
          </div>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              {summaryCards.map((s) => (
                <ThemeStatCard key={s.label} icon={s.icon} label={s.label} value={s.value} color={s.color} />
              ))}
            </div>

            {hasTopic && !matched.length && (
              <div style={{ padding: 14, borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#f59e0b' }}>
                No blog ideas matched "{topic.trim()}" — showing all generated ideas.
              </div>
            )}

            {ideas.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ideas.map((idea) => {
                  const priorityColor = idea.priority === 'HIGH' ? '#ef4444' : idea.priority === 'MEDIUM' ? '#f59e0b' : '#22c55e';
                  return (
                    <div key={idea.id ?? idea.title} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{idea.title}</div>
                        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 6, background: `${priorityColor}22`, color: priorityColor }}>
                          {idea.priority || 'MEDIUM'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{idea.type || 'GUIDE'}</span>
                        {idea.primary_keyword && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>#{idea.primary_keyword}</span>}
                        {idea.target_words && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'rgba(8,145,178,0.12)', color: '#0891b2' }}>{idea.target_words} words</span>}
                        {idea.estimated_traffic_potential && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>{idea.estimated_traffic_potential} traffic</span>}
                      </div>
                      {Array.isArray(idea.related_keywords) && idea.related_keywords.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {idea.related_keywords.map((kw, j) => (
                            <span key={j} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 5, background: 'var(--border)', opacity: 0.8 }}>{kw}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                No blog ideas generated for this audit.
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
            Enter a topic and click Generate to create AI-powered blog content.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function RevivalTab({ revivalData }) {
  const categories = [
    { key: 'thin_content', label: 'Thin Content', color: '#f59e0b' },
    { key: 'outdated_content', label: 'Outdated', color: '#ef4444' },
    { key: 'orphan_pages', label: 'Orphan', color: '#8b5cf6' },
  ];
  const all = [];
  if (revivalData) {
    categories.forEach((cat) => {
      const items = revivalData[cat.key];
      if (Array.isArray(items)) {
        items.forEach((item) => all.push({ ...item, _category: cat.label, _color: cat.color }));
      }
    });
  }
  const freshness = revivalData?.freshness_score ?? null;
  const summaryCounts = revivalData?.summary || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title="Content Revival" icon={RefreshCw} iconColor="#0891b2" badge={`${all.length} pages`} unavailable={!revivalData}>
        {revivalData ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: freshness !== null && freshness >= 70 ? '#22c55e' : freshness !== null && freshness >= 40 ? '#f59e0b' : '#ef4444' }}>
                {freshness !== null ? Math.round(freshness) : '—'}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content Freshness Score</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{summaryCounts.thin_content_count ?? 0} thin, {summaryCounts.outdated_content_count ?? 0} outdated, {summaryCounts.orphan_pages_count ?? 0} orphan pages</div>
              </div>
            </div>
            {all.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {all.map((page, i) => (
                  <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{page.title || page.url || `Page ${i + 1}`}</div>
                        {page.url && <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{page.url}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 6, background: `${page._color}22`, color: page._color }}>{page._category}</span>
                        {page.severity && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 5, background: page.severity === 'HIGH' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: page.severity === 'HIGH' ? '#ef4444' : '#f59e0b' }}>{page.severity}</span>
                        )}
                      </div>
                    </div>
                    {page.word_count ? <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{page.word_count} words</div> : null}
                    {page.reason && <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 4 }}>{page.reason}</div>}
                    {page.suggestion && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>{page.suggestion}</div>
                    )}
                    <ProtectedAction requiredRole="VIEWER">
                      <button style={{
                        padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'transparent', color: '#0891b2', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}>
                        <RefreshCw size={12} /> Mark for Update
                      </button>
                    </ProtectedAction>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>No content revival suggestions available.</div>
            )}
          </>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Revival data was not returned from the API.</div>
        )}
      </SectionCard>
    </div>
  );
}

function TechSection({ title, icon, iconColor, badge, children, empty }) {
  return (
    <SectionCard title={title} icon={icon} iconColor={iconColor} badge={badge} unavailable={empty && !badge}>
      {empty && !badge ? (
        <div style={{ padding: 18, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>No data returned for this section.</div>
      ) : children}
    </SectionCard>
  );
}

function SummaryBar({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 8 }}>
      {items.map((s, i) => (
        <ThemeStatCard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
      ))}
    </div>
  );
}

function TechnicalTab({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('status');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getAuditPages(id, { limit: 100 }).catch(() => ({ items: [] })),
      api.getHreflang(id).catch(() => null),
      api.getRedirects(id).catch(() => null),
      api.getDuplicates(id).catch(() => null),
      api.getJsDependency(id).catch(() => null),
    ]).then(([pagesRes, hreflang, redirects, duplicates, js]) => {
      setData({ pages: pagesRes?.items || [], hreflang, redirects, duplicates, js });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, retry]);

  if (loading) return <LoadingBlock text="Loading technical signals..." size={48} style={{ minHeight: 360 }} />;
  if (!data || !data.pages.length) {
    return (
      <div>
        <SummaryBar items={[
          { icon: FileSearch, label: 'Pages', value: 0, color: '#3b82f6' },
          { icon: FileJson, label: 'Schemas', value: 0, color: '#8b5cf6' },
          { icon: Smartphone, label: 'Mobile Issues', value: 0, color: '#0891b2' },
          { icon: Shield, label: 'Security Fails', value: 0, color: '#ef4444' },
        ]} />
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
          No crawled pages are available to derive technical signals. Run a full audit first.
        </div>
      </div>
    );
  }

  const pages = data.pages;
  const withSchema = pages.filter(p => (p.schema_markup || []).length > 0).length;
  const schemaTypes = new Map();
  pages.forEach(p => (p.schema_markup || []).forEach(s => {
    const t = typeof s === 'string' ? s : s?.type || s?.['@type'] || s?.name || '';
    if (t) schemaTypes.set(t, (schemaTypes.get(t) || 0) + 1);
  }));

  const mobileRow = (p) => {
    const viewport = /<meta[^>]+name=["']viewport["']/i.test(p.html_raw || '');
    const ml = /(href|src|content)=["'][^"']*\.png["']/i.test(p.html_raw || '');
    const fs = /font-size\s*:\s*(\d+(?:\.\d+)?)px/i.test(p.html_raw || '');
    const fsize = fs ? Number(RegExp.$1) : null;
    const issues = [];
    if (!viewport && (p.is_indexable !== false)) issues.push('No responsive viewport meta');
    if (ml) issues.push('Uses static PNG content');
    if (fsize != null && fsize < 12) issues.push(`Font size ${fsize}px is small`);
    return issues;
  };
  const mobileIssues = pages.map(p => ({ url: p.url, issues: mobileRow(p) })).filter(r => r.issues.length > 0);

  const secRow = (p) => {
    const html = p.html_raw || '';
    const issues = [];
    if (/(http:\/\/|http:\/\/www\.)/i.test(p.url || '') && !/https:\/\//i.test(p.url || '')) issues.push('Served over HTTP');
    if (/[a-z]+@[a-z0-9.-]+/i.test(html) && !/href=["']mailto:/i.test(html)) issues.push('Exposed email address');
    if (/(window\.exception\s*=|console\.error|describe\(['"]test|\.tox|vanity\.r1\.uni)/i.test(html)) issues.push('Suspicious script patterns');
    if (p.response_time_ms && p.response_time_ms > 4000) issues.push(`Slow response (${p.response_time_ms}ms)`);
    if (!/(set-cookie|_ga|csrf|httponly|secur)/i.test(html) && issues.length === 0) issues.push('No obvious HTTPS/cookie security headers');
    return issues;
  };
  const secIssues = pages.map(p => ({ url: p.url, issues: secRow(p) })).filter(r => r.issues.length > 0);

  const imgStats = pages.reduce((acc, p) => {
    const imgs = p.images || [];
    acc.total += imgs.length;
    imgs.forEach(img => {
      const src = typeof img === 'string' ? img : img?.src || img?.url || '';
      if (!src) acc.emptySrc += 1;
      else if (/\.png$/i.test(src)) acc.png += 1;
      else if (/\.svg$/i.test(src)) acc.svg += 1;
      if (typeof img === 'object') {
        if (!img.alt) acc.missingAlt += 1;
        else if (img.alt === img.title) acc.altEqualsTitle += 1;
      }
    });
    return acc;
  }, { total: 0, png: 0, svg: 0, emptySrc: 0, missingAlt: 0, altEqualsTitle: 0 });
  const imgIssues = [];
  if (imgStats.emptySrc) imgIssues.push(`Create descriptive alt text for ${imgStats.emptySrc} image(s) with no source.`);
  if (imgStats.missingAlt) imgIssues.push(`Add keyword-relevant alt text to ${imgStats.missingAlt} image(s).`);
  if (imgStats.altEqualsTitle) imgIssues.push(`Avoid ${imgStats.altEqualsTitle} alt text(s) that duplicate the image title.`);
  if (imgStats.png > 0) imgIssues.push(`Convert ${imgStats.png} PNG(s) to WebP/AVIF to reduce payload.`);
  if (imgStats.svg > 0) imgIssues.push(`${imgStats.svg} SVG(s) — inline or minify for better page weight.`);

  const topUrls = pages.slice(0, 25).map(p => p.url);
  const robotsStatus = topUrls.some(u => /robots\.txt/i.test(u))
    ? 'Found'
    : pages.filter(p => /\/robots\.txt/i.test(p.url || '')).length > 0
    ? 'Found'
    : 'Not discovered in crawled pages';
  const sitemapStatus = topUrls.some(u => /sitemap\.xml/i.test(u))
    ? 'Found'
    : pages.filter(p => /sitemap\.xml/i.test(p.url || '')).length > 0
    ? 'Found'
    : 'Not discovered in crawled pages';
  const hasCanonical = pages.filter(p => p.canonical).length;
  const noCanonical = pages.filter(p => !p.canonical).length;

  const hreflang = data.hreflang;
  const redirects = data.redirects;
  const duplicates = data.duplicates;
  const js = data.js;

  const securityScore = secIssues.length === 0 ? 15 : Math.max(5, 15 - secIssues.length);
  const mobileScore = mobileIssues.length === 0 ? 15 : Math.max(5, 15 - mobileIssues.length);
  const schemaScore = pages.length ? Math.round((withSchema / pages.length) * 15) : 0;
  const imageScore = Math.max(5, 15 - imgIssues.length);
  const dupScore = duplicates?.total_groups ? Math.max(5, 15 - duplicates.total_groups * 2) : 15;
  const rdirScore = redirects?.chains ? Math.max(5, 15 - redirects.chains * 2) : 15;
  const hreflangScore = hreflang?.coverage != null ? Math.round((hreflang.coverage / 100) * 10) : hreflang?.has_hreflang ? 8 : 3;
  const robotsScore = /found/i.test(robotsStatus) ? 3 : 1;

  const sections = [
    {
      key: 'schema', icon: FileJson, color: '#8b5cf6', title: 'Schema Markup', score: schemaScore, max: 15,
      rows: [{ label: 'Pages with schema', value: `${withSchema} / ${pages.length}` },
             { label: 'Unique schema types', value: schemaTypes.size },
             { label: 'No canonical', value: noCanonical }],
      badge: `${schemaTypes.size} types`, empty: withSchema === 0,
      body: schemaTypes.size > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[...schemaTypes.entries()].map(([t, c]) => (
            <span key={t} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>{t} ×{c}</span>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
          No structured data detected. Add JSON-LD (Product, Article, FAQPage, etc.) to earn rich results and AI citation signals.
        </div>
      ),
    },
    {
      key: 'sitemap', icon: FileSearch, color: '#3b82f6', title: 'Sitemap & Robots', score: robotsScore + (sitemapStatus ? 3 : 0), max: 6,
      rows: [{ label: 'robots.txt', value: robotsStatus }, { label: 'sitemap.xml', value: sitemapStatus }],
      badge: `${hasCanonical} canonical`, empty: false,
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: /found/i.test(robotsStatus) ? '#22c55e' : '#f59e0b' }} />
            robots.txt — {robotsStatus}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: /found/i.test(sitemapStatus) ? '#22c55e' : '#f59e0b' }} />
            sitemap.xml — {sitemapStatus}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{hasCanonical} of {pages.length} pages declare a canonical URL{noCanonical > 0 ? `; ${noCanonical} do not — caonicalize them to avoid duplicate-signal dilution.` : '.'}</div>
        </div>
      ),
    },
    {
      key: 'mobile', icon: Smartphone, color: '#0891b2', title: 'Mobile SEO', score: mobileScore, max: 15,
      rows: [{ label: 'Pages with issues', value: mobileIssues.length }],
      badge: `${mobileIssues.length} issues`, empty: mobileIssues.length === 0,
      body: mobileIssues.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {mobileIssues.map((r, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>• {r.url}</span>
              {r.issues.map((m, j) => <div key={j} style={{ color: '#6b7280', paddingLeft: 14 }}>{m}</div>)}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#22c55e', lineHeight: 1.6 }}>All crawled pages include a responsive viewport and reasonable font sizes.</div>
      ),
    },
    {
      key: 'security', icon: Shield, color: '#ef4444', title: 'Security Headers', score: securityScore, max: 15,
      rows: [{ label: 'Pages with issues', value: secIssues.length }],
      badge: `${secIssues.length} issues`, empty: secIssues.length === 0,
      body: secIssues.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {secIssues.map((r, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>• {r.url}</span>
              {r.issues.map((m, j) => <div key={j} style={{ color: '#6b7280', paddingLeft: 14 }}>{m}</div>)}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#22c55e', lineHeight: 1.6 }}>No obvious security header issues detected on crawled pages.</div>
      ),
    },
    {
      key: 'images', icon: ImageIcon, color: '#22c55e', title: 'Image SEO', score: imageScore, max: 15,
      rows: [{ label: 'Total images', value: imgStats.total }, { label: 'PNG', value: imgStats.png }, { label: 'Missing alt', value: imgStats.missingAlt }],
      badge: `${imgIssues.length} suggestions`, empty: imgIssues.length === 0,
      body: imgIssues.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {imgIssues.map((m, i) => <div key={i} style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}><span style={{ color: '#d97706', fontWeight: 700 }}>•</span> {m}</div>)}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#22c55e', lineHeight: 1.6 }}>Images look well optimized (formats and alt text).</div>
      ),
    },
    {
      key: 'hreflang', icon: Languages, color: '#f97316', title: 'Hreflang & i18n', score: hreflangScore, max: 10,
      rows: [{ label: 'Coverage', value: hreflang?.coverage != null ? `${hreflang.coverage}%` : '0%' },
             { label: 'Issues', value: hreflang?.issue_counts?.total ?? (hreflang?.issues?.length ?? 0) }],
      badge: hreflang?.has_hreflang ? 'Active' : 'None', empty: !hreflang?.has_hreflang,
      body: hreflang?.has_hreflang ? (
        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
          {hreflang.coverage}% of pages declare hreflang.{hreflang.issue_counts?.total ? ` ${hreflang.issue_counts.total} issue(s) to review.` : ''}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
          No hreflang tags found on crawled pages. If the site targets multiple locales, add hreflang link tags to serve the correct language version per region.
        </div>
      ),
    },
    {
      key: 'redirects', icon: ArrowRight, color: '#3b82f6', title: 'Redirects', score: rdirScore, max: 15,
      rows: [{ label: 'Total redirects', value: redirects?.total_redirects ?? 0 },
             { label: 'Chains', value: redirects?.chains ?? 0 },
             { label: 'HTTP→HTTPS', value: redirects?.http_to_https ?? 0 }],
      badge: `${redirects?.chains ?? 0} chains`, empty: (redirects?.total_redirects ?? 0) === 0,
      body: redirects?.records?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {redirects.records.slice(0, 40).map((r, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#ef4444', fontWeight: 700 }}>{r.status_code}</span>{' '}
              {r.url} <span style={{ color: '#64748b' }}>→</span> {r.final_url || '—'}
              {r.is_chain ? <span style={{ color: '#f59e0b' }}> (chain ×{r.chain_length})</span> : null}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#22c55e', lineHeight: 1.6 }}>No redirect chains or broken redirects detected.</div>
      ),
    },
    {
      key: 'duplicates', icon: Copy, color: '#f97316', title: 'Duplicate Content', score: dupScore, max: 15,
      rows: [{ label: 'Groups', value: duplicates?.total_groups ?? 0 },
             { label: 'Affected pages', value: duplicates?.duplicate_pages ?? 0 }],
      badge: `${duplicates?.total_groups ?? 0} groups`, empty: (duplicates?.total_groups ?? 0) === 0,
      body: duplicates?.groups?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
          {duplicates.groups.slice(0, 20).map((g, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700 }}>{g.kind === 'content' ? 'Content' : 'Title'}</span> — {g.title || '(untitled)'} ({g.count} pages)
              {g.urls?.slice(0, 3).map((u, j) => <div key={j} style={{ color: '#6b7280', paddingLeft: 12 }}>{u}</div>)}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#22c55e', lineHeight: 1.6 }}>No near-duplicate content or repeated titles detected.</div>
      ),
    },
    {
      key: 'js', icon: Cpu, color: '#8b5cf6', title: 'JavaScript Dependency', score: 0, max: 10,
      rows: [{ label: 'Pages with JS-dependent content', value: js?.js_dependent_pages ?? (js?.pages?.length ?? 0) }],
      badge: `${js?.js_dependent_pages ?? 0} pages`, empty: (js?.js_dependent_pages ?? 0) === 0,
      body: js?.pages?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {js.pages.slice(0, 40).map((p, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>
              • {p.url || p}
              {typeof p === 'object' && p.dependencies?.length > 0 && (
                <div style={{ color: '#6b7280', paddingLeft: 12 }}>{p.dependencies.map(d => typeof d === 'object' ? d.text || d.name : d).join(' · ')}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>No JS-dependent content signals detected.</div>
      ),
    },
  ];

  const filteredSections = sections.filter(s => filter === 'ALL' || s.key === filter);
  const sortedSections = [...filteredSections].sort((a, b) => {
    if (sortBy === 'score') return (b.score / b.max) - (a.score / a.max);
    return a.title.localeCompare(b.title);
  });

  const totalMax = sections.reduce((sum, s) => sum + s.max, 0);
  const totalScore = sections.reduce((sum, s) => sum + s.score, 0);
  const overall = Math.round((totalScore / totalMax) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SummaryBar items={[
        { icon: FileSearch, label: 'Pages', value: pages.length, color: '#3b82f6' },
        { icon: FileJson, label: 'Schemas', value: withSchema, color: '#8b5cf6' },
        { icon: Smartphone, label: 'Mobile Issues', value: mobileIssues.length, color: '#0891b2' },
        { icon: Shield, label: 'Security Fails', value: secIssues.length, color: '#ef4444' },
        { icon: Languages, label: 'Hreflang', value: hreflang?.has_hreflang ? `${hreflang.coverage ?? 0}%` : '0%', color: '#f97316' },
        { icon: Copy, label: 'Duplicate Groups', value: duplicates?.total_groups ?? 0, color: '#f97316' },
      ]} />

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: overall >= 80 ? '#22c55e' : overall >= 50 ? '#f59e0b' : '#ef4444' }}>{overall}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span></div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Technical SEO composite across {sections.length} categories</div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: 12, color: 'var(--text)' }}>
          <option value="ALL">All sections</option>
          {sections.map(s => <option key={s.key} value={s.key}>{s.title}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: 12, color: 'var(--text)' }}>
          <option value="status">By name</option>
          <option value="score">By health (worst first)</option>
        </select>
        <button onClick={() => setRetry(r => r + 1)} disabled={loading} style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={12} className={loading ? 'spin' : ''} /> Reload
        </button>
      </div>

      {sortedSections.map(s => (
        <TechSection key={s.key} title={s.title} icon={s.icon} iconColor={s.color} badge={s.badge || `${Math.round((s.score / s.max) * 100)}%`} empty={s.empty}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)' }}>
              <div style={{ width: `${Math.round((s.score / s.max) * 100)}%`, height: '100%', borderRadius: 3, background: (s.score / s.max) >= 0.8 ? '#22c55e' : (s.score / s.max) >= 0.5 ? '#f59e0b' : '#ef4444' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: (s.score / s.max) >= 0.8 ? '#22c55e' : (s.score / s.max) >= 0.5 ? '#f59e0b' : '#ef4444' }}>{Math.round((s.score / s.max) * 100)}%</span>
          </div>
          {s.rows.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
              {s.rows.filter(r => r.value != null && r.value !== '').map((r, i) => (
                <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{r.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{r.label}</div>
                </div>
              ))}
            </div>
          )}
          {s.body}
        </TechSection>
      ))}
    </div>
  );
}

export default function ContentStudio() {
  const { id } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [contentData, setContentData] = useState(null);
  const [qualityData, setQualityData] = useState(null);
  const [opportunitiesData, setOpportunitiesData] = useState(null);
  const [revivalData, setRevivalData] = useState(null);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      const [content, quality, opps, revival] = await Promise.all([
        api.getContentAnalysis(id).catch(() => null),
        api.getContentQuality(id).catch(() => null),
        api.request(`/audit/${id}/content-opportunities`).catch(() => null),
        api.getContentRevival(id).catch(() => null),
      ]);
      setContentData(content);
      setQualityData(quality);
      setOpportunitiesData(opps);
      setRevivalData(revival);
      setLoading(false);
    }
    loadAll();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading Content Studio..." />;
  }

  const allNull = !contentData && !qualityData && !opportunitiesData && !revivalData;
  if (allNull) {
    return (
      <EmptyState icon={FileText} title="No content data yet" description="Run a full audit to see content analysis, quality and opportunities." />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, background: 'var(--bg-white)', minHeight: '100%', padding: 24, color: 'var(--text)' }}>
      <ThemeHero
        icon={FileText}
        title="Content Studio"
        subtitle="Content Analysis, Rewriting, Blog AI & Revival"
        badges={[
          { icon: BarChart3, t: 'Quality scores' },
          { icon: Edit3, t: 'AI rewriting' },
          { icon: PenTool, t: 'Blog generation' },
        ]}
      />
      <DataSourceBadge source="ai-generated" size="xs" />

      <ThemePillTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <OverviewTab contentData={contentData} qualityData={qualityData} opportunitiesData={opportunitiesData} />
      )}
      {activeTab === 'rewriter' && <RewriterTab />}
      {activeTab === 'blog' && <BlogAiTab />}
      {activeTab === 'revival' && <RevivalTab revivalData={revivalData} />}
      {activeTab === 'prompts' && <PromptTestingLab />}
      {activeTab === 'technical' && <TechnicalTab id={id} />}
    </div>
  );
}