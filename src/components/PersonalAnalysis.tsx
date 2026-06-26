import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Settings, Loader2, ChevronDown } from 'lucide-react';
import { Language } from '../i18n';
import { AnalysisResult, SerializedProfile } from '../services/ai';
import { UserProfile } from './UserProfile';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { computePreferenceTable, PreferenceTable } from '../lib/personalScore';

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
    const items = await fetchCriteria(result, profile, lang);
    criteriaCache.set(key, items);
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

function PreferenceScoreTable({ table, lang }: { table: PreferenceTable; lang: Language }) {
  const [showIgnored, setShowIgnored] = useState(false);
  const score = table.score ?? 0;
  const color = score >= 80 ? '#2D9B5A' : score >= 50 ? '#E8A020' : '#D94040';
  const tt = (m: Record<string, string>) => m[lang] ?? m.en;
  const note = table.capped ? tt(PT.capped) : table.uncertain ? tt(PT.approx) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 13px', background: 'rgba(255,255,255,0.55)', border: `1.5px solid ${color}33`, borderRadius: 13 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 46 }}>
          <span style={{ fontSize: '1.65rem', fontWeight: 800, color, lineHeight: 1, fontFamily: 'var(--font-sans)' }}>{score}</span>
          <span style={{ fontSize: '0.66rem', color, opacity: 0.7 }}>/100</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3A3530', fontFamily: 'var(--font-sans)' }}>{tt(PT.title)}</div>
          {note && <div style={{ fontSize: '0.69rem', color: '#8A8078', fontStyle: 'italic', marginTop: 2 }}>{note}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {table.columns.map((col, i) => (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: '0.82rem', lineHeight: 1, flexShrink: 0 }}>{col.emoji}</span>
              <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 500, color: '#3A3530', fontFamily: 'var(--font-sans)' }}>{col.label}</span>
              <span style={{ fontSize: '0.69rem', color: '#8A8078', flexShrink: 0 }}>{col.score}/100</span>
            </div>
            <div style={{ paddingLeft: 22, marginTop: 3, display: 'flex', flexWrap: 'wrap', columnGap: 10, rowGap: 2 }}>
              {col.cells.map((cell, j) => (
                <span key={j} style={{ fontSize: '0.72rem', color: '#5A5550', fontFamily: 'var(--font-serif)' }}>{cell.emoji} {cell.ingredient}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {table.ignoredIngredients.length > 0 && (
        <div onClick={() => setShowIgnored(s => !s)} style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: '0.7rem', color: '#8A8078' }}>{tt(PT.noEffect)}: {table.ignoredIngredients.length}</span>
          {showIgnored && (
            <div style={{ marginTop: 3, fontSize: '0.69rem', color: '#A8A098', lineHeight: 1.5, fontFamily: 'var(--font-serif)' }}>
              {table.ignoredIngredients.join(', ')}
            </div>
          )}
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

    // 3. Fetch fresh
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

  // Deterministic preference-match table + score (no AI, instant, from PROFILE_RULES).
  const prefTable = computePreferenceTable(result.ingredients ?? [], userProfile!, result.productType ?? '', lang);
  const tableEl = prefTable.score !== null ? <PreferenceScoreTable table={prefTable} lang={lang} /> : null;

  // AI criteria are a GAP-FILLER: show only those not already covered by the
  // deterministic table, so the table stays authoritative and no contradictory
  // duplicate rows appear for the same preference.
  const tableLabels = new Set(prefTable.columns.map(c => c.label.toLowerCase().trim()));

  let statusEl: React.ReactNode = null;
  if (loading || !criteria) {
    statusEl = (
      <div className="flex items-center gap-2 py-3">
        <Loader2 size={13} className="text-[#B8923A] animate-spin" />
        <span style={{ fontSize: '0.78rem', color: '#B8923A', fontFamily: 'var(--font-sans)' }}>{t(L.analysing, lang)}</span>
      </div>
    );
  } else if (error) {
    statusEl = (
      <div className="flex items-center gap-2 py-2">
        <p className="text-xs text-red-400 italic flex-1">{error}</p>
        <button onClick={handleRetry} className="text-xs text-[#B8923A] underline">{t(L.retry, lang)}</button>
      </div>
    );
  } else {
    // Show only criteria the model judged relevant AND not already in the table.
    // `relevant !== false` keeps legacy cached criteria (saved before that field existed) visible.
    const visible = criteria.filter(c =>
      c.relevant !== false &&
      !SKIP_LABELS.test(c.label) &&
      !tableLabels.has(c.label.toLowerCase().trim())
    );
    if (visible.length) {
      statusEl = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visible.map((c, i) => <CriterionRow key={i} c={c} lang={lang} />)}
        </div>
      );
    }
  }

  if (!tableEl && !statusEl) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {tableEl}
      {statusEl}
    </div>
  );
}
