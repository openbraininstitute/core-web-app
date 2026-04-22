import { test as base, expect } from '@playwright/test';

import { type E2EState, readE2EState } from './e2e-state';

type TestFixtures = {
  e2eState: E2EState;
};

/**
 * extended Playwright `test` with custom fixtures for E2E state access
 * the `e2eState` fixture reads `.e2e-state.json` from the project root,
 * providing virtual lab and project IDs to private test files
 */
export const test = base.extend<TestFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: required by Playwright
  e2eState: async ({}, use) => {
    await use(readE2EState());
  },
});

export { expect };
