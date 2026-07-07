import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Settings, Loader2, ChevronDown } from 'lucide-react';
import { Language } from '../i18n';
import { AnalysisResult, SerializedProfile } from '../services/ai';
import { UserProfile } from './UserProfile';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { computePreferenceTable, PreferenceTable, registerExtraModifiers, clearExtraModifiers } from '../lib/personalScore';
import { verdictEmoji100 } from '../lib/scoring';
import { computeIngredientsHash, getFrozenPersonalText, saveFrozenPersonalText } from '../services/productCache';
import type { ModifierRow, ModifierReason } from '../lib/ingredient-modifiers';

interface Props {
  lang: Language;
  result: AnalysisResult;
  user: User | null;
  userProfile: UserProfile | null;
  canUseNote: boolean;
  onLimitReached: () => void;
  onUsed: () => Promise<void>;
  onOpenProfile: () => void;
}

export interface Criterion {
  emoji: string;
  label: string;
  explanation: string;
  ingredient?: string;
  relevant?: boolean;
}

const FUNCTION_URL = '/api/gemini';

// ── Module-level cache & prefetch ─────────────────────────────────────────────
export const criteriaCache = new Map<string, Criterion[]>();

function makeProfileKey(profile: UserProfile): string {
  return [
    profile.skinType.join(','),
    profile.skinSensitivity.join(','),
    profile.skinConditions.join(','),
    profile.ageRange ?? '',
    profile.hairType.join(','),
    profile.scalpCondition.join(','),
    profile.hairProblems.join(','),
    (profile.bodySkinType ?? []).join(','),
    (profile.climate ?? []).join(','),
  ].join('|');
}

function serializeProfile(profile: UserProfile): SerializedProfile {
  return {
    skinType:        profile.skinType.join(', ')             || undefined,
    skinSensitivity: profile.skinSensitivity.join(', ')      || undefined,
    skinConditions:  profile.skinConditions.join(', ')       || undefined,
    ageRange:        profile.ageRange                        || undefined,
    hairType:        profile.hairType.join(', ')             || undefined,
    scalpCondition:  profile.scalpCondition.join(', ')       || undefined,
    hairProblems:    profile.hairProblems.join(', ')         || undefined,
    bodySkinType:    (profile.bodySkinType ?? []).join(', ') || undefined,
    climate:         (profile.climate ?? []).join(', ')      || undefined,
    allergies:       (profile as any).allergies              || undefined,
  };
}

async function fetchCriteria(
  result: AnalysisResult,
  profile: UserProfile,
  lang: Language,
): Promise<Criterion[]> {
  const r = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'personalNote',
      result,
      userProfile: serializeProfile(profile),
      language: lang,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
  return (data.criteria ?? []).map((c: any) => ({
    emoji: c.emoji ?? '⚠️',
    label: c.label ?? '',
    explanation: c.explanation ?? '',
    ingredient: c.ingredient ?? '',
    // Default true for backward compatibility with criteria cached before this field existed.
    relevant: c.relevant !== false,
  })).filter((c: Criterion) => c.label);
}

export async function prefetchPersonalNote(
  result: AnalysisResult,
  profile: UserProfile,
  lang: Language,
): Promise<Criterion[]> {
  const key = `${result.productName}|${result.brand}|${makeProfileKey(profile)}|${lang}`;
  const cached = criteriaCache.get(key);
  if (cached) return cached;
  try {
    // Frozen shared copy first (composition + profile + language)
    const ingHash = await computeIngredientsHash(result.ingredients ?? []).catch(() => null);
    const frozenKey = ingHash ? `criteria|${ingHash}|${makeProfileKey(profile)}|${lang}` : '';
    if (frozenKey) {
      const frozen = await getFrozenPersonalText<{ criteria: Criterion[] }>(frozenKey).catch(() => null);
      if (frozen && Array.isArray(frozen.criteria) && frozen.criteria.length > 0) {
        criteriaCache.set(key, frozen.criteria);
        return frozen.criteria;
      }
    }
    const items = await fetchCriteria(result, profile, lang);
    criteriaCache.set(key, items);
    if (frozenKey && items.length > 0) {
      saveFrozenPersonalText(frozenKey, { criteria: items }).catch(() => {});
    }
    return items;
  } catch {
    return [];
  }
}

// ── CriterionRow ──────────────────────────────────────────────────────────────
const SKIP_LABELS = /ничего|nothing|none|unknown|keine|нічого|ninguno|aucun|nessuno|bilinmiyor|отсутстви|absence|не имею|no issues|no problem|немає|sin problemas/i;

function CriterionRow({ c, lang }: { c: Criterion; lang: Language }) {
  const [open, setOpen] = useState(false);
  const LOADING: Record<string, string> = {
    en:'Loading…', ru:'Загружаем…', de:'Laden…', uk:'Завантажуємо…',
    es:'Cargando…', fr:'Chargement…', it:'Caricamento…', tr:'Yükleniyor…',
  };
  return (
    <div onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer', paddingBottom: open ? 6 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: '0.82rem', lineHeight: 1, flexShrink: 0 }}>{c.emoji}</span>
        <span style={{ flex: 1, fontSize: '0.78rem', color: '#3A3530', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
          {c.label}
        </span>
        <ChevronDown size={12} style={{ color: '#8A8078', flexShrink: 0, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </div>
      {open && (
        <div style={{ paddingLeft: 22, marginTop: 4 }}>
          {c.explanation
            ? <span style={{ fontSize: '0.78rem', color: '#5A5550', fontFamily: 'var(--font-serif)', lineHeight: 1.55 }}>{c.explanation}</span>
            : <span style={{ fontSize: '0.72rem', color: '#8A8078', fontStyle: 'italic' }}>{LOADING[lang] ?? LOADING.en}</span>
          }
        </div>
      )}
    </div>
  );
}

// ── Preference-match table (deterministic, from PROFILE_RULES) ────────────────
const PT = {
  title:    { en:'Preference match', ru:'Соответствие предпочтениям', de:'Übereinstimmung', uk:'Відповідність уподобанням', es:'Coincidencia', fr:'Correspondance', it:'Corrispondenza', tr:'Tercih uyumu' },
  approx:   { en:'approximate — few signals', ru:'ориентировочно — мало данных', de:'ungefähr — wenige Signale', uk:'орієнтовно — мало даних', es:'aproximado — pocas señales', fr:'approximatif — peu de signaux', it:'approssimativo — pochi segnali', tr:'yaklaşık — az veri' },
  capped:   { en:'limited — direct conflict present', ru:'ограничено — есть прямой конфликт', de:'begrenzt — direkter Konflikt', uk:'обмежено — прямий конфлікт', es:'limitado — conflicto directo', fr:'plafonné — conflit direct', it:'limitato — conflitto diretto', tr:'sınırlı — doğrudan çatışma' },
  noEffect: { en:'No effect on preferences', ru:'Не влияют на предпочтения', de:'Ohne Einfluss', uk:'Не впливають', es:'Sin efecto', fr:'Sans effet', it:'Senza effetto', tr:'Etkisiz' },
};

// ── Verdict legend (shown when the "Pay attention" block is open) ─────────────
// The numeric 0–100 score is still computed and cached internally; the user
// only ever sees the 🟢/🟡/🔴 verdict explained below.
const PT_LEGEND: { emoji: '🟢' | '🟡' | '🔴'; title: Record<string, string>; desc: Record<string, string> }[] = [
  {
    emoji: '🟢',
    title: { en:'Suitable', ru:'Подходит', de:'Geeignet', uk:'Підходить', es:'Adecuado', fr:'Convient', it:'Adatto', tr:'Uygun' },
    desc: {
      en:'The formula generally matches your preferences.',
      ru:'Формула в целом соответствует вашим предпочтениям.',
      de:'Die Formel entspricht insgesamt Ihren Präferenzen.',
      uk:'Формула загалом відповідає вашим уподобанням.',
      es:'La fórmula en general coincide con tus preferencias.',
      fr:'La formule correspond globalement à vos préférences.',
      it:'La formula corrisponde in generale alle tue preferenze.',
      tr:'Formül genel olarak tercihlerinize uyuyor.',
    },
  },
  {
    emoji: '🟡',
    title: { en:'Fair', ru:'Нормально', de:'Akzeptabel', uk:'Нормально', es:'Aceptable', fr:'Correct', it:'Accettabile', tr:'Orta' },
    desc: {
      en:'Some components may cause discomfort under certain conditions.',
      ru:'В составе есть компоненты, которые при определённых условиях могут вызывать дискомфорт.',
      de:'Einige Inhaltsstoffe können unter bestimmten Bedingungen Unbehagen verursachen.',
      uk:'У складі є компоненти, які за певних умов можуть викликати дискомфорт.',
      es:'Algunos componentes pueden causar molestias en ciertas condiciones.',
      fr:'Certains composants peuvent causer de l\u2019inconfort dans certaines conditions.',
      it:'Alcuni componenti possono causare disagio in determinate condizioni.',
      tr:'Bazı bileşenler belirli koşullarda rahatsızlığa neden olabilir.',
    },
  },
  {
    emoji: '🔴',
    title: { en:'Not suitable', ru:'Не подходит', de:'Nicht geeignet', uk:'Не підходить', es:'No adecuado', fr:'Ne convient pas', it:'Non adatto', tr:'Uygun değil' },
    desc: {
      en:'The formula contains components that may conflict with your preferences.',
      ru:'Формула содержит компоненты, которые могут конфликтовать с вашими предпочтениями.',
      de:'Die Formel enthält Inhaltsstoffe, die mit Ihren Präferenzen in Konflikt stehen können.',
      uk:'Формула містить компоненти, які можуть конфліктувати з вашими уподобаннями.',
      es:'La fórmula contiene componentes que pueden entrar en conflicto con tus preferencias.',
      fr:'La formule contient des composants pouvant entrer en conflit avec vos préférences.',
      it:'La formula contiene componenti che possono entrare in conflitto con le tue preferenze.',
      tr:'Formül, tercihlerinizle çelişebilecek bileşenler içeriyor.',
    },
  },
];

// Map internal cell/column marks to the same circles used everywhere else.
const CIRCLE: Record<'✅' | '⚠️' | '⛔️', '🟢' | '🟡' | '🔴'> = { '✅': '🟢', '⚠️': '🟡', '⛔️': '🔴' };

function PreferenceScoreTable({ table, lang }: { table: PreferenceTable; lang: Language }) {
  const score = table.score ?? 0; // already on the unified 0–100 scale
  const emoji = verdictEmoji100(score);
  const color = emoji === '🟢' ? '#2D9B5A' : emoji === '🟡' ? '#E8A020' : '#D94040';
  // Verdict derived from the internal score — the number itself is never shown.
  const verdict = PT_LEGEND[emoji === '🟢' ? 0 : emoji === '🟡' ? 1 : 2];
  const tt = (m: Record<string, string>) => m[lang] ?? m.en;
  const note = table.capped ? tt(PT.capped) : table.uncertain ? tt(PT.approx) : '';

  // ── Display-level filtering (the internal score still uses ALL cells) ──
  // NEUTRAL components are NEVER shown. A cell survives only when it truly
  // ACTS on the criterion:
  //   • ⛔️ conflict — always shown;
  //   • ⚠️ caution  — only when its score is clearly below neutral (≤ 65);
  //     Supabase-cached "no data" rows default to 70 and are hidden;
  //   • ✅ benefit  — only when strongly beneficial (score ≥ 85).
  // Additionally, any cell whose reason TEXT says "neutral / generally safe /
  // well tolerated" (in any app language) is dropped — AI-cached rows for rare
  // ingredients often carry a 🟡 override with a neutral reason and would
  // otherwise leak through. Max 3 components per criterion, most acting first.
  const NEUTRAL = 70;
  // Neutral fillers AND generic praise ("excellent all-around moisturizer",
  // "good for most skin", …) — such cached AI reasons are not criterion-specific
  // and would otherwise show up under EVERY criterion.
  const NEUTRAL_TEXT = /нейтральн|нейтральн(ий|і)|neutral|generally\s+(safe|well[\s-]?tolerated)|well[\s-]?tolerated|无影响|neutre|neutrale|nötr|sin\s+efecto|ohne\s+einfluss|all[\s-]?around|good\s+for\s+most|suitable\s+for\s+all|mimics\s+skin/i;
  // Supabase-cached AI reasons are stored in ONE language and replicated to
  // all: in a Cyrillic UI (ru/uk) a Latin-only reason is a foreign cached row.
  // Such cells are hidden (kept only for hard ⛔️ conflicts, without the text).
  const cyrillicUI = lang === 'ru' || lang === 'uk';
  const foreignReason = (r?: string): boolean => !!r && cyrillicUI && !/[а-яёіїєґ]/i.test(r);
  const isActing = (c: (typeof table.columns)[number]['cells'][number]): boolean => {
    if (c.reason && NEUTRAL_TEXT.test(c.reason)) return false;
    if (foreignReason(c.reason) && c.emoji !== '⛔️') return false;
    if (c.emoji === '⛔️') return true;
    if (c.emoji === '⚠️') return c.score <= 65;
    return c.score >= 85; // ✅
  };
  const displayColumns = table.columns
    .map(col => ({
      ...col,
      cells: col.cells
        .filter(isActing)
        .sort((a, b) => Math.abs(b.score - NEUTRAL) - Math.abs(a.score - NEUTRAL))
        .slice(0, 3),
    }))
    // Only criteria that still have at least one acting component.
    .filter(col => col.cells.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Verdict card: emoji + status + its legend line (only the matching one) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 13px', background: 'rgba(255,255,255,0.55)', border: `1.5px solid ${color}33`, borderRadius: 13 }}>
        <span style={{ fontSize: '1.5rem', lineHeight: 1.2, flexShrink: 0 }} aria-hidden>{verdict.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3A3530', fontFamily: 'var(--font-sans)' }}>
            {verdict.title[lang] ?? verdict.title.en}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#5A5550', fontFamily: 'var(--font-serif)', lineHeight: 1.5, marginTop: 2 }}>
            {verdict.desc[lang] ?? verdict.desc.en}
          </div>
          {note && <div style={{ fontSize: '0.69rem', color: '#8A8078', fontStyle: 'italic', marginTop: 3 }}>{note}</div>}
        </div>
      </div>

      {/* Criteria with acting components only: criterion → top 1–3 ingredients + short WHY */}
      {displayColumns.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayColumns.map((col, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: '0.9rem', lineHeight: 1, flexShrink: 0 }}>{CIRCLE[col.emoji]}</span>
                <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600, color: '#3A3530', fontFamily: 'var(--font-sans)' }}>{col.label}</span>
              </div>
              <div style={{ paddingLeft: 24, marginTop: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {col.cells.map((cell, j) => (
                  <span key={j} style={{ fontSize: '0.74rem', color: '#5A5550', fontFamily: 'var(--font-serif)', lineHeight: 1.5 }}>
                    <span style={{ color: '#3A3530', fontWeight: 500 }}>{cell.ingredient}</span>
                    {cell.reason && !foreignReason(cell.reason) ? <> — {cell.reason}</> : null}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Labels ────────────────────────────────────────────────────────────────────
const L = {
  signIn:      { en:'Sign in to get a more accurate analysis based on your preferences.', ru:'Войдите, чтобы получить более точный анализ на основе ваших предпочтений.', de:'Melden Sie sich an für eine genauere Analyse.', uk:'Увійдіть для точнішого аналізу.', es:'Inicia sesión para un análisis más preciso.', fr:'Connectez-vous pour une analyse plus précise.', it:'Accedi per un\'analisi più precisa.', tr:'Daha doğru analiz için giriş yapın.' },
  signInBtn:   { en:'Sign in with Google', ru:'Войти через Google', de:'Mit Google anmelden', uk:'Увійти через Google', es:'Iniciar sesión con Google', fr:'Se connecter avec Google', it:'Accedi con Google', tr:'Google ile giriş yap' },
  fillProfile: { en:'Fill in your preferences to get a personalised analysis.', ru:'Заполните предпочтения, чтобы получить персональный анализ.', de:'Präferenzen ausfüllen für eine personalisierte Analyse.', uk:'Заповніть вподобання для персонального аналізу.', es:'Completa tus preferencias para un análisis personalizado.', fr:'Remplissez vos préférences pour une analyse personnalisée.', it:'Compila le preferenze per un\'analisi personalizzata.', tr:'Kişisel analiz için tercihlerinizi doldurun.' },
  fillBtn:     { en:'Fill in preferences', ru:'Заполнить предпочтения', de:'Präferenzen ausfüllen', uk:'Заповнити вподобання', es:'Completar preferencias', fr:'Remplir les préférences', it:'Compila le preferenze', tr:'Tercihleri doldur' },
  analysing:   { en:'Analysing…', ru:'Анализируем…', de:'Analysiere…', uk:'Аналізуємо…', es:'Analizando…', fr:'Analyse en cours…', it:'Analisi in corso…', tr:'Analiz ediliyor…' },
  retry:       { en:'Retry', ru:'Повторить', de:'Wiederholen', uk:'Повторити', es:'Reintentar', fr:'Réessayer', it:'Riprova', tr:'Tekrar dene' },
};
const t = (map: Record<string, string>, lang: Language) => map[lang] ?? map.en;

// ── PersonalAnalysis ──────────────────────────────────────────────────────────
export function PersonalAnalysis({ lang, result, user, userProfile, onOpenProfile }: Props) {
  const [criteria, setCriteria] = useState<Criterion[] | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const fetchKeyRef = useRef<string>('');
  // Bumped after Supabase-cached modifiers are loaded, to recompute the table.
  const [extrasVersion, setExtrasVersion] = useState(0);
  const extrasKeyRef = useRef<string>('');
  // Deterministic score cached in Supabase (product+profile+lang). When present
  // it overrides the freshly-computed score so reloads always show the same
  // number, even while the modifier cache is still warming up.
  const [cachedScore, setCachedScore] = useState<{ score: number; capped: boolean; uncertain: boolean } | null>(null);
  const scoreKeyRef = useRef<string>('');
  const extrasReadyRef = useRef<boolean>(false);
  // Signals for stable score rendering (see scoreKey + display gating below)
  const [ingHash, setIngHash] = useState<string>('');
  const [extrasReady, setExtrasReady] = useState<boolean>(false);

  const hasProfile = !!userProfile && (
    userProfile.skinType.length > 0 || userProfile.skinConditions.length > 0 ||
    userProfile.skinSensitivity.length > 0 || userProfile.hairType.length > 0 ||
    userProfile.scalpCondition.length > 0 || userProfile.hairProblems.length > 0 ||
    (userProfile.bodySkinType ?? []).length > 0 ||
    (userProfile.climate ?? []).length > 0 || !!userProfile.ageRange
  );

  const fetchKey = user && hasProfile && result?.ingredients?.length
    ? `${result.productName}|${result.brand}|${makeProfileKey(userProfile!)}|${lang}`
    : '';

  useEffect(() => {
    // AI criteria block was removed from the UI (deterministic preference
    // table is the single source of truth). Skip the Gemini call entirely —
    // no reason to spend the user's AI quota on an invisible block.
    return;
    // eslint-disable-next-line no-unreachable
    if (!fetchKey) return;
    if (fetchKey === fetchKeyRef.current) return;
    fetchKeyRef.current = fetchKey;

    // 1. Criteria already stored in the scan result (loaded from history) → use directly
    const stored = (result as any).criteria;
    if (Array.isArray(stored) && stored.length > 0) {
      criteriaCache.set(fetchKey, stored);
      setCriteria(stored);
      setLoading(false);
      return;
    }

    // 2. In-memory cache (prefetched this session)
    const cached = criteriaCache.get(fetchKey);
    if (cached) { setCriteria(cached); setLoading(false); return; }

    // 3. Frozen shared copy in Supabase → 4. fetch fresh + freeze
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCriteria(null);

    (async () => {
      // Frozen criteria are keyed on composition + profile + language — same
      // inputs → the exact same wording every time, no repeat Gemini call.
      const ingHashLocal = await computeIngredientsHash(result.ingredients ?? []).catch(() => null);
      const frozenKey = ingHashLocal
        ? `criteria|${ingHashLocal}|${makeProfileKey(userProfile!)}|${lang}`
        : '';

      if (frozenKey) {
        const frozen = await getFrozenPersonalText<{ criteria: Criterion[] }>(frozenKey).catch(() => null);
        if (!cancelled && frozen && Array.isArray(frozen.criteria) && frozen.criteria.length > 0) {
          criteriaCache.set(fetchKey, frozen.criteria);
          setCriteria(frozen.criteria);
          setLoading(false);
          return;
        }
      }

      try {
        const items = await fetchCriteria(result, userProfile!, lang);
        if (cancelled) return;
        criteriaCache.set(fetchKey, items);
        setCriteria(items);
        if (frozenKey && items.length > 0) {
          saveFrozenPersonalText(frozenKey, { criteria: items }).catch(() => {});
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fetchKey]);

  // ── Load Supabase-cached modifiers for unknown ingredients ────────────────
  // Ingredients missing from the static table may have AI-generated modifiers
  // saved in Supabase by previous scans. Pull them so the preference table
  // scores those ingredients with real data instead of skipping them.
  useEffect(() => {
    const names = (result?.ingredients ?? [])
      .map(i => String(i?.name ?? '').trim().toLowerCase())
      .filter(Boolean);
    const key = `${result?.productName}|${result?.brand}|${lang}`;
    if (names.length === 0 || key === extrasKeyRef.current) return;
    extrasKeyRef.current = key;

    let cancelled = false;
    const langCode = lang;
    clearExtraModifiers();
    extrasReadyRef.current = false;
    setExtrasReady(false);

    supabase
      .rpc('get_ingredient_modifiers', { p_names: [...new Set(names)], p_lang: langCode })
      .then(({ data, error }) => {
        if (cancelled) return;
        // Network/RPC error → do NOT mark the cache warm: freezing a score
        // computed WITHOUT modifiers would lock in a wrong number forever
        // (first writer wins). The live table still renders; freezing simply
        // waits for a session where the modifiers actually loaded.
        if (error) return;
        if (Array.isArray(data) && data.length > 0) {
          const rows: ModifierRow[] = data.map((r: any) => {
            const reasonText = String(r.reason ?? '');
            const reason: ModifierReason = {
              en: reasonText, ru: reasonText, de: reasonText, uk: reasonText,
              es: reasonText, fr: reasonText, it: reasonText, tr: reasonText,
            };
            return [
              String(r.inci_name ?? '').toLowerCase(),
              String(r.product_type ?? '*'),
              String(r.criteria_field ?? '*'),
              String(r.criteria_value ?? '*'),
              {
                s: Number(r.score_mod ?? 70),
                o: r.status_override ? String(r.status_override) : undefined,
                r: reason,
              },
            ] as ModifierRow;
          });
          registerExtraModifiers(rows);
        }
        // Modifier cache is now "warm" for this product (whether or not rows
        // were found) → safe to persist the deterministic score.
        extrasReadyRef.current = true;
        setExtrasReady(true);
        setExtrasVersion(v => v + 1); // trigger table recompute + score persist
      });

    return () => { cancelled = true; };
  }, [result?.productName, result?.brand, lang]);

  // ── Read cached deterministic score (product + profile + lang) ────────────
  // If a score was computed and stored before, reuse it verbatim so the number
  // is identical on every reload.
  // ── Stable score key: composition hash + profile ───────────────────────────
  // The OLD key was `productName|brand|profile|lang`, which had two flaws:
  //  • productName/brand are TRANSLATED when the user switches language, and
  //    can drift between scans → the same product froze many separate rows,
  //    each computed at a different time with a different modifier-DB state →
  //    the user saw different numbers per language / per scan.
  //  • lang has no business in a NUMBER's key — the score is language-agnostic.
  // The composition hash is built from canonical INCI names (sorted,
  // normalized), identical across languages and naming drift. `v2|` prefix
  // separates new rows from legacy ones.
  useEffect(() => {
    let cancelled = false;
    const ings = result?.ingredients ?? [];
    if (ings.length === 0) { setIngHash(''); return; }
    computeIngredientsHash(ings)
      .then(h => { if (!cancelled) setIngHash(h ?? ''); })
      .catch(() => { if (!cancelled) setIngHash(''); });
    return () => { cancelled = true; };
  }, [result?.ingredients]);

  const scoreKey = (user && hasProfile && ingHash)
    ? `v2|${ingHash}|${makeProfileKey(userProfile!)}`
    : '';

  useEffect(() => {
    if (!scoreKey || scoreKey === scoreKeyRef.current) return;
    scoreKeyRef.current = scoreKey;
    setCachedScore(null);

    let cancelled = false;
    supabase
      .rpc('get_preference_score', { p_key: scoreKey })
      .then(({ data, error }) => {
        if (cancelled || error || !Array.isArray(data) || data.length === 0) return;
        const row = data[0];
        if (typeof row?.score === 'number') {
          setCachedScore({
            score: row.score,
            capped: !!row.capped,
            uncertain: !!row.uncertain,
          });
        }
      });

    return () => { cancelled = true; };
  }, [scoreKey]);

  // ── Persist the deterministic score once the modifier cache is warm ───────
  // Runs after Supabase modifiers have loaded (extrasReadyRef). Only writes
  // when there was no cached score yet — the first warm computation wins and
  // every later reload reads it back, so the number never drifts.
  useEffect(() => {
    if (!scoreKey) return;
    if (!extrasReadyRef.current) return;   // wait until modifier cache is warm
    if (cachedScore) return;               // already have a stored score
    if (!user || !hasProfile) return;
    const tbl = computePreferenceTable(result.ingredients ?? [], userProfile!, result.productType ?? '', lang);
    if (tbl.score === null) return;        // nothing to store

    let cancelled = false;
    supabase
      .rpc('upsert_preference_score', {
        p_key:       scoreKey,
        p_score:     tbl.score,
        p_capped:    tbl.capped,
        p_uncertain: tbl.uncertain,
        p_payload:   null,
      })
      .then(() => {
        if (cancelled) return;
        // Adopt the stored value locally so this session is stable too.
        setCachedScore({ score: tbl.score as number, capped: tbl.capped, uncertain: tbl.uncertain });
      });

    return () => { cancelled = true; };
    // extrasVersion is included so this re-runs after modifiers finish loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreKey, extrasVersion, cachedScore]);

  const handleSignIn = async () => {
    setSigningIn(true);
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    setSigningIn(false);
  };

  const handleRetry = () => {
    fetchKeyRef.current = '';
    setError(null);
    setCriteria(null);
  };

  if (!user) return (
    <div className="flex flex-col gap-3 py-2">
      <p className="text-base text-[#5A5550] leading-relaxed">{t(L.signIn, lang)}</p>
      <button onClick={handleSignIn} disabled={signingIn}
        className="inline-flex items-center gap-2 self-start px-4 py-2 bg-[#1A1410] text-white text-[11px] font-semibold rounded-sm hover:bg-[#1A1410]/90 transition-all disabled:opacity-50">
        <LogIn size={13} />{signingIn ? '...' : t(L.signInBtn, lang)}
      </button>
    </div>
  );

  if (!hasProfile) return (
    <div className="flex flex-col gap-3 py-2">
      <p className="text-base text-[#5A5550] leading-relaxed">{t(L.fillProfile, lang)}</p>
      <button onClick={onOpenProfile}
        className="inline-flex items-center gap-2 self-start px-4 py-2 bg-[#2D5A3D] text-white text-[11px] font-semibold rounded-sm hover:bg-[#3D7A55] transition-all">
        <Settings size={13} />{t(L.fillBtn, lang)}
      </button>
    </div>
  );

  // Deterministic preference-match table + score (instant, from the modifier
  // table + Supabase cache). extrasVersion forces a recompute once cached
  // modifiers for unknown ingredients have loaded.
  void extrasVersion;
  const computedTable = computePreferenceTable(result.ingredients ?? [], userProfile!, result.productType ?? '', lang);

  // If a deterministic score was cached in Supabase, show it verbatim so the
  // number is identical across reloads. Otherwise use the freshly computed one —
  // but ONLY once the modifier cache is warm: rendering the cold (pre-modifier)
  // number first and letting it visibly change moments later is exactly the
  // "score keeps changing" experience we are eliminating.
  const scoreDisplayReady = !!cachedScore || extrasReady;
  const prefTable: PreferenceTable = cachedScore
    ? { ...computedTable, score: cachedScore.score, capped: cachedScore.capped, uncertain: cachedScore.uncertain }
    : computedTable;
  const tableEl = scoreDisplayReady && prefTable.score !== null
    ? <PreferenceScoreTable table={prefTable} lang={lang} />
    : null;

  // AI criteria block ("enlarged pores", "dullness", …) intentionally removed:
  // it duplicated the deterministic table, cost an extra Gemini call and often
  // arrived in a mixed language. The preference table above is authoritative.
  if (!tableEl) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {tableEl}
    </div>
  );
}
