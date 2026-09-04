import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../../api';
import {
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target,
  Brain,
  FileText,
  Link2,
  Image,
  Code,
  MessageSquare,
  Globe,
  ChevronDown,
  ChevronRight,
  Shield,
  Eye,
  Layout,
  Tag,
  Lightbulb,
} from 'lucide-react';
import FixDetail from '../../../components/FixDetail';
import ScoreRing from '../../../components/ScoreRing';
import { DataSourceBadge } from '../../../components/DataSourceBadge';

const SCORE_COLORS = {
  excellent: '#059669',
  good: '#0891b2',
  fair: '#d97706',
  poor: '#dc2626',
};

function getScoreColor(score) {
  if (score >= 80) return SCORE_COLORS.excellent;
  if (score >= 60) return SCORE_COLORS.good;
  if (score >= 40) return SCORE_COLORS.fair;
  return SCORE_COLORS.poor;
}

function getScoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

function ExpandableSection({ title, count, icon: Icon, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'var(--bg-white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text)',
          fontFamily: 'inherit',
          transition: 'var(--transition)',
        }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Icon size={16} style={{ color }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
        {count > 0 && (
          <span
            className={`badge ${count > 3 ? 'badge-red' : count > 0 ? 'badge-yellow' : 'badge-green'}`}
            style={{ fontSize: 11 }}
          >
            {count}
          </span>
        )}
      </button>
      {open && (
        <div style={{ padding: '12px 0 0 28px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value, icon: Icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
      {Icon && <Icon size={14} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--text)', wordBreak: 'break-all', lineHeight: 1.5 }}>
          {value || <span style={{ color: 'var(--red)', fontStyle: 'italic' }}>Not set</span>}
        </div>
      </div>
    </div>
  );
}

export default function PageIntelligenceDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const urlParam = searchParams.get('url') || '';
  const [url, setUrl] = useState(urlParam);
  const [pages, setPages] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (urlParam) {
      setUrl(urlParam);
      return;
    }
    let cancelled = false;
    api.getAuditPages(id, { limit: 100 })
      .then(d => {
        if (cancelled) return;
        const items = (d.items || []).filter(p => p.url);
        setPages(items);
        if (items.length) setUrl(items[0].url);
        else {
          setError('No pages found for this audit');
          setLoading(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load pages');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, urlParam]);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await api.getPageIntelligence(id, url);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load page intelligence');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, url]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Analyzing page intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div style={{ marginBottom: 16 }}>
          <Link to={`/audit/${id}/pages`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to Page Intelligence
          </Link>
        </div>
        <div className="error-state">{error}</div>
        {pages.length > 0 && (
          <div style={{ marginTop: 16, maxWidth: 520 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Select a page:</label>
            <select
              value={url}
              onChange={e => setUrl(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontSize: 13 }}
            >
              {pages.map((p, i) => <option key={i} value={p.url}>{p.title || p.url} ({p.word_count || 0}w)</option>)}
            </select>
          </div>
        )}
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const scores = data.scores || {};
  const overallScore = scores.overall || scores.score || 0;
  const seoScore = scores.seo || 0;
  const contentScore = scores.content || 0;
  const aeoScore = scores.aeo || 0;
  const geoScore = scores.geo || 0;
  const aiVisibilityScore = scores.ai_visibility || scores.aiVisibility || 0;
  const technicalScore = scores.technical || 0;

  const strengths = data.strengths || [];
  const weaknesses = data.weaknesses || [];
  const quickWins = data.quick_wins || data.quickWins || [];
  const rawIssues = data.issues || {};
  const issues = Array.isArray(rawIssues)
    ? rawIssues
    : Object.entries(rawIssues).flatMap(([cat, arr]) =>
        (Array.isArray(arr) ? arr : []).map(issue => ({ ...issue, category: issue.category || cat }))
      );
  const quickWinsFallback = (quickWins.length === 0 && issues.length > 0)
    ? issues.slice(0, 5).map(issue => ({
        title: issue.signal_name || issue.title || issue.issue || 'Priority fix',
        description: issue.fix || issue.impact || issue.description || `Resolve the '${issue.signal_name || 'issue'}' on this page.`,
        impact: issue.impact,
        severity: issue.severity,
        fix: issue.fix,
        location: issue.location,
        exact_text: issue.exact_text,
        replacement: issue.replacement,
        steps: issue.steps,
      }))
    : [];
  const quickWinsToShow = quickWins.length > 0 ? quickWins : quickWinsFallback;
  const recommendations = data.recommendations || [];
  const headings = data.headings || data.heading_structure || [];
  const metadata = data.page_data || data.metadata || data.page_metadata || {};

  const issuesByCategory = issues.reduce((acc, issue) => {
    const cat = issue.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(issue);
    return acc;
  }, {});

  const categoryIcons = {
    SEO: Target,
    Content: FileText,
    Technical: Code,
    Links: Link2,
    Images: Image,
    Accessibility: Eye,
    Performance: Zap,
    Schema: Shield,
    Other: AlertTriangle,
  };

  const categoryColors = {
    SEO: 'var(--accent)',
    Content: 'var(--purple)',
    Technical: 'var(--cyan)',
    Links: 'var(--green)',
    Images: 'var(--orange)',
    Accessibility: 'var(--yellow)',
    Performance: 'var(--red)',
    Schema: 'var(--pink)',
    Other: 'var(--text-muted)',
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <Link
          to={`/audit/${id}/pages`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 12 }}
        >
          <ArrowLeft size={14} /> Back to Page Intelligence
        </Link>

        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>
              <Globe size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
              Page Intelligence Report
            </h1>
            {data.status_code && (
              <span className={`badge ${data.status_code >= 200 && data.status_code < 300 ? 'badge-green' : data.status_code >= 300 && data.status_code < 400 ? 'badge-yellow' : 'badge-red'}`}>
                {data.status_code}
              </span>
            )}
          </div>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <code style={{ fontSize: 12, background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 6, color: 'var(--text-secondary)' }}>
              {url}
            </code>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
              <ExternalLink size={14} />
            </a>
          </p>
          {(pages.length > 1 || searchParams.get('url')) && (
            <select
              value={url}
              onChange={e => setUrl(e.target.value)}
              style={{ marginTop: 10, width: '100%', maxWidth: 560, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-white)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
            >
              {pages.length > 0
                ? pages.map((p, i) => <option key={i} value={p.url}>{p.title || p.url} ({p.word_count || 0}w)</option>)
                : <option value={url}>{url}</option>}
            </select>
          )}
        </div>
      </div>

      {/* Page Type Badge & Context Issues */}
      {data.page_type && data.page_type !== 'UNKNOWN' && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--purple)' }}>
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={18} style={{ color: 'var(--purple)' }} /> Page Type: {data.page_type}
            </h2>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            This page has been classified as a <strong>{data.page_type}</strong> page. Context-specific checks have been applied based on its purpose.
          </div>
        </div>
      )}

      {data.context_issues && data.context_issues.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--yellow)' }}>
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lightbulb size={18} style={{ color: 'var(--yellow)' }} /> Context-Specific Issues
            </h2>
            <span className="badge badge-yellow">{data.context_issues.length}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            These issues are specific to {data.page_type || 'this'} page type and go beyond generic SEO checks.
          </div>
          {data.context_issues.map((issue, i) => (
            <div key={i} className="issue-item" style={{ borderLeft: `2px solid ${issue.severity === 'CRITICAL' ? 'var(--red)' : issue.severity === 'HIGH' ? 'var(--orange)' : issue.severity === 'MEDIUM' ? 'var(--yellow)' : 'var(--green)'}` }}>
              <div className="issue-header">
                <div className="issue-title">{issue.signal_name || issue.title || `Issue ${i + 1}`}</div>
                <span className={`badge ${issue.severity === 'CRITICAL' ? 'badge-red' : issue.severity === 'HIGH' ? 'badge-orange' : issue.severity === 'MEDIUM' ? 'badge-yellow' : 'badge-green'}`} style={{ fontSize: 10 }}>
                  {issue.severity}
                </span>
              </div>
              {issue.description && (
                <div className="issue-desc">{issue.description}</div>
              )}
              {issue.impact && (
                <div style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 4 }}>Impact: {issue.impact}</div>
              )}
              {issue.fix && (
                <FixDetail issue={issue} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Score Rings */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={18} style={{ color: 'var(--accent)' }} /> Scores
          </h2>
          <DataSourceBadge source="crawler" size="xs" />
          <span
            className={`badge ${overallScore >= 80 ? 'badge-green' : overallScore >= 60 ? 'badge-cyan' : overallScore >= 40 ? 'badge-yellow' : 'badge-red'}`}
            style={{ fontSize: 13, padding: '6px 16px' }}
          >
            {getScoreLabel(overallScore)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <ScoreRing score={overallScore} label="Overall" size={160} />
        </div>

        <div className="score-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <div className="score-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>SEO</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: getScoreColor(seoScore), lineHeight: 1 }}>{seoScore}</div>
            <div style={{ height: 4, background: 'var(--border-light)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${seoScore}%`, background: getScoreColor(seoScore), borderRadius: 2, transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>
          </div>
          <div className="score-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Content</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: getScoreColor(contentScore), lineHeight: 1 }}>{contentScore}</div>
            <div style={{ height: 4, background: 'var(--border-light)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${contentScore}%`, background: getScoreColor(contentScore), borderRadius: 2, transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>
          </div>
          <div className="score-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>AEO</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: getScoreColor(aeoScore), lineHeight: 1 }}>{aeoScore}</div>
            <div style={{ height: 4, background: 'var(--border-light)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${aeoScore}%`, background: getScoreColor(aeoScore), borderRadius: 2, transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>
          </div>
          <div className="score-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>GEO</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: getScoreColor(geoScore), lineHeight: 1 }}>{geoScore}</div>
            <div style={{ height: 4, background: 'var(--border-light)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${geoScore}%`, background: getScoreColor(geoScore), borderRadius: 2, transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>
          </div>
          <div className="score-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>AI Visibility</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: getScoreColor(aiVisibilityScore), lineHeight: 1 }}>{aiVisibilityScore}</div>
            <div style={{ height: 4, background: 'var(--border-light)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${aiVisibilityScore}%`, background: getScoreColor(aiVisibilityScore), borderRadius: 2, transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>
          </div>
          <div className="score-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Technical</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: getScoreColor(technicalScore), lineHeight: 1 }}>{technicalScore}</div>
            <div style={{ height: 4, background: 'var(--border-light)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${technicalScore}%`, background: getScoreColor(technicalScore), borderRadius: 2, transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* AI Explanation */}
      {data.ai_explanation && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--purple)' }}>
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brain size={18} style={{ color: 'var(--purple)' }} /> AI Analysis
            </h2>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {data.ai_explanation}
          </div>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
        {strengths.length > 0 && (
          <div className="card" style={{ borderLeft: '3px solid var(--green)' }}>
            <div className="card-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)' }}>
                <CheckCircle size={18} /> Strengths
              </h2>
              <span className="badge badge-green">{strengths.length}</span>
            </div>
            {strengths.map((s, i) => (
              <div key={i} className="issue-item" style={{ borderLeft: '2px solid var(--green)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  {typeof s === 'string' ? s : s.title || s.message || s.text}
                </div>
                {typeof s === 'object' && (s.description || s.detail) && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {s.description || s.detail}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {weaknesses.length > 0 && (
          <div className="card" style={{ borderLeft: '3px solid var(--red)' }}>
            <div className="card-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)' }}>
                <AlertTriangle size={18} /> Weaknesses
              </h2>
              <span className="badge badge-red">{weaknesses.length}</span>
            </div>
            {weaknesses.map((w, i) => (
              <div key={i} className="issue-item" style={{ borderLeft: '2px solid var(--red)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  {typeof w === 'string' ? w : w.title || w.message || w.text}
                </div>
                {typeof w === 'object' && (w.description || w.detail) && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {w.description || w.detail}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Wins */}
      {quickWinsToShow.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--yellow)' }}>
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} style={{ color: 'var(--yellow)' }} /> Quick Wins
            </h2>
            <span className="badge badge-yellow">{quickWinsToShow.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
            {quickWinsToShow.map((qw, i) => (
              <div key={i} className="rec-card" style={{ borderTop: '2px solid var(--yellow-bg)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  {typeof qw === 'string' ? qw : qw.title || qw.message || qw.text || qw.issue || qw.fix}
                </div>
                {typeof qw === 'object' && (qw.description || qw.detail || qw.impact || qw.fix) && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {qw.description || qw.detail || qw.impact || qw.fix}
                  </div>
                )}
                {typeof qw === 'object' && qw.effort && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--cyan)', fontWeight: 500 }}>
                    Effort: {qw.effort}
                  </div>
                )}
                {typeof qw === 'object' && (qw.fix || qw.location || qw.steps) && (
                  <div style={{ marginTop: 8 }}><FixDetail issue={qw} /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues Breakdown */}
      {Object.keys(issuesByCategory).length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} style={{ color: 'var(--red)' }} /> Issues Breakdown
            </h2>
            <span className="badge badge-red">{issues.length} issues</span>
          </div>
          {Object.entries(issuesByCategory).map(([category, catIssues]) => {
            const CatIcon = categoryIcons[category] || AlertTriangle;
            const catColor = categoryColors[category] || 'var(--text-muted)';
            return (
              <ExpandableSection
                key={category}
                title={category}
                count={catIssues.length}
                icon={CatIcon}
                color={catColor}
              >
                {catIssues.map((issue, i) => (
                  <div key={i} className="issue-item">
                    <div className="issue-header">
                      <div className="issue-title">
                        {issue.title || issue.message || issue.description || `Issue ${i + 1}`}
                      </div>
                      <span className={`badge ${issue.severity === 'critical' ? 'badge-red' : issue.severity === 'high' ? 'badge-orange' : issue.severity === 'medium' ? 'badge-yellow' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {issue.severity || 'info'}
                      </span>
                    </div>
                    {(issue.description || issue.detail) && (
                      <div className="issue-desc">
                        {issue.description || issue.detail}
                      </div>
                    )}
                    {issue.fix && (
                      <FixDetail issue={issue} />
                    )}
                    {issue.element && (
                      <code style={{ display: 'block', marginTop: 6, fontSize: 11, background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 4, color: 'var(--text-secondary)', overflow: 'auto' }}>
                        {issue.element}
                      </code>
                    )}
                  </div>
                ))}
              </ExpandableSection>
            );
          })}
        </div>
      )}

      {/* Page Metadata */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: 'var(--accent)' }} /> Page Metadata
          </h2>
        </div>
        <MetaRow label="Title" value={metadata.title || data.title} icon={FileText} />
        <MetaRow label="Page Type" value={data.page_type || 'UNKNOWN'} icon={Tag} />
        <MetaRow label="Meta Description" value={metadata.meta_description || metadata.description || data.meta_description} icon={MessageSquare} />
        <MetaRow label="Canonical URL" value={metadata.canonical || data.canonical} icon={Link2} />
        <MetaRow label="Word Count" value={metadata.word_count ?? data.word_count} icon={FileText} />
        <MetaRow label="Images" value={metadata.images_count != null ? `${metadata.images_count} images` : metadata.image_count != null ? `${metadata.image_count} images` : data.images_count != null ? `${data.images_count} images` : null} icon={Image} />
        <MetaRow label="Internal Links" value={metadata.links_internal_count ?? metadata.internal_links ?? data.internal_links} icon={Link2} />
        <MetaRow label="External Links" value={metadata.links_external_count ?? metadata.external_links ?? data.external_links} icon={ExternalLink} />
        <MetaRow label="Schema Types" value={metadata.schema_types || data.schema_types} icon={Code} />
        <MetaRow label="H1" value={metadata.h1 || data.h1} icon={Globe} />
      </div>

      {/* Heading Structure */}
      {headings.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layout size={18} style={{ color: 'var(--cyan)' }} /> Heading Structure
            </h2>
            <span className="badge badge-gray">{headings.length} headings</span>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
            {headings.map((h, i) => {
              const level = typeof h === 'object' ? h.level : parseInt(String(h.tag || 'h2').replace(/\D/g, '')) || 2;
              const text = typeof h === 'string' ? h : h.text || h.content || '';
              const indent = (level - 1) * 20;
              return (
                <div
                  key={i}
                  style={{
                    paddingLeft: indent,
                    padding: `6px 0 6px ${indent}px`,
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--accent)',
                      background: 'var(--accent-light)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    H{level}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={18} style={{ color: 'var(--green)' }} /> Recommendations
            </h2>
            <span className="badge badge-green">{recommendations.length}</span>
          </div>
          {recommendations.map((rec, i) => (
            <div key={i} className="rec-card">
              <div className="rec-header">
                <div className="rec-title">
                  {typeof rec === 'string' ? rec : rec.title || rec.message || rec.text || `Recommendation ${i + 1}`}
                </div>
                {rec.priority && (
                  <span className={`badge ${rec.priority === 'high' ? 'badge-red' : rec.priority === 'medium' ? 'badge-yellow' : 'badge-green'}`}>
                    {rec.priority}
                  </span>
                )}
              </div>
              {(rec.description || rec.detail || rec.body) && (
                <div className="rec-desc">
                  {rec.description || rec.detail || rec.body}
                </div>
              )}
              {rec.category && (
                <div className="tags">
                  <span className="tag">{rec.category}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No data state */}
      {!data.ai_explanation && strengths.length === 0 && weaknesses.length === 0 && quickWins.length === 0 && Object.keys(issuesByCategory).length === 0 && recommendations.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <MessageSquare size={48} />
            <h3>Limited Data Available</h3>
            <p>This page has been crawled but detailed intelligence analysis is not yet complete.</p>
          </div>
        </div>
      )}
    </div>
  );
}
