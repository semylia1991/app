import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Sparkles, CheckCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { t, Language } from '../i18n';
 
// ── Types ─────────────────────────────────────────────────────────────────────
 
// Profile stores CANONICAL KEYS (e.g. "skinOily", "condAcne"), NOT translated strings.
// This makes the profile language-independent — display translates on render.
export interface UserProfile {
  skinType: string[];        // keys: skinOily | skinDry | skinCombination | skinUnknown
  skinSensitivity: string[]; // keys: sensFragrances | sensAlcohol | sensEssentialOils | sensNone
  skinConditions: string[];  // keys: condAcne | condRosacea | condAtopicDermatitis | condPigmentation | condCouperose | condNone
  ageRange: string;          // key: ageUnder25 | age2535 | age3545 | age4550 | age50plus
  hairType: string[];        // keys: hairStraight | hairWavy | hairCurly | hairCoily | hairBrittle | hairUnknown
  scalpCondition: string[];  // keys: scalpDry | scalpOily | scalpNormal | scalpUnknown
  hairProblems: string[];    // keys: hairDandruff | hairItching | hairLoss | hairNone
  climate: string[];         // keys: climateDry | climateWindy | climateSunny | climateCold | climateHumid | climateAny
  allergies: string;         // free-text: e.g. "nut oil, lanolin, propolis"
  consentGiven: boolean;
}
 
const EMPTY_PROFILE: UserProfile = {
  skinType: [], skinSensitivity: [], skinConditions: [],
  ageRange: '', hairType: [], scalpCondition: [], hairProblems: [],
  climate: [],
  allergies: '',
  consentGiven: false,
};
 
// ── Option definitions — canonical key → i18n key (same value here) ───────────
 
const SKIN_TYPE_KEYS      = ['skinOily',       'skinDry',        'skinCombination',      'skinUnknown'] as const;
const SENSITIVITY_KEYS    = ['sensFragrances', 'sensAlcohol',    'sensEssentialOils',    'sensNone'] as const;
const SKIN_CONDITION_KEYS = ['condAcne',       'condRosacea',    'condAtopicDermatitis', 'condPigmentation', 'condCouperose', 'condNone'] as const;
const AGE_RANGE_KEYS      = ['ageUnder25',     'age2535',        'age3545',              'age4550',          'age50plus'] as const;
const HAIR_TYPE_KEYS      = ['hairStraight',   'hairWavy',       'hairCurly',            'hairCoily',        'hairBrittle',  'hairUnknown'] as const;
const SCALP_COND_KEYS     = ['scalpDry',       'scalpOily',      'scalpNormal',          'scalpUnknown'] as const;
const HAIR_PROBLEM_KEYS   = ['hairDandruff',   'hairItching',    'hairLoss',             'hairNone'] as const;
const CLIMATE_KEYS        = ['climateDry', 'climateWindy', 'climateSunny', 'climateCold', 'climateHumid', 'climateAny'] as const;
 
// Translate a canonical key to the current language
type TranslationKey = keyof ReturnType<typeof t['en']>;
const tr = (lang: Language, key: string): string =>
  (t[lang] as Record<string, string>)[key] ?? key;
 
// ── Sub-components ─────────────────────────────────────────────────────────────
 
function SectionTitle({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <span className="text-base">{emoji}</span>
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#B89F7A]">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#D4C3A3]/50" />
    </div>
  );
}
 
function MultiChip({
  keys, selected, onChange, lang,
}: {
  keys: readonly string[];
  selected: string[];
  onChange: (val: string[]) => void;
  lang: Language;
}) {
  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  return (
    <div className="flex flex-wrap gap-2">
      {keys.map(key => {
        const active = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 ${
              active
                ? 'bg-[#2C3E50] text-white border-[#2C3E50] shadow-sm'
                : 'bg-white text-[#4A4A4A] border-[#D4C3A3] hover:border-[#B89F7A] hover:text-[#2C3E50]'
            }`}
          >
            {tr(lang, key)}
          </button>
        );
      })}
    </div>
  );
}
 
function SingleChip({
  keys, selected, onChange, lang,
}: {
  keys: readonly string[];
  selected: string;
  onChange: (val: string) => void;
  lang: Language;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {keys.map(key => {
        const active = selected === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(active ? '' : key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 ${
              active
                ? 'bg-[#2C3E50] text-white border-[#2C3E50] shadow-sm'
                : 'bg-white text-[#4A4A4A] border-[#D4C3A3] hover:border-[#B89F7A] hover:text-[#2C3E50]'
            }`}
          >
            {tr(lang, key)}
          </button>
        );
      })}
    </div>
  );
}
 
// ── Helper: translate stored profile keys for display / AI prompt ─────────────
export function translateProfile(profile: UserProfile, lang: Language) {
  return {
    skinType:       profile.skinType.map(k => tr(lang, k)),
    skinSensitivity:profile.skinSensitivity.map(k => tr(lang, k)),
    skinConditions: profile.skinConditions.map(k => tr(lang, k)),
    ageRange:       profile.ageRange ? tr(lang, profile.ageRange) : '',
    hairType:       profile.hairType.map(k => tr(lang, k)),
    scalpCondition: profile.scalpCondition.map(k => tr(lang, k)),
    hairProblems:   profile.hairProblems.map(k => tr(lang, k)),
    climate:        (profile.climate ?? []).map(k => tr(lang, k)),
    allergies:      profile.allergies ?? '',
  };
}
 
// ── Main component ─────────────────────────────────────────────────────────────
 
interface Props {
  user: SupabaseUser;
  lang: Language;
  onProfileChange?: (profile: UserProfile | null) => void;
  initialHasProfile?: boolean;
}
 
export function UserProfilePanel({ user, lang, onProfileChange, initialHasProfile = false }: Props) {
  const [isOpen, setIsOpen]         = useState(false);
  const [profile, setProfile]       = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [hasProfile, setHasProfile] = useState(initialHasProfile);
  const [deleting, setDeleting]     = useState(false);
 
  const T = t[lang];
 
  // Load from Supabase on open
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    supabase
      .from('user_profiles')
      .select('profile')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.profile) {
          setProfile(data.profile as UserProfile);
          setHasProfile(true);
          onProfileChange?.(data.profile as UserProfile);
        }
        setLoading(false);
      });
  }, [isOpen]);
 
  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setProfile(prev => ({ ...prev, [key]: value }));
 
  const handleSave = async () => {
    if (!profile.consentGiven) return;
    setLoading(true);
    await supabase
      .from('user_profiles')
      .upsert({ user_id: user.id, profile }, { onConflict: 'user_id' });
    setLoading(false);
    setSaved(true);
    setHasProfile(true);
    onProfileChange?.(profile);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm(T.deleteProfileConfirm)) return;
    setDeleting(true);
    await supabase.from('user_profiles').delete().eq('user_id', user.id);
    setProfile(EMPTY_PROFILE);
    setHasProfile(false);
    onProfileChange?.(null);
    setDeleting(false);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(T.deleteAccountConfirm)) return;
    setDeleting(true);
    // Delete all user data from tables
    await supabase.from('user_profiles').delete().eq('user_id', user.id);
    await supabase.from('scan_history').delete().eq('user_id', user.id);
    // Sign out — account deletion from auth requires server-side call
    await supabase.auth.signOut();
    setDeleting(false);
    setIsOpen(false);
  };
 
  return (
    <>
      {/* Trigger button — label from i18n */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-[#B89F7A]/10 text-[#B89F7A] hover:bg-[#B89F7A]/20 hover:text-[#2C3E50] transition-all relative"
      >
        <User size={12} />
        <span>{T.profile}</span>
        {hasProfile && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#B89F7A]" />
        )}
      </button>
 
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="profile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
        )}
 
        {isOpen && (
          <motion.div
            key="profile-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#FDFBF7] z-[101] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#D4C3A3] shrink-0">
              <div>
                <h2 className="font-serif text-xl text-[#2C3E50]">{T.profileTitle}</h2>
                <p className="text-[10px] text-[#B89F7A] uppercase tracking-widest mt-0.5">
                  {T.profileSubtitle}
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-[#B89F7A] hover:text-[#2C3E50] transition-colors">
                <X size={20} />
              </button>
            </div>
 
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-[#B89F7A] text-sm">...</div>
              ) : (
                <>
                  {/* Skin */}
                  <SectionTitle emoji="🌟" label={T.profileSkinType} />
                  <MultiChip keys={SKIN_TYPE_KEYS} selected={profile.skinType} onChange={v => update('skinType', v)} lang={lang} />
 
                  <SectionTitle emoji="🌺" label={T.profileSkinSensitivity} />
                  <MultiChip keys={SENSITIVITY_KEYS} selected={profile.skinSensitivity} onChange={v => update('skinSensitivity', v)} lang={lang} />
 
                  <SectionTitle emoji="🌧" label={T.profileSkinConditions} />
                  <MultiChip keys={SKIN_CONDITION_KEYS} selected={profile.skinConditions} onChange={v => update('skinConditions', v)} lang={lang} />
 
                  <SectionTitle emoji="☀️" label={T.profileAge} />
                  <SingleChip keys={AGE_RANGE_KEYS} selected={profile.ageRange} onChange={v => update('ageRange', v)} lang={lang} />
 
                  <div className="mt-6 mb-3 w-full h-px bg-gradient-to-r from-transparent via-[#D4C3A3] to-transparent" />
 
                  {/* Hair */}
                  <SectionTitle emoji="☘️" label={T.profileHairType} />
                  <MultiChip keys={HAIR_TYPE_KEYS} selected={profile.hairType} onChange={v => update('hairType', v)} lang={lang} />
 
                  <SectionTitle emoji="💧" label={T.profileScalpCondition} />
                  <MultiChip keys={SCALP_COND_KEYS} selected={profile.scalpCondition} onChange={v => update('scalpCondition', v)} lang={lang} />
 
                  <SectionTitle emoji="🌵" label={T.profileHairProblems} />
                  <MultiChip keys={HAIR_PROBLEM_KEYS} selected={profile.hairProblems} onChange={v => update('hairProblems', v)} lang={lang} />

                  <SectionTitle emoji="🌍" label={T.profileClimate} />
                  <MultiChip keys={CLIMATE_KEYS} selected={profile.climate ?? []} onChange={v => update('climate', v)} lang={lang} />

                  <SectionTitle emoji="⚠️" label={T.profileAllergies} />
                  <textarea
                    value={profile.allergies}
                    onChange={e => update('allergies', e.target.value)}
                    placeholder={T.profileAllergiesPlaceholder}
                    rows={2}
                    className="w-full px-3 py-2 text-xs text-[#2C3E50] border border-[#D4C3A3] rounded-sm bg-white focus:outline-none focus:border-[#B89F7A] resize-none placeholder:text-[#B89F7A]/50"
                  />
 
                  {/* Consent */}
                  <div className="mt-6 mb-2 p-4 bg-[#F5F0E8] border border-[#D4C3A3] rounded-sm">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={profile.consentGiven}
                          onChange={e => update('consentGiven', e.target.checked)}
                          className="peer appearance-none w-4 h-4 border border-[#B89F7A] rounded-sm checked:bg-[#B89F7A] transition-colors cursor-pointer"
                        />
                        <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className="text-[10px] leading-relaxed text-[#4A4A4A] group-hover:text-[#2C3E50] transition-colors">
                        {T.profileConsent}
                      </span>
                    </label>
                  </div>
 
                  {!profile.consentGiven && (
                    <p className="text-[10px] text-[#B89F7A] text-center mt-1 mb-2">
                      {T.profileConsentRequired}
                    </p>
                  )}
                </>
              )}
            </div>
 
            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#D4C3A3] shrink-0 bg-[#FDFBF7] space-y-2">
              <button
                onClick={handleSave}
                disabled={!profile.consentGiven || loading || deleting}
                className="w-full py-3.5 regency-button tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saved ? (
                  <><CheckCircle size={16} className="text-green-600" /><span className="text-green-700">{T.profileSaved}</span></>
                ) : loading ? (
                  <span>{T.profileSaving}</span>
                ) : (
                  <><Sparkles size={14} className="text-[#B89F7A]" /><span>{T.profileSave}</span></>
                )}
              </button>

              {hasProfile && (
                <button
                  onClick={handleDeleteProfile}
                  disabled={deleting}
                  className="w-full py-2.5 flex items-center justify-center gap-2 text-[11px] tracking-widest uppercase text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={12} />
                  <span>{deleting ? T.deleting : T.deleteProfile}</span>
                </button>
              )}

              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="w-full py-2 flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase text-red-300 hover:text-red-500 transition-colors disabled:opacity-40"
              >
                <Trash2 size={11} />
                <span>{deleting ? T.deleting : T.deleteAccount}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
