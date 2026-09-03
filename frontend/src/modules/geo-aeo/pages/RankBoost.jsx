import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import {
  Sparkles, Wand2, Check, Copy, Loader2, Target, Zap, RefreshCw,
  FileText, Braces, MessageSquareQuote, ListTree, ArrowRight, ExternalLink, AlertCircle,
  Trophy, TrendingUp, Clock,
} from 'lucide-react';
import ThemeHero from '../../../components/ai/ThemeHero';
import DataSourceBadge from '../../../components/DataSourceBadge';
import ThemeStatCard from '../../../components/ai/ThemeStatCard';
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip';

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
      onClick={(e) => { e.stopPropagation(); copy(); }}>
      {copied ? <Check size={12} style={{ color: 'var(--green)' }} /> : <Copy size={12} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function Block({ title, icon: Icon, children, accent = 'var(--accent)' }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={15} style={{ color: accent }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function BeforeAfter({ ba }) {
  if (!ba) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ba.before && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(250,82,82,0.25)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#e03131', marginBottom: 4, letterSpacing: '0.04em' }}>BEFORE</div>
          <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{ba.before}</div>
          <div style={{ marginTop: 6 }}><CopyBtn text={ba.before} label="Copy" /></div>
        </div>
      )}
      {ba.after && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(18,184,134,0.25)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#099268', marginBottom: 4, letterSpacing: '0.04em' }}>AFTER</div>
          <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{ba.after}</div>
          <div style={{ marginTop: 6 }}><CopyBtn text={ba.after} label="Copy" /></div>
        </div>
      )}
      {ba.reason && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Why: {ba.reason}</div>
      )}
    </div>
  );
}

export default function RankBoost() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [artifacts, setArtifacts] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [win, setWin] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [planning, setPlanning] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.request(`/audit/${id}/rank-boost`)
      .then((res) => { setData(res); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
    api.request(`/audit/${id}/win-proof`)
      .then((res) => { setWin(res); })
      .catch(() => {});
  }, [id]);

  const planIt = useCallback(async () => {
    setPlanning(true);
    try {
      const res = await api.request(`/audit/${id}/win-proof/generate`, { method: 'POST', body: JSON.stringify({}) });
      setAiPlan(res);
    } catch { /* keep existing */ } finally { setPlanning(false); }
  }, [id]);

  const generate = useCallback(async (idx) => {
    setGenerating(true);
    setGenError('');
    try {
      const res = await api.request(`/audit/${id}/rank-boost/generate`, {
        method: 'POST',
        body: JSON.stringify({ page_idx: idx }),
      });
      setArtifacts(res);
    } catch (e) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  }, [id]);

  useEffect(() => {
    if (data?.pages?.length && artifacts?.page && artifacts.page.url) {
      const i = data.pages.findIndex(p => p.url === artifacts.page.url);
      if (i >= 0) setSelectedIdx(i);
    }
  }, [data, artifacts]);

  const page = data?.pages?.[selectedIdx];

  const steps = [
    { label: '1. Fix', desc: 'What/where/how fixes', to: `/audit/${id}/action-hub?tab=action-studio`, icon: Zap },
    { label: '2. Generate', desc: 'AI AEO/GEO content kit', to: `/audit/${id}/rank-boost`, icon: Wand2 },
    { label: '3. Verify', desc: 'Re-run audit, watch score', to: `/audit/${id}/dashboard?tab=executive-dashboard`, icon: RefreshCw },
  ];

  if (loading) {
    return <div style={{ padding: 32 }}><div className="shimmer shimmer-bar" style={{ maxWidth: 600, height: 16, marginBottom: 16 }} /><div className="shimmer shimmer-bar" style={{ maxWidth: 400 }} /></div>;
  }

  if (error) {
    return <div className="page-container" style={{ paddingTop: 80 }}><div className="card"><div style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</div></div></div>;
  }

  const proj = artifacts?.projection;

  return (
    <div className="page-container" style={{ paddingTop: 80, maxWidth: 1100 }}>
      <ThemeHero
        icon={Sparkles}
        title="Rank Boost"
        subtitle={`${data.domain} · current score ${data.current_score} · ${data.aeo_geo_issues} AEO/GEO issues to fix`}
        badges={[
          { icon: Zap, t: 'AEO/GEO fixes' },
          { icon: Wand2, t: 'Content kit' },
          { icon: RefreshCw, t: 'Re-rank & verify' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.ai_available ? '#22c55e' : '#adb5bd' }} />
              {data.ai_available ? 'AI Live' : 'AI warming up'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}>Gemini + Groq</span>
          </div>
        }
      />
      <DataSourceBadge source="ai-generated" size="xs" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <ThemeStatCard icon={Target} label="Current Score" value={data.current_score} color="#3b82f6" />
        <ThemeStatCard icon={AlertCircle} label="AEO/GEO Issues" value={data.aeo_geo_issues} color="#f59f00" />
        <ThemeStatCard icon={FileText} label="Opportunity Pages" value={data.pages?.length ?? 0} color="#12b886" />
        <ThemeStatCard icon={TrendingUp} label="Est. Projected Score" value={win?.projected_score ?? '-'} color="#7c3aed" />
      </div>

      <div style={{ marginBottom: 8 }}>
        <AiSuggestionStrip auditId={id} tool="rank-boost" title="AI rank boost fixes" />
      </div>

      {/* Win Proof panel */}
      {win && (
        <div className="card card-3d animate-in" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--yellow-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={17} style={{ color: '#f59f00' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Path to Rank #1</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Fix {win.issues.total} issues (+{win.points_available} pts available) — modeled estimate {win.current_score} → ~{win.projected_score}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              {win.gsc.available && win.gsc.avg_position != null && (
                <span className="badge" style={{ background: 'var(--blue-bg)', color: 'var(--accent)' }}>Avg position {win.gsc.avg_position}</span>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: win.rank_readiness.color }}>{win.rank_readiness.grade}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>READINESS {win.rank_readiness.score}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{win.projected_score}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>EST. AFTER FIXES</div>
              </div>
            </div>
          </div>

          {win.competitor?.has_competitor && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.04em' }}>YOU vs {win.competitor.url}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(['overall', 'seo', 'technical', 'content', 'ai_visibility']).map((k) => {
                  const mine = win.your_scores[k] || 0;
                  const theirs = win.competitor.scores?.[k] ?? null;
                  const label = k.replace('_', ' ').toUpperCase();
                  return (
                    <div key={k} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                      <div>
                        <div style={{ fontSize: 10, marginBottom: 2 }}>You <b style={{ color: mine >= (theirs ?? 0) ? 'var(--green)' : 'var(--red)' }}>{mine}</b></div>
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, mine))}%`, background: mine >= (theirs ?? 0) ? 'var(--green)' : 'var(--accent)', borderRadius: 4 }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, marginBottom: 2 }}>Comp <b>{theirs ?? '—'}</b></div>
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, theirs ?? 0))}%`, background: '#f59f00', borderRadius: 4 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {win.top_moves?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.04em' }}>TOP MOVES BY POINTS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {win.top_moves.map((m, i) => (
                  <a key={i} href={`/audit/${id}/action-hub?tab=action-studio`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text)' }}>
                      <span className="badge" style={{ background: 'var(--red-bg)', color: '#e03131', fontSize: 9.5 }}>{m.priority}</span>
                      <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.what}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>+{m.est_points_gain} pts</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            {aiPlan?.ai_narrative ? (
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.04em' }}>AI PATH TO #1</div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>{aiPlan.ai_narrative}</div>
                {aiPlan.ai_top_moves?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                    {aiPlan.ai_top_moves.map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                        <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 9.5 }}>{m.impact}</span>
                        <span style={{ color: 'var(--text)' }}><b>{m.move}</b> — {m.why}</span>
                      </div>
                    ))}
                  </div>
                )}
                {aiPlan.ai_timeframe && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>
                    <Clock size={12} /> {aiPlan.ai_timeframe}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                {win.ai_available
                  ? 'Let AI turn this into a concrete "Path to Rank #1" plan — what to fix first and how long it takes.'
                  : 'AI strategy will be available shortly.'}
              </div>
            )}
            <button className="btn btn-primary" onClick={planIt} disabled={planning || !!aiPlan?.ai_narrative}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {planning ? <Loader2 size={14} className="spin" /> : <TrendingUp size={14} />}
              {planning ? 'Planning…' : aiPlan?.ai_narrative ? 'Plan ready' : 'Generate AI Path to #1'}
            </button>
          </div>
        </div>
      )}

      {/* Step bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
        {steps.map((s) => {
          const active = s.label === '2. Generate';
          return (
            <a key={s.label} href={s.to} style={{ textDecoration: 'none' }}>
              <div className={`card card-3d hover-lift ${active ? '' : ''}`} style={{
                marginBottom: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: active ? 'var(--accent)' : 'var(--bg-white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={15} style={{ color: active ? '#fff' : 'var(--text-muted)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: 16, alignItems: 'start' }}>
        {/* Page picker */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Top opportunity pages</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 12 }}>Auto-ranked by issue weight — start with page 1</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.pages.map((p, i) => (
              <button key={p.url} onClick={() => { setSelectedIdx(i); setArtifacts(null); }}
                style={{
                  textAlign: 'left', cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  background: selectedIdx === i ? 'var(--accent-light)' : 'var(--bg-white)',
                  border: selectedIdx === i ? '1px solid var(--accent)' : '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all' }}>{p.title || p.url}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.url}</div>
                <div style={{ display: 'flex', gap: 8, fontSize: 10.5, marginTop: 2 }}>
                  <span className="badge" style={{ background: p.issue_weight >= 20 ? 'var(--red-bg)' : 'var(--yellow-bg)', color: p.issue_weight >= 20 ? '#e03131' : '#e8590c' }}>{p.issue_count} issues</span>
                  <span className="badge badge-gray">{p.word_count.toLocaleString()} words</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Artifact panel */}
        <div>
          {!page && <div className="card"><div style={{ color: 'var(--text-muted)' }}>No pages found.</div></div>}
          {page && (
            <>
              <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={16} style={{ color: 'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{page.title || 'Untitled'}</div>
                    <a href={page.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {page.url} <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
                <button className="btn btn-primary" disabled={generating} onClick={() => generate(selectedIdx)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {generating ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />}
                  {generating ? 'Generating…' : artifacts?.page?.url === page.url ? 'Regenerate Kit' : 'Generate AEO/GEO Kit'}
                </button>
              </div>

              {genError && (
                <div className="card" style={{ border: '1px solid rgba(250,82,82,0.3)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e03131', fontSize: 13 }}>
                    <AlertCircle size={15} /> {genError}
                  </div>
                </div>
              )}

              {artifacts && proj && (
                <div className="card" style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Citation now', value: proj.citation_current, up: proj.citation_projected },
                    { label: 'Citation projected', value: proj.citation_projected, up: null },
                    { label: 'Page score now', value: proj.page_score_current, up: proj.page_score_projected },
                    { label: 'Page score projected', value: proj.page_score_projected, up: null },
                  ].map((s) => (
                    <div key={s.label}>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.value > (s.up ?? 0) ? 'var(--green)' : 'var(--accent)', marginTop: 2 }}>{s.value}</div>
                      {s.up && <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>+{Math.max(0, s.up - s.value)} projected gain</div>}
                    </div>
                  ))}
                </div>
              )}

              {!artifacts && !generating && (
                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Click <strong>Generate AEO/GEO Kit</strong> to produce an answer snippet, FAQ schema (JSON-LD),
                  meta rewrite, question-form H2s and an LLM-ready intro — copy-paste straight into the page.
                  <div style={{ marginTop: 10, fontSize: 12 }}>Works on any page, one click per page.</div>
                </div>
              )}

              {artifacts && !artifacts.generated && (
                <div className="card" style={{ border: '1px solid rgba(245,159,0,0.35)', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e8590c', fontSize: 13 }}>
                    <AlertCircle size={15} /> Live AI providers weren't reachable, so this kit was generated by the built-in engine from your page data. It's ready to use.
                  </div>
                </div>
              )}

              {artifacts && (
                <>
                  {artifacts.answer_snippet && (
                    <Block title="Answer Snippet (AI-citable definition)" icon={MessageSquareQuote}>
                      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{artifacts.answer_snippet}</div>
                      <div style={{ marginTop: 8 }}><CopyBtn text={artifacts.answer_snippet} label="Copy snippet" /></div>
                    </Block>
                  )}

                  {artifacts.faq_pairs?.length > 0 && (
                    <Block title={`FAQ Pairs (${artifacts.faq_pairs.length}) — used by AI answers`} icon={ListTree} accent="#7950f2">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {artifacts.faq_pairs.map((f, i) => (
                          <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{f.question}</div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>{f.answer}</div>
                          </div>
                        ))}
                      </div>
                    </Block>
                  )}

                  {artifacts.faq_schema && (
                    <Block title="FAQ Schema (JSON-LD — paste into <head>)" icon={Braces} accent="#12b886">
                      <pre style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: 'var(--radius-sm)', padding: 14, fontSize: 11.5, overflowX: 'auto', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{artifacts.faq_schema}</pre>
                      <div style={{ marginTop: 8 }}><CopyBtn text={artifacts.faq_schema} label="Copy JSON-LD" /></div>
                    </Block>
                  )}

                  {artifacts.llm_intro && <Block title="LLM-Ready Intro (entity-dense opening)" icon={FileText}><BeforeAfter ba={artifacts.llm_intro} /></Block>}

                  {artifacts.title_rewrite && <Block title="Title Rewrite" icon={Target}><BeforeAfter ba={artifacts.title_rewrite} /></Block>}
                  {artifacts.meta_rewrite && <Block title="Meta Description Rewrite" icon={Target}><BeforeAfter ba={artifacts.meta_rewrite} /></Block>}

                  {artifacts.h2_rewrites?.length > 0 && (
                    <Block title="H2 Rewrites (question-form for AI search)" icon={ListTree}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {artifacts.h2_rewrites.map((h, i) => (
                          <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                            {h.before && <div style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through', opacity: 0.7 }}>{h.before}</div>}
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{h.after}</div>
                            {h.reason && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{h.reason}</div>}
                            <div style={{ marginTop: 6 }}><CopyBtn text={h.after} label="Copy H2" /></div>
                          </div>
                        ))}
                      </div>
                    </Block>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 }}>
                    <a href={`/audit/${id}/dashboard?tab=executive-dashboard`} className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Done — Re-run the audit <ArrowRight size={14} />
                    </a>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>then watch your score climb</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
