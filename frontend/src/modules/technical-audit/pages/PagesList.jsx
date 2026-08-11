import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Search, FileCode, ExternalLink, AlertTriangle, Clock, Link2, Image as ImageIcon, Type, Globe, Cpu } from 'lucide-react';
import { LoadingState, EmptyState } from '../../../components/States';
import ScoreRing from '../../../components/ScoreRing';
import { sevColor } from '../../../components/ai/theme';

const PAGE_SIZE = 15;

const STATUS_OK = (code) => (code >= 200 && code < 300);

function StatusBadge({ code }) {
  const ok = STATUS_OK(code);
  const color = ok ? '#059669' : code === 0 ? '#94a3b8' : '#dc2626';
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}40`, whiteSpace: 'nowrap' }}>{code || 'n/a'}</span>;
}

function Th({ label, sortKey, sort, onSort, style }) {
  const active = sort.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: active ? '#1d4ed8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
    >
      {label} {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
    </th>
  );
}

export default function PagesList() {
  const { id } = useParams();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'url', dir: 'asc' });
  const [page, setPage] = useState(0);

  const [selectedUrl, setSelectedUrl] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api.getAuditPages(id, { limit: 500 }).then(d => { setPages(d.items || []); setLoading(false); }).catch(() => { setPages([]); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!selectedUrl) { setDetail(null); return; }
    setDetailLoading(true);
    api.getPageDetail(id, selectedUrl)
      .then(d => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [id, selectedUrl]);

  const types = useMemo(() => [...new Set(pages.map(p => p.page_type).filter(Boolean))].sort(), [pages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = pages;
    if (q) list = list.filter(p => (p.url || '').toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q));
    if (typeFilter !== 'all') list = list.filter(p => p.page_type === typeFilter);
    if (statusFilter === 'ok') list = list.filter(p => STATUS_OK(p.status_code));
    if (statusFilter === 'error') list = list.filter(p => !STATUS_OK(p.status_code));
    if (statusFilter === 'unknown') list = list.filter(p => !p.status_code);
    const dir = sort.dir === 'asc' ? 1 : -1;
    const key = sort.key;
    const val = (p) => {
      if (key === 'issues') return p.context_issues_count || 0;
      if (key === 'words') return p.word_count || 0;
      if (key === 'response') return p.response_time_ms || 0;
      if (key === 'internal') return p.links_internal_count || 0;
      if (key === 'external') return p.links_external_count || 0;
      if (key === 'images') return p.images_count || 0;
      return String(p[key] || '').toLowerCase();
    };
    return [...list].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [pages, search, typeFilter, statusFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const onSort = (key) => {
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  if (loading) return <LoadingState message="Loading pages…" />;
  if (!pages.length) return <EmptyState title="No pages found" description="Run an audit to crawl and index your pages." />;

  const detailScores = detail?.scores || {};

  return (
    <div style={{ padding: '0 24px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, alignItems: 'start' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-white)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCode size={16} style={{ color: '#4c6ef5' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Pages</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} of {pages.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 8, color: '#94a3b8' }} />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search URL or title…"
                  style={{ width: '100%', padding: '6px 10px 6px 30px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}>
                <option value="all">All types</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}>
                <option value="all">All statuses</option>
                <option value="ok">OK (2xx)</option>
                <option value="error">Errors (4xx/5xx)</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <Th label="URL" sortKey="url" sort={sort} onSort={onSort} />
                  <Th label="Status" sortKey="status_code" sort={sort} onSort={onSort} />
                  <Th label="Type" sortKey="page_type" sort={sort} onSort={onSort} />
                  <Th label="Words" sortKey="words" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
                  <Th label="Internal" sortKey="internal" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
                  <Th label="External" sortKey="external" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
                  <Th label="Images" sortKey="images" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
                  <Th label="Resp (ms)" sortKey="response" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
                  <Th label="Issues" sortKey="issues" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
                </tr>
              </thead>
              <tbody>
                {visible.map(p => {
                  const sel = selectedUrl === p.url;
                  const issues = p.context_issues_count || 0;
                  return (
                    <tr key={p.url} onClick={() => setSelectedUrl(p.url)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: sel ? '#eff6ff' : 'inherit' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600, color: sel ? '#1d4ed8' : '#1e293b', wordBreak: 'break-all' }}>{p.url}</div>
                        {p.title && <div style={{ color: 'var(--text-muted)', fontSize: 11, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>}
                      </td>
                      <td style={{ padding: '8px 10px' }}><StatusBadge code={p.status_code} /></td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#475569' }}>{p.page_type || 'UNKNOWN'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>{p.word_count || 0}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>{p.links_internal_count || 0}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>{p.links_external_count || 0}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>{p.images_count || 0}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>{p.response_time_ms != null ? p.response_time_ms : '—'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        {issues > 0 ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 700 }}><AlertTriangle size={12} />{issues}</span> : <span style={{ color: '#94a3b8' }}>0</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(safePage - 1)} disabled={safePage === 0} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, cursor: safePage === 0 ? 'not-allowed' : 'pointer', opacity: safePage === 0 ? 0.4 : 1 }}>Prev</button>
              <span style={{ fontSize: 12, alignSelf: 'center', color: '#475569' }}>{safePage + 1} / {pageCount}</span>
              <button onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount - 1} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, cursor: safePage >= pageCount - 1 ? 'not-allowed' : 'pointer', opacity: safePage >= pageCount - 1 ? 0.4 : 1 }}>Next</button>
            </div>
          </div>
        </div>

        <div style={{ position: 'sticky', top: 16, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-white)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={16} style={{ color: '#4c6ef5' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Page Detail</span>
          </div>
          {!selectedUrl && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Select a page to view its score, issues and fixes.
            </div>
          )}
          {selectedUrl && detailLoading && <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div>}
          {selectedUrl && !detailLoading && !detail && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No detail available for this page.
            </div>
          )}
          {detail && (
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                {detailScores.overall != null && <ScoreRing score={detailScores.overall} size={96} label="Overall" stroke={8} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 12, wordBreak: 'break-all', marginBottom: 6 }}>{detail.url}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <StatusBadge code={detail.status_code} />
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>{detail.page_type || 'UNKNOWN'}</span>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Globe size={12} style={{ color: '#94a3b8' }} />
                    <a href={detail.canonical || detail.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none' }}>View page <ExternalLink size={10} style={{ verticalAlign: 'middle' }} /></a>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { icon: Type, label: 'Words', value: detail.word_count },
                  { icon: Link2, label: 'Internal', value: detail.links_internal_count },
                  { icon: ExternalLink, label: 'External', value: detail.links_external_count },
                  { icon: ImageIcon, label: 'Images', value: detail.images_count },
                  { icon: AlertTriangle, label: 'Issues', value: (detail.issues || []).length },
                  { icon: Clock, label: 'Response', value: detail.response_time_ms != null ? `${detail.response_time_ms}ms` : '—' },
                ].map(({ icon: I, label, value }) => (
                  <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc' }}>
                    <I size={14} style={{ color: '#64748b' }} />
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{value ?? 0}</div>
                    </div>
                  </div>
                ))}
              </div>

              {detailScores.overall != null && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Category Scores</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(detailScores).filter(([k, v]) => k !== 'overall' && typeof v === 'number').map(([k, v]) => (
                      <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 20, fontSize: 11, background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: v >= 80 ? '#12b886' : v >= 60 ? '#4c6ef5' : v >= 40 ? '#f59f00' : '#fa5252' }} />
                        {k.replace(/_/g, ' ')} {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detail.h1 && (
                <div style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>H1</div>
                  <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{detail.h1}</div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Issues ({detail.issues?.length || 0})</div>
                {(detail.issues || []).length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No issues found for this page.</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                  {(detail.issues || []).map(i => (
                    <div key={i.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${sevColor(i.severity)}18`, color: sevColor(i.severity) }}>{i.severity}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{i.signal_name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>{i.description}</div>
                      {i.fix && <div style={{ fontSize: 11, color: '#2563eb', background: '#eff6ff', borderRadius: 6, padding: 6 }}>Fix: {i.fix}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {detail.recommendations?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Recommendations ({detail.recommendations.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                    {detail.recommendations.map(r => (
                      <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>{r.priority}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{r.issue}</span>
                        </div>
                        {r.exact_fix && <div style={{ fontSize: 11, color: '#475569' }}>{r.exact_fix}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
