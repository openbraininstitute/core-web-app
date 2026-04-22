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
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => {
      return typeof entry[1] === 'string';
    })
  );
}

const isCI = !!process.env.CI;

loadEnvFile('.env');
loadEnvFile('.env.test');
if (!isCI) {
  loadEnvFile('.env.test.secrets', true);
}

process.env.APP_VERSION ??= 'test';

const baseURL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const e2eRoot = 'src/__tests__/e2e';
const workers = resolveWorkerCount();
const browserUse = resolveBrowserUse();
const e2eRunId = process.env.E2E_RUN_ID ?? `${Date.now()}-${process.pid}`;
const e2eRunDir = path.resolve(process.cwd(), '.e2e-runs', e2eRunId);

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

  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['html', { open: 'on-failure' }]],

  use: {
    baseURL,
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
      teardown: 'global-teardown',
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
