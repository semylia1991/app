import React, { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { motion, AnimatePresence } from 'motion/react';
import { t, Language } from '../i18n';

interface Props {
  lang: Language;
  onOpenPrivacy: () => void;
}

export function CookieBanner({ lang, onOpenPrivacy }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
    // Init PostHog only after explicit consent (§ 25 TDDDG)
    const posthogKey  = import.meta.env.VITE_POSTHOG_KEY  as string | undefined;
    const posthogHost = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
    if (posthogKey && !posthog.__loaded) {
      posthog.init(posthogKey, {
        api_host:          posthogHost || 'https://eu.i.posthog.com',
        capture_pageview:  true,
        capture_pageleave: true,
        persistence:       'localStorage',
        autocapture:       false,
        respect_dnt:       true,
      });
    }
  };

  const handleReject = () => {
    localStorage.setItem('cookieConsent', 'rejected');
    setIsVisible(false);
    // Opt-out PostHog if somehow loaded
    posthog.opt_out_capturing();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-[#FDFBF7] border-t border-[#D4C3A3] p-4 shadow-lg z-50"
        >
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-[#2C3E50]">
              {t[lang].cookieBanner}{' '}
              <button 
                onClick={onOpenPrivacy}
                className="underline text-[#B89F7A] hover:text-[#2C3E50]"
              >
                {t[lang].privacyPolicy}
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className="px-4 py-2 text-sm font-serif border border-[#D4C3A3] text-[#2C3E50] hover:bg-[#f5f0e6] transition-colors"
              >
                {t[lang].reject}
              </button>
              <button
                onClick={handleAccept}
                className="px-4 py-2 text-sm font-serif bg-[#B89F7A] text-white hover:bg-[#a38a5e] transition-colors"
              >
                {t[lang].accept}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
