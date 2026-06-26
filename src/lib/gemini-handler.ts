/**
 * gemini-handler.ts — single source of truth for all Gemini AI logic.
 * Imported by server.ts (dev) and api/gemini.mjs (prod Netlify).
 */

import { GoogleGenAI, Type } from "@google/genai";
import { INGREDIENTS_DB } from "./ingredients-db.js";

// ── Supabase REST helpers (for ingredient_extras community cache) ──────────
// Uses fetch() directly — no @supabase/supabase-js dependency in the server.
// Env vars required:
//   SUPABASE_URL (or VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY as fallback)
function getSupabaseConfig(): { url: string; key: string } | null {
  // process is available in Node.js (Vercel/server). Guard for browser bundles.
  if (typeof process === 'undefined' || !process.env) return null;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

interface IngredientExtraRow {
  inci_name:   string;
  status:      string;
  score:       number;
  description: string;
}

/**
 * Batch lookup unknown ingredient names in the Supabase community cache.
 * Returns a map name → row for ingredients found. Failures are silent.
 */
async function fetchIngredientExtras(
  names: string[],
  langCode: string,
): Promise<Map<string, IngredientExtraRow>> {
  const out = new Map<string, IngredientExtraRow>();
  if (names.length === 0) return out;
  const cfg = getSupabaseConfig();
  if (!cfg) return out;

  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/get_ingredient_extras`, {
      method: 'POST',
      headers: {
        'apikey': cfg.key,
        'Authorization': `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_names: names, p_lang: langCode }),
    });
    if (!res.ok) return out;
    const rows = await res.json() as IngredientExtraRow[];
    for (const r of rows) {
      if (r?.inci_name) out.set(r.inci_name, r);
    }
  } catch (e) {
    console.warn('[ingredient_extras] fetch failed:', e);
  }
  return out;
}

/**
 * Upsert a new AI-generated description into the community cache.
 * Fire-and-forget — failures don't block the user response.
 */
async function saveIngredientExtra(
  name: string,
  status: string,
  score: number,
  langCode: string,
  description: string,
): Promise<void> {
  const cfg = getSupabaseConfig();
  if (!cfg) return;
  // Filter out placeholder descriptions
  if (!description || description.trim().length <= 1) return;

  try {
    await fetch(`${cfg.url}/rest/v1/rpc/upsert_ingredient_extra`, {
      method: 'POST',
      headers: {
        'apikey': cfg.key,
        'Authorization': `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_inci_name:   name,
        p_status:      status,
        p_score:       Math.round(score),
        p_lang:        langCode,
        p_description: description.trim(),
      }),
    });
  } catch (e) {
    console.warn('[ingredient_extras] save failed:', e);
  }
}

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

// Schema for FAST first-paint response.
// `ingredients` is just an array of INCI NAMES (strings).
// status/score/description are filled in client-side from the local DB.
// AI extracts ONLY the names — much lighter response, fewer hallucinations,
// and the same JSON works for ALL 8 languages without re-translation.
function buildAnalysisFastSchema(withPersonalNote: boolean) {
  const properties: Record<string, unknown> = {
    productName:  { type: Type.STRING },
    brand:        { type: Type.STRING },
    productType:  { type: Type.STRING },
    analysis:     { type: Type.STRING },
    shelfLife:    { type: Type.STRING },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
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

- sideEffects: This is the "Known Sensitivities" section — frame everything as a COSMETIC observation, NOT a medical/pharmacological effect. Use the same style as benefits — emojis, bullet points, category headers. Translate ALL category names. Group by type of skin sensitivity (e.g. possible irritation, sensitivities for certain skin types, sensitivities from overuse). Use cosmetic phrasing: "May cause irritation if applied directly", "Known sensitivity for certain skin types", "Avoid if sensitive to…". NEVER use medical/drug terms like "side effect", "adverse reaction", "contraindicated", or "used to treat". Use DOUBLE NEWLINES between categories:
🟡 [translated sensitivity category name]:
• [Ingredient] [cosmetic description, e.g. "may cause irritation if applied directly"]

🔴 [translated sensitivity category name]:
• [Ingredient] [cosmetic description, e.g. "avoid if sensitive to this ingredient"]

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
// Compact prompt focused on: identification, ingredient OCR, brief analysis,
// and (if profile present) personalNote.
// Status/score/description for ingredients are NOT generated by AI — the server
// fills them from the local DB after the response. AI only returns INCI NAMES.
function buildAnalyzeFastPrompt(language: string, userProfile?: Record<string, unknown>): string {
  const basePrompt = `
You are an expert cosmetic safety analyst and INCI decoder.
Analyze the provided image of a cosmetic product or its ingredient list.
Extract the product name, brand, and INCI ingredients. Correct any OCR errors.
If data is missing, search your knowledge base (EWG Skin Deep, CosDNA, INCI Decoder, PubChem, CIR, EU CosIng).
NEVER invent ingredients. If not found, state "Data not found in public databases.".

RESPOND ENTIRELY IN ${language}. Every text field MUST be in ${language},
EXCEPT the "ingredients" array — see below.

INGREDIENTS — CRITICAL RULES (read carefully):
Output an array of INCI NAMES (strings only) in label order (highest
concentration first). INCI names are an INTERNATIONAL STANDARD — they are
the same in every country and must NEVER be translated.

Required format for every ingredient name:
  • ALWAYS use the canonical English/Latin INCI name, even when ${language} is
    not English. Examples of CORRECT output regardless of ${language}:
        "aqua"   "glycerin"   "parfum"   "sodium hyaluronate"   "tocopherol"
  • NEVER translate or localize:
        ❌ "вода" / "Wasser" / "agua"        → ✓ "aqua"
        ❌ "глицерин" / "Glyzerin"           → ✓ "glycerin"
        ❌ "отдушка" / "Duftstoff" / "Profumo" → ✓ "parfum"
        ❌ "витамин Е" / "Vitamin E"         → ✓ "tocopherol"
  • Lowercase preferred. No trailing punctuation, no parentheses, no slashes.
        ❌ "Aqua/Water" / "Aqua (Water)"     → ✓ "aqua"
        ❌ "CI 77891"                        → ✓ "ci 77891"
  • If a label shows "Aqua/Water/Eau", output ONLY "aqua".
  • If you can't read part of a name, omit it entirely — never guess.

Why this matters: the server matches your output against a database keyed by
canonical INCI. Localized or hybrid names (like "aqua/water") will fail to
match and the user will lose the safety rating for that ingredient.

Do NOT include status emojis, descriptions, scores, or any extra fields —
these are added by the server from a local INCI database.

Formatting Rules:
- productType: exact type (e.g. "Moisturizing Cream", "Exfoliating Toner").
- analysis: STRICTLY 1-2 sentences. START by stating what the product is.
- shelfLife: shelf life and storage conditions. Include: period after opening (PAO, e.g. "12M"), recommended storage temperature, light/humidity conditions, and any special notes (e.g. "keep away from direct sunlight", "store in cool dry place"). Write 2-4 sentences. If not determinable from the product type, write what is typical for this category.
`.trim();

  if (!userProfile) return basePrompt;

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

  // Re-use the same personalNote section as buildAnalyzePrompt — it's the
  // identical algorithm and we don't want behavioural drift.
  const personalNoteSection = `

═══════════════════════════════════════════════════════════════════════
PERSONAL NOTE — produce a "personalNote" field in ${language}.

STEP 1 — classify productType into ONE category:
  HAIR (shampoo/conditioner/oil/mask/scalp), FACE (cream/serum/toner/sunscreen),
  BODY (lotion/butter/oil/scrub), LIPS, NAILS, OTHER.

STEP 2 — only use these profile fields per category:
  HAIR  → hairType, scalpCondition, hairProblems, climate
  FACE  → skinType, skinSensitivity, skinConditions, ageRange, climate
  BODY  → bodySkinType, climate
  LIPS  → skinSensitivity, climate
  NAILS → (none)
  OTHER → skinSensitivity, climate

Strict category isolation: HAIR products only mention hair fields, FACE only
skin, BODY only body. Never cross. NEVER mention irrelevant preferences.
Allergies stay in warnings.

STEP 3 — Format:
  **[Brief summary]**
  1-2 sentences referencing the SELECTED PREFERENCES — never the user.
  Use ONLY impersonal phrasing tied to the preferences themselves, e.g.:
    ✅ "Based on the selected preferences..."
    ✅ "According to the chosen preferences..."
    ✅ "Given the indicated skin type..."
  NEVER use second-person or possessive phrasing, e.g.:
    ❌ "suits your skin" / "your skin will love it" / "perfect for you"
  Translate the impersonal templates into ${language}. Examples:
    RU: "Исходя из указанных предпочтений..."
    DE: "Basierend auf den ausgewählten Präferenzen..."
    UK: "Виходячи з обраних переваг..."
    FR: "Selon les préférences sélectionnées..."
    ES: "Según las preferencias seleccionadas..."
    IT: "In base alle preferenze selezionate..."
    TR: "Seçilen tercihlere göre..."

  **[By preferences:]**
  - <preference label in ${language}> <emoji ✅⚠️⛔️> — <short ingredient-based explanation, max ~12 words>
  - ...

  In bullet explanations the SAME impersonal rule applies — describe the
  ingredient's property, not "your skin". Good: "soothes redness (centella + panthenol)".
  Bad: "soothes your redness".

  ❌ NEVER output raw camelCase keys like "condPigmentation", "oilySkin".
  🟢 Always translate preference keys/values into human-readable ${language} text.
  🟢 Use the preference VALUE as the bullet label.
  🟢 Each explanation must mention WHY — name the responsible ingredient(s).
  🟢 Use mild phrasing: may cause, can be, tends to — no medical advice.

USER PROFILE:
${profileLines}
═══════════════════════════════════════════════════════════════════════`;

  return basePrompt + personalNoteSection;
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

- sideEffects: This is the "Known Sensitivities" section — frame everything as a COSMETIC observation, NOT a medical/pharmacological effect. Use the same style as benefits — emojis, bullet points, category headers. Group by type of skin sensitivity (e.g. possible irritation, sensitivities for certain skin types, sensitivities from overuse). Use cosmetic phrasing: "May cause irritation if applied directly", "Known sensitivity for certain skin types", "Avoid if sensitive to…". NEVER use medical/drug terms like "side effect", "adverse reaction", "contraindicated", or "used to treat". Use DOUBLE NEWLINES between categories:
🟡 [translated sensitivity category name]:
• [Ingredient] [cosmetic description, e.g. "may cause irritation if applied directly"]

🔴 [translated sensitivity category name]:
• [Ingredient] [cosmetic description, e.g. "avoid if sensitive to this ingredient"]

- warnings: brief markdown paragraph. Mention allergies and contraindications. If user's known allergies are listed in the profile, address them here.

- interactions: Write a DETAILED section using emojis, categories and bullet points. Translate ALL category names AND block titles. The section MUST be split into TWO clearly labeled blocks separated by a divider line (---). Use DOUBLE NEWLINES between categories:

## 🟢 [translated title for "Best Combinations"]

 [translated label for "Actives Compatibility"]:
- [Active ingredient] — [can combine, why it works well]
---

## 🔴 [translated title for "Caution: Conflicts!"]

 [translated label for "Avoid Combining With"]:
- [Ingredient/product type] — [reason to avoid]

- alternatives: 1-2 real, commercially available products as a JSON array, ranked by INCI/active-ingredient overlap with the analyzed product. Each item: { name, brand, reason } where "reason" is one sentence naming 2–3 shared key INCI actives and any meaningful differences (concentration, format, pH, etc.).

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

// ── Localized synonym map — last-resort fallback ───────────────────────────
// If AI accidentally translates an ingredient name (against instructions),
// we still want to recognize the most common ones. Only the very common
// ingredients are listed here — for the rest, the AI prompt is the safeguard.
const LOCALIZED_SYNONYMS: Record<string, string> = {
  // → aqua
  'water': 'aqua', 'eau': 'aqua', 'wasser': 'aqua', 'agua': 'aqua',
  'acqua': 'aqua', 'su': 'aqua', 'su (water)': 'aqua',
  'вода': 'aqua', 'вода (aqua)': 'aqua',
  // → glycerin
  'glycerine': 'glycerin', 'glyzerin': 'glycerin', 'glicerina': 'glycerin',
  'glicerina vegetale': 'glycerin', 'glicerine': 'glycerin',
  'глицерин': 'glycerin',
  // → parfum / fragrance
  'fragrance': 'parfum', 'duftstoff': 'parfum', 'profumo': 'parfum',
  'fragancia': 'parfum', 'parfüm': 'parfum',
  'отдушка': 'parfum', 'аромат': 'parfum',
  // → alcohol denat
  'denatured alcohol': 'alcohol denat', 'alcool denat': 'alcohol denat',
  'denat. alcohol': 'alcohol denat', 'sd alcohol': 'alcohol denat',
  'денатурированный спирт': 'alcohol denat', 'спирт денат': 'alcohol denat',
  // → tocopherol
  'vitamin e': 'tocopherol', 'vit. e': 'tocopherol', 'vitamine e': 'tocopherol',
  'витамин e': 'tocopherol', 'витамин е': 'tocopherol',
  // → ascorbic acid
  'vitamin c': 'ascorbic acid', 'vit. c': 'ascorbic acid', 'vitamine c': 'ascorbic acid',
  'витамин c': 'ascorbic acid', 'витамин с': 'ascorbic acid',
  // → retinol
  'vitamin a': 'retinol', 'vit. a': 'retinol',
  'витамин а': 'retinol',
  // → niacinamide
  'nicotinamide': 'niacinamide', 'vitamin b3': 'niacinamide',
  'витамин b3': 'niacinamide', 'ниацинамид': 'niacinamide',
  // → panthenol
  'pro-vitamin b5': 'panthenol', 'provitamin b5': 'panthenol',
  'пантенол': 'panthenol',
  // → sodium hyaluronate
  'hyaluronic acid sodium salt': 'sodium hyaluronate',
  'гиалуроновая кислота': 'sodium hyaluronate', 'гиалуронат натрия': 'sodium hyaluronate',
};

/**
 * Normalise an ingredient name to a key that matches our local DB.
 *
 * Tries multiple strategies in order:
 *   1. Plain lowercase + trim (90% of cases — AI usually returns clean INCI).
 *   2. Strip parentheses: "aqua (water)" → "aqua"
 *   3. Strip slash variants: "aqua/water/eau" → first part "aqua"
 *   4. Each part of slash split: try "aqua", "water", "eau" individually.
 *   5. Trailing punctuation cleanup.
 *   6. Localized synonym lookup for the most common translated names.
 *
 * Returns the original key (lowercase trimmed) if nothing matches —
 * so the ingredient still shows up, just as "unknown".
 */
function normalizeIngredientName(raw: string): {
  matchedKey: string | null;     // key that matched in INGREDIENTS_DB, or null
  displayName: string;            // cleaned-up name to show user
} {
  const lower = raw.toLowerCase().trim();
  if (!lower) return { matchedKey: null, displayName: raw };

  // Strategy 1: direct match
  if (INGREDIENTS_DB[lower]) return { matchedKey: lower, displayName: lower };

  // Strategy 2: strip trailing punctuation
  const cleaned = lower.replace(/[.,;:!?*]+$/g, '').trim();
  if (cleaned && INGREDIENTS_DB[cleaned]) {
    return { matchedKey: cleaned, displayName: cleaned };
  }

  // Strategy 3: strip parentheses "aqua (water)" → "aqua"
  const noParens = cleaned.replace(/\s*\([^)]*\)\s*/g, '').trim();
  if (noParens && noParens !== cleaned && INGREDIENTS_DB[noParens]) {
    return { matchedKey: noParens, displayName: noParens };
  }

  // Strategy 4: slash split — "aqua/water/eau" → try each part
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/').map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (INGREDIENTS_DB[part]) {
        return { matchedKey: part, displayName: part };
      }
    }
    // None matched — display the FIRST part (usually the canonical one),
    // so users see consistent names across languages.
    if (parts.length > 0) {
      return { matchedKey: null, displayName: parts[0] };
    }
  }

  // Strategy 5: collapse internal whitespace
  const collapsed = cleaned.replace(/\s+/g, ' ');
  if (collapsed !== cleaned && INGREDIENTS_DB[collapsed]) {
    return { matchedKey: collapsed, displayName: collapsed };
  }

  // Strategy 6: localized synonym fallback (last resort for translated names)
  const synonymKey = LOCALIZED_SYNONYMS[cleaned] ?? LOCALIZED_SYNONYMS[lower];
  if (synonymKey && INGREDIENTS_DB[synonymKey]) {
    return { matchedKey: synonymKey, displayName: synonymKey };
  }

  // No match — return the cleaned name so display is at least normalised
  return { matchedKey: null, displayName: cleaned || lower };
}

/**
 * Convert ingredients into the canonical { name, status, score, description } form.
 *
 * Tiered lookup:
 *   L0 (local, instant):    INGREDIENTS_DB shipped with the code (~1025 well-known INCI)
 *   L1 (Supabase, ~150ms):  ingredient_extras — community cache of rare ingredients
 *                            populated by previous AI scans
 *   L2 (AI fallback):        if neither has it, keep AI-supplied fields (status/score/desc)
 *                            AND save them to L1 for future users (auto-grow the cache)
 *
 * Accepts BOTH new and legacy formats:
 *   - New: ingredients = ["aqua", "glycerin", ...]   (array of strings)
 *   - Legacy: ingredients = [{ name, status?, description?, score? }, ...]
 *
 * @param includeDescriptions — when true, fills `description` from DB.
 *   When false, leaves it empty.
 */
/**
 * Background task: generate descriptions for ingredients NOT found in
 * either L0 (local DB) or L1 (Supabase community cache), then save them
 * to L1 so future users get them instantly without AI.
 *
 * Fire-and-forget — called AFTER the user response is sent, so it doesn't
 * add latency. Uses MODEL_LITE (cheapest tier) and one batch request.
 */
async function enrichUnknownsInBackground(
  ai: GoogleGenAI,
  unknownNames: string[],
  langCode: string,
): Promise<void> {
  if (unknownNames.length === 0) return;
  if (unknownNames.length > 10) unknownNames = unknownNames.slice(0, 10); // cap=10 to stay well under Vercel 10s timeout

  // Use the full language name for the AI prompt (more reliable than codes)
  const langName = Object.entries(LANGUAGE_NAME_TO_CODE).find(([, c]) => c === langCode)?.[0] ?? 'english';
  const langNameCapitalized = langName.charAt(0).toUpperCase() + langName.slice(1);

  const prompt = `
For each INCI ingredient below, output a single JSON object with this exact shape:
{
  "items": [
    { "name": "<lowercase INCI as given>", "status": "🟢|🟡|🔴", "score": <0-10 integer>, "description": "<1-7 words in ${langNameCapitalized}>" },
    ...
  ]
}

Rules:
- status: 🟢 safe (7-10), 🟡 caution (3-6), 🔴 avoid (0-2).
- score: integer 0-10 matching status range.
- description: 1-7 words in ${langNameCapitalized}, explaining function and any safety note.
- If unknown, skip the item (do not invent).
- Output ONLY valid JSON, no markdown.

INGREDIENTS:
${unknownNames.map(n => `- ${n}`).join('\n')}
`.trim();

  try {
    const response = await generateWithRetry(ai, {
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name:        { type: Type.STRING },
                  status:      { type: Type.STRING, enum: ['🟢', '🟡', '🔴'] },
                  score:       { type: Type.NUMBER },
                  description: { type: Type.STRING },
                },
                required: ['name', 'status', 'score', 'description'],
              },
            },
          },
          required: ['items'],
        },
        temperature: 0.2,
      },
    }, 'enrichUnknowns', MODEL_LITE);

    const parsed = JSON.parse(response.text ?? '{}');
    const items = (parsed?.items ?? []) as Array<{
      name: string; status: string; score: number; description: string;
    }>;

    // Save each to Supabase community cache (parallel, fire-and-forget)
    await Promise.allSettled(items.map(it => {
      if (!['🟢', '🟡', '🔴'].includes(it.status)) return Promise.resolve();
      if (typeof it.score !== 'number' || it.score < 0 || it.score > 10) return Promise.resolve();
      if (!it.description || it.description.trim().length <= 1) return Promise.resolve();
      return saveIngredientExtra(it.name, it.status, Math.round(it.score), langCode, it.description.trim());
    }));

    if (items.length > 0) {
      console.log(`[ingredient_extras] background-enriched ${items.length} new ingredients`);
    }
  } catch (e) {
    console.warn('[ingredient_extras] background enrichment failed:', e);
  }
}

async function applyLocalDbEnrichment(
  rawJson: string,
  language?: string,
  includeDescriptions = true,
  ai?: GoogleGenAI,
): Promise<string> {
  if (!rawJson) return rawJson;

  const langCode = LANGUAGE_NAME_TO_CODE[(language ?? "").toLowerCase()] ?? "en";

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return rawJson;
  }

  if (!parsed || !Array.isArray(parsed.ingredients)) return rawJson;

  // ── Pass 1: try L0 (local DB) for every ingredient ──────────────────────
  // Collect names that miss locally — we'll batch-query L1 (Supabase) for them.
  type Normalised = {
    rawIng: any;
    matchedKey: string | null;
    displayName: string;
  };
  const normalised: Normalised[] = parsed.ingredients.map((ing: any) => {
    const rawName = typeof ing === "string" ? ing : (ing?.name ?? "");
    if (typeof rawName !== "string" || !rawName.trim()) {
      return { rawIng: ing, matchedKey: null, displayName: "" };
    }
    const { matchedKey, displayName } = normalizeIngredientName(rawName);
    return { rawIng: ing, matchedKey, displayName };
  });

  // Names we need to look up in Supabase (not in local DB but have a displayName)
  const missingNames = normalised
    .filter(n => !n.matchedKey && n.displayName)
    .map(n => n.displayName.toLowerCase().trim());

  // ── L1: batch-fetch unknown names from Supabase community cache ─────────
  const extras = missingNames.length > 0
    ? await fetchIngredientExtras([...new Set(missingNames)], langCode)
    : new Map<string, IngredientExtraRow>();

  // ── Pass 2: build the final enriched list ───────────────────────────────
  let knownLocalCount = 0;
  let knownExtraCount = 0;
  const newAiEntries: Array<{ name: string; status: string; score: number; description: string }> = [];
  // Names that fell through ALL tiers and came in as strings (no AI fields) —
  // these need a background AI enrichment so the cache grows.
  const stringUnknowns: string[] = [];

  parsed.ingredients = normalised.map((n) => {
    if (!n.displayName) return n.rawIng; // skip empty input

    // L0 — local DB hit
    if (n.matchedKey) {
      const local = INGREDIENTS_DB[n.matchedKey];
      if (local) {
        knownLocalCount++;
        const descObj = local.description as unknown as Record<string, string>;
        const description = includeDescriptions
          ? (descObj[langCode] ?? descObj["en"] ?? "")
          : "";
        return {
          name: n.matchedKey,
          status: local.status,
          description,
          score:  local.score,
        };
      }
    }

    // L1 — Supabase community cache hit
    const extra = extras.get(n.displayName.toLowerCase().trim());
    if (extra) {
      knownExtraCount++;
      // If the description for the current language is missing (row exists
      // but only has translations for other langs), queue background AI
      // enrich so the language coverage grows over time.
      if (includeDescriptions && (!extra.description || extra.description.trim().length <= 1)) {
        stringUnknowns.push(n.displayName);
      }
      return {
        name: n.displayName,
        status:      extra.status,
        score:       extra.score,
        description: includeDescriptions ? extra.description : "",
      };
    }

    // L2 — neither has it. Keep AI-supplied fields and queue for save.
    if (typeof n.rawIng === "object" && n.rawIng !== null) {
      const status      = typeof n.rawIng.status === "string"      ? n.rawIng.status      : "🟡";
      const description = typeof n.rawIng.description === "string" ? n.rawIng.description : "";
      const score       = typeof n.rawIng.score === "number"       ? n.rawIng.score       : 5;
      if (description.trim().length > 1) {
        newAiEntries.push({ name: n.displayName, status, score, description });
      } else {
        // Object form but no description → still need background enrich
        stringUnknowns.push(n.displayName);
      }
      return { name: n.displayName, status, description, score };
    }
    // String form (new schema): AI returned just a name. Queue for background AI fill.
    stringUnknowns.push(n.displayName);
    return { name: n.displayName, status: "🟡", description: "", score: 5 };
  });

  // ── Fire-and-forget: write new entries to community cache (no await) ────
  // This makes the AI's findings available to ALL future users instantly.
  if (newAiEntries.length > 0) {
    Promise.allSettled(
      newAiEntries.map(e => saveIngredientExtra(e.name, e.status, e.score, langCode, e.description))
    ).catch(() => {});
  }

  // ── Background AI enrich for string-array unknowns ─────────────────────
  // When AI returns string[] (new schema), we have no descriptions/scores
  // for ingredients NOT in L0 or L1. Run a single batch AI call for them
  // and save results to the community cache. Fire-and-forget — user response
  // is not blocked.
  if (ai && stringUnknowns.length > 0) {
    void enrichUnknownsInBackground(ai, [...new Set(stringUnknowns)], langCode);
  }

  if (typeof console !== "undefined" && (knownLocalCount > 0 || knownExtraCount > 0)) {
    console.log(
      `[ingredients] Enriched: L0=${knownLocalCount}, L1=${knownExtraCount}, AI-saved=${newAiEntries.length}, bg-queue=${stringUnknowns.length} of ${parsed.ingredients.length}`,
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

    const enrichedText = await applyLocalDbEnrichment(response.text ?? "", language, true, ai);
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
    const enrichedText = await applyLocalDbEnrichment(response.text ?? "", language, true, ai);
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

  // ── Lazy ingredient description for items NOT in local DB ──────────────────
  // Returns ONE concise sentence (1–7 words, in target language) describing
  // what this INCI ingredient does and any safety note. Tiny, cacheable,
  // dispatched only when the user expands the ingredient in the UI.
  if (action === "ingredientDescription") {
    const { ingredientName, language } = body as {
      ingredientName?: string; language?: string;
    };
    if (!ingredientName || !language) {
      return { status: 400, body: { error: "ingredientName and language are required." } };
    }
    const prompt = `
You are an INCI ingredient expert.
Describe the ingredient "${ingredientName}" in ${language}.
Output: ONE sentence, 1–10 words. Explain what it does (function/role) and
note any safety concern if relevant. No greeting, no markdown, no quotes.
If you don't recognize the ingredient, return "Data not found in public databases." translated to ${language}.
`.trim();

    const response = await generateWithRetry(ai, {
      contents: [{ parts: [{ text: prompt }] }],
    }, "ingredientDescription", MODEL_LITE);
    return { status: 200, body: { description: (response.text ?? "").trim() } };
  }

  // ── Lazy explanation for ONE preference chip ───────────────────────────────
  // When the user expands a preference chip in the personal note section, we
  // fetch a short 1-sentence explanation of how this product relates to that
  // specific preference, naming the responsible ingredient(s).
  if (action === "explainPreference") {
    const { ingredients, preference, language } = body as {
      ingredients?: Array<{ name: string; status?: string; score?: number }>;
      preference?: string;
      language?: string;
    };
    if (!Array.isArray(ingredients) || !preference || !language) {
      return { status: 400, body: { error: "ingredients, preference, and language are required." } };
    }
    const ingredientList = ingredients
      .map((i) => `${i.status ?? ''} ${i.name}`.trim())
      .join(', ');

    const prompt = `
You are a cosmetic safety expert.
For the user preference "${preference}", explain in ${language} whether this
product is suitable, in 1 short sentence (max ~15 words). Name 1–3 specific
ingredient(s) responsible. Use impersonal phrasing — describe the property,
not the user (e.g. "soothes redness (centella + panthenol)" — not "soothes
your redness"). Use mild phrasing: may, can, tends to. No greeting, no markdown.
End the sentence with ONE emoji on the same line: ✅ if suitable, ⚠️ if uncertain, ⛔️ if problematic.

INGREDIENTS: ${ingredientList}
`.trim();

    const response = await generateWithRetry(ai, {
      contents: [{ parts: [{ text: prompt }] }],
    }, "explainPreference", MODEL_LITE);
    return { status: 200, body: { explanation: (response.text ?? "").trim() } };
  }

  // ── Short per-ingredient preference note (max ~12 words) ──────────────────
  // Triggered when user expands a preference row in the personal score widget.
  // Receives ONE ingredient name + ONE preference label.
  if (action === "ingredientPreferenceNote") {
    const { ingredientName, preferenceLabel, language } = body as {
      ingredientName?: string;
      preferenceLabel?: string;
      language?: string;
    };
    if (!ingredientName || !preferenceLabel || !language) {
      return { status: 400, body: { error: "ingredientName, preferenceLabel, and language are required." } };
    }

    const prompt = `
You are a cosmetic safety expert.
Explain in ${language} how "${ingredientName}" relates to the user preference "${preferenceLabel}".
Write exactly ONE short sentence, max 12 words.
Use impersonal phrasing (no "you", no "your"). No greeting, no markdown.
End with one emoji: ✅ beneficial, ⚠️ caution, ⛔️ problematic.
`.trim();

    const response = await generateWithRetry(ai, {
      contents: [{ parts: [{ text: prompt }] }],
    }, "ingredientPreferenceNote", MODEL_LITE);
    return { status: 200, body: { note: (response.text ?? "").trim() } };
  }
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
    const isHairProduct      = /shampoo|conditioner|hair mask|hair oil|hair serum|hair spray|dry shampoo|волос|шампун|кондиционер|маска для волос|haarpflege|haarmaske|haarshampoo|haaröl/i.test(productType);
    const isLipProduct       = /lip balm|lipstick|lip gloss|lip mask|lip oil|lip tint|lip liner|lip pencil|бальзам для губ|помада для губ|блеск для губ|тинт для губ|карандаш для губ|lippenbalsam|lippenstift|lipgloss|baume à lèvres|rouge à lèvres/i.test(productType);
    const isBodyProduct      = /body lotion|body butter|body oil|body scrub|body mist|body wash|body cream|hand cream|foot cream|лосьон для тела|масло для тела|скраб для тела|крем для рук|крем для ног|körperlotion|körpercreme|körperöl|handcreme|loción corporal|crème corps/i.test(productType);
    const isFoundationProduct = /foundation|тональн|bb.?cream|cc.?cream|conseal|консилер|пудра|powder|tinted moistur|тонирующ|base makeup|база под макияж/i.test(productType);
    const isBlushProduct     = /blush|bronzer|highlighter|contour|румян|бронзер|хайлайтер|контуринг|скульптур/i.test(productType);
    const isSettingProduct   = /setting spray|fixing spray|спрей для фиксации|фиксатор макияжа|makeup fixer/i.test(productType);
    const isEyeProduct       = /eyeshadow|mascara|eyeliner|eye pencil|eye primer|тени для глаз|тушь|подводка|карандаш для глаз|праймер для глаз|lidschatten|mascara|ombretto|eyeliner/i.test(productType);
    const isBrowProduct      = /brow|eyebrow|карандаш для бровей|тени для бровей|гель для бровей|помада для бровей|augenbraue|sourcils/i.test(productType);
    const isFaceProduct      = /face|facial|eye cream|serum|toner|cleanser|sunscreen|spf|moistur|exfoliat|face mask|micellar|essence|для лица|сыворот|тонер|очищ|солнц|увлажн|крем для лица|маска для лица|gesicht|gesichtscreme|reiniger|sérum|tonique/i.test(productType);

    // Key groups
    const faceSkinKeys    = ["skinType", "skinSensitivity", "skinConditions", "ageRange"];
    const bodySkinKeys    = ["bodySkinType"];
    const hairKeys        = ["hairType", "scalpCondition", "hairProblems"];
    const sensitivityOnly = ["skinSensitivity", "ageRange"];
    const universalKeys   = ["climate"];

    let relevantKeys: string[];
    if (isHairProduct) {
      relevantKeys = [...hairKeys, ...universalKeys];
    } else if (isLipProduct || isEyeProduct || isBrowProduct) {
      // Eye/lip/brow makeup — only sensitivity and age, no skin conditions
      relevantKeys = [...sensitivityOnly];
    } else if (isFoundationProduct) {
      // Foundation/concealer/powder — full face keys + climate (wears all day on skin)
      relevantKeys = [...faceSkinKeys, ...universalKeys];
    } else if (isBlushProduct) {
      // Blush/bronzer/highlighter — skin type + sensitivity + climate
      relevantKeys = ["skinType", "skinSensitivity", "ageRange", ...universalKeys];
    } else if (isSettingProduct) {
      // Setting sprays — skin type + sensitivity
      relevantKeys = ["skinType", "skinSensitivity", "ageRange"];
    } else if (isBodyProduct) {
      relevantKeys = [...bodySkinKeys, ...universalKeys];
    } else if (isFaceProduct) {
      relevantKeys = [...faceSkinKeys, ...universalKeys];
    } else {
      // default — face care
      relevantKeys = [...faceSkinKeys, ...universalKeys];
    }

    // Filter out "unknown" / "any" / "none" values — they carry no meaning for analysis
    const SKIP_VALUES = [
      'unknown', 'Unknown', 'any', 'Any', 'none', 'None',
      'skinUnknown', 'hairUnknown', 'climateAny',
      "Don't know", '\u041d\u0435 \u0437\u043d\u0430\u044e',
      '\u041d\u0435 \u0432\u0430\u0436\u043d\u043e', '\u041d\u0435 \u0432\u0430\u0436\u043b\u0438\u0432\u043e',
      'Egal', 'Peu importe', "Je ne sais pas",
      'Does not matter', 'Wei\u00df nicht',
      'hairNone', 'scalpNone', 'condNone', 'sensNone', 'bodySkinNone',
    ];

    const profileLines = Object.entries(userProfile as Record<string, string>)
      .filter(([k, v]) => v && relevantKeys.includes(k))
      .map(([k, v]) => {
        // Filter comma-separated lists, removing unknown values
        const filtered = v.split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => !SKIP_VALUES.some(skip =>
            s.toLowerCase() === skip.toLowerCase() || s.includes('unknown') || s.includes('Unknown')
          ))
          .join(', ');
        return filtered ? `${k}: ${filtered}` : null;
      })
      .filter(Boolean)
      .join("\n");

    if (!profileLines.trim()) {
      return { status: 400, body: { error: "No relevant profile fields for this product type." } };
    }

    const ingredients = Array.isArray((result as any).ingredients)
      ? (result as any).ingredients
          .map((i: any) => `${i.status} ${i.name}: ${i.description ?? ""}`)
          .join("\n")
      : "";

    const prompt = `You are a cosmetic safety analyst. A product has already been analyzed.
Your ONLY task: for each individual user preference value below, produce exactly ONE separate JSON item.
Do NOT re-analyze the product. Do NOT invent ingredients. Use ONLY what is listed.

USER PREFERENCES (each line = one value = one separate item in output):
${profileLines}

PRODUCT: ${(result as any).productName ?? ""} by ${(result as any).brand ?? ""}
PRODUCT TYPE: ${(result as any).productType ?? ""}
INGREDIENTS:
${ingredients}

Return ONLY valid JSON: { "criteria": [ { "emoji": "✅"|"⚠️"|"⛔️", "label": "<single preference value in ${language}>", "ingredient": "<exact INCI name from the list that drives this verdict, or empty string if none>", "relevant": true|false, "explanation": "<1-2 sentences in ${language}, name specific ingredient(s)>" } ] }

RELEVANCE — THE MOST IMPORTANT RULE:
- A preference is RELEVANT only if at least ONE ingredient in the list above measurably helps or harms it.
- For every preference value still output exactly ONE item (do not silently drop any), but:
    • If a specific ingredient drives the verdict → set "relevant": true and put that exact INCI name in "ingredient".
    • If NO ingredient in the list affects this preference → set "relevant": false, "ingredient": "", emoji "⚠️",
      and explanation "no relevant ingredient found" (translated to ${language}).
- NEVER fabricate a connection just to make a preference look relevant. If unsure whether an ingredient truly
  affects the preference, mark "relevant": false. The client hides everything with "relevant": false, so being
  honest here is what keeps the list short and accurate.

CRITICAL RULES:
- EACH preference value = EXACTLY ONE item. NEVER combine multiple values into one label.
  WRONG: { "label": "Пигментация, Расширенные поры, Неровный тон" }
  CORRECT: { "label": "Пигментация" }, { "label": "Расширенные поры" }, { "label": "Неровный тон" }
- WRONG: { "label": "Комбинированная, Сухая" }
  CORRECT: { "label": "Комбинированная" }, { "label": "Сухая" }
- WRONG: { "label": "Климат" } or { "label": "Чувствительность кожи" } — too vague, use the specific value
  CORRECT: { "label": "Влажный климат" }, { "label": "Солнечный климат" }
- PRODUCT TYPE RELEVANCE: hair products → only hair preferences. face/body → only skin preferences. All → include climate.
- emoji: ✅ beneficial, ⚠️ unclear/mixed (default when uncertain), ⛔️ problematic
- label: the specific preference value translated to ${language}. One value only. NEVER camelCase.
- explanation: name the responsible ingredient(s). Mild phrasing: may, can, tends to. No medical advice. Max ~20 words.
- ingredient: copy the exact INCI name from the INGREDIENTS list. Leave "" only when "relevant" is false.
- ALLERGIES: each allergy = its own item. Match found → relevant true, ⛔️, name the ingredient. No match → relevant false.
- Translate ALL text to ${language}.
- DETERMINISM: Be consistent. For the same ingredients and preferences, always produce the same emoji and explanation. Base your judgment strictly on the ingredient list — do not introduce variation. List criteria in the same order as the preferences appear above.
- Keep explanations factual and concise — name the specific ingredient, state its effect on that criterion. Avoid creative variation in wording.`;

    const response = await generateWithRetry(ai, {
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            criteria: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  emoji:       { type: Type.STRING },
                  label:       { type: Type.STRING },
                  ingredient:  { type: Type.STRING },
                  relevant:    { type: Type.BOOLEAN },
                  explanation: { type: Type.STRING },
                },
                required: ["emoji", "label", "ingredient", "relevant", "explanation"],
              },
            },
          },
          required: ["criteria"],
        },
        temperature: 0,
      },
    }, "personalNote");
    return { status: 200, rawText: response.text ?? "" };
  }


  return { status: 400, body: { error: `Unknown action: "${action}"` } };
}
