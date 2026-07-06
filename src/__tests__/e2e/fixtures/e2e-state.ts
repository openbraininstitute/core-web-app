import * as fs from 'node:fs';
import * as path from 'node:path';

export const E2E_STATE_PATH = path.resolve(
  process.cwd(),
  process.env.E2E_STATE_PATH ?? '.e2e-state.json'
);
export const MAX_E2E_PROJECTS = 40;

// The shared test user may own only one virtual lab, so CI treats it as a
// persistent resource: every run reuses this single lab and isolates itself in
// its own project instead of recreating the lab (which would clobber the labs
// of other PRs running concurrently against the same user).
export const SHARED_VIRTUAL_LAB_NAME = 'e2e-shared-lab';
export const E2E_PROJECT_NAME_PREFIX = 'e2e-test-project-';
// Projects older than this were abandoned by a crashed/cancelled run and are
// safe to prune. Keep it comfortably above the e2e workflow budget (provision
// 30m + tests 60m) so a live run's project is never deleted out from under it.
export const STALE_E2E_PROJECT_AGE_MS = 3 * 60 * 60 * 1000;

// Project name carries the creation timestamp (and run id when on GitHub) so the
// provision step can identify and prune stale projects by age, and so parallel
// runs never collide on a name.
export function buildE2EProjectName(now: number = Date.now()): string {
  const runId = process.env.GITHUB_RUN_ID;
  const suffix = runId ? `${now}-${runId}` : `${now}-${process.pid}`;
  return `${E2E_PROJECT_NAME_PREFIX}${suffix}`;
}

// Extracts the creation timestamp embedded by buildE2EProjectName. Returns null
// for names that don't match our prefix so foreign projects are never touched.
export function parseE2EProjectTimestamp(name: string): number | null {
  if (!name.startsWith(E2E_PROJECT_NAME_PREFIX)) return null;
  const timestamp = Number.parseInt(name.slice(E2E_PROJECT_NAME_PREFIX.length).split('-')[0], 10);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export interface E2EProject {
  id: string;
  name: string;
}

export interface E2EState {
  virtualLabId: string;
  projectId: string;
  projects: E2EProject[];
  accessToken?: string;
}

export function assertProjectLimit(projects: readonly E2EProject[], nextProjects = 0): void {
  const total = projects.length + nextProjects;
  if (total > MAX_E2E_PROJECTS) {
    throw new Error(
      `E2E project limit exceeded: ${total} projects requested, maximum is ${MAX_E2E_PROJECTS}.`
    );
  }
}

export function readE2EState(): E2EState {
  const raw = fs.readFileSync(E2E_STATE_PATH, 'utf-8');
  return JSON.parse(raw) as E2EState;
}

export function writeE2EState(state: E2EState): void {
  assertProjectLimit(state.projects);
  fs.mkdirSync(path.dirname(E2E_STATE_PATH), { recursive: true });
  fs.writeFileSync(E2E_STATE_PATH, JSON.stringify(state, null, 2));
}
