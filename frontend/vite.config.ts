import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Send /api calls to the backend, so the browser sees one origin (no CORS issues in dev)
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
