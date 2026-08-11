import React from 'react';
import { Search, AlertTriangle, RefreshCw, Database, ArrowRight } from 'lucide-react';

const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 650, transition: 'opacity 0.15s ease',
};

export function LoadingState({ message = 'Loading…', skeleton = 'cards' }) {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes stateShimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }`}</style>
      {skeleton === 'table' ? (
        <div style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border-light, #e8ecef)', borderRadius: 12, overflow: 'hidden' }}>
          {[1, 2, 3, 4, 5].map(r => (
            <div key={r} style={{ display: 'flex', gap: 16, padding: '14px 20px', borderBottom: r < 5 ? '1px solid var(--border-light, #eef0f2)' : 'none' }}>
              {[0.6, 1, 0.8, 0.4].map((w, c) => (
                <div key={c} style={{ flex: w, height: 12, borderRadius: 5, background: 'linear-gradient(90deg, #eef0f2 25%, #e2e5ea 50%, #eef0f2 75%)', backgroundSize: '200px 100%', animation: 'stateShimmer 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: 'var(--bg-white, #fff)', border: '1px solid var(--border-light, #e8ecef)', borderRadius: 12, padding: 20 }}>
              <div style={{ height: 14, width: '55%', borderRadius: 5, background: 'linear-gradient(90deg, #eef0f2 25%, #e2e5ea 50%, #eef0f2 75%)', backgroundSize: '200px 100%', animation: 'stateShimmer 1.4s ease-in-out infinite' }} />
              <div style={{ height: 10, width: '95%', borderRadius: 5, marginTop: 12, background: 'linear-gradient(90deg, #eef0f2 25%, #e2e5ea 50%, #eef0f2 75%)', backgroundSize: '200px 100%', animation: 'stateShimmer 1.4s ease-in-out infinite' }} />
              <div style={{ height: 10, width: '75%', borderRadius: 5, marginTop: 8, background: 'linear-gradient(90deg, #eef0f2 25%, #e2e5ea 50%, #eef0f2 75%)', backgroundSize: '200px 100%', animation: 'stateShimmer 1.4s ease-in-out infinite' }} />
            </div>
          ))}
        </div>
      )}
      {message && (
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted, #8a8f9e)', fontWeight: 550 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner" style={{ width: 14, height: 14 }} /> {message}
          </span>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Search, title = 'No data available', description, action, iconColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: iconColor ? `${iconColor}14` : 'var(--primary-light, #eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Icon size={26} style={{ color: iconColor || 'var(--primary, #4c6ef5)' }} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text, #1a1d29)', marginBottom: 6 }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--text-muted, #8a8f9e)', maxWidth: 340, lineHeight: 1.55 }}>{description}</div>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Couldn't load this", message, onRetry, icon: Icon = AlertTriangle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Icon size={26} color="#dc2626" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text, #1a1d29)', marginBottom: 6 }}>{title}</div>
      {message && <div style={{ fontSize: 13, color: 'var(--text-muted, #8a8f9e)', maxWidth: 380, lineHeight: 1.55 }}>{message}</div>}
      {onRetry && (
        <button onClick={onRetry} style={{ ...btnBase, background: 'var(--primary, #4c6ef5)', color: '#fff', marginTop: 18 }}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

export function PageState({ loading, error, empty, onRetry, loadingMessage, emptyTitle, emptyDescription, emptyAction, emptyIcon: EmptyIcon, errorMessage, children }) {
  if (loading) return <LoadingState message={loadingMessage} />;
  if (error) return <ErrorState message={errorMessage || error} onRetry={onRetry} />;
  if (empty) return <EmptyState icon={EmptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  return children;
}

export function DataUnavailable({ label = 'Connect Google Search Console to see this', onConnect }) {
  return (
    <EmptyState
      icon={Database}
      title="Not connected yet"
      description={label}
      action={onConnect && (
        <button onClick={onConnect} style={{ ...btnBase, background: 'var(--primary, #4c6ef5)', color: '#fff' }}>
          Connect <ArrowRight size={14} />
        </button>
      )}
    />
  );
}
