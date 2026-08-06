import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { api } from '../../api';
import { AI_GRADIENT, AI_GRADIENT_SOFT } from './theme';

function SkeletonBar() {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ height: 11, width: '62%', borderRadius: 4, background: 'linear-gradient(90deg,#eef2ff,#f5f3ff,#eef2ff)', backgroundSize: '200% 100%', animation: 'stripShimmer 1.4s linear infinite', marginBottom: 5 }} />
      <div style={{ height: 7, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '38%', borderRadius: 4, background: 'linear-gradient(90deg,#a5b4fc,#c4b5fd)', opacity: 0.6 }} />
      </div>
    </div>
  );
}

export default function AiSuggestionStrip({ auditId, tool = 'all', category = '', title = 'AI suggestions', limit = 3, showViewAll = true }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.getToolSuggestions(auditId, { tool, category, limit })
      .then(res => { if (alive) setItems(res?.items || []); })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [auditId, tool, category, limit]);

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
        <style>{`@keyframes stripShimmer { to { background-position: -200% 0; } }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: AI_GRADIENT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={11} color="#8b5cf6" /></div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>AI is analyzing this page...</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <SkeletonBar /><SkeletonBar /><SkeletonBar />
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-white)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 14,
      padding: '14px 16px', boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      borderLeft: `3px solid ${AI_GRADIENT.split(',').pop().trim().split(')')[0] + ')'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: AI_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px -4px rgba(139,92,246,0.5)' }}>
            <Sparkles size={12} color="#fff" />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.01em' }}>{title}</span>
          <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: 'rgba(139,92,246,0.12)', color: '#7c3aed' }}>AI</span>
        </div>
        {showViewAll && auditId && (
          <button
            onClick={() => navigate(`/audit/${auditId}/ai-suggestions?tool=${tool}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#7c3aed' }}
          >
            View all <ArrowRight size={11} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {items.slice(0, limit).map((item, i) => {
          const pct = Math.min(100, Math.max(0, Number(item.ai_impact_pct) || 0));
          return (
            <div key={item.id || i} style={{ flex: 1, minWidth: 190, maxWidth: 340 }}>
              <div style={{ fontSize: 11.5, fontWeight: 650, color: 'var(--text)', marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {item.signal_name || item.title || 'Suggestion'}
              </div>
              <div style={{ height: 6, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: i === 0 ? AI_GRADIENT : 'linear-gradient(90deg,#a5b4fc,#c4b5fd)', opacity: 0.9, transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>{pct}% ranking impact</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
