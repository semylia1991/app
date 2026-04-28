// All Gemini calls go through the Netlify Function /api/gemini.
// The API key is NEVER sent to the browser.

import { getCachedAnalysis, saveToCache } from './productCache';

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

// ── Lightweight identify (только имя+бренд для проверки кэша) ──────────────
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

// ── Полный анализ через ИИ (как было) ──────────────────────────────────────
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
 * ГЛАВНАЯ функция, которую вызывает App.tsx.
 *
 * Поток:
 *   1. Сжимаем картинку
 *   2. identify — лёгкий запрос (~200 токенов): достаём productName + brand
 *   3. Ищем в product_cache. Если есть — возвращаем мгновенно.
 *   4. Если нет — полный analyze, сохраняем в кэш.
 *   5. personalNote генерится отдельно (если был userProfile).
 *
 * Сигнатура и тип возврата идентичны старой analyzeProductImage,
 * так что App.tsx не нужно переписывать.
 */
export async function analyzeProductImage(
  base64Image: string,
  mimeType: string,
  language: string,
  userProfile?: SerializedProfile,
): Promise<AnalysisResult> {
  const compressed = await compressImage(base64Image);

  // 1. Лёгкое распознавание для ключа кэша
  let identification: { productName: string; brand: string } | null = null;
  try {
    identification = await identifyProduct(compressed.data, compressed.mimeType);
  } catch (e) {
    console.warn('[ai] identify failed, will fallback to full analyze:', e);
  }

  // 2. Поиск в кэше (только если identify прошёл и оба поля непустые)
  if (identification?.productName && identification?.brand) {
    const cached = await getCachedAnalysis(
      identification.productName,
      identification.brand,
      language,
    );
    if (cached) {
      // Кэш-хит! Если нужен personalNote — генерим его отдельным вызовом.
      if (userProfile && Object.values(userProfile).some(Boolean)) {
        try {
          const note = await generatePersonalNote(cached, userProfile, language);
          return { ...cached, personalNote: note };
        } catch (e) {
          console.warn('[ai] personalNote failed for cached result:', e);
          return cached;
        }
      }
      return cached;
    }
  }

  // 3. Кэш-промах — делаем полный анализ
  const fresh = await analyzeProductImageRaw(
    compressed.data,
    compressed.mimeType,
    language,
    userProfile,
  );

  // 4. Сохраняем в кэш (fire-and-forget — не задерживаем UI)
  if (fresh.productName && fresh.brand) {
    saveToCache(fresh.productName, fresh.brand, language, fresh).catch((e) =>
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
