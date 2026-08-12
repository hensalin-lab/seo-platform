import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { api } from '../api'
import { Users, FileText, Webhook, Calendar, Link2, Activity, Shield, Search, UserCheck, UserX } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color = 'var(--accent)' }) {
  return (
    <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(99,102,241,.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

const ACTION_LABELS = {
  'auth.registered': 'Registered',
  'auth.logged_in': 'Signed in',
  'audit.started': 'Audit started',
  'audit.cancelled': 'Audit cancelled',
  'audit.rerun': 'Audit rerun',
  'share.created': 'Share link created',
  'share.revoked': 'Share link revoked',
  'webhook.created': 'Webhook created',
  'webhook.deleted': 'Webhook deleted',
  'webhook.delivered': 'Webhook delivered',
  'webhook.failed': 'Webhook failed',
  'scheduled.created': 'Schedule created',
  'scheduled.deleted': 'Schedule deleted',
  'user.updated': 'User updated',
  'api-key.revoked': 'API key revoked',
}

function fmtAction(a) { return ACTION_LABELS[a] || a.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [userTotal, setUserTotal] = useState(0)
  const [q, setQ] = useState('')
  const [activity, setActivity] = useState([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!isAdmin) navigate('/history', { replace: true })
  }, [isAdmin, navigate])

  const loadStats = async () => {
    try { setStats(await api.getAdminStats()) } catch (e) { addToast(e.message, 'error') }
  }

  const loadUsers = async (search = '', off = 0) => {
    try {
      const res = await api.listAdminUsers({ q: search, limit: 20, offset: off })
      setUsers(res.items || [])
      setUserTotal(res.total || 0)
    } catch (e) { addToast(e.message, 'error') }
  }

  const loadActivity = async (off = 0) => {
    try {
      const res = await api.getAdminActivity({ limit: 30, offset: off })
      setActivity(res.items || [])
      setActivityTotal(res.total || 0)
    } catch (e) { addToast(e.message, 'error') }
  }

  useEffect(() => {
    if (!isAdmin) return
    const init = async () => {
      setLoading(true)
      await Promise.all([loadStats(), loadUsers(), loadActivity()])
      setLoading(false)
    }
    init()
  }, [isAdmin])

  const updateUser = async (id, data) => {
    try {
      await api.updateAdminUser(id, data)
      addToast('User updated', 'success')
      await Promise.all([loadUsers(q, offset), loadStats(), loadActivity()])
    } catch (e) { addToast(e.message, 'error') }
  }

  if (!isAdmin) return null
  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading admin panel...</p></div>

  const sevBadge = { CRITICAL: 'badge-red', HIGH: 'badge-red', MEDIUM: 'badge-yellow', LOW: 'badge-blue' }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Shield size={20} style={{ color: 'var(--accent)' }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Admin</h1>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Platform management · stats, users, and audit trail</div>

      <div className="tab-bar" style={{ marginBottom: 20 }}>
        <div className={`tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>Overview</div>
        <div className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users ({userTotal})</div>
        <div className={`tab ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>Activity</div>
      </div>

      {tab === 'stats' && stats && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard icon={Users} label="Users" value={stats.total_users} />
            <StatCard icon={FileText} label="Audits" value={stats.total_audits} />
            <StatCard icon={Activity} label="Completed" value={stats.audits_completed} color="#10b981" />
            <StatCard icon={Webhook} label="Webhooks" value={stats.total_webhooks} />
            <StatCard icon={Calendar} label="Schedules" value={stats.active_scheduled_audits} />
            <StatCard icon={Link2} label="Share links" value={stats.active_share_links} color="#f59e0b" />
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Activity (last 24h)</h3>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.activity_last_24h}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {(Object.entries(stats.users_by_role || {})).map(([role, count]) => (
                <div key={role}><span className="badge badge-blue" style={{ marginRight: 6 }}>{count}</span> {role}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setOffset(0); loadUsers(q, 0) } }}
                placeholder="Search by email or username..."
                style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, border: '1px solid var(--border, #e2e8f0)', fontSize: 13, background: 'var(--bg-card, #fff)', color: 'var(--text-primary)' }}
              />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setOffset(0); loadUsers(q, 0) }}>Search</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map(u => (
              <div key={u.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                  {(u.username || u.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email} {!u.is_active && <span className="badge badge-red" style={{ marginLeft: 6 }}>disabled</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{u.username} · {u.audit_count} audits · joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}</div>
                </div>
                <select
                  value={u.role}
                  onChange={e => updateUser(u.id, { role: e.target.value })}
                  style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border, #e2e8f0)', fontSize: 12, background: 'var(--bg-card, #fff)', color: 'var(--text-primary)' }}
                >
                  <option value="VIEWER">VIEWER</option>
                  <option value="EDITOR">EDITOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <button
                  className="btn btn-sm"
                  onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                  style={u.is_active
                    ? { background: 'rgba(239,68,68,.08)', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }
                    : { background: 'rgba(16,185,129,.08)', color: '#059669', border: 'none', padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  title={u.is_active ? 'Disable account' : 'Enable account'}
                >
                  {u.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                  {u.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, fontSize: 13, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => { const o = Math.max(0, offset - 20); setOffset(o); loadUsers(q, o) }}>Prev</button>
            <span style={{ color: 'var(--text-muted)' }}>{Math.min(offset + 1, userTotal)}–{Math.min(offset + 20, userTotal)} of {userTotal}</span>
            <button className="btn btn-secondary btn-sm" disabled={offset + 20 >= userTotal} onClick={() => { const o = offset + 20; setOffset(o); loadUsers(q, o) }}>Next</button>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activity.map(a => (
              <div key={a.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(99,102,241,.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Activity size={12} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>
                    <strong>{fmtAction(a.action)}</strong>
                    {a.entity_type && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{a.entity_type} {a.entity_id ? a.entity_id.slice(0, 8) : ''}</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {a.user_id ? a.user_id.slice(0, 8) : 'system'} · {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                  </div>
                </div>
                {a.details && Object.keys(a.details).length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {JSON.stringify(a.details)}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, fontSize: 13, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => { const o = Math.max(0, offset - 30); setOffset(o); loadActivity(o) }}>Prev</button>
            <span style={{ color: 'var(--text-muted)' }}>{activityTotal} events</span>
            <button className="btn btn-secondary btn-sm" disabled={offset + 30 >= activityTotal} onClick={() => { const o = offset + 30; setOffset(o); loadActivity(o) }}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
