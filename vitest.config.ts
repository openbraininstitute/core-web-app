import { defineConfig } from 'vitest/config';

import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    globals: false,
    css: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
          exclude: ['src/**/*.test.tsx', 'src/**/*.spec.tsx'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx', 'src/**/*.spec.tsx'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
});
