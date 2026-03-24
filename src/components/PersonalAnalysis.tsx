import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { t, Language } from '../i18n';
import { AnalysisResult } from '../services/ai';
import { UserProfile } from './UserProfile';
 
// ── Props ─────────────────────────────────────────────────────────────────────
 
interface Props {
  lang: Language;
  result: AnalysisResult;
  userProfile: UserProfile | null;
}
 
// ── Build the personalised note prompt ────────────────────────────────────────
 
function buildPrompt(result: AnalysisResult, profile: UserProfile, language: string): string {
  const profileLines = [
    profile.skinType.length        ? `Skin type: ${profile.skinType.join(', ')}`             : null,
    profile.skinSensitivity.length ? `Sensitivities: ${profile.skinSensitivity.join(', ')}`  : null,
    profile.skinConditions.length  ? `Skin conditions: ${profile.skinConditions.join(', ')}` : null,
    profile.ageRange               ? `Age group: ${profile.ageRange}`                         : null,
    profile.hairType.length        ? `Hair type: ${profile.hairType.join(', ')}`              : null,
    profile.scalpCondition.length  ? `Scalp: ${profile.scalpCondition.join(', ')}`            : null,
    profile.hairProblems.length    ? `Hair problems: ${profile.hairProblems.join(', ')}`      : null,
  ].filter(Boolean).join('\n');
 
  const inci = result.ingredients.map(i => i.name).join(', ');
 
  return `
You are a cosmetics ingredient analysis system. Respond ONLY in ${language}.
 
Your task: provide personalised information on what to look out for, based on the user profile and product ingredients.
 
INPUT:
${profileLines}
Product composition (INCI): ${inci}
 
RULES:
- Do not give medical advice
- Do not use words like "treats", "prescribe", "contraindicated"
- Do not state directly that a product is "suitable" or "unsuitable"
- Use mild phrasing: "worth noting", "may cause", "is sometimes associated with"
- Explain reasons using specific ingredients
- Write simply and clearly
- If an ingredient may pose a risk to this specific skin type → indicate it
- If an ingredient may be beneficial → note it
- Consider combinations (e.g. sensitive skin + alcohol)
 
ANSWER FORMAT (translate all headings to ${language}):
 
**Brief summary** (1–2 sentences)
 
**What to look out for:**
- [ingredient or group] — [why this matters for this user]
 
**Beneficial components:**
- [ingredient] — [function it performs]
 
**General comment:**
(neutral conclusion, no recommendations)
 
---
*Automated AI analysis. Not medical advice.*
`.trim();
}
 
// ── Fetch ─────────────────────────────────────────────────────────────────────
 
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
// Rendered inside a CollapsibleSection — runs the API call on first mount.
 
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
 
  // Run once on mount (CollapsibleSection opens → this renders → fetch starts)
  useEffect(() => {
    if (!hasProfile || text || loading) return;
    setLoading(true);
    fetchNote(result, userProfile!, T.personalAnalysisLang)
      .then(t => setText(t))
      .catch(() => setError(T.error))
      .finally(() => setLoading(false));
  }, []);
 
  // No profile → prompt to create one
  if (!hasProfile) {
    return (
      <p className="text-xs text-[#B89F7A] py-2">
        {T.noteNoProfile}
      </p>
    );
  }
 
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#B89F7A] py-4">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-xs">{T.personalAnalysisLoading}</span>
      </div>
    );
  }
 
  if (error) {
    return <p className="text-xs text-red-600 py-2">{error}</p>;
  }
 
  return (
    <div className="prose prose-sm prose-stone max-w-none
      [&_strong]:text-[#2C3E50] [&_strong]:font-semibold
      [&_p]:text-xs [&_p]:text-[#4A4A4A] [&_p]:leading-relaxed
      [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:mt-1
      [&_li]:text-xs [&_li]:text-[#4A4A4A]
      [&_hr]:border-[#D4C3A3]/50 [&_hr]:my-3
      [&_em]:text-[9px] [&_em]:text-[#B89F7A] [&_em]:not-italic">
      <ReactMarkdown>{text!}</ReactMarkdown>
    </div>
  );
}
