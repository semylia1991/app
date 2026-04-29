// All Gemini calls go through the Netlify Function /api/gemini.
// The API key is NEVER sent to the browser.

import { getCachedByHash, getCachedAnalysis, saveToCache, hashImage } from './productCache';

const FUNCTION_URL = "/api/gemini";

export interface Ingredient {
  name: string;
  status: "🟢" | "🟡" | "🔴";
  description: string;
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
  return callFunction<AnalysisResult>({
    action: "translate",
    result,
    targetLanguage,
  });
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
