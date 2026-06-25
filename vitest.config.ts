import { loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `tsconfigPaths` resolves the `@/* -> src/*` alias from tsconfig.json so tests
  // import modules the same way the app does.
  plugins: [tsconfigPaths()],
  // Use the automatic JSX runtime so vitest's esbuild can transpile `.tsx`
  // component tests without the React vite plugin.
  esbuild: { jsx: 'automatic' },
  test: {
    // Load the committed dev env files (.env, .env.development) into process.env
    // so modules that validate config at import time (src/config/client.ts) work.
    // APP_VERSION is normally injected by `make version` at dev/build time, so
    // stub it here for the test run.
    env: { ...loadEnv('development', process.cwd(), ''), APP_VERSION: 'test' },
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // The legacy `*.nodetest.*` files target Node's built-in runner (`pnpm test:node`),
    // not vitest, so keep them out of this suite.
    exclude: ['**/node_modules/**', '**/.next/**', 'src/__tests__/e2e/**', '**/*.nodetest.*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.{test,spec,nodetest}.*', '**/*.d.ts', '**/types.ts'],
    },
  },
});
