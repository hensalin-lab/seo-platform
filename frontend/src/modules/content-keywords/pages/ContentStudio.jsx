import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import ProtectedAction from '../../../components/ProtectedAction';
import {
  FileText, Edit3, PenTool, RefreshCw,
  Star, BarChart3, BookOpen, Sparkles, Eye, EyeOff, MessageSquare,
  Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import PromptTestingLab from '../components/PromptTestingLab';

const TABS = [
  { key: 'overview', label: 'Content Overview', icon: BarChart3 },
  { key: 'rewriter', label: 'Rewriter', icon: Edit3 },
  { key: 'blog', label: 'Blog AI', icon: PenTool },
  { key: 'revival', label: 'Revival', icon: RefreshCw },
  { key: 'prompts', label: 'Prompt Lab', icon: MessageSquare },
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

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
        border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
        background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
        color: active ? '#3b82f6' : 'var(--text-muted)',
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={16} />
      {tab.label}
    </button>
  );
}

function LoadingSpinner({ message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>{message || 'Loading...'}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
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
    { label: 'Total Pages', value: pageList.length, color: '#3b82f6' },
    { label: 'Issues Found', value: totalIssues, color: '#ef4444' },
    { label: 'Issue Types', value: typeSummary.length, color: '#f59e0b' },
    { label: 'Avg Quality', value: qualityScore ?? '—', color: '#22c55e' },
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
                    const oppLabel = opp.keyword || opp.opportunity || opp.description || opp.label || `Opportunity ${i + 1}`;
                    const oppType = opp.type || opp.category || 'keyword';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 4, background: oppType === 'keyword' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)', color: oppType === 'keyword' ? '#22c55e' : '#3b82f6', whiteSpace: 'nowrap', marginTop: 1 }}>
                          {oppType}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, flex: 1 }}>{oppLabel}</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {quickStats.map((stat, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: stat.color }}>{stat.value}</span>
                </div>
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

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    const data = await api.getContentRewriteByUrl(id, url.trim()).catch(() => null);
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
  const [data, setData] = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    const res = await api.getBlogAi(id).catch(() => null);
    setData(res);
    setLoading(false);
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
    { label: 'Blog Ideas', value: summary.total_blog_ideas ?? allIdeas.length, color: '#f59e0b' },
    { label: 'Calendar Items', value: summary.content_calendar_items ?? data?.content_calendar?.length ?? 0, color: '#0891b2' },
    { label: 'Internal Linking', value: summary.internal_linking_opportunities ?? data?.internal_linking?.length ?? 0, color: '#22c55e' },
    { label: 'Featured Snippets', value: summary.featured_snippet_targets ?? data?.featured_snippets?.length ?? 0, color: '#8b5cf6' },
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
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {summaryCards.map((s) => (
                <div key={s.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <FileText size={40} color="#6b7280" />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>No data available</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Run a full audit to see content analysis.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, background: 'var(--bg-white)', minHeight: '100%', padding: 24, color: 'var(--text)' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <FileText size={28} color="#3b82f6" />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Content Studio</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Content Analysis, Rewriting, Blog AI & Revival</p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map((tab) => (
          <TabButton key={tab.key} tab={tab} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab contentData={contentData} qualityData={qualityData} opportunitiesData={opportunitiesData} />
      )}
      {activeTab === 'rewriter' && <RewriterTab />}
      {activeTab === 'blog' && <BlogAiTab />}
      {activeTab === 'revival' && <RevivalTab revivalData={revivalData} />}
      {activeTab === 'prompts' && <PromptTestingLab />}
    </div>
  );
}