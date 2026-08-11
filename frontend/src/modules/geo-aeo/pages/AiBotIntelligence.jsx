import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Bot, CheckCircle, XCircle, AlertTriangle, Shield, FileText, Globe, ExternalLink } from 'lucide-react';
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip';
import ThemeHero from '../../../components/ai/ThemeHero';
import ThemeStatCard from '../../../components/ai/ThemeStatCard';
import FixDetail from '../../../components/FixDetail';
import { LoadingState, EmptyState } from '../../../components/States';

function Card({ title, icon: Icon, children, color = '#3b82f6' }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-white)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

const BOT_LABELS = {
  gptbot: 'GPTBot', chatgpt_user: 'ChatGPT-User', claude_bot: 'ClaudeBot',
  perplexity_bot: 'PerplexityBot', google_extended: 'Google-Extended',
  anthropic_ai: 'anthropic-ai', ccbot: 'CCBot', amazon_bot: 'AmazonBot',
  applebot: 'Applebot', bingbot: 'Bingbot', meta_external_agent: 'Meta-ExternalAgent',
  tiktok_bot: 'TikTokBot',
};

export default function AiBotIntelligence() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    api.getAuditPages(id, { limit: 100 }).then(d => { setPages(d.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    setPageLoading(true);
    api.getAiBotIntelligence(id, selectedIdx).then(d => { setData(d); setPageLoading(false); }).catch(() => setPageLoading(false));
  }, [id, selectedIdx, pages.length]);

  if (loading) return <LoadingState message="Loading AI bot access…" />;
  if (!data) return <EmptyState title="No AI bot data yet" description="Run an audit to see which AI crawlers can access each page." />;

  const bots = data.bot_accessibility || {};
  const machineRead = data.machine_readability || {};
  const allowed = data.robots_txt_analysis?.ai_bots_allowed || [];
  const blocked = data.robots_txt_analysis?.ai_bots_blocked || [];
  const presentCount = ['llms_txt', 'llms_full_txt', 'pricing_md', 'docs', 'api_docs', 'humans_txt', 'feed_xml', 'security_txt'].filter(k => machineRead[k]?.present).length;

  return (
    <div style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <ThemeHero
        icon={Bot}
        title="AI Bot Intelligence"
        subtitle="How AI search engines and LLM crawlers access and read your site"
        badges={[
          { icon: Bot, t: 'Bot access' },
          { icon: FileText, t: 'llms.txt' },
          { icon: AlertTriangle, t: 'AI readiness' },
        ]}
      />

      <div>
        <AiSuggestionStrip auditId={id} tool="ai-accessibility" title="AI bot & access fixes" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
          {pages.map((p, i) => <option key={i} value={i}>{p.url?.substring(0, 70)}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <ThemeStatCard icon={Bot} label="AI Accessibility" value={data.overall_ai_accessibility_score ?? 0} color="#3b82f6" sub={`${allowed.length} AI bots allowed, ${blocked.length} blocked`} />
        <ThemeStatCard icon={FileText} label="Machine Readability" value={machineRead.overall_readability_score || 0} color="#8b5cf6" sub={`${presentCount} of 8 AI files detected`} />
        <ThemeStatCard icon={Globe} label="Content for AI" value={data.content_optimization_for_ai?.extraction_score || 0} color="#059669" sub="FAQ, definitions & structured data" />
      </div>

      <Card title="AI Bot Accessibility" icon={Bot} color="#3b82f6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {Object.entries(bots).map(([key, bot]) => (
            <div key={key} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${bot.allowed ? '#d1fae5' : '#fecaca'}`, background: bot.allowed ? '#f0fdf4' : '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {bot.allowed ? <CheckCircle size={14} color="#059669" /> : <XCircle size={14} color="#dc2626" />}
                <span style={{ fontWeight: 700, fontSize: 13 }}>{BOT_LABELS[key] || key}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Score: {bot.score || 0}/100 | Est. pages: {bot.estimated_pages_accessible || 0}
              </div>
              {bot.notes && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{bot.notes}</div>}
            </div>
          ))}
        </div>
      </Card>

      {(data.issues?.length > 0) && (
        <Card title="Issues" icon={AlertTriangle} color="#dc2626">
          {data.issues.map((issue, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < data.issues.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? '#fef2f2' : '#fffbeb', color: issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? '#dc2626' : '#d97706', whiteSpace: 'nowrap' }}>{issue.severity}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{issue.message}</div>
                {issue.fix && <FixDetail issue={issue} />}
              </div>
            </div>
          ))}
        </Card>
      )}

      {data.recommendations?.length > 0 && (
        <Card title="Recommendations" icon={Shield} color="#059669">
          {data.recommendations.map((rec, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < data.recommendations.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: '#eff6ff', color: '#2563eb' }}>{rec.priority}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{rec.recommendation}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {rec.effort && `Effort: ${rec.effort}`} | {rec.impact && `Impact: ${rec.impact}`} | {rec.confidence && `Confidence: ${Math.round(rec.confidence)}%`}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
