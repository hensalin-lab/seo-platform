import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import {
  TrendingUp, Bot, Search, AlertTriangle, CheckCircle, Layers, Lock, Sparkles, ArrowUpRight,
  ShieldAlert, Download, Activity, Globe, Brain, RefreshCw, Eye, XCircle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedAction from '../../../components/ProtectedAction';

function ScoreRing({ score, size = 120, stroke = 10 }) {
  const [mounted, setMounted] = useState(false);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const offset = mounted ? c - (pct / 100) * c : c;
  let color = '#ef4444';
  let glowColor = 'rgba(239,68,68,0.3)';
  if (pct >= 80) { color = '#22c55e'; glowColor = 'rgba(34,197,94,0.3)'; }
  else if (pct >= 60) { color = 'var(--accent)'; glowColor = 'rgba(99,102,241,0.3)'; }
  else if (pct >= 40) { color = '#f59e0b'; glowColor = 'rgba(245,158,11,0.3)'; }

  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 12px ${glowColor})` }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: 'var(--border)' }} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(pct)}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>OVERALL</span>
      </div>
    </div>
  );
}

function ScoreBadge({ label, score, icon: Icon }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  let color = '#ef4444';
  if (pct >= 80) color = '#22c55e';
  else if (pct >= 60) color = 'var(--accent)';
  else if (pct >= 40) color = '#f59e0b';
  const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'D';

  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{score != null ? Math.round(pct) : 'N/A'}</div>
      </div>
      {score != null && (
        <div style={{ fontSize: 11, fontWeight: 700, color: `${color}aa`, background: `${color}12`, padding: '2px 8px', borderRadius: 4 }}>
          {grade}
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue, onViewFix }) {
  const severity = issue.severity || 'HIGH';
  const severityColors = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#6b7280' };
  const severityColor = severityColors[severity] || '#6b7280';
  const estGain = issue.estimated_gain || issue.impact_score || '2.4K';

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${severityColor}18`, color: severityColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {severity}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {issue.title || issue.name || issue.issue || 'Issue'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
          +{estGain}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        {[
          { label: 'What Happened', value: issue.what_happened || issue.description || issue.issue || 'N/A' },
          { label: 'Why', value: issue.why || issue.root_cause || issue.cause || 'N/A' },
          { label: 'Impact', value: issue.impact || (issue.affected_pages ? `${issue.affected_pages} pages` : 'N/A') },
          { label: 'AI Recommendation', value: issue.recommendation || issue.ai_recommendation || issue.suggestion || 'N/A' },
        ].map((d, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{d.label}</div>
            <div style={{ fontSize: 12, color: '#c0c0c0', lineHeight: 1.4 }}>{d.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace' }}>
          {issue.target_path || issue.url || issue.path || issue.page || '—'}
        </span>
        <button onClick={() => onViewFix && onViewFix(issue)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'rgba(99,102,241,0.12)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
          View Fix Blueprint <ArrowUpRight size={10} />
        </button>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isViewer } = useAuth();

  const [timeframe, setTimeframe] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    reportData: null,
    pagesData: null,
    healthData: null,
    geoData: null,
    aeoData: null,
    aiVisibilityData: null,
    cwvData: null,
  });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        api.getReportData(id),
        api.getAuditPages(id),
        api.getSeoHealth(id),
        api.getGeoAnalysis(id).catch(() => null),
        api.getAeoAnalysis(id).catch(() => null),
        api.getAIVisibility(id).catch(() => null),
        api.getCoreWebVitals(id).catch(() => null),
      ]);
      setData({
        reportData: results[0].status === 'fulfilled' ? results[0].value : null,
        pagesData: results[1].status === 'fulfilled' ? results[1].value : null,
        healthData: results[2].status === 'fulfilled' ? results[2].value : null,
        geoData: results[3].status === 'fulfilled' ? results[3].value : null,
        aeoData: results[4].status === 'fulfilled' ? results[4].value : null,
        aiVisibilityData: results[5].status === 'fulfilled' ? results[5].value : null,
        cwvData: results[6].status === 'fulfilled' ? results[6].value : null,
      });
    } catch (err) {
      setError(err.message || 'Failed to load executive dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) loadData(); }, [id]);

  async function handleExport() {
    const { reportData, healthData, geoData, aeoData, aiVisibilityData, cwvData } = data;
    const exportData = {
      audit_id: id,
      exported_at: new Date().toISOString(),
      site_summary: reportData?.site_summary || {},
      geo: geoData || null,
      aeo: aeoData || null,
      ai_visibility: aiVisibilityData || null,
      core_web_vitals: cwvData || null,
      health_checks: healthData?.checks || [],
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive-report-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRerun() {
    try {
      await api.request(`/audit/${id}/rerun`, { method: 'POST' });
      navigate(`/audit/${id}/progress`);
    } catch (err) {
      const e = new CustomEvent('show-toast', { detail: { message: `Re-audit failed: ${err.message || 'unknown error'}`, type: 'error' } });
      window.dispatchEvent(e);
    }
  }

  const { reportData, healthData, geoData, aeoData, aiVisibilityData, cwvData } = data;
  const siteSummary = reportData?.site_summary || {};
  const overallScore = siteSummary.overall_score;
  const totalIssues = siteSummary.total_issues || 0;
  const criticalIssues = reportData?.critical_issues || [];

  const severityColors = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#6b7280' };

  const issues = criticalIssues.length > 0
    ? criticalIssues
    : (healthData?.checks || []).filter(c => c?.status !== 'PASS' && c?.passed !== true).map(c => ({
        title: c.name || c.check || c.label || 'Issue',
        severity: 'HIGH',
        description: c.message || c.detail || c.issue || '',
        what_happened: c.message || c.detail || '',
        why: c.reason || '',
        impact: c.impact || '',
        recommendation: c.recommendation || c.suggestion || '',
        target_path: c.url || c.path || '',
        estimated_gain: c.estimated_gain || '1.2K',
        affected_pages: c.affected_pages || 1,
      }));

  const platformScores = aiVisibilityData?.ai_platform_visibility?.platform_scores || {};
  const modelData = [
    { name: 'ChatGPT', rate: platformScores.chatgpt?.score ?? aiVisibilityData?.chatgpt_visibility ?? null },
    { name: 'Gemini', rate: platformScores.gemini?.score ?? aiVisibilityData?.gemini_visibility ?? null },
    { name: 'Perplexity', rate: platformScores.perplexity?.score ?? aiVisibilityData?.perplexity_visibility ?? null },
  ].filter(m => m.rate != null);

  const modelColors = ['var(--accent)', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];
  const lastCrawl = aiVisibilityData?.last_crawl || aiVisibilityData?.last_crawled || aiVisibilityData?.crawl_timestamp || null;
  const lastCrawlMinutes = lastCrawl
    ? Math.round((Date.now() - new Date(lastCrawl).getTime()) / 60000)
    : null;
  const cwvScore = cwvData?.assessment?.score ?? cwvData?.performance_score;
  const cwvLcp = cwvData?.field_data?.lcp?.value || cwvData?.lab_data?.lcp?.value || cwvData?.assessment?.lcp || null;
  const cwvInp = cwvData?.field_data?.inp?.value || cwvData?.assessment?.inp || null;

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>Loading Executive Dashboard...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 12 }}>
        <AlertTriangle size={40} color="#ef4444" />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Failed to Load</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 400, textAlign: 'center' }}>{error}</div>
        <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', marginTop: 8 }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '24px 0' }}>
      {isViewer && (
        <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#f59e0b' }}>
          <Eye size={16} /> Read-Only Mode — You are viewing this dashboard as a viewer.
        </div>
      )}

      {/* Top Header / Context Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{siteSummary.project_name || siteSummary.name || 'Executive Command Center'}</span>

            {/* Timeframe Selector */}
            <div style={{ display: 'flex', gap: 2, background: 'var(--bg-white)', borderRadius: 6, padding: 2 }}>
              {['7d', '30d', '90d'].map(t => (
                <button key={t} onClick={() => setTimeframe(t)}
                  style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', background: timeframe === t ? 'var(--accent)' : 'transparent', color: timeframe === t ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Role Badge */}
            {isAdmin ? (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.15)', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                ADMIN
              </span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={10} /> VIEWER
              </span>
            )}
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} color="#6366f1" />
            Real-time cross-engine intelligence across Google, ChatGPT, Perplexity, Gemini, and Claude.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Export Report — all roles */}
          <button onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text)', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>
            <Download size={14} /> Export Report
          </button>

          {/* Trigger Global Re-Audit — ADMIN only */}
          <ProtectedAction requiredRole="admin">
            <button onClick={handleRerun}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>
              <ShieldAlert size={14} /> Trigger Global Re-Audit
            </button>
          </ProtectedAction>
        </div>
      </div>

      {/* KPI Metric Cards (4 cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28, marginTop: 24 }}>
        {[
          { icon: Search, label: 'Technical SEO Score', score: siteSummary.seo_score ?? 'N/A', trend: '—', up: true, color: 'var(--accent)' },
          { icon: Bot, label: 'GEO Score', score: geoData?.geo_visibility_score ?? geoData?.geo_score ?? 'N/A', trend: '—', up: true, color: '#22c55e' },
          { icon: Layers, label: 'AEO Score', score: aeoData?.aeo_score ?? 'N/A', trend: '—', up: true, color: '#f59e0b' },
          { icon: Activity, label: 'Core Web Vitals', score: cwvScore > 0 ? Math.round(cwvScore) : 'N/A', trend: cwvScore > 0 && cwvLcp ? `LCP ${cwvLcp}` : '—', up: true, color: '#3b82f6' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <kpi.icon size={18} color={kpi.color} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{kpi.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{kpi.score}</span>
              {kpi.trend !== '—' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600, color: kpi.up ? '#22c55e' : '#ef4444' }}>
                  {kpi.up ? '\u25B2' : '\u25BC'} {kpi.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Two-Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Left: High-Impact Critical Issues */}
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>High-Impact Critical Issues</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '1px 7px', borderRadius: 10, marginLeft: 4 }}>
              {issues.length}
            </span>
          </div>

          {issues.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(34,197,94,0.1)', borderRadius: 8, fontSize: 13, color: '#22c55e' }}>
              <CheckCircle size={14} /> No critical issues detected — your site is in great shape!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {issues.slice(0, 5).map((issue, i) => (
                <IssueCard key={i} issue={issue} onViewFix={(iss) => {
                  const e = new CustomEvent('show-toast', { detail: { message: `Fix blueprint for: ${iss.title || iss.name}`, type: 'info' } });
                  window.dispatchEvent(e);
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Right: Generative Model Reach */}
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Brain size={16} color="#6366f1" />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Generative Model Reach</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {modelData.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No AI platform data available for this audit.</div>
            )}
            {modelData.map((m, i) => (
              <div key={m.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#c0c0c0' }}>{m.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: modelColors[i] }}>{m.rate}%</span>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, m.rate)}%`, height: '100%', background: modelColors[i], borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {lastCrawlMinutes != null ? `Last LLM Crawl: ${lastCrawlMinutes < 1 ? '<1' : lastCrawlMinutes} min ago` : `Based on ${aiVisibilityData?.pages_analyzed ?? 0} analyzed pages`}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: modelData.length > 0 ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>
              <CheckCircle size={10} /> {modelData.length > 0 ? 'Real-time Analysis' : 'No Data'}
            </span>
          </div>
        </div>
      </div>

      {/* ScoreRing and ScoreBadge kept from original */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, marginBottom: 28 }}>
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <ScoreRing score={overallScore} size={140} stroke={12} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <ScoreBadge label="SEO Score" score={siteSummary.seo_score} icon={Search} />
          <ScoreBadge label="Technical Score" score={siteSummary.technical_score} icon={ShieldAlert} />
          <ScoreBadge label="Content Score" score={siteSummary.content_score} icon={Layers} />
          <ScoreBadge label="GEO Score" score={geoData?.geo_visibility_score ?? geoData?.geo_score} icon={Globe} />
          <ScoreBadge label="AEO Score" score={aeoData?.aeo_score} icon={Brain} />
          <ScoreBadge label="AI Visibility Score" score={aiVisibilityData?.ai_visibility_score ?? siteSummary.ai_visibility_score} icon={Bot} />
        </div>
      </div>
    </div>
  );
}
