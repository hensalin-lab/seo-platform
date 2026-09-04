import { useState } from 'react';
import { ClipboardList, AlertTriangle, Star, Edit3, Lightbulb } from 'lucide-react';
import TabbedPage from '../../components/ai/TabbedPage';
import ActionHub from './ActionHub';
import IssuesExplorer from '../../modules/action-center/pages/IssuesExplorer';
import RankBoost from '../../modules/geo-aeo/pages/RankBoost';
import ContentRewriter from '../../modules/content-keywords/pages/ContentRewriter';

const TOOLS = [
  { key: 'action-hub', label: 'Action Hub', icon: ClipboardList, type: 'Prioritize', component: ActionHub },
  { key: 'issues', label: 'Issue Remediation', icon: AlertTriangle, type: 'Prioritize', component: IssuesExplorer },
  { key: 'rank-boost', label: 'Rank Boost', icon: Star, type: 'Optimize', component: RankBoost },
  { key: 'content-rewrite', label: 'Content Rewriter', icon: Edit3, type: 'Optimize', component: ContentRewriter },
];

const TYPES = ['All', 'Prioritize', 'Optimize'];

export default function FixHub() {
  const [type, setType] = useState('All');
  const tabs = type === 'All' ? TOOLS : TOOLS.filter(t => t.type === type);
  return (
    <TabbedPage
      hero={{
        icon: ClipboardList,
        title: 'Fix',
        subtitle: 'Prioritized remediation, rank boosting and content rewriting to close every issue',
        badges: [
          { icon: Lightbulb, t: 'Prioritize' },
          { icon: Edit3, t: 'Rewrite' },
          { icon: Star, t: 'Rank Boost' },
        ],
      }}
      tabs={tabs}
      defaultTab="action-hub"
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