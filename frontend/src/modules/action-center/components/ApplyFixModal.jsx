import { useState, useEffect } from 'react';
import { api } from '../../../api';
import { X, Copy, Check, Wrench, Loader2, AlertTriangle } from 'lucide-react';

const COPY_LABELS = { jsonld: 'JSON-LD', html: 'HTML', text: 'Text', markdown: 'Markdown' };

export default function ApplyFixModal({ auditId, issue, onClose, onDismissed }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!auditId || !issue?.id) return;
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getApplyFix(auditId, issue.id)
      .then((res) => { if (active) setData(res); })
      .catch((err) => { if (active) setError(err.message || 'Failed to load fix snippets'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auditId, issue?.id]);

  const copy = async (code, key) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      // fallback for insecure contexts
      try {
        const ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(key);
        setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
      } catch (e) {
        setError('Clipboard not available — select the code block and copy manually.');
      }
    }
  };

  const dismiss = async () => {
    try {
      await api.dismissIssue(auditId, issue.id);
      onDismissed?.(issue.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to dismiss issue');
    }
  };

  const snippets = data?.fix_snippets || [];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      fontFamily: "'Inter', system-ui, sans-serif",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-white, #fff)', borderRadius: 12, width: 'min(760px, 100%)',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(2,6,23,0.35)',
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wrench size={18} color="#4f46e5" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text, #0f172a)' }}>Apply Fix</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
              <strong style={{ color: '#334155' }}>{issue.signal_name}</strong> · {issue.category} · {issue.severity}
            </div>
            <div style={{ fontSize: 12, color: '#1d4ed8', marginTop: 2, wordBreak: 'break-all' }}>{issue.page_url || '—'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)', marginLeft: 'auto' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '16px 22px' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 14 }}>
              <Loader2 size={18} className="spin" /> Generating ready-to-copy fix…
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#b91c1c' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}
          {!loading && !error && data?.fix_summary && (
            <div style={{ padding: '10px 12px', background: '#f0f9ff', borderLeft: '3px solid #38bdf8', borderRadius: 6, fontSize: 13, color: '#0369a1', lineHeight: 1.5, marginBottom: 14 }}>
              <strong>Recommended fix:</strong> {data.fix_summary}
            </div>
          )}
          {!loading && !error && snippets.length === 0 && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
              No copyable fix snippets could be generated for this issue type.
            </div>
          )}
          {snippets.map((s, i) => (
            <div key={i} style={{ marginBottom: 14, border: '1px solid var(--border, #e5e7eb)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', flex: 1 }}>{s.label || 'Fix'}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: '#eef2ff', color: '#4f46e5' }}>{COPY_LABELS[s.type] || s.type}</span>
                <button onClick={() => copy(s.code, i)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6,
                  border: 'none', cursor: 'pointer', background: copied === i ? '#dcfce7' : '#4f46e5',
                  color: copied === i ? '#166534' : '#fff', fontSize: 12, fontWeight: 600,
                }}>
                  {copied === i ? <Check size={13} /> : <Copy size={13} />}
                  {copied === i ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre style={{
                margin: 0, padding: '14px 16px', background: '#0f172a', color: '#e2e8f0',
                fontSize: 12.5, lineHeight: 1.6, overflowX: 'auto', maxHeight: 320, overflowY: 'auto',
                whiteSpace: 'pre', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              }}>{s.code}</pre>
              {s.note && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border, #e5e7eb)' }}>{s.note}</div>}
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border, #e5e7eb)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-white)', color: '#334155', fontSize: 13, cursor: 'pointer' }}>
            Close
          </button>
          <button onClick={dismiss} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: 13, cursor: 'pointer' }}>
            Mark as resolved
          </button>
        </div>
      </div>
    </div>
  );
}
