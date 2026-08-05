import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import {
  Sparkles, Bot, Check, X, RefreshCw, FileText, ShieldCheck, Globe, Calendar,
} from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, StatCard, Badge, ProgressBar,
  inputStyle, labelStyle, btnPrimary, btnGhost,
} from './ui';

const ACCENT = '#8b5cf6';

function SignalRow({ ok, label, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {ok ? <Check size={13} color="#22c55e" /> : <X size={13} color="#94a3b8" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {detail && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{detail}</div>}
      </div>
    </div>
  );
}

export default function BrandMonitor() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [brand, setBrand] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const scan = async (override) => {
    setScanning(true);
    setError(null);
    try {
      const res = await api.getBrandMonitor(id, override || '');
      setData(res);
      const hist = await api.getBrandMonitorHistory(id).catch(() => ({ records: [] }));
      setHistory(hist.records || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  useEffect(() => { scan(''); }, [id]);

  if (loading) return <LoadingSpinner message="Scanning AI-citation signals…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={Sparkles}
          title="Brand & AI-Citation Monitor"
          badge={data && data.provider}
          subtitle="Estimates how visible and citable your brand is across AI answer engines (AI Overviews, ChatGPT, Perplexity)"
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder={data ? `Override brand (${data.brand})` : 'Brand name'}
                style={{ ...inputStyle, width: 220 }}
              />
              <button style={btnPrimary} onClick={() => scan(brand)} disabled={scanning}>
                <RefreshCw size={14} className={scanning ? 'spin' : ''} /> {scanning ? 'Scanning…' : 'Scan now'}
              </button>
            </div>
          }
        />
        {error && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</div>}
        {!data ? (
          <EmptyState icon={Bot} title="No scan yet" message="Run a scan to measure your brand's AI-citation readiness." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 120, height: 120, borderRadius: '50%',
                  background: `conic-gradient(${ACCENT} ${data.citation_estimate}%, var(--border) 0)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 92, height: 92, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{data.citation_estimate}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Citation</span>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 240, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <StatCard icon={Bot} label="Brand mentions" value={data.mention_count} color="#8b5cf6" />
                <StatCard icon={ShieldCheck} label="AI crawlable" value={data.ai_crawlable ? 'Yes' : 'No'} color={data.ai_crawlable ? '#22c55e' : '#f97316'} />
                <StatCard icon={FileText} label="Brand" value={data.brand} color="#3b82f6" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 260 }}>
                <div style={labelStyle}>Signals</div>
                <SignalRow ok={data.ai_crawlable} label="AI crawlable" detail="Page content reachable by AI crawlers without heavy JS" />
                <SignalRow ok={!!data.llms_txt} label="llms.txt" detail="Machine-readable content map for LLMs" />
                <SignalRow ok={!!data.robots_ai_rules} label="AI bot rules" detail="gptbot, ChatGPT-User, PerplexityBot, Claude & Gemini handled in robots.txt" />
                <SignalRow ok={!!data.schema_present} label="Structured data" detail="Schema.org markup present for entity extraction" />
              </div>
              <div style={{ minWidth: 260 }}>
                <div style={labelStyle}>Mention pages</div>
                {(data.brand_pages || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>No brand mentions found in crawled pages.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(data.brand_pages || []).slice(0, 8).map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: ACCENT, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Globe size={11} style={{ verticalAlign: -1, marginRight: 5 }} />{u}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {data.note || 'Connect Profound or SE Ranking in Integrations for measured LLM citation data.'}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader icon={Calendar} title="Scan history" badge={`${history.length} scans`} subtitle="Citation-readiness estimates tracked over time — run recurring scans to watch drift" />
        {history.length === 0 ? (
          <EmptyState icon={Sparkles} title="No scans yet" message="Run your first scan above." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>When</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Brand</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>Citation</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>Mentions</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Provider</th>
                </tr>
              </thead>
              <tbody>
                {history.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text)' }}>{r.brand}</td>
                    <td style={{ padding: '8px 10px', minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}><ProgressBar value={r.citation_estimate} height={6} /></div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{r.citation_estimate}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text)' }}>{r.mention_count}</td>
                    <td style={{ padding: '8px 10px' }}><Badge color="#8b5cf6">{r.provider}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
