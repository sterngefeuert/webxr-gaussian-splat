import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: '/webxr-gaussian-splat/',   // GitHub Pages serves the repo under this subpath
  plugins: [basicSsl()],
  server: {
    https: true,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless'
    }
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          splats: ['@mkkellogg/gaussian-splats-3d']
        }
      }
    }
  }
});
