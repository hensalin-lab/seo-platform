import { ruleExamples, NOOPS, normalizeText, wsOnlyText } from './applyRules';

let evalWorker = null;
let evalMessageId = 0;
const evalPending = new Map();

function getEvalWorker() {
  if (evalWorker) return evalWorker;
  evalWorker = new Worker(
    new URL('../harper/worker.js', import.meta.url),
    { type: 'module' }
  );
  evalWorker.onmessage = (e) => {
    const { id, lints, error, ok, text } = e.data;
    const cb = evalPending.get(id);
    if (cb) {
      evalPending.delete(id);
      cb({ lints: lints || [], error, ok, text });
    }
  };
  return evalWorker;
}

function postEval(message) {
  return new Promise((resolve, reject) => {
    const id = ++evalMessageId;
    const worker = getEvalWorker();
    evalPending.set(id, (resp) => {
      if (resp.error && resp.ok !== true) reject(new Error(resp.error));
      else resolve(resp);
    });
    worker.postMessage({ id, ...message });
  });
}

async function correctText(text) {
  const { lints } = await postEval({ action: 'lint', text });
  const { ok, text: fixed } = await postEval({
    action: 'bulk-fix',
    payload: { text, lints },
  });
  return ok ? (fixed ?? text) : text;
}

/**
 * End-to-end accuracy self-test for the full pipeline (Harper + rules),
 * run entirely in-browser against the embedded gold pairs.
 */
export async function runAccuracySelfTest({ limit = 60 } = {}) {
  const examples = ruleExamples().slice(0, limit);
  let fixesApplied = 0;
  let correctFixes = 0;
  let errors = 0;
  let missed = 0;
  let harmed = 0;
  const byRule = {};

  const sample = [];
  for (const ex of examples) {
    const isError = wsOnlyText(ex.input) !== wsOnlyText(ex.gold);
    if (isError) errors += 1;
    const result = await correctText(ex.input);
    const match = normalizeText(result) === normalizeText(ex.gold);
    const changed = normalizeText(result) !== normalizeText(ex.input);
    if (changed) fixesApplied += 1;
    if (isError && match) correctFixes += 1;
    if (isError && !match) missed += 1;
    if (!isError && changed) harmed += 1;
    byRule[ex.id] = byRule[ex.id] || { errors: 0, correct: 0 };
    if (isError) {
      byRule[ex.id].errors += 1;
      if (match) byRule[ex.id].correct += 1;
    }
    if (sample.length < 12 && isError) {
      sample.push({ id: ex.id, input: ex.input, gold: ex.gold, result, correct: match });
    }
  }

  let noopChecks = 0;
  let noopTouched = 0;
  for (const clean of NOOPS) {
    noopChecks += 1;
    const result = await correctText(clean);
    if (normalizeText(result) !== normalizeText(clean)) noopTouched += 1;
  }

  const precision = fixesApplied > 0 ? correctFixes / fixesApplied : null;
  const recall = errors > 0 ? correctFixes / errors : null;
  const f1 = precision && recall && precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : null;
  const noopPreserve = noopChecks > 0 ? 1 - noopTouched / noopChecks : null;

  return {
    examples: examples.length,
    noops: noopChecks,
    errors,
    fixesApplied,
    correctFixes,
    missed,
    harmed,
    precision,
    recall,
    f1,
    noopPreserve,
    byRule,
    sample,
  };
}