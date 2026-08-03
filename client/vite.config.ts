import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devPort = Number(env.VITE_DEV_PORT || 5173);
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      port: devPort,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      clearMocks: true,
    },
  };
});
