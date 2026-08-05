import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import ProtectedAction from '../../../components/ProtectedAction';
import {
  Layers, Plus, Edit3, Trash2, Play, FileJson, FileSpreadsheet, Upload,
  Eye, Database, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle2,
  Download, FileText, Sparkles, Grid3x3, Settings2, Link2, ListChecks,
} from 'lucide-react';

const SCHEMA_TYPES = [
  'Article', 'LocalBusiness', 'Service', 'Product', 'FAQPage', 'BreadcrumbList',
  'Course', 'Event', 'SoftwareApplication',
];

const PRESETS = [
  {
    name: 'Local Business (City × Service)',
    data: {
      name: 'Local Service Pages',
      description: 'City × service landing pages with LocalBusiness schema and FAQ.',
      base_url: 'https://example.com',
      url_pattern: '/{city|slug}/{service|slug}',
      title_template: '{service} in {city}, {state} | Acme Co.',
      meta_template: 'Compare trusted {service} providers in {city}, {state}. Transparent pricing, local expertise, and vetted pros.',
      h1_template: 'Best {service} in {city}, {state}',
      sections: [
        { heading: 'Why Choose {service} in {city}', body: 'Hiring a {service} pro in {city}, {state} matters because local teams understand building codes, climate, and community standards. We compare licensed, insured providers so you can book with confidence. Get matched with vetted {service} experts near you today. ', keywords: '{service} {city}' },
        { heading: 'What {service} Costs in {city}', body: 'Pricing for {service} in {city} depends on scope, materials, and season. Get free quotes from local providers and compare transparent, itemized estimates before you commit. ', keywords: '{service} cost {city}' },
      ],
      schema_type: 'LocalBusiness',
      schema_fields: { '@type': 'LocalBusiness', name: '{service} in {city}', address: { addressLocality: '{city}', addressRegion: '{state}' }, description: '{service} providers in {city}, {state}' },
      faq_enabled: true,
      faq_section: [
        { q: 'How much does {service} cost in {city}?', a: 'Most {service} projects in {city} range from $150 to $5,000 depending on scope. Request free quotes for exact pricing.' },
        { q: 'How do I find a reliable {service} in {city}?', a: 'Look for licensed, insured providers with verified reviews in {city} and compare multiple quotes before deciding.' },
      ],
      min_words_target: 800,
    },
  },
  {
    name: 'Blog Articles (Topic × Region)',
    data: {
      name: 'Regional Topic Articles',
      description: 'Programmatic articles targeting topic + region with Article schema.',
      base_url: 'https://example.com',
      url_pattern: '/blog/{topic|slug}-in-{region|slug}',
      title_template: '{topic} in {region}: Complete Guide ({year})',
      meta_template: 'Everything you need to know about {topic} in {region} — costs, tips, and local recommendations for {year}.',
      h1_template: '{topic} in {region}: The Complete Guide',
      sections: [
        { heading: '{topic} in {region} at a Glance', body: 'Residents of {region} increasingly search for {topic} before making decisions. This guide covers the essentials, from what to expect to how to choose the right option for your situation. ', keywords: '{topic} {region}' },
        { heading: 'Local Tips for {region}', body: 'Local considerations in {region} can change everything. Understand the regional factors, common pitfalls, and expert advice before committing. ', keywords: '' },
      ],
      schema_type: 'Article',
      schema_fields: { '@type': 'Article', headline: '{topic} in {region} Guide', about: '{topic} in {region}' },
      faq_enabled: true,
      faq_section: [
        { q: 'What should I know about {topic} in {region}?', a: 'Start with local regulations and provider reputation, then compare options tailored to {region}.' },
      ],
      min_words_target: 1000,
    },
  },
];

function LoadingSpinner({ message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#8b5cf6', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>{message || 'Loading...'}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Card({ children, style, className }) {
  return (
    <div className={className} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', ...style }}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, badge, iconColor = '#8b5cf6', actions, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
      {Icon && (
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={iconColor} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          {badge && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.14)', color: '#8b5cf6' }}>{badge}</span>}
        </div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {actions}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: 13, outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 6, display: 'block',
};

const btnPrimary = {
  padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#8b5cf6', color: '#fff', fontSize: 13, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 7,
};

const btnGhost = {
  padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
};

const btnDanger = {
  ...btnGhost,
  color: '#ef4444', borderColor: 'rgba(239,68,68,0.35)',
};

function Field({ label, children, style }) {
  return (
    <div style={{ flex: 1, minWidth: 200, ...style }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function TemplateEditor({ template, onSave, onCancel, onDelete }) {
  const isNew = !template.id;
  const [form, setForm] = useState(() => {
    if (template.id) {
      return {
        ...template,
        schema_fields: JSON.stringify(template.schema_fields || {}, null, 2),
      };
    }
    return {
      name: '', description: '', base_url: '', url_pattern: '',
      title_template: '', meta_template: '', h1_template: '',
      sections: [{ heading: '', body: '', keywords: '' }],
      schema_type: 'Article',
      schema_fields: '{\n  "@type": "Article",\n  "headline": "{title}"\n}',
      faq_enabled: false,
      faq_section: [{ q: '', a: '' }],
      min_words_target: 800,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [applyingPreset, setApplyingPreset] = useState('');

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const applyPreset = (preset) => {
    setApplyingPreset(preset.name);
    setForm({ ...preset.data, schema_fields: JSON.stringify(preset.data.schema_fields, null, 2) });
    setTimeout(() => setApplyingPreset(''), 300);
  };

  const updateSection = (i, key, value) => {
    const sections = form.sections.map((s, j) => (j === i ? { ...s, [key]: value } : s));
    set('sections', sections);
  };

  const updateFaq = (i, key, value) => {
    const faq = form.faq_section.map((s, j) => (j === i ? { ...s, [key]: value } : s));
    set('faq_section', faq);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Template name is required.'); return; }
    let schemaFields = {};
    try {
      schemaFields = form.schema_fields.trim() ? JSON.parse(form.schema_fields) : {};
    } catch {
      setError('Schema fields must be valid JSON.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      description: form.description || '',
      base_url: form.base_url || '',
      url_pattern: form.url_pattern || '',
      title_template: form.title_template || '',
      meta_template: form.meta_template || '',
      h1_template: form.h1_template || '',
      sections: (form.sections || []).filter(s => s.heading || s.body).map(s => ({ heading: s.heading || '', body: s.body || '', keywords: s.keywords || '' })),
      schema_type: form.schema_type || 'Article',
      schema_fields: schemaFields,
      faq_enabled: !!form.faq_enabled,
      faq_section: (form.faq_section || []).filter(f => f.q || f.a).map(f => ({ q: f.q || '', a: f.a || '' })),
      min_words_target: Number(form.min_words_target) || 800,
    };
    try {
      await onSave(payload);
    } catch (e) {
      setError(e.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={isNew ? Plus : Edit3}
        title={isNew ? 'New Template' : `Edit Template`}
        iconColor="#8b5cf6"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnGhost} onClick={onCancel}><X size={13} /> Cancel</button>
            {!isNew && onDelete && (
              <button style={btnDanger} onClick={() => { if (window.confirm('Delete this template, its entries and generated pages?')) onDelete(form.id); }}>
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button style={btnPrimary} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : isNew ? 'Create Template' : 'Save Changes'}
            </button>
          </div>
        }
      />

      {!isNew && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quick start:</span>
          {PRESETS.map(p => (
            <button key={p.name} style={btnGhost} onClick={() => applyPreset(p)}>
              <Sparkles size={13} /> {applyingPreset === p.name ? 'Applied!' : p.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Field label="Name *">
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. City Service Pages" />
          </Field>
          <Field label="Description">
            <input style={inputStyle} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What are these pages for?" />
          </Field>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings2 size={14} color="#8b5cf6" /> URL & Meta Templates
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Field label="Base URL">
                <input style={inputStyle} value={form.base_url} onChange={e => set('base_url', e.target.value)} placeholder="https://example.com" />
              </Field>
              <Field label="URL Pattern" style={{ flex: 2 }}>
                <input style={inputStyle} value={form.url_pattern} onChange={e => set('url_pattern', e.target.value)} placeholder="/{city|slug}/{service|slug}" />
              </Field>
            </div>
            <Field label="Title Template">
              <input style={inputStyle} value={form.title_template} onChange={e => set('title_template', e.target.value)} placeholder="{service} in {city}, {state} | Acme" />
            </Field>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Field label="Meta Description Template">
                <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} value={form.meta_template} onChange={e => set('meta_template', e.target.value)} placeholder="Best {service} in {city}..." />
              </Field>
              <Field label="H1 Template">
                <input style={inputStyle} value={form.h1_template} onChange={e => set('h1_template', e.target.value)} placeholder="Best {service} in {city}, {state}" />
              </Field>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ListChecks size={14} color="#8b5cf6" /> Body Sections <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>(min target: {form.min_words_target} words)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form.sections.map((sec, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input style={inputStyle} value={sec.heading} onChange={e => updateSection(i, 'heading', e.target.value)} placeholder={`Section ${i + 1} heading`} />
                  <input style={{ ...inputStyle, flex: 0.6 }} value={sec.keywords} onChange={e => updateSection(i, 'keywords', e.target.value)} placeholder="keywords" />
                  <button style={btnDanger} onClick={() => set('sections', form.sections.filter((_, j) => j !== i))}><X size={14} /></button>
                </div>
                <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={sec.body} onChange={e => updateSection(i, 'body', e.target.value)} placeholder="Body text with {placeholders}..." />
              </div>
            ))}
            <div>
              <button style={btnGhost} onClick={() => set('sections', [...form.sections, { heading: '', body: '', keywords: '' }])}>
                <Plus size={13} /> Add Section
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Field label="Schema Type">
            <select style={inputStyle} value={form.schema_type} onChange={e => set('schema_type', e.target.value)}>
              {SCHEMA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Min Words Target">
            <input type="number" style={inputStyle} value={form.min_words_target} onChange={e => set('min_words_target', e.target.value)} />
          </Field>
          <Field label="FAQ" style={{ maxWidth: 220, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={!!form.faq_enabled}
              onChange={e => set('faq_enabled', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#8b5cf6', cursor: 'pointer', marginTop: 18 }}
            />
            <span style={{ fontSize: 13, color: 'var(--text)', marginTop: 18 }}>Generate FAQ section</span>
          </Field>
        </div>

        <Field label="Schema Fields (JSON)">
          <textarea style={{ ...inputStyle, minHeight: 110, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} value={form.schema_fields} onChange={e => set('schema_fields', e.target.value)} />
        </Field>

        {form.faq_enabled && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>FAQ Items</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {form.faq_section.map((f, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input style={inputStyle} value={f.q} onChange={e => updateFaq(i, 'q', e.target.value)} placeholder="Question template" />
                    <button style={btnDanger} onClick={() => set('faq_section', form.faq_section.filter((_, j) => j !== i))}><X size={14} /></button>
                  </div>
                  <textarea style={{ ...inputStyle, minHeight: 54, resize: 'vertical' }} value={f.a} onChange={e => updateFaq(i, 'a', e.target.value)} placeholder="Answer template" />
                </div>
              ))}
              <div>
                <button style={btnGhost} onClick={() => set('faq_section', [...form.faq_section, { q: '', a: '' }])}>
                  <Plus size={13} /> Add FAQ
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Create Template' : 'Save Changes'}
          </button>
          <button style={btnGhost} onClick={onCancel}><X size={13} /> Cancel</button>
        </div>
      </div>
    </Card>
  );
}

function EntriesTab({ templateId, onEntriesChanged }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [csvText, setCsvText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getProgrammaticEntries(templateId);
      setEntries(res.entries || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => { load(); }, [load]);

  const flash = (msg, isError = false) => {
    setMessage(isError ? '' : msg);
    setError(isError ? msg : '');
    if (!isError) setTimeout(() => setMessage(''), 3000);
  };

  const handleAddJson = async () => {
    let parsed;
    try {
      parsed = JSON.parse(jsonText.trim());
    } catch {
      flash('Invalid JSON — paste an array of objects like [{ "city": "Austin", "service": "Plumbing" }]', true);
      return;
    }
    if (!Array.isArray(parsed)) { flash('JSON must be an array of objects.', true); return; }
    setBusy(true);
    try {
      const res = await api.addProgrammaticEntries(templateId, parsed);
      flash(`Added ${res.added} entries.`);
      setJsonText('');
      await load();
      onEntriesChanged();
    } catch (e) {
      flash(e.message, true);
    } finally {
      setBusy(false);
    }
  };

  const handleCsvFile = async (file) => {
    const text = await file.text();
    setCsvText(text);
  };

  const handleParseCsv = async () => {
    if (!csvText.trim()) return;
    setBusy(true);
    try {
      const res = await api.parseProgrammaticCsv(csvText);
      const added = await api.addProgrammaticEntries(templateId, res.entries || [], true);
      flash(`Parsed ${res.total} rows, added ${added.added} entries.`);
      setCsvText('');
      await load();
      onEntriesChanged();
    } catch (e) {
      flash(e.message, true);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm(`Clear all ${entries.length} entries?`)) return;
    try {
      await api.clearProgrammaticEntries(templateId);
      flash('Entries cleared.');
      await load();
      onEntriesChanged();
    } catch (e) {
      flash(e.message, true);
    }
  };

  const keys = [];
  for (const e of entries) {
    for (const k of Object.keys(e.data || {})) {
      if (!keys.includes(k)) keys.push(k);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={Database}
          title="Add Entries"
          subtitle={`${entries.length} stored entries`}
          badge={entries.length > 0 ? `${entries.length} rows` : 'empty'}
          actions={<button style={btnDanger} onClick={handleClear}><Trash2 size={13} /> Clear All</button>}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>CSV import (replace existing)</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ ...btnGhost, cursor: 'pointer' }}>
                <Upload size={13} /> Choose CSV file
                <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleCsvFile(e.target.files[0]); }} />
              </label>
              <button style={btnPrimary} onClick={handleParseCsv} disabled={!csvText.trim() || busy}>
                {busy ? 'Importing...' : 'Parse & Import'}
              </button>
            </div>
            {csvText && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>First 10 lines preview</div>
                <pre style={{ maxHeight: 180, overflow: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {csvText.split('\n').slice(0, 10).join('\n')}
                </pre>
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>JSON entries (append)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 120, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder='[{"city":"Austin","state":"Texas","service":"Plumbing"},{"city":"Denver","state":"Colorado","service":"Roofing"}]'
            />
            <div style={{ marginTop: 8 }}>
              <button style={btnPrimary} onClick={handleAddJson} disabled={!jsonText.trim() || busy}>
                {busy ? 'Adding...' : 'Add from JSON'}
              </button>
            </div>
          </div>
        </div>
        {message && <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 13 }}>{message}</div>}
        {error && <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>{error}</div>}
      </Card>

      <Card>
        <CardHeader icon={FileText} title="Stored Entries" badge={`${entries.length} rows`} />
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading entries...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No entries yet. Import a CSV or paste JSON above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)' }}>#</th>
                  {keys.map(k => <th key={k} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)' }}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 100).map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--bg-secondary)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{i + 1}</td>
                    {keys.map(k => <td key={k} style={{ padding: '8px 10px', color: 'var(--text)' }}>{String(e.data?.[k] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length > 100 && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>Showing first 100 of {entries.length} entries.</div>}
          </div>
        )}
      </Card>
    </div>
  );
}

function warningBadge(w) {
  const color = w.type === 'thin_content' ? '#f59e0b' : '#ef4444';
  return { color, bg: `${color}1a` };
}

function GenerateTab({ templateId, entryCount = 0, onGenerated }) {
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');

  const knownEntries = totalEntries || entryCount;

  const handlePreview = async () => {
    setPreviewing(true);
    setResult(null);
    try {
      const res = await api.previewProgrammatic(templateId, [], 5);
      setPreview(res.preview || []);
      setErrors(res.errors || []);
      setTotalEntries(res.total_entries || 0);
    } catch (e) {
      setMessage(e.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const res = await api.generateProgrammatic(templateId);
      setResult(res);
      onGenerated();
    } catch (e) {
      setMessage(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={Play}
          title="Preview & Generate"
          subtitle={`${knownEntries} entries ready`}
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnGhost} onClick={handlePreview} disabled={previewing}>
                <Eye size={13} /> {previewing ? 'Previewing...' : 'Preview 5 Pages'}
              </button>
              <ProtectedAction requiredRole="EDITOR">
                <button style={btnPrimary} onClick={handleGenerate} disabled={generating || knownEntries === 0}>
                  {generating ? 'Generating...' : 'Generate All Pages'}
                </button>
              </ProtectedAction>
            </div>
          }
        />
        {message && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>{message}</div>}
        {result && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              {[
                { label: 'Pages Generated', value: result.generated, color: '#22c55e' },
                { label: 'Errors', value: result.error_count, color: result.error_count ? '#ef4444' : '#22c55e' },
                { label: 'Warnings', value: result.warning_count, color: result.warning_count ? '#f59e0b' : '#22c55e' },
                { label: 'Duplicate URLs', value: result.duplicate_urls, color: result.duplicate_urls ? '#ef4444' : '#22c55e' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            {result.generated > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={15} /> Successfully generated {result.generated} pages. Open the Pages tab to review and export.
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader icon={Eye} title="Preview" badge={`${preview.length} pages`} />
        {errors.length > 0 && (
          <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {errors.map((e, i) => (
              <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 12 }}>
                #{e.index ?? '?'}: {e.message}
              </div>
            ))}
          </div>
        )}
        {preview.length === 0 && !previewing ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Click "Preview 5 Pages" to see how entries expand before generating.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {preview.map((p, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#8b5cf6', wordBreak: 'break-all', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{p.url}</div>
                    {p.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>{p.word_count} words</span>
                    {p.schema_markup?.[0]?.['@type'] && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'rgba(8,145,178,0.12)', color: '#0891b2' }}>{p.schema_markup[0]['@type']}</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{p.meta_description}</div>
                {p.internal_links && p.internal_links.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {p.internal_links.slice(0, 4).map((l, j) => (
                      <span key={j} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Link2 size={11} /> {l.url.split('/').filter(Boolean).slice(-2).join('/')}
                      </span>
                    ))}
                  </div>
                )}
                {p.warnings && p.warnings.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {p.warnings.map((w, j) => {
                      const b = warningBadge(w);
                      return (
                        <span key={j} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, background: b.bg, color: b.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={11} /> {w.message}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function downloadContent(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function PagesTab({ templateId, onDeleted }) {
  const [pages, setPages] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getProgrammaticPages(templateId, offset, limit);
      setPages(res.pages || []);
      setTotal(res.total || 0);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [templateId, offset, limit]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (format) => {
    try {
      const res = await api.exportProgrammatic(templateId, format);
      const mime = format === 'csv' ? 'text/csv' : format === 'sitemap' ? 'application/xml' : 'application/json';
      downloadContent(res.filename, res.content, mime);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm('Delete this generated page?')) return;
    try {
      await api.deleteProgrammaticPage(pageId);
      await load();
      onDeleted();
    } catch (e) {
      setError(e.message);
    }
  };

  const hasMore = offset + pages.length < total;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={FileJson}
          title="Generated Pages"
          badge={`${total} pages`}
          subtitle="Export to JSON, CSV, or XML sitemap"
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnGhost} onClick={() => handleExport('json')}><Download size={13} /> JSON</button>
              <button style={btnGhost} onClick={() => handleExport('csv')}><FileSpreadsheet size={13} /> CSV</button>
              <button style={btnGhost} onClick={() => handleExport('sitemap')}><Grid3x3 size={13} /> Sitemap</button>
            </div>
          }
        />
        {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading pages...</div>
        ) : pages.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No generated pages yet. Use the Generate tab to build pages from your entries.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)' }}>URL</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)' }}>Title</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)' }}>Words</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)' }}>Schema</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)' }}>Warnings</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)' }}></th>
                </tr>
              </thead>
              <tbody>
                {pages.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--bg-secondary)', verticalAlign: 'top' }}>
                    <td style={{ padding: '8px 10px', color: '#8b5cf6', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.url}>{p.url}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text)', maxWidth: 260 }}>{p.title}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>{p.word_count}</td>
                    <td style={{ padding: '8px 10px', color: '#0891b2' }}>{(p.schema_markup || []).map(s => s['@type']).filter(Boolean).join(', ')}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {p.warnings && p.warnings.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {p.warnings.map((w, j) => {
                            const b = warningBadge(w);
                            return <span key={j} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: b.bg, color: b.color, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'max-content' }}><AlertTriangle size={10} /> {w.message}</span>;
                          })}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={11} /> Clean</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <button style={btnDanger} onClick={() => handleDeletePage(p.id)} title="Delete page"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button style={btnGhost} onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}><ChevronLeft size={14} /></button>
              <button style={btnGhost} onClick={() => setOffset(offset + limit)} disabled={!hasMore}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ProgrammaticSeo() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorTemplate, setEditorTemplate] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [tab, setTab] = useState('entries');
  const [error, setError] = useState('');

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listProgrammaticTemplates();
      setTemplates(res.templates || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeTemplateId && !templates.find(t => t.id === activeTemplateId)) {
      setActiveTemplateId(null);
    }
  }, [templates, activeTemplateId]);

  const handleSaveTemplate = async (payload) => {
    if (editorTemplate && editorTemplate.id) {
      await api.updateProgrammaticTemplate(editorTemplate.id, payload);
    } else {
      await api.createProgrammaticTemplate(payload);
    }
    await load();
    setEditorOpen(false);
    setEditorTemplate(null);
  };

  const handleDeleteTemplate = async (id) => {
    await api.deleteProgrammaticTemplate(id);
    if (activeTemplateId === id) setActiveTemplateId(null);
    await load();
    setEditorOpen(false);
    setEditorTemplate(null);
  };

  const openEditor = (t) => {
    setEditorTemplate(t || null);
    setEditorOpen(true);
  };

  if (loading) return <LoadingSpinner message="Loading Programmatic SEO..." />;

  if (!activeTemplate) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24, color: 'var(--text)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={24} color="#8b5cf6" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Programmatic SEO</h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Build template-driven pages at scale</p>
            </div>
          </div>
          <ProtectedAction requiredRole="EDITOR">
            <button style={{ ...btnPrimary, padding: '10px 20px' }} onClick={() => openEditor(null)}><Plus size={15} /> New Template</button>
          </ProtectedAction>
        </div>

        {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>{error}</div>}

        {templates.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center' }}>
            <Layers size={44} color="var(--text-muted)" opacity={0.5} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>No templates yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.5 }}>
                Create a template with URL, title and section patterns, then import entries (CSV or JSON) to generate hundreds of optimized landing pages.
              </div>
            </div>
            <ProtectedAction requiredRole="EDITOR">
              <button style={btnPrimary} onClick={() => openEditor(null)}><Plus size={14} /> Create your first template</button>
            </ProtectedAction>
          </div>
        )}

        {templates.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {templates.map(t => (
              <div key={t.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Layers size={17} color="#8b5cf6" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t.name}</div>
                    {t.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{t.description}</div>}
                  </div>
                </div>
                {t.url_pattern && (
                  <div style={{ fontSize: 12, color: '#8b5cf6', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, padding: '8px 10px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.base_url}{t.url_pattern}</div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>{t.entry_count || 0} entries</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>{t.page_count || 0} pages</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>{t.schema_type}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }} onClick={() => setActiveTemplateId(t.id)}><Settings2 size={13} /> Open</button>
                  <button style={btnGhost} onClick={() => openEditor(t)}><Edit3 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const tabs = [
    { key: 'entries', label: 'Entries', icon: Database },
    { key: 'generate', label: 'Preview & Generate', icon: Play },
    { key: 'pages', label: `Pages (${activeTemplate.page_count || 0})`, icon: FileJson },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, color: 'var(--text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button style={btnGhost} onClick={() => { setActiveTemplateId(null); }}><ChevronLeft size={15} /> Templates</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={18} color="#8b5cf6" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{activeTemplate.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activeTemplate.entry_count || 0} entries · {activeTemplate.page_count || 0} pages</div>
          </div>
        </div>
        <button style={btnGhost} onClick={() => openEditor(activeTemplate)}><Edit3 size={13} /> Edit Template</button>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
                color: active ? '#8b5cf6' : 'var(--text-muted)',
              }}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'entries' && <EntriesTab templateId={activeTemplate.id} onEntriesChanged={load} />}
      {tab === 'generate' && <GenerateTab templateId={activeTemplate.id} entryCount={activeTemplate.entry_count || 0} onGenerated={load} />}
      {tab === 'pages' && <PagesTab templateId={activeTemplate.id} onDeleted={load} />}

      {editorOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
          <div style={{ width: '100%', maxWidth: 900 }}>
            <TemplateEditor
              template={editorTemplate || {}}
              onSave={handleSaveTemplate}
              onCancel={() => { setEditorOpen(false); setEditorTemplate(null); }}
              onDelete={handleDeleteTemplate}
            />
          </div>
        </div>
      )}
    </div>
  );
}
