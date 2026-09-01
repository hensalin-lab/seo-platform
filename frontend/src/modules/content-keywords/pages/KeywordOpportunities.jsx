import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Key, Search, AlertTriangle, CheckCircle, ExternalLink, ArrowRight,
  BarChart3, FileText, Target, Info, TrendingUp, Eye, Zap, Filter,
  ChevronDown, ChevronRight, Layers, List, LayoutGrid, HelpCircle,
  GitMerge, Link2, Image, Map, BookOpen, MessageCircle, Hash, Wand2
} from 'lucide-react';
import { api } from '../../../api';
import ThemeHero from '../../../components/ai/ThemeHero';
import ThemeStatCard from '../../../components/ai/ThemeStatCard';
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip';
import ScoreRing from '../../../components/ScoreRing';

const INTENT_COLORS = {
  Informational: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  Commercial: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
  Transactional: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  Navigational: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Mixed: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
  Unknown: { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af' },
};

const DIFFICULTY_COLORS = {
  LOW: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  MEDIUM: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  HIGH: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

const OPPORTUNITY_COLORS = {
  HIGH: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  MEDIUM: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  LOW: { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af' },
};

const SEVERITY_COLORS = {
  Critical: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  High: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Medium: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  Low: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
};

const INTENT_TAG_COLORS = {
  COMMERCIAL: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
  TRANSACTIONAL: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  INFORMATIONAL: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  NAVIGATIONAL: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
};

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border, #e5e7eb)', overflowX: 'auto' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding: '10px 18px', fontSize: 13, fontWeight: active === t.key ? 600 : 500,
          color: active === t.key ? 'var(--accent, #3b82f6)' : 'var(--text-muted, #6b7280)',
          background: 'none', border: 'none', borderBottom: active === t.key ? '2px solid var(--accent, #3b82f6)' : '2px solid transparent',
          marginBottom: -2, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
        }}>
          {t.label}
          {t.count != null && (
            <span style={{
              marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
              background: active === t.key ? 'rgba(59,130,246,0.15)' : 'var(--border, #e5e7eb)',
              color: active === t.key ? 'var(--accent, #3b82f6)' : 'var(--text-muted, #6b7280)',
            }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function IntentBadge({ intent }) {
  const s = INTENT_COLORS[intent] || INTENT_COLORS.Unknown;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {intent}
    </span>
  );
}

function DiffBadge({ difficulty }) {
  const s = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.MEDIUM;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {difficulty}
    </span>
  );
}

function OppBadge({ opportunity }) {
  const s = OPPORTUNITY_COLORS[opportunity] || OPPORTUNITY_COLORS.LOW;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {opportunity}
    </span>
  );
}

function SourceBadge({ source }) {
  const map = {
    internal: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Internal' },
    both: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Both' },
    gsc_missing: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Missing' },
  };
  const s = map[source] || map.internal;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
      {s.label}
    </span>
  );
}

function KeywordTable({ keywords, search, sortKey, sortDir, onSort, showGsc }) {
  const filtered = useMemo(() => {
    let result = keywords;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(kw => kw.keyword?.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      const av = a[sortKey] ?? (typeof a[sortKey] === 'string' ? '' : 0);
      const bv = b[sortKey] ?? (typeof b[sortKey] === 'string' ? '' : 0);
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [keywords, search, sortKey, sortDir]);

  const thStyle = (key) => ({
    textAlign: key === 'keyword' ? 'left' : 'center',
    padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)',
    textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
  });

  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border, #e5e7eb)' }}>
              <th onClick={() => onSort('keyword')} style={thStyle('keyword')}>Keyword</th>
              <th onClick={() => onSort('frequency')} style={thStyle('frequency')}>Freq</th>
              <th onClick={() => onSort('type')} style={thStyle('type')}>Type</th>
              <th onClick={() => onSort('intent')} style={thStyle('intent')}>Intent</th>
              <th onClick={() => onSort('difficulty')} style={thStyle('difficulty')}>Difficulty</th>
              <th onClick={() => onSort('opportunity')} style={thStyle('opportunity')}>Opportunity</th>
              <th onClick={() => onSort('pages_using')} style={thStyle('pages_using')}>Pages</th>
              <th onClick={() => onSort('density')} style={thStyle('density')}>Density</th>
              {showGsc && <th onClick={() => onSort('clicks')} style={thStyle('clicks')}>Clicks</th>}
              {showGsc && <th onClick={() => onSort('impressions')} style={thStyle('impressions')}>Impr.</th>}
              {showGsc && <th onClick={() => onSort('ctr')} style={thStyle('ctr')}>CTR</th>}
              {showGsc && <th onClick={() => onSort('position')} style={thStyle('position')}>Pos</th>}
              {!showGsc && <th style={thStyle('source')}>Source</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((kw, i) => (
              <tr key={kw.keyword + i} style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{kw.keyword}</span>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>
                  {kw.frequency}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: kw.type === 'long-tail' ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
                    color: kw.type === 'long-tail' ? '#22c55e' : '#a855f7',
                  }}>
                    {kw.type === 'long-tail' ? 'Long' : 'Short'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <IntentBadge intent={kw.intent || kw.source} />
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <DiffBadge difficulty={kw.difficulty || 'MEDIUM'} />
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <OppBadge opportunity={kw.opportunity || 'LOW'} />
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>
                  {kw.pages_using ?? '—'}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary, #4b5563)' }}>
                  {kw.density ? `${kw.density}%` : '—'}
                </td>
                {showGsc && (
                  <>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: kw.clicks > 0 ? 'var(--text, #111827)' : 'var(--text-muted, #9ca3af)' }}>
                      {kw.clicks?.toLocaleString() ?? 0}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary, #4b5563)' }}>
                      {kw.impressions?.toLocaleString() ?? 0}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, color: kw.ctr > 3 ? '#22c55e' : kw.ctr > 1 ? '#f59e0b' : 'var(--text-muted, #9ca3af)' }}>
                      {(kw.ctr ?? 0).toFixed(2)}%
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: kw.position <= 3 ? '#22c55e' : kw.position <= 10 ? '#3b82f6' : kw.position <= 20 ? '#f59e0b' : 'var(--text-muted, #9ca3af)' }}>
                      {kw.position > 0 ? kw.position.toFixed(1) : '—'}
                    </td>
                  </>
                )}
                {!showGsc && kw.source && (
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <SourceBadge source={kw.source} />
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={showGsc ? 12 : 9} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted, #9ca3af)', fontSize: 13 }}>
                  No keywords match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border, #e5e7eb)', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
        Showing {filtered.length} of {keywords.length} keywords
      </div>
    </div>
  );
}

function TopicClusters({ clusters }) {
  if (!clusters || clusters.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <GitMerge size={18} color="#a855f7" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Topic Clusters</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— topical authority groups</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {clusters.map((cl, i) => (
          <div key={i} style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border, #e5e7eb)', background: 'rgba(168,85,247,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text, #111827)' }}>{cl.root_keyword}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: cl.topic_authority === 'HIGH' ? 'rgba(34,197,94,0.12)' : cl.topic_authority === 'MEDIUM' ? 'rgba(245,158,11,0.12)' : 'rgba(107,114,128,0.08)',
                color: cl.topic_authority === 'HIGH' ? '#22c55e' : cl.topic_authority === 'MEDIUM' ? '#f59e0b' : '#9ca3af',
              }}>
                {cl.topic_authority} Authority
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 8 }}>
              {cl.keyword_count} keywords · {cl.total_frequency} total occurrences
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {cl.keywords.slice(0, 8).map((kw, j) => (
                <span key={j} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(168,85,247,0.08)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.15)' }}>
                  {kw}
                </span>
              ))}
              {cl.keywords.length > 8 && <span style={{ fontSize: 11, padding: '3px 8px', color: 'var(--text-muted, #9ca3af)' }}>+{cl.keywords.length - 8} more</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionKeywords({ questions }) {
  if (!questions || questions.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <HelpCircle size={18} color="#3b82f6" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Question Keywords</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— featured snippet & PAA opportunities</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {questions.slice(0, 20).map((q, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border, #e5e7eb)', alignItems: 'flex-start' }}>
            <MessageCircle size={16} color="#3b82f6" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)', marginBottom: 4 }}>{q.question}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{q.type}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                  background: q.difficulty === 'LOW' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                  color: q.difficulty === 'LOW' ? '#22c55e' : '#f59e0b',
                }}>{q.difficulty}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LsiKeywords({ lsi }) {
  if (!lsi || lsi.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link2 size={18} color="#22c55e" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>LSI Keywords</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— semantically related terms</span>
      </div>
      <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border, #e5e7eb)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Keyword</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LSI Keyword</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Co-occurrence</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relevance</th>
            </tr>
          </thead>
          <tbody>
            {lsi.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{item.primary_keyword}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--accent, #3b82f6)', fontWeight: 500 }}>{item.lsi_keyword}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{item.co_occurrence_count}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: item.relevance === 'HIGH' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                    color: item.relevance === 'HIGH' ? '#22c55e' : '#f59e0b',
                  }}>{item.relevance}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EntityAnalysis({ entities }) {
  if (!entities || entities.length === 0) return null;
  const TYPE_COLORS = { BRAND: '#3b82f6', ACRONYM: '#a855f7', ORGANIZATION: '#22c55e', CONCEPT: '#f59e0b' };
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Map size={18} color="#f59e0b" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Entity Analysis</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— named entities and concepts</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {entities.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border, #e5e7eb)', background: `${TYPE_COLORS[e.type] || '#6b7280'}08` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{e.entity}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${TYPE_COLORS[e.type] || '#6b7280'}15`, color: TYPE_COLORS[e.type] || '#6b7280' }}>{e.type}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>×{e.frequency}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cannibalization({ cannibalization }) {
  if (!cannibalization || cannibalization.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={18} color="#ef4444" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Keyword Cannibalization</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— competing pages for same keyword</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cannibalization.map((c, i) => (
          <div key={i} style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm, 8px)', border: `1px solid ${c.severity === 'HIGH' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`, background: c.severity === 'HIGH' ? 'rgba(239,68,68,0.03)' : 'rgba(245,158,11,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text, #111827)' }}>"{c.keyword}"</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: c.severity === 'HIGH' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                color: c.severity === 'HIGH' ? '#ef4444' : '#f59e0b',
              }}>{c.severity}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--accent, #3b82f6)', fontWeight: 500, marginBottom: 8 }}>{c.recommendation}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {c.competing_pages.map((p, j) => (
                <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary, #4b5563)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.has_in_title ? '#22c55e' : '#f59e0b', flexShrink: 0 }} />
                  <span style={{ fontWeight: 500, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</span>
                  <span style={{ color: 'var(--text-muted, #9ca3af)' }}>({p.word_count} words)</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestedLandingPages({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Target size={18} color="#22c55e" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Suggested Landing Pages</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— which keywords should target which pages</span>
      </div>
      <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border, #e5e7eb)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keyword</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intent</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Page</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{s.keyword}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <IntentBadge intent={s.intent} />
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: s.action === 'CREATE' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                    color: s.action === 'CREATE' ? '#ef4444' : '#22c55e',
                  }}>{s.action}</span>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--accent, #3b82f6)', fontWeight: 500 }}>{s.suggested_page}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlogTopics({ topics }) {
  if (!topics || topics.length === 0) return null;
  const TYPE_COLORS = { GUIDE: '#3b82f6', 'Q&A': '#a855f7', COMPARISON: '#f59e0b' };
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <BookOpen size={18} color="#a855f7" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Suggested Blog Topics</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— content ideas from keyword gaps</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
        {topics.map((t, i) => (
          <div key={i} style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border, #e5e7eb)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)', lineHeight: 1.4, flex: 1, paddingRight: 8 }}>{t.title}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                background: `${TYPE_COLORS[t.type] || '#6b7280'}15`, color: TYPE_COLORS[t.type] || '#6b7280', whiteSpace: 'nowrap',
              }}>{t.type}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>~{t.estimated_words} words</span>
              <OppBadge opportunity={t.priority} />
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>Target: {t.target_audience}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqSuggestions({ faqs }) {
  if (!faqs || faqs.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <HelpCircle size={18} color="#22c55e" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Suggested FAQs</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— FAQPage schema candidates</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {faqs.slice(0, 15).map((f, i) => (
          <div key={i} style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border, #e5e7eb)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>{f.question}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                background: f.priority === 'HIGH' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                color: f.priority === 'HIGH' ? '#22c55e' : '#f59e0b',
              }}>{f.priority}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.5 }}>{f.suggested_answer}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{f.type}</span>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{f.schema_type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentGaps({ gaps }) {
  if (!gaps || gaps.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <BarChart3 size={18} color="#ef4444" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Content Gaps</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— keywords competitors use that you don't</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {gaps.slice(0, 30).map((g, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text, #111827)' }}>{g.keyword}</span>
            <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>×{g.competitor_frequency}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageKeywordMap({ pageKeywordMap }) {
  const [expanded, setExpanded] = useState(null);
  if (!pageKeywordMap || pageKeywordMap.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <LayoutGrid size={18} color="var(--accent, #3b82f6)" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Per-Page Keyword Map</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— which pages target which keywords</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border, #e5e7eb)' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Page</th>
              <th style={{ textAlign: 'center', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keywords Found</th>
              <th style={{ textAlign: 'center', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coverage</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {pageKeywordMap.map((p, i) => {
              const pct = p.total_internal_keywords > 0 ? Math.round(p.keyword_count / p.total_internal_keywords * 100) : 0;
              const isOpen = expanded === i;
              return (
                <React.Fragment key={p.url + i}>
                  <tr style={{ borderBottom: '1px solid var(--border, #e5e7eb)', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : i)}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--accent, #3b82f6)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isOpen ? <ChevronDown size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> : <ChevronRight size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
                      {p.url}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: p.keyword_count > 0 ? 'var(--text, #111827)' : 'var(--text-muted, #9ca3af)' }}>
                      {p.keyword_count}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, borderRadius: 3, background: 'var(--border, #e5e7eb)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: pct > 60 ? '#22c55e' : pct > 30 ? '#f59e0b' : '#ef4444', transition: 'width 0.5s ease' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)' }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
                      {p.keyword_count} of {p.total_internal_keywords} internal keywords
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={4} style={{ padding: '8px 16px 16px 36px', background: 'rgba(59,130,246,0.03)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #6b7280)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keywords found on this page:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {p.keywords_found.map((kw, j) => (
                            <span key={j} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.15)' }}>
                              <CheckCircle size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />{kw}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionPlanSection({ actionPlan }) {
  if (!actionPlan || actionPlan.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Zap size={18} color="#f59e0b" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Action Plan</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>— prioritized keyword improvements</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {actionPlan.map((item, i) => {
          const sev = SEVERITY_COLORS[item.priority] || SEVERITY_COLORS.Medium;
          return (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 'var(--radius-sm, 8px)', border: `1px solid ${sev.color}20`, background: `${sev.color}08` }}>
              <div style={{ minWidth: 80, display: 'flex', alignItems: 'flex-start', paddingTop: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: sev.bg, color: sev.color }}>
                  {item.priority}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)', marginBottom: 4 }}>
                  {item.keyword ? `"${item.keyword}"` : item.type.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.6 }}>
                  {item.detail}
                </div>
                <div style={{ fontSize: 12, color: 'var(--accent, #3b82f6)', fontWeight: 500, marginTop: 6 }}>
                  {item.suggestion}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IntentBreakdown({ intentSummary, total }) {
  const intents = Object.entries(intentSummary || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (intents.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '16px 20px' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Filter size={16} color="var(--accent, #3b82f6)" />
        Intent Classification
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {intents.map(([intent, count]) => {
          const s = INTENT_COLORS[intent] || INTENT_COLORS.Unknown;
          const pct = total > 0 ? Math.round(count / total * 100) : 0;
          return (
            <div key={intent} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 110, fontSize: 12, fontWeight: 600, color: s.color }}>{intent}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--border, #e5e7eb)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: s.color, transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text, #111827)', minWidth: 30, textAlign: 'right' }}>{count}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', minWidth: 35, textAlign: 'right' }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function KeywordOpportunities() {
  const { id } = useParams();
  const [enhanced, setEnhanced] = useState(null);
  const [research, setResearch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('frequency');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    Promise.all([
      api.getKeywordsEnhanced(id).catch(() => null),
      api.getKeywordResearch(id).catch(() => null),
    ]).then(([enh, res]) => {
      setEnhanced(enh);
      setResearch(res);
      if (!enh && !res) setError('Keyword data could not be loaded — the backend may still be waking up. Try again in a moment.');
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const allKeywords = useMemo(() => {
    if (!research && !enhanced) return [];
    if (research?.keywords) return research.keywords;
    return [...(enhanced?.keywords || []), ...(enhanced?.missing_keywords || [])];
  }, [research, enhanced]);

  const activeKeywords = useMemo(() => {
    if (!research && !enhanced) return [];
    switch (activeTab) {
      case 'longtail': return allKeywords.filter(k => k.type === 'long-tail' || k.is_long_tail);
      case 'shorttail': return allKeywords.filter(k => k.type === 'short-tail' || !k.is_long_tail);
      case 'missing': return enhanced?.missing_keywords || [];
      case 'gsc': return enhanced?.gsc_keywords || [];
      default: return allKeywords;
    }
  }, [activeTab, allKeywords, enhanced]);

  const summary = research?.summary || {};

  const tabs = useMemo(() => {
    const t = [
      { key: 'all', label: 'All Keywords', count: allKeywords.length },
      { key: 'clusters', label: 'Topic Clusters', count: research?.topic_clusters?.length || 0 },
      { key: 'questions', label: 'Questions', count: research?.question_keywords?.length || 0 },
      { key: 'lsi', label: 'LSI', count: research?.lsi_keywords?.length || 0 },
      { key: 'entities', label: 'Entities', count: research?.entity_suggestions?.length || 0 },
      { key: 'cannibal', label: 'Cannibalization', count: research?.cannibalization?.length || 0 },
      { key: 'landing', label: 'Landing Pages', count: research?.suggested_landing_pages?.length || 0 },
      { key: 'blog', label: 'Blog Ideas', count: research?.suggested_blog_topics?.length || 0 },
      { key: 'faq', label: 'FAQs', count: research?.suggested_faqs?.length || 0 },
    ];
    if (enhanced?.missing_keywords?.length > 0) {
      t.splice(3, 0, { key: 'missing', label: 'Missing Keywords', count: enhanced.missing_keywords.length });
    }
    if (enhanced?.gsc_available) {
      t.push({ key: 'gsc', label: 'GSC Data', count: enhanced.total_gsc || 0 });
    }
    if (research?.content_gaps?.length > 0) {
      t.push({ key: 'gaps', label: 'Content Gaps', count: research.content_gaps.length });
    }
    return t;
  }, [allKeywords, research, enhanced]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border, #e5e7eb)', borderTopColor: 'var(--accent, #3b82f6)', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 15, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>Researching keywords...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={24} color="#ef4444" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #111827)' }}>Failed to Load</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>{error}</div>
      </div>
    );
  }

  if (!enhanced && !research) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <Info size={40} color="var(--text-muted, #9ca3af)" />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #111827)' }}>No Data Available</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>Run an audit to see keyword intelligence.</div>
      </div>
    );
  }

  const health_score = enhanced?.health_score || 0;
  const gsc_available = enhanced?.gsc_available || false;
  const gsc_overview = enhanced?.gsc_overview || {};
  const total_internal = enhanced?.total_internal || 0;
  const total_gsc = enhanced?.total_gsc || 0;
  const total_combined = allKeywords.length;
  const total_missing = enhanced?.total_missing || 0;
  const long_tail_count = summary.low_difficulty || enhanced?.long_tail_count || 0;
  const short_tail_count = enhanced?.short_tail_count || 0;
  const intent_summary = enhanced?.intent_summary || research?.intent_breakdown || {};
  const page_keyword_map = enhanced?.page_keyword_map || [];
  const action_plan = enhanced?.action_plan || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <ThemeHero
        icon={Wand2}
        title="Keyword Strategy"
        subtitle="Complete keyword research: clusters, questions, LSI, cannibalization, and actionable suggestions."
        badges={[
          { icon: Target, t: 'High opportunity' },
          { icon: GitMerge, t: 'Topic clusters' },
          { icon: HelpCircle, t: 'Questions & FAQs' },
        ]}
      />

      <div>
        <AiSuggestionStrip auditId={id} tool="keyword-opportunities" title="AI keyword fixes" />
      </div>

      {/* Research Summary Stats */}
      {research?.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <ThemeStatCard icon={Key} label="Total Keywords" value={summary.total_keywords || total_combined} sub={`${summary.high_opportunity || 0} high opportunity`} color="#3b82f6" />
          <ThemeStatCard icon={Target} label="High Opportunity" value={summary.high_opportunity || 0} sub="Ready to target" color="#22c55e" />
          <ThemeStatCard icon={Hash} label="Low Difficulty" value={summary.low_difficulty || 0} sub="Easy wins" color="#a855f7" />
          <ThemeStatCard icon={GitMerge} label="Topic Clusters" value={summary.topic_clusters || 0} sub="Content groups" color="#f59e0b" />
          <ThemeStatCard icon={HelpCircle} label="Questions" value={summary.question_keywords || 0} sub="Featured snippet targets" color="#3b82f6" />
          <ThemeStatCard icon={AlertTriangle} label="Cannibalization" value={summary.cannibalization_issues || 0} sub="Conflicts to resolve" color="#ef4444" />
          <ThemeStatCard icon={BookOpen} label="Blog Ideas" value={summary.suggested_blog_topics || 0} sub="Content calendar ready" color="#a855f7" />
          <ThemeStatCard icon={HelpCircle} label="FAQs" value={summary.suggested_faqs || 0} sub="Schema candidates" color="#22c55e" />
        </div>
      )}

      {/* Health Score + GSC Banner (legacy enhanced) */}
      {!research && enhanced && (
        <div style={{ display: 'grid', gridTemplateColumns: gsc_available ? '140px 1fr' : '140px 1fr', gap: 20, alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ScoreRing score={health_score} size={130} stroke={10} label="Health" />
          </div>
          <div style={{
            background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)',
            borderRadius: 'var(--radius, 12px)', padding: '16px 20px',
          }}>
            {gsc_available ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <TrendingUp size={16} color="#22c55e" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>Google Search Console Performance</span>
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Clicks', value: gsc_overview.total_clicks?.toLocaleString() || '0', color: '#22c55e' },
                    { label: 'Impressions', value: gsc_overview.total_impressions?.toLocaleString() || '0', color: '#3b82f6' },
                    { label: 'Avg CTR', value: `${gsc_overview.avg_ctr || 0}%`, color: '#f59e0b' },
                    { label: 'Avg Position', value: (gsc_overview.avg_position || 0).toFixed(1), color: '#a855f7' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>{s.label}</span>
                      <span style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Eye size={16} color="var(--text-muted, #9ca3af)" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111827)' }}>GSC Not Connected</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>Configure GSC credentials to see real search performance data.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div style={{ display: 'grid', gridTemplateColumns: research ? '1fr' : '240px 1fr', gap: 20, alignItems: 'start' }}>
        {!research && <IntentBreakdown intentSummary={intent_summary} total={total_combined} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #9ca3af)' }} />
              <input type="text" placeholder="Filter keywords..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius-sm, 6px)', fontSize: 13, background: 'var(--bg-white, #fff)', color: 'var(--text, #111827)', outline: 'none' }} />
            </div>
          </div>
          {activeTab === 'all' && (
            <KeywordTable
              keywords={activeKeywords}
              search=""
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              showGsc={gsc_available}
            />
          )}
          {activeTab === 'longtail' && (
            <KeywordTable keywords={activeKeywords} search="" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} showGsc={false} />
          )}
          {activeTab === 'shorttail' && (
            <KeywordTable keywords={activeKeywords} search="" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} showGsc={false} />
          )}
          {activeTab === 'missing' && (
            <KeywordTable keywords={activeKeywords} search="" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} showGsc={gsc_available} />
          )}
          {activeTab === 'gsc' && (
            <KeywordTable keywords={activeKeywords} search="" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} showGsc={true} />
          )}
          {activeTab === 'clusters' && <TopicClusters clusters={research?.topic_clusters || []} />}
          {activeTab === 'questions' && <QuestionKeywords questions={research?.question_keywords || []} />}
          {activeTab === 'lsi' && <LsiKeywords lsi={research?.lsi_keywords || []} />}
          {activeTab === 'entities' && <EntityAnalysis entities={research?.entity_suggestions || []} />}
          {activeTab === 'cannibal' && <Cannibalization cannibalization={research?.cannibalization || []} />}
          {activeTab === 'landing' && <SuggestedLandingPages suggestions={research?.suggested_landing_pages || []} />}
          {activeTab === 'blog' && <BlogTopics topics={research?.suggested_blog_topics || []} />}
          {activeTab === 'faq' && <FaqSuggestions faqs={research?.suggested_faqs || []} />}
          {activeTab === 'gaps' && <ContentGaps gaps={research?.content_gaps || []} />}
        </div>
      </div>

      {/* Per-Page Keyword Map */}
      {activeTab === 'all' && <PageKeywordMap pageKeywordMap={page_keyword_map} />}

      {/* Action Plan */}
      {activeTab === 'all' && <ActionPlanSection actionPlan={action_plan} />}
    </div>
  );
}
