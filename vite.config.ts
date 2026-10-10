import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

process.env.BROWSER = 'C:\\Program Files\\Mozilla Firefox\\firefox.exe';

export default defineConfig({
  resolve: {
    alias: {
      '@contracts': fileURLToPath(new URL('./src/contracts', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@presentation': fileURLToPath(new URL('./src/presentation', import.meta.url)),
      '@config': fileURLToPath(new URL('./src/config', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
