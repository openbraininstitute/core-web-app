import { defineConfig } from 'vitest/config';

import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/__tests__/workflows/scan-config/**/*.test.{ts,tsx}'],
    exclude: ['src/__tests__/workflows/scan-config/e2e/**', 'node_modules/**', '.next/**'],
    setupFiles: ['src/__tests__/setup/vitest-env.ts'],
    clearMocks: true,
    restoreMocks: true,
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage/scan-config',
      include: [
        'src/features/scan-config/**/*.{ts,tsx}',
        'src/ui/segments/workflows/config/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/features/scan-config/**/*.module.css',
        'src/features/scan-config/**/how-to.md',
        'src/features/scan-config/components/model-preview/**',
      ],
    },
  },
});
