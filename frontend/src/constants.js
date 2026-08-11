export const SEVERITY_STYLES = {
  CRITICAL: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: '\u{1f534}', label: 'Critical', weight: 4 },
  HIGH: { color: '#f97316', bg: '#fff7ed', border: '#fed7aa', icon: '\u{1f7e0}', label: 'High', weight: 3 },
  MEDIUM: { color: '#eab308', bg: '#fffbeb', border: '#fde68a', icon: '\u{1f7e1}', label: 'Medium', weight: 2 },
  LOW: { color: '#22c55e', bg: '#eff6ff', border: '#bfdbfe', icon: '\u{1f535}', label: 'Low', weight: 1 },
  INFO: { color: '#64748b', bg: '#f9fafb', border: '#e5e7eb', icon: '\u26aa', label: 'Info', weight: 0 },
};

export const SCORE_COLORS = {
  excellent: '#12b886',
  good: '#4c6ef5',
  fair: '#f59f00',
  poor: '#fa5252',
  get: (score) => {
    if (score >= 80) return '#12b886';
    if (score >= 60) return '#4c6ef5';
    if (score >= 40) return '#f59f00';
    return '#fa5252';
  },
};

export const CATEGORY_ICONS = {
  SEO: 'Search',
  TECHNICAL: 'Shield',
  CONTENT: 'FileText',
  AEO: 'Brain',
  GEO: 'Globe',
  AI_SEARCH: 'Sparkles',
  PERFORMANCE: 'Zap',
  SECURITY: 'Lock',
  ACCESSIBILITY: 'Eye',
  SOCIAL: 'Share2',
  SCHEMA: 'Database',
  LINKS: 'Link2',
  IMAGES: 'Image',
  LOCAL: 'MapPin',
  MOBILE: 'Smartphone',
};

export const GRADE_MAP = (score) => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};
