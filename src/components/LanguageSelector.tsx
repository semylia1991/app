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
  const row1 = LANGS.slice(0, 5);
  const row2 = LANGS.slice(5, 8);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
    width: 44, // fixed width — все одинаковые
    padding: '4px 0',
    background: active ? '#2D5A3D' : 'transparent',
    color: active ? '#FAF7F2' : '#8A8078',
    border: active ? '1px solid #2D5A3D' : '1px solid #DDD5C8',
    fontSize: '0.6rem', fontWeight: active ? 500 : 400,
    fontFamily: 'var(--font-sans)', letterSpacing: '0.06em',
    cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
    boxSizing: 'border-box',
  });

  const onEnter = (code: Language) => (e: React.MouseEvent<HTMLButtonElement>) => {
    if (currentLang !== code) {
      e.currentTarget.style.borderColor = '#2D5A3D';
      e.currentTarget.style.color = '#2D5A3D';
      e.currentTarget.style.background = 'rgba(232,242,235,0.3)';
    }
  };
  const onLeave = (code: Language) => (e: React.MouseEvent<HTMLButtonElement>) => {
    if (currentLang !== code) {
      e.currentTarget.style.borderColor = '#DDD5C8';
      e.currentTarget.style.color = '#8A8078';
      e.currentTarget.style.background = 'transparent';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Logo */}
      {logo && (
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 8, borderRight: '0.5px solid #DDD5C8', flexShrink: 0 }}>
          {logo}
        </div>
      )}

      {/* Two rows: 5 top, 3 bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {row1.map(({ code, flag, label }) => (
            <button key={code} onClick={() => onSelect(code)}
              style={chipStyle(currentLang === code)}
              onMouseEnter={onEnter(code)}
              onMouseLeave={onLeave(code)}>
              <span style={{ fontSize: 11 }}>{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {row2.map(({ code, flag, label }) => (
            <button key={code} onClick={() => onSelect(code)}
              style={chipStyle(currentLang === code)}
              onMouseEnter={onEnter(code)}
              onMouseLeave={onLeave(code)}>
              <span style={{ fontSize: 11 }}>{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
