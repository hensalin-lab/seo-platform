import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import DataSourceBadge from '../components/DataSourceBadge';
import { Search, ChevronDown, AlertTriangle, CheckCircle, Code, Target, BarChart3, Globe, Brain, RefreshCw, Filter } from 'lucide-react';

function ScoreRing({ score, size = 100, stroke = 8, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const offset = c - (pct / 100) * c;
  let color = '#ef4444';
  if (pct >= 80) color = '#059669';
  else if (pct >= 60) color = '#3b82f6';
  else if (pct >= 40) color = '#d97706';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(pct)}</span>
        {label && <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{label}</span>}
      </div>
    </div>
  );
}

function SignalCard({ signal, index }) {
  const [expanded, setExpanded] = useState(signal.status === 'fail');
  const sevColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb' };
  const statusColors = { fail: '#dc2626', warn: '#d97706', pass: '#059669' };
  const statusLabels = { fail: 'FAIL', warn: 'WARN', pass: 'PASS' };
  const sevColor = sevColors[signal.severity] || '#64748b';
  const statusColor = statusColors[signal.status] || '#64748b';

  return (
    <div style={{ border: `1px solid ${signal.status === 'pass' ? '#e2e8f0' : sevColor + '30'}`, borderRadius: 10, marginBottom: 8, background: '#fff', borderLeft: `3px solid ${statusColor}`, opacity: signal.status === 'pass' ? 0.85 : 1 }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ width: 18, height: 18, borderRadius: 4, background: `${statusColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: statusColor, flexShrink: 0 }}>
          {signal.status === 'pass' ? <CheckCircle size={10} /> : signal.status === 'fail' ? <AlertTriangle size={10} /> : '!'}
        </span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{signal.name}</span>
        {signal.severity && signal.status !== 'pass' && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: `${sevColor}12`, color: sevColor, fontWeight: 600 }}>{signal.severity}</span>}
        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: `${statusColor}12`, color: statusColor, fontWeight: 700 }}>{statusLabels[signal.status]}</span>
        {signal.status !== 'pass' && <span style={{ fontSize: 10, color: '#94a3b8' }}>{signal.effort}</span>}
        {signal.status !== 'pass' && <ChevronDown size={12} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />}
      </button>
      {expanded && signal.status !== 'pass' && (
        <div style={{ padding: '0 14px 14px' }}>
          {signal.what_wrong && (
            <div style={{ padding: '10px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10} /> What is Wrong</div>
              <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.6 }}>{signal.what_wrong}</div>
            </div>
          )}
          {signal.why_it_matters && (
            <div style={{ padding: '10px 12px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Target size={10} /> Why It Matters for SEO</div>
              <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>{signal.why_it_matters}</div>
            </div>
          )}
          {signal.how_to_fix && (
            <div style={{ padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={10} /> How to Fix It (Step by Step)</div>
              <div style={{ fontSize: 12, color: '#065f46', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{signal.how_to_fix}</div>
            </div>
          )}
          {signal.before_code && signal.after_code && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', marginBottom: 3 }}>BEFORE (Bad)</div>
                <div style={{ background: '#1e293b', borderRadius: 6, padding: 10, overflow: 'auto' }}>
                  <pre style={{ fontSize: 11, color: '#fca5a5', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{signal.before_code}</pre>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#059669', marginBottom: 3 }}>AFTER (Good)</div>
                <div style={{ background: '#1e293b', borderRadius: 6, padding: 10, overflow: 'auto' }}>
                  <pre style={{ fontSize: 11, color: '#6ee7b7', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{signal.after_code}</pre>
                </div>
              </div>
            </div>
          )}
          {signal.code_example && !signal.before_code && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#3b82f6', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Code size={10} /> Code Example</div>
              <div style={{ background: '#1e293b', borderRadius: 6, padding: 10, overflow: 'auto' }}>
                <pre style={{ fontSize: 11, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{signal.code_example}</pre>
              </div>
            </div>
          )}
          {signal.expected_impact && (
            <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <BarChart3 size={11} /> <strong>Expected Impact:</strong> {signal.expected_impact}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SeoAnalysis() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mega, setMega] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.getAuditPages(id, { limit: 100 }).then(d => {
      setPages(d.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    setAnalysisLoading(true);
    setMega(null);
    api.getMegaAnalysis(id, selectedIdx).then(d => {
      setMega(d);
      setAnalysisLoading(false);
    }).catch(() => setAnalysisLoading(false));
  }, [id, selectedIdx, pages]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /><p style={{ marginTop: 12, color: '#64748b' }}>Loading pages...</p></div>;
  if (!pages.length) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No pages found</div>;

  const allSignals = mega?.all_signals || [];
  const issues = mega?.issues || [];

  const failSignals = allSignals.filter(s => s.status === 'fail');
  const warnSignals = allSignals.filter(s => s.status === 'warn');
  const passSignals = allSignals.filter(s => s.status === 'pass');

  let displayedSignals = allSignals;
  if (filter === 'fail') displayedSignals = failSignals;
  else if (filter === 'warn') displayedSignals = warnSignals;
  else if (filter === 'pass') displayedSignals = passSignals;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    displayedSignals = displayedSignals.filter(s => (s.name || '').toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q) || (s.what_wrong || '').toLowerCase().includes(q));
  }

  const catScores = mega?.category_scores || {};
  const categories = Object.entries(catScores).sort((a, b) => a[1] - b[1]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Search size={24} color="#3b82f6" /> SEO Signal Analysis
            <DataSourceBadge source="crawler" size="xs" />
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '6px 0 0' }}>{mega?.signals_checked || 0} signals checked across 25 categories. All data from on-page HTML crawl.</p>
        </div>

        <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))}
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer', marginBottom: 16 }}>
          {pages.map((p, i) => <option key={i} value={i}>{p.title || p.url} ({p.word_count || 0}w)</option>)}
        </select>

        {analysisLoading ? (
          <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <RefreshCw size={32} className="spin" color="#3b82f6" />
            <p style={{ marginTop: 12, fontSize: 14, color: '#64748b' }}>Running 269+ signal analysis...</p>
            <p style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>First visit ~45s (cached after this)</p>
          </div>
        ) : mega ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20, marginBottom: 24 }}>
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <ScoreRing score={mega.overall_score} size={120} stroke={10} label="SCORE" />
                <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{mega.page_title || 'Page'}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{mega.word_count} words | {mega.signals_checked} signals</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: 'Failing', value: mega.signals_failing, color: '#dc2626', bg: '#fef2f2' },
                  { label: 'Warnings', value: mega.signals_warning, color: '#d97706', bg: '#fffbeb' },
                  { label: 'Passing', value: mega.signals_passing, color: '#059669', bg: '#ecfdf5' },
                  { label: 'Total', value: mega.signals_checked, color: '#3b82f6', bg: '#eff6ff' },
                ].map((s, i) => (
                  <div key={i} style={{ padding: 14, background: s.bg, borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
                  </div>
                ))}
                {categories.slice(0, 8).map(([cat, score], i) => (
                  <div key={cat} style={{ padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{cat.replace(/_/g, ' ')}</div>
                      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 4 }}>
                        <div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626', borderRadius: 2 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626' }}>{Math.round(score)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search signals..." style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }} />
              {[
                { key: 'all', label: `All (${allSignals.length})` },
                { key: 'fail', label: `Fail (${failSignals.length})` },
                { key: 'warn', label: `Warn (${warnSignals.length})` },
                { key: 'pass', label: `Pass (${passSignals.length})` },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: filter === f.key ? '#3b82f6' : '#fff',
                  color: filter === f.key ? '#fff' : '#64748b',
                }}>{f.label}</button>
              ))}
            </div>

            <div>
              {displayedSignals.length === 0 ? (
                <div style={{ padding: 30, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <CheckCircle size={32} color="#059669" />
                  <p style={{ marginTop: 8, color: '#059669', fontWeight: 600 }}>
                    {filter === 'fail' ? 'No failing signals!' : filter === 'warn' ? 'No warnings!' : 'No signals match your search'}
                  </p>
                </div>
              ) : (
                displayedSignals.map((signal, i) => <SignalCard key={i} signal={signal} index={i} />)
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Search size={32} color="#94a3b8" />
            <p style={{ marginTop: 8, color: '#64748b' }}>Select a page to run 500+ signal analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}
