const API_BASE = '/api';
const REQUEST_TIMEOUT = 200000;
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
      _authToken = null;
      localStorage.removeItem('token');
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
  runCompetitorAnalysis: (id, competitorUrl = null) => request(`/audit/${id}/competitor/analyze`, {
    method: 'POST',
    body: JSON.stringify({ competitor_url: competitorUrl }),
  }),
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
  getCoreWebVitals: (id, url = '', refresh = false) => request(`/audit/${id}/core-web-vitals?url=${encodeURIComponent(url)}&refresh=${refresh ? 1 : 0}`),
  saveCoreWebVitals: (id, data) => request(`/audit/${id}/core-web-vitals`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  runLocalLighthouse: (id, url = '') => request(`/audit/${id}/run-local-lighthouse`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  }),
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
  getGscSettings: () => request('/gsc/settings'),
  saveGscSettings: (data) => request('/gsc/settings', { method: 'PUT', body: JSON.stringify(data) }),
  testGscSettings: (data) => request('/gsc/test', { method: 'POST', body: JSON.stringify(data) }),
  deleteGscSettings: () => request('/gsc/settings', { method: 'DELETE' }),
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
  generateAiFixes: (id, limit = 30) => request(`/audit/${id}/ai/fixes`, { method: 'POST', body: JSON.stringify({ limit }) }),
  getToolSuggestions: (id, { tool = 'all', category = '', limit = 5 } = {}) => request(`/audit/${id}/ai/tool-suggestions`, { method: 'POST', body: JSON.stringify({ tool, category, limit }) }),
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

  // Programmatic SEO
  listProgrammaticTemplates: (auditId = '') => {
    let url = '/programmatic/templates';
    if (auditId) url += `?audit_id=${encodeURIComponent(auditId)}`;
    return request(url);
  },
  getProgrammaticTemplate: (id) => request(`/programmatic/templates/${id}`),
  createProgrammaticTemplate: (data) => request('/programmatic/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateProgrammaticTemplate: (id, data) => request(`/programmatic/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProgrammaticTemplate: (id) => request(`/programmatic/templates/${id}`, { method: 'DELETE' }),
  getProgrammaticEntries: (id) => request(`/programmatic/templates/${id}/entries`),
  addProgrammaticEntries: (id, entries, clear = false) => request(`/programmatic/templates/${id}/entries`, { method: 'POST', body: JSON.stringify({ entries, clear }) }),
  clearProgrammaticEntries: (id) => request(`/programmatic/templates/${id}/entries`, { method: 'DELETE' }),
  parseProgrammaticCsv: (csvText, hasHeader = true, delimiter = ',') => request('/programmatic/parse-csv', { method: 'POST', body: JSON.stringify({ csv_text: csvText, has_header: hasHeader, delimiter }) }),
  previewProgrammatic: (id, entries = [], limit = 5) => request(`/programmatic/templates/${id}/preview`, { method: 'POST', body: JSON.stringify({ entries, limit }) }),
  generateProgrammatic: (id) => request(`/programmatic/templates/${id}/generate`, { method: 'POST' }),
  getProgrammaticPages: (id, offset = 0, limit = 100) => request(`/programmatic/templates/${id}/pages?offset=${offset}&limit=${limit}`),
  deleteProgrammaticPage: (pageId) => request(`/programmatic/pages/${pageId}`, { method: 'DELETE' }),
  exportProgrammatic: (id, format = 'json') => request(`/programmatic/templates/${id}/export?format=${format}`),

  // Webhooks
  createWebhook: (url, events) => request('/webhooks', { method: 'POST', body: JSON.stringify({ url, events }) }),
  listWebhooks: () => request('/webhooks'),
  deleteWebhook: (id) => request(`/webhooks/${id}`, { method: 'DELETE' }),
  testWebhook: (id, payload) => request(`/webhooks/${id}/test`, { method: 'POST', body: JSON.stringify({ payload }) }),
  getEmailStatus: () => request('/webhooks/email-status'),
  getDigestPreferences: () => request('/digest/preferences'),
  updateDigestPreferences: (data) => request('/digest/preferences', { method: 'PUT', body: JSON.stringify(data) }),
  getDigestStatus: () => request('/digest/status'),
  sendDigest: () => request('/digest/send', { method: 'POST' }),

  // Rank tracking
  getRankings: (id) => request(`/audit/${id}/rankings`),
  captureRankings: (id, keywords) => request(`/audit/${id}/rankings/capture`, { method: 'POST', body: JSON.stringify({ keywords } || {}) }),

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
  getContentRewriteByUrl: (id, url) => request(`/audit/${id}/content-rewrite/0?url=${encodeURIComponent(url)}`),
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

  // Advanced insights (Phase 1)
  getDrift: (id) => request(`/audit/${id}/drift`),
  getHreflang: (id) => request(`/audit/${id}/hreflang`),
  getRedirects: (id) => request(`/audit/${id}/redirects`),
  getDuplicates: (id) => request(`/audit/${id}/duplicates`),
  getDomainAuthority: (id) => request(`/audit/${id}/domain-authority`),
  getJsDependency: (id) => request(`/audit/${id}/js-dependency`),
  getContentBriefs: (id) => request(`/audit/${id}/content-briefs`),
  getUsage: (days = 30) => request(`/usage?days=${days}`),
  createDemo: () => request('/demo', { method: 'POST' }),
  getPublicApiInfo: () => request('/public/info'),

  // Uptime monitoring
  listUptimeTargets: () => request('/uptime/targets'),
  createUptimeTarget: (data) => request('/uptime/targets', { method: 'POST', body: JSON.stringify(data) }),
  updateUptimeTarget: (id, data) => request(`/uptime/targets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUptimeTarget: (id) => request(`/uptime/targets/${id}`, { method: 'DELETE' }),
  checkUptimeNow: (id) => request(`/uptime/targets/${id}/check`, { method: 'POST' }),
  getUptimeChecks: (id, limit = 50) => request(`/uptime/targets/${id}/checks?limit=${limit}`),

  // Client workspaces
  listWorkspaces: () => request('/workspaces'),
  createWorkspace: (data) => request('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkspace: (id, data) => request(`/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkspace: (id) => request(`/workspaces/${id}`, { method: 'DELETE' }),
  getWorkspaceAudits: (id) => request(`/workspaces/${id}/audits`),
  assignWorkspaceAudits: (id, auditIds) => request(`/workspaces/${id}/audits`, { method: 'POST', body: JSON.stringify({ audit_ids: auditIds }) }),
  unassignWorkspaceAudit: (id, auditId) => request(`/workspaces/${id}/audits/${auditId}`, { method: 'DELETE' }),
  getWorkspaceMembers: (id) => request(`/workspaces/${id}/members`),
  addWorkspaceMember: (id, email, role) => request(`/workspaces/${id}/members`, { method: 'POST', body: JSON.stringify({ email, role }) }),
  removeWorkspaceMember: (id, memberId) => request(`/workspaces/${id}/members/${memberId}`, { method: 'DELETE' }),

  // Data provider integrations (Phase 2)
  getProviders: () => request('/providers'),
  getProviderCapabilities: () => request('/providers/capabilities'),
  getProviderFields: (name) => request(`/providers/${name}/fields`),
  saveProvider: (name, config, isActive = true) => request(`/providers/${name}`, {
    method: 'PUT',
    body: JSON.stringify({ config, is_active: isActive }),
  }),
  deleteProvider: (name) => request(`/providers/${name}`, { method: 'DELETE' }),
  testProvider: (name, config = null, capability = null) => request(`/providers/${name}/test`, {
    method: 'POST',
    body: JSON.stringify({ config, capability }),
  }),
  getGoogleOAuthStatus: () => request('/oauth/google/status'),
  getKeywordVolumes: (id, limit = 50) => request(`/audit/${id}/keyword-volumes?limit=${limit}`),
  getBrandMonitor: (id, brand = '') => request(`/audit/${id}/brand-monitor${brand ? `?brand=${encodeURIComponent(brand)}` : ''}`),
  getBrandMonitorHistory: (id) => request(`/audit/${id}/brand-monitor/history`),

  // Free keyless data (server-side, works for all users)
  freeAutocomplete: (q) => request(`/free/autocomplete?q=${encodeURIComponent(q)}`),
  freeSiteChecks: (url) => request(`/free/site-checks?url=${encodeURIComponent(url)}`),
  freeWhois: (url) => request(`/free/whois?url=${encodeURIComponent(url)}`),
  freeDns: (url) => request(`/free/dns?url=${encodeURIComponent(url)}`),
  freeSsl: (url) => request(`/free/ssl?url=${encodeURIComponent(url)}`),

  request,
  setToken,
};
