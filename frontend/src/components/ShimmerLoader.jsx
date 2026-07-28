export function ShimmerCard() {
  return (
    <div className="shimmer shimmer-card" />
  );
}

export function ShimmerText({ width = '80%' }) {
  return <div className="shimmer shimmer-text" style={{ width }} />;
}

export function ShimmerTitle() {
  return <div className="shimmer shimmer-title" />;
}

export function ShimmerBar() {
  return <div className="shimmer shimmer-bar" style={{ marginBottom: 8 }} />;
}

export function ShimmerScoreGrid({ count = 6 }) {
  return (
    <div className="score-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shimmer" style={{ height: 120, borderRadius: 'var(--radius)' }} />
      ))}
    </div>
  );
}

export function ShimmerStatsRow({ count = 6 }) {
  return (
    <div className="stats-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shimmer" style={{ height: 72, borderRadius: 'var(--radius)' }} />
      ))}
    </div>
  );
}

export default function ShimmerLoader({ type = 'dashboard' }) {
  if (type === 'dashboard') {
    return (
      <div>
        <ShimmerTitle />
        <div className="shimmer shimmer-text" style={{ width: '40%', marginBottom: 24 }} />
        <ShimmerScoreGrid />
        <ShimmerStatsRow />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="shimmer" style={{ height: 200, borderRadius: 'var(--radius)' }} />
          <div className="shimmer" style={{ height: 200, borderRadius: 'var(--radius)' }} />
        </div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="card" style={{ padding: 24 }}>
        <ShimmerTitle />
        <ShimmerBar />
        <ShimmerBar />
        <ShimmerBar />
      </div>
    );
  }

  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );
}
