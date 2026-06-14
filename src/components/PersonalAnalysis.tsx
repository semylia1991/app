import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Settings, Loader2, ChevronDown } from 'lucide-react';
import { Language } from '../i18n';
import { AnalysisResult, SerializedProfile } from '../services/ai';
import { UserProfile } from './UserProfile';
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

export interface Criterion {
  emoji: string;
  label: string;
  explanation: string;
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
  })).filter((c: Criterion) => c.label);
}

export async function prefetchPersonalNote(
  result: AnalysisResult,
  profile: UserProfile,
  lang: Language,
): Promise<void> {
  const key = `${result.productName}|${result.brand}|${makeProfileKey(profile)}|${lang}`;
  if (criteriaCache.has(key)) return;
  try {
    const items = await fetchCriteria(result, profile, lang);
    criteriaCache.set(key, items);
  } catch {
    // silent — component will retry
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
    if (!fetchKey) return;
    if (fetchKey === fetchKeyRef.current) return;
    fetchKeyRef.current = fetchKey;

    const cached = criteriaCache.get(fetchKey);
    if (cached) { setCriteria(cached); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCriteria(null);

    fetchCriteria(result, userProfile!, lang)
      .then(items => {
        if (cancelled) return;
        criteriaCache.set(fetchKey, items);
        setCriteria(items);
      })
      .catch(e => { if (!cancelled) setError(e.message ?? 'Error'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [fetchKey]);

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

  if (loading) return (
    <div className="flex items-center gap-2 py-3">
      <Loader2 size={13} className="text-[#B8923A] animate-spin" />
      <span style={{ fontSize: '0.78rem', color: '#B8923A', fontFamily: 'var(--font-sans)' }}>{t(L.analysing, lang)}</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 py-2">
      <p className="text-xs text-red-400 italic flex-1">{error}</p>
      <button onClick={handleRetry} className="text-xs text-[#B8923A] underline">{t(L.retry, lang)}</button>
    </div>
  );

  if (!criteria) return (
    <div className="flex items-center gap-2 py-3">
      <Loader2 size={13} className="text-[#B8923A] animate-spin" />
      <span style={{ fontSize: '0.78rem', color: '#B8923A', fontFamily: 'var(--font-sans)' }}>{t(L.analysing, lang)}</span>
    </div>
  );

  const visible = criteria.filter(c => !SKIP_LABELS.test(c.label));
  if (!visible.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {visible.map((c, i) => <CriterionRow key={i} c={c} lang={lang} />)}
    </div>
  );
}
