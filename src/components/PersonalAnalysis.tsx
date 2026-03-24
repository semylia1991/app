import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { t, Language } from '../i18n';
import { AnalysisResult } from '../services/ai';
import { UserProfile } from './UserProfile';
 
interface Props {
  lang: Language;
  result: AnalysisResult;
  userProfile: UserProfile | null;
}
 
// ── Build profile summary using TRANSLATED option labels ──────────────────────
// Profile values are stored as translated strings (whatever language was active
// when the user saved), so we pass them as-is and let the AI respond in the
// current language. The prompt tells the AI the target language explicitly.
 
function buildProfileSummary(profile: UserProfile): string {
  return [
    profile.skinType.length        ? 'Skin type: '        + profile.skinType.join(', ')        : null,
    profile.skinSensitivity.length ? 'Sensitivities: '    + profile.skinSensitivity.join(', ') : null,
    profile.skinConditions.length  ? 'Skin conditions: '  + profile.skinConditions.join(', ')  : null,
    profile.ageRange               ? 'Age group: '        + profile.ageRange                    : null,
    profile.hairType.length        ? 'Hair type: '        + profile.hairType.join(', ')         : null,
    profile.scalpCondition.length  ? 'Scalp condition: '  + profile.scalpCondition.join(', ')  : null,
    profile.hairProblems.length    ? 'Hair problems: '    + profile.hairProblems.join(', ')     : null,
  ].filter(Boolean).join('\n');
}
 
// ── Build prompt ──────────────────────────────────────────────────────────────
 
function buildPrompt(result: AnalysisResult, profile: UserProfile, language: string): string {
  const profileSummary = buildProfileSummary(profile);
  const inci = result.ingredients.map(i => i.name).join(', ');
 
  return [
    'You are a cosmetics ingredient analysis system.',
    `Respond ONLY in ${language}. Translate ALL section headings into ${language}.`,
    '',
    'Your task: provide personalised information on what to look out for,',
    'based on the user profile details and the product ingredients below.',
    '',
    'INPUT:',
    '1. User profile:',
    profileSummary,
    '',
    '2. Product: ' + result.productName + ' by ' + result.brand,
    '3. Product composition (INCI): ' + inci,
    '',
    'RULES:',
    '- Do not give medical advice.',
    '- Do not use phrases like treats, prescribe, contraindicated.',
    '- Do not state directly that a product is suitable or unsuitable.',
    '- Use mild phrasing: worth noting, may cause, is sometimes associated with.',
    '- Explain reasons using specific ingredients.',
    '- Write simply and clearly.',
    '- If an ingredient may pose a risk for this user profile, indicate it.',
    '- If an ingredient may be beneficial, note it.',
    '- Consider factor combinations (e.g. sensitive skin + alcohol).',
    '',
    'ANSWER FORMAT — use exactly these 4 sections, headings translated to ' + language + ':',
    '',
    '**[translate: Brief summary]**',
    '(1-2 sentences)',
    '',
    '**[translate: What to look out for:]**',
    '- [ingredient or group] — [why this is important for this specific user]',
    '',
    '**[translate: Beneficial components:]**',
    '- [ingredient] — [what function it performs]',
    '',
    '**[translate: General comment:]**',
    '(neutral conclusion without recommendations)',
    '',
    '---',
    '*[translate: Automated AI analysis. Not medical advice.]*',
  ].join('\n');
}
 
// ── API call ──────────────────────────────────────────────────────────────────
 
async function fetchNote(
  result: AnalysisResult,
  profile: UserProfile,
  language: string
): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ask',
      question: buildPrompt(result, profile, language),
      context: {},
      language,
    }),
  });
  if (!res.ok) throw new Error('API error');
  const data = await res.json();
  return data.answer ?? '';
}
 
// ── Component ─────────────────────────────────────────────────────────────────
 
export function PersonalAnalysis({ lang, result, userProfile }: Props) {
  const [text, setText]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
 
  const T = t[lang];
 
  const hasProfile = !!userProfile && (
    userProfile.skinType.length > 0 ||
    userProfile.skinConditions.length > 0 ||
    userProfile.skinSensitivity.length > 0 ||
    userProfile.hairType.length > 0
  );
 
  // Re-fetch when language changes (reset text first)
  useEffect(() => {
    if (!hasProfile) return;
    setText(null);
    setError(null);
    setLoading(true);
    fetchNote(result, userProfile!, T.personalAnalysisLang)
      .then(response => setText(response))
      .catch(() => setError(T.error))
      .finally(() => setLoading(false));
  }, [lang]); // lang change triggers re-fetch in new language
 
  // ── No profile ──────────────────────────────────────────────────────────────
  if (!hasProfile) {
    return (
      <p className="text-xs text-[#B89F7A] py-2 italic">
        {T.noteNoProfile}
      </p>
    );
  }
 
  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#B89F7A] py-4">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-xs">{T.personalAnalysisLoading}</span>
      </div>
    );
  }
 
  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return <p className="text-xs text-red-600 py-2">{error}</p>;
  }
 
  // ── Result ──────────────────────────────────────────────────────────────────
  if (!text) return null;
 
  return (
    <div className="prose prose-sm prose-stone max-w-none
      [&_h2]:text-sm [&_h2]:font-serif [&_h2]:font-semibold [&_h2]:text-[#2C3E50] [&_h2]:mt-4 [&_h2]:mb-1
      [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-[#2C3E50] [&_h3]:mt-3 [&_h3]:mb-1
      [&_strong]:text-[#2C3E50] [&_strong]:font-semibold
      [&_p]:text-xs [&_p]:text-[#4A4A4A] [&_p]:leading-relaxed [&_p]:mb-1
      [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:mt-1
      [&_li]:text-xs [&_li]:text-[#4A4A4A] [&_li]:leading-relaxed
      [&_hr]:border-[#D4C3A3]/50 [&_hr]:my-3
      [&_em]:text-[9px] [&_em]:text-[#B89F7A] [&_em]:not-italic [&_em]:block [&_em]:mt-2">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
