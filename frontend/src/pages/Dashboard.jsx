import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { BarChart3, TrendingUp, Globe, Zap, Brain, ArrowRight, AlertTriangle, CheckCircle, FileText, Shield, Image, Link2, Search, Clock, ChevronRight, Target } from 'lucide-react';
import PdfDownloadButton from '../components/PdfDownloadButton';

function ScoreRing({ score, size = 100, stroke = 8, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const offset = c - (pct / 100) * c;
  let color = '#fa5252';
  if (pct >= 80) color = '#12b886';
  else if (pct >= 60) color = '#4c6ef5';
  else if (pct >= 40) color = '#f59f00';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f2" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 700, color, lineHeight: 1 }}>{Math.round(pct)}</span>
        {label && <span style={{ fontSize: 10, color: '#8a8f9e', marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  );
}

function ScoreBar({ value, max = 100, color = '#4c6ef5' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 50, fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{Math.round(value ?? 0)}</div>
      <div style={{ flex: 1, height: 6, background: '#eef0f2', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function CategoryCard({ label, score, color, icon: Icon, onClick }) {
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D';
  return (
    <div onClick={onClick} style={styles.catCard}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Grade: {grade}</div>
        </div>
        <ChevronRight size={14} style={{ color: 'var(--text-dim)' }} />
      </div>
      <ScoreBar value={score || 0} color={color} />
    </div>
  );
}

function InlineLoader({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
      <div style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{text}</span>
    </div>
  );
}

function QuickIssueRow({ issue }) {
  const sevColor = issue.severity === 'CRITICAL' ? '#fa5252' : issue.severity === 'HIGH' ? '#f59f00' : issue.severity === 'MEDIUM' ? '#4c6ef5' : '#868e96';
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: sevColor, marginTop: 5, flexShrink: 0 }} />
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

      {error && <div className="error-state">{error}</div>}
      {loading && <div className="loading-overlay"><div className="spinner" /><p>Loading...</p></div>}

      {!loading && audits.length === 0 && (
        <div className="empty-state">
          <h3>No audits yet</h3>
          <p>Run your first audit to see analytics</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Start Audit</button>
        </div>
      )}

      {!loading && latest && (
        <>
          {/* TOP: Score ring + breakdown - INSTANT */}
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
              <ScoreRing score={latest.overall_score} size={130} stroke={10} label="Overall" />
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Score Breakdown</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{latest.website_url}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/audit/${latest.audit_id}/dashboard`)}>
                  View Report <ArrowRight size={13} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'SEO', value: latest.seo_score, color: '#12b886', route: 'seo' },
                  { label: 'Technical', value: latest.technical_score, color: '#4c6ef5', route: 'enterprise' },
                  { label: 'AEO', value: latest.aeo_score, color: '#f59f00', route: 'ai-visibility' },
                  { label: 'GEO', value: latest.geo_score, color: '#20c997', route: 'ai-visibility' },
                  { label: 'Content', value: latest.content_score, color: '#7950f2', route: 'content' },
                  { label: 'AI Visibility', value: latest.ai_visibility_score, color: '#e64980', route: 'ai-visibility' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    onClick={() => navigate(`/audit/${latest.audit_id}/${s.route}`)}>
                    <span style={{ width: 80, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{s.label}</span>
                    <ScoreBar value={s.value || 0} color={s.color} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STATS ROW - INSTANT */}
          <div className="stats-row">
            {[
              { icon: BarChart3, label: 'Pages', value: latest.total_pages, color: 'var(--accent)', route: 'enterprise' },
              { icon: Zap, label: 'Issues', value: latest.total_issues, color: '#f59f00', route: 'issues' },
              { icon: Brain, label: 'AEO', value: latest.aeo_score, color: '#7950f2', route: 'ai-visibility' },
              { icon: Globe, label: 'GEO', value: latest.geo_score, color: '#20c997', route: 'ai-visibility' },
            ].map((s, i) => (
              <div key={i} className="stat-card" onClick={() => navigate(`/audit/${latest.audit_id}/${s.route}`)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div className="stat-icon"><s.icon size={16} style={{ color: s.color }} /></div>
                <div className="stat-info">
                  <div className="stat-value">{s.value ?? '-'}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CATEGORY CARDS - INSTANT */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
            <CategoryCard label="SEO Analysis" score={latest.seo_score} color="#12b886" icon={Search} onClick={() => navigate(`/audit/${latest.audit_id}/seo`)} />
            <CategoryCard label="Technical SEO" score={latest.technical_score} color="#4c6ef5" icon={Shield} onClick={() => navigate(`/audit/${latest.audit_id}/enterprise`)} />
            <CategoryCard label="AI Search Optimization" score={latest.aeo_score} color="#f59f00" icon={Brain} onClick={() => navigate(`/audit/${latest.audit_id}/ai-visibility`)} />
            <CategoryCard label="Content Quality" score={latest.content_score} color="#7950f2" icon={FileText} onClick={() => navigate(`/audit/${latest.audit_id}/content`)} />
            <CategoryCard label="Internal Links" score={Math.min(100, ((latest.total_pages || 1) * 3))} color="#e64980" icon={Link2} onClick={() => navigate(`/audit/${latest.audit_id}/internal-links`)} />
            <CategoryCard label="Keyword Strategy" score={60} color="#20c997" icon={Target} onClick={() => navigate(`/audit/${latest.audit_id}/keywords`)} />
          </div>

          {/* DEEP DATA - LOADING LAZY */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* Top Issues */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} style={{ color: '#fa5252' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Top Issues</span>
                </div>
                {activeId && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/audit/${activeId}/issues`)}>View All</button>}
              </div>
              {deepLoading && !deepData && <InlineLoader text="Loading issues..." />}
              {deepData?.top_issues?.slice(0, 5).map((issue, i) => (
                <QuickIssueRow key={i} issue={issue} />
              ))}
              {!deepLoading && deepData && (!deepData.top_issues || deepData.top_issues.length === 0) && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>No critical issues</div>
              )}
            </div>

            {/* Quick Wins */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} style={{ color: '#12b886' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Quick Wins</span>
                </div>
                {activeId && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/audit/${activeId}/recommendations`)}>View All</button>}
              </div>
              {deepLoading && !deepData && <InlineLoader text="Loading recommendations..." />}
              {deepData?.recommendations?.slice(0, 5).map((rec, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{rec.title || rec.recommendation || rec.action || rec.fix || 'Recommendation'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
                    {rec.impact && <span>Impact: {rec.impact}</span>}
                    {rec.effort && <span>Effort: {rec.effort}</span>}
                  </div>
                </div>
              ))}
              {!deepLoading && deepData && (!deepData.recommendations || deepData.recommendations.length === 0) && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>No recommendations yet</div>
              )}
            </div>

            {/* Content Gaps */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={16} style={{ color: '#7950f2' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Content Gaps</span>
                </div>
                {activeId && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/audit/${activeId}/content`)}>View All</button>}
              </div>
              {deepLoading && !deepData && <InlineLoader text="Loading content analysis..." />}
              {deepData?.content_gaps?.slice(0, 5).map((gap, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{gap.topic || gap.keyword || gap.gap || gap.title || 'Gap'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{gap.reason || gap.description || ''}</div>
                </div>
              ))}
              {!deepLoading && deepData && (!deepData.content_gaps || deepData.content_gaps.length === 0) && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>No content gaps identified</div>
              )}
            </div>
          </div>

          {/* RECENT AUDITS TABLE - INSTANT */}
          <div className="card">
            <div className="card-header">
              <h2>Recent Audits</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>View All</button>
            </div>
            <div className="table-wrapper">
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
                        <span className={`badge ${(a.overall_score || 0) >= 80 ? 'badge-green' : (a.overall_score || 0) >= 60 ? 'badge-blue' : (a.overall_score || 0) >= 40 ? 'badge-yellow' : 'badge-red'}`}>
                          {a.overall_score ? Math.round(a.overall_score) : '-'}
                        </span>
                      </td>
                      <td>{a.seo_score ? Math.round(a.seo_score) : '-'}</td>
                      <td>{a.aeo_score ? Math.round(a.aeo_score) : '-'}</td>
                      <td>{a.total_pages ?? '-'}</td>
                      <td>
                        <span className={`badge ${a.status === 'COMPLETED' ? 'badge-green' : a.status === 'FAILED' ? 'badge-red' : 'badge-blue'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}
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

const styles = {
  catCard: {
    background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    padding: 16, cursor: 'pointer', transition: 'all 0.2s ease',
  },
};
