import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuditProvider } from './context/AuditContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
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
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import AiBotIntelligence from './pages/AiBotIntelligence';
import OffsiteAuthority from './pages/OffsiteAuthority';
import SchemaIntelligence from './pages/SchemaIntelligence';
import SpeedIntelligence from './pages/SpeedIntelligence';
import PageIntelligenceV2 from './pages/PageIntelligenceV2';
import AuditCompare from './pages/AuditCompare';
import AuditReport from './pages/AuditReport';
import BacklinkProfile from './pages/BacklinkProfile';
import BlogAi from './pages/BlogAi';
import CitationAnalysis from './pages/CitationAnalysis';
import CompetitorGap from './pages/CompetitorGap';
import ContentOpportunities from './pages/ContentOpportunities';
import ContentQuality from './pages/ContentQuality';
import ContentRevival from './pages/ContentRevival';
import ImageSeo from './pages/ImageSeo';
import KeywordOpportunities from './pages/KeywordOpportunities';
import LocalSeo from './pages/LocalSeo';
import MobileSeo from './pages/MobileSeo';
import PageExperience from './pages/PageExperience';
import PageImprovements from './pages/PageImprovements';
import PageIntelligenceDetail from './pages/PageIntelligenceDetail';
import PageSpeed from './pages/PageSpeed';
import PortfolioDashboard from './pages/PortfolioDashboard';
import Recommendations from './pages/Recommendations';
import SecurityHeaders from './pages/SecurityHeaders';
import SeoHealth from './pages/SeoHealth';
import SitemapRobots from './pages/SitemapRobots';
import SocialSeo from './pages/SocialSeo';
import AiRoadmap from './pages/AiRoadmap';
import AiSuggestions from './pages/AiSuggestions';
import './index.css';

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
                  <Route path="/audit/:id/progress" element={<ProtectedRoute><AuditProgress /></ProtectedRoute>} />
                  <Route path="/audit/:id/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/audit/:id/seo" element={<ProtectedRoute><SeoAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/pages" element={<ProtectedRoute><PageIntelligence /></ProtectedRoute>} />
                  <Route path="/audit/:id/speed" element={<ProtectedRoute><SpeedAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/schema" element={<ProtectedRoute><SchemaAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/internal-links" element={<ProtectedRoute><InternalLinks /></ProtectedRoute>} />
                  <Route path="/audit/:id/gsc" element={<ProtectedRoute><GscData /></ProtectedRoute>} />
                  <Route path="/audit/:id/keywords" element={<ProtectedRoute><KeywordStrategy /></ProtectedRoute>} />
                  <Route path="/audit/:id/content" element={<ProtectedRoute><ContentAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/ai-visibility" element={<ProtectedRoute><AiVisibility /></ProtectedRoute>} />
                  <Route path="/audit/:id/eeat" element={<ProtectedRoute><EeatAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/recommendations" element={<ProtectedRoute><SmartRecommendations /></ProtectedRoute>} />
                  <Route path="/audit/:id/competitor" element={<ProtectedRoute><CompetitorAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/roadmap" element={<ProtectedRoute><SeoRoadmap /></ProtectedRoute>} />
                  <Route path="/audit/:id/remediation" element={<ProtectedRoute><RemediationFeed /></ProtectedRoute>} />
                  <Route path="/audit/:id/content-rewrite" element={<ProtectedRoute><ContentRewriter /></ProtectedRoute>} />
                  <Route path="/audit/:id/serp-preview" element={<ProtectedRoute><SerpPreview /></ProtectedRoute>} />
                  <Route path="/audit/:id/page-detail" element={<ProtectedRoute><PageDetail /></ProtectedRoute>} />
                  <Route path="/audit/:id/content-intel" element={<ProtectedRoute><ContentIntelligence /></ProtectedRoute>} />
                  <Route path="/audit/:id/recommendations-deep" element={<ProtectedRoute><RecommendationsDeep /></ProtectedRoute>} />
                  <Route path="/audit/:id/ai-deep" element={<ProtectedRoute><AiVisibilityDeep /></ProtectedRoute>} />
                  <Route path="/audit/:id/competitor-deep" element={<ProtectedRoute><CompetitorDeep /></ProtectedRoute>} />
                  <Route path="/audit/:id/ai-recommendations" element={<ProtectedRoute><AiRecommendations /></ProtectedRoute>} />
                  <Route path="/audit/:id/enterprise" element={<ProtectedRoute><EnterprisePage /></ProtectedRoute>} />
                  <Route path="/audit/:id/ai-bots" element={<ProtectedRoute><AiBotIntelligence /></ProtectedRoute>} />
                  <Route path="/audit/:id/offsite-authority" element={<ProtectedRoute><OffsiteAuthority /></ProtectedRoute>} />
                  <Route path="/audit/:id/schema-intel" element={<ProtectedRoute><SchemaIntelligence /></ProtectedRoute>} />
                  <Route path="/audit/:id/speed-intel" element={<ProtectedRoute><SpeedIntelligence /></ProtectedRoute>} />
                  <Route path="/audit/:id/page-deep" element={<ProtectedRoute><PageIntelligenceV2 /></ProtectedRoute>} />
                  <Route path="/audit/:id/compare" element={<ProtectedRoute><AuditCompare /></ProtectedRoute>} />
                  <Route path="/audit/:id/report" element={<ProtectedRoute><AuditReport /></ProtectedRoute>} />
                  <Route path="/audit/:id/backlinks" element={<ProtectedRoute><BacklinkProfile /></ProtectedRoute>} />
                  <Route path="/audit/:id/blog-ai" element={<ProtectedRoute><BlogAi /></ProtectedRoute>} />
                  <Route path="/audit/:id/citations" element={<ProtectedRoute><CitationAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/competitor-gap" element={<ProtectedRoute><CompetitorGap /></ProtectedRoute>} />
                  <Route path="/audit/:id/content-opportunities" element={<ProtectedRoute><ContentOpportunities /></ProtectedRoute>} />
                  <Route path="/audit/:id/content-quality" element={<ProtectedRoute><ContentQuality /></ProtectedRoute>} />
                  <Route path="/audit/:id/content-revival" element={<ProtectedRoute><ContentRevival /></ProtectedRoute>} />
                  <Route path="/audit/:id/image-seo" element={<ProtectedRoute><ImageSeo /></ProtectedRoute>} />
                  <Route path="/audit/:id/keyword-opportunities" element={<ProtectedRoute><KeywordOpportunities /></ProtectedRoute>} />
                  <Route path="/audit/:id/local-seo" element={<ProtectedRoute><LocalSeo /></ProtectedRoute>} />
                  <Route path="/audit/:id/mobile-seo" element={<ProtectedRoute><MobileSeo /></ProtectedRoute>} />
                  <Route path="/audit/:id/page-experience" element={<ProtectedRoute><PageExperience /></ProtectedRoute>} />
                  <Route path="/audit/:id/page-improvements" element={<ProtectedRoute><PageImprovements /></ProtectedRoute>} />
                  <Route path="/audit/:id/page-intel-detail" element={<ProtectedRoute><PageIntelligenceDetail /></ProtectedRoute>} />
                  <Route path="/audit/:id/page-speed" element={<ProtectedRoute><PageSpeed /></ProtectedRoute>} />
                  <Route path="/portfolio" element={<ProtectedRoute><PortfolioDashboard /></ProtectedRoute>} />
                  <Route path="/audit/:id/recommendations-list" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
                  <Route path="/audit/:id/security-headers" element={<ProtectedRoute><SecurityHeaders /></ProtectedRoute>} />
                  <Route path="/audit/:id/seo-health" element={<ProtectedRoute><SeoHealth /></ProtectedRoute>} />
                  <Route path="/audit/:id/sitemap-robots" element={<ProtectedRoute><SitemapRobots /></ProtectedRoute>} />
                  <Route path="/audit/:id/social-seo" element={<ProtectedRoute><SocialSeo /></ProtectedRoute>} />
                  <Route path="/audit/:id/ai-roadmap" element={<ProtectedRoute><AiRoadmap /></ProtectedRoute>} />
                  <Route path="/audit/:id/ai-suggestions" element={<ProtectedRoute><AiSuggestions /></ProtectedRoute>} />
                  <Route path="/audit/:id/chat" element={<ProtectedRoute><AiChat /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/audit/:id" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                </Routes>
              </Layout>
            </ErrorBoundary>
          </ToastProvider>
        </AuditProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
