import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import dotenv from "dotenv";
 
dotenv.config({ path: ".env.local" });
 
// ОБНОВЛЕНО: Используем актуальную модель 2026 года

const MODEL = "gemini-2.5-flash";

async function startServer() {
  const app = express();
  const PORT = 3000;
 
  app.use(express.json({ limit: "20mb" }));
 
  // ── /api/gemini — full mirror of netlify/functions/gemini.mjs ─────────────
  app.post("/api/gemini", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }
 
    const ai = new GoogleGenAI({ apiKey });
    const { action } = req.body;
 
    try {
      // ── SimpleChat (no action field) ───────────────────────────────────────
      if (!action) {
        const { message } = req.body;
        if (!message || typeof message !== "string") {
          return res.status(400).json({ error: "message is required and must be a string." });
        }
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: message,
        });
        return res.json({ response: response.text });
      }
 
      // ── Analyze product image ──────────────────────────────────────────────
      if (action === "analyze") {
        const { base64Image, mimeType, language } = req.body;
        if (!base64Image || !mimeType || !language) {
          return res.status(400).json({ error: "base64Image, mimeType, and language are required." });
        }
 
        const prompt = `
          You are an expert cosmetic safety analyst and INCI decoder.
          Analyze the provided image of a cosmetic product or its ingredient list.
          Extract the product name, brand, and INCI ingredients. Correct any OCR errors.
          If data is missing, search your knowledge base (EWG Skin Deep, CosDNA, INCI Decoder, PubChem, CIR, EU CosIng).
          NEVER invent ingredients, ratings, or studies. If data is not found, state "Data not found in public databases." (translated to the requested language).
          
          Provide the analysis in ${language}.
          
          Formatting Rules:
          - productType: Identify exactly what the product is (e.g., "Moisturizing Cream", "Exfoliating Toner").
          - analysis: Strictly 1-2 sentences. START by stating what the product is (e.g., "This is a [productType]. It features...").
          - alternatives: List product names in **bold**, each on a new line.
          - usage: Use this exact format with emojis. Use DOUBLE NEWLINES between items to create clear paragraphs:
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
 
        const imageData = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
 
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: [{ parts: [{ text: prompt }, { inlineData: { data: imageData, mimeType } }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
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
                alternatives: { type: Type.STRING },
              },
              required: [
                "productName", "brand", "productType", "analysis", "ingredients",
                "usage", "benefits", "sideEffects", "warnings", "interactions",
                "shelfLife", "alternatives",
              ],
            },
          },
        });
 
        res.setHeader("Content-Type", "application/json");
        return res.send(response.text);
      }
 
      // ── Translate analysis result ──────────────────────────────────────────
      if (action === "translate") {
        const { result, targetLanguage } = req.body;
        if (!result || !targetLanguage) {
          return res.status(400).json({ error: "result and targetLanguage are required." });
        }
 
        const prompt = `
          Translate the following JSON object representing a cosmetic product analysis into ${targetLanguage}.
          Maintain all formatting (emojis, bold text, newlines, bullet points).
          Do NOT translate brand names or product names if they are proper nouns.
          Respond ONLY with valid JSON matching the same schema. No preamble, no markdown fences.
          
          JSON to translate:
          ${JSON.stringify(result)}
        `;
 
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });
 
        res.setHeader("Content-Type", "application/json");
        return res.send(response.text);
      }
 
      // ── Ask follow-up question ─────────────────────────────────────────────
      if (action === "ask") {
        const { question, context, language } = req.body;
        if (!question || !context || !language) {
          return res.status(400).json({ error: "question, context, and language are required." });
        }
 
        const prompt = `
          You are an expert cosmetic safety analyst.
          Context about the product:
          ${JSON.stringify(context)}
          
          User question: ${question}
          
          Answer in ${language}. Be concise and helpful.
        `;
 
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: prompt,
        });
 
        return res.json({ answer: response.text ?? "" });
      }
 
      return res.status(400).json({ error: `Unknown action: "${action}"` });
 
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });
 
  // ── Vite dev middleware ────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
 
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
 
startServer();
