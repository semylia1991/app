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

// ── Хэш состава (вторичный ключ дедупликации, вариант 4) ──────────────────────
//
// Stable SHA-256 over the SORTED, normalized, de-duplicated ingredient names.
// Unlike the image hash (sensitive to angle/light) and the name key (sensitive
// to AI naming drift), the composition is the product's true "fingerprint":
// two photos of the same label yield the same ingredient set → the same hash.
//
// This is a POST-AI key — it needs the ingredient list, which only exists after
// analyzeFast. It cannot skip the AI call; its job is to DEDUPE cards so a
// repeat scan whose product name drifted ("Cream" vs "Lotion") still maps to
// the one canonical card instead of spawning a divergent one.
//
// Returns null for empty input or on error (caller skips the key gracefully).
export async function computeIngredientsHash(
  ingredients: Array<{ name: string }>,
): Promise<string | null> {
  try {
    if (!ingredients || ingredients.length === 0) return null;
    const canonical = Array.from(
      new Set(
        ingredients
          .map(i => normalizeIngredientName(i.name))
          .filter(Boolean),
      ),
    ).sort();
    if (canonical.length === 0) return null;
    const joined = canonical.join('|');
    const bytes = new TextEncoder().encode(joined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (e) {
    console.warn('[cache] computeIngredientsHash failed:', e);
    return null;
  }
}

// ── Cache key (по имени продукта) ─────────────────────────────────────────────

/**
 * Normalise a brand or product name for cache-key matching.
 *
 * Improvements over the original single-pass regex:
 *  - Strip diacritics (é→e, ö→o) so "L'Oréal" == "Loreal"
 *  - Remove apostrophes/curly-quotes
 *  - Collapse hyphens and dots to spaces (La Roche-Posay == La Roche Posay,
 *    Dr. Jart == Dr Jart)
 *  - For brands: also collapse + and & (Dr. Jart+ == Dr Jart)
 *  - For product names: strip volume suffixes like (30ml) / (50g) but keep %
 *    and + which are semantically significant (Niacinamide 10% + Zinc 1%)
 */
function normCacheSegment(s: string, type: 'brand' | 'name'): string {
  let r = s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // diacritics: é→e
    .replace(/['''`]/g, '')                            // apostrophes
    .replace(/[-\.]+/g, ' ');                          // hyphens/dots → space

  if (type === 'brand') {
    r = r.replace(/[+&]+/g, ' ');                      // Dr. Jart+ → dr jart
  } else {
    // strip volume/size suffixes in parentheses: (30ml), (50g), (EU)
    r = r.replace(/\s*\(\s*\d+\s*(?:ml|g|oz|fl\.?oz|мл|гр?)\.?\s*\)/gi, '');
    r = r.replace(/\s*\(\s*(?:EU|UK|US|DE|INT)\s*\)/gi, '');
    r = r.replace(/\s*\+\s*/g, '+');                   // normalise spaces around +
  }

  return r.replace(/\s+/g, ' ').trim();
}

/**
 * Remove a duplicated brand from the head of the (normalized) product name.
 * The AI occasionally packs the brand into productName ("CeraVe Moisturizing
 * Cream" with brand="CeraVe" — or with brand="" on another scan). Stripping the
 * duplicate deterministically makes both layouts produce the SAME key, without
 * relying on the AI to follow the prompt rule. Inputs must already be
 * normCacheSegment-normalized. If stripping would leave an empty name (the
 * name IS the brand), the original is kept.
 */
function stripBrandFromName(nBrand: string, nName: string): string {
  if (!nBrand || !nName || nName === nBrand) return nName;
  if (nName.startsWith(nBrand + ' ')) {
    const stripped = nName.slice(nBrand.length + 1).trim();
    return stripped || nName;
  }
  return nName;
}

export function buildCacheKey(productName: string, brand: string, lang: string): string {
  const nBrand = normCacheSegment(brand, 'brand');
  const nName  = stripBrandFromName(nBrand, normCacheSegment(productName, 'name'));
  return `${nBrand}|${nName}|${lang}`;
}

// ── Frozen translations (общий перевод свободного текста) ─────────────────────
//
// Language-INDEPENDENT product key: brand|name, normalized the same way as the
// name cache. Used to store one frozen translation per language per product, so
// every user in a given language sees the SAME translation and nobody re-pays
// for a Gemini translate call once the first user has triggered it.
export function canonicalProductKey(brand: string, productName: string): string | null {
  const b = normCacheSegment(brand, 'brand');
  const n = stripBrandFromName(b, normCacheSegment(productName, 'name'));
  if (!b || !n) return null;
  return `${b}|${n}`;
}

// Free-text payload of a translated card (everything except ingredients, which
// are localized separately by hydrate(), and except personal/transient fields).
type TranslatedPayload = Omit<AnalysisResult, 'ingredients' | 'personalNote' | 'shopLinks' | '_imageHash'>;

// Read a frozen translation for (product, lang). Returns null on miss.
export async function getFrozenTranslation(
  productKey: string,
  langCode: string,
): Promise<TranslatedPayload | null> {
  if (!productKey || langCode === 'en') return null; // 'en' is the source — no translation row
  try {
    const { data, error } = await supabase.rpc('get_translation', {
      p_cache_key: productKey,
      p_lang:      langCode,
    });
    if (error || !data) return null;
    console.log('[translation] FROZEN HIT:', productKey, langCode);
    return data as TranslatedPayload;
  } catch (e) {
    console.warn('[translation] get error:', e);
    return null;
  }
}

// Freeze a translation for (product, lang). First writer wins (ON CONFLICT DO
// NOTHING in SQL) — so the translation, once set, is stable for all users.
export async function saveFrozenTranslation(
  productKey: string,
  langCode: string,
  payload: TranslatedPayload,
): Promise<void> {
  if (!productKey || langCode === 'en') return;
  // Defensive strip of any personal/transient fields that must never be shared.
  const { personalNote, shopLinks, _imageHash, ...clean } =
    payload as TranslatedPayload & { personalNote?: unknown; shopLinks?: unknown; _imageHash?: unknown };
  void personalNote; void shopLinks; void _imageHash;
  try {
    const { error } = await supabase.rpc('save_translation', {
      p_cache_key: productKey,
      p_lang:      langCode,
      p_payload:   clean,
    });
    if (error) console.warn('[translation] save error:', error.message);
    else console.log('[translation] FROZEN:', productKey, langCode);
  } catch (e) {
    console.warn('[translation] save exception:', e);
  }
}

// ── Frozen personal texts (personalNote / AI criteria) ────────────────────────
//
// Generic first-writer-wins store for per-profile AI texts. The caller builds
// the key: `${kind}|${ingredientsHash}|${profileKey}|${lang}` — everything the
// text depends on. Same product + same profile + same language → same wording,
// forever, with no repeat Gemini call.
export async function getFrozenPersonalText<T>(key: string): Promise<T | null> {
  if (!key) return null;
  try {
    const { data, error } = await supabase.rpc('get_personal_text', { p_key: key });
    if (error || !data) return null;
    console.log('[personal_texts] FROZEN HIT:', key.slice(0, 40) + '…');
    return data as T;
  } catch (e) {
    console.warn('[personal_texts] get error:', e);
    return null;
  }
}

export async function saveFrozenPersonalText(key: string, payload: unknown): Promise<void> {
  if (!key || payload == null) return;
  try {
    const { error } = await supabase.rpc('save_personal_text', { p_key: key, p_payload: payload });
    if (error) console.warn('[personal_texts] save error:', error.message);
    else console.log('[personal_texts] FROZEN:', key.slice(0, 40) + '…');
  } catch (e) {
    console.warn('[personal_texts] save exception:', e);
  }
}

/**
 * Normalise an INCI ingredient name for canonical score matching.
 * Exported so App.tsx and other consumers can apply the same logic.
 */
export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\/.*$/, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

// ── Уровень 1.6: поиск по хэшу состава (вторичный ключ, вариант 4) ────────────
//
// Finds an existing card whose ingredient composition matches, regardless of
// how the product was named this time. Dedupes repeat scans with drifted names.
// Mirrors getCachedByHash: one indexed SELECT, then hydrate() for the language.
export async function getCachedByIngredients(
  ingredientsHash: string,
  lang: string,
): Promise<AnalysisResult | null> {
  if (!ingredientsHash) return null;
  try {
    const { data, error } = await supabase.rpc('get_cached_by_ingredients', {
      p_ingredients_hash: ingredientsHash,
      p_lang: lang,
    });
    if (error || !data) return null;
    console.log('[cache] INGREDIENTS HIT:', ingredientsHash.slice(0, 12) + '…');
    return await hydrate(data as AnalysisResult, toLangCode(lang));
  } catch (e) {
    console.warn('[cache] ingredients lookup error:', e);
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

  const { personalNote, shopLinks, canonicalScore, ...cacheable } = result;
  void personalNote; void shopLinks; void canonicalScore;
  // canonicalScore is intentionally NOT persisted in product_cache: its single
  // source of truth is product_scores, re-attached at runtime on every read.
  // Persisting it here would leave a stale copy if product_scores is rebuilt.

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

  // Variant 4: compute the composition hash from the FULL ingredient list
  // (use the original result, not the description-stripped copy — names are the
  // same either way, but this keeps intent clear). Stored so future scans with
  // a drifted product name can still find this exact card.
  const ingredientsHash = await computeIngredientsHash(result.ingredients);

  try {
    const { error } = await supabase.rpc('cache_product', {
      p_cache_key:        cacheKey,
      p_product_name:     productName,
      p_brand:            brand,
      p_lang:             lang,
      p_result:           cacheable,
      p_image_hash:       imageHash ?? null,
      p_ingredients_hash: ingredientsHash ?? null,
    });
    if (error) console.warn('[cache] write error:', error.message);
    else console.log('[cache] SAVED:', cacheKey);
  } catch (e) {
    console.warn('[cache] write exception:', e);
  }
}

// ── Canonical product score ──────────────────────────────────────────────────
// Fetches the authoritative score from product_scores table.
// Returns null if this product has never been scored before.
export async function getCanonicalScore(
  brand: string,
  productName: string,
): Promise<{ score: number; ingredients: Array<{ name: string; status: string; score: number }> } | null> {
  if (!brand || !productName) return null;
  // Normalize with the SAME rules as the name cache (normCacheSegment) so the
  // canonical-by-name lookup is just as tolerant to AI naming drift (case,
  // diacritics, apostrophes, hyphens, volume/region suffixes). Read and write
  // both normalize, so the keys always agree.
  const nBrand = normCacheSegment(brand, 'brand');
  const nName  = stripBrandFromName(nBrand, normCacheSegment(productName, 'name'));
  if (!nBrand || !nName) return null;
  try {
    const { data, error } = await supabase.rpc('get_product_score', {
      p_brand:        nBrand,
      p_product_name: nName,
    });
    if (error || !data || !data.length) return null;
    const row = data[0];
    return {
      score:       Number(row.score),
      ingredients: (row.ingredients ?? []) as Array<{ name: string; status: string; score: number }>,
    };
  } catch (e) {
    console.warn('[product_scores] get failed:', e);
    return null;
  }
}

// Saves the canonical score on FIRST scan only (INSERT ... ON CONFLICT DO NOTHING).
// Subsequent calls for the same product are no-ops — first writer wins.
export async function saveCanonicalScore(
  brand: string,
  productName: string,
  score: number,
  ingredients: Array<{ name: string; status: string; score: number }>,
  ingredientsHash?: string | null,
): Promise<void> {
  if (!brand || !productName || score == null) return;
  // Normalize key with the SAME rules used on read (getCanonicalScore) and by
  // the name cache, so "CeraVe" and "cerave" map to one canonical row.
  const nBrand = normCacheSegment(brand, 'brand');
  const nName  = stripBrandFromName(nBrand, normCacheSegment(productName, 'name'));
  if (!nBrand || !nName) return;
  // Strip descriptions before storing — language-agnostic
  const stripped = ingredients.map(({ name, status, score: s }) => ({ name, status, score: s }));
  try {
    const { error } = await supabase.rpc('save_product_score', {
      p_brand:            nBrand,
      p_product_name:     nName,
      p_score:            score,
      p_ingredients:      stripped,
      p_ingredients_hash: ingredientsHash ?? null,
    });
    if (error) console.warn('[product_scores] save error:', error.message);
    else console.log('[product_scores] SAVED:', nBrand, nName, score);
  } catch (e) {
    console.warn('[product_scores] save exception:', e);
  }
}

// ── Canonical score by COMPOSITION (idea #3) ──────────────────────────────────
//
// Finds the frozen canonical row whose ingredient set matches, regardless of
// what the AI named the product this time. This is the score-side twin of
// getCachedByIngredients: even a full name drift cannot split the product into
// two canonical rows with different scores.
export async function getCanonicalScoreByIngredients(
  ingredientsHash: string,
): Promise<{ score: number; ingredients: Array<{ name: string; status: string; score: number }> } | null> {
  if (!ingredientsHash) return null;
  try {
    const { data, error } = await supabase.rpc('get_product_score_by_ingredients', {
      p_ingredients_hash: ingredientsHash,
    });
    if (error || !data) return null;
    console.log('[product_scores] INGREDIENTS HIT:', ingredientsHash.slice(0, 12) + '…');
    return data as { score: number; ingredients: Array<{ name: string; status: string; score: number }> };
  } catch (e) {
    console.warn('[product_scores] ingredients lookup error:', e);
    return null;
  }
}
