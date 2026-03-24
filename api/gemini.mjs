/**
 * api/gemini.mjs — Netlify Serverless Function
 *
 * Тонкая обёртка над handleGeminiRequest из src/lib/gemini-handler.ts.
 * Вся бизнес-логика Gemini живёт там. Здесь только CORS, rate limiting, роутинг.
 */

import { handleGeminiRequest } from "../src/lib/gemini-handler.js";

// ── Rate limiting (in-memory, best-effort) ────────────────────────────────────
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const rateLimitStore = new Map();

function isRateLimited(ip) {
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
function getAllowedOrigin(requestOrigin) {
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  if (!appUrl) return "*";
  if (requestOrigin === appUrl) return appUrl;
  return null;
}

// ── Netlify Function handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  const origin = req.headers["origin"] || "";
  const allowedOrigin = getAllowedOrigin(origin);

  if (allowedOrigin === null) return res.status(403).json({ error: "Origin not allowed." });

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (allowedOrigin !== "*") res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });
  if (!req.body)               return res.status(400).json({ error: "Invalid JSON body" });

  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress || "unknown";

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
  }

  try {
    const result = await handleGeminiRequest(req.body, process.env.GEMINI_API_KEY ?? "");

    if (result.rawText !== undefined) {
      res.setHeader("Content-Type", "application/json");
      return res.status(result.status).send(result.rawText);
    }
    return res.status(result.status).json(result.body);

  } catch (err) {
    console.error("Gemini error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}
