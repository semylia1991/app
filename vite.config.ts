import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// GEMINI_API_KEY must NOT be exposed to the browser.
// All AI calls go through the Netlify Function in netlify/functions/gemini.mjs
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    proxy: {
      '/api/gemini': 'http://localhost:3000',
    },
  },
  build: {
    // Raise warning threshold — gzip is ~460 kB which is acceptable
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Stable vendor chunks — cached by browser separately from app code ──

          // React core — changes almost never; users cache this forever
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }

          // Supabase — large but stable
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }

          // Framer Motion — only used in 2 modals, load separately
          if (id.includes('node_modules/framer-motion/') ||
              id.includes('node_modules/motion-dom/') ||
              id.includes('node_modules/motion-utils/')) {
            return 'vendor-motion';
          }

          // PostHog analytics
          if (id.includes('node_modules/posthog-js/')) {
            return 'vendor-posthog';
          }

          // React Markdown + remark/rehype pipeline
          if (id.includes('node_modules/react-markdown/') ||
              id.includes('node_modules/remark') ||
              id.includes('node_modules/rehype') ||
              id.includes('node_modules/unified/') ||
              id.includes('node_modules/mdast') ||
              id.includes('node_modules/micromark')) {
            return 'vendor-markdown';
          }

          // Lucide icons — tree-shaken by Vite but still grouping improves cache
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-lucide';
          }
        },
      },
    },
  },
});
