// All Gemini calls go through the Netlify Function /api/gemini.
// The API key is NEVER sent to the browser.

import { getCachedByHash, getCachedAnalysis, saveToCache, hashImage, hydrate, toLangCode, getCanonicalScore, saveCanonicalScore, getCachedByIngredients, computeIngredientsHash, canonicalProductKey, getFrozenTranslation, saveFrozenTranslation, getCanonicalScoreByIngredients, getFrozenPersonalText, saveFrozenPersonalText } from './productCache';
import { lookupIngredient } from '../lib/ingredients-db';
import { positionWeight } from '../lib/scoring';

const FUNCTION_URL = "/api/gemini";

/**
 * Normalise an INCI ingredient name for canonical score lookup.
 * Strips parenthetical synonyms, slash variants, and extra whitespace so
 * "Aqua (Water)", "Aqua/Water" and "aqua" all map to the same key.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\/.*$/, '')          // "Aqua/Water"   → "aqua"
    .replace(/\s*\(.*?\)\s*/g, ' ')   // "Aqua (Water)" → "aqua"
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rebuild an ingredient list from the authoritative product_scores row.
 *
 * The canonical row (name + status + score) is the single source of truth, so
 * EVERY scan of the same product shows an identical list and badge — regardless
 * of small variations in what the AI read this time. Descriptions are carried
 * over from the current ingredients by name match when available; any gaps are
 * refilled by hydrate() / the lazy per-ingredient fetch in the UI.
 *
 * Returns a NEW array; inputs are not mutated. If the canonical row is empty,
 * the original list is returned unchanged (defensive — never blank out a card).
 */
export function applyCanonicalCard(
  current: Ingredient[],
  canonical: { ingredients: Array<{ name: string; status: string; score: number }> },
): Ingredient[] {
  if (!canonical?.ingredients?.length) return current;

  // Map current descriptions by normalized name so we don't lose localized text.
  const descByName = new Map<string, string>();
  for (const ing of current ?? []) {
    if (ing.description) descByName.set(normalizeName(ing.name), ing.description);
  }

  return canonical.ingredients.map(i => ({
    name:        i.name,
    status:      i.status as Ingredient['status'],
    score:       Number(i.score),
    description: descByName.get(normalizeName(i.name)) ?? '',
  }));
}

export interface Ingredient {
  name: string;
  status: "🟢" | "🟡" | "🔴";
  description: string;
  score?: number; // 0–10, Yuka-style
}

/**
 * Compute a Yuka-style product score (0–10) from ingredient list.
 * Position weight: first ingredients (highest concentration) count more.
 * 🟢 = 10, 🟡 = 5, 🔴 = 0 (from local DB)
 * For AI-only ingredients, use the score field if present.
 */
/**
 * Resolve the EFFECTIVE numeric score of one ingredient — the exact value
 * computeProductScore uses. Single source of the resolution chain:
 * explicit score → local DB → status fallback (🟢 8 / 🟡 5 / 🔴 1).
 * The canonical-score payload MUST use this same resolver, otherwise the
 * server-side validation (which recomputes the score from the payload)
 * would reject honest writes.
 */
export function effectiveIngredientScore(ing: { name: string; status: string; score?: number }): number {
  if (typeof ing.score === 'number') return ing.score;
  const dbEntry = lookupIngredient(ing.name);
  if (dbEntry) return dbEntry.score;
  return ing.status === '🟢' ? 8 : ing.status === '🟡' ? 5 : 1;
}

export function computeProductScore(ingredients: Ingredient[]): number | null {
  if (!ingredients || ingredients.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  ingredients.forEach((ing, idx) => {
    // Bucket-based position weight (top-5 / middle-5 / tail = 3 / 2 / 1):
    // permutations WITHIN a bucket cannot change the score — see lib/scoring.ts.
    const weight = positionWeight(idx);
    const s = effectiveIngredientScore(ing);
    weightedSum += s * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

export interface Alternative {
  name: string;
  brand: string;
  reason: string;
}

export interface ShopLink {
  platform: string;
  favicon: string;
  url: string;
}

export interface AnalysisResult {
  productName: string;
  brand: string;
  productType: string;
  analysis: string;
  ingredients: Ingredient[];
  usage: string;
  benefits: string;
  sideEffects: string;
  warnings: string;
  interactions: string;
  shelfLife: string;
  alternatives: Alternative[];
  // Populated client-side immediately after analysis — no extra API call
  shopLinks?: ShopLink[];
  // Optional: populated when userProfile is passed to analyzeProductImage
  personalNote?: string;
  // Optional: "Pay Attention" criteria — persisted to scan history
  criteria?: { emoji: string; label: string; explanation: string; ingredient?: string; relevant?: boolean }[];
  // Frozen product score from product_scores (single source of truth for the
  // badge). When present, the UI shows THIS number instead of recomputing from
  // the ingredient list — immune to any list drift along the way.
  canonicalScore?: number;
  // Internal: image hash for lazy details cache lookup (not persisted)
  _imageHash?: string | null;
}

// Subset returned by the fast first-paint request.
export interface AnalysisFastResult {
  productName: string;
  brand: string;
  productType: string;
  analysis: string;
  ingredients: Ingredient[];
  shelfLife: string;
  personalNote?: string;
}

// Subset returned by the deferred details request.
export interface AnalysisDetails {
  usage: string;
  benefits: string;
  sideEffects: string;
  warnings: string;
  interactions: string;
  alternatives: Alternative[];
}

// Serialised profile sent to the server (translated strings, not canonical keys)
export interface SerializedProfile {
  skinType?: string;
  skinSensitivity?: string;
  skinConditions?: string;
  ageRange?: string;
  hairType?: string;
  scalpCondition?: string;
  hairProblems?: string;
  bodySkinType?: string;
  climate?: string;
  allergies?: string;
}

async function callFunction<T>(body: object): Promise<T> {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function compressImage(base64: string): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else                { width  = Math.round((width  * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      resolve({ data: dataUrl, mimeType: "image/jpeg" });
    };
    img.src = base64;
  });
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ru: "Russian",
  de: "German",
  uk: "Ukrainian",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  tr: "Turkish",
};

async function identifyProduct(
  base64Image: string,
  mimeType: string,
): Promise<{ productName: string; brand: string }> {
  return callFunction<{ productName: string; brand: string }>({
    action: "identify",
    base64Image,
    mimeType,
  });
}

async function analyzeProductImageRaw(
  base64Image: string,
  mimeType: string,
  language: string,
  userProfile?: SerializedProfile,
): Promise<AnalysisResult> {
  return callFunction<AnalysisResult>({
    action: "analyze",
    base64Image,
    mimeType,
    language: LANGUAGE_NAMES[language] || "English",
    ...(userProfile && Object.values(userProfile).some(Boolean) ? { userProfile } : {}),
  });
}

/**
 * ГЛАВНАЯ функция — трёхуровневый кэш + параллельные запросы.
 *
 * Уровень 0 — image_hash (~0.1s, без Gemini):
 *   SHA-256 сжатого фото → SELECT по индексу → мгновенный возврат.
 *   Работает если тот же снимок уже сканировали.
 *
 * Уровень 1 — identify + analyze параллельно:
 *   Если хэш не совпал — запускаем identify и analyze одновременно.
 *   Как только identify готов — проверяем кэш по имени продукта.
 *   Кэш-хит  → возвращаем сразу, analyze игнорируем.
 *   Кэш-промах → ждём analyze (он уже почти готов).
 *
 * Уровень 2 — полный analyze (кэш-промах):
 *   Сохраняем с image_hash — следующий скан того же фото будет уровнем 0.
 */
export async function analyzeProductImage(
  base64Image: string,
  mimeType: string,
  language: string,
  userProfile?: SerializedProfile,
): Promise<AnalysisResult> {
  // ── Hash the ORIGINAL image (deterministic across runs) ─────────────────
  // See note in analyzeProductImageStream — canvas+JPEG re-encoding is not
  // deterministic and breaks the hash cache. Hash raw input.
  const imageHash = await hashImage(base64Image).catch(() => null);

  const compressed = await compressImage(base64Image);

  // ── Уровень 0: поиск по image_hash ────────────────────────────────────────

  if (imageHash) {
    const hashCached = await getCachedByHash(imageHash, language);
    if (hashCached) {
      if (userProfile && Object.values(userProfile).some(Boolean)) {
        try {
          const note = await generatePersonalNote(hashCached, userProfile, language);
          return { ...hashCached, personalNote: note };
        } catch (e) {
          console.warn('[ai] personalNote failed (hash hit):', e);
          return hashCached;
        }
      }
      return hashCached;
    }
  }

  // ── Уровень 1: identify + analyze параллельно ──────────────────────────────
  const identifyPromise = identifyProduct(compressed.data, compressed.mimeType).catch((e) => {
    console.warn('[ai] identify failed:', e);
    return null;
  });

  const analyzePromise = analyzeProductImageRaw(
    compressed.data,
    compressed.mimeType,
    language,
    userProfile,
  );

  // Ждём identify — он быстрее (~1.5s vs ~4s)
  const identification = await identifyPromise;

  if (identification?.productName && identification?.brand) {
    const cached = await getCachedAnalysis(
      identification.productName,
      identification.brand,
      language,
    );
    if (cached) {
      // Кэш-хит по имени — попутно привязываем image_hash к записи
      if (imageHash) {
        saveToCache(cached.productName, cached.brand, language, cached, imageHash).catch(() => {});
      }
      if (userProfile && Object.values(userProfile).some(Boolean)) {
        try {
          const note = await generatePersonalNote(cached, userProfile, language);
          return { ...cached, personalNote: note };
        } catch (e) {
          console.warn('[ai] personalNote failed (name hit):', e);
          return cached;
        }
      }
      return cached;
    }
  }

  // ── Уровень 2: кэш-промах — ждём analyze ──────────────────────────────────
  const fresh = await analyzePromise;

  if (fresh.productName && fresh.brand) {
    saveToCache(fresh.productName, fresh.brand, language, fresh, imageHash).catch((e) =>
      console.warn('[ai] cache save failed:', e),
    );
  }

  return fresh;
}

export async function translateAnalysisResult(
  result: AnalysisResult,
  targetLanguage: string,
): Promise<AnalysisResult> {
  const langCode = toLangCode(targetLanguage);

  // ── Strip ingredients from the translation payload ─────────────────────────
  // Ingredient descriptions come from the local DB / ingredient_extras on the
  // client side, so they don't need to go through AI translation. This shrinks
  // the request payload by ~50%, makes translation faster, and removes the risk
  // of AI dropping `score` / changing `status` emojis.
  // canonicalScore is a NUMBER, not text — it must never round-trip through the
  // translator (risk of being dropped) nor be taken from a frozen payload
  // (could be stale). We re-attach it from the source result at the end.
  const { ingredients, canonicalScore, ...toTranslate } = result;
  void ingredients;

  // Language-independent product key for the shared frozen-translation store.
  const productKey = canonicalProductKey(result.brand, result.productName);

  // ── 1. Try the GLOBAL frozen translation ───────────────────────────────────
  // If any user has already translated this product into this language, reuse
  // that exact text — consistent for everyone, and no Gemini call.
  let translated = productKey
    ? await getFrozenTranslation(productKey, langCode).catch(() => null)
    : null;

  // ── 2. Miss → translate via Gemini, then FREEZE (first writer wins) ─────────
  if (!translated) {
    translated = await callFunction<Omit<AnalysisResult, 'ingredients'>>({
      action: "translate",
      result: toTranslate,
      targetLanguage,
    });
    if (productKey) {
      saveFrozenTranslation(productKey, langCode, translated).catch(() => {});
    }
  }

  // ── 3. Re-localise ingredient descriptions for the new language ─────────────
  // hydrate() consults local DB (L0) first, then Supabase ingredient_extras (L1)
  // for unknown INCI. Ingredients are NEVER taken from the frozen payload.
  const fullResult: AnalysisResult = {
    ...translated,
    ingredients: result.ingredients,
    canonicalScore,
  };
  return await hydrate(fullResult, langCode);
}

/**
 * Fetch a one-sentence description for a single ingredient that's NOT in
 * the local DB. Called lazily when the user expands such an ingredient
 * in the UI. Result should be cached client-side per (name, language).
 */
export async function fetchIngredientDescription(
  ingredientName: string,
  language: string,
): Promise<string> {
  const data = await callFunction<{ description: string }>({
    action: 'ingredientDescription',
    ingredientName,
    language: LANGUAGE_NAMES[language] || language,
  });
  return data.description ?? '';
}

/**
 * Lazy explanation for ONE preference chip in the personal-note section.
 * Returns one short sentence (with trailing emoji) describing whether the
 * product is suitable for that specific preference.
 */
export async function fetchPreferenceExplanation(
  ingredients: Ingredient[],
  preference: string,
  language: string,
): Promise<string> {
  const data = await callFunction<{ explanation: string }>({
    action: 'explainPreference',
    ingredients: ingredients.map((i) => ({
      name: i.name,
      status: i.status,
      score: i.score,
    })),
    preference,
    language: LANGUAGE_NAMES[language] || language,
  });
  return data.explanation ?? '';
}

/**
 * Fetch a short ingredient-preference explanation (~12 words) for the
 * personal-score row expansion. Called lazily on row open.
 *
 * Example: ingredientName="Alcohol Denat", preferenceLabel="Dry skin"
 * → "Dries out skin barrier, worsens moisture loss for dry skin."
 */
export async function fetchIngredientPreferenceNote(
  ingredientName: string,
  preferenceLabel: string,
  language: string,
): Promise<string> {
  const data = await callFunction<{ note: string }>({
    action: 'ingredientPreferenceNote',
    ingredientName,
    preferenceLabel,
    language: LANGUAGE_NAMES[language] || language,
  });
  return data.note ?? '';
}

/**
 * Fetch details (usage/benefits/sideEffects/warnings/interactions/alternatives)
 * for a product that was already identified. Called lazily when the user
 * opens the «Product info» section.
 *
 * Strategy:
 *   1. Check product_cache (Supabase) — if full result already stored, return it.
 *   2. Otherwise run analyzeDetails AI request and save to cache.
 */
export async function fetchDetails(
  fast: AnalysisFastResult | AnalysisResult,
  language: string,
  imageHash?: string | null,
): Promise<AnalysisDetails> {
  // L1: check Supabase product_cache for already-stored full result
  const cached = await getCachedAnalysis(fast.productName, fast.brand, language).catch(() => null);
  if (cached?.usage || cached?.benefits) {
    console.log('[details] CACHE HIT:', fast.productName);
    return {
      usage:        cached.usage        ?? '',
      benefits:     cached.benefits     ?? '',
      sideEffects:  cached.sideEffects  ?? '',
      warnings:     cached.warnings     ?? '',
      interactions: cached.interactions ?? '',
      alternatives: cached.alternatives ?? [],
    };
  }

  // L2: run AI
  console.log('[details] AI fetch:', fast.productName);
  const details = await analyzeDetails(fast as AnalysisFastResult, language);

  // Save full result to cache so next open is instant
  const full: AnalysisResult = {
    productName: fast.productName,
    brand:       fast.brand,
    productType: fast.productType,
    analysis:    fast.analysis,
    ingredients: fast.ingredients,
    shelfLife:   fast.shelfLife,
    ...details,
  };
  const hash = imageHash ?? ('_imageHash' in fast ? fast._imageHash : null);
  saveToCache(fast.productName, fast.brand, language, full, hash).catch(() => {});

  return details;
}

export async function askFollowUpQuestion(
  question: string,
  context: AnalysisResult,
  language: string,
): Promise<string> {
  const data = await callFunction<{ answer: string }>({
    action: "ask",
    question,
    context,
    language,
  });
  return data.answer;
}

/**
 * Stable key of a serialized profile — FIXED field order, so the same profile
 * always yields the same key regardless of object property order.
 */
export function serializedProfileKey(p: SerializedProfile): string {
  return [
    p.skinType ?? '', p.skinSensitivity ?? '', p.skinConditions ?? '',
    p.ageRange ?? '', p.hairType ?? '', p.scalpCondition ?? '',
    p.hairProblems ?? '', p.bodySkinType ?? '', p.climate ?? '',
    p.allergies ?? '',
  ].join(',');
}

export async function generatePersonalNote(
  result: AnalysisResult,
  serializedProfile: SerializedProfile,
  language: string,
): Promise<string> {
  // ── Frozen note: same composition + same profile + same language → the exact
  // same wording on every repeat scan, and no repeat Gemini call. temperature 0
  // makes runs CLOSE, freezing makes them IDENTICAL.
  const ingHash = await computeIngredientsHash(result.ingredients ?? []).catch(() => null);
  const noteKey = ingHash
    ? `note|${ingHash}|${serializedProfileKey(serializedProfile)}|${toLangCode(language)}`
    : '';

  if (noteKey) {
    const frozen = await getFrozenPersonalText<{ note: string }>(noteKey).catch(() => null);
    if (frozen && typeof frozen.note === 'string' && frozen.note.length > 0) {
      return frozen.note;
    }
  }

  const data = await callFunction<{ personalNote: string }>({
    action: "personalNote",
    result,
    userProfile: serializedProfile,
    language: LANGUAGE_NAMES[language] || language,
  });
  const note = data.personalNote ?? "";
  if (noteKey && note) {
    saveFrozenPersonalText(noteKey, { note }).catch(() => {});
  }
  return note;
}

// ─── Two-stage analysis ─────────────────────────────────────────────────────
//
// analyzeFast:    fast first paint (productName, brand, analysis, ingredients,
//                 shelfLife, personalNote) — ~2–3s.
// analyzeDetails: deferred fields (usage, benefits, sideEffects, warnings,
//                 interactions, alternatives) — runs in the background while
//                 the user reads the first paint.

async function analyzeFastRaw(
  base64Image: string,
  mimeType: string,
  language: string,
  userProfile?: SerializedProfile,
): Promise<AnalysisFastResult> {
  return callFunction<AnalysisFastResult>({
    action: "analyzeFast",
    base64Image,
    mimeType,
    language: LANGUAGE_NAMES[language] || "English",
    ...(userProfile && Object.values(userProfile).some(Boolean) ? { userProfile } : {}),
  });
}

export async function analyzeDetails(
  fastResult: AnalysisFastResult,
  language: string,
): Promise<AnalysisDetails> {
  return callFunction<AnalysisDetails>({
    action: "analyzeDetails",
    fastResult,
    language: LANGUAGE_NAMES[language] || "English",
  });
}

/**
 * Two-stage analysis with progressive paint.
 *
 * Returns immediately with a fast result that contains everything shown
 * "above the fold" (analysis, ingredients).
 *
 * The provided onLateUpdate callback can be invoked MULTIPLE times as
 * deferred fields become ready:
 *   - Details (usage, benefits, sideEffects, warnings, interactions, alternatives)
 *   - personalNote — when there's a profile, this is fetched in parallel and
 *     streams in without blocking the first paint.
 *
 * Cache strategy:
 *   - Hash hit  → return cached full result; onLateUpdate fires for details + note.
 *   - Name hit  → same.
 *   - Miss      → fast request → return → details + note both in background.
 */
export async function analyzeProductImageStream(
  base64Image: string,
  mimeType: string,
  language: string,
  userProfile: SerializedProfile | undefined,
  onLateUpdate: (patch: Partial<AnalysisResult>) => void,
): Promise<AnalysisResult> {
  // ── Hash the ORIGINAL image (not the compressed one) ───────────────────────
  // Canvas + JPEG re-encoding is NOT deterministic across browsers, GPUs, or
  // even reloads (driver state, color profile, etc.). The same source image
  // can produce a different SHA-256 each run if we hash the compressed bytes,
  // breaking the L1 hash-cache. Hashing the raw input fixes this entirely.
  // We start hashing in PARALLEL with compression — saves ~100ms on critical path.
  const hashPromise: Promise<string | null> = hashImage(base64Image)
    .catch((e) => { console.warn('[ai] hash failed:', e); return null; });

  const compressed = await compressImage(base64Image);

  const hasProfile = !!userProfile && Object.values(userProfile).some(Boolean);

  // Helper: kick off personalNote fetch in background, deliver via onLateUpdate
  const schedulePersonalNote = (full: AnalysisResult) => {
    if (!hasProfile) return;
    if (!full.ingredients || full.ingredients.length === 0) return; // no ingredients — skip
    generatePersonalNote(full, userProfile!, language)
      .then((note) => onLateUpdate({ personalNote: note }))
      .catch((e) => console.warn('[ai] personalNote failed:', e));
  };

  // ── ALL parallel: cache lookup (after hash), identify, analyzeFast ────────
  const hashCachePromise = hashPromise.then((h) =>
    h ? getCachedByHash(h, language) : null,
  ).catch(() => null);

  const identifyPromise = identifyProduct(compressed.data, compressed.mimeType)
    .catch((e) => { console.warn('[ai] identify failed:', e); return null; });

  const fastPromise = analyzeFastRaw(
    compressed.data,
    compressed.mimeType,
    language,
    userProfile,
  );

  // Step 1: race the fastest path — hash cache (cheapest, ~150ms)
  const hashCached = await hashCachePromise;
  if (hashCached) {
    // Apply the canonical product card so a cached result matches the
    // authoritative row exactly (handles products cached before product_scores
    // existed, or scored differently at the time).
    if (hashCached.productName && hashCached.brand) {
      const canonical = await getCanonicalScore(hashCached.brand, hashCached.productName).catch(() => null);
      if (canonical) {
        hashCached.ingredients = applyCanonicalCard(hashCached.ingredients, canonical);
        hashCached.canonicalScore = canonical.score;
      }
    }
    queueMicrotask(() => onLateUpdate({
      usage:        hashCached.usage,
      benefits:     hashCached.benefits,
      sideEffects:  hashCached.sideEffects,
      warnings:     hashCached.warnings,
      interactions: hashCached.interactions,
      alternatives: hashCached.alternatives,
    }));
    schedulePersonalNote(hashCached);
    return hashCached;
  }

  // Step 2: hash missed — wait for identify, then check name cache
  const identification = await identifyPromise;
  const imageHash = await hashPromise; // already resolved by now

  if (identification?.productName && identification?.brand) {
    const nameCached = await getCachedAnalysis(
      identification.productName,
      identification.brand,
      language,
    ).catch(() => null);
    if (nameCached) {
      // Apply the canonical product card (same as hash-hit path)
      const canonical2 = await getCanonicalScore(nameCached.brand, nameCached.productName).catch(() => null);
      if (canonical2) {
        nameCached.ingredients = applyCanonicalCard(nameCached.ingredients, canonical2);
        nameCached.canonicalScore = canonical2.score;
      }
      if (imageHash) {
        saveToCache(nameCached.productName, nameCached.brand, language, nameCached, imageHash).catch(() => {});
      }
      queueMicrotask(() => onLateUpdate({
        usage:        nameCached.usage,
        benefits:     nameCached.benefits,
        sideEffects:  nameCached.sideEffects,
        warnings:     nameCached.warnings,
        interactions: nameCached.interactions,
        alternatives: nameCached.alternatives,
      }));
      schedulePersonalNote(nameCached);
      return nameCached;
    }
  }

  // Step 3: full miss — analyzeFast was already running in parallel.
  // We just await its result (likely already resolved by now).
  const fast = await fastPromise;

  // Default empty details so the AnalysisResult shape is preserved
  const placeholder: AnalysisDetails = {
    usage: '', benefits: '', sideEffects: '', warnings: '',
    interactions: '', alternatives: [],
  };

  // ── Variant 4: secondary dedup by composition hash ─────────────────────────
  // The name cache (Step 2) can miss when the AI named the product slightly
  // differently this time. The composition is a more stable fingerprint: if a
  // prior card has the SAME normalized ingredient set, reuse it instead of
  // building a divergent one. This is post-AI (analyzeFast already ran), so it
  // costs no extra Gemini call — it only prevents duplicate/divergent cards.
  const ingredientsHash = await computeIngredientsHash(fast.ingredients).catch(() => null);
  if (ingredientsHash) {
    const ingCached = await getCachedByIngredients(ingredientsHash, language).catch(() => null);
    if (ingCached) {
      // Apply the canonical card on the prior identity (same as other hit paths).
      if (ingCached.productName && ingCached.brand) {
        const canonical3 = await getCanonicalScore(ingCached.brand, ingCached.productName).catch(() => null);
        if (canonical3) {
          ingCached.ingredients = applyCanonicalCard(ingCached.ingredients, canonical3);
          ingCached.canonicalScore = canonical3.score;
        }
      }
      // Save the current image hash so a future scan of THIS exact photo hits L0.
      if (imageHash) {
        saveToCache(ingCached.productName, ingCached.brand, language, ingCached, imageHash).catch(() => {});
      }
      queueMicrotask(() => onLateUpdate({
        usage:        ingCached.usage,
        benefits:     ingCached.benefits,
        sideEffects:  ingCached.sideEffects,
        warnings:     ingCached.warnings,
        interactions: ingCached.interactions,
        alternatives: ingCached.alternatives,
      }));
      schedulePersonalNote(ingCached);
      return ingCached;
    }
  }

  // ── Canonical score: same product always shows the same score ─────────────
  // On FIRST scan: compute score from ingredients, save to product_scores.
  // On SUBSEQUENT scans: product_scores already has a value → first writer wins,
  // so the score never changes even if AI produces slightly different ingredients.
  let canonicalIngredients = fast.ingredients;
  let canonicalScoreValue: number | undefined;
  if (fast.productName && fast.brand) {
    // Primary: canonical row by (normalized) name. Fallback: by COMPOSITION —
    // if the AI named this product differently than the first scan did, the
    // ingredient hash still finds the one frozen row, so the score cannot split.
    let existing = await getCanonicalScore(fast.brand, fast.productName).catch(() => null);
    if (!existing && ingredientsHash) {
      existing = await getCanonicalScoreByIngredients(ingredientsHash).catch(() => null);
    }
    if (existing && existing.ingredients.length > 0) {
      // ── Canonical product card: first scan defines the card forever ─────────
      // Rebuild the list ENTIRELY from the stored authoritative row so repeat
      // scans show an identical ingredient list + score, even if the AI read a
      // slightly different set this time. hydrate() refills descriptions.
      canonicalIngredients = applyCanonicalCard(fast.ingredients, existing);
      canonicalScoreValue = existing.score;
      console.log('[product_scores] HIT (full card):', fast.brand, fast.productName, '→', existing.score);
    } else {
      // First scan — save the score AND the ingredient list so every future
      // scan reproduces this exact card. First writer wins (ON CONFLICT DO NOTHING).
      // The composition hash is stored alongside, so future scans can find this
      // row even if the AI names the product differently.
      const computedScore = computeProductScore(fast.ingredients);
      if (computedScore !== null) {
        canonicalScoreValue = computedScore;
        saveCanonicalScore(
          fast.brand,
          fast.productName,
          computedScore,
          fast.ingredients.map(i => ({ name: i.name, status: i.status, score: effectiveIngredientScore(i) })),
          ingredientsHash,
        ).catch(() => {});
      }
    }
  }

  const partialResult: AnalysisResult = {
    productName:  fast.productName,
    brand:        fast.brand,
    productType:  fast.productType,
    analysis:     fast.analysis,
    ingredients:  canonicalIngredients,
    canonicalScore: canonicalScoreValue,
    shelfLife:    fast.shelfLife,
    personalNote: fast.personalNote,
    _imageHash:   imageHash,
    ...placeholder,
  };

  // ── Cache the FAST result immediately ──────────────────────────────────────
  // Strip personalNote before caching: MODEL_LITE sometimes silently drops it,
  // and a cached undefined would prevent regeneration on future scans.
  // The note is always generated fresh per-profile via schedulePersonalNote.
  if (fast.productName && fast.brand && imageHash) {
    const { personalNote: _drop, ...toCache } = partialResult;
    void _drop;
    saveToCache(fast.productName, fast.brand, language, toCache as AnalysisResult, imageHash)
      .catch((e) => console.warn('[ai] partial cache save failed:', e));
  }

  // Details (usage/benefits/etc.) are now loaded LAZILY when the user opens
  // the «Product info» section — see fetchDetails() and the onOpen handler
  // on the productInfo CollapsibleSection in App.tsx.
  return partialResult;
}
