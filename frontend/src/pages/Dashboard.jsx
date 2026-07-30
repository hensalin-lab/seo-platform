import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import AnimatedNumber from '../components/AnimatedNumber';
import { BarChart3, TrendingUp, Globe, Zap, Brain, ArrowRight, AlertTriangle, CheckCircle, FileText, Shield, Image, Link2, Search, Clock, ChevronRight, Target, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import PdfDownloadButton from '../components/PdfDownloadButton';

const NA = <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>—</span>;

function ScoreRing({ score, size = 100, stroke = 8, label }) {
  const [mounted, setMounted] = useState(false);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const haveScore = score != null && !isNaN(score);
  const pct = haveScore ? Math.min(100, Math.max(0, score)) : 0;
  const offset = mounted ? c - (pct / 100) * c : c;
  let color = '#868e96';
  let glowColor = 'rgba(0,0,0,0.1)';
  if (haveScore) {
    if (pct >= 80) { color = '#12b886'; glowColor = 'rgba(18,184,134,0.3)'; }
    else if (pct >= 60) { color = '#4c6ef5'; glowColor = 'rgba(76,110,245,0.3)'; }
    else if (pct >= 40) { color = '#f59f00'; glowColor = 'rgba(245,159,11,0.3)'; }
    else { color = '#fa5252'; glowColor = 'rgba(250,82,82,0.3)'; }
  }

  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: haveScore ? `drop-shadow(0 0 8px ${glowColor})` : 'none' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f2" strokeWidth={stroke} />
        {haveScore && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color, lineHeight: 1 }}>
          {haveScore ? <AnimatedNumber value={pct} duration={1400} /> : '—'}
        </span>
        {label && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  );
}

function ScoreBar({ value, max = 100, color = '#4c6ef5', animated = true }) {
  const [width, setWidth] = useState(0);
  const haveValue = value != null && !isNaN(value);
  useEffect(() => { const t = setTimeout(() => setWidth(haveValue ? (value / max) * 100 : 0), 100); return () => clearTimeout(t); }, [value, max, haveValue]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 50, fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>
        {haveValue ? <AnimatedNumber value={value ?? 0} duration={1000} /> : '—'}
      </div>
      <div style={{ flex: 1, height: 6, background: '#eef0f2', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: haveValue ? `linear-gradient(90deg, ${color}, ${color}dd)` : '#eef0f2', borderRadius: 3, transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>
    </div>
  );
}

function CategoryCard({ label, score, color, icon: Icon, onClick, delay = 0 }) {
  const haveScore = score != null && !isNaN(score);
  const grade = !haveScore ? '—' : score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D';
  return (
    <div onClick={onClick} className="hover-lift animate-in" style={{ animationDelay: `${delay}ms`, background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: 16, cursor: onClick ? 'pointer' : 'default', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden' }}
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
        {onClick && <ChevronRight size={14} style={{ color: 'var(--text-dim)', transition: 'transform 0.2s' }} />}
      </div>
      <ScoreBar value={haveScore ? score : null} color={color} />
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
  const activeId = id || latest?.audit_id;

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

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Website intelligence overview</p>
        </div>
        {activeId && <PdfDownloadButton auditId={activeId} />}
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
          <div className="hero-gradient animate-in" style={{ marginBottom: 24, position: 'relative' }}>
            <FloatingOrbs />
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24, alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ScoreRing score={latest.overall_score} size={140} stroke={10} label="Overall Score" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4, position: 'relative', zIndex: 1 }}>
                  <span className="gradient-text-animated" style={{ WebkitTextFillColor: 'unset' }}>
                    {latest.website_url}
                  </span>
                </h2>
                <p style={{ opacity: 0.8, fontSize: 14, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                  Score: <strong>{latest.overall_score != null ? <AnimatedNumber value={latest.overall_score} duration={1400} /> : NA}</strong>/100
                  <span style={{ marginLeft: 12, opacity: 0.6 }}>•</span>
                  <span style={{ marginLeft: 12 }}>{latest.total_pages != null ? <><AnimatedNumber value={latest.total_pages} duration={1000} /> pages crawled</> : NA}</span>
                  <span style={{ marginLeft: 12, opacity: 0.6 }}>•</span>
                  <span style={{ marginLeft: 12 }}>{latest.total_issues != null ? <><AnimatedNumber value={latest.total_issues} duration={1000} /> issues found</> : NA}</span>
                </p>
                <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)', position: 'relative', zIndex: 1 }} onClick={() => navigate(`/audit/${latest.audit_id}/dashboard`)}>
                  View Full Report <ArrowRight size={13} className="arrow-bounce" />
                </button>
              </div>
            </div>
          </div>

          <div className="card animate-in" style={{ animationDelay: '100ms', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Score Breakdown</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="stagger">
              {[
                { label: 'SEO', value: latest.seo_score, color: '#12b886', route: 'seo' },
                { label: 'Technical', value: latest.technical_score, color: '#4c6ef5', route: 'enterprise' },
                { label: 'AEO', value: latest.aeo_score, color: '#f59f00', route: 'ai-visibility' },
                { label: 'GEO', value: latest.geo_score, color: '#20c997', route: 'ai-visibility' },
                { label: 'Content', value: latest.content_score, color: '#7950f2', route: 'content' },
                { label: 'AI Visibility', value: latest.ai_visibility_score, color: '#e64980', route: 'ai-visibility' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '4px 0' }}
                  onClick={() => navigate(`/audit/${latest.audit_id}/${s.route}`)}>
                  <span style={{ width: 80, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{s.label}</span>
                  <ScoreBar value={s.value} color={s.color} />
                </div>
              ))}
            </div>
          </div>

          <div className="stats-row stagger">
            {[
              { icon: BarChart3, label: 'Pages Crawled', value: latest.total_pages, color: 'var(--accent)', route: 'enterprise', bg: 'var(--accent-light)' },
              { icon: Zap, label: 'Total Issues', value: latest.total_issues, color: '#f59f00', route: 'seo', bg: 'var(--yellow-bg)' },
              { icon: AlertTriangle, label: 'Critical', value: latest.critical_issues, color: '#fa5252', route: 'seo', bg: 'var(--red-bg)' },
              { icon: Brain, label: 'AI Score', value: latest.ai_visibility_score ?? latest.aeo_score, color: '#e64980', route: 'ai-visibility', bg: 'var(--pink-bg)' },
              { icon: TrendingUp, label: 'Signals Checked', value: latest.total_signals, color: '#12b886', route: 'enterprise', bg: 'var(--green-bg)' },
              { icon: Globe, label: 'Content Score', value: latest.content_score, color: '#7950f2', route: 'content', bg: 'var(--purple-bg)' },
            ].map((s, i) => (
              <div key={i} className="stat-card hover-lift" onClick={() => navigate(`/audit/${latest.audit_id}/${s.route}`)}
                style={{ cursor: 'pointer' }}>
                <div className="stat-icon" style={{ background: s.bg }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <div className="stat-info">
                  <div className="stat-value">{s.value != null ? <AnimatedNumber value={s.value} duration={1000 + i * 100} /> : NA}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="card card-3d animate-in" style={{ animationDelay: '200ms', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Brain size={16} style={{ color: '#e64980' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>AI Executive Summary</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                {(() => {
                  const seo = latest.seo_score;
                  const tech = latest.technical_score;
                  const content = latest.content_score;
                  const ai = latest.ai_visibility_score ?? latest.aeo_score;
                  const strengths = [];
                  const weaknesses = [];
                  if (seo != null) { if (seo >= 80) strengths.push('strong SEO foundation'); else if (seo < 60) weaknesses.push('SEO needs improvement'); }
                  if (tech != null) { if (tech >= 80) strengths.push('technically sound architecture'); else if (tech < 60) weaknesses.push('technical SEO gaps'); }
                  if (content != null) { if (content >= 70) strengths.push('good content quality'); else if (content < 60) weaknesses.push('content quality is below average'); }
                  if (ai != null) { if (ai >= 70) strengths.push('solid AI search presence'); else if (ai < 50) weaknesses.push('AI search visibility is weak'); }
                  return (
                    <>
                      {strengths.length === 0 && weaknesses.length === 0 ? (
                        <span style={{ color: 'var(--text-dim)' }}>Insufficient data to generate an executive summary. Run a full audit to get started.</span>
                      ) : (
                        <>Your website has <strong>{strengths.length > 0 ? strengths.join(' and ') : 'a baseline foundation'}</strong>.{weaknesses.length > 0 && <> However, it <strong>{weaknesses.join(' and ')}</strong>.</>}</>
                      )}
                      <br /><br />
                      <strong>Top opportunities:</strong>
                      <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
                        <li>Fix high-priority technical issues</li>
                        <li>Improve AI search optimization and content depth</li>
                        <li>Add structured data and citation sources</li>
                      </ul>
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
                  { label: 'Technical SEO', value: latest.technical_score, color: '#4c6ef5', status: latest.technical_score != null ? (latest.technical_score >= 80 ? 'Excellent' : latest.technical_score >= 60 ? 'Good' : 'Needs Work') : '—' },
                  { label: 'Content', value: latest.content_score, color: '#7950f2', status: latest.content_score != null ? (latest.content_score >= 80 ? 'Excellent' : latest.content_score >= 60 ? 'Good' : 'Needs Improvement') : '—' },
                  { label: 'AI Search', value: latest.ai_visibility_score ?? latest.aeo_score, color: '#e64980', status: (latest.ai_visibility_score ?? latest.aeo_score) != null ? ((latest.ai_visibility_score ?? latest.aeo_score) >= 70 ? 'Good' : (latest.ai_visibility_score ?? latest.aeo_score) >= 50 ? 'Average' : 'Weak') : '—' },
                  { label: 'Performance', value: deepData?.health_scores?.technical_health ?? deepData?.performance_score ?? latest.technical_score, color: '#20c997', status: (deepData?.health_scores?.technical_health ?? deepData?.performance_score ?? latest.technical_score) != null ? ((deepData?.health_scores?.technical_health ?? deepData?.performance_score ?? latest.technical_score) >= 80 ? 'Excellent' : (deepData?.health_scores?.technical_health ?? deepData?.performance_score ?? latest.technical_score) >= 60 ? 'Good' : 'Needs Work') : '—' },
                  { label: 'Authority', value: deepData?.health_scores?.eeat_score ?? deepData?.authority_score, color: '#f59f00', status: (deepData?.health_scores?.eeat_score ?? deepData?.authority_score) != null ? ((deepData?.health_scores?.eeat_score ?? deepData?.authority_score) >= 70 ? 'Good' : (deepData?.health_scores?.eeat_score ?? deepData?.authority_score) >= 50 ? 'Average' : 'Low') : '—' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, width: 90, color: 'var(--text-muted)' }}>{item.label}</span>
                    <div style={{ flex: 1, height: 6, background: '#eef0f2', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.value != null ? item.value : 0}%`, background: item.value != null ? item.color : '#eef0f2', borderRadius: 3, transition: 'width 1.2s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, color: item.value != null ? item.color : 'var(--text-dim)', fontWeight: 600, minWidth: 90, textAlign: 'right' }}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="card card-3d animate-in" style={{ animationDelay: '300ms', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Zap size={16} style={{ color: '#f59f00' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Priority Actions</span>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fa5252', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="pulse-dot" style={{ background: '#fa5252', width: 6, height: 6 }} /> Fix Today
                </div>
                {deepData?.action_center?.immediate?.slice(0, 3).map((issue, i) => (
                  <QuickIssueRow key={i} issue={issue} delay={i * 60} />
                ))}
                {(!deepData?.action_center?.immediate || deepData.action_center.immediate.length === 0) && (
                  <div style={{ fontSize: 12, color: 'var(--green)', padding: '8px 12px', background: 'var(--green-bg)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} /> No critical issues
                  </div>
                )}
              </div>
            </div>

            <div className="card card-3d animate-in" style={{ animationDelay: '350ms', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TrendingUp size={16} style={{ color: '#12b886' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Crawl Details</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Last Crawl:</span> <strong style={{ color: 'var(--green)' }}>Today</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Pages:</span> <strong>{latest.total_pages != null ? <AnimatedNumber value={latest.total_pages} duration={800} /> : NA}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Issues:</span> <strong>{latest.total_issues != null ? <AnimatedNumber value={latest.total_issues} duration={800} /> : NA}</strong></div>
              </div>
            </div>
          </div>

          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
            <CategoryCard label="SEO Analysis" score={latest.seo_score} color="#12b886" icon={Search} onClick={() => navigate(`/audit/${latest.audit_id}/seo`)} delay={0} />
            <CategoryCard label="Technical SEO" score={latest.technical_score} color="#4c6ef5" icon={Shield} onClick={() => navigate(`/audit/${latest.audit_id}/enterprise`)} delay={60} />
            <CategoryCard label="AI Search Optimization" score={latest.aeo_score} color="#f59f00" icon={Brain} onClick={() => navigate(`/audit/${latest.audit_id}/ai-visibility`)} delay={120} />
            <CategoryCard label="Content Quality" score={latest.content_score} color="#7950f2" icon={FileText} onClick={() => navigate(`/audit/${latest.audit_id}/content`)} delay={180} />
            <CategoryCard label="Internal Links" score={deepData?.internal_links_score} color="#e64980" icon={Link2} onClick={() => navigate(`/audit/${latest.audit_id}/internal-links`)} delay={240} />
            <CategoryCard label="Keyword Strategy" score={deepData?.keyword_score} color="#20c997" icon={Target} onClick={() => navigate(`/audit/${latest.audit_id}/keywords`)} delay={300} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
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
                  <CheckCircle size={14} /> No additional issues
                </div>
              )}
            </div>

            <div className="card card-3d animate-in" style={{ animationDelay: '450ms', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} style={{ color: '#12b886' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Quick Wins</span>
                </div>
                {activeId && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/audit/${activeId}/recommendations`)}>View All</button>}
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
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No content opportunities found</div>
              )}
            </div>
          </div>

          <div className="card animate-in" style={{ animationDelay: '550ms' }}>
            <div className="card-header">
              <h2>Recent Audits</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>View All</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Website</th>
                    <th>Score</th>
                    <th>SEO</th>
                    <th>AEO</th>
                    <th>Pages</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {audits.slice(0, 8).map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500, color: 'var(--text)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Globe size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                          {a.website_url}
                        </div>
                      </td>
                      <td>
                        {a.overall_score != null ? (
                          <span className={`badge ${a.overall_score >= 80 ? 'badge-green' : a.overall_score >= 60 ? 'badge-blue' : a.overall_score >= 40 ? 'badge-yellow' : 'badge-red'}`}>
                            {Math.round(a.overall_score)}
                          </span>
                        ) : <span className="badge badge-blue">—</span>}
                      </td>
                      <td>{a.seo_score != null ? Math.round(a.seo_score) : '—'}</td>
                      <td>{a.aeo_score != null ? Math.round(a.aeo_score) : '—'}</td>
                      <td>{a.total_pages ?? '—'}</td>
                      <td>
                        <span className={`badge ${a.status === 'COMPLETED' ? 'badge-green' : a.status === 'FAILED' ? 'badge-red' : 'badge-blue'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        {a.status === 'COMPLETED' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/audit/${a.audit_id}/dashboard`)}>
                            Report <ArrowRight size={12} />
                          </button>
                        )}
                        {a.status !== 'COMPLETED' && a.status !== 'FAILED' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/audit/${a.audit_id}/progress`)}>
                            <Clock size={12} /> Track
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
