import { useNavigate } from 'react-router-dom';
import { Globe, Trash2, ArrowRight, Clock } from 'lucide-react';

function scoreBadge(s) {
  if (s >= 80) return 'badge-green';
  if (s >= 60) return 'badge-blue';
  if (s >= 40) return 'badge-yellow';
  return 'badge-red';
}

export default function AuditTable({ audits = [], showIssues = false, onDelete }) {
  const navigate = useNavigate();
  return (
    <table>
      <thead>
        <tr>
          <th>Website</th>
          <th>Score</th>
          <th>SEO</th>
          <th>AEO</th>
          <th>Pages</th>
          {showIssues && <th>Issues</th>}
          <th>Status</th>
          <th>Date</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {audits.map(a => (
          <tr key={a.id || a.audit_id}>
            <td style={{ maxWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Globe size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                {a.website_url}
              </div>
            </td>
            <td>
              <span className={`badge ${scoreBadge(a.overall_score || 0)}`}>{a.overall_score ? Math.round(a.overall_score) : '-'}</span>
            </td>
            <td>{a.seo_score ? Math.round(a.seo_score) : '-'}</td>
            <td>{a.aeo_score ? Math.round(a.aeo_score) : '-'}</td>
            <td>{a.total_pages ?? '-'}</td>
            {showIssues && <td>{a.total_issues ?? '-'}</td>}
            <td>
              <span className={`badge ${a.status === 'COMPLETED' ? 'badge-green' : a.status === 'FAILED' ? 'badge-red' : 'badge-blue'}`}>
                {a.status}
              </span>
            </td>
            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}
            </td>
            <td>
              <div style={{ display: 'flex', gap: 4 }}>
                {a.status === 'COMPLETED' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/audit/${a.audit_id}/dashboard`)}>
                    Report <ArrowRight size={12} />
                  </button>
                )}
                {a.status !== 'COMPLETED' && a.status !== 'FAILED' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/audit/${a.audit_id}/progress`)}>
                    <Clock size={12} /> Track
                  </button>
                )}
                {onDelete && (
                  <button className="btn btn-ghost btn-sm" onClick={() => onDelete(a)} title="Delete">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
