import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuditProvider } from './context/AuditContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import NewAudit from './pages/NewAudit';
import History from './pages/History';
import LoginPage from './modules/settings/pages/LoginPage';
import RegisterPage from './modules/settings/pages/RegisterPage';
import SettingsPage from './modules/settings/pages/SettingsPage';
import PortfolioDashboard from './modules/enterprise/pages/PortfolioDashboard';
import Trends from './modules/executive/pages/Trends';
import OnePageWorkspace from './pages/OnePageWorkspace';
import './index.css';

const OLD_ROUTE_MAP = {
  'dashboard': { tab: 'executive', sub: 'dashboard' },
  'executive-dashboard': { tab: 'executive', sub: 'dashboard' },
  'compare': { tab: 'executive', sub: 'compare' },
  'report': { tab: 'executive', sub: 'report' },
  'seo-health': { tab: 'executive', sub: 'seo-health' },
  'progress': { tab: 'executive', sub: 'dashboard' },
  'geo-aeo': { tab: 'geo-aeo', sub: 'hub' },
  'ai-deep': { tab: 'geo-aeo', sub: 'ai-deep' },
  'ai-bots': { tab: 'geo-aeo', sub: 'ai-bots' },
  'ai-visibility': { tab: 'geo-aeo', sub: 'ai-deep' },
  'eeat': { tab: 'geo-aeo', sub: 'hub' },
  'serp-preview': { tab: 'geo-aeo', sub: 'serp-preview' },
  'social-seo': { tab: 'geo-aeo', sub: 'social-seo' },
  'local-seo': { tab: 'geo-aeo', sub: 'local-seo' },
  'schema-intel': { tab: 'geo-aeo', sub: 'hub' },
  'citations': { tab: 'geo-aeo', sub: 'hub' },
  'content-studio': { tab: 'content', sub: 'studio' },
  'keywords': { tab: 'content', sub: 'keywords' },
  'content-rewrite': { tab: 'content', sub: 'rewriter' },
  'content-revival': { tab: 'content', sub: 'revival' },
  'blog-ai': { tab: 'content', sub: 'blog' },
  'chat': { tab: 'content', sub: 'chat' },
  'content': { tab: 'content', sub: 'keywords' },
  'content-intel': { tab: 'content', sub: 'studio' },
  'content-quality': { tab: 'content', sub: 'studio' },
  'content-opportunities': { tab: 'content', sub: 'studio' },
  'keyword-opportunities': { tab: 'content', sub: 'keywords' },
  'ai-recommendations': { tab: 'content', sub: 'studio' },
  'ai-roadmap': { tab: 'technical', sub: 'roadmap' },
  'ai-suggestions': { tab: 'content', sub: 'studio' },
  'issues': { tab: 'technical', sub: 'issues' },
  'action-center': { tab: 'technical', sub: 'action-center' },
  'recommendations': { tab: 'technical', sub: 'action-center' },
  'recommendations-deep': { tab: 'technical', sub: 'action-center' },
  'recommendations-list': { tab: 'technical', sub: 'action-center' },
  'remediation': { tab: 'technical', sub: 'issues' },
  'speed': { tab: 'technical', sub: 'speed' },
  'speed-intel': { tab: 'technical', sub: 'speed' },
  'internal-links': { tab: 'technical', sub: 'links' },
  'page-experience': { tab: 'technical', sub: 'page-experience' },
  'mobile-seo': { tab: 'technical', sub: 'mobile' },
  'sitemap-robots': { tab: 'technical', sub: 'sitemap' },
  'security-headers': { tab: 'technical', sub: 'security' },
  'image-seo': { tab: 'technical', sub: 'image' },
  'roadmap': { tab: 'technical', sub: 'roadmap' },
  'seo': { tab: 'technical', sub: 'issues' },
  'pages': { tab: 'technical', sub: 'issues' },
  'page-deep': { tab: 'technical', sub: 'issues' },
  'page-detail': { tab: 'technical', sub: 'issues' },
  'page-intel-detail': { tab: 'technical', sub: 'issues' },
  'page-speed': { tab: 'technical', sub: 'speed' },
  'page-improvements': { tab: 'technical', sub: 'issues' },
  'gsc': { tab: 'technical', sub: 'speed' },
  'competitor': { tab: 'offsite', sub: 'competitor' },
  'competitor-deep': { tab: 'offsite', sub: 'competitor' },
  'competitor-gap': { tab: 'offsite', sub: 'competitor' },
  'backlinks': { tab: 'offsite', sub: 'backlinks' },
  'offsite-authority': { tab: 'offsite', sub: 'authority' },
  'enterprise': { tab: 'executive', sub: 'dashboard' },
};

function AuditPageRedirector() {
  const { id } = useParams();
  const location = useLocation();
  const suffix = location.pathname.replace(`/audit/${id}/`, '');
  const mapping = OLD_ROUTE_MAP[suffix] || { tab: 'executive', sub: 'dashboard' };
  const params = new URLSearchParams({ tab: mapping.tab, sub: mapping.sub });
  return <Navigate to={`/audit/${id}?${params.toString()}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuditProvider>
          <ToastProvider>
            <ErrorBoundary>
              <Layout>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/" element={<ProtectedRoute><History /></ProtectedRoute>} />
                  <Route path="/new" element={<ProtectedRoute><NewAudit /></ProtectedRoute>} />
                  <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                  <Route path="/portfolio" element={<ProtectedRoute><PortfolioDashboard /></ProtectedRoute>} />
                  <Route path="/trends" element={<ProtectedRoute><Trends /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/audit/:id" element={<ProtectedRoute><OnePageWorkspace /></ProtectedRoute>} />
                  <Route path="/audit/:id/*" element={<ProtectedRoute><AuditPageRedirector /></ProtectedRoute>} />
                </Routes>
              </Layout>
            </ErrorBoundary>
          </ToastProvider>
        </AuditProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
