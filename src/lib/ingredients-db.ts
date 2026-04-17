/**
 * ingredients-db.ts
 * Top-200 INCI ingredients with pre-written descriptions and safety status.
 * Used to enrich AI analysis results without extra API calls.
 * 
 * Status: 🟢 safe | 🟡 caution | 🔴 avoid
 */

export interface IngredientEntry {
  status: '🟢' | '🟡' | '🔴';
  description: string; // short, 1-7 words, matches AI format
}

// Key: lowercase INCI name (trimmed)
export const INGREDIENTS_DB: Record<string, IngredientEntry> = {
  // ── Humectants ──────────────────────────────────────────────────────────────
  'water':                          { status: '🟢', description: 'Solvent, hydration base' },
  'aqua':                           { status: '🟢', description: 'Solvent, hydration base' },
  'glycerin':                       { status: '🟢', description: 'Humectant, draws moisture' },
  'glycerol':                       { status: '🟢', description: 'Humectant, draws moisture' },
  'propylene glycol':               { status: '🟡', description: 'Humectant, may irritate sensitive skin' },
  'butylene glycol':                { status: '🟢', description: 'Humectant, enhances penetration' },
  'pentylene glycol':               { status: '🟢', description: 'Humectant, mild antimicrobial' },
  'sodium hyaluronate':             { status: '🟢', description: 'Hyaluronic acid salt, deep hydration' },
  'hyaluronic acid':                { status: '🟢', description: 'Holds 1000x weight in water' },
  'sodium pca':                     { status: '🟢', description: 'Natural moisturising factor' },
  'urea':                           { status: '🟢', description: 'Keratolytic humectant, softens skin' },
  'sorbitol':                       { status: '🟢', description: 'Humectant, sugar derivative' },
  'panthenol':                      { status: '🟢', description: 'Pro-vitamin B5, soothes and repairs' },

  // ── Emollients & Occlusives ──────────────────────────────────────────────────
  'petrolatum':                     { status: '🟢', description: 'Occlusive barrier, seals moisture' },
  'mineral oil':                    { status: '🟡', description: 'Occlusive, may clog pores' },
  'dimethicone':                    { status: '🟢', description: 'Silicone emollient, smooths texture' },
  'cyclopentasiloxane':             { status: '🟡', description: 'Volatile silicone, environmental concerns' },
  'cyclohexasiloxane':              { status: '🟡', description: 'Volatile silicone, environmental concerns' },
  'isopropyl myristate':            { status: '🟡', description: 'Emollient, comedogenic risk' },
  'isopropyl palmitate':            { status: '🟡', description: 'Emollient, may clog pores' },
  'caprylic/capric triglyceride':   { status: '🟢', description: 'Light emollient from coconut' },
  'squalane':                       { status: '🟢', description: 'Lightweight emollient, non-comedogenic' },
  'jojoba oil':                     { status: '🟢', description: 'Liquid wax, balances sebum' },
  'simmondsia chinensis seed oil':  { status: '🟢', description: 'Jojoba oil, balances sebum' },
  'shea butter':                    { status: '🟢', description: 'Rich emollient, anti-inflammatory' },
  'butyrospermum parkii butter':    { status: '🟢', description: 'Shea butter, deeply nourishing' },
  'cetyl alcohol':                  { status: '🟢', description: 'Fatty alcohol emollient, thickener' },
  'stearyl alcohol':                { status: '🟢', description: 'Fatty alcohol, emollient thickener' },
  'cetearyl alcohol':               { status: '🟢', description: 'Fatty alcohol, emollient emulsifier' },
  'behenyl alcohol':                { status: '🟢', description: 'Fatty alcohol, conditioning agent' },

  // ── Emulsifiers ──────────────────────────────────────────────────────────────
  'glyceryl stearate':              { status: '🟢', description: 'Emulsifier, skin conditioner' },
  'glyceryl stearate se':           { status: '🟢', description: 'Self-emulsifying emulsifier' },
  'peg-100 stearate':               { status: '🟡', description: 'Emulsifier, may contain impurities' },
  'polysorbate 20':                 { status: '🟢', description: 'Mild emulsifier, solubiliser' },
  'polysorbate 80':                 { status: '🟡', description: 'Emulsifier, high doses may irritate' },
  'stearic acid':                   { status: '🟢', description: 'Fatty acid emulsifier, thickener' },
  'palmitic acid':                  { status: '🟢', description: 'Fatty acid, emollient emulsifier' },
  'lauric acid':                    { status: '🟡', description: 'Fatty acid, comedogenic potential' },
  'sodium stearoyl lactylate':      { status: '🟢', description: 'Natural emulsifier, gentle' },
  'lecithin':                       { status: '🟢', description: 'Phospholipid emulsifier, skin-identical' },

  // ── Active Ingredients ────────────────────────────────────────────────────────
  'niacinamide':                    { status: '🟢', description: 'B3 vitamin, brightens, minimises pores' },
  'retinol':                        { status: '🟡', description: 'Vitamin A, anti-ageing, photosensitising' },
  'retinyl palmitate':              { status: '🟡', description: 'Mild vitamin A ester, photosensitising' },
  'retinal':                        { status: '🟡', description: 'Potent vitamin A, anti-ageing' },
  'ascorbic acid':                  { status: '🟢', description: 'Vitamin C, antioxidant, brightening' },
  'sodium ascorbyl phosphate':      { status: '🟢', description: 'Stable vitamin C derivative' },
  'ascorbyl glucoside':             { status: '🟢', description: 'Stable vitamin C, brightening' },
  '3-o-ethyl ascorbic acid':        { status: '🟢', description: 'Stable vitamin C, brightening' },
  'tocopherol':                     { status: '🟢', description: 'Vitamin E antioxidant' },
  'tocopheryl acetate':             { status: '🟢', description: 'Stable vitamin E, antioxidant' },
  'alpha-arbutin':                  { status: '🟢', description: 'Depigmenting, inhibits melanin' },
  'arbutin':                        { status: '🟢', description: 'Brightening, reduces dark spots' },
  'kojic acid':                     { status: '🟡', description: 'Brightening, may irritate' },
  'azelaic acid':                   { status: '🟢', description: 'Anti-inflammatory, brightening' },
  'tranexamic acid':                { status: '🟢', description: 'Brightening, reduces pigmentation' },
  'glycolic acid':                  { status: '🟡', description: 'AHA exfoliant, photosensitising' },
  'lactic acid':                    { status: '🟡', description: 'Gentle AHA exfoliant' },
  'mandelic acid':                  { status: '🟡', description: 'Mild AHA, suits sensitive skin' },
  'salicylic acid':                 { status: '🟡', description: 'BHA, unclogs pores, anti-bacterial' },
  'beta-hydroxy acid':              { status: '🟡', description: 'BHA exfoliant, pore-clearing' },
  'polyglutamic acid':              { status: '🟢', description: 'Super-humectant, holds moisture' },
  'ceramide np':                    { status: '🟢', description: 'Barrier lipid, repairs skin' },
  'ceramide ap':                    { status: '🟢', description: 'Barrier ceramide, skin-identical' },
  'ceramide eop':                   { status: '🟢', description: 'Barrier ceramide, strengthens skin' },
  'ceramide ns':                    { status: '🟢', description: 'Barrier lipid, restores barrier' },
  'ceramide ng':                    { status: '🟢', description: 'Barrier ceramide, skin repair' },
  'cholesterol':                    { status: '🟢', description: 'Barrier lipid, skin-identical' },
  'adenosine':                      { status: '🟢', description: 'Anti-ageing, reduces wrinkles' },
  'epigallocatechin gallate':       { status: '🟢', description: 'Green tea antioxidant' },

  // ── Preservatives ─────────────────────────────────────────────────────────────
  'phenoxyethanol':                 { status: '🟡', description: 'Preservative, occasional irritant' },
  'ethylhexylglycerin':             { status: '🟢', description: 'Mild preservative booster' },
  'benzyl alcohol':                 { status: '🟡', description: 'Preservative, allergen potential' },
  'sodium benzoate':                { status: '🟡', description: 'Preservative, forms benzene with C' },
  'potassium sorbate':              { status: '🟢', description: 'Mild natural preservative' },
  'methylparaben':                  { status: '🟡', description: 'Paraben preservative, debated safety' },
  'propylparaben':                  { status: '🟡', description: 'Paraben, endocrine concerns' },
  'ethylparaben':                   { status: '🟡', description: 'Paraben preservative' },
  'butylparaben':                   { status: '🟡', description: 'Paraben, strongest endocrine concern' },
  'chlorphenesin':                  { status: '🟡', description: 'Preservative, may irritate' },
  'dehydroacetic acid':             { status: '🟢', description: 'Gentle preservative' },
  'sodium hydroxymethylglycinate':  { status: '🟡', description: 'Preservative, formaldehyde releaser' },
  'dmdm hydantoin':                 { status: '🔴', description: 'Formaldehyde releaser, allergen' },
  'imidazolidinyl urea':            { status: '🔴', description: 'Formaldehyde releaser, allergen' },
  'quaternium-15':                  { status: '🔴', description: 'Strong formaldehyde releaser' },
  '2-bromo-2-nitropropane-1,3-diol': { status: '🔴', description: 'Formaldehyde releaser' },
  'iodopropynyl butylcarbamate':    { status: '🟡', description: 'Preservative, avoid in leave-on' },

  // ── Surfactants ───────────────────────────────────────────────────────────────
  'sodium lauryl sulfate':          { status: '🔴', description: 'Harsh surfactant, strips barrier' },
  'sodium laureth sulfate':         { status: '🟡', description: 'Common surfactant, mildly stripping' },
  'ammonium lauryl sulfate':        { status: '🟡', description: 'Surfactant, irritation potential' },
  'cocamidopropyl betaine':         { status: '🟢', description: 'Mild amphoteric surfactant' },
  'decyl glucoside':                { status: '🟢', description: 'Gentle plant-derived surfactant' },
  'coco-glucoside':                 { status: '🟢', description: 'Mild coconut-derived cleanser' },
  'sodium cocoyl isethionate':      { status: '🟢', description: 'Mild coconut surfactant' },
  'disodium laureth sulfosuccinate': { status: '🟢', description: 'Mild gentle cleanser' },

  // ── Sunscreen actives ─────────────────────────────────────────────────────────
  'zinc oxide':                     { status: '🟢', description: 'Mineral UV filter, broad spectrum' },
  'titanium dioxide':               { status: '🟢', description: 'Mineral UV filter, photostable' },
  'avobenzone':                     { status: '🟡', description: 'Chemical UVA filter, unstable alone' },
  'octinoxate':                     { status: '🟡', description: 'Chemical UVB filter, hormone concerns' },
  'oxybenzone':                     { status: '🔴', description: 'Chemical filter, hormone disruptor' },
  'octocrylene':                    { status: '🟡', description: 'UV filter, stabiliser, photoallergy risk' },
  'homosalate':                     { status: '🟡', description: 'Chemical UVB filter, penetration concern' },
  'tinosorb s':                     { status: '🟢', description: 'Broad-spectrum chemical filter, stable' },
  'tinosorb m':                     { status: '🟢', description: 'Broad-spectrum filter, low penetration' },
  'uvinul a plus':                  { status: '🟢', description: 'UVA filter, photostable' },
  'mexoryl sx':                     { status: '🟢', description: 'UVA filter, photostable' },
  'iscotrizinol':                   { status: '🟢', description: 'Broad spectrum UV filter' },

  // ── Soothing & Anti-inflammatory ─────────────────────────────────────────────
  'allantoin':                      { status: '🟢', description: 'Soothing, promotes cell renewal' },
  'bisabolol':                      { status: '🟢', description: 'Chamomile extract, anti-inflammatory' },
  'centella asiatica extract':      { status: '🟢', description: 'Cica, soothing and healing' },
  'centella asiatica':              { status: '🟢', description: 'Cica, soothing and healing' },
  'madecassoside':                  { status: '🟢', description: 'Cica component, skin repair' },
  'asiaticoside':                   { status: '🟢', description: 'Cica component, wound healing' },
  'licorice root extract':          { status: '🟢', description: 'Brightening, anti-inflammatory' },
  'glycyrrhiza glabra root extract': { status: '🟢', description: 'Licorice, soothing brightener' },
  'aloe barbadensis leaf juice':    { status: '🟢', description: 'Aloe vera, soothing hydrator' },
  'chamomilla recutita extract':    { status: '🟢', description: 'Chamomile, calming anti-inflammatory' },
  'camellia sinensis leaf extract': { status: '🟢', description: 'Green tea antioxidant' },
  'calendula officinalis extract':  { status: '🟢', description: 'Calendula, wound healing' },

  // ── Texture agents ────────────────────────────────────────────────────────────
  'carbomer':                       { status: '🟢', description: 'Thickening polymer, gel former' },
  'acrylates/c10-30 alkyl acrylate crosspolymer': { status: '🟢', description: 'Thickener, gel texture' },
  'xanthan gum':                    { status: '🟢', description: 'Natural thickener, stabiliser' },
  'hydroxyethylcellulose':          { status: '🟢', description: 'Plant thickener, film former' },
  'hydroxypropyl methylcellulose':  { status: '🟢', description: 'Thickener, texture modifier' },
  'cellulose':                      { status: '🟢', description: 'Natural thickener from plants' },
  'sodium polyacrylate':            { status: '🟢', description: 'Super-absorbent polymer, thickener' },
  'silica':                         { status: '🟢', description: 'Mattifying, pore-blurring powder' },
  'mica':                           { status: '🟢', description: 'Mineral shimmer, light-reflecting' },

  // ── pH adjusters ─────────────────────────────────────────────────────────────
  'sodium hydroxide':               { status: '🟢', description: 'pH adjuster, alkali' },
  'citric acid':                    { status: '🟢', description: 'pH adjuster, mild AHA' },
  'triethanolamine':                { status: '🟡', description: 'pH adjuster, nitrosamine concerns' },
  'tromethamine':                   { status: '🟢', description: 'pH adjuster, alternative to TEA' },
  'aminomethyl propanol':           { status: '🟢', description: 'pH adjuster, buffering agent' },

  // ── Fragrances & Allergens ────────────────────────────────────────────────────
  'fragrance':                      { status: '🟡', description: 'Undisclosed fragrance mix, allergen risk' },
  'parfum':                         { status: '🟡', description: 'Fragrance blend, allergen risk' },
  'limonene':                       { status: '🟡', description: 'Citrus fragrance, common allergen' },
  'linalool':                       { status: '🟡', description: 'Floral fragrance, allergen' },
  'citronellol':                    { status: '🟡', description: 'Rose fragrance, allergen' },
  'geraniol':                       { status: '🟡', description: 'Floral fragrance, allergen' },
  'coumarin':                       { status: '🟡', description: 'Fragrance compound, allergen' },
  'eugenol':                        { status: '🟡', description: 'Spice fragrance, allergen' },
  'alcohol denat':                  { status: '🟡', description: 'Denatured alcohol, drying' },
  'alcohol':                        { status: '🟡', description: 'Drying, antimicrobial solvent' },
  'ethanol':                        { status: '🟡', description: 'Alcohol, drying at high concentrations' },

  // ── Hair-specific ─────────────────────────────────────────────────────────────
  'behentrimonium chloride':        { status: '🟢', description: 'Conditioning agent, detangler' },
  'cetrimonium chloride':           { status: '🟢', description: 'Cationic conditioner, antistatic' },
  'guar hydroxypropyltrimonium chloride': { status: '🟢', description: 'Hair conditioner, detangler' },
  'polyquaternium-10':              { status: '🟢', description: 'Film-forming conditioner' },
  'polyquaternium-7':               { status: '🟢', description: 'Conditioning polymer' },
  'hydrolyzed keratin':             { status: '🟢', description: 'Protein, strengthens hair' },
  'hydrolyzed wheat protein':       { status: '🟢', description: 'Protein, repairs damage' },
  'hydrolyzed collagen':            { status: '🟢', description: 'Protein, conditions hair' },
  'biotin':                         { status: '🟢', description: 'B7 vitamin, strengthens hair' },
  'zinc pyrithione':                { status: '🟢', description: 'Anti-dandruff, anti-fungal' },
  'piroctone olamine':              { status: '🟢', description: 'Anti-dandruff, scalp care' },
  'selenium sulfide':               { status: '🟡', description: 'Anti-dandruff, strong active' },
  'ketoconazole':                   { status: '🟢', description: 'Anti-fungal, anti-dandruff' },

  // ── Chelating ─────────────────────────────────────────────────────────────────
  'disodium edta':                  { status: '🟡', description: 'Chelating agent, enhances penetration' },
  'tetrasodium edta':               { status: '🟡', description: 'Chelating agent, environmental concerns' },
  'phytic acid':                    { status: '🟢', description: 'Natural chelator, antioxidant' },
};

/**
 * Look up an ingredient from the local database.
 * Returns null if not found (AI description should be used).
 */
export function lookupIngredient(name: string): IngredientEntry | null {
  const key = name.toLowerCase().trim();
  return INGREDIENTS_DB[key] ?? null;
}

/**
 * Enrich AI-returned ingredients with local DB data where available.
 * Local DB takes precedence for status only if AI returned 🟢 (conservative: trust AI downgrades).
 */
export function enrichIngredients(
  ingredients: Array<{ name: string; status: string; description: string }>
): Array<{ name: string; status: string; description: string }> {
  return ingredients.map(ing => {
    const local = lookupIngredient(ing.name);
    if (!local) return ing; // unknown ingredient — keep AI result as-is

    return {
      name: ing.name,
      // Trust AI if it flagged 🟡 or 🔴 — only upgrade from 🟢 if local agrees
      status: ing.status === '🟢' ? local.status : ing.status,
      // Use AI description if it's longer/more specific, else use local
      description: ing.description && ing.description.length > local.description.length
        ? ing.description
        : local.description,
    };
  });
}
