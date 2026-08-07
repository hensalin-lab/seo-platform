import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Bot, Zap, AlertTriangle, CheckCircle, Info, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { api } from '../../../api';
import DataSourceBadge from '../../../components/DataSourceBadge';
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip';
import ThemeHero from '../../../components/ai/ThemeHero';
import ThemeStatCard from '../../../components/ai/ThemeStatCard';

export default function AiOverviews() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = (silent) => {
    if (silent) setRefreshing(true); else setLoading(true);
    api.request(`/audit/${id}/ai-overviews`)
      .then(d => { setData(d); })
      .catch(() => setData({ configured: false, message: 'Failed to reach the live AI Overviews check. Backend may be offline.' }))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(false); }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border, #e5e7eb)', borderTopColor: 'var(--accent, #3b82f6)', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>Probing Google AI Overviews for your top keywords...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const summary = data?.summary || {};
  const results = data?.results || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ThemeHero
        icon={Bot}
        title="AI Overviews Monitor"
        subtitle={
          <>
            Real-time check of whether <strong style={{ color: '#fff' }}>{data?.domain || 'your site'}</strong> appears in Google AI Overviews for your top keywords.
          </>
        }
        badges={[
          { icon: Sparkles, t: 'Live check' },
          { icon: CheckCircle, t: 'Citations' },
          { icon: Zap, t: 'Real-time' },
        ]}
        actions={data?.configured ? <DataSourceBadge source={data?.estimated ? 'estimated' : 'measured'} size="xs" /> : null}
      />

      <div>
        <AiSuggestionStrip auditId={id} tool="ai-overviews" title="AI Overview fixes" />
      </div>

      {data?.message && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius, 12px)', background: data?.estimated ? 'rgba(8,145,178,0.06)' : 'rgba(245,158,11,0.08)', border: `1px solid ${data?.estimated ? 'rgba(8,145,178,0.18)' : 'rgba(245,158,11,0.25)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: data?.estimated ? '#0e7490' : '#b45309', lineHeight: 1.6 }}>
            {data?.estimated ? <Sparkles size={14} /> : <AlertTriangle size={14} />} {data.message}
          </div>
        </div>
      )}
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <ThemeStatCard icon={Bot} label="Keywords Checked" value={summary.keywords_checked ?? 0} color="#3b82f6" sub="Top keywords by frequency" />
            <ThemeStatCard icon={Sparkles} label="AI Overview Triggered" value={summary.with_ai_overview ?? 0} color="#f59e0b" sub="SERP showed an AI Overview" />
            <ThemeStatCard icon={CheckCircle} label="Your Site Cited" value={summary.mentioned_in_ai_overview ?? 0} color="#22c55e" sub="Mentioned inside the answer" />
            <ThemeStatCard icon={Zap} label="Citation Rate" value={`${summary.keywords_checked ? Math.round(((summary.mentioned_in_ai_overview ?? 0) / summary.keywords_checked) * 100) : 0}%`} color="#0891b2" sub="Share of keywords that cite you" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => load(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border, #e5e7eb)', background: 'var(--bg-white, #fff)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #4b5563)', cursor: 'pointer' }} disabled={refreshing}>
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} /> {refreshing ? 'Checking...' : 'Re-check live'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted, #6b7280)', fontSize: 13, background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)' }}>
                <Sparkles size={28} color="var(--text-muted, #9ca3af)" style={{ marginBottom: 8 }} />
                <div>No keyword results yet. Run a full audit to generate keyword data, then re-check.</div>
              </div>
            )}
            {results.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderRadius: 'var(--radius-sm, 8px)', background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)' }}>
                <span style={{ marginTop: 2 }}>
                  {r.mentioned_in_ai_overview ? (
                    <CheckCircle size={17} color="var(--green, #22c55e)" />
                  ) : r.has_ai_overview ? (
                    <AlertTriangle size={17} color="var(--yellow, #f59e0b)" />
                  ) : (
                    <Info size={17} color="var(--text-muted, #9ca3af)" />
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text, #111827)' }}>{r.keyword}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 4, background: r.mentioned_in_ai_overview ? 'rgba(34,197,94,0.12)' : r.has_ai_overview ? 'rgba(245,158,11,0.12)' : 'rgba(107,114,128,0.12)', color: r.mentioned_in_ai_overview ? '#22c55e' : r.has_ai_overview ? '#f59e0b' : '#6b7280' }}>
                      {r.mentioned_in_ai_overview ? 'Cited in AI Overview' : r.has_ai_overview ? 'AI Overview shown — not you' : 'No AI Overview'}
                    </span>
                  </div>
                  {r.ai_overview_text && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 6, lineHeight: 1.55, fontStyle: 'italic' }}>"{r.ai_overview_text}"</div>
                  )}
                  {r.top_cited_domains?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      <ExternalLink size={11} color="var(--text-muted, #9ca3af)" />
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted, #6b7280)' }}>Top cited domains:</span>
                      {r.top_cited_domains.map((d, di) => (
                        <span key={di} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.08)', color: 'var(--accent, #3b82f6)' }}>{d}</span>
                      ))}
                    </div>
                  )}
                  {r.error && <div style={{ fontSize: 11.5, color: '#ef4444', marginTop: 4 }}>{r.error}</div>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px 18px', borderRadius: 'var(--radius, 12px)', background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#0e7490', marginBottom: 6 }}>
              <Zap size={14} /> How to win AI Overviews
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.7 }}>
              <strong>1.</strong> Answer the question directly in your first 100 words. <strong>2.</strong> Use conversational long-tail phrasing (AI answers match question style). <strong>3.</strong> Cite stats, dates, and entities so AI trusts your passage. <strong>4.</strong> Win the featured snippet — the same text is most likely to be quoted in the Overview.
            </div>
          </div>
        </>
    </div>
  );
}
