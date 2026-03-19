import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment variables.");
  return new GoogleGenAI({ apiKey });
};

const MODEL = "gemini-2.0-flash";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

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

      return res.status(200).json({ response: response.text() });
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
- alternatives: List product names in **bold**, each on a new line.

- usage: Use this exact format with emojis. Use DOUBLE NEWLINES between items:
📋 How to Apply: [details]

⏰ Frequency: [details]

👤 Best Suited For: [details]

- benefits: Use this style with emojis and bullet points. Use DOUBLE NEWLINES between categories:
🧱 [Benefit Category]:
• [Ingredient/Mechanism] [description]

💧 [Benefit Category]:
• [Ingredient/Mechanism] [description]

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
        },
      });

      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(response.text());
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
      return res.status(200).send(response.text());
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

      return res.status(200).json({ answer: response.text() });
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
