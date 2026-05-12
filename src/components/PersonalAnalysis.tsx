import React, { useState, useEffect, useRef } from 'react';
import { Crown, RefreshCw, LogIn, Settings, Loader2, ChevronDown } from 'lucide-react';
import { t, Language } from '../i18n';
import { AnalysisResult, SerializedProfile, fetchPreferenceExplanation } from '../services/ai';
import { UserProfile, translateProfile } from './UserProfile';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { computePersonalScore, scoreForSinglePreference } from '../lib/personalScore';

const FUNCTION_URL = '/api/gemini';

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

function serializeProfile(profile: UserProfile, lang: Language): SerializedProfile {
  const p = translateProfile(profile, lang);
  return {
    skinType:        p.skinType.join(', ')        || undefined,
    skinSensitivity: p.skinSensitivity.join(', ') || undefined,
    skinConditions:  p.skinConditions.join(', ')  || undefined,
    ageRange:        p.ageRange                    || undefined,
    hairType:        p.hairType.join(', ')         || undefined,
    scalpCondition:  p.scalpCondition.join(', ')  || undefined,
    hairProblems:    p.hairProblems.join(', ')     || undefined,
    bodySkinType:    p.bodySkinType.join(', ')     || undefined,
    climate:         p.climate.join(', ')          || undefined,
    allergies:       (profile as any).allergies    || undefined,
  };
}

function profileKey(profile: UserProfile | null): string {
  if (!profile) return '';
  return JSON.stringify(serializeProfile(profile, 'en'));
}

async function fetchPersonalNote(
  result: AnalysisResult,
  profile: UserProfile,
  lang: Language,
): Promise<string> {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'personalNote',
      result,
      userProfile: serializeProfile(profile, lang),
      language: lang,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.personalNote as string;
}

const SIGN_IN_LABELS: Record<Language, string> = {
  en: 'Sign in to get a more accurate analysis based on your preferences.',
  ru: 'Войдите, чтобы получить более точный анализ на основе ваших предпочтений.',
  de: 'Melden Sie sich an, um eine genauere Analyse basierend auf Ihren Präferenzen zu erhalten.',
  uk: 'Увійдіть, щоб отримати більш точний аналіз на основі ваших вподобань.',
  es: 'Inicia sesión para obtener un análisis más preciso basado en tus preferencias.',
  fr: 'Connectez-vous pour obtenir une analyse plus précise basée sur vos préférences.',
  it: 'Accedi per ottenere un\'analisi più precisa basata sulle tue preferenze.',
  tr: 'Tercihlerinize göre daha doğru bir analiz almak için giriş yapın.',
};

const SIGN_IN_BTN: Record<Language, string> = {
  en: 'Sign in with Google',
  ru: 'Войти через Google',
  de: 'Mit Google anmelden',
  uk: 'Увійти через Google',
  es: 'Iniciar sesión con Google',
  fr: 'Se connecter avec Google',
  it: 'Accedi con Google',
  tr: 'Google ile giriş yap',
};

const FILL_PROFILE_LABELS: Record<Language, string> = {
  en: 'Fill in your preferences to get a personalised note.',
  ru: 'Заполните предпочтения, чтобы получить персональный анализ.',
  de: 'Füllen Sie Ihre Präferenzen aus, um einen personalisierten Hinweis zu erhalten.',
  uk: 'Заповніть вподобання, щоб отримати персональний аналіз.',
  es: 'Completa tus preferencias para obtener una nota personalizada.',
  fr: 'Remplissez vos préférences pour obtenir une note personnalisée.',
  it: 'Compila le tue preferenze per ricevere una nota personalizzata.',
  tr: 'Kişiselleştirilmiş not almak için tercihlerinizi doldurun.',
};

const FILL_PROFILE_BTN: Record<Language, string> = {
  en: 'Fill in preferences',
  ru: 'Заполнить предпочтения',
  de: 'Präferenzen ausfüllen',
  uk: 'Заповнити вподобання',
  es: 'Completar preferencias',
  fr: 'Remplir les préférences',
  it: 'Compila le preferenze',
  tr: 'Tercihleri doldur',
};

// ── Preference chip ────────────────────────────────────────────────────────
// Module-level cache: key = `${preferenceKey}|${productKey}|${lang}` → text
const preferenceExplanationCache = new Map<string, string>();

interface PreferenceChipProps {
  preferenceKey: string;     // e.g. 'skinCombination', 'sensFragrances'
  preferenceLabel: string;   // localized label e.g. "Комбинированная кожа"
  ingredients: AnalysisResult['ingredients'];
  lang: Language;
  productKey: string;        // unique cache key per product (brand+productName)
}

function PreferenceChip({ preferenceKey, preferenceLabel, ingredients, lang, productKey }: PreferenceChipProps) {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Local score for THIS preference — used to colour the chip
  const score = scoreForSinglePreference(ingredients, preferenceKey);
  const color = score === null
    ? '#8A8078'
    : score >= 7.5 ? '#2D9B5A'
    : score >= 5   ? '#E8A020'
    :                '#D94040';

  const cacheKey = `${preferenceKey}|${productKey}|${lang}`;

  // When opened: lazy-fetch explanation
  useEffect(() => {
    if (!open) return;
    if (explanation) return;
    if (!ingredients || ingredients.length === 0) return; // nothing to explain
    const cached = preferenceExplanationCache.get(cacheKey);
    if (cached) { setExplanation(cached); return; }

    let cancelled = false;
    setLoading(true);
    fetchPreferenceExplanation(ingredients, preferenceLabel, lang)
      .then((text) => {
        if (cancelled) return;
        preferenceExplanationCache.set(cacheKey, text);
        setExplanation(text);
      })
      .catch(() => { /* keep null */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, explanation, cacheKey, preferenceLabel, ingredients, lang]);

  // Reset on language switch — pick up cache for new lang or refetch
  useEffect(() => {
    const cached = preferenceExplanationCache.get(cacheKey);
    setExplanation(cached ?? null);
  }, [cacheKey]);

  const loadingText =
    lang === 'ru' ? 'Загружаем…' :
    lang === 'uk' ? 'Завантажуємо…' :
    lang === 'de' ? 'Wird geladen…' :
    lang === 'es' ? 'Cargando…' :
    lang === 'fr' ? 'Chargement…' :
    lang === 'it' ? 'Caricamento…' :
    lang === 'tr' ? 'Yükleniyor…' :
                    'Loading…';

  // Emoji based on score (shown before the label, always visible)
  const emoji = score === null ? '⚠️' : score >= 7.5 ? '✅' : score >= 5 ? '⚠️' : '⛔️';

  return (
    <div
      style={{
        background: `${color}10`,
        border: `1px solid ${color}40`,
        borderRadius: 10,
        padding: '8px 12px',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onClick={() => setOpen((o) => !o)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1 }}>{emoji}</span>
        <span style={{ flex: 1, fontSize: '0.85rem', color: '#1A1410', fontFamily: 'var(--font-sans)' }}>
          {preferenceLabel}
        </span>
        <ChevronDown
          size={13}
          style={{
            color, flexShrink: 0,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
      </div>
      {open && (
        <div style={{ paddingLeft: 16, marginTop: 6, fontSize: '0.95rem', color: '#5A5550', lineHeight: 1.5, fontFamily: 'var(--font-serif)' }}>
          {loading && !explanation ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontStyle: 'italic', color: '#8A8078' }}>
              <Loader2 size={11} className="animate-spin" />
              {loadingText}
            </span>
          ) : (
            explanation || '—'
          )}
        </div>
      )}
    </div>
  );
}

// ── Detect product category from productType string ───────────────────────
type ProductCategory = 'HAIR' | 'FACE' | 'BODY' | 'LIPS' | 'NAILS' | 'OTHER';

function detectCategory(productType: string): ProductCategory {
  const t = productType.toLowerCase();
  if (/shampoo|conditioner|hair (oil|mask|serum|cream|spray|rinse|balm)|scalp|dry shampoo|leave.in|haarspülung|haarmaske|shampooing|acondicionador|balsamo capelli/.test(t)) return 'HAIR';
  if (/lip (balm|gloss|stick|oil|butter|mask)|lippenstift|baume lèvres|labial|balsamo labbra|dudak/.test(t)) return 'LIPS';
  if (/nail|vernis|nagel|esmalte|smalto|tırnak/.test(t)) return 'NAILS';
  if (/body (lotion|butter|oil|cream|scrub|wash|milk)|lotion corps|körper|crema corpo|leche corporal|vücut/.test(t)) return 'BODY';
  if (/cream|serum|toner|moisturis|sunscreen|spf|primer|foundation|face|gesicht|visage|viso|rostro|yüz|cleanser|micellar|eye cream|retinol|vitamin c/.test(t)) return 'FACE';
  return 'OTHER';
}

// ── Fields shown per category ─────────────────────────────────────────────
const CATEGORY_FIELDS: Record<ProductCategory, (keyof UserProfile)[]> = {
  HAIR:  ['hairType', 'scalpCondition', 'hairProblems', 'climate'],
  FACE:  ['skinType', 'skinSensitivity', 'skinConditions', 'ageRange', 'climate'],
  BODY:  ['bodySkinType', 'climate'],
  LIPS:  ['skinSensitivity', 'climate'],
  NAILS: [],
  OTHER: ['skinSensitivity', 'climate'],
};

// ── Helper: list of (key, label) pairs filtered by product category ────────
function listCategoryPreferences(
  profile: UserProfile,
  lang: Language,
  productType: string,
): Array<{ key: string; label: string }> {
  const tr = (key: string): string =>
    (t[lang] as unknown as Record<string, string>)[key] ?? key;

  const isNoneish = (k: string) =>
    /(?:None|Unknown)$/i.test(k) || k === 'climateAny';

  const category = detectCategory(productType);
  const fields = CATEGORY_FIELDS[category];
  const out: Array<{ key: string; label: string }> = [];

  for (const field of fields) {
    const val = profile[field];
    if (Array.isArray(val)) {
      val.forEach(k => { if (k && !isNoneish(k)) out.push({ key: k, label: tr(k) }); });
    } else if (typeof val === 'string' && val && !isNoneish(val)) {
      out.push({ key: val, label: tr(val) });
    }
  }
  return out;
}


export function PersonalAnalysis({ lang, result, user, userProfile, canUseNote, onLimitReached, onUsed, onOpenProfile }: Props) {
  const T = t[lang];

  const [note, setNote]       = useState<string | null>(result.personalNote ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const noteProfileKey = useRef<string>(profileKey(userProfile));
  const currentKey = profileKey(userProfile);
  const profileChanged = !!userProfile && currentKey !== noteProfileKey.current;

  const hasProfile = !!userProfile && (
    userProfile.skinType.length > 0 ||
    userProfile.skinConditions.length > 0 ||
    userProfile.skinSensitivity.length > 0 ||
    userProfile.hairType.length > 0 ||
    userProfile.scalpCondition.length > 0 ||
    userProfile.hairProblems.length > 0 ||
    (userProfile.bodySkinType ?? []).length > 0 ||
    (userProfile.climate ?? []).length > 0 ||
    !!userProfile.ageRange
  );

  useEffect(() => {
    if (!hasProfile || !profileChanged || !canUseNote) return;
    regenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  async function regenerate() {
    if (!userProfile) return;
    if (!canUseNote) { onLimitReached(); return; }
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchPersonalNote(result, userProfile, lang);
      setNote(fresh);
      noteProfileKey.current = profileKey(userProfile);
      await onUsed();
    } catch (e: any) {
      setError(e.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    setSigningIn(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    setSigningIn(false);
  }

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex flex-col gap-3 py-2">
        <p className="text-base text-[#5A5550] leading-relaxed">
          {SIGN_IN_LABELS[lang]}
        </p>
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="inline-flex items-center gap-2 self-start px-4 py-2 bg-[#1A1410] text-white text-[11px] font-semibold rounded-sm hover:bg-[#1A1410]/90 transition-all disabled:opacity-50"
        >
          <LogIn size={13} />
          {signingIn ? '...' : SIGN_IN_BTN[lang]}
        </button>
      </div>
    );
  }

  // ── Logged in but no profile ───────────────────────────────────────────────
  if (!hasProfile) {
    return (
      <div className="flex flex-col gap-3 py-2">
        <p className="text-base text-[#5A5550] leading-relaxed">
          {FILL_PROFILE_LABELS[lang]}
        </p>
        <button
          onClick={onOpenProfile}
          className="inline-flex items-center gap-2 self-start px-4 py-2 bg-[#2D5A3D] text-white text-[11px] font-semibold rounded-sm hover:bg-[#3D7A55] transition-all"
        >
          <Settings size={13} />
          {FILL_PROFILE_BTN[lang]}
        </button>
      </div>
    );
  }

  // ── Premium limit reached ──────────────────────────────────────────────────
  if (!canUseNote && !note) {
    return (
      <div
        className="flex items-center gap-2 p-3 bg-[#2D5A3D]/5 border border-dashed border-[#B8923A]/30 rounded-sm cursor-pointer hover:bg-[#2D5A3D]/10 transition-colors"
        onClick={onLimitReached}
      >
        <Crown size={14} className="text-[#B8923A] shrink-0" />
        <p className="text-xs text-[#B8923A]">
          Daily limit reached. <span className="underline">Upgrade to Premium</span> for unlimited analyses.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <RefreshCw size={13} className="text-[#B8923A] animate-spin" />
        <p className="text-xs text-[#B8923A] italic">Updating analysis for new preferences…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-2">
        <p className="text-xs text-red-400 italic flex-1">{error}</p>
        <button onClick={regenerate} className="text-xs text-[#B8923A] underline">Retry</button>
      </div>
    );
  }

  if (!note) {
    return <p className="text-xs text-[#B8923A]/70 py-2 italic">{T.noteRescan}</p>;
  }

  return (
    <div>
      {/* ── Personal score card ────────────────────────────────────────── */}
      {(() => {
        const personalScore = computePersonalScore(result.ingredients, userProfile!);
        if (personalScore === null) return null;
        // Round DOWN (floor): 3.8→3, 7.9→7 — conservative for personal assessment
        const personalScoreRounded = Math.floor(personalScore);

        const scoreColor = personalScore >= 7.5 ? '#2D9B5A'
          : personalScore >= 5 ? '#E8A020'
          : '#D94040';

        const scoreLabel =
          lang === 'ru' ? (personalScore >= 7.5 ? 'Подходит вам' : personalScore >= 5 ? 'Подходит частично' : 'Не рекомендуется') :
          lang === 'uk' ? (personalScore >= 7.5 ? 'Підходить вам' : personalScore >= 5 ? 'Підходить частково' : 'Не рекомендується') :
          lang === 'de' ? (personalScore >= 7.5 ? 'Für Sie geeignet' : personalScore >= 5 ? 'Teilweise geeignet' : 'Nicht empfohlen') :
          lang === 'es' ? (personalScore >= 7.5 ? 'Adecuado para ti' : personalScore >= 5 ? 'Parcialmente adecuado' : 'No recomendado') :
          lang === 'fr' ? (personalScore >= 7.5 ? 'Vous convient' : personalScore >= 5 ? 'Partiellement adapté' : 'Non recommandé') :
          lang === 'it' ? (personalScore >= 7.5 ? 'Adatto a te' : personalScore >= 5 ? 'Parzialmente adatto' : 'Non raccomandato') :
          lang === 'tr' ? (personalScore >= 7.5 ? 'Size uygun' : personalScore >= 5 ? 'Kısmen uygun' : 'Önerilmez') :
          (personalScore >= 7.5 ? 'Suits you' : personalScore >= 5 ? 'Partially suitable' : 'Not recommended');

        const sublabel =
          lang === 'ru' ? 'Персональная оценка состава' :
          lang === 'uk' ? 'Персональна оцінка складу' :
          lang === 'de' ? 'Persönliche Formulabewertung' :
          lang === 'es' ? 'Puntuación personal de fórmula' :
          lang === 'fr' ? 'Score personnel de la formule' :
          lang === 'it' ? 'Punteggio personale formula' :
          lang === 'tr' ? 'Kişisel formül puanı' :
          'Personal formula score';

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', marginBottom: 14, background: 'rgba(255,255,255,0.6)', borderRadius: 14, border: `1.5px solid ${scoreColor}33` }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: scoreColor, lineHeight: 1, fontFamily: 'var(--font-sans)', letterSpacing: '-0.03em' }}>
                {personalScoreRounded}
              </span>
              <span style={{ fontSize: '0.7rem', color: scoreColor, opacity: 0.7, fontFamily: 'var(--font-sans)', marginTop: 1 }}>/10</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 7, background: 'rgba(0,0,0,0.07)', borderRadius: 8, overflow: 'hidden', marginBottom: 5 }}>
                <div style={{ height: '100%', width: `${personalScore * 10}%`, background: scoreColor, borderRadius: 8, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: '0.82rem', color: scoreColor, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>{scoreLabel}</div>
              <div style={{ fontSize: '0.72rem', color: '#8A8078', fontFamily: 'var(--font-sans)', marginTop: 1 }}>{sublabel}</div>
            </div>
          </div>
        );
      })()}

      {/* ── Category preference chips — filtered by product type ─────────── */}
      {(() => {
        if (!userProfile) return null;
        const prefs = listCategoryPreferences(userProfile, lang, result.productType ?? '');
        if (prefs.length === 0) return null;
        const productKey = `${result.brand}|${result.productName}`.toLowerCase();
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {prefs.map((p) => (
              <PreferenceChip
                key={p.key}
                preferenceKey={p.key}
                preferenceLabel={p.label}
                ingredients={result.ingredients}
                lang={lang}
                productKey={productKey}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
