import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Image, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function ImageSeo() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.getImageSeo(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load image SEO data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Loading image SEO analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <XCircle size={48} style={{ color: 'var(--red)' }} />
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const score = data?.image_seo_score ?? 0;
  const total = data?.total_images ?? 0;
  const withAlt = data?.images_with_alt ?? 0;
  const withoutAlt = data?.images_without_alt ?? 0;
  const altPct = data?.alt_text_coverage_pct ?? 0;
  const pageDetails = data?.page_details || [];
  const recs = data?.recommendations || [];

  const getScoreColor = (s) => {
    if (s >= 80) return 'score-excellent';
    if (s >= 60) return 'score-good';
    if (s >= 40) return 'score-fair';
    return 'score-poor';
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <Image size={24} style={{ color: 'var(--accent)' }} />
          <h1>Image SEO</h1>
        </div>
        <p>Alt text coverage, image optimization, and file format analysis</p>
      </div>

      <div className="score-grid">
        <div className="score-card">
          <div className="label">Image SEO Score</div>
          <div className={`score ${getScoreColor(score)}`}>{score}</div>
          <div className="out-of">out of 100</div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${score}%`, background: 'var(--gradient)' }} />
          </div>
        </div>
        <div className="score-card">
          <div className="label">Total Images</div>
          <div className="score" style={{ color: 'var(--accent)' }}>{total}</div>
          <div className="out-of">across all pages</div>
        </div>
        <div className="score-card">
          <div className="label">Alt Text Coverage</div>
          <div className="score" style={{ color: altPct >= 80 ? 'var(--green)' : altPct >= 50 ? 'var(--yellow)' : 'var(--red)' }}>{altPct}%</div>
          <div className="out-of">{withAlt} of {total} images</div>
        </div>
        <div className="score-card">
          <div className="label">Missing Alt Text</div>
          <div className="score" style={{ color: withoutAlt > 0 ? 'var(--red)' : 'var(--green)' }}>{withoutAlt}</div>
          <div className="out-of">images need fixes</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <Image size={18} style={{ color: 'var(--accent)' }} />
          <h3>Alt Text Coverage</h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <div className="progress-bar" style={{ height: '20px', borderRadius: '10px' }}>
            <div
              className="progress-fill"
              style={{ width: `${altPct}%`, background: altPct >= 80 ? 'var(--green)' : altPct >= 50 ? 'var(--yellow)' : 'var(--red)', borderRadius: '10px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <span>{withAlt} with alt text</span>
            <span>{withoutAlt} missing alt text</span>
          </div>
        </div>
      </div>

      {pageDetails.length > 0 && (
        <div className="card">
          <div className="card-header">
            <Image size={18} style={{ color: 'var(--accent)' }} />
            <h3>Pages with Most Images</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                  <tr>
                    <th>Page URL</th>
                    <th>Images</th>
                    <th>With Alt</th>
                    <th>Missing Alt</th>
                  </tr>
              </thead>
              <tbody>
                {pageDetails.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</td>
                    <td><span className="badge badge-blue">{p.image_count}</span></td>
                    <td><span className={`badge ${p.with_alt === p.image_count ? 'badge-green' : 'badge-yellow'}`}>{p.with_alt}/{p.image_count}</span></td>
                    <td><span className={`badge ${p.with_alt === p.image_count ? 'badge-green' : 'badge-red'}`}>{p.image_count - p.with_alt} missing</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.issues && data.issues.length > 0 && (
        <div className="card">
          <div className="card-header">
            <AlertTriangle size={18} style={{ color: 'var(--yellow)' }} />
            <h3>Image Issues</h3>
          </div>
          {data.issues.map((issue, idx) => (
            <div className="issue-item" key={idx}>
              <div className="issue-header">
                <div className="issue-title">{issue.signal_name}</div>
                <span className={`badge ${issue.severity === 'HIGH' ? 'badge-red' : 'badge-yellow'}`}>{issue.severity}</span>
              </div>
              <div className="issue-desc">{issue.description}</div>
              {issue.fix && <div className="issue-fix">Fix: {issue.fix}</div>}
            </div>
          ))}
        </div>
      )}

      {recs.length > 0 && (
        <div className="card">
          <div className="card-header">
            <CheckCircle size={18} style={{ color: 'var(--green)' }} />
            <h3>Recommendations</h3>
          </div>
          {recs.map((rec, idx) => (
            <div className="issue-item" key={idx}>
              <div className="issue-header">
                <div className="issue-title">{rec.action}</div>
                <span className={`badge ${rec.priority === 'HIGH' ? 'badge-red' : 'badge-yellow'}`}>{rec.priority}</span>
              </div>
              <div className="issue-desc">{rec.impact}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
