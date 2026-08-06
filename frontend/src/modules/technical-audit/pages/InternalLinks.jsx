import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { Link2, AlertTriangle, CheckCircle, XCircle, BarChart3, ExternalLink, Unlink, ChevronDown, ChevronRight, Lightbulb, Target, Globe, Search, ArrowRight, Layers, Anchor, Network, TrendingUp, Hash } from 'lucide-react';
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip';

function LinkSuggestionCard({ suggestion }) {
  const priColors = { HIGH: '#059669', MEDIUM: '#d97706', LOW: '#64748b' };
  const priBg = { HIGH: '#f0fdf4', MEDIUM: '#fffbeb', LOW: '#f8fafc' };
  const pri = (suggestion.priority || 'MEDIUM');
  return (
    <div style={{ padding: '14px 16px', background: priBg[pri] || '#f8fafc', borderRadius: 8, border: `1px solid ${priColors[pri] || '#e2e8f0'}30`, marginBottom: 8, borderLeft: `3px solid ${priColors[pri] || '#64748b'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Link2 size={13} color={priColors[pri]} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{suggestion.to_title || suggestion.to_page}</span>
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: (priColors[pri] || '#64748b') + '18', color: priColors[pri] || '#64748b', fontWeight: 600 }}>{pri}</span>
      </div>
      <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
        <strong>From:</strong> <span style={{ color: '#3b82f6' }}>{suggestion.from_page}</span>
        <ArrowRight size={11} style={{ margin: '0 4px', verticalAlign: 'middle' }} />
        <strong>To:</strong> <span style={{ color: '#059669' }}>{suggestion.to_page}</span>
      </div>
      {suggestion.reason && <div style={{ fontSize: 11, color: '#059669', padding: '4px 8px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0', marginBottom: 4 }}>{suggestion.reason}</div>}
      {suggestion.placement_hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: 4, border: '1px solid var(--border)' }}>{suggestion.placement_hint}</div>}
      {suggestion.shared_topics && suggestion.shared_topics.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          {suggestion.shared_topics.map((t, i) => (
            <span key={i} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#3b82f618', color: '#3b82f6', fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function PageQualityRow({ ps }) {
  const scoreColor = ps.score >= 70 ? '#059669' : ps.score >= 40 ? '#d97706' : '#dc2626';
  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg-white)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: scoreColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: scoreColor }}>{ps.score}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ps.url}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {ps.internal_links} internal · {ps.external_links} external · {ps.word_count} words · depth {ps.crawl_depth}
          </div>
        </div>
      </div>
      {ps.issues && ps.issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
          {ps.issues.map((issue, i) => (
            <div key={i} style={{ fontSize: 11, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={10} /> {issue}
            </div>
          ))}
        </div>
      )}
      {ps.anchors && ps.anchors.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ps.anchors.map((a, i) => (
            <span key={i} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#f1f5f9', color: '#475569' }}>{a}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function AnchorCard({ anchor, isGeneric }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: isGeneric ? '#fef2f2' : '#f8fafc', borderRadius: 6, border: `1px solid ${isGeneric ? '#fecaca' : '#e2e8f0'}`, marginBottom: 4 }}>
      <Anchor size={12} color={isGeneric ? '#dc2626' : '#3b82f6'} />
      <span style={{ fontSize: 12, fontWeight: 500, color: isGeneric ? '#991b1b' : '#1e293b', flex: 1 }}>"{anchor.text}"</span>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{anchor.target}</span>
      {isGeneric && <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600 }}>Generic</span>}
    </div>
  );
}

function ClusterCard({ cluster }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--bg-white)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Layers size={13} color="#8b5cf6" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Topic: {cluster.topic}</span>
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#8b5cf618', color: '#8b5cf6', fontWeight: 600 }}>{cluster.pages.length} pages</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
        {cluster.shared_keywords.map((kw, i) => (
          <span key={i} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#f1f5f9', color: '#475569' }}>{kw}</span>
        ))}
      </div>
      {cluster.pages.slice(0, 5).map((p, i) => (
        <div key={i} style={{ fontSize: 11, color: '#3b82f6', padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</div>
      ))}
      {cluster.pages.length > 5 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{cluster.pages.length - 5} more</div>}
    </div>
  );
}

function PagerankRow({ pr }) {
  const scoreColor = pr.pagerank_score >= 60 ? '#059669' : pr.pagerank_score >= 30 ? '#d97706' : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: pr.is_orphan ? '#fef2f2' : '#fff', borderRadius: 8, border: `1px solid ${pr.is_orphan ? '#fecaca' : '#e2e8f0'}`, marginBottom: 6 }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: scoreColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: scoreColor, flexShrink: 0 }}>{pr.pagerank_score}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.title || pr.url}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          Inbound: <strong style={{ color: '#059669' }}>{pr.inbound_links}</strong> · Outbound: <strong>{pr.outbound_links}</strong>
          {pr.is_orphan && <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 6 }}>ORPHAN</span>}
        </div>
      </div>
      <div style={{ width: 80 }}>
        <div style={{ height: 4, background: '#e9ecef', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pr.pagerank_score}%`, background: scoreColor, borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

export default function InternalLinks() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('score');
  const [sortDir, setSortDir] = useState('asc');
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    async function loadLinks() {
      try {
        setLoading(true);
        const result = await api.getInternalLinks(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load internal links data');
      } finally {
        setLoading(false);
      }
    }
    loadLinks();
  }, [id]);

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div className="spinner" /><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Analyzing link structure...</p></div></div>;
  if (error) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><XCircle size={40} color="#dc2626" /><p style={{ fontSize: 13, color: '#dc2626', marginTop: 8 }}>{error}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button></div></div>;
  if (!data) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><Link2 size={40} color="#94a3b8" /><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>No internal links data</p></div></div>;

  const totalPages = data.total_pages ?? 0;
  const avgInternal = data.avg_internal_links ?? 0;
  const avgExternal = data.avg_external_links ?? 0;
  const noLinksCount = data.pages_with_no_internal_links ?? 0;
  const orphanCount = data.orphan_pages ?? 0;
  const uniqueTargets = data.unique_internal_targets ?? 0;
  const totalLinks = data.total_internal_links ?? 0;
  const pages = data.pages || [];
  const noLinksUrls = data.no_links_urls || [];
  const orphanUrls = data.orphan_urls || [];
  const linkSuggestions = data.link_suggestions || [];
  const linkImprovements = data.link_improvements || [];
  const pageScores = data.page_scores || [];
  const anchorAnalysis = data.anchor_analysis || {};
  const topicClusters = data.topic_clusters || [];
  const pagerankData = data.pagerank || [];
  const genericAnchors = anchorAnalysis.generic_anchors || [];
  const sampleAnchors = anchorAnalysis.sample_anchors || [];

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedPages = [...pages].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const getDepthColor = (d) => d <= 2 ? '#059669' : d <= 4 ? '#d97706' : '#dc2626';
  const getLinksColor = (c) => c > 5 ? '#059669' : c > 0 ? '#d97706' : '#dc2626';

  const linkHealth = totalPages > 0 ? Math.round(((totalPages - noLinksCount - orphanCount) / totalPages) * 100) : 100;

  const sections = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'suggestions', label: 'Suggestions', icon: Lightbulb, count: linkSuggestions.length },
    { key: 'quality', label: 'Page Quality', icon: Target, count: pageScores.length },
    { key: 'anchors', label: 'Anchors', icon: Anchor, count: anchorAnalysis.total_anchors || 0 },
    { key: 'clusters', label: 'Topic Clusters', icon: Layers, count: topicClusters.length },
    { key: 'pagerank', label: 'PageRank Flow', icon: Network, count: pagerankData.length },
    { key: 'improvements', label: 'Improvements', icon: TrendingUp, count: linkImprovements.length },
    { key: 'nolinks', label: 'No Links', icon: AlertTriangle, count: noLinksCount },
    { key: 'orphans', label: 'Orphan Pages', icon: Unlink, count: orphanCount },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link2 size={24} color="#3b82f6" /> Internal Link Intelligence
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '6px 0 0' }}>Deep analysis of link architecture, anchor text quality, PageRank flow, and topic clusters</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <AiSuggestionStrip auditId={id} tool="internal-links" title="AI internal linking fixes" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Link Health', value: `${linkHealth}%`, color: linkHealth >= 80 ? '#059669' : '#dc2626', bg: linkHealth >= 80 ? '#f0fdf4' : '#fef2f2' },
            { label: 'Total Links', value: totalLinks, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Unique Targets', value: uniqueTargets, color: '#8b5cf6', bg: '#f5f3ff' },
            { label: 'Avg Int. Links', value: avgInternal.toFixed(1), color: '#20c997', bg: '#e6fcf5' },
            { label: 'No Links', value: noLinksCount, color: '#dc2626', bg: '#fef2f2' },
            { label: 'Orphan Pages', value: orphanCount, color: '#dc2626', bg: '#fef2f2' },
          ].map((s, i) => (
            <div key={i} style={{ padding: 14, background: s.bg, borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: '1px solid', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  background: activeSection === s.key ? '#1e293b' : '#fff', color: activeSection === s.key ? '#fff' : '#475569', borderColor: activeSection === s.key ? '#1e293b' : '#e2e8f0', transition: 'all 0.15s ease' }}>
                <Icon size={13} /> {s.label}
                {s.count > 0 && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: activeSection === s.key ? '#ffffff30' : '#f1f5f9' }}>{s.count}</span>}
              </button>
            );
          })}
        </div>

        {activeSection === 'overview' && (
          <div>
            <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>Link Architecture Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 6 }}>What is Working</div>
                  {avgInternal >= 3 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><CheckCircle size={12} color="#059669" style={{ marginTop: 2 }} />Average {avgInternal.toFixed(1)} internal links per page</div>}
                  {linkHealth >= 80 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><CheckCircle size={12} color="#059669" style={{ marginTop: 2 }} />{linkHealth}% link health score</div>}
                  {orphanCount === 0 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><CheckCircle size={12} color="#059669" style={{ marginTop: 2 }} />No orphan pages</div>}
                  {uniqueTargets > 0 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><CheckCircle size={12} color="#059669" style={{ marginTop: 2 }} />{uniqueTargets} unique link targets across site</div>}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>Needs Improvement</div>
                  {noLinksCount > 0 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><AlertTriangle size={12} color="#dc2626" style={{ marginTop: 2 }} />{noLinksCount} pages have no internal links</div>}
                  {orphanCount > 0 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><AlertTriangle size={12} color="#dc2626" style={{ marginTop: 2 }} />{orphanCount} orphan pages with zero inbound links</div>}
                  {avgInternal < 3 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><AlertTriangle size={12} color="#d97706" style={{ marginTop: 2 }} />Average {avgInternal.toFixed(1)} links per page is low</div>}
                  {genericAnchors.length > 0 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><AlertTriangle size={12} color="#d97706" style={{ marginTop: 2 }} />{genericAnchors.length} generic anchor texts detected (click here, read more)</div>}
                </div>
              </div>
            </div>
            {pages.length > 0 && (
              <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>All Pages ({pages.length})</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        {[{ key: 'url', label: 'URL' }, { key: 'internal_links', label: 'Int. Links' }, { key: 'external_links', label: 'Ext. Links' }, { key: 'crawl_depth', label: 'Depth' }, { key: 'word_count', label: 'Words' }].map(col => (
                          <th key={col.key} onClick={() => handleSort(col.key)} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                            {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '^' : 'v') : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPages.map((page, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' }}>{page.title || page.url}</td>
                          <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 4, background: getLinksColor(page.internal_links) + '18', color: getLinksColor(page.internal_links), fontWeight: 600 }}>{page.internal_links}</span></td>
                          <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 4, background: page.external_links > 0 ? '#3b82f618' : '#d9770618', color: page.external_links > 0 ? '#3b82f6' : '#d97706', fontWeight: 600 }}>{page.external_links}</span></td>
                          <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 4, background: getDepthColor(page.crawl_depth) + '18', color: getDepthColor(page.crawl_depth), fontWeight: 600 }}>{page.crawl_depth}</span></td>
                          <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-muted)' }}>{page.word_count || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'suggestions' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lightbulb size={16} color="#d97706" /> Link Suggestions ({linkSuggestions.length})
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>Specific pages to link to, with placement hints and shared topic context</p>
            {linkSuggestions.length > 0 ? (
              linkSuggestions.map((s, i) => <LinkSuggestionCard key={i} suggestion={s} />)
            ) : (
              <div style={{ padding: 24, textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <Lightbulb size={32} color="#d97706" />
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>No specific link suggestions. All pages appear well-connected.</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'quality' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} color="#059669" /> Page Link Quality Scores ({pageScores.length})
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>Per-page link quality based on internal links, external links, depth, anchors, and density</p>
            {pageScores.sort((a, b) => a.score - b.score).map((ps, i) => (
              <PageQualityRow key={i} ps={ps} />
            ))}
          </div>
        )}

        {activeSection === 'anchors' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Anchor size={16} color="#3b82f6" /> Anchor Text Analysis
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 12, background: '#eff6ff', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{anchorAnalysis.total_anchors || 0}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total Anchors</div>
              </div>
              <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{anchorAnalysis.unique_anchors || 0}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Unique Anchors</div>
              </div>
              <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{genericAnchors.length}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Generic Anchors</div>
              </div>
            </div>
            {genericAnchors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>Generic Anchors (should be replaced with descriptive text)</div>
                {genericAnchors.map((a, i) => <AnchorCard key={i} anchor={a} isGeneric={true} />)}
              </div>
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>All Anchor Texts ({sampleAnchors.length})</div>
              {sampleAnchors.slice(0, 40).map((a, i) => (
                <AnchorCard key={i} anchor={a} isGeneric={genericAnchors.some(g => g.text === a.text && g.page === a.page)} />
              ))}
            </div>
          </div>
        )}

        {activeSection === 'clusters' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} color="#8b5cf6" /> Topic Clusters ({topicClusters.length})
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>Pages grouped by shared topic keywords. Use clusters to build internal link silos.</p>
            {topicClusters.length > 0 ? (
              topicClusters.map((c, i) => <ClusterCard key={i} cluster={c} />)
            ) : (
              <div style={{ padding: 24, textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <Layers size={32} color="#8b5cf6" />
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>No topic clusters detected. Pages may not share enough keywords.</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'pagerank' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Network size={16} color="#20c997" /> PageRank Flow Simulation
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>Estimated link equity distribution. Pages with more inbound links from other pages receive higher scores.</p>
            {pagerankData.map((pr, i) => <PagerankRow key={i} pr={pr} />)}
          </div>
        )}

        {activeSection === 'improvements' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="#059669" /> Link Improvements ({linkImprovements.length})
            </h3>
            {linkImprovements.length > 0 ? (
              linkImprovements.map((imp, i) => (
                <div key={i} style={{ padding: '12px 14px', background: imp.impact === 'HIGH' ? '#fef2f2' : '#f8fafc', borderRadius: 8, marginBottom: 8, border: `1px solid ${imp.impact === 'HIGH' ? '#fecaca' : '#e2e8f0'}`, borderLeft: `3px solid ${imp.impact === 'HIGH' ? '#dc2626' : '#d97706'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: imp.impact === 'HIGH' ? '#dc262618' : '#d9770618', color: imp.impact === 'HIGH' ? '#dc2626' : '#d97706', fontWeight: 600 }}>{imp.impact}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{imp.page}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}><strong>Issue:</strong> {imp.issue}</div>
                  <div style={{ fontSize: 12, color: '#059669', marginTop: 2 }}><strong>Fix:</strong> {imp.suggestion}</div>
                </div>
              ))
            ) : (
              <div style={{ padding: 24, textAlign: 'center', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <CheckCircle size={24} color="#059669" />
                <p style={{ fontSize: 13, color: '#059669', marginTop: 6 }}>All links look healthy</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'nolinks' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            {noLinksUrls.length > 0 ? (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="#dc2626" /> Pages with No Internal Links ({noLinksUrls.length})
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>These pages have no internal links pointing to them. Add links from relevant pages.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {noLinksUrls.map((url, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
                      <Unlink size={12} color="#dc2626" />
                      <span style={{ fontSize: 12, color: '#991b1b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 24 }}><CheckCircle size={32} color="#059669" /><p style={{ fontSize: 13, color: '#059669', marginTop: 8 }}>All pages have internal links</p></div>
            )}
          </div>
        )}

        {activeSection === 'orphans' && (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            {orphanUrls.length > 0 ? (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Unlink size={16} color="#dc2626" /> Orphan Pages ({orphanUrls.length})
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>These pages have zero inbound links from any other page. Search engines may not discover them.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {orphanUrls.map((url, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
                      <Unlink size={12} color="#dc2626" />
                      <span style={{ fontSize: 12, color: '#991b1b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                      <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, whiteSpace: 'nowrap' }}>Add from: homepage, related pages</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 24 }}><CheckCircle size={32} color="#059669" /><p style={{ fontSize: 13, color: '#059669', marginTop: 8 }}>No orphan pages</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
