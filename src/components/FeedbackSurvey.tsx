import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Language } from '../i18n';
import posthog from 'posthog-js';
 
// ── Types ─────────────────────────────────────────────────────────────────────
 
interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  userId?: string;
}
 
// ── i18n (inline — survey is shown to all users, keep it simple) ──────────────
 
const L: Record<Language, {
  beta: string;
  title: string;
  subtitle: string;
  ratingLabel: string;
  likesLabel: string;
  missingLabel: string;
  commentLabel: string;
  commentPlaceholder: string;
  submit: string;
  skip: string;
  thanks: string;
  thanksNote: string;
}> = {
  en: {
    beta: '🌿 Beta version',
    title: 'Help us improve GlowKey AI',
    subtitle: 'This is a beta — your feedback directly shapes the next version. It takes 30 seconds.',
    ratingLabel: 'How would you rate the app?',
    likesLabel: 'What do you like?',
    missingLabel: 'What is missing?',
    commentLabel: 'Anything else?',
    commentPlaceholder: 'Your thoughts, ideas, wishes...',
    submit: 'Send feedback',
    skip: 'Skip',
    thanks: 'Thank you! 💛',
    thanksNote: 'Your feedback will make GlowKey better for everyone.',
  },
  ru: {
    beta: '🌿 Бета-версия',
    title: 'Помоги улучшить GlowKey AI',
    subtitle: 'Это бета — ваш отзыв напрямую влияет на следующую версию. Займёт 30 секунд.',
    ratingLabel: 'Как оцениваешь приложение?',
    likesLabel: 'Что нравится?',
    missingLabel: 'Чего не хватает?',
    commentLabel: 'Хочешь добавить что-то ещё?',
    commentPlaceholder: 'Мысли, идеи, пожелания...',
    submit: 'Отправить',
    skip: 'Пропустить',
    thanks: 'Спасибо! 💛',
    thanksNote: 'Ваш отзыв поможет сделать GlowKey лучше для всех.',
  },
  de: {
    beta: '🌿 Beta-Version',
    title: 'Hilf uns, GlowKey AI zu verbessern',
    subtitle: 'Dies ist eine Beta — dein Feedback gestaltet direkt die nächste Version. Dauert 30 Sekunden.',
    ratingLabel: 'Wie bewertest du die App?',
    likesLabel: 'Was gefällt dir?',
    missingLabel: 'Was fehlt noch?',
    commentLabel: 'Noch etwas hinzufügen?',
    commentPlaceholder: 'Gedanken, Ideen, Wünsche...',
    submit: 'Feedback senden',
    skip: 'Überspringen',
    thanks: 'Danke! 💛',
    thanksNote: 'Dein Feedback macht GlowKey für alle besser.',
  },
  uk: {
    beta: '🌿 Бета-версія',
    title: 'Допоможи покращити GlowKey AI',
    subtitle: 'Це бета — твій відгук напряму впливає на наступну версію. Займе 30 секунд.',
    ratingLabel: 'Як оцінюєш застосунок?',
    likesLabel: 'Що подобається?',
    missingLabel: 'Чого не вистачає?',
    commentLabel: 'Хочеш додати щось ще?',
    commentPlaceholder: 'Думки, ідеї, побажання...',
    submit: 'Надіслати',
    skip: 'Пропустити',
    thanks: 'Дякую! 💛',
    thanksNote: 'Твій відгук зробить GlowKey кращим для всіх.',
  },
  es: {
    beta: '🌿 Versión beta',
    title: 'Ayúdanos a mejorar GlowKey AI',
    subtitle: 'Esta es una beta — tu opinión da forma directamente a la próxima versión. Tarda 30 segundos.',
    ratingLabel: '¿Cómo valorarías la app?',
    likesLabel: '¿Qué te gusta?',
    missingLabel: '¿Qué falta?',
    commentLabel: '¿Algo más que añadir?',
    commentPlaceholder: 'Pensamientos, ideas, deseos...',
    submit: 'Enviar opinión',
    skip: 'Omitir',
    thanks: '¡Gracias! 💛',
    thanksNote: 'Tu opinión hará GlowKey mejor para todos.',
  },
  fr: {
    beta: '🌿 Version bêta',
    title: 'Aide-nous à améliorer GlowKey AI',
    subtitle: 'C\'est une bêta — ton avis façonne directement la prochaine version. 30 secondes suffisent.',
    ratingLabel: 'Comment évalues-tu l\'application ?',
    likesLabel: 'Qu\'est-ce qui te plaît ?',
    missingLabel: 'Qu\'est-ce qui manque ?',
    commentLabel: 'Autre chose à ajouter ?',
    commentPlaceholder: 'Pensées, idées, souhaits...',
    submit: 'Envoyer l\'avis',
    skip: 'Passer',
    thanks: 'Merci ! 💛',
    thanksNote: 'Ton avis rendra GlowKey meilleur pour tous.',
  },
  it: {
    beta: '🌿 Versione beta',
    title: 'Aiutaci a migliorare GlowKey AI',
    subtitle: 'Questa è una beta — il tuo feedback dà forma direttamente alla prossima versione. Ci vogliono 30 secondi.',
    ratingLabel: 'Come valuti l\'app?',
    likesLabel: 'Cosa ti piace?',
    missingLabel: 'Cosa manca?',
    commentLabel: 'Vuoi aggiungere altro?',
    commentPlaceholder: 'Pensieri, idee, desideri...',
    submit: 'Invia feedback',
    skip: 'Salta',
    thanks: 'Grazie! 💛',
    thanksNote: 'Il tuo feedback migliorerà GlowKey per tutti.',
  },
  tr: {
    beta: '🌿 Beta sürümü',
    title: 'GlowKey AI\'yi geliştirmemize yardım et',
    subtitle: 'Bu bir beta — geri bildiriminiz bir sonraki sürümü doğrudan şekillendirir. 30 saniye sürer.',
    ratingLabel: 'Uygulamayı nasıl değerlendirirsin?',
    likesLabel: 'Neyi beğeniyorsun?',
    missingLabel: 'Ne eksik?',
    commentLabel: 'Eklemek istediğin bir şey var mı?',
    commentPlaceholder: 'Düşünceler, fikirler, dilekler...',
    submit: 'Geri bildirim gönder',
    skip: 'Atla',
    thanks: 'Teşekkürler! 💛',
    thanksNote: 'Geri bildiriminiz GlowKey\'i herkes için daha iyi yapacak.',
  },
};
 
const LIKES_OPTIONS: Record<Language, string[]> = {
  en: ['Ingredient analysis', 'Design', 'Speed', 'Personal recommendations', 'Other'],
  ru: ['Анализ ингредиентов', 'Дизайн', 'Скорость', 'Персональные рекомендации', 'Другое'],
  de: ['Inhaltsstoffanalyse', 'Design', 'Geschwindigkeit', 'Persönliche Empfehlungen', 'Sonstiges'],
  uk: ['Аналіз інгредієнтів', 'Дизайн', 'Швидкість', 'Персональні рекомендації', 'Інше'],
  es: ['Análisis de ingredientes', 'Diseño', 'Velocidad', 'Recomendaciones personales', 'Otro'],
  fr: ['Analyse des ingrédients', 'Design', 'Rapidité', 'Recommandations personnelles', 'Autre'],
  it: ['Analisi ingredienti', 'Design', 'Velocità', 'Consigli personali', 'Altro'],
  tr: ['İçerik analizi', 'Tasarım', 'Hız', 'Kişisel öneriler', 'Diğer'],
};
 
const MISSING_OPTIONS: Record<Language, string[]> = {
  en: ['More languages', 'Scan history', 'Product comparison', 'Offline mode', 'Other'],
  ru: ['Больше языков', 'История сканов', 'Сравнение продуктов', 'Офлайн-режим', 'Другое'],
  de: ['Mehr Sprachen', 'Scan-Verlauf', 'Produktvergleich', 'Offline-Modus', 'Sonstiges'],
  uk: ['Більше мов', 'Історія сканувань', 'Порівняння продуктів', 'Офлайн-режим', 'Інше'],
  es: ['Más idiomas', 'Historial de escaneos', 'Comparación de productos', 'Modo sin conexión', 'Otro'],
  fr: ['Plus de langues', 'Historique des scans', 'Comparaison de produits', 'Mode hors ligne', 'Autre'],
  it: ['Più lingue', 'Cronologia scansioni', 'Confronto prodotti', 'Modalità offline', 'Altro'],
  tr: ['Daha fazla dil', 'Tarama geçmişi', 'Ürün karşılaştırma', 'Çevrimdışı mod', 'Diğer'],
};
 
// ── Component ─────────────────────────────────────────────────────────────────
 
export function FeedbackSurvey({ isOpen, onClose, lang, userId }: Props) {
  const T = L[lang] ?? L['en'];
 
  const [rating, setRating]       = useState(0);
  const [hovered, setHovered]     = useState(0);
  const [likes, setLikes]         = useState<string[]>([]);
  const [missing, setMissing]     = useState<string[]>([]);
  const [comment, setComment]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
 
  const toggleChip = (list: string[], setList: (v: string[]) => void, val: string) => {
    setList(list.includes(val) ? list.filter(v => v !== val) : [...list, val]);
  };
 
  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      const payload = {
        user_id:   userId ?? null,
        lang,
        rating,
        likes:     likes.join(', '),
        missing:   missing.join(', '),
        comment:   comment.trim(),
        created_at: new Date().toISOString(),
      };
 
      // Save to Supabase
      await supabase.from('feedback_surveys').insert(payload);
 
      // Track in PostHog
      posthog.capture('feedback_submitted', {
        rating,
        likes:   likes.join(', '),
        missing: missing.join(', '),
        has_comment: !!comment.trim(),
        lang,
      });
 
      setSubmitted(true);
      setTimeout(() => onClose(), 2500);
    } catch (err) {
      console.error('Feedback error:', err);
      onClose();
    } finally {
      setLoading(false);
    }
  };
 
  const handleSkip = () => {
    posthog.capture('feedback_skipped', { lang });
    onClose();
  };
 
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSkip}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-[#FDFBF7] border border-[#D4C3A3] shadow-2xl rounded-sm"
            >
              {submitted ? (
                // ── Thank you screen ──────────────────────────────────────────
                <div className="p-8 text-center space-y-3">
                  <p className="text-3xl">💛</p>
                  <p className="text-xl font-serif text-[#2C3E50]">{T.thanks}</p>
                  <p className="text-xs text-[#B89F7A]">{T.thanksNote}</p>
                </div>
              ) : (
                // ── Survey form ───────────────────────────────────────────────
                <>
                  {/* Header */}
                  <div className="relative bg-gradient-to-br from-[#2C3E50] to-[#4A3728] px-6 pt-6 pb-5 text-center">
                    <button
                      onClick={handleSkip}
                      className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                    <span className="text-[10px] tracking-widest uppercase text-[#B89F7A] mb-2 block">
                      {T.beta}
                    </span>
                    <h2 className="text-base font-serif text-white leading-snug">{T.title}</h2>
                    <p className="text-[11px] text-white/55 mt-2 leading-relaxed">{T.subtitle}</p>
                  </div>
 
                  <div className="p-5 space-y-5">
                    {/* ⭐ Rating */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B89F7A] mb-2">
                        {T.ratingLabel}
                      </p>
                      <div className="flex gap-2 justify-center">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button
                            key={s}
                            onClick={() => setRating(s)}
                            onMouseEnter={() => setHovered(s)}
                            onMouseLeave={() => setHovered(0)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              size={28}
                              className="transition-colors"
                              fill={(hovered || rating) >= s ? '#B89F7A' : 'none'}
                              stroke={(hovered || rating) >= s ? '#B89F7A' : '#D4C3A3'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
 
                    {/* ✅ Likes */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B89F7A] mb-2">
                        ✅ {T.likesLabel}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {LIKES_OPTIONS[lang].map(opt => (
                          <button
                            key={opt}
                            onClick={() => toggleChip(likes, setLikes, opt)}
                            className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                              likes.includes(opt)
                                ? 'bg-[#2C3E50] text-white border-[#2C3E50]'
                                : 'bg-white text-[#4A4A4A] border-[#D4C3A3] hover:border-[#B89F7A]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
 
                    {/* ❌ Missing */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B89F7A] mb-2">
                        ❌ {T.missingLabel}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {MISSING_OPTIONS[lang].map(opt => (
                          <button
                            key={opt}
                            onClick={() => toggleChip(missing, setMissing, opt)}
                            className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                              missing.includes(opt)
                                ? 'bg-[#2C3E50] text-white border-[#2C3E50]'
                                : 'bg-white text-[#4A4A4A] border-[#D4C3A3] hover:border-[#B89F7A]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
 
                    {/* 💬 Comment */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B89F7A] mb-2">
                        💬 {T.commentLabel}
                      </p>
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder={T.commentPlaceholder}
                        rows={2}
                        className="w-full px-3 py-2 text-xs text-[#2C3E50] border border-[#D4C3A3] rounded-sm bg-white focus:outline-none focus:border-[#B89F7A] resize-none placeholder:text-[#B89F7A]/50"
                      />
                    </div>
 
                    {/* Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSkip}
                        className="flex-1 py-2.5 text-xs text-[#B89F7A] border border-[#D4C3A3] hover:bg-[#f5f0e6] transition-colors tracking-widest uppercase"
                      >
                        {T.skip}
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={rating === 0 || loading}
                        className="flex-1 py-2.5 bg-[#2C3E50] text-white text-xs tracking-widest uppercase hover:bg-[#2C3E50]/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {T.submit}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
