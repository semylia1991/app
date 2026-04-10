import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Crown, RefreshCw } from 'lucide-react';
import { t, Language } from '../i18n';
import { AnalysisResult, SerializedProfile } from '../services/ai';
import { UserProfile, translateProfile } from './UserProfile';

const FUNCTION_URL = '/api/gemini';

interface Props {
  lang: Language;
  result: AnalysisResult;
  userProfile: UserProfile | null;
  canUseNote: boolean;
  onLimitReached: () => void;
  onUsed: () => Promise<void>;
}

function serializeProfile(profile: UserProfile, lang: Language): SerializedProfile {
  const p = translateProfile(profile, lang);
  return {
    skinType:        p.skinType.join(', ')       || undefined,
    skinSensitivity: p.skinSensitivity.join(', ')|| undefined,
    skinConditions:  p.skinConditions.join(', ') || undefined,
    ageRange:        p.ageRange                   || undefined,
    hairType:        p.hairType.join(', ')        || undefined,
    scalpCondition:  p.scalpCondition.join(', ') || undefined,
    hairProblems:    p.hairProblems.join(', ')    || undefined,
    climate:         p.climate.join(', ')         || undefined,
    allergies:       (profile as any).allergies   || undefined,
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
  const serialized = serializeProfile(profile, lang);
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'personalNote',
      result,
      userProfile: serialized,
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

export function PersonalAnalysis({ lang, result, userProfile, canUseNote, onLimitReached, onUsed }: Props) {
  const T = t[lang];

  const [note, setNote]       = useState<string | null>(result.personalNote ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Track which profile version was used to generate the current note
  const noteProfileKey = useRef<string>(userProfile ? profileKey(userProfile) : '');
  const currentKey = profileKey(userProfile);

  const hasProfile = !!userProfile && (
    userProfile.skinType.length > 0 ||
    userProfile.skinConditions.length > 0 ||
    userProfile.skinSensitivity.length > 0 ||
    userProfile.hairType.length > 0 ||
    userProfile.scalpCondition.length > 0 ||
    userProfile.hairProblems.length > 0 ||
    (userProfile.climate ?? []).length > 0 ||
    !!userProfile.ageRange
  );

  const profileChanged = hasProfile && currentKey !== noteProfileKey.current;

  // Auto-refresh when profile changes and we already have a result
  useEffect(() => {
    if (!hasProfile || !profileChanged || !canUseNote) return;
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  async function regenerate() {
    if (!userProfile || !canUseNote) {
      if (!canUseNote) onLimitReached();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchPersonalNote(result, userProfile, lang);
      setNote(fresh);
      noteProfileKey.current = profileKey(userProfile);
      await onUsed();
    } catch (e: any) {
      setError(e.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  if (!hasProfile) {
    return (
      <p className="text-xs text-[#B89F7A] py-2 italic">
        {T.noteNoProfile}
      </p>
    );
  }

  if (!canUseNote && !note) {
    return (
      <div
        className="flex items-center gap-2 p-3 bg-[#B89F7A]/5 border border-dashed border-[#B89F7A]/30 rounded-sm cursor-pointer hover:bg-[#B89F7A]/10 transition-colors"
        onClick={onLimitReached}
      >
        <Crown size={14} className="text-[#B89F7A] shrink-0" />
        <p className="text-xs text-[#B89F7A]">
          Daily limit reached. <span className="underline">Upgrade to Premium</span> for unlimited analyses.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <RefreshCw size={13} className="text-[#B89F7A] animate-spin" />
        <p className="text-xs text-[#B89F7A] italic">Updating analysis for new preferences…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-2">
        <p className="text-xs text-red-400 italic flex-1">{error}</p>
        <button
          onClick={regenerate}
          className="text-xs text-[#B89F7A] underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!note) {
    return (
      <p className="text-xs text-[#B89F7A]/70 py-2 italic">
        {T.noteRescan}
      </p>
    );
  }

  return (
    <div>
      {profileChanged && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-[#F5F0E8] border border-[#D4C3A3]/40 rounded-sm">
          <RefreshCw size={12} className="text-[#B89F7A]" />
          <p className="text-xs text-[#B89F7A] flex-1">Preferences changed</p>
          <button onClick={regenerate} className="text-xs text-[#2C3E50] underline font-medium">
            Update analysis
          </button>
        </div>
      )}
      <div className="prose prose-sm prose-stone max-w-none
        [&_strong]:text-[#2C3E50] [&_strong]:font-semibold
        [&_p]:text-xs [&_p]:text-[#4A4A4A] [&_p]:leading-relaxed [&_p]:mb-1
        [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:mt-1
        [&_li]:text-xs [&_li]:text-[#4A4A4A] [&_li]:leading-relaxed
        [&_hr]:border-[#D4C3A3]/50 [&_hr]:my-3
        [&_em]:text-[9px] [&_em]:text-[#B89F7A] [&_em]:not-italic [&_em]:block [&_em]:mt-2">
        <ReactMarkdown>{note}</ReactMarkdown>
      </div>
    </div>
  );
}
