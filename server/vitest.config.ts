import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/tests/setupEnv.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      reporter: ['text', 'json-summary'],
      exclude: ['dist/**', 'src/server.ts', 'src/scripts/**', 'src/tests/**'],
    },
  },
});
