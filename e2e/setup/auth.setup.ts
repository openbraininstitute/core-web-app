import { test as setup } from '@playwright/test';

import { validateEnv } from '../fixtures/env-validation';

import * as fs from 'node:fs';
import * as path from 'node:path';

const AUTH_STATE_PATH = path.resolve(process.cwd(), '.auth/user.json');
const E2E_STATE_PATH = path.resolve(process.cwd(), '.e2e-state.json');

setup('authenticate and provision virtual lab', async ({ page, context }) => {
  const env = validateEnv();

  // --- 1. Keycloak OAuth login ---
  let accessToken: string;

  await setup.step('authenticate via Keycloak', async () => {
    await page.goto('/app/log-in');

    // Wait for the redirect chain to land on the Keycloak login page
    await page.waitForURL('**/auth/realms/**', { timeout: 30_000 });

    // The Keycloak theme hides the username/password form but the inputs exist in the DOM.
    // Wait for them to be attached (not necessarily visible), then set values and submit.
    await page.locator('#username').waitFor({ state: 'attached', timeout: 10_000 });

    await page.evaluate(
      ({ username, password }) => {
        const usernameInput = document.querySelector<HTMLInputElement>('#username');
        const passwordInput = document.querySelector<HTMLInputElement>('#password');
        if (!usernameInput || !passwordInput) {
          throw new Error('Keycloak #username or #password not found in DOM');
        }
        const form = usernameInput.closest('form');
        if (!form) {
          throw new Error('No parent <form> found for #username');
        }
        usernameInput.value = username;
        passwordInput.value = password;
        form.submit();
      },
      { username: env.E2E_TEST_USERNAME, password: env.E2E_TEST_PASSWORD }
    );

    // Wait for Keycloak to process the login — may land on T&C or redirect to the app
    await page.waitForURL((url) => !url.pathname.includes('/openid-connect/'), {
      timeout: 15_000,
    });

    // Handle Keycloak required actions (e.g. Terms and Conditions) before the app redirect
    while (page.url().includes('/login-actions/')) {
      const acceptButton = page.getByRole('button', { name: 'Accept' });
      await acceptButton.waitFor({ state: 'visible', timeout: 10_000 });
      await Promise.all([page.waitForNavigation({ timeout: 15_000 }), acceptButton.click()]);
    }

    // Wait for redirect back to the app after Keycloak processes the login
    await page.waitForURL('**/app/virtual-lab/sync**', { timeout: 30_000 });
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
  await setup.step('extract access token', async () => {
    // Get the Keycloak access token from the NextAuth session endpoint
    const sessionResponse = await page.request.get('/api/auth/session');
    const session = await sessionResponse.json();

    if (!session?.accessToken) {
      throw new Error(
        'Could not extract accessToken from NextAuth session. ' +
          `Session keys: ${Object.keys(session || {}).join(', ')}`
      );
    }

    accessToken = session.accessToken;
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
        entity: 'E2E Test Organization',
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
