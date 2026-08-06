import { useState } from 'react';
import { ClipboardList, Lightbulb, Sparkles, AlertTriangle, RefreshCw, Zap, ListChecks } from 'lucide-react';
import TabbedPage from '../../components/ai/TabbedPage';
import AiSuggestions from '../../modules/content-keywords/pages/AiSuggestions';
import AiRecommendations from '../../modules/content-keywords/pages/AiRecommendations';
import IssuesExplorer from '../../modules/action-center/pages/IssuesExplorer';
import RemediationFeed from '../../modules/action-center/pages/RemediationFeed';
import ActionStudio from '../../modules/action-center/pages/ActionStudio';
import ActionCenter from '../../modules/action-center/pages/ActionCenter';
import Recommendations from '../../modules/action-center/pages/Recommendations';

const TOOLS = [
  { key: 'ai-suggestions', label: 'AI Suggestions', icon: Lightbulb, type: 'Technical', component: AiSuggestions },
  { key: 'ai-recommendations', label: 'AI Recommendations', icon: Sparkles, type: 'AI-visibility', component: AiRecommendations },
  { key: 'issues', label: 'Issue Remediation', icon: AlertTriangle, type: 'Technical', component: IssuesExplorer },
  { key: 'remediation', label: 'Remediation Feed', icon: RefreshCw, type: 'Content', component: RemediationFeed },
  { key: 'action-studio', label: 'AI Action Studio', icon: Zap, type: 'AI-visibility', component: ActionStudio },
  { key: 'action-center', label: 'Action Center', icon: ClipboardList, type: 'Technical', component: ActionCenter },
  { key: 'recommendations-list', label: 'Recommendations List', icon: ListChecks, type: 'Competitive', component: Recommendations },
];

const TYPES = ['All', 'Technical', 'Content', 'AI-visibility', 'Competitive'];

export default function ActionHub() {
  const [type, setType] = useState('All');
  const tabs = type === 'All' ? TOOLS : TOOLS.filter(t => t.type === type);
  return (
    <TabbedPage
      hero={{
        icon: ClipboardList,
        title: 'Action Hub',
        subtitle: 'One prioritized action queue across every remediation tool',
        badges: [
          { icon: Lightbulb, t: 'AI Suggestions' },
          { icon: Zap, t: 'AI Action Studio' },
          { icon: ListChecks, t: 'Recommendations' },
        ],
      }}
      tabs={tabs}
      defaultTab="ai-suggestions"
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
