import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import {
  Activity, Plus, Trash2, RefreshCw, Play, Pause, Clock, Link2, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, Badge, StatCard, inputStyle, labelStyle, btnPrimary, btnGhost,
} from './ui';

const INTERVALS = [1, 5, 15, 30, 60];

export default function UptimeMonitor() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', interval_minutes: 5 });
  const [saving, setSaving] = useState(false);
  const [checks, setChecks] = useState({});
  const [checkingId, setCheckingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.listUptimeTargets();
      setTargets(res.targets || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createUptimeTarget({ name: form.name, url: form.url, interval_minutes: form.interval_minutes });
      setShowForm(false);
      setForm({ name: '', url: '', interval_minutes: 5 });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t) => {
    setBusyId(t.id);
    try {
      await api.updateUptimeTarget(t.id, { name: t.name, url: t.url, interval_minutes: t.interval_minutes, is_active: !t.is_active });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete uptime target "${t.name || t.url}"?`)) return;
    setBusyId(t.id);
    try {
      await api.deleteUptimeTarget(t.id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const checkNow = async (t) => {
    setCheckingId(t.id);
    setError(null);
    try {
      const res = await api.checkUptimeNow(t.id);
      setChecks(prev => ({ ...prev, [t.id]: { result: res.result, at: new Date().toISOString() } }));
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCheckingId(null);
    }
  };

  const showChecks = async (t) => {
    try {
      const res = await api.getUptimeChecks(t.id, 50);
      setChecks(prev => ({ ...prev, [t.id]: { list: res.checks || [], at: new Date().toISOString() } }));
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <LoadingSpinner message="Loading uptime targets…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={Activity}
          title="Uptime Monitoring"
          badge={`${targets.length} targets`}
          subtitle="Automated checks every interval, with downtime webhooks to your configured endpoints"
          actions={
            <button style={btnPrimary} onClick={() => setShowForm(v => !v)}>
              <Plus size={15} /> {showForm ? 'Close' : 'Add target'}
            </button>
          }
        />
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}

        {showForm && (
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label style={labelStyle}>Name (optional)</label>
                <input style={inputStyle} placeholder="Production site" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>URL</label>
                <input style={inputStyle} placeholder="https://example.com" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Interval (minutes)</label>
                <select style={inputStyle} value={form.interval_minutes} onChange={e => setForm({ ...form, interval_minutes: Number(e.target.value) })}>
                  {INTERVALS.map(i => <option key={i} value={i}>Every {i} min</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={btnPrimary} onClick={create} disabled={saving || !form.url.trim()}>{saving ? 'Adding…' : 'Add target'}</button>
              <button style={btnGhost} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {targets.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No uptime targets"
            message="Add a URL to monitor. The platform checks it on an interval and fires uptime.down webhooks when it goes offline."
            action={<button style={btnPrimary} onClick={() => setShowForm(true)}><Plus size={15} /> Add target</button>}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 12 }}>
            {targets.map(t => (
              <div key={t.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {t.last_is_up === null ? (
                    <Badge color="var(--text-muted)">never checked</Badge>
                  ) : t.last_is_up ? (
                    <Badge color="#22c55e">UP</Badge>
                  ) : (
                    <Badge color="#ef4444">DOWN</Badge>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 120 }}>{t.name || t.url}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}><Clock size={12} /> {t.interval_minutes}m</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link2 size={12} /> {t.url}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{t.uptime_percent ?? '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>uptime %</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{t.last_status_code ?? '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>status</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{t.last_checked_at ? new Date(t.last_checked_at).toLocaleDateString() : '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>last check</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={btnGhost} onClick={() => checkNow(t)} disabled={checkingId === t.id}>
                    <RefreshCw size={13} style={checkingId === t.id ? { animation: 'spin 0.8s linear infinite' } : {}} /> Check now
                  </button>
                  <button style={btnGhost} onClick={() => showChecks(t)}><Activity size={13} /> History</button>
                  <button style={btnGhost} onClick={() => toggleActive(t)} disabled={busyId === t.id}>
                    {t.is_active ? <Pause size={13} /> : <Play size={13} />} {t.is_active ? 'Pause' : 'Resume'}
                  </button>
                  <button style={{ ...btnGhost, marginLeft: 'auto', color: '#ef4444' }} onClick={() => remove(t)} disabled={busyId === t.id}><Trash2 size={13} /></button>
                </div>
                {checks[t.id]?.result && (
                  <div style={{ marginTop: 10, fontSize: 12, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    {checks[t.id].result.status_code && `HTTP ${checks[t.id].result.status_code}`} · {checks[t.id].result.response_time_ms} ms · {new Date(checks[t.id].at).toLocaleTimeString()}
                    {checks[t.id].result.is_up === false && <div style={{ color: '#ef4444', marginTop: 4 }}>{checks[t.id].result.error || 'down'}</div>}
                  </div>
                )}
                {checks[t.id]?.list && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                    {checks[t.id].list.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                        {c.is_up ? <CheckCircle2 size={13} color="#22c55e" /> : <XCircle size={13} color="#ef4444" />}
                        <span>{new Date(c.checked_at).toLocaleString()}</span>
                        <span>HTTP {c.status_code ?? '—'}</span>
                        <span>{c.response_time_ms} ms</span>
                        {c.error && <span style={{ color: '#ef4444', marginLeft: 'auto' }}>{c.error}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
