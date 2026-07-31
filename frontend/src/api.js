const API_BASE = '/api';
const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 1;

let _authToken = localStorage.getItem('token');

function setToken(token) {
  _authToken = token;
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.status === 401 && path !== '/auth/login') {
      persistToken(null);
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Request timed out');

    const isRetryable = options._retryCount < MAX_RETRIES && err.message?.startsWith('HTTP 5');
    if (isRetryable) {
      return request(path, { ...options, _retryCount: (options._retryCount || 0) + 1 });
    }
    throw err;
  }
}

export const api = {
  health: () => request('/health'),

  startAudit: (websiteUrl, competitorUrl = null) => request('/audit/start', {
    method: 'POST',
    body: JSON.stringify({ website_url: websiteUrl, competitor_url: competitorUrl || null }),
  }),

  getAuditStatus: (id) => request(`/audit/status/${id}`),
  getAuditDetail: (id) => request(`/audit/${id}`),
  getAuditIssues: (id, params = {}) => {
    let url = `/audit/${id}/issues?limit=${params.limit || 200}`;
    if (params.offset) url += `&offset=${params.offset}`;
    if (params.category) url += `&category=${params.category}`;
    if (params.severity) url += `&severity=${params.severity}`;
    return request(url);
  },
  getAuditRecommendations: (id, params = {}) => {
    let url = `/audit/${id}/recommendations?limit=${params.limit || 100}`;
    if (params.offset) url += `&offset=${params.offset}`;
    return request(url);
  },
  getCompetitorData: (id) => request(`/audit/${id}/competitor`),
  getAuditPages: (id, params = {}) => {
    let url = `/audit/${id}/pages?limit=${params.limit || 200}`;
    if (params.offset) url += `&offset=${params.offset}`;
    return request(url);
  },
  getPageDetail: (id, url) => request(`/audit/${id}/page-detail?url=${encodeURIComponent(url)}`),
  getPageAnalysis: (id, url) => request(`/audit/${id}/page-analysis/${encodeURIComponent(url)}`),
  getPageAnalyses: (id) => request(`/audit/${id}/page-analyses`),
  getKeywordData: (id) => request(`/audit/${id}/keywords`),
  getContentData: (id) => request(`/audit/${id}/content-analysis`),
  getRoadmap: (id) => request(`/audit/${id}/roadmap`),
  getSeoAnalysis: (id) => request(`/audit/${id}/seo-analysis`),
  getAeoAnalysis: (id) => request(`/audit/${id}/aeo-analysis`),
  getGeoAnalysis: (id) => request(`/audit/${id}/geo-analysis`),
  getAIVisibility: (id) => request(`/audit/${id}/ai-visibility`),
  getSchemaAnalysis: (id) => request(`/audit/${id}/schema-analysis`),
  getInternalLinks: (id) => request(`/audit/${id}/internal-links`),
  getPageSpeed: (id) => request(`/audit/${id}/page-speed`),
  getPageSpeedLive: (id, url, strategy = 'mobile') => request(`/audit/${id}/page-speed-live?url=${encodeURIComponent(url)}&strategy=${strategy}`),
  getCoreWebVitals: (id, url = '') => request(`/audit/${id}/core-web-vitals?url=${encodeURIComponent(url)}`),
  getEeatAnalysis: (id) => request(`/audit/${id}/eeat-analysis`),
  getConversionAnalysis: (id) => request(`/audit/${id}/conversion-analysis`),
  getHistory: (limit = 20, offset = 0) => request(`/audit/history?limit=${limit}&offset=${offset}`),
  getActionStudio: (id) => request(`/audit/${id}/action-studio`),
  deleteAudit: (id) => request(`/audit/${id}`, { method: 'DELETE' }),
  chat: (auditId, message) => request(`/audit/${auditId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
  getChatHistory: (id) => request(`/audit/${id}/chat-history`),
  getPageIntelligence: (id, pageUrl) => request(`/audit/${id}/page-intelligence/${encodeURIComponent(pageUrl)}`),
  getContentAnalysis: (id) => request(`/audit/${id}/content-analysis`),
  getContentRevival: (id) => request(`/audit/${id}/content-revival`),
  getGscOverview: (id, days = 28) => request(`/audit/${id}/gsc-overview?days=${days}`),
  getGscKeywords: (id, days = 28) => request(`/audit/${id}/gsc-keywords?days=${days}`),
  getKeywordsEnhanced: (id, days = 28) => request(`/audit/${id}/keywords-enhanced?days=${days}`),
  generateContent: (id, data) => request(`/audit/${id}/generate-content`, { method: 'POST', body: data }),
  getReportData: (id) => request(`/audit/${id}/report-data`),
  getBacklinkProfile: (id) => request(`/audit/${id}/backlink-profile`),
  getCanonicalization: (id) => request(`/audit/${id}/canonicalization`),
  getConfidence: (id) => request(`/audit/${id}/confidence`),
  getLocalSeo: (id) => request(`/audit/${id}/local-seo`),
  getMobileSeo: (id) => request(`/audit/${id}/mobile-seo`),
  getImageSeo: (id) => request(`/audit/${id}/image-seo`),
  getSitemapRobots: (id) => request(`/audit/${id}/sitemap-robots`),
  getSecurityHeaders: (id) => request(`/audit/${id}/security-headers`),
  getSocialSeo: (id) => request(`/audit/${id}/social-seo`),
  getPageExperience: (id) => request(`/audit/${id}/page-experience`),
  getContentQuality: (id) => request(`/audit/${id}/content-quality`),
  getSeoHealth: (id) => request(`/audit/${id}/seo-health`),
  getKeywordResearch: (id) => request(`/audit/${id}/keyword-research`),
  getContentAudit: (id) => request(`/audit/${id}/content-audit`),
  getBlogAi: (id) => request(`/audit/${id}/blog-ai`),
  getPageImprovements: (id) => request(`/audit/${id}/page-improvements`),
  compareAudits: (id, otherId) => request(`/audit/${id}/compare/${otherId}`),
  getPortfolio: () => request('/portfolio'),
  getRecommendations: (id) => request(`/audit/${id}/recommendations?limit=200`),
  getAiSuggestions: (id) => request(`/audit/${id}/ai-suggestions`, { method: 'POST', body: JSON.stringify({}) }),
  cancelAudit: (id) => request(`/audit/${id}/cancel`, { method: 'POST' }),
  rerunAudit: (id) => request(`/audit/${id}/rerun`, { method: 'POST' }),
  exportCsv: async (id, type = 'issues') => {
    const url = `${API_BASE}/audit/${id}/export/csv?type=${type}`;
    const headers = {};
    if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-${id}-${type}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // Auth
  register: (email, username, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, username, password }) }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/auth/me'),
  updateMe: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (currentPassword, newPassword) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) }),
  createApiKey: (name) => request('/auth/api-keys', { method: 'POST', body: JSON.stringify({ name }) }),
  listApiKeys: () => request('/auth/api-keys'),
  revokeApiKey: (id) => request(`/auth/api-keys/${id}`, { method: 'DELETE' }),

  // Webhooks
  createWebhook: (url, events) => request('/webhooks', { method: 'POST', body: JSON.stringify({ url, events }) }),
  listWebhooks: () => request('/webhooks'),
  deleteWebhook: (id) => request(`/webhooks/${id}`, { method: 'DELETE' }),
  testWebhook: (id, payload) => request(`/webhooks/${id}/test`, { method: 'POST', body: JSON.stringify({ payload }) }),

  // Scheduled
  createScheduled: (data) => request('/scheduled', { method: 'POST', body: JSON.stringify(data) }),
  listScheduled: () => request('/scheduled'),
  updateScheduled: (id, data) => request(`/scheduled/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScheduled: (id) => request(`/scheduled/${id}`, { method: 'DELETE' }),

  // White label
  getWhiteLabel: () => request('/whitelabel'),
  updateWhiteLabel: (data) => request('/whitelabel', { method: 'PUT', body: JSON.stringify(data) }),

  // OAuth
  googleAuth: () => `${API_BASE}/oauth/google`,
  getEnterpriseAudit: (id) => request(`/audit/${id}/enterprise`),
  getEnterprisePage: (idx, id) => request(`/audit/${id}/enterprise/${idx}`),
  getRemediationFeed: (id, params = {}) => {
    let url = `/audit/${id}/remediation-feed?limit=${params.limit || 50}`;
    if (params.severity) url += `&severity=${params.severity}`;
    if (params.category) url += `&category=${params.category}`;
    return request(url);
  },
  getContentRewrite: (id, idx) => request(`/audit/${id}/content-rewrite/${idx}`),
  getPageIntelligenceDeep: (id, idx) => request(`/audit/${id}/page-intelligence-deep/${idx}`),
  getPageIntelligenceDeepByUrl: (id, url) => request(`/audit/${id}/page-intelligence-deep-by-url?url=${encodeURIComponent(url)}`),
  getContentDeep: (id, idx) => request(`/audit/${id}/content-deep/${idx}`),
  getContentDeepByUrl: (id, url) => request(`/audit/${id}/content-deep-by-url?url=${encodeURIComponent(url)}`),
  getRecommendationsDeep: (id, idx) => request(`/audit/${id}/recommendations-deep/${idx}`),
  getRecommendationsDeepByUrl: (id, url) => request(`/audit/${id}/recommendations-deep-by-url?url=${encodeURIComponent(url)}`),
  getAiSearchDeep: (id, idx) => request(`/audit/${id}/ai-search-deep/${idx}`),
  getAiSearchDeepByUrl: (id, url) => request(`/audit/${id}/ai-search-deep-by-url?url=${encodeURIComponent(url)}`),
  getAiSearchIntelligence: (id, idx) => request(`/audit/${id}/ai-search-intelligence/${idx}`),
  getAiSearchIntelligenceByUrl: (id, url) => request(`/audit/${id}/ai-search-intelligence-by-url?url=${encodeURIComponent(url)}`),
  getCompetitorDeep: (id, idx) => request(`/audit/${id}/competitor-deep/${idx}`),
  getCompetitorDeepByUrl: (id, url) => request(`/audit/${id}/competitor-deep-by-url?url=${encodeURIComponent(url)}`),
  getDashboardDeep: (id) => request(`/audit/${id}/dashboard-deep`),
  getAiRecommendationsPage: (id, idx) => request(`/audit/${id}/ai-recommendations/${idx}`),
  getAiRecommendationsGlobal: (id) => request(`/audit/${id}/ai-recommendations-global`),
  getAiContentSuggestion: (id, idx, section = 'hero') => request(`/audit/${id}/ai-content-suggestion/${idx}?section=${section}`),
  getMegaAnalysis: (id, idx) => request(`/mega-analysis/${id}/${idx}`),
  getMegaAnalysisByUrl: (id, url) => request(`/mega-analysis/${id}/by-url?url=${encodeURIComponent(url)}`),
  getFullStrategy: (id) => request(`/full-strategy/${id}`),
  getAllPagesMega: (id) => request(`/all-pages-mega/${id}`),
  getAiBotIntelligence: (id, idx) => request(`/audit/${id}/ai-bot-intelligence/${idx}`),
  getOffsiteAuthority: (id, idx) => request(`/audit/${id}/offsite-authority/${idx}`),
  getSchemaIntelligence: (id, idx) => request(`/audit/${id}/schema-intelligence/${idx}`),
  getSpeedIntelligence: (id, idx) => request(`/audit/${id}/speed-intelligence/${idx}`),
  getContentDeepV2: (id, idx) => request(`/audit/${id}/content-deep-v2/${idx}`),
  getPageIntelligenceV2: (id, idx) => request(`/audit/${id}/page-intelligence-v2/${idx}`),
  getEnterpriseDashboard: (id) => request(`/audit/${id}/enterprise-dashboard`),
  request,
  setToken,
};
