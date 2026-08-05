import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuditProvider } from './context/AuditContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import History from './pages/History';
import AuditProgress from './pages/AuditProgress';
import LoginPage from './modules/settings/pages/LoginPage';
import RegisterPage from './modules/settings/pages/RegisterPage';
import { mainNav, auditSections, auditRedirects, flattenAuditItems } from './config/routes.config';
import './index.css';

function RedirectToAudit({ to }) {
  const { id } = useParams();
  return <Navigate to={`/audit/${id}${to}`} replace />;
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
              </Layout>
            </ErrorBoundary>
          </ToastProvider>
        </AuditProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
