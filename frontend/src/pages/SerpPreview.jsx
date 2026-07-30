import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Globe, Search, MessageSquare, Eye, AlertCircle } from 'lucide-react';

function GoogleSerpPreview({ url, title, description }) {
  const displayUrl = url?.replace(/^https?:\/\//, '').slice(0, 50) || 'example.com';
  const displayTitle = title || 'Page Title — 50-60 characters recommended';
  const displayDesc = description || 'Meta description goes here. Aim for 150-160 characters to maximize click-through rate from search results.';
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: '#fff', marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Globe size={12} /> Google Search Result
      </div>
      <div style={{ color: '#1a0dab', fontSize: 18, fontWeight: 400, lineHeight: 1.3, marginBottom: 2, cursor: 'pointer' }}>
        {displayTitle.slice(0, 60)}
      </div>
      <div style={{ color: '#006621', fontSize: 12, marginBottom: 4 }}>{displayUrl}</div>
      <div style={{ color: '#545454', fontSize: 13, lineHeight: 1.4 }}>
        {displayDesc.slice(0, 160)}
      </div>
      {displayTitle.length > 60 && (
        <div style={{ fontSize: 10, color: '#e53e3e', marginTop: 4 }}>⚠ Title may be truncated ({displayTitle.length} chars, max 60)</div>
      )}
      {displayDesc.length > 160 && (
        <div style={{ fontSize: 10, color: '#d69e2e', marginTop: 2 }}>⚠ Description may be truncated ({displayDesc.length} chars, max 160)</div>
      )}
    </div>
  );
}

function AIOverviewPreview({ platformScores, title, url }) {
  const platforms = [
    { key: 'chatgpt', label: 'ChatGPT', color: '#10a37f', icon: MessageSquare },
    { key: 'gemini', label: 'Gemini', color: '#4285f4', icon: Globe },
    { key: 'perplexity', label: 'Perplexity', color: '#20b2aa', icon: Search },
    { key: 'claude', label: 'Claude', color: '#d97706', icon: MessageSquare },
    { key: 'google_ai_overview', label: 'AI Overview', color: '#7c3aed', icon: Eye },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
      {platforms.map(p => {
        const score = platformScores?.[p.key] || 0;
        const Icon = p.icon;
        return (
          <div key={p.key} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, textAlign: 'center', background: '#fff' }}>
            <Icon size={18} style={{ color: p.color, marginBottom: 6 }} />
            <div style={{ fontSize: 24, fontWeight: 700, color: score >= 70 ? '#38a169' : score >= 50 ? '#d69e2e' : '#e53e3e' }}>
              {score.toFixed(0)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.label}</div>
            <div style={{ fontSize: 10, marginTop: 4, color: score >= 70 ? '#38a169' : score >= 50 ? '#d69e2e' : '#e53e3e' }}>
              {score >= 70 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChatGPTCitationPreview({ title, url, contentSnippet }) {
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 16, background: '#fff', marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <MessageSquare size={12} style={{ color: '#10a37f' }} /> ChatGPT Citation Preview
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: '#333' }}>
        <span style={{ background: '#f0f0f0', padding: '2px 4px', borderRadius: 2 }}>According to</span>{' '}
        <a href={url} target="_blank" rel="noopener" style={{ color: '#10a37f', textDecoration: 'underline' }}>
          {title || url}
        </a>
        , {contentSnippet?.slice(0, 200) || 'this content provides valuable information about the topic...'}
      </div>
      <div style={{ marginTop: 8, padding: '6px 10px', background: '#f7f7f7', borderRadius: 6, fontSize: 11, color: '#666' }}>
        Source: {url?.replace(/^https?:\/\//, '').slice(0, 60)}
      </div>
    </div>
  );
}

function PerplexityPreview({ title, url, sources }) {
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 16, background: '#fff', marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Search size={12} style={{ color: '#20b2aa' }} /> Perplexity Citation Preview
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{title || 'Untitled Page'}</div>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
            This content is {sources?.length >= 3 ? 'well-cited and likely to be referenced' : 'lacking citations and may not be referenced'} by Perplexity AI.
          </div>
        </div>
        {sources?.length > 0 && (
          <div style={{ fontSize: 11, color: '#20b2aa', fontWeight: 600, textAlign: 'center', padding: '4px 8px', background: '#f0fdfa', borderRadius: 6 }}>
            {sources.length} sources
          </div>
        )}
      </div>
    </div>
  );
}

export default function SerpPreview() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [enterprise, setEnterprise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getAuditPages(id, { limit: 100 }).then(d => {
      setPages(d.items || []);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (pages.length === 0) return;
    api.request(`/audit/${id}/enterprise/${selectedIdx}`).then(d => setEnterprise(d)).catch(() => {});
  }, [id, selectedIdx, pages]);

  if (loading) return <div className="loading-skeleton" />;
  if (error) return <div className="empty-state">{error}</div>;
  if (!pages.length) return <div className="empty-state">No pages found</div>;
  if (!pages[selectedIdx]) return <div className="empty-state">Page not found</div>;

  const page = pages[selectedIdx];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>SERP & AI Overview Preview</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>How your page appears in Google Search and AI platforms</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff' }}>
          {pages.map((p, i) => (
            <option key={i} value={i}>{p.title || p.url}</option>
          ))}
        </select>
      </div>

      <GoogleSerpPreview
        url={page.url}
        title={page.title}
        description={page.meta_description}
      />

      <AIOverviewPreview
        platformScores={enterprise?.platform_scores}
        title={page.title}
        url={page.url}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ChatGPTCitationPreview
          title={page.title}
          url={page.url}
          contentSnippet={enterprise?.diagnostics?.why_not_ranking?.[0] ? undefined : `is a comprehensive resource that covers key aspects of this topic with ${page.word_count || 0} words of detailed analysis.`}
        />
        <PerplexityPreview
          title={page.title}
          url={page.url}
          sources={[]}
        />
      </div>

      {enterprise?.diagnostics?.why_not_ranking?.length > 0 && (
        <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: '#fff' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> Why AI Won't Cite This Page
          </h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {enterprise.diagnostics.why_not_ranking.map((reason, i) => (
              <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12, display: 'flex', gap: 6 }}>
                <span style={{ color: '#e53e3e', fontWeight: 600 }}>•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
