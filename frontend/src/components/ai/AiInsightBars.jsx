import { BarChart3, Sparkles } from 'lucide-react';
import { AI_GRADIENT, AI_GRADIENT_SOFT } from './theme';

export default function AiInsightBars({ items = [], title = 'AI Impact Ranking', subtitle = 'Biggest ranking wins, sorted by AI-estimated impact', maxBars = 6 }) {
  if (!items || items.length === 0) return null;

  const ranked = [...items]
    .map(item => ({ ...item, _impact: Math.min(100, Math.max(0, Number(item.ai_impact_pct ?? item.impact_pct ?? 0))) }))
    .sort((a, b) => b._impact - a._impact)
    .slice(0, maxBars);

  const maxVal = Math.max(...ranked.map(r => r._impact), 1);

  return (
    <div style={{
      background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 14,
      padding: '16px 18px', boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: AI_GRADIENT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChart3 size={13} color="#8b5cf6" />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
        <Sparkles size={11} color="#8b5cf6" />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>{subtitle}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ranked.map((item, i) => {
          const pct = (item._impact / maxVal) * 100;
          return (
            <div key={item.id || i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 5, background: i === 0 ? AI_GRADIENT : 'var(--bg-secondary)', color: i === 0 ? '#fff' : 'var(--text-muted)', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.signal_name || item.title || 'Suggestion'}</span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: i === 0 ? '#7c3aed' : 'var(--text-muted)' }}>{item._impact}%</span>
              </div>
              <div style={{ height: 7, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.max(pct, item._impact > 0 ? 4 : 0)}%`, borderRadius: 4,
                  background: i === 0 ? AI_GRADIENT : 'linear-gradient(90deg,#a5b4fc,#c4b5fd)',
                  opacity: 0.9, transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
