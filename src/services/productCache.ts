/**
 * services/productCache.ts
 *
 * Двухуровневый кэш:
 *   1. image_hash  — мгновенный (~0.1s): SHA-256 от сжатого изображения.
 *                    Не требует identify. Сработает если тот же снимок сканировали раньше.
 *   2. cache_key   — по имени продукта+бренду+языку (как раньше).
 *                    Сработает если продукт сканировали с другого угла/устройства.
 *
 * personalNote и shopLinks НЕ кэшируются — зависят от профиля/клиента.
 */

import { supabase } from '../lib/supabase';
import type { AnalysisResult } from './ai';
import { lookupIngredient, getDescription, type LangCode } from '../lib/ingredients-db';

// ── Hydrate cached results: score + localized description from local DB ─────
//
// Cached results store ingredient NAMES + status/score, but the description
// is intentionally NOT stored (or may be from a different language than the
// user is currently viewing in). This function fills in / refreshes the
// description for the requested language WITHOUT any AI call — making
// language switches on cached scans nearly free.
//
// Also handles backward-compat: older rows written before `score` existed.
function hydrate(result: AnalysisResult, langCode: LangCode = 'en'): AnalysisResult {
  if (!result?.ingredients) return result;
  let mutated = false;
  const ingredients = result.ingredients.map((ing) => {
    const entry = lookupIngredient(ing.name);

    // Decide score (DB authoritative > existing > status fallback)
    let score: number;
    if (entry) {
      score = entry.score;
    } else if (typeof ing.score === 'number') {
      score = ing.score;
    } else {
      score = ing.status === '🟢' ? 8 : ing.status === '🟡' ? 5 : 1;
    }

    // Decide description (DB localized for current language is best;
    // unknown ingredients keep whatever was there — empty or AI-generated)
    const description = entry
      ? getDescription(entry, langCode)
      : (ing.description ?? '');

    // Decide status (DB authoritative for known ingredients)
    const status = entry ? entry.status : ing.status;

    if (
      score === ing.score
      && description === ing.description
      && status === ing.status
    ) {
      return ing;
    }
    mutated = true;
    return { ...ing, status, score, description };
  });
  return mutated ? { ...result, ingredients } : result;
}

// Map our 8 supported language codes
function toLangCode(lang: string): LangCode {
  const c = lang.toLowerCase().slice(0, 2);
  if (c === 'en' || c === 'ru' || c === 'de' || c === 'uk' ||
      c === 'es' || c === 'fr' || c === 'it' || c === 'tr') {
    return c as LangCode;
  }
  return 'en';
}

// ── Хэш изображения ──────────────────────────────────────────────────────────

/**
 * SHA-256 от base64-строки изображения. Работает в браузере через Web Crypto API.
 * Возвращает hex-строку (64 символа). При ошибке возвращает null — не ломаем поток.
 */
export async function hashImage(base64: string): Promise<string | null> {
  try {
    // Берём только данные (без "data:image/jpeg;base64,")
    const data = base64.includes(',') ? base64.split(',')[1] : base64;
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.warn('[cache] hashImage failed:', e);
    return null;
  }
}

// ── Cache key (по имени продукта) ─────────────────────────────────────────────

export function buildCacheKey(productName: string, brand: string, lang: string): string {
  const norm = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/^[^\w]+|[^\w]+$/g, '');
  return `${norm(brand)}|${norm(productName)}|${lang}`;
}

// ── Уровень 1: поиск по image_hash ───────────────────────────────────────────

/**
 * Быстрый поиск по хэшу изображения. Не требует identify.
 * ~0.1s — один SELECT по индексированной колонке.
 */
export async function getCachedByHash(
  imageHash: string,
  lang: string,
): Promise<AnalysisResult | null> {
  try {
    const { data, error } = await supabase.rpc('get_cached_by_hash', {
      p_image_hash: imageHash,
      p_lang: lang,
    });
    if (error || !data) return null;
    console.log('[cache] HASH HIT:', imageHash.slice(0, 12) + '…');
    return hydrate(data as AnalysisResult, toLangCode(lang));
  } catch (e) {
    console.warn('[cache] hash lookup error:', e);
    return null;
  }
}

// ── Уровень 2: поиск по имени продукта ───────────────────────────────────────

export async function getCachedAnalysis(
  productName: string,
  brand: string,
  lang: string,
): Promise<AnalysisResult | null> {
  if (!productName || !brand) return null;
  const cacheKey = buildCacheKey(productName, brand, lang);

  try {
    const { data, error } = await supabase
      .from('product_cache')
      .select('result')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error || !data) return null;

    supabase.rpc('cache_hit', { p_cache_key: cacheKey }).then(
      () => {},
      (e: unknown) => console.warn('[cache] cache_hit rpc failed:', e),
    );

    console.log('[cache] NAME HIT:', cacheKey);
    return hydrate(data.result as AnalysisResult, toLangCode(lang));
  } catch (e) {
    console.warn('[cache] read error:', e);
    return null;
  }
}

// ── Сохранение в кэш ─────────────────────────────────────────────────────────

export async function saveToCache(
  productName: string,
  brand: string,
  lang: string,
  result: AnalysisResult,
  imageHash?: string | null,
): Promise<void> {
  if (!productName || !brand) return;
  const cacheKey = buildCacheKey(productName, brand, lang);

  const { personalNote, shopLinks, ...cacheable } = result;
  void personalNote; void shopLinks;

  // ── Strip ingredient descriptions before storing ───────────────────────────
  // Descriptions are language-specific. By dropping them for KNOWN ingredients
  // (those in our local DB), the cache row becomes truly language-agnostic —
  // the same record serves users of all 8 languages. On read, hydrate()
  // refills descriptions from the local DB for the requested language.
  // For ingredients NOT in the local DB, we KEEP the description (best effort)
  // so the user sees something rather than nothing on cache hit, even if
  // it's in another language. The IngredientItem will lazy-fetch a fresh
  // description in the user's language on click via fetchIngredientDescription.
  cacheable.ingredients = cacheable.ingredients.map((ing) => {
    const inDb = !!lookupIngredient(ing.name);
    return inDb ? { ...ing, description: '' } : ing;
  });

  try {
    const { error } = await supabase.rpc('cache_product', {
      p_cache_key:    cacheKey,
      p_product_name: productName,
      p_brand:        brand,
      p_lang:         lang,
      p_result:       cacheable,
      p_image_hash:   imageHash ?? null,
    });
    if (error) console.warn('[cache] write error:', error.message);
    else console.log('[cache] SAVED:', cacheKey);
  } catch (e) {
    console.warn('[cache] write exception:', e);
  }
}
