import { useState } from 'react';
import { Sparkles, Copy, Check, Lightbulb, TrendingUp, ShieldCheck, Zap, Code2, FileCode, Clock, Info, GitBranch, FileEdit, Replace, MapPin } from 'lucide-react';
import AiActionModal from '../AiActionModal';
import { AI_GRADIENT, AI_GRADIENT_SOFT, sevColor, effColor, priColor, catColor } from './theme';

const FRAMEWORKS = [
  ['html', 'HTML'],
  ['react', 'React'],
  ['nextjs', 'Next.js'],
  ['wordpress', 'WordPress'],
  ['shopify', 'Shopify'],
  ['framer', 'Framer'],
];

function MeterBar({ label, value, gradient, color, tooltip }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
          {tooltip && <Tip text={tooltip}><Info size={10} color="var(--text-muted)" style={{ cursor: 'help' }} /></Tip>}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 800, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: gradient || color, transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  );
}

function Tip({ text, children }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && text && (
        <span style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 40, width: 250, background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.5, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', fontWeight: 500 }}>{text}</span>
      )}
    </span>
  );
}

export default function AiSuggestionCard({ item, index = 0 }) {
  const [copied, setCopied] = useState(false);
  const [openFix, setOpenFix] = useState(false);
  const [activeFw, setActiveFw] = useState(null);
  const [showAfter, setShowAfter] = useState(true);

  if (!item) return null;

  const title = item.signal_name || item.title || 'AI Suggestion';
  const impact = item.ai_impact_pct ?? (item.impact_score ?? 0);
  const confidence = item.ai_confidence ?? 0;
  const why = item.why_it_matters || item.ai_why || item.root_cause || item.impact || '';
  const business = item.business_impact || '';
  const expected = item.expected_improvement || '';
  const confidenceBasis = item.confidence_basis || '';
  const fix = item.fix || item.specific_steps?.join('. ') || '';
  const sev = sevColor(item.severity);
  const priority = (item.priority || 'P2').toUpperCase();
  const delay = `${Math.min(index * 70, 420)}ms`;

  const snippets = item.framework_snippets || {};
  const available = FRAMEWORKS.filter(([key]) => {
    const s = snippets[key];
    return s && (s.after || s.before);
  });
  const effectiveFw = activeFw && available.some(([k]) => k === activeFw) ? activeFw : (available[0]?.[0] || null);
  const activeSnippet = effectiveFw ? snippets[effectiveFw] : null;
  const code = showAfter ? activeSnippet?.after : activeSnippet?.before;
  const deps = Array.isArray(item.dependencies) ? item.dependencies : [];

  return (
    <div
      style={{
        background: 'var(--bg-white)',
        border: '1px solid var(--border-light)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        transition: 'all 0.25s ease',
        animation: 'aiCardIn 0.5s ease both',
        animationDelay: delay,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px -12px rgba(99,102,241,0.25), 0 2px 6px rgba(15,23,42,0.06)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
    >
      <style>{`@keyframes aiCardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div style={{ height: 3, background: AI_GRADIENT }} />

      {/* Header */}
      <div style={{ padding: '14px 16px 12px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: AI_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 14px -6px rgba(139,92,246,0.5)' }}>
          <Sparkles size={17} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{title}</span>
            <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: 'rgba(139,92,246,0.12)', color: '#7c3aed', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Sparkles size={9} /> AI
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {item.category && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: catColor(item.category) + '18', color: catColor(item.category) }}>{item.category}</span>
            )}
            <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 4, background: priColor(priority) + '18', color: priColor(priority) }}>{priority}</span>
            {item.severity && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: sev + '18', color: sev }}>{item.severity}</span>
            )}
            {item.page_url && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>{item.page_url}</span>
            )}
          </div>
        </div>
      </div>

      {/* Why it matters */}
      {why && (
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ padding: '9px 11px', borderRadius: 9, background: AI_GRADIENT_SOFT, border: '1px solid rgba(139,92,246,0.14)', display: 'flex', gap: 8 }}>
            <Lightbulb size={13} color="#8b5cf6" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: '#7c3aed' }}>Why it matters: </strong>{why}
            </span>
          </div>
        </div>
      )}

      {/* Exact text to change + replace with */}
      {item.exact_text && (
        <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {item.location && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: '#7c3aed', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 7, padding: '4px 9px', alignSelf: 'flex-start' }}>
              <MapPin size={10} /> Where: {item.location}
            </div>
          )}
          <div style={{ border: '1px solid rgba(239,68,68,0.25)', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(239,68,68,0.07)', borderBottom: '1px solid rgba(239,68,68,0.18)', fontSize: 10, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <FileEdit size={11} /> Current text to change
            </div>
            <div style={{ padding: '9px 10px', fontSize: 11.5, color: '#7f1d1d', lineHeight: 1.55, background: '#fffafb', maxHeight: 150, overflowY: 'auto' }}>“{item.exact_text}”</div>
          </div>
          {item.replacement && (
            <div style={{ border: '1px solid rgba(16,185,129,0.3)', borderRadius: 9, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(16,185,129,0.2)', fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Replace size={11} /> Replace with (ready to paste)
              </div>
              <div style={{ padding: '9px 10px', fontSize: 11.5, color: '#064e3b', lineHeight: 1.55, background: '#f6fef9', maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{item.replacement}</div>
            </div>
          )}
        </div>
      )}

      {/* Business impact + expected improvement */}
      {(business || expected) && (
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {business && (
            <span style={{ flex: '1 1 55%', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 9, padding: '8px 10px' }}>
              <strong style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><TrendingUp size={11} color="#059669" /> Business impact</strong>
              {business}
            </span>
          )}
          {expected && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '8px 10px', display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
              <Zap size={11} /> {expected}
            </span>
          )}
        </div>
      )}

      {/* Meters */}
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 16 }}>
        <MeterBar label="Ranking Impact" value={impact} gradient={AI_GRADIENT} color="#8b5cf6" />
        <MeterBar
          label="AI Confidence"
          value={confidence}
          gradient="linear-gradient(135deg,#10b981,#34d399)"
          color="#059669"
          tooltip={confidenceBasis}
        />
      </div>

      {/* Fix */}
      {fix && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={11} color="#8b5cf6" /> Suggested fix
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{fix}</div>
        </div>
      )}

      {/* Framework snippets */}
      {available.length > 0 && activeSnippet && code !== undefined && code !== '' && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileCode size={11} color="#8b5cf6" /> Code before / after
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
            {available.map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setActiveFw(key); setShowAfter(true); }}
                style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid ' + (effectiveFw === key ? 'rgba(139,92,246,0.5)' : 'var(--border)'),
                  background: effectiveFw === key ? 'rgba(139,92,246,0.10)' : 'var(--bg-white)',
                  color: effectiveFw === key ? '#7c3aed' : 'var(--text-secondary)',
                }}
              >{label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
            {activeSnippet.before && activeSnippet.after && (
              <>
                <button onClick={() => setShowAfter(true)} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, cursor: 'pointer', border: '1px solid ' + (showAfter ? 'rgba(16,185,129,0.4)' : 'var(--border)'), background: showAfter ? 'rgba(16,185,129,0.10)' : 'var(--bg-white)', color: showAfter ? '#059669' : 'var(--text-secondary)' }}>After</button>
                <button onClick={() => setShowAfter(false)} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, cursor: 'pointer', border: '1px solid ' + (!showAfter ? 'rgba(239,68,68,0.4)' : 'var(--border)'), background: !showAfter ? 'rgba(239,68,68,0.10)' : 'var(--bg-white)', color: !showAfter ? '#dc2626' : 'var(--text-secondary)' }}>Before</button>
              </>
            )}
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(code || ''); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* noop */ }
              }}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 5, border: '1px solid var(--border)', background: copied ? '#d1fae5' : 'var(--bg-white)', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: copied ? '#065f46' : 'var(--text-secondary)' }}
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}{copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre style={{ margin: 0, padding: 10, background: '#0f172a', color: '#e2e8f0', borderRadius: 9, fontSize: 10.5, lineHeight: 1.55, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>{code}</pre>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: effColor(item.effort) + '16', color: effColor(item.effort), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={10} /> {item.effort || 'MEDIUM'} effort
        </span>
        {item.estimated_time_minutes > 0 && (
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} /> ~{item.estimated_time_minutes} min
          </span>
        )}
        {deps.length > 0 && (
          <Tip text={`Resolve these first: ${deps.join(', ')}`}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#b45309', background: 'rgba(245,158,11,0.12)', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <GitBranch size={10} /> {deps.length} dep{deps.length > 1 ? 's' : ''}
            </span>
          </Tip>
        )}
        {item.status && item.status !== 'open' && (
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.12)', color: '#2563eb' }}>{item.status}</span>
        )}
        {item.fix_code && (
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{item.fix_code}</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={async () => {
              try { await navigator.clipboard.writeText(fix); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* noop */ }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: copied ? '#d1fae5' : 'var(--bg-white)', cursor: 'pointer', fontSize: 10.5, fontWeight: 700, color: copied ? '#065f46' : 'var(--text-secondary)' }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}{copied ? 'Copied' : 'Copy'}
          </button>
          {item.fix_code && (
            <button
              onClick={() => setOpenFix(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: 'none', background: AI_GRADIENT, cursor: 'pointer', fontSize: 10.5, fontWeight: 700, color: '#fff' }}
            >
              <Code2 size={11} /> Apply fix
            </button>
          )}
        </div>
      </div>

      {openFix && (
        <AiActionModal
          issue={{ ...item, title, ai_fix: item.fix_code }}
          onClose={() => setOpenFix(false)}
        />
      )}
    </div>
  );
}
