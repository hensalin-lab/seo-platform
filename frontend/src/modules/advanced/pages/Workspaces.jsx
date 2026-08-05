import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import {
  FolderOpen, Plus, Trash2, Users, Link2, UserPlus, X, Mail, ShieldCheck, Edit3, Check,
} from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, Badge, StatCard, inputStyle, labelStyle, btnPrimary, btnGhost,
} from './ui';

const ROLE_COLOR = { owner: '#8b5cf6', editor: '#3b82f6', viewer: '#22c55e' };

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [members, setMembers] = useState({});
  const [audits, setAudits] = useState({});
  const [allAudits, setAllAudits] = useState([]);
  const [invite, setInvite] = useState({ email: '', role: 'viewer' });
  const [assignSel, setAssignSel] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await api.listWorkspaces();
      setWorkspaces(res.workspaces || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createWorkspace({ name: form.name, description: form.description });
      setShowForm(false);
      setForm({ name: '', description: '' });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ws) => {
    if (!window.confirm(`Delete workspace "${ws.name}"? Its audits are not deleted, only unlinked.`)) return;
    try {
      await api.deleteWorkspace(ws.id);
      if (expandedId === ws.id) setExpandedId(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const openWs = async (ws) => {
    if (expandedId === ws.id) { setExpandedId(null); return; }
    setExpandedId(ws.id);
    setError(null);
    try {
      const [m, a] = await Promise.all([api.getWorkspaceMembers(ws.id), api.getWorkspaceAudits(ws.id)]);
      setMembers(prev => ({ ...prev, [ws.id]: m.members || [] }));
      setAudits(prev => ({ ...prev, [ws.id]: a.audits || [] }));
    } catch (e) {
      setError(e.message);
    }
  };

  const loadAssignable = async (ws) => {
    try {
      const res = await api.getHistory(200, 0);
      const list = Array.isArray(res) ? res : (res.audits || []);
      setAllAudits(list);
      const assigned = new Set((audits[ws.id] || []).map(a => a.id));
      setAssignSel([...assigned]);
    } catch (e) {
      setError(e.message);
    }
  };

  const assign = async (ws) => {
    try {
      await api.assignWorkspaceAudits(ws.id, assignSel);
      const a = await api.getWorkspaceAudits(ws.id);
      setAudits(prev => ({ ...prev, [ws.id]: a.audits || [] }));
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const unassign = async (ws, auditId) => {
    try {
      await api.unassignWorkspaceAudit(ws.id, auditId);
      const a = await api.getWorkspaceAudits(ws.id);
      setAudits(prev => ({ ...prev, [ws.id]: a.audits || [] }));
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const inviteMember = async (ws) => {
    if (!invite.email.trim()) return;
    setError(null);
    try {
      await api.addWorkspaceMember(ws.id, invite.email.trim(), invite.role);
      const m = await api.getWorkspaceMembers(ws.id);
      setMembers(prev => ({ ...prev, [ws.id]: m.members || [] }));
      setInvite({ email: '', role: 'viewer' });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeMember = async (ws, memberId) => {
    try {
      await api.removeWorkspaceMember(ws.id, memberId);
      const m = await api.getWorkspaceMembers(ws.id);
      setMembers(prev => ({ ...prev, [ws.id]: m.members || [] }));
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <LoadingSpinner message="Loading workspaces…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader
          icon={FolderOpen}
          title="Client Workspaces"
          badge={`${workspaces.length}`}
          subtitle="Group audits by client, invite team members with owner/editor/viewer roles"
          actions={
            <button style={btnPrimary} onClick={() => setShowForm(v => !v)}>
              <Plus size={15} /> {showForm ? 'Close' : 'New workspace'}
            </button>
          }
        />
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}

        {showForm && (
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label style={labelStyle}>Workspace name</label>
                <input style={inputStyle} placeholder="Client name or department" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Description (optional)</label>
                <input style={inputStyle} placeholder="Notes" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={btnPrimary} onClick={create} disabled={saving || !form.name.trim()}>{saving ? 'Creating…' : 'Create workspace'}</button>
              <button style={btnGhost} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {workspaces.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No workspaces"
            message="Create a workspace per client, then assign audits and invite team members."
            action={<button style={btnPrimary} onClick={() => setShowForm(true)}><Plus size={15} /> New workspace</button>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workspaces.map(ws => {
              const open = expandedId === ws.id;
              const wsAudits = audits[ws.id] || [];
              const wsMembers = members[ws.id] || [];
              return (
                <div key={ws.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => openWs(ws)}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(139,92,246,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FolderOpen size={16} color="#8b5cf6" />
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{ws.name}</div>
                      {ws.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ws.description}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <Users size={13} /> {ws.member_count}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <Link2 size={13} /> {ws.audit_count}
                    </div>
                    <button style={btnGhost} onClick={(e) => { e.stopPropagation(); remove(ws); }}><Trash2 size={13} color="#ef4444" /></button>
                  </div>

                  {open && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Link2 size={15} color="#8b5cf6" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Audits ({wsAudits.length})</span>
                            <button style={{ ...btnGhost, marginLeft: 'auto', padding: '6px 10px', fontSize: 12 }} onClick={() => loadAssignable(ws)}>Manage</button>
                          </div>
                          {allAudits.length > 0 && expandedId === ws.id && (
                            <div style={{ marginBottom: 10, padding: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Assign audits</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', marginBottom: 10 }}>
                                {allAudits.map(a => (
                                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={assignSel.includes(a.id)}
                                      onChange={(e) => setAssignSel(prev => e.target.checked ? [...prev, a.id] : prev.filter(x => x !== a.id))}
                                    />
                                    <span style={{ wordBreak: 'break-all' }}>{a.website_url}</span>
                                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{a.status}</span>
                                  </label>
                                ))}
                              </div>
                              <button style={btnPrimary} onClick={() => assign(ws)}>Save assignment</button>
                            </div>
                          )}
                          {wsAudits.length ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {wsAudits.map(a => (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                                  <Link2 size={12} color="var(--text-muted)" />
                                  <span style={{ wordBreak: 'break-all', flex: 1 }}>{a.website_url}</span>
                                  <Badge color={a.status === 'COMPLETED' ? '#22c55e' : a.status === 'RUNNING' ? '#eab308' : '#ef4444'}>{a.status}</Badge>
                                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }} onClick={() => unassign(ws, a.id)}><X size={14} /></button>
                                </div>
                              ))}
                            </div>
                          ) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No audits assigned yet.</div>}
                        </div>

                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Users size={15} color="#3b82f6" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Members ({wsMembers.length})</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                            {wsMembers.map(m => (
                              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                                <Mail size={12} color="var(--text-muted)" />
                                <span style={{ flex: 1, wordBreak: 'break-all' }}>{m.email}</span>
                                <Badge color={ROLE_COLOR[m.role] || '#8b5cf6'}>{m.role}</Badge>
                                {m.role !== 'owner' && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }} onClick={() => removeMember(ws, m.id)}><X size={14} /></button>}
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 160 }}>
                              <input style={inputStyle} placeholder="team@example.com" value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} />
                            </div>
                            <select style={{ ...inputStyle, width: 'auto' }} value={invite.role} onChange={e => setInvite({ ...invite, role: e.target.value })}>
                              <option value="viewer">viewer</option>
                              <option value="editor">editor</option>
                              <option value="owner">owner</option>
                            </select>
                            <button style={btnPrimary} onClick={() => inviteMember(ws)} disabled={!invite.email.trim()}>
                              <UserPlus size={14} /> Invite
                            </button>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <ShieldCheck size={12} /> The invited user must already have an account on this platform.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
