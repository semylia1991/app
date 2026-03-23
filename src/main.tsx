import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import posthog from 'posthog-js';
import App from './App.tsx';
import './index.css';
 
posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
  person_profiles: 'identified_only', // создаём профиль только для авторизованных
});
 
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
 
