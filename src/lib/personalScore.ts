/**
 * personalScore.ts
 *
 * Computes a profile-adjusted ingredient score (0–10) based on:
 *   1. The base Yuka-style score from the local DB (or AI for unknown ingredients)
 *   2. Penalties/bonuses based on the user's skin/hair profile
 *
 * The final product score is a weighted average (earlier ingredients = higher weight).
 */

import type { Ingredient } from '../services/ai';
import type { UserProfile } from '../components/UserProfile';
import { lookupIngredient } from './ingredients-db';

// ── Ingredient name → penalty/bonus rules ──────────────────────────────────

interface ProfileRule {
  // ingredient name substrings that trigger this rule
  match: string[];
  // profile conditions that activate the penalty
  conditions: {
    skinType?: string[];        // e.g. ['skinOily', 'skinDry']
    skinConditions?: string[];
    skinSensitivity?: string[];
    hairProblems?: string[];
    scalpCondition?: string[];
    bodySkinType?: string[];
    climate?: string[];
    ageRange?: string[];
  };
  // score delta to apply (-10 to +2)
  delta: number;
  // human-readable reason (EN key — translated at display)
  reason?: string;
}

const PROFILE_RULES: ProfileRule[] = [
  // ── Oily skin ────────────────────────────────────────────────────────────
  {
    match: ['mineral oil', 'paraffinum liquidum', 'petrolatum', 'lanolin',
            'coconut oil', 'cocoa butter', 'isopropyl myristate', 'isopropyl palmitate',
            'beeswax', 'carnauba', 'candelilla'],
    conditions: { skinType: ['skinOily'] },
    delta: -3,
  },
  {
    match: ['dimethicone', 'cyclomethicone', 'cyclopentasiloxane'],
    conditions: { skinType: ['skinOily'], skinConditions: ['condBreakouts', 'condBlackheads'] },
    delta: -2,
  },
  {
    match: ['niacinamide', 'salicylic acid', 'zinc', 'clay', 'kaolin', 'bentonite',
            'tea tree', 'witch hazel'],
    conditions: { skinType: ['skinOily'], skinConditions: ['condBreakouts'] },
    delta: +2,
  },

  // ── Dry skin ─────────────────────────────────────────────────────────────
  {
    match: ['alcohol denat', 'denatured alcohol', 'ethanol', 'sd alcohol', 'isopropyl alcohol'],
    conditions: { skinType: ['skinDry'] },
    delta: -3,
  },
  {
    match: ['sodium lauryl sulfate', 'ammonium lauryl sulfate'],
    conditions: { skinType: ['skinDry'] },
    delta: -3,
  },
  {
    match: ['glycerin', 'hyaluronic acid', 'sodium hyaluronate', 'urea', 'shea butter',
            'ceramide', 'squalane', 'panthenol', 'allantoin'],
    conditions: { skinType: ['skinDry'] },
    delta: +2,
  },

  // ── Sensitive / sensitized skin ───────────────────────────────────────────
  {
    match: ['parfum', 'fragrance', 'aroma', 'linalool', 'limonene', 'geraniol',
            'cinnamal', 'eugenol', 'citronellol', 'coumarin',
            'benzyl benzoate', 'benzyl salicylate', 'benzyl cinnamate',
            'alpha-isomethyl', 'hexyl cinnamal', 'amyl cinnamal'],
    conditions: { skinSensitivity: ['sensFragrances'] },
    delta: -3,
  },
  {
    match: ['alcohol denat', 'denatured alcohol', 'ethanol', 'sd alcohol', 'isopropyl alcohol'],
    conditions: { skinSensitivity: ['sensAlcohol'] },
    delta: -3,
  },
  {
    match: ['essential oil', 'eucalyptus', 'peppermint', 'menthol', 'camphor',
            'tea tree', 'lavender', 'rosemary', 'clary sage'],
    conditions: { skinSensitivity: ['sensEssentialOils'] },
    delta: -2,
  },
  {
    match: ['retinol', 'retinal', 'retinyl', 'glycolic acid', 'lactic acid',
            'salicylic acid', 'mandelic acid', 'trichloroacetic acid',
            'ascorbic acid', 'l-ascorbic acid'],
    conditions: { skinSensitivity: ['sensIrritationAfterCare', 'sensReactionNewProducts'] },
    delta: -2,
  },
  {
    match: ['allantoin', 'bisabolol', 'centella', 'madecassoside', 'panthenol',
            'aloe', 'calendula', 'chamomile', 'avena sativa', 'colloidal oatmeal'],
    conditions: { skinSensitivity: ['sensIrritationAfterCare', 'sensReactionNewProducts'] },
    delta: +1,
  },

  // ── Acne / breakouts ──────────────────────────────────────────────────────
  {
    match: ['coconut oil', 'cocoa butter', 'isopropyl myristate', 'isopropyl palmitate',
            'laureth-4', 'myristyl myristate', 'wheat germ'],
    conditions: { skinConditions: ['condBreakouts', 'condBlackheads'] },
    delta: -3,
  },
  {
    match: ['niacinamide', 'salicylic acid', 'zinc', 'tea tree', 'benzoyl',
            'sulfur', 'azelaic acid', 'retinol'],
    conditions: { skinConditions: ['condBreakouts'] },
    delta: +2,
  },

  // ── Uneven tone / dark spots ──────────────────────────────────────────────
  {
    match: ['alpha-arbutin', 'kojic acid', 'tranexamic acid', 'vitamin c', 'ascorbic acid',
            'ascorbyl', 'niacinamide', 'ferulic acid', 'licorice', 'mulberry',
            'resveratrol', 'azelaic acid'],
    conditions: { skinConditions: ['condUnevenTone', 'condDarkSpots'] },
    delta: +2,
  },

  // ── Redness / irritation ─────────────────────────────────────────────────
  {
    match: ['centella', 'madecassoside', 'asiaticoside', 'allantoin', 'bisabolol',
            'calendula', 'chamomile', 'aloe', 'panthenol', 'green tea'],
    conditions: { skinConditions: ['condRedness', 'condIrritation'] },
    delta: +2,
  },
  {
    match: ['menthol', 'camphor', 'peppermint', 'eucalyptus', 'cinnamon'],
    conditions: { skinConditions: ['condRedness', 'condIrritation'] },
    delta: -3,
  },

  // ── Dull skin ─────────────────────────────────────────────────────────────
  {
    match: ['vitamin c', 'ascorbic acid', 'ascorbyl', 'niacinamide', 'glycolic acid',
            'lactic acid', 'alpha-arbutin', 'papain', 'bromelain'],
    conditions: { skinConditions: ['condDullness'] },
    delta: +2,
  },

  // ── Aging / mature skin ───────────────────────────────────────────────────
  {
    match: ['retinol', 'retinal', 'retinyl', 'bakuchiol', 'peptide', 'adenosine',
            'ceramide', 'collagen', 'elastin', 'coenzyme q10', 'ubiquinone',
            'resveratrol', 'ferulic acid', 'vitamin c', 'niacinamide'],
    conditions: { ageRange: ['age3545', 'age4550', 'age50plus'] },
    delta: +1,
  },
  {
    match: ['alcohol denat', 'denatured alcohol', 'sodium lauryl sulfate'],
    conditions: { ageRange: ['age4550', 'age50plus'] },
    delta: -2,
  },

  // ── Dry/damaged hair ─────────────────────────────────────────────────────
  {
    match: ['sodium lauryl sulfate', 'ammonium lauryl sulfate'],
    conditions: { hairProblems: ['hairDryDamaged', 'hairFrizzy', 'hairBrittle'],
                  scalpCondition: ['scalpDry'] },
    delta: -3,
  },
  {
    match: ['keratin', 'silk protein', 'amino acid', 'panthenol', 'argan oil',
            'shea butter', 'coconut oil', 'ceramide', 'biotin'],
    conditions: { hairProblems: ['hairDryDamaged', 'hairFrizzy'] },
    delta: +2,
  },

  // ── Oily scalp / dandruff ─────────────────────────────────────────────────
  {
    match: ['heavy oil', 'petrolatum', 'mineral oil', 'cocoa butter'],
    conditions: { scalpCondition: ['scalpOily'] },
    delta: -2,
  },
  {
    match: ['zinc pyrithione', 'salicylic acid', 'selenium sulfide', 'ketoconazole',
            'piroctone olamine', 'tea tree'],
    conditions: { scalpCondition: ['scalpOily'] },
    delta: +2,
  },

  // ── Hot/sunny climate ─────────────────────────────────────────────────────
  {
    match: ['spf', 'zinc oxide', 'titanium dioxide', 'uv filter', 'avobenzone',
            'octocrylene', 'oxybenzone'],
    conditions: { climate: ['climateSunny'] },
    delta: +1,
  },
  {
    match: ['heavy butter', 'cocoa butter', 'shea butter', 'beeswax'],
    conditions: { climate: ['climateSunny', 'climateHumid'] },
    delta: -1,
  },

  // ── Cold / dry climate ────────────────────────────────────────────────────
  {
    match: ['glycerin', 'hyaluronic acid', 'sodium hyaluronate', 'ceramide',
            'shea butter', 'squalane', 'petrolatum'],
    conditions: { climate: ['climateDry', 'climateCold', 'climateWindy'] },
    delta: +1,
  },
  {
    match: ['alcohol denat', 'denatured alcohol', 'ethanol'],
    conditions: { climate: ['climateDry', 'climateCold'] },
    delta: -2,
  },
];

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Tests if a pattern matches inside an ingredient name.
 * - Single word patterns (e.g. "ethanol") match only as whole words —
 *   so "phenoxyethanol" does NOT match "ethanol".
 * - Multi-word patterns (e.g. "alcohol denat", "vitamin c") match as substrings —
 *   they are already specific enough to avoid false positives.
 */
function matchesIngredient(name: string, pattern: string): boolean {
  const p = pattern.toLowerCase();
  if (p.includes(' ') || p.includes('-')) {
    // Multi-word or hyphenated — substring is safe enough
    return name.includes(p);
  }
  // Single word — require word boundaries
  // Word chars: a-z 0-9 — boundary is anything else (including start/end)
  const re = new RegExp(`(^|[^a-z0-9])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`);
  return re.test(name);
}

/**
 * Returns a profile-adjusted score (0–10) for a single ingredient.
 * Applies all matching profile rules as delta on top of the base score.
 */
export function adjustedIngredientScore(
  ing: Ingredient,
  profile: UserProfile,
): number {
  // Determine the base score for this ingredient — single consistent path:
  // 1) explicit `score` field (from fresh AI or hydrated cache)
  // 2) local DB lookup (for old cached scans without score)
  // 3) fixed fallback by status emoji
  let base: number;
  if (typeof ing.score === 'number') {
    base = ing.score;
  } else {
    const dbEntry = lookupIngredient(ing.name);
    base = dbEntry ? dbEntry.score : statusToDefault(ing.status);
  }
  const n = ing.name.toLowerCase();

  let delta = 0;

  for (const rule of PROFILE_RULES) {
    // Check if ingredient name matches any trigger
    const nameMatch = rule.match.some(m => matchesIngredient(n, m));
    if (!nameMatch) continue;

    // Check if any profile condition matches
    const conditionMatch = Object.entries(rule.conditions).some(([field, values]) => {
      const profileValues: string[] = (profile as any)[field] ?? [];
      return (values as string[]).some(v => profileValues.includes(v));
    });
    if (!conditionMatch) continue;

    delta += rule.delta;
  }

  return Math.min(10, Math.max(0, Math.round(base + delta)));
}

/**
 * Computes the product score adjusted for the user's profile.
 * Uses the same weighted-average formula as computeProductScore,
 * but with profile-adjusted per-ingredient scores.
 */
export function computePersonalScore(
  ingredients: Ingredient[],
  profile: UserProfile,
): number | null {
  if (!ingredients || ingredients.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  ingredients.forEach((ing, idx) => {
    const weight = 1 / (idx + 1);
    const score = adjustedIngredientScore(ing, profile);
    weightedSum += score * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

function statusToDefault(status: string): number {
  if (status === '🟢') return 8;
  if (status === '🟡') return 5;
  return 1;
}

/**
 * Compute a Yuka-style score (0-10) considering ONLY one specific preference
 * value (e.g. just "skinDry" or just "sensFragrances"), with all other
 * preferences ignored. Used to colour individual preference chips in the
 * personal-note section.
 */
export function scoreForSinglePreference(
  ingredients: Ingredient[],
  preferenceValue: string,
): number | null {
  if (!ingredients || ingredients.length === 0) return null;

  // Build a synthetic profile that has ONLY this one preference set.
  // We try every relevant field — only the matching ones in PROFILE_RULES
  // will fire (others will simply not match).
  const synthetic: UserProfile = {
    skinType:        [preferenceValue],
    skinSensitivity: [preferenceValue],
    skinConditions:  [preferenceValue],
    ageRange:        preferenceValue,
    hairType:        [preferenceValue],
    scalpCondition:  [preferenceValue],
    hairProblems:    [preferenceValue],
    bodySkinType:    [preferenceValue],
    climate:         [preferenceValue],
    consentGiven:    true,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  ingredients.forEach((ing, idx) => {
    const weight = 1 / (idx + 1);
    weightedSum += adjustedIngredientScore(ing, synthetic) * weight;
    totalWeight += weight;
  });
  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}
