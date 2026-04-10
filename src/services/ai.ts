// All Gemini calls go through the Netlify Function /api/gemini.
// The API key is NEVER sent to the browser.

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
      // Two-pass compression:
      // Pass 1 — resize to MAX_PX on the long side (keeps INCI text readable)
      // Pass 2 — if the JPEG still exceeds SIZE_LIMIT, halve quality until it fits
      const MAX_PX    = 800;
      const SIZE_LIMIT = 100 * 1024; // 100 KB target

      let { width, height } = img;
      if (width > MAX_PX || height > MAX_PX) {
        if (width > height) { height = Math.round((height * MAX_PX) / width); width = MAX_PX; }
        else                { width  = Math.round((width  * MAX_PX) / height); height = MAX_PX; }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      let quality = 0.75;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);

      // Estimate byte size of base64 payload
      const byteSize = (dataUrl.length * 3) / 4;
      if (byteSize > SIZE_LIMIT) {
        quality = 0.60;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

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

export async function analyzeProductImage(
  base64Image: string,
  mimeType: string,
  language: string,
  userProfile?: SerializedProfile,
): Promise<AnalysisResult> {
  const compressed = await compressImage(base64Image);
  return callFunction<AnalysisResult>({
    action: "analyze",
    base64Image: compressed.data,
    mimeType: compressed.mimeType,
    language: LANGUAGE_NAMES[language] || "English",
    // Only send userProfile if it has at least one non-empty field
    ...(userProfile && Object.values(userProfile).some(Boolean) ? { userProfile } : {}),
  });
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
