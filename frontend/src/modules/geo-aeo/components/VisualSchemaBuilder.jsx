import React, { useState, useMemo, useCallback } from 'react';
import { Code, Copy, CheckCircle, AlertTriangle, FileCode, Plus, Trash2 } from 'lucide-react';

const SCHEMA_TYPES = [
  'Organization',
  'Product',
  'FAQPage',
  'HowTo',
  'Article',
  'BreadcrumbList',
  'Review',
  'VideoObject',
  'LocalBusiness',
  'Person',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'INR', 'BRL', 'MXN'];
const AVAILABILITY_OPTS = [
  { value: 'InStock', label: 'In Stock' },
  { value: 'OutOfStock', label: 'Out of Stock' },
  { value: 'PreOrder', label: 'Pre-Order' },
  { value: 'Discontinued', label: 'Discontinued' },
  { value: 'InStoreOnly', label: 'In Store Only' },
];

const FIELD_DEFS = {
  Organization: [
    { key: 'name', label: 'Organization Name', type: 'text', required: true },
    { key: 'url', label: 'Website URL', type: 'url', placeholder: 'https://example.com' },
    { key: 'logo', label: 'Logo URL', type: 'url', placeholder: 'https://example.com/logo.png' },
    { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
    {
      key: 'contactPoint', label: 'Contact Point', type: 'object',
      fields: [
        { key: 'telephone', label: 'Phone', type: 'text', placeholder: '+1-555-555-5555' },
        { key: 'contactType', label: 'Contact Type', type: 'text', placeholder: 'customer service' },
      ],
    },
    { key: 'sameAs', label: 'Same As URLs', type: 'array-text', placeholder: 'https://facebook.com/yourpage' },
  ],
  Product: [
    { key: 'name', label: 'Product Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { key: 'price', label: 'Price', type: 'text', placeholder: '29.99' },
    { key: 'currency', label: 'Currency', type: 'select', options: CURRENCIES },
    { key: 'availability', label: 'Availability', type: 'select', options: AVAILABILITY_OPTS },
    { key: 'brand', label: 'Brand', type: 'text' },
    {
      key: 'reviews', label: 'Reviews', type: 'array-object',
      fields: [
        { key: 'author', label: 'Reviewer Name', type: 'text' },
        { key: 'ratingValue', label: 'Rating', type: 'text', placeholder: '4.5' },
        { key: 'bestRating', label: 'Best Rating', type: 'text', placeholder: '5' },
        { key: 'reviewBody', label: 'Review Body', type: 'textarea', rows: 2 },
      ],
    },
  ],
  FAQPage: [
    {
      key: 'mainEntity', label: 'Questions & Answers', type: 'array-object', required: true,
      fields: [
        { key: 'question', label: 'Question', type: 'text' },
        { key: 'answer', label: 'Answer', type: 'textarea', rows: 2 },
      ],
    },
  ],
  HowTo: [
    { key: 'name', label: 'How-To Title', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
    {
      key: 'steps', label: 'Steps', type: 'array-object', required: true,
      fields: [
        { key: 'name', label: 'Step Title', type: 'text' },
        { key: 'text', label: 'Instructions', type: 'textarea', rows: 2 },
        { key: 'image', label: 'Image URL', type: 'url', placeholder: 'https://example.com/step1.jpg' },
      ],
    },
  ],
  Article: [
    { key: 'headline', label: 'Headline', type: 'text', required: true },
    { key: 'author', label: 'Author', type: 'text', required: true },
    { key: 'datePublished', label: 'Date Published', type: 'date', required: true },
    { key: 'publisher', label: 'Publisher', type: 'text' },
    { key: 'image', label: 'Image URL', type: 'url', placeholder: 'https://example.com/image.jpg' },
  ],
  BreadcrumbList: [
    {
      key: 'itemListElement', label: 'Breadcrumb Items', type: 'array-object', required: true,
      fields: [
        { key: 'name', label: 'Label', type: 'text' },
        { key: 'url', label: 'URL', type: 'url', placeholder: 'https://example.com/page' },
      ],
    },
  ],
  Review: [
    { key: 'itemReviewed', label: 'Item Reviewed', type: 'text', required: true },
    { key: 'author', label: 'Review Author', type: 'text', required: true },
    { key: 'reviewBody', label: 'Review Body', type: 'textarea', rows: 3 },
    {
      key: 'reviewRating', label: 'Rating', type: 'object',
      fields: [
        { key: 'ratingValue', label: 'Rating Value', type: 'text', placeholder: '4.5' },
        { key: 'bestRating', label: 'Best Rating', type: 'text', placeholder: '5' },
      ],
    },
  ],
  VideoObject: [
    { key: 'name', label: 'Video Title', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea', rows: 3, required: true },
    { key: 'thumbnailUrl', label: 'Thumbnail URL', type: 'url', required: true, placeholder: 'https://example.com/thumb.jpg' },
    { key: 'uploadDate', label: 'Upload Date', type: 'date', required: true },
    { key: 'duration', label: 'Duration (ISO 8601)', type: 'text', placeholder: 'PT1H30M' },
    { key: 'contentUrl', label: 'Content URL', type: 'url', placeholder: 'https://example.com/video.mp4' },
  ],
  LocalBusiness: [
    { key: 'name', label: 'Business Name', type: 'text', required: true },
    { key: 'phone', label: 'Phone', type: 'text', placeholder: '+1-555-555-5555' },
    {
      key: 'address', label: 'Address', type: 'object',
      fields: [
        { key: 'streetAddress', label: 'Street Address', type: 'text' },
        { key: 'addressLocality', label: 'City', type: 'text' },
        { key: 'addressRegion', label: 'State/Region', type: 'text' },
        { key: 'postalCode', label: 'Postal Code', type: 'text' },
        { key: 'addressCountry', label: 'Country', type: 'text', placeholder: 'US' },
      ],
    },
    { key: 'openingHours', label: 'Opening Hours', type: 'textarea', rows: 3, placeholder: 'Mo-Fr 09:00-17:00' },
  ],
  Person: [
    { key: 'name', label: 'Full Name', type: 'text', required: true },
    { key: 'jobTitle', label: 'Job Title', type: 'text' },
    { key: 'url', label: 'URL', type: 'url', placeholder: 'https://example.com/about' },
    { key: 'sameAs', label: 'Same As URLs', type: 'array-text', placeholder: 'https://linkedin.com/in/...' },
  ],
};

const INITIAL_VALUES = {
  name: '',
  url: '',
  logo: '',
  description: '',
  headline: '',
  author: '',
  datePublished: '',
  publisher: '',
  image: '',
  price: '',
  currency: 'USD',
  availability: 'InStock',
  brand: '',
  phone: '',
  jobTitle: '',
  duration: '',
  thumbnailUrl: '',
  uploadDate: '',
  contentUrl: '',
  itemReviewed: '',
  reviewBody: '',
  reviewRating: { ratingValue: '', bestRating: '5' },
  contactPoint: { telephone: '', contactType: '' },
  address: { streetAddress: '', addressLocality: '', addressRegion: '', postalCode: '', addressCountry: '' },
  sameAs: [],
  mainEntity: [{ question: '', answer: '' }],
  steps: [{ name: '', text: '', image: '' }],
  itemListElement: [{ name: '', url: '' }],
  reviews: [{ author: '', ratingValue: '', bestRating: '5', reviewBody: '' }],
};

function initFormState() {
  const state = {};
  for (const type of SCHEMA_TYPES) {
    const data = {};
    const defs = FIELD_DEFS[type] || [];
    for (const def of defs) {
      if (INITIAL_VALUES[def.key] !== undefined) {
        data[def.key] = structuredClone ? structuredClone(INITIAL_VALUES[def.key]) : JSON.parse(JSON.stringify(INITIAL_VALUES[def.key]));
      } else if (def.type === 'object') {
        data[def.key] = {};
      } else if (def.type === 'array-text') {
        data[def.key] = [];
      } else if (def.type === 'array-object') {
        const defaultObj = {};
        for (const f of def.fields || []) {
          defaultObj[f.key] = '';
        }
        data[def.key] = [{ ...defaultObj }];
      } else {
        data[def.key] = '';
      }
    }
    state[type] = data;
  }
  return state;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function setNested(obj, path, value) {
  const keys = path.split('.');
  if (keys.length === 1) return { ...obj, [keys[0]]: value };
  return { ...obj, [keys[0]]: setNested(obj[keys[0]] || {}, keys.slice(1).join('.'), value) };
}

function highlightJson(json) {
  const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/(&quot;(?:[^&\\]|\\.)*?&quot;)\s*:/g, '<span style="color:#5eead4">$1</span>:')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span style="color:#a5b4fc">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span style="color:#f472b6">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color:#fbbf24">$1</span>');
}

function buildJsonLd(type, data) {
  const base = { '@context': 'https://schema.org', '@type': type };
  const omit = (v) => v === undefined || v === null || v === '';
  const omitArr = (a) => !Array.isArray(a) || a.length === 0;
  const cleanObj = (o) => {
    if (!o || typeof o !== 'object') return o;
    const cleaned = {};
    for (const [k, v] of Object.entries(o)) {
      if (!omit(v) && !(Array.isArray(v) && v.length === 0) && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)) {
        if (typeof v === 'object' && !Array.isArray(v)) {
          const nested = cleanObj(v);
          if (Object.keys(nested).length > 0) cleaned[k] = nested;
        } else if (Array.isArray(v)) {
          const items = v.map(item => typeof item === 'object' ? cleanObj(item) : item).filter(i => i !== null && i !== undefined && !(typeof i === 'object' && Object.keys(i).length === 0));
          if (items.length > 0) cleaned[k] = items;
        } else {
          cleaned[k] = v;
        }
      }
    }
    return cleaned;
  };

  switch (type) {
    case 'Organization':
      return cleanObj({
        ...base,
        name: data.name,
        url: data.url,
        logo: data.logo,
        description: data.description,
        contactPoint: data.contactPoint?.telephone ? {
          '@type': 'ContactPoint',
          telephone: data.contactPoint.telephone,
          contactType: data.contactPoint.contactType || undefined,
        } : undefined,
        sameAs: data.sameAs?.filter(Boolean).length > 0 ? data.sameAs.filter(Boolean) : undefined,
      });

    case 'Product':
      return cleanObj({
        ...base,
        name: data.name,
        description: data.description,
        offers: data.price ? {
          '@type': 'Offer',
          price: data.price,
          priceCurrency: data.currency || undefined,
          availability: data.availability ? `https://schema.org/${data.availability}` : undefined,
        } : undefined,
        brand: data.brand ? { '@type': 'Brand', name: data.brand } : undefined,
        review: data.reviews?.length > 0 ? data.reviews.map(r => cleanObj({
          '@type': 'Review',
          author: r.author ? { '@type': 'Person', name: r.author } : undefined,
          reviewRating: r.ratingValue ? {
            '@type': 'Rating',
            ratingValue: r.ratingValue,
            bestRating: r.bestRating || undefined,
          } : undefined,
          reviewBody: r.reviewBody || undefined,
        })).filter(r => Object.keys(r).length > 1) : undefined,
      });

    case 'FAQPage': {
      const entities = data.mainEntity?.filter(qa => qa.question || qa.answer) || [];
      return cleanObj({
        ...base,
        mainEntity: entities.length > 0 ? entities.map(qa => ({
          '@type': 'Question',
          name: qa.question,
          acceptedAnswer: qa.answer ? { '@type': 'Answer', text: qa.answer } : undefined,
        })) : undefined,
      });
    }

    case 'HowTo': {
      const stepItems = data.steps?.filter(s => s.name || s.text) || [];
      return cleanObj({
        ...base,
        name: data.name,
        description: data.description,
        step: stepItems.length > 0 ? stepItems.map(s => cleanObj({
          '@type': 'HowToStep',
          name: s.name,
          text: s.text,
          image: s.image || undefined,
        })) : undefined,
      });
    }

    case 'Article':
      return cleanObj({
        ...base,
        headline: data.headline,
        author: data.author ? { '@type': 'Person', name: data.author } : undefined,
        datePublished: data.datePublished || undefined,
        publisher: data.publisher ? { '@type': 'Organization', name: data.publisher } : undefined,
        image: data.image || undefined,
      });

    case 'BreadcrumbList': {
      const items = data.itemListElement?.filter(i => i.name || i.url) || [];
      return cleanObj({
        ...base,
        itemListElement: items.length > 0 ? items.map((item, idx) => cleanObj({
          '@type': 'ListItem',
          position: idx + 1,
          name: item.name,
          item: item.url || undefined,
        })) : undefined,
      });
    }

    case 'Review':
      return cleanObj({
        ...base,
        itemReviewed: data.itemReviewed ? { '@type': 'Thing', name: data.itemReviewed } : undefined,
        author: data.author ? { '@type': 'Person', name: data.author } : undefined,
        reviewBody: data.reviewBody || undefined,
        reviewRating: data.reviewRating?.ratingValue ? {
          '@type': 'Rating',
          ratingValue: data.reviewRating.ratingValue,
          bestRating: data.reviewRating.bestRating || undefined,
        } : undefined,
      });

    case 'VideoObject':
      return cleanObj({
        ...base,
        name: data.name,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl || undefined,
        uploadDate: data.uploadDate || undefined,
        duration: data.duration || undefined,
        contentUrl: data.contentUrl || undefined,
      });

    case 'LocalBusiness': {
      const addr = data.address;
      const hasAddress = addr?.streetAddress || addr?.addressLocality || addr?.addressRegion || addr?.postalCode || addr?.addressCountry;
      const hours = (data.openingHours || '').split('\n').map(s => s.trim()).filter(Boolean);
      return cleanObj({
        ...base,
        name: data.name,
        telephone: data.phone || undefined,
        address: hasAddress ? {
          '@type': 'PostalAddress',
          streetAddress: addr.streetAddress || undefined,
          addressLocality: addr.addressLocality || undefined,
          addressRegion: addr.addressRegion || undefined,
          postalCode: addr.postalCode || undefined,
          addressCountry: addr.addressCountry || undefined,
        } : undefined,
        openingHours: hours.length > 0 ? hours : undefined,
      });
    }

    case 'Person':
      return cleanObj({
        ...base,
        name: data.name,
        jobTitle: data.jobTitle || undefined,
        url: data.url || undefined,
        sameAs: data.sameAs?.filter(Boolean).length > 0 ? data.sameAs.filter(Boolean) : undefined,
      });

    default:
      return base;
  }
}

function validateField(fieldDef, value) {
  if (!fieldDef.required) return '';
  if (value === undefined || value === null) return `${fieldDef.label} is required`;

  if (fieldDef.type === 'array-object') {
    const items = value || [];
    const hasContent = items.some(item =>
      fieldDef.fields.some(f => item[f.key] && String(item[f.key]).trim() !== '')
    );
    if (!hasContent) return `At least one ${fieldDef.label.toLowerCase()} entry is required`;
    return '';
  }

  if (fieldDef.type === 'array-text') {
    if (!Array.isArray(value) || value.every(v => !v || String(v).trim() === '')) {
      return `At least one ${fieldDef.label.toLowerCase()} URL is required`;
    }
    return '';
  }

  if (typeof value === 'object') {
    const hasAny = Object.values(value).some(v => v && String(v).trim() !== '');
    if (!hasAny) return `${fieldDef.label} is required`;
    return '';
  }

  return String(value).trim() === '' ? `${fieldDef.label} is required` : '';
}

function computeValidation(type, data) {
  const defs = FIELD_DEFS[type] || [];
  const errors = {};
  for (const def of defs) {
    const val = data[def.key];
    const err = validateField(def, val);
    if (err) errors[def.key] = err;
  }
  return errors;
}

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  height: '100%',
};

const tabsContainerStyle = {
  display: 'flex',
  gap: 4,
  overflowX: 'auto',
  paddingBottom: 4,
  flexShrink: 0,
  scrollbarWidth: 'thin',
};

const tabStyle = (active) => ({
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s ease',
  background: active ? 'var(--accent, #6366f1)' : 'var(--bg-secondary, #f7f8fa)',
  color: active ? '#fff' : 'var(--text-muted, #94a3b8)',
  fontFamily: 'inherit',
  flexShrink: 0,
});

const twoColStyle = {
  display: 'flex',
  gap: 16,
  flex: 1,
  minHeight: 0,
};

const formPanelStyle = {
  flex: 1,
  background: '#1a1c23',
  border: '1px solid #2a2d35',
  borderRadius: 'var(--radius, 12px)',
  padding: 20,
  overflowY: 'auto',
};

const previewPanelStyle = {
  width: '45%',
  minWidth: 320,
  background: '#1a1c23',
  border: '1px solid #2a2d35',
  borderRadius: 'var(--radius, 12px)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const previewHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid #2a2d35',
  flexShrink: 0,
};

const codeBlockStyle = {
  flex: 1,
  padding: 16,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: 12,
  lineHeight: 1.7,
  color: '#e0e0e0',
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  margin: 0,
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  background: '#2a2d35',
  border: '1px solid #3a3d45',
  borderRadius: 6,
  color: '#e0e0e0',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'auto',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#b0b3c0',
  marginBottom: 4,
};

const errorTextStyle = {
  fontSize: 11,
  color: '#ef4444',
  marginTop: 4,
};

const fieldGroupStyle = {
  marginBottom: 16,
};

const nestedCardStyle = {
  background: '#22242b',
  border: '1px solid #2a2d35',
  borderRadius: 8,
  padding: 12,
  marginBottom: 8,
};

const arrayItemHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
};

const badgeStyle = (valid) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 700,
  background: valid ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
  color: valid ? '#10b981' : '#ef4444',
});

function FormField({ def, value, onChange, error }) {
  const handleChange = useCallback((e) => onChange(def.key, e.target.value), [def.key, onChange]);

  if (def.type === 'textarea') {
    return (
      <div style={fieldGroupStyle}>
        <label style={{ ...labelStyle, color: def.required ? '#e0e0e0' : '#b0b3c0' }}>
          {def.label}{def.required ? ' *' : ''}
        </label>
        <textarea
          value={value || ''}
          onChange={handleChange}
          placeholder={def.placeholder}
          rows={def.rows || 3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
        />
        {error && <div style={errorTextStyle}>{error}</div>}
      </div>
    );
  }

  if (def.type === 'select') {
    return (
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{def.label}</label>
        <select value={value || def.options?.[0]?.value || ''} onChange={handleChange} style={selectStyle}>
          {def.options.map(opt => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lbl = typeof opt === 'string' ? opt : opt.label;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
        {error && <div style={errorTextStyle}>{error}</div>}
      </div>
    );
  }

  return (
    <div style={fieldGroupStyle}>
      <label style={{ ...labelStyle, color: def.required ? '#e0e0e0' : '#b0b3c0' }}>
        {def.label}{def.required ? ' *' : ''}
      </label>
      <input
        type={def.type === 'url' || def.type === 'date' ? def.type : 'text'}
        value={value || ''}
        onChange={handleChange}
        placeholder={def.placeholder}
        style={{ ...inputStyle, borderColor: error ? '#ef4444' : undefined }}
        onFocus={e => { e.target.style.borderColor = 'var(--accent, #6366f1)'; }}
        onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#3a3d45'; }}
      />
      {error && <div style={errorTextStyle}>{error}</div>}
    </div>
  );
}

function ObjectFields({ fields, data, onChange, errors }) {
  return (
    <div style={nestedCardStyle}>
      {fields.map(field => {
        if (field.type === 'object') {
          return (
            <div key={field.key} style={fieldGroupStyle}>
              <div style={{ ...labelStyle, marginBottom: 6, color: '#b0b3c0' }}>{field.label}</div>
              <ObjectFields
                fields={field.fields || []}
                data={data?.[field.key] || {}}
                onChange={(subPath, val) => onChange(`${field.key}.${subPath}`, val)}
                errors={{}}
              />
            </div>
          );
        }
        return (
          <FormField
            key={field.key}
            def={field}
            value={data?.[field.key] || ''}
            onChange={(_, val) => onChange(field.key, val)}
            error={errors?.[field.key] || ''}
          />
        );
      })}
    </div>
  );
}

function ArrayTextField({ def, values, onChange }) {
  const items = Array.isArray(values) ? values : [];

  const handleItemChange = (idx, val) => {
    const next = [...items];
    next[idx] = val;
    onChange(def.key, next);
  };

  const handleAdd = () => {
    onChange(def.key, [...items, '']);
  };

  const handleRemove = (idx) => {
    const next = items.filter((_, i) => i !== idx);
    onChange(def.key, next);
  };

  return (
    <div style={fieldGroupStyle}>
      <label style={labelStyle}>{def.label}</label>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input
            type="url"
            value={item}
            onChange={e => handleItemChange(idx, e.target.value)}
            placeholder={def.placeholder}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={() => handleRemove(idx)} title="Remove" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={handleAdd} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
        border: '1px solid #3a3d45', background: 'transparent', color: '#a5b4fc', fontSize: 11,
        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <Plus size={12} /> Add URL
      </button>
    </div>
  );
}

function ArrayObjectField({ def, values, onChange }) {
  const items = Array.isArray(values) ? values : [];

  const handleItemChange = (idx, fieldKey, val) => {
    const next = items.map((item, i) => i === idx ? { ...item, [fieldKey]: val } : item);
    onChange(def.key, next);
  };

  const handleAdd = () => {
    const defaultItem = {};
    for (const f of def.fields || []) defaultItem[f.key] = '';
    onChange(def.key, [...items, defaultItem]);
  };

  const handleRemove = (idx) => {
    const next = items.filter((_, i) => i !== idx);
    onChange(def.key, next.length > 0 ? next : [{ question: '', answer: '' }]);
  };

  return (
    <div style={fieldGroupStyle}>
      <label style={{ ...labelStyle, color: def.required ? '#e0e0e0' : '#b0b3c0' }}>
        {def.label}{def.required ? ' *' : ''}
      </label>
      {items.map((item, idx) => (
        <div key={idx} style={{ ...nestedCardStyle, position: 'relative' }}>
          <div style={arrayItemHeaderStyle}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8a8fa0' }}>Item {idx + 1}</span>
            <button onClick={() => handleRemove(idx)} title="Remove" style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2,
              display: 'flex', alignItems: 'center',
            }}>
              <Trash2 size={13} />
            </button>
          </div>
          {(def.fields || []).map(field => (
            <FormField
              key={field.key}
              def={field}
              value={item[field.key] || ''}
              onChange={(_, val) => handleItemChange(idx, field.key, val)}
              error=""
            />
          ))}
        </div>
      ))}
      <button onClick={handleAdd} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
        border: '1px solid #3a3d45', background: 'transparent', color: '#a5b4fc', fontSize: 11,
        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <Plus size={12} /> Add {def.label.toLowerCase()}
      </button>
    </div>
  );
}

export default function VisualSchemaBuilder() {
  const [formData, setFormData] = useState(() => initFormState());
  const [schemaType, setSchemaType] = useState('Organization');
  const [copied, setCopied] = useState(false);

  const handleFieldChange = useCallback((key, value) => {
    setFormData(prev => ({
      ...prev,
      [schemaType]: setNested(prev[schemaType], key, value),
    }));
  }, [schemaType]);

  const jsonLd = useMemo(() => {
    try {
      return buildJsonLd(schemaType, formData[schemaType] || {});
    } catch {
      return { '@context': 'https://schema.org', '@type': schemaType, error: 'Invalid data' };
    }
  }, [schemaType, formData]);

  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(jsonLd, null, 2);
    } catch {
      return '{\n  "error": "Failed to serialize"\n}';
    }
  }, [jsonLd]);

  const htmlHighlighted = useMemo(() => {
    try {
      return highlightJson(jsonString);
    } catch {
      return jsonString;
    }
  }, [jsonString]);

  const validationErrors = useMemo(() => {
    return computeValidation(schemaType, formData[schemaType] || {});
  }, [schemaType, formData]);

  const isValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0;
  }, [validationErrors]);

  const hasAnyData = useMemo(() => {
    const data = formData[schemaType] || {};
    return Object.values(data).some(v => {
      if (typeof v === 'string') return v.trim() !== '';
      if (Array.isArray(v)) return v.length > 0 && v.some(i => typeof i === 'object' ? Object.values(i).some(s => s) : i);
      if (typeof v === 'object' && v !== null) return Object.values(v).some(s => s);
      return false;
    });
  }, [schemaType, formData]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = jsonString;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [jsonString]);

  const currentData = formData[schemaType] || {};
  const currentDefs = FIELD_DEFS[schemaType] || [];

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileCode size={20} style={{ color: 'var(--accent, #6366f1)' }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text, #1a1d29)', letterSpacing: '-0.5px' }}>Visual Schema Builder</span>
        </div>
        {hasAnyData && (
          <div style={badgeStyle(isValid)}>
            {isValid ? <><CheckCircle size={12} /> Valid JSON-LD</> : <><AlertTriangle size={12} /> Missing Required Fields</>}
          </div>
        )}
      </div>

      <div style={tabsContainerStyle}>
        {SCHEMA_TYPES.map(type => (
          <button key={type} onClick={() => setSchemaType(type)} style={tabStyle(schemaType === type)}>
            {type}
          </button>
        ))}
      </div>

      <div style={twoColStyle}>
        <div style={formPanelStyle} className="form-group">
          {currentDefs.map(def => {
            if (def.type === 'object') {
              return (
                <div key={def.key} style={fieldGroupStyle}>
                  <div style={{ ...labelStyle, marginBottom: 6, color: '#b0b3c0' }}>{def.label}</div>
                  <ObjectFields
                    fields={def.fields || []}
                    data={currentData[def.key] || {}}
                    onChange={(path, val) => handleFieldChange(`${def.key}.${path}`, val)}
                    errors={{}}
                  />
                </div>
              );
            }

            if (def.type === 'array-text') {
              return (
                <ArrayTextField
                  key={def.key}
                  def={def}
                  values={currentData[def.key] || []}
                  onChange={handleFieldChange}
                />
              );
            }

            if (def.type === 'array-object') {
              return (
                <ArrayObjectField
                  key={def.key}
                  def={def}
                  values={currentData[def.key] || []}
                  onChange={handleFieldChange}
                />
              );
            }

            return (
              <FormField
                key={def.key}
                def={def}
                value={currentData[def.key] || ''}
                onChange={handleFieldChange}
                error={validationErrors[def.key] || ''}
              />
            );
          })}
        </div>

        <div style={previewPanelStyle}>
          <div style={previewHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Code size={14} style={{ color: '#a5b4fc' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#e0e0e0' }}>JSON-LD Output</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hasAnyData && (
                <div style={badgeStyle(isValid)}>
                  {isValid ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                  {isValid ? 'Valid' : 'Incomplete'}
                </div>
              )}
              <button onClick={handleCopy} title="Copy JSON-LD" style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
                border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
                color: copied ? '#10b981' : '#a5b4fc', transition: 'all 0.2s',
              }}>
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <pre style={codeBlockStyle} dangerouslySetInnerHTML={{ __html: htmlHighlighted }} />
        </div>
      </div>
    </div>
  );
}
