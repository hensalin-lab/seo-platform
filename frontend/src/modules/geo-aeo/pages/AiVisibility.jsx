import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Bot, Sparkles, AlertTriangle, CheckCircle, ExternalLink, ChevronDown, ChevronUp, Zap, Target, Info, Shield, Brain, FileText, Link2, Quote } from 'lucide-react';
import { api } from '../../../api';
import DataSourceBadge from '../../../components/DataSourceBadge';

const SEVERITY_STYLES = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  HIGH: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  MEDIUM: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  LOW: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
};

function ScoreRing({ score, size = 160 }) {
  const color = score >= 70 ? 'var(--green, #22c55e)' : score >= 40 ? 'var(--yellow, #f59e0b)' : 'var(--red, #ef4444)';
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border, #e5e7eb)" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(score)}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>/100</span>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const s = (severity || 'MEDIUM').toUpperCase();
  const style = SEVERITY_STYLES[s] || SEVERITY_STYLES.MEDIUM;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '3px 10px', borderRadius: 'var(--radius-sm, 6px)', background: style.bg, color: style.color }}>{s}</span>
  );
}

function IssueCard({ issue, index }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{
      background: 'var(--bg-white, #fff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 'var(--radius, 12px)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))',
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border-light, #f3f4f6)' : 'none' }}>
        <SeverityBadge severity={issue.severity} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)', flex: 1 }}>{issue.signal_name || 'AI Visibility Issue'}</span>
        {issue.page_url && (
          <span style={{ fontSize: 12, color: 'var(--accent, #3b82f6)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.page_url}</span>
        )}
        {expanded ? <ChevronUp size={16} color="var(--text-muted, #9ca3af)" /> : <ChevronDown size={16} color="var(--text-muted, #9ca3af)" />}
      </div>
      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {issue.page_url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg, #f9fafb)', borderRadius: 'var(--radius-sm, 6px)' }}>
              <ExternalLink size={14} color="var(--accent, #3b82f6)" />
              <a href={issue.page_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--accent, #3b82f6)', textDecoration: 'none', wordBreak: 'break-all' }}>{issue.page_url}</a>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>What is Wrong</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.6 }}>{issue.description || 'No description provided.'}</div>
          </div>
          {issue.impact && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Why It Matters</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.6 }}>{issue.impact}</div>
            </div>
          )}
          {issue.fix && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Exact Fix</div>
              <div style={{ fontSize: 13, color: 'var(--green, #22c55e)', lineHeight: 1.6, fontWeight: 500, padding: '10px 14px', background: 'rgba(34,197,94,0.06)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid rgba(34,197,94,0.15)' }}>
                {issue.fix}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlatformBar({ name, score, color, description }) {
  let status = 'Needs Work';
  let statusColor = 'var(--red, #ef4444)';
  if (score >= 70) { status = 'Strong'; statusColor = 'var(--green, #22c55e)'; }
  else if (score >= 40) { status = 'Moderate'; statusColor = 'var(--yellow, #f59e0b)'; }

  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)' }}>{name}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>{status}</span>
      </div>
      <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--border, #e5e7eb)', marginBottom: 8 }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{description}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color }}>{Math.round(score)}%</span>
      </div>
    </div>
  );
}

function SignalCard({ name, signal }) {
  const score = (signal.score ?? 0) * 100;
  const color = score >= 70 ? 'var(--green, #22c55e)' : score >= 40 ? 'var(--yellow, #f59e0b)' : 'var(--red, #ef4444)';
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{signal.name || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color }}>{Math.round(score)}%</span>
      </div>
      <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--border, #e5e7eb)', marginBottom: 8 }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 0.5s ease' }} />
      </div>
      {signal.description && <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', lineHeight: 1.5 }}>{signal.description}</div>}
      {signal.weight !== undefined && (
        <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', marginTop: 6 }}>Weight: {(signal.weight * 100).toFixed(0)}% of total score</div>
      )}
    </div>
  );
}

export default function AiVisibility() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [aoData, setAoData] = useState(null);

  useEffect(() => {
    api.getAIVisibility(id).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
    api.request(`/audit/${id}/ai-overviews`).then(setAoData).catch(() => setAoData(null));
  }, [id]);

  const issues = data?.issues || [];
  const signals = data?.signals || {};

  const filteredIssues = severityFilter === 'ALL' ? issues : issues.filter(i => (i.severity || '').toUpperCase() === severityFilter);

  const issuesByPage = useMemo(() => {
    const map = {};
    issues.forEach(issue => {
      const page = issue.page_url || 'Site-wide Issue';
      if (!map[page]) map[page] = [];
      map[page].push(issue);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [issues]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border, #e5e7eb)', borderTopColor: 'var(--accent, #3b82f6)', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>Analyzing AI visibility...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={24} color="#ef4444" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #111827)' }}>Failed to Load</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <Bot size={32} color="var(--text-muted, #9ca3af)" />
        <div style={{ fontSize: 15, color: 'var(--text-secondary, #6b7280)' }}>No AI visibility data available</div>
      </div>
    );
  }

  const score = data.ai_visibility_score ?? 0;
  const chatgptScore = data.chatgpt_visibility ?? data.chatgpt_readiness ?? 0;
  const geminiScore = data.gemini_visibility ?? data.gemini_readiness ?? 0;
  const perplexityScore = data.perplexity_visibility ?? data.perplexity_readiness ?? 0;
  const pagesAnalyzed = data.pages_analyzed ?? 0;
  const pagesWithSchema = data.pages_with_schema ?? 0;
  const pagesWithCitations = data.pages_with_citations ?? 0;
  const pagesWithFresh = data.pages_with_fresh_content ?? 0;

  const criticalCount = issues.filter(i => (i.severity || '').toUpperCase() === 'CRITICAL').length;
  const highCount = issues.filter(i => (i.severity || '').toUpperCase() === 'HIGH').length;
  const mediumCount = issues.filter(i => (i.severity || '').toUpperCase() === 'MEDIUM').length;
  const lowCount = issues.filter(i => (i.severity || '').toUpperCase() === 'LOW').length;

  const missingSignals = Object.entries(signals).filter(([, s]) => (s.score ?? 0) < 0.5).map(([key, s]) => ({ key, ...s }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #111827)', margin: '0 0 4px' }}>AI Visibility</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>How visible your content is to ChatGPT, Gemini, and Perplexity — with exact fixes for every page.</p>
      </div>

      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '32px 40px', display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ScoreRing score={score} size={160} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Visibility Score</span>
          <DataSourceBadge source="simulated" size="xs" />
        </div>
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Issues', value: issues.length, color: issues.length > 0 ? 'var(--red, #ef4444)' : 'var(--green, #22c55e)' },
              { label: 'Critical', value: criticalCount, color: 'var(--red, #ef4444)' },
              { label: 'High', value: highCount, color: 'var(--yellow, #f59e0b)' },
              { label: 'Pages Analyzed', value: pagesAnalyzed, color: 'var(--accent, #6366f1)' },
              { label: 'Schema Coverage', value: pagesWithSchema, color: 'var(--cyan, #0891b2)' },
              { label: 'Citation-Ready', value: pagesWithCitations, color: 'var(--green, #22c55e)' },
              { label: 'Fresh Content', value: pagesWithFresh, color: 'var(--blue, #3b82f6)' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '14px 14px', background: 'var(--bg, #f9fafb)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border-light, #f3f4f6)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Bot size={18} color="var(--accent, #3b82f6)" />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Platform Readiness</h2>
          <DataSourceBadge source="simulated" size="xs" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <PlatformBar name="ChatGPT" score={chatgptScore} color="#10a37f" description="Likelihood ChatGPT cites your content — estimated from content signals" />
          <PlatformBar name="Gemini" score={geminiScore} color="#4285f4" description="Visibility in Google AI Overviews — estimated from content signals" />
          <PlatformBar name="Perplexity" score={perplexityScore} color="#20b2aa" description="Citation rate in Perplexity — estimated from content signals" />
        </div>
      </div>

      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Zap size={18} color="var(--accent, #3b82f6)" />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Live AI Overviews Check</h2>
          {aoData?.configured && <DataSourceBadge source="measured" size="xs" />}
        </div>

        {!aoData ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>Checking live AI Overviews for your top keywords...</div>
        ) : !aoData.configured ? (
          <div style={{ padding: '16px 18px', borderRadius: 'var(--radius-sm, 8px)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#b45309', marginBottom: 4 }}>Live monitoring not configured</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary, #6b7280)', lineHeight: 1.6 }}>
              Set <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 4 }}>SERP_API_KEY</code> (SerpAPI) in the backend env to check whether your site actually appears in Google AI Overviews for your keywords — real results, not estimates.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 14 }}>
              {[
                { label: 'Keywords Checked', value: aoData.summary?.keywords_checked ?? 0, color: 'var(--accent, #3b82f6)' },
                { label: 'AI Overview Triggered', value: aoData.summary?.with_ai_overview ?? 0, color: 'var(--yellow, #f59e0b)' },
                { label: 'Your Site Cited', value: aoData.summary?.mentioned_in_ai_overview ?? 0, color: 'var(--green, #22c55e)' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '12px 14px', background: 'var(--bg, #f9fafb)', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border-light, #f3f4f6)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(aoData.results || []).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-sm, 8px)', background: 'var(--bg, #f9fafb)', border: '1px solid var(--border-light, #f3f4f6)' }}>
                  <span style={{ marginTop: 2 }}>
                    {r.mentioned_in_ai_overview ? (
                      <CheckCircle size={16} color="var(--green, #22c55e)" />
                    ) : r.has_ai_overview ? (
                      <AlertTriangle size={16} color="var(--yellow, #f59e0b)" />
                    ) : (
                      <Info size={16} color="var(--text-muted, #9ca3af)" />
                    )}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{r.keyword}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 4, background: r.mentioned_in_ai_overview ? 'rgba(34,197,94,0.12)' : r.has_ai_overview ? 'rgba(245,158,11,0.12)' : 'rgba(107,114,128,0.12)', color: r.mentioned_in_ai_overview ? '#22c55e' : r.has_ai_overview ? '#f59e0b' : '#6b7280' }}>
                        {r.mentioned_in_ai_overview ? 'Cited in AI Overview' : r.has_ai_overview ? 'AI Overview shown — not you' : 'No AI Overview'}
                      </span>
                    </div>
                    {r.ai_overview_text && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, lineHeight: 1.5 }}>{r.ai_overview_text}</div>
                    )}
                    {r.top_cited_domains?.length > 0 && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>
                        Top organic results: {r.top_cited_domains.join(', ')}
                      </div>
                    )}
                    {r.error && <div style={{ fontSize: 11.5, color: '#ef4444', marginTop: 4 }}>{r.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {missingSignals.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius, 12px)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={16} color="var(--red, #ef4444)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)' }}>What is Missing</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {missingSignals.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red, #ef4444)' }}>{s.name || s.key.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>— {Math.round((s.score ?? 0) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(signals).length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Sparkles size={18} color="var(--cyan, #0891b2)" />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>AI Search Signals</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {Object.entries(signals).map(([name, signal]) => <SignalCard key={name} name={name} signal={signal} />)}
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={18} color="var(--yellow, #f59e0b)" />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Issues by Page</h2>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm, 6px)', background: 'rgba(245,158,11,0.12)', color: 'var(--yellow, #f59e0b)' }}>{issues.length} issues</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => {
              const count = level === 'ALL' ? issues.length : issues.filter(i => (i.severity || '').toUpperCase() === level).length;
              const style = SEVERITY_STYLES[level] || { bg: 'var(--bg, #f3f4f6)', color: 'var(--text-muted, #6b7280)' };
              const isActive = severityFilter === level;
              return (
                <button key={level} onClick={() => setSeverityFilter(level)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-sm, 6px)',
                  border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: isActive ? style.bg : 'var(--bg, #f3f4f6)',
                  color: isActive ? style.color : 'var(--text-muted, #6b7280)',
                }}>
                  {level} ({count})
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {severityFilter === 'ALL' ? (
              issuesByPage.map(([pageUrl, pageIssues], pi) => (
                <div key={pi}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <ExternalLink size={14} color="var(--accent, #3b82f6)" />
                    <a href={pageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent, #3b82f6)', textDecoration: 'none', wordBreak: 'break-all' }}>{pageUrl}</a>
                    <span style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>({pageIssues.length} issue{pageIssues.length > 1 ? 's' : ''})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pageIssues.map((issue, ii) => <IssueCard key={ii} issue={issue} index={ii} />)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredIssues.length > 0 ? filteredIssues.map((issue, i) => <IssueCard key={i} issue={issue} index={i} />) : (
                  <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted, #6b7280)', fontSize: 13 }}>
                    <CheckCircle size={28} color="var(--green, #22c55e)" style={{ marginBottom: 8 }} />
                    <div>No {severityFilter.toLowerCase()} severity issues found.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {issues.length === 0 && Object.keys(signals).length === 0 && (
        <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '48px 24px', textAlign: 'center' }}>
          <Bot size={40} color="var(--text-muted, #9ca3af)" />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #111827)', marginTop: 12 }}>No AI Visibility Data</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', marginTop: 4 }}>Run a full audit to analyze AI search visibility.</div>
        </div>
      )}
    </div>
  );
}
