import * as fs from 'node:fs';
import * as path from 'node:path';

export const E2E_STATE_PATH = path.resolve(
  process.cwd(),
  process.env.E2E_STATE_PATH ?? '.e2e-state.json'
);
export const MAX_E2E_PROJECTS = 40;

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
