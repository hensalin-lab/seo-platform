import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuditProvider } from './context/AuditContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import NewAudit from './pages/NewAudit';
import AuditProgress from './pages/AuditProgress';
import History from './pages/History';
import Dashboard from './pages/Dashboard';
import PageIntelligence from './pages/PageIntelligence';
import SeoAnalysis from './pages/SeoAnalysis';
import SpeedAnalysis from './pages/SpeedAnalysis';
import SchemaAnalysis from './pages/SchemaAnalysis';
import InternalLinks from './pages/InternalLinks';
import GscData from './pages/GscData';
import KeywordStrategy from './pages/KeywordStrategy';
import ContentAnalysis from './pages/ContentAnalysis';
import AiVisibility from './pages/AiVisibility';
import EeatAnalysis from './pages/EeatAnalysis';
import SmartRecommendations from './pages/SmartRecommendations';
import CompetitorAnalysis from './pages/CompetitorAnalysis';
import SeoRoadmap from './pages/SeoRoadmap';
import RemediationFeed from './pages/RemediationFeed';
import ContentRewriter from './pages/ContentRewriter';
import SerpPreview from './pages/SerpPreview';
import AiChat from './pages/AiChat';
import PageDetail from './pages/PageDetail';
import ContentIntelligence from './pages/ContentIntelligence';
import RecommendationsDeep from './pages/RecommendationsDeep';
import AiVisibilityDeep from './pages/AiVisibilityDeep';
import CompetitorDeep from './pages/CompetitorDeep';
import AiRecommendations from './pages/AiRecommendations';
import EnterprisePage from './pages/EnterprisePage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuditProvider>
        <ToastProvider>
          <ErrorBoundary>
            <Layout>
              <Routes>
                <Route path="/" element={<History />} />
                <Route path="/new" element={<NewAudit />} />
                <Route path="/history" element={<History />} />
                <Route path="/audit/:id/progress" element={<AuditProgress />} />
                <Route path="/audit/:id/dashboard" element={<Dashboard />} />
                <Route path="/audit/:id/seo" element={<SeoAnalysis />} />
                <Route path="/audit/:id/pages" element={<PageIntelligence />} />
                <Route path="/audit/:id/speed" element={<SpeedAnalysis />} />
                <Route path="/audit/:id/schema" element={<SchemaAnalysis />} />
                <Route path="/audit/:id/internal-links" element={<InternalLinks />} />
                <Route path="/audit/:id/gsc" element={<GscData />} />
                <Route path="/audit/:id/keywords" element={<KeywordStrategy />} />
                <Route path="/audit/:id/content" element={<ContentAnalysis />} />
                <Route path="/audit/:id/ai-visibility" element={<AiVisibility />} />
                <Route path="/audit/:id/eeat" element={<EeatAnalysis />} />
                <Route path="/audit/:id/recommendations" element={<SmartRecommendations />} />
                <Route path="/audit/:id/competitor" element={<CompetitorAnalysis />} />
                <Route path="/audit/:id/roadmap" element={<SeoRoadmap />} />
                <Route path="/audit/:id/remediation" element={<RemediationFeed />} />
                <Route path="/audit/:id/content-rewrite" element={<ContentRewriter />} />
                <Route path="/audit/:id/serp-preview" element={<SerpPreview />} />
                <Route path="/audit/:id/page-detail" element={<PageDetail />} />
                <Route path="/audit/:id/content-intel" element={<ContentIntelligence />} />
                <Route path="/audit/:id/recommendations-deep" element={<RecommendationsDeep />} />
                <Route path="/audit/:id/ai-deep" element={<AiVisibilityDeep />} />
                <Route path="/audit/:id/competitor-deep" element={<CompetitorDeep />} />
                <Route path="/audit/:id/ai-recommendations" element={<AiRecommendations />} />
                <Route path="/audit/:id/enterprise" element={<EnterprisePage />} />
                <Route path="/audit/:id/chat" element={<AiChat />} />
                <Route path="/audit/:id" element={<Dashboard />} />
              </Routes>
            </Layout>
          </ErrorBoundary>
        </ToastProvider>
      </AuditProvider>
    </BrowserRouter>
  );
}
