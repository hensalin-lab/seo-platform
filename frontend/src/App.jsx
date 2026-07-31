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
import SeoAnalysis from './modules/technical-audit/pages/SeoAnalysis';
import SpeedAnalysis from './modules/technical-audit/pages/SpeedAnalysis';
import SchemaAnalysis from './modules/technical-audit/pages/SchemaAnalysis';
import InternalLinks from './modules/technical-audit/pages/InternalLinks';
import GscData from './modules/technical-audit/pages/GscData';
import KeywordStrategy from './modules/content-keywords/pages/KeywordStrategy';
import ContentAnalysis from './modules/content-keywords/pages/ContentAnalysis';
import AiVisibility from './modules/geo-aeo/pages/AiVisibility';
import EeatAnalysis from './modules/geo-aeo/pages/EeatAnalysis';
import CompetitorAnalysis from './modules/competitive/pages/CompetitorAnalysis';
import SeoRoadmap from './modules/content-keywords/pages/SeoRoadmap';
import RemediationFeed from './modules/action-center/pages/RemediationFeed';
import ContentRewriter from './modules/content-keywords/pages/ContentRewriter';
import SerpPreview from './modules/geo-aeo/pages/SerpPreview';
import AiChat from './modules/settings/pages/AiChat';
import PageDetail from './modules/technical-audit/pages/PageDetail';
import ContentIntelligence from './modules/content-keywords/pages/ContentIntelligence';
import AiRecommendations from './modules/content-keywords/pages/AiRecommendations';
import EnterprisePage from './modules/enterprise/pages/EnterprisePage';
import LoginPage from './modules/settings/pages/LoginPage';
import RegisterPage from './modules/settings/pages/RegisterPage';
import SettingsPage from './modules/settings/pages/SettingsPage';
import AiBotIntelligence from './modules/geo-aeo/pages/AiBotIntelligence';
import OffsiteAuthority from './modules/competitive/pages/OffsiteAuthority';
import SchemaIntelligence from './modules/geo-aeo/pages/SchemaIntelligence';
import PageIntelligenceV2 from './modules/technical-audit/pages/PageIntelligenceV2';
import AuditCompare from './modules/executive/pages/AuditCompare';
import AuditReport from './modules/executive/pages/AuditReport';
import BacklinkProfile from './modules/competitive/pages/BacklinkProfile';
import BlogAi from './modules/content-keywords/pages/BlogAi';
import CitationAnalysis from './modules/geo-aeo/pages/CitationAnalysis';
import ContentOpportunities from './modules/content-keywords/pages/ContentOpportunities';
import ContentQuality from './modules/content-keywords/pages/ContentQuality';
import ContentRevival from './modules/content-keywords/pages/ContentRevival';
import ImageSeo from './modules/technical-audit/pages/ImageSeo';
import KeywordOpportunities from './modules/content-keywords/pages/KeywordOpportunities';
import LocalSeo from './modules/geo-aeo/pages/LocalSeo';
import MobileSeo from './modules/technical-audit/pages/MobileSeo';
import PageExperience from './modules/technical-audit/pages/PageExperience';
import PageImprovements from './modules/technical-audit/pages/PageImprovements';
import PageIntelligenceDetail from './modules/technical-audit/pages/PageIntelligenceDetail';
import PageSpeed from './modules/technical-audit/pages/PageSpeed';
import PortfolioDashboard from './modules/enterprise/pages/PortfolioDashboard';
import ExecutiveDashboard from './modules/executive/pages/ExecutiveDashboard';
import Recommendations from './modules/action-center/pages/Recommendations';
import SecurityHeaders from './modules/technical-audit/pages/SecurityHeaders';
import SeoHealth from './modules/executive/pages/SeoHealth';
import SitemapRobots from './modules/technical-audit/pages/SitemapRobots';
import SocialSeo from './modules/geo-aeo/pages/SocialSeo';
import AiRoadmap from './modules/content-keywords/pages/AiRoadmap';
import AiSuggestions from './modules/content-keywords/pages/AiSuggestions';
import IssuesExplorer from './modules/action-center/pages/IssuesExplorer';
import Trends from './modules/executive/pages/Trends';
import GeoAeoHub from './modules/geo-aeo/pages/GeoAeoHub';
import AeoAnalysis from './modules/geo-aeo/pages/AeoAnalysis';
import GeoAnalysis from './modules/geo-aeo/pages/GeoAnalysis';
import ActionCenter from './modules/action-center/pages/ActionCenter';
import ActionStudio from './modules/action-center/pages/ActionStudio';
import ContentStudio from './modules/content-keywords/pages/ContentStudio';
import RankBoost from './modules/geo-aeo/pages/RankBoost';
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
                  <Route path="/audit/:id/executive-dashboard" element={<ProtectedRoute><ExecutiveDashboard /></ProtectedRoute>} />
                  <Route path="/audit/:id/geo-aeo" element={<ProtectedRoute><GeoAeoHub /></ProtectedRoute>} />
          <Route path="/audit/:id/aeo-analysis" element={<ProtectedRoute><AeoAnalysis /></ProtectedRoute>} />
          <Route path="/audit/:id/geo-analysis" element={<ProtectedRoute><GeoAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/action-center" element={<ProtectedRoute><ActionCenter /></ProtectedRoute>} />
          <Route path="/audit/:id/action-studio" element={<ProtectedRoute><ActionStudio /></ProtectedRoute>} />
                  <Route path="/audit/:id/content-studio" element={<ProtectedRoute><ContentStudio /></ProtectedRoute>} />
          <Route path="/audit/:id/rank-boost" element={<ProtectedRoute><RankBoost /></ProtectedRoute>} />
                  <Route path="/audit/:id/seo" element={<ProtectedRoute><SeoAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/pages" element={<ProtectedRoute><PageIntelligenceV2 /></ProtectedRoute>} />
                  <Route path="/audit/:id/speed" element={<ProtectedRoute><SpeedAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/schema" element={<ProtectedRoute><SchemaAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/internal-links" element={<ProtectedRoute><InternalLinks /></ProtectedRoute>} />
                  <Route path="/audit/:id/gsc" element={<ProtectedRoute><GscData /></ProtectedRoute>} />
                  <Route path="/audit/:id/keywords" element={<ProtectedRoute><KeywordStrategy /></ProtectedRoute>} />
                  <Route path="/audit/:id/content" element={<ProtectedRoute><ContentAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/ai-visibility" element={<ProtectedRoute><AiVisibility /></ProtectedRoute>} />
                  <Route path="/audit/:id/eeat" element={<ProtectedRoute><EeatAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/recommendations" element={<ProtectedRoute><ActionCenter /></ProtectedRoute>} />
                  <Route path="/audit/:id/competitor" element={<ProtectedRoute><CompetitorAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/roadmap" element={<ProtectedRoute><SeoRoadmap /></ProtectedRoute>} />
                  <Route path="/audit/:id/remediation" element={<ProtectedRoute><RemediationFeed /></ProtectedRoute>} />
                  <Route path="/audit/:id/content-rewrite" element={<ProtectedRoute><ContentRewriter /></ProtectedRoute>} />
                  <Route path="/audit/:id/serp-preview" element={<ProtectedRoute><SerpPreview /></ProtectedRoute>} />
                  <Route path="/audit/:id/page-detail" element={<ProtectedRoute><PageDetail /></ProtectedRoute>} />
                  <Route path="/audit/:id/content-intel" element={<ProtectedRoute><ContentIntelligence /></ProtectedRoute>} />
                  <Route path="/audit/:id/recommendations-deep" element={<ProtectedRoute><ActionCenter /></ProtectedRoute>} />
                  <Route path="/audit/:id/ai-deep" element={<ProtectedRoute><AiVisibility /></ProtectedRoute>} />
                  <Route path="/audit/:id/competitor-deep" element={<ProtectedRoute><CompetitorAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/ai-recommendations" element={<ProtectedRoute><AiRecommendations /></ProtectedRoute>} />
                  <Route path="/audit/:id/enterprise" element={<ProtectedRoute><EnterprisePage /></ProtectedRoute>} />
                  <Route path="/audit/:id/ai-bots" element={<ProtectedRoute><AiBotIntelligence /></ProtectedRoute>} />
                  <Route path="/audit/:id/offsite-authority" element={<ProtectedRoute><OffsiteAuthority /></ProtectedRoute>} />
                  <Route path="/audit/:id/schema-intel" element={<ProtectedRoute><SchemaIntelligence /></ProtectedRoute>} />
                  <Route path="/audit/:id/speed-intel" element={<ProtectedRoute><SpeedAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/page-deep" element={<ProtectedRoute><PageIntelligenceV2 /></ProtectedRoute>} />
                  <Route path="/audit/:id/compare" element={<ProtectedRoute><AuditCompare /></ProtectedRoute>} />
                  <Route path="/audit/:id/report" element={<ProtectedRoute><AuditReport /></ProtectedRoute>} />
                  <Route path="/audit/:id/backlinks" element={<ProtectedRoute><BacklinkProfile /></ProtectedRoute>} />
                  <Route path="/audit/:id/blog-ai" element={<ProtectedRoute><BlogAi /></ProtectedRoute>} />
                  <Route path="/audit/:id/citations" element={<ProtectedRoute><CitationAnalysis /></ProtectedRoute>} />
                  <Route path="/audit/:id/competitor-gap" element={<ProtectedRoute><CompetitorAnalysis /></ProtectedRoute>} />
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
                  <Route path="/audit/:id/issues" element={<ProtectedRoute><IssuesExplorer /></ProtectedRoute>} />
                  <Route path="/trends" element={<ProtectedRoute><Trends /></ProtectedRoute>} />
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
