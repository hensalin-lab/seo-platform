import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import {
  FileText,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Eye,
  Shield,
  Search,
  Layout,
  Link2,
  Image,
  Users,
  Package,
  BookOpen,
  RefreshCw,
  Loader2,
  Target,
  BarChart3,
} from 'lucide-react';
import { DataSourceBadge } from '../../../components/DataSourceBadge';

const scoreBar = (value, max = 100) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  let color = '#10b981';
  if (pct < 50) color = '#ef4444';
  else if (pct < 75) color = '#f59e0b';
  return { pct, color };
};

const gapSections = [
  {
    title: 'Topic Gaps',
    icon: Search,
    color: '#3b82f6',
    fields: [
      'missing_topics',
      'missing_entities',
      'missing_semantic_keywords',
      'missing_people_also_ask',
      'missing_faqs',
    ],
  },
  {
    title: 'Structural Gaps',
    icon: Layout,
    color: '#8b5cf6',
    fields: [
      'missing_tables',
      'missing_examples',
      'missing_step_by_step',
      'missing_comparison',
      'missing_glossary',
    ],
  },
  {
    title: 'Authority Gaps',
    icon: Shield,
    color: '#f59e0b',
    fields: [
      'missing_research',
      'missing_statistics',
      'missing_case_studies',
      'missing_citations',
      'missing_external_links',
      'missing_internal_links',
    ],
  },
  {
    title: 'Visual Gaps',
    icon: Image,
    color: '#ec4899',
    fields: [
      'missing_screenshots',
      'missing_diagrams',
      'missing_videos',
      'missing_infographics',
      'missing_downloadable_assets',
    ],
  },
  {
    title: 'Trust Gaps',
    icon: Users,
    color: '#10b981',
    fields: [
      'missing_cta',
      'missing_trust_signals',
      'missing_customer_logos',
      'missing_testimonials',
      'missing_author_bio',
      'missing_update_history',
    ],
  },
  {
    title: 'Product Gaps',
    icon: Package,
    color: '#6366f1',
    fields: [
      'missing_pricing_explanation',
      'missing_product_comparison',
      'missing_implementation_guide',
      'missing_schema',
    ],
  },
  {
    title: 'E-E-A-T Gaps',
    icon: BookOpen,
    color: '#f97316',
    fields: [
      'missing_author_credibility',
      'missing_first_hand_experience',
      'missing_balanced_viewpoint',
    ],
  },
];

const qualityFields = [
  { key: 'content_freshness', label: 'Content Freshness' },
  { key: 'search_intent_match', label: 'Search Intent Match' },
  { key: 'entity_coverage', label: 'Entity Coverage' },
  { key: 'topical_authority', label: 'Topical Authority' },
  { key: 'readability', label: 'Readability' },
  { key: 'grammar_score', label: 'Grammar' },
  { key: 'sentence_complexity', label: 'Sentence Complexity' },
  { key: 'duplicate_paragraphs', label: 'Duplicate Paragraphs' },
  { key: 'ai_detection_risk', label: 'AI Detection Risk' },
  { key: 'citation_score', label: 'Citation Score' },
  { key: 'originality_score', label: 'Originality' },
  { key: 'content_completeness', label: 'Content Completeness' },
];

const gapFieldLabels = {
  missing_topics: 'Missing Topics',
  missing_entities: 'Missing Entities',
  missing_semantic_keywords: 'Missing Semantic Keywords',
  missing_people_also_ask: 'Missing People Also Ask',
  missing_faqs: 'Missing FAQs',
  missing_tables: 'Missing Tables',
  missing_examples: 'Missing Examples',
  missing_step_by_step: 'Missing Step-by-Step',
  missing_comparison: 'Missing Comparison',
  missing_glossary: 'Missing Glossary',
  missing_research: 'Missing Research',
  missing_statistics: 'Missing Statistics',
  missing_case_studies: 'Missing Case Studies',
  missing_citations: 'Missing Citations',
  missing_external_links: 'Missing External Links',
  missing_internal_links: 'Missing Internal Links',
  missing_screenshots: 'Missing Screenshots',
  missing_diagrams: 'Missing Diagrams',
  missing_videos: 'Missing Videos',
  missing_infographics: 'Missing Infographics',
  missing_downloadable_assets: 'Missing Downloadable Assets',
  missing_cta: 'Missing CTA',
  missing_trust_signals: 'Missing Trust Signals',
  missing_customer_logos: 'Missing Customer Logos',
  missing_testimonials: 'Missing Testimonials',
  missing_author_bio: 'Missing Author Bio',
  missing_update_history: 'Missing Update History',
  missing_pricing_explanation: 'Missing Pricing Explanation',
  missing_product_comparison: 'Missing Product Comparison',
  missing_implementation_guide: 'Missing Implementation Guide',
  missing_schema: 'Missing Schema',
  missing_author_credibility: 'Missing Author Credibility',
  missing_first_hand_experience: 'Missing First-Hand Experience',
  missing_balanced_viewpoint: 'Missing Balanced Viewpoint',
};

function GapItem({ fieldName, data }) {
  if (!data) return null;
  const needed = data.needed === true || data.needed === 1;
  const suggestion = data.suggestion || data.recommendation || '';
  const importance = data.importance || data.relevance || null;
  const count = data.count || data.needed_count || null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 8,
        background: needed ? '#fef2f2' : '#f0fdf4',
        border: `1px solid ${needed ? '#fecaca' : '#bbf7d0'}`,
        marginBottom: 6,
      }}
    >
      <div style={{ marginTop: 2, flexShrink: 0 }}>
        {needed ? (
          <XCircle size={18} color="#ef4444" />
        ) : (
          <CheckCircle size={18} color="#10b981" />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: needed ? '#991b1b' : '#166534',
            marginBottom: 2,
          }}
        >
          {gapFieldLabels[fieldName] || fieldName}
        </div>
        {suggestion && (
          <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
            {typeof suggestion === 'string'
              ? suggestion
              : Array.isArray(suggestion)
              ? suggestion.join('; ')
              : JSON.stringify(suggestion)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          {importance != null && (
            <span
              style={{
                fontSize: 11,
                color: '#6b7280',
                background: '#f3f4f6',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              Relevance: {typeof importance === 'number' ? `${importance}%` : importance}
            </span>
          )}
          {count != null && (
            <span
              style={{
                fontSize: 11,
                color: '#ef4444',
                background: '#fef2f2',
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              ×{count} needed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function QualityScoreBar({ label, value, max = 100 }) {
  const { pct, color } = scoreBar(value, max);
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {value != null ? (max === 100 ? `${value}` : `${value}/${max}`) : '—'}
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: '#e5e7eb',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 4,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function ContentIntelligence() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pagesError, setPagesError] = useState(null);
  const [intelError, setIntelError] = useState(null);

  useEffect(() => {
    api
      .getAuditPages(id, { limit: 100 })
      .then((res) => setPages(res.items || []))
      .catch((err) => setPagesError(err.message || 'Failed to load pages for this audit.'));
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    setLoading(true);
    setIntelError(null);
    api
      .getContentDeep(id, selectedIdx)
      .then((data) => setIntel(data))
      .catch((err) => {
        setIntel(null);
        setIntelError(err.message || 'Could not load the deep content analysis. The backend may still be processing — try again in a moment.');
      })
      .finally(() => setLoading(false));
  }, [id, selectedIdx, pages.length]);

  const gaps = intel?.content_gaps || {};
  const quality = intel?.quality_scores || {};

  const summaryStats = [
    {
      label: 'Word Count',
      value: intel?.current_word_count ?? '—',
      icon: FileText,
      color: '#3b82f6',
    },
    {
      label: 'Ideal Word Count',
      value: intel?.ideal_word_count ?? '—',
      icon: Target,
      color: '#10b981',
    },
    {
      label: 'Competitor Avg Est.',
      value: intel?.competitor_average_estimate ?? '—',
      icon: BarChart3,
      color: '#8b5cf6',
    },
    {
      label: 'Missing Elements',
      value: intel?.missing_element_count ?? '—',
      icon: AlertTriangle,
      color: '#ef4444',
    },
    {
      label: 'Total Gaps',
      value: intel?.total_gaps ?? '—',
      icon: TrendingUp,
      color: '#f59e0b',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--text)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Eye size={26} color="#3b82f6" />
            Content Intelligence
            <DataSourceBadge source="crawler" size="xs" />
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '6px 0 0' }}>
            Deep content analysis — gaps, quality scores, and actionable recommendations
          </p>
        </div>

        {/* Page Selector */}
        <div
          style={{
            background: 'var(--bg-white)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            padding: 16,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {pagesError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 12px' }}>
              <span>{pagesError}</span>
              <button className="btn btn-sm btn-secondary" onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}
          <label
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            Select Page
          </label>
          <div style={{ position: 'relative', marginTop: 8 }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                color: '#1e293b',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                {pages.length
                  ? `${pages[selectedIdx]?.title || pages[selectedIdx]?.url || `Page ${selectedIdx + 1}`}`
                  : pagesError
                    ? 'Pages unavailable'
                    : 'Loading pages...'}
              </span>
              <ChevronDown
                size={16}
                color="#94a3b8"
                style={{
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                }}
              />
            </button>
            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-white)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  marginTop: 4,
                  maxHeight: 280,
                  overflowY: 'auto',
                  zIndex: 50,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}
              >
                {pages.map((page, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedIdx(i);
                      setDropdownOpen(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      background: i === selectedIdx ? '#eff6ff' : 'transparent',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (i !== selectedIdx) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (i !== selectedIdx) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1e293b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {page.title || `Page ${i + 1}`}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {page.url} · {page.word_count ? `${page.word_count.toLocaleString()} words` : ''} · {page.page_type || ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 60,
              color: 'var(--text-muted)',
              fontSize: 14,
              gap: 8,
            }}
          >
            <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            Analyzing content...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && !intel && intelError && pages.length > 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10,
            }}
          >
            <p style={{ color: '#ef4444', fontWeight: 600 }}>{intelError}</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => {
                setIntelError(null);
                setLoading(true);
                api.getContentDeep(id, selectedIdx).then((data) => setIntel(data)).catch((err) => {
                  setIntel(null);
                  setIntelError(err.message || 'Still failing — try again shortly.');
                }).finally(() => setLoading(false));
              }}
            >
              Retry Analysis
            </button>
          </div>
        )}

        {!loading && !intel && !intelError && pages.length > 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            No content intelligence data available for this page.
          </div>
        )}

        {!loading && intel && (
          <>
            {/* Summary Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
                marginBottom: 28,
              }}
            >
              {summaryStats.map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  style={{
                    background: 'var(--bg-white)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    padding: '18px 16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `${color}12`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={16} color={color} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </div>
                </div>
              ))}
            </div>

            {/* Quality Scores */}
            <div
              style={{
                background: 'var(--bg-white)',
                borderRadius: 12,
                border: '1px solid var(--border)',
                padding: 24,
                marginBottom: 28,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <BarChart3 size={18} color="#3b82f6" />
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Quality Scores</h2>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 8,
                }}
              >
                {qualityFields.map(({ key, label }) => (
                  <QualityScoreBar
                    key={key}
                    label={label}
                    value={quality[key] != null ? Number(quality[key]) : null}
                  />
                ))}
              </div>
            </div>

            {/* Content Gaps */}
            <div
              style={{
                background: 'var(--bg-white)',
                borderRadius: 12,
                border: '1px solid var(--border)',
                padding: 24,
                marginBottom: 28,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <AlertTriangle size={18} color="#f59e0b" />
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Content Gaps</h2>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#fff',
                    background: '#ef4444',
                    padding: '2px 10px',
                    borderRadius: 12,
                    marginLeft: 4,
                  }}
                >
                  {intel?.total_gaps ?? Object.keys(gaps).filter((k) => gaps[k]?.needed).length} gaps
                </span>
              </div>

              {gapSections.map(({ title, icon: SectionIcon, color, fields }) => {
                const sectionGaps = fields.filter((f) => gaps[f]);
                const sectionNeeded = fields.filter((f) => gaps[f]?.needed);
                if (!sectionGaps.length) return null;
                return (
                  <div key={title} style={{ marginBottom: 28 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 12,
                        paddingBottom: 8,
                        borderBottom: `2px solid ${color}20`,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: `${color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SectionIcon size={14} color={color} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{title}</span>
                      {sectionNeeded.length > 0 && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#ef4444',
                            background: '#fef2f2',
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: '1px solid #fecaca',
                          }}
                        >
                          {sectionNeeded.length} needed
                        </span>
                      )}
                    </div>
                    {fields.map((field) => (
                      <GapItem key={field} fieldName={field} data={gaps[field]} />
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
