import { useState } from 'react';
import { Search, ScanSearch, Brain, AlertTriangle, ListChecks } from 'lucide-react';
import TabbedPage from '../../components/ai/TabbedPage';
import { SeoHub, PagesHub, PageDetailHub, SchemaHub, SpeedHub, RoadmapHub } from './TechnicalHubs';
import { GeoAeoHubTabs, ContentIntelHub, KeywordHub, OffsiteHub } from './GeoContentHubs';
import InternalLinks from '../../modules/technical-audit/pages/InternalLinks';
import MobileSeo from '../../modules/technical-audit/pages/MobileSeo';
import SitemapRobots from '../../modules/technical-audit/pages/SitemapRobots';
import SecurityHeaders from '../../modules/technical-audit/pages/SecurityHeaders';
import ImageSeo from '../../modules/technical-audit/pages/ImageSeo';
import HreflangAnalysis from '../../modules/advanced/pages/HreflangAnalysis';
import RedirectAudit from '../../modules/advanced/pages/RedirectAudit';
import DuplicateContent from '../../modules/advanced/pages/DuplicateContent';
import JsDependency from '../../modules/advanced/pages/JsDependency';
import AiBotIntelligence from '../../modules/geo-aeo/pages/AiBotIntelligence';
import SerpPreview from '../../modules/geo-aeo/pages/SerpPreview';
import EeatAnalysis from '../../modules/geo-aeo/pages/EeatAnalysis';
import SocialSeo from '../../modules/geo-aeo/pages/SocialSeo';
import LocalSeo from '../../modules/geo-aeo/pages/LocalSeo';
import CompetitorAnalysis from '../../modules/competitive/pages/CompetitorAnalysis';
import BacklinkProfile from '../../modules/competitive/pages/BacklinkProfile';
import CitationAnalysis from '../../modules/geo-aeo/pages/CitationAnalysis';

const TOOLS = [
  { key: 'seo', label: 'SEO Analysis', icon: Search, type: 'Technical', component: SeoHub },
  { key: 'pages', label: 'Pages', icon: ScanSearch, type: 'Technical', component: PagesHub },
  { key: 'page-detail', label: 'Page Detail', icon: ScanSearch, type: 'Technical', component: PageDetailHub },
  { key: 'schema', label: 'Schema', icon: Search, type: 'Technical', component: SchemaHub },
  { key: 'speed', label: 'Speed & CWV', icon: Search, type: 'Technical', component: SpeedHub },
  { key: 'internal-links', label: 'Internal Links', icon: Search, type: 'Technical', component: InternalLinks },
  { key: 'mobile-seo', label: 'Mobile SEO', icon: Search, type: 'Technical', component: MobileSeo },
  { key: 'sitemap-robots', label: 'Sitemap & Robots', icon: Search, type: 'Technical', component: SitemapRobots },
  { key: 'roadmap', label: 'Roadmap', icon: Search, type: 'Technical', component: RoadmapHub },
  { key: 'security-headers', label: 'Security Headers', icon: Search, type: 'Crawlability', component: SecurityHeaders },
  { key: 'image-seo', label: 'Image SEO', icon: Search, type: 'Crawlability', component: ImageSeo },
  { key: 'hreflang', label: 'Hreflang', icon: Search, type: 'Crawlability', component: HreflangAnalysis },
  { key: 'redirects', label: 'Redirects', icon: Search, type: 'Crawlability', component: RedirectAudit },
  { key: 'duplicates', label: 'Duplicates', icon: Search, type: 'Crawlability', component: DuplicateContent },
  { key: 'js-dependency', label: 'JS Dependency', icon: Search, type: 'Crawlability', component: JsDependency },
  { key: 'geo-aeo', label: 'GEO & AEO Hub', icon: Brain, type: 'GEO & AEO', component: GeoAeoHubTabs },
  { key: 'ai-bots', label: 'AI Bot Access', icon: Brain, type: 'GEO & AEO', component: AiBotIntelligence },
  { key: 'serp-preview', label: 'SERP & AI Preview', icon: Search, type: 'GEO & AEO', component: SerpPreview },
  { key: 'eeat', label: 'E-E-A-T Analysis', icon: Search, type: 'GEO & AEO', component: EeatAnalysis },
  { key: 'social-seo', label: 'Social SEO', icon: Search, type: 'GEO & AEO', component: SocialSeo },
  { key: 'local-seo', label: 'Local SEO', icon: Search, type: 'GEO & AEO', component: LocalSeo },
  { key: 'content-intel', label: 'Content Intelligence', icon: Search, type: 'Content', component: ContentIntelHub },
  { key: 'keywords', label: 'Keyword Strategy', icon: Search, type: 'Content', component: KeywordHub },
  { key: 'competitor', label: 'Competitor Analysis', icon: Search, type: 'Competitive', component: CompetitorAnalysis },
  { key: 'backlinks', label: 'Backlinks', icon: Search, type: 'Competitive', component: BacklinkProfile },
  { key: 'offsite-authority', label: 'Off-Site Authority', icon: Search, type: 'Competitive', component: OffsiteHub },
  { key: 'citations', label: 'Citations', icon: Search, type: 'Competitive', component: CitationAnalysis },
];

const TYPES = ['All', 'Technical', 'Crawlability', 'GEO & AEO', 'Content', 'Competitive'];

export default function DiagnoseHub() {
  const [type, setType] = useState('All');
  const tabs = type === 'All' ? TOOLS : TOOLS.filter(t => t.type === type);
  return (
    <TabbedPage
      hero={{
        icon: AlertTriangle,
        title: 'Diagnose',
        subtitle: 'Full technical, crawlability, GEO/AEO, content and competitive diagnosis across every signal',
        badges: [
          { icon: Search, t: 'Technical' },
          { icon: Brain, t: 'GEO & AEO' },
          { icon: ListChecks, t: 'All signals' },
        ],
      }}
      tabs={tabs}
      defaultTab="seo"
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