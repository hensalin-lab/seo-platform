import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Globe, MessageSquare, Search, Eye, Brain, AlertCircle, Zap, Target } from 'lucide-react';

const PLATFORMS = [
  { key: 'google_ai_overview', label: 'Google AI Overview', color: '#4285f4', icon: Globe },
  { key: 'chatgpt', label: 'ChatGPT', color: '#10a37f', icon: MessageSquare },
  { key: 'gemini', label: 'Gemini', color: '#4285f4', icon: Globe },
  { key: 'claude', label: 'Claude', color: '#d97706', icon: Brain },
  { key: 'perplexity', label: 'Perplexity', color: '#20b2aa', icon: Search },
  { key: 'copilot', label: 'Copilot', color: '#7c3aed', icon: Eye },
];

function ScoreCircle({ score, size = 80, color }) {
  const c = color || (score >= 70 ? '#38a169' : score >= 50 ? '#d69e2e' : '#e53e3e');
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: size * 0.25, fontWeight: 700, fill: c, transform: 'rotate(90deg)', transformOrigin: 'center' }}>
        {Math.round(score)}
      </text>
    </svg>
  );
}

function BoolBadge({ value, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
      <span style={{ width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: value ? '#c6f6d5' : '#fed7d7', color: value ? '#22543d' : '#9b2c2c', fontSize: 10, fontWeight: 700 }}>
        {value ? '✓' : '✗'}
      </span>
      <span style={{ fontSize: 12, color: '#4a5568' }}>{label}</span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff', marginBottom: 12 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f7fafc' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1f36' }}>{title}</span>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

export default function AiVisibilityDeep() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    api.getAuditPages(id, { limit: 100 }).then(d => { setPages(d.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    setPageLoading(true);
    api.getAiSearchDeep(id, selectedIdx).then(d => { setData(d); setPageLoading(false); }).catch(() => setPageLoading(false));
  }, [id, selectedIdx, pages]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>;
  if (!pages.length) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No pages found</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>AI Search Deep Analysis</h2>
        <p style={{ fontSize: 13, color: '#718096' }}>6 platform scores + GEO/AEO/KG signals</p>
      </div>

      <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: '#fff', marginBottom: 16 }}>
        {pages.map((p, i) => <option key={i} value={i}>{p.title || p.url}</option>)}
      </select>

      {pageLoading ? <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Analyzing...</div> : data && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, padding: 20, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
            <ScoreCircle score={data.overall_ai_score || 0} size={100} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Overall AI Score</div>
              <div style={{ fontSize: 13, color: '#718096' }}>Combined score across all 6 AI platforms</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {PLATFORMS.map(p => {
              const score = data.platform_scores?.[p.key] || 0;
              const details = data.platform_details?.[p.key] || {};
              const Icon = p.icon;
              return (
                <div key={p.key} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Icon size={18} style={{ color: p.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 700, color: score >= 70 ? '#38a169' : score >= 50 ? '#d69e2e' : '#e53e3e' }}>
                      {Math.round(score)}
                    </span>
                  </div>
                  {details.strengths?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: '#38a169', fontWeight: 600, marginBottom: 2 }}>Strengths</div>
                      {details.strengths.slice(0, 3).map((s, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#4a5568', padding: '1px 0' }}>✓ {s}</div>
                      ))}
                    </div>
                  )}
                  {details.weaknesses?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: '#e53e3e', fontWeight: 600, marginBottom: 2 }}>Weaknesses</div>
                      {details.weaknesses.slice(0, 3).map((w, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#4a5568', padding: '1px 0' }}>✗ {w}</div>
                      ))}
                    </div>
                  )}
                  {details.optimization_tips?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, color: '#3182ce', fontWeight: 600, marginBottom: 2 }}>Tips</div>
                      {details.optimization_tips.slice(0, 2).map((t, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#3182ce', padding: '1px 0' }}>→ {t}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <SectionCard title="Entity Coverage">
              <BoolBadge value={data.entity_coverage?.organization_entity} label="Organization Entity" />
              <BoolBadge value={data.entity_coverage?.product_entity} label="Product Entity" />
              <BoolBadge value={data.entity_coverage?.software_entity} label="Software Entity" />
              <BoolBadge value={data.entity_coverage?.person_entity} label="Person Entity" />
              <BoolBadge value={data.entity_coverage?.brand_entity} label="Brand Entity" />
              <div style={{ marginTop: 8, fontSize: 12, color: '#4a5568' }}>
                Entities: {data.entity_coverage?.entity_count || 0} | Density: {(data.entity_coverage?.entity_density || 0).toFixed(1)}%
              </div>
              <BoolBadge value={data.entity_coverage?.knowledge_graph_ready} label="Knowledge Graph Ready" />
            </SectionCard>

            <SectionCard title="Citation Readiness">
              <div style={{ fontSize: 24, fontWeight: 700, color: (data.citation_readiness?.score || 0) >= 70 ? '#38a169' : '#d69e2e', marginBottom: 8 }}>
                {Math.round(data.citation_readiness?.score || 0)}
              </div>
              <BoolBadge value={data.citation_readiness?.has_original_research} label="Original Research" />
              <BoolBadge value={data.citation_readiness?.has_expert_quotes} label="Expert Quotes" />
              <BoolBadge value={data.citation_readiness?.has_statistics} label="Statistics" />
              <BoolBadge value={data.citation_readiness?.has_primary_sources} label="Primary Sources" />
              <BoolBadge value={data.citation_readiness?.has_secondary_sources} label="Secondary Sources" />
              <div style={{ marginTop: 8, fontSize: 12, color: '#4a5568' }}>
                Sources: {data.citation_readiness?.source_count || 0} | Evidence: {data.citation_readiness?.evidence_strength || 'NONE'}
              </div>
            </SectionCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <SectionCard title="AEO (Answer Engine Optimization)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>Featured Snippet Prob.</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: data.aeo?.featured_snippet_probability === 'HIGH' ? '#38a169' : '#d69e2e' }}>
                    {data.aeo?.featured_snippet_probability || 'LOW'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>FAQ Quality</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(data.aeo?.faq_quality || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>Voice Search Ready</div>
                  <BoolBadge value={data.aeo?.voice_search_ready} label="" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>Questions Covered</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{data.aeo?.question_coverage || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>Definition Quality</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{data.aeo?.definition_quality || 'None'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>HowTo Quality</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{data.aeo?.howto_quality || 'None'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>Table Opportunities</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{data.aeo?.table_opportunities || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>List Opportunities</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{data.aeo?.list_opportunities || 0}</div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="GEO (Generative Engine Optimization)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>Knowledge Graph Score</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(data.geo?.knowledge_graph_score || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>Entity Graph Ready</div>
                  <BoolBadge value={data.geo?.entity_graph_ready} label="" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>Citation Graph</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(data.geo?.citation_graph_score || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#718096' }}>Authority Graph</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(data.geo?.authority_graph_score || 0)}</div>
                </div>
              </div>
              {data.geo?.entity_relationships?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: '#718096', marginBottom: 4 }}>Entity Relationships</div>
                  {data.geo.entity_relationships.map((r, i) => (
                    <div key={i} style={{ fontSize: 11, padding: '2px 0' }}>
                      <span style={{ fontWeight: 500 }}>{r.entity1}</span> — {r.relationship} — <span style={{ fontWeight: 500 }}>{r.entity2}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {data.why_not_ranking?.length > 0 && (
            <SectionCard title="Why This Page Won't Rank">
              {data.why_not_ranking.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, padding: '4px 0', fontSize: 12 }}>
                  <AlertCircle size={14} style={{ color: '#e53e3e', flexShrink: 0, marginTop: 2 }} />
                  <span>{r}</span>
                </div>
              ))}
            </SectionCard>
          )}

          {data.why_not_cited?.length > 0 && (
            <SectionCard title="Why AI Won't Cite This Page">
              {data.why_not_cited.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, padding: '4px 0', fontSize: 12 }}>
                  <AlertCircle size={14} style={{ color: '#d69e2e', flexShrink: 0, marginTop: 2 }} />
                  <span>{r}</span>
                </div>
              ))}
            </SectionCard>
          )}

          {data.optimization_actions?.length > 0 && (
            <SectionCard title="Optimization Actions">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#718096' }}>Platform</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#718096' }}>Action</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#718096' }}>Impact</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#718096' }}>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {data.optimization_actions.map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>{a.platform}</td>
                      <td style={{ padding: '6px 8px' }}>{a.action}</td>
                      <td style={{ padding: '6px 8px', color: '#3182ce' }}>{a.impact}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                          background: a.priority === 'CRITICAL' ? '#e53e3e18' : a.priority === 'HIGH' ? '#dd6b2018' : '#d69e2e18',
                          color: a.priority === 'CRITICAL' ? '#e53e3e' : a.priority === 'HIGH' ? '#dd6b20' : '#d69e2e' }}>
                          {a.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
