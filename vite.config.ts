/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: o build funciona em qualquer subpasta (ex.: GitHub Pages)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5313 },
  test: { environment: 'node' },
});
