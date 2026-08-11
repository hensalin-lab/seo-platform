import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, AlertTriangle, CheckCircle, TrendingUp, Target, Zap, ArrowRight, Clock, Brain, BarChart3, Plus, ExternalLink, Search, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { api } from '../../../api';
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
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
      padding: '3px 10px', borderRadius: 'var(--radius-sm, 6px)',
      background: style.bg, color: style.color,
    }}>{s}</span>
  );
}

function StatCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div style={{
      background: 'var(--bg-white, #fff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 'var(--radius, 12px)',
      padding: '18px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color || 'var(--accent, #3b82f6)', borderRadius: 'var(--radius, 12px) var(--radius, 12px) 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm, 6px)', background: `${color || 'var(--accent)'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color || 'var(--accent)'} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', marginTop: 4 }}>{subtitle}</div>}
    </div>
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
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
          cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border-light, #f3f4f6)' : 'none',
        }}
      >
        <SeverityBadge severity={issue.severity} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)', flex: 1 }}>
          {issue.signal_name || 'Content Issue'}
        </span>
        {issue.page_url && (
          <span style={{ fontSize: 12, color: 'var(--accent, #3b82f6)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {issue.page_url}
          </span>
        )}
        {expanded ? <ChevronUp size={16} color="var(--text-muted, #9ca3af)" /> : <ChevronDown size={16} color="var(--text-muted, #9ca3af)" />}
      </div>
      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {issue.page_url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg, #f9fafb)', borderRadius: 'var(--radius-sm, 6px)' }}>
              <ExternalLink size={14} color="var(--accent, #3b82f6)" />
              <a href={issue.page_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--accent, #3b82f6)', textDecoration: 'none', wordBreak: 'break-all' }}>
                {issue.page_url}
              </a>
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

export default function ContentOpportunities() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getContentAnalysis(id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const issues = data?.issues || [];

  const issuesByPage = useMemo(() => {
    const map = {};
    issues.forEach(issue => {
      const page = issue.page_url || 'Unknown Page';
      if (!map[page]) map[page] = [];
      map[page].push(issue);
    });
    return Object.entries(map).sort((a, b) => {
      const aMax = a[1].reduce((max, i) => {
        const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return Math.max(max, order[(i.severity || '').toUpperCase()] || 0);
      }, 0);
      const bMax = b[1].reduce((max, i) => {
        const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return Math.max(max, order[(i.severity || '').toUpperCase()] || 0);
      }, 0);
      return bMax - aMax;
    });
  }, [issues]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border, #e5e7eb)', borderTopColor: 'var(--accent, #3b82f6)', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>Analyzing content...</div>
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
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #111827)' }}>Analysis Failed</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <FileText size={32} color="var(--text-muted, #9ca3af)" />
        <div style={{ fontSize: 15, color: 'var(--text-secondary, #6b7280)' }}>No content data available</div>
      </div>
    );
  }

  const contentScore = data.content_score ?? 0;
  const avgWordCount = data.avg_word_count ?? 0;
  const thinContentCount = data.thin_content_count ?? 0;
  const thinContentUrls = data.thin_content_urls || [];
  const contentGaps = data.content_gaps || [];
  const contentOpportunities = data.content_opportunities || [];
  const topicAuthority = data.topic_authority || {};
  const contentQuality = data.content_quality || {};

  const criticalCount = issues.filter(i => (i.severity || '').toUpperCase() === 'CRITICAL').length;
  const highCount = issues.filter(i => (i.severity || '').toUpperCase() === 'HIGH').length;
  const mediumCount = issues.filter(i => (i.severity || '').toUpperCase() === 'MEDIUM').length;
  const lowCount = issues.filter(i => (i.severity || '').toUpperCase() === 'LOW').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #111827)', margin: '0 0 4px' }}>Content Opportunities</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>Every issue found on your content, with the exact page it affects and the exact fix.</p>
      </div>

      <div style={{
        background: 'var(--bg-white, #fff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 'var(--radius, 12px)',
        padding: '32px 40px',
        display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ScoreRing score={contentScore} size={160} stroke={10} label="/100" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content Score</span>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatCard icon={FileText} label="Avg Word Count" value={avgWordCount.toLocaleString()} color="var(--accent, #3b82f6)" subtitle="words per page" />
            <StatCard icon={AlertTriangle} label="Thin Content" value={thinContentCount} color={thinContentCount > 0 ? 'var(--red, #ef4444)' : 'var(--green, #22c55e)'} subtitle={thinContentCount > 0 ? `${thinContentUrls.length} pages below threshold` : 'none found'} />
            <StatCard icon={AlertTriangle} label="Critical Issues" value={criticalCount} color="var(--red, #ef4444)" subtitle="require immediate fix" />
            <StatCard icon={TrendingUp} label="High Issues" value={highCount} color="var(--yellow, #f59e0b)" subtitle="fix as priority" />
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Critical', count: criticalCount, color: SEVERITY_STYLES.CRITICAL.color },
            { label: 'High', count: highCount, color: SEVERITY_STYLES.HIGH.color },
            { label: 'Medium', count: mediumCount, color: SEVERITY_STYLES.MEDIUM.color },
            { label: 'Low', count: lowCount, color: SEVERITY_STYLES.LOW.color },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{s.count}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {issues.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Layers size={18} color="var(--accent, #3b82f6)" />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>All Issues by Page</h2>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm, 6px)', background: 'rgba(59,130,246,0.12)', color: 'var(--accent, #3b82f6)' }}>{issues.length} issues across {issuesByPage.length} pages</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {issuesByPage.map(([pageUrl, pageIssues], pi) => (
              <div key={pi}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <ExternalLink size={14} color="var(--accent, #3b82f6)" />
                  <a href={pageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent, #3b82f6)', textDecoration: 'none', wordBreak: 'break-all' }}>
                    {pageUrl}
                  </a>
                  <span style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>({pageIssues.length} issue{pageIssues.length > 1 ? 's' : ''})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pageIssues.map((issue, ii) => <IssueCard key={ii} issue={issue} index={ii} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {issues.length === 0 && (
        <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '48px 24px', textAlign: 'center' }}>
          <CheckCircle size={40} color="var(--green, #22c55e)" />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #111827)', marginTop: 12 }}>No Issues Found</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', marginTop: 4 }}>Your content passed all checks.</div>
        </div>
      )}

      {contentGaps.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Target size={18} color="var(--accent, #3b82f6)" />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Content Gaps</h2>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm, 6px)', background: 'rgba(59,130,246,0.12)', color: 'var(--accent, #3b82f6)' }}>{contentGaps.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {contentGaps.map((gap, i) => (
              <div key={i} style={{
                background: 'var(--bg-white, #fff)',
                border: '1px solid var(--border, #e5e7eb)',
                borderRadius: 'var(--radius, 12px)',
                padding: '18px 22px',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)', marginBottom: 6 }}>{gap.topic || gap.title || `Gap ${i + 1}`}</div>
                {gap.description && <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', lineHeight: 1.5, marginBottom: 8 }}>{gap.description}</div>}
                {gap.keywords?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {gap.keywords.map((kw, j) => (
                      <span key={j} style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--accent, #3b82f6)', borderRadius: 'var(--radius-sm, 6px)', padding: '3px 10px', fontSize: 12, fontWeight: 500, border: '1px solid rgba(59,130,246,0.15)' }}>{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {contentOpportunities.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Brain size={18} color="#8b5cf6" />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Content Opportunities</h2>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm, 6px)', background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>{contentOpportunities.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {contentOpportunities.map((opp, i) => (
              <div key={i} style={{
                background: 'var(--bg-white, #fff)',
                border: '1px solid var(--border, #e5e7eb)',
                borderRadius: 'var(--radius, 12px)',
                padding: '18px 22px',
                display: 'flex', gap: 16, alignItems: 'flex-start',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm, 6px)', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Brain size={18} color="#8b5cf6" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)', marginBottom: 4 }}>{opp.title || opp.topic || `Opportunity ${i + 1}`}</div>
                  {opp.description && <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', lineHeight: 1.5 }}>{opp.description}</div>}
                  {opp.keywords?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {opp.keywords.map((kw, j) => (
                        <span key={j} style={{ background: 'rgba(139,92,246,0.08)', color: '#8b5cf6', borderRadius: 'var(--radius-sm, 6px)', padding: '3px 10px', fontSize: 12, fontWeight: 500, border: '1px solid rgba(139,92,246,0.15)' }}>{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {contentGaps.length === 0 && contentOpportunities.length === 0 && issues.length === 0 && (
        <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '48px 24px', textAlign: 'center' }}>
          <Target size={40} color="var(--text-muted, #9ca3af)" />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #111827)', marginTop: 12 }}>No Opportunities Detected</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', marginTop: 4 }}>Run a full audit to discover content gaps and opportunities.</div>
        </div>
      )}
    </div>
  );
}
