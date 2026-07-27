import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import {
  Edit3, AlertTriangle, CheckCircle, ChevronDown, Target, BarChart3, Brain,
  RefreshCw, Copy, Sparkles, Globe, Eye, Smartphone, Heading, Link2,
  ExternalLink, Columns, Key, FileJson, Shield, Code, Gauge, Database,
  Users, MessageSquare, HelpCircle, Activity, Lightbulb, Zap, TrendingUp,
  Search, Layout, Clock, Image, Tag, ArrowRight, XCircle,
  ListOrdered, Hash, AlignLeft, Quote, Video, Plus,
} from 'lucide-react';

const GOOGLE_TABS = [
  { key: 'googlebot', label: 'Googlebot', icon: Globe },
  { key: 'browser', label: 'Browser View', icon: Eye },
  { key: 'mobile', label: 'Mobile View', icon: Smartphone },
  { key: 'headings', label: 'Headings', icon: Heading },
  { key: 'schema', label: 'Schema', icon: FileJson },
  { key: 'entities', label: 'Entities', icon: Database },
  { key: 'content_blocks', label: 'Content', icon: Columns },
  { key: 'keywords', label: 'Keywords', icon: Key },
  { key: 'internal_links', label: 'Int. Links', icon: Link2 },
  { key: 'external_links', label: 'Ext. Links', icon: ExternalLink },
  { key: 'cwv', label: 'Web Vitals', icon: Gauge },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'indexability', label: 'Indexable', icon: CheckCircle },
  { key: 'canonical', label: 'Canonical', icon: Copy },
  { key: 'eeat', label: 'E-E-A-T', icon: Users },
  { key: 'ai_citation', label: 'AI Citation', icon: MessageSquare },
];

function PageVisualView({ content, signals, issues, page, mega, catScores, platformScores }) {
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const [markerFilter, setMarkerFilter] = useState('all');

  const sentences = (content || '').split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
  const paragraphs = (content || '').split(/\n\n+/).filter(p => p.trim().length > 10);
  const words = (content || '').split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const getBlockScore = (text) => {
    const lower = text.toLowerCase();
    let score = 50;
    const issuesFound = [];
    const strengths = [];

    if (lower.length > 200) { score += 5; strengths.push('Good length'); }
    else { score -= 10; issuesFound.push('Too short'); }

    const hasKeyword = signals?.some(s => s.id === 'K002' && s.status === 'pass');
    if (hasKeyword && lower.includes('revenue')) { score += 10; strengths.push('Contains keyword'); }

    if (/\d+/.test(text)) { score += 5; strengths.push('Has data/numbers'); }
    if (text.includes('?')) { score += 3; strengths.push('Question format'); }
    if (text.includes(':') && text.split(':').length > 1) { score += 3; strengths.push('Structured with colon'); }
    if (/[A-Z][a-z]+ [A-Z][a-z]+/.test(text)) { score += 3; strengths.push('Proper nouns'); }

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const longSentences = sentences.filter(s => s.split(' ').length > 25);
    if (longSentences.length > 0) { score -= 5; issuesFound.push('Long sentences'); }

    if (text.length > 300 && !text.includes('\n')) { score -= 8; issuesFound.push('No line breaks'); }
    if (/^(the|this|it|that|there)\s/i.test(text.trim())) { score -= 3; issuesFound.push('Weak opener'); }

    return { score: Math.max(0, Math.min(100, score)), issues: issuesFound, strengths };
  };

  const blocks = paragraphs.map((p, i) => ({
    index: i,
    text: p,
    score: getBlockScore(p),
    wordCount: p.split(/\s+/).length,
    isHeading: /^[\w\s]{1,80}$/.test(p.trim()) && p.trim().split(' ').length < 10 && p.trim().length < 80,
  }));

  const failingSignals = (signals || []).filter(s => s.status === 'fail');
  const warnSignals = (signals || []).filter(s => s.status === 'warn');
  const passSignals = (signals || []).filter(s => s.status === 'pass');

  const filteredBlocks = blocks.filter(b => {
    if (markerFilter === 'all') return true;
    if (markerFilter === 'good') return b.score.score >= 70;
    if (markerFilter === 'warn') return b.score.score >= 40 && b.score.score < 70;
    if (markerFilter === 'bad') return b.score.score < 40;
    if (markerFilter === 'headings') return b.isHeading;
    return true;
  });

  const scoreColor = (s) => s >= 70 ? '#059669' : s >= 40 ? '#d97706' : '#dc2626';
  const scoreBg = (s) => s >= 70 ? '#f0fdf4' : s >= 40 ? '#fffbeb' : '#fef2f2';
  const scoreBorder = (s) => s >= 70 ? '#bbf7d0' : s >= 40 ? '#fde68a' : '#fecaca';

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg, #1e293b, #334155)', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Eye size={16} color="#60a5fa" /> Actual Page View with Content Markers
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
          Visual audit of your actual page content - green markers = good, orange = needs work, red = critical
        </div>
      </div>

      <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginRight: 4 }}>FILTER:</span>
        {[
          { key: 'all', label: `All (${blocks.length})`, color: '#64748b' },
          { key: 'good', label: 'Good', color: '#059669' },
          { key: 'warn', label: 'Needs Work', color: '#d97706' },
          { key: 'bad', label: 'Critical', color: '#dc2626' },
          { key: 'headings', label: 'Headings', color: '#3b82f6' },
        ].map(f => (
          <button key={f.key} onClick={() => setMarkerFilter(f.key)}
            style={{ padding: '3px 8px', borderRadius: 4, border: `1px solid ${markerFilter === f.key ? f.color : '#e2e8f0'}`, background: markerFilter === f.key ? `${f.color}15` : '#fff', color: markerFilter === f.key ? f.color : '#64748b', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>
            {f.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8, fontSize: 9 }}>
          <span style={{ color: '#059669', fontWeight: 700 }}>{passSignals.length} pass</span>
          <span style={{ color: '#d97706', fontWeight: 700 }}>{warnSignals.length} warn</span>
          <span style={{ color: '#dc2626', fontWeight: 700 }}>{failingSignals.length} fail</span>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag size={12} color="#3b82f6" /> Title Tag
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{page.title || 'No title set'}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: (page.title?.length || 0) >= 30 && (page.title?.length || 0) <= 60 ? '#f0fdf4' : '#fef2f2', color: (page.title?.length || 0) >= 30 && (page.title?.length || 0) <= 60 ? '#059669' : '#dc2626', fontWeight: 600 }}>
              {page.title?.length || 0} chars {(page.title?.length || 0) >= 30 && (page.title?.length || 0) <= 60 ? '(good)' : '(bad)'}
            </span>
            {signals?.find(s => s.id === 'T004') && (
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: signals.find(s => s.id === 'T004').status === 'pass' ? '#f0fdf4' : '#fef2f2', color: signals.find(s => s.id === 'T004').status === 'pass' ? '#059669' : '#dc2626', fontWeight: 600 }}>
                Primary KW {signals.find(s => s.id === 'T004').status === 'pass' ? 'present' : 'missing'}
              </span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileJson size={12} color="#8b5cf6" /> Meta Description
          </div>
          <div style={{ fontSize: 11, color: '#475569' }}>{page.meta_description || 'No meta description'}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: (page.meta_description?.length || 0) >= 120 && (page.meta_description?.length || 0) <= 160 ? '#f0fdf4' : '#fef2f2', color: (page.meta_description?.length || 0) >= 120 && (page.meta_description?.length || 0) <= 160 ? '#059669' : '#dc2626', fontWeight: 600 }}>
              {page.meta_description?.length || 0} chars
            </span>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layout size={12} color="#059669" /> Content Blocks ({filteredBlocks.length})
          <span style={{ fontSize: 9, color: '#64748b', fontWeight: 400 }}>- {wordCount} words total</span>
        </div>

        {filteredBlocks.map((block, i) => {
          const sc = scoreColor(block.score.score);
          const bg = scoreBg(block.score.score);
          const bd = scoreBorder(block.score.score);
          const isHovered = hoveredBlock === block.index;
          return (
            <div key={block.index}
              onMouseEnter={() => setHoveredBlock(block.index)}
              onMouseLeave={() => setHoveredBlock(null)}
              style={{
                marginBottom: 6, borderRadius: 6, border: `1px solid ${isHovered ? sc : bd}`,
                background: isHovered ? bg : '#fff', position: 'relative', transition: 'all 0.15s',
                cursor: 'pointer',
              }}>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <div style={{ width: 4, background: sc, borderRadius: '6px 0 0 6px', flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 6, background: `${sc}15`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: sc, flexShrink: 0,
                    }}>
                      {block.score.score}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: sc, textTransform: 'uppercase' }}>
                      {block.isHeading ? 'Heading' : `Block ${block.index + 1}`}
                    </span>
                    <span style={{ fontSize: 8, color: '#94a3b8' }}>{block.wordCount}w</span>
                    <div style={{ flex: 1 }} />
                    {block.score.strengths.slice(0, 2).map((s, si) => (
                      <span key={si} style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: '#f0fdf4', color: '#059669', fontWeight: 600 }}>{s}</span>
                    ))}
                    {block.score.issues.slice(0, 1).map((issue, ii) => (
                      <span key={ii} style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>{issue}</span>
                    ))}
                  </div>
                  <div style={{
                    fontSize: block.isHeading ? 13 : 11, fontWeight: block.isHeading ? 700 : 400,
                    color: '#334155', lineHeight: 1.5,
                    display: isHovered ? 'block' : '-webkit-box', WebkitLineClamp: isHovered ? 'unset' : 2,
                    WebkitBoxOrient: 'vertical', overflow: isHovered ? 'visible' : 'hidden',
                  }}>
                    {block.text}
                  </div>
                </div>
              </div>

              {isHovered && (
                <div style={{ padding: '0 14px 10px 18px', borderTop: `1px solid ${bd}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                    {block.score.strengths.length > 0 && (
                      <div>
                        <div style={{ fontSize: 8, fontWeight: 700, color: '#059669', marginBottom: 3 }}>STRENGTHS</div>
                        {block.score.strengths.map((s, si) => (
                          <div key={si} style={{ fontSize: 9, color: '#065f46', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle size={8} color="#059669" /> {s}
                          </div>
                        ))}
                      </div>
                    )}
                    {block.score.issues.length > 0 && (
                      <div>
                        <div style={{ fontSize: 8, fontWeight: 700, color: '#dc2626', marginBottom: 3 }}>ISSUES</div>
                        {block.score.issues.map((issue, ii) => (
                          <div key={ii} style={{ fontSize: 9, color: '#7f1d1d', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <AlertTriangle size={8} color="#dc2626" /> {issue}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                    <div style={{ height: 4, flex: 1, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${block.score.score}%`, background: sc, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 700, color: sc }}>{block.score.score}/100</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 size={12} color="#3b82f6" /> Content Quality Summary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <div style={{ textAlign: 'center', padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{wordCount}</div>
              <div style={{ fontSize: 8, color: '#64748b' }}>Words</div>
            </div>
            <div style={{ textAlign: 'center', padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#8b5cf6' }}>{blocks.length}</div>
              <div style={{ fontSize: 8, color: '#64748b' }}>Blocks</div>
            </div>
            <div style={{ textAlign: 'center', padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(mega?.overall_score || 0) }}>{Math.round(mega?.overall_score || 0)}</div>
              <div style={{ fontSize: 8, color: '#64748b' }}>Score</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>BLOCK SCORE DISTRIBUTION</div>
            <div style={{ display: 'flex', gap: 2, height: 16, borderRadius: 4, overflow: 'hidden' }}>
              {blocks.length > 0 && (
                <>
                  <div style={{ flex: blocks.filter(b => b.score.score >= 70).length, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff', fontWeight: 700 }}>
                    {blocks.filter(b => b.score.score >= 70).length}
                  </div>
                  <div style={{ flex: blocks.filter(b => b.score.score >= 40 && b.score.score < 70).length, background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff', fontWeight: 700 }}>
                    {blocks.filter(b => b.score.score >= 40 && b.score.score < 70).length}
                  </div>
                  <div style={{ flex: blocks.filter(b => b.score.score < 40).length, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff', fontWeight: 700 }}>
                    {blocks.filter(b => b.score.score < 40).length}
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 8, color: '#059669' }}>Good ({blocks.filter(b => b.score.score >= 70).length})</span>
              <span style={{ fontSize: 8, color: '#d97706' }}>Needs work ({blocks.filter(b => b.score.score >= 40 && b.score.score < 70).length})</span>
              <span style={{ fontSize: 8, color: '#dc2626' }}>Critical ({blocks.filter(b => b.score.score < 40).length})</span>
            </div>
          </div>
        </div>

        {failingSignals.length > 0 && (
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <XCircle size={12} color="#dc2626" /> Critical Content Markers ({failingSignals.length})
            </div>
            {failingSignals.slice(0, 8).map((s, i) => (
              <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #fecaca', fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: '#dc2626', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: '#7f1d1d', flex: 1 }}>{s.name}</span>
                <span style={{ fontSize: 8, color: '#991b1b' }}>{s.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const MISSING_TABS = [
  { key: 'failing', label: 'Failing Signals', icon: XCircle },
  { key: 'warnings', label: 'Warnings', icon: AlertTriangle },
  { key: 'category_gaps', label: 'Category Gaps', icon: BarChart3 },
  { key: 'quick_wins', label: 'Quick Wins', icon: Zap },
];

const KEYWORD_TABS = [
  { key: 'primary', label: 'Primary KW', icon: Key },
  { key: 'secondary', label: 'Secondary KW', icon: Tag },
  { key: 'missing', label: 'Missing KW', icon: AlertTriangle },
  { key: 'opportunity', label: 'Opportunity', icon: TrendingUp },
];

const SIGNAL_CATEGORIES = {
  title_tag: { label: 'Title Tag', icon: Tag, color: '#3b82f6' },
  meta_tags: { label: 'Meta Tags', icon: FileJson, color: '#8b5cf6' },
  headings: { label: 'Headings', icon: Heading, color: '#06b6d4' },
  content_quality: { label: 'Content Quality', icon: AlignLeft, color: '#059669' },
  content_structure: { label: 'Content Structure', icon: Layout, color: '#0891b2' },
  keyword_optimization: { label: 'Keyword Optimization', icon: Key, color: '#d97706' },
  internal_links: { label: 'Internal Links', icon: Link2, color: '#7c3aed' },
  external_links: { label: 'External Links', icon: ExternalLink, color: '#6366f1' },
  image_optimization: { label: 'Image Optimization', icon: Image, color: '#ec4899' },
  url_structure: { label: 'URL Structure', icon: Globe, color: '#14b8a6' },
  schema_markup: { label: 'Schema Markup', icon: FileJson, color: '#f59e0b' },
  open_graph: { label: 'Open Graph', icon: Globe, color: '#ef4444' },
  mobile_optimization: { label: 'Mobile Optimization', icon: Smartphone, color: '#10b981' },
  page_speed: { label: 'Page Speed', icon: Gauge, color: '#f97316' },
  security: { label: 'Security', icon: Shield, color: '#dc2626' },
  crawlability: { label: 'Crawlability', icon: Search, color: '#64748b' },
  indexability: { label: 'Indexability', icon: CheckCircle, color: '#22c55e' },
  user_experience: { label: 'User Experience', icon: Eye, color: '#8b5cf6' },
  ai_search_readiness: { label: 'AI Search Readiness', icon: Brain, color: '#a855f7' },
  freshness_signals: { label: 'Freshness Signals', icon: Clock, color: '#0ea5e9' },
  video_seo: { label: 'Video SEO', icon: Video, color: '#e11d48' },
  readability: { label: 'Readability', icon: AlignLeft, color: '#2563eb' },
  semantic_html: { label: 'Semantic HTML', icon: Code, color: '#7c3aed' },
  structured_data_richness: { label: 'Structured Data Richness', icon: Database, color: '#d946ef' },
  voice_search: { label: 'Voice Search', icon: MessageSquare, color: '#06b6d4' },
  accessibility: { label: 'Accessibility', icon: Activity, color: '#14b8a6' },
  content_freshness: { label: 'Content Freshness', icon: Clock, color: '#0ea5e9' },
  brand_authority: { label: 'Brand Authority', icon: Users, color: '#f59e0b' },
  link_quality: { label: 'Link Quality', icon: Link2, color: '#7c3aed' },
  content_uniqueness: { label: 'Content Uniqueness', icon: Sparkles, color: '#8b5cf6' },
  visual_content: { label: 'Visual Content', icon: Image, color: '#ec4899' },
  core_web_vitals_detailed: { label: 'Core Web Vitals', icon: Gauge, color: '#ef4444' },
  mobile_first: { label: 'Mobile First', icon: Smartphone, color: '#10b981' },
  technical_integrity: { label: 'Technical Integrity', icon: Shield, color: '#64748b' },
};

function ScoreRing({ score, size = 60, stroke = 5, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const offset = c - (pct / 100) * c;
  const color = pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.24, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(pct)}</span>
        {label && <span style={{ fontSize: 7, color: '#94a3b8', marginTop: 1 }}>{label}</span>}
      </div>
    </div>
  );
}

function BoolField({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 7, height: 7, borderRadius: 4, background: value ? '#059669' : '#dc2626', flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: '#64748b', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: value ? '#059669' : '#dc2626' }}>{value ? 'Yes' : 'No'}</span>
    </div>
  );
}

function MetricField({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 11, color: '#64748b', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: color || '#1e293b' }}>{value}</span>
    </div>
  );
}

function ListView({ items, label }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>{label} ({items.length})</div>
      {items.slice(0, 12).map((item, i) => (
        <div key={i} style={{ padding: '3px 6px', fontSize: 11, color: '#475569', borderBottom: '1px solid #f8fafc' }}>
          {typeof item === 'string' ? item : item.text || item.url || JSON.stringify(item).slice(0, 80)}
        </div>
      ))}
      {items.length > 12 && <div style={{ fontSize: 10, color: '#94a3b8', padding: '3px 6px' }}>+{items.length - 12} more</div>}
    </div>
  );
}

function SignalCard({ signal, index }) {
  const [expanded, setExpanded] = useState(false);
  const statusColors = { pass: '#059669', warn: '#d97706', fail: '#dc2626' };
  const statusLabels = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
  const sc = statusColors[signal.status] || '#64748b';
  const sevColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb' };
  const sevColor = sevColors[signal.severity] || '#64748b';
  const hasIssues = signal.status === 'warn' || signal.status === 'fail';

  return (
    <div style={{ border: `1px solid ${sc}30`, borderRadius: 8, marginBottom: 4, background: '#fff', borderLeft: `3px solid ${sc}` }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: hasIssues ? `${sc}05` : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ width: 18, height: 18, borderRadius: 4, background: `${sc}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: sc, flexShrink: 0 }}>{index + 1}</span>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{signal.name}</span>
        <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: `${sc}15`, color: sc, fontWeight: 700 }}>{statusLabels[signal.status]}</span>
        {hasIssues && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: `${sevColor}15`, color: sevColor, fontWeight: 700 }}>{signal.severity}</span>}
        <ChevronDown size={11} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
      </button>
      {expanded && hasIssues && (
        <div style={{ padding: '0 10px 10px' }}>
          {signal.what_wrong && <div style={{ padding: '6px 8px', background: '#fef2f2', borderRadius: 5, border: '1px solid #fecaca', marginBottom: 4, fontSize: 10, color: '#7f1d1d', lineHeight: 1.5 }}><strong>What is wrong:</strong> {signal.what_wrong}</div>}
          {signal.why_it_matters && <div style={{ padding: '6px 8px', background: '#fef3c7', borderRadius: 5, border: '1px solid #fde68a', marginBottom: 4, fontSize: 10, color: '#78350f', lineHeight: 1.5 }}><strong>Why it matters:</strong> {signal.why_it_matters}</div>}
          {signal.how_to_fix && <div style={{ padding: '6px 8px', background: '#f0fdf4', borderRadius: 5, border: '1px solid #bbf7d0', marginBottom: 4, fontSize: 10, color: '#065f46', lineHeight: 1.5 }}><strong>How to fix:</strong> {signal.how_to_fix}</div>}
          {(signal.before_code || signal.after_code || signal.code_example) && (
            <div style={{ display: 'grid', gridTemplateColumns: signal.before_code && signal.after_code ? '1fr 1fr' : '1fr', gap: 4, marginTop: 4 }}>
              {signal.before_code && <div style={{ background: '#1e293b', borderRadius: 5, padding: 6 }}><div style={{ fontSize: 7, color: '#f87171', marginBottom: 1, fontWeight: 700 }}>BEFORE</div><pre style={{ fontSize: 9, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{signal.before_code}</pre></div>}
              {signal.after_code && <div style={{ background: '#1e293b', borderRadius: 5, padding: 6 }}><div style={{ fontSize: 7, color: '#34d399', marginBottom: 1, fontWeight: 700 }}>AFTER</div><pre style={{ fontSize: 9, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{signal.after_code}</pre></div>}
              {!signal.before_code && !signal.after_code && signal.code_example && <div style={{ background: '#1e293b', borderRadius: 5, padding: 6 }}><pre style={{ fontSize: 9, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{signal.code_example}</pre></div>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {signal.expected_impact && <span style={{ fontSize: 9, color: '#059669', fontWeight: 600 }}>Impact: {signal.expected_impact}</span>}
            {signal.effort && <span style={{ fontSize: 9, color: '#64748b' }}>Effort: {signal.effort}</span>}
          </div>
        </div>
      )}
      {expanded && !hasIssues && (
        <div style={{ padding: '0 10px 8px' }}>
          <div style={{ fontSize: 10, color: '#059669', lineHeight: 1.5 }}>{signal.how_to_fix || 'This signal is passing. No action needed.'}</div>
        </div>
      )}
    </div>
  );
}

function GenericSubView({ title, icon, data }) {
  const Icon = icon || Eye;
  if (!data || typeof data !== 'object') return <div style={{ padding: 12, color: '#94a3b8', fontSize: 11 }}>No data available</div>;
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={14} color="#3b82f6" /> {title}
      </div>
      {Object.entries(data).map(([key, value]) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'boolean') return <BoolField key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={value} />;
        if (typeof value === 'number') return <MetricField key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={value} />;
        if (Array.isArray(value)) return <ListView key={key} items={value} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} />;
        if (typeof value === 'object') return <MetricField key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={JSON.stringify(value).slice(0, 100)} />;
        return <MetricField key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={String(value)} />;
      })}
    </div>
  );
}

function SerpPreview({ title, url, description }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#fff' }}>
      <div style={{ fontSize: 16, color: '#1a0dab', fontWeight: 400, lineHeight: 1.3, marginBottom: 2 }}>{(title || 'Page Title').slice(0, 60)}</div>
      <div style={{ fontSize: 12, color: '#006621', marginBottom: 3 }}>{url || 'https://example.com'}</div>
      <div style={{ fontSize: 12, color: '#545454', lineHeight: 1.4 }}>{(description || 'Meta description preview...').slice(0, 160)}</div>
    </div>
  );
}

function GoogleCrawlView({ sv }) {
  if (!sv) return <div style={{ padding: 12, color: '#94a3b8', fontSize: 11 }}>Loading Google crawl data...</div>;
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Globe size={16} color="#3b82f6" /> How Google Sees This Page
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>This is exactly what Googlebot crawls, indexes, and uses to rank your page</div>
      {Object.entries(sv.googlebot_view || {}).map(([key, value]) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'boolean') return <BoolField key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={value} />;
        if (typeof value === 'number') return <MetricField key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={value} />;
        if (Array.isArray(value)) return <ListView key={key} items={value} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} />;
        if (typeof value === 'object') return <MetricField key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={JSON.stringify(value).slice(0, 100)} />;
        return <MetricField key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={String(value)} />;
      })}
    </div>
  );
}

function MissingSignalsView({ signals }) {
  const failing = signals.filter(s => s.status === 'fail');
  const warnings = signals.filter(s => s.status === 'warn');
  const passing = signals.filter(s => s.status === 'pass');
  const failByCategory = {};
  failing.forEach(s => { if (!failByCategory[s.category]) failByCategory[s.category] = []; failByCategory[s.category].push(s); });
  const warnByCategory = {};
  warnings.forEach(s => { if (!warnByCategory[s.category]) warnByCategory[s.category] = []; warnByCategory[s.category].push(s); });
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <XCircle size={16} color="#dc2626" /> What Google Does Not Like - {failing.length} Failing, {warnings.length} Warnings
      </div>
      {failing.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6, textTransform: 'uppercase' }}>Critical Failures ({failing.length})</div>
          {Object.entries(failByCategory).map(([cat, sigs]) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 3, textTransform: 'capitalize' }}>{(SIGNAL_CATEGORIES[cat]?.label || cat).replace(/_/g, ' ')} ({sigs.length})</div>
              {sigs.map((s, i) => <SignalCard key={i} signal={s} index={i} />)}
            </div>
          ))}
        </div>
      )}
      {warnings.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 6, textTransform: 'uppercase' }}>Warnings ({warnings.length})</div>
          {Object.entries(warnByCategory).map(([cat, sigs]) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 3, textTransform: 'capitalize' }}>{(SIGNAL_CATEGORIES[cat]?.label || cat).replace(/_/g, ' ')} ({sigs.length})</div>
              {sigs.map((s, i) => <SignalCard key={i} signal={s} index={i} />)}
            </div>
          ))}
        </div>
      )}
      {failing.length === 0 && warnings.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center' }}><CheckCircle size={28} color="#059669" /><p style={{ color: '#059669', fontWeight: 600, marginTop: 8 }}>All signals passing!</p></div>
      )}
    </div>
  );
}

function CategoryGapsView({ catScores }) {
  const sorted = Object.entries(catScores).sort((a, b) => a[1] - b[1]);
  const failing = sorted.filter(([_, v]) => v < 50);
  const moderate = sorted.filter(([_, v]) => v >= 50 && v < 80);
  const good = sorted.filter(([_, v]) => v >= 80);
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <BarChart3 size={16} color="#3b82f6" /> Category Score Breakdown
      </div>
      {failing.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Critical ({failing.length})</div>
          {failing.map(([cat, score]) => (
            <div key={cat} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#7f1d1d', fontWeight: 600, textTransform: 'capitalize' }}>{(SIGNAL_CATEGORIES[cat]?.label || cat).replace(/_/g, ' ')}</div>
                <div style={{ height: 3, background: '#fecaca', borderRadius: 2, marginTop: 2 }}><div style={{ height: '100%', width: `${score}%`, background: '#dc2626', borderRadius: 2 }} /></div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#dc2626' }}>{Math.round(score)}%</span>
            </div>
          ))}
        </div>
      )}
      {moderate.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>Needs Improvement ({moderate.length})</div>
          {moderate.map(([cat, score]) => (
            <div key={cat} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #fde68a', background: '#fffbeb', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#78350f', fontWeight: 600, textTransform: 'capitalize' }}>{(SIGNAL_CATEGORIES[cat]?.label || cat).replace(/_/g, ' ')}</div>
                <div style={{ height: 3, background: '#fde68a', borderRadius: 2, marginTop: 2 }}><div style={{ height: '100%', width: `${score}%`, background: '#d97706', borderRadius: 2 }} /></div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#d97706' }}>{Math.round(score)}%</span>
            </div>
          ))}
        </div>
      )}
      {good.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 6 }}>Good ({good.length})</div>
          {good.map(([cat, score]) => (
            <div key={cat} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#065f46', fontWeight: 600, textTransform: 'capitalize' }}>{(SIGNAL_CATEGORIES[cat]?.label || cat).replace(/_/g, ' ')}</div>
                <div style={{ height: 3, background: '#bbf7d0', borderRadius: 2, marginTop: 2 }}><div style={{ height: '100%', width: `${score}%`, background: '#059669', borderRadius: 2 }} /></div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#059669' }}>{Math.round(score)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickWinsView({ signals }) {
  const quickWins = signals.filter(s => (s.status === 'warn' || s.status === 'fail') && s.effort && s.effort.toLowerCase().includes('low'));
  const mediumEffort = signals.filter(s => (s.status === 'warn' || s.status === 'fail') && s.effort && s.effort.toLowerCase().includes('medium'));
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#059669', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Zap size={16} color="#059669" /> Quick Wins - Low Effort Fixes ({quickWins.length + mediumEffort.length})
      </div>
      {quickWins.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 6 }}>Low Effort ({quickWins.length})</div>
          {quickWins.map((s, i) => <SignalCard key={i} signal={s} index={i} />)}
        </div>
      )}
      {mediumEffort.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>Medium Effort ({mediumEffort.length})</div>
          {mediumEffort.map((s, i) => <SignalCard key={i} signal={s} index={i} />)}
        </div>
      )}
      {quickWins.length === 0 && mediumEffort.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 12 }}>No quick win signals found</div>
      )}
    </div>
  );
}

function KeywordImprovementsView({ mega, rewrite, signals }) {
  const kwSignal = signals.filter(s => s.category === 'keyword_optimization');
  const h1Signal = signals.find(s => s.id === 'H007');
  const titleSignal = signals.find(s => s.id === 'T004');
  const metaSignal = signals.find(s => s.id === 'M006');
  const contentKw = signals.filter(s => s.category === 'content_quality' && (s.id === 'CQ010' || s.id === 'K002' || s.id === 'K004'));
  const keywordIssues = [...kwSignal, ...contentKw].filter(s => s.status !== 'pass');
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#d97706', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Key size={16} color="#d97706" /> Keyword Improvements Needed
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Primary Keyword Status</div>
        {titleSignal && <div style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${titleSignal.status === 'pass' ? '#bbf7d0' : '#fecaca'}`, background: titleSignal.status === 'pass' ? '#f0fdf4' : '#fef2f2', marginBottom: 4, fontSize: 10, color: titleSignal.status === 'pass' ? '#065f46' : '#7f1d1d' }}><strong>Title:</strong> {titleSignal.how_to_fix || titleSignal.what_wrong || 'Checked'}</div>}
        {h1Signal && <div style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${h1Signal.status === 'pass' ? '#bbf7d0' : '#fecaca'}`, background: h1Signal.status === 'pass' ? '#f0fdf4' : '#fef2f2', marginBottom: 4, fontSize: 10, color: h1Signal.status === 'pass' ? '#065f46' : '#7f1d1d' }}><strong>H1:</strong> {h1Signal.how_to_fix || h1Signal.what_wrong || 'Checked'}</div>}
        {metaSignal && <div style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${metaSignal.status === 'pass' ? '#bbf7d0' : '#fecaca'}`, background: metaSignal.status === 'pass' ? '#f0fdf4' : '#fef2f2', marginBottom: 4, fontSize: 10, color: metaSignal.status === 'pass' ? '#065f46' : '#7f1d1d' }}><strong>Meta:</strong> {metaSignal.how_to_fix || metaSignal.what_wrong || 'Checked'}</div>}
      </div>
      {keywordIssues.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Keyword Issues ({keywordIssues.length})</div>
          {keywordIssues.map((s, i) => <SignalCard key={i} signal={s} index={i} />)}
        </div>
      )}
      {rewrite?.targets && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', marginBottom: 6 }}>Target Keywords</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Array.isArray(rewrite.targets) ? rewrite.targets.map((kw, i) => <span key={i} style={{ fontSize: 10, padding: '3px 6px', background: '#eff6ff', borderRadius: 4, color: '#2563eb', fontWeight: 500 }}>{kw}</span>) : null}
          </div>
        </div>
      )}
      <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>CONTENT KEYWORD COVERAGE</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ padding: '4px 8px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0', fontSize: 10, color: '#065f46' }}><strong>In Title:</strong> {titleSignal?.status === 'pass' ? 'Yes' : 'No'}</div>
          <div style={{ padding: '4px 8px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0', fontSize: 10, color: '#065f46' }}><strong>In H1:</strong> {h1Signal?.status === 'pass' ? 'Yes' : 'No'}</div>
          <div style={{ padding: '4px 8px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0', fontSize: 10, color: '#065f46' }}><strong>In Meta:</strong> {metaSignal?.status === 'pass' ? 'Yes' : 'No'}</div>
          <div style={{ padding: '4px 8px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0', fontSize: 10, color: '#065f46' }}><strong>In Opening:</strong> {signals.find(s => s.id === 'K002')?.status === 'pass' ? 'Yes' : 'No'}</div>
          <div style={{ padding: '4px 8px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0', fontSize: 10, color: '#065f46' }}><strong>In Conclusion:</strong> {signals.find(s => s.id === 'K004')?.status === 'pass' ? 'Yes' : 'No'}</div>
          <div style={{ padding: '4px 8px', background: kwSignal.find(s => s.id === 'CQ010')?.status !== 'pass' ? '#fef2f2' : '#f0fdf4', borderRadius: 4, border: `1px solid ${kwSignal.find(s => s.id === 'CQ010')?.status !== 'pass' ? '#fecaca' : '#bbf7d0'}`, fontSize: 10, color: kwSignal.find(s => s.id === 'CQ010')?.status !== 'pass' ? '#7f1d1d' : '#065f46' }}><strong>Stuffing:</strong> {kwSignal.find(s => s.id === 'CQ010')?.status !== 'pass' ? 'Risk' : 'OK'}</div>
        </div>
      </div>
    </div>
  );
}

function IssueCard({ issue, index }) {
  const [expanded, setExpanded] = useState(index < 5);
  const sevColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb' };
  const sc = sevColors[issue.severity] || '#64748b';
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 4, background: '#fff', borderLeft: `3px solid ${sc}` }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f8fafc', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 8 }}>
        <span style={{ width: 18, height: 18, borderRadius: 4, background: `${sc}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: sc, flexShrink: 0 }}>{index + 1}</span>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{issue.signal_name || issue.name || issue.title || issue.issue || 'Issue'}</span>
        <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: `${sc}15`, color: sc, fontWeight: 700 }}>{issue.severity}</span>
        <ChevronDown size={11} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
      </button>
      {expanded && (
        <div style={{ padding: '0 10px 10px' }}>
          {issue.what_wrong && <div style={{ padding: '6px 8px', background: '#fef2f2', borderRadius: 5, border: '1px solid #fecaca', marginBottom: 4, fontSize: 10, color: '#7f1d1d', lineHeight: 1.5 }}><strong>What is wrong:</strong> {issue.what_wrong}</div>}
          {issue.why_it_matters && <div style={{ padding: '6px 8px', background: '#fef3c7', borderRadius: 5, border: '1px solid #fde68a', marginBottom: 4, fontSize: 10, color: '#78350f', lineHeight: 1.5 }}><strong>Why it matters:</strong> {issue.why_it_matters}</div>}
          {issue.how_to_fix && <div style={{ padding: '6px 8px', background: '#f0fdf4', borderRadius: 5, border: '1px solid #bbf7d0', marginBottom: 4, fontSize: 10, color: '#065f46', lineHeight: 1.5 }}><strong>How to fix:</strong> {issue.how_to_fix}</div>}
          {(issue.before_code || issue.after_code || issue.code_example) && (
            <div style={{ display: 'grid', gridTemplateColumns: issue.before_code && issue.after_code ? '1fr 1fr' : '1fr', gap: 4, marginTop: 4 }}>
              {issue.before_code && <div style={{ background: '#1e293b', borderRadius: 5, padding: 6 }}><div style={{ fontSize: 7, color: '#f87171', marginBottom: 1, fontWeight: 700 }}>BEFORE</div><pre style={{ fontSize: 9, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{issue.before_code}</pre></div>}
              {issue.after_code && <div style={{ background: '#1e293b', borderRadius: 5, padding: 6 }}><div style={{ fontSize: 7, color: '#34d399', marginBottom: 1, fontWeight: 700 }}>AFTER</div><pre style={{ fontSize: 9, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{issue.after_code}</pre></div>}
              {!issue.before_code && !issue.after_code && issue.code_example && <div style={{ background: '#1e293b', borderRadius: 5, padding: 6 }}><pre style={{ fontSize: 9, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{issue.code_example}</pre></div>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {issue.expected_impact && <span style={{ fontSize: 9, color: '#059669', fontWeight: 600 }}>Impact: {issue.expected_impact}</span>}
            {issue.effort && <span style={{ fontSize: 9, color: '#64748b' }}>Effort: {issue.effort}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformScoresBar({ platformScores }) {
  if (!platformScores || !Object.keys(platformScores).length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
      {Object.entries(platformScores).map(([platform, score]) => {
        const c = score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
        return (
          <div key={platform} style={{ padding: '8px 6px', borderRadius: 6, border: `1px solid ${c}30`, background: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{Math.round(score)}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#1e293b', textTransform: 'capitalize', marginTop: 2 }}>{platform.replace(/_/g, ' ')}</div>
            <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, marginTop: 4 }}><div style={{ height: '100%', width: `${score}%`, background: c, borderRadius: 2 }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export default function ContentRewriter() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mega, setMega] = useState(null);
  const [deepData, setDeepData] = useState(null);
  const [rewrite, setRewrite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [leftTab, setLeftTab] = useState('google');
  const [googleSubTab, setGoogleSubTab] = useState('googlebot');
  const [missingSubTab, setMissingSubTab] = useState('failing');
  const [kwSubTab, setKwSubTab] = useState('primary');
  const [rightTab, setRightTab] = useState('issues');

  useEffect(() => {
    api.getAuditPages(id, { limit: 100 }).then(d => { setPages(d.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    setPageLoading(true);
    Promise.allSettled([
      api.getMegaAnalysis(id, selectedIdx),
      api.getPageIntelligenceDeep(id, selectedIdx),
      api.request(`/audit/${id}/content-rewrite/${selectedIdx}`),
    ]).then(([megaRes, deepRes, rewriteRes]) => {
      if (megaRes.status === 'fulfilled') setMega(megaRes.value);
      if (deepRes.status === 'fulfilled') setDeepData(deepRes.value);
      if (rewriteRes.status === 'fulfilled') setRewrite(rewriteRes.value);
      setPageLoading(false);
    }).catch(() => setPageLoading(false));
  }, [id, selectedIdx, pages]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /><p style={{ marginTop: 12, color: '#64748b' }}>Loading...</p></div>;
  if (!pages.length) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No pages found</div>;

  const page = pages[selectedIdx];
  const sv = deepData?.sub_views || {};
  const signals = mega?.all_signals || [];
  const issues = mega?.issues || [];
  const catScores = mega?.category_scores || {};
  const platformScores = rewrite?.platform_scores || {};
  const readability = rewrite?.readability || {};
  const failing = signals.filter(s => s.status === 'fail');
  const warnings = signals.filter(s => s.status === 'warn');
  const passing = signals.filter(s => s.status === 'pass');

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Edit3 size={20} color="#3b82f6" /> Content Rewriter
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Full Google crawl view + content improvements with before/after code</p>
        </div>

        <div style={{ marginBottom: 12 }}>
          <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, background: '#fff', cursor: 'pointer' }}>
            {pages.map((p, i) => <option key={i} value={i}>{p.title || p.url} ({p.word_count || 0}w)</option>)}
          </select>
        </div>

        {mega && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 16px' }}>
            <ScoreRing score={mega.overall_score} size={60} label="SCORE" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{mega.page_title || page.title || page.url}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {mega.word_count || page.word_count || 0} words | {mega.signals_checked} signals checked
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>{mega.signals_passing}</div><div style={{ fontSize: 9, color: '#059669' }}>PASS</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 800, color: '#d97706' }}>{mega.signals_warning}</div><div style={{ fontSize: 9, color: '#d97706' }}>WARN</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>{mega.signals_failing}</div><div style={{ fontSize: 9, color: '#dc2626' }}>FAIL</div></div>
            </div>
            <PlatformScoresBar platformScores={platformScores} />
          </div>
        )}

        {pageLoading ? (
          <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <RefreshCw size={28} className="spin" color="#3b82f6" />
            <p style={{ marginTop: 10, fontSize: 13, color: '#64748b', fontWeight: 600 }}>Analyzing content...</p>
            <p style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>First visit ~45s (cached after this)</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 3 }}>
                {[
                  { key: 'pageview', label: 'Page View', icon: Eye },
                  { key: 'google', label: 'Google Sees', icon: Globe },
                  { key: 'missing', label: `What is Missing (${failing.length + warnings.length})`, icon: XCircle },
                  { key: 'add', label: 'What to Add', icon: Plus },
                  { key: 'keywords', label: 'Keyword Improvements', icon: Key },
                  { key: 'signals', label: `All ${signals.length} Signals`, icon: Sparkles },
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.key} onClick={() => setLeftTab(t.key)} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 8px',
                      border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      background: leftTab === t.key ? '#1e293b' : 'transparent',
                      color: leftTab === t.key ? '#fff' : '#64748b',
                    }}>
                      <Icon size={12} /> {t.label}
                    </button>
                  );
                })}
              </div>

              {leftTab === 'pageview' && (
                <PageVisualView
                  content={rewrite?.current_content || page.content_text || ''}
                  signals={signals}
                  issues={issues}
                  page={page}
                  mega={mega}
                  catScores={catScores}
                  platformScores={platformScores}
                />
              )}

              {leftTab === 'google' && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                    {GOOGLE_TABS.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button key={tab.key} onClick={() => setGoogleSubTab(tab.key)}
                          style={{ padding: '5px 10px', border: '1px solid', borderRadius: 5, fontSize: 10, cursor: 'pointer', fontWeight: 600,
                            background: googleSubTab === tab.key ? '#3b82f6' : '#fff', color: googleSubTab === tab.key ? '#fff' : '#475569', borderColor: googleSubTab === tab.key ? '#3b82f6' : '#e2e8f0',
                            display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Icon size={10} /> {tab.label}
                        </button>
                      );
                    })}
                  </div>
                  {googleSubTab === 'googlebot' && <GoogleCrawlView sv={sv} />}
                  {googleSubTab === 'browser' && <GenericSubView title="Browser View" icon={Eye} data={sv.browser_view} />}
                  {googleSubTab === 'mobile' && <GenericSubView title="Mobile View" icon={Smartphone} data={sv.mobile_view} />}
                  {googleSubTab === 'headings' && <GenericSubView title="Heading Hierarchy" icon={Heading} data={sv.heading_hierarchy} />}
                  {googleSubTab === 'schema' && <GenericSubView title="Schema Markup" icon={FileJson} data={sv.schema_viewer} />}
                  {googleSubTab === 'entities' && <GenericSubView title="Entity Extraction" icon={Database} data={sv.entity_extraction} />}
                  {googleSubTab === 'content_blocks' && <GenericSubView title="Content Blocks" icon={Columns} data={sv.content_blocks} />}
                  {googleSubTab === 'keywords' && <GenericSubView title="Keyword Map" icon={Key} data={sv.keyword_map} />}
                  {googleSubTab === 'internal_links' && <GenericSubView title="Internal Links" icon={Link2} data={sv.internal_link_graph} />}
                  {googleSubTab === 'external_links' && <GenericSubView title="External Links" icon={ExternalLink} data={sv.external_link_graph} />}
                  {googleSubTab === 'cwv' && <GenericSubView title="Core Web Vitals" icon={Gauge} data={sv.core_web_vitals} />}
                  {googleSubTab === 'security' && <GenericSubView title="Security" icon={Shield} data={sv.security_issues} />}
                  {googleSubTab === 'indexability' && <GenericSubView title="Indexability" icon={CheckCircle} data={sv.indexability_status} />}
                  {googleSubTab === 'canonical' && <GenericSubView title="Canonical" icon={Copy} data={sv.canonical_validation} />}
                  {googleSubTab === 'eeat' && <GenericSubView title="E-E-A-T" icon={Users} data={sv.eeat_analysis} />}
                  {googleSubTab === 'ai_citation' && <GenericSubView title="AI Citation" icon={MessageSquare} data={sv.ai_citation_readiness} />}
                </div>
              )}

              {leftTab === 'missing' && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                    {MISSING_TABS.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button key={tab.key} onClick={() => setMissingSubTab(tab.key)}
                          style={{ padding: '5px 10px', border: '1px solid', borderRadius: 5, fontSize: 10, cursor: 'pointer', fontWeight: 600,
                            background: missingSubTab === tab.key ? '#3b82f6' : '#fff', color: missingSubTab === tab.key ? '#fff' : '#475569', borderColor: missingSubTab === tab.key ? '#3b82f6' : '#e2e8f0',
                            display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Icon size={10} /> {tab.label}
                        </button>
                      );
                    })}
                  </div>
                  {missingSubTab === 'failing' && <MissingSignalsView signals={signals} />}
                  {missingSubTab === 'warnings' && <MissingSignalsView signals={signals.filter(s => s.status === 'warn')} />}
                  {missingSubTab === 'category_gaps' && <CategoryGapsView catScores={catScores} />}
                  {missingSubTab === 'quick_wins' && <QuickWinsView signals={signals} />}
                </div>
              )}

              {leftTab === 'add' && (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#059669', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={16} color="#059669" /> What to Add to This Page
                  </div>
                  {[
                    { signal: signals.find(s => s.id === 'S004'), title: 'Breadcrumb Schema', desc: 'Add BreadcrumbList schema for navigation context' },
                    { signal: signals.find(s => s.id === 'AS009'), title: 'Article Schema', desc: 'Add Article schema for content pages' },
                    { signal: signals.find(s => s.id === 'CS001'), title: 'Tables', desc: 'Add comparison tables for better content structure' },
                    { signal: signals.find(s => s.id === 'CS007'), title: 'Table of Contents', desc: 'Add jump-to-section TOC for long content' },
                    { signal: signals.find(s => s.id === 'AI004'), title: 'Structured Lists', desc: 'Add bulleted/numbered lists for AI search parsing' },
                    { signal: signals.find(s => s.id === 'FR001'), title: 'Date/Freshness Signals', desc: 'Add last-updated date and publication date' },
                    { signal: signals.find(s => s.id === 'V001'), title: 'Embedded Video', desc: 'Embed related video content if mentioned' },
                    { signal: signals.find(s => s.id === 'AC009'), title: 'Code Examples', desc: 'Add code snippets for technical content' },
                    { signal: signals.find(s => s.id === 'VS005'), title: 'Definitions/Glossary', desc: 'Add key term definitions for voice search' },
                    { signal: signals.find(s => s.id === 'AC030'), title: 'Conclusion Section', desc: 'Add a proper conclusion/summary section' },
                    { signal: signals.find(s => s.id === 'SH004'), title: 'Semantic HTML', desc: 'Use article, section, nav, aside elements' },
                    { signal: signals.find(s => s.id === 'AT025'), title: 'Resource Hints', desc: 'Add preconnect, prefetch for critical resources' },
                  ].filter(item => item.signal && item.signal.status !== 'pass').map((item, i) => (
                    <div key={i} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', marginBottom: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: '#7f1d1d', lineHeight: 1.5 }}>{item.desc}</div>
                      {item.signal?.how_to_fix && <div style={{ fontSize: 10, color: '#059669', marginTop: 3, lineHeight: 1.5 }}><strong>How to fix:</strong> {item.signal.how_to_fix}</div>}
                      {item.signal?.before_code && item.signal?.after_code && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
                          <div style={{ background: '#1e293b', borderRadius: 5, padding: 6 }}><div style={{ fontSize: 7, color: '#f87171', marginBottom: 1, fontWeight: 700 }}>BEFORE</div><pre style={{ fontSize: 9, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{item.signal.before_code}</pre></div>
                          <div style={{ background: '#1e293b', borderRadius: 5, padding: 6 }}><div style={{ fontSize: 7, color: '#34d399', marginBottom: 1, fontWeight: 700 }}>AFTER</div><pre style={{ fontSize: 9, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{item.signal.after_code}</pre></div>
                        </div>
                      )}
                    </div>
                  ))}
                  {signals.filter(s => s.status !== 'pass').length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center' }}><CheckCircle size={28} color="#059669" /><p style={{ color: '#059669', fontWeight: 600, marginTop: 8 }}>Page looks good, nothing critical missing</p></div>
                  )}
                </div>
              )}

              {leftTab === 'keywords' && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                    {KEYWORD_TABS.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button key={tab.key} onClick={() => setKwSubTab(tab.key)}
                          style={{ padding: '5px 10px', border: '1px solid', borderRadius: 5, fontSize: 10, cursor: 'pointer', fontWeight: 600,
                            background: kwSubTab === tab.key ? '#3b82f6' : '#fff', color: kwSubTab === tab.key ? '#fff' : '#475569', borderColor: kwSubTab === tab.key ? '#3b82f6' : '#e2e8f0',
                            display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Icon size={10} /> {tab.label}
                        </button>
                      );
                    })}
                  </div>
                  <KeywordImprovementsView mega={mega} rewrite={rewrite} signals={signals} />
                </div>
              )}

              {leftTab === 'signals' && (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} color="#3b82f6" /> All {signals.length} Signals Analyzed
                  </div>
                  {Object.entries(SIGNAL_CATEGORIES).map(([cat, catInfo]) => {
                    const catSignals = signals.filter(s => s.category === cat);
                    if (catSignals.length === 0) return null;
                    const failingCount = catSignals.filter(s => s.status === 'fail').length;
                    const warnCount = catSignals.filter(s => s.status === 'warn').length;
                    const passCount = catSignals.filter(s => s.status === 'pass').length;
                    return (
                      <div key={cat} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '4px 8px', background: '#f8fafc', borderRadius: 5 }}>
                          <catInfo.icon size={12} color={catInfo.color} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', flex: 1 }}>{catInfo.label}</span>
                          <span style={{ fontSize: 9, color: '#059669', fontWeight: 600 }}>{passCount} pass</span>
                          {warnCount > 0 && <span style={{ fontSize: 9, color: '#d97706', fontWeight: 600 }}>{warnCount} warn</span>}
                          {failingCount > 0 && <span style={{ fontSize: 9, color: '#dc2626', fontWeight: 600 }}>{failingCount} fail</span>}
                        </div>
                        {catSignals.map((s, i) => <SignalCard key={i} signal={s} index={i} />)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 3 }}>
                {[
                  { key: 'issues', label: `Issues & Fixes (${issues.length})`, icon: AlertTriangle },
                  { key: 'serp', label: 'SERP Preview', icon: Target },
                  { key: 'platforms', label: 'Platform', icon: BarChart3 },
                  { key: 'readability', label: 'Readability', icon: Brain },
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.key} onClick={() => setRightTab(t.key)} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '6px 6px',
                      border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 9, fontWeight: 600,
                      background: rightTab === t.key ? '#3b82f6' : 'transparent',
                      color: rightTab === t.key ? '#fff' : '#64748b',
                    }}>
                      <Icon size={10} /> {t.label}
                    </button>
                  );
                })}
              </div>

              {rightTab === 'issues' && (
                <div>
                  {issues.length > 0 ? issues.map((issue, i) => <IssueCard key={i} issue={issue} index={i} />) : (
                    <div style={{ padding: 24, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <CheckCircle size={28} color="#059669" />
                      <p style={{ marginTop: 6, color: '#059669', fontWeight: 600, fontSize: 12 }}>No content issues found</p>
                    </div>
                  )}
                </div>
              )}

              {rightTab === 'serp' && (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Google SERP Preview</div>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 12px' }}>How your page appears in Google search results</p>
                  <SerpPreview title={rewrite?.title || page.title} url={page.url} description={rewrite?.meta_description || page.meta_description} />
                  {rewrite?.targets && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', marginBottom: 6 }}>Target Keywords</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {Array.isArray(rewrite.targets) ? rewrite.targets.map((kw, i) => <span key={i} style={{ fontSize: 10, padding: '2px 6px', background: '#eff6ff', borderRadius: 4, color: '#2563eb', fontWeight: 500 }}>{kw}</span>) : null}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {rightTab === 'platforms' && (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Platform Readiness</div>
                  <PlatformScoresBar platformScores={platformScores} />
                  {catScores && Object.keys(catScores).filter(k => catScores[k] < 100).length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Category Scores (below 100%)</div>
                      {Object.entries(catScores).filter(([_, v]) => v < 100).sort((a, b) => a[1] - b[1]).slice(0, 15).map(([cat, score]) => (
                        <div key={cat} style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 9, color: '#64748b', textTransform: 'capitalize' }}>{(SIGNAL_CATEGORIES[cat]?.label || cat).replace(/_/g, ' ')}</div>
                            <div style={{ height: 2, background: '#e2e8f0', borderRadius: 1, marginTop: 1 }}><div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626', borderRadius: 1 }} /></div>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626' }}>{Math.round(score)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {rightTab === 'readability' && (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Content Quality Analysis</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      { label: 'Word Count', value: mega?.word_count || page.word_count || 0, color: '#3b82f6' },
                      { label: 'Sentences', value: readability.sentence_count || 'N/A', color: '#8b5cf6' },
                      { label: 'Avg Sentence', value: readability.avg_sentence_length ? `${readability.avg_sentence_length}w` : 'N/A', color: '#d97706' },
                      { label: 'Readability', value: typeof readability === 'number' ? readability : (readability.score || readability.flesch_kincaid || 'N/A'), color: '#059669' },
                    ].map((s, i) => (
                      <div key={i} style={{ padding: 10, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 9, color: '#64748b' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <SerpPreview title={rewrite?.title || page.title} url={page.url} description={rewrite?.meta_description || page.meta_description} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
