import { useState } from 'react'
import { api } from '../api'
import { ShieldAlert, Search, Download, ExternalLink } from 'lucide-react'

export default function ToxicLinks() {
  const [domain, setDomain] = useState('')
  const [threshold, setThreshold] = useState(0.7)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async (d, t) => {
    setLoading(true); setError('')
    try { const res = await api.getToxicLinks(d, t); setData(res) }
    catch (e) { setError(e.message || 'Failed') }
    finally { setLoading(false) }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (domain.trim()) load(domain.trim(), threshold)
  }

  const handleExport = () => {
    window.open(api.exportDisavow(domain, threshold), '_blank')
  }

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <ShieldAlert size={26} style={{ color: '#EF4444' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Toxic Links</h1>
        </div>
        <p style={{ color: '#9CA3AF', margin: '0 0 18px', fontSize: 13 }}>Identify harmful backlinks and export a Google disavow file</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 520, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com"
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <select value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{ padding: '9px 10px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#E5E7EB', fontSize: 12 }}>
            <option value={0.5}>Threshold: 0.5+</option>
            <option value={0.7}>Threshold: 0.7+</option>
            <option value={0.9}>Threshold: 0.9+</option>
          </select>
          <button type="submit" style={{ padding: '9px 18px', background: '#EF4444', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Scan</button>
        </form>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Scanning for toxic links…</div>}
      {error && <div style={{ textAlign: 'center', padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', maxWidth: 500, margin: '0 auto', fontSize: 12 }}>{error}</div>}

      {!loading && data && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Backlinks', value: data.total_backlinks, color: '#6366F1' },
              { label: 'Toxic Links', value: data.toxic_count, color: '#EF4444' },
              { label: 'Toxic %', value: data.total_backlinks ? `${((data.toxic_count / data.total_backlinks) * 100).toFixed(1)}%` : '0%', color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Export button */}
          {data.toxic_count > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
              <button onClick={handleExport} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: '#EF4444', border: 'none', borderRadius: 6, color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                <Download size={14} /> Export Disavow File ({data.disavow_lines?.length || 0} domains)
              </button>
            </div>
          )}

          {/* Toxic links table */}
          {data.toxic_links?.length > 0 ? (
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1F2937' }}>
                    {['Source Domain', 'Source URL', 'Anchor', 'DA', 'Toxic Score'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#6B7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.toxic_links.map((bl, i) => (
                    <tr key={bl.id || i} style={{ borderBottom: '1px solid #1F2937', background: i % 2 === 0 ? 'transparent' : '#0D1117' }}>
                      <td style={{ padding: '8px 12px', color: '#EF4444', fontWeight: 500, fontSize: 12 }}>{bl.source_domain}</td>
                      <td style={{ padding: '8px 12px', maxWidth: 200 }}>
                        <a href={bl.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366F1', textDecoration: 'none', wordBreak: 'break-all', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                          {bl.source_url?.slice(0, 35)}… <ExternalLink size={10} />
                        </a>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#D1D5DB', fontSize: 11, wordBreak: 'break-all' }}>{bl.anchor_text || '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#9CA3AF' }}>{bl.domain_authority || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          display: 'inline-block', minWidth: 36, textAlign: 'center', padding: '2px 8px',
                          borderRadius: 4, fontWeight: 700, fontSize: 12,
                          background: bl.toxic_score >= 0.9 ? '#EF444420' : bl.toxic_score >= 0.7 ? '#F59E0B20' : '#6B728020',
                          color: bl.toxic_score >= 0.9 ? '#EF4444' : bl.toxic_score >= 0.7 ? '#F59E0B' : '#9CA3AF',
                        }}>
                          {bl.toxic_score?.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
              {data.note || 'No toxic links found at this threshold'}
            </div>
          )}

          {/* Disavow preview */}
          {data.disavow_lines?.length > 0 && (
            <div style={{ marginTop: 20, background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#E5E7EB' }}>Disavow File Preview</h3>
              <pre style={{ background: '#0D1117', padding: 12, borderRadius: 6, fontSize: 11, color: '#9CA3AF', overflow: 'auto', maxHeight: 200, margin: 0 }}>
                {`# Disavow file for ${domain}\n# Toxic threshold: ${threshold}\n# Total: ${data.disavow_lines.length} domains\n\n`}{data.disavow_lines.join('\n')}
              </pre>
            </div>
          )}
        </div>
      )}

      {!loading && !data && (
        <div style={{ textAlign: 'center', padding: 50, color: '#4B5563' }}>
          <ShieldAlert size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>Enter a domain above to scan for toxic backlinks</p>
        </div>
      )}
    </div>
  )
}
