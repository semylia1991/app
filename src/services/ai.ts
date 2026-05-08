// All Gemini calls go through the Netlify Function /api/gemini.
// The API key is NEVER sent to the browser.

import { getCachedByHash, getCachedAnalysis, saveToCache, hashImage } from './productCache';
import { lookupIngredient } from '../lib/ingredients-db';

const FUNCTION_URL = "/api/gemini";

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
export function computeProductScore(ingredients: Ingredient[]): number | null {
  if (!ingredients || ingredients.length === 0) return null;

  // Fixed fallback when neither score nor DB lookup is available.
  // Must match the values used in productCache.hydrateScores so the score
  // is identical regardless of where the ingredients came from
  // (fresh AI response, old cache without score, scan history, etc).
  const fallbackByStatus = (status: string) =>
    status === '🟢' ? 8 : status === '🟡' ? 5 : 1;

  let weightedSum = 0;
  let totalWeight = 0;

  ingredients.forEach((ing, idx) => {
    // Position-based weight: first ingredient = highest weight
    const weight = 1 / (idx + 1);
    let s: number;
    if (typeof ing.score === 'number') {
      s = ing.score;
    } else {
      // Score missing — try local DB (this happens for very old cached scans)
      const dbEntry = lookupIngredient(ing.name);
      s = dbEntry ? dbEntry.score : fallbackByStatus(ing.status);
    }
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
  const compressed = await compressImage(base64Image);

  // ── Уровень 0: поиск по image_hash ────────────────────────────────────────
  const imageHash = await hashImage(compressed.data);

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
  const translated = await callFunction<AnalysisResult>({
    action: "translate",
    result,
    targetLanguage,
  });

  // ── PRESERVE numeric and structural fields from the original ──────────────
  // The translate prompt sometimes mishandles non-text fields (drops `score`,
  // re-renders status emojis, reorders ingredients). We restore them here from
  // the original result so the Yuka-style score never drifts on language switch.
  if (translated.ingredients && result.ingredients) {
    // Build lookup by lowercased INCI name from the ORIGINAL
    const byName = new Map(
      result.ingredients.map((i) => [i.name.trim().toLowerCase(), i]),
    );
    translated.ingredients = translated.ingredients.map((tIng, idx) => {
      // First try name match (best — survives reordering)
      const orig = byName.get(tIng.name.trim().toLowerCase())
        // Fallback to position match (if AI translated the name itself)
        ?? result.ingredients[idx];
      return {
        ...tIng,
        // status emoji is data, not text — never let translate change it
        status: orig?.status ?? tIng.status,
        // score is numeric — translate often drops it; restore from original
        score:  orig?.score ?? tIng.score,
      };
    });
  }

  return translated;
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

export async function generatePersonalNote(
  result: AnalysisResult,
  serializedProfile: SerializedProfile,
  language: string,
): Promise<string> {
  const data = await callFunction<{ personalNote: string }>({
    action: "personalNote",
    result,
    userProfile: serializedProfile,
    language: LANGUAGE_NAMES[language] || language,
  });
  return data.personalNote ?? "";
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
  const compressed = await compressImage(base64Image);

  const hasProfile = !!userProfile && Object.values(userProfile).some(Boolean);

  // Helper: kick off personalNote fetch in background, deliver via onLateUpdate
  const schedulePersonalNote = (full: AnalysisResult) => {
    if (!hasProfile) return;
    generatePersonalNote(full, userProfile!, language)
      .then((note) => onLateUpdate({ personalNote: note }))
      .catch((e) => console.warn('[ai] personalNote failed:', e));
  };

  // ── ALL parallel: hash, cache lookup, identify, analyzeFast ──────────────
  // All four operations start immediately after compress. Whichever cache
  // layer hits first wins; the AI requests are wasted but don't delay anything
  // (they were going to run anyway on cache miss).
  const hashPromise = hashImage(compressed.data);

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

  const partialResult: AnalysisResult = {
    productName: fast.productName,
    brand:       fast.brand,
    productType: fast.productType,
    analysis:    fast.analysis,
    ingredients: fast.ingredients,
    shelfLife:   fast.shelfLife,
    personalNote: fast.personalNote,
    ...placeholder,
  };

  // Fire details in background — caller uses onLateUpdate to merge into state.
  analyzeDetails(fast, language)
    .then((details) => {
      onLateUpdate(details);
      if (fast.productName && fast.brand) {
        const full: AnalysisResult = { ...partialResult, ...details };
        saveToCache(full.productName, full.brand, language, full, imageHash).catch((e) =>
          console.warn('[ai] cache save failed:', e),
        );
      }
    })
    .catch((e) => {
      console.warn('[ai] analyzeDetails failed:', e);
    });

  return partialResult;
}
}
