/**
 * The analysis engines are not consistent about the shape of an "impact"
 * value. Some emit a sentence, some a number, and the newer AI-backed engines
 * emit a structured object like {score: 70, description: 'High priority'}.
 * Rendering whichever arrived straight into JSX is what put literal
 * "Impact: {'score': 70, 'description': 'High priority'}" on the Speed page.
 *
 * These helpers turn any of those shapes into something presentable, and treat
 * anything unrecognised as "no impact given" rather than printing a blob.
 */

/** Human label for a numeric impact/difficulty score. */
export function impactLabel(value) {
  if (value == null) return '';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n >= 80) return 'Very high';
  if (n >= 60) return 'High';
  if (n >= 35) return 'Medium';
  if (n > 0) return 'Low';
  return 'None';
}

/**
 * Format any impact-ish value for display.
 * Returns '' for null/undefined/empty so callers can skip rendering entirely.
 */
export function formatImpact(value) {
  if (value == null) return '';

  // {score, description} / {impact, ...} objects.
  if (typeof value === 'object') {
    const description =
      value.description || value.label || value.text || value.impact || value.value;
    if (typeof description === 'string' && description.trim()) {
      return description.trim();
    }
    if (description != null && typeof description !== 'object') {
      const asLabel = impactLabel(description);
      if (asLabel) return asLabel;
    }
    if (value.score != null) return impactLabel(value.score);
    return '';
  }

  if (typeof value === 'number') return impactLabel(value);
  if (typeof value === 'boolean') return value ? 'Yes' : '';

  const text = String(value).trim();
  if (!text || text === '{}' || text === '[]' || text === 'null' || text === 'None') return '';

  // A stringified dict still reaches some clients; parse and retry rather than
  // printing Python/JS object syntax into the UI.
  if (/^[{[]/.test(text)) {
    try {
      return formatImpact(JSON.parse(text)) || text;
    } catch {
      return text;
    }
  }
  return text;
}

/** Join a list of already-formatted fragments, dropping the empty ones. */
export function joinMeta(...parts) {
  return parts.map(formatImpact).filter(Boolean).join(' · ');
}

export default formatImpact;