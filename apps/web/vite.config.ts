import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'openrate';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.GITHUB_PAGES === 'true' ? `/${repoName}/` : '/',
  server: {
    proxy: {
      '/auth': 'http://localhost:8787',
      '/api': 'http://localhost:8787',
    },
  },
});
