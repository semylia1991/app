import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Sparkles, CheckCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { t, Language } from '../i18n';

export interface UserProfile {
  skinType: string[];
  skinSensitivity: string[];
  skinConditions: string[];
  ageRange: string;
  hairType: string[];
  scalpCondition: string[];
  hairProblems: string[];
  climate: string[];
  consentGiven: boolean;
}

const EMPTY_PROFILE: UserProfile = {
  skinType: [], skinSensitivity: [], skinConditions: [],
  ageRange: '', hairType: [], scalpCondition: [], hairProblems: [],
  climate: [],
  allergies: '',
  consentGiven: false,
};

const SKIN_TYPE_KEYS      = ['skinOily', 'skinDry', 'skinCombination', 'skinUnknown'] as const;
const SENSITIVITY_KEYS    = ['sensIrritationAfterCare', 'sensReactionNewProducts', 'sensSunSensitivity', 'sensItching', 'sensTingling', 'sensFragrances', 'sensAlcohol', 'sensEssentialOils', 'sensNone'] as const;
const SKIN_CONDITION_KEYS = ['condEnlargedPores', 'condBreakouts', 'condBlackheads', 'condUnevenTone', 'condIrritation', 'condRedness', 'condDarkSpots', 'condDullness', 'condFlaking', 'condTightness', 'condUnevenTexture', 'condPuffiness', 'condDarkCircles', 'condVisibleVessels', 'condNone'] as const;
const AGE_RANGE_KEYS      = ['ageUnder25', 'age2535', 'age3545', 'age4550', 'age50plus'] as const;
const HAIR_TYPE_KEYS      = ['hairStraight', 'hairWavy', 'hairCurly', 'hairCoily', 'hairBrittle', 'hairUnknown'] as const;
const SCALP_COND_KEYS     = ['scalpDry', 'scalpOily', 'scalpNormal', 'scalpUnknown'] as const;
const HAIR_PROBLEM_KEYS   = ['hairDandruff', 'hairItching', 'hairLoss', 'hairNone'] as const;
const CLIMATE_KEYS        = ['climateDry', 'climateWindy', 'climateSunny', 'climateCold', 'climateHumid', 'climateAny'] as const;

const tr = (lang: Language, key: string): string =>
  (t[lang] as Record<string, string>)[key] ?? key;

export function translateProfile(profile: UserProfile, lang: Language) {
  return {
    skinType:        profile.skinType.map(k => tr(lang, k)),
    skinSensitivity: profile.skinSensitivity.map(k => tr(lang, k)),
    skinConditions:  profile.skinConditions.map(k => tr(lang, k)),
    ageRange:        profile.ageRange ? tr(lang, profile.ageRange) : '',
    hairType:        profile.hairType.map(k => tr(lang, k)),
    scalpCondition:  profile.scalpCondition.map(k => tr(lang, k)),
    hairProblems:    profile.hairProblems.map(k => tr(lang, k)),
    climate:         (profile.climate ?? []).map(k => tr(lang, k)),
  };
}

/* ── Section title ── */
function SectionTitle({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 20 }}>
      <span style={{ fontSize: 15 }}>{emoji}</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2D5A3D' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '0.5px', background: 'rgba(45,90,61,0.2)' }} />
    </div>
  );
}

/* ── Chip helpers ── */
function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '5px 12px',
    border: `1px solid ${active ? '#2D5A3D' : '#DDD5C8'}`,
    background: active ? '#2D5A3D' : '#FFFFFF',
    color: active ? '#FAF7F2' : '#5A5550',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.68rem', fontWeight: active ? 500 : 400,
    letterSpacing: '0.03em',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };
}

function MultiChip({ keys, selected, onChange, lang }: { keys: readonly string[]; selected: string[]; onChange: (v: string[]) => void; lang: Language }) {
  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {keys.map(key => (
        <button key={key} type="button" onClick={() => toggle(key)}
          style={chipStyle(selected.includes(key))}
          onMouseEnter={e => { if (!selected.includes(key)) { e.currentTarget.style.borderColor = '#2D5A3D'; e.currentTarget.style.color = '#2D5A3D'; }}}
          onMouseLeave={e => { if (!selected.includes(key)) { e.currentTarget.style.borderColor = '#DDD5C8'; e.currentTarget.style.color = '#5A5550'; }}}
        >
          {tr(lang, key)}
        </button>
      ))}
    </div>
  );
}

function SingleChip({ keys, selected, onChange, lang }: { keys: readonly string[]; selected: string; onChange: (v: string) => void; lang: Language }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {keys.map(key => (
        <button key={key} type="button" onClick={() => onChange(selected === key ? '' : key)}
          style={chipStyle(selected === key)}
          onMouseEnter={e => { if (selected !== key) { e.currentTarget.style.borderColor = '#2D5A3D'; e.currentTarget.style.color = '#2D5A3D'; }}}
          onMouseLeave={e => { if (selected !== key) { e.currentTarget.style.borderColor = '#DDD5C8'; e.currentTarget.style.color = '#5A5550'; }}}
        >
          {tr(lang, key)}
        </button>
      ))}
    </div>
  );
}

/* ── Main component ── */
interface Props {
  user: SupabaseUser;
  lang: Language;
  onProfileChange?: (profile: UserProfile | null) => void;
  initialHasProfile?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function UserProfilePanel({ user, lang, onProfileChange, initialHasProfile = false, externalOpen, onExternalOpenChange }: Props) {
  const [isOpen, setIsOpen]         = useState(false);
  const [profile, setProfile]       = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [hasProfile, setHasProfile] = useState(initialHasProfile);
  const [deleting, setDeleting]     = useState(false);

  const T = t[lang];

  useEffect(() => {
    if (externalOpen) { setIsOpen(true); onExternalOpenChange?.(false); }
  }, [externalOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    supabase.from('user_profiles').select('profile').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data?.profile) { setProfile(data.profile as UserProfile); setHasProfile(true); onProfileChange?.(data.profile as UserProfile); }
        setLoading(false);
      });
  }, [isOpen]);

  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setProfile(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!profile.consentGiven) return;
    setLoading(true);
    await supabase.from('user_profiles').upsert({ user_id: user.id, profile }, { onConflict: 'user_id' });
    setLoading(false); setSaved(true); setHasProfile(true); onProfileChange?.(profile);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm(T.deleteProfileConfirm)) return;
    setDeleting(true);
    await supabase.from('user_profiles').delete().eq('user_id', user.id);
    setProfile(EMPTY_PROFILE); setHasProfile(false); onProfileChange?.(null); setDeleting(false);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(T.deleteAccountConfirm)) return;
    setDeleting(true);
    await supabase.from('user_profiles').delete().eq('user_id', user.id);
    await supabase.from('scan_history').delete().eq('user_id', user.id);
    await supabase.auth.signOut();
    setDeleting(false); setIsOpen(false);
  };

  const triggerBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 8px',
    border: '1px solid #DDD5C8',
    background: 'transparent',
    color: '#2D5A3D',
    fontSize: '0.55rem', fontWeight: 500,
    fontFamily: 'var(--font-sans)', letterSpacing: '0.08em',
    textTransform: 'uppercase', cursor: 'pointer',
    transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
    position: 'relative',
  };

  return (
    <>
      {/* Trigger — квадратная рамка */}
      <button onClick={() => setIsOpen(true)} style={triggerBtn}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D5A3D'; e.currentTarget.style.background = '#E8F2EB'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDD5C8'; e.currentTarget.style.background = 'transparent'; }}
      >
        <User size={12} />
        <span>{lang === 'ru' ? 'Предпочтения' : lang === 'uk' ? 'Вподобання' : lang === 'de' ? 'Einstellungen' : lang === 'es' ? 'Preferencias' : lang === 'fr' ? 'Préférences' : lang === 'it' ? 'Preferenze' : lang === 'tr' ? 'Tercihler' : 'Preferences'}</span>
        {hasProfile && (
          <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: '#2D5A3D' }} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div key="profile-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100 }}
          />
        )}

        {isOpen && (
          <motion.div key="profile-panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: 380, background: '#FAF7F2', zIndex: 101, boxShadow: '0 0 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '0.5px solid #DDD5C8', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 300, color: '#1A1410' }}>{T.profileTitle}</h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8A8078', marginTop: 2 }}>
                  {T.profileSubtitle}
                </p>
              </div>
              <button onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8078', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1A1410')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8A8078')}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#2D5A3D', fontSize: '0.875rem' }}>...</div>
              ) : (
                <>
                  <SectionTitle emoji="🌟" label={T.profileSkinType} />
                  <MultiChip keys={SKIN_TYPE_KEYS} selected={profile.skinType} onChange={v => update('skinType', v)} lang={lang} />

                  <SectionTitle emoji="🌺" label={T.profileSkinSensitivity} />
                  <MultiChip keys={SENSITIVITY_KEYS} selected={profile.skinSensitivity} onChange={v => update('skinSensitivity', v)} lang={lang} />

                  <SectionTitle emoji="🌧" label={T.profileSkinConditions} />
                  <MultiChip keys={SKIN_CONDITION_KEYS} selected={profile.skinConditions} onChange={v => update('skinConditions', v)} lang={lang} />

                  <SectionTitle emoji="☀️" label={T.profileAge} />
                  <SingleChip keys={AGE_RANGE_KEYS} selected={profile.ageRange} onChange={v => update('ageRange', v)} lang={lang} />

                  {/* Divider */}
                  <div style={{ margin: '20px 0', height: '0.5px', background: 'linear-gradient(to right, transparent, #DDD5C8, transparent)' }} />

                  <SectionTitle emoji="☘️" label={T.profileHairType} />
                  <MultiChip keys={HAIR_TYPE_KEYS} selected={profile.hairType} onChange={v => update('hairType', v)} lang={lang} />

                  <SectionTitle emoji="💧" label={T.profileScalpCondition} />
                  <MultiChip keys={SCALP_COND_KEYS} selected={profile.scalpCondition} onChange={v => update('scalpCondition', v)} lang={lang} />

                  <SectionTitle emoji="🌵" label={T.profileHairProblems} />
                  <MultiChip keys={HAIR_PROBLEM_KEYS} selected={profile.hairProblems} onChange={v => update('hairProblems', v)} lang={lang} />

                  <SectionTitle emoji="🌍" label={T.profileClimate} />
                  <MultiChip keys={CLIMATE_KEYS} selected={profile.climate ?? []} onChange={v => update('climate', v)} lang={lang} />

                  {/* Consent */}
                  <div style={{ marginTop: 20, marginBottom: 8, padding: 16, background: '#E8F2EB', border: '0.5px solid rgba(45,90,61,0.2)' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={profile.consentGiven}
                          onChange={e => update('consentGiven', e.target.checked)}
                          style={{ appearance: 'none', width: 15, height: 15, border: `1px solid ${profile.consentGiven ? '#2D5A3D' : 'rgba(45,90,61,0.4)'}`, background: profile.consentGiven ? '#2D5A3D' : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                        />
                        {profile.consentGiven && (
                          <svg style={{ position: 'absolute', width: 10, height: 10, color: 'white', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', lineHeight: 1.65, color: '#1A1410' }}>
                        {T.profileConsent}
                      </span>
                    </label>
                  </div>

                  {!profile.consentGiven && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: '#8A8078', textAlign: 'center', marginBottom: 8 }}>
                      {T.profileConsentRequired}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '0.5px solid #DDD5C8', flexShrink: 0, background: '#FAF7F2', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Save */}
              <button onClick={handleSave} disabled={!profile.consentGiven || loading || deleting}
                className="luxury-btn"
                style={{ width: '100%', padding: '13px', opacity: (!profile.consentGiven || loading || deleting) ? 0.4 : 1 }}>
                {saved
                  ? <><CheckCircle size={15} style={{ color: '#E8F2EB' }} /><span style={{ color: '#E8F2EB' }}>{T.profileSaved}</span></>
                  : loading ? <span>{T.profileSaving}</span>
                  : <><Sparkles size={14} /><span>{T.profileSave}</span></>}
              </button>

              {/* Delete profile */}
              {hasProfile && (
                <button onClick={handleDeleteProfile} disabled={deleting}
                  style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ef4444', background: 'transparent', border: '0.5px solid rgba(239,68,68,0.25)', cursor: 'pointer', transition: 'all 0.2s', opacity: deleting ? 0.4 : 1 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}>
                  <Trash2 size={12} />
                  <span>{deleting ? T.deleting : T.deleteProfile}</span>
                </button>
              )}

              {/* Delete account */}
              <button onClick={handleDeleteAccount} disabled={deleting}
                style={{ width: '100%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: '0.6rem', fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.5)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s', opacity: deleting ? 0.4 : 1 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.5)')}>
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
