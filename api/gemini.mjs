/**
 * api/gemini.mjs — Vercel/Netlify Serverless Function
 *
 * Rate limiting via Supabase RPC (persistent across cold starts).
 * Falls back to in-memory if Supabase env vars are not set.
 */

import { handleGeminiRequest } from "../src/lib/gemini-handler.js";

// ── Supabase rate limiting ─────────────────────────────────────────────────────
// Uses service_role key — never exposed to browser.
// Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.

const RATE_LIMIT    = 20;   // requests per window
const RATE_WINDOW   = 60;   // seconds

async function isRateLimitedSupabase(ip) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null; // signal: fall back to in-memory

  try {
    const res = await fetch(`${url}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        p_ip:     ip,
        p_limit:  RATE_LIMIT,
        p_window: `${RATE_WINDOW} seconds`,
      }),
    });

    if (!res.ok) return null; // Supabase error → fall back
    const allowed = await res.json(); // true = allowed, false = blocked
    return !allowed; // isRateLimited = NOT allowed
  } catch {
    return null; // network error → fall back
  }
}

// ── In-memory fallback (best-effort, resets on cold start) ────────────────────
const memStore = new Map();

function isRateLimitedMemory(ip) {
  const now = Date.now();
  let e = memStore.get(ip);
  if (!e || now > e.resetAt) {
    memStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW * 1000 });
    return false;
  }
  if (e.count >= RATE_LIMIT) return true;
  e.count++;
  return false;
}

async function checkRateLimit(ip) {
  const supabaseResult = await isRateLimitedSupabase(ip);
  if (supabaseResult !== null) return supabaseResult; // Supabase answered
  return isRateLimitedMemory(ip);                     // fallback
}

// ── CORS ──────────────────────────────────────────────────────────────────────
function getAllowedOrigin(requestOrigin) {
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  if (!appUrl) return "*";
  if (requestOrigin === appUrl) return appUrl;
  return null;
}

// ── Handler ───────────────────────────────────────────────────────────────────
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
    req.socket?.remoteAddress ||
    "unknown";

  const limited = await checkRateLimit(clientIp);
  if (limited) {
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
