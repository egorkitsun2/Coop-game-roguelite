import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@contracts': path.resolve(__dirname, './src/contracts'),
      '@core': path.resolve(__dirname, './src/core'),
      '@presentation': path.resolve(__dirname, './src/presentation'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
