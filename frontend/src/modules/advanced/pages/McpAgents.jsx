import React, { useState, useEffect } from 'react';
import {
  Bot, Cpu, Zap, Globe, Search, Link2, ShieldCheck, Sparkles, FileText,
  Activity, Plug, KeyRound, Copy, Check, TerminalSquare, LineChart,
} from 'lucide-react';
import { Card, CardHeader, Badge, LoadingSpinner, StatCard, btnPrimary, btnGhost, labelStyle } from './ui';

const ACCENT = '#8b5cf6';

const MCP_ENDPOINT = 'https://seo-platform.fastapicloud.dev/api/mcp';

const TOOLS = [
  { name: 'keyword_volume', icon: BarChartIcon, desc: 'Search volume, difficulty and intent for any keyword.', args: 'keyword' },
  { name: 'serp_position', icon: LineChart, desc: 'Live SERP position check for a keyword + host.', args: 'keyword, host' },
  { name: 'backlink_summary', icon: Link2, desc: 'Backlink profile summary for a target domain.', args: 'target' },
  { name: 'ai_citations', icon: Sparkles, desc: 'Answer-engine citation check for a brand across AI search.', args: 'brand, site_url' },
  { name: 'audit_website', icon: FileText, desc: 'Run a full SEO/AEO/GEO audit on a website.', args: 'website_url, competitor_url?' },
  { name: 'apply_issue_fix', icon: Zap, desc: 'Generate a ready-to-copy fix (schema/meta/llms.txt/content) for a detected issue.', args: 'audit_id, issue_id' },
  { name: 'free_site_checks', icon: Activity, desc: 'Free site-wide health checks (no key needed).', args: 'url' },
  { name: 'free_autocomplete', icon: Search, desc: 'Google autocomplete keyword suggestions.', args: 'q' },
  { name: 'free_whois', icon: Globe, desc: 'Free domain registration/WHOIS data.', args: 'url' },
  { name: 'free_dns', icon: WifiIcon, desc: 'Free DNS record lookup.', args: 'url' },
  { name: 'free_ssl', icon: ShieldCheck, desc: 'Free SSL/TLS grade via SSL Labs.', args: 'url' },
  { name: 'providers_status', icon: Cpu, desc: 'Live health of all data/AI providers.', args: '—' },
];

function BarChartIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>; }
function WifiIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>; }

function CopyBlock({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <code style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: 'var(--text)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{text}</code>
      {label && <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>}
      <button style={btnGhost} onClick={copy} title="Copy">
        {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

const AGENT_CONFIGS = [
  {
    id: 'claude-code',
    agent: 'Claude Code / Claude Desktop',
    icon: Bot,
    steps: [
      { title: 'Add the server to your MCP config', code: `mcpServers:\n  rankiq:\n    url: ${MCP_ENDPOINT}` },
      { title: 'Test it', code: 'claude mcp list' },
      { title: 'Use it in a prompt', code: 'Run an SEO audit for example.com and list the top issues.' },
    ],
  },
  {
    id: 'cursor',
    agent: 'Cursor',
    icon: TerminalSquare,
    steps: [
      { title: 'Add to Cursor MCP settings (.cursor/mcp.json)', code: `{\n  "mcpServers": {\n    "rankiq": { "url": "${MCP_ENDPOINT}" }\n  }\n}` },
      { title: 'Reload MCP servers and invoke tools via @ tools', code: '@rankiq ai_citations brand:"acme" site_url:"acme.com"' },
    ],
  },
];

export default function McpAgents() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [tools, setTools] = useState([]);

  const checkConnection = async () => {
    setStatus('loading');
    setError(null);
    try {
      const h = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
      const init = await fetch(MCP_ENDPOINT, {
        method: 'POST', headers: h,
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'browser', version: '1.0' } } }),
      });
      const sid = init.headers.get('mcp-session-id') || '';
      const list = await fetch(MCP_ENDPOINT, {
        method: 'POST', headers: { ...h, 'mcp-session-id': sid },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
      });
      const data = await list.json().catch(() => ({}));
      const names = (data.result?.tools || []).map(t => t.name);
      setTools(names);
      setStatus('ok');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const covered = new Set(tools);
  const allLive = TOOLS.every(t => covered.has(t.name));

  return (
    <div style={{ padding: '4px 6px 40px' }}>
      <div style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.12), rgba(217,70,239,0.10))`, border: '1px solid var(--border)', borderRadius: 14, padding: 26, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          <Bot size={18} color={ACCENT} />
          <Badge color={ACCENT}>AGENT-NATIVE</Badge>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>AI Agents &amp; MCP</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 640, lineHeight: 1.6 }}>
          Expose RankIQ's SEO / AEO / GEO engine to any AI agent (Claude Code, Cursor, Claude Desktop) over the
          Model Context Protocol. Your AI can read audit summaries, check keyword volume, run live audits and
          apply fixes — without a browser.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard icon={Cpu} label="MCP Tools" value={tools.length ? `${tools.length} live` : '12 total'} color={ACCENT} sub="over /api/mcp" />
        <StatCard icon={Zap} label="Connection" value={status === 'ok' ? 'Live' : status === 'loading' ? 'Testing…' : status === 'error' ? 'Unreachable' : 'Live'} color={status === 'ok' ? '#22c55e' : status === 'error' ? '#ef4444' : ACCENT} sub={allLive ? 'all tools verified' : 'some tools offline'} />
        <StatCard icon={Sparkles} label="Capability" value="SEO + AEO + GEO" color="#d946ef" sub="full engine exposure" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <CardHeader icon={Plug} title="Connect" subtitle="Point your MCP client at the hosted endpoint." badge="HOSTED" />
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>MCP endpoint (Streamable HTTP)</label>
              <CopyBlock text={MCP_ENDPOINT} />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button style={btnPrimary} onClick={checkConnection} disabled={status === 'loading'}>
                {status === 'loading' ? <Activity size={14} className="spin" /> : <Activity size={14} />} Re-test connection
              </button>
              <Badge color={status === 'ok' ? '#22c55e' : status === 'error' ? '#ef4444' : '#94a3b8'}>
                {status === 'ok' ? 'Connected — protocol verified' : status === 'error' ? 'Failed: ' + (error ? '' : '') : '…'}
              </Badge>
            </div>
            {status === 'error' && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 10 }}>{error}</div>}
          </Card>

          {AGENT_CONFIGS.map(cfg => (
            <Card key={cfg.id} style={{ padding: '18px 20px' }}>
              <CardHeader icon={cfg.icon} title={cfg.agent} />
              {cfg.steps.map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Badge color={ACCENT}>{i + 1}</Badge>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{s.title}</div>
                  </div>
                  <CopyBlock text={s.code} />
                </div>
              ))}
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader icon={KeyRound} title="Available Tools" subtitle="What your agent can call right now." badge={`${TOOLS.length} tools`} actions={
            <Badge color={allLive ? '#22c55e' : '#eab308'}>{allLive ? 'ALL LIVE' : 'partial'}</Badge>
          } />
          {status === 'loading' ? (
            <LoadingSpinner message="Checking tool registry…" />
          ) : (
            <div>
              {TOOLS.map(t => {
                const live = covered.has(t.name);
                return (
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `${live ? '#22c55e' : '#94a3b8'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <t.icon size={16} color={live ? '#22c55e' : '#94a3b8'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.desc}</div>
                    </div>
                    <code style={{ fontSize: 10.5, color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 6px', whiteSpace: 'nowrap' }}>{t.args}</code>
                    <Badge color={live ? '#22c55e' : '#94a3b8'}>{live ? 'LIVE' : '—'}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
