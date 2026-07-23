import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // loadEnv with prefix '' loads ALL env vars including non-VITE_ ones.
  // We restrict to 'VITE_' prefix so only intended vars reach the browser bundle.
  // SECURITY WARNING: GEMINI_API_KEY is currently exposed in the client bundle.
  // For production, move Gemini API calls to a Supabase Edge Function or backend proxy
  // so the key is never sent to the browser.
  const env = loadEnv(mode, '.', 'VITE_');
  // Explicitly load GEMINI_API_KEY separately (non-VITE_ var needed by @google/genai)
  const geminiKey = loadEnv(mode, '.', '').GEMINI_API_KEY;
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // TODO: Move Gemini calls to Edge Function to avoid exposing this key
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    },
  };
});
