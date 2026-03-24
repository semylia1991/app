import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Save, CheckCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Language } from '../i18n';
 
// ── Types ─────────────────────────────────────────────────────────────────────
 
export interface UserProfile {
  skinType: string[];
  skinSensitivity: string[];
  skinConditions: string[];
  ageRange: string;
  hairType: string[];
  scalpCondition: string[];
  hairProblems: string[];
  consentGiven: boolean;
}
 
const EMPTY_PROFILE: UserProfile = {
  skinType: [],
  skinSensitivity: [],
  skinConditions: [],
  ageRange: '',
  hairType: [],
  scalpCondition: [],
  hairProblems: [],
  consentGiven: false,
};
 
// ── Option helpers ─────────────────────────────────────────────────────────────
 
const SKIN_TYPES      = ['Жирная', 'Сухая', 'Комбинированная', 'Не знаю'];
const SENSITIVITIES   = ['Отдушки', 'Спирт', 'Эфирные масла', 'Нет'];
const SKIN_CONDITIONS = ['Акне', 'Розацеа', 'Атопический дерматит', 'Пигментация', 'Купероз', 'Нет'];
const AGE_RANGES      = ['До 25', '25–35', '35–45', '45–50', '50+'];
const HAIR_TYPES      = ['Прямые', 'Волнистые', 'Кудрявые', 'Спиральные', 'Ломкие', 'Не знаю'];
const SCALP_CONDS     = ['Сухая', 'Жирная', 'Нормальная', 'Не знаю'];
const HAIR_PROBLEMS   = ['Перхоть', 'Зуд / раздражение', 'Выпадение волос', 'Нет'];
 
const CONSENT_TEXT =
  'Ich willige ein, dass meine eingegebenen Hautdaten und Produktinformationen zum Zweck der personalisierten Analyse verarbeitet werden. Mir ist bekannt, dass es sich nicht um medizinische Beratung handelt. Ich kann meine Einwilligung jederzeit widerrufen.';
 
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
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 ${
              active
                ? 'bg-[#2C3E50] text-white border-[#2C3E50] shadow-sm'
                : 'bg-white text-[#4A4A4A] border-[#D4C3A3] hover:border-[#B89F7A] hover:text-[#2C3E50]'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
 
function SingleChip({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(active ? '' : opt)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 ${
              active
                ? 'bg-[#2C3E50] text-white border-[#2C3E50] shadow-sm'
                : 'bg-white text-[#4A4A4A] border-[#D4C3A3] hover:border-[#B89F7A] hover:text-[#2C3E50]'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
 
// ── Main component ─────────────────────────────────────────────────────────────
 
interface Props {
  user: SupabaseUser;
  lang: Language;
  onProfileChange?: (profile: UserProfile | null) => void;
}
 
export function UserProfilePanel({ user, lang, onProfileChange }: Props) {
  const [isOpen, setIsOpen]     = useState(false);
  const [profile, setProfile]   = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
 
  // ── Load from Supabase ───────────────────────────────────────────────────────
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
 
  // ── Save ─────────────────────────────────────────────────────────────────────
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
 
  const isComplete = profile.consentGiven;
 
  return (
    <>
      {/* Trigger button — matches ScanHistory style */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-[#B89F7A]/10 text-[#B89F7A] hover:bg-[#B89F7A]/20 hover:text-[#2C3E50] transition-all relative"
      >
        <User size={12} />
        <span>Профиль</span>
        {hasProfile && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#B89F7A]" />
        )}
      </button>
 
      <AnimatePresence>
        {/* Backdrop */}
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
 
        {/* Panel */}
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
                <h2 className="font-serif text-xl text-[#2C3E50]">Мой профиль</h2>
                <p className="text-[10px] text-[#B89F7A] uppercase tracking-widest mt-0.5">
                  Персональные критерии
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-[#B89F7A] hover:text-[#2C3E50] transition-colors">
                <X size={20} />
              </button>
            </div>
 
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-[#B89F7A] text-sm">
                  Загрузка...
                </div>
              ) : (
                <>
                  {/* ── Кожа ─────────────────────────────────────────────── */}
                  <SectionTitle emoji="🌟" label="Тип кожи" />
                  <MultiChip
                    options={SKIN_TYPES}
                    selected={profile.skinType}
                    onChange={v => update('skinType', v)}
                  />
 
                  <SectionTitle emoji="🌺" label="Чувствительность кожи" />
                  <MultiChip
                    options={SENSITIVITIES}
                    selected={profile.skinSensitivity}
                    onChange={v => update('skinSensitivity', v)}
                  />
 
                  <SectionTitle emoji="🌧" label="Состояния кожи" />
                  <MultiChip
                    options={SKIN_CONDITIONS}
                    selected={profile.skinConditions}
                    onChange={v => update('skinConditions', v)}
                  />
 
                  <SectionTitle emoji="☀️" label="Возраст" />
                  <SingleChip
                    options={AGE_RANGES}
                    selected={profile.ageRange}
                    onChange={v => update('ageRange', v)}
                  />
 
                  {/* ── Волосы ───────────────────────────────────────────── */}
                  <div className="mt-6 mb-3 w-full h-px bg-gradient-to-r from-transparent via-[#D4C3A3] to-transparent" />
 
                  <SectionTitle emoji="☘️" label="Тип волос" />
                  <MultiChip
                    options={HAIR_TYPES}
                    selected={profile.hairType}
                    onChange={v => update('hairType', v)}
                  />
 
                  <SectionTitle emoji="💧" label="Состояние кожи головы" />
                  <MultiChip
                    options={SCALP_CONDS}
                    selected={profile.scalpCondition}
                    onChange={v => update('scalpCondition', v)}
                  />
 
                  <SectionTitle emoji="🌵" label="Проблемы" />
                  <MultiChip
                    options={HAIR_PROBLEMS}
                    selected={profile.hairProblems}
                    onChange={v => update('hairProblems', v)}
                  />
 
                  {/* ── Согласие ─────────────────────────────────────────── */}
                  <div className="mt-6 mb-2 p-4 bg-[#F5F0E8] border border-[#D4C3A3] rounded-sm">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={profile.consentGiven}
                          onChange={e => update('consentGiven', e.target.checked)}
                          className="peer appearance-none w-4 h-4 border border-[#B89F7A] rounded-sm checked:bg-[#B89F7A] transition-colors cursor-pointer"
                        />
                        <svg
                          className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className="text-[10px] leading-relaxed text-[#4A4A4A] group-hover:text-[#2C3E50] transition-colors">
                        {CONSENT_TEXT}
                      </span>
                    </label>
                  </div>
 
                  {!profile.consentGiven && (
                    <p className="text-[10px] text-[#B89F7A] text-center mt-1 mb-2">
                      Необходимо согласие для сохранения профиля
                    </p>
                  )}
                </>
              )}
            </div>
 
            {/* Footer — save button */}
            <div className="px-6 py-4 border-t border-[#D4C3A3] shrink-0 bg-[#FDFBF7]">
              <button
                onClick={handleSave}
                disabled={!isComplete || loading}
                className="w-full py-3.5 regency-button tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saved ? (
                  <>
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-green-700">Сохранено</span>
                  </>
                ) : loading ? (
                  <span>Сохранение...</span>
                ) : (
                  <>
                    <Sparkles size={14} className="text-[#B89F7A]" />
                    <span>Сохранить профиль</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
