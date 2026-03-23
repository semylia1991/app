import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import posthog from 'posthog-js';
import App from './App.tsx';
import './index.css';

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
  person_profiles: 'identified_only',
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

**3. Обновить `.env.example`** (чтобы другие знали об этих переменных):
```
VITE_POSTHOG_KEY="phc_ВАШ_КЛЮЧ"
VITE_POSTHOG_HOST="https://eu.i.posthog.com"
