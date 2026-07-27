import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Gauge, Zap, AlertTriangle, Shield, Clock, Smartphone, Monitor } from 'lucide-react';

function ScoreRing({ score, size = 80, label }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const offset = c - (pct / 100) * c;
  const color = pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.25, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(pct)}</span>
        {label && <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  );
}

function CWVMetric({ name, value, unit, status, target, explanation }) {
  const statusColor = status === 'good' ? '#059669' : status === 'needs_improvement' ? '#d97706' : '#dc2626';
  const statusLabel = status === 'good' ? 'Good' : status === 'needs_improvement' ? 'Needs Work' : 'Poor';
  return (
    <div style={{ padding: '12px 14px', borderRadius: 8, border: `1px solid ${statusColor}30`, background: `${statusColor}08` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{name}</span>
        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: statusColor, color: '#fff' }}>{statusLabel}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: statusColor, marginBottom: 2 }}>{value !== null && value !== undefined ? `${value}${unit}` : '—'}</div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>Target: {target}</div>
      {explanation && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{explanation}</div>}
    </div>
  );
}

function Card({ title, icon: Icon, children, color = '#3b82f6' }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

export default function SpeedIntelligence() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditPages(id, { limit: 100 }).then(d => { setPages(d.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    api.getSpeedIntelligence(id, selectedIdx).then(d => setData(d)).catch(() => {});
  }, [id, selectedIdx, pages]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No data available</div>;

  const cwv = data.core_web_vitals || {};
  const resources = data.resource_analysis || {};
  const issues = data.issues_detected || [];
  const plan = data.optimization_plan || [];
  const mobile = data.mobile_estimate || {};
  const desktop = data.desktop_estimate || {};
  const predictions = data.score_predictions || {};
  const thirdParty = data.third_party_impact || [];
  const pageComparison = data.page_comparison || [];

  return (
    <div style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
          {pages.map((p, i) => <option key={i} value={i}>{p.url?.substring(0, 70)}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Performance Score" icon={Gauge} color="#3b82f6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ScoreRing score={data.performance_score} size={90} />
            <div style={{ fontSize: 12, color: '#64748b' }}>
              <div>After critical fixes: {Math.round(predictions.after_critical || 0)}</div>
              <div>After all fixes: {Math.round(predictions.after_all || 0)}</div>
            </div>
          </div>
        </Card>

        <Card title="Mobile vs Desktop" icon={Smartphone} color="#8b5cf6">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>📱 Mobile</div>
              <div style={{ color: '#64748b' }}>LCP: {mobile.lcp ? `${mobile.lcp}s` : '—'}</div>
              <div style={{ color: '#64748b' }}>CLS: {mobile.cls || '—'}</div>
              <div style={{ color: '#64748b' }}>INP: {mobile.inp ? `${mobile.inp}ms` : '—'}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>🖥 Desktop</div>
              <div style={{ color: '#64748b' }}>LCP: {desktop.lcp ? `${desktop.lcp}s` : '—'}</div>
              <div style={{ color: '#64748b' }}>CLS: {desktop.cls || '—'}</div>
              <div style={{ color: '#64748b' }}>INP: {desktop.inp ? `${desktop.inp}ms` : '—'}</div>
            </div>
          </div>
        </Card>

        <Card title="Resources" icon={Zap} color="#d97706">
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <div>Page weight: {resources.estimated_page_weight || '—'}</div>
            <div>Images: {resources.images?.count || 0} ({resources.images?.estimated_size || '—'})</div>
            <div>Scripts: {resources.scripts?.count || 0} ({resources.scripts?.estimated_size || '—'})</div>
            <div>Styles: {resources.styles?.estimated_size || '—'}</div>
          </div>
        </Card>
      </div>

      <Card title="Core Web Vitals" icon={Gauge} color="#3b82f6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {cwv.lcp && <CWVMetric name="LCP" value={cwv.lcp.value} unit={cwv.lcp.unit} status={cwv.lcp.status} target={cwv.lcp.target} explanation={cwv.lcp.explanation} />}
          {cwv.cls && <CWVMetric name="CLS" value={cwv.cls.value} unit={cwv.cls.unit} status={cwv.cls.status} target={cwv.cls.target} explanation={cwv.cls.explanation} />}
          {cwv.inp && <CWVMetric name="INP" value={cwv.inp.value} unit={cwv.inp.unit} status={cwv.inp.status} target={cwv.inp.target} explanation={cwv.inp.explanation} />}
          {cwv.fcp && <CWVMetric name="FCP" value={cwv.fcp.value} unit={cwv.fcp.unit} status={cwv.fcp.status} target={cwv.fcp.target} explanation={cwv.fcp.explanation} />}
          {cwv.ttfb && <CWVMetric name="TTFB" value={cwv.ttfb.value} unit={cwv.ttfb.unit} status={cwv.ttfb.status} target={cwv.ttfb.target} explanation={cwv.ttfb.explanation} />}
        </div>
      </Card>

      {issues.length > 0 && (
        <Card title="Issues Detected" icon={AlertTriangle} color="#dc2626">
          {issues.map((issue, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < issues.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: issue.severity === 'HIGH' ? '#fef2f2' : '#fffbeb', color: issue.severity === 'HIGH' ? '#dc2626' : '#d97706' }}>{issue.severity}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{issue.message}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{issue.explanation}</div>
              <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>Fix: {issue.fix} | Impact: {issue.estimated_improvement}</div>
            </div>
          ))}
        </Card>
      )}

      {plan.length > 0 && (
        <Card title="Optimization Plan" icon={Shield} color="#059669">
          {plan.map((item, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < plan.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: item.priority === 'P0' || item.priority === 'P1' ? '#fef2f2' : '#eff6ff', color: item.priority === 'P0' || item.priority === 'P1' ? '#dc2626' : '#2563eb', whiteSpace: 'nowrap' }}>{item.priority}</span>
              <div style={{ flex: 1, fontSize: 13 }}>{item.recommendation}</div>
              <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{item.time}</div>
              <div style={{ fontSize: 11, color: '#059669', whiteSpace: 'nowrap' }}>{item.estimated_improvement}</div>
              {item.confidence && <div style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{Math.round(item.confidence)}%</div>}
            </div>
          ))}
        </Card>
      )}

      {thirdParty.length > 0 && (
        <Card title="Third-Party Impact" icon={Clock} color="#8b5cf6">
          {thirdParty.map((tp, i) => (
            <div key={i} style={{ padding: '6px 0', borderBottom: i < thirdParty.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 }}>
              <span style={{ fontWeight: 600, minWidth: 140 }}>{tp.script}</span>
              <span style={{ color: '#64748b' }}>Impact: {tp.estimated_impact}</span>
              <span style={{ color: '#059669' }}>{tp.recommendation}</span>
            </div>
          ))}
        </Card>
      )}

      {pageComparison.length > 1 && (
        <Card title="Page Comparison" icon={Zap} color="#3b82f6">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700 }}>Page</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Score</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>LCP</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Response</th>
                </tr>
              </thead>
              <tbody>
                {pageComparison.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: (p.score || 0) >= 70 ? '#059669' : (p.score || 0) >= 50 ? '#d97706' : '#dc2626' }}>{Math.round(p.score || 0)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{p.lcp ? `${p.lcp}s` : '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{p.response_time ? `${p.response_time}ms` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
