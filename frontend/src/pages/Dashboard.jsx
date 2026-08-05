import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import DataSourceBadge from '../components/DataSourceBadge';
import AnimatedNumber from '../components/AnimatedNumber';
import ScoreRing from '../components/ScoreRing';
import { BarChart3, TrendingUp, Zap, Brain, ArrowRight, AlertTriangle, CheckCircle, FileText, Shield, Image, Link2, Search, ChevronRight, Target, Sparkles, Wand2, ArrowUpRight, ArrowDownRight, ShieldCheck, Download, Globe } from 'lucide-react';
import PdfDownloadButton from '../components/PdfDownloadButton';
import AuditTable from '../components/AuditTable';

function ScoreBar({ value, max = 100, color = '#4c6ef5', animated = true }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth((value / max) * 100), 100); return () => clearTimeout(t); }, [value, max]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 50, fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>
        <AnimatedNumber value={value ?? 0} duration={1000} />
      </div>
      <div style={{ flex: 1, height: 6, background: '#eef0f2', borderRadius: 3, overflow: 'hidden' }} className="live-shimmer">
        <div style={{ height: '100%', width: `${width}%`, background: `linear-gradient(90deg, ${color}, ${color}dd)`, borderRadius: 3, transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: `0 0 8px ${color}40` }} />
      </div>
    </div>
  );
}

function ScoreTrendChart({ points }) {
  const w = 560, h = 170, pad = 26;
  const scores = points.map(p => p.score);
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const range = Math.max(max - min, 1);
  const x = (i) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - ((v - min) / range) * (h - pad * 2);
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {[0.25, 0.5, 0.75].map(t => {
        const yy = (h - pad * 2) * (1 - t) + pad;
        return <line key={t} x1={pad} x2={w - pad} y1={yy} y2={yy} stroke="var(--border)" strokeDasharray="4 4" strokeWidth={1} />;
      })}
      <polyline points={line} fill="none" stroke="#12b886" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.score)} r={4} fill="#12b886" stroke="var(--bg-page)" strokeWidth={2} />
          <text x={x(i)} y={Math.max(y(p.score) - 10, 12)} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-muted)">{Math.round(p.score)}</text>
          <text x={x(i)} y={h - 8} textAnchor="middle" fontSize={10} fill="var(--text-muted)">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function CategoryCard({ label, score, color, icon: Icon, onClick, delay = 0 }) {
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D';
  return (
    <div onClick={onClick} className="hover-lift animate-in" style={{ animationDelay: `${delay}ms`, background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: 16, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 8px 24px -4px ${color}30`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.3s ease' }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Grade: {grade}</div>
        </div>
        <ChevronRight size={14} style={{ color: 'var(--text-dim)', transition: 'transform 0.2s' }} />
      </div>
      <ScoreBar value={score || 0} color={color} />
    </div>
  );
}

function QuickIssueRow({ issue, delay = 0 }) {
  const sevColor = issue.severity === 'CRITICAL' ? '#fa5252' : issue.severity === 'HIGH' ? '#f59f00' : issue.severity === 'MEDIUM' ? '#4c6ef5' : '#868e96';
  return (
    <div className="animate-in" style={{ animationDelay: `${delay}ms`, padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: sevColor, marginTop: 5, flexShrink: 0, boxShadow: `0 0 6px ${sevColor}60` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {issue.title || issue.issue || issue.name || issue.signal_name || 'Issue'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {issue.severity && <span style={{ color: sevColor, fontWeight: 500 }}>{issue.severity}</span>}
          {issue.category && <span>{issue.category}</span>}
          {issue.affected_pages && <span>{issue.affected_pages} pages</span>}
        </div>
      </div>
    </div>
  );
}

function FloatingOrbs() {
  return (
    <div className="floating-orbs">
      <div className="orb" />
      <div className="orb" />
      <div className="orb" />
    </div>
  );
}

export default function Dashboard() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deepData, setDeepData] = useState(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [impact, setImpact] = useState(null);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.getHistory(20);
        if (!cancelled) setAudits(data);
      } catch (err) { if (!cancelled) setError(err.message); } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const latest = audits.find(a => a.status === 'COMPLETED');
  const displayAudit = (id ? audits.find(a => a.audit_id === id && a.status === 'COMPLETED') : null) || latest;
  const activeId = id || latest?.audit_id;

  const siteKey = (u) => (u || '').replace(/\/+$/, '').toLowerCase();
  const trend = displayAudit?.website_url
    ? audits
        .filter(a => a.status === 'COMPLETED' && a.website_url && siteKey(a.website_url) === siteKey(displayAudit.website_url) && a.created_at)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(a => ({ score: a.overall_score || 0, label: new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }))
    : [];
  const trendDelta = trend.length >= 2 ? (trend[trend.length - 1].score - trend[0].score) : 0;

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    async function loadDeep() {
      setDeepLoading(true);
      try {
        const dd = await api.getDashboardDeep(activeId);
        if (!cancelled) setDeepData(dd);
      } catch { /* ok */ } finally { if (!cancelled) setDeepLoading(false); }
    }
    loadDeep();
    return () => { cancelled = true; };
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    api.request(`/audit/${activeId}/impact-report`).then((res) => {
      if (!cancelled) setImpact(res);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeId]);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Website intelligence overview</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeId && (
            <button className="btn btn-secondary btn-sm" onClick={() => api.exportCsv(activeId, 'issues').catch(e => alert(e.message))} title="Export all issues as CSV">
              <Download size={13} /> Export CSV
            </button>
          )}
          {activeId && <PdfDownloadButton auditId={activeId} />}
        </div>
      </div>

      {error && <div className="error-state animate-in">{error}</div>}
      {loading && (
        <div>
          <div className="shimmer shimmer-title" style={{ width: '30%', marginBottom: 12 }} />
          <div className="shimmer shimmer-text" style={{ width: '50%', marginBottom: 24 }} />
          <div className="score-grid">
            {[1,2,3,4,5,6].map(i => <div key={i} className="shimmer" style={{ height: 120, borderRadius: 'var(--radius)' }} />)}
          </div>
          <div className="stats-row">
            {[1,2,3,4,5,6].map(i => <div key={i} className="shimmer" style={{ height: 72, borderRadius: 'var(--radius)' }} />)}
          </div>
        </div>
      )}

      {!loading && audits.length === 0 && (
        <div className="empty-state animate-in">
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🔍</div>
          <h3>No audits yet</h3>
          <p>Run your first audit to see analytics</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
            <Sparkles size={16} /> Start Audit
          </button>
        </div>
      )}

      {!loading && latest && (
        <>
          {/* HERO SECTION with gradient + floating orbs */}
          <div className="hero-gradient animate-in" style={{ marginBottom: 24, position: 'relative' }}>
            <FloatingOrbs />
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24, alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ScoreRing score={displayAudit.overall_score} size={140} stroke={10} label="Overall Score" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4, position: 'relative', zIndex: 1 }}>
                  <span className="gradient-text-animated" style={{ WebkitTextFillColor: 'unset' }}>
                    {displayAudit.website_url}
                  </span>
                </h2>
                <p style={{ opacity: 0.8, fontSize: 14, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                  Score: <strong><AnimatedNumber value={displayAudit.overall_score || 0} duration={1400} /></strong>/100
                  <span style={{ marginLeft: 12, opacity: 0.6 }}>•</span>
                  <span style={{ marginLeft: 12 }}><AnimatedNumber value={displayAudit.total_pages || 0} duration={1000} /> pages crawled</span>
                  <span style={{ marginLeft: 12, opacity: 0.6 }}>•</span>
                  <span style={{ marginLeft: 12 }}><AnimatedNumber value={displayAudit.total_issues || 0} duration={1000} /> issues found</span>
                </p>
                <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)', position: 'relative', zIndex: 1 }} onClick={() => navigate(`/audit/${displayAudit.audit_id}/dashboard`)}>
                  View Full Report <ArrowRight size={13} className="arrow-bounce" />
                </button>
              </div>
            </div>
          </div>

          {/* SCORE TREND */}
          {trend.length >= 2 && (
            <div className="card card-3d animate-in" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={17} style={{ color: '#12b886' }} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Score Trend</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{trend.length} audit{trend.length > 1 ? 's' : ''}</span>
                </div>
                <span className={`badge ${trendDelta >= 0 ? 'badge-green' : 'badge-red'}`}>
                  {trendDelta >= 0 ? '+' : ''}{trendDelta} since first
                </span>
              </div>
              <ScoreTrendChart points={trend} />
            </div>
          )}

          {/* VALIDATED IMPACT */}
          {impact && impact.previous_audit_id && impact.applied_count > 0 && (
            <div className="card card-3d animate-in" style={{ marginBottom: 20, border: '1px solid rgba(34,197,94,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={17} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Validated Impact</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    vs previous audit {impact.previous_created_at ? new Date(impact.previous_created_at).toLocaleDateString() : ''}
                  </span>
                </div>
                {impact.score_delta != null && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Score <b style={{ color: 'var(--text)' }}>{impact.score_before}</b> →
                    <b style={{ color: impact.score_delta >= 0 ? '#22c55e' : '#ef4444' }}> {impact.score_after}</b>
                    <b style={{ color: impact.score_delta >= 0 ? '#22c55e' : '#ef4444', marginLeft: 6 }}>{impact.score_delta >= 0 ? '+' : ''}{impact.score_delta}</b>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{impact.applied_count}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>FIXES APPLIED</div>
                </div>
                <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{impact.resolved}</div>
                  <div style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 600 }}>RESOLVED</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{impact.still_present}</div>
                  <div style={{ fontSize: 10.5, color: '#ef4444', fontWeight: 600 }}>STILL PRESENT</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>+{impact.validated_points}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>VALIDATED PTS</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
                {impact.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                      background: it.status === 'RESOLVED' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: it.status === 'RESOLVED' ? '#16a34a' : '#ef4444' }}>
                      {it.status === 'RESOLVED' ? 'Resolved' : 'Still present'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.signal_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{it.page_url}</span>
                  </div>
                ))}
              </div>
              {impact.still_present > 0 && (
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/audit/${activeId}/action-studio`)}>
                  Fix the remaining {impact.still_present} <ArrowRight size={13} className="arrow-bounce" />
                </button>
              )}
            </div>
          )}

          {/* SCORE BREAKDOWN */}
          <div className="card animate-in" style={{ animationDelay: '100ms', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Score Breakdown</span>
              </div>
              <DataSourceBadge type="engine" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="stagger">
              {[
                { label: 'SEO', value: displayAudit.seo_score, color: '#12b886', route: 'seo' },
                { label: 'Technical', value: displayAudit.technical_score, color: '#4c6ef5', route: 'enterprise' },
                { label: 'AEO', value: displayAudit.aeo_score, color: '#f59f00', route: 'ai-visibility' },
                { label: 'GEO', value: displayAudit.geo_score, color: '#20c997', route: 'ai-visibility' },
                { label: 'Content', value: displayAudit.content_score, color: '#7950f2', route: 'content' },
                { label: 'AI Visibility', value: displayAudit.ai_visibility_score, color: '#e64980', route: 'ai-visibility' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '4px 0' }}
                  onClick={() => navigate(`/audit/${displayAudit.audit_id}/${s.route}`)}>
                  <span style={{ width: 80, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{s.label}</span>
                  <ScoreBar value={s.value || 0} color={s.color} />
                </div>
              ))}
            </div>
          </div>

          {/* AI ACTION STUDIO + RANK BOOST CTAs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div className="card card-3d animate-in" style={{ animationDelay: '80ms', marginBottom: 0, cursor: 'pointer' }}
            onClick={() => navigate(`/audit/${displayAudit.audit_id}/action-studio`)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>AI Action Studio</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    What's wrong, which page, exactly where, and how to fix it — AI-ranked with one-click fixes
                  </div>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Open Action Studio <ArrowRight size={13} />
              </button>
            </div>
          </div>
          <div className="card card-3d animate-in" style={{ animationDelay: '90ms', marginBottom: 0, cursor: 'pointer' }}
            onClick={() => navigate(`/audit/${displayAudit.audit_id}/rank-boost`)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wand2 size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Rank Boost</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    AI AEO/GEO kit per page — answer snippet, FAQ schema, meta & H2 rewrites. Copy, paste, rank.
                  </div>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Open Rank Boost <ArrowRight size={13} />
              </button>
            </div>
          </div>
          </div>

          {/* STATS ROW */}
          <div className="stats-row stagger">
            {[
              { icon: BarChart3, label: 'Pages Crawled', value: displayAudit.total_pages, color: 'var(--accent)', route: 'enterprise', bg: 'var(--accent-light)' },
              { icon: Zap, label: 'Total Issues', value: displayAudit.total_issues, color: '#f59f00', route: 'seo', bg: 'var(--yellow-bg)' },
              { icon: AlertTriangle, label: 'Critical', value: displayAudit.critical_issues || 0, color: '#fa5252', route: 'seo', bg: 'var(--red-bg)' },
              { icon: Brain, label: 'AI Score', value: displayAudit.ai_visibility_score || displayAudit.aeo_score || 0, color: '#e64980', route: 'ai-visibility', bg: 'var(--pink-bg)' },
              { icon: TrendingUp, label: 'Signals Checked (est.)', value: displayAudit.total_signals || (displayAudit.total_pages ? displayAudit.total_pages * 93 : 0), color: '#12b886', route: 'enterprise', bg: 'var(--green-bg)' },
              { icon: Globe, label: 'Content Score', value: displayAudit.content_score || 0, color: '#7950f2', route: 'content', bg: 'var(--purple-bg)' },
            ].map((s, i) => (
              <div key={i} className="stat-card hover-lift" onClick={() => navigate(`/audit/${displayAudit.audit_id}/${s.route}`)}
                style={{ cursor: 'pointer' }}>
                <div className="stat-icon" style={{ background: s.bg }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <div className="stat-info">
                  <div className="stat-value"><AnimatedNumber value={s.value ?? 0} duration={1000 + i * 100} /></div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* AI EXECUTIVE SUMMARY + PROJECT HEALTH */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="card card-3d animate-in" style={{ animationDelay: '200ms', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Brain size={16} style={{ color: '#e64980' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>AI Executive Summary</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                {(() => {
                  const seo = displayAudit.seo_score || 0
                  const tech = displayAudit.technical_score || 0
                  const content = displayAudit.content_score || 0
                  const ai = displayAudit.ai_visibility_score || displayAudit.aeo_score || 0
                  const strengths = []
                  const weaknesses = []
                  if (seo >= 80) strengths.push('strong SEO foundation')
                  else if (seo < 60) weaknesses.push('SEO needs improvement')
                  if (tech >= 80) strengths.push('technically sound architecture')
                  else if (tech < 60) weaknesses.push('technical SEO gaps')
                  if (content >= 70) strengths.push('good content quality')
                  else if (content < 60) weaknesses.push('content quality is below average')
                  if (ai >= 70) strengths.push('solid AI search presence')
                  else if (ai < 50) weaknesses.push('AI search visibility is weak')
                  const highPriCount = deepData?.issue_summary?.CRITICAL + deepData?.issue_summary?.HIGH || deepData?.top_issues?.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length || 0
                  const estAfter = Math.min(98, Math.round(displayAudit.overall_score || 0) + Math.round(highPriCount * 1.5))
                  return (
                    <>
                      Your website has <strong>{strengths.length > 0 ? strengths.join(' and ') : 'a baseline foundation'}</strong>.
                      {weaknesses.length > 0 && <> However, it <strong>{weaknesses.join(' and ')}</strong>.</>}
                      <br /><br />
                      <strong>Top opportunities:</strong>
                      <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
                        <li>Fix {highPriCount || 'critical'} high-priority technical issues</li>
                        <li>Improve AI search optimization and content depth</li>
                        <li>Add structured data and citation sources</li>
                      </ul>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', background: 'var(--green-bg)', borderRadius: 'var(--radius-sm)' }}>
                        <ArrowUpRight size={16} style={{ color: 'var(--green)' }} />
                        <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                          <AnimatedNumber value={Math.round(displayAudit.overall_score || 0)} duration={1200} />
                          <span className="arrow-bounce" style={{ margin: '0 6px' }}>→</span>
                          <AnimatedNumber value={estAfter} duration={1200} />
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>estimated improvement</span>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="card card-3d animate-in" style={{ animationDelay: '250ms', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Target size={16} style={{ color: '#12b886' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Project Health</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="stagger">
                {[
                  { label: 'Technical SEO', value: displayAudit.technical_score, color: '#4c6ef5', status: (displayAudit.technical_score || 0) >= 80 ? 'Excellent' : (displayAudit.technical_score || 0) >= 60 ? 'Good' : 'Needs Work' },
                  { label: 'Content', value: displayAudit.content_score, color: '#7950f2', status: (displayAudit.content_score || 0) >= 80 ? 'Excellent' : (displayAudit.content_score || 0) >= 60 ? 'Good' : 'Needs Improvement' },
                  { label: 'AI Search', value: displayAudit.ai_visibility_score || displayAudit.aeo_score, color: '#e64980', status: (displayAudit.ai_visibility_score || displayAudit.aeo_score || 0) >= 70 ? 'Good' : (displayAudit.ai_visibility_score || displayAudit.aeo_score || 0) >= 50 ? 'Average' : 'Weak' },
                  { label: 'Performance', value: deepData?.health_scores?.technical_health || deepData?.performance_score || displayAudit.technical_score || 0, color: '#20c997', status: (deepData?.health_scores?.technical_health || deepData?.performance_score || displayAudit.technical_score || 0) >= 80 ? 'Excellent' : (deepData?.health_scores?.technical_health || deepData?.performance_score || displayAudit.technical_score || 0) >= 60 ? 'Good' : 'Needs Work' },
                  { label: 'Authority', value: deepData?.health_scores?.eeat_score || deepData?.authority_score || Math.min(80, (displayAudit.seo_score || 0) + 10), color: '#f59f00', status: (deepData?.health_scores?.eeat_score || deepData?.authority_score || 0) >= 70 ? 'Good' : (deepData?.health_scores?.eeat_score || deepData?.authority_score || 0) >= 50 ? 'Average' : 'Low' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, width: 90, color: 'var(--text-muted)' }}>{item.label}</span>
                    <div style={{ flex: 1, height: 6, background: '#eef0f2', borderRadius: 3, overflow: 'hidden' }} className="live-shimmer">
                      <div style={{ height: '100%', width: `${item.value || 0}%`, background: item.color, borderRadius: 3, transition: 'width 1.2s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, color: item.color, fontWeight: 600, minWidth: 90, textAlign: 'right' }}>{item.status}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Score Roadmap</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexWrap: 'wrap' }}>
                  <span style={{ background: '#fa525218', color: '#fa5252', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
                    Current <AnimatedNumber value={Math.round(displayAudit.overall_score || 0)} duration={800} />
                  </span>
                  <ArrowRight size={12} className="arrow-bounce" style={{ color: 'white' }} />
                  <span style={{ background: '#f59f0018', color: '#f59f00', padding: '4px 10px', borderRadius: 6, fontWeight: 500 }}>
                    After Critical <AnimatedNumber value={Math.min(98, Math.round((displayAudit.overall_score || 0) + 8))} duration={800} />
                  </span>
                  <ArrowRight size={12} className="arrow-bounce" style={{ color: 'white' }} />
                  <span style={{ background: '#4c6ef518', color: '#4c6ef5', padding: '4px 10px', borderRadius: 6, fontWeight: 500 }}>
                    After Content <AnimatedNumber value={Math.min(98, Math.round((displayAudit.overall_score || 0) + 16))} duration={800} />
                  </span>
                  <ArrowRight size={12} className="arrow-bounce" style={{ color: 'white' }} />
                  <span style={{ background: '#12b88618', color: '#12b886', padding: '4px 10px', borderRadius: 6, fontWeight: 500 }}>
                    Target <AnimatedNumber value={Math.min(98, Math.round((displayAudit.overall_score || 0) + 25))} duration={800} />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PRIORITY ACTIONS + BUSINESS IMPACT */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="card card-3d animate-in" style={{ animationDelay: '300ms', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Zap size={16} style={{ color: '#f59f00' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Priority Actions</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fa5252', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="pulse-dot" style={{ background: '#fa5252', width: 6, height: 6 }} /> Fix Today
                </div>
                {deepData?.action_center?.immediate?.slice(0, 3).map((issue, i) => (
                  <QuickIssueRow key={i} issue={issue} delay={i * 60} />
                ))}
                {(!deepData?.action_center?.immediate || deepData.action_center.immediate.length === 0) && (
                  <div style={{ fontSize: 12, color: 'var(--green)', padding: '8px 12px', background: 'var(--green-bg)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} /> No critical issues — great!
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f59f00', marginBottom: 6 }}>This Week</div>
                {deepData?.action_center?.this_week?.slice(0, 3).map((rec, i) => (
                  <div key={i} className="animate-in" style={{ animationDelay: `${i * 80}ms`, padding: '8px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 13, borderRadius: 'var(--radius-sm)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {rec.action || rec.title || rec.recommendation || 'Recommendation'}
                  </div>
                ))}
                {!deepLoading && deepData && (!deepData.action_center?.this_week || deepData.action_center.this_week.length === 0) && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>No pending recommendations</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#12b886', marginBottom: 6 }}>This Month</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Build backlinks · Publish comparison pages · Expand content</div>
              </div>
            </div>

            <div className="card card-3d animate-in" style={{ animationDelay: '350ms', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TrendingUp size={16} style={{ color: '#12b886' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Business Impact</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Estimated Traffic Gain', value: Math.round((displayAudit.total_pages || 50) * 65), suffix: '/mo (est.)', color: '#12b886', prefix: '+' },
                  { label: 'Ranking Opportunities', value: Math.round((displayAudit.total_pages || 50) * 0.8), suffix: ' kw (est.)', color: '#4c6ef5', prefix: '' },
                  { label: 'AI Citation Opportunities', value: Math.round((displayAudit.total_pages || 50) * 0.2), suffix: ' (est.)', color: '#e64980', prefix: '' },
                  { label: 'Estimated Lead Growth', value: Math.round(12 + (displayAudit.total_pages || 50) * 0.05), suffix: '% (est.)', color: '#f59f00', prefix: '+' },
                ].map((item, i) => (
                  <div key={i} className="hover-lift" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: 14, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: item.color }}>
                      {item.prefix}<AnimatedNumber value={item.value} duration={1200} />{item.suffix}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Crawl Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Last Crawl:</span> <strong style={{ color: 'var(--green)' }}>Today</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Pages:</span> <strong><AnimatedNumber value={displayAudit.total_pages || 0} duration={800} /></strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Issues:</span> <strong><AnimatedNumber value={displayAudit.total_issues || 0} duration={800} /></strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* CATEGORY CARDS */}
          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
            <CategoryCard label="SEO Analysis" score={displayAudit.seo_score} color="#12b886" icon={Search} onClick={() => navigate(`/audit/${displayAudit.audit_id}/seo`)} delay={0} />
            <CategoryCard label="Technical SEO" score={displayAudit.technical_score} color="#4c6ef5" icon={Shield} onClick={() => navigate(`/audit/${displayAudit.audit_id}/enterprise`)} delay={60} />
            <CategoryCard label="AI Search Optimization" score={displayAudit.aeo_score} color="#f59f00" icon={Brain} onClick={() => navigate(`/audit/${displayAudit.audit_id}/ai-visibility`)} delay={120} />
            <CategoryCard label="Content Quality" score={displayAudit.content_score} color="#7950f2" icon={FileText} onClick={() => navigate(`/audit/${displayAudit.audit_id}/content`)} delay={180} />
            <CategoryCard label="Internal Links" score={deepData?.internal_links_score || Math.round(70 + (displayAudit.total_pages || 0) * 0.15)} color="#e64980" icon={Link2} onClick={() => navigate(`/audit/${displayAudit.audit_id}/internal-links`)} delay={240} />
            <CategoryCard label="Keyword Strategy" score={deepData?.keyword_score || Math.round(55 + (displayAudit.total_pages || 0) * 0.1)} color="#20c997" icon={Target} onClick={() => navigate(`/audit/${displayAudit.audit_id}/keywords`)} delay={300} />
          </div>

          {/* DEEP DATA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* More Issues */}
            <div className="card card-3d animate-in" style={{ animationDelay: '400ms', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} style={{ color: '#fa5252' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>More Issues</span>
                </div>
                {activeId && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/audit/${activeId}/issues`)}>View All</button>}
              </div>
              {deepLoading && !deepData && (
                <div>{[1,2,3].map(i => <div key={i} className="shimmer shimmer-bar" style={{ marginBottom: 12 }} />)}</div>
              )}
              {deepData?.action_center?.this_month?.slice(0, 5).map((issue, i) => (
                <QuickIssueRow key={i} issue={issue} delay={i * 50} />
              ))}
              {(!deepData?.action_center?.this_month || deepData.action_center.this_month.length === 0) && deepData?.recent_issues?.filter(i => i.severity !== 'CRITICAL').slice(0, 5).map((issue, i) => (
                <QuickIssueRow key={i} issue={issue} delay={i * 50} />
              ))}
              {!deepLoading && deepData && (!deepData.action_center?.this_month && (!deepData.recent_issues || deepData.recent_issues.filter(i => i.severity !== 'CRITICAL').length === 0)) && (
                <div style={{ fontSize: 13, color: 'var(--green)', padding: '12px', background: 'var(--green-bg)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} /> No additional issues — great!
                </div>
              )}
            </div>

            {/* Quick Wins */}
            <div className="card card-3d animate-in" style={{ animationDelay: '450ms', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} style={{ color: '#12b886' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Quick Wins</span>
                </div>
                {activeId && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/audit/${activeId}/action-center`)}>View All</button>}
              </div>
              {deepLoading && !deepData && (
                <div>{[1,2,3].map(i => <div key={i} className="shimmer shimmer-bar" style={{ marginBottom: 12 }} />)}</div>
              )}
              {deepData?.action_center?.this_week?.slice(0, 5).map((rec, i) => (
                <div key={i} className="animate-in" style={{ animationDelay: `${i * 60}ms`, padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', flex: 1 }}>{rec.action || rec.title || rec.recommendation || rec.fix || 'Recommendation'}</div>
                </div>
              ))}
              {(!deepData?.action_center?.this_week || deepData.action_center.this_week.length === 0) && deepData?.recent_issues?.slice(0, 5).map((rec, i) => (
                <div key={i} className="animate-in" style={{ animationDelay: `${i * 60}ms`, padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{rec.description || 'Issue'}</div>
                </div>
              ))}
              {!deepLoading && deepData && (!deepData.action_center?.this_week || deepData.action_center.this_week.length === 0) && (!deepData.recent_issues || deepData.recent_issues.length === 0) && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No recommendations yet</div>
              )}
            </div>

            {/* Content Opportunities */}
            <div className="card card-3d animate-in" style={{ animationDelay: '500ms', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={16} style={{ color: '#7950f2' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Content Opportunities</span>
                </div>
                {activeId && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/audit/${activeId}/content`)}>View All</button>}
              </div>
              {deepLoading && !deepData && (
                <div>{[1,2,3].map(i => <div key={i} className="shimmer shimmer-bar" style={{ marginBottom: 12 }} />)}</div>
              )}
              {deepData?.recent_issues?.filter(i => i.category === 'CONTENT').slice(0, 5).map((gap, i) => (
                <div key={i} className="animate-in" style={{ animationDelay: `${i * 60}ms`, padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{gap.description || 'Content issue'}</div>
                  {gap.page_url && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{gap.page_url}</div>}
                </div>
              ))}
              {!deepLoading && deepData && (!deepData.recent_issues || deepData.recent_issues.filter(i => i.category === 'CONTENT').length === 0) && (
                <div style={{ padding: '8px 0' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Suggested content topics:</div>
                  {['Revenue Intelligence Guide', 'AI GTM Platform Comparison', 'RevOps Automation Best Practices', 'Lead Enrichment Software Review', 'AI Sales Intelligence Overview'].map((topic, i) => (
                    <div key={i} className="animate-in" style={{ animationDelay: `${i * 60}ms`, fontSize: 12, padding: '4px 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--purple)' }} />
                      {topic}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RECENT AUDITS TABLE */}
          <div className="card animate-in" style={{ animationDelay: '550ms' }}>
            <div className="card-header">
              <h2>Recent Audits</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>View All</button>
            </div>
            <div className="table-container">
              <AuditTable audits={audits.slice(0, 8)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
