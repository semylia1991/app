// All Gemini calls go through the Netlify Function /api/gemini.
// The API key is NEVER sent to the browser.

const FUNCTION_URL = "/api/gemini";

export interface Ingredient {
  name: string;
  status: "🟢" | "🟡" | "🔴";
  description: string;
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
  alternatives: string;
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

export async function analyzeProductImage(
  base64Image: string,
  mimeType: string,
  language: string
): Promise<AnalysisResult> {
  return callFunction<AnalysisResult>({
    action: "analyze",
    base64Image,
    mimeType,
    language,
  });
}

export async function translateAnalysisResult(
  result: AnalysisResult,
  targetLanguage: string
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
  language: string
): Promise<string> {
  const data = await callFunction<{ answer: string }>({
    action: "ask",
    question,
    context,
    language,
  });
  return data.answer;
}
