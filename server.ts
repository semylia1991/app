/**
 * server.ts — Dev server
 *
 * Тонкая обёртка над handleGeminiRequest из src/lib/gemini-handler.ts.
 * Вся бизнес-логика Gemini живёт там. Здесь только:
 *  - Express setup + Rate limiting + CORS + Vite dev middleware
 */
 
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { handleGeminiRequest } from "./src/lib/gemini-handler.js";
import { createCheckout, handleWebhook } from "./api/stripe.mjs";
 
dotenv.config({ path: ".env.local" });
 
// ── Rate limiting (dev only, in-memory) ───────────────────────────────────────
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
 
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}
 
// ── CORS ──────────────────────────────────────────────────────────────────────
function getAllowedOrigin(requestOrigin: string): string | null {
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  if (!appUrl) return "*";
  if (requestOrigin === appUrl) return appUrl;
  return null;
}
 
// ── Server ────────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = 3000;
 
  app.use(express.json({ limit: "20mb" }));

  // ── Stripe ────────────────────────────────────────────────────────────────
  // Webhook needs raw body — mount BEFORE express.json()
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleWebhook
  );
  app.post("/api/stripe/create-checkout", createCheckout);
 
  app.use("/api/gemini", (req, res, next) => {
    const origin = req.headers["origin"] || "";
    const allowedOrigin = getAllowedOrigin(origin);
    if (allowedOrigin === null) { res.status(403).json({ error: "Origin not allowed." }); return; }
 
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (allowedOrigin !== "*") res.setHeader("Vary", "Origin");
 
    if (req.method === "OPTIONS") { res.status(204).end(); return; }
    if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }
 
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.socket?.remoteAddress || "unknown";
 
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
      return;
    }
    next();
  });
 
  // ── Единственная точка вызова AI-логики ──────────────────────────────────
  app.post("/api/gemini", async (req, res) => {
    try {
      const result = await handleGeminiRequest(req.body, process.env.GEMINI_API_KEY ?? "");
      if (result.rawText !== undefined) {
        res.setHeader("Content-Type", "application/json");
        res.status(result.status).send(result.rawText);
      } else {
        res.status(result.status).json(result.body);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Internal server error", details: msg });
    }
  });
 
  // ── Vite dev middleware ────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
 
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}
 
startServer();
startServer();
