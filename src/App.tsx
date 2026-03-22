import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, AlertCircle, ShieldCheck, Leaf, Info, Sparkles, AlertTriangle, Zap, Clock, RefreshCw, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { User } from '@supabase/supabase-js';
 
import { t, Language } from './i18n';
import { analyzeProductImage, AnalysisResult, translateAnalysisResult } from './services/ai';
import { supabase } from './lib/supabase';
import { LanguageSelector } from './components/LanguageSelector';
import { CookieBanner } from './components/CookieBanner';
import { LegalModal, PrivacyPolicyContent, ImpressumContent } from './components/LegalModals';
import { CollapsibleSection } from './components/CollapsibleSection';
import { AskAI } from './components/AskAI';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthButton } from './components/AuthButton';
import { ScanHistory } from './components/ScanHistory';
 
// ── helpers for formatted sections ──────────────────────────────────────────
 
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
 
function AlternativesSection({ text }: { text: string }) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return (
    <div className="space-y-3 text-sm text-[#4A4A4A]">
      {lines.map((line, i) => {
        const cleaned = line.replace(/\*\*/g, '').trim();
        const match = cleaned.match(/^(.+?)\s[—–-]\s(.+)$/);
        if (match) {
          return (
            <p key={i}>
              <strong className="text-[#2C3E50]">{match[1]}</strong>
              {' — '}
              {match[2]}
            </p>
          );
        }
        return <p key={i} className="font-bold text-[#2C3E50]">{cleaned}</p>;
      })}
    </div>
  );
}
 
// ── main component ───────────────────────────────────────────────────────────
 
export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
 
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isImpressumOpen, setIsImpressumOpen] = useState(false);
 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFirstRender = useRef(true);
  // The result as it came from the initial analysis (source language).
  // Never overwritten — used as the source for all translations.
  const originalResult = useRef<AnalysisResult | null>(null);
  // lang → translated AnalysisResult. Populated on first translation for each lang.
  const translationCache = useRef<Map<Language, AnalysisResult>>(new Map());
 
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
 
    if (!originalResult.current || isAnalyzing) return;
 
    // Cache hit — instant switch, no API call.
    const cached = translationCache.current.get(lang);
    if (cached) {
      setResult(cached);
      return;
    }
 
    let cancelled = false;
 
    const translate = async () => {
      setIsTranslating(true);
      try {
        const translated = await translateAnalysisResult(originalResult.current!, lang);
        if (!cancelled) {
          translationCache.current.set(lang, translated);
          setResult(translated);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Translation error:", err);
        }
      } finally {
        if (!cancelled) {
          setIsTranslating(false);
        }
      }
    };
 
    translate();
 
    return () => {
      cancelled = true;
      setIsTranslating(false);
    };
  }, [lang]);
 
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
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
 
    setIsAnalyzing(true);
    setError(null);
 
    try {
      const match = previewUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid image format");
 
      const mimeType = match[1];
      const analysis = await analyzeProductImage(previewUrl, mimeType, lang);
      // Store the original and seed the cache for the current language
      // so switching away and back doesn't trigger a redundant translate call.
      originalResult.current = analysis;
      translationCache.current = new Map([[lang, analysis]]);
      setResult(analysis);
      setFile(null);
      setPreviewUrl(null);
      await saveScanToHistory(analysis);
    } catch (err) {
      console.error(err);
      setError(t[lang].error);
    } finally {
      setIsAnalyzing(false);
    }
  };
 
  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setConsent(false);
    setError(null);
    originalResult.current = null;
    translationCache.current = new Map();
  };
 
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-32 bg-gradient-to-b from-[#B89F7A]/10 to-transparent pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#B89F7A]/10 to-transparent pointer-events-none" />
 
      <header className="pt-6 pb-4 px-4 text-center relative z-10">
        {/* Auth row */}
        <div className="flex items-center justify-end gap-2 mb-3">
          {user && (
            <ScanHistory
              user={user}
              lang={lang}
              onSelect={(r) => {
                originalResult.current = r;
                translationCache.current = new Map([[lang, r]]);
                setResult(r);
              }}
            />
          )}
          <AuthButton lang={lang} onUserChange={setUser} />
        </div>
 
        <LanguageSelector currentLang={lang} onSelect={setLang} />
 
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 mb-2"
        >
          <h2 className="text-xs font-serif tracking-[0.3em] text-[#B89F7A] uppercase mb-2">
            {t[lang].subtitle}
          </h2>
          <h1 className="text-4xl md:text-5xl font-serif text-[#2C3E50] tracking-wide">
            {t[lang].title}
          </h1>
        </motion.div>
        <div className="w-24 h-[1px] bg-[#D4C3A3] mx-auto mt-6" />
      </header>
 
      <main className="flex-grow flex flex-col items-center justify-center p-4 relative z-10">
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
 
              <div
                className="relative aspect-[3/2] border-2 border-dashed border-[#D4C3A3] rounded-sm flex flex-col items-center justify-center cursor-pointer hover:bg-[#B89F7A]/5 transition-colors overflow-hidden group"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-center p-6 flex flex-col items-center text-[#B89F7A]">
                    <Camera size={48} strokeWidth={1} className="mb-4" />
                    <span className="font-serif text-sm tracking-widest uppercase">{t[lang].uploadPhoto}</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  onClick={(e) => e.stopPropagation()}
                  accept="image/*"
                  className="hidden"
                />
              </div>
 
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
                <h2 className="text-sm font-serif tracking-[0.2em] text-[#B89F7A] uppercase mb-2">
                  {t[lang].ingredientAnalysis}
                </h2>
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
                <CollapsibleSection title={t[lang].analysis} icon={<ShieldCheck size={20} />} defaultOpen>
                  <div className="prose prose-sm prose-stone max-w-none">
                    <ReactMarkdown>{result.analysis}</ReactMarkdown>
                  </div>
                </CollapsibleSection>
 
                <CollapsibleSection title={t[lang].ingredients} icon={<Leaf size={20} />}>
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
                </CollapsibleSection>
 
                <CollapsibleSection title={t[lang].usage} icon={<Info size={20} />}>
                  <UsageSection text={result.usage} />
                </CollapsibleSection>
 
                <CollapsibleSection title={t[lang].benefits} icon={<Sparkles size={20} />}>
                  <BenefitsSection text={result.benefits} />
                </CollapsibleSection>
 
                <CollapsibleSection title={t[lang].sideEffects} icon={<AlertTriangle size={20} />}>
                  <div className="prose prose-sm prose-stone max-w-none">
                    <ReactMarkdown>{result.sideEffects}</ReactMarkdown>
                  </div>
                </CollapsibleSection>
 
                <CollapsibleSection title={t[lang].warnings} icon={<AlertCircle size={20} />}>
                  <div className="prose prose-sm prose-stone max-w-none">
                    <ReactMarkdown>{result.warnings}</ReactMarkdown>
                  </div>
                </CollapsibleSection>
 
                <CollapsibleSection title={t[lang].interactions} icon={<Zap size={20} />}>
                  <div className="prose prose-sm prose-stone max-w-none">
                    <ReactMarkdown>{result.interactions}</ReactMarkdown>
                  </div>
                </CollapsibleSection>
 
                <CollapsibleSection title={t[lang].shelfLife} icon={<Clock size={20} />}>
                  <div className="prose prose-sm prose-stone max-w-none">
                    <ReactMarkdown>{result.shelfLife}</ReactMarkdown>
                  </div>
                </CollapsibleSection>
 
                <CollapsibleSection title={t[lang].alternatives} icon={<RefreshCw size={20} />}>
                  <AlternativesSection text={result.alternatives} />
                </CollapsibleSection>
              </div>
 
              <AskAI lang={lang} context={result} />
 
              <div className="mt-8 pt-6 border-t border-[#D4C3A3] space-y-4">
                <div className="bg-[#B89F7A]/5 p-4 rounded-sm border border-[#B89F7A]/20 text-xs text-[#4A4A4A] space-y-2">
                  <p><strong>Transparency:</strong> {t[lang].aiTransparency}</p>
                  <p><strong>Disclaimer:</strong> {t[lang].aiDisclaimer}</p>
                </div>
 
                <button
                  onClick={handleReset}
                  className="w-full py-4 regency-button tracking-widest"
                >
                  {t[lang].anotherProduct}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
 
      <footer className="py-6 text-center text-xs text-[#B89F7A] relative z-10">
        <p className="mb-2">{t[lang].footerText}</p>
        <div className="flex justify-center gap-4">
          <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-[#2C3E50] transition-colors underline decoration-[#B89F7A]/30 underline-offset-4">
            {t[lang].privacyPolicy}
          </button>
          <span>|</span>
          <button onClick={() => setIsImpressumOpen(true)} className="hover:text-[#2C3E50] transition-colors underline decoration-[#B89F7A]/30 underline-offset-4">
            {t[lang].impressum}
          </button>
        </div>
      </footer>
 
      <LoadingScreen isVisible={isAnalyzing} lang={lang} />
      <CookieBanner lang={lang} onOpenPrivacy={() => setIsPrivacyOpen(true)} />
 
      <LegalModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        title={t[lang].privacyPolicy}
        content={<PrivacyPolicyContent />}
      />
 
      <LegalModal
        isOpen={isImpressumOpen}
        onClose={() => setIsImpressumOpen(false)}
        title={t[lang].impressum}
        content={<ImpressumContent />}
      />
    </div>
  );
}
