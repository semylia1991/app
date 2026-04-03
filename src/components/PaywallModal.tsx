import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, History, Crown, Loader2, LogIn } from 'lucide-react';
import { Language, t } from '../i18n';
import { supabase } from '../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  reason: 'scans' | 'note' | 'askAi';
  userId?: string;
}

const REASONS: Record<string, Record<string, string>> = {
  scans: {
    en: "You've used all 15 free scans for today.",
    ru: "Вы использовали все 15 бесплатных сканирований на сегодня.",
    de: "Sie haben alle 15 kostenlosen Scans für heute verwendet.",
    uk: "Ви використали всі 15 безкоштовних сканувань на сьогодні.",
    es: "Has usado los 15 escaneos gratuitos de hoy.",
    fr: "Vous avez utilisé les 15 scans gratuits d'aujourd'hui.",
    it: "Hai usato i 15 scan gratuiti di oggi.",
    tr: "Bugünkü 15 ücretsiz taramanızı kullandınız.",
  },
  note: {
    en: "You've reached the limit of 15 free 'Pay Attention' analyses today.",
    ru: "Вы достигли лимита в 15 бесплатных анализов «Обрати внимание» на сегодня.",
    de: "Sie haben das Limit von 15 kostenlosen 'Beachte'-Analysen erreicht.",
    uk: "Ви досягли ліміту в 15 безкоштовних аналізів «Зверни увагу» на сьогодні.",
    es: "Has alcanzado el límite de 15 análisis gratuitos 'Atención' hoy.",
    fr: "Vous avez atteint la limite de 15 analyses 'Attention' gratuites aujourd'hui.",
    it: "Hai raggiunto il limite di 15 analisi 'Attenzione' gratuite oggi.",
    tr: "Bugünkü 15 ücretsiz 'Dikkat' analizinizi kullandınız.",
  },
  askAi: {
    en: "You've used all 3 free AI questions for today.",
    ru: "Вы использовали все 3 бесплатных вопроса к ИИ на сегодня.",
    de: "Sie haben alle 3 kostenlosen KI-Fragen für heute verwendet.",
    uk: "Ви використали всі 3 безкоштовних питання до ШІ на сьогодні.",
    es: "Has usado las 3 preguntas gratuitas de IA de hoy.",
    fr: "Vous avez utilisé les 3 questions IA gratuites d'aujourd'hui.",
    it: "Hai usato le 3 domande AI gratuite di oggi.",
    tr: "Bugünkü 3 ücretsiz AI sorunuzu kullandınız.",
  },
};

const FEATURES: Record<Language, string[]> = {
  en: ['Up to 100 scans per day', 'Up to 100 «Beachte» analyses', 'Up to 10 AI questions per day', 'No ads during analysis'],
  ru: ['До 100 сканирований в день', 'До 100 анализов «Beachte»', 'До 10 вопросов к ИИ в день', 'Без рекламы во время анализа'],
  de: ['Bis zu 100 Scans pro Tag', 'Bis zu 100 «Beachte»-Analysen', '10 KI-Fragen pro Tag',  'Keine Werbung während der Analyse'],
  uk: ['До 100 сканувань на день', 'До 100 аналізів «Beachte»', 'До 10 запитань до ШІ на день', 'Без реклами під час аналізу'],
  es: ['Hasta 100 escaneos por día', 'Hasta 100 análisis de «Beachte»', 'Hasta 10 preguntas a la IA por día', 'Sin anuncios durante el análisis'],
  fr: ['Jusqu’à 100 scans par jour', 'Jusqu’à 100 analyses «Beachte»', 'Jusqu’à 10 questions à l’IA par jour', 'Sans publicité pendant l’analyse'],
  it: ['Fino a 100 scansioni al giorno', 'Fino a 100 analisi «Beachte»', 'Fino a 10 domande all’IA al giorno', 'Nessuna pubblicità durante l’analisi'],
  tr: ['Günde en fazla 100 tarama', 'En fazla 100 «Beachte» analizi', 'Günde en fazla 10 yapay zeka sorusu', 'Analiz sırasında reklam yok'],
};

const UPGRADE_LABEL: Record<Language, string> = {
  en: 'Upgrade to Premium — €4.99/mo',
  ru: 'Перейти на Premium — €4.99/мес',
  de: 'Auf Premium upgraden — €4,99/Mo',
  uk: 'Перейти на Premium — €4.99/міс',
  es: 'Actualizar a Premium — €4,99/mes',
  fr: "Passer à Premium — 4,99 €/mois",
  it: 'Passa a Premium — €4,99/mese',
  tr: "Premium'a Geç — €4,99/ay",
};

const MAYBE_LATER: Record<Language, string> = {
  en: 'Maybe later',
  ru: 'Позже',
  de: 'Vielleicht später',
  uk: 'Пізніше',
  es: 'Quizás después',
  fr: 'Plus tard',
  it: 'Forse dopo',
  tr: 'Belki sonra',
};

export function PaywallModal({ isOpen, onClose, lang, reason, userId }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    setIsSigningIn(false);
  };

  const handleUpgrade = async () => {
    // Safety guard — should never happen because button is hidden when userId is missing
    if (!userId) {
      setUpgradeError('Please sign in first.');
      return;
    }
    setIsLoading(true);
    setUpgradeError(null);
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setUpgradeError(data.error ?? 'Something went wrong. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setUpgradeError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  const reasonText = REASONS[reason]?.[lang] ?? REASONS[reason]?.['en'] ?? '';
  const features = FEATURES[lang] ?? FEATURES['en'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-sm bg-[#FDFBF7] border border-[#D4C3A3] shadow-2xl relative"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#2C3E50] to-[#4A3728] px-6 pt-8 pb-6 text-center">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-full bg-[#B89F7A]/20 border border-[#B89F7A]/40 flex items-center justify-center">
                  <Crown size={28} className="text-[#B89F7A]" />
                </div>
              </div>
              <h2 className="text-xl font-serif text-white mb-1">GlowKey Premium</h2>
              <p className="text-xs text-white/60 leading-relaxed">{reasonText}</p>
            </div>

            {/* Price */}
            <div className="text-center py-4 border-b border-[#D4C3A3]">
              <span className="text-4xl font-serif text-[#2C3E50]">€4.99</span>
              <span className="text-sm text-[#B89F7A] ml-1">/mo</span>
            </div>

            {/* Features */}
            <div className="px-6 py-4 space-y-2.5">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#B89F7A]/15 flex items-center justify-center shrink-0">
                    <span className="text-[10px] text-[#B89F7A]">✦</span>
                  </div>
                  <span className="text-sm text-[#2C3E50]">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-6 pb-6 pt-2 space-y-3">
              {!userId ? (
                <>
                  <p className="text-xs text-center text-[#B89F7A] leading-relaxed">
                    {lang === 'de' ? 'Bitte melden Sie sich an, um Premium zu abonnieren.' :
                     lang === 'ru' ? 'Войдите, чтобы оформить подписку.' :
                     lang === 'uk' ? 'Увійдіть, щоб оформити підписку.' :
                     'Please sign in to subscribe.'}
                  </p>
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="w-full py-3.5 bg-[#2C3E50] text-white text-xs tracking-widest uppercase font-semibold hover:bg-[#2C3E50]/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isSigningIn ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <LogIn size={14} />
                    )}
                    {t[lang].signIn}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleUpgrade}
                    disabled={isLoading}
                    className="w-full py-3.5 bg-[#2C3E50] text-white text-xs tracking-widest uppercase font-semibold hover:bg-[#2C3E50]/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {UPGRADE_LABEL[lang]}
                  </button>
                  {upgradeError && (
                    <p className="text-xs text-red-600 text-center -mt-1">{upgradeError}</p>
                  )}
                </>
              )}

              <button
                onClick={onClose}
                className="w-full py-2 text-xs text-[#B89F7A] hover:text-[#2C3E50] transition-colors tracking-widest uppercase"
              >
                {MAYBE_LATER[lang]}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
