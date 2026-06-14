import React, { useState, useEffect } from 'react';
import { LogIn, Settings } from 'lucide-react';
import { t, Language } from '../i18n';
import { AnalysisResult, SerializedProfile, fetchIngredientPreferenceNote } from '../services/ai';
import { UserProfile, translateProfile } from './UserProfile';
import { computeAutonomousScore, IngredientMatch } from '../lib/personalScore';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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

// ── Preference row — clickable, lazy-loads ingredient explanation ─────────

const prefExplanationCache = new Map<string, string>();

function PreferenceRow({ m, lang }: { m: IngredientMatch; lang: Language }) {
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const cacheKey = `${m.name.toLowerCase()}|${lang}`;

  useEffect(() => {
    const hit = prefExplanationCache.get(cacheKey);
    if (hit) setExplanation(hit);
  }, [cacheKey]);

  useEffect(() => {
    if (!open) return;
    if (explanation) return;
    const cached = prefExplanationCache.get(cacheKey);
    if (cached) { setExplanation(cached); return; }
    let cancelled = false;
    setLoading(true);
    fetchIngredientPreferenceNote(m.name, m.label, lang)
      .then(desc => {
        if (cancelled) return;
        prefExplanationCache.set(cacheKey, desc);
        setExplanation(desc);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, explanation, cacheKey, m.name, m.label, lang]);

  const loadingLabel: Record<string, string> = {
    en: 'Loading…', ru: 'Загружаем…', de: 'Laden…', uk: 'Завантажуємо…',
    es: 'Cargando…', fr: 'Chargement…', it: 'Caricamento…', tr: 'Yükleniyor…',
  };

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{ cursor: 'pointer', paddingBottom: open ? 6 : 0 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: '0.82rem', lineHeight: 1, flexShrink: 0 }}>{m.emoji}</span>
        <span style={{ flex: 1, fontSize: '0.78rem', color: '#3A3530', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
          {m.label}
        </span>
      </div>
      {open && (
        <div style={{ paddingLeft: 22, marginTop: 4 }}>
          {loading && !explanation ? (
            <span style={{ fontSize: '0.72rem', color: '#8A8078', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
              {loadingLabel[lang] ?? loadingLabel.en}
            </span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#5A5550', fontFamily: 'var(--font-serif)', lineHeight: 1.55 }}>
              {explanation}
            </span>
          )}
        </div>
      )}
    </div>
  );
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

// ── PersonalAnalysis ───────────────────────────────────────────────────────

export function PersonalAnalysis({ lang, result, user, userProfile, onOpenProfile }: Props) {
  const [signingIn, setSigningIn] = useState(false);

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

  const autonomousScore = React.useMemo(() => {
    if (!userProfile || !result?.ingredients?.length) return null;
    return computeAutonomousScore(result.ingredients, userProfile, lang);
  }, [result?.ingredients, userProfile, lang]);

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

  // ── No ingredients scanned ─────────────────────────────────────────────────
  if (!result?.ingredients?.length) return null;

  // ── Main: criteria list ────────────────────────────────────────────────────
  if (!autonomousScore || autonomousScore.matches.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {autonomousScore.matches.map((m, i) => (
        <PreferenceRow key={i} m={m} lang={lang} />
      ))}
    </div>
  );
}
