import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Quote, Bot, AlertTriangle, CheckCircle, ExternalLink, ChevronDown, ChevronUp, Sparkles, FileText, Link2, Info, Shield, Zap, BarChart3 } from 'lucide-react';
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

function IssueCard({ issue }) {
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
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)', flex: 1 }}>{issue.signal_name || 'Citation Issue'}</span>
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
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Why This Page Fails Citation Check</div>
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

function SignalCard({ name, signal }) {
  const score = (signal.score ?? 0) * 100;
  const color = score >= 70 ? 'var(--green, #22c55e)' : score >= 40 ? 'var(--yellow, #f59e0b)' : 'var(--red, #ef4444)';
  const passed = score >= 50;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{signal.name || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color }}>{Math.round(score)}%</span>
      </div>
      <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--border, #e5e7eb)', marginBottom: 8 }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 0.5s ease' }} />
      </div>
      {signal.description && <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', lineHeight: 1.5, marginBottom: 6 }}>{signal.description}</div>}
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-sm, 6px)', background: passed ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: passed ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)' }}>
        {passed ? 'Pass' : 'Needs Work'}
      </span>
    </div>
  );
}

function PlatformCard({ name, score, color, description }) {
  let status = 'Needs Work';
  let statusColor = 'var(--red, #ef4444)';
  if (score >= 70) { status = 'Strong'; statusColor = 'var(--green, #22c55e)'; }
  else if (score >= 40) { status = 'Moderate'; statusColor = 'var(--yellow, #f59e0b)'; }

  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '22px 20px', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <Bot size={24} color={color} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)', marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 14 }}>{description}</div>
      <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--border, #e5e7eb)', marginBottom: 10 }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>{status}</span>
        <span style={{ fontSize: 22, fontWeight: 700, color }}>{Math.round(score)}%</span>
      </div>
    </div>
  );
}

function CitationCheck({ label, passed, fix }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
      borderRadius: 'var(--radius-sm, 6px)',
      background: passed ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
      border: `1px solid ${passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
    }}>
      {passed ? (
        <CheckCircle size={18} color="var(--green, #22c55e)" style={{ marginTop: 1, flexShrink: 0 }} />
      ) : (
        <AlertTriangle size={18} color="var(--red, #ef4444)" style={{ marginTop: 1, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: passed ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)' }}>{label}</span>
        {!passed && fix && <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{fix}</div>}
      </div>
    </div>
  );
}

export default function CitationAnalysis() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');

  useEffect(() => {
    api.getAIVisibility(id).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
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
        <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>Analyzing citations...</div>
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
        <Quote size={32} color="var(--text-muted, #9ca3af)" />
        <div style={{ fontSize: 15, color: 'var(--text-secondary, #6b7280)' }}>No citation data available</div>
      </div>
    );
  }

  const score = data.ai_visibility_score ?? 0;
  const chatgptScore = data.chatgpt_visibility ?? data.chatgpt_readiness ?? 0;
  const geminiScore = data.gemini_visibility ?? data.gemini_readiness ?? 0;
  const perplexityScore = data.perplexity_visibility ?? data.perplexity_readiness ?? 0;

  const criticalCount = issues.filter(i => (i.severity || '').toUpperCase() === 'CRITICAL').length;
  const highCount = issues.filter(i => (i.severity || '').toUpperCase() === 'HIGH').length;
  const mediumCount = issues.filter(i => (i.severity || '').toUpperCase() === 'MEDIUM').length;
  const lowCount = issues.filter(i => (i.severity || '').toUpperCase() === 'LOW').length;

  const citationChecks = [
    { label: 'Source attribution — content cites external sources', passed: !!signals.source_attribution || !!signals.citations, fix: 'Add "According to [source]" references and link to authoritative external sources.' },
    { label: 'Statistics with attribution — specific numbers from credible sources', passed: !!signals.statistics || !!signals.data_points, fix: 'Include statistics like "73% of users..." with a linked source for each claim.' },
    { label: 'Author bio with credentials — visible author information', passed: !!signals.author_bio || !!signals.author_info, fix: 'Add an author bio section with name, title, credentials, and links to profiles.' },
    { label: 'Structured data — schema markup for AI parsing', passed: !!signals.structured_data || !!signals.schema_markup, fix: 'Add FAQPage, Article, or HowTo schema JSON-LD to help AI engines parse content.' },
    { label: 'Citation-ready formatting — scannable paragraphs, lists, tables', passed: !!signals.citable_passages || !!signals.ai_citable_content, fix: 'Use short paragraphs (2-3 sentences), numbered lists, and tables for data.' },
    { label: 'Comprehensive coverage — deep topic authority', passed: !!signals.topic_coverage || !!signals.content_depth, fix: 'Expand content to 1500+ words covering all subtopics with H2/H3 structure.' },
    { label: 'Freshness signals — recent dates and updates', passed: !!signals.freshness || !!signals.content_freshness, fix: 'Add "Last Updated: [date]" and refresh content at least quarterly.' },
    { label: 'Expert quotes or original insights', passed: !!signals.expert_quotes || !!signals.original_research, fix: 'Include original quotes, case studies, or proprietary data unique to your site.' },
  ];

  const passedChecks = citationChecks.filter(c => c.passed).length;
  const failedChecks = citationChecks.filter(c => !c.passed).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #111827)', margin: '0 0 4px' }}>Citation Analysis</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>Why each page fails citation checks and the exact fix to make it citable by AI.</p>
      </div>

      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '32px 40px', display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ScoreRing score={score} size={160} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Citation-Readiness Score</span>
          <DataSourceBadge source="estimated" size="xs" />
        </div>
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Checks Passed', value: passedChecks, color: 'var(--green, #22c55e)' },
              { label: 'Checks Failed', value: failedChecks, color: 'var(--red, #ef4444)' },
              { label: 'Total Issues', value: issues.length, color: issues.length > 0 ? 'var(--yellow, #f59e0b)' : 'var(--green, #22c55e)' },
              { label: 'Signals Analyzed', value: Object.keys(signals).length, color: 'var(--cyan, #0891b2)' },
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
          <BarChart3 size={18} color="var(--accent, #3b82f6)" />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Platform Citation Readiness</h2>
          <DataSourceBadge source="estimated" size="sm" />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', margin: '0 0 12px', maxWidth: 720 }}>
          Estimated readiness scores derived from your page signals (schema, citations, statistics, freshness, structure) — not live citation measurements from each AI platform.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          <PlatformCard name="ChatGPT" score={chatgptScore} color="#10a37f" description="Estimated ChatGPT citation-readiness from page signals" />
          <PlatformCard name="Gemini" score={geminiScore} color="#4285f4" description="Estimated Gemini / AI Overviews citation-readiness" />
          <PlatformCard name="Perplexity" score={perplexityScore} color="#20b2aa" description="Estimated Perplexity citation-readiness from page signals" />
        </div>
      </div>

      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Shield size={18} color="var(--cyan, #0891b2)" />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Citation Readiness Checklist</h2>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm, 6px)', background: passedChecks === citationChecks.length ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: passedChecks === citationChecks.length ? 'var(--green, #22c55e)' : 'var(--yellow, #f59e0b)' }}>
            {passedChecks}/{citationChecks.length} passed
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 8 }}>
          {citationChecks.map((check, i) => <CitationCheck key={i} {...check} />)}
        </div>
      </div>

      {Object.keys(signals).length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Sparkles size={18} color="var(--cyan, #0891b2)" />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Citation Signals</h2>
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
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Why Each Page Fails Citation Check</h2>
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
                    {pageIssues.map((issue, ii) => <IssueCard key={ii} issue={issue} />)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredIssues.length > 0 ? filteredIssues.map((issue, i) => <IssueCard key={i} issue={issue} />) : (
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
          <Quote size={40} color="var(--text-muted, #9ca3af)" />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #111827)', marginTop: 12 }}>No Citation Data Available</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', marginTop: 4 }}>Run a full audit to analyze citation readiness.</div>
        </div>
      )}
    </div>
  );
}
