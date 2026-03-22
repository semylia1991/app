import React from 'react';
import { Language } from '../i18n';
 
interface Props {
  currentLang: Language;
  onSelect: (lang: Language) => void;
}
 
const LANGUAGES: { code: Language; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'de', flag: '🇩🇪', label: 'DE' },
  { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'uk', flag: '🇺🇦', label: 'UA' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'it', flag: '🇮🇹', label: 'IT' },
  { code: 'tr', flag: '🇹🇷', label: 'TR' },
  { code: 'ar', flag: '🇸🇦', label: 'AR' },
];
 
export function LanguageSelector({ currentLang, onSelect }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-1">
        {LANGUAGES.map(({ code, flag, label }) => (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all
              ${currentLang === code
                ? 'bg-[#2C3E50] text-white shadow-md'
                : 'bg-[#B89F7A]/10 text-[#B89F7A] hover:bg-[#B89F7A]/20 hover:text-[#2C3E50]'
              }`}
          >
            <span className="text-sm leading-none">{flag}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

