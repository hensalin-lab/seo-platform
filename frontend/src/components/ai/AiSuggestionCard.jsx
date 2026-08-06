import { useState } from 'react';
import { Sparkles, Copy, Check, Lightbulb, TrendingUp, ShieldCheck, Zap, Code2 } from 'lucide-react';
import AiActionModal from '../AiActionModal';
import { AI_GRADIENT, sevColor, effColor, priColor, catColor } from './theme';

function MeterBar({ label, value, gradient, color }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ fontSize: 11.5, fontWeight: 800, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: gradient || color, transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  );
}

export default function AiSuggestionCard({ item, index = 0 }) {
  const [copied, setCopied] = useState(false);
  const [openFix, setOpenFix] = useState(false);

  if (!item) return null;

  const title = item.signal_name || item.title || 'AI Suggestion';
  const impact = item.ai_impact_pct ?? (item.impact_score ?? 0);
  const confidence = item.ai_confidence ?? 0;
  const why = item.ai_why || item.root_cause || item.impact || '';
  const fix = item.fix || item.specific_steps?.join('. ') || '';
  const sev = sevColor(item.severity);
  const priority = (item.priority || 'P2').toUpperCase();
  const delay = `${Math.min(index * 70, 420)}ms`;

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

      {/* Meters */}
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 16 }}>
        <MeterBar label="Ranking Impact" value={impact} gradient={AI_GRADIENT} color="#8b5cf6" />
        <MeterBar label="AI Confidence" value={confidence} gradient="linear-gradient(135deg,#10b981,#34d399)" color="#059669" />
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

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: effColor(item.effort) + '16', color: effColor(item.effort), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={10} /> {item.effort || 'MEDIUM'} effort
        </span>
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
