import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../api';

const AuditContext = createContext();

export function useAudit() { return useContext(AuditContext); }

export function AuditProvider({ children }) {
  const [currentAudit, setCurrentAudit] = useState(null);
  const [auditDetail, setAuditDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audits, setAudits] = useState([]);
  const pollingRef = useRef(null);

  const doStartAudit = useCallback(async (url, competitorUrl) => {
    setLoading(true); setError(null); setCurrentAudit(null); setAuditDetail(null);
    try {
      const result = await api.startAudit(url, competitorUrl);
      setCurrentAudit(result); setLoading(false); return result;
    } catch (err) { setError(err.message); setLoading(false); throw err; }
  }, []);

  const pollStatus = useCallback((auditId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    const interval = setInterval(async () => {
      try {
        const status = await api.getAuditStatus(auditId);
        setCurrentAudit(status);
        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          clearInterval(interval); pollingRef.current = null;
          const detail = await api.getAuditDetail(auditId);
          const [issues, recs, comp] = await Promise.all([
            api.getAuditIssues(auditId).catch(() => []),
            api.getAuditRecommendations(auditId).catch(() => []),
            api.getCompetitorData(auditId).catch(() => null),
          ]);
          setAuditDetail({ ...detail, issues: issues || [], recommendations: recs || [], competitor: comp && comp.message ? null : comp });
        }
      } catch (err) { clearInterval(interval); pollingRef.current = null; setError(err.message); }
    }, 2000);
    pollingRef.current = interval;
  }, []);

  const fetchDetail = useCallback(async (auditId) => {
    setLoading(true);
    try {
      const detail = await api.getAuditDetail(auditId);
      const [issues, recs, comp] = await Promise.all([
        api.getAuditIssues(auditId).catch(() => []),
        api.getAuditRecommendations(auditId).catch(() => []),
        api.getCompetitorData(auditId).catch(() => null),
      ]);
      const full = { ...detail, issues: issues || [], recommendations: recs || [], competitor: comp && comp.message ? null : comp };
      setAuditDetail(full);
      setLoading(false); return full;
    } catch (err) { setError(err.message); setLoading(false); throw err; }
  }, []);

  const fetchAudits = useCallback(async () => {
    try { const r = await api.getHistory(); setAudits(Array.isArray(r) ? r : r.audits || []); } catch (err) { setError(err.message); }
  }, []);

  const reset = useCallback(() => { setCurrentAudit(null); setAuditDetail(null); setError(null); if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } }, []);

  useEffect(() => { return () => { if (pollingRef.current) clearInterval(pollingRef.current); }; }, []);

  return (
    <AuditContext.Provider value={{ currentAudit, auditDetail, loading, error, audits, startAudit: doStartAudit, pollStatus, fetchDetail, fetchAudits, reset }}>
      {children}
    </AuditContext.Provider>
  );
}
