import { useState } from 'react';
import { BookOpen, PenTool, RefreshCw, MessageSquare, TrendingUp, LineChart, Zap, GitCompare, Search, Lightbulb, SearchCheck } from 'lucide-react';
import TabbedPage from '../../components/ai/TabbedPage';
import { ContentStudioHub } from './GeoContentHubs';
import BlogAi from '../../modules/content-keywords/pages/BlogAi';
import ContentRevival from '../../modules/content-keywords/pages/ContentRevival';
import AiChat from '../../modules/settings/pages/AiChat';
import Rankings from '../../modules/technical-audit/pages/Rankings';
import AuditTrends from '../../modules/executive/pages/AuditTrends';
import AiOverviews from '../../modules/geo-aeo/pages/AiOverviews';
import DriftDetection from '../../modules/advanced/pages/DriftDetection';
import GscData from '../../modules/technical-audit/pages/GscData';

const TOOLS = [
  { key: 'content-studio', label: 'Content Studio', icon: BookOpen, type: 'Create', component: ContentStudioHub },
  { key: 'blog-ai', label: 'Blog AI', icon: PenTool, type: 'Create', component: BlogAi },
  { key: 'content-revival', label: 'Content Revival', icon: RefreshCw, type: 'Create', component: ContentRevival },
  { key: 'chat', label: 'AI Chat', icon: MessageSquare, type: 'Create', component: AiChat },
  { key: 'rankings', label: 'Rank Tracking', icon: TrendingUp, type: 'Track', component: Rankings },
  { key: 'trends', label: 'Score Trends', icon: LineChart, type: 'Track', component: AuditTrends },
  { key: 'ai-overviews', label: 'AI Overviews Monitor', icon: Zap, type: 'Track', component: AiOverviews },
  { key: 'drift', label: 'Drift & Changes', icon: GitCompare, type: 'Track', component: DriftDetection },
  { key: 'gsc', label: 'Google Search Console', icon: Search, type: 'Track', component: GscData },
];

const TYPES = ['All', 'Create', 'Track'];

export default function CreateTrackHub() {
  const [type, setType] = useState('All');
  const tabs = type === 'All' ? TOOLS : TOOLS.filter(t => t.type === type);
  return (
    <TabbedPage
      hero={{
        icon: Lightbulb,
        title: 'Create & Track',
        subtitle: 'Generate content and monitor rankings, trends, AI visibility, drift and search console',
        badges: [
          { icon: SearchCheck, t: 'Create' },
          { icon: TrendingUp, t: 'Track' },
        ],
      }}
      tabs={tabs}
      defaultTab="content-studio"
      extra={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
          {TYPES.map(t => {
            const active = type === t;
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9,
                  border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border-light)',
                  background: active ? 'rgba(139,92,246,0.08)' : 'var(--bg-white)',
                  cursor: 'pointer', fontSize: 12, fontWeight: active ? 750 : 600, color: active ? '#7c3aed' : 'var(--text-secondary)',
                }}
              >{t}</button>
            );
          })}
        </div>
      }
    />
  );
}