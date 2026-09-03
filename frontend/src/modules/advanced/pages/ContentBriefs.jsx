import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { FileText, ListChecks, Layers, TrendingUp } from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, Badge, StatCard, severityColor,
} from './ui';
import DataSourceBadge from '../../../components/DataSourceBadge';

export default function ContentBriefs() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.getContentBriefs(id).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner message="Building content briefs…" />;

  if (error) {
    return <EmptyState icon={FileText} title="Generation failed" message={error} />;
  }

  if (data.note || !data.briefs?.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No content briefs yet"
        message={data.note || 'Run an audit first so keyword data is available. Briefs are built from keyword data and clustered by topic.'}
      />
    );
  }

  const intentColor = (i) => ({ informational: '#3b82f6', commercial: '#f97316', transactional: '#8b5cf6', local: '#22c55e' }[i] || '#8b5cf6');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader icon={FileText} title="Content Briefs & Topic Clusters" subtitle="Keyless topic clustering of your keyword data with SEO-ready outlines" actions={<DataSourceBadge source="ai-generated" size="xs" />} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          <StatCard icon={Layers} label="Clusters" value={data.clusters?.length ?? 0} color="#8b5cf6" />
          <StatCard icon={FileText} label="Briefs" value={data.briefs?.length ?? 0} color="#3b82f6" />
          <StatCard icon={TrendingUp} label="High-opp." value={(data.clusters || []).filter(c => c.opportunity === 'HIGH').length} color="#22c55e" />
        </div>
      </Card>

      {data.clusters?.length ? (
        <Card>
          <CardHeader icon={Layers} title="Topic clusters" badge={`${data.clusters.length}`} subtitle="Keywords grouped by shared topic" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {data.clusters.map((c, idx) => (
              <div key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{c.name}</span>
                  <Badge color={c.opportunity === 'HIGH' ? '#22c55e' : c.opportunity === 'MEDIUM' ? '#f97316' : '#8b5cf6'}>{c.opportunity}</Badge>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {c.keywords.slice(0, 6).map((k, ki) => (
                    <span key={ki} style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 6 }}>{k}</span>
                  ))}
                  {c.keywords.length > 6 && <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>+{c.keywords.length - 6}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader icon={ListChecks} title="Ready-to-use briefs" badge={`${data.briefs.length}`} subtitle="Click a brief to expand its outline" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 640, overflowY: 'auto' }}>
          {data.briefs.map((b, idx) => {
            const open = expanded === idx;
            return (
              <div key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <button
                  onClick={() => setExpanded(open ? null : idx)}
                  style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '12px 14px', textAlign: 'left', color: 'var(--text)', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Badge color={intentColor(b.search_intent)}>{b.search_intent}</Badge>
                    <span style={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 180 }}>{b.title}</span>
                    {b.opportunity && <Badge color={b.opportunity === 'HIGH' ? '#22c55e' : '#f97316'}>{b.opportunity}</Badge>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingLeft: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target: <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{b.target_keyword}</span></span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.word_count_target} words</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.outline?.length || 0} outline sections</span>
                  </div>
                </button>
                {open && (
                  <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)', marginTop: 0 }}>
                    {b.related_keywords?.length > 0 && (
                      <div style={{ padding: '12px 0 4px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Related keywords</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {b.related_keywords.map((k, ki) => <span key={ki} style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 6 }}>{k}</span>)}
                        </div>
                      </div>
                    )}
                    <div style={{ padding: '10px 0 4px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Outline</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(b.outline || []).map((o, oi) => (
                          <div key={oi} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 12, alignItems: 'start' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', background: 'rgba(139,92,246,0.12)', padding: '2px 7px', borderRadius: 6, textAlign: 'center', justifySelf: 'start' }}>{o.word_count}w</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{o.subheading}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{o.focus}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {b.competitor_pages?.length > 0 && (
                      <div style={{ padding: '10px 0 4px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Existing pages to reference</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {b.competitor_pages.map((u, ui) => <div key={ui} style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{u}</div>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
