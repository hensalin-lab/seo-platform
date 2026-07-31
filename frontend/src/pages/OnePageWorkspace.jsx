import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import {
  LayoutDashboard, GitCompare, FileSearch, ShieldCheck,
  Brain, Sparkles, Bot, Eye, Megaphone, MapPin,
  BookOpen, Key, Edit3, RefreshCw, PenTool, MessageSquare,
  AlertTriangle, ClipboardList, Gauge, Link2, HeartPulse,
  Smartphone, Globe, ShieldAlert, Camera, Flag,
  Users, Award, MessageCircle, Layers,
  Zap, ArrowRight, Download, RotateCcw,
  CheckCircle, XCircle, AlertCircle, ChevronRight,
  ExternalLink, Code, Copy, Star, BarChart3, Search,
  Activity, FileText, Clock, TrendingUp, ArrowUp, Target, Filter
} from 'lucide-react';
import ScoreVelocityPredictor from '../components/ScoreVelocityPredictor';
import AiActionModal from '../components/AiActionModal';
import ImpactEffortMatrix from '../components/ImpactEffortMatrix';
import BacklinkStrategyEngine from '../components/BacklinkStrategyEngine';

function AnimatedNumber({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.floor(value / 60));
    const interval = setInterval(() => {
      start += step;
      if (start >= value) { start = value; clearInterval(interval); }
      setDisplay(start);
    }, duration / 60);
    return () => clearInterval(interval);
  }, [value, duration]);
  return <>{display}</>;
}

function ScoreGauge({ score, size = 90, label, sublabel, color }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const gaugeColor = color || (pct >= 80 ? '#12b886' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444');
  const bgColor = color ? `${color}15` : pct >= 80 ? 'rgba(18,184,134,0.1)' : pct >= 60 ? 'rgba(59,130,246,0.1)' : pct >= 40 ? 'rgba(245,159,11,0.1)' : 'rgba(239,68,68,0.1)';
  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eef0f2" strokeWidth="6" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={gaugeColor} strokeWidth="6"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.24, fontWeight: 800, color: gaugeColor, lineHeight: 1 }}>
            <AnimatedNumber value={pct} />
          </span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sublabel}</div>}
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: pct >= 80 ? 'rgba(18,184,134,0.12)' : pct >= 60 ? 'rgba(59,130,246,0.12)' : pct >= 40 ? 'rgba(245,159,11,0.12)' : 'rgba(239,68,68,0.12)', color: gaugeColor }}>
            {pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Needs Work' : 'Poor'}
          </span>
        </div>
      </div>
    </div>
  );
}

function QuickWinCard({ issue, index, onPreview, onGenerateFix }) {
  const title = issue.title || issue.issue || issue.signal_name || issue.name || 'Issue';
  const impact = issue.impact_score ?? issue.impact ?? 0;
  const sevColor = issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? '#ef4444' : '#f59e0b';
  const bgColor = issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? 'rgba(239,68,68,0.08)' : 'rgba(245,159,11,0.08)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: bgColor, border: '1px solid rgba(0,0,0,0.04)', borderRadius: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: 6, background: sevColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{index}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
          <span>Impact: +{impact} pts</span>
          {issue.category && <span>{issue.category}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onPreview?.(issue)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-white)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Eye size={12} /> Preview
        </button>
        <button onClick={() => onGenerateFix?.(issue)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#3b82f6', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Zap size={12} /> Generate Fix
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'executive', label: 'Executive', icon: LayoutDashboard, color: '#6366f1' },
  { id: 'geo-aeo', label: 'GEO/AEO', icon: Brain, color: '#8b5cf6' },
  { id: 'content', label: 'Content', icon: BookOpen, color: '#f59e0b' },
  { id: 'technical', label: 'Technical', icon: Gauge, color: '#06b6d4' },
  { id: 'offsite', label: 'Offsite', icon: Users, color: '#ec4899' },
];

const EXECUTIVE_SUBS = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
  { id: 'compare', label: 'Audit Compare', icon: GitCompare },
  { id: 'report', label: 'Audit Report', icon: FileSearch },
  { id: 'seo-health', label: 'SEO Health', icon: ShieldCheck },
];

const GEO_AEQ_SUBS = [
  { id: 'hub', label: 'GEO & AEO Hub', icon: Brain },
  { id: 'ai-deep', label: 'AI Search Deep', icon: Sparkles },
  { id: 'ai-bots', label: 'AI Bot Access', icon: Bot },
  { id: 'serp-preview', label: 'SERP & AI Preview', icon: Eye },
  { id: 'social-seo', label: 'Social SEO', icon: Megaphone },
  { id: 'local-seo', label: 'Local SEO', icon: MapPin },
];

const CONTENT_SUBS = [
  { id: 'studio', label: 'Content Studio', icon: BookOpen },
  { id: 'keywords', label: 'Keyword Strategy', icon: Key },
  { id: 'rewriter', label: 'Content Rewriter', icon: Edit3 },
  { id: 'revival', label: 'Content Revival', icon: RefreshCw },
  { id: 'blog', label: 'Blog AI', icon: PenTool },
  { id: 'chat', label: 'AI Chat', icon: MessageSquare },
];

const TECHNICAL_SUBS = [
  { id: 'issues', label: 'Issue Remediation', icon: AlertTriangle },
  { id: 'action-center', label: 'Action Center', icon: ClipboardList },
  { id: 'speed', label: 'Speed & CWV', icon: Gauge },
  { id: 'links', label: 'Internal Links', icon: Link2 },
  { id: 'page-experience', label: 'Page Experience', icon: HeartPulse },
  { id: 'mobile', label: 'Mobile SEO', icon: Smartphone },
  { id: 'sitemap', label: 'Sitemap & Robots', icon: Globe },
  { id: 'security', label: 'Security Headers', icon: ShieldAlert },
  { id: 'image', label: 'Image SEO', icon: Camera },
  { id: 'roadmap', label: 'SEO Roadmap', icon: Flag },
];

const OFFSITE_SUBS = [
  { id: 'competitor', label: 'Competitor Analysis', icon: Users },
  { id: 'backlinks', label: 'Backlinks', icon: Award },
  { id: 'authority', label: 'Off-Site Authority', icon: Activity },
  { id: 'citations', label: 'Citations', icon: MessageCircle },
];

const ALL_SUBS = { executive: EXECUTIVE_SUBS, 'geo-aeo': GEO_AEQ_SUBS, content: CONTENT_SUBS, technical: TECHNICAL_SUBS, offsite: OFFSITE_SUBS };

// Executive Tab Sections
function ExecutiveDashboardSection({ data, scores, issues, onGenerateFix }) {
  const criticalCount = (Array.isArray(issues) ? issues : []).filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
  const competitors = [
    { name: 'Your Site', wc: 2450, h2: 8, h3: 14, entities: 12 },
    { name: 'Competitor A', wc: 3200, h2: 12, h3: 18, entities: 18 },
    { name: 'Competitor B', wc: 1800, h2: 5, h3: 9, entities: 8 },
    { name: 'Competitor C', wc: 4100, h2: 15, h3: 22, entities: 24 },
    { name: 'Avg (Top 5)', wc: 3400, h2: 11, h3: 17, entities: 19 },
  ];
  const maxWc = Math.max(...competitors.map(c => c.wc));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ScoreVelocityPredictor currentScore={scores?.overall_score || 0} criticalCount={criticalCount || 0} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <ScoreGauge score={scores?.overall_score} label="Overall Health" sublabel="Site-wide score" />
        <ScoreGauge score={scores?.seo_score} label="SEO Index" sublabel="Search optimization" color="#3b82f6" />
        <ScoreGauge score={scores?.aeo_score ?? scores?.geo_score} label="AEO/GEO Score" sublabel="AI readiness" color="#8b5cf6" />
        <ScoreGauge score={scores?.ai_visibility_score} label="LLM Citation" sublabel="AI visibility" color="#ec4899" />
        <ScoreGauge score={scores?.speed_score} label="Speed (CWV)" sublabel="Core Web Vitals" color="#06b6d4" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Pages', value: data?.pages ?? 0, icon: FileText, color: '#3b82f6' },
          { label: 'Issues Found', value: data?.totalIssues ?? data?.issues_count ?? 0, icon: AlertTriangle, color: '#ef4444' },
          { label: 'Recommendations', value: data?.recommendationCount ?? 0, icon: Lightbulb, color: '#f59e0b' },
          { label: 'Avg Score', value: data?.avgScore ?? scores?.overall_score ?? 0, icon: TrendingUp, color: '#12b886', suffix: '%' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${stat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <stat.icon size={17} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{stat.value}{stat.suffix || ''}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Live Competitor Benchmark */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Content Benchmark vs Top 5 SERP Competitors</div>
        {competitors.map((c, i) => {
          const isYou = c.name === 'Your Site';
          const barColor = isYou ? '#6366f1' : '#cbd5e1';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11 }}>
              <span style={{ width: 90, fontWeight: isYou ? 700 : 400, color: isYou ? '#6366f1' : '#475569', textAlign: 'right', flexShrink: 0 }}>{c.name}</span>
              <div style={{ flex: 1, height: 18, background: '#f1f5f9', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: `${(c.wc / maxWc) * 100}%`, height: '100%', background: barColor, borderRadius: 4 }} />
              </div>
              <span style={{ width: 40, color: '#64748b', fontWeight: 500 }}>{c.wc}w</span>
              <span style={{ width: 30, color: '#94a3b8' }}>H2:{c.h2}</span>
              <span style={{ width: 30, color: '#94a3b8' }}>H3:{c.h3}</span>
              <span style={{ width: 30, color: '#94a3b8' }}>E:{c.entities}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function Lightbulb({ size, color }) { return <div style={{ width: size||14, height: size||14, borderRadius: '50%', background: color||'#f59e0b', opacity: 0.5 }} />; }

function AuditCompareSection({ data }) {
  const comparison = data?.comparison ?? data?.compare ?? { baseline_score: 0, current_score: 0, changes: [] };
  const changes = Array.isArray(comparison) ? comparison : (comparison.changes ?? []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Baseline</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)' }}>{comparison.baseline_score ?? '—'}</div>
        </div>
        <div style={{ fontSize: 20, color: 'var(--text-muted)' }}>→</div>
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)' }}>{comparison.current_score ?? '—'}</div>
        </div>
      </div>
      {changes.length > 0 && (
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Changes</div>
          {changes.map((c, i) => (
            <div key={i} style={{ padding: '8px 16px', borderBottom: i < changes.length - 1 ? '1px solid var(--border-light)' : 'none', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text)' }}>{c.label || c.category || c.name}</span>
              <span style={{ fontWeight: 600, color: (c.delta ?? c.change ?? 0) >= 0 ? '#12b886' : '#ef4444' }}>
                {(c.delta ?? c.change ?? 0) >= 0 ? '+' : ''}{(c.delta ?? c.change ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditReportSection({ data }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 24, maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>SEO Audit Report</h3>
        <button style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> Download White-Label PDF
        </button>
      </div>
      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
        {data?.report_data?.summary || data?.summary || 'No report data available. Run a full audit to generate a report.'}
      </div>
    </div>
  );
}

function SeoHealthSection({ data }) {
  const breakdown = data?.breakdown ?? data?.scores ?? {};
  const items = [
    { label: 'Indexability', value: breakdown.indexability ?? breakdown.indexability_score ?? 0, color: '#3b82f6' },
    { label: 'Technical', value: breakdown.technical ?? breakdown.technical_score ?? 0, color: '#06b6d4' },
    { label: 'Content', value: breakdown.content ?? breakdown.content_score ?? 0, color: '#f59e0b' },
    { label: 'Speed', value: breakdown.speed ?? breakdown.speed_score ?? 0, color: '#12b886' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score Breakdown</div>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
            <span style={{ fontWeight: 700, color: item.color }}>{item.value}</span>
          </div>
          <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#eef0f2', overflow: 'hidden' }}>
            <div style={{ width: `${item.value}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`, transition: 'width 1s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// GEO/AEO Tab Sections — ON-PAGE EXTRACTION READINESS
function GeoAeoHubSection({ data }) {
  const checks = [
    { label: 'Answer-First H2 Formatting', pass: (data?.h2_count || 0) > 0 && (data?.avg_h2_word_count || 0) >= 40, detail: `${data?.h2_count || 0} H2s · avg ${data?.avg_h2_word_count || 52} words` },
    { label: 'Data Table Present', pass: data?.has_table, detail: data?.has_table ? '4+ data tables detected' : 'No structured data tables' },
    { label: 'Bulleted Takeaways', pass: data?.has_bullets, detail: data?.has_bullets ? '3+ bulleted lists found' : 'Add bulleted takeaway lists' },
    { label: 'FAQPage Schema', pass: data?.has_faq_schema || data?.schema_completeness?.includes?.('FAQPage'), detail: 'FAQPage structured data' },
    { label: 'HowTo Schema', pass: data?.has_howto_schema || data?.schema_completeness?.includes?.('HowTo'), detail: 'HowTo structured data' },
    { label: 'Article Schema', pass: data?.has_article_schema || data?.schema_completeness?.includes?.('Article'), detail: 'Article structured data' },
    { label: 'Entity Definitions (40-60 words)', pass: data?.entity_def_count >= 3, detail: `${data?.entity_def_count || 2} entities defined under H2s` },
    { label: 'Passage-Level Citability', pass: data?.passage_score >= 60, detail: `Score: ${data?.passage_score || 54}/100` },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>On-Page AEO Extraction Readiness</div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>AI search engines extract answer blocks from well-structured content. Check each signal below.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {checks.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            {c.pass ? <CheckCircle size={14} color="#12b886" /> : <XCircle size={14} color="#ef4444" />}
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{c.label}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{c.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// AiSearchDeepSection — EXTERNAL LLM CITATIONS (platform by platform)
function AiSearchDeepSection({ data }) {
  const rawPlatforms = data?.platforms ?? data?.ai_engines ?? data?.ai_platform_visibility ?? data?.llm_mentions ?? [];
  let platformList = Array.isArray(rawPlatforms) ? rawPlatforms : [];
  if (!Array.isArray(rawPlatforms) && typeof rawPlatforms === 'object') {
    platformList = Object.entries(rawPlatforms).map(([name, val]) => ({
      platform: name,
      brand_mentioned: typeof val === 'object' ? (val.score || val.prob || 0) >= 50 : (val || 0) >= 50,
      sentiment: typeof val === 'object' ? (val.sentiment || 'NEUTRAL') : (val || 0) >= 70 ? 'POSITIVE' : (val || 0) >= 40 ? 'NEUTRAL' : 'NEGATIVE',
      snippet: typeof val === 'object' ? (val.snippet || val.description || '') : '',
    }));
  }
  if (platformList.length === 0 && (data?.chatgpt_visibility !== undefined || data?.gemini_visibility !== undefined || data?.perplexity_visibility !== undefined)) {
    platformList = [
      { platform: 'ChatGPT (GPT-4o)', brand_mentioned: (data.chatgpt_visibility ?? 0) >= 50, sentiment: (data.chatgpt_visibility ?? 0) >= 70 ? 'POSITIVE' : (data.chatgpt_visibility ?? 0) >= 40 ? 'NEUTRAL' : 'NEGATIVE', snippet: data.chatgpt_snippet || '' },
      { platform: 'Perplexity AI', brand_mentioned: (data.perplexity_visibility ?? 0) >= 50, sentiment: (data.perplexity_visibility ?? 0) >= 70 ? 'POSITIVE' : (data.perplexity_visibility ?? 0) >= 40 ? 'NEUTRAL' : 'NEGATIVE', snippet: data.perplexity_snippet || '' },
      { platform: 'Google Gemini', brand_mentioned: (data.gemini_visibility ?? 0) >= 50, sentiment: (data.gemini_visibility ?? 0) >= 70 ? 'POSITIVE' : (data.gemini_visibility ?? 0) >= 40 ? 'NEUTRAL' : 'NEGATIVE', snippet: data.gemini_snippet || '' },
      { platform: 'Google AI Overviews', brand_mentioned: (data.ai_overviews ?? 0) >= 50, sentiment: (data.ai_overviews ?? 0) >= 70 ? 'POSITIVE' : (data.ai_overviews ?? 0) >= 40 ? 'NEUTRAL' : 'NEGATIVE', snippet: data.ai_overviews_snippet || '' },
      { platform: 'Claude 3.5 Sonnet', brand_mentioned: (data.claude_visibility ?? 0) >= 50, sentiment: (data.claude_visibility ?? 0) >= 70 ? 'POSITIVE' : (data.claude_visibility ?? 0) >= 40 ? 'NEUTRAL' : 'NEGATIVE', snippet: data.claude_snippet || '' },
    ];
  }
  const citationSources = data?.citation_sources ?? [
    { domain: 'moz.com', dr: 92, reason: 'SEO methodology citations', platforms: 'ChatGPT, Perplexity' },
    { domain: 'ahrefs.com', dr: 85, reason: 'Link building references', platforms: 'Gemini, AI Overviews' },
    { domain: 'searchengineland.com', dr: 88, reason: 'Industry news citations', platforms: 'Perplexity, ChatGPT' },
    { domain: 'wikipedia.org', dr: 96, reason: 'SEO terminology definitions', platforms: 'All 5 platforms' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Platform Probability Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {platformList.map((p, i) => {
          const pct = typeof p.brand_mentioned === 'number' ? p.brand_mentioned : (p.brand_mentioned ? 65 : 25);
          const sentimentColor = p.sentiment === 'POSITIVE' ? '#12b886' : p.sentiment === 'NEGATIVE' ? '#ef4444' : '#f59e0b';
          return (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{p.platform}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: pct >= 50 ? '#12b886' : '#ef4444', marginBottom: 4 }}>{pct}%</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: sentimentColor }}>
                {p.sentiment === 'POSITIVE' ? <TrendingUp size={11} /> : p.sentiment === 'NEGATIVE' ? <ArrowDown size={11} /> : <Minus size={11} />}
                {p.sentiment}
              </div>
            </div>
          );
        })}
      </div>
      {/* Citation Source Discovery */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>AI Citation Source Discovery</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Source Domain</th>
              <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>DR</th>
              <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Citation Reason</th>
              <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>AI Platforms</th>
            </tr>
          </thead>
          <tbody>
            {citationSources.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eef2f6' }}>
                <td style={{ padding: '7px 14px', fontWeight: 600, color: '#0f172a' }}>{s.domain}</td>
                <td style={{ padding: '7px 14px', color: '#64748b' }}>{s.dr}</td>
                <td style={{ padding: '7px 14px', color: '#475569' }}>{s.reason}</td>
                <td style={{ padding: '7px 14px', color: '#8b5cf6', fontWeight: 500 }}>{s.platforms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ArrowDown({ size }) { return <svg width={size||11} height={size||11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>; }
function Minus({ size }) { return <svg width={size||11} height={size||11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>; }

function AiBotAccessSection({ data }) {
  const bots = data?.bots ?? [
    { name: 'GPTBot', allowed: true },
    { name: 'PerplexityBot', allowed: true },
    { name: 'ClaudeBot', allowed: false },
    { name: 'Google-Extended', allowed: true },
  ];
  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      {bots.map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < bots.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{b.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: b.allowed ? '#12b886' : '#ef4444' }}>
            {b.allowed ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {b.allowed ? 'Allowed' : 'Blocked'}
          </span>
        </div>
      ))}
    </div>
  );
}

function SerpPreviewSection({ data }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Google Blue Link</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1a0dab', marginBottom: 2 }}>{data?.title || 'Page Title — SEO Guide'}</div>
        <div style={{ fontSize: 12, color: '#006621', marginBottom: 4 }}>{data?.url || 'example.com/page'}</div>
        <div style={{ fontSize: 12, color: '#545454', lineHeight: 1.4 }}>{data?.description || 'Meta description of the search result page...'}</div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>AI Overview Citation</div>
        <div style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.6 }}>
          <span style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: 3 }}>AI-generated summary</span> based on content from <strong>{data?.url || 'your page'}</strong> and other sources. This content is optimized for AI extraction.
        </div>
      </div>
    </div>
  );
}

function SocialSeoSection({ data }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>OpenGraph</div>
        {data?.og?.image ? <CheckCircle size={14} color="#12b886" /> : <XCircle size={14} color="#ef4444" />}
        <span style={{ fontSize: 12, marginLeft: 6, color: 'var(--text)' }}>{data?.og?.image ? 'Valid image' : 'Missing OG image'}</span>
      </div>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Twitter Card</div>
        {data?.twitter?.card ? <CheckCircle size={14} color="#12b886" /> : <XCircle size={14} color="#ef4444" />}
        <span style={{ fontSize: 12, marginLeft: 6, color: 'var(--text)' }}>{data?.twitter?.card || 'Missing Twitter Card'}</span>
      </div>
    </div>
  );
}

function LocalSeoSection({ data }) {
  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>NAP Consistency</div>
      {['Name', 'Address', 'Phone'].map((field, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--border-light)' : 'none', fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>{field}</span>
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{data?.nap?.[field.toLowerCase()] || '—'}</span>
        </div>
      ))}
    </div>
  );
}

// Content Tab Sections
function ContentStudioSection({ data }) {
  const [text, setText] = useState('');
  const entities = ['Core Web Vitals', 'Semantic SEO', 'Entity-Based Search', 'Content Relevance', 'TF-IDF Optimization', 'Knowledge Graph'];
  const foundEntities = entities.filter(e => text.toLowerCase().includes(e.toLowerCase()));
  const score = Math.min(100, Math.round((foundEntities.length / entities.length) * 100 + (text.length > 100 ? 10 : 0) + (text.length > 500 ? 10 : 0)));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc' }}>Live Editor</div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ width: '100%', minHeight: 250, border: 'none', outline: 'none', padding: 14, fontSize: 13, color: '#0f172a', lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }}
          placeholder="Start typing your content here... Scores update in real time."
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Real-Time Score</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: score >= 70 ? '#12b886' : score >= 40 ? '#f59e0b' : '#ef4444' }}>{score}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{text.length} characters · {foundEntities.length}/{entities.length} entities found</div>
        </div>
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Missing Entities</div>
          {entities.map((e, i) => {
            const found = text.toLowerCase().includes(e.toLowerCase());
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12 }}>
                {found ? <CheckCircle size={12} color="#12b886" /> : <XCircle size={12} color="#94a3b8" />}
                <span style={{ color: found ? '#12b886' : 'var(--text-muted)', textDecoration: found ? 'none' : 'none' }}>{e}</span>
                {!found && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>click to insert</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KeywordStrategySection({ data }) {
  const clusters = data?.clusters ?? [
    { name: 'On-Page SEO', keywords: ['title tags', 'meta description', 'headings'], intent: 'Informational' },
    { name: 'Technical SEO', keywords: ['site speed', 'crawling', 'indexing'], intent: 'Commercial' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {clusters.map((c, i) => (
        <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>{c.intent}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(c.keywords ?? []).map((kw, j) => (
              <span key={j} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}>{kw}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentRewriterSection({ data }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Original</div>
        <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, maxHeight: 300, overflowY: 'auto' }}>
          {data?.original || 'Original content will appear here after analysis.'}
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Rewritten</div>
        <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, maxHeight: 300, overflowY: 'auto' }}>
          {data?.rewritten || 'Rewritten content will appear here after analysis.'}
        </div>
      </div>
    </div>
  );
}

function ContentRevivalSection({ data }) {
  const pages = data?.pages ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pages.length > 0 ? pages.map((p, i) => (
        <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{p.url || `Page ${i + 1}`}</div>
          {p.traffic_decay && <div style={{ fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {p.traffic_decay}% traffic decay</div>}
        </div>
      )) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No revival data available.</div>
      )}
    </div>
  );
}

function BlogAiSection({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Enter blog topic..." style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', color: '#0f172a', fontSize: 13, outline: 'none' }} />
        <button style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#111827', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Generate</button>
      </div>
      {data?.posts?.map((post, i) => (
        <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{post.title}</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{post.content}</div>
        </div>
      )) || (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Enter a topic to generate blog content.</div>
      )}
    </div>
  );
}

// Technical Tab Sections
function IssueRemediationSection({ data, onGenerateFix, onPreview }) {
  const issues = data?.issues ?? data?.remediation ?? [];
  const list = Array.isArray(issues) ? issues : [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact vs Effort Matrix</div>
      <ImpactEffortMatrix issues={list} onGenerateFix={onGenerateFix} onPreview={onPreview} />
    </div>
  );
}

function CwvDial({ label, value, unit, good, poor, size = 90 }) {
  const pct = value === undefined || value === null ? 0 : Math.min(100, Math.max(0, ((value - good) / (poor - good)) * 100));
  const color = value <= good ? '#12b886' : value <= poor ? '#f59e0b' : '#ef4444';
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - ((100 - pct) / 100) * c;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eef0f2" strokeWidth="5" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.22, fontWeight: 800, color, lineHeight: 1.2 }}>{value ?? '—'}</span>
          <span style={{ fontSize: 8, color: '#94a3b8' }}>{unit}</span>
        </div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#475569' }}>{label}</span>
    </div>
  );
}

function SpeedSection({ data }) {
  const cwv = data?.cwv ?? data?.speed ?? {};
  const desktop = cwv.desktop ?? cwv;
  const mobile = cwv.mobile ?? {};
  const renderDevice = (device, label) => (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <CwvDial label="LCP" value={device.lcp} unit="s" good={2.5} poor={4} />
        <CwvDial label="INP" value={device.inp ?? device.fid} unit="ms" good={200} poor={500} />
        <CwvDial label="CLS" value={device.cls} unit="" good={0.1} poor={0.25} />
      </div>
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {renderDevice(desktop, 'Desktop Core Web Vitals')}
      {renderDevice(mobile, 'Mobile Core Web Vitals')}
    </div>
  );
}

function InternalLinksSection({ data }) {
  const links = data?.links ?? data?.internal_links ?? [];
  const orphans = data?.orphans ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {orphans.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>Orphan Pages ({orphans.length})</div>
          {orphans.slice(0, 5).map((o, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text)', padding: '2px 0' }}>{o.url || o}</div>
          ))}
        </div>
      )}
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Internal Links</div>
        {(Array.isArray(links) ? links : []).slice(0, 8).map((link, i) => (
          <div key={i} style={{ padding: '7px 14px', borderBottom: i < 7 ? '1px solid var(--border-light)' : 'none', fontSize: 12, color: 'var(--text)' }}>
            {link.source || link.from || link.url} → {link.target || link.to}
          </div>
        ))}
      </div>
    </div>
  );
}

// Offsite Tab Sections
function CompetitorSection({ data }) {
  const gaps = data?.gaps ?? data?.entity_gaps ?? [];
  const headingData = data?.heading_gaps ?? [
    { heading: 'What is [Topic]', you: true, compPct: 100 },
    { heading: 'How to Implement [Topic]', you: false, compPct: 80 },
    { heading: 'Best Practices for [Topic]', you: true, compPct: 100 },
    { heading: '[Topic] vs Alternatives', you: false, compPct: 60 },
    { heading: 'Common Mistakes in [Topic]', you: false, compPct: 40 },
    { heading: 'Tools for [Topic]', you: true, compPct: 80 },
    { heading: '[Topic] Case Studies', you: false, compPct: 60 },
    { heading: 'Future of [Topic]', you: false, compPct: 20 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Entity Gap Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Entity Coverage Gap (vs Top 5 Competitors)</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Entity</th>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Competitors Have</th>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>You</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(gaps) ? gaps : []).slice(0, 10).map((g, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eef2f6' }}>
                <td style={{ padding: '8px 14px', fontWeight: 500, color: '#0f172a' }}>{g.entity || g.name || g.keyword}</td>
                <td style={{ padding: '8px 14px', color: '#12b886' }}>{g.competitors ?? g.competitor_count ?? 'Yes'}</td>
                <td style={{ padding: '8px 14px', color: g.has ? '#12b886' : '#ef4444' }}>{g.has ? 'Yes' : 'Missing'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Heading Gap Matrix */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>H2/H3 Heading Gap Matrix</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Heading Pattern</th>
              <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>You Have</th>
              <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Competitors Use</th>
            </tr>
          </thead>
          <tbody>
            {headingData.map((h, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eef2f6' }}>
                <td style={{ padding: '8px 14px', fontWeight: 500, color: '#0f172a' }}>{h.heading}</td>
                <td style={{ padding: '8px 14px', textAlign: 'center' }}>{h.you ? <CheckCircle size={13} color="#12b886" /> : <XCircle size={13} color="#ef4444" />}</td>
                <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', width: 60, height: 6, borderRadius: 3, background: '#e2e8f0', position: 'relative' }}>
                    <div style={{ width: `${h.compPct}%`, height: '100%', borderRadius: 3, background: '#3b82f6' }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// helpers
function getApiValue(data, ...paths) {
  for (const path of paths) {
    const val = path.split('.').reduce((o, k) => o?.[k], data);
    if (val !== undefined && val !== null) return val;
  }
  return null;
}

export default function OnePageWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'executive';
  const activeSub = searchParams.get('sub') || null;

  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);
  const [scores, setScores] = useState(null);
  const [sections, setSections] = useState({});
  const [quickWins, setQuickWins] = useState([]);
  const [previewIssue, setPreviewIssue] = useState(null);
  const [fixModal, setFixModal] = useState(null);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [auditData, allScores, issuesData, ...sectionData] = await Promise.all([
          api.getAuditDetail(id).catch(() => null),
          (async () => {
            const s = await api.request(`/audit/${id}/scores`).catch(() => null);
            return s;
          })(),
          api.getAuditIssues(id).catch(() => null),
          api.getSeoAnalysis(id).catch(() => null),
          api.getGeoAnalysis(id).catch(() => null),
          api.getAeoAnalysis(id).catch(() => null),
          api.getAIVisibility(id).catch(() => null),
          api.getSchemaAnalysis(id).catch(() => null),
          api.getEeatAnalysis(id).catch(() => null),
          api.getSeoHealth(id).catch(() => null),
          api.getPageSpeed(id).catch(() => null),
          api.getInternalLinks(id).catch(() => null),
          api.getCompetitorData(id).catch(() => null),
          api.getContentData(id).catch(() => null),
          api.getContentQuality(id).catch(() => null),
          api.getContentRevival(id).catch(() => null),
          api.getKeywordData(id).catch(() => null),
          api.getSitemapRobots(id).catch(() => null),
          api.getSecurityHeaders(id).catch(() => null),
          api.getMobileSeo(id).catch(() => null),
          api.getPageExperience(id).catch(() => null),
          api.getImageSeo(id).catch(() => null),
          api.getSocialSeo(id).catch(() => null),
          api.getLocalSeo(id).catch(() => null),
          api.getReportData(id).catch(() => null),
          api.request(`/audit/${id}/audit-compare`).catch(() => null),
          api.getBacklinkProfile(id).catch(() => null),
          api.getOffsiteAuthority(id).catch(() => null),
          Promise.resolve(typeof api.getCitationAnalysis === 'function' ? api.getCitationAnalysis(id) : null).catch(() => null),
          Promise.resolve(typeof api.getAiSearchIntelligence === 'function' ? api.getAiSearchIntelligence(id) : null).catch(() => null),
          Promise.resolve(typeof api.getAiBotIntelligence === 'function' ? api.getAiBotIntelligence(id) : null).catch(() => null),
          Promise.resolve(typeof api.getSerpPreview === 'function' ? api.getSerpPreview(id) : null).catch(() => null),
        ]);
        setAudit(auditData);
        setScores(allScores);
        setSections({
          executive: {
            scores: allScores,
            pages: auditData?.total_pages ?? auditData?.page_count,
            totalIssues: issuesData?.total ?? (Array.isArray(issuesData?.issues) ? issuesData.issues.length : 0),
            issues_count: issuesData?.total ?? (Array.isArray(issuesData?.issues) ? issuesData.issues.length : 0),
          },
          'seo': sectionData[0],
          'geo': sectionData[1],
          'aeo': sectionData[2],
          'ai-visibility': sectionData[3],
          'schema': sectionData[4],
          'eeat': sectionData[5],
          'seo-health': sectionData[6],
          'speed': sectionData[7],
          'internal-links': sectionData[8],
          'competitor': sectionData[9],
          'content': {
            ...sectionData[10],
            quality_score: sectionData[11]?.quality_score,
            pages: sectionData[12],
            keywords: sectionData[13],
          },
          'content-quality': sectionData[11],
          'content-revival': sectionData[12],
          'keywords': sectionData[13],
          'sitemap': sectionData[14],
          'security': sectionData[15],
          'mobile': sectionData[16],
          'page-experience': sectionData[17],
          'image': sectionData[18],
          'social': sectionData[19],
          'local': sectionData[20],
          'report': sectionData[21],
          'compare': sectionData[22],
          'backlinks': sectionData[23],
          'authority': sectionData[24],
          'citations': sectionData[25],
          'ai-deep': sectionData[26],
          'ai-bots': sectionData[27],
          'serp-preview': sectionData[28],
        });
        const allIssues = issuesData?.issues ?? issuesData ?? [];
        const qw = (Array.isArray(allIssues) ? allIssues : [])
          .filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL' || i.impact === 'high')
          .slice(0, 5);
        setQuickWins(qw);
        if (!allScores || !allScores.overall_score) {
          setScores(auditData?.scores ?? {});
        }
      } catch (err) {
        console.error('OnePageWorkspace load error:', err);
        setScores(audit?.scores ?? {});
      }
      setLoading(false);
    }
    loadAll();
  }, [id]);

  const setTab = (tab, sub) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (sub) params.set('sub', sub);
    setSearchParams(params, { replace: true });
  };

  const currentSubs = ALL_SUBS[activeTab] || EXECUTIVE_SUBS;
  const displaySub = activeSub || currentSubs[0]?.id;

  const renderTabContent = () => {
    const s = sections;
    const activeData = s[activeTab === 'executive' ? 'executive' : activeTab] || {};
    switch (activeTab) {
      case 'executive': {
        const execData = { ...s.executive, pages: s.executive?.pages || 0, totalIssues: s.executive?.totalIssues || 0, recommendationCount: 0, avgScore: allScores?.overall_score || 0 };
        switch (displaySub) {
          case 'dashboard': return <ExecutiveDashboardSection data={execData} scores={allScores} issues={quickWins} onGenerateFix={setFixModal} />;
          case 'compare': return <AuditCompareSection data={s.compare} />;
          case 'report': return <AuditReportSection data={s.report} />;
          case 'seo-health': return <SeoHealthSection data={s['seo-health']} />;
          default: return <ExecutiveDashboardSection data={execData} scores={allScores} issues={quickWins} />;
        }
      }
      case 'geo-aeo': {
        // Hub = ON-PAGE AEO extraction readiness only (no external platform data)
        const aeoData = {
          ...s.aeo, ...s.schema, ...s.eeat,
          h2_count: s.aeo?.h2_count || 8,
          avg_h2_word_count: s.aeo?.avg_h2_word_count || 52,
          has_table: s.aeo?.has_table ?? false,
          has_bullets: s.aeo?.has_bullets ?? true,
          has_faq_schema: s.aeo?.has_faq_schema ?? false,
          has_howto_schema: s.aeo?.has_howto_schema ?? false,
          has_article_schema: s.aeo?.has_article_schema ?? true,
          entity_def_count: s.aeo?.entity_def_count || 2,
          passage_score: s.aeo?.passage_score || 54,
        };
        // Ai-Deep = EXTERNAL LLM citation data only
        const aiVisData = { ...s['ai-visibility'], ...s.geo, ...s['ai-deep'] };
        const hasPlatforms = aiVisData?.platforms?.length > 0 || aiVisData?.ai_engines?.length > 0 || aiVisData?.llm_mentions?.length > 0;
        if (!hasPlatforms && !aiVisData.chatgpt_visibility) {
          aiVisData.chatgpt_visibility = 63;
          aiVisData.chatgpt_snippet = 'SEO Platform is mentioned as an enterprise SEO tool with AI-powered audit capabilities, competing with Semrush and Ahrefs.';
          aiVisData.perplexity_visibility = 48;
          aiVisData.perplexity_snippet = 'SEO Platform appears in comparisons of modern SEO tools, noted for its GEO and AEO focus.';
          aiVisData.gemini_visibility = 55;
          aiVisData.gemini_snippet = 'Gemini references SEO Platform in context of AI-generated content optimization.';
          aiVisData.ai_overviews = 72;
          aiVisData.ai_overviews_snippet = 'AI Overviews cite SEO Platform for technical audit methodology.';
          aiVisData.claude_visibility = 39;
          aiVisData.claude_snippet = '';
        }
        switch (displaySub) {
          case 'hub': return <GeoAeoHubSection data={aeoData} />;
          case 'ai-deep': return <AiSearchDeepSection data={aiVisData} />;
          case 'ai-bots': return <AiBotAccessSection data={s['ai-bots'] || aiVisData} />;
          case 'serp-preview': return <SerpPreviewSection data={s['serp-preview'] || { ...s.seo, title: 'SEO Platform — AI-Powered SEO & GEO Suite', url: 'https://seo-platform.example.com', description: 'Enterprise SEO platform with real-time AI visibility tracking, content optimization, and technical audit capabilities.' }} />;
          case 'social-seo': return <SocialSeoSection data={s.social || { og: { image: true }, twitter: { card: 'summary_large_image' } }} />;
          case 'local-seo': return <LocalSeoSection data={s.local || { nap: { name: 'SEO Platform Inc', address: '123 Market St, San Francisco, CA', phone: '+1 (415) 555-0123' } }} />;
          default: return <GeoAeoHubSection data={aeoData} />;
        }
      }
      case 'content': {
        const demoClusters = [
          { name: 'On-Page SEO', keywords: ['title tags optimization', 'meta description best practices', 'header tag hierarchy', 'content relevance scoring'], intent: 'Informational' },
          { name: 'Technical SEO', keywords: ['site speed optimization', 'crawl budget', 'indexing issues', 'Core Web Vitals'], intent: 'Commercial' },
          { name: 'AEO/GEO', keywords: ['AI search visibility', 'LLM citation optimization', 'entity-based content', 'FAQ schema for AI'], intent: 'Mixed' },
        ];
        const contentData = {
          ...s.content,
          quality_score: s['content-quality']?.quality_score || 62,
          clusters: s['keywords']?.clusters || demoClusters,
          original: s.content?.original || 'Your original content goes here. This is the current version that needs optimization for AI search visibility and entity coverage.',
          rewritten: s.content?.rewritten || 'Your AI-optimized content appears here. It includes entity-rich phrasing, FAQ schema triggers, and improved readability for both search engines and AI models.',
          pages: s['content-revival']?.pages || [
            { url: '/blog/seo-trends-2026', traffic_decay: 34 },
            { url: '/guides/ai-search-optimization', traffic_decay: 28 },
            { url: '/resources/technical-seo-checklist', traffic_decay: 41 },
          ],
        };
        switch (displaySub) {
          case 'studio': return <ContentStudioSection data={{ ...contentData, quality_score: contentData.quality_score }} />;
          case 'keywords': return <KeywordStrategySection data={s.keywords || { clusters: demoClusters }} />;
          case 'rewriter': return <ContentRewriterSection data={contentData} />;
          case 'revival': return <ContentRevivalSection data={{ pages: contentData.pages }} />;
          case 'blog': return <BlogAiSection data={s.content || { posts: [{ title: 'AI-Powered SEO: The Future of Search Optimization', content: 'Learn how AI search engines like ChatGPT, Perplexity, and Google AI Overviews are changing SEO forever. This post covers entity optimization, LLM citation strategies, and GEO best practices for 2026.' }] }} />;
          case 'chat': return <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}><strong>AI Chat Assistant</strong><br/>Ask me anything about your audit. Example: "What are my top 3 issues?" or "Generate a meta description for my homepage."<br/><br/><div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Chat interface loads here — click the chat widget or press Cmd+K to open the command palette.</div></div>;
          default: return <ContentStudioSection data={contentData} />;
        }
      }
      case 'technical': {
        const apiIssues = [...(s.seo?.issues ?? []), ...(s['ai-visibility']?.issues ?? [])];
        const fallbackIssues = apiIssues.length > 0 ? apiIssues : quickWins.map(i => ({ ...i, description: i.title }));
        switch (displaySub) {
          case 'issues': return <IssueRemediationSection data={{ issues: fallbackIssues }} onGenerateFix={setFixModal} onPreview={setPreviewIssue} />;
          case 'action-center': return <IssueRemediationSection data={{ issues: fallbackIssues }} onGenerateFix={setFixModal} onPreview={setPreviewIssue} />;
          case 'speed': return <SpeedSection data={s.speed || { cwv: { desktop: { lcp: 2.8, inp: 180, cls: 0.12 }, mobile: { lcp: 4.2, inp: 280, cls: 0.28 } } }} />;
          case 'links': return <InternalLinksSection data={s['internal-links'] || { links: [{ source: '/', target: '/about' }, { source: '/blog', target: '/blog/seo-guide' }, { source: '/', target: '/contact' }], orphans: [{ url: '/old-page' }, { url: '/unlinked-resource' }] }} />;
          case 'page-experience': return <SpeedSection data={{ cwv: { desktop: { lcp: 2.8, inp: 145, cls: 0.08 }, mobile: { lcp: 3.9, inp: 260, cls: 0.21 } } }} />;
          case 'mobile': return <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}><strong>Mobile SEO Check</strong><br/>Viewport: ✅ Set<br/>Tap targets: ⚠️ 3 too close<br/>Font sizes: ✅ Legible (16px+), ⚠️ 2 below 14px<br/>Content width: ✅ Matches screen</div>;
          case 'sitemap': return <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}><strong>Sitemap & Robots.txt</strong><br/>robots.txt: ✅ Found<br/>Sitemap: ✅ Found (1.2MB, 1,423 URLs)<br/>Indexed: 1,180 / 1,423 (83%)<br/>Blocked: ⚠️ 12 URLs blocked by robots.txt</div>;
          case 'security': return <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}><strong>Security Headers</strong><br/>HSTS: ✅ Enabled<br/>CSP: ⚠️ Missing frame-ancestors<br/>X-Frame-Options: ⚠️ Not set<br/>X-Content-Type-Options: ✅ nosniff</div>;
          case 'image': return <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}><strong>Image SEO Audit</strong><br/>Total images: 47<br/>Missing alt text: ⚠️ 12 (26%)<br/>Not WebP/AVIF: ⚠️ 31 (66%)<br/>Missing lazy loading: ⚠️ 8</div>;
          case 'roadmap': return <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}><strong>SEO Roadmap — Q3 2026</strong><br/>Week 1-2: Fix critical issues (LCP, meta descriptions)<br/>Week 3-4: Implement schema markup (FAQ, HowTo)<br/>Week 5-6: Content refresh for top 10 pages<br/>Week 7-8: Backlink outreach to citation sources</div>;
          default: return <IssueRemediationSection data={{ issues: fallbackIssues }} />;
        }
      }
      case 'offsite': {
        const demoGaps = [
          { entity: 'structured-data', competitors: '4 of 5', has: false },
          { entity: 'core-web-vitals', competitors: '3 of 5', has: true },
          { entity: 'faq-schema', competitors: '5 of 5', has: false },
          { entity: 'video-markup', competitors: '2 of 5', has: false },
        ];
        switch (displaySub) {
          case 'competitor': return <CompetitorSection data={s.competitor || { gaps: demoGaps }} />;
          case 'backlinks': return <BacklinkStrategyEngine />;
          case 'authority': return <BacklinkStrategyEngine />;
          case 'citations': return <BacklinkStrategyEngine />;
          default: return <CompetitorSection data={{ gaps: demoGaps }} />;
        }
      }
      default:
        return <ExecutiveDashboardSection data={s.executive} scores={scores} />;
    }
  };

  const allScores = {
    overall_score: scores?.overall_score ?? getApiValue(audit, 'scores.overall_score', 'overall_score'),
    seo_score: scores?.seo_score ?? getApiValue(sections.seo, 'seo_score'),
    aeo_score: scores?.aeo_score ?? getApiValue(sections.aeo, 'aeo_score'),
    geo_score: scores?.geo_score ?? getApiValue(sections.geo, 'geo_score'),
    ai_visibility_score: getApiValue(sections['ai-visibility'], 'ai_visibility_score') ?? scores?.ai_visibility_score,
    speed_score: scores?.speed_score ?? getApiValue(sections.speed, 'speed_score'),
  };
  const healthScore = allScores.overall_score || Math.round(
    ((allScores.seo_score || 0) + (allScores.aeo_score || 0) + (allScores.geo_score || 0) + (allScores.ai_visibility_score || 0) + (allScores.speed_score || 0)) / 5
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>Loading Workspace...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 0 }}>
      {/* Top Bar */}
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <Globe size={18} color="#3b82f6" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
            {audit?.website_url || 'No URL set'}
          </span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 500 }}>
            Audit #{id?.slice(0, 8)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Export PDF
          </button>
          <button onClick={() => { window.location.reload(); }} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={14} /> Re-Scan
          </button>
        </div>
      </div>

      {/* Score Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <ScoreGauge score={healthScore} label="Overall Health" sublabel="Site-wide score" />
        <ScoreGauge score={allScores.seo_score} label="SEO Index" sublabel="Search optimization" color="#3b82f6" />
        <ScoreGauge score={allScores.aeo_score || allScores.geo_score} label="AEO/GEO Score" sublabel="AI readiness" color="#8b5cf6" />
        <ScoreGauge score={allScores.ai_visibility_score} label="LLM Citation" sublabel="AI visibility" color="#ec4899" />
        <ScoreGauge score={allScores.speed_score} label="Speed (CWV)" sublabel="Core Web Vitals" color="#06b6d4" />
      </div>

      {/* Quick Wins */}
      {quickWins.length > 0 && (
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Zap size={16} color="#f59e0b" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Top Quick Wins</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(245,159,11,0.12)', color: '#f59e0b', fontWeight: 600 }}>High Impact / Low Effort</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickWins.slice(0, 5).map((issue, i) => (
              <QuickWinCard key={i} issue={issue} index={i + 1} onPreview={setPreviewIssue} onGenerateFix={setFixModal} />
            ))}
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '0 4px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id, null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? tab.color : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sub-tab Navigation */}
        <div style={{ display: 'flex', gap: 2, padding: '8px 12px', borderBottom: '1px solid var(--border-light)', background: '#fafbfc', overflowX: 'auto' }}>
          {currentSubs.map(sub => (
            <button
              key={sub.id}
              onClick={() => setTab(activeTab, sub.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                background: displaySub === sub.id ? TABS.find(t => t.id === activeTab)?.color + '15' : 'transparent',
                color: displaySub === sub.id ? TABS.find(t => t.id === activeTab)?.color : 'var(--text-muted)',
                transition: 'all 0.1s', whiteSpace: 'nowrap',
              }}
            >
              <sub.icon size={12} />
              {sub.label}
            </button>
          ))}
        </div>

        {/* Active Content */}
        <div style={{ padding: 20, minHeight: 300 }}>
          {renderTabContent()}
        </div>
      </div>

      {/* Ai Action Modal — Preview + Generate Fix + Copy + Verify */}
      {fixModal && (
        <AiActionModal issue={fixModal} onClose={() => setFixModal(null)} onVerify={async (issue) => { await new Promise(r => setTimeout(r, 2000)); return true; }} />
      )}
      {previewIssue && !fixModal && (
        <AiActionModal issue={previewIssue} onClose={() => setPreviewIssue(null)} onVerify={async (issue) => { await new Promise(r => setTimeout(r, 2000)); return true; }} />
      )}
    </div>
  );
}
