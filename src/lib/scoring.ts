/**
 * Single source of truth for the position weight used in ALL weighted-average
 * scores (product score, personal score, and the server-side validation in
 * save_product_score — see supabase_migrations_validate_scores.sql).
 *
 * BUCKET WEIGHTS (order-robust): instead of a smooth 1/√(idx+1) curve, each
 * ingredient's weight depends only on which POSITION BUCKET it falls into:
 *
 *   idx 0–4   (top-5, highest concentration)  → weight 3
 *   idx 5–9   (middle-5)                      → weight 2
 *   idx 10+   (tail)                          → weight 1
 *
 * Why buckets: the AI reads the label from a photo, and neighbouring
 * ingredients occasionally swap places between scans. With a smooth positional
 * curve every such swap nudges the final score; with buckets, any permutation
 * WITHIN a bucket changes nothing — the score only reacts to an ingredient
 * crossing a bucket boundary. This keeps the "concentration matters" logic
 * (top of the list still dominates 3:2:1) while removing order noise.
 *
 * ⚠️ If you change these weights, update the SQL twin in
 * supabase_migrations_validate_scores.sql in the SAME deploy — otherwise the
 * server-side score validation will silently reject new canonical writes.
 */
export function positionWeight(idx: number): number {
  if (idx < 5) return 3;
  if (idx < 10) return 2;
  return 1;
}

/* ── Unified 0–100 verdict scale ──────────────────────────────────────────────
 * All user-facing indicators (🟢/🟡/🔴) are derived from a SINGLE 0–100 scale
 * with SINGLE thresholds:  🟢 ≥ 75   🟡 ≥ 50   🔴 < 50.
 *
 * Internal storage stays as-is for backward compatibility with caches:
 *   • product / ingredient scores: 0–10  (ingredients-db, AI, Supabase
 *     canonical cache) — normalized here via toScore100()
 *   • preference-match score: already 0–100 (Supabase preference cache)
 *
 * ⚠️ Do NOT rescale stored values — existing Supabase rows would be off 10×.
 * Normalize at the edge (here), never in the data.
 */

/** Convert an internal 0–10 product/ingredient score to the unified 0–100 scale. */
export function toScore100(score10: number): number {
  return Math.round(score10 * 10);
}

/** Verdict emoji from a unified 0–100 score:  🟢 ≥ 75, 🟡 ≥ 50, 🔴 < 50. */
export function verdictEmoji100(score100: number): '🟢' | '🟡' | '🔴' {
  return score100 >= 75 ? '🟢' : score100 >= 50 ? '🟡' : '🔴';
}
