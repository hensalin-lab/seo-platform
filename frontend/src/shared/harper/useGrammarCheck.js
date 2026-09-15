import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEYS = {
  words: 'harper.customWords',
  ignored: 'harper.ignoredLints',
};

function safeGetItem(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch (err) {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    // no-op
  }
}

function loadStorageList(key) {
  const raw = safeGetItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

let workerInstance = null;
let messageId = 0;
let workerInitialized = false;
const pendingCallbacks = new Map();

function getWorker() {
  if (workerInstance) return workerInstance;
  workerInstance = new Worker(
    new URL('./worker.js', import.meta.url),
    { type: 'module' }
  );
  workerInstance.onmessage = (e) => {
    const { id, lints, error, ok, words, ignored } = e.data;
    const cb = pendingCallbacks.get(id);
    if (cb) {
      pendingCallbacks.delete(id);
      cb(lints || [], error, ok, { words, ignored });
    }
  };
  return workerInstance;
}

function postWorker(message) {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    const worker = getWorker();
    pendingCallbacks.set(id, (lints, error, ok, extra) => {
      if (error && !ok) reject(new Error(error));
      else resolve({ lints, ok, ...extra });
    });
    worker.postMessage({ id, ...message });
  });
}

async function initWorker() {
  if (workerInitialized) return;
  workerInitialized = true;
  try {
    await postWorker({
      action: 'init',
      payload: {
        words: loadStorageList(STORAGE_KEYS.words),
        ignored: loadStorageList(STORAGE_KEYS.ignored),
      },
    });
  } catch (err) {
    workerInitialized = false;
  }
}

function computeWritingScore(categoryCounts) {
  const penalties = {
    spelling: 8,
    grammar: 5,
    punctuation: 3,
    style: 2,
    clarity: 2,
  };
  let deductions = 0;
  for (const [kind, count] of Object.entries(categoryCounts)) {
    deductions += (penalties[kind] || 2) * count;
  }
  return Math.max(0, Math.min(100, 100 - deductions));
}

export function useGrammarCheck(text, options = {}) {
  const { debounceMs = 500, enabled = true } = options;
  const [lints, setLints] = useState([]);
  const [loading, setLoading] = useState(false);

  const timerRef = useRef(null);
  const idRef = useRef(0);
  const mountedRef = useRef(true);

  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const lastTextRef = useRef(text);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    lastTextRef.current = text;

    if (!enabled || !text || text.trim().length < 3) {
      setLints([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const id = ++messageId;
      idRef.current = id;
      setLoading(true);

      try {
        await initWorker();
        const result = await postWorker({ action: 'lint', text });
        if (!mountedRef.current || idRef.current !== id) return;
        setLints(result.lints);
      } catch (err) {
        if (mountedRef.current && idRef.current === id) {
          setLints([]);
        }
      } finally {
        if (mountedRef.current && idRef.current === id) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, debounceMs, enabled]);

  const applyFix = useCallback((currentText, lint, suggestionIndex = 0) => {
    if (!lint || !lint.suggestions || !lint.suggestions[suggestionIndex]) return currentText;
    const { span } = lint;
    const replacement = lint.suggestions[suggestionIndex].replacementText;
    const newText = currentText.slice(0, span.start) + replacement + currentText.slice(span.end);
    if (newText !== currentText) {
      undoStackRef.current = [...undoStackRef.current.slice(-99), currentText];
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);
    }
    return newText;
  }, []);

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return undefined;
    const prev = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, lastTextRef.current];
    lastTextRef.current = prev;
    setHistoryVersion((v) => v + 1);
    return prev;
  }, []);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return undefined;
    const next = stack[stack.length - 1];
    redoStackRef.current = stack.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, lastTextRef.current];
    lastTextRef.current = next;
    setHistoryVersion((v) => v + 1);
    return next;
  }, []);

  const makeKey = useCallback((lint) => {
    return lint._key || `${lint.message}|${lint.lintKind}|${lint.span?.start}|${lint.span?.end}`;
  }, []);

  const ignoreAll = useCallback(async (lint) => {
    if (!lint) return;
    const key = makeKey(lint);
    try {
      await initWorker();
      const { ok, ignored } = await postWorker({ action: 'ignore-all', payload: { key } });
      if (ok && ignored) safeSetItem(STORAGE_KEYS.ignored, ignored);
      if (ok) setLints((prev) => prev.filter((l) => makeKey(l) !== key));
    } catch (err) {
      // no-op
    }
  }, [makeKey]);

  const addToDictionary = useCallback(async (word) => {
    if (!word || !word.trim()) return;
    try {
      await initWorker();
      const { ok, words } = await postWorker({ action: 'add-word', payload: { word: word.trim() } });
      if (ok && words) safeSetItem(STORAGE_KEYS.words, words);
    } catch (err) {
      // no-op
    }
  }, []);

  const bulkFix = useCallback(async (sourceText) => {
    if (!sourceText || lints.length === 0) return null;
    try {
      await initWorker();
      const { ok, text: fixed, applied } = await postWorker({
        action: 'bulk-fix',
        payload: { text: sourceText, lints },
      });
      if (ok && typeof fixed === 'string' && fixed !== sourceText && applied > 0) {
        undoStackRef.current = [...undoStackRef.current.slice(-99), sourceText];
        redoStackRef.current = [];
        setHistoryVersion((v) => v + 1);
        return { text: fixed, applied };
      }
      return ok ? { text: sourceText, applied: applied || 0 } : null;
    } catch (err) {
      return null;
    }
  }, [lints]);

  const categoryCounts = {};
  for (const lint of lints) {
    const kind = (lint.lintKind || 'other').toLowerCase();
    categoryCounts[kind] = (categoryCounts[kind] || 0) + 1;
  }

  return {
    lints,
    loading,
    totalCount: lints.length,
    categoryCounts,
    writingScore: computeWritingScore(categoryCounts),
    applyFix,
    ignoreAll,
    addToDictionary,
    bulkFix,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    undo,
    redo,
    historyVersion,
  };
}

export function useGrammarCheckInput(text, options = {}) {
  return useGrammarCheck(text, options);
}