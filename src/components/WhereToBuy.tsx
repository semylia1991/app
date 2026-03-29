import React from 'react';
import { ExternalLink, ShoppingCart } from 'lucide-react';
import { Language } from '../i18n';
import { ShopLink } from '../services/ai';

interface Props {
  lang: Language;
  shopLinks: ShopLink[];
}

const DISCLAIMER: Record<Language, string> = {
  en: 'Links open search results on external sites.',
  ru: 'Ссылки ведут на результаты поиска на внешних сайтах.',
  de: 'Links führen zu Suchergebnissen auf externen Seiten.',
  uk: 'Посилання ведуть на результати пошуку на зовнішніх сайтах.',
  es: 'Los enlaces abren resultados de búsqueda en sitios externos.',
  fr: 'Les liens ouvrent des résultats de recherche sur des sites externes.',
  it: 'I link aprono risultati di ricerca su siti esterni.',
  tr: 'Bağlantılar harici sitelerdeki arama sonuçlarını açar.',
};

export function WhereToBuy({ lang, shopLinks }: Props) {
  if (!shopLinks?.length) return null;

  return (
    <div className="space-y-1.5">
      {shopLinks.map((shop, i) => (
        <a
          key={i}
          href={shop.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 py-2.5 px-3 border border-[#D4C3A3]/40 rounded-sm hover:bg-[#B89F7A]/5 hover:border-[#B89F7A]/40 transition-all group"
        >
          <div className="w-5 h-5 shrink-0 flex items-center justify-center">
            <img
              src={shop.favicon}
              alt={shop.platform}
              className="w-4 h-4 object-contain"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                const icon = document.createElement('span');
                icon.style.fontSize = '14px';
                icon.textContent = '🛒';
                el.parentNode?.appendChild(icon);
              }}
            />
          </div>

          <span className="text-xs font-semibold text-[#2C3E50] flex-1">
            {shop.platform}
          </span>

          <ExternalLink
            size={12}
            className="text-[#B89F7A]/40 group-hover:text-[#B89F7A] transition-colors shrink-0"
          />
        </a>
      ))}

      <p className="text-[10px] text-[#B89F7A]/60 pt-1 leading-relaxed">
        {DISCLAIMER[lang] ?? DISCLAIMER['en']}
      </p>
    </div>
  );
}
