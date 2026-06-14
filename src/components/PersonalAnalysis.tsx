import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Settings, Loader2, ChevronDown } from 'lucide-react';
import { Language } from '../i18n';
import { AnalysisResult, SerializedProfile } from '../services/ai';
import { UserProfile, translateProfile } from './UserProfile';
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

interface Criterion {
  emoji: '✅' | '⚠️' | '⛔️';
  label: string;
  explanation: string;
}

const FUNCTION_URL = '/api/gemini';

// Module-level cache: fetchKey → criteria array
// Survives re-renders and re-opens within a session
export const criteriaCache = new Map<string, Criterion[]>();

// ── Prefetch — call this right after main analysis completes ──────────────
export async function prefetchPersonalNote(
  result: AnalysisResult,
  userProfile: UserProfile,
  lang: Language,
): Promise<void> {
  const productKey = `${result.productName}|${result.brand}`;
  const profileKey = JSON.stringify(serializeProfile(userProfile, 'en'));
  const fetchKey   = `${productKey}|${profileKey}|${lang}`;
  if (criteriaCache.has(fetchKey)) return; // already cached

  try {
    const r = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'personalNote',
        result,
        userProfile: serializeProfile(userProfile, lang),
        language: lang,
      }),
    });
    const data = await r.json();
    const items: Criterion[] = (data.criteria ?? []).map((c: any) => ({
      emoji: c.emoji,
      label: c.label,
      explanation: c.explanation,
    }));
    criteriaCache.set(fetchKey, items);
  } catch {
    // silent — component will retry on open
  }
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

// ── Single criterion row ──────────────────────────────────────────────────

function CriterionRow({ c, lang }: { c: Criterion; lang: Language }) {
  const [open, setOpen] = useState(false);

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
        <span style={{ fontSize: '0.82rem', lineHeight: 1, flexShrink: 0 }}>{c.emoji}</span>
        <span style={{ flex: 1, fontSize: '0.78rem', color: '#3A3530', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
          {c.label}
        </span>
        <ChevronDown size={12} style={{ color: '#8A8078', flexShrink: 0, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </div>
      {open && (
        <div style={{ paddingLeft: 22, marginTop: 4 }}>
          <span style={{ fontSize: '0.78rem', color: '#5A5550', fontFamily: 'var(--font-serif)', lineHeight: 1.55 }}>
            {c.explanation}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Labels ────────────────────────────────────────────────────────────────

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
  en: 'Sign in with Google', ru: 'Войти через Google', de: 'Mit Google anmelden',
  uk: 'Увійти через Google', es: 'Iniciar sesión con Google', fr: 'Se connecter avec Google',
  it: 'Accedi con Google', tr: 'Google ile giriş yap',
};

const FILL_PROFILE_LABELS: Record<Language, string> = {
  en: 'Fill in your preferences to get a personalised analysis.',
  ru: 'Заполните предпочтения, чтобы получить персональный анализ.',
  de: 'Füllen Sie Ihre Präferenzen aus, um eine personalisierte Analyse zu erhalten.',
  uk: 'Заповніть вподобання, щоб отримати персональний аналіз.',
  es: 'Completa tus preferencias para obtener un análisis personalizado.',
  fr: 'Remplissez vos préférences pour obtenir une analyse personnalisée.',
  it: 'Compila le tue preferenze per ricevere un\'analisi personalizzata.',
  tr: 'Kişiselleştirilmiş analiz almak için tercihlerinizi doldurun.',
};

const FILL_PROFILE_BTN: Record<Language, string> = {
  en: 'Fill in preferences', ru: 'Заполнить предпочтения', de: 'Präferenzen ausfüllen',
  uk: 'Заповнити вподобання', es: 'Completar preferencias', fr: 'Remplir les préférences',
  it: 'Compila le preferenze', tr: 'Tercihleri doldur',
};

// ── PersonalAnalysis ──────────────────────────────────────────────────────

export function PersonalAnalysis({ lang, result, user, userProfile, onOpenProfile }: Props) {
  const [criteria, setCriteria] = useState<Criterion[] | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Key to detect product or profile change
  const productKey = `${result.productName}|${result.brand}`;
  const profileKey = userProfile ? JSON.stringify(serializeProfile(userProfile, 'en')) : '';
  const fetchKey   = `${productKey}|${profileKey}|${lang}`;
  const lastFetchKey = useRef<string>('');

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
    if (!user || !hasProfile || !result?.ingredients?.length) return;
    if (fetchKey === lastFetchKey.current) return;
    lastFetchKey.current = fetchKey;

    // Check module-level cache first
    const cached = criteriaCache.get(fetchKey);
    if (cached) { setCriteria(cached); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCriteria(null);

    fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'personalNote',
        result,
        userProfile: serializeProfile(userProfile!, lang),
        language: lang,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const items: Criterion[] = (data.criteria ?? []).map((c: any) => ({
          emoji: c.emoji,
          label: c.label,
          explanation: c.explanation,
        }));
        criteriaCache.set(fetchKey, items);
        setCriteria(items);
      })
      .catch(e => { if (!cancelled) setError(e.message ?? 'Error'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [fetchKey]);

  async function handleSignIn() {
    setSigningIn(true);
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    setSigningIn(false);
  }

  // ── Not logged in ─────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex flex-col gap-3 py-2">
        <p className="text-base text-[#5A5550] leading-relaxed">{SIGN_IN_LABELS[lang]}</p>
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

  // ── No profile ────────────────────────────────────────────────────────
  if (!hasProfile) {
    return (
      <div className="flex flex-col gap-3 py-2">
        <p className="text-base text-[#5A5550] leading-relaxed">{FILL_PROFILE_LABELS[lang]}</p>
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

  // ── No ingredients ────────────────────────────────────────────────────
  if (!result?.ingredients?.length) return null;

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 size={13} className="text-[#B8923A] animate-spin" />
        <span style={{ fontSize: '0.78rem', color: '#B8923A', fontFamily: 'var(--font-sans)' }}>
          {{ en:'Analysing…', ru:'Анализируем…', de:'Analysiere…', uk:'Аналізуємо…', es:'Analizando…', fr:'Analyse en cours…', it:'Analisi in corso…', tr:'Analiz ediliyor…' }[lang] ?? 'Analysing…'}
        </span>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center gap-2 py-2">
        <p className="text-xs text-red-400 italic flex-1">{error}</p>
        <button onClick={() => { lastFetchKey.current = ''; setError(null); }} className="text-xs text-[#B8923A] underline">
          {{ en:'Retry', ru:'Повторить', de:'Wiederholen', uk:'Повторити', es:'Reintentar', fr:'Réessayer', it:'Riprova', tr:'Tekrar dene' }[lang] ?? 'Retry'}
        </button>
      </div>
    );
  }

  // ── Criteria list ─────────────────────────────────────────────────────
  const SKIP_LABELS = /ничего|nothing|none|unknown|keine|нічого|ninguno|aucun|nessuno|bilinmiyor/i;
  const filtered = criteria.filter(c => !SKIP_LABELS.test(c.label));
  if (!filtered || filtered.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {filtered.map((c, i) => (
        <CriterionRow key={i} c={c} lang={lang} />
      ))}
    </div>
  );
}
