import React, { useState, useEffect } from 'react'
import { useToast } from '../Toast'
import { api } from '../../api'
import { Link2, Copy, Trash2, Check, ExternalLink } from 'lucide-react'

export default function ShareAuditPanel({ auditId }) {
  const { addToast } = useToast()
  const [links, setLinks] = useState([])
  const [days, setDays] = useState(30)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(null)

  const load = async () => {
    try { setLinks(await api.listShares()) } catch (e) { /* best effort */ }
  }

  useEffect(() => { load() }, [auditId])

  const create = async () => {
    setCreating(true)
    try {
      await api.createShare(auditId, days)
      addToast('Share link created', 'success')
      await load()
    } catch (e) { addToast(e.message, 'error') }
    setCreating(false)
  }

  const revoke = async (token) => {
    try {
      await api.revokeShare(token)
      addToast('Share link revoked', 'success')
      await load()
    } catch (e) { addToast(e.message, 'error') }
  }

  const copy = async (token) => {
    const url = `${window.location.origin}/share/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(token)
      setTimeout(() => setCopied(null), 1500)
    } catch (e) {
      addToast('Copy failed — select the URL manually', 'error')
    }
  }

  const mine = links.filter(l => l.audit_id === auditId)

  return (
    <div>
      <div style={{ maxWidth: 640 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link2 size={17} /> Share this report
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Generate a public, read-only link so clients can view the report without a login. Links can be revoked at any time.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border, #e2e8f0)', fontSize: 13, background: 'var(--bg)', color: 'var(--text-primary)' }}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>365 days</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={create} disabled={creating}>
            <Link2 size={13} /> {creating ? 'Creating...' : 'Create share link'}
          </button>
        </div>

        {mine.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>No active share links for this audit.</div>
        ) : (
          mine.map(l => (
            <div key={l.token} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 10, marginBottom: 8, background: 'var(--bg-card, #fff)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                  {window.location.origin}/share/{l.token}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Expires {l.expires_at ? new Date(l.expires_at).toLocaleDateString() : 'never'} · {l.views} view{l.views === 1 ? '' : 's'}
                </div>
              </div>
              <a href={`/share/${l.token}`} target="_blank" rel="noreferrer" title="Open" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                <ExternalLink size={14} />
              </a>
              <button onClick={() => copy(l.token)} title="Copy link" style={{ color: copied === l.token ? 'var(--success, #10b981)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                {copied === l.token ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button onClick={() => revoke(l.token)} title="Revoke link" style={{ color: 'var(--danger, #ef4444)', background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
