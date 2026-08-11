import { Brain, Globe, Zap, Sparkles, Cpu, FileText, ShieldCheck, Key, TrendingUp, BarChart3, Award, BookOpen, FileText as FileTextIcon } from 'lucide-react';
import TabbedPage from '../../components/ai/TabbedPage';
import GeoAeoOverview from '../../modules/geo-aeo/pages/GeoAeoOverview';
import AeoAnalysis from '../../modules/geo-aeo/pages/AeoAnalysis';
import GeoAnalysis from '../../modules/geo-aeo/pages/GeoAnalysis';
import AiVisibility from '../../modules/geo-aeo/pages/AiVisibility';
import ContentIntelligence from '../../modules/content-keywords/pages/ContentIntelligence';
import ContentAnalysis from '../../modules/content-keywords/pages/ContentAnalysis';
import ContentQuality from '../../modules/content-keywords/pages/ContentQuality';
import ContentOpportunities from '../../modules/content-keywords/pages/ContentOpportunities';
import KeywordStrategy from '../../modules/content-keywords/pages/KeywordStrategy';
import KeywordOpportunities from '../../modules/content-keywords/pages/KeywordOpportunities';
import KeywordVolumes from '../../modules/advanced/pages/KeywordVolumes';
import OffsiteAuthority from '../../modules/competitive/pages/OffsiteAuthority';
import DomainAuthority from '../../modules/advanced/pages/DomainAuthority';
import BrandMonitor from '../../modules/advanced/pages/BrandMonitor';
import ContentStudio from '../../modules/content-keywords/pages/ContentStudio';
import ContentBriefs from '../../modules/advanced/pages/ContentBriefs';

export function GeoAeoHubTabs() {
  return (
    <TabbedPage
      hero={{
        icon: Brain,
        title: 'GEO & AEO Hub',
        subtitle: 'AI search visibility across generative engines',
        badges: [
          { icon: Zap, t: 'AEO Analysis' },
          { icon: Globe, t: 'GEO Analysis' },
          { icon: Sparkles, t: 'AI Search & Visibility' },
        ],
      }}
      tabs={[
        { key: 'geo-aeo', label: 'Overview', icon: Brain, component: GeoAeoOverview },
        { key: 'aeo-analysis', label: 'AEO Analysis', icon: Zap, component: AeoAnalysis },
        { key: 'geo-analysis', label: 'GEO Analysis', icon: Globe, component: GeoAnalysis },
        { key: 'ai-visibility', label: 'AI Search & Visibility', icon: Sparkles, component: AiVisibility },
      ]}
    />
  );
}

export function ContentIntelHub() {
  return (
    <TabbedPage
      hero={{
        icon: Cpu,
        title: 'Content Intelligence',
        subtitle: 'Analysis, quality and opportunities across all pages',
        badges: [
          { icon: FileText, t: 'Analysis' },
          { icon: ShieldCheck, t: 'Quality' },
          { icon: Zap, t: 'Opportunities' },
        ],
      }}
      tabs={[
        { key: 'content-intel', label: 'Content Intelligence', icon: Cpu, component: ContentIntelligence },
        { key: 'content', label: 'Content Analysis', icon: FileText, component: ContentAnalysis },
        { key: 'content-quality', label: 'Content Quality', icon: ShieldCheck, component: ContentQuality },
        { key: 'content-opportunities', label: 'Content Opportunities', icon: Zap, component: ContentOpportunities },
      ]}
    />
  );
}

export function KeywordHub() {
  return (
    <TabbedPage
      hero={{
        icon: Key,
        title: 'Keyword Strategy',
        subtitle: 'Strategy, opportunities and search volumes',
        badges: [
          { icon: TrendingUp, t: 'Opportunities' },
          { icon: BarChart3, t: 'Volumes' },
        ],
      }}
      tabs={[
        { key: 'keywords', label: 'Keyword Strategy', icon: Key, component: KeywordStrategy },
        { key: 'keyword-opportunities', label: 'Keyword Opportunities', icon: TrendingUp, component: KeywordOpportunities },
        { key: 'keyword-volumes', label: 'Keyword Volumes', icon: BarChart3, component: KeywordVolumes },
      ]}
    />
  );
}

export function OffsiteHub() {
  return (
    <TabbedPage
      hero={{
        icon: Award,
        title: 'Off-Site Authority',
        subtitle: 'Domain authority and brand monitoring',
        badges: [
          { icon: Sparkles, t: 'Brand Monitor' },
        ],
      }}
      tabs={[
        { key: 'offsite-authority', label: 'Off-Site Authority', icon: Award, component: OffsiteAuthority },
        { key: 'domain-authority', label: 'Domain Authority', icon: Award, component: DomainAuthority },
        { key: 'brand-monitor', label: 'Brand Monitor', icon: Sparkles, component: BrandMonitor },
      ]}
    />
  );
}

export function ContentStudioHub() {
  return (
    <TabbedPage
      hero={{
        icon: BookOpen,
        title: 'Content Studio',
        subtitle: 'Create, brief and manage content',
        badges: [
          { icon: FileTextIcon, t: 'Content Briefs' },
        ],
      }}
      tabs={[
        { key: 'content-studio', label: 'Content Studio', icon: BookOpen, component: ContentStudio },
        { key: 'content-briefs', label: 'Content Briefs', icon: FileTextIcon, component: ContentBriefs },
      ]}
    />
  );
}
