import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Link2, AlertTriangle, CheckCircle, XCircle, BarChart3, ExternalLink, Unlink, ChevronDown, ChevronRight, Lightbulb, Target, Globe, Search, ArrowRight } from 'lucide-react';

function LinkSuggestionCard({ suggestion }) {
  const priColors = { high: '#059669', medium: '#d97706', low: '#64748b' };
  const priBg = { high: '#f0fdf4', medium: '#fffbeb', low: '#f8fafc' };
  const pri = (suggestion.priority || 'medium').toLowerCase();
  return (
    <div style={{ padding: '12px 14px', background: priBg[pri], borderRadius: 8, border: `1px solid ${priColors[pri]}30`, marginBottom: 8, borderLeft: `3px solid ${priColors[pri]}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Link2 size={13} color={priColors[pri]} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{suggestion.anchor_text || suggestion.text}</span>
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: priColors[pri] + '18', color: priColors[pri], fontWeight: 600 }}>{suggestion.priority || 'medium'}</span>
      </div>
      <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
        <strong>From:</strong> {suggestion.source_page || suggestion.from} to <strong>To:</strong> {suggestion.target_page || suggestion.to}
      </div>
      {suggestion.context && <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 4 }}>"{suggestion.context}"</div>}
      {suggestion.why && <div style={{ fontSize: 12, color: '#059669', padding: '4px 8px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0' }}>Why: {suggestion.why}</div>}
    </div>
  );
}

function BacklinkCard({ opportunity }) {
  const diffColors = { easy: '#059669', medium: '#d97706', hard: '#dc2626' };
  const diff = (opportunity.estimated_difficulty || 'medium').toLowerCase();
  return (
    <div style={{ padding: '12px 14px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Globe size={13} color="#3b82f6" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1 }}>{opportunity.topic}</span>
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: diffColors[diff] + '18', color: diffColors[diff], fontWeight: 600 }}>{diff}</span>
      </div>
      <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}><strong>Source Type:</strong> {opportunity.source_type}</div>
      {opportunity.how_to_get && <div style={{ fontSize: 12, color: '#059669', padding: '6px 8px', background: '#f0fdf4', borderRadius: 4 }}><strong>How to get it:</strong> {opportunity.how_to_get}</div>}
    </div>
  );
}

export default function InternalLinks() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('internal_links');
  const [sortDir, setSortDir] = useState('desc');
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedPages, setExpandedPages] = useState(new Set());

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

  if (loading) return <div className="page-content"><div className="loading-overlay"><div className="spinner" /><p>Analyzing link structure...</p></div></div>;
  if (error) return <div className="page-content"><div className="empty-state"><XCircle size={48} /><p>{error}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button></div></div>;
  if (!data) return <div className="page-content"><div className="empty-state"><Link2 size={48} /><p>No internal links data available</p></div></div>;

  const totalPages = data.total_pages ?? 0;
  const avgInternal = data.avg_internal_links ?? 0;
  const avgExternal = data.avg_external_links ?? 0;
  const noLinksCount = data.pages_with_no_internal_links ?? 0;
  const orphanCount = data.orphan_pages ?? 0;
  const pages = data.pages || [];
  const noLinksUrls = data.no_links_urls || [];
  const orphanUrls = data.orphan_urls || [];
  const linkSuggestions = data.link_suggestions || data.suggested_links || [];
  const backlinkOpportunities = data.backlink_opportunities || [];
  const linkImprovements = data.link_improvements || data.internal_link_improvements || [];

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

  const sections = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'suggestions', label: 'Link Suggestions', icon: Lightbulb, count: linkSuggestions.length },
    { key: 'backlinks', label: 'Backlink Strategy', icon: Globe, count: backlinkOpportunities.length },
    { key: 'improvements', label: 'Link Improvements', icon: Target, count: linkImprovements.length },
    { key: 'nolinks', label: 'No Links', icon: AlertTriangle, count: noLinksCount },
    { key: 'orphans', label: 'Orphan Pages', icon: Unlink, count: orphanCount },
  ];

  const linkHealth = totalPages > 0 ? Math.round(((totalPages - noLinksCount - orphanCount) / totalPages) * 100) : 100;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link2 size={24} color="#3b82f6" /> Internal Linking
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '6px 0 0' }}>Link architecture, suggestions, backlink strategy, and orphan page recovery</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Link Health', value: `${linkHealth}%`, color: linkHealth >= 80 ? '#059669' : '#dc2626', bg: linkHealth >= 80 ? '#f0fdf4' : '#fef2f2' },
            { label: 'Avg Int. Links', value: avgInternal.toFixed(1), color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Avg Ext. Links', value: avgExternal.toFixed(1), color: '#8b5cf6', bg: '#f5f3ff' },
            { label: 'No Links', value: noLinksCount, color: '#dc2626', bg: '#fef2f2' },
            { label: 'Orphan Pages', value: orphanCount, color: '#dc2626', bg: '#fef2f2' },
          ].map((s, i) => (
            <div key={i} style={{ padding: 16, background: s.bg, borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: '1px solid', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  background: activeSection === s.key ? '#1e293b' : '#fff', color: activeSection === s.key ? '#fff' : '#475569', borderColor: activeSection === s.key ? '#1e293b' : '#e2e8f0' }}>
                <Icon size={13} /> {s.label}
                {s.count > 0 && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: activeSection === s.key ? '#ffffff30' : '#f1f5f9' }}>{s.count}</span>}
              </button>
            );
          })}
        </div>

        {activeSection === 'overview' && (
          <div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>Link Architecture Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 6 }}>What is Working</div>
                  {avgInternal >= 3 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><CheckCircle size={12} color="#059669" style={{ marginTop: 2 }} />Average {avgInternal.toFixed(1)} internal links per page provides good crawlability</div>}
                  {linkHealth >= 80 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><CheckCircle size={12} color="#059669" style={{ marginTop: 2 }} />{linkHealth}% of pages are properly linked</div>}
                  {orphanCount === 0 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><CheckCircle size={12} color="#059669" style={{ marginTop: 2 }} />No orphan pages detected</div>}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>Needs Improvement</div>
                  {noLinksCount > 0 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><AlertTriangle size={12} color="#dc2626" style={{ marginTop: 2 }} />{noLinksCount} pages have no internal links - Google may not discover them</div>}
                  {orphanCount > 0 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><AlertTriangle size={12} color="#dc2626" style={{ marginTop: 2 }} />{orphanCount} orphan pages have zero inbound links</div>}
                  {avgInternal < 3 && <div style={{ fontSize: 12, color: '#475569', padding: '4px 0', display: 'flex', gap: 6 }}><AlertTriangle size={12} color="#d97706" style={{ marginTop: 2 }} />Average {avgInternal.toFixed(1)} links per page is low - aim for 5+</div>}
                </div>
              </div>
            </div>

            {pages.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>All Pages ({pages.length})</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {[
                          { key: 'url', label: 'URL' },
                          { key: 'internal_links', label: 'Int. Links' },
                          { key: 'external_links', label: 'Ext. Links' },
                          { key: 'crawl_depth', label: 'Depth' },
                        ].map(col => (
                          <th key={col.key} onClick={() => handleSort(col.key)} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                            {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '^' : 'v') : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPages.map((page, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' }}>{page.url}</td>
                          <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 4, background: getLinksColor(page.internal_links) + '18', color: getLinksColor(page.internal_links), fontWeight: 600 }}>{page.internal_links}</span></td>
                          <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 4, background: page.external_links > 0 ? '#3b82f618' : '#d9770618', color: page.external_links > 0 ? '#3b82f6' : '#d97706', fontWeight: 600 }}>{page.external_links}</span></td>
                          <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 4, background: getDepthColor(page.crawl_depth) + '18', color: getDepthColor(page.crawl_depth), fontWeight: 600 }}>{page.crawl_depth}</span></td>
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
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lightbulb size={16} color="#d97706" /> Where to Add Internal Links
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>Specific suggestions for adding links from existing pages to boost rankings</p>
            {linkSuggestions.length > 0 ? (
              linkSuggestions.map((s, i) => <LinkSuggestionCard key={i} suggestion={s} />)
            ) : (
              <div style={{ padding: 20, textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>
                <Lightbulb size={32} color="#d97706" />
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>No specific link suggestions available. Check the Overview tab for general guidance.</p>
                <div style={{ marginTop: 12, textAlign: 'left', maxWidth: 500, margin: '12px auto 0' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>General Link Building Strategy:</div>
                  <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8 }}>
                    <div>- Add links from your homepage to your most important service/product pages</div>
                    <div>- Link between related blog posts using descriptive anchor text</div>
                    <div>- Add "Related Articles" sections to blog posts</div>
                    <div>- Link from high-authority pages (homepage, about) to pages that need ranking boosts</div>
                    <div>- Use breadcrumbs with links for site navigation</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'backlinks' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={16} color="#3b82f6" /> Backlink Strategy
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>How to earn external backlinks to boost domain authority</p>
            {backlinkOpportunities.length > 0 ? (
              backlinkOpportunities.map((o, i) => <BacklinkCard key={i} opportunity={o} />)
            ) : (
              <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>Backlink Opportunities for Your Site:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { type: 'Industry Publications', how: 'Write guest articles for industry blogs and news sites. Share unique data or insights.', diff: 'medium' },
                    { type: 'Original Research', how: 'Create surveys, studies, or data reports that others want to cite and link to.', diff: 'hard' },
                    { type: 'Directory Listings', how: 'List your business in relevant industry directories, local chambers, and review sites.', diff: 'easy' },
                    { type: 'Broken Link Building', how: 'Find broken links on competitor sites and offer your content as a replacement.', diff: 'medium' },
                    { type: 'HARO / Journalist Queries', how: 'Respond to journalist queries on Help a Reporter to get mentioned in news articles.', diff: 'easy' },
                    { type: 'Partnerships', how: 'Partner with complementary businesses for co-authored content and mutual linking.', diff: 'medium' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '12px 14px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Globe size={12} color="#3b82f6" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{item.type}</span>
                        <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: item.diff === 'easy' ? '#05966918' : item.diff === 'medium' ? '#d9770618' : '#dc262618', color: item.diff === 'easy' ? '#059669' : item.diff === 'medium' ? '#d97706' : '#dc2626', fontWeight: 600 }}>{item.diff}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>{item.how}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'improvements' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} color="#059669" /> Link Improvements
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>Existing links that should use better anchor text or target different pages</p>
            {linkImprovements.length > 0 ? (
              linkImprovements.map((imp, i) => (
                <div key={i} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, marginBottom: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, color: '#475569' }}><strong>Current:</strong> {imp.current_link || imp.current}</div>
                  <div style={{ fontSize: 12, color: '#059669', marginTop: 2 }}><strong>Better:</strong> {imp.better_anchor || imp.recommended}</div>
                  {imp.why && <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>Why: {imp.why}</div>}
                </div>
              ))
            ) : (
              <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 8, textAlign: 'center', border: '1px solid #bbf7d0' }}>
                <CheckCircle size={24} color="#059669" />
                <p style={{ fontSize: 13, color: '#059669', marginTop: 6 }}>Existing links look good - no improvements needed</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'nolinks' && noLinksUrls.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#dc2626" /> Pages with No Internal Links ({noLinksUrls.length})
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>These pages have no links pointing to them from other pages on your site. Add links from relevant pages to help Google discover them.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {noLinksUrls.map((url, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
                  <Unlink size={12} color="#dc2626" />
                  <span style={{ fontSize: 12, color: '#991b1b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'orphans' && orphanUrls.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Unlink size={16} color="#dc2626" /> Orphan Pages ({orphanUrls.length})
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>These pages exist but have zero internal links pointing to them from any other page. Search engines may never find them.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {orphanUrls.map((url, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
                  <Unlink size={12} color="#dc2626" />
                  <span style={{ fontSize: 12, color: '#991b1b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                  <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Add links from: homepage, sitemap, related pages</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'nolinks' && noLinksUrls.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 30, textAlign: 'center' }}>
            <CheckCircle size={32} color="#059669" />
            <p style={{ fontSize: 13, color: '#059669', marginTop: 8 }}>All pages have internal links</p>
          </div>
        )}

        {activeSection === 'orphans' && orphanUrls.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 30, textAlign: 'center' }}>
            <CheckCircle size={32} color="#059669" />
            <p style={{ fontSize: 13, color: '#059669', marginTop: 8 }}>No orphan pages found</p>
          </div>
        )}
      </div>
    </div>
  );
}
