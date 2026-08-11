import { Search, Shield, FileCode, Layers, Cpu, Edit3, Gauge, Network, Braces, HeartPulse, Flag, Sparkles, Link2, List } from 'lucide-react';
import TabbedPage from '../../components/ai/TabbedPage';
import SeoAnalysis from '../../modules/technical-audit/pages/SeoAnalysis';
import PagesList from '../../modules/technical-audit/pages/PagesList';
import PageIntelligenceV2 from '../../modules/technical-audit/pages/PageIntelligenceV2';
import EnterprisePage from '../../modules/enterprise/pages/EnterprisePage';
import PageDetail from '../../modules/technical-audit/pages/PageDetail';
import PageIntelligenceDetail from '../../modules/technical-audit/pages/PageIntelligenceDetail';
import PageImprovements from '../../modules/technical-audit/pages/PageImprovements';
import PageSpeed from '../../modules/technical-audit/pages/PageSpeed';
import SchemaAnalysis from '../../modules/technical-audit/pages/SchemaAnalysis';
import SchemaIntelligence from '../../modules/geo-aeo/pages/SchemaIntelligence';
import SpeedAnalysis from '../../modules/technical-audit/pages/SpeedAnalysis';
import PageExperience from '../../modules/technical-audit/pages/PageExperience';
import SeoRoadmap from '../../modules/content-keywords/pages/SeoRoadmap';
import AiRoadmap from '../../modules/content-keywords/pages/AiRoadmap';

export function SeoHub() {
  return (
    <TabbedPage
      hero={{
        icon: Search,
        title: 'SEO Analysis',
        subtitle: 'Technical audit and enterprise-grade analysis',
        badges: [
          { icon: Shield, t: 'Enterprise & Technical' },
        ],
      }}
      tabs={[
        { key: 'seo', label: 'SEO Analysis', icon: Search, component: SeoAnalysis },
        { key: 'enterprise', label: 'Enterprise & Technical', icon: Shield, component: EnterprisePage },
      ]}
    />
  );
}

export function PagesHub() {
  return (
    <TabbedPage
      hero={{
        icon: FileCode,
        title: 'Pages',
        subtitle: 'Crawled page list with per-page scores, issues and fixes',
        badges: [
          { icon: List, t: 'Page List' },
          { icon: Cpu, t: 'Page Intelligence' },
        ],
      }}
      tabs={[
        { key: 'pages-list', label: 'Page List', icon: List, component: PagesList },
        { key: 'page-intelligence', label: 'Page Intelligence', icon: Cpu, component: PageIntelligenceV2 },
      ]}
    />
  );
}

export function PageDetailHub() {  return (
    <TabbedPage
      hero={{
        icon: Layers,
        title: 'Page Detail',
        subtitle: 'Deep per-page intelligence, improvements and speed',
        badges: [
          { icon: Cpu, t: 'Intel' },
          { icon: Edit3, t: 'Improvements' },
          { icon: Gauge, t: 'Speed' },
        ],
      }}
      tabs={[
        { key: 'page-detail', label: 'Page Detail', icon: Layers, component: PageDetail },
        { key: 'page-intel-detail', label: 'Page Intel Detail', icon: Cpu, component: PageIntelligenceDetail },
        { key: 'page-improvements', label: 'Page Improvements', icon: Edit3, component: PageImprovements },
        { key: 'page-speed', label: 'Page Speed', icon: Gauge, component: PageSpeed },
      ]}
    />
  );
}

export function SchemaHub() {
  return (
    <TabbedPage
      hero={{
        icon: Network,
        title: 'Schema',
        subtitle: 'Structured data analysis and schema intelligence',
        badges: [
          { icon: Braces, t: 'Schema Intelligence' },
        ],
      }}
      tabs={[
        { key: 'schema', label: 'Schema', icon: Network, component: SchemaAnalysis },
        { key: 'schema-intel', label: 'Schema Intelligence', icon: Braces, component: SchemaIntelligence },
      ]}
    />
  );
}

export function SpeedHub() {
  return (
    <TabbedPage
      hero={{
        icon: Gauge,
        title: 'Speed & CWV',
        subtitle: 'Core Web Vitals, speed and page experience',
        badges: [
          { icon: HeartPulse, t: 'Page Experience' },
        ],
      }}
      tabs={[
        { key: 'speed', label: 'Speed & CWV', icon: Gauge, component: SpeedAnalysis },
        { key: 'page-experience', label: 'Page Experience', icon: HeartPulse, component: PageExperience },
      ]}
    />
  );
}

export function RoadmapHub() {
  return (
    <TabbedPage
      hero={{
        icon: Flag,
        title: 'Roadmap',
        subtitle: 'SEO and AI execution roadmaps',
        badges: [
          { icon: Sparkles, t: 'AI Roadmap' },
        ],
      }}
      tabs={[
        { key: 'roadmap', label: 'SEO Roadmap', icon: Flag, component: SeoRoadmap },
        { key: 'ai-roadmap', label: 'AI Roadmap', icon: Sparkles, component: AiRoadmap },
      ]}
    />
  );
}
