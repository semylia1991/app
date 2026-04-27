// src/i18n/index.ts
// Replaces the monolithic src/i18n.ts.
//
// Usage (same as before in all components):
//   import { t, Language } from '../i18n';
//   const label = t[lang].title;              // ← sync, always works
//
// How it works:
//   - The user's language is loaded eagerly on startup (one chunk, ~11 KB).
//   - Every other language is loaded lazily via dynamic import when the user
//     switches, then cached — never fetched again.
//   - `t` is a Proxy so t[lang].title always reads the latest loaded locale.

import type { Translations } from './types';

export type { Translations };
export type Language = 'en' | 'ru' | 'de' | 'uk' | 'es' | 'fr' | 'it' | 'tr';

// ── Loaders ───────────────────────────────────────────────────────────────────
// Vite/webpack split each import() into its own chunk automatically.

const loaders: Record<Language, () => Promise<{ default: Translations }>> = {
  en: () => import('./en'),
  ru: () => import('./ru'),
  de: () => import('./de'),
  uk: () => import('./uk'),
  es: () => import('./es'),
  fr: () => import('./fr'),
  it: () => import('./it'),
  tr: () => import('./tr'),
};

// ── In-memory cache ───────────────────────────────────────────────────────────

const cache: Partial<Record<Language, Translations>> = {};

// Detect the initial language exactly the same way App.tsx does.
const SUPPORTED: Language[] = ['en', 'ru', 'de', 'uk', 'es', 'fr', 'it', 'tr'];

function detectInitialLang(): Language {
  const saved = localStorage.getItem('lang') as Language | null;
  if (saved && SUPPORTED.includes(saved)) return saved;
  const browser = navigator.language.slice(0, 2).toLowerCase() as Language;
  return SUPPORTED.includes(browser) ? browser : 'en';
}

// ── Eager load of the startup language ────────────────────────────────────────
// We start loading immediately so the first render has translations ready.
// The module is tiny (~11 KB) so it resolves before React mounts in practice.

let _ready = false;
let _readyResolve!: () => void;
const readyPromise = new Promise<void>(res => { _readyResolve = res; });

const initialLang = detectInitialLang();

loaders[initialLang]().then(mod => {
  cache[initialLang] = mod.default;
  _ready = true;
  _readyResolve();
});

// ── Proxy: t[lang].key always returns from cache ──────────────────────────────
// Falls back to English if a locale isn't loaded yet (should never happen in
// practice because loadLanguage() is always awaited before setLang()).

export const t = new Proxy({} as Record<Language, Translations>, {
  get(_target, lang: string) {
    return cache[lang as Language] ?? cache['en'] ?? ({} as Translations);
  },
});

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Ensure a locale is loaded and cached.
 * Call this before updating the `lang` state in App.tsx.
 *
 * @example
 *   await loadLanguage('de');
 *   setLang('de');
 */
export async function loadLanguage(lang: Language): Promise<void> {
  if (cache[lang]) return;           // already loaded
  const mod = await loaders[lang]();
  cache[lang] = mod.default;
}

/**
 * Resolves when the initial language is ready.
 * Await this in App.tsx before first render if you need guaranteed translations.
 */
export const i18nReady: Promise<void> = readyPromise;
