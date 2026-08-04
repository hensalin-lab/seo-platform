import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, CheckCircle, TrendingUp,
  BarChart3, FileText, Layers, ExternalLink, Clock, Target
} from 'lucide-react';
import { api } from '../../../api';
import ScoreRing from '../../../components/ScoreRing';

function HealthBadge({ status }) {
  const map = {
    GOOD: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Good' },
    FAIR: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Fair' },
    POOR: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Poor' },
  };
  const s = map[status] || map.FAIR;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function PortfolioDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getPortfolio().then(res => setData(res)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border, #e5e7eb)', borderTopColor: 'var(--accent, #3b82f6)', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>Loading portfolio...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
      <AlertTriangle size={40} color="#ef4444" />
      <div style={{ fontSize: 16, fontWeight: 600 }}>Failed to Load</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>{error}</div>
    </div>
  );

  if (!data || !Array.isArray(data.audits) || data.audits.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
      <LayoutDashboard size={40} color="var(--text-muted, #9ca3af)" />
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #111827)' }}>No Audits Yet</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>Run your first audit to see the portfolio dashboard.</div>
    </div>
  );

  const {
    total_audits = 0,
    average_score = null,
    total_pages_audited = 0,
    total_issues_found = 0,
    health_distribution = { good: 0, fair: 0, poor: 0 },
    audits = [],
  } = data || {};
  const hd = health_distribution && typeof health_distribution === 'object' ? health_distribution : { good: 0, fair: 0, poor: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #111827)', margin: '0 0 4px' }}>Portfolio Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>Overview of all audits, scores, and health status.</p>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={average_score ?? 0} size={70} stroke={6} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #111827)' }}>{average_score ?? '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>Average Score</div>
          </div>
        </div>
          {[
            { icon: FileText, label: 'Total Audits', value: total_audits, color: '#3b82f6' },
            { icon: Layers, label: 'Pages Audited', value: (total_pages_audited ?? 0).toLocaleString(), color: '#a855f7' },
            { icon: AlertTriangle, label: 'Issues Found', value: (total_issues_found ?? 0).toLocaleString(), color: '#ef4444' },
          ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${stat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <stat.icon size={20} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text, #111827)' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Health Distribution */}
      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '16px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)', marginBottom: 14 }}>Health Distribution</div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Good', count: hd.good ?? 0, color: '#22c55e' },
            { label: 'Fair', count: hd.fair ?? 0, color: '#f59e0b' },
            { label: 'Poor', count: hd.poor ?? 0, color: '#ef4444' },
          ].map(h => (
            <div key={h.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: h.color }}>{h.count}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{h.label}</div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--border, #e5e7eb)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${total_audits > 0 ? (h.count / total_audits) * 100 : 0}%`, height: '100%', background: h.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit List */}
      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>All Audits</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border, #e5e7eb)' }}>
                {['Website', 'Score', 'Pages', 'Issues', 'Health', 'Date', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: i === 0 ? 'left' : 'center', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audits.map((a, i) => (
                <tr key={a.id || a.audit_id || i} style={{ borderBottom: '1px solid var(--border, #e5e7eb)', cursor: 'pointer' }}
                  onClick={() => navigate(`/audit/${a.id || a.audit_id}`)}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent, #3b82f6)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.url || a.website_url}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', marginTop: 2 }}>{(a.id || a.audit_id || '').slice(0, 8)}...</div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <ScoreRing score={a.scores?.overall || 0} size={50} stroke={4} />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)' }}>{a.total_pages}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: a.total_issues > 0 ? '#ef4444' : '#22c55e' }}>{a.total_issues}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}><HealthBadge status={a.health_status} /></td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <ExternalLink size={14} color="var(--text-muted, #9ca3af)" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
