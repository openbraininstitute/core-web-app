import * as fs from 'node:fs';
import { availableParallelism } from 'node:os';
import * as path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

function loadEnvFile(filePath: string, override = false): void {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) return;

  for (const rawLine of fs.readFileSync(absolutePath, 'utf-8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const [rawKey, ...rawValueParts] = line.replace(/^export\s+/, '').split('=');
    const key = rawKey.trim();
    if (!key || (process.env[key] !== undefined && !override)) continue;

    let value = rawValueParts.join('=').trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }

    process.env[key] = value;
  }
}

function resolveWorkerCount(): number {
  const explicitWorkers = Number.parseInt(process.env.PLAYWRIGHT_WORKERS ?? '', 10);
  if (Number.isInteger(explicitWorkers) && explicitWorkers > 0) {
    return explicitWorkers;
  }

  return Math.max(1, Math.min(availableParallelism() - 1, 3));
}

function resolveBrowserUse() {
  const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;

  switch (process.env.PLAYWRIGHT_BROWSER) {
    case 'firefox':
      return devices['Desktop Firefox'];
    case 'webkit':
      return devices['Desktop Safari'];
    default:
      return {
        ...devices['Desktop Chrome'],
        ...(channel ? { channel } : {}),
      };
  }
}

function getWebServerEnv(): Record<string, string> {
  // playwright starts `webServer.command` as a child process. the config has
  // already loaded `.env`/`.env.test`, so pass the resolved environment through
  // explicitly; otherwise next.js can fail its runtime config validation in CI
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => {
      return typeof entry[1] === 'string';
    })
  );
}

const isCI = !!process.env.CI;
// CI splits e2e workflow into provision -> browser matrix -> cleanup jobs. in those jobs
// teardown is controlled by the workflow, not by playwright project dependency,
// so the single provisioned virtual lab is not deleted before the matrix runs
const disableAuthSetupTeardown = process.env.E2E_DISABLE_AUTH_SETUP_TEARDOWN === 'true';

loadEnvFile('.env');
loadEnvFile('.env.test');
if (!isCI) {
  loadEnvFile('.env.test.secrets', true);
}

process.env.APP_VERSION ??= 'test';

const baseURL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const e2eRoot = 'src/__tests__/e2e';
// Shared budget for web-first assertions and actions. Tune CI flakiness here, once.
const ASSERTION_TIMEOUT = 30_000;
const workers = resolveWorkerCount();
const browserUse = resolveBrowserUse();
const e2eRunId = process.env.E2E_RUN_ID ?? `${Date.now()}-${process.pid}`;
const e2eRunDir = path.resolve(process.cwd(), '.e2e-runs', e2eRunId);

// Keep auth/session state in a per-run directory by default. CI overrides
// E2E_STATE_PATH when it needs to pass sanitized virtual-lab IDs between jobs.
process.env.E2E_RUN_ID = e2eRunId;
process.env.E2E_RUN_DIR = e2eRunDir;
process.env.E2E_AUTH_STATE_PATH ??= path.join(e2eRunDir, 'auth', 'user.json');
process.env.E2E_STATE_PATH ??= path.join(e2eRunDir, 'state.json');

export default defineConfig({
  testDir: e2eRoot,
  timeout: isCI ? 120_000 : 90_000,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers,
  outputDir: 'test-results/',

  // Single source of truth for how long web-first assertions auto-retry. These are not
  // sleeps: an assertion resolves the instant its condition holds and only consumes the
  // full budget when the condition never becomes true. Set it once here instead of
  // hardcoding `{ timeout }` at each call site.
  expect: { timeout: ASSERTION_TIMEOUT },

  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['html', { open: 'on-failure' }]],

  use: {
    baseURL,
    actionTimeout: ASSERTION_TIMEOUT,
    navigationTimeout: isCI ? 90_000 : 60_000,
    screenshot: 'only-on-failure',
    trace: isCI ? 'on-first-retry' : 'off',
    ...browserUse,
  },

  projects: [
    {
      name: 'auth-setup',
      testDir: `${e2eRoot}/setup`,
      testMatch: 'auth.setup.ts',
      teardown: disableAuthSetupTeardown ? undefined : 'global-teardown',
    },
    {
      name: 'global-teardown',
      testDir: `${e2eRoot}/setup`,
      testMatch: 'global-teardown.ts',
    },
    {
      name: 'public',
      testDir: `${e2eRoot}/tests/public`,
      dependencies: ['auth-setup'],
    },
    {
      name: 'private',
      testDir: `${e2eRoot}/tests/private`,
      dependencies: ['auth-setup'],
      use: {
        storageState: process.env.E2E_AUTH_STATE_PATH,
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    env: getWebServerEnv(),
    port: 3000,
    reuseExistingServer: !isCI,
  },
});
