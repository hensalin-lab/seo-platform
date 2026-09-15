export { default as rulesData } from './rules.json';
export {
  RULES,
  NOOPS,
  applyRules,
  ruleExamples,
  ruleCountsByCategory,
  normalizeText,
  wsOnlyText,
} from './applyRules';
export { runAccuracySelfTest } from './frontendEval';