import posthog from 'posthog-js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── PostHog analytics ─────────────────────────────────────────────────────────
// Initialise ONLY if user has accepted cookies (§ 25 TDDDG / DSGVO Art. 6 Abs. 1 lit. a)
const posthogKey  = import.meta.env.VITE_POSTHOG_KEY  as string | undefined;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

const cookieConsent = localStorage.getItem('cookieConsent');
if (posthogKey && cookieConsent === 'accepted') {
  posthog.init(posthogKey, {
    api_host:           posthogHost || 'https://eu.i.posthog.com',
    capture_pageview:   true,
    capture_pageleave:  true,
    persistence:        'localStorage',
    autocapture:        false,
    respect_dnt:        true,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
