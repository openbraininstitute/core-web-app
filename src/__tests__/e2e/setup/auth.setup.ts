import { test as setup } from '@playwright/test';

import {
  assertProjectLimit,
  buildE2EProjectName,
  E2E_STATE_PATH,
  readE2EState,
  SHARED_VIRTUAL_LAB_NAME,
  writeE2EState,
} from '../fixtures/e2e-state';
import { validateEnv } from '../fixtures/env-validation';
import { deleteProjects, pruneStaleProjects } from '../fixtures/virtual-lab-cleanup';
import { VirtualLabManagerApi } from '../fixtures/virtual-lab-manager-api';
import {
  AUTH_STATE_PATH,
  createCleanupLogger,
  ensureParentDirectory,
  fileExists,
  removeFileIfExists,
} from './setup-utils';

// CI reuses this setup test in three modes: provision reuses (or first-creates)
// the single shared virtual lab and adds an isolated project for this run,
// auth-only gives each matrix leg fresh browser storage, and cleanup-only logs
// in again for a fresh token before deleting only this run's project.
const authOnly = process.env.E2E_AUTH_ONLY === 'true';
const cleanupOnly = process.env.E2E_CLEANUP_ONLY === 'true';
const setupLogger = createCleanupLogger('auth-setup');

function requireSetupValue(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`E2E setup failed: missing ${label}.`);
  }
  return value;
}

setup('authenticate and provision virtual lab', async ({ page, context }) => {
  const env = validateEnv();
  let accessToken: string | undefined;

  await setup.step('authenticate via Keycloak', async () => {
    await page.goto('/app/log-in', { waitUntil: 'domcontentloaded' });

    // wait for the redirect chain to land on the Keycloak login page
    await page.waitForURL('**/auth/realms/**', { timeout: 60_000 });

    // the Keycloak theme hides the username/password form but the inputs exist in the DOM.
    // wait for them to be attached (not necessarily visible), then set values and submit.
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

    // wait for Keycloak to process the login — may land on T&C or redirect to the app
    await page.waitForURL((url) => !url.pathname.includes('/openid-connect/'), {
      timeout: 30_000,
    });

    // handle Keycloak required actions (e.g. Terms and Conditions) before the app redirect
    while (page.url().includes('/login-actions/')) {
      const acceptButton = page.getByRole('button', { name: 'Accept' });
      await acceptButton.waitFor({ state: 'visible', timeout: 30_000 });
      await Promise.all([page.waitForNavigation({ timeout: 30_000 }), acceptButton.click()]);
    }

    // wait for redirect back to the app after Keycloak processes the login
    await page.waitForURL('**/app/virtual-lab/sync**', { timeout: 60_000 });
  });

  // save browser storage state
  await setup.step('save storage state', async () => {
    ensureParentDirectory(AUTH_STATE_PATH);
    await context.storageState({ path: AUTH_STATE_PATH });
  });

  // extract access token
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

  const api = new VirtualLabManagerApi(
    env.VIRTUAL_LAB_API_URL,
    requireSetupValue(accessToken, 'access token')
  );
  // the shared test user's saved hierarchy/species preference can retain a stale or
  // malformed (JSON-quoted) hierarchy id from earlier runs, which the app forwards
  // un-validated and surfaces as an intermittent 422 on brain-region-hierarchy, stalling
  // sidebar counts. Reset it (best-effort) so every run starts from a valid state
  // this runs in all modes (provision/auth-only/cleanup) since the preference is per-use
  await setup.step('reset workspace hierarchy/species preference', async () => {
    try {
      await api.resetWorkspaceHierarchySpeciesPreference();
    } catch (error) {
      setupLogger.warn(`failed to reset hierarchy/species preference: ${error}.`);
    }
  });

  if (authOnly) {
    if (!fileExists(E2E_STATE_PATH)) {
      throw new Error(
        `E2E_AUTH_ONLY requires provisioned state at ${E2E_STATE_PATH}. ` +
          'Run the provision step before the browser matrix.'
      );
    }

    setupLogger.info('authenticated with existing provisioned virtual lab state.');
    return;
  }

  // cleanup-only: delete just this run's project(s) from the shared lab. The lab
  // is persistent and is intentionally left in place for other PRs.
  if (cleanupOnly) {
    await setup.step("delete this run's e2e project", async () => {
      if (!fileExists(E2E_STATE_PATH)) {
        setupLogger.warn('no provisioned e2e state found - nothing to clean up.');
        return;
      }

      try {
        const state = readE2EState();
        await deleteProjects({
          api,
          virtualLabId: state.virtualLabId,
          projects: state.projects,
          logger: setupLogger,
        });
      } catch (error) {
        setupLogger.warn(`failed to delete project from local e2e state: ${error}.`);
      }

      removeFileIfExists(E2E_STATE_PATH);
    });

    setupLogger.info('cleanup-only mode completed.');
    return;
  }

  // provision: reuse the single shared lab (creating it only if the user has
  // none), then add an isolated project for this run so concurrent PRs never
  // collide on the same workspace.
  let virtualLabId: string | undefined;
  await setup.step('ensure shared virtual lab', async () => {
    const { id, created } = await api.ensureVirtualLab({
      name: SHARED_VIRTUAL_LAB_NAME,
      description: 'Shared E2E test lab',
      entity: 'E2E Test Organization',
    });
    virtualLabId = id;
    setupLogger.info(
      created ? `created shared virtual lab ${id}.` : `reusing shared virtual lab ${id}.`
    );
  });

  // best-effort: remove projects left behind by crashed/cancelled runs so the
  // shared lab doesn't accumulate projects without bound.
  await setup.step('prune stale e2e projects', async () => {
    try {
      await pruneStaleProjects({
        api,
        virtualLabId: requireSetupValue(virtualLabId, 'virtual lab id'),
        logger: setupLogger,
      });
    } catch (error) {
      setupLogger.warn(`failed to prune stale e2e projects: ${error}.`);
    }
  });

  let projectId: string | undefined;
  let projectName: string | undefined;
  await setup.step('create isolated project for this run', async () => {
    const labId = requireSetupValue(virtualLabId, 'virtual lab id');
    // guard against the shared lab being full before adding another project
    const existingProjects = await api.listProjects(labId);
    assertProjectLimit(existingProjects, 1);
    projectName = buildE2EProjectName();
    projectId = await api.createProject(labId, {
      name: projectName,
      description: 'E2E test project',
    });
  });

  // write E2E state file
  await setup.step('write e2e state', async () => {
    const primaryProjectId = requireSetupValue(projectId, 'project id');
    writeE2EState({
      virtualLabId: requireSetupValue(virtualLabId, 'virtual lab id'),
      projectId: primaryProjectId,
      projects: [{ id: primaryProjectId, name: requireSetupValue(projectName, 'project name') }],
      accessToken: requireSetupValue(accessToken, 'access token'),
    });
  });
});
