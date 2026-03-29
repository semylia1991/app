import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Language } from '../i18n';
import { ShopLink } from '../services/ai';

interface Props {
  lang: Language;
  shopLinks: ShopLink[];
}

const BUTTON_LABEL: Record<Language, string> = {
  en: 'Search on Google Shopping',
  ru: 'Найти в Google Покупках',
  de: 'Bei Google Shopping suchen',
  uk: 'Шукати в Google Shopping',
  es: 'Buscar en Google Shopping',
  fr: 'Rechercher sur Google Shopping',
  it: 'Cerca su Google Shopping',
  tr: "Google Shopping'da ara",
};

const DISCLAIMER: Record<Language, string> = {
  en: 'Opens Google Shopping — compare prices from all stores.',
  ru: 'Открывает Google Покупки — сравните цены во всех магазинах.',
  de: 'Öffnet Google Shopping — Preise aller Shops vergleichen.',
  uk: 'Відкриває Google Shopping — порівняйте ціни у всіх магазинах.',
  es: 'Abre Google Shopping — compara precios de todas las tiendas.',
  fr: 'Ouvre Google Shopping — comparez les prix de tous les magasins.',
  it: 'Apre Google Shopping — confronta i prezzi di tutti i negozi.',
  tr: "Google Shopping'ı açar — tüm mağazaların fiyatlarını karşılaştırın.",
};

export function WhereToBuy({ lang, shopLinks }: Props) {
  // Use the first link (Google Shopping)
  const shop = shopLinks?.[0];
  if (!shop) return null;

  return (
    <div className="space-y-2">
      <a
        href={shop.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-[#D4C3A3]/60 rounded-sm hover:bg-[#B89F7A]/5 hover:border-[#B89F7A]/40 transition-all group"
      >
        <img
          src={shop.favicon}
          alt="Google"
          className="w-4 h-4 object-contain"
        />
        <span className="text-xs font-semibold text-[#2C3E50] tracking-wide">
          {BUTTON_LABEL[lang] ?? BUTTON_LABEL['en']}
        </span>
        <ExternalLink size={12} className="text-[#B89F7A]/40 group-hover:text-[#B89F7A] transition-colors" />
      </a>
      <p className="text-[10px] text-[#B89F7A]/60 text-center leading-relaxed">
        {DISCLAIMER[lang] ?? DISCLAIMER['en']}
      </p>
    </div>
  );
}
