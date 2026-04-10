import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.e2e' });

const isCI = !!process.env.CI;
const baseURL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: 'e2e',
  timeout: isCI ? 60_000 : 30_000,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  outputDir: 'test-results/',

  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['html', { open: 'on-failure' }]],

  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: isCI ? 'on-first-retry' : 'off',
    ...devices['Desktop Chrome'],
  },

  globalTeardown: 'e2e/setup/global-teardown.ts',

  projects: [
    {
      name: 'auth-setup',
      testDir: 'e2e/setup',
      testMatch: 'auth.setup.ts',
    },
    {
      name: 'public',
      testDir: 'e2e/tests/public',
      dependencies: ['auth-setup'],
    },
    {
      name: 'private',
      testDir: 'e2e/tests/private',
      dependencies: ['auth-setup'],
      use: {
        storageState: '.auth/user.json',
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !isCI,
  },
});
