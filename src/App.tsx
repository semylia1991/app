import logo from './logo.png'
import posthog from 'posthog-js'
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, AlertCircle, ShieldCheck, Leaf, Info, Sparkles, AlertTriangle, Zap, RefreshCw, Loader2, Share2, NotebookPen, ShoppingCart, ChevronDown, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { User } from '@supabase/supabase-js';

import { t, Language, loadLanguage } from './i18n';
import { analyzeProductImageStream, AnalysisResult, ShopLink, translateAnalysisResult, SerializedProfile, computeProductScore, fetchIngredientDescription, fetchPreferenceExplanation, fetchDetails, applyCanonicalCard } from './services/ai';
import { getCanonicalScore } from './services/productCache';
import { computeAutonomousScore, computePreferenceTable } from './lib/personalScore';
import { toScore100, verdictEmoji100 } from './lib/scoring';
import { supabase } from './lib/supabase';
import { LanguageSelector } from './components/LanguageSelector';
import { CookieBanner } from './components/CookieBanner';
import { LegalModal, PrivacyPolicyContent, ImpressumContent, AGBContent } from './components/LegalModals';
import { UserGuideModal } from './components/UserGuideModal';
import { fetchProductImage } from './lib/productImage';
import { AlternativesSection } from './components/AlternativesSection';
import { WhereToBuy } from './components/WhereToBuy';
import { CollapsibleSection } from './components/CollapsibleSection';
import { AskAI } from './components/AskAI';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthButton } from './components/AuthButton';
import { ScanHistory } from './components/ScanHistory';

import { UserProfilePanel, UserProfile, translateProfile } from './components/UserProfile';
import { PersonalAnalysis, prefetchPersonalNote } from './components/PersonalAnalysis';
import { PaywallModal } from './components/PaywallModal';
import { WelcomePremiumModal } from './components/WelcomePremiumModal';
import { CancelPremiumModal } from './components/CancelPremiumModal';
import { FeedbackSurvey } from './components/FeedbackSurvey';
import { useSubscription } from './hooks/useSubscription';
import { SubscriptionPage } from './components/SubscriptionPage';
import { WelcomeScreen, useShowWelcome } from './components/WelcomeScreen';
import { FirstScanModal, useFirstScanModal } from './components/FirstScanModal';

// Localized medical disclaimer shown as a dismissible banner at the top of the
// results panel. Dismissal persists across reloads via localStorage.
const DISCLAIMER_BANNER_TEXT: Record<Language, string> = {
  en: 'This analysis is for informational purposes only and is not medical advice. Consult a doctor or dermatologist before making changes to your skincare routine.',
  ru: 'Этот анализ предоставляется только в информационных целях и не является медицинской рекомендацией. Перед изменением ухода за кожей проконсультируйтесь с врачом или дерматологом.',
  de: 'Diese Analyse dient nur zu Informationszwecken und ist keine medizinische Beratung. Konsultieren Sie einen Arzt oder Dermatologen, bevor Sie Ihre Hautpflege ändern.',
  uk: 'Цей аналіз надається лише в інформаційних цілях і не є медичною рекомендацією. Перед зміною догляду за шкірою проконсультуйтеся з лікарем або дерматологом.',
  es: 'Este análisis es solo con fines informativos y no constituye consejo médico. Consulte a un médico o dermatólogo antes de cambiar su rutina de cuidado de la piel.',
  fr: "Cette analyse est fournie à titre informatif uniquement et ne constitue pas un avis médical. Consultez un médecin ou un dermatologue avant de modifier votre routine de soins.",
  it: 'Questa analisi ha solo scopo informativo e non costituisce un consiglio medico. Consulta un medico o un dermatologo prima di modificare la tua routine di cura della pelle.',
  tr: 'Bu analiz yalnızca bilgilendirme amaçlıdır ve tıbbi tavsiye değildir. Cilt bakımı rutininizi değiştirmeden önce bir doktora veya dermatoloğa danışın.',
};

// Emoji-only indicator rendered in CollapsibleSection headers (always visible).
// The numeric score is still computed internally (weights, caching, sorting)
// but is NEVER shown to the user — only the 🟢/🟡/🔴 verdict.
// The internal 0–10 product score is normalized to the unified 0–100 scale:
// 🟢 ≥ 75, 🟡 ≥ 50, 🔴 < 50 (same thresholds as the preference verdict).
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  return (
    <span style={{ fontSize: '1.05rem', lineHeight: 1 }} aria-hidden>
      {verdictEmoji100(toScore100(score))}
    </span>
  );
}

// ── Ingredient status legend (shown when the Ingredients section is open) ──
const ING_LEGEND: Record<Language, { g: string; y: string; r: string }> = {
  en: { g: 'Good formula',        y: 'Some nuances',              r: 'Has debatable components' },
  ru: { g: 'Хороший состав',      y: 'Есть нюансы',               r: 'Есть спорные компоненты' },
  de: { g: 'Gute Formel',         y: 'Einige Nuancen',            r: 'Enthält umstrittene Stoffe' },
  uk: { g: 'Хороший склад',       y: 'Є нюанси',                  r: 'Є спірні компоненти' },
  es: { g: 'Buena fórmula',       y: 'Algunos matices',           r: 'Tiene componentes discutibles' },
  fr: { g: 'Bonne formule',       y: 'Quelques nuances',          r: 'Contient des composants discutables' },
  it: { g: 'Buona formula',       y: 'Alcune sfumature',          r: 'Contiene componenti discutibili' },
  tr: { g: 'İyi formül',          y: 'Bazı nüanslar',             r: 'Tartışmalı bileşenler içeriyor' },
};

// Shows ONE line only — the verdict matching the emoji in the section header,
// so the legend and the header circle always agree.
function IngredientLegend({ lang, score }: { lang: Language; score: number | null }) {
  if (score === null) return null;
  const l = ING_LEGEND[lang] ?? ING_LEGEND.en;
  const emoji = verdictEmoji100(toScore100(score));
  const label = emoji === '🟢' ? l.g : emoji === '🟡' ? l.y : l.r;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', marginBottom: 12,
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(221,213,200,0.6)', borderRadius: 14,
      }}
    >
      <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: '0.8rem', color: '#3A3530', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

/* ── helpers ── */

// Module-level cache for lazy-fetched descriptions: name+lang → description.
// Survives re-renders within a session; resets on full page reload.
const ingredientDescriptionCache = new Map<string, string>();

interface IngredientItemProps {
  ing: { name: string; status: string; score?: number; description: string };
  lang: Language;
}

function IngredientItem({ ing, lang }: IngredientItemProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Locally-fetched description for unknown-to-DB ingredients. Always overrides
  // the prop description when present and non-empty.
  const [fetched, setFetched] = useState<string | null>(null);

  const cacheKey = `${ing.name.toLowerCase().trim()}|${lang}`;

  // Reset locally-fetched description when language changes — the new value
  // for this language will be picked up from the session cache or re-fetched.
  useEffect(() => {
    const sessionHit = ingredientDescriptionCache.get(cacheKey);
    setFetched(sessionHit ?? null);
  }, [cacheKey]);

  // The description shown to the user: prop description if present (from local
  // DB hydration), otherwise fetched, otherwise empty.
  const shownDescription = ing.description || fetched || '';

  // When opened: if no description anywhere, kick off a lazy AI fetch.
  useEffect(() => {
    if (!open) return;
    if (shownDescription) return;
    // Already cached for this lang? use it
    const cached = ingredientDescriptionCache.get(cacheKey);
    if (cached) {
      setFetched(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchIngredientDescription(ing.name, lang)
      .then((desc) => {
        if (cancelled) return;
        ingredientDescriptionCache.set(cacheKey, desc);
        setFetched(desc);
      })
      .catch(() => { /* keep empty */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, shownDescription, cacheKey, ing.name, lang]);

  return (
    <li
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '7px 0',
        borderBottom: '0.5px solid rgba(221,213,200,0.5)',
        cursor: 'pointer',
      }}
      onClick={() => setOpen((o) => !o)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{ing.status}</span>
        <span
          style={{
            flex: 1,
            fontSize: '0.85rem',
            letterSpacing: '0.04em',
            color: '#1A1410',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            marginTop: 1,
          }}
        >
          {ing.name}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: '#8A8078',
            flexShrink: 0,
            marginTop: 4,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
      </div>
      {open && (
        <div style={{ paddingLeft: 26, marginTop: 4 }}>
          {loading && !shownDescription ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#8A8078', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
              <Loader2 size={12} className="animate-spin" />
              {lang === 'ru' ? 'Загружаем описание…' :
               lang === 'uk' ? 'Завантажуємо опис…' :
               lang === 'de' ? 'Beschreibung wird geladen…' :
               lang === 'es' ? 'Cargando descripción…' :
               lang === 'fr' ? 'Chargement de la description…' :
               lang === 'it' ? 'Caricamento descrizione…' :
               lang === 'tr' ? 'Açıklama yükleniyor…' :
                              'Loading description…'}
            </span>
          ) : (
            <span style={{ fontSize: '1rem', color: '#5A5550', lineHeight: 1.6, fontFamily: 'var(--font-serif)' }}>
              {shownDescription || '—'}
            </span>
          )}
        </div>
      )}
    </li>
  );
}
function splitParagraphs(text: string): string[] {
  return text.split('\n\n').map(s => s.trim()).filter(Boolean);
}

// Shimmer placeholder shown while deferred sections (usage / benefits / etc.)
// are still loading from the analyzeDetails request.
function LoadingPlaceholder({ lang }: { lang: Language }) {
  const label =
    lang === 'ru' ? 'Загружаем подробности…' :
    lang === 'uk' ? 'Завантажуємо деталі…' :
    lang === 'de' ? 'Details werden geladen…' :
    lang === 'es' ? 'Cargando detalles…' :
    lang === 'fr' ? 'Chargement des détails…' :
    lang === 'it' ? 'Caricamento dettagli…' :
    lang === 'tr' ? 'Detaylar yükleniyor…' :
    'Loading details…';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#8A8078', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
        <Loader2 size={14} className="animate-spin" style={{ color: '#B8923A' }} />
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <div style={{ height: 10, width: '85%', background: 'linear-gradient(90deg, rgba(221,213,200,0.3) 0%, rgba(221,213,200,0.6) 50%, rgba(221,213,200,0.3) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite', borderRadius: 4 }} />
        <div style={{ height: 10, width: '70%', background: 'linear-gradient(90deg, rgba(221,213,200,0.3) 0%, rgba(221,213,200,0.6) 50%, rgba(221,213,200,0.3) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite 0.2s', borderRadius: 4 }} />
        <div style={{ height: 10, width: '92%', background: 'linear-gradient(90deg, rgba(221,213,200,0.3) 0%, rgba(221,213,200,0.6) 50%, rgba(221,213,200,0.3) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite 0.4s', borderRadius: 4 }} />
      </div>
    </div>
  );
}

function UsageSection({ text, shelfLife, shelfLifeLabel }: { text: string; shelfLife?: string; shelfLifeLabel?: string }) {
  const blocks = splitParagraphs(text);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} className="prose-luxury">
      {blocks.map((block, i) => {
        const colonIdx = block.indexOf(':');
        if (colonIdx !== -1) {
          const rawLabel = block.slice(0, colonIdx + 1);
          const emoji = rawLabel.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u)?.[0] ?? '';
          const label = rawLabel.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u, '');
          const body = block.slice(colonIdx + 1).trim();
          return (
            <p key={i}>
              {emoji && <span style={{ marginRight: 4 }}>{emoji}</span>}
              <strong style={{ color: '#1A1410' }}>{label}</strong>
              {body ? ' ' + body : ''}
            </p>
          );
        }
        return <p key={i}>{block}</p>;
      })}
      {shelfLife && shelfLife.trim() && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(26, 20, 16, 0.08)' }}>
          {shelfLifeLabel && (
            <p style={{ marginBottom: 4 }}>
              <span style={{ marginRight: 4 }}>🕐</span>
              <strong style={{ color: '#1A1410' }}>{shelfLifeLabel}</strong>
            </p>
          )}
          <ReactMarkdown>{shelfLife}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function BenefitsSection({ text }: { text: string }) {
  const blocks = splitParagraphs(text);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} className="prose-luxury">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;
        const header = lines[0];
        const rest = lines.slice(1);
        const isHeader = /[：:]$/.test(header) || /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/u.test(header);
        if (isHeader) {
          return (
            <div key={i}>
              <p style={{ color: '#1A1410', fontWeight: 500, marginBottom: 3 }}>{header}</p>
              {rest.map((line, j) => <p key={j} style={{ marginLeft: 12 }}>{line}</p>)}
            </div>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}

function ProductHeroImage({ name, brand, userPhoto }: { name: string; brand: string; userPhoto?: string | null }) {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetchProductImage(name, brand).then((url) => {
      if (!cancelled) {
        if (url) { setSrc(url); setState('loaded'); }
        else if (userPhoto) { setSrc(userPhoto); setState('loaded'); }
        else { setState('error'); }
      }
    });
    return () => { cancelled = true; };
  }, [name, brand, userPhoto]);

  if (state === 'error') return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
      <div style={{
        width: 80, height: 80,
        border: '0.5px solid #DDD5C8',
        background: '#FAF7F2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {state === 'loading' && (
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #DDD5C8', borderTopColor: '#2D5A3D' }} className="animate-spin" />
        )}
        {state === 'loaded' && src && (
          <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} onError={() => setState('error')} />
        )}
      </div>
    </div>
  );
}

interface ShopConfig {
  platform: string;
  favicon: string;
  buildUrl: (q: string) => string;
}

const SHOP_CONFIGS: ShopConfig[] = [
  {
    platform: 'Google Shopping',
    favicon: 'https://www.google.com/favicon.ico',
    buildUrl: (q) => `https://www.google.com/search?q=${q}&tbm=shop`,
  },
];

function buildShopLinks(productName: string, brand: string): ShopLink[] {
  const combined = [brand, productName].filter(Boolean).join(' ').trim();
  if (!combined) return [];
  const q = encodeURIComponent(`"${combined}"`);
  return SHOP_CONFIGS.map(({ platform, favicon, buildUrl }) => ({
    platform, favicon, url: buildUrl(q),
  }));
}

/* ── Main component ── */
export default function App() {
  const SUPPORTED_LANGS: Language[] = ['en', 'ru', 'de', 'uk', 'es', 'fr', 'it', 'tr'];

  // Language detection is now also handled inside i18n/index.ts (for the
  // initial eager load). Keep it here too so useState gets the right value.
  function getInitialLang(): Language {
    const saved = localStorage.getItem('lang') as Language | null;
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    const browser = navigator.language.slice(0, 2).toLowerCase() as Language;
    return SUPPORTED_LANGS.includes(browser) ? browser : 'en';
  }

  const [lang, setLangState] = useState<Language>(getInitialLang);

  // Async: ensure the locale chunk is loaded before flipping state so that
  // t[lang] is never undefined when components re-render.
  async function setLang(l: Language) {
    localStorage.setItem('lang', l);
    await loadLanguage(l);
    setLangState(l);
  }
  const [file, setFile]               = useState<File | null>(null);
  const [inputKey, setInputKey]       = useState(0);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [scanPhotoUrl, setScanPhotoUrl] = useState<string | null>(null);
  const [consent, setConsent]         = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult]           = useState<AnalysisResult | null>(null);
  // Defer mounting of Compare & WhereToBuy blocks until the browser is idle —
  // they're not on the critical path, so let the main analysis paint first.
  const [secondaryReady, setSecondaryReady] = useState(false);
  // Two-stage card reveal: after a scan we first show a light card (photo,
  // name, analysis text, two buttons). The heavy sections mount only when the
  // user taps "See details" — which gives free "invisible time" to warm up
  // scores, the preference table and product details in the background.
  const [showDetails, setShowDetails] = useState(false);
  // Track whether details have been fetched (lazy — only when productInfo opens)
  const [detailsFetched, setDetailsFetched] = useState(false);
  // Store image hash so fetchDetails can use it for cache write
  const imageHashRef = useRef<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [user, setUser]               = useState<User | null>(null);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [isSharedView, setIsSharedView]   = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [scanHistoryKey, setScanHistoryKey] = useState(0);

  const [isPrivacyOpen, setIsPrivacyOpen]     = useState(false);
  const [isImpressumOpen, setIsImpressumOpen] = useState(false);
  const [isAgbOpen, setIsAgbOpen]             = useState(false);
  const [isSurveyOpen, setIsSurveyOpen]       = useState(false);
  const [isGuideOpen, setIsGuideOpen]         = useState(false);
  const [isProfileOpen, setIsProfileOpen]     = useState(false);
  const [copied, setCopied]                   = useState(false);
  const [captionCopied, setCaptionCopied]     = useState(false);
  const [isSharing, setIsSharing]             = useState(false);
  const [shareAppCopied, setShareAppCopied]   = useState(false);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState<boolean>(
    () => localStorage.getItem('disclaimerDismissed') === 'true'
  );

  const subscription = useSubscription(user);
  const [paywallReason, setPaywallReason] = useState<'scans' | 'note' | 'askAi' | null>(null);
  const [showSubscriptionPage, setShowSubscriptionPage] = useState<boolean>(
    () => window.location.search.includes('portal=return')
  );
  const [showWelcomePremium, setShowWelcomePremium] = useState<boolean>(
    () => window.location.search.includes('success=1')
  );
  const [showCancelPremium, setShowCancelPremium] = useState<boolean>(false);

  // ── Welcome screen — shown once to unauthenticated first-time visitors ──
  const [showWelcome, dismissWelcome] = useShowWelcome(user);

  // ── First-scan modal — shown once after first scan on reset ──
  const [showFirstScan, triggerFirstScan, dismissFirstScan] = useFirstScanModal();

  const fileInputRef     = useRef<HTMLInputElement>(null);
  const isFirstRender    = useRef(true);
  const originalResult   = useRef<AnalysisResult | null>(null);
  const translationCache = useRef<Map<Language, AnalysisResult>>(new Map());

  const isSharedViewRef = useRef(false);
  useEffect(() => { isSharedViewRef.current = isSharedView; }, [isSharedView]);

  // Schedule mounting of Compare/WhereToBuy when browser is idle.
  // These blocks query Supabase + render external favicons — defer them
  // so the main analysis paint isn't blocked.
  useEffect(() => {
    if (!result) {
      setSecondaryReady(false);
      return;
    }
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => setSecondaryReady(true), { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setSecondaryReady(true), 400);
    return () => window.clearTimeout(id);
  }, [result]);

  // Background warm-up during the "read" phase (before "See details" is tapped).
  // Prefetch product details while the user is looking at the light card, so the
  // full reveal is instant. Runs once per product, only if details aren't loaded.
  useEffect(() => {
    if (!result || showDetails || detailsFetched) return;
    if (result.usage && result.benefits) return; // already have them
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    let cancelled = false;
    const warm = () => {
      if (cancelled) return;
      setDetailsFetched(true);
      fetchDetails(result, lang)
        .then((details) => {
          if (cancelled) return;
          setResult(prev => {
            if (!prev) return prev;
            const merged: AnalysisResult = { ...prev, ...details };
            originalResult.current = merged;
            translationCache.current.set(lang, merged);
            return merged;
          });
        })
        .catch((e) => console.warn('[warm details] failed:', e));
    };
    const id = typeof w.requestIdleCallback === 'function'
      ? w.requestIdleCallback(warm, { timeout: 2000 })
      : window.setTimeout(warm, 600);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, showDetails]);

  useEffect(() => {
    const loadFromUrl = () => {
      const shareId = new URLSearchParams(window.location.search).get('share');

      if (!shareId) {
        if (isSharedViewRef.current) {
          setResult(null);
          setIsSharedView(false);
          originalResult.current = null;
          translationCache.current = new Map();
        }
        return;
      }

      setSharedLoading(true);
      supabase
        .from('shared_results').select('result').eq('id', shareId).maybeSingle()
        .then(({ data }) => {
          if (data?.result) {
            const r = data.result as AnalysisResult;
            originalResult.current = r;
            translationCache.current = new Map([[lang, r]]);
            setResult(r);
            setShowDetails(false);
            setIsSharedView(true);
          }
          setSharedLoading(false);
        });
    };

    loadFromUrl();
    window.addEventListener('popstate', loadFromUrl);
    return () => window.removeEventListener('popstate', loadFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!originalResult.current || isAnalyzing) return;
    const cached = translationCache.current.get(lang);
    if (cached) { setResult(cached); return; }
    let cancelled = false;
    const translate = async () => {
      setIsTranslating(true);
      try {
        const translated = await translateAnalysisResult(originalResult.current!, lang);
        if (!cancelled) { translationCache.current.set(lang, translated); setResult(translated); }
      } catch (err) {
        if (!cancelled) console.error('Translation error:', err);
      } finally {
        if (!cancelled) setIsTranslating(false);
      }
    };
    translate();
    return () => { cancelled = true; setIsTranslating(false); };
  }, [lang]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setError(null);
    }
  };

  const saveScanToHistory = async (analysis: AnalysisResult): Promise<string | null> => {
    if (!user) {
      console.warn('[ScanHistory] saveScan — no user, skipping');
      return null;
    }
    console.log('[ScanHistory] saving scan for user', user.id, analysis.productName);
    const { data, error } = await supabase.from('scan_history').insert({
      user_id: user.id,
      product_name: analysis.productName,
      brand: analysis.brand,
      result: analysis,
      scan_lang: lang,
    }).select();
    if (error) {
      console.error('[ScanHistory] INSERT error:', error.message, '| code:', error.code, '| details:', error.details, '| hint:', error.hint);
      return null;
    } else {
      console.log('[ScanHistory] saved OK, id:', data?.[0]?.id);
      return data?.[0]?.id ?? null;
    }
  };

  const handleAnalyze = async () => {
    if (!previewUrl || !consent) return;
    if (!subscription.canScan) { setPaywallReason('scans'); return; }
    setIsAnalyzing(true);
    setError(null);
    setDetailsFetched(false);
    imageHashRef.current = null;
    posthog.capture('scan_started', { lang });
    try {
      const match = previewUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) throw new Error('Invalid image format');
      const mimeType = match[1];
      const serializedProfile: SerializedProfile | undefined = userProfile
        ? (() => {
            const p = translateProfile(userProfile, lang);
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
            };
          })()
        : undefined;
      // Two-stage: fast paint first, details stream in afterwards.
      const langAtScan = lang;
      const analysis = await analyzeProductImageStream(
        previewUrl,
        mimeType,
        lang,
        serializedProfile,
        (patch: Partial<AnalysisResult>) => {
          // Don't overwrite state if user has switched language in the meantime —
          // the freshly-translated result is more correct than stale data.
          if (langAtScan !== lang) return;
          setResult((prev) => {
            if (!prev) return prev;
            const merged: AnalysisResult = { ...prev, ...patch };
            originalResult.current = merged;
            translationCache.current.set(langAtScan, merged);
            return merged;
          });
        },
      );
      const analysisWithShops: AnalysisResult = {
        ...analysis,
        shopLinks: buildShopLinks(analysis.productName, analysis.brand),
      };
      originalResult.current = analysisWithShops;
      translationCache.current = new Map([[lang, analysisWithShops]]);
      setResult(analysisWithShops);
      setShowDetails(false);
      setScanPhotoUrl(previewUrl);
      setFile(null);
      setPreviewUrl(null);

      // ── Prefetch "Обрати внимание" + save to history with criteria ──────────
      let criteria: any[] = [];
      if (userProfile) {
        try {
          criteria = await prefetchPersonalNote(analysisWithShops, userProfile, lang);
          console.log('[prefetch] criteria count:', criteria.length);
          if (criteria.length > 0) await subscription.incrementNoteAnalysis();
        } catch (e) {
          console.warn('[scan] prefetch personalNote failed:', e);
        }
      }

      // Initial save — includes criteria if prefetch succeeded
      const scanId = await saveScanToHistory({
        ...analysis,
        ...(criteria.length ? { criteria } : {}),
      } as any);
      await subscription.incrementScans();

      // ── Load details in background ────────────────────────────────────────
      const langAtDetails = lang;
      fetchDetails(analysisWithShops, langAtDetails)
        .then((details) => {
          setDetailsFetched(true);
          setResult(prev => {
            if (!prev) return prev;
            const merged: AnalysisResult = { ...prev, ...details };
            originalResult.current = merged;
            translationCache.current.set(langAtDetails, merged);
            return merged;
          });
        })
        .catch((e) => console.warn('[scan] background details failed:', e));

      const totalScans = parseInt(localStorage.getItem('totalScanCount') ?? '0', 10) + 1;
      localStorage.setItem('totalScanCount', String(totalScans));
      if (totalScans % 5 === 0) setTimeout(() => setIsSurveyOpen(true), 1500);
      posthog.capture('scan_completed', { product_name: analysis.productName, brand: analysis.brand, lang });
    } catch (err) {
      console.error('[handleAnalyze] error:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`${t[lang].error}${message ? ` — ${message}` : ''}`);
      posthog.capture('scan_error', { lang, message });
    } finally {
      setScanHistoryKey(k => k + 1);
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setScanPhotoUrl(null);
    setResult(null);
    setConsent(false);
    setError(null);
    setIsSharedView(false);
    originalResult.current = null;
    translationCache.current = new Map();
    if (fileInputRef.current) fileInputRef.current.value = '';
    setInputKey(k => k + 1);
    window.history.replaceState({}, '', window.location.pathname);
    triggerFirstScan();
  };

  const handleShare = async () => {
    if (!result) return;
    setIsSharing(true);
    try {
      const { data, error } = await supabase.from('shared_results').insert({ result }).select('id').single();
      if (error || !data) throw new Error('Failed to save');
      const shareUrl = `${window.location.origin}?share=${data.id}`;
      const shareText = `${result.productName} by ${result.brand}\n\n${result.analysis}`;
      if (navigator.share) {
        await navigator.share({ title: result.productName, text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (_) {
      await navigator.clipboard.writeText(window.location.href).catch(() => {});
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareApp = async () => {
    const url = window.location.origin;
    const shareText = `${t[lang].shareAppMessage} ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t[lang].title, text: t[lang].shareAppMessage, url });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareAppCopied(true);
        setTimeout(() => setShareAppCopied(false), 2000);
      }
    } catch (_) {
      try {
        await navigator.clipboard.writeText(shareText);
        setShareAppCopied(true);
        setTimeout(() => setShareAppCopied(false), 2000);
      } catch {}
    }
  };

  const handleDismissDisclaimer = () => {
    setDisclaimerDismissed(true);
    localStorage.setItem('disclaimerDismissed', 'true');
  };

  const cl = t[lang].collapse;

  // Preference-match score for the "Обрати внимание" header badge (🟢/🟡/🔴).
  // Memoized at the card level so the O(n×m) ingredient×criterion pass runs
  // only when the composition, profile, or language changes — not on every
  // unrelated re-render (typing in AskAI, toggling other sections, etc.).
  // The section body (PersonalAnalysis) memoizes its own copy the same way,
  // so the heavy table is no longer computed twice per render.
  const notePreferenceScore = useMemo<number | null>(() => {
    if (!result || !userProfile || !result.ingredients?.length) return null;
    return computePreferenceTable(
      result.ingredients, userProfile, result.productType ?? '', lang,
    ).score;
  }, [result, userProfile, lang]);

  /* Subscription page */
  if (showSubscriptionPage && user) {
    return (
      <SubscriptionPage
        user={user}
        subscription={subscription}
        lang={lang}
        onBack={() => {
          setShowSubscriptionPage(false);
          window.history.replaceState({}, '', window.location.pathname);
          // Check if subscription was canceled in portal
          subscription.refresh().then(() => {
            if (!subscription.isPremium) {
              setShowCancelPremium(true);
            }
          });
        }}
        onUpgrade={() => {
          setShowSubscriptionPage(false);
          setPaywallReason('scans');
        }}
      />
    );
  }

  /* ── RENDER ── */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F0E8' }}>

      {/* ── HEADER ── */}
      <header style={{ background: '#FAF7F2', borderBottom: '0.5px solid #DDD5C8', padding: '48px 20px 20px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', minWidth: 0 }}>
            {user && (
              <>
                <ScanHistory
                  user={user} lang={lang} refreshKey={scanHistoryKey}
                  onSelect={async (r, scanLang) => {
                    // Rebuild the FULL canonical card (list + order + scores),
                    // not just merge scores by name — so history shows exactly
                    // the same composition and badge as a fresh scan.
                    if (r.brand && r.productName) {
                      const canonical = await getCanonicalScore(r.brand, r.productName).catch(() => null);
                      if (canonical) {
                        r = { ...r, ingredients: applyCanonicalCard(r.ingredients, canonical), canonicalScore: canonical.score };
                      }
                    }
                    originalResult.current = r;
                    const sourceLang = (scanLang ?? lang) as Language;
                    translationCache.current = new Map([[sourceLang, r]]);
                    setResult(r);
                    setShowDetails(false);
                    if (scanLang && scanLang !== lang) void setLang(scanLang as Language);
                  }}
                />
                <UserProfilePanel
                  user={user} lang={lang} onProfileChange={setUserProfile}
                  initialHasProfile={!!userProfile}
                  externalOpen={isProfileOpen} onExternalOpenChange={setIsProfileOpen}
                />
                <button
                  onClick={() => setShowSubscriptionPage(true)}
                  style={{
                    fontSize: '0.55rem', padding: '5px 8px', flexShrink: 0,
                    border: `1px solid ${subscription.isPremium ? '#B8923A' : '#DDD5C8'}`,
                    background: subscription.isPremium ? 'rgba(184,146,58,0.08)' : 'transparent',
                    color: subscription.isPremium ? '#B8923A' : '#8A8078',
                    fontFamily: 'var(--font-sans)', letterSpacing: '0.1em',
                    textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!subscription.isPremium) e.currentTarget.style.borderColor = '#2D5A3D'; }}
                  onMouseLeave={e => { if (!subscription.isPremium) e.currentTarget.style.borderColor = '#DDD5C8'; }}
                >
                  {subscription.isPremium ? '✦ Premium' : 'Upgrade'}
                </button>
              </>
            )}
            <AuthButton lang={lang} onUserChange={(u) => {
              setUser(u);
              if (u) {
                posthog.identify(u.id, { email: u.email });
                supabase.from('user_profiles').select('profile').eq('user_id', u.id).maybeSingle()
                  .then(({ data }) => { if (data?.profile) setUserProfile(data.profile as UserProfile); });
              } else {
                posthog.reset();
                setUserProfile(null);
              }
            }} />
          </div>
        </div>

        <LanguageSelector
          currentLang={lang}
          onSelect={setLang}
          logo={<img src={logo} alt="logo" style={{ width: 30, height: 30, objectFit: 'contain' }} />}
        />

        {/* Hero — hidden once a product card is shown (redundant above the card) */}
        {!result && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ marginTop: 28, marginBottom: 8, textAlign: 'center' }}
        >
          <p style={{ fontSize: '0.58rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#8A8078', marginBottom: 10, fontFamily: 'var(--font-sans)', fontWeight: 400 }}>
            {t[lang].subtitle}
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.2rem, 8vw, 3.2rem)', fontWeight: 300, color: '#1A1410', lineHeight: 1.1, letterSpacing: '0.05em' }}>
            {t[lang].title}
          </h1>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="gold-btn"
              style={{ padding: '12px 28px', display: 'inline-flex', alignItems: 'center', gap: 10 }}
            >
              <span style={{ fontSize: 9 }}>✦</span>
              <span>{t[lang].userGuide}</span>
              <span style={{ fontSize: 9 }}>✦</span>
            </button>
          </div>
        </motion.div>
        )}

        {/* Gold ornament divider — only on the upload screen, with the hero */}
        {!result && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <div style={{ height: '0.5px', width: 48, background: 'linear-gradient(to right, transparent, #B8923A)' }} />
          <span style={{ color: '#B8923A', fontSize: 10 }}>✦</span>
          <div style={{ height: '0.5px', width: 48, background: 'linear-gradient(to left, transparent, #B8923A)' }} />
        </div>
        )}
      </header>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px 40px' }}>
        <AnimatePresence mode="wait">

          {/* ── UPLOAD PANEL ── */}
          {!result ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.4 }}
              className="luxury-card"
              style={{ width: '100%', maxWidth: 440, padding: '36px 32px' }}
            >
              {!previewUrl && (
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <p style={{ fontSize: '0.875rem', color: '#8A8078', lineHeight: 1.8, fontFamily: 'var(--font-sans)', fontWeight: 400 }}>
                    {t[lang].description}
                  </p>
                </div>
              )}

              {/* Upload zone */}
              <div
                className="upload-zone"
                style={{ aspectRatio: '5/2', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} referrerPolicy="no-referrer" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '1px solid #2D5A3D', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <Camera size={18} strokeWidth={1} color="#2D5A3D" />
                    </div>
                    <span style={{ fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', color: '#8A8078' }}>
                      {t[lang].uploadPhoto}
                    </span>
                  </div>
                )}
              </div>

              <input key={inputKey} type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />

              {!previewUrl && (
                <div style={{ marginTop: 14 }}>
                  <button
                    onClick={handleShareApp}
                    className="luxury-btn"
                    style={{ width: '100%', padding: 14 }}
                  >
                    <Share2 size={13} />
                    <span>{shareAppCopied ? t[lang].shareAppCopied : t[lang].shareApp}</span>
                  </button>
                </div>
              )}

              {previewUrl && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{ marginTop: 24 }}
                >
                  {/* Consent */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="luxury-check"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#5A5550', lineHeight: 1.7, fontFamily: 'var(--font-sans)' }}>
                      {t[lang].consent}
                    </span>
                  </label>
                  <p style={{ fontSize: '0.65rem', color: 'rgba(138,128,120,0.7)', marginBottom: 16, marginLeft: 24, fontFamily: 'var(--font-sans)' }}>
                    {t[lang].consentWithdrawal}
                  </p>

                  {error && (
                    <div style={{ color: '#991B1B', fontSize: '0.8rem', background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={!consent || isAnalyzing}
                    className="luxury-btn"
                    style={{ width: '100%', padding: 16 }}
                  >
                    {isAnalyzing ? (
                      <><RefreshCw className="animate-spin" size={14} /><span>{t[lang].loading}</span></>
                    ) : (
                      <span>{t[lang].analyzeProduct}</span>
                    )}
                  </button>
                </motion.div>
              )}
            </motion.div>

          ) : (

            /* ── RESULTS PANEL ── */
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="luxury-card"
              style={{ width: '100%', maxWidth: 680 }}
            >
              {/* ── MEDICAL DISCLAIMER BANNER (dismissible, persists via localStorage) ── */}
              {!disclaimerDismissed && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '14px 18px',
                  background: '#FBF3D9',
                  borderBottom: '0.5px solid #E0B84A',
                }}>
                  <span role="img" aria-label="warning" style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1.4 }}>⚠️</span>
                  <p style={{
                    flex: 1,
                    margin: 0,
                    fontSize: '0.72rem',
                    lineHeight: 1.6,
                    color: '#6B5418',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {DISCLAIMER_BANNER_TEXT[lang] ?? DISCLAIMER_BANNER_TEXT.en}
                  </p>
                  <button
                    onClick={handleDismissDisclaimer}
                    aria-label="Dismiss"
                    style={{
                      flexShrink: 0,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: '#9A7B2A',
                      lineHeight: 0,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Product header */}
              <div style={{ padding: '32px 32px 24px', textAlign: 'center', borderBottom: '0.5px solid #DDD5C8' }}>
                {isSharedView && (
                  <div style={{
                    marginBottom: 20,
                    padding: '12px 14px',
                    background: '#E8F2EB',
                    border: '0.5px solid #2D5A3D',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <p style={{ fontSize: '0.72rem', color: '#2D5A3D', lineHeight: 1.5, margin: 0, fontFamily: 'var(--font-sans)' }}>
                      {t[lang].sharedViewBanner}
                    </p>
                    <button
                      onClick={handleReset}
                      className="luxury-btn"
                      style={{ padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      <Camera size={13} strokeWidth={1.5} />
                      <span>{t[lang].sharedViewScan}</span>
                    </button>
                  </div>
                )}

                <p style={{ fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#8A8078', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>
                  {t[lang].ingredientAnalysis}
                </p>

                <ProductHeroImage name={result.productName} brand={result.brand} userPhoto={scanPhotoUrl} />

                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 300, color: '#1A1410', marginBottom: 6, letterSpacing: '0.04em' }}>
                  {originalResult.current?.productName ?? result.productName}
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#8A8078', fontStyle: 'italic', letterSpacing: '0.08em', fontFamily: 'var(--font-serif)' }}>
                  {originalResult.current?.brand ?? result.brand}
                </p>

                {isTranslating && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#2D5A3D', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    <Loader2 size={11} className="animate-spin" />
                    {t[lang].translating}
                  </div>
                )}
              </div>

              {/* Sections — full analysis (Stage 2). Stage 1 is a modal overlay
                  rendered separately; heavy sections here stay unmounted until
                  the user taps "See details". */}
              <div>
                {showDetails && (<>
                <CollapsibleSection title={t[lang].analysis} icon={<ShieldCheck size={15} />} defaultOpen collapseLabel={cl}>
                  <div className="prose-luxury"><ReactMarkdown>{result.analysis}</ReactMarkdown></div>
                </CollapsibleSection>

                <CollapsibleSection
                  title={t[lang].ingredients}
                  icon={<Leaf size={15} />}
                  collapseLabel={cl}
                  headerBadge={<ScoreBadge score={result.canonicalScore ?? computeProductScore(result.ingredients)} />}
                >
                      {result.ingredients.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: '#8A8078', fontStyle: 'italic' }}>
                          {lang === 'ru' ? 'Состав не найден. Сфотографируйте этикетку с INCI-списком крупным планом.' :
                           lang === 'uk' ? 'Склад не знайдено. Сфотографуйте етикетку зі списком INCI великим планом.' :
                           lang === 'de' ? 'Inhaltsstoffe nicht gefunden. Fotografieren Sie bitte das INCI-Etikett in Nahaufnahme.' :
                           lang === 'es' ? 'Ingredientes no encontrados. Fotografíe la etiqueta INCI de cerca.' :
                           lang === 'fr' ? "Ingrédients introuvables. Photographiez l'étiquette INCI en gros plan." :
                           lang === 'it' ? "Ingredienti non trovati. Fotografa l'etichetta INCI da vicino." :
                           lang === 'tr' ? 'İçerikler bulunamadı. Lütfen INCI etiketini yakından fotoğraflayın.' :
                           'Ingredients not found. Please photograph the INCI label up close.'}
                        </p>
                      ) : (
                        <>
                          {/* Numeric score is intentionally hidden — the verdict emoji in
                              the section header is derived from it. Here we only explain
                              what the per-ingredient 🟢/🟡/🔴 marks mean. */}
                          <IngredientLegend lang={lang} score={result.canonicalScore ?? computeProductScore(result.ingredients)} />
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {result.ingredients.map((ing, idx) => (
                              <IngredientItem key={`${ing.name}-${idx}`} ing={ing} lang={lang} />
                            ))}
                          </ul>
                        </>
                      )}
                    </CollapsibleSection>

                <CollapsibleSection
                  title={t[lang].noteSection}
                  icon={<NotebookPen size={15} />}
                  collapseLabel={cl}
                  headerBadge={(() => {
                    // Uses the card-level memoized score (see notePreferenceScore) —
                    // shown ONLY as a 🟢/🟡/🔴 verdict, never as a number.
                    if (notePreferenceScore === null) return null;
                    return <span style={{ fontSize: '1.05rem', lineHeight: 1 }} aria-hidden>{verdictEmoji100(notePreferenceScore)}</span>;
                  })()}
                >
                  <PersonalAnalysis
                    lang={lang} result={result} user={user} userProfile={userProfile}
                    canUseNote={subscription.canScan}
                    onLimitReached={() => setPaywallReason('scans')}
                    onUsed={subscription.incrementNoteAnalysis}
                    onOpenProfile={() => setIsProfileOpen(true)}
                  />

                </CollapsibleSection>

                <CollapsibleSection
                  title={t[lang].productInfo}
                  icon={<Info size={15} />}
                  collapseLabel={cl}
                  onOpen={() => {
                    if (detailsFetched || !result) return;
                    if (result.usage && result.benefits) {
                      setDetailsFetched(true);
                      return;
                    }
                    setDetailsFetched(true);
                    fetchDetails(result, lang)
                      .then((details) => {
                        setResult(prev => {
                          if (!prev) return prev;
                          const merged: AnalysisResult = { ...prev, ...details };
                          originalResult.current = merged;
                          translationCache.current.set(lang, merged);
                          return merged;
                        });
                      })
                      .catch((e) => console.warn('[productInfo] fetchDetails failed:', e));
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <CollapsibleSection title={t[lang].usage} icon={<Info size={15} />} collapseLabel={cl}>
                      {result.usage
                        ? <UsageSection text={result.usage} shelfLife={result.shelfLife} shelfLifeLabel={t[lang].shelfLife} />
                        : <LoadingPlaceholder lang={lang} />}
                    </CollapsibleSection>

                    <CollapsibleSection title={t[lang].benefits} icon={<Sparkles size={15} />} collapseLabel={cl}>
                      {result.benefits
                        ? <BenefitsSection text={result.benefits} />
                        : <LoadingPlaceholder lang={lang} />}
                    </CollapsibleSection>

                    <CollapsibleSection title={t[lang].sideEffects} icon={<AlertTriangle size={15} />} collapseLabel={cl}>
                      {result.sideEffects
                        ? <BenefitsSection text={result.sideEffects} />
                        : <LoadingPlaceholder lang={lang} />}
                    </CollapsibleSection>

                    <CollapsibleSection title={t[lang].warnings} icon={<AlertCircle size={15} />} collapseLabel={cl}>
                      {result.warnings
                        ? <div className="prose-luxury"><ReactMarkdown>{result.warnings}</ReactMarkdown></div>
                        : <LoadingPlaceholder lang={lang} />}
                    </CollapsibleSection>

                    <CollapsibleSection title={t[lang].interactions} icon={<Zap size={15} />} collapseLabel={cl}>
                      {result.interactions
                        ? <BenefitsSection text={result.interactions} />
                        : <LoadingPlaceholder lang={lang} />}
                    </CollapsibleSection>

                    <CollapsibleSection title={t[lang].alternatives} icon={<RefreshCw size={15} />} collapseLabel={cl}>
                      {result.alternatives && result.alternatives.length > 0
                        ? <AlternativesSection alternatives={result.alternatives} />
                        : <LoadingPlaceholder lang={lang} />}
                    </CollapsibleSection>

                    <CollapsibleSection title={t[lang].askAi} icon={<Sparkles size={15} />} collapseLabel={cl}>
                      <AskAI
                        lang={lang}
                        context={result}
                        user={user}
                        isPremium={subscription.isPremium}
                        canAskAi={subscription.canAskAi}
                        usageAskAi={subscription.usage.askAi}
                        maxAskAi={subscription.limits.askAiPerDay}
                        onLimitReached={() => setPaywallReason('askAi')}
                        onIncrementAskAi={subscription.incrementAskAi}
                        onRegister={() => {
                          const btn = document.querySelector('[data-auth-button]') as HTMLElement;
                          btn?.click();
                        }}
                      />
                    </CollapsibleSection>
                  </div>
                </CollapsibleSection>


                {/* Compare and WhereToBuy mount lazily (after browser idle) — not on critical path */}
                {secondaryReady && (
                  <>
                    <CollapsibleSection title={t[lang].whereToBuy} icon={<ShoppingCart size={15} />} collapseLabel={cl}>
                      <WhereToBuy lang={lang} shopLinks={result.shopLinks ?? []} productName={`${result.brand} ${result.productName}`.trim()} />
                    </CollapsibleSection>
                  </>
                )}
                </>)}
              </div>

              {/* Footer actions — only in the expanded (details) view */}
              {showDetails && (
              <div style={{ padding: '20px 28px 32px', borderTop: '0.5px solid #DDD5C8' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.7rem', color: 'rgba(138,128,120,0.7)', marginBottom: 20, lineHeight: 1.7 }}>
                  <span style={{ flexShrink: 0 }}>⚠</span>
                  <span>{t[lang].aiDisclaimer}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="luxury-btn"
                    style={{ width: '100%', padding: 14 }}
                  >
                    {isSharing ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
                    <span>{captionCopied ? t[lang].captionCopied : t[lang].share}</span>
                  </button>
                  <button
                    onClick={handleReset}
                    className="outline-btn"
                    style={{ width: '100%', padding: 13 }}
                  >
                    {t[lang].anotherProduct}
                  </button>
                </div>
              </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 1 — preview modal shown right after a scan, before the full
            card is revealed. Buttons: "See details" opens the full analysis
            (data warmed in the background); "Another product" resets. */}
        <AnimatePresence>
          {result && !showDetails && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.target === e.currentTarget && handleReset()}
              style={{ background: 'rgba(44,62,50,0.55)', backdropFilter: 'blur(4px)' }}
            >
              <motion.div
                initial={{ opacity: 0, y: 32, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="luxury-card w-full max-w-sm overflow-hidden relative"
              >
                {/* Close (X) — back to scanning */}
                <button
                  onClick={handleReset}
                  aria-label="Close"
                  style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', color: '#8A8078', zIndex: 2 }}
                >
                  <X size={16} />
                </button>

                <div style={{ height: 2, background: 'linear-gradient(to right, transparent, #B8923A, transparent)' }} />

                <div className="p-7 flex flex-col gap-5">
                  {/* Leaf + name + brand */}
                  <div className="text-center">
                    <span className="text-3xl">🌿</span>
                    <h2 className="font-serif text-2xl text-[#1A1410] mt-2 leading-snug" style={{ letterSpacing: '0.04em', fontWeight: 300 }}>
                      {originalResult.current?.productName ?? result.productName}
                    </h2>
                    <p style={{ fontSize: '0.72rem', color: '#8A8078', fontStyle: 'italic', letterSpacing: '0.08em', fontFamily: 'var(--font-serif)', marginTop: 4 }}>
                      {originalResult.current?.brand ?? result.brand}
                    </p>
                  </div>

                  {/* Divider */}
                  <div style={{ height: '0.5px', background: 'linear-gradient(to right, transparent, #D4C3A3, transparent)' }} />

                  {/* Analysis text */}
                  <div className="prose-luxury"><ReactMarkdown>{result.analysis}</ReactMarkdown></div>

                  {isTranslating && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#2D5A3D', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                      <Loader2 size={11} className="animate-spin" />
                      {t[lang].translating}
                    </div>
                  )}

                  {/* Action */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={() => setShowDetails(true)} className="luxury-btn" style={{ width: '100%', padding: 14 }}>
                      <span>{t[lang].showDetails}</span>
                      <ChevronDown size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '20px 16px', textAlign: 'center', borderTop: '0.5px solid #DDD5C8', background: '#FAF7F2' }}>
        <p style={{ fontSize: '0.6rem', color: '#8A8078', marginBottom: 10, letterSpacing: '0.08em', fontFamily: 'var(--font-sans)' }}>
          {t[lang].footerText}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center' }}>
          {[
            { label: t[lang].privacyPolicy, action: () => setIsPrivacyOpen(true) },
            { label: t[lang].agb, action: () => setIsAgbOpen(true) },
            { label: t[lang].impressum, action: () => setIsImpressumOpen(true) },
          ].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: '#DDD5C8', fontSize: '0.5rem' }}>◆</span>}
              <button
                onClick={item.action}
                style={{
                  fontSize: '0.58rem', color: '#8A8078', letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  textDecoration: 'underline', textDecorationColor: 'rgba(45,90,61,0.3)', textUnderlineOffset: 3,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1A1410')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8A8078')}
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      </footer>

      {/* ── MODALS & OVERLAYS ── */}
      <LoadingScreen isVisible={isAnalyzing} lang={lang} currentStep={0} />
      <CookieBanner lang={lang} onOpenPrivacy={() => setIsPrivacyOpen(true)} />

      <LegalModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} title={t[lang].privacyPolicy} content={<PrivacyPolicyContent lang={lang} />} />
      <LegalModal isOpen={isAgbOpen} onClose={() => setIsAgbOpen(false)} title={t[lang].agb} content={<AGBContent lang={lang} />} />
      <LegalModal isOpen={isImpressumOpen} onClose={() => setIsImpressumOpen(false)} title={t[lang].impressum} content={<ImpressumContent />} />

      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} lang={lang} />

      <PaywallModal
        isOpen={paywallReason !== null}
        onClose={() => setPaywallReason(null)}
        onUpgrade={() => { setPaywallReason(null); setShowSubscriptionPage(true); }}
        lang={lang}
        reason={paywallReason ?? 'scans'}
        userId={user?.id}
      />

      <WelcomePremiumModal
        isOpen={showWelcomePremium}
        onClose={() => {
          setShowWelcomePremium(false);
          window.history.replaceState({}, '', window.location.pathname);
        }}
        lang={lang}
      />

      <CancelPremiumModal
        isOpen={showCancelPremium}
        onClose={() => setShowCancelPremium(false)}
        lang={lang}
      />

      <FeedbackSurvey
        isOpen={isSurveyOpen}
        onClose={() => setIsSurveyOpen(false)}
        lang={lang}
        userId={user?.id}
      />

      {/* ── WELCOME SCREEN — first visit, unauthenticated only ── */}
      {showWelcome && (
        <WelcomeScreen
          lang={lang}
          onScan={() => fileInputRef.current?.click()}
          onClose={dismissWelcome}
        />
      )}

      {/* ── FIRST SCAN MODAL — shown once after first scan on reset ── */}
      {showFirstScan && (
        <FirstScanModal lang={lang} onClose={dismissFirstScan} />
      )}
    </div>
  );
}
