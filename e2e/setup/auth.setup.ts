import { test as setup } from '@playwright/test';

import { validateEnv } from '../fixtures/env-validation';

import * as fs from 'node:fs';
import * as path from 'node:path';

const AUTH_STATE_PATH = path.resolve(process.cwd(), '.auth/user.json');
const E2E_STATE_PATH = path.resolve(process.cwd(), '.e2e-state.json');

setup('authenticate and provision virtual lab', async ({ page, context }) => {
  const env = validateEnv();

  // --- 1. Keycloak OAuth login ---
  await setup.step('authenticate via Keycloak', async () => {
    await page.goto('/app/log-in');

    // Wait for Keycloak login form to appear
    try {
      await page.waitForSelector('#username', { timeout: 30_000 });
    } catch {
      throw new Error(
        `Keycloak login page did not load within 30s. ` +
          `Verify KEYCLOAK_ISSUER is correct: ${env.KEYCLOAK_ISSUER}`
      );
    }

    await page.fill('#username', env.E2E_TEST_USERNAME);
    await page.fill('#password', env.E2E_TEST_PASSWORD);
    await page.click('#kc-login');

    // Check for Keycloak error message before waiting for redirect
    const errorMessage = page.locator('#input-error, .kc-feedback-text');
    const hasError = await errorMessage.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasError) {
      throw new Error(
        `Authentication failed: invalid credentials for ${env.E2E_TEST_USERNAME} ` +
          `against ${env.KEYCLOAK_ISSUER}`
      );
    }

    // Wait for redirect back to the app
    try {
      await page.waitForURL('**/app/virtual-lab/sync**', { timeout: 30_000 });
    } catch {
      throw new Error(
        `OAuth redirect did not complete. Expected URL containing /app/virtual-lab/sync ` +
          `but got ${page.url()}. Keycloak issuer: ${env.KEYCLOAK_ISSUER}`
      );
    }
  });

  // --- 2. Save browser storage state ---
  await setup.step('save storage state', async () => {
    const authDir = path.dirname(AUTH_STATE_PATH);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    await context.storageState({ path: AUTH_STATE_PATH });
  });

  // --- 3. Extract access token ---
  let accessToken: string;
  await setup.step('extract access token', async () => {
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(
      (c) => c.name === 'next-auth.session-token' || c.name === '__Secure-next-auth.session-token'
    );

    if (!sessionCookie) {
      throw new Error(
        'Could not find session token cookie after authentication. ' +
          `Cookies present: ${cookies.map((c) => c.name).join(', ')}`
      );
    }

    accessToken = sessionCookie.value;
  });

  // --- 4. Create virtual lab ---
  let virtualLabId: string;
  await setup.step('create virtual lab', async () => {
    const timestamp = Date.now();
    const response = await page.request.post(`${env.VIRTUAL_LAB_API_URL}/virtual-labs`, {
      headers: {
        Authorization: `Bearer ${accessToken!}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `e2e-test-lab-${timestamp}`,
        description: 'E2E test lab',
      },
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `Failed to create virtual lab (${response.status()}): ${body}. ` +
          `API URL: ${env.VIRTUAL_LAB_API_URL}/virtual-labs`
      );
    }

    const json = await response.json();
    virtualLabId = json.data.virtual_lab.id;
  });

  // --- 5. Create project ---
  let projectId: string;
  await setup.step('create project', async () => {
    const timestamp = Date.now();
    const response = await page.request.post(
      `${env.VIRTUAL_LAB_API_URL}/virtual-labs/${virtualLabId!}/projects`,
      {
        headers: {
          Authorization: `Bearer ${accessToken!}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: `e2e-test-project-${timestamp}`,
          description: 'E2E test project',
        },
      }
    );

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `Failed to create project in lab ${virtualLabId!} (${response.status()}): ${body}. ` +
          `API URL: ${env.VIRTUAL_LAB_API_URL}/virtual-labs/${virtualLabId!}/projects`
      );
    }

    const json = await response.json();
    projectId = json.data.project.id;
  });

  // --- 6. Write E2E state file ---
  await setup.step('write e2e state', async () => {
    const state = {
      virtualLabId: virtualLabId!,
      projectId: projectId!,
      accessToken: accessToken!,
    };
    fs.writeFileSync(E2E_STATE_PATH, JSON.stringify(state, null, 2));
  });
});
