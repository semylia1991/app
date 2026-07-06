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
