import React from 'react';
import ReactMarkdown from 'react-markdown';
import { t, Language } from '../i18n';
import { AnalysisResult } from '../services/ai';
import { UserProfile } from './UserProfile';

interface Props {
  lang: Language;
  result: AnalysisResult;
  userProfile: UserProfile | null;
}

// No API call — personalNote is populated by the main analyzeProductImage call.
export function PersonalAnalysis({ lang, result, userProfile }: Props) {
  const T = t[lang];

  const hasProfile = !!userProfile && (
    userProfile.skinType.length > 0 ||
    userProfile.skinConditions.length > 0 ||
    userProfile.skinSensitivity.length > 0 ||
    userProfile.hairType.length > 0
  );

  // User has no profile → prompt to create one
  if (!hasProfile) {
    return (
      <p className="text-xs text-[#B89F7A] py-2 italic">
        {T.noteNoProfile}
      </p>
    );
  }

  // Profile exists but this result came from cache / shared link (no personalNote)
  if (!result.personalNote) {
    return (
      <p className="text-xs text-[#B89F7A]/70 py-2 italic">
        {T.noteRescan}
      </p>
    );
  }

  return (
    <div className="prose prose-sm prose-stone max-w-none
      [&_strong]:text-[#2C3E50] [&_strong]:font-semibold
      [&_p]:text-xs [&_p]:text-[#4A4A4A] [&_p]:leading-relaxed [&_p]:mb-1
      [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:mt-1
      [&_li]:text-xs [&_li]:text-[#4A4A4A] [&_li]:leading-relaxed
      [&_hr]:border-[#D4C3A3]/50 [&_hr]:my-3
      [&_em]:text-[9px] [&_em]:text-[#B89F7A] [&_em]:not-italic [&_em]:block [&_em]:mt-2">
      <ReactMarkdown>{result.personalNote}</ReactMarkdown>
    </div>
  );
}
