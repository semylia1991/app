import logo from './logo.png'
import posthog from 'posthog-js'
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, AlertCircle, ShieldCheck, Leaf, Info, Sparkles, AlertTriangle, Zap, RefreshCw, Loader2, Share2, NotebookPen, ShoppingCart, GitCompareArrows } from 'lucide-react';
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
import { CompareSection } from './components/CompareSection';
import { UserProfilePanel, UserProfile, translateProfile } from './components/UserProfile';
import { PersonalAnalysis } from './components/PersonalAnalysis';
import { PaywallModal } from './components/PaywallModal';
import { FeedbackSurvey } from './components/FeedbackSurvey';
import { useSubscription } from './hooks/useSubscription';
import { SubscriptionPage } from './components/SubscriptionPage';

/* ── helpers ── */
function splitParagraphs(text: string): string[] {
  return text.split('\n\n').map(s => s.trim()).filter(Boolean);
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
  // Wrap in quotes for exact phrase match → much more precise results
  const q = encodeURIComponent(`"${combined}"`);
  return SHOP_CONFIGS.map(({ platform, favicon, buildUrl }) => ({
    platform, favicon, url: buildUrl(q),
  }));
}

/* ── Main component ── */
export default function App() {
  const [lang, setLang]               = useState<Language>('en');
  const [file, setFile]               = useState<File | null>(null);
  const [inputKey, setInputKey]       = useState(0);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [scanPhotoUrl, setScanPhotoUrl] = useState<string | null>(null);
  const [consent, setConsent]         = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult]           = useState<AnalysisResult | null>(null);
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

  const subscription = useSubscription(user);
  const [paywallReason, setPaywallReason] = useState<'scans' | 'note' | 'askAi' | null>(null);
  const [showSubscriptionPage, setShowSubscriptionPage] = useState<boolean>(
    () => window.location.search.includes('portal=return')
  );

  const fileInputRef     = useRef<HTMLInputElement>(null);
  const isFirstRender    = useRef(true);
  const originalResult   = useRef<AnalysisResult | null>(null);
  const translationCache = useRef<Map<Language, AnalysisResult>>(new Map());

  /* share link load — also handles URL changes (e.g. user navigates back/forward) */
  const isSharedViewRef = useRef(false);
  useEffect(() => { isSharedViewRef.current = isSharedView; }, [isSharedView]);

  useEffect(() => {
    const loadFromUrl = () => {
      const shareId = new URLSearchParams(window.location.search).get('share');

      // No ?share in URL — ensure we are on the clean upload page
      if (!shareId) {
        // If we were previously viewing a shared result, reset to upload panel.
        // This covers the case where the user navigates to the plain origin URL
        // (e.g. via "Share the app" link) without a full page reload.
        if (isSharedViewRef.current) {
          setResult(null);
          setIsSharedView(false);
          originalResult.current = null;
          translationCache.current = new Map();
        }
        return;
      }

      // Has ?share — fetch and display
      setSharedLoading(true);
      supabase
        .from('shared_results').select('result').eq('id', shareId).maybeSingle()
        .then(({ data }) => {
          if (data?.result) {
            const r = data.result as AnalysisResult;
            originalResult.current = r;
            translationCache.current = new Map([[lang, r]]);
            setResult(r);
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

  /* translation on lang change */
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
    if (!user) {
      console.warn('[ScanHistory] saveScan — no user, skipping');
      return;
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
    } else {
      console.log('[ScanHistory] saved OK, id:', data?.[0]?.id);
    }
  };

  const handleAnalyze = async () => {
    if (!previewUrl || !consent) return;
    if (!subscription.canScan) { setPaywallReason('scans'); return; }
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
              bodySkinType:    p.bodySkinType.join(', ')     || undefined,
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
      if (userProfile && analysisWithShops.personalNote) await subscription.incrementNoteAnalysis();
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
      // user cancelled or share failed — fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        setShareAppCopied(true);
        setTimeout(() => setShareAppCopied(false), 2000);
      } catch {}
    }
  };

  const cl = t[lang].collapse;

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
          subscription.refresh();
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
                  onSelect={(r, scanLang) => {
                    originalResult.current = r;
                    const sourceLang = (scanLang ?? lang) as Language;
                    translationCache.current = new Map([[sourceLang, r]]);
                    setResult(r);
                    if (scanLang && scanLang !== lang) setLang(scanLang as Language);
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

        {/* Hero */}
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

          {!result && (
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
          )}
        </motion.div>

        {/* Gold ornament divider */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <div style={{ height: '0.5px', width: 48, background: 'linear-gradient(to right, transparent, #B8923A)' }} />
          <span style={{ color: '#B8923A', fontSize: 10 }}>✦</span>
          <div style={{ height: '0.5px', width: 48, background: 'linear-gradient(to left, transparent, #B8923A)' }} />
        </div>
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

              {/* Share-app button — only shown in the empty state so the card height doesn't shift */}
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
                  {result.productName}
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#8A8078', fontStyle: 'italic', letterSpacing: '0.08em', fontFamily: 'var(--font-serif)' }}>
                  {result.brand}
                </p>

                {isTranslating && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#2D5A3D', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    <Loader2 size={11} className="animate-spin" />
                    {t[lang].translating}
                  </div>
                )}
              </div>

              {/* Sections */}
              <div>
                <CollapsibleSection title={t[lang].analysis} icon={<ShieldCheck size={15} />} defaultOpen collapseLabel={cl}>
                  <div className="prose-luxury"><ReactMarkdown>{result.analysis}</ReactMarkdown></div>
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].noteSection} icon={<NotebookPen size={15} />} collapseLabel={cl}>
                  <PersonalAnalysis
                    lang={lang} result={result} user={user} userProfile={userProfile}
                    canUseNote={subscription.canScan}
                    onLimitReached={() => setPaywallReason('scans')}
                    onUsed={subscription.incrementNoteAnalysis}
                    onOpenProfile={() => setIsProfileOpen(true)}
                  />
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].compareWith} icon={<GitCompareArrows size={15} />} collapseLabel={cl}>
                  <CompareSection
                    lang={lang}
                    current={result}
                    user={user}
                    onRegister={() => {
                      const btn = document.querySelector('[data-auth-button]') as HTMLElement;
                      btn?.click();
                    }}
                  />
                </CollapsibleSection>

                {/* ─── Product information — wrapper containing 7 sub-sections ─── */}
                <CollapsibleSection title={t[lang].productInfo} icon={<Info size={15} />} collapseLabel={cl}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <CollapsibleSection title={t[lang].ingredients} icon={<Leaf size={15} />} collapseLabel={cl}>
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
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {result.ingredients.map((ing, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '0.5px solid rgba(221,213,200,0.5)' }}>
                              <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{ing.status}</span>
                              <div>
                                <span style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1A1410', fontWeight: 500, marginBottom: 2, fontFamily: 'var(--font-sans)' }}>{ing.name}</span>
                                <span style={{ fontSize: '1.05rem', color: '#8A8078', lineHeight: 1.65, fontFamily: 'var(--font-serif)' }}>{ing.description}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CollapsibleSection>

                    <CollapsibleSection title={t[lang].usage} icon={<Info size={15} />} collapseLabel={cl}>
                      <UsageSection text={result.usage} shelfLife={result.shelfLife} shelfLifeLabel={t[lang].shelfLife} />
                    </CollapsibleSection>

                    <CollapsibleSection title={t[lang].benefits} icon={<Sparkles size={15} />} collapseLabel={cl}>
                      <BenefitsSection text={result.benefits} />
                    </CollapsibleSection>

                    <CollapsibleSection title={t[lang].sideEffects} icon={<AlertTriangle size={15} />} collapseLabel={cl}>
                      <BenefitsSection text={result.sideEffects} />
                    </CollapsibleSection>

                    <CollapsibleSection title={t[lang].warnings} icon={<AlertCircle size={15} />} collapseLabel={cl}>
                      <div className="prose-luxury"><ReactMarkdown>{result.warnings}</ReactMarkdown></div>
                    </CollapsibleSection>

                    <CollapsibleSection title={t[lang].interactions} icon={<Zap size={15} />} collapseLabel={cl}>
                      <BenefitsSection text={result.interactions} />
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

                <CollapsibleSection title={t[lang].alternatives} icon={<RefreshCw size={15} />} collapseLabel={cl}>
                  <AlternativesSection alternatives={result.alternatives} />
                </CollapsibleSection>

                <CollapsibleSection title={t[lang].whereToBuy} icon={<ShoppingCart size={15} />} collapseLabel={cl}>
                  <WhereToBuy lang={lang} shopLinks={result.shopLinks ?? []} productName={`${result.brand} ${result.productName}`.trim()} />
                </CollapsibleSection>
              </div>



              {/* Footer actions */}
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
