import { LayoutDashboard, BarChart3, ShieldCheck } from 'lucide-react';
import TabbedPage from '../../components/ai/TabbedPage';
import Dashboard from '../../pages/Dashboard';
import ExecutiveDashboard from '../../modules/executive/pages/ExecutiveDashboard';
import SeoHealth from '../../modules/executive/pages/SeoHealth';

export default function DashboardHub() {
  return (
    <TabbedPage
      hero={{
        icon: LayoutDashboard,
        title: 'Overview',
        subtitle: 'Executive, technical health and live dashboard',
        badges: [
          { icon: BarChart3, t: 'Executive' },
          { icon: ShieldCheck, t: 'SEO Health' },
        ],
      }}
      tabs={[
        { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: Dashboard },
        { key: 'executive-dashboard', label: 'Executive Dashboard', icon: BarChart3, component: ExecutiveDashboard },
        { key: 'seo-health', label: 'SEO Health', icon: ShieldCheck, component: SeoHealth },
      ]}
    />
  );
}
