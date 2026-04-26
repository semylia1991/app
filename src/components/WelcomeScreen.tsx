/**
 * WelcomeScreen.tsx
 * Shown ONCE to unregistered users on first visit.
 * Sets localStorage.hasVisited = "true" on dismiss.
 * Calls onScan() to open the camera / file picker.
 */

import React, { useEffect, useRef, useState } from 'react';
import logo from '../logo.png';
import type { Language } from '../i18n';

// ── Localisation ───────────────────────────────────────────────────────────
const COPY: Record<
  Language,
  { headline: string; sub: string; btn: string; footnote: string; malteser: string }
> = {
  en: {
    headline: "What's actually\nin your skincare?",
    sub: 'Photo → answer.\nNo chemistry degree needed.',
    btn: 'Scan your first product',
    footnote: 'No registration. Free to start.',
    malteser: 'Made by a Malteser volunteer · ',
  },
  de: {
    headline: 'Was steckt wirklich\nin deiner Kosmetik?',
    sub: 'Foto → Antwort.\nKein Chemiestudium nötig.',
    btn: 'Erstes Produkt scannen',
    footnote: 'Keine Registrierung. Kostenlos starten.',
    malteser: 'Von einer Malteser-Ehrenamtlichen · ',
  },
  ru: {
    headline: 'Что на самом деле\nв твоей косметике?',
    sub: 'Фото → ответ.\nБез химического образования.',
    btn: 'Сканировать первый продукт',
    footnote: 'Без регистрации. Бесплатно.',
    malteser: 'Создано волонтёром Malteser · ',
  },
  uk: {
    headline: 'Що насправді\nу твоїй косметиці?',
    sub: 'Фото → відповідь.\nБез хімічної освіти.',
    btn: 'Сканувати перший продукт',
    footnote: 'Без реєстрації. Безкоштовно.',
    malteser: 'Створено волонтером Malteser · ',
  },
  es: {
    headline: '¿Qué hay realmente\nen tu cosmético?',
    sub: 'Foto → respuesta.\nSin título en química.',
    btn: 'Escanear mi primer producto',
    footnote: 'Sin registro. Gratis para empezar.',
    malteser: 'Hecho por voluntaria de Malteser · ',
  },
  fr: {
    headline: 'Que contient vraiment\nvotre cosmétique?',
    sub: 'Photo → réponse.\nSans diplôme en chimie.',
    btn: 'Scanner mon premier produit',
    footnote: 'Sans inscription. Gratuit pour commencer.',
    malteser: 'Créé par une bénévole Malteser · ',
  },
  it: {
    headline: "Cosa c'è davvero\nnella tua cosmesi?",
    sub: 'Foto → risposta.\nSenza laurea in chimica.',
    btn: 'Scansiona il primo prodotto',
    footnote: 'Senza registrazione. Gratis per iniziare.',
    malteser: 'Creato da volontaria Malteser · ',
  },
  tr: {
    headline: 'Kozmetiğinde\ngerçekten ne var?',
    sub: 'Fotoğraf → cevap.\nKimya diploması gerekmez.',
    btn: 'İlk ürünümü tara',
    footnote: 'Kayıt yok. Başlamak ücretsiz.',
    malteser: 'Malteser gönüllüsü tarafından · ',
  },
};

// Detect language from browser, fall back to 'en'
function detectLang(): Language {
  const nav = (navigator.language || '').slice(0, 2).toLowerCase() as Language;
  const supported: Language[] = ['en', 'de', 'ru', 'uk', 'es', 'fr', 'it', 'tr'];
  return supported.includes(nav) ? nav : 'en';
}

// ── Component ──────────────────────────────────────────────────────────────
interface Props {
  lang?: Language;             // override browser detection
  onScan: () => void;          // called when CTA is pressed — opens camera
  onClose: () => void;         // called after dismiss (sets hasVisited)
}

export function WelcomeScreen({ lang: langProp, onScan, onClose }: Props) {
  const lang = langProp ?? detectLang();
  const copy = COPY[lang] ?? COPY.en;
  const [visible, setVisible] = useState(false);

  // Trigger animation after mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function dismiss(openCamera: boolean) {
    if (openCamera) onScan();
    onClose();
  }

  const headline = copy.headline.split('\n');
  const sub      = copy.sub.split('\n');

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@300;400&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .wc-anim-logo  { animation: fadeUp 0.8s ease both; animation-delay: 0.1s; }
        .wc-anim-div1  { animation: fadeIn 0.6s ease both; animation-delay: 0.3s; }
        .wc-anim-head  { animation: fadeUp 0.9s ease both; animation-delay: 0.5s; }
        .wc-anim-sub   { animation: fadeUp 0.7s ease both; animation-delay: 0.7s; }
        .wc-anim-div2  { animation: fadeIn 0.6s ease both; animation-delay: 0.9s; }
        .wc-anim-btn   { animation: fadeUp 0.7s ease both; animation-delay: 1.0s; }
        .wc-anim-foot  { animation: fadeIn 0.5s ease both; animation-delay: 1.1s; }
        .wc-anim-malt  { animation: fadeIn 0.5s ease both; animation-delay: 1.3s; }

        .wc-btn:active { background: #9A7D0A !important; }
        @media (hover: hover) {
          .wc-btn:hover { background: #9A7D0A !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={() => dismiss(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        {/* ── Background ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #FAF6EE 0%, #F0E8D4 100%)',
        }} />

        {/* Radial top */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 120% 60% at 50% 0%, rgba(184,150,12,0.12) 0%, transparent 70%)',
        }} />

        {/* Radial bottom-right */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 40% at 80% 100%, rgba(184,150,12,0.08) 0%, transparent 60%)',
        }} />

        {/* SVG botanical ornament */}
        <svg
          style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', opacity: 0.055, pointerEvents: 'none' }}
          width="220" height="220" viewBox="0 0 220 220" fill="none"
        >
          <ellipse cx="110" cy="110" rx="100" ry="100" stroke="#B8960C" strokeWidth="0.6"/>
          <ellipse cx="110" cy="110" rx="72" ry="72" stroke="#B8960C" strokeWidth="0.4"/>
          <line x1="10" y1="110" x2="210" y2="110" stroke="#B8960C" strokeWidth="0.4"/>
          <line x1="110" y1="10" x2="110" y2="210" stroke="#B8960C" strokeWidth="0.4"/>
          <ellipse cx="110" cy="110" rx="40" ry="100" stroke="#B8960C" strokeWidth="0.35"/>
          <ellipse cx="110" cy="110" rx="100" ry="40" stroke="#B8960C" strokeWidth="0.35"/>
          <circle cx="110" cy="110" r="4" fill="#B8960C" opacity="0.4"/>
        </svg>

        {/* ── Corner decorations ── */}
        {/* top-left */}
        <div style={{ position:'absolute', top:64, left:28, width:48, height:48,
          borderTop:'1px solid #B8960C', borderLeft:'1px solid #B8960C', opacity:0.4, pointerEvents:'none' }} />
        {/* top-right */}
        <div style={{ position:'absolute', top:64, right:28, width:48, height:48,
          borderTop:'1px solid #B8960C', borderRight:'1px solid #B8960C', opacity:0.4, pointerEvents:'none' }} />
        {/* bottom-left */}
        <div style={{ position:'absolute', bottom:100, left:28, width:48, height:48,
          borderBottom:'1px solid #B8960C', borderLeft:'1px solid #B8960C', opacity:0.4, pointerEvents:'none' }} />
        {/* bottom-right */}
        <div style={{ position:'absolute', bottom:100, right:28, width:48, height:48,
          borderBottom:'1px solid #B8960C', borderRight:'1px solid #B8960C', opacity:0.4, pointerEvents:'none' }} />

        {/* ── Content ── */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            minHeight: '100dvh', padding: '0 36px',
            fontFamily: "'Jost', sans-serif",
          }}
        >

          {/* Zone 1 — Logo */}
          <div className="wc-anim-logo" style={{ marginTop: 72, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              border: '1px solid #B8960C',
              background: 'rgba(184,150,12,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img
                src={logo}
                alt="GlowKey AI"
                style={{ width: 26, height: 26, objectFit: 'contain' }}
              />
            </div>
            <p style={{
              marginTop: 6, fontSize: 13, letterSpacing: '0.25em',
              color: '#B8960C', textTransform: 'uppercase',
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 400,
              lineHeight: 1,
            }}>
              GLOWKEY AI
            </p>
          </div>

          {/* Zone 2 — Divider */}
          <div className="wc-anim-div1" style={{ width: 40, height: 1, background: '#B8960C', opacity: 0.5, margin: '20px auto 0' }} />

          {/* Zone 3 — Headline */}
          <h1 className="wc-anim-head" style={{
            marginTop: 20, marginBottom: 0,
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300, fontStyle: 'italic',
            fontSize: 42, lineHeight: 1.15,
            color: '#1A1208', textAlign: 'center',
            letterSpacing: '0.01em',
          }}>
            {headline.map((line, i) => (
              <React.Fragment key={i}>{line}{i < headline.length - 1 && <br />}</React.Fragment>
            ))}
          </h1>

          {/* Zone 4 — Sub */}
          <p className="wc-anim-sub" style={{
            marginTop: 20,
            fontFamily: "'Jost', sans-serif", fontWeight: 300,
            fontSize: 16, lineHeight: 1.6,
            color: '#7A6E5A', textAlign: 'center',
          }}>
            {sub.map((line, i) => (
              <React.Fragment key={i}>{line}{i < sub.length - 1 && <br />}</React.Fragment>
            ))}
          </p>

          {/* Zone 5 — Divider */}
          <div className="wc-anim-div2" style={{ width: 40, height: 1, background: '#B8960C', opacity: 0.5, margin: '28px auto 0' }} />

          {/* Zone 6 — CTA button */}
          <button
            className="wc-btn wc-anim-btn"
            onClick={() => dismiss(true)}
            style={{
              marginTop: 28,
              width: '100%',
              height: 56,
              background: '#B8960C',
              color: '#FAF6EE',
              fontFamily: "'Jost', sans-serif",
              fontWeight: 400,
              fontSize: 15,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              border: 'none',
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            {copy.btn}
          </button>

          {/* Zone 7 — Footnote */}
          <p className="wc-anim-foot" style={{
            marginTop: 16,
            fontFamily: "'Jost', sans-serif", fontWeight: 300,
            fontSize: 12, letterSpacing: '0.05em',
            color: '#7A6E5A', textAlign: 'center',
          }}>
            {copy.footnote}
          </p>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Zone 9 — Malteser */}
          <p className="wc-anim-malt" style={{
            marginBottom: 48,
            fontFamily: "'Jost', sans-serif", fontWeight: 300,
            fontSize: 11, letterSpacing: '0.04em',
            color: '#B8960C', opacity: 0.7, textAlign: 'center',
          }}>
            {copy.malteser}
          </p>

        </div>
      </div>
    </>
  );
}

// ── Hook: should we show the welcome screen? ───────────────────────────────
export function useShowWelcome(user: { id: string } | null): [boolean, () => void] {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show to non-authenticated users who haven't visited before
    if (!user && !localStorage.getItem('hasVisited')) {
      // Set the flag immediately on show — so a page reload won't show it again
      localStorage.setItem('hasVisited', 'true');
      setShow(true);
    }
  }, [user]);

  const dismiss = () => setShow(false);
  return [show, dismiss];
}
