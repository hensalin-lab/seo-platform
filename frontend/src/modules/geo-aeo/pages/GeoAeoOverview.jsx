import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Brain, Globe, Bot, Activity, FileCode, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import VisualSchemaBuilder from '../components/VisualSchemaBuilder';
import { EmptyState } from '../../../components/States';

function ScoreCard({ label, score, color, icon: Icon }) {
  const scoreColor = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const hasScore = score !== null && score !== undefined;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text, #111827)', lineHeight: 1.2 }}>{hasScore ? score : '—'}</div>
        </div>
      </div>
      <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--border, #e5e7eb)' }}>
        <div style={{ width: `${hasScore ? Math.min(score, 100) : 0}%`, height: '100%', borderRadius: 3, background: hasScore ? scoreColor : 'transparent', transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6, width: 'fit-content', background: hasScore ? (score >= 80 ? 'rgba(34,197,94,0.12)' : score >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)') : 'rgba(107,114,128,0.12)', color: hasScore ? scoreColor : 'var(--text-muted, #9ca3af)' }}>
        {hasScore ? (score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor') : 'Data unavailable'}
      </span>
    </div>
  );
}

function UnavailableBadge() {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 4, background: 'rgba(107,114,128,0.12)', color: 'var(--text-muted, #9ca3af)' }}>
      Data unavailable
    </span>
  );
}

export default function GeoAeoOverview() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [showSchemaBuilder, setShowSchemaBuilder] = useState(false);
  const [geoData, setGeoData] = useState(null);
  const [aeoData, setAeoData] = useState(null);
  const [eeatData, setEeatData] = useState(null);
  const [schemaData, setSchemaData] = useState(null);
  const [aiVisibilityData, setAiVisibilityData] = useState(null);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      const [geo, aeo, eeat, schema, ai] = await Promise.all([
        api.getGeoAnalysis(id).catch(() => null),
        api.getAeoAnalysis(id).catch(() => null),
        api.getEeatAnalysis(id).catch(() => null),
        api.getSchemaAnalysis(id).catch(() => null),
        api.getAIVisibility(id).catch(() => null),
      ]);
      setGeoData(geo);
      setAeoData(aeo);
      setEeatData(eeat);
      setSchemaData(schema);
      setAiVisibilityData(ai);
      setFailedCount([geo, aeo, eeat, schema, ai].filter(d => !d).length);
      setLoading(false);
    }
    loadAll();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border, #e5e7eb)', borderTopColor: 'var(--accent, #3b82f6)', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>Loading GEO & AEO intelligence...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const allNull = !geoData && !aeoData && !eeatData && !schemaData && !aiVisibilityData;
  if (allNull) {
    return (
      <EmptyState icon={Brain} title="No GEO & AEO data yet" description="Run a full audit to see GEO & AEO intelligence." />
    );
  }

  const geoScore = geoData?.geo_score ?? null;
  const aeoScore = aeoData?.aeo_score ?? null;
  const eeatScore = eeatData?.eeat_score ?? null;
  const schemaCoverage = schemaData?.coverage_pct ?? schemaData?.coverage ?? null;

  const rawPlatforms = aiVisibilityData?.platforms ?? aiVisibilityData?.llm_mentions ?? aiVisibilityData?.ai_platform_visibility ?? [];
  const platformList = !rawPlatforms || (typeof rawPlatforms === 'object' && !Array.isArray(rawPlatforms) && Object.keys(rawPlatforms).length === 0) ? [] : rawPlatforms;
  const scalarVisibilities = [
    { platform: 'ChatGPT', score: aiVisibilityData?.chatgpt_visibility },
    { platform: 'Gemini', score: aiVisibilityData?.gemini_visibility },
    { platform: 'Perplexity', score: aiVisibilityData?.perplexity_visibility },
  ].filter(p => p.score != null);
  const derivedPlatforms = (Array.isArray(platformList) && platformList.length > 0)
    ? platformList
    : (!Array.isArray(platformList) && Object.keys(platformList).length > 0)
      ? Object.entries(platformList).map(([name, data]) => ({ platform: name, ...(typeof data === 'object' ? data : { mentioned: data }) }))
      : scalarVisibilities.map(p => ({
          platform: p.platform,
          mentioned: null,
          readiness_score: p.score,
          note: 'estimated from content signals',
        }));

  const eeatSignals = eeatData?.signals ?? {};
  const signalCategories = [
    { key: 'author', label: 'Author Signals', matcher: (k) => k.toLowerCase().includes('author') },
    { key: 'date', label: 'Date Signals', matcher: (k) => k.toLowerCase().includes('date') },
    { key: 'source', label: 'Source Signals', matcher: (k) => k.toLowerCase().includes('source') },
    { key: 'expertise', label: 'Expertise Signals', matcher: (k) => k.toLowerCase().includes('expert') },
    { key: 'trust', label: 'Trust Signals', matcher: (k) => k.toLowerCase().includes('trust') },
  ];

  const schemaTypes = schemaData?.schema_types ?? {};
  const schemaTypeList = typeof schemaTypes === 'object' && !Array.isArray(schemaTypes) ? Object.keys(schemaTypes) : Array.isArray(schemaTypes) ? schemaTypes : [];

  const allRecommendations = [
    ...(geoData?.issues ?? []).map((i) => ({ source: 'GEO', action: i.fix || i.description, severity: i.severity })),
    ...(aeoData?.issues ?? []).map((i) => ({ source: 'AEO', action: i.fix || i.description, severity: i.severity })),
    ...(eeatData?.issues ?? []).map((i) => ({ source: 'EEAT', action: i.fix || i.description, severity: i.severity })),
    ...(aiVisibilityData?.issues ?? []).map((i) => ({ source: 'AI Visibility', action: i.fix || i.description, severity: i.severity })),
  ].filter(Boolean);

  const deduplicated = [];
  const seen = new Set();
  for (const rec of allRecommendations) {
    const key = (rec.action || '').toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      deduplicated.push(rec);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Brain size={28} color="var(--accent, #3b82f6)" />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #111827)', margin: 0 }}>GEO & AEO Intelligence Hub</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>AI Search Visibility, Direct Answers & Structured Data</p>
      </div>

      {failedCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px' }}>
          <span style={{ color: '#b45309' }}>
            {failedCount === 5
              ? 'All GEO/AEO analyses failed to load — the backend may be waking up (cold start). Try again in a minute.'
              : `${failedCount} of 5 sub-analyses failed to load. Sections below may be incomplete — this is a loading failure, not missing data.`}
          </span>
          <button className="btn btn-sm btn-secondary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <ScoreCard label="GEO Score" score={geoScore} color="#0891b2" icon={Globe} />
        <ScoreCard label="AEO Score" score={aeoScore} color="#7c3aed" icon={Bot} />
        <ScoreCard label="EEAT Score" score={eeatScore} color="#22c55e" icon={Activity} />
        <ScoreCard label="Schema Coverage" score={schemaCoverage} color="#3b82f6" icon={FileCode} />
      </div>

      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Sparkles size={18} color="var(--accent, #3b82f6)" />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>AI Visibility</h2>
          {!aiVisibilityData && <UnavailableBadge />}
        </div>
        {aiVisibilityData ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted, #6b7280)' }}>Platform</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted, #6b7280)' }}>Brand Mentioned</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted, #6b7280)' }}>Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {derivedPlatforms.length > 0 ? derivedPlatforms.map((p, i) => {
                  const name = p.platform || p.name || p;
                  const mentioned = p.mentioned ?? p.is_mentioned ?? null;
                  const sentiment = p.sentiment ?? null;
                  const readiness = p.readiness_score ?? p.score ?? null;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light, #f3f4f6)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text, #111827)' }}>
                        {name}
                        {readiness != null && (
                          <span style={{ display: 'block', fontSize: 10, fontWeight: 500, color: 'var(--text-muted, #9ca3af)' }}>
                            {readiness}/100 readiness (estimated from content signals)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {mentioned !== null ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: mentioned ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                            {mentioned ? 'Yes' : 'No'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted, #9ca3af)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {sentiment ? (
                          <span style={{ fontWeight: 500, color: sentiment === 'positive' ? '#22c55e' : sentiment === 'negative' ? '#ef4444' : '#f59e0b' }}>
                            {sentiment}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted, #9ca3af)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #9ca3af)' }}>
                      No platform data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted, #9ca3af)', fontSize: 13 }}>AI visibility data was not returned from the API.</div>
        )}
      </div>

      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Activity size={18} color="#22c55e" />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>EEAT Signals</h2>
          {!eeatData && <UnavailableBadge />}
        </div>
        {eeatData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {signalCategories.map((cat) => {
              const entries = Object.entries(eeatSignals).filter(([k]) => cat.matcher(k));
              const count = entries.reduce((sum, [, v]) => {
                if (typeof v === 'number') return sum + v;
                return sum + (v.count ?? v.value ?? 0);
              }, 0);
              const maxCount = signalCategories.reduce((max, c) => {
                const e = Object.entries(eeatSignals).filter(([k]) => c.matcher(k));
                const total = e.reduce((s, [, v]) => {
                  if (typeof v === 'number') return s + v;
                  return s + (v.count ?? v.value ?? 0);
                }, 0);
                return Math.max(max, total);
              }, 1);
              const barPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={cat.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{cat.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text, #111827)' }}>{count}</span>
                  </div>
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--border, #e5e7eb)' }}>
                    <div style={{ width: `${barPct}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #22c55e, #16a34a)', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(eeatSignals).length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted, #9ca3af)', fontSize: 13 }}>No EEAT signals detected.</div>
            )}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted, #9ca3af)', fontSize: 13 }}>EEAT data was not returned from the API.</div>
        )}
      </div>

      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <FileCode size={18} color="#3b82f6" />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Schema Types</h2>
          {!schemaData && <UnavailableBadge />}
        </div>
        {schemaData ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {schemaTypeList.length > 0 ? schemaTypeList.map((type, i) => (
              <span key={i} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6' }}>
                {typeof type === 'object' ? (type.name || type.type || JSON.stringify(type)) : type}
              </span>
            )) : (
              <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted, #9ca3af)', fontSize: 13, width: '100%' }}>No schema types detected.</div>
            )}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted, #9ca3af)', fontSize: 13 }}>Schema data was not returned from the API.</div>
        )}
      </div>

      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Brain size={18} color="var(--accent, #3b82f6)" />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Recommendations</h2>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>{deduplicated.length} actions</span>
        </div>
        {deduplicated.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deduplicated.slice(0, 20).map((rec, i) => {
              const sourceColor = rec.source === 'GEO' ? '#0891b2' : rec.source === 'AEO' ? '#7c3aed' : rec.source === 'EEAT' ? '#22c55e' : '#3b82f6';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'var(--bg, #f9fafb)', border: '1px solid var(--border-light, #f3f4f6)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 4, background: `${sourceColor}18`, color: sourceColor, whiteSpace: 'nowrap', marginTop: 1 }}>
                    {rec.source}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.5, flex: 1 }}>{rec.action}</span>
                </div>
              );
            })}
            {deduplicated.length > 20 && (
              <div style={{ textAlign: 'center', padding: 8, fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>
                +{deduplicated.length - 20} more recommendations
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted, #9ca3af)', fontSize: 13 }}>No recommendations available.</div>
        )}
      </div>

      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, overflow: 'hidden' }}>
        <div
          onClick={() => setShowSchemaBuilder(!showSchemaBuilder)}
          style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
        >
          {showSchemaBuilder ? <ChevronDown size={18} color="var(--accent, #3b82f6)" /> : <ChevronRight size={18} color="var(--accent, #3b82f6)" />}
          <FileCode size={18} color="var(--accent, #3b82f6)" />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0, flex: 1 }}>Visual Schema Builder</h2>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
            {showSchemaBuilder ? 'Collapse' : 'Expand'}
          </span>
        </div>
        {showSchemaBuilder && (
          <div style={{ borderTop: '1px solid var(--border, #e5e7eb)' }}>
            <VisualSchemaBuilder />
          </div>
        )}
      </div>
    </div>
  );
}
