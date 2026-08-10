import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import {
  Globe, Smartphone, Search, Layout, Heading, Link2, ExternalLink,
  FileJson, Tag, Columns, Key, Gauge, Shield, Code, CheckCircle,
  Copy, Brain, MessageSquare, HelpCircle, Activity, AlertTriangle,
  ChevronDown, ChevronRight, Eye, Sparkles, Target, Lightbulb, Zap,
  TrendingUp, BarChart3, Clock, Users, Image, Database,
} from 'lucide-react';
import FixDetail from '../../../components/FixDetail';
import GooglebotView from '../../../components/GooglebotView';

const TAB_GROUPS = [
  { label: 'Google Sees', tabs: [
    { key: 'googlebot', label: 'Googlebot', icon: Globe },
    { key: 'browser', label: 'Browser', icon: Eye },
    { key: 'mobile', label: 'Mobile', icon: Smartphone },
    { key: 'ai_search', label: 'AI Search', icon: Brain },
  ]},
  { label: 'Content', tabs: [
    { key: 'headings', label: 'Headings', icon: Heading },
    { key: 'internal_links', label: 'Int. Links', icon: Link2 },
    { key: 'external_links', label: 'Ext. Links', icon: ExternalLink },
    { key: 'content_blocks', label: 'Content', icon: Columns },
    { key: 'keywords', label: 'Keywords', icon: Key },
  ]},
  { label: 'Technical', tabs: [
    { key: 'schema', label: 'Schema', icon: FileJson },
    { key: 'cwv', label: 'Web Vitals', icon: Gauge },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'javascript', label: 'JS Render', icon: Code },
    { key: 'indexability', label: 'Indexable', icon: CheckCircle },
    { key: 'canonical', label: 'Canonical', icon: Copy },
    { key: 'duplicate', label: 'Duplicate', icon: AlertTriangle },
  ]},
  { label: 'AI & Authority', tabs: [
    { key: 'entities', label: 'Entities', icon: Database },
    { key: 'eeat', label: 'E-E-A-T', icon: Users },
    { key: 'ai_citation', label: 'AI Citation', icon: MessageSquare },
    { key: 'snippet', label: 'Snippets', icon: HelpCircle },
    { key: 'knowledge_graph', label: 'Knowledge', icon: Globe },
  ]},
  { label: '93 Signals', tabs: [
    { key: 'mega_signals', label: 'All Signals', icon: Sparkles },
    { key: 'mega_issues', label: 'Issues & Fixes', icon: AlertTriangle },
  ]},
];

function BoolField({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 8, height: 8, borderRadius: 4, background: value ? '#059669' : '#dc2626', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: value ? '#059669' : '#dc2626' }}>{value ? 'Yes' : 'No'}</span>
    </div>
  );
}

function MetricField({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || '#1e293b' }}>{value}</span>
    </div>
  );
}

function ListView({ items, label }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>{label} ({items.length})</div>
      {items.slice(0, 10).map((item, i) => (
        <div key={i} style={{ padding: '4px 8px', fontSize: 12, color: '#475569', borderBottom: '1px solid #f8fafc' }}>
          {typeof item === 'string' ? item : item.text || item.url || JSON.stringify(item).slice(0, 80)}
        </div>
      ))}
      {items.length > 10 && <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px' }}>+{items.length - 10} more</div>}
    </div>
  );
}

function Section({ title, children, color = '#1e293b' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function GenericSubView({ title, icon, data }) {
  const Icon = icon || Eye;
  if (!data || typeof data !== 'object') return <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>No data available</div>;
  return (
    <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} color="#3b82f6" /> {title}
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

function SignalCard({ signal, index }) {
  const [expanded, setExpanded] = useState(false);
  const statusColors = { pass: '#059669', warn: '#d97706', fail: '#dc2626' };
  const statusLabels = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
  const sc = statusColors[signal.status] || '#64748b';
  const sevColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb' };
  const sevColor = sevColors[signal.severity] || '#64748b';
  const hasIssues = signal.status === 'warn' || signal.status === 'fail';

  return (
    <div style={{ border: `1px solid ${sc}30`, borderRadius: 10, marginBottom: 6, background: 'var(--bg-white)', borderLeft: `3px solid ${sc}` }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: hasIssues ? `${sc}05` : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ width: 20, height: 20, borderRadius: 4, background: `${sc}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: sc, flexShrink: 0 }}>{index + 1}</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{signal.signal_name || signal.name || signal.title || signal.issue || 'Signal'}</span>
        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: `${sc}15`, color: sc, fontWeight: 700 }}>{statusLabels[signal.status]}</span>
        {hasIssues && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: `${sevColor}15`, color: sevColor, fontWeight: 700 }}>{signal.severity}</span>}
        <ChevronDown size={12} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
      </button>
      {expanded && hasIssues && (
        <div style={{ padding: '0 14px 14px' }}>
          {signal.what_wrong && <div style={{ padding: '8px 10px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca', marginBottom: 6, fontSize: 11, color: '#7f1d1d', lineHeight: 1.5 }}><strong>What is wrong:</strong> {signal.what_wrong}</div>}
          {signal.why_it_matters && <div style={{ padding: '8px 10px', background: '#fef3c7', borderRadius: 6, border: '1px solid #fde68a', marginBottom: 6, fontSize: 11, color: '#78350f', lineHeight: 1.5 }}><strong>Why it matters:</strong> {signal.why_it_matters}</div>}
          {signal.how_to_fix && <div style={{ padding: '8px 10px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', marginBottom: 6, fontSize: 11, color: '#065f46', lineHeight: 1.5 }}><strong>How to fix:</strong> {signal.how_to_fix}</div>}
          {(signal.before_code || signal.after_code || signal.code_example) && (
            <div style={{ display: 'grid', gridTemplateColumns: signal.before_code && signal.after_code ? '1fr 1fr' : '1fr', gap: 6, marginTop: 6 }}>
              {signal.before_code && <div style={{ background: '#1e293b', borderRadius: 6, padding: 8 }}><div style={{ fontSize: 8, color: '#f87171', marginBottom: 2, fontWeight: 700 }}>BEFORE</div><pre style={{ fontSize: 10, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{signal.before_code}</pre></div>}
              {signal.after_code && <div style={{ background: '#1e293b', borderRadius: 6, padding: 8 }}><div style={{ fontSize: 8, color: '#34d399', marginBottom: 2, fontWeight: 700 }}>AFTER</div><pre style={{ fontSize: 10, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{signal.after_code}</pre></div>}
              {!signal.before_code && !signal.after_code && signal.code_example && <div style={{ background: '#1e293b', borderRadius: 6, padding: 8 }}><pre style={{ fontSize: 10, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{signal.code_example}</pre></div>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {signal.expected_impact && <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>Impact: {signal.expected_impact}</span>}
            {signal.effort && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Effort: {signal.effort}</span>}
          </div>
          <div style={{ marginTop: 8 }}><FixDetail issue={signal} /></div>
        </div>
      )}
      {expanded && !hasIssues && (
        <div style={{ padding: '0 14px 10px' }}>
          <div style={{ fontSize: 11, color: '#059669', lineHeight: 1.5 }}>{signal.what_wrong || 'This signal is passing. No action needed.'}</div>
        </div>
      )}
    </div>
  );
}

function AiRecommendationsPanel({ auditId, pageIdx }) {
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getAiRecommendationsPage(auditId, pageIdx).then(d => { setRecs(d); setLoading(false); }).catch(() => setLoading(false));
  }, [auditId, pageIdx]);

  if (loading) return <div style={{ padding: 16, textAlign: 'center' }}><Sparkles size={16} className="spin" color="#8b5cf6" /><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>AI analyzing...</p></div>;
  if (!recs) return <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 16 }}>AI recommendations unavailable</div>;

  return (
    <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, #8b5cf615, #6366f115)', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={16} color="#8b5cf6" />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>AI Expert Recommendations</span>
      </div>
      {recs.executive_summary && (
        <div style={{ padding: '12px 18px', background: 'var(--bg-secondary)', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{recs.executive_summary}</div>
        </div>
      )}
      <div style={{ padding: '14px 18px' }}>
        {recs.google_likes?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={13} /> What Google Likes</div>
            {recs.google_likes.map((item, i) => (
              <div key={i} style={{ padding: '6px 10px', background: '#f0fdf4', borderRadius: 6, marginBottom: 4, fontSize: 11, color: '#166534', borderLeft: '2px solid #059669' }}>
                <strong>{item.element}</strong> - {item.why}
              </div>
            ))}
          </div>
        )}
        {recs.google_dislikes?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} /> What Google Does Not Like</div>
            {recs.google_dislikes.map((item, i) => (
              <div key={i} style={{ padding: '8px 10px', background: '#fef2f2', borderRadius: 6, marginBottom: 6, borderLeft: '2px solid #dc2626' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#991b1b', marginBottom: 2 }}>{item.element}</div>
                <div style={{ fontSize: 11, color: '#7f1d1d', marginBottom: 4 }}>{item.why}</div>
                {item.fix && <FixDetail issue={item} />}
              </div>
            ))}
          </div>
        )}
        {recs.content_recommendations?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Lightbulb size={13} /> Content Recommendations</div>
            {recs.content_recommendations.map((item, i) => (
              <div key={i} style={{ padding: '8px 10px', background: '#fffbeb', borderRadius: 6, marginBottom: 6, borderLeft: '2px solid #d97706' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', marginBottom: 2 }}>{item.title || item.topic || 'Recommendation'}</div>
                <div style={{ fontSize: 11, color: '#78350f', lineHeight: 1.5 }}>{item.description || item.action || item.suggestion}</div>
              </div>
            ))}
          </div>
        )}
        {recs.technical_fixes?.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={13} /> Technical Fixes</div>
            {recs.technical_fixes.map((item, i) => (
              <div key={i} style={{ padding: '6px 10px', background: '#eff6ff', borderRadius: 6, marginBottom: 4, fontSize: 11, color: '#1e40af', borderLeft: '2px solid #3b82f6' }}>
                {item.issue || item.fix || item.description}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PageDetail() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('googlebot');
  const [activeGroup, setActiveGroup] = useState(0);
  const [deepData, setDeepData] = useState(null);
  const [mega, setMega] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    api.getAuditPages(id, { limit: 100 }).then(d => { setPages(d.items || []); setLoading(false); }).catch(e => { setPages([]); setLoading(false); console.error('Failed to load pages:', e); });
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    setPageLoading(true);
    Promise.allSettled([
      api.getPageIntelligenceDeep(id, selectedIdx),
      api.getMegaAnalysis(id, selectedIdx),
    ]).then(([deepRes, megaRes]) => {
      if (deepRes.status === 'fulfilled') setDeepData(deepRes.value);
      if (megaRes.status === 'fulfilled') setMega(megaRes.value);
      setPageLoading(false);
    }).catch(() => setPageLoading(false));
  }, [id, selectedIdx, pages.length]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /><p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Loading pages...</p></div>;
  if (!pages.length) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No pages found</div>;

  const sv = deepData?.sub_views || {};
  const currentGroup = TAB_GROUPS[activeGroup];
  const issues = mega?.issues || [];
  const signals = mega?.all_signals || [];
  const catScores = mega?.category_scores || {};

  const renderTab = () => {
    switch (activeTab) {
      case 'googlebot': return <GooglebotView data={sv.googlebot_view || {}} />;
      case 'browser': return <GenericSubView title="Browser View" icon={Eye} data={sv.browser_view} />;
      case 'mobile': return <GenericSubView title="Mobile View" icon={Smartphone} data={sv.mobile_view} />;
      case 'ai_search': return <GenericSubView title="AI Search View" icon={Brain} data={sv.ai_search_view} />;
      case 'headings': return <GenericSubView title="Heading Hierarchy" icon={Heading} data={sv.heading_hierarchy} />;
      case 'schema': return <GenericSubView title="Schema Markup" icon={FileJson} data={sv.schema_viewer} />;
      case 'entities': return <GenericSubView title="Entity Extraction" icon={Database} data={sv.entity_extraction} />;
      case 'cwv': return <GenericSubView title="Core Web Vitals" icon={Gauge} data={sv.core_web_vitals} />;
      case 'crawl': return <GenericSubView title="Crawl Path" icon={Search} data={sv.crawl_path} />;
      case 'dom': return <GenericSubView title="DOM Tree" icon={Layout} data={sv.dom_tree} />;
      case 'internal_links': return <GenericSubView title="Internal Links" icon={Link2} data={sv.internal_link_graph} />;
      case 'external_links': return <GenericSubView title="External Links" icon={ExternalLink} data={sv.external_link_graph} />;
      case 'content_blocks': return <GenericSubView title="Content Blocks" icon={Columns} data={sv.content_blocks} />;
      case 'keywords': return <GenericSubView title="Keyword Map" icon={Key} data={sv.keyword_map} />;
      case 'accessibility': return <GenericSubView title="Accessibility" icon={Activity} data={sv.accessibility_issues} />;
      case 'security': return <GenericSubView title="Security" icon={Shield} data={sv.security_issues} />;
      case 'javascript': return <GenericSubView title="JS Rendering" icon={Code} data={sv.javascript_rendering} />;
      case 'indexability': return <GenericSubView title="Indexability" icon={CheckCircle} data={sv.indexability_status} />;
      case 'canonical': return <GenericSubView title="Canonical" icon={Copy} data={sv.canonical_validation} />;
      case 'duplicate': return <GenericSubView title="Duplicate" icon={AlertTriangle} data={sv.duplicate_detection} />;
      case 'eeat': return <GenericSubView title="E-E-A-T" icon={Users} data={sv.eeat_analysis} />;
      case 'ai_citation': return <GenericSubView title="AI Citation" icon={MessageSquare} data={sv.ai_citation_readiness} />;
      case 'snippet': return <GenericSubView title="Featured Snippet" icon={HelpCircle} data={sv.featured_snippet_readiness} />;
      case 'knowledge_graph': return <GenericSubView title="Knowledge Graph" icon={Globe} data={sv.knowledge_graph_readiness} />;
      case 'mega_signals':
        return (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>All 93 Signals Analyzed</div>
            {signals.map((s, i) => <SignalCard key={i} signal={s} index={i} />)}
          </div>
        );
      case 'mega_issues':
        return (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>Issues to Fix ({issues.length})</div>
            {issues.length > 0 ? issues.map((s, i) => <SignalCard key={i} signal={s} index={i} />) : (
              <div style={{ padding: 20, textAlign: 'center' }}><CheckCircle size={28} color="#059669" /><p style={{ color: '#059669', fontWeight: 600, marginTop: 8 }}>No issues found</p></div>
            )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Page Intelligence Deep Dive</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Everything Google sees, what is missing, and exactly how to fix it - pro SEO level</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: 'var(--bg-white)', cursor: 'pointer' }}>
            {pages.map((p, i) => <option key={i} value={i}>{p.title || p.url} ({p.word_count || 0}w)</option>)}
          </select>
        </div>

        {mega && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Score', value: mega.overall_score, color: mega.overall_score >= 70 ? '#059669' : mega.overall_score >= 50 ? '#d97706' : '#dc2626' },
              { label: 'Signals', value: mega.signals_checked, color: '#3b82f6' },
              { label: 'Pass', value: mega.signals_passing, color: '#059669' },
              { label: 'Warn', value: mega.signals_warning, color: '#d97706' },
              { label: 'Fail', value: mega.signals_failing, color: '#dc2626' },
              { label: 'Words', value: mega.word_count || pages[selectedIdx]?.word_count || 0, color: '#8b5cf6' },
            ].map((s, i) => (
              <div key={i} style={{ padding: 10, background: 'var(--bg-white)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {mega && Object.keys(catScores).filter(k => catScores[k] < 100).length > 0 && (
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Category Scores (showing areas below 100%)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
              {Object.entries(catScores).filter(([_, v]) => v < 100).sort((a, b) => a[1] - b[1]).map(([cat, score]) => (
                <div key={cat} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{cat.replace(/_/g, ' ')}</div>
                    <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, marginTop: 2 }}><div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626', borderRadius: 2 }} /></div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626' }}>{Math.round(score)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {TAB_GROUPS.map((g, gi) => (
                <button key={gi} onClick={() => { setActiveGroup(gi); setActiveTab(g.tabs[0].key); }}
                  style={{ padding: '6px 12px', border: '1px solid', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                    background: activeGroup === gi ? '#1e293b' : '#fff', color: activeGroup === gi ? '#fff' : '#475569', borderColor: activeGroup === gi ? '#1e293b' : '#e2e8f0' }}>
                  {g.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
              {currentGroup.tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    style={{ padding: '6px 12px', border: '1px solid', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                      background: activeTab === tab.key ? '#3b82f6' : '#fff', color: activeTab === tab.key ? '#fff' : '#475569', borderColor: activeTab === tab.key ? '#3b82f6' : '#e2e8f0',
                      display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon size={12} /> {tab.label}
                  </button>
                );
              })}
            </div>

            {pageLoading ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div className="spinner" /><p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>Analyzing page...</p>
              </div>
            ) : renderTab()}
          </div>

          <div>
            {mega && (
              <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={16} color="#3b82f6" /> Score Breakdown
                </div>
                {Object.entries(catScores).sort((a, b) => a[1] - b[1]).map(([cat, score]) => (
                  <div key={cat} style={{ padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, flex: 1, color: '#475569', textTransform: 'capitalize' }}>{cat.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626' }}>{Math.round(score)}</span>
                    </div>
                    <div style={{ height: 3, background: '#eef0f2', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626', borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 12, padding: 10, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>WHAT THIS SCORE MEANS</div>
                  <div style={{ fontSize: 11, color: '#065f46', lineHeight: 1.5 }}>
                    {mega.overall_score >= 80 ? 'Excellent technical foundation. Focus on content depth and AI search optimization.' :
                     mega.overall_score >= 60 ? 'Good foundation with room for improvement. Fix critical issues first.' :
                     'Significant issues found. Prioritize technical fixes before content work.'}
                  </div>
                </div>
              </div>
            )}

            {mega && (
              <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} color="#059669" /> Ranking Impact Estimates
                </div>
                {[
                  { label: 'Current Score', value: Math.round(mega.overall_score || 0), color: '#d97706', impact: mega.overall_score >= 70 ? 'Page is ranking potential' : 'Page needs work to rank' },
                  { label: 'After Critical Fixes', value: Math.min(98, Math.round((mega.overall_score || 0) + issues.filter(i => i.severity === 'CRITICAL').length * 2)), color: '#3b82f6', impact: `Fix ${issues.filter(i => i.severity === 'CRITICAL').length} critical issues for quick win` },
                  { label: 'After Content + Technical', value: Math.min(98, Math.round((mega.overall_score || 0) + issues.length * 1.2)), color: '#059669', impact: `Full implementation of ${issues.length} fixes` },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, flex: 1, color: '#475569' }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.impact}</div>
                  </div>
                ))}
                <div style={{ marginTop: 10, padding: 10, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>ESTIMATED IMPROVEMENT</div>
                  <div style={{ fontSize: 11, color: '#065f46', lineHeight: 1.5 }}>
                    +{Math.min(98, Math.round((mega.overall_score || 0) + issues.length * 1.2)) - Math.round(mega.overall_score || 0)} points after implementing all {issues.length} fixes.
                    {mega.overall_score < 60 ? ' Focus on technical fixes first, then content.' : mega.overall_score < 80 ? ' Good foundation — content and AI optimization will drive the biggest gains.' : ' Already strong — fine-tune for AI search visibility and E-E-A-T.'}
                  </div>
                </div>
                <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {(() => {
                    const ck = (cat) => (cat || '').toLowerCase().replace(/[-\s]/g, '_');
                    const seoCount = issues.filter(i => { const c = ck(i.category); return c.includes('title_tag') || c.includes('meta_tags') || c.includes('heading') || c.includes('url_structure') || c.includes('open_graph') || c.includes('canonical') || c.includes('schema_markup') || c.includes('keyword_optimization'); }).length;
                    const techCount = issues.filter(i => { const c = ck(i.category); return c.includes('page_speed') || c.includes('security') || c.includes('crawlability') || c.includes('indexability') || c.includes('mobile') || c.includes('core_web_vitals') || c.includes('technical_integrity') || c.includes('performance') || c.includes('javascript'); }).length;
                    const contentCount = issues.filter(i => { const c = ck(i.category); return c.includes('content') || c.includes('keyword') || c.includes('readability') || c.includes('depth') || c.includes('structure') || c.includes('freshness') || c.includes('spam') || c.includes('word_quality'); }).length;
                    const aiCount = issues.filter(i => { const c = ck(i.category); return c.includes('ai_') || c.includes('schema') || c.includes('eeat') || c.includes('entity') || c.includes('citation') || c.includes('bluf') || c.includes('rag_') || c.includes('answer_engine') || c.includes('platform_specific') || c.includes('structured_data'); }).length;
                    return [
                      { label: 'SEO Impact', desc: 'Title, meta, headings, schema', value: seoCount },
                      { label: 'Technical Impact', desc: 'Speed, mobile, security', value: techCount },
                      { label: 'Content Impact', desc: 'Words, quality, keywords', value: contentCount },
                      { label: 'AI Search Impact', desc: 'Citations, entities, E-E-A-T', value: aiCount },
                    ].map((item, i) => (
                      <div key={i} style={{ padding: 8, background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#1e293b' }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.desc}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: item.value > 0 ? '#d97706' : '#059669', marginTop: 2 }}>{item.value} issues</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            <AiRecommendationsPanel auditId={id} pageIdx={selectedIdx} />
          </div>
        </div>
      </div>
    </div>
  );
}
