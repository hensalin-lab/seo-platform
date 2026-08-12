import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { AuditProvider } from './context/AuditContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import History from './pages/History';
import AuditProgress from './pages/AuditProgress';
import ShareView from './pages/ShareView';
import LoginPage from './modules/settings/pages/LoginPage';
import RegisterPage from './modules/settings/pages/RegisterPage';
import { mainNav, auditSections, auditRedirects, flattenAuditItems } from './config/routes.config';
import './index.css';

function RedirectToAudit({ to }) {
  const { id } = useParams();
  return <Navigate to={`/audit/${id}${to}`} replace />;
}

function AppRoutes() {
  const location = useLocation();

  // Public, unauthenticated share view (client portal) — no sidebar/layout chrome.
  if (location.pathname.startsWith('/share/')) {
    return (
      <Suspense fallback={<div className="route-loading">Loading report...</div>}>
        <Routes>
          <Route path="/share/:token" element={<ShareView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<div className="route-loading">Loading tool...</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><History /></ProtectedRoute>} />
          {mainNav.map(route => (
            <Route key={route.path} path={route.path} element={<ProtectedRoute><route.component /></ProtectedRoute>} />
          ))}
          <Route path="/audit/:id/progress" element={<ProtectedRoute><AuditProgress /></ProtectedRoute>} />
          {flattenAuditItems().filter(route => route.component).map(route => (
            <Route key={route.suffix} path={`/audit/:id${route.suffix}`} element={<ProtectedRoute><route.component /></ProtectedRoute>} />
          ))}
          {auditRedirects.map(route => (
            <Route key={route.suffix} path={`/audit/:id${route.suffix}`} element={<ProtectedRoute><RedirectToAudit to={route.to} /></ProtectedRoute>} />
          ))}
          <Route path="/audit/:id" element={<ProtectedRoute><RedirectToAudit to="/dashboard" /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuditProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </ToastProvider>
        </AuditProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
