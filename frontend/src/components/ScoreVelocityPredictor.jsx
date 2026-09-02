import { TrendingUp, ArrowUp, Zap } from 'lucide-react';

export default function ScoreVelocityPredictor({ currentScore = 68, criticalCount = 3 }) {
  const gain = Math.min(25, criticalCount * 4.5 + 2);
  const projected = Math.min(100, currentScore + gain);
  const color = projected >= 80 ? '#12b886' : projected >= 60 ? '#3b82f6' : '#f59e0b';

  return (
    <div style={{ background: `linear-gradient(135deg, ${color}08, ${color}02)`, border: `1px solid ${color}20`, borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <TrendingUp size={18} color={color} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Score Velocity Estimate</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Current: <strong style={{ color: 'var(--text)' }}>{currentScore}</strong></span>
            <span>Est. projected: <strong style={{ color }}>{projected}</strong></span>
            <span style={{ color: '#12b886', fontWeight: 600 }}>+{gain} pts</span>
          </div>
          <div style={{ position: 'relative', height: 10, borderRadius: 5, background: '#eef0f2', overflow: 'hidden' }}>
            <div style={{ width: `${currentScore}%`, height: '100%', borderRadius: 5, background: '#94a3b8', transition: 'width 0.5s' }} />
            <div style={{ position: 'absolute', top: 0, left: `${currentScore}%`, width: `${projected - currentScore}%`, height: '100%', borderRadius: '0 5px 5px 0', background: `linear-gradient(90deg, ${color}80, ${color})`, opacity: 0.7 }}>
              <div style={{ position: 'absolute', right: -2, top: -3, width: 16, height: 16, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          <Zap size={12} color="#f59e0b" />
          Fix top {criticalCount} critical issues
        </div>
      </div>
    </div>
  );
}
