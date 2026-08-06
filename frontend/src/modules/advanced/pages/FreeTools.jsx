import { useState } from 'react';
import { api } from '../../../api';
import {
  Search, Globe, ShieldCheck, Zap, RefreshCw, ExternalLink,
  Shield, AlertTriangle, Clock, Landmark, Calendar,
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

const TOOLS = {
  autocomplete: AutocompleteTool,
  site: SiteHealthTool,
  ssl: SslTool,
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
          badge={meta.id === 'site' ? 'RDAP + DoH' : meta.id === 'ssl' ? 'SSL Labs' : 'Google'}
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
