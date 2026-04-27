import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/config': 'http://localhost:8000',
      '/tenders': 'http://localhost:8000',
      '/parcels': 'http://localhost:8000',
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
