const API_BASE = '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
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
  getEeatAnalysis: (id) => request(`/audit/${id}/eeat-analysis`),
  getConversionAnalysis: (id) => request(`/audit/${id}/conversion-analysis`),
  getHistory: (limit = 20) => request(`/audit/history?limit=${limit}`),
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
  exportCsv: (id, type = 'issues') => `${API_BASE}/audit/${id}/export/csv?type=${type}`,
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
  request,
};
