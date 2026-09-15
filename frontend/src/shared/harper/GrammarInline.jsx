import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import './harper.css';

let measureCanvas = null;

function measureTextWidth(text, font) {
  if (typeof document === 'undefined' || !text) return 0;
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureCanvas.width = 2048;
    measureCanvas.height = 64;
  }
  return measureCanvas.getContext('2d').measureText(text).width;
}

function computeLinePrefixes(text, line, font) {
  const prefix = [0];
  let acc = 0;
  for (let i = line.start; i < line.end; i += 1) {
    acc += measureTextWidth(text[i], font);
    prefix.push(acc);
  }
  return prefix;
}

function buildLineLayout(text, maxWidth, font) {
  const lines = [{ start: 0, x: 0 }];
  let lineIndex = 0;
  let penX = 0;
  let lineHasContent = false;
  let lastSpaceIndex = -1;
  let cursor = 0;

  const commit = (nextStart) => {
    lines[lineIndex].end = cursor;
    lineIndex += 1;
    lines.push({ start: nextStart, x: 0 });
    penX = 0;
    lineHasContent = false;
    lastSpaceIndex = -1;
  };

  while (cursor < text.length) {
    const ch = text[cursor];

    if (ch === '\n') {
      lines[lineIndex].end = cursor;
      lineIndex += 1;
      lines.push({ start: cursor + 1, x: 0 });
      penX = 0;
      lineHasContent = false;
      lastSpaceIndex = -1;
      cursor += 1;
      continue;
    }

    const w = measureTextWidth(ch, font);

    if (penX + w > maxWidth && lineHasContent) {
      if (lastSpaceIndex >= lines[lineIndex].start) {
        commit(lastSpaceIndex + 1);
        continue;
      }
      lines[lineIndex].end = cursor;
      lineIndex += 1;
      lines.push({ start: cursor, x: 0 });
      penX = 0;
      lineHasContent = false;
      lastSpaceIndex = -1;
    }

    if (ch === ' ' && !lineHasContent) {
      const lineStartChar = lines[lineIndex].start;
      if (lineStartChar < text.length && text[lineStartChar] === ' ') {
        lines[lineIndex].x += w;
        penX += w;
      }
      lastSpaceIndex = cursor;
      cursor += 1;
      continue;
    }

    penX += w;
    lineHasContent = true;
    if (ch === ' ') lastSpaceIndex = cursor;
    cursor += 1;
  }

  lines[lineIndex].end = text.length;
  for (let i = 0; i < lines.length; i += 1) {
    lines[i].index = i;
    lines[i].prefix = computeLinePrefixes(text, lines[i], font);
  }
  return lines;
}

function spanBoxes(lines, text, span, layout) {
  const { paddingTop, paddingLeft, lineHeight, font } = layout;
  const start = Math.max(0, span.start);
  const end = Math.min(span.end, text.length);
  if (start >= end) return [];

  const boxes = [];
  for (const line of lines) {
    const overlapStart = Math.max(start, line.start);
    const overlapEnd = Math.min(end, line.end);
    if (overlapStart >= overlapEnd) continue;

    const prefix = line.prefix;
    const before = prefix[overlapStart - line.start] || 0;
    const after = prefix[overlapEnd - line.start] || 0;

    boxes.push({
      top: paddingTop + line.index * lineHeight,
      left: paddingLeft + line.x + before,
      width: Math.max(after - before, 4),
      height: lineHeight,
    });
  }
  return boxes;
}

export default function GrammarInline({
  text,
  lints,
  loading,
  onApplyFix,
  onIgnoreAll,
  onAddToDictionary,
  textareaRef,
}) {
  const [activeLint, setActiveLint] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const layout = useMemo(() => {
    const ta = textareaRef?.current;
    if (!ta || !text || lints.length === 0) return null;
    try {
      const style = window.getComputedStyle(ta);
      const lineHeight = parseFloat(style.lineHeight) || 22;
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const fontSize = parseFloat(style.fontSize) || 13;
      const font = `${style.fontStyle || 'normal'} ${style.fontWeight || '400'} ${fontSize}px ${style.fontFamily || 'inherit'}`;
      const contentWidth = ta.clientWidth - paddingLeft - paddingRight;
      if (contentWidth <= 0) return null;
      return {
        lines: buildLineLayout(text, contentWidth, font),
        font,
        paddingTop,
        paddingLeft,
        lineHeight,
      };
    } catch (err) {
      return null;
    }
  }, [text, lints.length, textareaRef]);

  const handleUnderlineClick = useCallback((lint, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPos({
      top: rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - 360),
    });
    setActiveLint((prev) => (prev && prev._key === lint._key ? null : lint));
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (activeLint && !e.target.closest('.harper-popover') && !e.target.closest('.harper-underline')) {
        setActiveLint(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [activeLint]);

  const handleApply = () => {
    if (activeLint && onApplyFix) {
      const newText = onApplyFix(text, activeLint, 0);
      setActiveLint(null);
      if (newText !== text) {
        const event = new CustomEvent('harper-apply-fix', { detail: { newText } });
        textareaRef?.current?.dispatchEvent(event);
      }
    }
  };

  const problemWord = activeLint
    ? (text.slice(activeLint.span?.start || 0, activeLint.span?.end).trim().split(/\s+/)[0] || '')
    : '';

  const overlays = [];
  if (layout && text && lints.length > 0) {
    for (const lint of lints) {
      const boxes = spanBoxes(layout.lines, text, lint.span, layout);
      for (const box of boxes) {
        overlays.push(
          <div
            key={`${lint._key || `${lint.span.start}-${lint.span.end}`}-${box.top}-${box.left}`}
            className="harper-underline"
            data-kind={(lint.lintKind || 'other').toLowerCase()}
            style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
            onClick={(e) => handleUnderlineClick(lint, e)}
            title={lint.message}
          />
        );
      }
      if (overlays.length > 3000) break;
    }
  }

  return (
    <>
      {overlays}
      {loading && (
        <div style={{
          position: 'absolute', top: 4, right: 8,
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 10, color: '#94a3b8', pointerEvents: 'none',
        }}>
          <span className="harper-loading-dot" />
          <span className="harper-loading-dot" />
          <span className="harper-loading-dot" />
        </div>
      )}
      {activeLint && (
        <div
          className="harper-popover"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="harper-popover-kind" data-kind={(activeLint.lintKind || 'other').toLowerCase()}>
            {activeLint.lintKindPretty || activeLint.lintKind || 'Issue'}
          </div>
          <div className="harper-popover-message">{activeLint.message}</div>
          {activeLint.problemText && (
            <div className="harper-popover-suggestion">
              Found: <em>{activeLint.problemText}</em>
            </div>
          )}
          {activeLint.suggestions?.length > 0 && (
            <div className="harper-popover-suggestion">
              Suggestion: <em>{activeLint.suggestions[0].replacementText || 'Remove'}</em>
            </div>
          )}
          <div className="harper-popover-actions">
            {activeLint.suggestions?.length > 0 && (
              <button className="harper-apply-btn" onClick={handleApply}>
                Apply fix
              </button>
            )}
            <button className="harper-dismiss-btn" onClick={() => setActiveLint(null)}>
              Dismiss
            </button>
          </div>
          <div className="harper-popover-secondary-actions">
            {onIgnoreAll && (
              <button className="harper-link-btn" onClick={() => { onIgnoreAll(activeLint); setActiveLint(null); }}>
                Ignore all
              </button>
            )}
            {onAddToDictionary && problemWord && (
              <button className="harper-link-btn" onClick={() => { onAddToDictionary(problemWord); setActiveLint(null); }}>
                Add “{problemWord}” to dictionary
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}