import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Award, ExternalLink, Link2, User, Globe, AlertTriangle, Shield, TrendingUp } from 'lucide-react';

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

const PLATFORMS = [
  { key: 'wikipedia', label: 'Wikipedia' }, { key: 'github', label: 'GitHub' },
  { key: 'reddit', label: 'Reddit' }, { key: 'linkedin', label: 'LinkedIn' },
  { key: 'medium', label: 'Medium' }, { key: 'youtube', label: 'YouTube' },
  { key: 'stackoverflow', label: 'Stack Overflow' }, { key: 'producthunt', label: 'Product Hunt' },
  { key: 'crunchbase', label: 'Crunchbase' }, { key: 'g2', label: 'G2' },
  { key: 'capterra', label: 'Capterra' }, { key: 'hackernews', label: 'Hacker News' },
];

export default function OffsiteAuthority() {
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
    api.getOffsiteAuthority(id, selectedIdx).then(d => setData(d)).catch(() => setData(null));
  }, [id, selectedIdx, pages]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No data available</div>;

  const presence = data.platform_presence || {};
  const brandSignals = data.brand_signals || {};
  const extLinks = data.external_link_quality || {};
  const authSignals = data.content_authority_signals || {};
  const opportunities = data.backlink_opportunities || [];
  const gap = data.competitor_gap || {};

  return (
    <div style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
          {pages.map((p, i) => <option key={i} value={i}>{p.url?.substring(0, 70)}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Authority Score" icon={Award} color="#8b5cf6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ScoreRing score={data.authority_score} size={90} />
            <div style={{ fontSize: 12, color: '#64748b' }}>
              <div>External links: {extLinks.total_external || 0}</div>
              <div>Authority links: {extLinks.authority_links || 0}</div>
              <div>Unique domains: {extLinks.domains_linked?.length || 0}</div>
            </div>
          </div>
        </Card>

        <Card title="Brand Signals" icon={User} color="#059669">
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              {brandSignals.brand_name_detected ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#dc2626' }}>❌</span>}
              Brand name detected
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              {brandSignals.author_present ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#dc2626' }}>❌</span>}
              Author attribution
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              {brandSignals.contact_info_present ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#dc2626' }}>❌</span>}
              Contact information
            </div>
            <div>Brand mentions: {brandSignals.brand_mentions_count || 0}</div>
            <div>Social profiles: {brandSignals.social_profiles?.length || 0}</div>
          </div>
        </Card>

        <Card title="Content Authority" icon={Shield} color="#d97706">
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              {authSignals.has_statistics ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#dc2626' }}>❌</span>}
              Statistics
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              {authSignals.has_citations ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#dc2626' }}>❌</span>}
              Citations
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              {authSignals.has_expert_quotes ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#dc2626' }}>❌</span>}
              Expert quotes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              {authSignals.has_case_studies ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#dc2626' }}>❌</span>}
              Case studies
            </div>
            <div>Score: {Math.round(authSignals.authority_content_score || 0)}/100</div>
          </div>
        </Card>
      </div>

      <Card title="Platform Presence" icon={Globe} color="#3b82f6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {PLATFORMS.map(({ key, label }) => {
            const p = presence[key] || {};
            const found = p.mentioned || p.linked;
            return (
              <div key={key} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${found ? '#d1fae5' : '#f1f5f9'}`, background: found ? '#f0fdf4' : '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                {found ? <span style={{ color: '#059669' }}>✅</span> : <span style={{ color: '#d1d5db' }}>○</span>}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{p.linked ? 'Linked' : p.mentioned ? 'Mentioned' : 'Not found'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {opportunities.length > 0 && (
        <Card title="Backlink Opportunities" icon={ExternalLink} color="#2563eb">
          <div style={{ display: 'grid', gap: 8 }}>
            {opportunities.map((opp, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 6, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: opp.priority === 'HIGH' ? '#fef2f2' : '#eff6ff', color: opp.priority === 'HIGH' ? '#dc2626' : '#2563eb' }}>{opp.priority}</span>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{opp.platform}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{opp.difficulty}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{opp.notes}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.issues?.length > 0 && (
        <Card title="Issues" icon={AlertTriangle} color="#dc2626">
          {data.issues.map((issue, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < data.issues.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{issue.message || issue}</div>
              {issue.fix && <div style={{ fontSize: 12, color: '#64748b' }}>{issue.fix}</div>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
