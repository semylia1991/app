import logo from './logo.png'
import posthog from 'posthog-js'
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, AlertCircle, ShieldCheck, Leaf, Info, Sparkles, AlertTriangle, Zap, Clock, RefreshCw, Loader2, Share2, NotebookPen, ShoppingCart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { User } from '@supabase/supabase-js';

import { t, Language } from './i18n';
import { analyzeProductImage, AnalysisResult, ShopLink, translateAnalysisResult, SerializedProfile } from './services/ai';
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
import { PersonalAnalysis } from './components/PersonalAnalysis';
import { PaywallModal } from './components/PaywallModal';
import { FeedbackSurvey } from './components/FeedbackSurvey';
import { useSubscription } from './hooks/useSubscription';
import { SubscriptionPage } from './components/SubscriptionPage';

function splitParagraphs(text: string): string[] {
  return text.split('\n\n').map(s => s.trim()).filter(Boolean);
}

function UsageSection({ text }: { text: string }) {
  const blocks = splitParagraphs(text);
  return (
    <div className="space-y-3 text-sm text-[#4A4A4A]">
      {blocks.map((block, i) => {
        const colonIdx = block.indexOf(':');
        if (colonIdx !== -1) {
          const rawLabel = block.slice(0, colonIdx + 1);
          const emoji = rawLabel.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u)?.[0] ?? '';
          const label = rawLabel.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u, '');
          const body = block.slice(colonIdx + 1).trim();
          return (
            <p key={i}>
              {emoji && <span className="mr-1">{emoji}</span>}
              <strong className="text-[#2C3E50]">{label}</strong>
              {body ? ' ' + body : ''}
            </p>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}

function BenefitsSection({ text }: { text: string }) {
  const blocks = splitParagraphs(text);
  return (
    <div className="space-y-3 text-sm text-[#4A4A4A]">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;
        const header = lines[0];
        const rest = lines.slice(1);
        const isHeader = /[：:]$/.test(header) || /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/u.test(header);
        if (isHeader) {
          return (
            <div key={i}>
              <p className="font-bold text-[#2C3E50] mb-1">{header}</p>
              {rest.map((line, j) => (
                <p key={j} className="ml-2">{line}</p>
              ))}
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
    <div className="flex justify-center mb-4">
      <div className="w-28 h-28 rounded-sm border border-[#D4C3A3] bg-[#F5F0E8] overflow-hidden flex items-center justify-center shadow-sm">
        {state === 'loading' && (
          <div className="w-6 h-6 rounded-full border-2 border-[#B89F7A]/30 border-t-[#B89F7A] animate-spin" />
        )}
        {state === 'loaded' && src && (
          <img src={src} alt={name} className="w-full h-full object-contain p-2" onError={() => setState('error')} />
        )}
      </div>
    </div>
  );
}

// ── Shop config ───────────────────────────────────────────────────────────────

interface ShopConfig {
  platform: string;
  favicon: string;
  encoding: 'plus' | 'pct';
  buildUrl: (q: string) => string;
}

const SHOP_CONFIGS: ShopConfig[] = [
  {
    platform: 'Google Shopping',
    favicon: 'https://www.google.com/favicon.ico',
    encoding: 'plus',
    buildUrl: (q) => `https://www.google.com/search?q=${q}&tbm=shop`,
  },
];

function buildShopLinks(productName: string, brand: string): ShopLink[] {
  const combined = [brand, productName].filter(Boolean).join(' ').trim();
  if (!combined) return [];
  const qPlus = combined.split(/\s+/).join('+');
  const qPct  = encodeURIComponent(combined);
  return SHOP_CONFIGS.map(({ platform, favicon, encoding, buildUrl }) => ({
    platform,
    favicon,
    url: buildUrl(encoding === 'plus' ? qPlus : qPct),
  }));
}

// ── main component ────────────────────────────────────────────────────────────

export default function App() {
  const [lang, setLang]               = useState<Language>('en');
  const [file, setFile]               = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [scanPhotoUrl, setScanPhotoUrl] = useState<string | null>(null);
  const [consent, setConsent]         = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult]           = useState<AnalysisResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [user, setUser]               = useState<User | null>(null);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [isPrivacyOpen, setIsPrivacyOpen]     = useState(false);
  const [isImpressumOpen, setIsImpressumOpen] = useState(false);
  const [isAgbOpen, setIsAgbOpen]             = useState(false);
  const [isSurveyOpen, setIsSurveyOpen]       = useState(false);
  const [isGuideOpen, setIsGuideOpen]         = useState(false);
  const [copied, setCopied]                   = useState(false);
  const [captionCopied, setCaptionCopied]     = useState(false);
  const [isSharing, setIsSharing]             = useState(false);

  const subscription = useSubscription(user);
  const [paywallReason, setPaywallReason] = useState<'scans' | 'note' | 'askAi' | null>(null);
  const [showSubscriptionPage, setShowSubscriptionPage] = useState<boolean>(
    () => window.location.search.includes('portal=return')
  );

  const fileInputRef      = useRef<HTMLInputElement>(null);
  const isFirstRender     = useRef(true);
  const originalResult    = useRef<AnalysisResult | null>(null);
  const translationCache  = useRef<Map<Language, AnalysisResult>>(new Map());

  useEffect(() => {
    const shareId = new URLSearchParams(window.location.search).get('share');
    if (!shareId) return;
    setSharedLoading(true);
    supabase
      .from('shared_results').select('result').eq('id', shareId).single()
      .then(({ data }) => {
        if (data?.result) {
          const r = data.result as AnalysisResult;
          originalResult.current = r;
          translationCache.current = new Map([[lang, r]]);
          setResult(r);
        }
        setSharedLoading(false);
      });
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

  const saveScanToHistory = async (analysis: AnalysisResult) => {
    if (!user) return;
    await supabase.from('scan_history').insert({
      user_id: user.id,
      product_name: analysis.productName,
      brand: analysis.brand,
      result: analysis,
    });
  };

  const handleAnalyze = async () => {
    if (!previewUrl || !consent) return;
    if (!subscription.canScan) {
      setPaywallReason('scans');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
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
              climate:         p.climate.join(', ')          || undefined,
            };
          })()
        : undefined;
      const analysis = await analyzeProductImage(previewUrl, mimeType, lang, serializedProfile);
      const analysisWithShops: AnalysisResult = {
        ...analysis,
        shopLinks: buildShopLinks(analysis.productName, analysis.brand),
      };
      originalResult.current = analysisWithShops;
      translationCache.current = new Map([[lang, analysisWithShops]]);
      setResult(analysisWithShops);
      setScanPhotoUrl(previewUrl);
      setFile(null);
      setPreviewUrl(null);
      await saveScanToHistory(analysis);
      await subscription.incrementScans();
      if (userProfile && analysisWithShops.personalNote) {
        await subscription.incrementNoteAnalysis();
      }
      // Show feedback survey every 5th scan
      const totalScans = parseInt(localStorage.getItem('totalScanCount') ?? '0', 10) + 1;
      localStorage.setItem('totalScanCount', String(totalScans));
      if (totalScans % 5 === 0) {
        setTimeout(() => setIsSurveyOpen(true), 1500);
      }
      posthog.capture('scan_completed', { product_name: analysis.productName, brand: analysis.brand, lang });
    } catch (err) {
      console.error(err);
      setError(t[lang].error);
      posthog.capture('scan_error', { lang });
    } finally {
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
    originalResult.current = null;
    translationCache.current = new Map();
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

  const cl = t[lang].collapse;

  if (showSubscriptionPage && user) {
    return (
      <SubscriptionPage
        user={user}
        subscription={subscription}
        lang={lang}
        onBack={() => {
          setShowSubscriptionPage(false);
          window.history.replaceState({}, '', window.location.pathname);
          subscription.refresh();
        }}
        onUpgrade={() => {
          setShowSubscriptionPage(false);
          setPaywallReason('scans');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-32 bg-gradient-to-b from-[#B89F7A]/10 to-transparent pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#B89F7A]/10 to-transparent pointer-events-none z-0" />

      <header className="pt-6 pb-4 px-4 text-center relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <img src={logo} alt="logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <div className="flex items-center gap-2">
            {user && (
              <>
                <ScanHistory
                  user={user}
                  lang={lang}
                  onSelect={(r) => {
                    originalResult.current = r;
                    translationCache.current = new Map([[lang, r]]);
                    setResult(r);
                  }}
                />
                <UserProfilePanel user={user} lang={lang} onProfileChange={setUserProfile} initialHasProfile={!!userProfile} />
                <button
                  onClick={() => setShowSubscriptionPage(true)}
                  className={`text-xs px-2.5 py-1 border rounded-sm transition-colors font-serif tracking-wide ${
                    subscription.isPremium
                      ? 'border-[#B89F7A] text-[#B89F7A] hover:bg-[#B89F7A] hover:text-white'
                      : 'border-[#D4C3A3] text-[#8A8A8A] hover:border-[#B89F7A] hover:text-[#B89F7A]'
                  }`}
                  title="Управление подпиской"
                >
                  {subscription.isPremium ? '✦ Premium' : 'Upgrade'}
                </button>
              </>
            )}
            <AuthButton lang={lang} onUserChange={(u) => {
              setUser(u);
              if (u) {
                posthog.identify(u.id, { email: u.email });
                supabase
                  .from('user_profiles')
                  .select('profile')
                  .eq('user_id', u.id)
                  .single()
                  .then(({ data }) => {
                    if (data?.profile) setUserProfile(data.profile as UserProfile);
                  });
              } else {
                posthog.reset();
                setUserProfile(null);
              }
            }} />
          </div>
        </div>

        <LanguageSelector currentLang={lang} onSelect={setLang} />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 mb-2">
          <h2 className="text-xs font-serif tracking-[0.3em] text-[#B89F7A] uppercase mb-2">{t[lang].subtitle}</h2>
          <h1 className="text-4xl md:text-5xl font-serif text-[#2C3E50] tracking-wide">{t[lang].title}</h1>
          <div className="mt-4">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[#B89F7A] text-[10px] tracking-[0.25em] uppercase text-[#B89F7A] hover:bg-[#B89F7A] hover:text-white transition-all duration-200"
            >
              <span>✦</span>
              {t[lang].userGuide}
              <span>✦</span>
            </button>
          </div>
        </motion.div>
        <div className="w-24 h-[1px] bg-[#D4C3A3] mx-auto mt-6" />
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4 relative">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#FDFBF7] regency-border p-8 shadow-xl"
            >
              <div className="text-center mb-6">
                <p className="text-xs text-[#B89F7A] leading-relaxed mt-3 px-4 font-bold">
                  {t[lang].description}
                </p>
              </div>

              {/* Clickable upload zone */}
              <div
                className="relative aspect-[5/2] border-2 border-dashed border-[#D4C3A3] rounded-sm overflow-hidden bg-[#FDFBF7] cursor-pointer hover:border-[#B89F7A] hover:bg-[#B89F7A]/5 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[#B89F7A]">
                    <Camera size={40} strokeWidth={1} className="mb-3 opacity-50" />
                    <span className="font-serif text-xs tracking-widest uppercase opacity-60">{t[lang].uploadPhoto}</span>
                  </div>
                )}
              </div>

              {/* Hidden input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {previewUrl && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 space-y-4"
                >
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-1">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="peer appearance-none w-4 h-4 border border-[#B89F7A] rounded-sm checked:bg-[#B89F7A] transition-colors cursor-pointer"
                      />
                      <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-xs text-[#4A4A4A] leading-relaxed group-hover:text-[#2C3E50] transition-colors">
                      {t[lang].consent}
                    </span>
                  </label>
                  <p className="text-[10px] text-[#B89F7A]/80 leading-relaxed -mt-2 pl-7">
                    {t[lang].consentWithdrawal}
                  </p>

                  {error && (
                    <div className="text-red-800 text-xs bg-red-50 p-3 border border-red-200 rounded-sm flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={!consent || isAnalyzing}
                    className="w-full py-4 regency-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        <span className="tracking-widest">{t[lang].loading}</span>
                      </>
                    ) : (
                      <span className="tracking-widest">{t[lang].analyzeProduct}</span>
                    )}
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl bg-[#FDFBF7] regency-border p-6 md:p-10 shadow-xl"
            >
              <div className="text-center mb-8 border-b border-[#D4C3A3] pb-6">
                <h2 className="text-sm font-serif tracking-[0.2em] text-[#B89F7A] uppercase mb-4">
                  {t[lang].ingredientAnalysis}
                </h2>

                {/* Medical disclaimer — small text at bottom of every result */}
                <h3 className="text-2xl font-serif text-[#2C3E50] mb-1">{result.productName}</h3>
                <p className="text-sm text-[#4A4A4A] italic">{result.brand}</p>
                {isTranslating && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-[#B89F7A] text-[10px] uppercase tracking-widest">
                    <Loader2 size={12} className="animate-spin" />
                    {t[lang].translating}
                  </div>
                )}
              </div>

              <div className="space-y-2">

                <CollapsibleSection title={t[lang].analysis} icon={<ShieldCheck size={20} />} defaultOpen collapseLabel={cl}>
                  <div className="prose prose-sm prose-stone max-w-none">
                    <ReactMarkdown>{result.analysis}</ReactMarkdown>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].noteSection} icon={<NotebookPen size={20} />} collapseLabel={cl}>
                  <PersonalAnalysis
                    lang={lang}
                    result={result}
                    userProfile={userProfile}
                    canUseNote={subscription.canScan}
                    onLimitReached={() => setPaywallReason('scans')}
                    onUsed={subscription.incrementNoteAnalysis}
                  />
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].ingredients} icon={<Leaf size={20} />} collapseLabel={cl}>
                  {result.ingredients.length === 0 ? (
                    <p className="text-xs text-[#B89F7A] italic">
                      {lang === 'ru' ? 'Состав не найден. Сфотографируйте этикетку с INCI-списком крупным планом.' :
                       lang === 'uk' ? 'Склад не знайдено. Сфотографуйте етикетку зі списком INCI великим планом.' :
                       lang === 'de' ? 'Inhaltsstoffe nicht gefunden. Fotografieren Sie bitte das INCI-Etikett in Nahaufnahme.' :
                       lang === 'es' ? 'Ingredientes no encontrados. Fotografíe la etiqueta INCI de cerca.' :
                       lang === 'fr' ? 'Ingrédients introuvables. Photographiez l\'étiquette INCI en gros plan.' :
                       lang === 'it' ? 'Ingredienti non trovati. Fotografa l\'etichetta INCI da vicino.' :
                       lang === 'tr' ? 'İçerikler bulunamadı. Lütfen INCI etiketini yakından fotoğraflayın.' :
                       'Ingredients not found. Please photograph the INCI label up close.'}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {result.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-start gap-2 py-1 border-b border-[#D4C3A3]/20 last:border-0">
                          <span className="text-base shrink-0 mt-0.5">{ing.status}</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#2C3E50] text-xs uppercase tracking-wide">{ing.name}</span>
                            <span className="text-xs text-[#4A4A4A]">{ing.description}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].usage} icon={<Info size={20} />} collapseLabel={cl}>
                  <UsageSection text={result.usage} />
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].benefits} icon={<Sparkles size={20} />} collapseLabel={cl}>
                  <BenefitsSection text={result.benefits} />
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].sideEffects} icon={<AlertTriangle size={20} />} collapseLabel={cl}>
                  <BenefitsSection text={result.sideEffects} />
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].warnings} icon={<AlertCircle size={20} />} collapseLabel={cl}>
                  <div className="prose prose-sm prose-stone max-w-none">
                    <ReactMarkdown>{result.warnings}</ReactMarkdown>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].interactions} icon={<Zap size={20} />} collapseLabel={cl}>
                  <BenefitsSection text={result.interactions} />
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].shelfLife} icon={<Clock size={20} />} collapseLabel={cl}>
                  <div className="prose prose-sm prose-stone max-w-none">
                    <ReactMarkdown>{result.shelfLife}</ReactMarkdown>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].alternatives} icon={<RefreshCw size={20} />} collapseLabel={cl}>
                  <AlternativesSection alternatives={result.alternatives} />
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].whereToBuy} icon={<ShoppingCart size={20} />} collapseLabel={cl}>
                  <WhereToBuy lang={lang} shopLinks={result.shopLinks ?? []} />
                </CollapsibleSection>

              </div>

              <AskAI
                lang={lang}
                context={result}
                isPremium={subscription.isPremium}
                onLimitReached={() => setPaywallReason('askAi')}
              />

              <div className="mt-8 pt-6 border-t border-[#D4C3A3] space-y-4">
                <div className="flex items-start gap-1.5 text-[10px] text-[#B89F7A]/70">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  <span>{t[lang].aiDisclaimer}</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full py-4 regency-button tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                    <span>
                      {captionCopied ? t[lang].captionCopied : t[lang].share}
                    </span>
                  </button>


                </div>

                <button onClick={handleReset} className="w-full py-4 regency-button tracking-widest">
                  {t[lang].anotherProduct}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-6 text-center text-xs text-[#B89F7A] relative">
        <p className="mb-2">{t[lang].footerText}</p>
        <div className="flex justify-center gap-4">
          <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-[#2C3E50] transition-colors underline decoration-[#B89F7A]/30 underline-offset-4">
            {t[lang].privacyPolicy}
          </button>
          <span>|</span>
          <button onClick={() => setIsAgbOpen(true)} className="hover:text-[#2C3E50] transition-colors underline decoration-[#B89F7A]/30 underline-offset-4">
            {t[lang].agb}
          </button>
          <span>|</span>
          <button onClick={() => setIsImpressumOpen(true)} className="hover:text-[#2C3E50] transition-colors underline decoration-[#B89F7A]/30 underline-offset-4">
            {t[lang].impressum}
          </button>
        </div>
      </footer>

      <LoadingScreen isVisible={isAnalyzing} lang={lang} />
      <CookieBanner lang={lang} onOpenPrivacy={() => setIsPrivacyOpen(true)} />

      <LegalModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} title={t[lang].privacyPolicy} content={<PrivacyPolicyContent />} />
      <LegalModal isOpen={isAgbOpen} onClose={() => setIsAgbOpen(false)} title={t[lang].agb} content={<AGBContent />} />
      <LegalModal isOpen={isImpressumOpen} onClose={() => setIsImpressumOpen(false)} title={t[lang].impressum} content={<ImpressumContent />} />
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} lang={lang} />

      <PaywallModal
        isOpen={paywallReason !== null}
        onClose={() => setPaywallReason(null)}
        lang={lang}
        reason={paywallReason ?? 'scans'}
        userId={user?.id}
      />

      <FeedbackSurvey
        isOpen={isSurveyOpen}
        onClose={() => setIsSurveyOpen(false)}
        lang={lang}
        userId={user?.id}
      />
    </div>
  );
}
