import { globSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);

const TESTS = 'src/**/*.{test,spec}.{ts,tsx}';
// The legacy `*.nodetest.*` files target Node's built-in runner (`pnpm test:node`),
// not vitest, so keep them out of this suite.
const EXCLUDE = ['**/node_modules/**', '**/.next/**', '**/*.nodetest.*'];
// `vi.mock` only replaces a module that is not loaded yet, so a file that mocks
// modules needs a fresh module graph; every other file shares its worker's
// module cache, which loads antd, react-day-picker, etc. once per worker
// instead of once per file (about half the suite's CPU time).
const MOCKING = globSync(TESTS).filter((file) =>
  /\bvi\.(mock|doMock)\(/.test(readFileSync(file, 'utf8'))
);

export default defineConfig({
  resolve: {
    // `tsconfigPaths` resolves the `@/* -> src/*` alias from tsconfig.json
    // so tests import modules the same way the app does.
    tsconfigPaths: true,
    alias: [
      // The `@ant-design/icons` barrel resolves to its `es/` build, which vitest
      // evaluates module by module (~1.7k files) in every test file that reaches
      // it; Node loads its CJS build natively instead.
      { find: /^@ant-design\/icons$/, replacement: require.resolve('@ant-design/icons') },
    ],
  },
  plugins: [
    // Mirrors the `raw-loader` rules for `.frag`/`.vert` in next.config.ts;
    // without them rolldown parses GLSL as JavaScript.
    {
      name: 'glsl-raw',
      load(id: string) {
        if (!/\.(frag|vert)$/.test(id)) return null;
        return `export default ${JSON.stringify(readFileSync(id.split('?')[0], 'utf8'))};`;
      },
    },
  ],
  test: {
    // Load the committed dev env files (.env, .env.development) into process.env
    // so modules that validate config at import time (src/config/client.ts) work.
    // APP_VERSION is normally injected by `make version` at dev/build time, so
    // stub it here for the test run.
    env: { ...loadEnv('development', process.cwd(), ''), APP_VERSION: 'test' },
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // `include`/`exclude` live on the projects only: `extends: true` concatenates
    // arrays, so root values would leak every test file into both projects.
    projects: [
      { extends: true, test: { name: 'isolated', include: MOCKING, exclude: EXCLUDE } },
      {
        extends: true,
        test: {
          name: 'shared',
          isolate: false,
          include: [TESTS],
          exclude: [...EXCLUDE, ...MOCKING],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.{test,spec,nodetest}.*', '**/*.d.ts', '**/types.ts'],
    },
  },
});
