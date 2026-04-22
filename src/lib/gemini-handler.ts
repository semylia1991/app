/**
 * gemini-handler.ts — single source of truth for all Gemini AI logic.
 * Imported by server.ts (dev) and api/gemini.mjs (prod Netlify).
 */

import { GoogleGenAI, Type } from "@google/genai";

// ── Available models (updated April 2026) ─────────────────────────────────────
const MODELS = [
  "gemini-2.5-flash",        // Основная модель: лучший баланс скорости, цены и качества
  "gemini-2.5-flash-lite",   // Более быстрый и дешёвый вариант
  // "gemini-2.5-pro",       // Раскомментировать, если нужна максимальная точность (дороже)
];

export interface HandlerResult {
  status: number;
  body?: unknown;
  rawText?: string;
}

// ── JSON schema ───────────────────────────────────────────────────────────────

function buildAnalysisSchema(withPersonalNote: boolean) {
  const properties: Record<string, unknown> = {
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
        required: ["name", "status", "description"],
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
  };

  const required = [
    "productName", "brand", "productType", "analysis", "ingredients",
    "usage", "benefits", "sideEffects", "warnings", "interactions",
    "shelfLife", "alternatives",
  ];

  if (withPersonalNote) {
    properties["personalNote"] = { type: Type.STRING };
    required.push("personalNote");
  }

  return { type: Type.OBJECT, properties, required };
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildAnalyzePrompt(language: string, userProfile?: Record<string, unknown>): string {
  const basePrompt = `
You are an expert cosmetic safety analyst and INCI decoder.
Analyze the provided image of a cosmetic product or its ingredient list.
Extract the product name, brand, and INCI ingredients. Correct any OCR errors.
If data is missing, search your knowledge base (EWG Skin Deep, CosDNA, INCI Decoder, PubChem, CIR, EU CosIng).
NEVER invent ingredients, ratings, or studies. If data is not found, state "Data not found in public databases.".

For each ingredient in the "ingredients" array you MUST always provide a "description" field. It must:
- Explain what the ingredient IS and what it DOES in this product (function, mechanism)
- Note any safety concerns, common reactions, or special properties
- Be 1–7 words. Never leave it empty.

Provide the ENTIRE analysis in ${language}. Every single field — analysis, usage, benefits, sideEffects, warnings, interactions, shelfLife — MUST be written in ${language}. Do NOT use English for any field unless ${language} is English.

Formatting Rules:
- productType: Identify exactly what the product is (e.g., "Moisturizing Cream", "Exfoliating Toner").
- analysis: Strictly 1 sentences in ${language}. START by stating what the product is. NEVER use English if ${language} is not English.
- alternatives: Return 1-3 real, commercially available products as a JSON array, ranked by ingredient overlap with the analyzed product (highest overlap first). Each item must have: "name" (product name), "brand" (manufacturer), "reason" (one sentence that names 2–3 shared key INCI actives and notes any meaningful differences — e.g. gentler preservative, added niacinamide, lower fragrance load). Only include products you are confident exist and are widely sold.

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

- interactions: Write a DETAILED section using emojis, categories and bullet points. Translate ALL category names AND block titles into ${language}. The section MUST be split into TWO clearly labeled blocks separated by a divider line (---). Use DOUBLE NEWLINES between categories:

## ✅ [translated title for "Best Combinations"]

🔗 [translated label for "Actives Compatibility"]:
- [can combine, why it works well]

---

## ⚠️ [translated title for "Caution: Conflicts!"]

🚫 [translated label for "Avoid Combining With"]:
- [Ingredient/product type] — [reason to avoid]

Ensure the output strictly follows the JSON schema.`.trim();

  if (!userProfile) return basePrompt;

  // Main profile — used across all sections EXCEPT climate which is personalNote-only
  const profileLines = [
    userProfile.skinType        ? "Skin type: "         + userProfile.skinType        : null,
    userProfile.skinSensitivity ? "Sensitivities: "     + userProfile.skinSensitivity : null,
    userProfile.skinConditions  ? "Skin conditions: "   + userProfile.skinConditions  : null,
    userProfile.ageRange        ? "Age group: "         + userProfile.ageRange         : null,
    userProfile.hairType        ? "Hair type: "         + userProfile.hairType         : null,
    userProfile.scalpCondition  ? "Scalp condition: "   + userProfile.scalpCondition  : null,
    userProfile.hairProblems    ? "Hair problems: "     + userProfile.hairProblems     : null,
    userProfile.allergies       ? "⚠️ ALLERGIES / INTOLERANCES (flag any matching ingredients as 🔴 and warn explicitly): " + userProfile.allergies : null,
  ].filter(Boolean).join("\n");

  // Climate is passed separately — only used inside personalNote
  const climateLines = userProfile.climate
    ? "Climate / environment: " + userProfile.climate
    : "";

  const personalNoteSection = `

- Please note: Based on the user preferences below and the product ingredients, generate an analysis note IN ${language}.
  The text MUST explicitly include phrasing such as: "based on the selected preferences", "considering these preferences" or equivalent in ${language}.

  Follow this EXACT structure (translate all headings to ${language}):

  🧴 **[translate: Brief summary]**
  (1-2 sentences, explicitly referencing the selected preferences)

  **[translate: By preferences:]**
  - <preference value> <color emoji> — <short 1-line explanation>
  - <preference value> <color emoji> — <short 1-line explanation>
  ...

  COLOR MARKERS — use EXACTLY these emojis:
  - 🟢 suitable / beneficial for this preference
  - 🟡 effect is unclear or depends on individual reaction (default when uncertain)
  - 🔴 problematic / unsuitable for this preference

  RELEVANCE FILTER — ONLY show preferences that matter for this specific product:
  - For hair/scalp products (shampoo, conditioner, hair mask, hair oil, etc.) → include only hair-related preferences (hairType, scalpCondition, hairProblems), plus allergies and climate. OMIT skin preferences entirely.
  - For face/body skincare (cream, serum, toner, cleanser, sunscreen, etc.) → include only skin-related preferences (skinType, skinSensitivity, skinConditions, ageRange), plus allergies and climate. OMIT hair preferences entirely.
  - For lip products → include only skinSensitivity, allergies, climate. Omit hair and general skin preferences.
  - For nail products → include only allergies.
  - If a preference is not relevant, simply do not output a bullet for it. Do not write "N/A" or "not applicable" — just omit the bullet entirely.
  - Allergies: always include each as its own bullet — 🔴 if any matching ingredient or close derivative is found, 🟢 otherwise.

  FORMAT RULES:
  - Use the user's preference value as the label (e.g. "Combination skin", "Curly hair", "Fragrance allergy", "Humid climate").
  - Keep each explanation to ONE short sentence (max ~12 words).
  - Do not give medical advice. Use mild phrasing (may, can, tends to). Do not state directly that a product is suitable or unsuitable.
  - Do not mention irrelevant preferences anywhere — not in the bullets, not in the Brief summary.

USER PREFERENCES:
${[profileLines, climateLines].filter(Boolean).join("\n")}`;

  return basePrompt + personalNoteSection;
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


// ── Retry + model fallback for transient Gemini errors (503 / 429) ──────────
function isTransient(err: any): boolean {
  const s = String(err?.message ?? "") + String(err?.status ?? "") + String(err?.code ?? "");
  return s.includes("503") || s.includes("429") || s.includes("UNAVAILABLE") ||
         s.includes("RESOURCE_EXHAUSTED") || s.includes("high demand") || s.includes("quota");
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model">,
): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> {
  let lastError: unknown;
  for (const model of MODELS) {
    const p = { ...params, model } as Parameters<GoogleGenAI["models"]["generateContent"]>[0];
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await ai.models.generateContent(p);
        return result;
      } catch (err: any) {
        lastError = err;
        if (!isTransient(err)) {
          if (String(err?.status ?? "").includes("404") || String(err?.message ?? "").includes("404")) break;
          throw err;
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 600));
      }
    }
  }
  throw lastError ?? new Error("All models failed");
}

export async function handleGeminiRequest(
  body: Record<string, unknown>,
  apiKey: string,
): Promise<HandlerResult> {
  if (!apiKey) {
    return { status: 500, body: { error: "GEMINI_API_KEY is not configured on the server." } };
  }

  const ai = new GoogleGenAI({ apiKey });
  const { action } = body;

  // ── SimpleChat ──────────────────────────────────────────────────────────────
  if (!action) {
    const { message } = body;
    if (!message || typeof message !== "string") {
      return { status: 400, body: { error: "message is required and must be a string." } };
    }
    const response = await generateWithRetry(ai, { contents: [{ parts: [{ text: message }] }] });
    return { status: 200, body: { response: response.text } };
  }

  // ── Analyze product image ───────────────────────────────────────────────────
  if (action === "analyze") {
    const { base64Image, mimeType, language, userProfile } = body as {
      base64Image?: string;
      mimeType?: string;
      language?: string;
      userProfile?: Record<string, unknown>;
    };

    if (!base64Image || !mimeType || !language) {
      return { status: 400, body: { error: "base64Image, mimeType, and language are required." } };
    }

    const imageData = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
    const withNote  = !!userProfile;

    const response = await generateWithRetry(ai, {
      contents: [{
        parts: [
          { text: buildAnalyzePrompt(language, userProfile) },
          { inlineData: { data: imageData, mimeType } },
        ],
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: buildAnalysisSchema(withNote),
        temperature: 0.4,
        topP: 0.9,
      },
    });

    return { status: 200, rawText: response.text ?? "" };
  }

  // ── Translate ───────────────────────────────────────────────────────────────
  if (action === "translate") {
    const { result, targetLanguage } = body as { result?: unknown; targetLanguage?: string };
    if (!result || !targetLanguage) {
      return { status: 400, body: { error: "result and targetLanguage are required." } };
    }
    const response = await generateWithRetry(ai, {
      contents: [{ parts: [{ text: buildTranslatePrompt(result, targetLanguage) }] }],
      config: { responseMimeType: "application/json" },
    });
    return { status: 200, rawText: response.text ?? "" };
  }

  // ── Ask ─────────────────────────────────────────────────────────────────────
  if (action === "ask") {
    const { question, context, language } = body as {
      question?: string; context?: unknown; language?: string;
    };
    if (!question || !context || !language) {
      return { status: 400, body: { error: "question, context, and language are required." } };
    }
    const response = await generateWithRetry(ai, {
      contents: [{ parts: [{ text: buildAskPrompt(question, context, language) }] }],
    });
    return { status: 200, body: { answer: response.text ?? "" } };
  }

  // ── Re-generate personalNote with updated profile ───────────────────────────
  if (action === "personalNote") {
    const { result, userProfile, language } = body as {
      result?: unknown; userProfile?: Record<string, unknown>; language?: string;
    };
    if (!result || !userProfile || !language) {
      return { status: 400, body: { error: "result, userProfile, and language are required." } };
    }

    // Detect product category from productType
    const productType = ((result as any).productType ?? "").toLowerCase();
    const isHairProduct = /shampoo|conditioner|hair mask|hair oil|hair serum|hair spray|dry shampoo|волос|шампун|кондиционер|маска для волос|haarpflege|haarmaske|haarshampoo|haaröl/i.test(productType);
    const isSkinProduct = /cream|serum|toner|moistur|cleanser|sunscreen|spf|lotion|face|exfoliat|mask|eye|lip|крем|сыворот|тонер|очищ|солнц|увлажн|Creme|Serum|Reiniger|Toner/i.test(productType);

    // Skin-related keys
    const skinKeys = ["skinType", "skinSensitivity", "skinConditions", "ageRange"];
    // Hair-related keys
    const hairKeys = ["hairType", "scalpCondition", "hairProblems"];
    // Always relevant
    const universalKeys = ["climate", "allergies"];

    const relevantKeys = isHairProduct
      ? [...hairKeys, ...universalKeys]
      : isSkinProduct
        ? [...skinKeys, ...universalKeys]
        : [...skinKeys, ...hairKeys, ...universalKeys]; // ambiguous — include all

    const profileLines = Object.entries(userProfile as Record<string, string>)
      .filter(([k, v]) => v && relevantKeys.includes(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const ingredients = Array.isArray((result as any).ingredients)
      ? (result as any).ingredients
          .map((i: any) => `${i.status} ${i.name}: ${i.description ?? ""}`)
          .join("\n")
      : "";

    const prompt = `You are a cosmetic safety analyst. A product has already been analyzed.
Your ONLY task: write a personalNote in ${language} based on the user preferences and the ingredient list below.
Do NOT re-analyze the product. Do NOT invent ingredients. Use ONLY what is listed.

USER PREFERENCES:
${profileLines}

PRODUCT: ${(result as any).productName ?? ""} by ${(result as any).brand ?? ""}
PRODUCT TYPE: ${(result as any).productType ?? ""}
INGREDIENTS:
${ingredients}

Return ONLY valid JSON with a single field "personalNote" (string, in ${language}).
Structure (translate all headings to ${language}):

🧴 **[Brief summary]** — 1-2 sentences referencing the preferences explicitly.

**[By preferences:]**
- <preference value> <color emoji> — <one short sentence explanation>
- <preference value> <color emoji> — <one short sentence explanation>
...

---
⚠️ *[Automated analysis based on selected preferences. Not medical advice.]*

COLOR MARKERS — use EXACTLY these emojis:
- 🟢 if the product's ingredients are likely suitable / beneficial for this preference
- 🟡 if the effect is unclear, mixed, or depends on individual reaction
- 🔴 if the product's ingredients are likely problematic / unsuitable for this preference

FORMAT RULES:
- List EVERY user preference relevant to this product type as its own bullet.
- Each bullet: "<preference name/value in ${language}> <color emoji> — <one short sentence, max ~12 words>"
- Use the user's preference value as the label (e.g. "Oily skin 🟢 — …", "Nut allergy 🔴 — …", "Humid climate 🟡 — …").
- Default to 🟡 when evidence is weak or the effect depends on the person.
- Use mild phrasing in explanations (may cause, can be, tends to) — no medical advice.

Rules: no medical advice, tie every bullet to a preference, do not invent ingredients.
PRODUCT TYPE RELEVANCE — CRITICAL: For hair/scalp products (shampoo, conditioner, hair mask, hair oil, etc.) ONLY list hair-related preferences (hairType, scalpCondition, hairProblems) as bullets. Do NOT include skin conditions like enlarged pores, pigmentation, acne — they are irrelevant to hair products. For skincare products ONLY list skin-related preferences. Ignore hair preferences for face/body products.
CLIMATE: If climate is specified, include it as a bullet — apply it only in the context of the product's use area (scalp/hair for hair products, skin for skincare).
ALLERGIES: Each listed allergy MUST be its own bullet. If a matching ingredient or close derivative is found → 🔴 with a clear warning. If no match found → 🟢 with "no matching ingredient detected" or similar.`;

    const response = await generateWithRetry(ai, {
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { personalNote: { type: Type.STRING } },
          required: ["personalNote"],
        },
        temperature: 0.4,
        topP: 0.9,
      },
    });
    return { status: 200, rawText: response.text ?? "" };
  }


  return { status: 400, body: { error: `Unknown action: "${action}"` } };
}
