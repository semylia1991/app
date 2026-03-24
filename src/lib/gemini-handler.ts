/**
 * gemini-handler.ts
 *
 * Единственный источник правды для всей бизнес-логики Gemini AI.
 * Импортируется и server.ts (dev), и api/gemini.mjs (prod Netlify).
 *
 * Экспортирует одну функцию: handleGeminiRequest(body, apiKey)
 * Возвращает: { status: number; body: unknown; rawText?: string }
 */
 
import { GoogleGenAI, Type } from "@google/genai";
 
// ── Model ─────────────────────────────────────────────────────────────────────
 
const MODEL = "gemini-2.5-flash";
 
// ── Response shape ────────────────────────────────────────────────────────────
 
export interface HandlerResult {
  status: number;
  body: unknown;
  /** Set when Gemini returns raw JSON text that should be forwarded as-is */
  rawText?: string;
}
 
// ── JSON schema (shared, typed) ───────────────────────────────────────────────
 
const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    productName:  { type: Type.STRING },
    brand:        { type: Type.STRING },
    productType:  { type: Type.STRING },
    analysis:     { type: Type.STRING },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name:        { type: Type.STRING },
          status:      { type: Type.STRING, enum: ["🟢", "🟡", "🔴"] },
          description: { type: Type.STRING },
        },
      },
    },
    usage:        { type: Type.STRING },
    benefits:     { type: Type.STRING },
    sideEffects:  { type: Type.STRING },
    warnings:     { type: Type.STRING },
    interactions: { type: Type.STRING },
    shelfLife:    { type: Type.STRING },
    alternatives: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name:   { type: Type.STRING },
          brand:  { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ["name", "brand", "reason"],
      },
    },
  },
  required: [
    "productName", "brand", "productType", "analysis", "ingredients",
    "usage", "benefits", "sideEffects", "warnings", "interactions",
    "shelfLife", "alternatives",
  ],
};
 
// ── Prompts ───────────────────────────────────────────────────────────────────
 
function buildAnalyzePrompt(language: string): string {
  return `
You are an expert cosmetic safety analyst and INCI decoder.
Analyze the provided image of a cosmetic product or its ingredient list.
Extract the product name, brand, and INCI ingredients. Correct any OCR errors.
If data is missing, search your knowledge base (EWG Skin Deep, CosDNA, INCI Decoder, PubChem, CIR, EU CosIng).
NEVER invent ingredients, ratings, or studies. If data is not found, state "Data not found in public databases.".
 
Provide the analysis in ${language}.
 
Formatting Rules:
- productType: Identify exactly what the product is (e.g., "Moisturizing Cream", "Exfoliating Toner").
- analysis: Strictly 1-2 sentences. START by stating what the product is (e.g., "This is a [productType]. It features...").
- alternatives: Return 3–5 real products as a JSON array. Each item must have: "name" (product name), "brand" (manufacturer), "reason" (one sentence why it is a good alternative — similar ingredients, same concern, gentler formula, etc.).
 
- usage: Use this exact format with emojis. Translate ALL labels (How to Apply / Frequency / Best Suited For) into ${language}. Use DOUBLE NEWLINES between items:
👤 [translated label for "Best Suited For"]:
- [Skin type] — [why]
 
📋 [translated label for "How to Apply"]:
- [Step 1]
- [Step 2]
- [Step 3]
 
⏰ [translated label for "Frequency"]:
- [How often to use — morning/evening/weekly]
- [How long before seeing results]
 
💧 [translated label for "Amount to Use"]:
- [Exact amount — drops, pea-size, pump etc.]
- [How to spread or massage in]
 
✅ [translated label for "Layering Order"]:
- [Step number] [product type] — [example]
 
🌡️ [translated label for "Before and After"]:
- [What to do before applying — cleanse, tone etc.]
- [What to apply after — serum, moisturizer, SPF etc.]
 
- benefits: Use this style with emojis and bullet points. Translate ALL category names into ${language}. Use DOUBLE NEWLINES between categories:
🧱 [translated benefit category name]:
• [Ingredient/Mechanism] [description]
 
💧 [translated benefit category name]:
• [Ingredient/Mechanism] [description]
 
- sideEffects: Use the same style as benefits — emojis, bullet points, category headers. Translate ALL category names into ${language}. Group by type of reaction (e.g. skin irritation, allergic reactions, overuse effects). Use DOUBLE NEWLINES between categories:
⚠️ [translated side effect category name]:
• [Ingredient] [description of potential reaction]
 
🔴 [translated side effect category name]:
• [Ingredient] [description of potential reaction]
 
- interactions: Write a DETAILED section using emojis, categories and bullet points. Translate ALL category names into ${language}. Use DOUBLE NEWLINES between categories:
 
⚗️ [translated label for "Actives Compatibility"]:
- [Active ingredient] — [can/cannot combine, why]
 
🧴 [translated label for "Skin Type Compatibility"]:
- [Skin type] — [how product behaves on this skin type]
 
🔗 [translated label for "Ingredient Synergy"]:
- [Ingredient pair] — [how they enhance or conflict with each other]
 
🚫 [translated label for "Avoid Combining With"]:
- [Ingredient/product type] — [reason to avoid]
 
✅ [translated label for "Best Combinations"]:
- [Product/ingredient] — [why it works well together]
 
Ensure the output strictly follows the JSON schema.
`.trim();
}
 
function buildTranslatePrompt(result: unknown, targetLanguage: string): string {
  return `
Translate this JSON to ${targetLanguage}.
Return ONLY valid JSON.
 
${JSON.stringify(result)}
`.trim();
}
 
function buildAskPrompt(question: string, context: unknown, language: string): string {
  return `
Context:
${JSON.stringify(context)}
 
Question: ${question}
Answer in ${language}.
`.trim();
}
 
// ── Main handler ──────────────────────────────────────────────────────────────
 
export async function handleGeminiRequest(
  body: Record<string, unknown>,
  apiKey: string,
): Promise<HandlerResult> {
  if (!apiKey) {
    return { status: 500, body: { error: "GEMINI_API_KEY is not configured on the server." } };
  }
 
  const ai = new GoogleGenAI({ apiKey });
  const { action } = body;
 
  // ── SimpleChat (no action field) ────────────────────────────────────────────
  if (!action) {
    const { message } = body;
    if (!message || typeof message !== "string") {
      return { status: 400, body: { error: "message is required and must be a string." } };
    }
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: message,
    });
    return { status: 200, body: { response: response.text } };
  }
 
  // ── Analyze product image ───────────────────────────────────────────────────
  if (action === "analyze") {
    const { base64Image, mimeType, language } = body as {
      base64Image?: string;
      mimeType?: string;
      language?: string;
    };
 
    if (!base64Image || !mimeType || !language) {
      return {
        status: 400,
        body: { error: "base64Image, mimeType, and language are required." },
      };
    }
 
    const imageData = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;
 
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{
        parts: [
          { text: buildAnalyzePrompt(language) },
          { inlineData: { data: imageData, mimeType } },
        ],
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
      },
    });
 
    return { status: 200, rawText: response.text ?? "" };
  }
 
  // ── Translate analysis result ───────────────────────────────────────────────
  if (action === "translate") {
    const { result, targetLanguage } = body as {
      result?: unknown;
      targetLanguage?: string;
    };
 
    if (!result || !targetLanguage) {
      return { status: 400, body: { error: "result and targetLanguage are required." } };
    }
 
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildTranslatePrompt(result, targetLanguage),
      config: { responseMimeType: "application/json" },
    });
 
    return { status: 200, rawText: response.text ?? "" };
  }
 
  // ── Ask follow-up question ──────────────────────────────────────────────────
  if (action === "ask") {
    const { question, context, language } = body as {
      question?: string;
      context?: unknown;
      language?: string;
    };
 
    if (!question || !context || !language) {
      return { status: 400, body: { error: "question, context, and language are required." } };
    }
 
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildAskPrompt(question, context, language),
    });
 
    return { status: 200, body: { answer: response.text ?? "" } };
  }
 
  return { status: 400, body: { error: `Unknown action: "${action}"` } };
}
