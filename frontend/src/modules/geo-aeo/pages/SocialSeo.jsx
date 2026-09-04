import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Share2, AlertTriangle, CheckCircle, XCircle, Globe, Hash } from 'lucide-react';
import { DataSourceBadge } from '../../../components/DataSourceBadge';
import AiSuggestionStrip from '../../../components/ai/AiSuggestionStrip';
import ThemeHero from '../../../components/ai/ThemeHero';
import ThemeStatCard from '../../../components/ai/ThemeStatCard';
import FixDetail from '../../../components/FixDetail';

export default function SocialSeo() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.getSocialSeo(id);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load social SEO data');
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
          <p>Loading social SEO analysis...</p>
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

  const score = data?.social_seo_score ?? 0;
  const ogPct = data?.og_coverage_pct ?? 0;
  const twitterPct = data?.twitter_coverage_pct ?? 0;
  const issues = data?.issues || [];
  const recs = data?.recommendations || [];

  return (
    <div className="page-content">
      <ThemeHero
        icon={Share2}
        title="Social Meta Tags"
        subtitle="Open Graph, Twitter Cards, and social sharing optimization"
        badges={[
          { icon: Globe, t: 'Open Graph' },
          { icon: Hash, t: 'Twitter Cards' },
          { icon: Share2, t: 'Social sharing' },
        ]}
      />
      <DataSourceBadge source="estimated" size="xs" />

      <div style={{ marginBottom: 20 }}>
        <AiSuggestionStrip auditId={id} tool="social" title="AI social meta fixes" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <ThemeStatCard icon={Share2} label="Social SEO Score" value={score} color="#7c3aed" />
        <ThemeStatCard icon={Globe} label="Open Graph Coverage" value={`${ogPct}%`} color="#3b82f6" sub={`${data?.pages_with_og ?? 0} of ${data?.total_pages ?? 0} pages`} />
        <ThemeStatCard icon={Hash} label="Twitter Card Coverage" value={`${twitterPct}%`} color="#12b886" sub={`${data?.pages_with_twitter ?? 0} of ${data?.total_pages ?? 0} pages`} />
      </div>

      <div className="card">
        <div className="card-header">
          <Share2 size={18} style={{ color: 'var(--accent)' }} />
          <h3>Social Tag Coverage</h3>
        </div>
        <div className="grid-2" style={{ padding: '1rem' }}>
          <div className="score-card">
            <div className="label">Open Graph (og:)</div>
            <div className="score" style={{ color: 'var(--accent)' }}>{data?.pages_with_og ?? 0}</div>
            <div className="out-of">pages with OG tags</div>
            <div className="progress-bar" style={{ marginTop: '8px' }}>
              <div className="progress-fill" style={{ width: `${ogPct}%`, background: 'var(--gradient)' }} />
            </div>
          </div>
          <div className="score-card">
            <div className="label">Twitter Card (twitter:)</div>
            <div className="score" style={{ color: 'var(--accent)' }}>{data?.pages_with_twitter ?? 0}</div>
            <div className="out-of">pages with Twitter tags</div>
            <div className="progress-bar" style={{ marginTop: '8px' }}>
              <div className="progress-fill" style={{ width: `${twitterPct}%`, background: 'var(--gradient)' }} />
            </div>
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="card">
          <div className="card-header">
            <AlertTriangle size={18} style={{ color: 'var(--yellow)' }} />
            <h3>Social Meta Issues</h3>
            <span className="badge badge-yellow">{issues.length}</span>
          </div>
          {issues.map((issue, idx) => (
            <div className="issue-item" key={idx}>
              <div className="issue-header">
                <div className="issue-title">{issue.signal_name}</div>
                <span className={`badge ${issue.severity === 'HIGH' ? 'badge-red' : 'badge-yellow'}`}>{issue.severity}</span>
              </div>
              <div className="issue-desc">{issue.description}</div>
              <FixDetail issue={issue} />
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
