import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Zap, History, Crown, Loader2 } from 'lucide-react';
import { Language } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  reason: 'scans' | 'note' | 'askAi';
  userId?: string;
}

const REASONS: Record<string, Record<string, string>> = {
  scans: {
    en: "You've used all 20 free scans for today.",
    ru: "Вы использовали все 20 бесплатных сканирований на сегодня.",
    de: "Sie haben alle 20 kostenlosen Scans für heute verwendet.",
    uk: "Ви використали всі 20 безкоштовних сканувань на сьогодні.",
    es: "Has usado los 20 escaneos gratuitos de hoy.",
    fr: "Vous avez utilisé les 20 scans gratuits d'aujourd'hui.",
    it: "Hai usato i 20 scan gratuiti di oggi.",
    tr: "Bugünkü 20 ücretsiz taramanızı kullandınız.",
  },
  note: {
    en: "You've reached the limit of 10 free 'Pay Attention' analyses today.",
    ru: "Вы достигли лимита в 10 бесплатных анализов «Обрати внимание» на сегодня.",
    de: "Sie haben das Limit von 10 kostenlosen 'Beachte'-Analysen erreicht.",
    uk: "Ви досягли ліміту в 10 безкоштовних аналізів «Зверни увагу» на сьогодні.",
    es: "Has alcanzado el límite de 10 análisis gratuitos 'Atención' hoy.",
    fr: "Vous avez atteint la limite de 10 analyses 'Attention' gratuites aujourd'hui.",
    it: "Hai raggiunto il limite di 10 analisi 'Attenzione' gratuite oggi.",
    tr: "Bugünkü 10 ücretsiz 'Dikkat' analizinizi kullandınız.",
  },
  askAi: {
    en: "You've used all 3 free AI questions for today.",
    ru: "Вы использовали все 3 бесплатных вопроса к ИИ на сегодня.",
    de: "Sie haben alle 3 kostenlosen KI-Fragen für heute verwendet.",
    uk: "Ви використали всі 3 безкоштовних питання до ІІ на сьогодні.",
    es: "Has usado las 3 preguntas gratuitas de IA de hoy.",
    fr: "Vous avez utilisé les 3 questions IA gratuites d'aujourd'hui.",
    it: "Hai usato le 3 domande AI gratuite di oggi.",
    tr: "Bugünkü 3 ücretsiz AI sorunuzu kullandınız.",
  },
};

const FEATURES: Record<Language, string[]> = {
  en: ['Unlimited scans per day', 'Unlimited "Pay Attention" analyses', '10 AI questions per day', 'Full scan history', 'No ads'],
  ru: ['Безлимитные сканирования', 'Безлимитный анализ «Обрати внимание»', '10 вопросов ИИ в день', 'Полная история сканов', 'Без рекламы'],
  de: ['Unbegrenzte Scans', 'Unbegrenzte „Beachte"-Analysen', '10 KI-Fragen pro Tag', 'Vollständige Scan-Historie', 'Keine Werbung'],
  uk: ['Безлімітні сканування', 'Безлімітний аналіз «Зверни увагу»', '10 питань до ІІ на день', 'Повна історія сканів', 'Без реклами'],
  es: ['Escaneos ilimitados', 'Análisis "Atención" ilimitados', '10 preguntas IA por día', 'Historial completo', 'Sin anuncios'],
  fr: ['Scans illimités', 'Analyses "Attention" illimitées', '10 questions IA par jour', 'Historique complet', 'Sans publicités'],
  it: ['Scan illimitati', 'Analisi "Attenzione" illimitate', '10 domande AI al giorno', 'Cronologia completa', 'Niente pubblicità'],
  tr: ['Sınırsız tarama', 'Sınırsız "Dikkat" analizi', 'Günde 10 AI sorusu', 'Tam tarama geçmişi', 'Reklamsız'],
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

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      // Call your backend to create a Stripe Checkout session
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, lang }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
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
