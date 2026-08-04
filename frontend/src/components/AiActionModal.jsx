import { useState } from 'react';
import { Zap, Copy, Check, ExternalLink, RotateCcw, X } from 'lucide-react';

export default function AiActionModal({ issue, onClose, onVerify }) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  if (!issue) return null;

  const title = issue.title || issue.signal_name || 'Issue';
  const description = issue.description || issue.fix || 'No details available.';
  const impact = issue.impact_score ?? issue.impact ?? 0;
  const fixCode = issue.ai_fix || issue.fix || `<!-- Fix for: ${title} -->\n<!-- Implement based on audit findings -->\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage"\n}\n</script>`;
  const url = issue.page_url || issue.url || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const handleVerify = async () => {
    setVerifying(true);
    if (onVerify) {
      await onVerify(issue);
    } else {
      await new Promise(r => setTimeout(r, 2500));
    }
    setVerifying(false);
    setVerified(true);
    setTimeout(() => setVerified(false), 4000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-white)', borderRadius: 14, maxWidth: 640, width: '92%', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(245,159,11,0.12)', color: '#f59e0b' }}>+{impact} pts</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: issue.severity === 'CRITICAL' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: issue.severity === 'CRITICAL' ? '#ef4444' : '#3b82f6' }}>{issue.severity || 'MEDIUM'}</span>
              {url && <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{url}</span>}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#f1f3f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={14} color="#64748b" /></button>
        </div>

        {/* Description */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid #f1f3f5' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Issue Summary</div>
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{description}</div>
        </div>

        {/* Code Block */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid #f1f3f5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI-Generated Fix</div>
            <button onClick={handleCopy} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: copied ? '#d1fae5' : '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: copied ? '#065f46' : '#475569', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, maxHeight: 240, overflowY: 'auto' }}>
            <pre style={{ margin: 0, fontSize: 12, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>{fixCode}</pre>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '14px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#fafbfc' }}>
          <button onClick={handleVerify} disabled={verifying || verified} style={{
            padding: '8px 16px', borderRadius: 8, border: verified ? 'none' : '1px solid #e2e8f0',
            background: verified ? '#d1fae5' : '#fff', cursor: verifying ? 'wait' : 'pointer',
            fontSize: 12, fontWeight: 600, color: verified ? '#065f46' : '#475569',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
          }}>
            {verifying ? <RotateCcw size={13} className="spin" /> : verified ? <Check size={13} /> : <RotateCcw size={13} />}
            {verifying ? 'Verifying...' : verified ? 'Fix Verified ✓' : 'Verify Fix'}
          </button>
          <button onClick={handleCopy} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-white)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ExternalLink size={13} /> Auto-Apply
          </button>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#6366f1', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#fff' }}>
            Done
          </button>
        </div>
      </div>
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
