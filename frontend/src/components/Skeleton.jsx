import React from 'react';

const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}
`;

function injectStyles() {
  if (typeof document !== 'undefined' && !document.getElementById('skeleton-styles')) {
    const style = document.createElement('style');
    style.id = 'skeleton-styles';
    style.textContent = shimmerKeyframes;
    document.head.appendChild(style);
  }
}

injectStyles();

const baseStyle = {
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
  backgroundSize: '400px 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 6,
};

export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return <div style={{ ...baseStyle, width, height, ...style }} />;
}

export function SkeletonCircle({ size = 40, style = {} }) {
  return <div style={{ ...baseStyle, width: size, height: size, borderRadius: '50%', ...style }} />;
}

export function SkeletonCard({ lines = 3, style = {} }) {
  return (
    <div style={{ padding: 20, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          height={12}
          width={i === lines - 1 ? '60%' : '100%'}
          style={{ marginBottom: i < lines - 1 ? 10 : 0 }}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} height={14} width={`${100 / cols}%`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} height={12} width={`${100 / cols}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 16, marginBottom: 24 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: 20, borderRadius: 8, border: '1px solid var(--border)' }}>
          <SkeletonLine width="60%" height={12} style={{ marginBottom: 12 }} />
          <SkeletonLine width="40%" height={28} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <SkeletonLine width="300px" height={28} style={{ marginBottom: 8 }} />
        <SkeletonLine width="200px" height={14} />
      </div>
      <SkeletonStatCards />
      <div style={{ borderRadius: 8, border: '1px solid var(--border)' }}>
        <SkeletonTable rows={8} cols={6} />
      </div>
    </div>
  );
}
