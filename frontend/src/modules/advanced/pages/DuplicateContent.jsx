import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../api';
import { Copy, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Card, CardHeader, LoadingSpinner, EmptyState, Badge, StatCard,
} from './ui';

function DuplicateRow({ g }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <Badge color={g.kind === 'content' ? '#f97316' : '#3b82f6'}>{g.kind === 'content' ? 'content' : 'title'}</Badge>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 160 }}>{g.title || '(untitled)'}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.count} pages · {g.word_count || 0} words</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {(g.urls || []).map((u, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{i + 1}.</span>
            {u}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DuplicateContent() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getDuplicates(id).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner message="Detecting duplicate content…" />;

  if (error) {
    return <EmptyState icon={Copy} title="Analysis failed" message={error} />;
  }

  if (!data.total_groups) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No duplicate content detected"
        message="No near-identical content hashes or duplicate titles were found across crawled pages (pages under 50 words are ignored)."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader icon={Copy} title="Duplicate Content Detection" subtitle="Near-identical body hashes and repeated titles across crawled pages" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          <StatCard icon={Copy} label="Groups" value={data.total_groups ?? 0} color="#f97316" />
          <StatCard icon={FileText} label="Affected pages" value={data.duplicate_pages ?? 0} sub="in 2+ URL groups" color="#8b5cf6" />
          <StatCard icon={FileText} label="Content groups" value={data.content_groups?.length ?? 0} color="#f97316" />
          <StatCard icon={FileText} label="Title groups" value={data.title_groups?.length ?? 0} color="#3b82f6" />
        </div>
      </Card>

      {data.groups?.length ? (
        <Card>
          <CardHeader
            icon={AlertTriangle}
            title="Duplicate groups"
            badge={`${data.groups.length}`}
            subtitle="Canonicalize or consolidate these URLs to concentrate ranking equity"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 560, overflowY: 'auto' }}>
            {data.groups.map((g, idx) => <DuplicateRow key={idx} g={g} />)}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
