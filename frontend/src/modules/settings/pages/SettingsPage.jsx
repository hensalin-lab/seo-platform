import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../components/Toast';
import { api } from '../../../api';
import { User, Lock, Key, Webhook, Calendar, Palette, Save, Trash2, Plus, Eye, EyeOff, Cpu, RefreshCw, CheckCircle2, XCircle, Mail, Send, Globe, ExternalLink, Link2, Loader2, Activity, MessageSquare, BarChart } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'ai-providers', label: 'AI Providers', icon: Cpu },
  { id: 'google', label: 'Google', icon: Globe },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'digest', label: 'Digest', icon: Mail },
  { id: 'slack', label: 'Slack', icon: MessageSquare },
  { id: 'scheduled', label: 'Scheduled', icon: Calendar },
  { id: 'whitelabel', label: 'White Label', icon: Palette },
  { id: 'activity', label: 'Activity', icon: Activity },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');
  const [user, setUser] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>Settings</h1>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', background: tab === t.id ? 'var(--accent)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: 4, textAlign: 'left' }}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {tab === 'profile' && <ProfileTab user={user} setUser={setUser} addToast={addToast} />}
          {tab === 'password' && <PasswordTab addToast={addToast} />}
          {tab === 'api-keys' && <ApiKeysTab addToast={addToast} />}
          {tab === 'ai-providers' && <AiProvidersTab addToast={addToast} />}
          {tab === 'google' && <GoogleTab addToast={addToast} />}
          {tab === 'webhooks' && <WebhooksTab addToast={addToast} />}
          {tab === 'digest' && <DigestTab addToast={addToast} />}
          {tab === 'slack' && <SlackTab addToast={addToast} />}
          {tab === 'scheduled' && <ScheduledTab addToast={addToast} />}
          {tab === 'whitelabel' && <WhiteLabelTab addToast={addToast} />}
          {tab === 'activity' && <ActivityTab addToast={addToast} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user, setUser, addToast }) {
  const [username, setUsername] = useState(user?.username || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const data = await api.updateMe({ username });
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      addToast('Profile updated', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Profile</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
        <input value={user?.email || ''} disabled
          style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 14, opacity: 0.6 }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Role</label>
        <span style={{ padding: '4px 12px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 6, fontSize: 13 }}>{user?.role || 'VIEWER'}</span>
      </div>
      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

function PasswordTab({ addToast }) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.changePassword(current, newPass);
      addToast('Password changed', 'success');
      setCurrent('');
      setNewPass('');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Change Password</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Current Password</label>
        <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>New Password</label>
        <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} minLength={8}
          style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }} />
      </div>
      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Lock size={14} /> {saving ? 'Saving...' : 'Change Password'}
      </button>
    </div>
  );
}

function ApiKeysTab({ addToast }) {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const res = await api.listApiKeys(); setKeys(res?.items ?? res ?? []); } catch (e) { addToast(e.message, 'error'); }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try {
      await api.createApiKey(name || 'API Key');
      setName('');
      addToast('API key created', 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const revoke = async (id) => {
    try {
      await api.revokeApiKey(id);
      addToast('API key revoked', 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>API Keys</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Key name"
          style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }} />
        <button className="btn btn-primary btn-sm" onClick={create} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={13} /> Create
        </button>
      </div>
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : keys.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No API keys yet</p>
      ) : keys.map(k => (
        <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{k.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{k.key}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Created: {k.created_at?.split('T')[0]}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => revoke(k.id)} style={{ color: '#ef4444' }}>
            <Trash2 size={13} /> Revoke
          </button>
        </div>
      ))}
    </div>
  );
}

function AiProvidersTab({ addToast }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request('/ai/providers-status');
      setProviders(Array.isArray(res) ? res : res?.providers || []);
    } catch (e) {
      addToast(e.message || 'Failed to load AI provider status', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const statusColor = (status) =>
    status === 'ok' ? '#22c55e' : status === 'error' ? '#ef4444' : '#6b7280';
  const statusLabel = (status) =>
    status === 'ok' ? 'Healthy' : status === 'error' ? 'Error' : 'Not tested yet';

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>AI Providers</h2>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        These free providers power AI visibility checks, prompt tests, and content rewrites. Keys are set as environment variables on the server (Railway / Vercel), not stored here.
      </p>
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <>
          {providers.map(p => (
            <div key={p.name} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: p.configured ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.15)', color: p.configured ? '#22c55e' : 'var(--text-muted)' }}>
                    {p.configured ? 'Key set' : 'No key'}
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${statusColor(p.status)}18`, color: statusColor(p.status), display: 'flex', alignItems: 'center', gap: 4 }}>
                    {p.status === 'ok' ? <CheckCircle2 size={11} /> : p.status === 'error' ? <XCircle size={11} /> : null}
                    {statusLabel(p.status)}
                  </span>
                </div>
                {p.detail && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>{p.detail}</div>
                )}
                {p.guidance && (
                  <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>{p.guidance}</div>
                )}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Where to get free keys</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.9 }}>
              <li><strong>Gemini</strong> (recommended): aistudio.google.com/apikey — free tier</li>
              <li><strong>Groq</strong>: console.groq.com/keys — free tier, resets daily</li>
              <li><strong>Mistral</strong>: console.mistral.ai — free ~1B tokens/mo, no card</li>
              <li><strong>NVIDIA NIM</strong>: build.nvidia.com — free eval credits, no card</li>
              <li><strong>HuggingFace</strong>: huggingface.co/settings/tokens — free tier, no card</li>
              <li><strong>GitHub Models</strong>: reuse any GitHub token — free GPT-4o/Llama</li>
              <li><strong>SambaNova</strong>: cloud.sambanova.ai — trial credits, no card</li>
              <li><strong>OpenRouter</strong>: openrouter.ai/settings/keys — free model variants</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

const WEBHOOK_EVENTS = [
  'audit.completed', 'audit.failed', 'audit.started',
  'drift.regression', 'uptime.down', 'webhook.test',
];

function WebhooksTab({ addToast }) {  const [hooks, setHooks] = useState([]);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState(['audit.completed', 'audit.failed']);
  const [loading, setLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState(null);

  const load = useCallback(async () => {
    try { const res = await api.listWebhooks(); setHooks(res?.items ?? res ?? []); } catch (e) { addToast(e.message, 'error'); }
    try { setEmailStatus(await api.getEmailStatus()); } catch (e) { /* non-critical */ }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try {
      await api.createWebhook(url, events);
      setUrl('');
      addToast('Webhook created', 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const toggleEvent = (ev) => {
    setEvents(prev => prev.includes(ev) ? prev.filter(x => x !== ev) : [...prev, ev]);
  };

  const del = async (id) => {
    try { await api.deleteWebhook(id); addToast('Deleted', 'success'); load(); } catch (e) { addToast(e.message, 'error'); }
  };

  const test = async (id) => {
    try { await api.testWebhook(id, {}); addToast('Test sent', 'success'); } catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Email Alerts</h2>
          {emailStatus && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, color: emailStatus.configured ? '#065f46' : '#92400e', background: emailStatus.configured ? '#d1fae5' : '#fef3c7' }}>
              {emailStatus.configured ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {emailStatus.configured ? 'Enabled' : 'Not configured'}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Receive an email when an audit completes or fails, including validated fix results.
          {emailStatus?.configured ? (
            <> Delivery from <b>{emailStatus.from_email}</b> via <b>{emailStatus.host}</b>.</>
          ) : (
            <> Set <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4 }}>SMTP_HOST</code>, <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4 }}>SMTP_PORT</code>, <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4 }}>SMTP_USER</code>, <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4 }}>SMTP_PASSWORD</code> and <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4 }}>EMAIL_FROM</code> to enable.</>
          )}
        </p>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Webhooks</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-webhook-url.com"
          style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }} />
        <button className="btn btn-primary btn-sm" onClick={create} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={13} /> Add
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {WEBHOOK_EVENTS.map(ev => (
          <button
            key={ev}
            onClick={() => toggleEvent(ev)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer', background: events.includes(ev) ? 'rgba(139,92,246,0.14)' : 'var(--bg-primary)', color: events.includes(ev) ? '#8b5cf6' : 'var(--text-secondary)' }}
          >
            {events.includes(ev) && <CheckCircle2 size={11} />}
            {ev}
          </button>
        ))}
      </div>
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : hooks.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No webhooks configured</p>
      ) : hooks.map(w => (
        <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{w.url}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Events: {w.events?.join(', ')}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-outline btn-sm" onClick={() => test(w.id)}>Test</button>
            <button className="btn btn-outline btn-sm" onClick={() => del(w.id)} style={{ color: '#ef4444' }}><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

function DigestTab({ addToast }) {
  const [status, setStatus] = useState(null);
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState('weekly');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.getDigestStatus();
      setStatus(s);
      setEnabled(s.preference?.enabled ?? true);
      setFrequency(s.preference?.frequency ?? 'weekly');
    } catch (e) { addToast(e.message, 'error'); }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const p = await api.updateDigestPreferences({ enabled, frequency });
      setStatus(prev => ({ ...prev, preference: p }));
      addToast('Digest preferences saved', 'success');
    } catch (e) { addToast(e.message, 'error'); }
    setSaving(false);
  };

  const sendNow = async () => {
    setSending(true);
    try {
      await api.sendDigest();
      addToast('Digest sent — check your inbox', 'success');
    } catch (e) { addToast(e.message, 'error'); }
    setSending(false);
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Weekly AI Coach Digest</h2>
        {status && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, color: status.configured ? '#065f46' : '#92400e', background: status.configured ? '#d1fae5' : '#fef3c7' }}>
            {status.configured ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {status.configured ? 'Email enabled' : 'SMTP not configured'}
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
        Get a weekly email with score movement across your sites, open critical/high issues, validated fix wins, and an AI coach priority call-out.
        {!status?.configured && <> Set <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4 }}>SMTP_*</code> variables to enable delivery.</>}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ width: 16, height: 16 }} />
        <label style={{ fontSize: 13, color: 'var(--text-primary)' }}>Enable digest emails</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Frequency</label>
        <select value={frequency} onChange={e => setFrequency(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        {status?.preference?.last_sent_at && (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Last sent: {new Date(status.preference.last_sent_at).toLocaleString()}</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save'}
        </button>
        <button className="btn btn-outline" onClick={sendNow} disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Send size={14} /> {sending ? 'Sending...' : 'Send test digest now'}
        </button>
      </div>
    </div>
  );
}

function SlackTab({ addToast }) {
  const [settings, setSettings] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [flags, setFlags] = useState({ notify_audit_completed: true, notify_audit_failed: true, notify_digest: true });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const s = await api.getSlackSettings();
      setSettings(s);
      setWebhookUrl(s.webhook_url || '');
      setEnabled(s.enabled ?? true);
      setFlags({
        notify_audit_completed: s.notify_audit_completed ?? true,
        notify_audit_failed: s.notify_audit_failed ?? true,
        notify_digest: s.notify_digest ?? true,
      });
    } catch (e) { addToast(e.message, 'error'); }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const s = await api.saveSlackSettings({ webhook_url: webhookUrl, enabled, ...flags });
      setSettings(s);
      addToast('Slack alert preferences saved', 'success');
    } catch (e) { addToast(e.message, 'error'); }
    setSaving(false);
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.testSlack(webhookUrl || settings?.webhook_url);
      setTestResult(r.ok ? 'success' : 'error');
      addToast(r.ok ? 'Test message sent to Slack' : 'Slack rejected the webhook', r.ok ? 'success' : 'error');
    } catch (e) { setTestResult('error'); addToast(e.message, 'error'); }
    setTesting(false);
  };

  const remove = async () => {
    try {
      await api.deleteSlackSettings();
      setSettings(null);
      setWebhookUrl('');
      addToast('Slack integration removed', 'success');
    } catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Slack Alerts</h2>
        {settings && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, color: settings.configured ? '#065f46' : '#92400e', background: settings.configured ? '#d1fae5' : '#fef3c7' }}>
            {settings.configured ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {settings.configured ? 'Connected' : 'Not configured'}
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
        Get audit completion and failure alerts plus weekly digests straight to Slack.
        Create an <strong>Incoming Webhook</strong> in Slack, then paste its URL below.
      </p>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Incoming webhook URL</label>
        <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/T000000/B000000/XXXXXXXX"
          style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ width: 16, height: 16 }} />
        <label style={{ fontSize: 13, color: 'var(--text-primary)' }}>Enable Slack alerts</label>
      </div>
      {['notify_audit_completed', 'notify_audit_failed', 'notify_digest'].map(key => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <input type="checkbox" checked={flags[key]} onChange={e => setFlags(f => ({ ...f, [key]: e.target.checked }))} style={{ width: 16, height: 16 }} />
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {key === 'notify_audit_completed' && 'Audit completed'}
            {key === 'notify_audit_failed' && 'Audit failed'}
            {key === 'notify_digest' && 'Weekly digest summary'}
          </label>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save'}
        </button>
        <button className="btn btn-outline" onClick={test} disabled={testing || !(webhookUrl || settings?.webhook_url)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Send size={14} /> {testing ? 'Sending...' : 'Send test message'}
        </button>
        {settings?.configured && (
          <button className="btn btn-outline" onClick={remove} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', borderColor: '#dc2626' }}>
            <Trash2 size={14} /> Remove
          </button>
        )}
      </div>
    </div>
  );
}

function ScheduledTab({ addToast }) {
  const [items, setItems] = useState([]);
  const [url, setUrl] = useState('');
  const [freq, setFreq] = useState('weekly');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const res = await api.listScheduled(); setItems(res?.items ?? res ?? []); } catch (e) { addToast(e.message, 'error'); }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try {
      await api.createScheduled({ website_url: url, frequency: freq });
      setUrl('');
      addToast('Scheduled audit created', 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const del = async (id) => {
    try { await api.deleteScheduled(id); addToast('Deleted', 'success'); load(); } catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Scheduled Audits</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com"
          style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }} />
        <select value={freq} onChange={e => setFreq(e.target.value)}
          style={{ padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={create} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={13} /> Schedule
        </button>
      </div>
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : items.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No scheduled audits</p>
      ) : items.map(s => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.website_url}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Every {s.frequency} | Next: {s.next_run?.split('T')[0]}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => del(s.id)} style={{ color: '#ef4444' }}><Trash2 size={13} /></button>
        </div>
      ))}
    </div>
  );
}

function WhiteLabelTab({ addToast }) {
  const [settings, setSettings] = useState({ company_name: '', logo_url: '', primary_color: '#3B82F6', secondary_color: '#1E293B', custom_domain: '', is_active: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const data = await api.getWhiteLabel(); setSettings(data); } catch (e) { addToast(e.message, 'error'); }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try { await api.updateWhiteLabel(settings); addToast('Settings saved', 'success'); } catch (e) { addToast(e.message, 'error'); }
    setSaving(false);
  };

  const update = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>White Label Settings</h2>
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Company Name</label>
            <input value={settings.company_name} onChange={e => update('company_name', e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Logo URL</label>
            <input value={settings.logo_url} onChange={e => update('logo_url', e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Primary Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={settings.primary_color} onChange={e => update('primary_color', e.target.value)} style={{ width: 40, height: 36, border: 'none', cursor: 'pointer' }} />
                <input value={settings.primary_color} onChange={e => update('primary_color', e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Secondary Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={settings.secondary_color} onChange={e => update('secondary_color', e.target.value)} style={{ width: 40, height: 36, border: 'none', cursor: 'pointer' }} />
                <input value={settings.secondary_color} onChange={e => update('secondary_color', e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }} />
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Custom Domain</label>
            <input value={settings.custom_domain} onChange={e => update('custom_domain', e.target.value)} placeholder="seo.yourdomain.com"
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={settings.is_active} onChange={e => update('is_active', e.target.checked)} style={{ width: 16, height: 16 }} />
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Enable White Label</label>
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </>
      )}
    </div>
  );
}

function GoogleTab({ addToast }) {
  const [accounts, setAccounts] = useState([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [properties, setProperties] = useState(null);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [ga4Properties, setGa4Properties] = useState(null);
  const [ga4Loading, setGa4Loading] = useState(false);
  const [ga4Error, setGa4Error] = useState('');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.googleAccounts();
      setAccounts(res.accounts || []);
      setConfigured(res.configured ?? false);
      setSelectedAccount(prev => prev || res.accounts?.[0]?.id || '');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const connect = async () => {
    setConnecting(true);
    try {
      const res = await api.googleConnect();
      if (!res.auth_url) throw new Error('No auth URL returned');
      window.location.href = res.auth_url;
    } catch (e) {
      addToast(e.message, 'error');
      setConnecting(false);
    }
  };

  const loadProperties = async (accountId) => {
    setSelectedAccount(accountId);
    setPropertiesLoading(true);
    setProperties(null);
    setGa4Properties(null);
    setGa4Error('');
    try {
      const res = await api.googleProperties(accountId);
      setProperties(res.properties || []);
    } catch (e) {
      addToast(e.message, 'error');
      setProperties([]);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const loadGa4 = async (accountId) => {
    setGa4Loading(true);
    setGa4Properties(null);
    setGa4Error('');
    try {
      const res = await api.listGa4Properties(accountId);
      setGa4Properties(res.properties || []);
    } catch (e) {
      setGa4Error(e.message);
      setGa4Properties([]);
    } finally {
      setGa4Loading(false);
    }
  };

  const disconnect = async (accountId) => {
    try {
      await api.googleDisconnect(accountId);
      addToast('Google account disconnected', 'success');
      setProperties(null);
      loadAccounts();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  const googleResult = urlParams.get('google');
  if (googleResult) {
    setTimeout(() => {
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
      if (googleResult === 'connected') addToast('Google account connected', 'success');
      else addToast(urlParams.get('reason') ? `Google connect failed: ${urlParams.get('reason')}` : 'Google connect failed', 'error');
      loadAccounts();
    }, 0);
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Google Search Console</h2>
        {configured ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, color: '#065f46', background: '#d1fae5' }}>
            <CheckCircle2 size={13} /> Configured
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, color: '#92400e', background: '#fef3c7' }}>
            <XCircle size={13} /> Not configured
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
        Connect Google to fetch real Search Console properties and pull live Core Web Vitals (LCP, INP, CLS, FCP, TTFB) from CrUX field data.
        Connect multiple Google accounts — each is stored separately with encrypted tokens.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={connect} disabled={connecting || !configured} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {connecting ? <Loader2 size={14} className="spin" /> : <ExternalLink size={14} />}
          {connecting ? 'Redirecting to Google...' : 'Connect Google Account'}
        </button>
        <button className="btn btn-outline" onClick={loadAccounts} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={13} /> Refresh
        </button>
        {!configured && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ask an admin to set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET on the server.</span>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      ) : accounts.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No Google accounts connected yet.</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {accounts.map(a => (
              <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                      {(a.name || a.email || 'G').slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {a.name || 'Google account'} · {a.scopes?.length || 0} scopes · Connected {a.connected_at?.split('T')[0]}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => loadProperties(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <Link2 size={12} /> Properties
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => disconnect(a.id)} style={{ color: '#ef4444', flexShrink: 0 }}>
                    <Trash2 size={12} /> Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>

          {propertiesLoading && <p style={{ color: 'var(--text-secondary)' }}>Loading properties...</p>}
          {properties !== null && !propertiesLoading && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Search Console Properties</div>
              {properties.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No properties found for this account.</p>
              ) : properties.map(p => (
                <div key={p.siteUrl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{p.siteUrl}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.permissionLevel}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button className="btn btn-outline btn-sm" onClick={() => loadGa4(selectedAccount)} disabled={ga4Loading} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {ga4Loading ? <Loader2 size={13} className="spin" /> : <BarChart size={13} />}
              {ga4Loading ? 'Loading...' : 'Load GA4 properties'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Requires the analytics.readonly scope (granted at connect).</span>
          </div>
          {ga4Error && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{ga4Error}</p>}
          {ga4Properties !== null && !ga4Loading && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>GA4 Properties</div>
              {ga4Properties.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No GA4 properties found for this account.</p>
              ) : ga4Properties.map(p => (
                <div key={p.property_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.displayName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.property_id} · {p.accountDisplayName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const ACTIVITY_LABELS = {
  'auth.registered': 'Created account',
  'auth.logged_in': 'Signed in',
  'audit.started': 'Started an audit',
  'audit.cancelled': 'Cancelled an audit',
  'audit.rerun': 'Reran an audit',
  'share.created': 'Created a share link',
  'share.revoked': 'Revoked a share link',
  'webhook.created': 'Created a webhook',
  'webhook.deleted': 'Deleted a webhook',
  'webhook.delivered': 'Webhook delivered',
  'webhook.failed': 'Webhook delivery failed',
  'scheduled.created': 'Created a schedule',
  'scheduled.deleted': 'Deleted a schedule',
  'api-key.revoked': 'Revoked an API key',
  'user.updated': 'Account updated by admin',
};

function ActivityTab({ addToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getActivity();
        setItems(res?.items ?? res ?? []);
      } catch (e) { addToast(e.message, 'error'); }
      setLoading(false);
    };
    load();
  }, [addToast]);

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading activity...</p>;

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Activity</h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>Your recent actions across the platform.</p>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No activity recorded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-card)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,.12)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Activity size={13} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {ACTIVITY_LABELS[a.action] || a.action.replace(/\./g, ' ')}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {a.entity_type && a.entity_id ? `${a.entity_type} ${a.entity_id.slice(0, 8)} · ` : ''}
                  {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
