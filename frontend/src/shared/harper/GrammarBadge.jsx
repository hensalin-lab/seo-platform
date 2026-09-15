import { useState, useRef, useEffect, useCallback } from 'react';
import './harper.css';

export default function GrammarBadge({ text, lints, loading, onApplyFix, onIgnoreAll, onAddToDictionary, canUndo, canRedo, onUndo, onRedo }) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const badgeRef = useRef(null);

  const totalCount = lints.length;
  const level = totalCount === 0 ? 'clean' : totalCount <= 3 ? 'minor' : 'major';

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    const rect = badgeRef.current.getBoundingClientRect();
    setPopoverPos({
      top: rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - 360),
    });
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (open && !e.target.closest('.harper-popover') && !e.target.closest('.harper-badge')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleApply = (lint) => {
    if (onApplyFix) {
      onApplyFix(text, lint, 0);
      setOpen(false);
    }
  };

  return (
    <>
      <span
        ref={badgeRef}
        className="harper-badge"
        data-level={level}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        {loading ? (
          <>
            <span className="harper-loading-dot" style={{ width: 3, height: 3 }} />
            Checking...
          </>
        ) : totalCount === 0 ? (
          '✓ Clean'
        ) : (
          `${totalCount} issue${totalCount !== 1 ? 's' : ''}`
        )}
      </span>

      {open && (
        <div
          className="harper-popover"
          style={{ top: popoverPos.top, left: popoverPos.left, maxHeight: 300, overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {lints.length === 0 ? (
            <div className="harper-popover-message">No issues found.</div>
          ) : (
            lints.slice(0, 15).map((lint, i) => (
              <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < Math.min(lints.length, 15) - 1 ? '1px solid #e2e5ea' : 'none' }}>
                <div className="harper-popover-kind" data-kind={(lint.lintKind || 'other').toLowerCase()}>
                  {lint.lintKindPretty || lint.lintKind || 'Issue'}
                </div>
                <div className="harper-popover-message" style={{ marginBottom: 4 }}>{lint.message}</div>
                {lint.suggestions?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button className="harper-apply-btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => handleApply(lint)}>
                      Apply: {lint.suggestions[0].replacementText || 'Remove'}
                    </button>
                  </div>
                )}
                {(onIgnoreAll || onAddToDictionary) && (
                  <div className="harper-popover-secondary-actions">
                    {onIgnoreAll && (
                      <button className="harper-link-btn" onClick={() => { onIgnoreAll(lint); }}>Ignore all</button>
                    )}
                    {onAddToDictionary && lint.problemText?.trim().split(/\s+/)[0] && (
                      <button className="harper-link-btn" onClick={() => { onAddToDictionary(lint.problemText.trim().split(/\s+/)[0]); }}>
                        Add to dictionary
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {(onUndo || onRedo) && (
            <div className="harper-undo-row">
              <button className="harper-undo-btn" disabled={!canUndo} onClick={onUndo}>Undo</button>
              <button className="harper-undo-btn" disabled={!canRedo} onClick={onRedo}>Redo</button>
            </div>
          )}
          {lints.length > 15 && (
            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
              + {lints.length - 15} more issues
            </div>
          )}
        </div>
      )}
    </>
  );
}
