import { useState } from 'react';
import { Globe, Search, Mail, Target, BarChart3, ExternalLink, ChevronDown, ChevronUp, Copy, Check, Zap, Users, Award, Link2, MessageCircle } from 'lucide-react';

const STRATEGIES = [
  {
    id: 'citation-sources',
    label: 'GEO Citation Source Discovery',
    icon: Globe,
    color: '#8b5cf6',
    desc: 'High-authority sites AI search engines cite as proof for your topic',
    action: 'Find Citation Opportunities',
    example: 'Reddit, Quora, Wikipedia, niche review sites, industry directories',
  },
  {
    id: 'unlinked-mentions',
    label: 'Unlinked Brand Mention Conversion',
    icon: MessageCircle,
    color: '#3b82f6',
    desc: 'Web mentions of your brand lacking a hyperlinked URL — fastest link wins',
    action: 'Find Unlinked Mentions',
    example: 'Source Domain | Mentioned Text | Contact Email',
  },
  {
    id: 'anchor-balancer',
    label: 'Anchor Text & Entity Trust Balancer',
    icon: BarChart3,
    color: '#f59e0b',
    desc: 'Audit anchor text distribution across Brand, Exact Match, Partial, Generic',
    action: 'Analyze Anchor Profile',
    example: 'Brand: 45% | Exact Match: 8% | Partial: 22% | Generic: 25%',
  },
  {
    id: 'competitor-gaps',
    label: 'Competitor Link Gap Conquest',
    icon: Target,
    color: '#ef4444',
    desc: 'Sites linking to 2+ competitors but not to you',
    action: 'Find Link Gaps',
    example: 'Target Domain | DR | Competitor A | Competitor B | Your Status',
  },
];

const MOCK_DATA = {
  'citation-sources': [
    { domain: 'moz.com', reason: 'SEO guides and research', dr: 92, priority: 'High' },
    { domain: 'searchengineland.com', reason: 'SEO news and analysis', dr: 88, priority: 'High' },
    { domain: 'ahrefs.com', reason: 'Link building studies', dr: 85, priority: 'High' },
    { domain: 'reddit.com/r/SEO', reason: 'Community discussions', dr: 94, priority: 'Medium' },
    { domain: 'wikipedia.org', reason: 'SEO terminology', dr: 96, priority: 'Medium' },
  ],
  'unlinked-mentions': [
    { domain: 'techcrunch.com', mention: 'according to SEO Platform...', contact: 'editor@techcrunch.com', priority: 'High' },
    { domain: 'seo-roundup.com', mention: 'tools like SEO Platform help...', contact: 'contact@seo-roundup.com', priority: 'High' },
    { domain: 'marketingblog.com', mention: 'SEO Platform offers...', contact: 'hello@marketingblog.com', priority: 'Medium' },
  ],
  'anchor-balancer': [
    { type: 'Brand Name', pct: 45, target: '30-40%', status: 'over-optimized' },
    { type: 'Exact Match', pct: 8, target: '10-15%', status: 'low' },
    { type: 'Partial Match', pct: 22, target: '20-30%', status: 'healthy' },
    { type: 'Generic (click here)', pct: 25, target: '15-20%', status: 'high' },
  ],
  'competitor-gaps': [
    { domain: 'backlinko.com', dr: 89, competitors: ['Competitor A', 'Competitor B'], yourStatus: 'Missing' },
    { domain: 'neilpatel.com', dr: 86, competitors: ['Competitor A', 'Competitor C'], yourStatus: 'Missing' },
    { domain: 'search Engine Journal', dr: 84, competitors: ['Competitor B'], yourStatus: 'Has Link' },
  ],
};

export default function BacklinkStrategyEngine({ onAction }) {
  const [expanded, setExpanded] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const toggle = (id) => setExpanded(expanded === id ? null : id);

  const copyText = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Strategic Backlink & Offsite Engine</div>
      {STRATEGIES.map(strat => {
        const Icon = strat.icon;
        const isOpen = expanded === strat.id;
        const mockData = MOCK_DATA[strat.id] || [];

        return (
          <div key={strat.id} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <button
              onClick={() => toggle(strat.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                border: 'none', background: isOpen ? '#f8fafc' : '#fff', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.1s',
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${strat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={strat.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{strat.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{strat.desc}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onAction?.(strat.id); }} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: strat.color, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Search size={11} /> {strat.action}
              </button>
              {isOpen ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid #eef2f6', padding: '10px 14px', background: '#fafbfc' }}>
                {mockData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {mockData.map((item, i) => {
                      const itemId = `${strat.id}-${i}`;
                      const displayFields = strat.id === 'citation-sources' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <Globe size={11} color="#64748b" />
                          <span style={{ fontWeight: 600, color: 'var(--text)', flex: 1 }}>{item.domain}</span>
                          <span style={{ color: 'var(--text-muted)' }}>DR {item.dr}</span>
                          <span style={{ color: item.priority === 'High' ? '#12b886' : '#f59e0b', fontWeight: 500 }}>{item.priority}</span>
                        </div>
                      ) : strat.id === 'unlinked-mentions' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <Globe size={11} color="#64748b" />
                          <span style={{ fontWeight: 600, color: 'var(--text)', minWidth: 140 }}>{item.domain}</span>
                          <span style={{ color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{item.mention}"</span>
                        </div>
                      ) : strat.id === 'anchor-balancer' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text)', minWidth: 120 }}>{item.type}</span>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#e2e8f0', position: 'relative' }}>
                            <div style={{ width: `${item.pct}%`, height: '100%', borderRadius: 3, background: item.status === 'healthy' ? '#12b886' : item.status === 'low' ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span style={{ color: 'var(--text-muted)', minWidth: 40 }}>{item.pct}%</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>target: {item.target}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <Globe size={11} color="#64748b" />
                          <span style={{ fontWeight: 600, color: 'var(--text)', flex: 1 }}>{item.domain}</span>
                          <span style={{ color: 'var(--text-muted)' }}>DR {item.dr}</span>
                          <span style={{ color: item.yourStatus === 'Missing' ? '#ef4444' : '#12b886', fontWeight: 500 }}>{item.yourStatus}</span>
                        </div>
                      );
                      const emailText = strat.id === 'unlinked-mentions' ? `Hi there,\n\nI noticed you mentioned our brand on ${item.domain} but didn't include a link. Would you consider adding one?\n\nThanks!` : '';
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'var(--bg-white)', borderRadius: 6, border: '1px solid #eef2f6' }}>
                          {displayFields}
                          {strat.id === 'unlinked-mentions' && (
                            <button onClick={() => copyText(emailText, itemId)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-white)', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                              {copiedId === itemId ? <Check size={10} color="#12b886" /> : <Mail size={10} />}
                              {copiedId === itemId ? 'Copied' : 'Email'}
                            </button>
                          )}
                          {strat.id === 'competitor-gaps' && (
                            <button style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#ef4444', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                              <Zap size={10} /> Pitch
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>Click "{strat.action}" to load data</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
