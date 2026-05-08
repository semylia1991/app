/**
 * gemini-handler.ts — single source of truth for all Gemini AI logic.
 * Imported by server.ts (dev) and api/gemini.mjs (prod Netlify).
 */

import { GoogleGenAI, Type } from "@google/genai";
import { INGREDIENTS_DB } from "./ingredients-db.js";

// ── Available models (updated April 2026) ─────────────────────────────────────
const MODELS = [
  "gemini-2.0-flash",          // Основная модель: быстрее 2.5 Flash, хорошее качество
  "gemini-2.5-flash",          // Fallback: если 2.0 недоступен
  "gemini-2.5-flash-lite",     // Последний резерв
  // "gemini-2.5-pro",         // Раскомментировать, если нужна максимальная точность (дороже)
];

// Для identify достаточно Flash-Lite — задача простая (только имя + бренд)
const MODEL_LITE = "gemini-2.5-flash-lite";

// ── Pricing constants (USD per 1M tokens, April 2026) ────────────────────────
const PRICE = {
  "gemini-2.0-flash":        { in: 0.10, out: 0.40 },
  "gemini-2.5-flash":        { in: 0.30, out: 2.50 },
  "gemini-2.5-flash-lite":   { in: 0.10, out: 0.40 },
} as const;

function logUsage(action: string, model: string, usage: any, ms: number) {
  const inp  = usage?.promptTokenCount     ?? 0;
  const out  = usage?.candidatesTokenCount ?? 0;
  const p    = PRICE[model as keyof typeof PRICE] ?? { in: 0.30, out: 2.50 };
  const cost = (inp * p.in + out * p.out) / 1_000_000;
  console.log(
    `[gemini] action=${action} model=${model} ` +
    `in=${inp} out=${out} ` +
    `cost=$${cost.toFixed(6)} ms=${ms}`
  );
}


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
          score:       { type: Type.NUMBER },
        },
        required: ["name", "status", "description", "score"],
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

// Schema for FAST first-paint response — only fields shown immediately.
function buildAnalysisFastSchema(withPersonalNote: boolean) {
  const properties: Record<string, unknown> = {
    productName:  { type: Type.STRING },
    brand:        { type: Type.STRING },
    productType:  { type: Type.STRING },
    analysis:     { type: Type.STRING },
    shelfLife:    { type: Type.STRING },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name:        { type: Type.STRING },
          status:      { type: Type.STRING, enum: ["🟢", "🟡", "🔴"] },
          description: { type: Type.STRING },
          score:       { type: Type.NUMBER },
        },
        required: ["name", "status", "description", "score"],
      },
    },
  };

  const required = ["productName", "brand", "productType", "analysis", "shelfLife", "ingredients"];

  if (withPersonalNote) {
    properties["personalNote"] = { type: Type.STRING };
    required.push("personalNote");
  }

  return { type: Type.OBJECT, properties, required };
}

// Schema for the deferred details — usage, benefits, sideEffects, warnings, interactions, alternatives.
function buildAnalysisDetailsSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      usage:        { type: Type.STRING },
      benefits:     { type: Type.STRING },
      sideEffects:  { type: Type.STRING },
      warnings:     { type: Type.STRING },
      interactions: { type: Type.STRING },
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
    required: ["usage", "benefits", "sideEffects", "warnings", "interactions", "alternatives"],
  };
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildAnalyzePrompt(language: string, userProfile?: Record<string, unknown>): string {
  const basePrompt = `
You are an expert cosmetic safety analyst and INCI decoder.
Analyze the provided image of a cosmetic product or its ingredient list.
Extract the product name, brand, and INCI ingredients. Correct any OCR errors.
If data is missing, search your knowledge base (EWG Skin Deep, CosDNA, INCI Decoder, PubChem, CIR, EU CosIng).
NEVER invent ingredients, ratings, or studies. If data is not found, state "Data not found in public databases.".

RESPOND ENTIRELY IN ${language}. Every text field, every label, every category name MUST be in ${language}.

For each ingredient in the "ingredients" array you MUST always provide a "description" field. It must:
- Explain what the ingredient IS and what it DOES in this product (function, mechanism)
- Note any safety concerns, common reactions, or special properties
- Be 1–7 words. Never leave it empty.

LOCAL DB ENRICHMENT: server has ~1000 known INCI with canonical descriptions/statuses/scores.
- If common INCI (likely in DB): output description "-" and status "🟢" — server overrides both.
- If unknown/rare INCI: provide real description (1–7 words) and accurate status.
When in doubt, write a real description — false placeholders fail, real ones never do.

INGREDIENT SCORE (integer 0–10, Yuka-style):
🟢 7–10 safe · 🟡 3–6 caution · 🔴 0–2 avoid.
Server overrides score for known DB ingredients. Your score matters only for unknown ones.

Formatting Rules:
- productType: Identify exactly what the product is (e.g., "Moisturizing Cream", "Exfoliating Toner").
- analysis: Strictly 1-2 sentences. START by stating what the product is.
- alternatives: Return 2-3 real, commercially available products as a JSON array, ranked by ingredient overlap with the analyzed product (highest overlap first). Each item must have: "name" (product name), "brand" (manufacturer), "reason" (one sentence that names 2–3 shared key INCI actives and notes any meaningful differences — e.g. gentler preservative, added niacinamide, lower fragrance load). Only include products you are confident exist and are widely sold.

- usage: Use this exact format with emojis. Translate ALL labels (How to Apply / Frequency / Best Suited For). Use DOUBLE NEWLINES between items:
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

- benefits: Use this style with emojis and bullet points. Translate ALL category names. Use DOUBLE NEWLINES between categories:
🧱 [translated benefit category name]:
• [Ingredient/Mechanism] [description]

💧 [translated benefit category name]:
• [Ingredient/Mechanism] [description]

- sideEffects: Use the same style as benefits — emojis, bullet points, category headers. Translate ALL category names. Group by type of reaction (e.g. skin irritation, allergic reactions, overuse effects). Use DOUBLE NEWLINES between categories:
🟡 [translated side effect category name]:
• [Ingredient] [description of potential reaction]

🔴 [translated side effect category name]:
• [Ingredient] [description of potential reaction]

- interactions: Write a DETAILED section using emojis, categories and bullet points. Translate ALL category names AND block titles. The section MUST be split into TWO clearly labeled blocks separated by a divider line (---). Use DOUBLE NEWLINES between categories:

## 🟢 [translated title for "Best Combinations"]

 [translated label for "Actives Compatibility"]:
- [Active ingredient] — [can combine, why it works well]
---

## 🔴 [translated title for "Caution: Conflicts!"]

 [translated label for "Avoid Combining With"]:
- [Ingredient/product type] — [reason to avoid]

Ensure the output strictly follows the JSON schema.`.trim();

  if (!userProfile) return basePrompt;

  // Main profile — used in warnings/sideEffects AND inside personalNote (with filtering)
  const profileLines = [
    userProfile.skinType        ? "skinType (FACE): "        + userProfile.skinType        : null,
    userProfile.skinSensitivity ? "skinSensitivity (FACE): " + userProfile.skinSensitivity : null,
    userProfile.skinConditions  ? "skinConditions (FACE): "  + userProfile.skinConditions  : null,
    userProfile.ageRange        ? "ageRange (FACE): "        + userProfile.ageRange         : null,
    userProfile.hairType        ? "hairType (HAIR): "        + userProfile.hairType         : null,
    userProfile.scalpCondition  ? "scalpCondition (HAIR): "  + userProfile.scalpCondition  : null,
    userProfile.hairProblems    ? "hairProblems (HAIR): "    + userProfile.hairProblems     : null,
    userProfile.bodySkinType    ? "bodySkinType (BODY): "    + userProfile.bodySkinType     : null,
    userProfile.climate         ? "climate (UNIVERSAL): "    + userProfile.climate          : null,
  ].filter(Boolean).join("\n");

  if (!profileLines) return basePrompt;

  const personalNoteSection = `

═══════════════════════════════════════════════════════════════════════
PERSONAL NOTE — READ CAREFULLY, FOLLOW THE ALGORITHM EXACTLY
═══════════════════════════════════════════════════════════════════════

You MUST produce a "personalNote" field in ${language}. Before writing it,
follow this algorithm STRICTLY:

STEP 1 — You already wrote "productType" earlier in the JSON. Read it.
         Classify it into exactly ONE category:

           • HAIR        — shampoo, conditioner, hair mask, hair oil,
                           dry shampoo, leave-in, scalp treatment, hair serum.
           • FACE        — face cream, face serum, toner, cleanser, sunscreen,
                           face mask, eye cream, essence, micellar water,
                           face peel, anything applied to the face.
           • BODY        — body lotion, body butter, body oil, body scrub,
                           body mist, body wash, hand cream, foot cream.
           • LIPS        — lip balm, lipstick, lip gloss, lip mask, lip oil.
           • NAILS       — nail polish, cuticle oil, nail strengthener.
           • OTHER       — decorative cosmetics, perfume, etc.

STEP 2 — Use this LOOKUP TABLE to decide which user preference fields
         are RELEVANT for this category. Only these fields may appear
         as bullets:

           HAIR  → hairType, scalpCondition, hairProblems, climate
           FACE  → skinType, skinSensitivity, skinConditions, ageRange, climate
           BODY  → bodySkinType, climate
           LIPS  → skinSensitivity, climate
           NAILS → (none)
           OTHER → skinSensitivity, climate

         The user's profile below is annotated with its category tag
         — (FACE), (HAIR), (BODY), (UNIVERSAL). Use the tag and the
         lookup table to decide what to include.

STEP 3 — HARD RULES (violating these is a critical error):

  ❌ If the product is HAIR → NEVER mention (FACE), (BODY), ageRange.
     No bullets about skin type, pores, acne, pigmentation, body skin, etc.
     Even if the user has them in their profile — IGNORE these fields completely.
  ❌ If the product is FACE → NEVER mention (HAIR), (BODY).
     No bullets about hair type, dandruff, body skin, etc.
  ❌ If the product is BODY → NEVER mention (FACE), (HAIR), ageRange.
     No bullets about face skin, hair, etc.
  ❌ Never write "N/A", "not applicable", "doesn't apply" — just omit the bullet.
  ❌ Allergies stay in "warnings" section — DO NOT put them in the preference list.

STEP 4 — Format for "personalNote" (translate ALL text to ${language}):

 **[Brief summary]**
  1-2 sentences referencing the SELECTED PREFERENCES — never the user.
  Use ONLY impersonal phrasing tied to the preferences themselves, e.g.:
    ✅ "Based on the selected preferences..."
    ✅ "According to the chosen preferences..."
    ✅ "Given the indicated skin type..."
    ✅ "For the specified preferences..."
  NEVER use second-person or possessive phrasing, e.g.:
    ❌ "suits your skin" / "your skin will love it" / "perfect for you"
    ❌ "good for you" / "matches your needs" / "ideal for your hair"
    ❌ "your dryness" / "your sensitivity"
  Translate the impersonal templates above into ${language}. Examples:
    RU: "Исходя из указанных предпочтений..." / "Согласно выбранным предпочтениям..."
    DE: "Basierend auf den ausgewählten Präferenzen..."
    UK: "Виходячи з обраних переваг..."
    FR: "Selon les préférences sélectionnées..."
    ES: "Según las preferencias seleccionadas..."
    IT: "In base alle preferenze selezionate..."
    TR: "Seçilen tercihlere göre..."

  **[By preferences:]**
  - <preference label in ${language}> <color emoji> — <one short explanation, max ~12 words, tie to specific ingredients>
  - <preference label in ${language}> <color emoji> — <one short explanation, max ~12 words, tie to specific ingredients>
  ...

  In bullet explanations the SAME impersonal rule applies — describe the
  ingredient's property, not "your skin". Good: "soothes redness (centella + panthenol)".
  Bad: "soothes your redness". Bad: "good for your skin".

  Color emoji:✅ suitable/beneficial, ⚠️ unclear/depends on individual reaction
  (default when uncertain), ⛔️ problematic/unsuitable.

  CRITICAL — LABEL RULES:
  ❌ NEVER output raw camelCase keys like "condPigmentation", "oilySkin", "skinType".
  🟢 Always translate preference keys and values into human-readable ${language} text.
     Examples: condPigmentation → "Uneven skin tone" / "Неровный тон кожи" / "Ungleichmäßiger Hautton"
               oilySkin → "Oily skin" / "Жирная кожа"
               dryness → "Dryness" / "Сухость"
  🟢 Use the preference VALUE as the bullet label (e.g. "Oily skin 🟢 — ..."),
     not the field name ("skinType").
  🟢 Each explanation must mention WHY — name the responsible ingredient(s)
     (e.g. "soothes redness (centella + panthenol)", "may clog pores (caprylic triglyceride)").
  🟢 Use mild phrasing: may cause, can be, tends to — no medical advice.

═══════════════════════════════════════════════════════════════════════
USER PROFILE (each line is tagged with its category):
${profileLines}
═══════════════════════════════════════════════════════════════════════`;

  return basePrompt + personalNoteSection;
}

// ── FAST analyze prompt ──────────────────────────────────────────────────────
// Reuses the FULL original buildAnalyzePrompt — instructions for ingredient
// recognition, public DB lookup, OCR correction, and the personalNote algorithm
// must stay identical. The schema (buildAnalysisFastSchema) is what restricts
// the output to only the fields shown immediately. Heavy fields are skipped
// because the schema doesn't list them — not because the prompt does.
function buildAnalyzeFastPrompt(language: string, userProfile?: Record<string, unknown>): string {
  return buildAnalyzePrompt(language, userProfile);
}

// ── DETAILS analyze prompt — heavy fields produced in a second request ──────
// Receives the fast result so AI doesn't re-analyze what's already known.
// Instructions are copied VERBATIM from buildAnalyzePrompt to preserve quality.
function buildAnalyzeDetailsPrompt(language: string, fastResult: Record<string, unknown>): string {
  const productLine    = `${fastResult.brand ?? ''} ${fastResult.productName ?? ''}`.trim();
  const productType    = String(fastResult.productType ?? '');
  const ingredientsStr = Array.isArray(fastResult.ingredients)
    ? (fastResult.ingredients as Array<Record<string, unknown>>)
        .map((i) => `${i.status ?? ''} ${i.name ?? ''}`)
        .join(', ')
    : '';

  return `
You are an expert cosmetic safety analyst. The product has already been identified.
Your ONLY task now: produce DETAILED sections (usage, benefits, sideEffects, warnings, interactions, alternatives).
Do NOT re-analyze ingredients. Do NOT change identification.

RESPOND ENTIRELY IN ${language}. Every text field, every label, every category name MUST be in ${language}.

PRODUCT: ${productLine}
PRODUCT TYPE: ${productType}
INGREDIENTS (with status emojis): ${ingredientsStr}

Search public databases (EWG Skin Deep, CosDNA, INCI Decoder, PubChem, CIR, EU CosIng) when needed.
NEVER invent data — if information is not found, write "Data not found in public databases.".

- usage: Use this exact format with emojis. Translate ALL labels (How to Apply / Frequency / Best Suited For). Use DOUBLE NEWLINES between items:
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

- benefits: Use this style with emojis and bullet points. Translate ALL category names. Use DOUBLE NEWLINES between categories:
🧱 [translated benefit category name]:
• [Ingredient/Mechanism] [description]

💧 [translated benefit category name]:
• [Ingredient/Mechanism] [description]

- sideEffects: Use the same style as benefits — emojis, bullet points, category headers. Group by type of reaction (e.g. skin irritation, allergic reactions, overuse effects). Use DOUBLE NEWLINES between categories:
🟡 [translated side effect category name]:
• [Ingredient] [description of potential reaction]

🔴 [translated side effect category name]:
• [Ingredient] [description of potential reaction]

- warnings: brief markdown paragraph. Mention allergies and contraindications. If user's known allergies are listed in the profile, address them here.

- interactions: Write a DETAILED section using emojis, categories and bullet points. Translate ALL category names AND block titles. The section MUST be split into TWO clearly labeled blocks separated by a divider line (---). Use DOUBLE NEWLINES between categories:

## 🟢 [translated title for "Best Combinations"]

 [translated label for "Actives Compatibility"]:
- [Active ingredient] — [can combine, why it works well]
---

## 🔴 [translated title for "Caution: Conflicts!"]

 [translated label for "Avoid Combining With"]:
- [Ingredient/product type] — [reason to avoid]

- alternatives: 2-3 real, commercially available products as a JSON array, ranked by INCI/active-ingredient overlap with the analyzed product. Each item: { name, brand, reason } where "reason" is one sentence naming 2–3 shared key INCI actives and any meaningful differences (concentration, format, pH, etc.).

Ensure the output strictly follows the JSON schema.`.trim();
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

// ── Local DB enrichment ───────────────────────────────────────────────────────
/**
 * Post-process Gemini's JSON response: for every ingredient that exists in our
 * local INGREDIENTS_DB, replace the AI-generated description and status with the
 * canonical values from the DB. This is what makes ~80% of every analysis
 * deterministic and saves output tokens (AI is allowed to output "-" for known
 * ingredients in the prompt).
 *
 * Receives a raw JSON string (Gemini's responseMimeType is application/json,
 * so it should always be valid JSON), returns a string with the same shape.
 * If parsing fails for any reason, the original string is returned untouched —
 * we never want enrichment to break the response.
 */
const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: "en", russian: "ru", german: "de", ukrainian: "uk",
  spanish: "es", french: "fr", italian: "it", turkish: "tr",
};

function applyLocalDbEnrichment(rawJson: string, language?: string): string {
  if (!rawJson) return rawJson;

  // Map full language name (e.g. "Russian") to code (e.g. "ru"), default "en"
  const langCode = LANGUAGE_NAME_TO_CODE[(language ?? "").toLowerCase()] ?? "en";

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return rawJson; // not JSON — let downstream handle it
  }

  if (!parsed || !Array.isArray(parsed.ingredients)) return rawJson;

  let knownCount = 0;
  parsed.ingredients = parsed.ingredients.map((ing: any) => {
    if (!ing || typeof ing.name !== "string") return ing;
    const key = ing.name.toLowerCase().trim();
    const local = INGREDIENTS_DB[key];
    if (!local) return ing; // unknown — keep AI result as-is

    knownCount++;
    // Extract localised string from description object; fallback to English
    const descObj = local.description as unknown as Record<string, string>;
    const description = descObj[langCode] ?? descObj["en"] ?? "";
    // Use the precise Yuka-style score stored in the local DB
    // AI score is ignored for known ingredients — DB score is authoritative
    return {
      name: ing.name,
      status: local.status,
      description,
      score: local.score,
    };
  });

  // Optional: log savings for debugging
  if (typeof console !== "undefined" && knownCount > 0) {
    console.log(
      `[ingredients-db] Enriched ${knownCount} of ${parsed.ingredients.length} ingredients from local DB`,
    );
  }

  return JSON.stringify(parsed);
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
  action = "unknown",
  modelOverride?: string,
): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> {
  let lastError: unknown;
  // If modelOverride is given, try it FIRST. On any failure (transient or 404),
  // fall through to the regular MODELS list — so quality and reliability are preserved.
  const modelsToTry = modelOverride
    ? [modelOverride, ...MODELS.filter(m => m !== modelOverride)]
    : MODELS;
  for (const model of modelsToTry) {
    const p = { ...params, model } as Parameters<GoogleGenAI["models"]["generateContent"]>[0];
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const _t0 = Date.now();
        const result = await ai.models.generateContent(p);
        logUsage(action, model, result.usageMetadata, Date.now() - _t0);
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
    const response = await generateWithRetry(ai, { contents: [{ parts: [{ text: message }] }] }, "test");
    return { status: 200, body: { response: response.text } };
  }

  // ── Identify (lightweight: only productName + brand for cache lookup) ──────
  // Используется клиентом перед полным analyze, чтобы проверить product_cache.
  // Стоит ~200 токенов вместо ~3000, поэтому даже если кэш-промах — потеря
  // маленькая. При попадании в кэш — экономия огромная.
  if (action === "identify") {
    const { base64Image, mimeType } = body as {
      base64Image?: string;
      mimeType?: string;
    };
    if (!base64Image || !mimeType) {
      return { status: 400, body: { error: "base64Image and mimeType are required." } };
    }
    const imageData = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    // identify использует Flash-Lite — задача простая, не нужна мощная модель
    const identifyResult = await ai.models.generateContent({
      model: MODEL_LITE,
      contents: [{
        parts: [
          { text: `Look at this cosmetic product photo and extract ONLY the product name and the brand name.
Return strict JSON with exactly two fields: "productName" and "brand".
If you cannot read either, return an empty string for that field.
Do not analyze ingredients. Do not write descriptions. Just identify.` },
          { inlineData: { data: imageData, mimeType } },
        ],
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            brand:       { type: Type.STRING },
          },
          required: ["productName", "brand"],
        },
        temperature: 0.1,
        maxOutputTokens: 60,
      },
    });
    logUsage("identify", MODEL_LITE, identifyResult.usageMetadata, 0);
    return { status: 200, rawText: identifyResult.text ?? "" };
  }

  // ── Analyze product image ───────────────────────────────────────────────────
  // ── Analyze FAST — first paint with only immediately-shown fields ─────────
  // Returns: productName, brand, productType, analysis, ingredients, shelfLife, personalNote
  // ~50% fewer tokens than full analyze → significantly faster first paint.
  if (action === "analyzeFast") {
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
          { text: buildAnalyzeFastPrompt(language, userProfile) },
          { inlineData: { data: imageData, mimeType } },
        ],
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: buildAnalysisFastSchema(withNote),
        temperature: 0.4,
        topP: 0.9,
      },
    }, "analyzeFast", MODEL_LITE);
    // ↑ MODEL_LITE (gemini-2.5-flash-lite) — ~2× faster than Flash 2.0 for this task.
    // Auto-falls back to Flash 2.0 / 2.5 from MODELS list on any failure.

    const enrichedText = applyLocalDbEnrichment(response.text ?? "", language);
    return { status: 200, rawText: enrichedText };
  }

  // ── Analyze DETAILS — deferred fields fetched after the first paint ────────
  // Receives the fast result (so AI doesn't re-identify) and returns:
  // usage, benefits, sideEffects, warnings, interactions, alternatives.
  if (action === "analyzeDetails") {
    const { fastResult, language } = body as {
      fastResult?: Record<string, unknown>;
      language?: string;
    };

    if (!fastResult || !language) {
      return { status: 400, body: { error: "fastResult and language are required." } };
    }

    const response = await generateWithRetry(ai, {
      contents: [{
        parts: [
          { text: buildAnalyzeDetailsPrompt(language, fastResult) },
        ],
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: buildAnalysisDetailsSchema(),
        temperature: 0.4,
        topP: 0.9,
      },
    }, "analyzeDetails");

    return { status: 200, rawText: response.text ?? "" };
  }

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
    }, "analyze");

    // ── Local DB enrichment ───────────────────────────────────────────────────
    // Override AI descriptions/statuses for ingredients known in our local DB.
    // This guarantees deterministic results for ~1000 well-known INCI and lets
    // the AI focus its tokens on truly unknown ingredients.
    const enrichedText = applyLocalDbEnrichment(response.text ?? "", language);
    return { status: 200, rawText: enrichedText };
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
    }, "translate");
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
    }, "ask");
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
    const isLipProduct = /lip balm|lipstick|lip gloss|lip mask|lip oil|бальзам для губ|помада|блеск для губ|lippenbalsam|lippenstift|baume à lèvres|rouge à lèvres/i.test(productType);
    const isBodyProduct = /body lotion|body butter|body oil|body scrub|body mist|body wash|body cream|hand cream|foot cream|лосьон для тела|масло для тела|скраб для тела|крем для рук|крем для ног|körperlotion|körpercreme|körperöl|handcreme|loción corporal|crème corps/i.test(productType);
    const isFaceProduct = /face|facial|eye cream|serum|toner|cleanser|sunscreen|spf|moistur|exfoliat|face mask|micellar|essence|для лица|сыворот|тонер|очищ|солнц|увлажн|крем для лица|маска для лица|gesicht|gesichtscreme|reiniger|toner|sérum|tonique/i.test(productType);

    // Face skin keys
    const faceSkinKeys = ["skinType", "skinSensitivity", "skinConditions", "ageRange"];
    // Body skin keys
    const bodySkinKeys = ["bodySkinType"];
    // Hair keys
    const hairKeys = ["hairType", "scalpCondition", "hairProblems"];
    // Always relevant
    const universalKeys = ["climate", "allergies"];

    let relevantKeys: string[];
    if (isHairProduct) {
      relevantKeys = [...hairKeys, ...universalKeys];
    } else if (isLipProduct) {
      relevantKeys = ["skinSensitivity", ...universalKeys];
    } else if (isBodyProduct) {
      relevantKeys = [...bodySkinKeys, ...universalKeys];
    } else if (isFaceProduct) {
      relevantKeys = [...faceSkinKeys, ...universalKeys];
    } else {
      // ambiguous — include everything
      relevantKeys = [...faceSkinKeys, ...bodySkinKeys, ...hairKeys, ...universalKeys];
    }

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

 **[Brief summary]** — 1-2 sentences referencing the SELECTED PREFERENCES.
  Use ONLY impersonal phrasing — never address the user directly.
    ✅ "Based on the selected preferences..."
    ✅ "According to the chosen preferences..."
    ✅ "Given the indicated skin type..."
  NEVER use second-person / possessive phrasing:
    ❌ "suits your skin" / "your skin will love it" / "perfect for you"
    ❌ "good for you" / "matches your needs" / "ideal for your hair"
  Translate templates into ${language}, e.g.:
    RU: "Исходя из указанных предпочтений..."
    DE: "Basierend auf den ausgewählten Präferenzen..."
    UK: "Виходячи з обраних переваг..."
    FR: "Selon les préférences sélectionnées..."
    ES: "Según las preferencias seleccionadas..."
    IT: "In base alle preferenze selezionate..."
    TR: "Seçilen tercihlere göre..."

**[By preferences:]**
- <preference value> <color emoji> — <one short sentence explanation>
- <preference value> <color emoji> — <one short sentence explanation>
...

In bullet explanations the same impersonal rule applies — describe the
ingredient's property, not "your skin". Good: "soothes redness (centella + panthenol)".
Bad: "soothes your redness". Bad: "good for your skin".

---
🟡 *[Automated analysis based on selected preferences. Not medical advice.]*

COLOR MARKERS — use EXACTLY these emojis:
- ✅ if the product's ingredients are likely suitable / beneficial for this preference
- ⚠️ if the effect is unclear, mixed, or depends on individual reaction
- ⛔️ if the product's ingredients are likely problematic / unsuitable for this preference

FORMAT RULES:
- List EVERY user preference relevant to this product type as its own bullet.
- Each bullet: "<preference name/value in ${language}> <color emoji> — <one short sentence, max ~12 words, name responsible ingredient(s)>"
- NEVER output raw camelCase keys like "condPigmentation", "oilySkin", "skinType".
  Always translate to human-readable ${language} text:
  condPigmentation → "Uneven skin tone" / "Неровный тон кожи" / "Ungleichmäßiger Hautton"
  Use the preference VALUE as the label, not the field key.
- Use the user's preference value as the label (e.g. "Oily skin ✅ — …", "Nut allergy ⚠️ — …", "Humid climate ⛔️ — …").
- Default to ⚠️ when evidence is weak or the effect depends on the person.
- Use mild phrasing in explanations (may cause, can be, tends to) — no medical advice.
- Each explanation must name the responsible ingredient(s) where possible.

Rules: no medical advice, tie every bullet to a preference, do not invent ingredients.
PRODUCT TYPE RELEVANCE — CRITICAL: For hair/scalp products (shampoo, conditioner, hair mask, hair oil, etc.) ONLY list hair-related preferences (hairType, scalpCondition, hairProblems) as bullets. Do NOT include skin conditions like enlarged pores, pigmentation, acne — they are irrelevant to hair products. For skincare products ONLY list skin-related preferences. Ignore hair preferences for face/body products.
CLIMATE: If climate is specified, include it as a bullet — apply it only in the context of the product's use area (scalp/hair for hair products, skin for skincare).
ALLERGIES: Each listed allergy MUST be its own bullet. If a matching ingredient or close derivative is found → ⛔️ with a clear warning. If no match found → 🟢 with "no matching ingredient detected" or similar.`;

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
    }, "personalNote");
    return { status: 200, rawText: response.text ?? "" };
  }


  return { status: 400, body: { error: `Unknown action: "${action}"` } };
}
