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
import { getModifierRows, type ModifierRow, type ModifierReason } from './ingredient-modifiers';
import { positionWeight } from './scoring';

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
    const weight = positionWeight(idx);
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
    const weight = positionWeight(idx);
    weightedSum += adjustedIngredientScore(ing, synthetic) * weight;
    totalWeight += weight;
  });
  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUANTUM PERSONAL SCORE
// ═══════════════════════════════════════════════════════════════════════════

export interface QuantumScore {
  /** Most probable value (profile-adjusted weighted average) */
  value: number;
  /** Pessimistic bound — all uncertain ingredients score poorly */
  min: number;
  /** Optimistic bound — all uncertain ingredients score well */
  max: number;
  /** 0–1: 0 = fully certain, 1 = fully unknown */
  uncertainty: number;
  /** How many ingredients had no DB record (drove the uncertainty) */
  unknownCount: number;
  /** Synergy delta applied on top of base score */
  synergyDelta: number;
  /** Human-readable synergy pairs found */
  synergyNotes: SynergyNote[];
}

export interface SynergyNote {
  /** Short label shown in UI, e.g. "Vitamin C + Niacinamide" */
  label: string;
  /** Positive = boost, negative = conflict */
  delta: number;
}

// ── Synergy table (ingredient-pair interactions) ──────────────────────────
// delta > 0 = beneficial synergy, delta < 0 = antagonism / reduced efficacy.
// match arrays use the same substring rules as PROFILE_RULES.

interface SynergyRule {
  a: string[];   // ingredient A patterns
  b: string[];   // ingredient B patterns
  delta: number; // applied to personal score
  label: string; // shown in UI
}

const SYNERGY_RULES: SynergyRule[] = [
  // ── Proven boosts ──────────────────────────────────────────────────────
  {
    a: ['vitamin c', 'ascorbic acid', 'ascorbyl'],
    b: ['vitamin e', 'tocopherol'],
    delta: +0.6,
    label: 'Vitamin C + Vitamin E',
  },
  {
    a: ['vitamin c', 'ascorbic acid', 'ascorbyl'],
    b: ['ferulic acid'],
    delta: +0.5,
    label: 'Vitamin C + Ferulic Acid',
  },
  {
    a: ['niacinamide'],
    b: ['zinc', 'zinc pca', 'zinc gluconate'],
    delta: +0.4,
    label: 'Niacinamide + Zinc',
  },
  {
    a: ['retinol', 'retinal', 'retinyl'],
    b: ['peptide', 'argireline', 'matrixyl', 'palmitoyl'],
    delta: +0.3,
    label: 'Retinol + Peptides',
  },
  {
    a: ['hyaluronic acid', 'sodium hyaluronate'],
    b: ['glycerin'],
    delta: +0.3,
    label: 'Hyaluronic Acid + Glycerin',
  },
  {
    a: ['salicylic acid'],
    b: ['niacinamide'],
    delta: +0.4,
    label: 'Salicylic Acid + Niacinamide',
  },
  {
    a: ['ceramide'],
    b: ['cholesterol'],
    delta: +0.5,
    label: 'Ceramides + Cholesterol',
  },
  {
    a: ['centella', 'madecassoside', 'asiaticoside'],
    b: ['panthenol', 'allantoin'],
    delta: +0.3,
    label: 'Centella + Panthenol',
  },

  // ── Conflicts / antagonisms ────────────────────────────────────────────
  {
    a: ['retinol', 'retinal', 'retinyl'],
    b: ['vitamin c', 'ascorbic acid', 'l-ascorbic acid'],
    delta: -0.4,
    label: 'Retinol + Vitamin C (pH conflict)',
  },
  {
    a: ['benzoyl peroxide'],
    b: ['retinol', 'retinal', 'retinyl'],
    delta: -0.5,
    label: 'Benzoyl Peroxide + Retinol (oxidation)',
  },
  {
    a: ['glycolic acid', 'lactic acid', 'mandelic acid'],
    b: ['retinol', 'retinal', 'retinyl'],
    delta: -0.4,
    label: 'AHA + Retinol (over-exfoliation)',
  },
  {
    a: ['niacinamide'],
    b: ['vitamin c', 'ascorbic acid', 'l-ascorbic acid'],
    delta: -0.2,
    label: 'Niacinamide + Vitamin C (mild)',
  },
  {
    a: ['salicylic acid'],
    b: ['glycolic acid', 'lactic acid'],
    delta: -0.3,
    label: 'BHA + AHA (stacking acids)',
  },
  {
    a: ['copper peptide', 'copper tripeptide'],
    b: ['vitamin c', 'ascorbic acid'],
    delta: -0.4,
    label: 'Copper Peptides + Vitamin C',
  },
];

function matchesName(name: string, patterns: string[]): boolean {
  return patterns.some(p => matchesIngredient(name, p));
}

/**
 * Find all synergy pairs present in the ingredient list.
 * Each rule fires at most once (first pair found).
 */
function detectSynergies(ingredients: Ingredient[]): SynergyNote[] {
  const names = ingredients.map(i => i.name.toLowerCase());
  const found: SynergyNote[] = [];

  for (const rule of SYNERGY_RULES) {
    const hasA = names.some(n => matchesName(n, rule.a));
    const hasB = names.some(n => matchesName(n, rule.b));
    if (hasA && hasB) {
      found.push({ label: rule.label, delta: rule.delta });
    }
  }
  return found;
}

/**
 * Quantum personal score.
 *
 * Returns value/min/max/uncertainty so the UI can show:
 *   - a deterministic point (value) — same weighted-average as before
 *   - a probability range (min–max) — driven by DB-unknown ingredients
 *   - synergy bonuses/penalties on top of both
 *   - uncertainty ratio for the "wave" animation width
 */
export function computeQuantumScore(
  ingredients: Ingredient[],
  profile: UserProfile,
): QuantumScore | null {
  if (!ingredients || ingredients.length === 0) return null;

  let weightedSum = 0;
  let weightedSumMin = 0;
  let weightedSumMax = 0;
  let totalWeight = 0;
  let unknownCount = 0;

  ingredients.forEach((ing, idx) => {
    const weight = positionWeight(idx);
    const adjusted = adjustedIngredientScore(ing, profile);

    // Uncertainty: if the ingredient has no explicit score AND no DB entry,
    // it was assigned a fallback — it could realistically be ±2 points off.
    const hasKnownScore =
      typeof ing.score === 'number' ||
      !!lookupIngredient(ing.name);

    const spread = hasKnownScore ? 0.5 : 2.0;
    if (!hasKnownScore) unknownCount++;

    weightedSum    += adjusted * weight;
    weightedSumMin += Math.max(0,  adjusted - spread) * weight;
    weightedSumMax += Math.min(10, adjusted + spread) * weight;
    totalWeight    += weight;
  });

  if (totalWeight === 0) return null;

  const value = Math.round((weightedSum    / totalWeight) * 10) / 10;
  const min   = Math.round((weightedSumMin / totalWeight) * 10) / 10;
  const max   = Math.round((weightedSumMax / totalWeight) * 10) / 10;

  // Synergies shift the whole range uniformly
  const synergies = detectSynergies(ingredients);
  const synergyDelta = Math.round(
    synergies.reduce((s, n) => s + n.delta, 0) * 10,
  ) / 10;

  const clamp = (v: number) => Math.min(10, Math.max(0, v));
  const uncertainty = unknownCount / ingredients.length;

  return {
    value:        clamp(Math.round((value + synergyDelta) * 10) / 10),
    min:          clamp(Math.round((min   + synergyDelta) * 10) / 10),
    max:          clamp(Math.round((max   + synergyDelta) * 10) / 10),
    uncertainty,
    unknownCount,
    synergyDelta,
    synergyNotes: synergies,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTONOMOUS PERSONAL SCORE
// Полностью независимая от общей оценки персональная оценка.
// Считается только на основе:
//   1. Профиля пользователя (PROFILE_RULES — совпадения и конфликты)
//   2. Синергий между ингредиентами (SYNERGY_RULES)
//   3. Статуса ингредиента (🟢/🟡/🔴) как нейтральной базы
// НЕ использует ing.score, AI-оценку или DB-score.
// ═══════════════════════════════════════════════════════════════════════════

/** Per-ingredient profile match for the UI list */
export interface IngredientMatch {
  name: string;
  /** ✅ benefit / ⚠️ caution / ⛔️ conflict */
  emoji: '✅' | '⚠️' | '⛔️';
  /** Human-readable preference label in the user's language */
  label: string;
}

export interface AutonomousScore {
  /** Итоговая персональная оценка 0–10, округлённая до целого */
  value: number;
  /** Пессимистичный вариант */
  min: number;
  /** Оптимистичный вариант */
  max: number;
  /** 0–1: доля ингредиентов без правил профиля */
  uncertainty: number;
  /** Дельта от синергий (итого) */
  synergyDelta: number;
  /** Расшифровка синергий */
  synergyNotes: SynergyNote[];
  /** Сколько ингредиентов дали хотя бы одно совпадение с профилем */
  profileMatchCount: number;
  /** Сколько ингредиентов — конфликт с профилем (delta < 0) */
  conflictCount: number;
  /** Сколько — выгода для профиля (delta > 0) */
  benefitCount: number;
  /** Per-ingredient matches for the expanded UI list */
  matches: IngredientMatch[];
}

/**
 * Нейтральная база ингредиента по статусу — без привязки к AI/DB score.
 * 🟢 = 7 (хороший ингредиент, чуть ниже отличного — мы не знаем насколько хорош)
 * 🟡 = 5 (нейтральный — ни плохой ни хороший)
 * 🔴 = 2 (проблемный — но не ноль, есть нюансы)
 */
// ── Preference labels per language ────────────────────────────────────────
// Maps condition field+value → localized label shown in per-ingredient list
type LangMap = Record<string, string>;
const PREFERENCE_LABELS: Record<string, Record<string, LangMap>> = {
  skinType: {
    skinOily:        { en:'Oily skin',        ru:'Жирная кожа',        de:'Fettige Haut',       uk:'Жирна шкіра',        es:'Piel grasa',       fr:'Peau grasse',       it:'Pelle grassa',       tr:'Yağlı cilt' },
    skinDry:         { en:'Dry skin',          ru:'Сухая кожа',         de:'Trockene Haut',      uk:'Суха шкіра',         es:'Piel seca',        fr:'Peau sèche',        it:'Pelle secca',        tr:'Kuru cilt' },
    skinCombination: { en:'Combination skin',  ru:'Комбинированная кожа', de:'Mischhaut',        uk:'Комбінована шкіра',  es:'Piel mixta',       fr:'Peau mixte',        it:'Pelle mista',        tr:'Karma cilt' },
    skinUnknown:     { en:'Skin type unknown', ru:'Тип кожи неизвестен', de:'Hauttyp unbekannt', uk:'Тип шкіри невідомий', es:'Tipo de piel desconocido', fr:'Type de peau inconnu', it:'Tipo di pelle sconosciuto', tr:'Cilt tipi bilinmiyor' },
  },
  skinSensitivity: {
    sensFragrances:         { en:'Fragrance sensitivity',     ru:'Чувствительность к отдушкам',   de:'Duftstoff-Empfindlichkeit',  uk:'Чутливість до ароматів',        es:'Sensibilidad a fragancias',  fr:'Sensibilité aux parfums',    it:'Sensibilità ai profumi',       tr:'Parfüm hassasiyeti' },
    sensAlcohol:            { en:'Alcohol sensitivity',       ru:'Чувствительность к спирту',     de:'Alkohol-Empfindlichkeit',    uk:'Чутливість до спирту',          es:'Sensibilidad al alcohol',    fr:'Sensibilité à l\'alcool',    it:'Sensibilità all\'alcol',       tr:'Alkol hassasiyeti' },
    sensEssentialOils:      { en:'Essential oil sensitivity', ru:'Реакция на эфирные масла',      de:'Ätherische Öle',             uk:'Реакція на ефірні олії',        es:'Sensibilidad a aceites esenciales', fr:'Huiles essentielles',  it:'Oli essenziali',               tr:'Uçucu yağ hassasiyeti' },
    sensIrritationAfterCare:{ en:'Post-care irritation',     ru:'Раздражение после ухода',       de:'Reizung nach Pflege',        uk:'Подразнення після догляду',     es:'Irritación post-cuidado',   fr:'Irritation après les soins', it:'Irritazione post-cura',        tr:'Bakım sonrası tahriş' },
    sensReactionNewProducts:{ en:'Reaction to new products', ru:'Реакция на новые средства',     de:'Reaktion auf neue Produkte', uk:'Реакція на нові засоби',        es:'Reacción a nuevos productos',fr:'Réaction aux nouveaux produits', it:'Reazione a nuovi prodotti', tr:'Yeni ürün reaksiyonu' },
  },
  skinConditions: {
    condBreakouts:   { en:'Breakouts',         ru:'Высыпания',            de:'Unreinheiten',       uk:'Висипання',            es:'Brotes',           fr:'Imperfections',     it:'Imperfezioni',       tr:'Sivilce' },
    condBlackheads:  { en:'Blackheads',        ru:'Чёрные точки',         de:'Mitesser',           uk:'Чорні точки',          es:'Puntos negros',    fr:'Points noirs',      it:'Punti neri',         tr:'Siyah nokta' },
    condRedness:     { en:'Redness',           ru:'Покраснения',          de:'Rötungen',           uk:'Почервоніння',         es:'Rojeces',          fr:'Rougeurs',          it:'Rossori',            tr:'Kızarıklık' },
    condIrritation:  { en:'Irritation',        ru:'Раздражение',          de:'Reizung',            uk:'Подразнення',          es:'Irritación',       fr:'Irritation',        it:'Irritazione',        tr:'Tahriş' },
    condUnevenTone:  { en:'Uneven skin tone',  ru:'Неровный тон',         de:'Unebener Hautton',   uk:'Нерівний тон',         es:'Tono irregular',   fr:'Teint irrégulier',  it:'Tono irregolare',    tr:'Düzensiz ton' },
    condDarkSpots:   { en:'Dark spots',        ru:'Тёмные пятна',         de:'Dunkle Flecken',     uk:'Темні плями',          es:'Manchas oscuras',  fr:'Taches sombres',    it:'Macchie scure',      tr:'Koyu lekeler' },
    condDullness:    { en:'Dull complexion',   ru:'Тусклый цвет лица',    de:'Fahler Teint',       uk:'Тьмяний колір обличчя', es:'Tez opaca',       fr:'Teint terne',       it:'Incarnato spento',   tr:'Donuk cilt' },
    condPigmentation:{ en:'Pigmentation',      ru:'Пигментация',          de:'Pigmentierung',      uk:'Пігментація',          es:'Pigmentación',     fr:'Pigmentation',      it:'Pigmentazione',      tr:'Pigmentasyon' },
  },
  ageRange: {
    ageUnder25: { en:'Under 25',  ru:'До 25',   de:'Unter 25',  uk:'До 25',   es:'Menos de 25', fr:'Moins de 25', it:'Meno di 25', tr:'25 altı' },
    age2535:    { en:'25–35',     ru:'25–35',   de:'25–35',     uk:'25–35',   es:'25–35',       fr:'25–35',       it:'25–35',      tr:'25–35' },
    age3545:    { en:'35–45',     ru:'35–45',   de:'35–45',     uk:'35–45',   es:'35–45',       fr:'35–45',       it:'35–45',      tr:'35–45' },
    age4550:    { en:'45–50',     ru:'45–50',   de:'45–50',     uk:'45–50',   es:'45–50',       fr:'45–50',       it:'45–50',      tr:'45–50' },
    age50plus:  { en:'50+',       ru:'50+',     de:'50+',       uk:'50+',     es:'50+',         fr:'50+',         it:'50+',        tr:'50+' },
  },
  hairType: {
    hairStraight: { en:'Straight hair', ru:'Прямые волосы',    de:'Glattes Haar',       uk:'Пряме волосся',    es:'Cabello liso',     fr:'Cheveux raides',    it:'Capelli lisci',      tr:'Düz saç' },
    hairWavy:     { en:'Wavy hair',     ru:'Волнистые волосы', de:'Welliges Haar',      uk:'Хвилясте волосся', es:'Cabello ondulado',  fr:'Cheveux ondulés',   it:'Capelli mossi',      tr:'Dalgalı saç' },
    hairCurly:    { en:'Curly hair',    ru:'Кудрявые волосы',  de:'Lockiges Haar',      uk:'Кучеряве волосся', es:'Cabello rizado',   fr:'Cheveux bouclés',   it:'Capelli ricci',      tr:'Kıvırcık saç' },
    hairCoily:    { en:'Coily hair',    ru:'Спиральные волосы', de:'Spiralförmiges Haar', uk:'Спіральне волосся', es:'Cabello muy rizado', fr:'Cheveux très bouclés', it:'Capelli a spirale', tr:'Spiral saç' },
    hairBrittle:  { en:'Brittle hair',  ru:'Ломкие волосы',    de:'Sprödes Haar',       uk:'Ламке волосся',    es:'Cabello quebradizo', fr:'Cheveux fragiles', it:'Capelli fragili',    tr:'Kırılgan saç' },
  },
  scalpCondition: {
    scalpOily: { en:'Oily scalp', ru:'Жирная кожа головы', de:'Fettige Kopfhaut',   uk:'Жирна шкіра голови', es:'Cuero cabelludo graso', fr:'Cuir chevelu gras', it:'Cuoio capelluto grasso', tr:'Yağlı saç derisi' },
    scalpDry:  { en:'Dry scalp',  ru:'Сухая кожа головы',  de:'Trockene Kopfhaut',  uk:'Суха шкіра голови',  es:'Cuero cabelludo seco',  fr:'Cuir chevelu sec',  it:'Cuoio capelluto secco',  tr:'Kuru saç derisi' },
  },
  hairProblems: {
    hairDryDamaged: { en:'Dry/damaged hair',  ru:'Сухие/повреждённые волосы', de:'Trockenes/geschädigtes Haar', uk:'Сухе/пошкоджене волосся', es:'Cabello seco/dañado',  fr:'Cheveux secs/abîmés',   it:'Capelli secchi/danneggiati', tr:'Kuru/hasarlı saç' },
    hairFrizzy:     { en:'Frizzy hair',       ru:'Пушистые волосы',           de:'Krauses Haar',                uk:'Пухнасте волосся',        es:'Cabello encrespado',   fr:'Cheveux frisottants',   it:'Capelli crespi',             tr:'Kabarık saç' },
    hairBrittle:    { en:'Brittle hair',      ru:'Ломкие волосы',             de:'Sprödes Haar',                uk:'Ламке волосся',           es:'Cabello quebradizo',   fr:'Cheveux fragiles',      it:'Capelli fragili',            tr:'Kırılgan saç' },
  },
  bodySkinType: {
    bodySkinDry:       { en:'Dry body skin',       ru:'Сухая кожа тела',        de:'Trockene Körperhaut',    uk:'Суха шкіра тіла',       es:'Piel del cuerpo seca',        fr:'Peau du corps sèche',        it:'Pelle del corpo secca',        tr:'Kuru vücut cildi' },
    bodySkinSensitive: { en:'Sensitive body skin', ru:'Чувствительная кожа тела', de:'Empfindliche Körperhaut', uk:'Чутлива шкіра тіла',  es:'Piel del cuerpo sensible',    fr:'Peau du corps sensible',     it:'Pelle del corpo sensibile',    tr:'Hassas vücut cildi' },
    bodySkinOily:      { en:'Oily body skin',      ru:'Жирная кожа тела',       de:'Fettige Körperhaut',     uk:'Жирна шкіра тіла',      es:'Piel del cuerpo grasa',       fr:'Peau du corps grasse',       it:'Pelle del corpo grassa',       tr:'Yağlı vücut cildi' },
    bodySkinNormal:    { en:'Normal body skin',    ru:'Нормальная кожа тела',   de:'Normale Körperhaut',     uk:'Нормальна шкіра тіла',  es:'Piel del cuerpo normal',      fr:'Peau du corps normale',      it:'Pelle del corpo normale',      tr:'Normal vücut cildi' },
  },
  climate: {
    climateSunny: { en:'Sunny climate', ru:'Солнечный климат', de:'Sonniges Klima',  uk:'Сонячний клімат', es:'Clima soleado', fr:'Climat ensoleillé', it:'Clima soleggiato', tr:'Güneşli iklim' },
    climateDry:   { en:'Dry climate',   ru:'Сухой климат',    de:'Trockenes Klima', uk:'Сухий клімат',    es:'Clima seco',    fr:'Climat sec',        it:'Clima secco',      tr:'Kuru iklim' },
    climateCold:  { en:'Cold climate',  ru:'Холодный климат', de:'Kaltes Klima',    uk:'Холодний клімат', es:'Clima frío',    fr:'Climat froid',      it:'Clima freddo',     tr:'Soğuk iklim' },
    climateHumid: { en:'Humid climate', ru:'Влажный климат',  de:'Feuchtes Klima',  uk:'Вологий клімат',  es:'Clima húmedo',  fr:'Climat humide',     it:'Clima umido',      tr:'Nemli iklim' },
    climateWindy: { en:'Windy climate', ru:'Ветреный климат', de:'Windiges Klima',  uk:'Вітряний клімат', es:'Clima ventoso', fr:'Climat venteux',    it:'Clima ventoso',    tr:'Rüzgarlı iklim' },
  },
};

/** Get the best localized preference label for a rule that fired */
export function getPreferenceLabel(
  conditions: Record<string, string[]>,
  lang: string,
): string {
  for (const [field, values] of Object.entries(conditions)) {
    const fieldMap = PREFERENCE_LABELS[field];
    if (!fieldMap) continue;
    for (const v of values) {
      const lmap = fieldMap[v];
      if (lmap) return lmap[lang] ?? lmap['en'] ?? v;
    }
  }
  return '';
}

function statusNeutralBase(status: string): number {
  if (status === '🟢') return 7;
  if (status === '🟡') return 5;
  if (status === '🔴') return 2;
  return 5;
}

/**
 * Считает дельту профиля для одного ингредиента.
 * Возвращает суммарную дельту от всех сработавших правил.
 */
function profileDeltaForIngredient(ing: Ingredient, profile: UserProfile): number {
  const n = ing.name.toLowerCase();
  let delta = 0;
  for (const rule of PROFILE_RULES) {
    const nameMatch = rule.match.some(m => matchesIngredient(n, m));
    if (!nameMatch) continue;
    const conditionMatch = Object.entries(rule.conditions).some(([field, values]) => {
      const profileValues: string[] = (profile as any)[field] ?? [];
      return (values as string[]).some(v => profileValues.includes(v));
    });
    if (!conditionMatch) continue;
    delta += rule.delta;
  }
  return delta;
}

/**
 * Автономная персональная оценка — независима от общей оценки продукта.
 *
 * Алгоритм:
 * 1. Для каждого ингредиента берём нейтральную базу по статусу (7/5/2)
 * 2. Применяем дельту профиля (PROFILE_RULES)
 * 3. Ингредиенты без совпадений с профилем → вносят неопределённость (±1.5)
 * 4. Взвешенное среднее (позиция в составе = вес)
 * 5. Применяем синергии (SYNERGY_RULES)
 */
export function computeAutonomousScore(
  ingredients: Ingredient[],
  profile: UserProfile,
  lang: string = 'en',
): AutonomousScore | null {
  if (!ingredients || ingredients.length === 0) return null;

  let weightedSum    = 0;
  let weightedSumMin = 0;
  let weightedSumMax = 0;
  let totalWeight    = 0;

  let profileMatchCount = 0;
  let conflictCount     = 0;
  let benefitCount      = 0;
  let noMatchCount      = 0;

  const matches: IngredientMatch[] = [];

  // ── Per-criteria matches (one row per profile field value) ──────────────
  // Build a map: criteriaKey → { label, totalDelta, ingredientNames }
  const criteriaMap = new Map<string, { label: string; totalDelta: number; ingredients: string[] }>();

  for (let idx = 0; idx < ingredients.length; idx++) {
    const ing    = ingredients[idx];
    const weight = positionWeight(idx);
    const base   = statusNeutralBase(ing.status);
    const delta  = profileDeltaForIngredient(ing, profile);

    const score    = Math.min(10, Math.max(0, base + delta));
    const hasMatch = delta !== 0;
    const spread   = hasMatch ? 0.5 : 1.5;

    if (hasMatch) {
      profileMatchCount++;
      if (delta < 0) conflictCount++;
      if (delta > 0) benefitCount++;

      // Collect all matching rules for this ingredient → group by criteria key
      const n = ing.name.toLowerCase();
      for (const rule of PROFILE_RULES) {
        const nameMatch = rule.match.some(m => matchesIngredient(n, m));
        if (!nameMatch) continue;
        const conditionMatch = Object.entries(rule.conditions).some(([field, values]) => {
          const pv: string[] = (profile as any)[field] ?? [];
          return (values as string[]).some(v => pv.includes(v));
        });
        if (!conditionMatch) continue;
        const label = getPreferenceLabel(rule.conditions as Record<string, string[]>, lang);
        if (!label) continue;
        const key = label;
        const existing = criteriaMap.get(key);
        if (existing) {
          existing.totalDelta += rule.delta;
          if (!existing.ingredients.includes(ing.name)) existing.ingredients.push(ing.name);
        } else {
          criteriaMap.set(key, { label, totalDelta: rule.delta, ingredients: [ing.name] });
        }
      }
    } else {
      noMatchCount++;
    }

    weightedSum    += score * weight;
    weightedSumMin += Math.max(0,  score - spread) * weight;
    weightedSumMax += Math.min(10, score + spread) * weight;
    totalWeight    += weight;
  }

  // ── Build matches: one row per profile field value, always shown ──────────
  // For each filled profile field → look up if criteriaMap has a match → set emoji
  for (const [field, valuesMap] of Object.entries(PREFERENCE_LABELS)) {
    const profileValues: string[] = (profile as any)[field] ?? [];
    for (const val of profileValues) {
      const lmap = valuesMap[val];
      if (!lmap) continue;
      const label = lmap[lang] ?? lmap['en'] ?? val;
      // Find if any ingredient matched this criterion
      const hit = criteriaMap.get(label);
      matches.push({
        name:  hit ? hit.ingredients[0] : '',
        emoji: hit ? (hit.totalDelta > 0 ? '✅' : hit.totalDelta < -2 ? '⛔️' : '⚠️') : '✅',
        label,
      });
    }
  }

  const matchesFinal: IngredientMatch[] = matches;

  if (totalWeight === 0) return null;

  const rawValue = weightedSum    / totalWeight;
  const rawMin   = weightedSumMin / totalWeight;
  const rawMax   = weightedSumMax / totalWeight;

  // Синергии
  const synergyNotes = detectSynergies(ingredients);
  const synergyDelta = Math.round(
    synergyNotes.reduce((s, n) => s + n.delta, 0) * 10,
  ) / 10;

  const clamp = (v: number) => Math.min(10, Math.max(0, Math.round(v * 10) / 10));
  const uncertainty = noMatchCount / ingredients.length;

  return {
    value:            Math.round(clamp(rawValue + synergyDelta)),  // rounded to integer
    min:              clamp(rawMin   + synergyDelta),
    max:              clamp(rawMax   + synergyDelta),
    uncertainty,
    synergyDelta,
    synergyNotes,
    profileMatchCount,
    conflictCount,
    benefitCount,
    matches: matchesFinal,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENCE TABLE  (deterministic — source = PROFILE_RULES only, "variant 1")
// ───────────────────────────────────────────────────────────────────────────
// Builds a sparse ingredient × criterion table and ONE 0–10 "preference match"
// score, derived entirely from PROFILE_RULES. No AI call, fully deterministic.
//
// This answers a DIFFERENT question than computeProductScore: not "is the
// formula good in the abstract" but "does this product suit the SELECTED
// preferences". A clean formula can still score low here (e.g. fragrance for a
// fragrance-sensitive profile).
// ═══════════════════════════════════════════════════════════════════════════

// Cap the overall score when at least one criterion is a hard conflict (⛔️).
// One direct contraindication shouldn't be outvoted by unrelated bonuses.
// Flip CONFLICT_CAP_ENABLED to false for a plain (uncapped) average.
const CONFLICT_CAP_ENABLED = true;
const CONFLICT_CAP_VALUE    = 50;   // 0–100 scale

// Cell numeric values (0–100) used to roll fallback (rule-based) cells into a score.
const EMOJI_SCORE: Record<'✅' | '⚠️' | '⛔️', number> = { '✅': 100, '⚠️': 60, '⛔️': 10 };

function emojiFromDelta(delta: number): '✅' | '⚠️' | '⛔️' {
  if (delta > 0)  return '✅';
  if (delta < -2) return '⛔️';
  return '⚠️';
}

function emojiFromScore(score: number): '✅' | '⚠️' | '⛔️' {
  if (score >= 70)   return '✅';
  if (score >= 35)   return '⚠️';
  return '⛔️';
}

// Skip "unknown / none / any" pseudo-values — they carry no analytical meaning.
const PREF_SKIP_VALUE = /unknown|none|^any$|climateany/i;

// Which profile fields are meaningful for each product category.
// Mirrors the server-side relevance table in gemini-handler (personalNote action).
const RELEVANT_FIELDS_BY_CATEGORY: Record<string, string[]> = {
  hair:  ['hairType', 'scalpCondition', 'hairProblems', 'climate'],
  face:  ['skinType', 'skinSensitivity', 'skinConditions', 'ageRange', 'climate'],
  body:  ['bodySkinType', 'climate'],
  lips:  ['skinSensitivity', 'climate'],
  nails: [],
  other: ['skinSensitivity', 'climate'],
};

function detectCategory(productType: string): keyof typeof RELEVANT_FIELDS_BY_CATEGORY {
  const t = (productType || '').toLowerCase();
  if (/shampoo|conditioner|hair|scalp|волос|шампун|кондиционер|haar/.test(t))         return 'hair';
  if (/lip|губ|lippen|lèvres|labbra|dudak/.test(t))                                    return 'lips';
  if (/nail|cuticle|ногт|nagel|ongle|unghia|tırnak/.test(t))                           return 'nails';
  if (/body|hand cream|foot cream|тела|для рук|для ног|körper|corps|corpo|vücut/.test(t)) return 'body';
  if (/face|facial|serum|toner|cleanser|sunscreen|spf|moistur|essence|micellar|лиц|сыворот|тонер|очищ|крем|gesicht|sérum|viso/.test(t)) return 'face';
  return 'other';
}

export interface PreferenceCell {
  ingredient: string;
  emoji: '✅' | '⚠️' | '⛔️';
  // Short localized explanation (3–5 words) of WHY this ingredient affects
  // the criterion. Present when the modifier source (CSV / Supabase) has one.
  reason?: string;
}

export interface PreferenceColumn {
  field: string;
  value: string;
  label: string;                 // localized criterion label
  emoji: '✅' | '⚠️' | '⛔️';      // overall verdict for this criterion
  score: number;                 // 0–10, one decimal
  cells: PreferenceCell[];       // ingredients that affect this criterion
}

export interface PreferenceTable {
  columns: PreferenceColumn[];   // only criteria with ≥1 matching ingredient
  ignoredIngredients: string[];  // ingredients that affect no criterion
  score: number | null;          // overall 0–10 (integer); null when no columns
  capped: boolean;               // overall score was capped by a ⛔️ conflict
  uncertain: boolean;            // few columns or mostly ⚠️ — show "approximate"
}

// Aggregate the PROFILE_RULES delta for one ingredient against one (field,value).
function cellDelta(ingredientName: string, field: string, value: string): number {
  const n = ingredientName.toLowerCase();
  let delta = 0;
  for (const rule of PROFILE_RULES) {
    if (!rule.match.some(m => matchesIngredient(n, m))) continue;
    const condValues = (rule.conditions as Record<string, string[]>)[field];
    if (!condValues || !condValues.includes(value)) continue;
    delta += rule.delta;
  }
  return delta;
}

// ═══════════════════════════════════════════════════════════════════════════
// CSV MODIFIER SOURCE  (primary source for the preference table)
// ───────────────────────────────────────────────────────────────────────────
// ingredient_modifiers_full.csv gives, per (ingredient, productType, field,
// value), an ABSOLUTE 0–100 suitability score + optional status override +
// localized reason. This is the PRIMARY signal; PROFILE_RULES (cellDelta) are
// only consulted when the CSV has no row for a given (ingredient, criterion).
// ═══════════════════════════════════════════════════════════════════════════

// Map app-internal profile value codes → CSV criteria_value tokens.
const CSV_VALUE_MAP: Record<string, { field: string; value: string }> = {
  // skinType
  skinOily:                 { field: 'skinType',        value: 'oily' },
  skinDry:                  { field: 'skinType',        value: 'dry' },
  // skinSensitivity
  sensFragrances:           { field: 'skinSensitivity', value: 'fragrance_sensitive' },
  sensAlcohol:              { field: 'skinSensitivity', value: 'alcohol_sensitive' },
  sensEssentialOils:        { field: 'skinSensitivity', value: 'essential_oil_sensitive' },
  sensIrritationAfterCare:  { field: 'skinSensitivity', value: 'sensitive' },
  sensReactionNewProducts:  { field: 'skinSensitivity', value: 'sensitive' },
  // skinConditions
  condBreakouts:            { field: 'skinConditions',  value: 'acne' },
  condBlackheads:           { field: 'skinConditions',  value: 'acne' },
  condRedness:              { field: 'skinConditions',  value: 'redness' },
  condIrritation:           { field: 'skinConditions',  value: 'redness' },
  condUnevenTone:           { field: 'skinConditions',  value: 'hyperpigmentation' },
  condDarkSpots:            { field: 'skinConditions',  value: 'hyperpigmentation' },
  condPigmentation:         { field: 'skinConditions',  value: 'hyperpigmentation' },
  condDullness:             { field: 'skinConditions',  value: 'dullness' },
  // ageRange (only anti_age exists in CSV; map the mature buckets to it)
  age3545:                  { field: 'ageRange',        value: 'anti_age' },
  age4550:                  { field: 'ageRange',        value: 'anti_age' },
  age50plus:                { field: 'ageRange',        value: 'anti_age' },
  // scalpCondition
  scalpOily:                { field: 'scalpCondition',  value: 'oily_scalp' },
  scalpDry:                 { field: 'scalpCondition',  value: 'dry_scalp' },
  // hairProblems
  hairDryDamaged:           { field: 'hairProblems',    value: 'damaged_hair' },
  hairFrizzy:               { field: 'hairProblems',    value: 'damaged_hair' },
  hairBrittle:              { field: 'hairProblems',    value: 'damaged_hair' },
  // climate
  climateSunny:             { field: 'climate',         value: 'sunny' },
  climateHumid:             { field: 'climate',         value: 'hot_humid' },
  climateDry:               { field: 'climate',         value: 'dry_cold' },
  climateCold:              { field: 'climate',         value: 'dry_cold' },
  climateWindy:             { field: 'climate',         value: 'dry_cold' },
};

// Map app product category → CSV product_type token.
function csvProductType(category: keyof typeof RELEVANT_FIELDS_BY_CATEGORY): string {
  if (category === 'lips') return 'lips_eyes';
  if (category === 'face') return 'face';
  if (category === 'body') return 'body';
  if (category === 'hair') return 'hair';
  return 'face'; // 'nails' / 'other' → fall back to generic face rows
}

function ptMatch(rowPt: string, wantedPt: string): boolean {
  return rowPt === '*' || rowPt === wantedPt;
}

/**
 * Result of a CSV modifier lookup for one (ingredient, field, value, productType).
 * Returns null when the CSV has no applicable row (→ caller falls back to rules).
 */
interface CsvCell {
  score: number;          // 0–100 absolute suitability (clamped)
  emoji: '✅' | '⚠️' | '⛔️';
  override?: string;      // raw status override if present
  reason?: ModifierReason; // localized short explanation from the modifier row
}

// ── Runtime registry for Supabase-cached modifiers ─────────────────────────
// The static INGREDIENT_MODIFIERS table ships with the code. Ingredients that
// were unknown at build time get AI-generated modifiers saved to Supabase by
// the server (enrichModifiersInBackground). The client can load those rows for
// the current product and register them here so the preference table treats
// previously-unknown ingredients exactly like known ones.
const EXTRA_MODIFIERS = new Map<string, ModifierRow[]>();

/** Merge externally-loaded modifier rows (e.g. from Supabase) into the registry. */
export function registerExtraModifiers(rows: ModifierRow[]): void {
  for (const row of rows) {
    const key = row[0].toLowerCase();
    const arr = EXTRA_MODIFIERS.get(key);
    if (arr) arr.push(row);
    else EXTRA_MODIFIERS.set(key, [row]);
  }
}

/** Clear the runtime registry (call when switching products). */
export function clearExtraModifiers(): void {
  EXTRA_MODIFIERS.clear();
}

/** Static rows + any registered Supabase-cached rows for an ingredient. */
function allModifierRows(ingredientName: string): ModifierRow[] {
  const stat  = getModifierRows(ingredientName);
  const extra = EXTRA_MODIFIERS.get(ingredientName.toLowerCase());
  if (!extra || extra.length === 0) return stat;
  if (stat.length === 0) return extra;
  return [...stat, ...extra];
}

function csvCellScore(
  ingredientName: string,
  field: string,
  value: string,
  csvPt: string,
): CsvCell | null {
  // Translate app field+value → CSV token. A wildcard ('*','*') row always
  // applies regardless of field/value, so we accept those too.
  const map = CSV_VALUE_MAP[value];
  const wantField = map?.field ?? field;
  const wantValue = map?.value ?? value;

  const rows: ModifierRow[] = allModifierRows(ingredientName);
  if (rows.length === 0) return null;

  // Specificity: a row matching the exact field+value beats a wildcard row;
  // an exact productType beats a '*' productType.
  let best: { row: ModifierRow; rank: number } | null = null;
  for (const row of rows) {
    const [, rowPt, rowField, rowValue] = row;
    if (!ptMatch(rowPt, csvPt)) continue;

    const fieldExact = rowField === wantField;
    const valueExact = rowValue === wantValue;
    const wild = rowField === '*' && rowValue === '*';
    if (!((fieldExact && valueExact) || wild)) continue;

    // rank: prefer exact field/value (+2), then exact productType (+1)
    let rank = 0;
    if (fieldExact && valueExact) rank += 2;
    if (rowPt !== '*') rank += 1;
    if (!best || rank > best.rank) best = { row, rank };
  }
  if (!best) return null;

  const cell = best.row[4];
  const score100 = Math.min(100, Math.max(0, Math.round(cell.s)));
  let emoji: '✅' | '⚠️' | '⛔️';
  if (cell.o === '🟢') emoji = '✅';
  else if (cell.o === '🔴') emoji = '⛔️';
  else if (cell.o === '🟡') emoji = '⚠️';
  else emoji = score100 >= 70 ? '✅' : score100 >= 35 ? '⚠️' : '⛔️';

  return { score: score100, emoji, override: cell.o, reason: cell.r };
}

/**
 * Deterministic preference-match table + score.
 * @param ingredients product INCI list
 * @param profile     user profile
 * @param productType used to scope which preference fields are relevant
 * @param lang        label language
 */
export function computePreferenceTable(
  ingredients: Ingredient[],
  profile: UserProfile,
  productType: string = '',
  lang: string = 'en',
): PreferenceTable {
  const empty: PreferenceTable = {
    columns: [], ignoredIngredients: [], score: null, capped: false, uncertain: false,
  };
  if (!ingredients || ingredients.length === 0) return empty;

  const allowedFields = RELEVANT_FIELDS_BY_CATEGORY[detectCategory(productType)];
  const csvPt = csvProductType(detectCategory(productType));

  // Candidate columns = selected preference values within the allowed fields.
  const candidates: { field: string; value: string; label: string }[] = [];
  for (const field of allowedFields) {
    const raw = (profile as unknown as Record<string, unknown>)[field];
    const values: string[] = Array.isArray(raw) ? raw as string[] : (raw ? [String(raw)] : []);
    const labelMap = PREFERENCE_LABELS[field];
    if (!labelMap) continue;
    for (const value of values) {
      if (!value || PREF_SKIP_VALUE.test(value)) continue;
      const lmap = labelMap[value];
      if (!lmap) continue;
      candidates.push({ field, value, label: lmap[lang] ?? lmap['en'] ?? value });
    }
  }

  const matched = new Set<string>();
  const columns: PreferenceColumn[] = [];

  for (const cand of candidates) {
    const cells: PreferenceCell[] = [];
    let scoreSum = 0;   // running sum of 0–10 per-cell scores
    let scoreN   = 0;   // number of contributing cells
    for (const ing of ingredients) {
      // 1) PRIMARY: absolute CSV modifier score (0–100 → 0–10) for this criterion.
      const csv = csvCellScore(ing.name, cand.field, cand.value, csvPt);
      if (csv) {
        const reason = csv.reason
          ? ((csv.reason as unknown as Record<string, string>)[lang] ?? csv.reason.en ?? undefined)
          : undefined;
        cells.push({ ingredient: ing.name, emoji: csv.emoji, reason });
        matched.add(ing.name);
        scoreSum += csv.score;
        scoreN++;
        continue;
      }
      // 2) FALLBACK: hard-coded PROFILE_RULES delta → emoji → EMOJI_SCORE.
      const d = cellDelta(ing.name, cand.field, cand.value);
      if (d === 0) continue;
      const emoji = emojiFromDelta(d);
      cells.push({ ingredient: ing.name, emoji });
      matched.add(ing.name);
      scoreSum += EMOJI_SCORE[emoji];
      scoreN++;
    }
    if (cells.length === 0) continue; // criterion not relevant for this list — omit

    const colScore = scoreN > 0 ? scoreSum / scoreN : 0;
    columns.push({
      field: cand.field,
      value: cand.value,
      label: cand.label,
      score: Math.round(colScore * 10) / 10,
      emoji: emojiFromScore(colScore),
      cells,
    });
  }

  if (columns.length === 0) return empty;

  const ignoredIngredients = ingredients
    .map(i => i.name)
    .filter(name => !matched.has(name));

  let overall = columns.reduce((s, c) => s + c.score, 0) / columns.length;
  const hasConflict = columns.some(c => c.emoji === '⛔️');
  let capped = false;
  if (CONFLICT_CAP_ENABLED && hasConflict && overall > CONFLICT_CAP_VALUE) {
    overall = CONFLICT_CAP_VALUE;
    capped = true;
  }

  const warnShare = columns.filter(c => c.emoji === '⚠️').length / columns.length;
  const uncertain = columns.length < 2 || warnShare > 0.5;

  return {
    columns,
    ignoredIngredients,
    score: Math.round(overall),
    capped,
    uncertain,
  };
}
