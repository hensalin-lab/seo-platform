import { useState } from 'react';
import { FileEdit, Replace, MapPin, ListOrdered, Zap, Check, Copy } from 'lucide-react';

export default function FixDetail({ issue = {}, compact = false }) {
  const [copied, setCopied] = useState(false);
  const fix = issue.fix || '';
  const exact = issue.exact_text || '';
  const loc = issue.location || '';
  const repl = issue.replacement || '';
  const steps = Array.isArray(issue.steps) && issue.steps.length > 0 ? issue.steps : [];

  const hasDetail = exact || loc || repl;
  if (!hasDetail && !fix) return null;

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  };

  const box = (border, headerBg, headerColor, label, Icon, children, bodyStyle) => (
    <div style={{ border: `1px solid ${border}`, borderRadius: 9, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: headerBg, borderBottom: `1px solid ${border}`, fontSize: 10, fontWeight: 800, color: headerColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <Icon size={11} /> {label}
      </div>
      <div style={{ padding: '9px 10px', ...bodyStyle }}>{children}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5 }}>
      {loc && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: '#7c3aed', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 7, padding: '4px 9px', alignSelf: 'flex-start' }}>
          <MapPin size={10} /> Where: {loc}
        </div>
      )}

      {exact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {box('rgba(239,68,68,0.25)', 'rgba(239,68,68,0.07)', '#dc2626', 'Current text to change', FileEdit, (
              <div style={{ color: '#7f1d1d', lineHeight: 1.55, background: '#fffafb', maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>“{exact}”</div>
            ))}
          </div>
          <button
            onClick={() => copyText(exact)}
            title="Copy exact text"
            style={{ alignSelf: 'flex-start', marginTop: 24, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: copied ? '#d1fae5' : 'var(--bg-white)', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: copied ? '#065f46' : 'var(--text-secondary)' }}
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
          </button>
        </div>
      )}

      {repl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {box('rgba(16,185,129,0.3)', 'rgba(16,185,129,0.08)', '#059669', 'Replace with (ready to paste)', Replace, (
              <div style={{ color: '#064e3b', lineHeight: 1.55, background: '#f6fef9', maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{repl}</div>
            ))}
          </div>
          <button
            onClick={() => copyText(repl)}
            title="Copy replacement"
            style={{ alignSelf: 'flex-start', marginTop: 24, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: copied ? '#d1fae5' : 'var(--bg-white)', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: copied ? '#065f46' : 'var(--text-secondary)' }}
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
          </button>
        </div>
      )}

      {(steps.length > 0 || fix) && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ListOrdered size={11} color="#8b5cf6" /> How to fix
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(steps.length > 0 ? steps : [fix]).slice(0, compact ? 3 : 8).map((s, i) => (
              <li key={i} style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      {fix && !hasDetail && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={11} color="#8b5cf6" />
          <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{fix}</span>
        </div>
      )}
    </div>
  );
}
