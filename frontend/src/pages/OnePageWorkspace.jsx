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
import LlmExtractionChecklist from '../components/LlmExtractionChecklist';
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ScoreVelocityPredictor currentScore={scores?.overall_score || 68} criticalCount={criticalCount || 3} />
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

// GEO/AEO Tab Sections
function GeoAeoHubSection({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <LlmExtractionChecklist data={data} />
    </div>
  );
}

function AiSearchDeepSection({ data }) {
  const engines = data?.engines ?? data?.ai_engines ?? [
    { name: 'ChatGPT', prob: data?.chatgpt_visibility ?? 0 },
    { name: 'Perplexity', prob: data?.perplexity_visibility ?? 0 },
    { name: 'Gemini', prob: data?.gemini_visibility ?? 0 },
    { name: 'AI Overviews', prob: data?.ai_overviews ?? 0 },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      {engines.map((e, i) => (
        <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{e.name}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: (e.prob ?? 0) >= 50 ? '#12b886' : '#ef4444' }}>{(e.prob ?? 0)}%</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {(e.prob ?? 0) >= 50 ? 'Likely cited' : 'Low citation probability'}
          </div>
        </div>
      ))}
    </div>
  );
}

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

function SpeedSection({ data }) {
  const cwv = data?.cwv ?? data?.speed ?? {};
  const desktop = cwv.desktop ?? cwv;
  const mobile = cwv.mobile ?? {};
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Desktop</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['LCP', desktop.lcp], ['FID/INP', desktop.inp ?? desktop.fid], ['CLS', desktop.cls]].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontWeight: 600, color: val && val < 2.5 ? '#12b886' : val < 4 ? '#f59e0b' : '#ef4444' }}>{val ?? '—'}{label === 'CLS' ? '' : 's'}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Mobile</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['LCP', mobile.lcp], ['FID/INP', mobile.inp ?? mobile.fid], ['CLS', mobile.cls]].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontWeight: 600, color: val && val < 2.5 ? '#12b886' : val < 4 ? '#f59e0b' : '#ef4444' }}>{val ?? '—'}{label === 'CLS' ? '' : 's'}</span>
            </div>
          ))}
        </div>
      </div>
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
  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Entity & Heading Gap (vs Top 5)</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Entity</th>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Competitors Have</th>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>You</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(gaps) ? gaps : []).slice(0, 10).map((g, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
              <td style={{ padding: '8px 14px', fontWeight: 500, color: 'var(--text)' }}>{g.entity || g.name || g.keyword}</td>
              <td style={{ padding: '8px 14px', color: '#12b886' }}>{g.competitors ?? g.competitor_count ?? 'Yes'}</td>
              <td style={{ padding: '8px 14px', color: g.has ? '#12b886' : '#ef4444' }}>{g.has ? 'Yes' : 'Missing'}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
          api.getSpeedAnalysis(id).catch(() => null) ?? api.getPageSpeed(id).catch(() => null),
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
          api.getCitationAnalysis?.(id).catch(() => null),
          api.getAiSearchIntelligence?.(id).catch(() => null),
          api.getAiBotIntelligence?.(id).catch(() => null),
          api.getSerpPreview?.(id).catch(() => null),
        ]);
        setAudit(auditData);
        setScores(allScores);
        setSections({
          executive: { scores: allScores, pages: auditData?.page_count },
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
        setQuickWins((Array.isArray(allIssues) ? allIssues : [])
          .filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL' || i.impact === 'high')
          .slice(0, 5));
      } catch (err) {
        console.error('OnePageWorkspace load error:', err);
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
        switch (displaySub) {
          case 'dashboard': return <ExecutiveDashboardSection data={s.executive} scores={allScores || s?.executive?.scores} issues={quickWins} onGenerateFix={setFixModal} />;
          case 'compare': return <AuditCompareSection data={s.compare || s.executive} />;
          case 'report': return <AuditReportSection data={s.report} />;
          case 'seo-health': return <SeoHealthSection data={s['seo-health'] || s.seo} />;
          default: return <ExecutiveDashboardSection data={s.executive} scores={scores} />;
        }
      }
      case 'geo-aeo': {
        switch (displaySub) {
          case 'hub': return <GeoAeoHubSection data={{ ...s.geo, ...s.aeo, ...s['ai-visibility'], ...s.schema, ...s.eeat }} />;
          case 'ai-deep': return <AiSearchDeepSection data={s['ai-deep'] || s['ai-visibility'] || s.geo} />;
          case 'ai-bots': return <AiBotAccessSection data={s['ai-bots'] || s['ai-visibility']} />;
          case 'serp-preview': return <SerpPreviewSection data={s['serp-preview'] || s.seo} />;
          case 'social-seo': return <SocialSeoSection data={s.social || s.seo} />;
          case 'local-seo': return <LocalSeoSection data={s.local || s.seo} />;
          default: return <GeoAeoHubSection data={{ ...s.geo, ...s.aeo, ...s['ai-visibility'] }} />;
        }
      }
      case 'content': {
        switch (displaySub) {
          case 'studio': return <ContentStudioSection data={{ ...s.content, quality_score: s['content-quality']?.quality_score }} />;
          case 'keywords': return <KeywordStrategySection data={s.keywords || s.content} />;
          case 'rewriter': return <ContentRewriterSection data={s.content} />;
          case 'revival': return <ContentRevivalSection data={s['content-revival'] || s.content} />;
          case 'blog': return <BlogAiSection data={s.content} />;
          case 'chat': return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>AI Chat loads here. Open the chat widget for full context-aware assistance.</div>;
          default: return <ContentStudioSection data={s.content} />;
        }
      }
      case 'technical': {
        switch (displaySub) {
          case 'issues': return <IssueRemediationSection data={{ issues: [...(s.seo?.issues ?? []), ...(s['ai-visibility']?.issues ?? [])] }} onGenerateFix={setFixModal} onPreview={setPreviewIssue} />;
          case 'action-center': return <IssueRemediationSection data={{ issues: [...(s.seo?.issues ?? []), ...(s['ai-visibility']?.issues ?? [])] }} onGenerateFix={setFixModal} onPreview={setPreviewIssue} />;
          case 'speed': return <SpeedSection data={s.speed || s.seo} />;
          case 'links': return <InternalLinksSection data={s['internal-links'] || s.seo} />;
          case 'page-experience': return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Page Experience data loads from PageSpeed API.</div>;
          case 'mobile': return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Mobile SEO data — check mobile-friendliness and viewport settings.</div>;
          case 'sitemap': return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sitemap & Robots.txt analysis.</div>;
          case 'security': return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Security Headers: HSTS, CSP, X-Frame-Options, etc.</div>;
          case 'image': return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Image SEO: alt text, dimensions, WebP/AVIF, lazy loading.</div>;
          case 'roadmap': return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>SEO Roadmap — interactive multi-month Gantt chart.</div>;
          default: return <IssueRemediationSection data={{ issues: s.seo?.issues ?? [] }} />;
        }
      }
      case 'offsite': {
        switch (displaySub) {
          case 'competitor': return <CompetitorSection data={s.competitor || s.seo} />;
          case 'backlinks': return <BacklinkStrategyEngine />;
          case 'authority': return <BacklinkStrategyEngine />;
          case 'citations': return <BacklinkStrategyEngine />;
          default: return <CompetitorSection data={s.competitor} />;
        }
      }
      default:
        return <ExecutiveDashboardSection data={s.executive} scores={scores} />;
    }
  };

  const allScores = {
    overall_score: scores?.overall_score ?? getApiValue(audit, 'overall_score'),
    seo_score: scores?.seo_score ?? getApiValue(sections.seo, 'seo_score'),
    aeo_score: scores?.aeo_score ?? getApiValue(sections.aeo, 'aeo_score'),
    geo_score: scores?.geo_score ?? getApiValue(sections.geo, 'geo_score'),
    ai_visibility_score: scores?.ai_visibility_score ?? getApiValue(sections['ai-visibility'], 'ai_visibility_score'),
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
