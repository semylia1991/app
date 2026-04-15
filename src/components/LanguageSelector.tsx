import React from 'react';
import { Language } from '../i18n';

const LANGS: { code: Language; flag: string; label: string }[] = [
  { code: 'de', flag: '🇩🇪', label: 'DE' }, { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'ES' }, { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'it', flag: '🇮🇹', label: 'IT' }, { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'tr', flag: '🇹🇷', label: 'TR' }, { code: 'uk', flag: '🇺🇦', label: 'UA' },
];

interface Props { currentLang: Language; onSelect: (l: Language) => void; }

export function LanguageSelector({ currentLang, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
      {LANGS.map(({ code, flag, label }) => (
        <button key={code} onClick={() => onSelect(code)} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 9px',
          background: currentLang === code ? '#2D5A3D' : 'transparent',
          color: currentLang === code ? '#FAF7F2' : '#8A8078',
          border: currentLang === code ? '1px solid #2D5A3D' : '1px solid #DDD5C8',
          fontSize: '0.62rem', fontWeight: currentLang === code ? 500 : 400,
          fontFamily: 'var(--font-sans)', letterSpacing: '0.06em',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (currentLang !== code) { const el = e.currentTarget; el.style.borderColor = '#2D5A3D'; el.style.color = '#2D5A3D'; el.style.background = 'rgba(232,242,235,0.3)'; }}}
        onMouseLeave={e => { if (currentLang !== code) { const el = e.currentTarget; el.style.borderColor = '#DDD5C8'; el.style.color = '#8A8078'; el.style.background = 'transparent'; }}}>
          <span style={{ fontSize: 12 }}>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
