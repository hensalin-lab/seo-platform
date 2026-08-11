import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import {
  Wand2, AlertTriangle, CheckCircle, ChevronDown, Target, BarChart3, Brain,
  RefreshCw, Copy, Sparkles, Globe, Eye, Smartphone, Heading, Link2,
  ExternalLink, Columns, Key, FileJson, Shield, Code, Gauge, Database,
  Users, MessageSquare, HelpCircle, Activity, Lightbulb, Zap, TrendingUp,
  Search, Layout, Clock, Image, Tag, ArrowRight, XCircle,
  ListOrdered, Hash, AlignLeft, Quote, Video, Plus, FileText,
} from 'lucide-react';
import ThemeHero from '../../../components/ai/ThemeHero';
import ThemeStatCard from '../../../components/ai/ThemeStatCard';
import ThemePillTabs from '../../../components/ai/ThemePillTabs';
import GooglebotView from '../../../components/GooglebotView';
import { EmptyState, LoadingState } from '../../../components/States';
import ScoreRing from '../../../components/ScoreRing';

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
    <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg, #1e293b, #334155)', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Eye size={16} color="#60a5fa" /> Actual Page View with Content Markers
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          Visual audit of your actual page content - green markers = good, orange = needs work, red = critical
        </div>
      </div>

      <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginRight: 4 }}>FILTER:</span>
        {[
          { key: 'all', label: `All (${blocks.length})`, color: 'var(--text-muted)' },
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
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid var(--border)' }}>
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

        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid var(--border)' }}>
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
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>- {wordCount} words total</span>
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
                    <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>{block.wordCount}w</span>
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

        <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 size={12} color="#3b82f6" /> Content Quality Summary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-white)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{wordCount}</div>
              <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>Words</div>
            </div>
            <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-white)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#8b5cf6' }}>{blocks.length}</div>
              <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>Blocks</div>
            </div>
            <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-white)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(mega?.overall_score || 0) }}>{Math.round(mega?.overall_score || 0)}</div>
              <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>Score</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>BLOCK SCORE DISTRIBUTION</div>
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
  crawlability: { label: 'Crawlability', icon: Search, color: 'var(--text-muted)' },
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
  technical_integrity: { label: 'Technical Integrity', icon: Shield, color: 'var(--text-muted)' },
};

function BoolField({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 7, height: 7, borderRadius: 4, background: value ? '#059669' : '#dc2626', flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: value ? '#059669' : '#dc2626' }}>{value ? 'Yes' : 'No'}</span>
    </div>
  );
}

function MetricField({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: color || '#1e293b' }}>{value}</span>
    </div>
  );
}

function ListView({ items, label }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase' }}>{label} ({items.length})</div>
      {items.slice(0, 12).map((item, i) => (
        <div key={i} style={{ padding: '3px 6px', fontSize: 11, color: '#475569', borderBottom: '1px solid #f8fafc' }}>
          {typeof item === 'string' ? item : item.text || item.url || JSON.stringify(item).slice(0, 80)}
        </div>
      ))}
      {items.length > 12 && <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '3px 6px' }}>+{items.length - 12} more</div>}
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
    <div style={{ border: `1px solid ${sc}30`, borderRadius: 8, marginBottom: 4, background: 'var(--bg-white)', borderLeft: `3px solid ${sc}` }}>
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
            {signal.effort && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Effort: {signal.effort}</span>}
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
  if (!data || typeof data !== 'object') return <EmptyState title={`No data for ${title}`} description={`This audit didn't capture data for ${title}. Run a fresh audit to populate it.`} />;
  return (
    <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
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
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: 'var(--bg-white)' }}>
      <div style={{ fontSize: 16, color: '#1a0dab', fontWeight: 400, lineHeight: 1.3, marginBottom: 2 }}>{(title || 'Page Title').slice(0, 60)}</div>
      <div style={{ fontSize: 12, color: '#006621', marginBottom: 3 }}>{url || 'https://example.com'}</div>
      <div style={{ fontSize: 12, color: '#545454', lineHeight: 1.4 }}>{(description || 'Meta description preview...').slice(0, 160)}</div>
    </div>
  );
}

function GoogleCrawlView({ sv }) {
  if (!sv) return <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 11 }}>Loading Google crawl data...</div>;
  return <GooglebotView data={sv.googlebot_view || {}} />;
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
    <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <XCircle size={16} color="#dc2626" /> What Google Does Not Like - {failing.length} Failing, {warnings.length} Warnings
      </div>
      {failing.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6, textTransform: 'uppercase' }}>Critical Failures ({failing.length})</div>
          {Object.entries(failByCategory).map(([cat, sigs]) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'capitalize' }}>{(SIGNAL_CATEGORIES[cat]?.label || cat).replace(/_/g, ' ')} ({sigs.length})</div>
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
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'capitalize' }}>{(SIGNAL_CATEGORIES[cat]?.label || cat).replace(/_/g, ' ')} ({sigs.length})</div>
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
    <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
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
    <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
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
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No quick win signals found</div>
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
    <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
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
      <div style={{ padding: 8, background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>CONTENT KEYWORD COVERAGE</div>
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
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 4, background: 'var(--bg-white)', borderLeft: `3px solid ${sc}` }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 8 }}>
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
          {issue.location && <div style={{ padding: '6px 8px', background: '#eff6ff', borderRadius: 5, border: '1px solid #bfdbfe', marginBottom: 4, fontSize: 10, color: '#1e40af', lineHeight: 1.5 }}><strong>Where:</strong> {issue.location}</div>}
          {issue.exact_text && <div style={{ padding: '6px 8px', background: '#1e293b', borderRadius: 5, border: '1px solid #334155', marginBottom: 4, fontSize: 10, color: '#fda4af', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><strong style={{ color: '#f87171' }}>Current text:</strong> {issue.exact_text}</div>}
          {issue.replacement && <div style={{ padding: '6px 8px', background: '#f0fdf4', borderRadius: 5, border: '1px solid #bbf7d0', marginBottom: 4, fontSize: 10, color: '#065f46', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><strong style={{ color: '#059669' }}>Replace with:</strong> {issue.replacement}</div>}
          {issue.fix && <div style={{ padding: '6px 8px', background: '#fefce8', borderRadius: 5, border: '1px solid #fef08a', marginBottom: 4, fontSize: 10, color: '#713f12', lineHeight: 1.5 }}><strong>Fix:</strong> {issue.fix}</div>}
          {Array.isArray(issue.steps) && issue.steps.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>STEPS</div>
              {issue.steps.map((s, si) => (
                <div key={si} style={{ display: 'flex', gap: 6, fontSize: 10, color: '#334155', lineHeight: 1.5, marginBottom: 2 }}>
                  <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: 8, background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{si + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
          {(issue.before_code || issue.after_code || issue.code_example) && (
            <div style={{ display: 'grid', gridTemplateColumns: issue.before_code && issue.after_code ? '1fr 1fr' : '1fr', gap: 4, marginTop: 4 }}>
              {issue.before_code && <div style={{ background: '#1e293b', borderRadius: 5, padding: 6 }}><div style={{ fontSize: 7, color: '#f87171', marginBottom: 1, fontWeight: 700 }}>BEFORE</div><pre style={{ fontSize: 9, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{issue.before_code}</pre></div>}
              {issue.after_code && <div style={{ background: '#1e293b', borderRadius: 5, padding: 6 }}><div style={{ fontSize: 7, color: '#34d399', marginBottom: 1, fontWeight: 700 }}>AFTER</div><pre style={{ fontSize: 9, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{issue.after_code}</pre></div>}
              {!issue.before_code && !issue.after_code && issue.code_example && <div style={{ background: '#1e293b', borderRadius: 5, padding: 6 }}><pre style={{ fontSize: 9, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{issue.code_example}</pre></div>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {issue.expected_impact && <span style={{ fontSize: 9, color: '#059669', fontWeight: 600 }}>Impact: {issue.expected_impact}</span>}
            {issue.effort && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Effort: {issue.effort}</span>}
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
          <div key={platform} style={{ padding: '8px 6px', borderRadius: 6, border: `1px solid ${c}30`, background: 'var(--bg-white)', textAlign: 'center' }}>
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
  }, [id, selectedIdx, pages.length]);

  if (loading) return <LoadingState message="Loading page data…" />;
  if (!pages.length) return <EmptyState title="No pages found" description="Run an audit to crawl pages and rewrite their content." />;

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
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <ThemeHero
          icon={Wand2}
          title="Content Rewriter & Optimizer"
          subtitle="Analyze, rewrite, and optimize your content for SEO, AI visibility, and readability"
          badges={[
            { icon: Sparkles, t: 'AI rewrite suggestions' },
            { icon: Globe, t: '16 SEO sub-views' },
            { icon: Brain, t: 'Predicted score improvements' },
          ]}
        />

        <div style={{ marginBottom: 12 }}>
          <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, background: 'var(--bg-white)', cursor: 'pointer' }}>
            {pages.map((p, i) => <option key={i} value={i}>{p.title || p.url} ({p.word_count || 0}w)</option>)}
          </select>
        </div>

        {mega && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: '12px 16px' }}>
            <ScoreRing score={mega.overall_score} size={60} label="SCORE" stroke={5} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{mega.page_title || page.title || page.url}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {mega.word_count || page.word_count || 0} words | {mega.signals_checked} signals checked
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <ThemeStatCard icon={CheckCircle} label="PASS" value={mega.signals_passing} color="#059669" />
              <ThemeStatCard icon={AlertTriangle} label="WARN" value={mega.signals_warning} color="#d97706" />
              <ThemeStatCard icon={XCircle} label="FAIL" value={mega.signals_failing} color="#dc2626" />
            </div>
            <PlatformScoresBar platformScores={platformScores} />
          </div>
        )}

        {pageLoading ? (
          <div style={{ padding: 60, textAlign: 'center', background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <RefreshCw size={28} className="spin" color="#3b82f6" />
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Analyzing content...</p>
            <p style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>First visit ~45s (cached after this)</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
            <div>
              <ThemePillTabs
                tabs={[
                  { key: 'pageview', label: 'Page View', icon: Eye },
                  { key: 'google', label: 'Google Sees', icon: Globe },
                  { key: 'missing', label: `What is Missing (${failing.length + warnings.length})`, icon: XCircle },
                  { key: 'add', label: 'What to Add', icon: Plus },
                  { key: 'keywords', label: 'Keyword Improvements', icon: Key },
                  { key: 'signals', label: `All ${signals.length} Signals`, icon: Sparkles },
                ]}
                active={leftTab}
                onChange={setLeftTab}
                style={{ marginBottom: 10 }}
              />

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
                  <ThemePillTabs tabs={GOOGLE_TABS} active={googleSubTab} onChange={setGoogleSubTab} style={{ marginBottom: 10 }} />
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
                  <ThemePillTabs tabs={MISSING_TABS} active={missingSubTab} onChange={setMissingSubTab} style={{ marginBottom: 10 }} />
                  {missingSubTab === 'failing' && <MissingSignalsView signals={signals} />}
                  {missingSubTab === 'warnings' && <MissingSignalsView signals={signals.filter(s => s.status === 'warn')} />}
                  {missingSubTab === 'category_gaps' && <CategoryGapsView catScores={catScores} />}
                  {missingSubTab === 'quick_wins' && <QuickWinsView signals={signals} />}
                </div>
              )}

              {leftTab === 'add' && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
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
                  <ThemePillTabs tabs={KEYWORD_TABS} active={kwSubTab} onChange={setKwSubTab} style={{ marginBottom: 10 }} />
                  <KeywordImprovementsView mega={mega} rewrite={rewrite} signals={signals} />
                </div>
              )}

              {leftTab === 'signals' && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: 5 }}>
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
              <ThemePillTabs
                tabs={[
                  { key: 'issues', label: `Issues (${issues.length})`, icon: AlertTriangle },
                  { key: 'rewrite', label: 'AI Rewrite', icon: Sparkles },
                  { key: 'eeat', label: 'E-E-A-T', icon: Users },
                  { key: 'keywords', label: 'AI Keywords', icon: Key },
                  { key: 'faq', label: 'FAQ + Schema', icon: HelpCircle },
                  { key: 'links', label: 'Int. Links', icon: Link2 },
                  { key: 'serp', label: 'SERP Preview', icon: Target },
                  { key: 'readability', label: 'Readability', icon: Brain },
                  { key: 'export', label: 'Export All', icon: Copy },
                ]}
                active={rightTab}
                onChange={setRightTab}
                style={{ marginBottom: 10 }}
              />

              {rightTab === 'issues' && (
                <div>
                  {issues.length > 0 ? issues.map((issue, i) => <IssueCard key={i} issue={issue} index={i} />) : (
                    <div style={{ padding: 24, background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
                      <CheckCircle size={28} color="#059669" />
                      <p style={{ marginTop: 6, color: '#059669', fontWeight: 600, fontSize: 12 }}>No content issues found</p>
                    </div>
                  )}
                </div>
              )}

              {rightTab === 'rewrite' && rewrite?.ai_rewrite && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#7950f2" /> AI Content Rewrite
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>Before/after rewrites with impact ratings</p>

                  {rewrite.ai_rewrite.title_suggestions?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>TITLE SUGGESTIONS</div>
                      {rewrite.ai_rewrite.title_suggestions.map((t, i) => (
                        <div key={i} style={{ padding: '6px 8px', background: '#eff6ff', borderRadius: 5, border: '1px solid #bfdbfe', marginBottom: 3, fontSize: 11, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700 }}>{i + 1}.</span> {t}
                          <button onClick={() => navigator.clipboard?.writeText(t)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Copy size={10} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {rewrite.ai_rewrite.meta_description_suggestions?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>META DESCRIPTION SUGGESTIONS</div>
                      {rewrite.ai_rewrite.meta_description_suggestions.map((m, i) => (
                        <div key={i} style={{ padding: '6px 8px', background: '#f5f3ff', borderRadius: 5, border: '1px solid #ddd6fe', marginBottom: 3, fontSize: 11, color: '#5b21b6', lineHeight: 1.5 }}>
                          {m}
                          <button onClick={() => navigator.clipboard?.writeText(m)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Copy size={10} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {rewrite.ai_rewrite.rewrite_sections?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 6 }}>SECTION REWRITES ({rewrite.ai_rewrite.rewrite_sections.length})</div>
                      {rewrite.ai_rewrite.rewrite_sections.map((s, i) => (
                        <div key={i} style={{ marginBottom: 10, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                          <div style={{ padding: '8px 10px', background: 'var(--bg-secondary)', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', flex: 1 }}>{s.section || `Section ${i + 1}`}</span>
                            {s.impact && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: s.impact === 'high' ? '#dc262615' : s.impact === 'medium' ? '#d9770615' : '#2563eb15', color: s.impact === 'high' ? '#dc2626' : s.impact === 'medium' ? '#d97706' : '#2563eb', fontWeight: 700 }}>{s.impact}</span>}
                            {s.keyword_placement && <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>KW: {s.keyword_placement}</span>}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                            <div style={{ padding: 8, borderRight: '1px solid #e2e8f0', background: '#fef2f2' }}>
                              <div style={{ fontSize: 7, color: '#dc2626', fontWeight: 700, marginBottom: 2 }}>BEFORE</div>
                              <div style={{ fontSize: 10, color: '#7f1d1d', lineHeight: 1.5, maxHeight: 100, overflow: 'auto' }}>{s.current_text || '—'}</div>
                            </div>
                            <div style={{ padding: 8, background: '#f0fdf4' }}>
                              <div style={{ fontSize: 7, color: '#059669', fontWeight: 700, marginBottom: 2 }}>AFTER</div>
                              <div style={{ fontSize: 10, color: '#065f46', lineHeight: 1.5, maxHeight: 100, overflow: 'auto' }}>{s.improved_text || '—'}</div>
                            </div>
                          </div>
                          {s.reason && <div style={{ padding: '4px 10px', fontSize: 9, color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderTop: '1px solid #e2e8f0' }}>Why: {s.reason}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {rewrite.ai_rewrite.new_content_suggestions?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#7950f2', marginBottom: 6 }}>NEW CONTENT TO ADD</div>
                      {rewrite.ai_rewrite.new_content_suggestions.map((s, i) => (
                        <div key={i} style={{ padding: '8px 10px', background: '#faf5ff', borderRadius: 6, border: '1px solid #e9d5ff', marginBottom: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b21a8', marginBottom: 2 }}>{s.section}</div>
                          <div style={{ fontSize: 10, color: '#4c1d95', lineHeight: 1.5 }}>{s.content}</div>
                          {s.why && <div style={{ fontSize: 9, color: '#7c3aed', marginTop: 3 }}>Why: {s.why}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {rewrite.ai_rewrite.h1_rewrite && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#e11d48', marginBottom: 4 }}>H1 REWRITE</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ padding: 8, background: '#fef2f2', borderRight: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: 7, color: '#dc2626', fontWeight: 700, marginBottom: 2 }}>BEFORE</div>
                          <div style={{ fontSize: 12, color: '#7f1d1d', fontWeight: 500 }}>{rewrite.ai_rewrite.h1_rewrite.before}</div>
                        </div>
                        <div style={{ padding: 8, background: '#f0fdf4' }}>
                          <div style={{ fontSize: 7, color: '#059669', fontWeight: 700, marginBottom: 2 }}>AFTER</div>
                          <div style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>{rewrite.ai_rewrite.h1_rewrite.after}</div>
                        </div>
                      </div>
                      {rewrite.ai_rewrite.h1_rewrite.reason && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>Why: {rewrite.ai_rewrite.h1_rewrite.reason}</div>}
                    </div>
                  )}

                  {rewrite.ai_rewrite.intro_rewrite && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', marginBottom: 4 }}>INTRODUCTION REWRITE</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ padding: 8, background: '#fef2f2', borderRight: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: 7, color: '#dc2626', fontWeight: 700, marginBottom: 2 }}>BEFORE</div>
                          <div style={{ fontSize: 10, color: '#7f1d1d', lineHeight: 1.5 }}>{rewrite.ai_rewrite.intro_rewrite.before}</div>
                        </div>
                        <div style={{ padding: 8, background: '#f0fdf4' }}>
                          <div style={{ fontSize: 7, color: '#059669', fontWeight: 700, marginBottom: 2 }}>AFTER</div>
                          <div style={{ fontSize: 10, color: '#065f46', lineHeight: 1.5 }}>{rewrite.ai_rewrite.intro_rewrite.after}</div>
                        </div>
                      </div>
                      {rewrite.ai_rewrite.intro_rewrite.improvements?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {rewrite.ai_rewrite.intro_rewrite.improvements.map((imp, i) => (
                            <span key={i} style={{ fontSize: 8, padding: '2px 5px', borderRadius: 3, background: '#f0fdf4', color: '#059669', fontWeight: 600, border: '1px solid #bbf7d0' }}>{imp}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {rewrite.ai_rewrite.entity_suggestions && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#7950f2', marginBottom: 4 }}>ENTITY OPTIMIZATION</div>
                      {rewrite.ai_rewrite.entity_suggestions.missing?.length > 0 && (
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Missing entities: </span>
                          {rewrite.ai_rewrite.entity_suggestions.missing.map((e, i) => (
                            <span key={i} style={{ fontSize: 9, padding: '1px 4px', background: '#fef2f2', color: '#dc2626', borderRadius: 3, marginRight: 3, fontWeight: 600 }}>{e}</span>
                          ))}
                        </div>
                      )}
                      {rewrite.ai_rewrite.entity_suggestions.paragraph && (
                        <div style={{ padding: '6px 8px', background: '#f5f3ff', borderRadius: 5, border: '1px solid #e9d5ff', fontSize: 10, color: '#4c1d95', lineHeight: 1.5 }}>
                          Suggested paragraph: {rewrite.ai_rewrite.entity_suggestions.paragraph}
                          <button onClick={() => navigator.clipboard?.writeText(rewrite.ai_rewrite.entity_suggestions.paragraph)}
                            style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Copy size={9} /></button>
                        </div>
                      )}
                    </div>
                  )}

                  {rewrite.ai_rewrite.comparison_table && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 4 }}>GENERATED COMPARISON TABLE</div>
                      <div style={{ overflow: 'auto', borderRadius: 6, border: '1px solid var(--border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                              {(rewrite.ai_rewrite.comparison_table.headers || []).map((h, i) => (
                                <th key={i} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(rewrite.ai_rewrite.comparison_table.rows || []).map((row, ri) => (
                              <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                {row.map((cell, ci) => (
                                  <td key={ci} style={{ padding: '4px 8px', color: '#475569' }}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {rewrite.ai_rewrite.ai_overview_optimization && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#4285f4', marginBottom: 4 }}>AI OVERVIEW OPTIMIZATION</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ padding: 8, background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
                          <div style={{ fontSize: 8, fontWeight: 700, color: '#dc2626', marginBottom: 2 }}>CURRENT AI ANSWER ({rewrite.ai_rewrite.ai_overview_optimization.citation_probability_current || 0}%)</div>
                          <div style={{ fontSize: 10, color: '#7f1d1d', lineHeight: 1.5 }}>{rewrite.ai_rewrite.ai_overview_optimization.current_answer}</div>
                        </div>
                        <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: 8, fontWeight: 700, color: '#059669', marginBottom: 2 }}>OPTIMIZED AI ANSWER ({rewrite.ai_rewrite.ai_overview_optimization.citation_probability_optimized || 0}%)</div>
                          <div style={{ fontSize: 10, color: '#065f46', lineHeight: 1.5 }}>{rewrite.ai_rewrite.ai_overview_optimization.optimized_answer}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {rewrite.ai_rewrite.score_predictions && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>PREDICTED IMPROVEMENTS</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                        {[
                          { label: 'SEO', current: rewrite.ai_rewrite.score_predictions.seo_current, after: rewrite.ai_rewrite.score_predictions.seo_after, color: '#3b82f6' },
                          { label: 'AI Search', current: rewrite.ai_rewrite.score_predictions.ai_search_current, after: rewrite.ai_rewrite.score_predictions.ai_search_after, color: '#e64980' },
                          { label: 'Readability', current: rewrite.ai_rewrite.score_predictions.readability_current, after: rewrite.ai_rewrite.score_predictions.readability_after, color: '#059669' },
                        ].map((s, i) => (
                          <div key={i} style={{ padding: 8, background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-muted)' }}>{s.current || '—'}</div>
                            <div style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>→ {s.after || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rewrite.ai_rewrite.readability_rewrite && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>READABILITY REWRITE</div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef2f2', color: '#dc2626', borderRadius: 3, fontWeight: 600 }}>Current: {rewrite.ai_rewrite.readability_rewrite.current_level}</span>
                        <span style={{ fontSize: 9, padding: '2px 6px', background: '#f0fdf4', color: '#059669', borderRadius: 3, fontWeight: 600 }}>Target: {rewrite.ai_rewrite.readability_rewrite.target_level}</span>
                      </div>
                      {rewrite.ai_rewrite.readability_rewrite.rewritten_intro && (
                        <div style={{ padding: '6px 8px', background: '#eff6ff', borderRadius: 5, border: '1px solid #bfdbfe', fontSize: 10, color: '#1e40af', lineHeight: 1.5 }}>
                          {rewrite.ai_rewrite.readability_rewrite.rewritten_intro}
                        </div>
                      )}
                    </div>
                  )}

                  {(!rewrite.ai_rewrite.rewrite_sections || rewrite.ai_rewrite.rewrite_sections.length === 0) && !rewrite.ai_rewrite.title_suggestions?.length && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>AI rewrite data loading... Select a different page and re-run to see suggestions.</div>
                  )}
                </div>
              )}

              {rightTab === 'rewrite' && !rewrite?.ai_rewrite && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 24, textAlign: 'center' }}>
                  <Sparkles size={24} color="#94a3b8" />
                  <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 12 }}>AI Rewrite suggestions loading...</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>First load takes ~15s (cached after)</p>
                </div>
              )}

              {rightTab === 'eeat' && rewrite?.ai_eeat && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} color="#f59e0b" /> E-E-A-T Analysis
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>Experience, Expertise, Authoritativeness, Trustworthiness</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: 'Overall E-E-A-T', value: rewrite.ai_eeat.overall_eeat, color: '#f59e0b' },
                      { label: 'Experience', value: rewrite.ai_eeat.experience_score, color: '#3b82f6' },
                      { label: 'Expertise', value: rewrite.ai_eeat.expertise_score, color: '#7950f2' },
                      { label: 'Authoritativeness', value: rewrite.ai_eeat.authoritativeness_score, color: '#059669' },
                      { label: 'Trustworthiness', value: rewrite.ai_eeat.trustworthiness_score, color: '#10b981' },
                    ].map((item, i) => (
                      <div key={i} style={{ padding: 8, background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value ?? '—'}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {rewrite.ai_eeat.strengths?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 4 }}>STRENGTHS</div>
                      {rewrite.ai_eeat.strengths.map((s, i) => (
                        <div key={i} style={{ padding: '4px 8px', fontSize: 11, color: '#065f46', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={10} color="#059669" /> {s}</div>
                      ))}
                    </div>
                  )}

                  {rewrite.ai_eeat.weaknesses?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>WEAKNESSES</div>
                      {rewrite.ai_eeat.weaknesses.map((w, i) => (
                        <div key={i} style={{ padding: '4px 8px', fontSize: 11, color: '#7f1d1d', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10} color="#dc2626" /> {w}</div>
                      ))}
                    </div>
                  )}

                  {rewrite.ai_eeat.missing_signals?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#d97706', marginBottom: 4 }}>MISSING SIGNALS</div>
                      {rewrite.ai_eeat.missing_signals.map((sig, i) => (
                        <div key={i} style={{ padding: '6px 8px', background: '#fffbeb', borderRadius: 5, border: '1px solid #fde68a', marginBottom: 3 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e' }}>{sig.signal}</div>
                          {sig.how_to_add && <div style={{ fontSize: 10, color: '#059669', marginTop: 2 }}>How: {sig.how_to_add}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {rewrite.ai_eeat.author_analysis && (
                    <div style={{ marginTop: 10, padding: 8, background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>AUTHOR ANALYSIS</div>
                      <BoolField label="Author mentioned" value={rewrite.ai_eeat.author_analysis.author_mentioned} />
                      <BoolField label="Credentials shown" value={rewrite.ai_eeat.author_analysis.credentials_shown} />
                    </div>
                  )}
                </div>
              )}

              {rightTab === 'eeat' && !rewrite?.ai_eeat && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 24, textAlign: 'center' }}>
                  <Users size={24} color="#94a3b8" />
                  <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 12 }}>E-E-A-T analysis loading...</p>
                </div>
              )}

              {rightTab === 'keywords' && rewrite?.ai_keywords && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Key size={14} color="#d97706" /> AI Keyword Insights
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>AI-analyzed keyword placement and opportunities</p>

                  {rewrite.ai_keywords.primary_keyword && (
                    <div style={{ padding: 10, background: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a', marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>PRIMARY KEYWORD</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#b45309' }}>{rewrite.ai_keywords.primary_keyword.keyword}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {rewrite.ai_keywords.primary_keyword.in_title !== undefined && (
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: rewrite.ai_keywords.primary_keyword.in_title ? '#f0fdf4' : '#fef2f2', color: rewrite.ai_keywords.primary_keyword.in_title ? '#059669' : '#dc2626', fontWeight: 600 }}>
                            In Title: {rewrite.ai_keywords.primary_keyword.in_title ? 'Yes' : 'No'}
                          </span>
                        )}
                        {rewrite.ai_keywords.primary_keyword.in_h1 !== undefined && (
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: rewrite.ai_keywords.primary_keyword.in_h1 ? '#f0fdf4' : '#fef2f2', color: rewrite.ai_keywords.primary_keyword.in_h1 ? '#059669' : '#dc2626', fontWeight: 600 }}>
                            In H1: {rewrite.ai_keywords.primary_keyword.in_h1 ? 'Yes' : 'No'}
                          </span>
                        )}
                        {rewrite.ai_keywords.primary_keyword.in_meta !== undefined && (
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: rewrite.ai_keywords.primary_keyword.in_meta ? '#f0fdf4' : '#fef2f2', color: rewrite.ai_keywords.primary_keyword.in_meta ? '#059669' : '#dc2626', fontWeight: 600 }}>
                            In Meta: {rewrite.ai_keywords.primary_keyword.in_meta ? 'Yes' : 'No'}
                          </span>
                        )}
                        {rewrite.ai_keywords.primary_keyword.density && (
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>
                            Density: {rewrite.ai_keywords.primary_keyword.density}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {rewrite.ai_keywords.missing_keywords?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>MISSING KEYWORDS ({rewrite.ai_keywords.missing_keywords.length})</div>
                      {rewrite.ai_keywords.missing_keywords.map((kw, i) => (
                        <div key={i} style={{ padding: '5px 8px', background: '#fef2f2', borderRadius: 5, border: '1px solid #fecaca', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#7f1d1d', flex: 1 }}>{kw.keyword}</span>
                          {kw.importance && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: kw.importance === 'high' ? '#dc262615' : '#d9770615', color: kw.importance === 'high' ? '#dc2626' : '#d97706', fontWeight: 600 }}>{kw.importance}</span>}
                          {kw.where_to_add && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{kw.where_to_add}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {rewrite.ai_keywords.secondary_keywords?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#7950f2', marginBottom: 4 }}>SECONDARY KEYWORDS</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {rewrite.ai_keywords.secondary_keywords.map((kw, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, background: kw.present !== false ? '#f0fdf4' : '#fef2f2', color: kw.present !== false ? '#059669' : '#dc2626', border: `1px solid ${kw.present !== false ? '#bbf7d0' : '#fecaca'}`, fontWeight: 500 }}>
                            {kw.keyword || kw} {kw.present !== false ? '✓' : '✗'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rewrite.ai_keywords.long_tail_opportunities?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 4 }}>LONG-TAIL OPPORTUNITIES</div>
                      {rewrite.ai_keywords.long_tail_opportunities.map((kw, i) => (
                        <div key={i} style={{ padding: '3px 8px', fontSize: 11, color: '#065f46' }}>· {kw}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {rightTab === 'keywords' && !rewrite?.ai_keywords && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 24, textAlign: 'center' }}>
                  <Key size={24} color="#94a3b8" />
                  <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 12 }}>AI keyword insights loading...</p>
                </div>
              )}

              {rightTab === 'faq' && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <HelpCircle size={14} color="#059669" /> FAQ & Schema Suggestions
                  </div>

                  {rewrite?.ai_rewrite?.faq_suggestions?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 6 }}>FAQ SUGGESTIONS ({rewrite.ai_rewrite.faq_suggestions.length})</div>
                      {rewrite.ai_rewrite.faq_suggestions.map((faq, i) => (
                        <div key={i} style={{ padding: '8px 10px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', marginBottom: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', marginBottom: 2 }}>Q: {faq.question}</div>
                          <div style={{ fontSize: 10, color: '#065f46', lineHeight: 1.5 }}>A: {faq.answer}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {rewrite?.ai_rewrite?.schema_suggestions?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', marginBottom: 6 }}>SCHEMA MARKUP TO ADD</div>
                      {rewrite.ai_rewrite.schema_suggestions.map((schema, i) => {
                        const text = typeof schema === 'string' ? schema : JSON.stringify(schema, null, 2);
                        return (
                          <div key={i} style={{ position: 'relative', marginBottom: 6 }}>
                            <pre style={{ background: '#1e293b', borderRadius: 6, padding: 10, fontSize: 9, color: '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0, maxHeight: 200, overflow: 'auto' }}>{text}</pre>
                            <button onClick={() => navigator.clipboard?.writeText(text)}
                              style={{ position: 'absolute', top: 6, right: 6, padding: '3px 6px', borderRadius: 4, background: '#475569', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: '#fff', fontWeight: 600 }}>
                              <Copy size={9} /> Copy
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(!rewrite?.ai_rewrite?.faq_suggestions || rewrite.ai_rewrite.faq_suggestions.length === 0) && (!rewrite?.ai_rewrite?.schema_suggestions || rewrite.ai_rewrite.schema_suggestions.length === 0) && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No FAQ or schema suggestions available yet.</div>
                  )}
                </div>
              )}

              {rightTab === 'links' && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Link2 size={14} color="#7c3aed" /> AI Internal Link Suggestions
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>Suggested internal links with anchor text</p>

                  {rewrite?.ai_links?.length > 0 ? rewrite.ai_links.map((link, i) => (
                    <div key={i} style={{ padding: '8px 10px', background: '#f5f3ff', borderRadius: 6, border: '1px solid #e9d5ff', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b21a8' }}>{link.anchor_text}</span>
                        <ArrowRight size={10} color="#7c3aed" />
                        <span style={{ fontSize: 10, color: '#5b21b6', wordBreak: 'break-all' }}>{link.suggested_url}</span>
                      </div>
                      {link.context_sentence && <div style={{ fontSize: 10, color: '#6b21a8', fontStyle: 'italic', marginTop: 2 }}>"{link.context_sentence}"</div>}
                      {link.reason && <div style={{ fontSize: 9, color: '#7c3aed', marginTop: 2 }}>Why: {link.reason}</div>}
                    </div>
                  )) : (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No link suggestions available yet.</div>
                  )}

                  {rewrite?.ai_rewrite?.internal_link_suggestions?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>ADDITIONAL LINK IDEAS</div>
                      {rewrite.ai_rewrite.internal_link_suggestions.map((link, i) => (
                        <div key={i} style={{ padding: '4px 8px', fontSize: 11, color: '#5b21b6' }}>· {typeof link === 'string' ? link : JSON.stringify(link)}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {rightTab === 'serp' && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Google SERP Preview</div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>How your page appears in Google search results</p>
                  <SerpPreview title={rewrite?.ai_rewrite?.title_suggestions?.[0] || rewrite?.title || page.title} url={page.url} description={rewrite?.ai_rewrite?.meta_description_suggestions?.[0] || rewrite?.meta_description || page.meta_description} />
                  {rewrite?.ai_rewrite?.title_suggestions?.length > 1 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>ALTERNATIVE TITLES</div>
                      {rewrite.ai_rewrite.title_suggestions.slice(1).map((t, i) => (
                        <div key={i} style={{ padding: '6px 8px', background: '#eff6ff', borderRadius: 5, border: '1px solid #bfdbfe', marginBottom: 3, fontSize: 11, color: '#1e40af' }}>{t}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {rightTab === 'readability' && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Content Quality Analysis</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      { label: 'Word Count', value: mega?.word_count || page.word_count || 0, color: '#3b82f6' },
                      { label: 'Sentences', value: rewrite?.ai_readability?.sentence_count || readability.sentence_count || 'N/A', color: '#8b5cf6' },
                      { label: 'Avg Sentence', value: rewrite?.ai_readability?.avg_sentence_length || readability.avg_sentence_length ? `${rewrite?.ai_readability?.avg_sentence_length || readability.avg_sentence_length}w` : 'N/A', color: '#d97706' },
                      { label: 'Readability', value: rewrite?.ai_readability?.score || rewrite?.ai_readability?.flesch_kincaid || readability.score || readability.flesch_kincaid || 'N/A', color: '#059669' },
                    ].map((s, i) => (
                      <div key={i} style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {rewrite?.ai_readability?.strengths?.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 4 }}>STRENGTHS</div>
                      {rewrite.ai_readability.strengths.map((s, i) => (
                        <div key={i} style={{ padding: '3px 8px', fontSize: 11, color: '#065f46', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={10} color="#059669" /> {s}</div>
                      ))}
                    </div>
                  )}
                  {rewrite?.ai_readability?.weaknesses?.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>AREAS TO IMPROVE</div>
                      {rewrite.ai_readability.weaknesses.map((w, i) => (
                        <div key={i} style={{ padding: '3px 8px', fontSize: 11, color: '#7f1d1d', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10} color="#dc2626" /> {w}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {rightTab === 'export' && (
                <div style={{ background: 'var(--bg-white)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Export AI Rewrite Results</div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>Copy all AI-generated content in your preferred format</p>
                  {[
                    {
                      label: 'Copy as HTML',
                      icon: Code,
                      color: '#3b82f6',
                      action: () => {
                        const rw = rewrite?.ai_rewrite || {};
                        let html = '';
                        if (rw.title_suggestions?.length) html += `<h1>${rw.title_suggestions[0]}</h1>\n`;
                        if (rw.meta_description_suggestions?.length) html += `<meta name="description" content="${rw.meta_description_suggestions[0]}">\n`;
                        if (rw.faq_suggestions?.length) {
                          html += '<section class="faq">\n<h2>FAQ</h2>\n';
                          rw.faq_suggestions.forEach(f => { html += `<details><summary>${f.question}</summary><p>${f.answer || f.suggested_answer || ''}</p></details>\n`; });
                          html += '</section>\n';
                        }
                        if (rw.rewrite_sections?.length) {
                          rw.rewrite_sections.forEach(s => { html += `<section>\n<h2>${s.heading || 'Section'}</h2>\n<p>${s.rewritten || s.after || ''}</p>\n</section>\n`; });
                        }
                        if (rw.comparison_table) {
                          html += '<table>\n<thead><tr>';
                          (rw.comparison_table.headers || []).forEach(h => { html += `<th>${h}</th>`; });
                          html += '</tr></thead>\n<tbody>';
                          (rw.comparison_table.rows || []).forEach(row => { html += '<tr>'; row.forEach(c => { html += `<td>${c}</td>`; }); html += '</tr>\n'; });
                          html += '</tbody></table>\n';
                        }
                        navigator.clipboard?.writeText(html);
                      }
                    },
                    {
                      label: 'Copy as Markdown',
                      icon: Hash,
                      color: '#8b5cf6',
                      action: () => {
                        const rw = rewrite?.ai_rewrite || {};
                        let md = '';
                        if (rw.title_suggestions?.length) md += `# ${rw.title_suggestions[0]}\n\n`;
                        if (rw.meta_description_suggestions?.length) md += `> ${rw.meta_description_suggestions[0]}\n\n`;
                        if (rw.rewrite_sections?.length) {
                          rw.rewrite_sections.forEach(s => { md += `## ${s.heading || 'Section'}\n\n${s.rewritten || s.after || ''}\n\n`; });
                        }
                        if (rw.faq_suggestions?.length) {
                          md += '## FAQ\n\n';
                          rw.faq_suggestions.forEach(f => { md += `### ${f.question}\n${f.answer || f.suggested_answer || ''}\n\n`; });
                        }
                        if (rw.comparison_table) {
                          const h = rw.comparison_table.headers || [];
                          md += '| ' + h.join(' | ') + ' |\n| ' + h.map(() => '---').join(' | ') + ' |\n';
                          (rw.comparison_table.rows || []).forEach(row => { md += '| ' + row.join(' | ') + ' |\n'; });
                          md += '\n';
                        }
                        navigator.clipboard?.writeText(md);
                      }
                    },
                    {
                      label: 'Copy JSON-LD Schema',
                      icon: FileJson,
                      color: '#059669',
                      action: () => {
                        const schemas = rewrite?.ai_rewrite?.schema_suggestions || rewrite?.ai_keywords?.schema_suggestions || [];
                        const jsonLd = schemas.map(s => s.json_ld || s.code || JSON.stringify(s, null, 2)).join('\n\n');
                        navigator.clipboard?.writeText(jsonLd || 'No schema suggestions available');
                      }
                    },
                    {
                      label: 'Copy FAQ as Schema',
                      icon: HelpCircle,
                      color: '#d97706',
                      action: () => {
                        const faqs = rewrite?.ai_rewrite?.faq_suggestions || [];
                        if (faqs.length === 0) { navigator.clipboard?.writeText('No FAQ suggestions available'); return; }
                        const schema = {
                          "@context": "https://schema.org",
                          "@type": "FAQPage",
                          "mainEntity": faqs.map(f => ({
                            "@type": "Question",
                            "name": f.question,
                            "acceptedAnswer": { "@type": "Answer", "text": f.answer || f.suggested_answer || '' }
                          }))
                        };
                        navigator.clipboard?.writeText(JSON.stringify(schema, null, 2));
                      }
                    },
                    {
                      label: 'Copy Titles + Meta',
                      icon: Tag,
                      color: '#e64980',
                      action: () => {
                        const rw = rewrite?.ai_rewrite || {};
                        let text = '=== TITLE TAG OPTIONS ===\n';
                        (rw.title_suggestions || []).forEach((t, i) => { text += `${i+1}. ${t}\n`; });
                        text += '\n=== META DESCRIPTION OPTIONS ===\n';
                        (rw.meta_description_suggestions || []).forEach((m, i) => { text += `${i+1}. ${m}\n`; });
                        if (rw.h1_rewrite) text += `\n=== H1 REWRITE ===\nBefore: ${rw.h1_rewrite.before}\nAfter: ${rw.h1_rewrite.after}\n`;
                        navigator.clipboard?.writeText(text);
                      }
                    },
                    {
                      label: 'Copy All Content',
                      icon: FileText,
                      color: '#20c997',
                      action: () => {
                        const rw = rewrite?.ai_rewrite || {};
                        let text = '';
                        if (rw.title_suggestions?.length) text += `TITLE: ${rw.title_suggestions[0]}\n`;
                        if (rw.meta_description_suggestions?.length) text += `META: ${rw.meta_description_suggestions[0]}\n`;
                        if (rw.h1_rewrite?.after) text += `H1: ${rw.h1_rewrite.after}\n`;
                        if (rw.rewrite_sections?.length) {
                          text += '\n--- REWRITTEN SECTIONS ---\n\n';
                          rw.rewrite_sections.forEach(s => { text += `${s.heading || 'Section'}:\n${s.rewritten || s.after || ''}\n\n`; });
                        }
                        if (rw.faq_suggestions?.length) {
                          text += '--- FAQ ---\n\n';
                          rw.faq_suggestions.forEach(f => { text += `Q: ${f.question}\nA: ${f.answer || f.suggested_answer || ''}\n\n`; });
                        }
                        if (rw.internal_link_suggestions?.length) {
                          text += '--- INTERNAL LINKS ---\n';
                          rw.internal_link_suggestions.forEach(l => { text += `Link to: ${l.url || l.target_page || ''}\n`; });
                        }
                        if (rw.entity_suggestions?.missing?.length) {
                          text += '--- ENTITY SUGGESTIONS ---\n';
                          rw.entity_suggestions.missing.forEach(e => { text += `Add: ${e}\n`; });
                        }
                        navigator.clipboard?.writeText(text);
                      }
                    },
                  ].map((btn, i) => {
                    const Icon = btn.icon;
                    return (
                      <button key={i} onClick={btn.action} style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px',
                        background: btn.color + '08', border: `1px solid ${btn.color}30`, borderRadius: 8,
                        cursor: 'pointer', marginBottom: 6, transition: 'all 0.15s ease',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = btn.color + '15'; e.currentTarget.style.borderColor = btn.color + '60'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = btn.color + '08'; e.currentTarget.style.borderColor = btn.color + '30'; }}
                      >
                        <Icon size={16} color={btn.color} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1, textAlign: 'left' }}>{btn.label}</span>
                        <Copy size={14} color={btn.color} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
