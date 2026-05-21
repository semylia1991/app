import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Crown, RefreshCw, LogIn, Settings, Zap, AlertTriangle, ChevronDown } from 'lucide-react';
import { t, Language } from '../i18n';
import { AnalysisResult, SerializedProfile, fetchIngredientPreferenceNote } from '../services/ai';
import { UserProfile, translateProfile } from './UserProfile';
import { computeAutonomousScore, AutonomousScore, IngredientMatch, SynergyNote } from '../lib/personalScore';
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

// ── Preference row — clickable, lazy-loads ingredient explanation ─────────



const prefExplanationCache = new Map<string, string>();

function PreferenceRow({ m, lang }: { m: IngredientMatch; lang: Language }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
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
    en:'Loading…', ru:'Загружаем…', de:'Laden…', uk:'Завантажуємо…',
    es:'Cargando…', fr:'Chargement…', it:'Caricamento…', tr:'Yükleniyor…',
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
        <ChevronDown size={12} style={{ color: '#8A8078', flexShrink: 0, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
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

// ── Autonomous Score Widget ───────────────────────────────────────────────

function AutonomousScoreWidget({ qs, lang }: { qs: AutonomousScore; lang: Language }) {
  const color      = qs.value >= 7 ? '#2D9B5A' : qs.value >= 5 ? '#E8A020' : '#D94040';
  const scoreLabel: Record<string, Record<number, string>> = {
    en: { 1:'Caution advised', 2:'Not recommended', 3:'Poor match', 4:'Below average', 5:'Neutral', 6:'Acceptable', 7:'Good match', 8:'Great match', 9:'Excellent match', 10:'Perfect match' },
    ru: { 1:'Осторожно', 2:'Не рекомендуется', 3:'Плохо подходит', 4:'Ниже среднего', 5:'Нейтрально', 6:'Приемлемо', 7:'Подходит', 8:'Хорошо подходит', 9:'Отлично подходит', 10:'Идеально' },
    de: { 1:'Vorsicht', 2:'Nicht empfohlen', 3:'Schlecht geeignet', 4:'Unterdurchschnittlich', 5:'Neutral', 6:'Akzeptabel', 7:'Gut geeignet', 8:'Sehr gut geeignet', 9:'Ausgezeichnet', 10:'Perfekt' },
    uk: { 1:'Обережно', 2:'Не рекомендується', 3:'Погано підходить', 4:'Нижче середнього', 5:'Нейтрально', 6:'Прийнятно', 7:'Підходить', 8:'Добре підходить', 9:'Чудово підходить', 10:'Ідеально' },
    es: { 1:'Precaución', 2:'No recomendado', 3:'Mal resultado', 4:'Por debajo del promedio', 5:'Neutral', 6:'Aceptable', 7:'Buena coincidencia', 8:'Gran coincidencia', 9:'Excelente', 10:'Perfecto' },
    fr: { 1:'Prudence', 2:'Déconseillé', 3:'Mauvaise adéquation', 4:'En dessous de la moyenne', 5:'Neutre', 6:'Acceptable', 7:'Bonne adéquation', 8:'Très bonne', 9:'Excellente', 10:'Parfait' },
    it: { 1:'Attenzione', 2:'Sconsigliato', 3:'Scarsa compatibilità', 4:'Sotto la media', 5:'Neutro', 6:'Accettabile', 7:'Buona compatibilità', 8:'Ottima', 9:'Eccellente', 10:'Perfetto' },
    tr: { 1:'Dikkat', 2:'Önerilmez', 3:'Kötü uyum', 4:'Ortalamanın altı', 5:'Nötr', 6:'Kabul edilebilir', 7:'İyi uyum', 8:'Çok iyi uyum', 9:'Mükemmel uyum', 10:'Mükemmel' },
  };
  const label = (scoreLabel[lang] ?? scoreLabel.en)[Math.min(10, Math.max(1, qs.value))] ?? '';

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Score block — same style as ingredients score block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', marginBottom: 10, background: 'rgba(255,255,255,0.6)', borderRadius: 14, border: `1.5px solid ${color}22` }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1, fontFamily: 'var(--font-sans)', letterSpacing: '-0.03em' }}>
            {qs.value}
          </span>
          <span style={{ fontSize: '0.72rem', color, opacity: 0.75, fontFamily: 'var(--font-sans)', marginTop: 1 }}>/10</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 8, background: 'rgba(0,0,0,0.07)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${qs.value * 10}%`, background: color, borderRadius: 8, transition: 'width 0.6s ease' }} />
          </div>
          <span style={{ fontSize: '0.8rem', color, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{label}</span>
        </div>
      </div>

      {/* Per-ingredient preference rows */}
      {qs.matches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {qs.matches.map((m, i) => (
            <PreferenceRow key={i} m={m} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

function synergies_exist(qs: AutonomousScore): boolean {
  return qs.synergyNotes.length > 0;
}



// ── PersonalAnalysis ───────────────────────────────────────────────────────

export function PersonalAnalysis({ lang, result, user, userProfile, canUseNote, onLimitReached, onUsed, onOpenProfile }: Props) {
  const T = t[lang];

  const [note, setNote]       = useState<string | null>(result.personalNote ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Track which product the current note belongs to so we can detect product changes
  const noteProductKey = useRef<string>(result.productName + '|' + result.brand);
  // Track whether note was manually generated (so onLateUpdate doesn't overwrite it)
  const noteIsManual = useRef<boolean>(false);

  const noteProfileKey = useRef<string>(profileKey(userProfile));
  const currentKey = profileKey(userProfile);
  const profileChanged = !!userProfile && currentKey !== noteProfileKey.current;

  // ── Sync note when result.personalNote arrives via onLateUpdate ────────────
  // useState initialises once — when App.tsx patches result via setResult({...patch}),
  // the new result prop arrives here but note state stays stale.
  // This effect keeps note in sync, but never overwrites a manually-generated note.
  useEffect(() => {
    const incomingProductKey = result.productName + '|' + result.brand;
    const productChanged = incomingProductKey !== noteProductKey.current;

    if (productChanged) {
      // New product scanned — reset everything
      noteProductKey.current = incomingProductKey;
      noteIsManual.current = false;
      setNote(result.personalNote ?? null);
      return;
    }

    // Same product: only sync if we don't have a manual note and incoming has one
    if (!noteIsManual.current && result.personalNote) {
      setNote(result.personalNote);
    }
  }, [result.personalNote, result.productName, result.brand]);

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
  const autonomousScore = React.useMemo(() => {
    if (!userProfile || !result?.ingredients?.length) return null;
    return computeAutonomousScore(result.ingredients, userProfile, lang);
  }, [result?.ingredients, userProfile]);

  useEffect(() => {
    if (!hasProfile || !profileChanged || !canUseNote) return;
    regenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  async function regenerate() {
    if (!userProfile) return;
    if (!result?.ingredients?.length) return; // no ingredients — nothing to analyse
    if (!canUseNote) { onLimitReached(); return; }
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchPersonalNote(result, userProfile, lang);
      setNote(fresh);
      noteIsManual.current = true;
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

  // If no ingredients scanned — show nothing at all (no score, no button)
  if (!result?.ingredients?.length) {
    return null;
  }

  if (!note) {
    return (
      <div className="flex flex-col gap-3 py-2">
        {/* Show autonomous score even while AI note is loading/absent */}
        {autonomousScore && <AutonomousScoreWidget qs={autonomousScore} lang={lang} />}
        <p className="text-base text-[#5A5550] leading-relaxed">
          {T.noteRescan}
        </p>
        <button
          onClick={regenerate}
          className="inline-flex items-center gap-2 self-start px-4 py-2 bg-[#2D5A3D] text-white text-[11px] font-semibold rounded-sm hover:bg-[#3D7A55] transition-all"
        >
          <RefreshCw size={13} />
          {T.noteGenerate}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ── Quantum personal score widget ────────────────────────────────── */}
      {autonomousScore && <AutonomousScoreWidget qs={autonomousScore} lang={lang} />}

      {/* ── AI personalNote markdown ─────────────────────────────────────── */}
      {/* Sanitize literal \n sequences AI sometimes returns */}
      <div className="prose prose-base prose-stone max-w-none
        [&_strong]:text-[#1A1410] [&_strong]:font-semibold
        [&_p]:text-[#5A5550] [&_p]:leading-relaxed [&_p]:mb-1
        [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:mt-1
        [&_li]:text-[#5A5550] [&_li]:leading-relaxed
        [&_hr]:border-[#DDD5C8]/50 [&_hr]:my-3
        [&_em]:text-xs [&_em]:text-[#B8923A] [&_em]:not-italic [&_em]:block [&_em]:mt-2"
        style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem' }}>
        <ReactMarkdown>{note.replace(/\\n/g, '\n')}</ReactMarkdown>
      </div>
    </div>
  );
}
