import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Crown, RefreshCw, LogIn, Settings, Zap, AlertTriangle } from 'lucide-react';
import { t, Language } from '../i18n';
import { AnalysisResult, SerializedProfile } from '../services/ai';
import { UserProfile, translateProfile } from './UserProfile';
import { computeQuantumScore, QuantumScore } from '../lib/personalScore';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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

// ── Quantum Score Widget ───────────────────────────────────────────────────

const QUANTUM_LABELS: Record<Language, {
  title: string; certain: string; uncertain: string;
  synBoost: string; synConflict: string; unknownHint: string;
}> = {
  en: { title: 'Personal Score', certain: 'Certain', uncertain: 'Uncertain',
        synBoost: 'Synergy boost', synConflict: 'Synergy conflict', unknownHint: 'ingredients without data' },
  ru: { title: 'Персональная оценка', certain: 'Определённость', uncertain: 'Неопределённость',
        synBoost: 'Синергия', synConflict: 'Конфликт', unknownHint: 'ингредиентов без данных' },
  de: { title: 'Persönliche Bewertung', certain: 'Sicher', uncertain: 'Unsicher',
        synBoost: 'Synergie', synConflict: 'Konflikt', unknownHint: 'Inhaltsstoffe ohne Daten' },
  uk: { title: 'Персональна оцінка', certain: 'Визначеність', uncertain: 'Невизначеність',
        synBoost: 'Синергія', synConflict: 'Конфлікт', unknownHint: 'інгредієнтів без даних' },
  es: { title: 'Puntuación personal', certain: 'Cierto', uncertain: 'Incierto',
        synBoost: 'Sinergia', synConflict: 'Conflicto', unknownHint: 'ingredientes sin datos' },
  fr: { title: 'Score personnel', certain: 'Certain', uncertain: 'Incertain',
        synBoost: 'Synergie', synConflict: 'Conflit', unknownHint: 'ingrédients sans données' },
  it: { title: 'Punteggio personale', certain: 'Certo', uncertain: 'Incerto',
        synBoost: 'Sinergia', synConflict: 'Conflitto', unknownHint: 'ingredienti senza dati' },
  tr: { title: 'Kişisel Puan', certain: 'Kesin', uncertain: 'Belirsiz',
        synBoost: 'Sinerji', synConflict: 'Çatışma', unknownHint: 'veri olmayan bileşenler' },
};

function QuantumScoreWidget({ qs, lang }: { qs: QuantumScore; lang: Language }) {
  const L = QUANTUM_LABELS[lang] ?? QUANTUM_LABELS.en;

  const color = qs.value >= 7.5 ? '#2D9B5A' : qs.value >= 5 ? '#E8A020' : '#D94040';
  const bgColor = qs.value >= 7.5 ? 'rgba(45,155,90,0.07)' : qs.value >= 5 ? 'rgba(232,160,32,0.07)' : 'rgba(217,64,64,0.07)';

  // Bar geometry
  const minPct  = qs.min  * 10;
  const maxPct  = qs.max  * 10;
  const valPct  = qs.value * 10;
  const rangePct = maxPct - minPct;

  const boosts    = qs.synergyNotes.filter(n => n.delta > 0);
  const conflicts = qs.synergyNotes.filter(n => n.delta < 0);

  return (
    <div style={{
      background: bgColor,
      border: `1.5px solid ${color}22`,
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 14,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: '0.72rem', color: '#8A8078', fontFamily: 'var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {L.title}
        </span>
        {qs.uncertainty > 0.25 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', color: '#B8923A' }}>
            <AlertTriangle size={10} />
            {qs.unknownCount} {L.unknownHint}
          </span>
        )}
      </div>

      {/* Score value + range label */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: '2.2rem', fontWeight: 800, color, lineHeight: 1, fontFamily: 'var(--font-sans)', letterSpacing: '-0.03em' }}>
          {qs.value.toFixed(1)}
        </span>
        <span style={{ fontSize: '0.72rem', color, opacity: 0.7, fontFamily: 'var(--font-sans)' }}>/10</span>
        <span style={{ marginLeft: 4, fontSize: '0.72rem', color: '#8A8078', fontFamily: 'var(--font-sans)' }}>
          ({qs.min.toFixed(1)} – {qs.max.toFixed(1)})
        </span>
      </div>

      {/* Quantum bar: grey track → range highlight → uncertainty wave → value dot */}
      <div style={{ position: 'relative', height: 8, borderRadius: 8, background: '#E8E0D6', marginBottom: 10, overflow: 'visible' }}>
        {/* Range band */}
        <div style={{
          position: 'absolute',
          left: `${minPct}%`,
          width: `${rangePct}%`,
          height: '100%',
          borderRadius: 8,
          background: `${color}30`,
        }} />
        {/* Uncertainty shimmer — wider = more unknown */}
        {qs.uncertainty > 0.1 && (
          <div style={{
            position: 'absolute',
            left: `${minPct}%`,
            width: `${rangePct}%`,
            height: '100%',
            borderRadius: 8,
            background: `linear-gradient(90deg, transparent 0%, ${color}55 50%, transparent 100%)`,
            animation: 'quantumShimmer 2.2s ease-in-out infinite',
          }} />
        )}
        {/* Filled bar up to value */}
        <div style={{
          position: 'absolute',
          left: 0,
          width: `${valPct}%`,
          height: '100%',
          borderRadius: 8,
          background: color,
          opacity: 0.85,
          transition: 'width 0.8s cubic-bezier(.22,1,.36,1)',
        }} />
        {/* Value dot */}
        <div style={{
          position: 'absolute',
          left: `${valPct}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 14, height: 14,
          borderRadius: '50%',
          background: color,
          border: '2.5px solid white',
          boxShadow: `0 0 0 2px ${color}44`,
        }} />
      </div>

      {/* Uncertainty label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: synergies_exist(qs) ? 10 : 0 }}>
        <span style={{ fontSize: '0.62rem', color: '#8A8078', fontFamily: 'var(--font-sans)' }}>
          {L.certain}
        </span>
        <span style={{ fontSize: '0.62rem', color: '#8A8078', fontFamily: 'var(--font-sans)' }}>
          {L.uncertain}
        </span>
      </div>

      {/* Synergy notes */}
      {synergies_exist(qs) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {boosts.map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={10} color="#2D9B5A" fill="#2D9B5A" />
              <span style={{ fontSize: '0.68rem', color: '#2D9B5A', fontFamily: 'var(--font-sans)' }}>
                {L.synBoost}: {n.label} (+{n.delta.toFixed(1)})
              </span>
            </div>
          ))}
          {conflicts.map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={10} color="#D94040" />
              <span style={{ fontSize: '0.68rem', color: '#D94040', fontFamily: 'var(--font-sans)' }}>
                {L.synConflict}: {n.label} ({n.delta.toFixed(1)})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CSS keyframe injected once */}
      <style>{`
        @keyframes quantumShimmer {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

function synergies_exist(qs: QuantumScore): boolean {
  return qs.synergyNotes.length > 0;
}

// ── PersonalAnalysis ───────────────────────────────────────────────────────

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

  // Quantum score — must be above early returns (React hooks rule)
  const quantumScore = React.useMemo(() => {
    if (!userProfile || !result?.ingredients?.length) return null;
    return computeQuantumScore(result.ingredients, userProfile);
  }, [result?.ingredients, userProfile]);

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
      {/* ── Quantum personal score widget ────────────────────────────────── */}
      {quantumScore && <QuantumScoreWidget qs={quantumScore} lang={lang} />}

      {/* ── AI personalNote markdown ─────────────────────────────────────── */}
      <div className="prose prose-base prose-stone max-w-none
        [&_strong]:text-[#1A1410] [&_strong]:font-semibold
        [&_p]:text-[#5A5550] [&_p]:leading-relaxed [&_p]:mb-1
        [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:mt-1
        [&_li]:text-[#5A5550] [&_li]:leading-relaxed
        [&_hr]:border-[#DDD5C8]/50 [&_hr]:my-3
        [&_em]:text-xs [&_em]:text-[#B8923A] [&_em]:not-italic [&_em]:block [&_em]:mt-2"
        style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem' }}>
        <ReactMarkdown>{note}</ReactMarkdown>
      </div>
    </div>
  );
}
