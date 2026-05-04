import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

const content: Record<Language, {
  title: string;
  emoji: string;
  perks: string[];
  note: string[];
  sign: string;
}> = {
  ru: {
    title: 'Ты с нами.',
    emoji: '🌿',
    perks: [
      '100 сканирований каждый день',
      '100 анализов по твоим предпочтениям каждый день',
      '10 подробных ИИ-анализов по составу каждый день',
      'Сравнение двух продуктов рядом',
      'Твои предпочтения в каждом результате',
      'Полный разбор состава, всегда',
    ],
    note: [
      'И кое-что важное:',
      'часть твоего платежа идёт на благотворительность.',
      'Не потому что это красиво звучит —',
      'а потому что для нас это важно.',
    ],
    sign: 'Рада, что ты здесь.\nЮлия',
  },
  uk: {
    title: 'Ти з нами.',
    emoji: '🌿',
    perks: [
      '100 сканувань щодня',
      '100 аналізів за твоїми уподобаннями щодня',
      '10 детальних ІІ-аналізів складу щодня',
      'Порівняння двох продуктів поруч',
      'Твої уподобання в кожному результаті',
      'Повний розбір складу, завжди',
    ],
    note: [
      'І ще щось важливе:',
      'частина твого платежу йде на благодійність.',
      'Не тому що це гарно звучить —',
      'а тому що для нас це важливо.',
    ],
    sign: 'Рада, що ти тут.\nЮлія',
  },
  en: {
    title: "You're with us.",
    emoji: '🌿',
    perks: [
      '100 scans every day',
      '100 analyses based on your preferences every day',
      '10 detailed AI ingredient analyses every day',
      'Side-by-side product comparison',
      'Your preferences in every result',
      'Full ingredient breakdown, always',
    ],
    note: [
      'And something important:',
      'part of your payment goes to charity.',
      "Not because it sounds nice —",
      "but because it matters to us.",
    ],
    sign: "Glad you're here.\nYuliia",
  },
  de: {
    title: 'Du bist dabei.',
    emoji: '🌿',
    perks: [
      '100 Scans jeden Tag',
      '100 Analysen nach deinen Vorlieben jeden Tag',
      '10 detaillierte KI-Inhaltsstoffanalysen jeden Tag',
      'Direkter Produktvergleich nebeneinander',
      'Deine Vorlieben in jedem Ergebnis',
      'Vollständige Inhaltsstoffübersicht, immer',
    ],
    note: [
      'Und noch etwas Wichtiges:',
      'Ein Teil deiner Zahlung geht an wohltätige Zwecke.',
      'Nicht weil es gut klingt —',
      'sondern weil es uns wichtig ist.',
    ],
    sign: 'Schön, dass du da bist.\nYuliia',
  },
  es: {
    title: 'Estás con nosotras.',
    emoji: '🌿',
    perks: [
      '100 escaneos cada día',
      '100 análisis según tus preferencias cada día',
      '10 análisis detallados de ingredientes con IA cada día',
      'Comparación de dos productos lado a lado',
      'Tus preferencias en cada resultado',
      'Desglose completo de ingredientes, siempre',
    ],
    note: [
      'Y algo importante:',
      'parte de tu pago va a una causa benéfica.',
      'No porque suene bien —',
      'sino porque para nosotras importa de verdad.',
    ],
    sign: 'Me alegra que estés aquí.\nYuliia',
  },
  fr: {
    title: 'Tu es avec nous.',
    emoji: '🌿',
    perks: [
      '100 scans chaque jour',
      '100 analyses selon tes préférences chaque jour',
      "10 analyses IA détaillées des ingrédients chaque jour",
      'Comparaison de deux produits côte à côte',
      'Tes préférences dans chaque résultat',
      'Analyse complète des ingrédients, toujours',
    ],
    note: [
      'Et quelque chose d\'important :',
      'une partie de ton paiement va à une œuvre caritative.',
      'Pas parce que ça sonne bien —',
      'mais parce que c\'est important pour nous.',
    ],
    sign: 'Ravie que tu sois là.\nYuliia',
  },
  it: {
    title: 'Sei con noi.',
    emoji: '🌿',
    perks: [
      '100 scansioni ogni giorno',
      '100 analisi in base alle tue preferenze ogni giorno',
      '10 analisi IA dettagliate degli ingredienti ogni giorno',
      'Confronto di due prodotti fianco a fianco',
      'Le tue preferenze in ogni risultato',
      'Analisi completa degli ingredienti, sempre',
    ],
    note: [
      'E una cosa importante:',
      'parte del tuo pagamento va in beneficenza.',
      'Non perché suoni bene —',
      'ma perché per noi è importante.',
    ],
    sign: 'Felice che tu sia qui.\nYuliia',
  },
  tr: {
    title: 'Bizimlesin.',
    emoji: '🌿',
    perks: [
      'Her gün 100 tarama',
      'Her gün tercihlerine göre 100 analiz',
      'Her gün 10 ayrıntılı YZ içerik analizi',
      'İki ürünü yan yana karşılaştırma',
      'Her sonuçta kişisel tercihlerın',
      'Her zaman tam içerik dökümü',
    ],
    note: [
      'Ve önemli bir şey:',
      'ödemenin bir kısmı hayır kurumuna gidiyor.',
      'Kulağa güzel geldiği için değil —',
      'bizim için gerçekten önemli olduğu için.',
    ],
    sign: 'Burada olduğuna sevindim.\nYuliia',
  },
};

export function WelcomePremiumModal({ isOpen, onClose, lang }: Props) {
  const c = content[lang] ?? content.en;

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          style={{ background: 'rgba(44,62,50,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="luxury-card w-full max-w-sm overflow-hidden"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Top gold stripe (from luxury-card::after — reinforced) */}
            <div style={{ height: 2, background: 'linear-gradient(to right, transparent, #B8923A, transparent)' }} />

            <div className="p-7 flex flex-col gap-5">

              {/* Title */}
              <div className="text-center">
                <span className="text-3xl">{c.emoji}</span>
                <h2 className="font-serif text-2xl text-[#2C3E50] mt-2 leading-snug">
                  {c.title}
                </h2>
              </div>

              {/* Divider */}
              <div style={{ height: '0.5px', background: 'linear-gradient(to right, transparent, #D4C3A3, transparent)' }} />

              {/* Perks */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] uppercase tracking-widest text-[#B89F7A] font-semibold">
                  {lang === 'ru' ? 'Теперь у тебя:' :
                   lang === 'uk' ? 'Тепер у тебе:' :
                   lang === 'de' ? 'Jetzt hast du:' :
                   lang === 'es' ? 'Ahora tienes:' :
                   lang === 'fr' ? 'Tu as maintenant :' :
                   lang === 'it' ? 'Ora hai:' :
                   lang === 'tr' ? 'Artık sahipsin:' :
                   'Now you have:'}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {c.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#2C3E50] leading-relaxed">
                      <span className="text-[#2D5A3D] mt-0.5 shrink-0">—</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Divider */}
              <div style={{ height: '0.5px', background: 'linear-gradient(to right, transparent, #D4C3A3, transparent)' }} />

              {/* Note — charity */}
              <div className="flex flex-col gap-1">
                {c.note.map((line, i) => (
                  <p
                    key={i}
                    className="text-sm text-[#4A4A4A] leading-relaxed"
                    style={{ fontStyle: i > 0 ? 'italic' : 'normal' }}
                  >
                    {line}
                  </p>
                ))}
              </div>

              {/* Signature */}
              <p className="text-sm text-[#2C3E50] leading-relaxed whitespace-pre-line font-medium">
                {c.sign}
              </p>

              {/* Button */}
              <button
                onClick={onClose}
                className="luxury-btn w-full py-3 text-xs tracking-widest uppercase"
              >
                {lang === 'ru' ? 'Начать' :
                 lang === 'uk' ? 'Почати' :
                 lang === 'de' ? 'Loslegen' :
                 lang === 'es' ? 'Empezar' :
                 lang === 'fr' ? 'Commencer' :
                 lang === 'it' ? 'Iniziare' :
                 lang === 'tr' ? 'Başla' :
                 'Get started'}
              </button>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
