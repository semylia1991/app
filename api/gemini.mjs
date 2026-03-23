import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment variables.");
  return new GoogleGenAI({ apiKey });
};

// ОБНОВЛЕНО: Используем актуальную модель 2026 года

const MODEL = "gemini-2.5-flash";

// ── Rate limiting (in-memory, per IP) ────────────────────────────────────────
// Netlify functions can be recycled between requests, so this is a best-effort
// defence. For stronger guarantees, use Netlify Edge Middleware + KV store.
const RATE_LIMIT = 20;          // max requests per window
const RATE_WINDOW_MS = 60_000;  // 1 minute

/** @type {Map<string, { count: number; resetAt: number }>} */
const rateLimitStore = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  let entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + RATE_WINDOW_MS };
    rateLimitStore.set(ip, entry);
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true;

  entry.count++;
  return false;
}

// ── CORS helper ───────────────────────────────────────────────────────────────
// Allow only the configured APP_URL in production.
// Falls back to permissive "*" only when APP_URL is not set (local dev via
// netlify dev, where the Netlify CLI hasn't injected the secret yet).
function getAllowedOrigin(requestOrigin) {
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  if (!appUrl) return "*";                          // local dev fallback
  if (requestOrigin === appUrl) return appUrl;      // exact match
  return null;                                      // reject everything else
}

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────────
  const origin = req.headers["origin"] || "";
  const allowedOrigin = getAllowedOrigin(origin);

  if (allowedOrigin === null) {
    return res.status(403).json({ error: "Origin not allowed." });
  }

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (allowedOrigin !== "*") {
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
  }

  // ── Method guard ──────────────────────────────────────────────────────────
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  try {
    const ai = getAI();
    const { action } = body;

    // ── SimpleChat ──────────────────────
    if (!action) {
      const { message } = body;
      if (!message) return res.status(400).json({ error: "message is required" });

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: message }],
          },
        ],
      });

      return res.status(200).json({ response: response.text });
    }

    // ── Analyze ─────────────────────────
    if (action === "analyze") {
      const { base64Image, mimeType, language } = body;
      if (!base64Image || !mimeType || !language) {
        return res.status(400).json({ error: "base64Image, mimeType, and language are required" });
      }

      const prompt = `
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
`;

      const imageData = base64Image.includes(",")
        ? base64Image.split(",")[1]
        : base64Image;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { data: imageData, mimeType } },
            ],
          },
        ],
        config: {
  responseMimeType: "application/json",
  responseSchema: {
    type: "object",
    properties: {
      productName:  { type: "string" },
      brand:        { type: "string" },
      productType:  { type: "string" },
      analysis:     { type: "string" },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name:        { type: "string" },
            status:      { type: "string", enum: ["🟢", "🟡", "🔴"] },
            description: { type: "string" },
          },
        },
      },
      usage:        { type: "string" },
      benefits:     { type: "string" },
      sideEffects:  { type: "string" },
      warnings:     { type: "string" },
      interactions: { type: "string" },
      shelfLife:    { type: "string" },
      alternatives: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name:   { type: "string" },
            brand:  { type: "string" },
            reason: { type: "string" },
          },
          required: ["name", "brand", "reason"],
        },
      },
    },
    required: [
      "productName", "brand", "productType", "analysis", "ingredients",
      "usage", "benefits", "sideEffects", "warnings", "interactions",
      "shelfLife", "alternatives"
    ],
  },
},
      });

      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(response.text);
    }

    // ── Translate ───────────────────────
    if (action === "translate") {
      const { result, targetLanguage } = body;
      if (!result || !targetLanguage) {
        return res.status(400).json({ error: "result and targetLanguage are required" });
      }

      const prompt = `
Translate this JSON to ${targetLanguage}.
Return ONLY valid JSON.

${JSON.stringify(result)}
`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(response.text);
    }

    // ── Ask ─────────────────────────────
    if (action === "ask") {
      const { question, context, language } = body;
      if (!question || !context || !language) {
        return res.status(400).json({ error: "question, context, and language are required" });
      }

      const prompt = `
Context:
${JSON.stringify(context)}

Question: ${question}
Answer in ${language}.
`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      return res.status(200).json({ answer: response.text });
    }

    return res.status(400).json({ error: `Unknown action: "${action}"` });

  } catch (err) {
    console.error("Gemini error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
}
