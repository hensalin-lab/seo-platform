import { WorkerLinter } from 'harper.js';
import { binaryInlined } from 'harper.js/binaryInlined';
import { applyRules } from '../grammar-rules/applyRules';

let linter = null;
let ignoredHashes = new Set();
let importedWords = new Set();

function makeLintKey(lint) {
  return `${lint.message()}|${lint.lint_kind()}|${lint.span().start}|${lint.span().end}`;
}

function serializeLint(lint) {
  const span = lint.span();
  const suggestions = [];
  for (const s of lint.suggestions()) {
    suggestions.push({
      replacementText: s.get_replacement_text(),
      kind: s.kind(),
    });
  }
  return {
    message: lint.message(),
    lintKind: lint.lint_kind(),
    lintKindPretty: lint.lint_kind_pretty(),
    problemText: lint.get_problem_text(),
    span: { start: span.start, end: span.end },
    suggestions,
    _key: makeLintKey(lint),
  };
}

self.onmessage = async (e) => {
  const { id, text, action, payload } = e.data;

  try {
    if (!linter) {
      linter = new WorkerLinter({ binary: binaryInlined });
      await linter.setup();
    }

    if (action === 'init') {
      const words = Array.isArray(payload?.words) ? payload.words : [];
      const ignored = Array.isArray(payload?.ignored) ? payload.ignored : [];
      importedWords = new Set(words);
      if (words.length > 0) {
        await linter.importWords(words);
      }
      ignoredHashes = new Set(ignored);
      self.postMessage({ id, ok: true, words: [...importedWords], ignored: [...ignoredHashes] });
      return;
    }

    if (action === 'add-word') {
      const word = (payload?.word || '').trim();
      if (word) {
        importedWords.add(word);
        await linter.importWords([word]);
      }
      self.postMessage({ id, ok: true, words: [...importedWords] });
      return;
    }

    if (action === 'ignore-all') {
      if (payload?.key) ignoredHashes.add(payload.key);
      self.postMessage({ id, ok: true, ignored: [...ignoredHashes] });
      return;
    }

    if (action === 'lint') {
      const rawLints = await linter.lint(text);
      const serialized = [];
      for (const lint of rawLints) {
        const s = serializeLint(lint);
        if (!ignoredHashes.has(s._key)) {
          serialized.push(s);
        }
      }

      // High-confidence rule layer. A rule lint is dropped when Harper already
      // flagged the same span (Harper wins), or when it overlaps a kept rule lint.
      const ruleLints = applyRules(text);
      for (const rl of ruleLints) {
        if (ignoredHashes.has(rl._key)) continue;
        const overlapsHarper = serialized.some((h) => rl.span.start < h.span.end && h.span.start < rl.span.end);
        if (overlapsHarper) continue;
        serialized.push(rl);
      }
      self.postMessage({ id, lints: serialized });
      return;
    }

    if (action === 'bulk-fix') {
      const source = typeof payload?.text === 'string' ? payload.text : '';
      const sourceLints = Array.isArray(payload?.lints) ? payload.lints : [];
      const candidates = sourceLints
        .filter((l) => l && l.span && l.suggestions && l.suggestions.length > 0)
        .filter((l) => !ignoredHashes.has(l._key))
        .map((l) => ({ start: l.span.start, end: l.span.end, replacement: l.suggestions[0].replacementText }))
        .filter((l) => l.start >= 0 && l.end <= source.length)
        .sort((a, b) => b.start - a.start);

      const appliedRanges = [];
      let result = source;
      let applied = 0;
      for (const lint of candidates) {
        const overlaps = appliedRanges.some(([s, e]) => lint.start < e && s < lint.end);
        if (overlaps) continue;
        result = result.slice(0, lint.start) + lint.replacement + result.slice(lint.end);
        appliedRanges.push([lint.start, lint.end]);
        applied += 1;
      }
      self.postMessage({ id, ok: true, text: result, applied });
      return;
    }

    self.postMessage({ id, lints: [], error: 'Unknown action' });
  } catch (err) {
    self.postMessage({ id, lints: [], error: err.message });
  }
};