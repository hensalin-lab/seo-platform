import RULES_DATA from './rules.json';

export const RULES = RULES_DATA.rules;
export const NOOPS = RULES_DATA.noops || [];

const KIND_PRETTY = {
  grammar: 'Grammar',
  spelling: 'Spelling',
  punctuation: 'Punctuation',
  style: 'Style',
};

const compiled = RULES.map((rule) => ({
  rule,
  regex: new RegExp(rule.pattern, rule.caseInsensitive ? 'gi' : 'g'),
}));

function makeKey(message, lintKind, start, end) {
  return `${message}|${lintKind}|${start}|${end}`;
}

function applyReplacement(template, match) {
  return template.replace(/\$(\d+)/g, (_, n) => {
    const g = match[n];
    return g === undefined ? '' : g;
  });
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str[0].toUpperCase() + str.slice(1);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Run the high-confidence rule table over `text`.
 * Returns lint-shaped records compatible with the harper worker protocol:
 *   { message, lintKind, lintKindPretty, problemText, span, suggestions, _key, source, ruleId }
 * Overlapping rule matches are deduped (first rule in the table wins).
 */
export function applyRules(text) {
  if (!text) return [];
  const results = [];
  const used = [];

  for (const { rule, regex } of compiled) {
    regex.lastIndex = 0;
    let m;
    // eslint-disable-next-line no-cond-assign
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (used.some(([s, e]) => overlaps(s, e, start, end))) {
        if (m[0].length === 0) regex.lastIndex += 1;
        continue;
      }
      let replacement = applyReplacement(rule.replacement, m);
      if (m[0] && /^[A-Z]/.test(m[0]) && /^[a-z]/.test(replacement[0])) {
        replacement = capitalizeFirst(replacement);
      }
      const lintKind = rule.category;
      const message = `${KIND_PRETTY[lintKind] || 'Grammar'} issue: '${m[0]}' should be '${replacement}'`;
      const span = { start, end };
      used.push([start, end]);
      results.push({
        message,
        lintKind,
        lintKindPretty: KIND_PRETTY[lintKind] || 'Grammar',
        problemText: m[0],
        span,
        suggestions: [{ replacementText: replacement, kind: 'replacement' }],
        _key: makeKey(message, lintKind, start, end),
        source: 'rules',
        ruleId: rule.id,
        confidence: rule.confidence,
      });
      if (m[0].length === 0) regex.lastIndex += 1;
    }
  }
  return results;
}

export function ruleExamples() {
  return RULES.filter((r) => r.gold && r.example)
    .map((r) => ({ id: r.id, input: r.example, gold: r.gold }));
}

export function ruleCountsByCategory() {
  const counts = {};
  for (const rule of RULES) {
    counts[rule.category] = (counts[rule.category] || 0) + 1;
  }
  return counts;
}

export function normalizeText(text) {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function wsOnlyText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}