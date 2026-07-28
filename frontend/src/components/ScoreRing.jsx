import { useState, useEffect } from 'react';
import AnimatedNumber from './AnimatedNumber';

export default function ScoreRing({ score, size = 100, stroke = 8, label, style }) {
  const [mounted, setMounted] = useState(false);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const offset = mounted ? c - (pct / 100) * c : c;

  let color = '#fa5252';
  let glowColor = 'rgba(250,82,82,0.3)';
  if (pct >= 80) { color = '#12b886'; glowColor = 'rgba(18,184,134,0.3)'; }
  else if (pct >= 60) { color = '#4c6ef5'; glowColor = 'rgba(76,110,245,0.3)'; }
  else if (pct >= 40) { color = '#f59f00'; glowColor = 'rgba(245,159,11,0.3)'; }

  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div className={pct >= 80 ? 'score-celebrate' : ''} style={{ position: 'relative', width: size, height: size, ...style }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 8px ${glowColor})` }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-light, #eef0f2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color, lineHeight: 1 }}>
          <AnimatedNumber value={pct} duration={1400} />
        </span>
        {label && <span style={{ fontSize: 10, color: 'var(--text-muted, #8a8f9e)', marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  );
}
