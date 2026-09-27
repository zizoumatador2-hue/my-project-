import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'web',
  publicDir: 'public',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true, sourcemap: false, assetsInlineLimit: 0 }, // no data: URIs — keeps CSP strict
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
