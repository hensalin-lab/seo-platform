import { useState, useEffect } from 'react';
import { api } from '../../../api';
import {
  Plug, KeyRound, Check, X, Trash2, ExternalLink, RefreshCw, Wifi, WifiOff, Globe,
  Bot, BarChart3, Link2, Search, Sparkles,
} from 'lucide-react';
import {
  Card, CardHeader, Badge, LoadingSpinner, EmptyState, inputStyle, labelStyle,
  btnPrimary, btnGhost,
} from './ui';

const ACCENT = '#8b5cf6';

const CAP_ICONS = {
  keyword_volume: BarChart3,
  serp_ranks: Search,
  backlinks: Link2,
  ai_citations: Bot,
  gsc: Globe,
};

function ProviderBadge({ source, configured, scaffold }) {
  if (source === 'keyless') {
    return <Badge color="#14b8a6">Keyless fallback</Badge>;
  }
  if (configured) {
    const color = source === 'env' ? '#f97316' : '#22c55e';
    return <Badge color={color}>{source === 'env' ? 'Env-configured' : 'Configured'}</Badge>;
  }
  return <Badge color={scaffold ? '#eab308' : '#94a3b8'}>{scaffold ? 'Scaffold' : 'Not configured'}</Badge>;
}

function ProviderForm({ provider, hasSaved, onSave, onDelete, onCancel, onTest, testing, testResult }) {
  const fields = provider.config_fields || [];
  const [values, setValues] = useState(() => {
    const init = {};
    fields.forEach(f => { init[f.key] = ''; });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const setValue = (key, value) => setValues(prev => ({ ...prev, [key]: value }));

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(values);
    } finally {
      setSaving(false);
    }
  };

  const isSecretSaved = (f) => f.secret && hasSaved;

  return (
    <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: 'rgba(139,92,246,0.05)', border: '1px dashed rgba(139,92,246,0.35)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {fields.map(f => (
          <div key={f.key}>
            <label style={labelStyle}>
              {f.label}
              {f.secret && isSecretSaved(f) && <span style={{ color: '#22c55e', marginLeft: 6 }}>· saved</span>}
            </label>
            {f.multiline ? (
              <textarea
                value={values[f.key] || ''}
                onChange={e => setValue(f.key, e.target.value)}
                placeholder={isSecretSaved(f) ? '(leave blank to keep saved value)' : ''}
                style={{ ...inputStyle, minHeight: 90, fontFamily: 'monospace' }}
              />
            ) : (
              <input
                type={f.secret ? 'password' : 'text'}
                value={values[f.key] || ''}
                onChange={e => setValue(f.key, e.target.value)}
                placeholder={isSecretSaved(f) ? '(leave blank to keep saved value)' : ''}
                style={inputStyle}
              />
            )}
          </div>
        ))}
      </div>
      {testResult && (
        <div style={{
          marginTop: 10, fontSize: 12, padding: '8px 12px', borderRadius: 8,
          background: testResult.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          color: testResult.ok ? '#22c55e' : '#ef4444',
        }}>
          {testResult.ok ? 'Connection OK' : 'Connection failed'}: {testResult.message}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button style={{ ...btnPrimary, padding: '7px 14px', fontSize: 12 }} onClick={submit} disabled={saving}>
          <Check size={14} /> {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          style={{ ...btnGhost, padding: '7px 14px', fontSize: 12 }}
          onClick={onTest}
          disabled={testing}
        >
          <RefreshCw size={13} className={testing ? 'spin' : ''} /> Test
        </button>
        {hasSaved && (
          <button
            style={{ ...btnGhost, padding: '7px 14px', fontSize: 12, color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
            onClick={onDelete}
          >
            <Trash2 size={13} /> Clear
          </button>
        )}
        <button style={{ ...btnGhost, padding: '7px 14px', fontSize: 12 }} onClick={onCancel}>
          <X size={13} /> Cancel
        </button>
      </div>
      {provider.docs && (
        <a href={provider.docs} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: ACCENT, marginTop: 10 }}>
          Provider docs <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}

export default function Providers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [oauth, setOauth] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [providers, oauthStatus] = await Promise.all([api.getProviders(), api.getGoogleOAuthStatus().catch(() => null)]);
      setData(providers);
      setOauth(oauthStatus);
      setTestResult(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (name, config) => {
    await api.saveProvider(name, config);
    await load();
    setEditing(null);
  };

  const remove = async (name) => {
    await api.deleteProvider(name);
    await load();
    setEditing(null);
  };

  const test = async (name) => {
    setTesting(name);
    setTestResult(null);
    try {
      const res = await api.testProvider(name);
      setTestResult({ provider: name, ok: res.ok, message: res.message || res.note || '' });
    } catch (e) {
      setTestResult({ provider: name, ok: false, message: e.message });
    } finally {
      setTesting(null);
    }
  };

  const connectGoogle = () => { window.location.href = api.googleAuth(); };

  if (loading) return <LoadingSpinner message="Loading provider integrations…" />;
  if (error) return <EmptyState icon={Plug} title="Failed to load integrations" message={error} action={<button style={btnPrimary} onClick={load}><RefreshCw size={14} /> Retry</button>} />;

  const capabilities = data.capabilities || {};
  const resolved = data.resolved || {};
  const providers = data.providers || [];
  const configuredProviders = providers.filter(p => !p.name.startsWith('keyless'));
  const keylessProviders = providers.filter(p => p.name.startsWith('keyless'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={Plug}
          title="Data Provider Integrations"
          badge="Phase 2"
          subtitle="Connect third-party data providers to replace keyless heuristics with measured data. Per-user keys override environment config."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {Object.keys(capabilities).map(cap => {
            const icon = CAP_ICONS[cap] || Plug;
            const meta = capabilities[cap];
            const res = resolved[cap] || {};
            const cfgd = res.configured && !res.keyless;
            return (
              <div key={cap} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: ACCENT, fontSize: 12 }}>{cap.charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{meta.label}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', minHeight: 26, marginBottom: 8 }}>{meta.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Badge color={cfgd ? '#22c55e' : '#14b8a6'}>{res.provider || '—'}</Badge>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cfgd ? 'live' : 'estimate'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader icon={KeyRound} title="Configured providers" subtitle="Credentials are encrypted at rest and override environment variables" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {configuredProviders.map(p => {
            return (
              <div key={p.name} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {(p.capabilities || []).map(c => <Badge key={c} color="#64748b">{c.replace('_', ' ')}</Badge>)}
                      {p.free && <Badge color="#14b8a6">Free</Badge>}
                    </div>
                  </div>
                  <ProviderBadge source={p.source} configured={p.configured} scaffold={p.scaffold} />
                  <button style={btnGhost} onClick={() => {
                    setEditing(editing === p.name ? null : p.name);
                    setTestResult(null);
                  }}>
                    {editing === p.name ? <X size={13} /> : <KeyRound size={13} />}
                    {editing === p.name ? 'Close' : 'Configure'}
                  </button>
                </div>
                {editing === p.name && (
                  <ProviderForm
                    provider={p}
                    hasSaved={Boolean(p.has_config)}
                    onSave={cfg => save(p.name, cfg)}
                    onDelete={() => remove(p.name)}
                    onCancel={() => setEditing(null)}
                    onTest={() => test(p.name)}
                    testing={testing === p.name}
                    testResult={testResult && testResult.provider === p.name ? testResult : null}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader icon={Sparkles} title="Google Search Console (OAuth)" subtitle="Connect your Google account to enable GSC-powered features" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {oauth && oauth.connected
                ? <Badge color="#22c55e"><Wifi size={11} /> Connected</Badge>
                : <Badge color="#94a3b8"><WifiOff size={11} /> Not connected</Badge>}
              {oauth && oauth.connected && oauth.email && <span style={{ fontSize: 12, color: 'var(--text)' }}>{oauth.email}</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 520 }}>
              Tokens are stored per-user. Reconnect to change accounts or revoke access, or clear the GSC provider config to remove them.
            </div>
          </div>
          <button style={btnPrimary} onClick={connectGoogle}>
            <Globe size={14} /> {oauth && oauth.connected ? 'Reconnect Google' : 'Connect with Google'}
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader icon={Plug} title="Keyless fallbacks" subtitle="Always available heuristics used when no provider is configured — no keys required" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
          {keylessProviders.map(p => (
            <div key={p.name} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(p.capabilities || []).map(c => c.replace('_', ' ')).join(', ')}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, padding: '0 4px' }}>
        Provider resolution is capability-based and per-user: each user's saved keys override shared environment config, and free providers (Google Custom Search, LLM citation check) are used before paid ones when enabled. If nothing is configured, the keyless estimate — free for all users — is used.
      </div>
    </div>
  );
}
