import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Search, TrendingUp, BarChart3, Target, Zap, Globe, ExternalLink, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DataSourceBadge } from '../../../components/DataSourceBadge';

const INTENT_BADGES = {
  INFORMATIONAL: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Informational' },
  COMMERCIAL: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: 'Commercial' },
  TRANSACTIONAL: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: 'Transactional' },
  NAVIGATIONAL: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Navigational' },
};

function getPositionColor(pos) {
  if (pos < 10) return '#22c55e';
  if (pos < 20) return '#f59e0b';
  return '#ef4444';
}

function getPositionBg(pos) {
  if (pos < 10) return 'rgba(34,197,94,0.1)';
  if (pos < 20) return 'rgba(245,158,11,0.1)';
  return 'rgba(239,68,68,0.1)';
}

function IntentBadge({ intent }) {
  if (!intent) return null;
  const key = intent.toUpperCase();
  const style = INTENT_BADGES[key] || INTENT_BADGES.INFORMATIONAL;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
      background: style.bg, color: style.color,
      letterSpacing: '0.03em',
    }}>{style.label}</span>
  );
}

function StatCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div style={{
      background: 'var(--card-bg, #fff)',
      border: '1px solid var(--border-color, #e5e7eb)',
      borderRadius: 12,
      padding: '20px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color || 'var(--accent, #3b82f6)', borderRadius: '12px 12px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${color || 'var(--accent, #3b82f6)'}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color || 'var(--accent, #3b82f6)'} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--text-primary, #111827)', lineHeight: 1.1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--text-tertiary, #9ca3af)', marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, color = 'var(--accent, #3b82f6)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <Icon size={18} color={color} />
      <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary, #111827)', margin: 0 }}>{title}</h2>
      {count > 0 && (
        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `${color}18`, color }}>{count}</span>
      )}
    </div>
  );
}

function TabBar({ tabs, activeTab, setActiveTab }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4,
      background: 'var(--card-bg, #fff)',
      borderRadius: 12,
      border: '1px solid var(--border-color, #e5e7eb)',
      overflowX: 'auto',
    }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 16px', borderRadius: 8, border: 'none',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: active ? 'var(--accent, #3b82f6)' : 'transparent',
              color: active ? '#fff' : 'var(--text-secondary, #6b7280)',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={15} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function GscConnectCard({ settings, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(!settings?.configured);
  const [saJson, setSaJson] = useState('');
  const [propertyUrl, setPropertyUrl] = useState(settings?.property_url || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const handleTest = async () => {
    if (!saJson.trim()) { setMessage({ type: 'error', text: 'Paste your service account JSON first.' }); return; }
    setTesting(true);
    setMessage(null);
    setTestResult(null);
    const res = await api.testGscSettings({ service_account_json: saJson.trim(), property_url: propertyUrl.trim() }).catch((e) => ({ error: e.message }));
    setTesting(false);
    if (res.error) { setMessage({ type: 'error', text: res.error }); return; }
    setTestResult(res);
    if (!res.property_matched) setMessage({ type: 'warn', text: 'Credentials work, but the property URL did not match any site the account can access. Fix the URL or grant the service account access.' });
  };

  const handleSave = async () => {
    if (!saJson.trim()) { setMessage({ type: 'error', text: 'Paste your service account JSON first.' }); return; }
    if (!propertyUrl.trim()) { setMessage({ type: 'error', text: 'Enter your Search Console property URL (e.g. https://www.example.com/).' }); return; }
    setSaving(true);
    setMessage(null);
    const res = await api.saveGscSettings({ service_account_json: saJson.trim(), property_url: propertyUrl.trim() }).catch((e) => ({ error: e.message }));
    setSaving(false);
    if (res.error) { setMessage({ type: 'error', text: res.error }); return; }
    setEditing(false);
    setMessage({ type: 'ok', text: `Connected to ${res.property_url}${res.property_matched ? '' : ' (property did not match any accessible site)'}` });
    if (onSaved) onSaved();
  };

  const handleDisconnect = async () => {
    await api.deleteGscSettings().catch(() => {});
    setEditing(true);
    setMessage(null);
    setTestResult(null);
    if (onDeleted) onDeleted();
  };

  if (!editing && settings?.configured) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(59,130,246,0.06))',
        border: '1px solid rgba(34,197,94,0.25)',
        borderRadius: 12, padding: '18px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={20} color="#22c55e" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #111827)' }}>Google Search Console connected</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>{settings.property_url}{settings.client_email ? ` · ${settings.client_email}` : ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setEditing(true); setMessage(null); }}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)', background: '#fff', color: 'var(--text-primary, #111827)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Edit Credentials
          </button>
          <button onClick={handleDisconnect}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(139,92,246,0.05))',
      border: '1px solid rgba(59,130,246,0.2)',
      borderRadius: 12, padding: '24px 28px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Search size={20} color="#3b82f6" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #111827)' }}>Connect Google Search Console</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>Paste your service account key to see real search performance data.</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', marginBottom: 6 }}>Service Account JSON</div>
          <textarea
            value={saJson}
            onChange={(e) => setSaJson(e.target.value)}
            rows={7}
            placeholder='{"type":"service_account","project_id":"...","client_email":"...","private_key":"...", ...}'
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)',
              background: '#fff', color: 'var(--text-primary, #111827)', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', resize: 'vertical',
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', marginBottom: 6 }}>Property URL</div>
          <input
            type="text"
            value={propertyUrl}
            onChange={(e) => setPropertyUrl(e.target.value)}
            placeholder="https://www.example.com/  or  sc-domain:example.com"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)',
              background: '#fff', color: 'var(--text-primary, #111827)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {testResult && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>Connection test passed · {testResult.client_email}</div>
            <div>Sites accessible: {testResult.sites_visible?.length ? testResult.sites_visible.join(', ') : 'none'}</div>
            {testResult.property_matched ? <div style={{ color: '#22c55e' }}>Property matches an accessible site.</div> : <div style={{ color: '#f59e0b' }}>Property URL did not match any accessible site.</div>}
          </div>
        )}

        {message && (
          <div style={{
            fontSize: 13, padding: '10px 14px', borderRadius: 8,
            background: message.type === 'ok' ? 'rgba(34,197,94,0.1)' : message.type === 'warn' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'ok' ? 'rgba(34,197,94,0.3)' : message.type === 'warn' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: message.type === 'ok' ? '#22c55e' : message.type === 'warn' ? '#f59e0b' : '#ef4444',
          }}>{message.text}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleTest} disabled={testing}
            style={{
              padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)',
              background: '#fff', color: 'var(--text-primary, #111827)', fontSize: 13, fontWeight: 600,
              cursor: testing ? 'wait' : 'pointer', opacity: testing ? 0.6 : 1,
            }}>
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
            }}>
            {saving ? 'Saving...' : 'Save & Connect'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
        {[
          'Create a service account key: Google Cloud Console → IAM & Admin → Service Accounts → Create Key (JSON)',
          'Enable the Google Search Console API in Google Cloud Console',
          'Add the service account email (client_email) as a User with Full permission in Search Console → Settings → Users',
          'Use the exact property URL from Search Console (www vs non-www, trailing slash, or sc-domain:)',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#3b82f6' }}>{i + 1}</div>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PositionBadge({ position }) {
  const color = getPositionColor(position);
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
      background: getPositionBg(position), color,
    }}>{position.toFixed(1)}</span>
  );
}

function OpportunityCard({ title, description, icon: Icon, color, items, renderItem }) {
  return (
    <div style={{
      background: 'var(--card-bg, #fff)',
      border: '1px solid var(--border-color, #e5e7eb)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={18} color={color} />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary, #111827)', margin: 0 }}>{title}</h3>
        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `${color}18`, color }}>{items.length}</span>
      </div>
      {description && (
        <div style={{ padding: '12px 24px 0', fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>{description}</div>
      )}
      {items.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                {renderHeader()}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                  {renderRow(item, i)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary, #6b7280)', fontSize: 13 }}>
          No items found in this category.
        </div>
      )}
    </div>
  );
}

function renderHeader() {
  return null;
}

function renderRow() {
  return null;
}

function TopPagesTable({ pages }) {
  if (!pages || pages.length === 0) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary, #6b7280)', fontSize: 13 }}>
        No page data available.
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            {['Page URL', 'Clicks', 'Impressions', 'CTR', 'Position'].map(h => (
              <th key={h} style={{ textAlign: h === 'Page URL' ? 'left' : 'center', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pages.map((p, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
              <td style={{ padding: '12px 16px', fontSize: 13, wordBreak: 'break-all', maxWidth: 400 }}>
                <a href={p.url || p.page} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent, #3b82f6)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {(() => {
                    const u = p.url || p.page || '';
                    return u.length > 60 ? u.substring(0, 60) + '...' : u;
                  })()}
                  <ExternalLink size={11} />
                </a>
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{(p.clicks ?? 0).toLocaleString()}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{(p.impressions ?? 0).toLocaleString()}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{p.ctr != null ? `${(p.ctr * 100).toFixed(1)}%` : '—'}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}><PositionBadge position={p.position ?? 0} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopQueriesTable({ queries }) {
  if (!queries || queries.length === 0) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary, #6b7280)', fontSize: 13 }}>
        No query data available.
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            {['Query', 'Clicks', 'Impressions', 'CTR', 'Position', 'Intent'].map(h => (
              <th key={h} style={{ textAlign: h === 'Query' ? 'left' : 'center', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {queries.map((q, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
              <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary, #111827)', maxWidth: 350 }}>{q.query || q.keyword}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{(q.clicks ?? 0).toLocaleString()}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{(q.impressions ?? 0).toLocaleString()}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{q.ctr != null ? `${(q.ctr * 100).toFixed(1)}%` : '—'}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}><PositionBadge position={q.position ?? 0} /></td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}><IntentBadge intent={q.intent} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LongTailTable({ keywords }) {
  if (!keywords || keywords.length === 0) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary, #6b7280)', fontSize: 13 }}>
        No long-tail keywords found.
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            {['Keyword', 'Words', 'Clicks', 'Impressions', 'CTR', 'Position'].map(h => (
              <th key={h} style={{ textAlign: h === 'Keyword' ? 'left' : 'center', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keywords.map((k, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
              <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary, #111827)' }}>{k.query || k.keyword}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                  {(k.query || k.keyword || '').split(' ').length} words
                </span>
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{(k.clicks ?? 0).toLocaleString()}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{(k.impressions ?? 0).toLocaleString()}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{k.ctr != null ? `${(k.ctr * 100).toFixed(1)}%` : '—'}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}><PositionBadge position={k.position ?? 0} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeywordOpportunitiesTable({ items }) {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary, #6b7280)', fontSize: 13 }}>
        <CheckCircle size={24} color="#22c55e" style={{ marginBottom: 6 }} />
        <div>No keyword opportunities found. Your titles and meta descriptions are performing well.</div>
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            {['Query', 'Position', 'CTR', 'Impressions', 'Recommendation'].map(h => (
              <th key={h} style={{ textAlign: h === 'Query' || h === 'Recommendation' ? 'left' : 'center', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
              <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary, #111827)' }}>{item.query || item.keyword}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}><PositionBadge position={item.position ?? 0} /></td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{item.ctr != null ? `${(item.ctr * 100).toFixed(1)}%` : '—'}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{(item.impressions ?? 0).toLocaleString()}</td>
              <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--accent, #3b82f6)' }}>Improve title tag and meta description</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuickWinsTable({ items }) {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary, #6b7280)', fontSize: 13 }}>
        <CheckCircle size={24} color="#22c55e" style={{ marginBottom: 6 }} />
        <div>No quick win opportunities found.</div>
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            {['Query', 'Position', 'Clicks', 'Impressions', 'Potential'].map(h => (
              <th key={h} style={{ textAlign: h === 'Query' ? 'left' : 'center', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
              <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary, #111827)' }}>{item.query || item.keyword}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}><PositionBadge position={item.position ?? 0} /></td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{(item.clicks ?? 0).toLocaleString()}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{(item.impressions ?? 0).toLocaleString()}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ArrowUpRight size={12} />
                  High
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GscData() {
  const { id } = useParams();
  const [overview, setOverview] = useState(null);
  const [keywordsData, setKeywordsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pages');
  const [settings, setSettings] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewRes, keywordsRes, settingsRes] = await Promise.all([
        api.getGscOverview(id, 28),
        api.getGscKeywords(id, 28),
        api.getGscSettings().catch(() => null),
      ]);
      setOverview(overviewRes);
      setKeywordsData(keywordsRes);
      setSettings(settingsRes);
    } catch (err) {
      setError(err.message || 'Failed to load GSC data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid var(--border-color, #e5e7eb)',
          borderTopColor: 'var(--accent, #3b82f6)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ fontSize: 15, color: 'var(--text-secondary, #6b7280)', fontWeight: 500 }}>Loading Google Search Console data...</div>
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
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary, #111827)' }}>Failed to Load</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>{error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent, #3b82f6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >Retry</button>
      </div>
    );
  }

  const stats = overview?.overview || overview || {};
  const totalClicks = stats.total_clicks ?? 0;
  const totalImpressions = stats.total_impressions ?? 0;
  const avgCtr = stats.avg_ctr ?? 0;
  const avgPosition = stats.avg_position ?? 0;

  const topPages = overview?.top_pages || [];
  const topQueries = keywordsData?.keywords || keywordsData?.top_queries || [];
  const allQueries = keywordsData?.all_keywords || keywordsData?.all_queries || topQueries;

  const longTail = allQueries.filter(q => {
    const term = q.query || q.keyword || '';
    return term.split(/\s+/).length >= 3;
  });

  const keywordOpportunities = allQueries.filter(q => {
    const pos = q.position ?? 99;
    const ctr = q.ctr ?? 1;
    return pos < 20 && ctr < 0.03;
  }).sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0));

  const quickWins = allQueries.filter(q => {
    const pos = q.position ?? 99;
    return pos >= 5 && pos <= 20;
  }).sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0));

  const hasNoData = totalClicks === 0 && totalImpressions === 0 && topPages.length === 0 && topQueries.length === 0;

  const tabs = [
    { key: 'pages', label: 'Top Pages', icon: Globe },
    { key: 'queries', label: 'Top Queries', icon: Search },
    { key: 'longtail', label: 'Long-Tail Keywords', icon: Target },
    { key: 'opportunities', label: 'Keyword Opportunities', icon: Zap },
    { key: 'quickwins', label: 'Quick Wins', icon: TrendingUp },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary, #111827)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          Google Search Console
          <DataSourceBadge source="measured" size="xs" />
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>
          Real search performance data from the last 28 days
        </p>
      </div>

      {/* GSC Connect Card */}
      <GscConnectCard settings={settings} onSaved={loadData} onDeleted={loadData} />

      {hasNoData && settings?.configured && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 12, padding: '16px 24px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>
            No search performance data returned yet. If you just connected, data can take up to 48 hours to appear. Otherwise confirm the property URL matches and the service account has Full permission in Search Console.
          </div>
        </div>
      )}

      {/* Search Performance Overview */}
      {!hasNoData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard icon={Search} label="Total Clicks" value={totalClicks.toLocaleString()} color="#22c55e" subtitle="from search results" />
          <StatCard icon={BarChart3} label="Total Impressions" value={totalImpressions.toLocaleString()} color="var(--accent, #3b82f6)" subtitle="times shown in search" />
          <StatCard icon={TrendingUp} label="Avg CTR" value={`${(avgCtr * 100).toFixed(1)}%`} color="#8b5cf6" subtitle="click-through rate" />
          <StatCard icon={Target} label="Avg Position" value={avgPosition.toFixed(1)} color={getPositionColor(avgPosition)} subtitle="in search results" />
        </div>
      )}

      {/* Tabs */}
      {!hasNoData && (
        <TabBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      )}

      {/* Top Pages */}
      {activeTab === 'pages' && !hasNoData && (
        <div style={{
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            <SectionHeader icon={Globe} title="Top Pages" count={topPages.length} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>Your best performing pages in Google Search.</p>
          </div>
          <TopPagesTable pages={topPages} />
        </div>
      )}

      {/* Top Queries */}
      {activeTab === 'queries' && !hasNoData && (
        <div style={{
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            <SectionHeader icon={Search} title="Top Queries" count={topQueries.length} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>Search queries driving traffic to your site.</p>
          </div>
          <TopQueriesTable queries={topQueries} />
        </div>
      )}

      {/* Long-Tail Keywords */}
      {activeTab === 'longtail' && !hasNoData && (
        <div style={{
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            <SectionHeader icon={Target} title="Long-Tail Keywords" count={longTail.length} color="#8b5cf6" />
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>Keywords with 3+ words — typically higher intent, lower competition.</p>
          </div>
          <LongTailTable keywords={longTail} />
        </div>
      )}

      {/* Keyword Opportunities */}
      {activeTab === 'opportunities' && !hasNoData && (
        <div style={{
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            <SectionHeader icon={Zap} title="Keyword Opportunities" count={keywordOpportunities.length} color="#f59e0b" />
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>
              High impressions but low CTR (position {'<'}20, CTR {'<'}3%). Improve your title tags and meta descriptions to capture more clicks.
            </p>
          </div>
          <KeywordOpportunitiesTable items={keywordOpportunities} />
        </div>
      )}

      {/* Quick Wins */}
      {activeTab === 'quickwins' && !hasNoData && (
        <div style={{
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            <SectionHeader icon={TrendingUp} title="Quick Wins" count={quickWins.length} color="#22c55e" />
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', margin: 0 }}>
              Keywords ranking positions 5-20. Small content improvements could push these into the top results.
            </p>
          </div>
          <QuickWinsTable items={quickWins} />
        </div>
      )}
    </div>
  );
}
