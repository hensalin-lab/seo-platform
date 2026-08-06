import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ThemePillTabs from './ThemePillTabs';
import ThemeHero from './ThemeHero';

export default function TabbedPage({ tabs, defaultTab, hero, extra, style }) {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const fallback = tabs.some(t => t.key === defaultTab) ? defaultTab : tabs[0]?.key;
  const urlValid = tabs.some(t => t.key === urlTab);

  const [local, setLocal] = useState(urlValid ? urlTab : fallback);

  useEffect(() => {
    if (urlValid) setLocal(urlTab);
    else setLocal(fallback);
  }, [urlTab, fallback]);

  const pick = (key) => {
    setLocal(key);
    const p = new URLSearchParams(searchParams);
    if (key === fallback) p.delete('tab');
    else p.set('tab', key);
    setSearchParams(p, { replace: true });
  };

  const currentKey = tabs.some(t => t.key === local) ? local : fallback;
  const ActiveComp = tabs.find(t => t.key === currentKey)?.component;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, ...style }}>
      {hero && <ThemeHero {...hero} />}
      {extra}
      <ThemePillTabs tabs={tabs.map(t => ({ key: t.key, label: t.label, icon: t.icon, count: t.count }))} active={currentKey} onChange={pick} />
      {ActiveComp && <ActiveComp key={currentKey} id={id} />}
    </div>
  );
}
