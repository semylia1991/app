import React from 'react';
import { Language } from '../i18n';
import { Sparkles } from 'lucide-react';

interface Props {
  currentLang: Language;
  onSelect: (lang: Language) => void;
}

export function LanguageSelector({ currentLang, onSelect }: Props) {
  return (
    <div className="flex items-center justify-center gap-6">
      <div className="flex items-center gap-2 text-[#B89F7A]">
        <div className="relative">
          <Sparkles size={24} strokeWidth={1.5} />
          <span className="absolute -top-1 -right-1 text-[10px] font-bold">+</span>
          <span className="absolute -bottom-1 -left-1 text-[10px] font-bold">-</span>
        </div>
      </div>
      
      <div className="flex gap-4 justify-center text-sm font-serif tracking-widest text-[#B89F7A]">
        <button 
          onClick={() => onSelect('en')}
          className={`hover:text-[#2C3E50] transition-colors ${currentLang === 'en' ? 'text-[#2C3E50] font-semibold' : ''}`}
        >
          ENGLISH
        </button>
        <span>|</span>
        <button 
          onClick={() => onSelect('ru')}
          className={`hover:text-[#2C3E50] transition-colors ${currentLang === 'ru' ? 'text-[#2C3E50] font-semibold' : ''}`}
        >
          РУССКИЙ
        </button>
        <span>|</span>
        <button 
          onClick={() => onSelect('de')}
          className={`hover:text-[#2C3E50] transition-colors ${currentLang === 'de' ? 'text-[#2C3E50] font-semibold' : ''}`}
        >
          DEUTSCH
        </button>
      </div>
    </div>
  );
}
