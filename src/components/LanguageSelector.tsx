import React from 'react';
import { Language } from '../i18n';

const LANGS: { code: Language; flag: string; label: string }[] = [
  { code: 'de', flag: '🇩🇪', label: 'DE' }, { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'ES' }, { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'it', flag: '🇮🇹', label: 'IT' }, { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'tr', flag: '🇹🇷', label: 'TR' }, { code: 'uk', flag: '🇺🇦', label: 'UA' },
];

interface Props {
  currentLang: Language;
  onSelect: (l: Language) => void;
  logo?: React.ReactNode;
}

export function LanguageSelector({ currentLang, onSelect, logo }: Props) {
  const row1 = LANGS.slice(0, 4);
  const row2 = LANGS.slice(4, 8);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '4px 9px',
    background: active ? '#2D5A3D' : 'transparent',
    color: active ? '#FAF7F2' : '#8A8078',
    border: active ? '1px solid #2D5A3D' : '1px solid #DDD5C8',
    fontSize: '0.62rem', fontWeight: active ? 500 : 400,
    fontFamily: 'var(--font-sans)', letterSpacing: '0.06em',
    cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
  });

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {/* Logo column */}
      {logo && (
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 6, borderRight: '0.5px solid #DDD5C8', marginRight: 2, flexShrink: 0 }}>
          {logo}
        </div>
      )}

      {/* Two rows of 4 chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {row1.map(({ code, flag, label }) => (
            <button key={code} onClick={() => onSelect(code)} style={chipStyle(currentLang === code)}
              onMouseEnter={e => { if (currentLang !== code) { const el = e.currentTarget; el.style.borderColor = '#2D5A3D'; el.style.color = '#2D5A3D'; el.style.background = 'rgba(232,242,235,0.3)'; }}}
              onMouseLeave={e => { if (currentLang !== code) { const el = e.currentTarget; el.style.borderColor = '#DDD5C8'; el.style.color = '#8A8078'; el.style.background = 'transparent'; }}}>
              <span style={{ fontSize: 11 }}>{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {row2.map(({ code, flag, label }) => (
            <button key={code} onClick={() => onSelect(code)} style={chipStyle(currentLang === code)}
              onMouseEnter={e => { if (currentLang !== code) { const el = e.currentTarget; el.style.borderColor = '#2D5A3D'; el.style.color = '#2D5A3D'; el.style.background = 'rgba(232,242,235,0.3)'; }}}
              onMouseLeave={e => { if (currentLang !== code) { const el = e.currentTarget; el.style.borderColor = '#DDD5C8'; el.style.color = '#8A8078'; el.style.background = 'transparent'; }}}>
              <span style={{ fontSize: 11 }}>{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
