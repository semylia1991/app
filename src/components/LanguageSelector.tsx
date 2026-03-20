import React from 'react';
import { Language } from '../i18n';
import { Sparkles } from 'lucide-react';
 
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
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-[#B89F7A]">
        <div className="relative">
          <Sparkles size={24} strokeWidth={1.5} />
          <span className="absolute -top-1 -right-1 text-[10px] font-bold">+</span>
          <span className="absolute -bottom-1 -left-1 text-[10px] font-bold">-</span>
        </div>
      </div>
 
      <div className="flex flex-wrap gap-1 justify-center">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            className={`flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-serif tracking-wider transition-colors border ${
              currentLang === lang.code
                ? 'border-[#B89F7A] text-[#2C3E50] bg-[#B89F7A]/10 font-semibold'
                : 'border-transparent text-[#B89F7A] hover:text-[#2C3E50] hover:border-[#D4C3A3]'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
