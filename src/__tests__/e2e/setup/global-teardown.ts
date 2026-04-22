import { test as teardown } from '@playwright/test';

import { E2E_STATE_PATH, readE2EState } from '../fixtures/e2e-state';
import { deleteVirtualLabState } from '../fixtures/virtual-lab-cleanup';
import { VirtualLabManagerApi } from '../fixtures/virtual-lab-manager-api';
import {
  AUTH_STATE_PATH,
  createCleanupLogger,
  removeFileIfExists,
  removeRunDirectory,
} from './setup-utils';

const teardownLogger = createCleanupLogger('global-teardown');

teardown('delete virtual lab and local e2e state', async () => {
  const apiUrl = process.env.VIRTUAL_LAB_API_URL;
  const state = (() => {
    try {
      return readE2EState();
    } catch {
      teardownLogger.warn('.e2e-state.json not found or unreadable - skipping workspace deletion.');
      return null;
    }
  })();

  if (apiUrl && state) {
    const api = new VirtualLabManagerApi(apiUrl, state.accessToken);
    await deleteVirtualLabState({ api, state, logger: teardownLogger });
  } else {
    teardownLogger.warn('missing api url or e2e state - skipping workspace deletion.');
  }

  // Clean up local state files after remote teardown has run.
  for (const filePath of [E2E_STATE_PATH, AUTH_STATE_PATH]) {
    removeFileIfExists(filePath);
  }

  removeRunDirectory();
});
