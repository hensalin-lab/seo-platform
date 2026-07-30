import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import ProtectedAction from '../../../components/ProtectedAction';
import {
  FileText, Edit3, PenTool, RefreshCw,
  Star, BarChart3, BookOpen, Sparkles, Eye, EyeOff, MessageSquare,
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
  const scoreVal = score ?? 0;
  const scoreColor = scoreVal >= 80 ? '#22c55e' : scoreVal >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>{score !== null && score !== undefined ? score : '—'}</div>
        </div>
      </div>
      <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--border)' }}>
        <div style={{ width: `${Math.min(scoreVal, 100)}%`, height: '100%', borderRadius: 3, background: scoreColor, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: scoreVal >= 80 ? 'rgba(34,197,94,0.15)' : scoreVal >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', color: scoreColor }}>
          {scoreVal >= 80 ? 'Good' : scoreVal >= 50 ? 'Needs Work' : 'Poor'}
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
  const qualityScore = qualityData?.quality_score ?? qualityData?.score ?? null;
  const readabilityScore = qualityData?.readability_score ?? contentData?.readability ?? null;
  const seoScore = contentData?.seo_score ?? contentData?.score ?? null;

  const pages = contentData?.pages ?? contentData?.issues ?? [];
  const pageList = Array.isArray(pages) ? pages : [];

  const opps = opportunitiesData?.opportunities ?? opportunitiesData?.keywords_to_add ?? [];
  const oppList = Array.isArray(opps) ? opps : [];

  const quickStats = [
    { label: 'Total Pages', value: pageList.length, color: '#3b82f6' },
    { label: 'Issues Found', value: pageList.filter((p) => p.issues?.length || p.status === 'error').length, color: '#ef4444' },
    { label: 'Opportunities', value: oppList.length, color: '#22c55e' },
    { label: 'Avg Quality', value: qualityScore ?? '—', color: '#f59e0b' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <ScoreCard label="Content Quality" score={qualityScore} color="#22c55e" icon={Star} />
        <ScoreCard label="Readability" score={readabilityScore} color="#0891b2" icon={BookOpen} />
        <ScoreCard label="SEO Score" score={seoScore} color="#3b82f6" icon={BarChart3} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionCard title="Page Content Analysis" icon={FileText} iconColor="#3b82f6" badge={`${pageList.length} pages`} unavailable={!contentData}>
            {contentData ? (
              pageList.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Page</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Issues</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageList.map((p, i) => {
                        const issueCount = p.issues?.length ?? 0;
                        const pageScore = p.score ?? p.quality ?? null;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--bg-secondary)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url || p.page || p.title || `Page ${i + 1}`}</td>
                            <td style={{ padding: '10px 12px' }}>
                              {issueCount > 0 ? (
                                <span style={{ color: issueCount > 5 ? '#ef4444' : '#f59e0b', fontWeight: 500 }}>{issueCount} issues</span>
                              ) : (
                                <span style={{ color: '#22c55e' }}>OK</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {pageScore !== null ? (
                                <span style={{ fontWeight: 600, color: pageScore >= 80 ? '#22c55e' : pageScore >= 50 ? '#f59e0b' : '#ef4444' }}>{pageScore}</span>
                              ) : (
                                <span style={{ color: '#6b7280' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>No page data available.</div>
              )
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
                        <span style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.5, flex: 1 }}>{oppLabel}</span>
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

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    const data = await api.getContentRewrite(id, encodeURIComponent(url.trim())).catch(() => null);
    setResult(data);
    setLoading(false);
  };

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
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, fontSize: 13, color: '#d1d5db', lineHeight: 1.6, maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {result.original || result.original_content || 'No original content available.'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <EyeOff size={14} /> Rewritten
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, fontSize: 13, color: '#d1d5db', lineHeight: 1.6, maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {result.rewritten || result.rewritten_content || result.content || 'No rewritten content available.'}
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
  const [posts, setPosts] = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    const data = await api.getBlogAi(id).catch(() => null);
    setPosts(data);
    setLoading(false);
  };

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
        ) : posts ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(posts.posts ?? posts.articles ?? posts.generated ?? [posts]).map((post, i) => {
              const title = post.title || post.heading || `Blog Post ${i + 1}`;
              const content = post.content || post.body || post.text || '';
              return (
                <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{content}</div>
                </div>
              );
            })}
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
  const pages = revivalData?.pages ?? revivalData?.suggestions ?? revivalData?.items ?? [];
  const pageList = Array.isArray(pages) ? pages : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title="Content Revival" icon={RefreshCw} iconColor="#0891b2" badge={`${pageList.length} pages`} unavailable={!revivalData}>
        {revivalData ? (
          pageList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pageList.map((page, i) => {
                const pageTitle = page.url || page.page || page.title || `Page ${i + 1}`;
                const lastUpdated = page.last_updated ?? page.updated_at ?? page.date ?? null;
                const revivalScore = page.revival_score ?? page.score ?? null;
                const suggestions = page.suggestions ?? page.updates ?? page.suggested_updates ?? [];
                const suggestionList = Array.isArray(suggestions) ? suggestions : typeof suggestions === 'string' ? [suggestions] : [];
                return (
                  <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{pageTitle}</div>
                        {lastUpdated && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last updated: {lastUpdated}</div>
                        )}
                      </div>
                      {revivalScore !== null && (
                        <span style={{
                          fontSize: 14, fontWeight: 700, padding: '4px 12px', borderRadius: 6,
                          background: revivalScore >= 70 ? 'rgba(34,197,94,0.15)' : revivalScore >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          color: revivalScore >= 70 ? '#22c55e' : revivalScore >= 40 ? '#f59e0b' : '#ef4444',
                        }}>
                          {revivalScore}
                        </span>
                      )}
                    </div>
                    {suggestionList.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Suggested updates:</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#d1d5db', lineHeight: 1.6 }}>
                          {suggestionList.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ul>
                      </div>
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
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>No content revival suggestions available.</div>
          )
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
  const [blogAiData, setBlogAiData] = useState(null);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      const [content, quality, opps, revival, blog] = await Promise.all([
        api.getContentAnalysis(id).catch(() => null),
        api.getContentQuality(id).catch(() => null),
        api.request(`/audit/${id}/content-opportunities`).catch(() => null),
        api.getContentRevival(id).catch(() => null),
        api.getBlogAi(id).catch(() => null),
      ]);
      setContentData(content);
      setQualityData(quality);
      setOpportunitiesData(opps);
      setRevivalData(revival);
      setBlogAiData(blog);
      setLoading(false);
    }
    loadAll();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading Content Studio..." />;
  }

  const allNull = !contentData && !qualityData && !opportunitiesData && !revivalData && !blogAiData;
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