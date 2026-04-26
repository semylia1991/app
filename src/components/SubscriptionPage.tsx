import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Language, t } from '../i18n';
import type { User } from '@supabase/supabase-js';
import type { SubscriptionState } from '../hooks/useSubscription';

interface Props {
  user: User;
  subscription: SubscriptionState;
  lang: Language;
  onBack: () => void;
  onUpgrade?: () => void; // legacy — kept for backward compatibility
}

// ── Tier definitions ────────────────────────────────────────────
// IDs match Stripe Price IDs configured in env (STRIPE_PRICE_BASIC / WITHYOU / GENEROUS)
type TierId = 'basic' | 'withyou' | 'generous' | 'custom';

interface Tier {
  id: TierId;
  amount: number;       // EUR per week
  labelKey: 'tierBasic' | 'tierWithYou' | 'tierGenerous' | 'tierCustom';
  emoji?: string;
}

const TIERS: Tier[] = [
  { id: 'basic',    amount: 1.99, labelKey: 'tierBasic' },
  { id: 'withyou',  amount: 2.99, labelKey: 'tierWithYou', emoji: '⭐' },
  { id: 'generous', amount: 4.99, labelKey: 'tierGenerous' },
  { id: 'custom',   amount: 0,    labelKey: 'tierCustom' },
];

// 3% donation share (display-only, source of truth = backend)
const DONATION_PCT = 0.03;
const MIN_CUSTOM = 1;
const MAX_CUSTOM = 99;

export function SubscriptionPage({ user, subscription, lang, onBack }: Props) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  // Preselected: "I'm with you" ⭐
  const [selectedTier, setSelectedTier] = useState<TierId>('withyou');
  const [customAmount, setCustomAmount] = useState<string>('3.99');

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

  // ── Start checkout for the selected tier ───────────────────────
  const handleSupport = async () => {
    setLoading(true);
    setError(null);
    try {
      let amount = 0;
      if (selectedTier === 'custom') {
        const parsed = Number(customAmount.replace(',', '.'));
        if (Number.isNaN(parsed) || parsed < MIN_CUSTOM || parsed > MAX_CUSTOM) {
          throw new Error(T.tierCustomError);
        }
        amount = Math.round(parsed * 100) / 100;
      } else {
        amount = TIERS.find(t => t.id === selectedTier)!.amount;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: user.id,
          tier: selectedTier,
          amount,         // EUR per week, only used for 'custom'
          interval: 'week',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout error');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const usagePercent = (used: number, limit: number) =>
    Math.min(100, Math.round((used / limit) * 100));

  const selectedAmount =
    selectedTier === 'custom'
      ? Number(customAmount.replace(',', '.')) || 0
      : TIERS.find(t => t.id === selectedTier)!.amount;
  const donationAmount = (selectedAmount * DONATION_PCT).toFixed(2);

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

        {/* ── Current plan ─────────────────────────────────────── */}
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

        {/* ── Premium unlocks (NEW) ────────────────────────────── */}
        {isPremium ? (
          // Existing premium user — show their features
          <div className="bg-white border border-[#E8DCC8] rounded-lg p-5 mb-6">
            <p className="text-xs font-medium text-[#8A8A8A] uppercase tracking-wider mb-3">
              {T.subYourFeatures}
            </p>
            <div className="space-y-2">
              {[T.subFeatureScans, T.subFeatureHistory, T.subFeatureNote, T.subFeatureAi].map(text => (
                <div key={text} className="flex items-center gap-2">
                  <span className="text-sm text-[#3B6D11]">✓</span>
                  <span className="text-sm text-[#4A4A4A]">{text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#E8DCC8] rounded-lg p-5 mb-6">
            <p className="text-xs font-medium text-[#8A8A8A] uppercase tracking-wider mb-4">
              {T.subPremiumUnlocks}
            </p>

            {/* Photo + author */}
            <div className="flex items-start gap-3 mb-5">
              <div className="flex flex-col items-center shrink-0">
                <img
                  src="/yuliia.jpg"
                  alt="Yuliia Parkina"
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#E8DCC8]"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <p className="text-[9px] uppercase tracking-wide text-[#B89F7A] mt-1 text-center leading-tight max-w-[56px]">
                  {T.tierPhotoCredit}
                </p>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm text-[#2C3E50] font-serif leading-snug mb-1">
                  {T.tierAuthorIntro}
                </p>
                <p className="text-xs text-[#6A6A6A] leading-relaxed">
                  {T.tierAuthorReason}
                </p>
              </div>
            </div>

            {/* Donation note */}
            <div className="bg-[#F5F1EB] rounded-lg p-3 mb-4 flex items-start gap-2">
              <Heart size={14} className="text-[#B89F7A] mt-0.5 shrink-0" />
              <p className="text-xs text-[#4A4A4A] leading-relaxed">
                {T.tierMalteserNote}
              </p>
            </div>

            {/* Premium benefits — shown right after Malteser note */}
            <div className="bg-[#2C3E50] rounded-lg p-4 mb-5">
              <p className="text-[10px] uppercase tracking-widest text-[#B89F7A] mb-3">
                {T.tierBenefitsLabel}
              </p>
              <div className="space-y-2">
                {[
                  { icon: '🔍', text: T.tierBenefit1 },
                  { icon: '⚠️', text: T.tierBenefit2 },
                  { icon: '🤖', text: T.tierBenefit3 },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="text-base leading-none">{icon}</span>
                    <span className="text-sm font-semibold text-white leading-tight">{text}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#B89F7A]/70 mt-3">{T.tierCancelEasy}</p>
            </div>

            {/* Tier picker */}
            <p className="text-sm font-medium text-[#2C3E50] mb-3">
              {T.tierChoose}
            </p>
            <div className="space-y-2 mb-4">
              {TIERS.map(tier => {
                const isSelected = selectedTier === tier.id;
                const label = T[tier.labelKey];
                return (
                  <label
                    key={tier.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#B89F7A] bg-[#FAF6EE] ring-1 ring-[#B89F7A]/40'
                        : 'border-[#E8DCC8] hover:border-[#D4C3A3]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      checked={isSelected}
                      onChange={() => setSelectedTier(tier.id)}
                      className="accent-[#B89F7A]"
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {tier.id !== 'custom' && (
                          <span className="text-sm font-semibold text-[#2C3E50]">
                            €{tier.amount.toFixed(2)}
                          </span>
                        )}
                        <span className="text-sm text-[#4A4A4A]">
                          {label}{tier.emoji ? ` ${tier.emoji}` : ''}
                        </span>
                      </div>
                      {tier.id === 'withyou' && (
                        <span className="text-[10px] text-[#B89F7A] uppercase tracking-wider">
                          {T.tierPreselected}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Custom amount input */}
            {selectedTier === 'custom' && (
              <div className="mb-4">
                <label className="block text-xs text-[#6A6A6A] mb-1">
                  {T.tierCustomLabel}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#2C3E50]">€</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={MIN_CUSTOM}
                    max={MAX_CUSTOM}
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#E8DCC8] rounded-lg text-sm text-[#2C3E50] focus:outline-none focus:border-[#B89F7A]"
                  />
                  <span className="text-xs text-[#8A8A8A]">{T.tierPerWeek}</span>
                </div>
                <p className="text-[10px] text-[#AAAAAA] mt-1">
                  {T.tierCustomHint}
                </p>
              </div>
            )}

            {/* Donation breakdown */}
            <p className="text-[11px] text-[#8A8A8A] text-center mb-4">
              {T.tierDonationOf} €{donationAmount} {T.tierDonationGoes}
            </p>

            {/* CTA */}
            <button
              onClick={handleSupport}
              disabled={loading || (selectedTier === 'custom' && !customAmount)}
              className="w-full py-3 px-4 bg-[#B89F7A] text-white text-sm font-medium rounded-lg hover:bg-[#a38a5e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Heart size={14} />
              {loading ? T.subManageLoading : T.tierSupportBtn}
            </button>
          </div>
        )}

        {/* ── Existing-premium actions ─────────────────────────── */}
        {isPremium && (
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

// ── Usage line ────────────────────────────────────────────────
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
