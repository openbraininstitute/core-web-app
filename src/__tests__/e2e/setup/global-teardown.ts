import { test as teardown } from '@playwright/test';

import { E2E_STATE_PATH, readE2EState } from '../fixtures/e2e-state';
import { deleteProjects } from '../fixtures/virtual-lab-cleanup';
import { VirtualLabManagerApi } from '../fixtures/virtual-lab-manager-api';
import {
  AUTH_STATE_PATH,
  createCleanupLogger,
  removeFileIfExists,
  removeRunDirectory,
} from './setup-utils';

const teardownLogger = createCleanupLogger('global-teardown');

teardown('delete e2e project and local e2e state', async () => {
  const apiUrl = process.env.VIRTUAL_LAB_API_URL;
  const state = (() => {
    try {
      return readE2EState();
    } catch {
      teardownLogger.warn('.e2e-state.json not found or unreadable - skipping project deletion.');
      return null;
    }
  })();

  // Delete only this run's project; the shared virtual lab is persistent so that
  // concurrent runs (and the user's one-lab limit) are never disturbed.
  if (apiUrl && state?.accessToken) {
    const api = new VirtualLabManagerApi(apiUrl, state.accessToken);
    await deleteProjects({
      api,
      virtualLabId: state.virtualLabId,
      projects: state.projects,
      logger: teardownLogger,
    });
  } else {
    teardownLogger.warn('missing api url, access token, or e2e state - skipping project deletion.');
  }

  // Clean up local state files after remote teardown has run.
  for (const filePath of [E2E_STATE_PATH, AUTH_STATE_PATH]) {
    removeFileIfExists(filePath);
  }

  removeRunDirectory();
});
