import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  GitCompare, AlertTriangle, CheckCircle, ArrowRight, TrendingUp,
  TrendingDown, Minus, BarChart3, FileText, Layers, Target, Info
} from 'lucide-react';
import { api } from '../../../api';
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip';
import ThemeHero from '../../../components/ai/ThemeHero';

function ScoreDiff({ label, a, b }) {
  const diff = Math.round((a - b) * 10) / 10;
  const isUp = diff > 0;
  const isDown = diff < 0;
  const color = isUp ? '#22c55e' : isDown ? '#ef4444' : 'var(--text-muted, #6b7280)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text, #111827)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #111827)', minWidth: 40, textAlign: 'right' }}>{Math.round(a)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 70, justifyContent: 'center' }}>
          {isUp && <TrendingUp size={14} color={color} />}
          {isDown && <TrendingDown size={14} color={color} />}
          {!isUp && !isDown && <Minus size={14} color={color} />}
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{diff > 0 ? '+' : ''}{diff}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #111827)', minWidth: 40 }}>{Math.round(b)}</span>
      </div>
    </div>
  );
}

export default function AuditCompare() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [otherId, setOtherId] = useState('');
  const [history, setHistory] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getHistory(20).then(res => {
      const items = res.history || res || [];
      setHistory(items.filter(a => a.id !== id));
    }).catch(() => {});
  }, [id]);

  const runCompare = async () => {
    if (!otherId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.compareAudits(id, otherId);
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ThemeHero
        icon={GitCompare}
        title="Compare Audits"
        subtitle="Compare two audits side by side to track improvements or benchmark"
        badges={[
          { icon: BarChart3, t: 'Side-by-side' },
          { icon: TrendingUp, t: 'Score deltas' },
          { icon: Target, t: 'Benchmark' },
        ]}
      />

      <AiSuggestionStrip auditId={id} tool="compare" title="AI fixes" />

      {/* Selector */}
      <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', padding: '16px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #111827)', marginBottom: 12 }}>Select audit to compare against:</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={otherId}
            onChange={e => setOtherId(e.target.value)}
            style={{ flex: 1, minWidth: 250, padding: '9px 12px', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius-sm, 6px)', fontSize: 13, background: 'var(--bg-white, #fff)', color: 'var(--text, #111827)', outline: 'none' }}
          >
            <option value="">Choose an audit...</option>
            {history.map(a => (
              <option key={a.id} value={a.id}>{a.website_url} ({a.id.slice(0, 8)}...) — {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</option>
            ))}
          </select>
          <button
            onClick={runCompare}
            disabled={!otherId || loading}
            style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 'var(--radius-sm, 6px)',
              background: otherId && !loading ? 'var(--accent, #3b82f6)' : 'var(--border, #e5e7eb)',
              color: otherId && !loading ? '#fff' : 'var(--text-muted, #6b7280)',
              cursor: otherId && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Comparing...' : 'Compare'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: '#ef4444' }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Winner Banner */}
          <div style={{
            padding: '16px 20px', borderRadius: 'var(--radius, 12px)',
            background: data.winner === 'TIE' ? 'rgba(245,158,11,0.08)' : data.winner === 'A' ? 'rgba(34,197,94,0.08)' : 'rgba(59,130,246,0.08)',
            border: `1px solid ${data.winner === 'TIE' ? 'rgba(245,158,11,0.2)' : data.winner === 'A' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)'}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            {data.winner === 'TIE' ? <Minus size={20} color="#f59e0b" /> : <Target size={20} color={data.winner === 'A' ? '#22c55e' : '#3b82f6'} />}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text, #111827)' }}>
                {data.winner === 'TIE' ? "It's a Tie!" : `Audit ${data.winner} Wins`}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary, #4b5563)' }}>
                {data.audit_a.url} vs {data.audit_b.url}
              </div>
            </div>
          </div>

          {/* Score Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border, #e5e7eb)', background: 'rgba(34,197,94,0.04)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text, #111827)' }}>Audit A</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{data.audit_a.url}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>{data.audit_a.created_at ? new Date(data.audit_a.created_at).toLocaleDateString() : ''}</div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {Object.entries(data.audit_a.scores).map(([key, val]) => (
                  <ScoreDiff key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} a={val} b={data.audit_b.scores[key] || 0} />
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border, #e5e7eb)', background: 'rgba(59,130,246,0.04)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text, #111827)' }}>Audit B</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{data.audit_b.url}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>{data.audit_b.created_at ? new Date(data.audit_b.created_at).toLocaleDateString() : ''}</div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {Object.entries(data.audit_b.scores).map(([key, val]) => (
                  <ScoreDiff key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} a={data.audit_a.scores[key] || 0} b={val} />
                ))}
              </div>
            </div>
          </div>

          {/* Comparison Stats */}
          <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #111827)' }}>Detailed Comparison</span>
            </div>
            <div style={{ padding: '14px 18px' }}>
              {Object.entries(data.comparison).map(([key, val]) => (
                <ScoreDiff key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} a={val.a} b={val.b} />
              ))}
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 12 }}>
          <GitCompare size={40} color="var(--text-muted, #9ca3af)" />
          <div style={{ fontSize: 14, color: 'var(--text-muted, #6b7280)' }}>Select an audit above to compare</div>
        </div>
      )}
    </div>
  );
}
