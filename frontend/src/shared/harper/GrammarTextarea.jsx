import { useState, useRef, useEffect, useCallback } from 'react';
import { useGrammarCheck } from './useGrammarCheck';
import GrammarInline from './GrammarInline';
import GrammarBadge from './GrammarBadge';
import './harper.css';

export default function GrammarTextarea({
  value,
  onChange,
  debounceMs = 500,
  showBadge = true,
  badgePosition = 'below',
  placeholder,
  rows,
  style,
  className,
  onFocus,
  onBlur,
  ...rest
}) {
  const textareaRef = useRef(null);
  const [text, setText] = useState(value || '');
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== undefined && value !== prevValueRef.current) {
      prevValueRef.current = value;
      setText(value);
    }
  }, [value]);

  const { lints, loading, applyFix, ignoreAll, addToDictionary, canUndo, canRedo, undo, redo } = useGrammarCheck(text, { debounceMs });

  const handleChange = (e) => {
    setText(e.target.value);
    onChange?.(e.target.value, e);
  };

  const handleApplyFix = useCallback((currentText, lint, idx) => {
    const newText = applyFix(currentText, lint, idx);
    if (newText !== currentText) {
      setText(newText);
      onChange?.(newText);
    }
    return newText;
  }, [applyFix, onChange]);

  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev !== undefined) {
      setText(prev);
      onChange?.(prev);
    }
  }, [undo, onChange]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next !== undefined) {
      setText(next);
      onChange?.(next);
    }
  }, [redo, onChange]);

  useEffect(() => {
    const handler = (e) => {
      const { newText } = e.detail;
      if (newText) {
        setText(newText);
        onChange?.(newText);
      }
    };
    const ta = textareaRef.current;
    if (ta) ta.addEventListener('harper-apply-fix', handler);
    return () => { if (ta) ta.removeEventListener('harper-apply-fix', handler); };
  }, [onChange]);

  return (
    <div className="harper-wrapper" style={{ width: '100%' }}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        style={style}
        className={className}
        onFocus={onFocus}
        onBlur={onBlur}
        {...rest}
      />
      {showBadge && (
        <div
          style={
            badgePosition === 'below'
              ? { marginTop: 4, zIndex: 5, position: 'relative' }
              : { position: 'absolute', top: 6, right: 10, pointerEvents: 'auto', zIndex: 5 }
          }
        >
          <GrammarBadge text={text} lints={lints} loading={loading} onApplyFix={handleApplyFix} onIgnoreAll={ignoreAll} onAddToDictionary={addToDictionary} canUndo={canUndo} canRedo={canRedo} onUndo={handleUndo} onRedo={handleRedo} />
        </div>
      )}
      <GrammarInline
        text={text}
        lints={lints}
        loading={loading}
        onApplyFix={handleApplyFix}
        onIgnoreAll={ignoreAll}
        onAddToDictionary={addToDictionary}
        textareaRef={textareaRef}
      />
    </div>
  );
}