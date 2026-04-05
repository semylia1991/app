import React, { useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Language, t } from '../i18n';
import type { User } from '@supabase/supabase-js';
import type { SubscriptionState } from '../hooks/useSubscription';

interface Props {
  user: User;
  subscription: SubscriptionState;
  lang: Language;
  onBack: () => void;
  onUpgrade: () => void;
}

export function SubscriptionPage({ user, subscription, lang, onBack, onUpgrade }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const { isPremium, usage, limits } = subscription;
  const T = t[lang] ?? t['en'];

  const openPortal = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Session expired. Please sign in again.');

      const res = await fetch('/api/stripe-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const usagePercent = (used: number, limit: number) =>
    Math.min(100, Math.round((used / limit) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="min-h-screen bg-[#FAF8F3] flex flex-col items-center justify-start pt-12 px-4 pb-16"
    >
      <div className="w-full max-w-md">

        {/* Back */}
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-sm text-[#B89F7A] hover:text-[#2C3E50] transition-colors"
        >
          {T.subBack}
        </button>

        <h1 className="text-2xl font-serif text-[#2C3E50] mb-1">{T.subTitle}</h1>
        <p className="text-sm text-[#8A8A8A] mb-8">{user.email}</p>

        {/* Current plan */}
        <div className="bg-white border border-[#E8DCC8] rounded-lg p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#2C3E50]">{T.subCurrentPlan}</span>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              isPremium
                ? 'bg-[#F0F7E6] text-[#3B6D11]'
                : 'bg-[#F5F1EB] text-[#8A8A8A]'
            }`}>
              {isPremium ? T.subPlanPremium : T.subPlanFree}
            </span>
          </div>

          {/* Today's usage */}
          <div className="space-y-3">
            <UsageLine
              label={T.subScans}
              used={usage.scans}
              limit={limits.scansPerDay}
              percent={usagePercent(usage.scans, limits.scansPerDay)}
            />
            <UsageLine
              label={T.subNoteAnalysis}
              used={usage.noteAnalysis}
              limit={limits.noteAnalysisPerDay}
              percent={usagePercent(usage.noteAnalysis, limits.noteAnalysisPerDay)}
            />
            <UsageLine
              label={T.subAskAi}
              used={usage.askAi}
              limit={limits.askAiPerDay}
              percent={usagePercent(usage.askAi, limits.askAiPerDay)}
            />
          </div>
        </div>

        {/* Features */}
        <div className="bg-white border border-[#E8DCC8] rounded-lg p-5 mb-6">
          <p className="text-xs font-medium text-[#8A8A8A] uppercase tracking-wider mb-3">
            {isPremium ? T.subYourFeatures : T.subPremiumUnlocks}
          </p>
          <div className="space-y-2">
            {[
              { text: T.subFeatureScans,   premium: true },
              { text: T.subFeatureHistory, premium: true },
              { text: T.subFeatureNote,    premium: true },
              { text: T.subFeatureAi,      premium: false },
            ].map(({ text, premium }) => (
              <div key={text} className="flex items-center gap-2">
                <span className={`text-sm ${
                  isPremium || !premium ? 'text-[#3B6D11]' : 'text-[#B89F7A]'
                }`}>
                  {isPremium || !premium ? '✓' : '·'}
                </span>
                <span className="text-sm text-[#4A4A4A]">{text}</span>
              </div>
            ))}
          </div>
          {!isPremium && (
            <p className="text-xs text-[#8A8A8A] mt-3">{T.subPrice}</p>
          )}
        </div>

        {/* Actions */}
        {isPremium ? (
          <div className="space-y-3">
            <button
              onClick={openPortal}
              disabled={loading}
              className="w-full py-3 px-4 bg-[#2C3E50] text-white text-sm font-medium rounded-lg hover:bg-[#3d5166] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? T.subManageLoading : T.subManage}
            </button>
            <p className="text-xs text-center text-[#B89F7A]">
              {T.subManageHint}
            </p>

            {/* §312k BGB — mandatory cancellation button */}
            <div className="mt-5 pt-5 border-t border-[#E8DCC8]">
              <p className="text-xs text-[#AAAAAA] mb-2 text-center">
                {T.subCancelLaw}
              </p>
              <button
                onClick={openPortal}
                disabled={loading}
                className="w-full py-2.5 px-4 border border-[#E8DCC8] text-[#8A8A8A] text-sm rounded-lg hover:border-[#c0a882] hover:text-[#2C3E50] transition-colors disabled:opacity-50"
              >
                {loading ? '...' : T.subCancelBtn}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onUpgrade}
            className="w-full py-3 px-4 bg-[#B89F7A] text-white text-sm font-medium rounded-lg hover:bg-[#a38a5e] transition-colors"
          >
            {T.subUpgradeBtn}
          </button>
        )}

        {error && (
          <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            {error}
          </div>
        )}

        <p className="mt-8 text-xs text-[#CCBBAA] text-center leading-relaxed">
          {T.subPaymentNote}
        </p>
      </div>
    </motion.div>
  );
}

// Usage line — always shows exact numbers (used / limit) with progress bar
function UsageLine({
  label,
  used,
  limit,
  percent,
}: {
  label: string;
  used: number;
  limit: number;
  percent: number;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-[#6A6A6A]">{label}</span>
        <span className="text-xs text-[#8A8A8A]">{used} / {limit}</span>
      </div>
      <div className="h-1 bg-[#F0EAE0] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percent >= 90 ? 'bg-[#E24B4A]' : percent >= 60 ? 'bg-[#EF9F27]' : 'bg-[#B89F7A]'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
