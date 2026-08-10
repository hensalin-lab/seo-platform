import React, { useState } from 'react';
import { Globe, ChevronDown, Info, AlertTriangle, CheckCircle, Eye } from 'lucide-react';

const GOOGLEBOT_GUIDE = [
  {
    key: 'rendered_html_size',
    label: 'Rendered HTML Size',
    what: 'The total size of the HTML document Googlebot receives when it crawls this page.',
    why: 'A bloated HTML document (500 KB+) slows crawling and parsing, and delays the moment the browser can paint useful content.',
    how: 'Open the page in Chrome DevTools → Network → reload, and read the document size. Remove unused markup, comments and inlined bloat to slim it down.',
    isGood: (v, data) => (data?.html_available === false ? null : Number(v) > 0),
    format: v => (v >= 1024 ? `${(v / 1024).toFixed(1)} KB` : `${v} B`),
  },
  {
    key: 'javascript_required',
    label: 'Javascript Required',
    what: 'Whether the page needs JavaScript to produce its visible content.',
    why: 'Googlebot does render JavaScript, but pages that depend on it index more slowly and can lose content when a script fails.',
    how: 'Serve the essential content in the raw HTML (server-side render or prerender) and keep JavaScript for enhancement only.',
    isGood: v => v === false,
  },
  {
    key: 'resource_blocking',
    label: 'Resource Blocking',
    what: 'Whether render-blocking stylesheets or scripts delay how quickly the page content appears.',
    why: 'Blocking resources push out Largest Contentful Paint (LCP) and hurt Core Web Vitals — a ranking and user-experience risk.',
    how: 'Inline critical CSS, load scripts with async/defer, and preload the largest image so it is fetched early.',
    isGood: v => v === false,
  },
  {
    key: 'server_rendered',
    label: 'Server Rendered',
    what: 'Whether the server returns ready-to-parse HTML rather than an empty shell that JavaScript must fill in.',
    why: 'Server-rendered HTML is crawled and indexed faster and more reliably, and the content stays visible even when JavaScript fails.',
    how: 'Use SSR or static generation (Next.js, Nuxt, Astro) so the delivered HTML already contains your text.',
    isGood: v => v === true,
  },
  {
    key: 'meta_tags_present',
    label: 'Meta Tags Present',
    what: 'Whether the page defines a meta description or Open Graph description.',
    why: 'Google uses the meta description for the search snippet; without one it auto-generates a less controlled snippet.',
    how: 'Add a unique 140–160 character meta description in the <head> that summarizes the page.',
    isGood: v => v === true,
  },
  {
    key: 'canonical_correct',
    label: 'Canonical Correct',
    what: 'Whether the page declares a canonical URL that points back to itself.',
    why: 'The canonical tag tells Google which URL is authoritative, preventing duplicate-content dilution across similar URLs.',
    how: 'Add <link rel="canonical" href="[this exact URL]" /> to the <head> and keep internal links pointing at one version.',
    isGood: v => v === true,
  },
  {
    key: 'robots_directive',
    label: 'Robots Directive',
    what: 'The robots meta directive that controls how Googlebot crawls and indexes this page.',
    why: 'noindex removes the page from search results; nofollow tells Google not to follow its links.',
    how: 'Keep index,follow for pages you want ranked. Reserve noindex for thin, duplicate or admin pages.',
    isGood: v => !/noindex/i.test(v || ''),
  },
  {
    key: 'xml_sitemap_inclusion',
    label: 'XML Sitemap Inclusion',
    what: 'Whether this page is eligible to be listed in an XML sitemap (i.e. it is not blocked by noindex/nosnippet).',
    why: 'Sitemap-eligible pages are discovered faster and prioritized during crawling.',
    how: 'Submit a sitemap in Google Search Console and keep it current with your indexable URLs.',
    isGood: v => v === true,
  },
];

function GooglebotRow({ label, value, good, format, guide }) {
  const [expanded, setExpanded] = useState(false);
  const status = good === null ? 'info' : good ? 'pass' : 'fail';
  const colors = {
    pass: { dot: '#059669', text: '#059669', chip: 'rgba(5,150,105,0.12)' },
    fail: { dot: '#dc2626', text: '#dc2626', chip: 'rgba(220,38,38,0.10)' },
    info: { dot: '#0ea5e9', text: '#0369a1', chip: 'rgba(14,165,233,0.12)' },
  };
  const c = colors[status];
  const display = format ? format(value) : String(value);

  return (
    <div style={{ border: '1px solid #eef2f7', borderRadius: 8, marginBottom: 6, background: 'var(--bg-white, #fff)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ width: 9, height: 9, borderRadius: 5, background: c.dot, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: c.chip, color: c.text }}>
          {status === 'pass' ? 'PASS' : status === 'fail' ? 'FIX' : 'INFO'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{display}</span>
        <ChevronDown size={14} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
      </button>
      {expanded && (
        <div style={{ padding: '0 12px 12px', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
          <div style={{ marginBottom: 6 }}><strong style={{ color: '#334155' }}>What it means:</strong> {guide.what}</div>
          <div style={{ marginBottom: 6 }}><strong style={{ color: '#334155' }}>Why it matters:</strong> {guide.why}</div>
          <div><strong style={{ color: '#334155' }}>How to fix / verify:</strong> {guide.how}</div>
        </div>
      )}
    </div>
  );
}

export default function GooglebotView({ data }) {
  if (!data || typeof data !== 'object') {
    return <div style={{ padding: 16, color: 'var(--text-muted, #6b7280)', fontSize: 12 }}>No Googlebot data</div>;
  }

  const htmlAvailable = data.html_available !== false;
  const guideKeys = GOOGLEBOT_GUIDE.map(g => g.key);
  const extra = Object.entries(data).filter(([k]) => k !== 'html_available' && !guideKeys.includes(k));

  return (
    <div style={{ background: 'var(--bg-white, #fff)', borderRadius: 12, border: '1px solid var(--border, #e5e7eb)', padding: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Globe size={18} color="#3b82f6" /> How Google Sees This Page
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 14 }}>
        This is exactly what Googlebot crawls, indexes, and uses to rank your page
      </div>

      {!htmlAvailable && (
        <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)', color: '#075985', fontSize: 12, lineHeight: 1.6 }}>
          <Info size={15} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>
            <strong>Checked from stored crawl data.</strong> The raw HTML is cleared after an audit to save space, so byte-exact checks (HTML size, script analysis) are estimated here. The meta, canonical and robots checks below are read from the snapshot and are exact. Re-run the audit or use a live crawl for full precision.
          </span>
        </div>
      )}

      {GOOGLEBOT_GUIDE.map(g => {
        const value = data[g.key];
        if (value === null || value === undefined) return null;
        let good = g.isGood(value, data);
        if (typeof good === 'function') good = good(value, data);
        return (
          <GooglebotRow
            key={g.key}
            label={g.label}
            value={value}
            good={good}
            format={g.format}
            guide={g}
          />
        );
      })}

      {extra.map(([key, value]) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'boolean') {
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', flex: 1 }}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: value ? '#059669' : '#dc2626' }}>{value ? 'Yes' : 'No'}</span>
            </div>
          );
        }
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', flex: 1 }}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{Array.isArray(value) ? value.length : String(value)}</span>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>
        <CheckCircle size={12} color="#059669" /> Pass — Googlebot is fine with this.&nbsp;&nbsp;
        <AlertTriangle size={12} color="#dc2626" /> Fix — blocks or weakens ranking.&nbsp;&nbsp;
        <Eye size={12} color="#0ea5e9" /> Tap any row for details.
      </div>
    </div>
  );
}
