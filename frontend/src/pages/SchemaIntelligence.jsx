import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { FileCode, CheckCircle, XCircle, AlertTriangle, Copy, Shield, Eye } from 'lucide-react';

function ScoreRing({ score, size = 80, label }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const offset = c - (pct / 100) * c;
  const color = pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.25, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(pct)}</span>
        {label && <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  );
}

function CodeBlock({ code, title }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ marginBottom: 12 }}>
      {title && <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{title}</div>}
      <div style={{ position: 'relative' }}>
        <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 12, borderRadius: 6, fontSize: 11, overflow: 'auto', maxHeight: 200, margin: 0, fontFamily: 'monospace' }}>
          {typeof code === 'string' ? code : JSON.stringify(code, null, 2)}
        </pre>
        <button onClick={handleCopy} style={{ position: 'absolute', top: 6, right: 6, padding: '4px 8px', borderRadius: 4, background: copied ? '#059669' : '#334155', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer' }}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children, color = '#3b82f6' }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

export default function SchemaIntelligence() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.getAuditPages(id, { limit: 100 }).then(d => { setPages(d.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    api.getSchemaIntelligence(id, selectedIdx).then(d => setData(d)).catch(() => {});
  }, [id, selectedIdx, pages]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No data available</div>;

  const detected = data.detected_schemas || [];
  const missing = data.missing_schemas || [];
  const validation = data.validation || {};
  const richResults = data.rich_results || {};
  const beforeAfter = data.before_after || [];

  return (
    <div style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
          {pages.map((p, i) => <option key={i} value={i}>{p.url?.substring(0, 70)}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Schema Score" icon={FileCode} color="#8b5cf6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ScoreRing score={data.schema_score} size={90} />
            <div style={{ fontSize: 12, color: '#64748b' }}>
              <div>Coverage: {Math.round(data.schema_coverage || 0)}%</div>
              <div>Detected: {detected.filter(s => s.found).length} / {detected.length}</div>
              <div>Missing: {missing.length}</div>
            </div>
          </div>
        </Card>

        <Card title="Validation" icon={Shield} color={validation.schemas_with_errors > 0 ? '#dc2626' : '#059669'}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <div>Total schemas: {validation.total_schemas || 0}</div>
            <div>Valid: {validation.valid_schemas || 0}</div>
            <div>Errors: {validation.schemas_with_errors || 0}</div>
            <div>Warnings: {validation.schemas_with_warnings || 0}</div>
            <div>JSON-LD syntax: {validation.json_ld_syntax_valid ? '✅ Valid' : '❌ Invalid'}</div>
          </div>
        </Card>

        <Card title="Rich Results" icon={Eye} color="#2563eb">
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <div>Eligible types: {richResults.eligible_types?.length || 0}</div>
            <div>Potential results: {richResults.potential_rich_results?.join(', ') || 'None'}</div>
            <div>Estimated CTR boost: {richResults.estimated_ctr_boost || 'N/A'}</div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['overview', 'missing', 'validation', 'code'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: activeTab === tab ? '#1e293b' : '#f1f5f9', color: activeTab === tab ? '#fff' : '#64748b' }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && detected.map((schema, i) => (
        <Card key={i} title={`${schema.type} ${schema.found ? '✅' : '❌'}`} icon={FileCode} color={schema.found ? '#059669' : '#dc2626'}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Completeness</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{Math.round(schema.completeness || 0)}%</span>
            </div>
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${schema.completeness || 0}%`, background: (schema.completeness || 0) >= 70 ? '#059669' : (schema.completeness || 0) >= 40 ? '#d97706' : '#dc2626', borderRadius: 3 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Properties</div>
              {Object.entries(schema.required_properties || {}).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
                  {v ? <CheckCircle size={10} color="#059669" /> : <XCircle size={10} color="#dc2626" />}
                  <span>{k}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Recommended</div>
              {Object.entries(schema.recommended_properties || {}).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
                  {v ? <CheckCircle size={10} color="#059669" /> : <AlertTriangle size={10} color="#d97706" />}
                  <span>{k}</span>
                </div>
              ))}
            </div>
          </div>
          {schema.issues?.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: '#dc2626' }}>Issues: {schema.issues.join(', ')}</div>}
          {schema.rich_result_eligible && <div style={{ marginTop: 4, fontSize: 11, color: '#059669' }}>Eligible for: {schema.rich_result_type}</div>}
        </Card>
      ))}

      {activeTab === 'missing' && missing.map((schema, i) => (
        <Card key={i} title={`Missing: ${schema.type}`} icon={AlertTriangle} color="#d97706">
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: schema.importance === 'CRITICAL' ? '#fef2f2' : schema.importance === 'HIGH' ? '#fffbeb' : '#eff6ff', color: schema.importance === 'CRITICAL' ? '#dc2626' : schema.importance === 'HIGH' ? '#d97706' : '#2563eb' }}>{schema.importance}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Enables: {schema.rich_result}</span>
            <span style={{ fontSize: 12, color: '#059669' }}>Impact: {schema.estimated_impact}</span>
          </div>
          {schema.generated_json_ld && <CodeBlock code={schema.generated_json_ld} title="Generated JSON-LD" />}
        </Card>
      ))}

      {activeTab === 'validation' && (
        <>
          {validation.errors?.map((err, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{err.schema} — {err.property}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{err.error}</div>
              {err.fix && <div style={{ fontSize: 12, color: '#059669', marginTop: 2 }}>Fix: {err.fix}</div>}
            </div>
          ))}
          {validation.warnings?.map((warn, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>{warn.schema} — {warn.property}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{warn.warning}</div>
            </div>
          ))}
          {(!validation.errors?.length && !validation.warnings?.length) && <div style={{ color: '#059669', fontSize: 13 }}>All schemas valid ✅</div>}
        </>
      )}

      {activeTab === 'code' && beforeAfter.map((item, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{item.schema_type}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Current</div>
              <div style={{ padding: 12, background: '#fef2f2', borderRadius: 6, fontSize: 12, color: '#64748b' }}>{item.current}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', marginBottom: 4 }}>Recommended</div>
              <CodeBlock code={item.json_ld} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
