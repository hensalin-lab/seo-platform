import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { LayoutDashboard, Globe, Brain, Bot, TrendingUp, AlertTriangle, CheckCircle, Activity, FileText, Users, Search, BarChart3, XCircle, RefreshCw, Shield, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProtectedAction from '../components/ProtectedAction';

function ScoreRing({ score, size = 120, stroke = 10 }) {
  const [mounted, setMounted] = useState(false);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const offset = mounted ? c - (pct / 100) * c : c;
  let color = '#fa5252';
  let glowColor = 'rgba(250,82,82,0.3)';
  if (pct >= 80) { color = '#12b886'; glowColor = 'rgba(18,184,134,0.3)'; }
  else if (pct >= 60) { color = '#4c6ef5'; glowColor = 'rgba(76,110,245,0.3)'; }
  else if (pct >= 40) { color = '#f59f00'; glowColor = 'rgba(245,159,11,0.3)'; }

  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 12px ${glowColor})` }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2a2d35" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(pct)}</span>
        <span style={{ fontSize: 11, color: '#8a8f9e', marginTop: 2 }}>OVERALL</span>
      </div>
    </div>
  );
}

function ScoreBadge({ label, score, icon: Icon }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  let color = '#fa5252';
  if (pct >= 80) color = '#12b886';
  else if (pct >= 60) color = '#4c6ef5';
  else if (pct >= 40) color = '#f59f00';
  const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'D';

  return (
    <div style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: '#8a8f9e', fontWeight: 500, marginBottom: 2 }}>{label}</div>
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

function HealthCheckItem({ check }) {
  const passed = check?.status === 'PASS' || check?.passed === true;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#16181e', borderRadius: 8, border: '1px solid #2a2d35' }}>
      {passed ? <CheckCircle size={14} color="#12b886" /> : <XCircle size={14} color="#fa5252" />}
      <span style={{ fontSize: 13, color: '#e0e0e0', flex: 1 }}>{check?.name || check?.check || check?.label || 'Check'}</span>
      <span style={{ fontSize: 11, color: passed ? '#12b886' : '#fa5252', fontWeight: 600 }}>{passed ? 'PASS' : 'FAIL'}</span>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isViewer } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    reportData: null,
    pagesData: null,
    healthData: null,
    geoData: null,
    aeoData: null,
    aiVisibilityData: null,
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
      ]);
      setData({
        reportData: results[0].status === 'fulfilled' ? results[0].value : null,
        pagesData: results[1].status === 'fulfilled' ? results[1].value : null,
        healthData: results[2].status === 'fulfilled' ? results[2].value : null,
        geoData: results[3].status === 'fulfilled' ? results[3].value : null,
        aeoData: results[4].status === 'fulfilled' ? results[4].value : null,
        aiVisibilityData: results[5].status === 'fulfilled' ? results[5].value : null,
      });
    } catch (err) {
      setError(err.message || 'Failed to load executive dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) loadData(); }, [id]);

  const { reportData, healthData, geoData, aeoData, aiVisibilityData } = data;

  const siteSummary = reportData?.site_summary || {};
  const overallScore = siteSummary.overall_score;
  const totalPages = siteSummary.total_pages || 0;
  const totalIssues = siteSummary.total_issues || 0;
  const criticalIssues = reportData?.critical_issues || [];
  const pagesWithIssuesPct = totalPages > 0 ? Math.round((totalIssues / totalPages) * 100) : 0;
  const recommendationsCount = reportData?.recommendations_count || reportData?.recommendations?.length || 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #2a2d35', borderTopColor: '#4c6ef5', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 15, color: '#8a8f9e', fontWeight: 500 }}>Loading Executive Dashboard...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 12 }}>
        <AlertTriangle size={40} color="#fa5252" />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#e0e0e0' }}>Failed to Load</div>
        <div style={{ fontSize: 13, color: '#8a8f9e', maxWidth: 400, textAlign: 'center' }}>{error}</div>
        <button className="btn btn-primary" onClick={loadData} style={{ marginTop: 8 }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const issuesColor = totalIssues === 0 ? '#12b886' : totalIssues < 20 ? '#f59f00' : '#fa5252';

  return (
    <div style={{ padding: '24px 0' }}>
      {isViewer && (
        <div style={{ background: 'rgba(245,159,11,0.12)', border: '1px solid rgba(245,159,11,0.3)', borderRadius: 8, padding: '8px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#f59f00' }}>
          <Eye size={16} /> Read-Only Mode — You are viewing this dashboard as a viewer.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <LayoutDashboard size={22} color="#4c6ef5" />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>Executive Dashboard</h1>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: isAdmin ? 'rgba(18,184,134,0.15)' : 'rgba(76,110,245,0.15)', color: isAdmin ? '#12b886' : '#4c6ef5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isAdmin ? 'ADMIN' : 'VIEWER'}
            </span>
          </div>
          <p style={{ fontSize: 14, color: '#8a8f9e', margin: 0 }}>Unified SEO + GEO + AEO Overview</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, marginBottom: 28 }}>
        <div style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <ScoreRing score={overallScore} size={140} stroke={12} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <ScoreBadge label="SEO Score" score={siteSummary.seo_score} icon={Search} />
          <ScoreBadge label="Technical Score" score={siteSummary.technical_score} icon={Shield} />
          <ScoreBadge label="Content Score" score={siteSummary.content_score} icon={FileText} />
          <ScoreBadge label="GEO Score" score={geoData?.geo_score ?? geoData?.geo_visibility_score} icon={Globe} />
          <ScoreBadge label="AEO Score" score={aeoData?.aeo_score} icon={Brain} />
          <ScoreBadge label="AI Visibility Score" score={siteSummary.ai_visibility_score} icon={Bot} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { icon: BarChart3, label: 'Total Pages', value: totalPages, color: '#4c6ef5' },
          { icon: AlertTriangle, label: 'Total Issues', value: totalIssues, color: issuesColor },
          { icon: TrendingUp, label: 'Recommendations', value: recommendationsCount, color: '#12b886' },
          { icon: Activity, label: 'Pages w/ Issues', value: `${pagesWithIssuesPct}%`, color: '#f59f00' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#8a8f9e' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {aiVisibilityData && (
        <div style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12, padding: 20, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Bot size={16} color="#e64980" />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0' }}>AI & Search Visibility</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2d35' }}>
                  {['LLM / Platform', 'Status', 'Mentioned', 'Sentiment'].map((h, i) => (
                    <th key={i} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 11, fontWeight: 600, color: '#8a8f9e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'ChatGPT', mentioned: aiVisibilityData.chatgpt_mentioned ?? aiVisibilityData.chatgpt?.mentioned, sentiment: aiVisibilityData.chatgpt_sentiment ?? aiVisibilityData.chatgpt?.sentiment },
                  { name: 'Perplexity', mentioned: aiVisibilityData.perplexity_mentioned ?? aiVisibilityData.perplexity?.mentioned, sentiment: aiVisibilityData.perplexity_sentiment ?? aiVisibilityData.perplexity?.sentiment },
                  { name: 'Claude', mentioned: aiVisibilityData.claude_mentioned ?? aiVisibilityData.claude?.mentioned, sentiment: aiVisibilityData.claude_sentiment ?? aiVisibilityData.claude?.sentiment },
                  { name: 'Gemini', mentioned: aiVisibilityData.gemini_mentioned ?? aiVisibilityData.gemini?.mentioned, sentiment: aiVisibilityData.gemini_sentiment ?? aiVisibilityData.gemini?.sentiment },
                ].map((llm, i) => (
                  <tr key={i} style={{ borderBottom: i < 3 ? '1px solid #2a2d35' : 'none' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>{llm.name}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {llm.mentioned != null ? (
                        llm.mentioned ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#12b886', fontSize: 13 }}><CheckCircle size={14} /> Mentioned</span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fa5252', fontSize: 13 }}><XCircle size={14} /> Not Found</span>
                        )
                      ) : (
                        <span style={{ color: '#8a8f9e', fontSize: 13 }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#e0e0e0' }}>
                      {llm.mentioned != null ? (llm.mentioned ? '✓' : '✗') : '-'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {llm.sentiment ? (
                        <span style={{ fontSize: 12, fontWeight: 500, color: llm.sentiment === 'POSITIVE' ? '#12b886' : llm.sentiment === 'NEGATIVE' ? '#fa5252' : '#f59f00' }}>
                          {llm.sentiment}
                        </span>
                      ) : (
                        <span style={{ color: '#8a8f9e', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={16} color="#fa5252" />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0' }}>Critical Issues</span>
            {criticalIssues.length > 5 && (
              <span style={{ fontSize: 11, color: '#8a8f9e', marginLeft: 'auto' }}>Top 5 of {criticalIssues.length}</span>
            )}
          </div>
          {criticalIssues.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(18,184,134,0.1)', borderRadius: 8, fontSize: 13, color: '#12b886' }}>
              <CheckCircle size={14} /> No critical issues — great work!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {criticalIssues.slice(0, 5).map((issue, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: '#16181e', borderRadius: 8, border: '1px solid #2a2d35' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fa5252', marginTop: 5, flexShrink: 0, boxShadow: '0 0 6px rgba(250,82,82,0.4)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {issue.title || issue.issue || issue.name || issue.description || 'Critical Issue'}
                    </div>
                    <div style={{ fontSize: 11, color: '#8a8f9e', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {issue.category && <span>{issue.category}</span>}
                      {issue.affected_pages != null && <span>{issue.affected_pages} pages</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Activity size={16} color="#4c6ef5" />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0' }}>Health Checks</span>
          </div>
          {healthData?.checks && healthData.checks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {healthData.checks.slice(0, 8).map((check, i) => (
                <HealthCheckItem key={i} check={check} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(76,110,245,0.1)', borderRadius: 8, fontSize: 13, color: '#4c6ef5' }}>
              <Activity size={14} /> Health check data not available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
