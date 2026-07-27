import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Clock, AlertTriangle, CheckCircle, TrendingUp, FileText, ExternalLink, Zap, Brain, Link2, RefreshCw, ChevronDown, ChevronUp, Lightbulb, ArrowRight } from 'lucide-react';

const SEVERITY_STYLES = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  HIGH: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  MEDIUM: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  LOW: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
};

function ScoreRing({ score, size = 180 }) {
  const color = score >= 80 ? 'var(--green, #059669)' : score >= 60 ? 'var(--cyan, #0891b2)' : score >= 40 ? 'var(--yellow, #d97706)' : 'var(--red, #dc2626)';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Work' : 'Critical';
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border, #e5e7eb)" strokeWidth={10} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 42, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(score)}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>/100</span>
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
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

function StatCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '18px 16px', position: 'relative', overflow: 'hidden' }}>
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

function getSuggestions(item, type) {
  const suggestions = [];
  const url = item.url || '';
  const slug = url.split('/').filter(Boolean).pop() || '';
  const topic = slug.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');

  if (type === 'thin') {
    const wc = item.word_count ?? 0;
    const min = item.recommended_minimum ?? item.recommended_min ?? 1500;
    const gap = min - wc;
    suggestions.push(`Expand from ${wc} to ${min}+ words (add ~${gap} words about ${topic || 'the page topic'})`);
    suggestions.push(`Add an FAQ section with 5-8 questions related to "${topic || 'this topic'}"`);
    suggestions.push(`Include a "Key Takeaways" or "Summary" section with 3-5 bullet points`);
    if (wc < 300) suggestions.push(`Add a detailed introduction (200+ words) explaining what this page covers`);
    suggestions.push(`Add internal links from 3+ related pages to boost this page's authority`);
  }

  if (type === 'outdated') {
    suggestions.push(`Update all dates, statistics, and references to current year (2026)`);
    suggestions.push(`Refresh the introduction and conclusion with current industry trends`);
    if (topic) suggestions.push(`Research and add the latest data points about "${topic}"`);
    suggestions.push(`Check all external links — replace any broken or outdated references`);
    suggestions.push(`Add a "Last Updated: [date]" timestamp at the top of the page`);
  }

  if (type === 'orphan') {
    suggestions.push(`Add internal links from 3-5 related pages using descriptive anchor text`);
    if (topic) suggestions.push(`Link to this page from your main "${topic}" pillar or category page`);
    suggestions.push(`Add this URL to your XML sitemap if not already included`);
    suggestions.push(`Include this page in your site's navigation or breadcrumbs`);
    suggestions.push(`Share this page on social media to generate initial backlinks`);
  }

  return suggestions;
}

function PageCard({ item, type, index }) {
  const [expanded, setExpanded] = useState(false);
  const suggestions = getSuggestions(item, type);
  const wc = item.word_count ?? 0;
  const min = item.recommended_minimum ?? item.recommended_min ?? 1500;

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
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer' }}
      >
        <SeverityBadge severity={item.severity} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent, #3b82f6)', textDecoration: 'none', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 6 }}>
            {item.url}
            <ExternalLink size={12} />
          </a>
          {item.title && <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{item.title}</div>}
        </div>
        {type === 'thin' && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red, #ef4444)' }}>{wc.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>of {min.toLocaleString()} words</div>
          </div>
        )}
        {expanded ? <ChevronUp size={16} color="var(--text-muted, #9ca3af)" /> : <ChevronDown size={16} color="var(--text-muted, #9ca3af)" />}
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 18px', borderTop: '1px solid var(--border-light, #f3f4f6)' }}>
          {item.reason && (
            <div style={{ padding: '12px 0 8px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Why Flagged</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.5 }}>{item.reason}</div>
            </div>
          )}
          {item.last_updated && (
            <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 8 }}>Last updated: {item.last_updated}</div>
          )}
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              <Lightbulb size={12} style={{ marginRight: 4, verticalAlign: 'middle', color: 'var(--yellow, #f59e0b)' }} />
              Specific Actions to Fix This Page
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: 'var(--bg, #f9fafb)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border-light, #f3f4f6)' }}>
                  <ArrowRight size={14} color="var(--green, #22c55e)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text, #374151)', lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec, index }) {
  const [expanded, setExpanded] = useState(false);
  const priority = (rec.priority || 'MEDIUM').toUpperCase();
  const pStyle = SEVERITY_STYLES[priority] || SEVERITY_STYLES.MEDIUM;

  return (
    <div style={{
      background: 'var(--bg-white, #fff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 'var(--radius, 12px)',
      borderLeft: `4px solid ${pStyle.color}`,
      overflow: 'hidden',
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer' }}>
        <Zap size={16} color={pStyle.color} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)' }}>{rec.action || rec.title || `Action ${index + 1}`}</span>
        </div>
        <SeverityBadge severity={priority} />
        {rec.impact && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-sm, 6px)', background: 'rgba(59,130,246,0.1)', color: 'var(--accent, #3b82f6)' }}>Impact: {rec.impact}</span>
        )}
        {expanded ? <ChevronUp size={16} color="var(--text-muted, #9ca3af)" /> : <ChevronDown size={16} color="var(--text-muted, #9ca3af)" />}
      </div>
      {expanded && rec.description && (
        <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border-light, #f3f4f6)' }}>
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.6 }}>{rec.description}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentRevival() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await api.getContentRevival(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load content revival data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border, #e5e7eb)', borderTopColor: 'var(--accent, #3b82f6)', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>Loading content freshness analysis...</div>
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
        <FileText size={32} color="var(--text-muted, #9ca3af)" />
        <div style={{ fontSize: 15, color: 'var(--text-secondary, #6b7280)' }}>No content revival data available</div>
      </div>
    );
  }

  const freshnessScore = data.freshness_score ?? 0;
  const summary = data.summary || {};
  const thinContent = data.thin_content || [];
  const outdatedContent = data.outdated_content || [];
  const orphanPages = data.orphan_pages || [];
  const recommendations = data.recommendations || [];

  const tabs = [
    { key: 'all', label: 'All Issues', icon: RefreshCw, count: thinContent.length + outdatedContent.length + orphanPages.length },
    { key: 'thin', label: 'Thin Content', icon: FileText, count: thinContent.length },
    { key: 'outdated', label: 'Outdated', icon: Clock, count: outdatedContent.length },
    { key: 'orphan', label: 'Orphan Pages', icon: Link2, count: orphanPages.length },
    { key: 'recommendations', label: 'Recommendations', icon: Brain, count: recommendations.length },
  ];

  const renderItems = (items, type) => items.map((item, i) => (
    <PageCard key={i} item={item} type={type} index={i} />
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #111827)', margin: '0 0 4px' }}>Content Revival</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>Every thin, outdated, and orphan page — with specific actions to fix each one.</p>
      </div>

      <div style={{
        background: 'var(--bg-white, #fff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 'var(--radius, 12px)',
        padding: '40px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <ScoreRing score={freshnessScore} size={180} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #6b7280)', marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content Freshness Score</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <StatCard icon={FileText} label="Total Pages" value={summary.total_pages ?? 0} color="var(--accent, #3b82f6)" />
        <StatCard icon={AlertTriangle} label="Thin Content" value={thinContent.length} color="var(--red, #ef4444)" subtitle="need expansion" />
        <StatCard icon={Clock} label="Outdated Content" value={outdatedContent.length} color="var(--yellow, #f59e0b)" subtitle="need updating" />
        <StatCard icon={Link2} label="Orphan Pages" value={orphanPages.length} color="#f97316" subtitle="no internal links" />
      </div>

      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-white, #fff)', borderRadius: 'var(--radius, 12px)', border: '1px solid var(--border, #e5e7eb)', overflowX: 'auto' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 'var(--radius-sm, 6px)',
              border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              background: active ? 'var(--accent, #3b82f6)' : 'transparent',
              color: active ? '#fff' : 'var(--text-muted, #6b7280)', transition: 'all 0.15s',
            }}>
              <Icon size={15} />
              {tab.label}
              <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 'var(--radius-sm, 6px)', background: active ? 'rgba(255,255,255,0.25)' : 'var(--bg, #f3f4f6)', color: active ? '#fff' : 'var(--text-muted, #6b7280)' }}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {thinContent.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <FileText size={16} color="var(--red, #ef4444)" />
                <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Thin Content</h2>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm, 6px)', background: 'rgba(239,68,68,0.12)', color: 'var(--red, #ef4444)' }}>{thinContent.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{renderItems(thinContent, 'thin')}</div>
            </div>
          )}
          {outdatedContent.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Clock size={16} color="var(--yellow, #f59e0b)" />
                <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Outdated Content</h2>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm, 6px)', background: 'rgba(245,158,11,0.12)', color: 'var(--yellow, #f59e0b)' }}>{outdatedContent.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{renderItems(outdatedContent, 'outdated')}</div>
            </div>
          )}
          {orphanPages.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Link2 size={16} color="#f97316" />
                <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #111827)', margin: 0 }}>Orphan Pages</h2>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm, 6px)', background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>{orphanPages.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{renderItems(orphanPages, 'orphan')}</div>
            </div>
          )}
          {thinContent.length === 0 && outdatedContent.length === 0 && orphanPages.length === 0 && (
            <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '48px 24px', textAlign: 'center' }}>
              <CheckCircle size={40} color="var(--green, #22c55e)" />
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #111827)', marginTop: 12 }}>All Content is Fresh!</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', marginTop: 4 }}>No thin, outdated, or orphan pages found.</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'thin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {thinContent.length > 0 ? renderItems(thinContent, 'thin') : (
            <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '40px 24px', textAlign: 'center' }}>
              <CheckCircle size={28} color="var(--green, #22c55e)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)' }}>No thin content detected.</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'outdated' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {outdatedContent.length > 0 ? renderItems(outdatedContent, 'outdated') : (
            <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '40px 24px', textAlign: 'center' }}>
              <CheckCircle size={28} color="var(--green, #22c55e)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)' }}>No outdated content detected.</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orphan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orphanPages.length > 0 ? renderItems(orphanPages, 'orphan') : (
            <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '40px 24px', textAlign: 'center' }}>
              <CheckCircle size={28} color="var(--green, #22c55e)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)' }}>No orphan pages detected.</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recommendations.length > 0 ? recommendations.map((rec, i) => <RecommendationCard key={i} rec={rec} index={i} />) : (
            <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '40px 24px', textAlign: 'center' }}>
              <CheckCircle size={28} color="var(--green, #22c55e)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)' }}>No recommendations — content is in great shape.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
