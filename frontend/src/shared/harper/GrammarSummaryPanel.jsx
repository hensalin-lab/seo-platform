import './harper.css';

const KIND_CONFIG = {
  spelling: { color: '#ef4444', label: 'Spelling' },
  grammar: { color: '#f59e0b', label: 'Grammar' },
  style: { color: '#8b5cf6', label: 'Style' },
  punctuation: { color: '#3b82f6', label: 'Punctuation' },
  clarity: { color: '#06b6d4', label: 'Clarity' },
};

function scoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Needs work';
  return 'Poor';
}

function scoreColor(score) {
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#f59e0b';
  if (score >= 50) return '#f97316';
  return '#ef4444';
}

export default function GrammarSummaryPanel({ totalCount, categoryCounts, loading, writingScore }) {
  const hasScore = typeof writingScore === 'number';
  const score = hasScore ? writingScore : totalCount === 0 ? 100 : Math.max(0, 100 - totalCount * 4);
  const countLevel = totalCount === 0 ? '0' : totalCount <= 5 ? '1-5' : '6+';
  const kinds = Object.entries(categoryCounts).filter(([, c]) => c > 0);

  return (
    <div className="harper-summary">
      <div className="harper-summary-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
        </svg>
        Grammar Check
        {loading && <span className="harper-loading"><span className="harper-loading-dot" /><span className="harper-loading-dot" /><span className="harper-loading-dot" /></span>}
      </div>

      {hasScore && (
        <div className="harper-score">
          <div className="harper-score-head">
            <span className="harper-score-label">Writing Score</span>
            <span className="harper-score-value" style={{ color: scoreColor(score) }}>{score}</span>
          </div>
          <div className="harper-score-bar">
            <div className="harper-score-fill" style={{ width: `${score}%`, background: scoreColor(score) }} />
          </div>
          <div className="harper-score-sub">{scoreLabel(score)}</div>
        </div>
      )}

      <div className="harper-summary-total" data-count={countLevel}>
        {totalCount}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: kinds.length > 0 ? 10 : 0 }}>
        {totalCount === 0 ? 'No issues found' : `issue${totalCount !== 1 ? 's' : ''} found`}
      </div>

      {kinds.map(([kind, count]) => {
        const cfg = KIND_CONFIG[kind] || { color: '#6b7280', label: kind };
        return (
          <div key={kind} className="harper-summary-row">
            <div className="harper-summary-label">
              <span className="harper-summary-dot" style={{ background: cfg.color }} />
              {cfg.label}
            </div>
            <div className="harper-summary-count">{count}</div>
          </div>
        );
      })}
    </div>
  );
}