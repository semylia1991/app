/**
 * FirstScanModal.tsx
 * Shown once after the first scan, when user taps "Scan another product".
 * Disappears on [Let's go] and sets localStorage.hasSeenFirstScanModal = "true".
 */

import React, { useEffect, useState } from 'react';
import type { Language } from '../i18n';

// ── Copy ───────────────────────────────────────────────────────────────────
const COPY: Record<Language, {
  tag: string;
  line1: string;
  name: string;
  reason: string;
  malteser: string;
  closing: string;
  btn: string;
}> = {
  en: {
    tag: 'First scan done.',
    name: "I'm Yuliia.",
    line1: 'I built GlowKey AI because I myself got tired of buying without looking.',
    malteser: "I also volunteer at Malteser Hilfsdienst — when you go Premium, 3% goes where I help.",
    closing: "Glad you're here.",
    reason: '',
    btn: "Let's go",
  },
  de: {
    tag: 'Erster Scan fertig.',
    name: 'Ich bin Yuliia.',
    line1: 'Ich habe GlowKey AI entwickelt, weil ich es selbst leid war, blind zu kaufen.',
    malteser: 'Ich bin auch ehrenamtlich beim Malteser Hilfsdienst — wenn du Premium wählst, gehen 3% dorthin, wo ich helfe.',
    closing: 'Schön, dass du da bist.',
    reason: '',
    btn: 'Los geht\'s',
  },
  ru: {
    tag: 'Первый скан готов.',
    name: 'Я Yuliia.',
    line1: 'Я сделала GlowKey AI потому что сама устала покупать не глядя.',
    malteser: 'Ещё я волонтёрю в Malteser Hilfsdienst — когда перейдёшь на платный план, 3% пойдут туда, где я помогаю.',
    closing: 'Рада, что ты здесь.',
    reason: '',
    btn: 'Поехали',
  },
  uk: {
    tag: 'Перший скан готовий.',
    name: 'Я Yuliia.',
    line1: 'Я створила GlowKey AI, бо сама втомилася купувати наосліп.',
    malteser: 'Ще я волонтерю у Malteser Hilfsdienst — коли перейдеш на платний план, 3% підуть туди, де я допомагаю.',
    closing: 'Рада, що ти тут.',
    reason: '',
    btn: 'Поїхали',
  },
  es: {
    tag: 'Primer escaneo listo.',
    name: 'Soy Yuliia.',
    line1: 'Creé GlowKey AI porque yo misma me cansé de comprar sin mirar.',
    malteser: 'También soy voluntaria en Malteser Hilfsdienst — cuando elijas Premium, el 3% irá donde yo ayudo.',
    closing: 'Me alegra que estés aquí.',
    reason: '',
    btn: 'Vamos',
  },
  fr: {
    tag: 'Premier scan terminé.',
    name: 'Je suis Yuliia.',
    line1: "J'ai créé GlowKey AI parce que j'en avais assez d'acheter sans regarder.",
    malteser: "Je suis aussi bénévole chez Malteser Hilfsdienst — quand tu passes en Premium, 3% vont là où j'aide.",
    closing: 'Ravie que tu sois là.',
    reason: '',
    btn: "C'est parti",
  },
  it: {
    tag: 'Prima scansione pronta.',
    name: 'Sono Yuliia.',
    line1: 'Ho creato GlowKey AI perché ero stanca di comprare senza guardare.',
    malteser: 'Sono anche volontaria al Malteser Hilfsdienst — quando scegli Premium, il 3% va dove aiuto.',
    closing: 'Felice che tu sia qui.',
    reason: '',
    btn: 'Andiamo',
  },
  tr: {
    tag: 'İlk tarama hazır.',
    name: 'Ben Yuliia.',
    line1: "GlowKey AI'ı yarattım çünkü ben de bakmadan satın almaktan yorulmuştum.",
    malteser: "Aynı zamanda Malteser Hilfsdienst'te gönüllüyüm — Premium'a geçtiğinde, %3 yardım ettiğim yere gidecek.",
    closing: 'Burada olduğun için mutluyum.',
    reason: '',
    btn: 'Hadi gidelim',
  },
};

// ── Component ──────────────────────────────────────────────────────────────
interface Props {
  lang: Language;
  onClose: () => void;
}

export function FirstScanModal({ lang, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const copy = COPY[lang] ?? COPY.en;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 320);
  }

  return (
    <>
      <style>{`
        @keyframes fsm-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fsm-enter {
          animation: fsm-up 0.55s cubic-bezier(.22,1,.36,1) both;
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(26, 18, 8, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.32s ease',
        }}
      >
        {/* Sheet */}
        <div
          className="fsm-enter"
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 440,
            background: 'linear-gradient(160deg, #FAF6EE 0%, #F2E8D4 100%)',
            borderTop: '1px solid rgba(184,150,12,0.25)',
            borderRadius: '16px 16px 0 0',
            padding: '32px 28px 40px',
            position: 'relative',
          }}
        >
          {/* Handle */}
          <div style={{
            width: 36, height: 3, borderRadius: 2,
            background: 'rgba(184,150,12,0.3)',
            margin: '0 auto 28px',
          }} />

          {/* Tag */}
          <p style={{
            fontFamily: "'Jost', 'system-ui', sans-serif",
            fontSize: 11, letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#B8960C', opacity: 0.8,
            marginBottom: 20,
          }}>
            {copy.tag}
          </p>

          {/* Photo + name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              border: '1px solid rgba(184,150,12,0.4)',
              background: 'rgba(184,150,12,0.06)',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img
                src="/yuliia.jpg"
                alt="Yuliia"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => {
                  const el = e.currentTarget;
                  el.style.display = 'none';
                  // show initials fallback
                  const parent = el.parentElement;
                  if (parent) {
                    parent.style.fontSize = '16px';
                    parent.style.color = '#B8960C';
                    parent.style.fontFamily = "'Cormorant Garamond', serif";
                    parent.innerHTML = 'Y';
                  }
                }}
              />
            </div>
            <p style={{
              fontFamily: "'Cormorant Garamond', 'Georgia', serif",
              fontSize: 22, fontWeight: 300, fontStyle: 'italic',
              color: '#1A1208', lineHeight: 1.2,
              margin: 0,
            }}>
              {copy.name}
            </p>
          </div>

          {/* Divider */}
          <div style={{ width: 32, height: '0.5px', background: '#B8960C', opacity: 0.4, marginBottom: 20 }} />

          {/* Body text */}
          <div style={{
            fontFamily: "'Jost', 'system-ui', sans-serif",
            fontWeight: 300, fontSize: 15, lineHeight: 1.75,
            color: '#3A3020',
            display: 'flex', flexDirection: 'column', gap: 14,
            marginBottom: 28,
          }}>
            <p style={{ margin: 0 }}>{copy.line1}</p>
            <p style={{ margin: 0, color: '#6A5E48' }}>{copy.malteser}</p>
            <p style={{ margin: 0, fontStyle: 'italic', color: '#7A6E5A', fontSize: 14 }}>{copy.closing}</p>
          </div>

          {/* CTA */}
          <button
            onClick={handleClose}
            style={{
              width: '100%', height: 52,
              background: '#B8960C',
              color: '#FAF6EE',
              fontFamily: "'Jost', 'system-ui', sans-serif",
              fontWeight: 400, fontSize: 14,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              border: 'none', borderRadius: 2,
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#9A7D0A')}
            onMouseLeave={e => (e.currentTarget.style.background = '#B8960C')}
          >
            {copy.btn}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useFirstScanModal(): [boolean, () => void, () => void] {
  const [show, setShow] = useState(false);

  // Call this after the first scan reset
  function maybeShow() {
    const totalScans = parseInt(localStorage.getItem('totalScanCount') ?? '0', 10);
    const alreadySeen = localStorage.getItem('hasSeenFirstScanModal') === 'true';
    if (totalScans >= 1 && !alreadySeen) {
      setShow(true);
    }
  }

  function dismiss() {
    localStorage.setItem('hasSeenFirstScanModal', 'true');
    setShow(false);
  }

  return [show, maybeShow, dismiss];
}
