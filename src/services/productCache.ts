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
import { getDescription, robustLookupIngredient, type LangCode } from '../lib/ingredients-db';

// ── Tier 1.5: Supabase community cache of rare ingredients ──────────────────
// For ingredients NOT in the local DB, we consult an ingredient_extras table
// that is auto-populated from AI scans. Cross-session, cross-user.
// Cached in memory per session to avoid repeated queries.
interface ExtraRow {
  inci_name:   string;
  status:      '🟢' | '🟡' | '🔴';  // matches SQL CHECK constraint
  score:       number;
  description: string;
}
const extrasMemoryCache = new Map<string, ExtraRow>(); // key = `${name}|${lang}`

async function fetchExtrasFromSupabase(
  names: string[],
  langCode: string,
): Promise<Map<string, ExtraRow>> {
  const result = new Map<string, ExtraRow>();
  if (names.length === 0) return result;

  // Check memory cache first
  const toFetch: string[] = [];
  for (const n of names) {
    const cached = extrasMemoryCache.get(`${n}|${langCode}`);
    if (cached) result.set(n, cached);
    else toFetch.push(n);
  }
  if (toFetch.length === 0) return result;

  try {
    const { data, error } = await supabase.rpc('get_ingredient_extras', {
      p_names: toFetch,
      p_lang:  langCode,
    });
    if (error || !data) return result;
    for (const row of data as ExtraRow[]) {
      if (row?.inci_name) {
        extrasMemoryCache.set(`${row.inci_name}|${langCode}`, row);
        result.set(row.inci_name, row);
      }
    }
  } catch (e) {
    console.warn('[ingredient_extras] client fetch failed:', e);
  }
  return result;
}


// Hydrate cached results: score + localized description from local DB ─────
//
// Cached results store ingredient NAMES + status/score, but the description
// is intentionally NOT stored (or may be from a different language than the
// user is currently viewing in). This function fills in / refreshes the
// description for the requested language WITHOUT any AI call — making
// language switches on cached scans nearly free.
//
// Also handles backward-compat: older rows written before `score` existed,
// or with non-canonical names like "Aqua/Water" or "Aqua (Water)".
export async function hydrate(result: AnalysisResult, langCode: LangCode = 'en'): Promise<AnalysisResult> {
  if (!result?.ingredients) return result;

  // ── Pass 1: try L0 (local DB). Collect L0 misses for batch L1 lookup. ───
  const passOne = result.ingredients.map((ing) => {
    const { entry, canonicalKey } = robustLookupIngredient(ing.name);
    return { ing, entry, canonicalKey };
  });

  const missingNames = passOne
    .filter(p => !p.entry && p.ing.name)
    .map(p => p.ing.name.toLowerCase().trim());

  // ── L1: batch fetch unknowns from Supabase community cache ──────────────
  const extras = missingNames.length > 0
    ? await fetchExtrasFromSupabase([...new Set(missingNames)], langCode)
    : new Map<string, ExtraRow>();

  // ── Pass 2: build final list ────────────────────────────────────────────
  let mutated = false;
  const ingredients = passOne.map(({ ing, entry, canonicalKey }) => {
    // L0 hit
    if (entry) {
      const score       = entry.score;
      const description = getDescription(entry, langCode);
      const status      = entry.status;
      const name        = canonicalKey ?? ing.name;
      if (score === ing.score && description === ing.description
          && status === ing.status && name === ing.name) return ing;
      mutated = true;
      return { ...ing, name, status, score, description };
    }

    // L1 hit (Supabase community cache)
    const extra = extras.get(ing.name.toLowerCase().trim());
    if (extra) {
      mutated = true;
      return {
        ...ing,
        // Don't overwrite name — community-cache rows already use canonical
        status:      extra.status,
        score:       extra.score,
        description: extra.description || ing.description || '',
      };
    }

    // L2 — nothing found anywhere. Use whatever was cached/AI-supplied.
    let score: number;
    if (typeof ing.score === 'number') score = ing.score;
    else score = ing.status === '🟢' ? 8 : ing.status === '🟡' ? 5 : 1;
    if (score === ing.score) return ing;
    mutated = true;
    return { ...ing, score };
  });
  return mutated ? { ...result, ingredients } : result;
}

// Map our 8 supported language codes
export function toLangCode(lang: string): LangCode {
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
    return await hydrate(data as AnalysisResult, toLangCode(lang));
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
    return await hydrate(data.result as AnalysisResult, toLangCode(lang));
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
    const { entry } = robustLookupIngredient(ing.name);
    return entry ? { ...ing, description: '' } : ing;
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
