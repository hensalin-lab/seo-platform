export const AI_GRADIENT = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #d946ef 100%)';
export const AI_GRADIENT_SOFT = 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(217,70,239,0.08))';
export const AI_GRADIENT_GLOW = '0 0 24px rgba(139,92,246,0.18)';

export const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  INFO: '#64748b',
};

export const EFFORT_COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
};

export const PRIORITY_COLORS = {
  P0: '#ef4444',
  P1: '#f97316',
  P2: '#eab308',
  P3: '#3b82f6',
};

export const CATEGORY_COLORS = {
  SEO: '#3b82f6',
  CONTENT: '#10b981',
  PERFORMANCE: '#8b5cf6',
  ACCESSIBILITY: '#f59e0b',
  SECURITY: '#ef4444',
  MOBILE: '#06b6d4',
  SOCIAL: '#ec4899',
  SPEED: '#8b5cf6',
  SCHEMA: '#a855f7',
  OTHER: '#64748b',
};

export function catColor(category) {
  return CATEGORY_COLORS[(category || '').toUpperCase()] || CATEGORY_COLORS.OTHER;
}

export function sevColor(severity) {
  return SEVERITY_COLORS[(severity || '').toUpperCase()] || SEVERITY_COLORS.MEDIUM;
}

export function effColor(effort) {
  return EFFORT_COLORS[(effort || '').toUpperCase()] || EFFORT_COLORS.MEDIUM;
}

export function priColor(priority) {
  return PRIORITY_COLORS[(priority || '').toUpperCase()] || PRIORITY_COLORS.P2;
}

export function providerLabel(provider) {
  const map = {
    'ollama-local': 'Ollama · Local',
    'lmstudio-local': 'LM Studio · Local',
    'gpt-4o': 'GPT-4o',
    'openrouter-free': 'OpenRouter',
    'groq-llama-3.3-70b': 'Groq · Llama',
    gemini: 'Gemini',
    cerebras: 'Cerebras',
    'cf-workers': 'Cloudflare AI',
  };
  return map[provider] || (provider || '').replace(/-/g, ' ');
}
