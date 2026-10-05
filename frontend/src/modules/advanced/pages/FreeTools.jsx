import { useState } from 'react';
import { api } from '../../../api';
import {
  Search, Globe, ShieldCheck, Zap, RefreshCw, ExternalLink,
  Shield, AlertTriangle, Clock, Landmark, Calendar,
  FileText, Braces, Map, TerminalSquare, Layers, Copy, Check, Download,
} from 'lucide-react';
import {
  Card, CardHeader, Badge, LoadingSpinner, inputStyle, labelStyle,
  btnPrimary, btnGhost,
} from './ui';

const ACCENT = '#8b5cf6';

const TABS = [
  { id: 'pagekw', icon: Layers, label: 'Unlimited Page Keywords', title: 'Unlimited Keywords From Any Page', subtitle: 'Paste a URL, get hundreds of real Google Suggest keywords for that page — no key, no quota, no page limit.' },
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

const PAGE_SIZE = 100;

const INTENT_STYLE = {
  informational: { label: 'Informational', color: '#3b82f6', bg: '#eff6ff' },
  commercial: { label: 'Commercial', color: '#8b5cf6', bg: '#f5f3ff' },
  transactional: { label: 'Transactional', color: '#059669', bg: '#f0fdf4' },
  navigational: { label: 'Navigational', color: '#64748b', bg: '#f1f5f9' },
};

// The headline tool: one URL in, hundreds of real suggestions out.
function PageKeywordsTool() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [depth, setDepth] = useState(260);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [intent, setIntent] = useState('all');
  const [copied, setCopied] = useState(false);

  const run = async (e) => {
    e?.preventDefault?.();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setPage(0);
    try {
      const res = await api.freePageKeywords(url.trim(), depth);
      setData(res);
      if (res?.error) setError(res.error);
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const all = data?.keywords || [];
  const filtered = all.filter(k => {
    if (intent !== 'all' && k.intent !== intent) return false;
    if (search && !k.keyword.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(filtered.map(k => k.keyword).join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked; not fatal */ }
  };

  const intentCounts = (data?.stats?.intent_breakdown) || {};

  return (
    <div>
      <form onSubmit={run} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com/your-page"
          style={{ ...inputStyle, flex: 1, minWidth: 240 }}
        />
        <select
          value={depth}
          onChange={e => setDepth(Number(e.target.value))}
          style={{ ...inputStyle, width: 'auto' }}
          title="How many Google Suggest queries to fan out across"
        >
          <option value={120}>Quick (120 queries)</option>
          <option value={260}>Standard (260 queries)</option>
          <option value={450}>Deep (450 queries)</option>
        </select>
        <button type="submit" style={btnPrimary} disabled={loading}>
          {loading ? <RefreshCw size={14} className="spin" /> : <Layers size={14} />} Get keywords
        </button>
      </form>

      {error && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</div>}
      {loading && <LoadingSpinner message="Reading the page and expanding via Google Suggest…" />}

      {data && !loading && !data.error && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 16 }}>
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>{data.stats.total}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Keywords found</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed' }}>{data.stats.long_tail}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Long-tail</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{data.stats.short_tail}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Short-tail</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0d9488' }}>{data.stats.requests_made}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Suggest queries</div>
            </div>
          </div>

          {data.seeds?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Seeds read from the page ({data.seeds.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.seeds.map(s => (
                  <span key={s} style={{ padding: '3px 9px', borderRadius: 999, background: `${ACCENT}14`, color: ACCENT, fontSize: 11, fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Filter keywords…"
              style={{ ...inputStyle, flex: 1, minWidth: 180 }}
            />
            <select
              value={intent}
              onChange={e => { setIntent(e.target.value); setPage(0); }}
              style={{ ...inputStyle, width: 'auto' }}
            >
              <option value="all">All intents</option>
              {Object.entries(INTENT_STYLE).filter(([k]) => intentCounts[k]).map(([k, v]) => (
                <option key={k} value={k}>{v.label} ({intentCounts[k]})</option>
              ))}
            </select>
            <button style={btnGhost} onClick={copyAll} disabled={!filtered.length}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy all'}
            </button>
          </div>

          <div style={{ marginTop: 12, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    {['Keyword', 'Intent', 'Type', 'Demand'].map((h, i) => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                        color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
                        width: i === 0 ? 'auto' : 110,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((k, i) => {
                    const st = INTENT_STYLE[k.intent] || INTENT_STYLE.commercial;
                    return (
                      <tr key={k.keyword + i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '7px 12px', color: 'var(--text)', fontWeight: 500 }}>{k.keyword}</td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
                          {k.tail === 'long-tail' ? 'Long' : 'Short'}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 34, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${k.demand_score}%`, height: '100%', background: '#0d9488' }} />
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{k.demand_score}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!visible.length && (
                    <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No keywords match that filter.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12, color: 'var(--text-muted)', gap: 10, flexWrap: 'wrap' }}>
            <span>
              {filtered.length ? safePage * PAGE_SIZE + 1 : 0}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setPage(safePage - 1)} disabled={safePage === 0} style={{ ...btnGhost, opacity: safePage === 0 ? 0.5 : 1 }}>Prev</button>
                <span>Page {safePage + 1} of {totalPages}</span>
                <button onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages - 1} style={{ ...btnGhost, opacity: safePage >= totalPages - 1 ? 0.5 : 1 }}>Next</button>
              </div>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.6 }}>
            {data.data_source_note}
          </div>
        </>
      )}
    </div>
  );
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
  pagekw: PageKeywordsTool,
  autocomplete: AutocompleteTool,
  site: SiteHealthTool,
  ssl: SslTool,
  page: PageInspectorTool,
  schema: SchemaDetectorTool,
  sitemap: SitemapRobotsTool,
};

export default function FreeTools() {
  const [tab, setTab] = useState('pagekw');
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
            pagekw: 'Google · Free',
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
