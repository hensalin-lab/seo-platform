import { useState } from 'react';
import { api } from '../../../api';
import {
  Search, Globe, ShieldCheck, Zap, RefreshCw, ExternalLink,
  Shield, AlertTriangle, Clock, Landmark, Calendar,
  FileText, Braces, Map, TerminalSquare,
} from 'lucide-react';
import {
  Card, CardHeader, Badge, LoadingSpinner, inputStyle, labelStyle,
  btnPrimary, btnGhost,
} from './ui';

const ACCENT = '#8b5cf6';

const TABS = [
  { id: 'autocomplete', icon: Search, label: 'Keyword Suggestions', title: 'Google Autocomplete', subtitle: 'Free keyword suggestions from Google — no key needed.' },
  { id: 'site', icon: Globe, label: 'Site Health', title: 'WHOIS + DNS', subtitle: 'Free domain age, registrar, expiry and DNS records via RDAP + DNS-over-HTTPS.' },
  { id: 'ssl', icon: ShieldCheck, label: 'SSL Grade', title: 'SSL Labs Grade', subtitle: 'Free TLS grade, protocol and certificate expiry via the SSL Labs API.' },
  { id: 'page', icon: FileText, label: 'Page Inspector', title: 'Page Tag Inspector', subtitle: 'Live title, meta description, Open Graph tags, canonical and H1s from any URL.' },
  { id: 'schema', icon: Braces, label: 'Schema Detector', title: 'Structured Data Detector', subtitle: 'Live JSON-LD schema types detected on a page.' },
  { id: 'sitemap', icon: Map, label: 'Sitemap & Robots', title: 'Sitemap & Robots.txt', subtitle: 'Fetch a site\'s robots.txt and discover its sitemaps.' },
];

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text)', textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all', maxWidth: '70%' }}>{value || '—'}</div>
    </div>
  );
}

function gradeColor(grade) {
  if (!grade) return '#94a3b8';
  if (grade.startsWith('A')) return '#22c55e';
  if (grade.startsWith('B')) return '#84cc16';
  if (grade.startsWith('C')) return '#eab308';
  return '#ef4444';
}

function AutocompleteTool() {
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ran, setRan] = useState(false);

  const run = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setRan(true);
    try {
      const res = await api.freeAutocomplete(q.trim());
      setSuggestions(res.suggestions || []);
    } catch (e) {
      setError(e.message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') run(); }}
          placeholder="Type a topic, e.g. seo audit…"
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
        <button style={btnPrimary} onClick={run} disabled={loading}>
          {loading ? <RefreshCw size={14} className="spin" /> : <Search size={14} />} Suggest
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</div>}
      {loading && <LoadingSpinner message="Fetching suggestions…" />}
      {ran && !loading && !error && suggestions.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>No suggestions returned.</div>
      )}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {suggestions.map((s, i) => (
            <div key={i} style={{
              padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-secondary)', fontSize: 13, color: 'var(--text)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }} onClick={() => setQ(s)}>
              <Search size={13} color="var(--text-muted)" /> {s}
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Click a suggestion to search for its own suggestions. Uses the free Google suggest endpoint (no API key).
          </div>
        </div>
      )}
    </div>
  );
}

function SiteHealthTool() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.freeSiteChecks(url.trim());
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const whois = data?.whois || {};
  const dns = data?.dns || {};
  const dnsTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME'];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') run(); }}
          placeholder="https://example.com"
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
        <button style={btnPrimary} onClick={run} disabled={loading}>
          {loading ? <RefreshCw size={14} className="spin" /> : <Globe size={14} />} Check site
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</div>}
      {loading && <LoadingSpinner message="Checking WHOIS and DNS…" />}
      {data && !loading && (
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Landmark size={14} color={ACCENT} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>WHOIS</div>
            </div>
            <Row label="Registrar" value={whois.registrar} />
            <Row label="Registration" value={whois.registration_date} mono />
            <Row label="Expiry" value={whois.expiry_date} mono />
            <Row label="Domain age" value={whois.domain_age_days != null ? `${whois.domain_age_days} days` : null} />
            <Row label="DNSSEC" value={whois.dnssec === true ? 'Signed' : whois.dnssec === false ? 'Not signed' : null} />
            {whois.domain_status?.length > 0 && <Row label="Status" value={whois.domain_status.join(', ')} />}
            {whois.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{whois.note}</div>}
          </div>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Globe size={14} color={ACCENT} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>DNS records</div>
            </div>
            {dnsTypes.map(t => (
              <div key={t} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{t}</div>
                {(dns.records?.[t] || []).length > 0
                  ? dns.records[t].map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{r}</div>
                  ))
                  : <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</div>}
              </div>
            ))}
            {dns.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{dns.note}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function SslTool() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.freeSsl(url.trim());
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') run(); }}
          placeholder="https://example.com"
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
        <button style={btnPrimary} onClick={run} disabled={loading}>
          {loading ? <RefreshCw size={14} className="spin" /> : <ShieldCheck size={14} />} Get grade
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</div>}
      {loading && <LoadingSpinner message="Querying SSL Labs…" />}
      {data && !loading && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', flexWrap: 'wrap' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, background: `${gradeColor(data.grade)}22`, color: gradeColor(data.grade),
            }}>
              {data.grade || '—'}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{data.host}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{data.status}</div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TLS version</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{data.tls_version || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cert expiry</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{data.cert_days_left != null ? `${data.cert_days_left} days` : '—'}</div>
              </div>
            </div>
          </div>
          {data.cert_not_after && (
            <div style={{ marginTop: 10 }}>
              <Row label="Certificate not after" value={data.cert_not_after} mono />
            </div>
          )}
          {data.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{data.note}</div>}
        </div>
      )}
    </div>
  );
}

function PageInspectorTool() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.freePageInspector(url.trim());
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const warn = (w, label, value) => w && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#d97706', marginTop: 2 }}>
      <AlertTriangle size={11} /> {label}
      {value ? ` (${value})` : ''}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') run(); }}
          placeholder="https://example.com/page"
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
        <button style={btnPrimary} onClick={run} disabled={loading}>
          {loading ? <RefreshCw size={14} className="spin" /> : <FileText size={14} />} Inspect
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</div>}
      {loading && <LoadingSpinner message="Fetching page tags…" />}
      {data && !loading && (data.error ? (
        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 10 }}>{data.error}</div>
      ) : (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <FileText size={14} color={ACCENT} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Title</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', wordBreak: 'break-word' }}>{data.title || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{data.missing_title ? 'Missing' : `${data.title_length ?? 0} chars`}</div>
            {data.title_too_long && <div style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>⚠ Over 60 characters</div>}
            <Row label="Meta description" value={data.description} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{data.missing_description ? 'Missing' : `${data.description_length ?? 0} chars`}</div>
            <Row label="Canonical" value={data.canonical} mono />
          </div>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <ExternalLink size={14} color={ACCENT} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Open Graph</div>
            </div>
            <Row label="og:title" value={data.og_title} />
            <Row label="og:description" value={data.og_description} />
            <Row label="og:image" value={data.og_image} mono />
            <Row label="og:url" value={data.og_url} mono />
            <Row label="robots" value={data.robots} />
          </div>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Shield size={14} color={ACCENT} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Headings (H1)</div>
            </div>
            {data.h1s?.length > 0 ? data.h1s.map((h, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>{h}</div>
            )) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No H1 found.</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SchemaDetectorTool() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.freeSchemaDetector(url.trim());
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') run(); }}
          placeholder="https://example.com"
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
        <button style={btnPrimary} onClick={run} disabled={loading}>
          {loading ? <RefreshCw size={14} className="spin" /> : <Braces size={14} />} Detect schema
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</div>}
      {loading && <LoadingSpinner message="Scanning structured data…" />}
      {data && !loading && (data.error ? (
        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 10 }}>{data.error}</div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            {data.count} schema {data.count === 1 ? 'type' : 'types'} found
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {(data.types && Object.entries(data.types).map(([t, n]) => (
              <span key={t} style={{ padding: '4px 10px', borderRadius: 999, background: `${ACCENT}18`, color: ACCENT, fontSize: 12, fontWeight: 600 }}>{t} ×{n}</span>
            )))}
          </div>
          {data.items?.length > 0 && (
            <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', maxHeight: 360, overflowY: 'auto' }}>
              {data.items.map((it, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                    <Braces size={12} color={ACCENT} /> {it['@type']}
                  </div>
                  {it.name && <div style={{ fontSize: 12, color: 'var(--text)' }}>{it.name}</div>}
                  {it.headline && <div style={{ fontSize: 12, color: 'var(--text)' }}>{it.headline}</div>}
                  {it.url && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{it.url}</div>}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{it.keys.join(', ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SitemapRobotsTool() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.freeSitemapRobots(url.trim());
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') run(); }}
          placeholder="https://example.com"
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
        <button style={btnPrimary} onClick={run} disabled={loading}>
          {loading ? <RefreshCw size={14} className="spin" /> : <Map size={14} />} Fetch
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</div>}
      {loading && <LoadingSpinner message="Fetching robots.txt & sitemaps…" />}
      {data && !loading && (data.error ? (
        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 10 }}>{data.error}</div>
      ) : (
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <TerminalSquare size={14} color={ACCENT} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>robots.txt</div>
              <span style={{ fontSize: 11, color: data.has_robots_txt ? '#22c55e' : '#ef4444' }}>{data.has_robots_txt ? 'Found' : 'Not found'}</span>
            </div>
            {data.robots_txt ? (
              <pre style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 320, overflowY: 'auto', margin: 0 }}>{data.robots_txt}</pre>
            ) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No robots.txt returned.</div>}
          </div>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Map size={14} color={ACCENT} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Sitemaps</div>
            </div>
            {data.sitemaps?.length > 0 ? data.sitemaps.map((s, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'monospace', wordBreak: 'break-all', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>{s}</div>
            )) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No sitemap discovered via robots.txt or common paths.</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

const TOOLS = {
  autocomplete: AutocompleteTool,
  site: SiteHealthTool,
  ssl: SslTool,
  page: PageInspectorTool,
  schema: SchemaDetectorTool,
  sitemap: SitemapRobotsTool,
};

export default function FreeTools() {
  const [tab, setTab] = useState('autocomplete');
  const Active = TOOLS[tab];
  const meta = TABS.find(t => t.id === tab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader icon={Zap} title="Free Data Tools" badge="Zero cost"
          subtitle="Keyless, server-side tools that work for every user. No API keys required — great for quick research and technical checks."
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                ...btnGhost, padding: '8px 14px', fontSize: 12.5,
                background: tab === t.id ? `${ACCENT}18` : 'transparent',
                borderColor: tab === t.id ? ACCENT : 'var(--border)',
                color: tab === t.id ? ACCENT : 'var(--text)',
              }}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader icon={meta.icon} title={meta.title}
          badge={{
            site: 'RDAP + DoH', ssl: 'SSL Labs', autocomplete: 'Google',
            page: 'Live fetch', schema: 'JSON-LD', sitemap: 'robots.txt',
          }[meta.id] || 'Free'}
          subtitle={meta.subtitle}
        />
        <Active />
      </Card>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, padding: '0 4px', flexWrap: 'wrap' }}>
        <Badge color="#14b8a6">Free</Badge>
        <span>All calls run on the shared backend so they work for every user. Best-effort: if a provider is slow or unreachable the tool shows a clean fallback instead of failing.</span>
      </div>
    </div>
  );
}
