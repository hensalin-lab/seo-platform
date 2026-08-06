import { Wand2 } from 'lucide-react';

export default function ThemeHero({ icon: Icon = Wand2, title, subtitle, badges = [], actions = null, children }) {
  return (
    <div style={{
      borderRadius: 18, padding: '24px 26px', color: '#fff',
      background: 'radial-gradient(120% 160% at 0% 0%, rgba(99,102,241,0.9), rgba(139,92,246,0.82) 45%, rgba(217,70,239,0.75))',
      boxShadow: '0 18px 40px -18px rgba(124,58,237,0.55)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: -40, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
      <div style={{ position: 'absolute', right: 60, bottom: -70, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }}>
              <Icon size={21} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{title}</div>
              {subtitle && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 3 }}>{subtitle}</div>}
            </div>
          </div>
          {badges.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {badges.map((b, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}>
                  {typeof b === 'string' ? b : <><b.icon size={11} /> {b.t}</>}
                </span>
              ))}
            </div>
          )}
        </div>
        {actions && <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}
