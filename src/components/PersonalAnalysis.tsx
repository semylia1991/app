import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { t, Language } from '../i18n';
import { AnalysisResult } from '../services/ai';
import { UserProfile } from './UserProfile';
 
interface Props {
  lang: Language;
  result: AnalysisResult;
  userProfile: UserProfile;
  autoOpen?: boolean; // true когда запущен через "Персональный анализ" в upload-панели
}
 
async function fetchPersonalAnalysis(
  result: AnalysisResult,
  userProfile: UserProfile,
  language: string
): Promise<string> {
  const profileSummary = [
    userProfile.skinType.length        ? `Skin type: ${userProfile.skinType.join(', ')}`            : null,
    userProfile.skinSensitivity.length ? `Sensitivities: ${userProfile.skinSensitivity.join(', ')}` : null,
    userProfile.skinConditions.length  ? `Skin conditions: ${userProfile.skinConditions.join(', ')}` : null,
    userProfile.ageRange               ? `Age group: ${userProfile.ageRange}`                        : null,
    userProfile.hairType.length        ? `Hair type: ${userProfile.hairType.join(', ')}`             : null,
    userProfile.scalpCondition.length  ? `Scalp condition: ${userProfile.scalpCondition.join(', ')}` : null,
    userProfile.hairProblems.length    ? `Hair problems: ${userProfile.hairProblems.join(', ')}`     : null,
  ].filter(Boolean).join('\n');
 
  const prompt = `
You are a professional cosmetic safety consultant. Provide a personalized compatibility analysis of a cosmetic product for a specific user profile.
 
IMPORTANT LANGUAGE: Respond ONLY in ${language}. All text must be in ${language}. Translate ALL section headings into ${language}.
 
PRODUCT DATA:
- Name: ${result.productName}
- Brand: ${result.brand}
- Type: ${result.productType}
- Analysis: ${result.analysis}
- Key ingredients: ${result.ingredients.slice(0, 10).map(i => `${i.name} (${i.status})`).join(', ')}
- Known warnings: ${result.warnings}
- Side effects: ${result.sideEffects}
 
USER PROFILE:
${profileSummary}
 
RESPONSE STRUCTURE — use exactly 4 sections, with headings translated to ${language}:
 
## [translate: "Kompatibilität mit deinem Hautprofil"]
2-3 sentences assessing overall compatibility. Use phrasing like "Kann geeignet sein für…" or "Eignung basierend auf deinen Angaben" — translated to ${language}. Be nuanced, not just positive.
 
## [translate: "Analyse der Inhaltsstoffe im Kontext deines Profils"]
List 3-5 specific ingredients from the product with bullet points. For each explain how it interacts with the user's specific skin/hair profile. Be concrete and specific to this user.
 
## [translate: "Potenzielle Verträglichkeit — Risiken"]
List specific risks for THIS user's profile using phrasing like "Kann potenziell irritierend wirken", "Erhöhtes Risiko für Unverträglichkeit", "Nicht optimal bei empfindlicher Haut" — translated to ${language}. If no significant risks, state that clearly.
 
## [translate: "Einschätzung"]
1-2 sentence verdict. Start with "Bewertung:" or "Analyseergebnis:" — translated to ${language}. Give a clear, honest recommendation.
 
RULES:
- Never invent ingredients or medical facts not present in the product data
- Be specific to the user's profile, not generic
- If profile data is limited, acknowledge it honestly
- Do NOT add a disclaimer — it will be added separately
`.trim();
 
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ask', question: prompt, context: {}, language }),
  });
 
  if (!res.ok) throw new Error('API error');
  const data = await res.json();
  return data.answer ?? '';
}
 
export function PersonalAnalysis({ lang, result, userProfile, autoOpen = false }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [isOpen, setIsOpen]     = useState(false);
 
  const T = t[lang];
 
  const hasProfile = (
    userProfile.skinType.length > 0 ||
    userProfile.skinConditions.length > 0 ||
    userProfile.skinSensitivity.length > 0 ||
    userProfile.hairType.length > 0
  );
 
  // Если пришёл autoOpen и анализ ещё не запускался — запускаем автоматически
  useEffect(() => {
    if (autoOpen && !analysis && !loading) {
      runAnalysis();
    }
  }, [autoOpen]);
 
  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setIsOpen(true);
    try {
      const text = await fetchPersonalAnalysis(result, userProfile, T.personalAnalysisLang);
      setAnalysis(text);
    } catch {
      setError(T.error);
    } finally {
      setLoading(false);
    }
  };
 
  const handleClick = () => {
    if (loading) return;
    // Если анализ уже есть — просто toggle панели
    if (analysis || error) {
      setIsOpen(o => !o);
      return;
    }
    // Иначе запускаем
    runAnalysis();
  };
 
  if (!hasProfile) {
    return (
      <div className="mt-4 p-4 border border-dashed border-[#D4C3A3] rounded-sm text-center">
        <p className="text-xs text-[#B89F7A]">{T.personalAnalysisNoProfile}</p>
      </div>
    );
  }
 
  return (
    <div className="mt-4">
      {/* Кнопка */}
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full py-4 regency-button tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin text-[#B89F7A]" />
            <span>{T.personalAnalysisLoading}</span>
          </>
        ) : (
          <>
            <UserCheck size={16} className="text-[#B89F7A]" />
            <span>{T.personalAnalysisButton}</span>
            {(analysis || error) && (
              isOpen
                ? <ChevronUp  size={14} className="ml-1 text-[#B89F7A]" />
                : <ChevronDown size={14} className="ml-1 text-[#B89F7A]" />
            )}
          </>
        )}
      </button>
 
      {/* Панель результата */}
      <AnimatePresence>
        {isOpen && (analysis || error) && (
          <motion.div
            key="personal-result"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-5 bg-[#F5F0E8] border border-[#D4C3A3] rounded-sm">
 
              {/* Заголовок панели */}
              <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#D4C3A3]">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#B89F7A] shrink-0" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#B89F7A] font-semibold">
                    {T.personalAnalysisTitle}
                  </span>
                </div>
                <span className="text-[9px] text-[#B89F7A]/70 italic shrink-0">
                  {T.personalAnalysisShortDisclaimer}
                </span>
              </div>
 
              {error ? (
                <p className="text-xs text-red-700">{error}</p>
              ) : (
                <div className="prose prose-sm prose-stone max-w-none
                  [&_h2]:text-sm [&_h2]:font-serif [&_h2]:font-semibold [&_h2]:text-[#2C3E50]
                  [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:first:mt-0
                  [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:mt-1
                  [&_li]:text-xs [&_li]:text-[#4A4A4A]
                  [&_p]:text-xs [&_p]:text-[#4A4A4A] [&_p]:leading-relaxed
                  [&_strong]:text-[#2C3E50] [&_strong]:font-semibold">
                  <ReactMarkdown>{analysis!}</ReactMarkdown>
                </div>
              )}
 
              {/* Дисклеймер */}
              {analysis && !error && (
                <p className="mt-4 pt-3 border-t border-[#D4C3A3]/50 text-[9px] text-[#B89F7A] leading-relaxed italic">
                  {T.personalAnalysisDisclaimer}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
