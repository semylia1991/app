import posthog from 'posthog-js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── PostHog analytics ─────────────────────────────────────────────────────────
// Initialise only if the key is provided (skips silently in dev without key)
const posthogKey  = import.meta.env.VITE_POSTHOG_KEY  as string | undefined;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host:           posthogHost || 'https://eu.i.posthog.com',
    capture_pageview:   true,   // track page loads automatically
    capture_pageleave:  true,   // track when users leave
    persistence:        'localStorage',
    autocapture:        false,  // manual event capture only (GDPR-friendly)
    respect_dnt:        true,   // honour browser Do Not Track header
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
