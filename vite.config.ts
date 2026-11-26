import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative: works at any sub-path (GitHub Pages /loop/)
  server: { host: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
  optimizeDeps: { exclude: ['@dimforge/rapier3d-compat'] },
});
