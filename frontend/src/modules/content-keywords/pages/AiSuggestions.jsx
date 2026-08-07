import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Sparkles, Zap, FileText, Braces, Link2, Accessibility, Smartphone, Shield,
  Share2, Image as ImageIcon, LayoutGrid, RefreshCw, AlertTriangle, Brain,
  Wand2, CheckCircle2, Wifi,
} from 'lucide-react';
import { api } from '../../../api';
import AiSuggestionCard from '../../../components/ai/AiSuggestionCard';
import AiInsightBars from '../../../components/ai/AiInsightBars';
import { AI_GRADIENT, providerLabel } from '../../../components/ai/theme';

const TOOLS = [
  { key: 'all', label: 'All', icon: LayoutGrid },
  { key: 'seo', label: 'SEO', icon: Sparkles },
  { key: 'speed', label: 'Speed', icon: Zap },
  { key: 'content', label: 'Content', icon: FileText },
  { key: 'schema', label: 'Schema', icon: Braces },
  { key: 'internal-links', label: 'Internal Links', icon: Link2 },
  { key: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { key: 'mobile', label: 'Mobile', icon: Smartphone },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'social', label: 'Social', icon: Share2 },
  { key: 'image', label: 'Images', icon: ImageIcon },
];

export default function AiSuggestions() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tool, setTool] = useState(searchParams.get('tool') || 'all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const load = useCallback(async (isGenerate = false) => {
    try {
      if (isGenerate) setGenerating(true);
      else setLoading(true);
      setError(null);
      setElapsed(0);
      const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
      try {
        const result = await api.getToolSuggestions(id, { tool, limit: 10 });
        setData(result);
      } finally {
        clearInterval(timer);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate suggestions');
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, [id, tool]);

  useEffect(() => { load(); }, [load]);

  const pickTool = (key) => {
    setTool(key);
    setSearchParams(key === 'all' ? {} : { tool: key }, { replace: true });
  };

  const items = data?.items || [];
  const providers = data?.providers_used || [];
  const avgImpact = items.length
    ? Math.round(items.reduce((s, i) => s + (Number(i.ai_impact_pct) || 0), 0) / items.length)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        @keyframes aiPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes shimmer { to { background-position: -200% 0; } }
      `}</style>

      {/* Hero */}
      <div style={{
        borderRadius: 18, padding: '24px 26px', color: '#fff',
        background: 'radial-gradient(120% 160% at 0% 0%, rgba(99,102,241,0.9), rgba(139,92,246,0.82) 45%, rgba(217,70,239,0.75))',
        boxShadow: '0 18px 40px -18px rgba(124,58,237,0.55)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -70, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }}>
                <Wand2 size={21} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.1 }}>AI SEO Suggestion Tool</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 3 }}>Ready-to-apply AI fixes for every detected issue</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[{ icon: CheckCircle2, t: 'Fix + why + effort' }, { icon: Sparkles, t: 'Impact & confidence scored' }, { icon: Wifi, t: 'Local AI · private' }].map((b, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}>
                  <b.icon size={11} /> {b.t}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <button
              onClick={() => load(true)}
              disabled={generating || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10,
                background: '#fff', color: '#7c3aed', border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                fontWeight: 800, fontSize: 13, boxShadow: '0 6px 16px -6px rgba(0,0,0,0.3)', opacity: generating ? 0.7 : 1,
              }}
            >
              {generating ? <RefreshCw size={14} style={{ animation: 'aiPulse 1s linear infinite' }} /> : <Sparkles size={14} />}
              {generating ? 'Generating...' : 'Generate AI fixes'}
            </button>
            {providers.length > 0 && (
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                Generated by {providers.map(providerLabel).join(' · ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tool picker */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {TOOLS.map((t) => {
          const active = tool === t.key;
          return (
            <button
              key={t.key}
              onClick={() => pickTool(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9,
                border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border-light)',
                background: active ? 'rgba(139,92,246,0.08)' : 'var(--bg-white)',
                cursor: 'pointer', fontSize: 12, fontWeight: active ? 750 : 600, color: active ? '#7c3aed' : 'var(--text-secondary)',
                boxShadow: active ? '0 4px 12px -6px rgba(139,92,246,0.4)' : 'none',
              }}
            >
              <t.icon size={13} color={active ? '#7c3aed' : 'var(--text-muted)'} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 240, gap: 12, background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 14 }}>
          <AlertTriangle size={34} color="#ef4444" />
          <div style={{ fontSize: 15, fontWeight: 650 }}>Could not load AI suggestions</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{error}</div>
          <button onClick={() => load(true)} style={{ marginTop: 4, padding: '8px 18px', borderRadius: 9, background: AI_GRADIENT, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12.5 }}>Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 16 }}>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(217,70,239,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'aiPulse 1.6s ease-in-out infinite' }}>
            <Brain size={28} color="#7c3aed" />
          </div>
          <div style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 600 }}>AI is analyzing your site...</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 420 }}>
            Running free local + cloud AI to score and write fixes for up to 10 issues.
            This can take up to ~2 minutes on a cold run — it saves automatically.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#7c3aed', fontWeight: 700 }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#8b5cf6', animation: 'aiPulse 1.1s ease-in-out infinite' }} />
            Working… {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')} elapsed
          </div>
          <div style={{ width: 220, height: 7, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(95, Math.max(8, (elapsed % 45) / 45 * 95))}%`, borderRadius: 4, background: 'linear-gradient(90deg,#6366f1,#d946ef,#6366f1)', backgroundSize: '200% 100%', animation: 'shimmer 1.3s linear infinite', transition: 'width 1s ease' }} />
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, gap: 10, background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 14, textAlign: 'center', padding: '30px 20px' }}>
              <Sparkles size={42} color="var(--text-muted)" opacity={0.5} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>No issues found for this tool</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 380 }}>
                No detected issues match this filter. Run an audit first, then try another tool.
              </p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                {[
                  { label: 'AI fixes ready', value: items.length, color: '#7c3aed', icon: CheckCircle2 },
                  { label: 'Generated now', value: data?.generated ?? 0, color: '#22c55e', icon: Wand2 },
                  { label: 'Avg impact', value: `${avgImpact}%`, color: '#f59e0b', icon: Zap },
                  { label: 'Providers used', value: providers.length || 1, color: '#3b82f6', icon: Brain },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 13, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: s.color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <s.icon size={16} color={s.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{s.value}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cards + ranking */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {items.map((item, i) => <AiSuggestionCard key={item.id || i} item={item} index={i} />)}
                </div>
                <div style={{ position: 'sticky', top: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <AiInsightBars items={items} maxBars={6} />
                  <div style={{ background: AI_GRADIENT, borderRadius: 13, padding: '14px 16px', color: '#fff' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Wand2 size={13} /> Pro tip
                    </div>
                    <div style={{ fontSize: 11.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.92)' }}>
                      Start with P0/P1 items — every fix card includes a why, the exact fix, effort, and one-click apply code.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
