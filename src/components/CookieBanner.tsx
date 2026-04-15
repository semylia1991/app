import React, { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { motion, AnimatePresence } from 'motion/react';
import { t, Language } from '../i18n';

interface Props { lang: Language; onOpenPrivacy: () => void; }

export function CookieBanner({ lang, onOpenPrivacy }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!localStorage.getItem('cookieConsent')) setVisible(true); }, []);
  const accept = () => { localStorage.setItem('cookieConsent', 'accepted'); setVisible(false); const k = import.meta.env.VITE_POSTHOG_KEY as string | undefined; const h = import.meta.env.VITE_POSTHOG_HOST as string | undefined; if (k && !posthog.__loaded) posthog.init(k, { api_host: h || 'https://eu.i.posthog.com', capture_pageview: true, capture_pageleave: true, persistence: 'localStorage', autocapture: false, respect_dnt: true }); };
  const reject = () => { localStorage.setItem('cookieConsent', 'rejected'); setVisible(false); posthog.opt_out_capturing(); };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FAF7F2', borderTop: '0.5px solid #DDD5C8', padding: '14px 20px', zIndex: 50 }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: '#8A8078', lineHeight: 1.6, flex: 1, minWidth: 200 }}>
              {t[lang].cookieBanner}{' '}
              <button onClick={onOpenPrivacy} style={{ color: '#2D5A3D', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', fontWeight: 500, textDecoration: 'underline' }}>{t[lang].privacyPolicy}</button>
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={reject} style={{ padding: '7px 12px', border: '0.5px solid #DDD5C8', background: 'transparent', color: '#8A8078', fontSize: '0.65rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{t[lang].reject}</button>
              <button onClick={accept} className="luxury-btn" style={{ padding: '7px 14px' }}>{t[lang].accept}</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
