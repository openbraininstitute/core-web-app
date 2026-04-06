import { test as base, expect } from '@playwright/test';

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Shared E2E state written by auth setup and consumed by private tests.
 * Contains the provisioned virtual lab/project IDs and access token.
 */
export interface E2EState {
  virtualLabId: string;
  projectId: string;
  accessToken: string;
}

type TestFixtures = {
  e2eState: E2EState;
};

/**
 * Extended Playwright `test` with custom fixtures for E2E state access.
 * The `e2eState` fixture reads `.e2e-state.json` from the project root,
 * providing virtual lab and project IDs to private test files.
 */
export const test = base.extend<TestFixtures>({
  e2eState: async ({}, use) => {
    const statePath = path.resolve(process.cwd(), '.e2e-state.json');
    const raw = fs.readFileSync(statePath, 'utf-8');
    const state: E2EState = JSON.parse(raw);
    await use(state);
  },
});

export { expect };
