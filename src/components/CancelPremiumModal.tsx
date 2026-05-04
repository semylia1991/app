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
  lines: string[];
  sign: string;
  btn: string;
}> = {
  ru: {
    title: 'Всё хорошо.',
    emoji: '🌿',
    lines: [
      'Твои бесплатные сканирования остаются —',
      '5 в день, когда они тебе нужны.',
      '',
      'Если вернёшься — всё будет на месте,',
      'как ты и оставила.',
    ],
    sign: 'Береги себя.\nЮлия',
    btn: 'Понятно',
  },
  uk: {
    title: 'Все добре.',
    emoji: '🌿',
    lines: [
      'Твої безкоштовні сканування залишаються —',
      '5 на день, коли вони тобі потрібні.',
      '',
      'Якщо повернешся — все буде на місці,',
      'як ти і залишила.',
    ],
    sign: 'Бережи себе.\nЮлія',
    btn: 'Зрозуміло',
  },
  en: {
    title: "All good.",
    emoji: '🌿',
    lines: [
      'Your free scans stay —',
      '5 a day, whenever you need them.',
      '',
      'If you come back, everything will be here,',
      'just as you left it.',
    ],
    sign: 'Take care.\nYuliia',
    btn: 'Got it',
  },
  de: {
    title: 'Alles gut.',
    emoji: '🌿',
    lines: [
      'Deine kostenlosen Scans bleiben —',
      '5 pro Tag, wann immer du sie brauchst.',
      '',
      'Wenn du zurückkommst, ist alles noch da,',
      'genau so, wie du es hinterlassen hast.',
    ],
    sign: 'Pass auf dich auf.\nYuliia',
    btn: 'Verstanden',
  },
  es: {
    title: 'Todo bien.',
    emoji: '🌿',
    lines: [
      'Tus escaneos gratuitos siguen ahí —',
      '5 al día, cuando los necesites.',
      '',
      'Si vuelves, todo estará en su sitio,',
      'tal como lo dejaste.',
    ],
    sign: 'Cuídate.\nYuliia',
    btn: 'Entendido',
  },
  fr: {
    title: 'Tout va bien.',
    emoji: '🌿',
    lines: [
      'Tes scans gratuits restent —',
      '5 par jour, quand tu en as besoin.',
      '',
      'Si tu reviens, tout sera là,',
      'exactement comme tu l\'as laissé.',
    ],
    sign: 'Prends soin de toi.\nYuliia',
    btn: 'Compris',
  },
  it: {
    title: 'Va tutto bene.',
    emoji: '🌿',
    lines: [
      'Le tue scansioni gratuite rimangono —',
      '5 al giorno, quando ne hai bisogno.',
      '',
      'Se torni, troverai tutto al suo posto,',
      'esattamente come l\'hai lasciato.',
    ],
    sign: 'Prenditi cura di te.\nYuliia',
    btn: 'Capito',
  },
  tr: {
    title: 'Her şey yolunda.',
    emoji: '🌿',
    lines: [
      'Ücretsiz taramaların devam ediyor —',
      'İhtiyaç duyduğunda günde 5 tane.',
      '',
      'Geri dönersen her şey yerli yerinde olacak,',
      'bıraktığın gibi.',
    ],
    sign: 'Kendine iyi bak.\nYuliia',
    btn: 'Anladım',
  },
};

export function CancelPremiumModal({ isOpen, onClose, lang }: Props) {
  const c = content[lang] ?? content.en;

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
          >
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

              {/* Lines */}
              <div className="flex flex-col gap-1">
                {c.lines.map((line, i) =>
                  line === '' ? (
                    <div key={i} className="h-2" />
                  ) : (
                    <p key={i} className="text-sm text-[#4A4A4A] leading-relaxed italic">
                      {line}
                    </p>
                  )
                )}
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
                {c.btn}
              </button>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
