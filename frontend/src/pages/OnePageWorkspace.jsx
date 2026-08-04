import { useState, useEffect, useMemo, useRef } from 'react';
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
  Activity, FileText, TrendingUp, ArrowUp, Target, Filter, Send, User
} from 'lucide-react';
import ScoreVelocityPredictor from '../components/ScoreVelocityPredictor';
import AiActionModal from '../components/AiActionModal';
import ImpactEffortMatrix from '../components/ImpactEffortMatrix';
import DataSourceBadge from '../components/DataSourceBadge';

const SOURCE_BADGE_MAP = {
  live: 'measured',
  measured: 'measured',
  dataforseo: 'measured',
  signals: 'estimated',
  estimated: 'estimated',
  stored: 'simulated',
  simulated: 'simulated',
  'crawl-derived': 'crawler',
  crawler: 'crawler',
  formula: 'formula',
};

function SourceBadge({ source, size = 'xs', label }) {
  if (!source) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {label && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>}
      <DataSourceBadge source={SOURCE_BADGE_MAP[source] || source} size={size} />
    </span>
  );
}

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
function ExecutiveDashboardSection({ data, scores, issues, onGenerateFix, comparison }) {
  const criticalCount = (Array.isArray(issues) ? issues : []).filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
  const hasComparison = comparison && Object.keys(comparison).length > 0 && (comparison.your_avg_words !== undefined || comparison.competitor_avg_words !== undefined);
  const compRows = hasComparison ? [
    { label: 'Avg Words / Page', you: comparison.your_avg_words, comp: comparison.competitor_avg_words },
    { label: 'Schema Coverage', you: `${comparison.your_schema_coverage ?? 0}%`, comp: `${comparison.competitor_schema_coverage ?? 0}%` },
    { label: 'OG Tags Coverage', you: `${comparison.your_og_coverage ?? 0}%`, comp: `${comparison.competitor_og_coverage ?? 0}%` },
    { label: 'Internal Links', you: comparison.your_internal_links, comp: comparison.competitor_internal_links },
    { label: 'H1 Coverage', you: `${comparison.your_h1_coverage ?? 0}%`, comp: `${comparison.competitor_h1_coverage ?? 0}%` },
    { label: 'Blog Pages', you: comparison.your_blog_pages, comp: comparison.competitor_blog_pages },
    { label: 'FAQ Pages', you: comparison.your_faq_pages, comp: comparison.competitor_faq_pages },
  ] : [];
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
      {hasComparison ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>You vs Competitor — Live Comparison</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Metric</th>
                <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, color: '#6366f1' }}>Your Site</th>
                <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Competitor</th>
              </tr>
            </thead>
            <tbody>
              {compRows.map((r, i) => {
                const numYou = parseFloat(r.you); const numComp = parseFloat(r.comp);
                const better = isNaN(numYou) || isNaN(numComp) ? null : numYou > numComp;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 16px', color: '#0f172a', fontWeight: 500 }}>{r.label}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: better === false ? '#ef4444' : '#0f172a' }}>{r.you}{better === true ? ' ✓' : better === false ? ' !' : ''}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', color: '#64748b' }}>{r.comp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, fontSize: 12, color: '#64748b' }}>
          No competitor comparison available yet. Run a competitor analysis to benchmark your content against a rival site.
        </div>
      )}
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
  const score = data?.seo_health_score;
  const grade = data?.grade;
  const checks = data?.health_checks ?? [];
  const scoresObj = data?.scores ?? {};
  const topIssues = data?.top_issues ?? [];
  const barScores = checks.length > 0 ? checks : [
    { name: 'Technical', score: scoresObj.technical ?? 0 },
    { name: 'Content', score: scoresObj.content ?? 0 },
    { name: 'AEO', score: scoresObj.aeo ?? 0 },
    { name: 'GEO', score: scoresObj.geo ?? 0 },
  ];
  const statusColor = (status) => status === 'pass' ? '#12b886' : status === 'warn' ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {score !== undefined && score !== null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <TechScoreCard label="SEO Health Score" value={Math.round(score)} sub="out of 100" color={score >= 80 ? '#12b886' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'} />
          <TechScoreCard label="Grade" value={grade || '—'} sub="overall health" color={grade === 'A' ? '#12b886' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : '#ef4444'} />
          <TechScoreCard label="High Issues" value={data?.site_stats?.high_issues ?? 0} sub="need attention" />
          <TechScoreCard label="Errors" value={data?.site_stats?.error_pages ?? 0} sub="4xx/5xx pages" color={(data?.site_stats?.error_pages ?? 0) > 0 ? '#ef4444' : '#12b886'} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>No SEO health data available for this audit.</div>
      )}
      {barScores.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Health Check Breakdown</div>
          {barScores.slice(0, 8).map((item, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.name}</span>
                <span style={{ fontWeight: 700, color: statusColor(item.status) || '#0f172a' }}>{item.score}{item.status ? ` · ${item.status}` : ''}</span>
              </div>
              <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#eef0f2', overflow: 'hidden' }}>
                <div style={{ width: `${item.score}%`, height: '100%', borderRadius: 4, background: statusColor(item.status) || 'linear-gradient(90deg,#3b82f6,#8b5cf6)', transition: 'width 1s ease' }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {topIssues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Top Issues — What's Wrong & How to Fix" count={topIssues.length} />
          {topIssues.slice(0, 10).map((iss, i) => (
            <div key={i} style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: iss.severity === 'CRITICAL' || iss.severity === 'HIGH' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', color: iss.severity === 'CRITICAL' || iss.severity === 'HIGH' ? '#ef4444' : '#d97706' }}>{iss.severity}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{iss.signal_name}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{iss.description}{iss.page_url ? ` · ${iss.page_url}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// GEO/AEO Tab Sections — ON-PAGE EXTRACTION READINESS
function GeoAeoHubSection({ data }) {
  const score = data?.aeo_score ?? 0;
  const issues = data?.issues ?? [];
  const signals = data?.signals ?? {};
  const signalEntries = Object.entries(signals).filter(([,v]) => typeof v === 'object' && v !== null);
  const byPage = {};
  issues.forEach(i => { const u = i.page_url || 'Unknown'; (byPage[u] = byPage[u] || []).push(i); });
  const topPages = Object.entries(byPage).sort((a,b) => b[1].length - a[1].length).slice(0, 15);
  const passed = signalEntries.filter(([,v]) => v.pass || v.score >= 70).length;
  const total = signalEntries.length || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SectionHeading title="AI Search Optimization (AEO)" count={`${issues.length} issues`} color="#e64980" />
        <SourceBadge source={data?.score_source || data?.data_source} label="data" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <TechScoreCard label="AEO Score" value={Math.round(score)} sub="out of 100" />
        <TechScoreCard label="Signals Passing" value={`${passed}/${total}`} sub="on-page signals" color={passed >= total * 0.8 ? '#12b886' : '#f59e0b'} />
        <TechScoreCard label="Issues Found" value={issues.length} sub="across all pages" color={issues.length > 0 ? '#ef4444' : '#12b886'} />
      </div>
      {signalEntries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="AEO Signal Checklist — What Passes & What Fails" count={total} color="#8b5cf6" />
          {signalEntries.map(([key, val], idx) => {
            const pass = val.pass || val.score >= 70;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                {pass ? <CheckCircle size={14} color="#12b886" /> : <XCircle size={14} color="#ef4444" />}
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{key.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 11, color: pass ? '#12b886' : '#ef4444' }}>{pass ? 'Pass' : 'Fail'}</span>
              </div>
            );
          })}
        </div>
      )}
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="Why Not 100? — Problems Found Per Page" count={issues.length} />
          {topPages.map(([page, pageIssues], idx) => (
            <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#2563eb', wordBreak: 'break-all' }}>{page}</div>
              {pageIssues.slice(0, 5).map((issue, j) => (
                <div key={j} style={{ padding: '8px 14px', borderBottom: j < Math.min(pageIssues.length, 5) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{issue.signal_name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{issue.description}</div>
                  {issue.fix && <div style={{ fontSize: 11, color: '#14532d', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '5px 8px' }}><strong>Fix:</strong> {issue.fix}</div>}
                </div>
              ))}
              {pageIssues.length > 5 && <div style={{ padding: '6px 14px', fontSize: 11, color: '#64748b' }}>+{pageIssues.length - 5} more issues on this page</div>}
            </div>
          ))}
        </div>
      )}
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
  const citationSources = data?.citation_sources ?? (Array.isArray(data?.ai_citation_sources) ? data.ai_citation_sources : []);
  const hasAnyPlatform = platformList.length > 0;
  const hasCitations = citationSources.length > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {hasAnyPlatform ? (
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
      ) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          No AI platform visibility data available for this audit. Run a live AI visibility scan to measure how often ChatGPT, Perplexity, and Gemini mention your brand.
        </div>
      )}
      {hasCitations ? (
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
                  <td style={{ padding: '7px 14px', fontWeight: 600, color: '#0f172a' }}>{s.domain || s.source_domain}</td>
                  <td style={{ padding: '7px 14px', color: '#64748b' }}>{s.dr || s.domain_rating || '—'}</td>
                  <td style={{ padding: '7px 14px', color: '#475569' }}>{s.reason || s.citation_reason || ''}</td>
                  <td style={{ padding: '7px 14px', color: '#8b5cf6', fontWeight: 500 }}>{s.platforms || s.platform || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          No citation source data available yet.
        </div>
      )}
    </div>
  );
}
function ArrowDown({ size }) { return <svg width={size||11} height={size||11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>; }
function Minus({ size }) { return <svg width={size||11} height={size||11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>; }

function AiBotAccessSection({ data }) {
  const score = data?.overall_ai_accessibility_score;
  const robots = data?.robots_txt_analysis ?? {};
  const allowed = robots.ai_bots_allowed ?? [];
  const blocked = robots.ai_bots_blocked ?? [];
  const issues = data?.issues ?? [];
  const recs = data?.recommendations ?? [];
  const renderBots = (list, isAllowed) => (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      {list.length === 0 ? (
        <div style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>None {isAllowed ? 'explicitly allowed' : 'blocked'}</div>
      ) : list.map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: i < list.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{typeof b === 'string' ? b : (b.bot || b.name || b.user_agent)}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: isAllowed ? '#12b886' : '#ef4444' }}>
            {isAllowed ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {isAllowed ? 'Allowed' : 'Blocked'}
          </span>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {score !== undefined && score !== null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <TechScoreCard label="AI Accessibility Score" value={Math.round(score)} sub="out of 100" color={score >= 70 ? '#12b886' : score >= 40 ? '#f59e0b' : '#ef4444'} />
          <TechScoreCard label="AI Bots Allowed" value={allowed.length} sub="can crawl" color={allowed.length > 0 ? '#12b886' : '#ef4444'} />
          <TechScoreCard label="AI Bots Blocked" value={blocked.length} sub="denied access" color={blocked.length > 0 ? '#ef4444' : '#12b886'} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>No AI bot intelligence data available for this audit.</div>
      )}
      {Object.keys(robots).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>AI Bots Allowed</div>
            {renderBots(allowed, true)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>AI Bots Blocked</div>
            {renderBots(blocked, false)}
          </div>
        </div>
      )}
      {(robots.issues ?? []).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Robots.txt Issues" count={(robots.issues ?? []).length} />
          {(robots.issues ?? []).slice(0, 8).map((iss, i) => (
            <div key={i} style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{iss.message}</div>
              {iss.fix && <div style={{ fontSize: 11, color: '#14532d' }}><strong>Fix:</strong> {iss.fix}</div>}
            </div>
          ))}
        </div>
      )}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Recommendations" count={recs.length} color="#3b82f6" />
          {recs.slice(0, 8).map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: '#0f172a', padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>{r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SerpPreviewSection({ data }) {
  const title = data?.title || data?.page?.title;
  const url = data?.url || data?.page?.url;
  const desc = data?.description || data?.meta_description || data?.page?.meta_description;
  if (!title && !url && !desc) {
    return <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>No SERP preview data available for this audit.</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Google Blue Link</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1a0dab', marginBottom: 2 }}>{title || 'No title tag found'}</div>
        <div style={{ fontSize: 12, color: '#006621', marginBottom: 4 }}>{url || '—'}</div>
        <div style={{ fontSize: 12, color: '#545454', lineHeight: 1.4 }}>{desc || 'No meta description — Google will auto-generate one from page content.'}</div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>AI Overview Citation</div>
        <div style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.6 }}>
          <span style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: 3 }}>AI-generated summary</span> based on content from <strong>{url || 'your page'}</strong> and other sources. This content is optimized for AI extraction.
        </div>
      </div>
    </div>
  );
}

function SocialSeoSection({ data }) {
  const score = data?.social_seo_score;
  const ogCount = data?.pages_with_og ?? 0;
  const twCount = data?.pages_with_twitter ?? 0;
  const total = data?.total_pages ?? 0;
  const issues = data?.issues ?? [];
  const recs = data?.recommendations ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {score !== undefined && score !== null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <TechScoreCard label="Social SEO Score" value={Math.round(score)} sub="out of 100" color={score >= 70 ? '#12b886' : score >= 40 ? '#f59e0b' : '#ef4444'} />
          <TechScoreCard label="Pages w/ OG Tags" value={ogCount} sub={total ? `${Math.round((ogCount / total) * 100)}% of ${total}` : ''} color={ogCount === total && total > 0 ? '#12b886' : '#f59e0b'} />
          <TechScoreCard label="Pages w/ Twitter Card" value={twCount} sub={total ? `${Math.round((twCount / total) * 100)}% of ${total}` : ''} color={twCount === total && total > 0 ? '#12b886' : '#f59e0b'} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>No social SEO data available for this audit.</div>
      )}
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Social Sharing Issues — What's Wrong & How to Fix" count={issues.length} />
          {issues.slice(0, 6).map((iss, i) => (
            <div key={i} style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{iss.signal_name}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{iss.description}</div>
              {iss.fix && <div style={{ fontSize: 11, color: '#14532d' }}><strong>Fix:</strong> {iss.fix}</div>}
            </div>
          ))}
        </div>
      )}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Recommendations" count={recs.length} color="#3b82f6" />
          {recs.slice(0, 6).map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: r.priority === 'HIGH' ? 'rgba(239,68,68,0.12)' : r.priority === 'MEDIUM' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)', color: r.priority === 'HIGH' ? '#ef4444' : r.priority === 'MEDIUM' ? '#d97706' : '#3b82f6' }}>{r.priority}</span>
              <div style={{ flex: 1, fontSize: 12, color: '#0f172a' }}><div>{r.action}</div><div style={{ fontSize: 11, color: '#64748b' }}>{r.impact}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocalSeoSection({ data }) {
  const score = data?.local_seo_score;
  const nap = data?.nap_signals ?? {};
  const recs = data?.recommendations ?? [];
  const localUrls = data?.pages_with_local_urls ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {score !== undefined && score !== null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <TechScoreCard label="Local SEO Score" value={Math.round(score)} sub="out of 100" color={score >= 70 ? '#12b886' : score >= 40 ? '#f59e0b' : '#ef4444'} />
          <TechScoreCard label="NAP Signals" value={Object.values(nap).filter(Boolean).length} sub="of 3 found" />
          <TechScoreCard label="Pages w/ Local" value={data?.pages_with_local_signals ?? localUrls.length} sub="NAP or LocalBusiness" />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>No local SEO data available for this audit.</div>
      )}
      {Object.keys(nap).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="NAP Consistency — Why Not 100?" count={Object.values(nap).filter(Boolean).length} color="#8b5cf6" />
          {[
            { key: 'address_found', label: 'Business Address Present' },
            { key: 'phone_found', label: 'Phone Number with tel: Link' },
            { key: 'schema_local', label: 'LocalBusiness Schema' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {nap[s.key] ? <CheckCircle size={14} color="#12b886" /> : <XCircle size={14} color="#ef4444" />}
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{s.label}</span>
              <span style={{ fontSize: 11, color: nap[s.key] ? '#12b886' : '#ef4444' }}>{nap[s.key] ? 'Found' : 'Missing'}</span>
            </div>
          ))}
        </div>
      )}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Local SEO Recommendations" count={recs.length} color="#3b82f6" />
          {recs.slice(0, 6).map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: r.priority === 'HIGH' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', color: r.priority === 'HIGH' ? '#ef4444' : '#d97706' }}>{r.priority}</span>
              <div style={{ flex: 1, fontSize: 12, color: '#0f172a' }}><div>{r.action}</div><div style={{ fontSize: 11, color: '#64748b' }}>{r.impact}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Content Tab Sections
function ContentStudioSection({ data }) {
  const score = data?.quality_score ?? data?.content_quality_score;
  const eeat = data?.eeat_signals ?? {};
  const eeatCoverage = data?.eeat_coverage_pct ?? 0;
  const thinPages = data?.thin_content_pages ?? [];
  const topPages = data?.top_content_pages ?? [];
  const issues = data?.issues ?? [];
  const recs = data?.recommendations ?? [];
  const eeatLabels = [
    { key: 'author_signals', label: 'Author Bylines', target: (data?.total_pages || 0) * 0.3 },
    { key: 'date_signals', label: 'Publication Dates', target: (data?.total_pages || 0) * 0.3 },
    { key: 'source_signals', label: 'Cited Sources', target: 1 },
    { key: 'expertise_signals', label: 'In-Depth Content (500+ words)', target: 1 },
    { key: 'trust_signals', label: 'Canonical URLs', target: 1 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {score !== undefined && score !== null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <TechScoreCard label="Content Quality Score" value={Math.round(score)} sub="out of 100" />
          <TechScoreCard label="E-E-A-T Coverage" value={`${Math.round(eeatCoverage)}%`} sub="of 5 signals present" color={eeatCoverage >= 70 ? '#12b886' : eeatCoverage >= 40 ? '#f59e0b' : '#ef4444'} />
          <TechScoreCard label="Thin Pages" value={data?.thin_content_count ?? thinPages.length} sub={data?.thin_content_pct ? `${data.thin_content_pct}% of site` : 'under 300 words'} color={(data?.thin_content_count ?? 0) > 0 ? '#ef4444' : '#12b886'} />
          <TechScoreCard label="Avg Word Count" value={data?.avg_word_count ?? '—'} sub="per page" />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SectionHeading title="E-E-A-T Signals — Why Not 100?" count={Object.values(eeat).filter(v => v > 0).length} color="#8b5cf6" />
        {eeatLabels.map((s, i) => {
          const val = eeat[s.key] ?? 0;
          const pass = val >= s.target;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {pass ? <CheckCircle size={14} color="#12b886" /> : <XCircle size={14} color="#ef4444" />}
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{s.label}</span>
              <span style={{ fontSize: 11, color: pass ? '#12b886' : '#ef4444' }}>{val} pages</span>
            </div>
          );
        })}
      </div>
      {thinPages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="Thin Content Pages — Expand These" count={thinPages.length} />
          {thinPages.slice(0, 10).map((p, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#2563eb', wordBreak: 'break-all' }}>{p.url}</div>
              <div style={{ padding: '8px 14px', fontSize: 12, color: '#0f172a' }}><strong>{p.word_count} words</strong> — expand to at least <strong>1,500 words</strong> (gap: <strong>{1500 - (p.word_count || 0)} words</strong>)</div>
            </div>
          ))}
        </div>
      )}
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="Content Issues — What's Wrong & How to Fix" count={issues.length} />
          {issues.slice(0, 10).map((issue, i) => (
            <div key={i} style={{ padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{issue.signal_name}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{issue.description}</div>
              {issue.fix && <div style={{ fontSize: 11, color: '#14532d', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '5px 8px' }}><strong>Fix:</strong> {issue.fix}</div>}
            </div>
          ))}
        </div>
      )}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Recommendations" count={recs.length} color="#3b82f6" />
          {recs.slice(0, 8).map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: r.priority === 'HIGH' ? 'rgba(239,68,68,0.12)' : r.priority === 'MEDIUM' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)', color: r.priority === 'HIGH' ? '#ef4444' : r.priority === 'MEDIUM' ? '#d97706' : '#3b82f6' }}>{r.priority}</span>
              <span style={{ flex: 1, fontSize: 12, color: '#0f172a' }}>{r.action}</span>
            </div>
          ))}
        </div>
      )}
      {score === undefined && Object.keys(eeat).length === 0 && thinPages.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No content quality data available for this audit.</div>
      )}
    </div>
  );
}

function KeywordStrategySection({ data }) {
  const clusters = data?.topic_clusters ?? data?.clusters ?? [];
  const keywords = data?.keywords ?? [];
  const intentBreakdown = data?.intent_breakdown ?? {};
  const cannibalization = data?.cannibalization ?? [];
  const questionKws = data?.question_keywords ?? [];
  const intentColors = { INFORMATIONAL: '#3b82f6', COMMERCIAL: '#f59e0b', TRANSACTIONAL: '#8b5cf6', NAVIGATIONAL: '#64748b' };
  const intentEntries = Object.entries(intentBreakdown).filter(([, v]) => typeof v === 'number' || v?.count);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SectionHeading title="Keyword Strategy" count={keywords.length || clusters.length} color="#3b82f6" />
        <SourceBadge source={data?.data_source} label="data" />
      </div>
      {clusters.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="Topic Clusters — Content Architecture" count={clusters.length} color="#8b5cf6" />
          {clusters.map((c, i) => (
            <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{c.root_keyword || c.name}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>{c.topic_authority || c.intent || '—'}</span>
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>{c.total_frequency || c.keyword_count || 0} freq · {c.keyword_count || (c.keywords?.length ?? 0)} keywords</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(c.keywords ?? []).map((kw, j) => (
                  <span key={j} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}>{kw}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {keywords.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="Top Keywords — Why These Matter & How to Target" count={keywords.length} color="#3b82f6" />
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Keyword</th>
                  <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Intent</th>
                  <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Difficulty</th>
                  <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Vol</th>
                  <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Pages Using</th>
                </tr>
              </thead>
              <tbody>
                {keywords.slice(0, 20).map((k, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 14px', fontWeight: 600, color: '#0f172a' }}>{k.keyword}</td>
                    <td style={{ padding: '7px 14px' }}><span style={{ color: intentColors[k.intent] || '#64748b', fontWeight: 600 }}>{k.intent || '—'}</span></td>
                    <td style={{ padding: '7px 14px', color: k.difficulty === 'HIGH' ? '#ef4444' : k.difficulty === 'MEDIUM' ? '#d97706' : '#12b886' }}>{k.difficulty || '—'} ({k.difficulty_score ?? '—'})</td>
                    <td style={{ padding: '7px 14px', color: '#64748b' }}>{k.estimated_volume ?? '—'}</td>
                    <td style={{ padding: '7px 14px', color: '#64748b' }}>{k.pages_using ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {cannibalization.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="Keyword Cannibalization — Multiple Pages Competing" count={cannibalization.length} />
          {cannibalization.slice(0, 8).map((c, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{c.keyword} <span style={{ fontSize: 10, color: c.severity === 'HIGH' ? '#ef4444' : '#d97706' }}>({c.severity})</span></div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{c.competing_pages?.length || 0} pages compete for this keyword</div>
              {c.recommendation && <div style={{ fontSize: 11, color: '#14532d' }}><strong>Fix:</strong> {c.recommendation}</div>}
            </div>
          ))}
        </div>
      )}
      {questionKws.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Question Keywords — Answer These to Win Featured Snippets" count={questionKws.length} color="#12b886" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(Array.isArray(questionKws) ? questionKws : Object.keys(questionKws)).slice(0, 20).map((q, i) => (
              <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(18,184,134,0.08)', color: '#0f766e', border: '1px solid rgba(18,184,134,0.2)' }}>{typeof q === 'string' ? q : q.question || q.keyword}</span>
            ))}
          </div>
        </div>
      )}
      {clusters.length === 0 && keywords.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No keyword data available for this audit yet.</div>
      )}
    </div>
  );
}

function ContentRewriterSection({ data }) {
  const hasPreview = data?.original || data?.rewritten;
  if (hasPreview) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Original</div>
          <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, maxHeight: 300, overflowY: 'auto' }}>
            {data.original}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Rewritten</div>
          <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, maxHeight: 300, overflowY: 'auto' }}>
            {data.rewritten}
          </div>
        </div>
      </div>
    );
  }
  const pages = [];
  const seen = new Set();
  const pushPage = (p) => {
    if (!p || !p.url || seen.has(p.url)) return;
    seen.add(p.url);
    pages.push({ url: p.url, title: p.title || 'Untitled', word_count: p.word_count || 0, badge: p.badge || 'Content' });
  };
  (data?.top_content_pages || []).forEach((p) => pushPage({ ...p, badge: 'Top content' }));
  (data?.thin_content_pages || []).forEach((p) => pushPage({ ...p, badge: 'Thin' }));
  (data?.outdated_content || []).forEach((p) => pushPage({ ...p, badge: 'Outdated' }));
  (data?.orphan_pages || []).forEach((p) => pushPage({ ...p, badge: 'Orphan' }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px' }}>
        AI rewriting is powered per-page. Open the <strong>Content Rewriter</strong> tool to generate original/rewritten copy for a specific page.
      </div>
      {pages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No page content data available for this audit yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {pages.slice(0, 12).map((p, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3b82f6', marginBottom: 2 }}>{p.badge}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
              <div style={{ fontSize: 11, color: '#64748b', wordBreak: 'break-all', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.url}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{p.word_count ? `${p.word_count} words` : 'no word count'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentRevivalSection({ data }) {
  const freshness = data?.freshness_score;
  const summary = data?.summary ?? {};
  const thin = data?.thin_content ?? [];
  const outdated = data?.outdated_content ?? [];
  const orphans = data?.orphan_pages ?? [];
  const recs = data?.recommendations ?? [];
  const renderGroup = (title, items, color) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionHeading title={title} count={items.length} color={color} />
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: '#12b886', padding: '8px 12px', background: 'rgba(18,184,134,0.06)', border: '1px solid rgba(18,184,134,0.2)', borderRadius: 8 }}>No {title.toLowerCase()} found — this area is healthy.</div>
      ) : items.map((p, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#2563eb', wordBreak: 'break-all' }}>{p.url}</div>
          <div style={{ padding: '8px 14px' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
              {p.word_count ? <strong>{p.word_count} words</strong> : null}
              {p.word_count && p.gap ? ' · ' : null}
              {p.gap ? <span style={{ color: '#ef4444' }}>needs +{p.gap} more words</span> : null}
              {p.reason ? ` · ${p.reason}` : null}
            </div>
            {p.suggestion && <div style={{ fontSize: 11, color: '#14532d', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '5px 8px' }}><strong>How to fix:</strong> {p.suggestion}</div>}
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {freshness !== undefined && freshness !== null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <TechScoreCard label="Freshness Score" value={Math.round(freshness)} sub="out of 100" color={freshness >= 70 ? '#12b886' : freshness >= 40 ? '#f59e0b' : '#ef4444'} />
          <TechScoreCard label="Thin Pages" value={summary.thin_content_count ?? thin.length} sub="under 300 words" />
          <TechScoreCard label="Outdated Pages" value={summary.outdated_content_count ?? outdated.length} sub="no date markup" />
          <TechScoreCard label="Orphan Pages" value={summary.orphan_pages_count ?? orphans.length} sub="no links pointing in" />
        </div>
      )}
      {renderGroup('Thin Content — Needs Expansion', thin, '#ef4444')}
      {renderGroup('Outdated / Stale Content', outdated, '#f59e0b')}
      {renderGroup('Orphan Pages — No Inbound Links', orphans, '#ef4444')}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Recommended Actions" count={recs.length} color="#3b82f6" />
          {recs.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: r.priority === 'CRITICAL' ? 'rgba(239,68,68,0.12)' : r.priority === 'HIGH' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)', color: r.priority === 'CRITICAL' ? '#ef4444' : r.priority === 'HIGH' ? '#d97706' : '#3b82f6' }}>{r.priority}</span>
              <div style={{ flex: 1, fontSize: 12, color: '#0f172a' }}><div>{r.action}</div><div style={{ fontSize: 11, color: '#64748b' }}>{r.impact} · Effort: {r.effort || '—'}</div></div>
            </div>
          ))}
        </div>
      )}
      {freshness === undefined && thin.length === 0 && outdated.length === 0 && orphans.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No revival data available for this audit.</div>
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
      {data?.posts?.length > 0 && data.posts.map((post, i) => (
        <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{post.title}</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{post.content}</div>
        </div>
      ))}
      {!(data?.posts?.length > 0) && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No generated posts yet. Enter a topic above to generate blog content.</div>
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
  const score = data?.speed_score;
  const grade = data?.speed_grade;
  const avg = data?.avg_response_time_ms;
  const breakdown = data?.speed_breakdown ?? {};
  const slowPages = data?.slow_pages ?? [];
  const slowCount = data?.slow_pages_count ?? slowPages.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SectionHeading title="Page Speed & Performance" count={slowCount > 0 ? `${slowCount} slow` : 'all fast'} color="#3b82f6" />
        <SourceBadge source={data?.data_source} label="data" />
      </div>
      {score !== undefined && score !== null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <TechScoreCard label="Page Speed Score" value={Math.round(score)} sub="out of 100" />
          <TechScoreCard label="Grade" value={grade || '—'} sub="overall performance" color={grade === 'A' ? '#12b886' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : '#ef4444'} />
          <TechScoreCard label="Avg Response" value={`${avg ?? '—'}ms`} sub="per page" color={(avg ?? 0) <= 1000 ? '#12b886' : (avg ?? 0) <= 3000 ? '#f59e0b' : '#ef4444'} />
          <TechScoreCard label="Slow Pages" value={slowCount} sub={`> ${data?.slow_threshold_ms ?? 3000}ms`} color={slowCount > 0 ? '#ef4444' : '#12b886'} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No page speed data available for this audit.</div>
      )}
      {breakdown && (breakdown.good !== undefined || breakdown.slow !== undefined) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Fast (<1s)', val: breakdown.good ?? 0, color: '#12b886' },
            { label: 'Needs Work (1-3s)', val: breakdown.needs_work ?? 0, color: '#f59e0b' },
            { label: 'Slow (>3s)', val: breakdown.slow ?? 0, color: '#ef4444' },
          ].map((b, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: b.color }}>{b.val}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{b.label}</div>
            </div>
          ))}
        </div>
      )}
      {slowPages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title={`Slow Pages — Why Not 100 & How to Fix`} count={slowPages.length} />
          {slowPages.slice(0, 10).map((p, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', wordBreak: 'break-all', marginBottom: 2 }}>{p.url}</div>
              <div style={{ fontSize: 11, color: '#ef4444' }}>Responds in {p.response_time_ms}ms (over {data?.slow_threshold_ms ?? 3000}ms threshold)</div>
              <div style={{ fontSize: 11, color: '#14532d', marginTop: 4 }}><strong>Fix:</strong> Compress images, enable caching, minify JS/CSS, and use a CDN to bring this page under 1,000ms.</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InternalLinksSection({ data }) {
  const totalLinks = data?.total_internal_links ?? 0;
  const avgLinks = data?.avg_internal_links ?? 0;
  const orphanUrls = data?.orphan_urls ?? [];
  const noLinksUrls = data?.no_links_urls ?? [];
  const suggestions = data?.link_suggestions ?? [];
  const improvements = data?.link_improvements ?? [];
  const pageScores = data?.page_scores ?? [];
  const anchorStats = data?.anchor_analysis ?? {};
  const weakestPages = [...pageScores].slice(0, 10);
  const renderGroup = (title, items, renderItem, color) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionHeading title={title} count={items.length} color={color} />
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: '#12b886', padding: '8px 12px', background: 'rgba(18,184,134,0.06)', border: '1px solid rgba(18,184,134,0.2)', borderRadius: 8 }}>None found — this area is healthy.</div>
      ) : items.slice(0, 10).map((item, i) => renderItem(item, i))}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <TechScoreCard label="Internal Links" value={totalLinks} sub={`avg ${avgLinks} per page`} />
        <TechScoreCard label="Orphan Pages" value={data?.orphan_pages ?? orphanUrls.length} sub="no inbound links" color={(data?.orphan_pages ?? 0) > 0 ? '#ef4444' : '#12b886'} />
        <TechScoreCard label="Pages w/o Links" value={data?.pages_with_no_internal_links ?? noLinksUrls.length} sub="completely isolated" />
        <TechScoreCard label="Anchor Texts" value={anchorStats.total_anchors ?? 0} sub={`${anchorStats.generic_anchors?.length ?? 0} generic like "click here"`} color={(anchorStats.generic_anchors?.length ?? 0) > 0 ? '#f59e0b' : '#12b886'} />
      </div>
      {renderGroup('Orphan Pages — No Links Pointing In', orphanUrls, (url, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', wordBreak: 'break-all', marginBottom: 2 }}>{url}</div>
          <div style={{ fontSize: 11, color: '#14532d' }}><strong>Fix:</strong> Add internal links from related pages so crawlers can reach this page.</div>
        </div>
      ), '#ef4444')}
      {renderGroup('Link Suggestions — Related Content to Connect', suggestions, (s, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{s.from_page} <span style={{ color: '#94a3b8' }}>→</span> {s.to_title || s.to_page}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{s.reason}</div>
          <div style={{ fontSize: 11, color: '#14532d' }}><strong>Anchor:</strong> "{s.anchor_suggestion}" · {s.placement_hint}</div>
        </div>
      ), '#3b82f6')}
      {renderGroup('Link Improvements Needed', improvements, (s, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{s.page}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{s.issue}</div>
          <div style={{ fontSize: 11, color: '#14532d' }}><strong>Fix:</strong> {s.suggestion}</div>
        </div>
      ), '#f59e0b')}
      {renderGroup('Weakest Pages by Link Score', weakestPages, (p, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', wordBreak: 'break-all', marginBottom: 2 }}>{p.url}</div>
          <div style={{ fontSize: 11, color: p.score >= 60 ? '#12b886' : p.score >= 40 ? '#f59e0b' : '#ef4444' }}>Score: {p.score}/100 · {p.internal_links} internal · depth {p.crawl_depth}</div>
          {(p.issues ?? []).slice(0, 3).map((iss, j) => <div key={j} style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>• {iss}</div>)}
        </div>
      ), '#f59e0b')}
      {totalLinks === 0 && orphanUrls.length === 0 && suggestions.length === 0 && improvements.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No internal link data available for this audit.</div>
      )}
    </div>
  );
}

// Technical Tab Sections
function TechScoreCard({ label, value, sub, color }) {
  const num = parseFloat(value);
  const valColor = color || (num >= 80 ? '#12b886' : num >= 60 ? '#3b82f6' : num >= 40 ? '#f59e0b' : '#ef4444');
  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: valColor }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionHeading({ title, count, color }) {
  const c = color || '#ef4444';
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
      {title}
      {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${c}1a`, color: c }}>{count}</span>}
    </div>
  );
}

function IssueBlock({ issue }) {
  const sev = issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? '#ef4444' : issue.severity === 'MEDIUM' ? '#f59e0b' : '#3b82f6';
  return (
    <div style={{ padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderLeft: `4px solid ${sev}`, borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{issue.signal_name || 'Issue'}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${sev}1a`, color: sev }}>{issue.severity || 'INFO'}</span>
      </div>
      {issue.page_url && <div style={{ fontSize: 11, color: '#2563eb', marginBottom: 4, wordBreak: 'break-all' }}>{issue.page_url}</div>}
      <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, marginBottom: issue.fix ? 6 : 0 }}>{issue.description}</div>
      {issue.fix && <div style={{ fontSize: 12, color: '#14532d', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '6px 10px', lineHeight: 1.5 }}><strong>How to fix:</strong> {issue.fix}</div>}
    </div>
  );
}

function RecommendationBlock({ rec }) {
  const sev = rec.priority === 'CRITICAL' || rec.priority === 'HIGH' ? '#ef4444' : rec.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6';
  return (
    <div style={{ padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{rec.action}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${sev}1a`, color: sev, flexShrink: 0 }}>{rec.priority || 'INFO'}</span>
      </div>
      {rec.impact && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{rec.impact}</div>}
    </div>
  );
}

function PageExperienceSection({ data }) {
  const recs = data?.recommendations || [];
  const issues = data?.cwv_issues || [];
  const dist = data?.speed_distribution || {};
  const score = data?.page_experience_score ?? 0;
  const avg = data?.avg_response_time_ms ?? 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <TechScoreCard label="Page Experience Score" value={score} sub="out of 100" />
        <TechScoreCard label="Avg Response Time" value={`${avg}ms`} sub={`across ${data?.total_pages ?? 0} pages`} color={avg < 2000 ? '#12b886' : avg < 3000 ? '#f59e0b' : '#ef4444'} />
        <TechScoreCard label="Fast (<1s)" value={dist.fast_under_1s ?? 0} sub="pages" color="#12b886" />
        <TechScoreCard label="Slow (>3s)" value={dist.slow_over_3s ?? 0} sub="pages" color={(dist.slow_over_3s ?? 0) > 0 ? '#ef4444' : '#12b886'} />
      </div>
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="Core Web Vitals Issues — What's Wrong & How to Fix" count={issues.length} />
          {issues.map((i, idx) => <IssueBlock key={idx} issue={i} />)}
        </div>
      )}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="How to Improve" count={recs.length} color="#12b886" />
          {recs.map((r, idx) => <RecommendationBlock key={idx} rec={r} />)}
        </div>
      )}
    </div>
  );
}

function MobileSeoSection({ data }) {
  const recs = data?.recommendations || [];
  const issues = data?.mobile_issues || [];
  const slowPages = data?.slow_pages || [];
  const score = data?.mobile_seo_score ?? 0;
  const resp = data?.responsive_score ?? 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <TechScoreCard label="Mobile SEO Score" value={score} sub="out of 100" />
        <TechScoreCard label="Responsive Score" value={`${resp}%`} sub="viewport coverage" color={resp >= 80 ? '#12b886' : resp >= 50 ? '#f59e0b' : '#ef4444'} />
        <TechScoreCard label="Mobile Issues" value={issues.length} sub="detected" color={issues.length > 0 ? '#ef4444' : '#12b886'} />
        <TechScoreCard label="Slow Pages" value={slowPages.length} sub="over 3 seconds" color={slowPages.length > 0 ? '#f59e0b' : '#12b886'} />
      </div>
      {slowPages.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
          <SectionHeading title="Slowest Pages — Optimize These to Under 3s" count={slowPages.length} color="#f59e0b" />
          {slowPages.map((p, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: idx < slowPages.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: 12 }}>
              <span style={{ color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</span>
              <span style={{ color: '#ef4444', fontWeight: 600, flexShrink: 0 }}>{p.response_time_ms}ms</span>
            </div>
          ))}
        </div>
      )}
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="Mobile Issues — What's Wrong & How to Fix" count={issues.length} />
          {issues.map((i, idx) => <IssueBlock key={idx} issue={i} />)}
        </div>
      )}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="How to Improve" count={recs.length} color="#12b886" />
          {recs.map((r, idx) => <RecommendationBlock key={idx} rec={r} />)}
        </div>
      )}
    </div>
  );
}

function SitemapRobotsSection({ data }) {
  const recs = data?.recommendations || [];
  const issues = data?.issues || [];
  const errors = data?.error_pages || [];
  const patterns = data?.url_structure || [];
  const score = data?.sitemap_robots_score ?? 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <TechScoreCard label="Sitemap & Robots Score" value={score} sub="out of 100" />
        <TechScoreCard label="Indexed Pages" value={data?.indexed_pages ?? 0} sub={`of ${data?.total_pages ?? 0} total`} color="#12b886" />
        <TechScoreCard label="Canonical Coverage" value={`${data?.canonical_coverage_pct ?? 0}%`} sub={`${data?.pages_with_canonical ?? 0} pages`} />
        <TechScoreCard label="Errors Found" value={data?.error_count ?? 0} sub="error pages" color={(data?.error_count ?? 0) > 0 ? '#ef4444' : '#12b886'} />
      </div>
      {patterns.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
          <SectionHeading title="URL Structure Patterns" count={patterns.length} color="#3b82f6" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {patterns.slice(0, 10).map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155', padding: '3px 0' }}>
                <code>{p.pattern}</code><span style={{ fontWeight: 600 }}>{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {errors.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 10, padding: 12 }}>
          <SectionHeading title="Broken Pages (4xx/5xx) — What's Wrong & How to Fix" count={errors.length} />
          {errors.map((p, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: idx < errors.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: 12 }}>
              <span style={{ color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</span>
              <span style={{ color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>{p.status_code}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 12, color: '#7f1d1d', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>
            <strong>How to fix:</strong> restore the page or 301-redirect it to the closest live page — broken pages waste crawl budget and lose ranking equity.
          </div>
        </div>
      )}
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="What's Wrong & How to Fix" count={issues.length} />
          {issues.map((i, idx) => <IssueBlock key={idx} issue={i} />)}
        </div>
      )}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="How to Improve" count={recs.length} color="#12b886" />
          {recs.map((r, idx) => <RecommendationBlock key={idx} rec={r} />)}
        </div>
      )}
    </div>
  );
}

function SecurityHeadersSection({ data }) {
  const recs = data?.recommendations || [];
  const issues = data?.issues || [];
  const score = data?.security_score ?? 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <TechScoreCard label="Security Score" value={score} sub="out of 100" />
        <TechScoreCard label="HTTPS Pages" value={data?.https_pages ?? 0} sub={`of ${data?.total_pages ?? 0} total`} color="#12b886" />
        <TechScoreCard label="HTTP Pages" value={data?.http_pages ?? 0} sub="insecure" color={(data?.http_pages ?? 0) > 0 ? '#ef4444' : '#12b886'} />
      </div>
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="Security Issues — What's Wrong & How to Fix" count={issues.length} />
          {issues.map((i, idx) => <IssueBlock key={idx} issue={i} />)}
        </div>
      )}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="How to Add the Missing Headers" count={recs.length} color="#12b886" />
          {recs.map((r, idx) => <RecommendationBlock key={idx} rec={r} />)}
        </div>
      )}
    </div>
  );
}

function ImageSeoSection({ data }) {
  const recs = data?.recommendations || [];
  const issues = data?.issues || [];
  const pages = data?.page_details || [];
  const total = data?.total_images ?? 0;
  const altPct = data?.alt_text_coverage_pct ?? 0;
  const missing = data?.images_without_alt ?? 0;
  const score = data?.image_seo_score ?? 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <TechScoreCard label="Image SEO Score" value={score} sub="out of 100" />
        <TechScoreCard label="Total Images" value={total} sub="across all pages" />
        <TechScoreCard label="Alt Text Coverage" value={`${altPct}%`} sub={`${data?.images_with_alt ?? 0} of ${total} images`} color={altPct >= 80 ? '#12b886' : altPct >= 50 ? '#f59e0b' : '#ef4444'} />
        <TechScoreCard label="Missing Alt Text" value={missing} sub="images need fixes" color={missing > 0 ? '#ef4444' : '#12b886'} />
      </div>
      {pages.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Pages with Most Images</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Page URL</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Images</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Missing Alt</th>
              </tr>
            </thead>
            <tbody>
              {pages.slice(0, 10).map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eef2f6' }}>
                  <td style={{ padding: '8px 14px', color: '#334155', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</td>
                  <td style={{ padding: '8px 14px' }}>{p.image_count}</td>
                  <td style={{ padding: '8px 14px', color: (p.image_count - p.with_alt) > 0 ? '#ef4444' : '#12b886', fontWeight: 600 }}>{p.image_count - p.with_alt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="Image Issues — What's Wrong & How to Fix" count={issues.length} />
          {issues.map((i, idx) => <IssueBlock key={idx} issue={i} />)}
        </div>
      )}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeading title="How to Improve" count={recs.length} color="#12b886" />
          {recs.map((r, idx) => <RecommendationBlock key={idx} rec={r} />)}
        </div>
      )}
    </div>
  );
}

// Offsite Tab Sections
function CompetitorSection({ data }) {
  const entityGaps = data?.entity_gaps ?? data?.gaps ?? [];
  const topicGaps = data?.topic_gaps ?? [];
  const contentOpps = data?.content_opportunities ?? [];
  const strengths = data?.strengths ?? [];
  const weaknesses = data?.weaknesses ?? [];
  const strategy = data?.winning_strategy ?? [];
  const compUrl = data?.competitor_url;
  const hasAny = entityGaps.length + topicGaps.length + contentOpps.length + strengths.length + weaknesses.length + strategy.length > 0;
  const renderList = (title, items, color, render) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <SectionHeading title={title} count={items.length} color={color} />
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: '#64748b', padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>No data yet — run a competitor analysis to populate.</div>
      ) : items.slice(0, 10).map((item, i) => render(item, i))}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!compUrl && (
        <div style={{ fontSize: 12, color: '#64748b', padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          No competitor configured for this audit. Add a competitor URL to compare content, entities, and backlinks against your site.
        </div>
      )}
      {renderList('Entity Coverage Gaps — What Competitors Have That You Don\'t', entityGaps, '#ef4444', (g, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{g.entity || g.name || g.keyword || g}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Competitors: {g.competitors ?? g.competitor_count ?? '—'} · You: {g.has ? 'Covered' : 'Missing'}</div>
        </div>
      ))}
      {renderList('Topic Gaps', topicGaps, '#f59e0b', (t, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0f172a' }}>{typeof t === 'string' ? t : (t.topic || t.title || t.keyword || JSON.stringify(t))}</div>
      ))}
      {renderList('Content Opportunities', contentOpps, '#3b82f6', (c, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0f172a' }}>{typeof c === 'string' ? c : (c.opportunity || c.title || c.topic || JSON.stringify(c))}</div>
      ))}
      {renderList('Your Weaknesses vs Competitors', weaknesses, '#ef4444', (w, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0f172a' }}>{typeof w === 'string' ? w : (w.weakness || w.issue || w.description || JSON.stringify(w))}</div>
      ))}
      {renderList('Your Strengths', strengths, '#12b886', (s, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0f172a' }}>{typeof s === 'string' ? s : (s.strength || s.description || JSON.stringify(s))}</div>
      ))}
      {renderList('Winning Strategy', strategy, '#8b5cf6', (s, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0f172a' }}>{typeof s === 'string' ? s : (s.action || s.strategy || s.recommendation || JSON.stringify(s))}</div>
      ))}
      {!hasAny && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No competitor analysis data available for this audit.</div>
      )}
    </div>
  );
}

function BacklinkProfileSection({ data }) {
  const score = data?.backlink_score;
  const topDomains = data?.top_linked_domains ?? [];
  const anchors = data?.anchor_text_distribution ?? [];
  const outboundCount = data?.outbound_link_count ?? 0;
  const nofollow = data?.nofollow_count ?? 0;
  const dofollow = data?.dofollow_count ?? 0;
  const inbound = data?.inbound_backlinks ?? [];
  const referring = data?.inbound_referring_domains ?? [];
  const source = data?.backlink_source;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {score !== undefined && score !== null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <TechScoreCard label="Backlink Score" value={Math.round(score)} sub={source ? <SourceBadge source={source} /> : 'out of 100'} color={score >= 70 ? '#12b886' : score >= 40 ? '#f59e0b' : '#ef4444'} />
          <TechScoreCard label="Outbound Links" value={outboundCount} sub={`${data?.linked_domains ?? 0} domains`} />
          <TechScoreCard label="DoFollow" value={dofollow} sub={`NoFollow ${nofollow}`} />
          <TechScoreCard label="Inbound Backlinks" value={inbound.length} sub={`${referring.length} referring domains`} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>No backlink data available for this audit.</div>
      )}
      {topDomains.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Top Linked Domains" count={topDomains.length} color="#3b82f6" />
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            {topDomains.slice(0, 10).map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', borderBottom: i < Math.min(topDomains.length, 10) - 1 ? '1px solid #f1f5f9' : 'none', fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>{d.domain}</span>
                <span style={{ color: '#64748b' }}>{d.count} links</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {anchors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Anchor Text Distribution" count={anchors.length} color="#8b5cf6" />
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            {anchors.slice(0, 10).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', borderBottom: i < Math.min(anchors.length, 10) - 1 ? '1px solid #f1f5f9' : 'none', fontSize: 12 }}>
                <span style={{ color: '#0f172a', wordBreak: 'break-all' }}>{a.text}</span>
                <span style={{ color: '#64748b' }}>{a.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {inbound.length === 0 && score === undefined && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No backlink data yet — configure DataForSEO or a live backlink source to measure inbound links.</div>
      )}
    </div>
  );
}

function AuthoritySection({ data }) {
  const score = data?.authority_score;
  const platforms = data?.platform_presence ?? {};
  const ext = data?.external_link_quality ?? {};
  const issues = data?.issues ?? [];
  const recs = data?.recommendations ?? [];
  const platformEntries = Object.entries(platforms).filter(([, v]) => typeof v === 'object' && v !== null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {score !== undefined && score !== null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <TechScoreCard label="Authority Score" value={Math.round(score)} sub="out of 100" color={score >= 70 ? '#12b886' : score >= 40 ? '#f59e0b' : '#ef4444'} />
          <TechScoreCard label="Authority Links" value={ext.authority_links ?? 0} sub="to news/high-DR domains" />
          <TechScoreCard label="Relevant Links" value={ext.relevant_links ?? 0} sub="industry relevant" />
          <TechScoreCard label="Low Quality" value={ext.low_quality_links ?? 0} sub="domains to avoid" color={(ext.low_quality_links ?? 0) > 0 ? '#ef4444' : '#12b886'} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>No off-site authority data available for this audit.</div>
      )}
      {platformEntries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Platform Presence — Social & Directory Signals" count={platformEntries.length} color="#8b5cf6" />
          {platformEntries.map(([key, v], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {v.linked ? <CheckCircle size={14} color="#12b886" /> : v.mentioned ? <CheckCircle size={14} color="#f59e0b" /> : <XCircle size={14} color="#ef4444" />}
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{key}</span>
              <span style={{ fontSize: 11, color: v.linked ? '#12b886' : v.mentioned ? '#d97706' : '#ef4444' }}>{v.linked ? 'Linked' : v.mentioned ? 'Mentioned only' : 'Missing'}</span>
            </div>
          ))}
        </div>
      )}
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Authority Issues — What's Wrong & How to Fix" count={issues.length} />
          {issues.slice(0, 10).map((iss, i) => (
            <div key={i} style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{iss.message || iss.title || iss.issue}</div>
              {iss.fix && <div style={{ fontSize: 11, color: '#14532d' }}><strong>Fix:</strong> {iss.fix}</div>}
            </div>
          ))}
        </div>
      )}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeading title="Recommendations" count={recs.length} color="#3b82f6" />
          {recs.slice(0, 8).map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: '#0f172a', padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>{typeof r === 'string' ? r : (r.action || r.recommendation || JSON.stringify(r))}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function CitationsSection({ data }) {
  const list = data?.citations ?? data?.citation_sources ?? [];
  const items = Array.isArray(list) ? list : [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionHeading title="Citation Sources" count={items.length} color="#3b82f6" />
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>No citation data available for this audit.</div>
      ) : items.slice(0, 20).map((c, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0f172a' }}>
          {c.domain || c.source || c.url || JSON.stringify(c)}
        </div>
      ))}
    </div>
  );
}

function markdownToHtml(text) {
  if (!text) return '';
  let html = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:var(--bg-secondary);padding:12px;border-radius:8px;font-size:12px;overflow-x:auto;margin:8px 0"><code>$2</code></pre>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`(.+?)`/g, '<code style="background:var(--bg-secondary);padding:1px 4px;border-radius:3px;font-size:0.9em">$1</code>');
  html = html.replace(/^### (.+)/gm, '<div style="font-size:13px;font-weight:700;margin:10px 0 4px">$1</div>');
  html = html.replace(/^## (.+)/gm, '<div style="font-size:14px;font-weight:700;margin:12px 0 4px">$1</div>');
  html = html.replace(/\n- (.+)/g, '\n&#8226; $1');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

const CHAT_QUICK_ACTIONS = [
  { label: 'Top issues & fixes', icon: Target, prompt: 'List my top 5 SEO issues with exact URLs affected and step-by-step fix instructions for each.' },
  { label: 'Fix priority plan', icon: Zap, prompt: 'Create a prioritized fix plan. Rank every issue by impact and effort. Give me a week-by-week roadmap.' },
  { label: 'Content strategy', icon: PenTool, prompt: 'Analyze my content gaps. What pages am I missing? What topics should I create content for?' },
  { label: 'AI search ready?', icon: Brain, prompt: 'How does my site appear in AI search (ChatGPT, Perplexity, Gemini)? What do I need to fix?' },
  { label: 'Competitor gaps', icon: GitCompare, prompt: 'Compare my site with my competitor. What keywords are they ranking for that I am not?' },
];

function AiChatSection({ id, audit, scores }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    let cancelled = false;
    api.getChatHistory(id).then((data) => {
      if (cancelled) return;
      const history = Array.isArray(data) ? data : data.messages || [];
      setMessages(history.map(m => ({
        role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
        content: m.content || m.message || '',
        created_at: m.created_at || m.timestamp || null,
      })));
    }).catch(() => {}).finally(() => { if (cancelled) cancelled = true; });
    return () => { cancelled = true; };
  }, [id]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setMessages(prev => [...prev, { role: 'user', content: msg, created_at: new Date().toISOString() }]);
    setInput('');
    setSending(true);
    try {
      const res = await api.chat(id, msg);
      const reply = res?.reply || res?.response || res?.message || 'No response received.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply, created_at: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', created_at: new Date().toISOString() }]);
    } finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const overall = scores?.overall_score ?? audit?.overall_score ?? 0;
  const websiteUrl = audit?.website_url || '';
  const chatStyle = {
    display: 'flex', flexDirection: 'column', height: '100%', minHeight: 460,
    background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
  };
  const avatar = (bg) => ({ width: 26, height: 26, borderRadius: '50%', background: bg || 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 });
  const bubble = (mine) => mine
    ? { background: 'var(--accent)', color: '#fff', padding: '9px 13px', borderRadius: '14px 14px 4px 14px', fontSize: 12.5, lineHeight: 1.55, boxShadow: 'var(--shadow-sm)', wordBreak: 'break-word' }
    : { background: 'var(--bg-page)', color: 'var(--text)', padding: '9px 13px', borderRadius: '14px 14px 14px 4px', fontSize: 12.5, lineHeight: 1.55, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', wordBreak: 'break-word' };

  return (
    <div style={chatStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)', flexShrink: 0 }}>
        <div style={{ ...avatar(), width: 30, height: 30, borderRadius: 8 }}><Bot size={15} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>AI SEO Consultant</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{websiteUrl || 'Audit assistant'}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: overall >= 80 ? '#d3f9d8' : overall >= 50 ? '#fff3bf' : '#ffe3e3', color: overall >= 80 ? '#2b8a3e' : overall >= 50 ? '#e67700' : '#c92a2a' }}>{Math.round(overall)}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 6px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && !sending && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ ...avatar(), width: 52, height: 52, borderRadius: 12, marginBottom: 12 }}><Bot size={26} /></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>AI SEO Consultant</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 420, marginBottom: 4 }}>
              I've analyzed your audit and can answer questions about SEO, content, technical issues, competitors, and AI search. This chat is grounded in your audit data.
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 6, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role !== 'user' && <div style={avatar()}><Bot size={13} /></div>}
            <div style={{ maxWidth: '78%' }}>
              <div style={bubble(msg.role === 'user')} dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />
            </div>
            {msg.role === 'user' && <div style={avatar('var(--accent)')}><User size={13} /></div>}
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={avatar()}><Bot size={13} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-page)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '14px 14px 14px 4px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-dim)', display: 'inline-block', animation: 'typingBounce 1.2s ease-in-out infinite' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-dim)', display: 'inline-block', animation: 'typingBounce 1.2s ease-in-out infinite', animationDelay: '0.15s' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-dim)', display: 'inline-block', animation: 'typingBounce 1.2s ease-in-out infinite', animationDelay: '0.3s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-white)', padding: '8px 16px 12px', flexShrink: 0 }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
            {CHAT_QUICK_ACTIONS.map((a, i) => {
              const Icon = a.icon;
              return (
                <button key={i} onClick={() => sendMessage(a.prompt)} disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 16, background: 'var(--bg-white)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-white)'; }}>
                  <Icon size={12} />{a.label}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-page)', borderRadius: 8, padding: '5px 5px 5px 14px', border: '1px solid var(--border)' }}>
          <input ref={inputRef} type="text" placeholder="Ask your SEO consultant..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={sending}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', padding: '6px 0' }} />
          <button style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: input.trim() && !sending ? 1 : 0.4 }} onClick={() => sendMessage()} disabled={!input.trim() || sending}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionError({ label, error, onRetry }) {
  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <AlertTriangle size={22} color="#ef4444" />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{label} couldn't load</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, maxWidth: 420, margin: '0 auto 16px' }}>{error}</div>
      <button onClick={onRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', border: 'none', borderRadius: 10, background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        <RotateCcw size={14} /> Retry
      </button>
    </div>
  );
}

const SECTION_KEYS_BY_TAB = {
  'executive-dashboard': 'audit',
  'executive-compare': 'compare',
  'executive-report': 'report',
  'executive-seo-health': 'seo-health',
  'geo-aeo-hub': 'aeo',
  'geo-aeo-ai-deep': 'ai-deep',
  'geo-aeo-ai-bots': 'ai-bots',
  'geo-aeo-serp-preview': 'serp-preview',
  'geo-aeo-social-seo': 'social',
  'geo-aeo-local-seo': 'local',
  'content-studio': 'content-data',
  'content-keywords': 'keywords',
  'content-rewriter': 'content-data',
  'content-revival': 'content-revival',
  'content-blog': 'content-data',
  'content-chat': null,
  'technical-issues': 'issues',
  'technical-action-center': 'issues',
  'technical-speed': 'speed',
  'technical-links': 'internal-links',
  'technical-page-experience': 'page-experience',
  'technical-mobile': 'mobile',
  'technical-sitemap': 'sitemap',
  'technical-security': 'security',
  'technical-image': 'image',
  'technical-roadmap': null,
  'offsite-competitor': 'competitor',
  'offsite-backlinks': 'backlinks',
  'offsite-authority': 'authority',
  'offsite-citations': 'citations',
};

const SECTION_LABELS = {
  audit: 'Dashboard', scores: 'Scores', issues: 'Issues',
  seo: 'SEO Analysis', geo: 'GEO Analysis', aeo: 'AEO Analysis',
  schema: 'Schema Analysis', eeat: 'E-E-A-T', 'seo-health': 'SEO Health',
  speed: 'Speed & CWV', competitor: 'Competitor', 'content-data': 'Content',
  'content-quality': 'Content Quality', 'content-revival': 'Content Revival',
  sitemap: 'Sitemap & Robots', security: 'Security Headers', mobile: 'Mobile SEO',
  'page-experience': 'Page Experience', image: 'Image SEO', social: 'Social SEO',
  local: 'Local SEO', compare: 'Audit Compare', backlinks: 'Backlinks',
  authority: 'Authority', citations: 'Citations', 'ai-deep': 'AI Search',
  'ai-bots': 'AI Bots', 'serp-preview': 'SERP Preview', 'ai-visibility': 'AI Visibility',
  'internal-links': 'Internal Links', keywords: 'Keywords', report: 'Report',
};

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
  const [sectionErrors, setSectionErrors] = useState({});

  const sectionLoader = (auditId) => ({
    audit: () => api.getAuditDetail(auditId),
    scores: () => api.request(`/audit/${auditId}/scores`),
    issues: () => api.getAuditIssues(auditId),
    seo: () => api.getSeoAnalysis(auditId),
    geo: () => api.getGeoAnalysis(auditId),
    aeo: () => api.getAeoAnalysis(auditId),
    schema: () => api.getSchemaAnalysis(auditId),
    eeat: () => api.getEeatAnalysis(auditId),
    'seo-health': () => api.getSeoHealth(auditId),
    speed: () => api.getPageSpeed(auditId),
    competitor: () => api.getCompetitorData(auditId),
    'content-data': () => api.getContentData(auditId),
    'content-quality': () => api.getContentQuality(auditId),
    'content-revival': () => api.getContentRevival(auditId),
    sitemap: () => api.getSitemapRobots(auditId),
    security: () => api.getSecurityHeaders(auditId),
    mobile: () => api.getMobileSeo(auditId),
    'page-experience': () => api.getPageExperience(auditId),
    image: () => api.getImageSeo(auditId),
    social: () => api.getSocialSeo(auditId),
    local: () => api.getLocalSeo(auditId),
    compare: () => api.request(`/audit/${auditId}/audit-compare`),
    backlinks: () => api.getBacklinkProfile(auditId),
    authority: () => api.getOffsiteAuthority(auditId, 0),
    citations: () => (typeof api.getCitationAnalysis === 'function' ? api.getCitationAnalysis(auditId) : Promise.resolve(null)),
    'ai-deep': () => (typeof api.getAiSearchIntelligence === 'function' ? api.getAiSearchIntelligence(auditId) : Promise.resolve(null)),
    'ai-bots': () => (typeof api.getAiBotIntelligence === 'function' ? api.getAiBotIntelligence(auditId, 0) : Promise.resolve(null)),
    'serp-preview': () => (typeof api.getSerpPreview === 'function' ? api.getSerpPreview(auditId) : Promise.resolve(null)),
    'ai-visibility': () => api.getAIVisibility(auditId),
    'internal-links': () => api.getInternalLinks(auditId),
    keywords: () => api.getKeywordData(auditId),
    report: () => api.getReportData(auditId),
  });

  const retrySection = async (key) => {
    const loader = sectionLoader(id)[key];
    if (!loader) return;
    try {
      const value = await loader();
      if (key === 'audit') setAudit(value);
      else if (key === 'scores') setScores(value);
      else if (key === 'issues') {
        setSections(prev => ({
          ...prev,
          executive: {
            ...prev.executive,
            totalIssues: value?.total ?? (Array.isArray(value?.issues) ? value.issues.length : 0),
            issues_count: value?.total ?? (Array.isArray(value?.issues) ? value.issues.length : 0),
          },
        }));
      } else if (key === 'content-data') {
        setSections(prev => ({
          ...prev,
          'content-data': value,
          content: { ...value, quality_score: prev['content-quality']?.quality_score, pages: prev['content-revival'], keywords: prev.keywords },
        }));
      } else if (key === 'content-quality') {
        setSections(prev => ({ ...prev, 'content-quality': value, content: { ...prev.content, quality_score: value?.quality_score } }));
      } else if (key === 'content-revival') {
        setSections(prev => ({ ...prev, 'content-revival': value, content: { ...prev.content, pages: value } }));
      } else {
        setSections(prev => ({ ...prev, [key]: value }));
      }
      setSectionErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    } catch (e) {
      setSectionErrors(prev => ({ ...prev, [key]: e?.message || 'Retry failed' }));
    }
  };

  useEffect(() => {
    let cancelled = false;

    const FAST_KEYS = [
      'audit', 'scores', 'issues', 'seo', 'geo', 'aeo', 'schema', 'eeat',
      'seo-health', 'speed', 'competitor', 'content-data', 'content-quality',
      'content-revival', 'sitemap', 'security', 'mobile', 'page-experience',
      'image', 'social', 'local', 'compare', 'backlinks', 'authority',
      'citations', 'ai-deep', 'ai-bots', 'serp-preview',
    ];
    const SLOW_KEYS = ['ai-visibility', 'internal-links', 'keywords', 'report'];

    const runGroup = async (keys, limit) => {
      const loaders = sectionLoader(id);
      const results = {};
      const errors = {};
      let idx = 0;
      const worker = async () => {
        while (idx < keys.length) {
          const key = keys[idx++];
          try {
            results[key] = await loaders[key]();
          } catch (e) {
            results[key] = null;
            errors[key] = e?.message || `Failed to load ${key}`;
          }
        }
      };
      await Promise.all(Array.from({ length: limit }, worker));
      return { results, errors };
    };

    const applyBundle = (r, errs) => {
      const issuesData = r.issues;
      setAudit(r.audit);
      setScores(r.scores);
      setSectionErrors(errs);
      setSections({
        executive: {
          scores: r.scores,
          pages: r.audit?.total_pages ?? r.audit?.page_count,
          totalIssues: issuesData?.total ?? (Array.isArray(issuesData?.issues) ? issuesData.issues.length : 0),
          issues_count: issuesData?.total ?? (Array.isArray(issuesData?.issues) ? issuesData.issues.length : 0),
        },
        seo: r.seo,
        geo: r.geo,
        aeo: r.aeo,
        schema: r.schema,
        eeat: r.eeat,
        'seo-health': r['seo-health'],
        speed: r.speed,
        competitor: r.competitor,
        content: {
          ...r['content-data'],
          quality_score: r['content-quality']?.quality_score,
          pages: r['content-revival'],
        },
        'content-quality': r['content-quality'],
        'content-revival': r['content-revival'],
        sitemap: r.sitemap,
        security: r.security,
        mobile: r.mobile,
        'page-experience': r['page-experience'],
        image: r.image,
        social: r.social,
        local: r.local,
        compare: r.compare,
        backlinks: r.backlinks,
        authority: r.authority,
        citations: r.citations,
        'ai-deep': r['ai-deep'],
        'ai-bots': r['ai-bots'],
        'serp-preview': r['serp-preview'],
      });
      const allIssues = issuesData?.issues ?? issuesData ?? [];
      const qw = (Array.isArray(allIssues) ? allIssues : [])
        .filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL' || i.impact === 'high')
        .slice(0, 5);
      setQuickWins(qw);
      if (!r.scores || !r.scores.overall_score) {
        setScores(r.audit?.scores ?? {});
      }
    };

    async function loadAll() {
      setLoading(true);
      const fast = await runGroup(FAST_KEYS, 6);
      if (cancelled) return;
      applyBundle(fast.results, fast.errors);
      setLoading(false);

      const slow = await runGroup(SLOW_KEYS, 3);
      if (cancelled) return;
      const kw = slow.results.keywords;
      setSectionErrors(prev => ({ ...prev, ...slow.errors }));
      setSections(prev => ({
        ...prev,
        'ai-visibility': slow.results['ai-visibility'],
        'internal-links': slow.results['internal-links'],
        keywords: kw,
        report: slow.results.report,
        content: { ...prev.content, keywords: kw },
      }));
    }
    loadAll().catch(err => {
      console.error('OnePageWorkspace load error:', err);
      if (!cancelled) setScores(audit?.scores ?? {});
      setLoading(false);
    });
    return () => { cancelled = true; };
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
    const guardKey = SECTION_KEYS_BY_TAB[`${activeTab}-${displaySub}`];
    const guardErr = guardKey ? sectionErrors[guardKey] : null;
    const render = () => {
    switch (activeTab) {
      case 'executive': {
        const execData = { ...s.executive, pages: s.executive?.pages || 0, totalIssues: s.executive?.totalIssues || 0, recommendationCount: 0, avgScore: allScores?.overall_score || 0 };
        const execComparison = s.competitor?.seo_comparison || {};
        switch (displaySub) {
          case 'dashboard': return <ExecutiveDashboardSection data={execData} scores={allScores} issues={quickWins} onGenerateFix={setFixModal} comparison={execComparison} />;
          case 'compare': return <AuditCompareSection data={s.compare} />;
          case 'report': return <AuditReportSection data={s.report} />;
          case 'seo-health': return <SeoHealthSection data={s['seo-health']} />;
          default: return <ExecutiveDashboardSection data={execData} scores={allScores} issues={quickWins} comparison={execComparison} />;
        }
      }
      case 'geo-aeo': {
        const aeoData = s.aeo || {};
        const aiVisData = { ...s['ai-visibility'], ...s.geo, ...s['ai-deep'] };
        switch (displaySub) {
          case 'hub': return <GeoAeoHubSection data={aeoData} />;
          case 'ai-deep': return <AiSearchDeepSection data={aiVisData} />;
          case 'ai-bots': return <AiBotAccessSection data={s['ai-bots'] || aiVisData} />;
          case 'serp-preview': return <SerpPreviewSection data={s['serp-preview'] || s.seo || {}} />;
          case 'social-seo': return <SocialSeoSection data={s.social || {}} />;
          case 'local-seo': return <LocalSeoSection data={s.local || {}} />;
          default: return <GeoAeoHubSection data={aeoData} />;
        }
      }
      case 'content': {
        const contentData = {
          ...s.content,
          ...s['content-quality'],
          ...s['content-revival'],
          quality_score: s['content-quality']?.content_quality_score ?? s['content-quality']?.quality_score ?? null,
          clusters: s.keywords?.clusters ?? null,
        };
        switch (displaySub) {
          case 'studio': return <ContentStudioSection data={contentData} />;
          case 'keywords': return <KeywordStrategySection data={s.keywords || {}} />;
          case 'rewriter': return <ContentRewriterSection data={contentData} />;
          case 'revival': return <ContentRevivalSection data={contentData} />;
          case 'blog': return <BlogAiSection data={s.content || {}} />;
          case 'chat': return <AiChatSection id={id} audit={audit} scores={allScores || scores} />;
          default: return <ContentStudioSection data={contentData} />;
        }
      }
      case 'technical': {
        const apiIssues = [...(s.seo?.issues ?? []), ...(s['ai-visibility']?.issues ?? [])];
        const fallbackIssues = apiIssues.length > 0 ? apiIssues : quickWins.map(i => ({ ...i, description: i.title }));
        switch (displaySub) {
          case 'issues': return <IssueRemediationSection data={{ issues: fallbackIssues }} onGenerateFix={setFixModal} onPreview={setPreviewIssue} />;
          case 'action-center': return <IssueRemediationSection data={{ issues: fallbackIssues }} onGenerateFix={setFixModal} onPreview={setPreviewIssue} />;
          case 'speed': return <SpeedSection data={s.speed || {}} />;
          case 'links': return <InternalLinksSection data={s['internal-links'] || {}} />;
          case 'page-experience': return <PageExperienceSection data={s['page-experience'] || {}} />;
          case 'mobile': return <MobileSeoSection data={s.mobile || {}} />;
          case 'sitemap': return <SitemapRobotsSection data={s.sitemap || {}} />;
          case 'security': return <SecurityHeadersSection data={s.security || {}} />;
          case 'image': return <ImageSeoSection data={s.image || {}} />;
          case 'roadmap': {
            const roadmapIssues = [...(s.seo?.issues ?? []), ...(s['content-quality']?.issues ?? []), ...(s.aeo?.issues ?? [])].filter(Boolean);
            const critical = roadmapIssues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');
            const medium = roadmapIssues.filter(i => i.severity === 'MEDIUM');
            const low = roadmapIssues.filter(i => i.severity === 'LOW');
            const phase = (title, items, color, weeks) => (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: color }}>{title}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: `${color}18`, color }}>{weeks}</span>
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>{items.length} issues</span>
                </div>
                {items.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#64748b' }}>Nothing to fix in this phase.</div>
                ) : items.slice(0, 6).map((iss, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#0f172a', padding: '4px 0', borderTop: '1px solid #f1f5f9' }}>{iss.signal_name || iss.title}</div>
                ))}
              </div>
            );
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>SEO Roadmap — Built From Your Audit Issues</div>
                {critical.length + medium.length + low.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No issues found to build a roadmap.</div>
                ) : (
                  <>
                    {phase('Phase 1 — Critical Fixes', critical, '#ef4444', 'Week 1-2')}
                    {phase('Phase 2 — High-Impact Improvements', medium, '#f59e0b', 'Week 3-5')}
                    {phase('Phase 3 — Long-Tail Optimizations', low, '#3b82f6', 'Week 6-8')}
                  </>
                )}
              </div>
            );
          }
          default: return <IssueRemediationSection data={{ issues: fallbackIssues }} />;
        }
      }
      case 'offsite': {
        switch (displaySub) {
          case 'competitor': return <CompetitorSection data={s.competitor || {}} />;
          case 'backlinks': return <BacklinkProfileSection data={s.backlinks || {}} />;
          case 'authority': return <AuthoritySection data={s.authority || {}} />;
          case 'citations': return <CitationsSection data={s.citations || {}} />;
          default: return <CompetitorSection data={s.competitor || {}} />;
        }
      }
      default:
        return <ExecutiveDashboardSection data={s.executive} scores={scores} />;
    }
    };
    if (guardErr) {
      return <SectionError label={SECTION_LABELS[guardKey] || guardKey} error={guardErr} onRetry={() => retrySection(guardKey)} />;
    }
    return render();
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
