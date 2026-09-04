import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Globe, AlertTriangle, CheckCircle, ExternalLink, ChevronDown, ChevronUp, Sparkles, Target, Info, Shield, Brain, FileText, Link2, Zap } from 'lucide-react';
import { api } from '../../../api';
import { DataSourceBadge } from '../../../components/DataSourceBadge';
import FixDetail from '../../../components/FixDetail';
import ScoreRing from '../../../components/ScoreRing';

const SEVERITY_STYLES = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  HIGH: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  MEDIUM: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  LOW: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
};

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
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)', flex: 1 }}>{issue.signal_name || 'GEO Issue'}</span>
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
          {issue.fix && <FixDetail issue={issue} />}
        </div>
      )}
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

function QuickCheck({ label, passed, fix, aiSuggestion }) {
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
        <span style={{ fontSize: 13, fontWeight: 600, color: passed ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)' }}>{label}</span>
        {!passed && fix && (
          <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 'var(--radius-sm, 6px)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>How to Correct</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.5 }}>{fix}</div>
          </div>
        )}
        {!passed && aiSuggestion && (
          <div style={{ marginTop: 6, padding: '10px 12px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 'var(--radius-sm, 6px)', display: 'flex', gap: 8 }}>
            <Sparkles size={13} color="#8b5cf6" style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>AI Suggestion</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.5 }}>{aiSuggestion}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GeoAnalysis() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');

  useEffect(() => {
    async function loadGeo() {
      try {
        setLoading(true);
        const result = await api.getGeoAnalysis(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load GEO analysis');
      } finally {
        setLoading(false);
      }
    }
    loadGeo();
  }, [id]);

  const issues = React.useMemo(() => data?.issues || [], [data]);
  const signals = React.useMemo(() => data?.signals || {}, [data]);

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
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border, #e5e7eb)', borderTopColor: 'var(--cyan, #0891b2)', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>Loading GEO analysis...</div>
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
        <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '8px 20px', borderRadius: 'var(--radius-sm, 6px)', border: 'none', background: 'var(--accent, #3b82f6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <Globe size={32} color="var(--text-muted, #9ca3af)" />
        <div style={{ fontSize: 15, color: 'var(--text-secondary, #6b7280)' }}>No GEO data available</div>
      </div>
    );
  }

  const geoScore = data.geo_score ?? 0;

  const criticalCount = issues.filter(i => (i.severity || '').toUpperCase() === 'CRITICAL').length;
  const highCount = issues.filter(i => (i.severity || '').toUpperCase() === 'HIGH').length;
  const mediumCount = issues.filter(i => (i.severity || '').toUpperCase() === 'MEDIUM').length;
  const lowCount = issues.filter(i => (i.severity || '').toUpperCase() === 'LOW').length;

  const missingEntitySignals = Object.entries(signals).filter(([key]) =>
    key.includes('entity') || key.includes('brand') || key.includes('author')
  ).filter(([, s]) => (s.score ?? 0) < 0.5);

  const missingAuthoritySignals = Object.entries(signals).filter(([key]) =>
    key.includes('citation') || key.includes('source') || key.includes('reference') || key.includes('authority')
  ).filter(([, s]) => (s.score ?? 0) < 0.5);

  const missingStructureSignals = Object.entries(signals).filter(([key]) =>
    key.includes('schema') || key.includes('structure') || key.includes('faq')
  ).filter(([, s]) => (s.score ?? 0) < 0.5);

  const quickChecks = [
    { label: 'AI-citable content structure', passed: !!signals.ai_citable_content || !!signals.citable_passages, fix: 'Structure content with clear headings, bullet points, and summary paragraphs that AI can easily extract and cite.', aiSuggestion: 'Rewrite the page like a well-structured answer: an H1 with a summary, one H2 per subtopic, bullet lists for key points, and a short "Key Takeaways" section so ChatGPT and Perplexity can quote your page directly.' },
    { label: 'Source attribution & references', passed: !!signals.source_attribution || !!signals.citations, fix: 'Add "According to [source]" references and link to authoritative sources in your content.', aiSuggestion: 'Add inline citations such as "According to Google\u2019s Search documentation\u2026" with a link to the primary source. AI models treat named, verifiable sources as trust signals and cite them far more often than unsourced claims.' },
    { label: 'Statistics & data points', passed: !!signals.statistics || !!signals.data_points, fix: 'Include specific numbers, percentages, and data points with attribution from reliable sources.', aiSuggestion: 'Add concrete figures with attribution, e.g. "Sites with 1500+ word guides earn 3x more AI citations (study, 2024)". Specific numbers are the most quoted content in AI answers.' },
    { label: 'Comprehensive topic coverage', passed: !!signals.topic_coverage || !!signals.content_depth, fix: 'Expand content to cover subtopics thoroughly — aim for 1500+ words with multiple H2/H3 sections.', aiSuggestion: 'Expand to 1500+ words covering every sub-question of the topic: add an FAQ block, related subheadings (H2/H3), and answer the exact wording people type into search. Full topic coverage makes your page the reference answer.' },
    { label: 'Structured data for AI parsing', passed: !!signals.structured_data || !!signals.schema_markup, fix: 'Add FAQPage, Article, or HowTo schema markup to help AI engines parse your content.', aiSuggestion: 'Add FAQPage and Article JSON-LD schema, then validate it in Google\u2019s Rich Results Test. Structured data lets both Google and AI engines extract your questions and answers directly.' },
    { label: 'Freshness & recency signals', passed: !!signals.freshness || !!signals.content_freshness, fix: 'Add "Last Updated" dates and refresh content quarterly to signal freshness to AI crawlers.', aiSuggestion: 'Add a visible "Last Updated: [date]" line and update key pages quarterly with the latest stats. AI models and Google both favor current content when citing sources.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #111827)', margin: '0 0 4px' }}>GEO Analysis <DataSourceBadge source="estimated" size="xs" /></h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>Generative Engine Optimization — what's missing for AI citation, with exact fixes per page.</p>
      </div>

      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '32px 40px', display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ScoreRing score={geoScore} size={160} stroke={10} label="/100" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GEO Score</span>
        </div>
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Issues', value: issues.length, color: issues.length > 0 ? 'var(--red, #ef4444)' : 'var(--green, #22c55e)' },
              { label: 'Critical + High', value: criticalCount + highCount, color: 'var(--red, #ef4444)' },
              { label: 'Signals Analyzed', value: Object.keys(signals).length, color: 'var(--cyan, #0891b2)' },
              { label: 'Missing Signals', value: Object.values(signals).filter(s => (s.score ?? 0) < 0.5).length, color: 'var(--yellow, #f59e0b)' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '14px 14px', background: 'var(--bg, #f9fafb)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border-light, #f3f4f6)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Target size={18} color="var(--cyan, #0891b2)" />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Quick GEO Assessment</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
          {quickChecks.map((check, i) => <QuickCheck key={i} {...check} />)}
        </div>
      </div>

      {(missingEntitySignals.length > 0 || missingAuthoritySignals.length > 0 || missingStructureSignals.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {missingEntitySignals.length > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius, 12px)', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Brain size={16} color="var(--red, #ef4444)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)' }}>Missing Entity Signals</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {missingEntitySignals.map(([key, s], i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)', padding: '6px 10px', background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-sm, 6px)' }}>
                    <span style={{ fontWeight: 600 }}>{s.name || key.replace(/_/g, ' ')}</span> — {Math.round((s.score ?? 0) * 100)}% (need 50%+)
                  </div>
                ))}
              </div>
            </div>
          )}
          {missingAuthoritySignals.length > 0 && (
            <div style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 'var(--radius, 12px)', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Shield size={16} color="var(--yellow, #f59e0b)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)' }}>Missing Authority Signals</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {missingAuthoritySignals.map(([key, s], i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)', padding: '6px 10px', background: 'rgba(245,158,11,0.06)', borderRadius: 'var(--radius-sm, 6px)' }}>
                    <span style={{ fontWeight: 600 }}>{s.name || key.replace(/_/g, ' ')}</span> — {Math.round((s.score ?? 0) * 100)}% (need 50%+)
                  </div>
                ))}
              </div>
            </div>
          )}
          {missingStructureSignals.length > 0 && (
            <div style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 'var(--radius, 12px)', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <FileText size={16} color="#8b5cf6" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)' }}>Missing Structure Signals</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {missingStructureSignals.map(([key, s], i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)', padding: '6px 10px', background: 'rgba(139,92,246,0.06)', borderRadius: 'var(--radius-sm, 6px)' }}>
                    <span style={{ fontWeight: 600 }}>{s.name || key.replace(/_/g, ' ')}</span> — {Math.round((s.score ?? 0) * 100)}% (need 50%+)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {Object.keys(signals).length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Sparkles size={18} color="var(--cyan, #0891b2)" />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>All GEO Signals</h2>
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
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>GEO Issues by Page</h2>
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
          <Globe size={40} color="var(--text-muted, #9ca3af)" />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #111827)', marginTop: 12 }}>No GEO Data Available</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', marginTop: 4 }}>Run a full audit to analyze GEO signals.</div>
        </div>
      )}
    </div>
  );
}
