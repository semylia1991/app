/**
 * gemini-handler.ts — single source of truth for all Gemini AI logic.
 * Imported by server.ts (dev) and api/gemini.mjs (prod Netlify).
 */

import { GoogleGenAI, Type } from "@google/genai";

const MODEL = "gemini-2.5-flash";

export interface HandlerResult {
  status: number;
  body: unknown;
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

Provide the analysis in ${language}.

Formatting Rules:
- productType: Identify exactly what the product is (e.g., "Moisturizing Cream", "Exfoliating Toner").
- analysis: Strictly 1-2 sentences. START by stating what the product is (e.g., "This is a [productType]. It features...").
- alternatives: Return 3–5 real products as a JSON array. Each item must have: "name" (product name), "brand" (manufacturer), "reason" (one sentence why it is a good alternative — similar ingredients, same concern, gentler formula, etc.).

- usage: Use this exact format with emojis. Translate ALL labels (How to Apply / Frequency / Best Suited For) into ${language}. Use DOUBLE NEWLINES between items:
👤 [translated label for "Best Suited For"]:
- [Skin type] — [why and how product behaves on this skin type]

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

- interactions: Write a DETAILED section using emojis, categories and bullet points. Translate ALL category names into ${language}. Use DOUBLE NEWLINES between categories:

⚗️ [translated label for "Actives Compatibility"]:
- [Active ingredient] — [can/cannot combine, why]

🔗 [translated label for "Ingredient Synergy"]:
- [Ingredient pair] — [how they enhance or conflict with each other]

🚫 [translated label for "Avoid Combining With"]:
- [Ingredient/product type] — [reason to avoid]

✅ [translated label for "Best Combinations"]:
- [Product/ingredient] — [why it works well together]

Ensure the output strictly follows the JSON schema.`.trim();

  if (!userProfile) return basePrompt;

  const profileLines = [
    userProfile.skinType        ? "Skin type: "         + userProfile.skinType        : null,
    userProfile.skinSensitivity ? "Sensitivities: "     + userProfile.skinSensitivity : null,
    userProfile.skinConditions  ? "Skin conditions: "   + userProfile.skinConditions  : null,
    userProfile.ageRange        ? "Age group: "         + userProfile.ageRange         : null,
    userProfile.hairType        ? "Hair type: "         + userProfile.hairType         : null,
    userProfile.scalpCondition  ? "Scalp condition: "   + userProfile.scalpCondition  : null,
    userProfile.hairProblems    ? "Hair problems: "     + userProfile.hairProblems     : null,
    userProfile.climate         ? "Climate / environment: " + userProfile.climate        : null,
  ].filter(Boolean).join("\n");

  const personalNoteSection = `

- Please note: Based on the user preferences below and the product ingredients, generate an analysis note IN ${language}.
  The text MUST explicitly include phrasing such as: "based on the selected preferences", "considering these preferences" or equivalent in ${language}.
  Follow this EXACT structure (translate all headings to ${language}):

  🧴**[translate: Brief summary]**
  (1-2 sentences, explicitly referencing the selected preferences)

  🔗**[translate: What to look out for:]**
  - [ingredient or group] — [why this may matter based on selected preferences]

  📋**[translate: Beneficial components:]**
  - [ingredient] — [what function it performs in the context of these preferences]

  ---
  ⚠️*[translate: Automated analysis based on selected preferences. Not medical advice.]*

  RULES for personalNote:
  - Do not give medical advice.
  - Do not use words like treats, prescribe, contraindicated.
  - Do not state directly that a product is suitable or unsuitable.
  - Use mild phrasing: worth noting, may cause, is sometimes associated with.
  - Explicitly tie observations to the selected preferences.
  - Do not refer to personal data or identity.
  - Consider factor combinations (e.g. sensitive skin + alcohol).
  - ALLERGIES: If the user listed any allergies or intolerances, you MUST check every ingredient against that list. Any match or close derivative MUST appear in "What to look out for" with a clear warning. Never omit this even if the rest of the product looks safe.
  - CLIMATE: If the user specified a climate, you MUST comment on how the product's ingredients perform in that environment (e.g. humectants in dry climate, SPF relevance in sunny climate, occlusive agents in cold/windy climate, lightweight formulas in humid climate). Include this in "Beneficial components" or "What to look out for" as appropriate.

USER PREFERENCES:
${profileLines}`;

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


// ── Retry wrapper for transient Gemini errors (503 / 429) ─────────────────────
async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  maxAttempts = 3,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      lastError = err;
      const errStr = String(err?.message ?? "") + String(err?.status ?? "") + String(err?.code ?? "");
      const retryable =
        errStr.includes("503") ||
        errStr.includes("429") ||
        errStr.includes("UNAVAILABLE") ||
        errStr.includes("RESOURCE_EXHAUSTED") ||
        errStr.includes("high demand") ||
        errStr.includes("quota");
      if (!retryable || attempt === maxAttempts) throw err;
      const delay = attempt * 500; // 500ms, 1000ms — stays within Vercel 10s timeout
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
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
    const response = await generateWithRetry(ai, { model: MODEL, contents: message });
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
      model: MODEL,
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
      model: MODEL,
      contents: buildTranslatePrompt(result, targetLanguage),
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
      model: MODEL,
      contents: buildAskPrompt(question, context, language),
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

    const profileLines = Object.entries(userProfile as Record<string, string>)
      .filter(([, v]) => v)
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
INGREDIENTS:
${ingredients}

Return ONLY valid JSON with a single field "personalNote" (string, in ${language}).
Structure (translate all headings to ${language}):

🧴 **[Brief summary]** — 1-2 sentences referencing the preferences explicitly.

🔗 **[What to look out for:]**
- [ingredient] — [why it may matter given these preferences]

📋 **[Beneficial components:]**
- [ingredient] — [what it does in the context of these preferences]

---
⚠️ *[Automated analysis based on selected preferences. Not medical advice.]*

Rules: no medical advice, mild phrasing (may cause / worth noting), tie every observation to the preferences.
If allergies listed — flag any matching ingredient in "What to look out for".`;

    const response = await generateWithRetry(ai, {
      model: MODEL,
      contents: prompt,
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
