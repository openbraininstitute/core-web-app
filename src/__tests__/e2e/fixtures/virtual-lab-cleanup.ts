import { parseE2EProjectTimestamp, STALE_E2E_PROJECT_AGE_MS } from './e2e-state';

import type { E2EProject } from './e2e-state';
import type { DeleteResult, ProjectSummary, VirtualLabManagerApi } from './virtual-lab-manager-api';

export type CleanupLogger = {
  info(message: string): void;
  warn(message: string): void;
};

const CLEANUP_MAX_ATTEMPTS = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryDeleteResult(result: DeleteResult): boolean {
  return !result.ok && (result.status === 429 || result.status >= 500);
}

async function deleteWithRetry<T extends DeleteResult>({
  label,
  logger,
  operation,
}: {
  label: string;
  logger: CleanupLogger;
  operation: () => Promise<T>;
}): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CLEANUP_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await operation();
      if (!shouldRetryDeleteResult(result) || attempt === CLEANUP_MAX_ATTEMPTS) {
        return result;
      }
      logger.warn(`${label} returned ${result.status}; retrying cleanup delete.`);
    } catch (error) {
      lastError = error;
      if (attempt === CLEANUP_MAX_ATTEMPTS) break;
      logger.warn(`${label} failed: ${error}; retrying cleanup delete.`);
    }

    await delay(500 * attempt);
  }

  throw lastError;
}

// Deletes the given projects from a virtual lab, leaving the lab itself intact.
// The shared virtual lab is persistent across CI runs, so cleanup only ever
// removes the per-run projects, never the lab.
export async function deleteProjects({
  api,
  virtualLabId,
  projects,
  logger,
}: {
  api: VirtualLabManagerApi;
  virtualLabId: string;
  projects: readonly E2EProject[] | readonly ProjectSummary[];
  logger: CleanupLogger;
}): Promise<void> {
  for (const project of projects) {
    try {
      const result = await deleteWithRetry({
        label: `delete project ${project.id}`,
        logger,
        operation: () => api.deleteProject(virtualLabId, project.id),
      });
      if (!result.ok) {
        logger.warn(
          `failed to delete project ${project.id} from virtual lab ${virtualLabId} ` +
            `(${result.status}). ${result.body}`
        );
      } else {
        logger.info(`deleted project ${project.id}.`);
      }
    } catch (error) {
      logger.warn(
        `error deleting project ${project.id} from virtual lab ${virtualLabId}: ${error}.`
      );
    }
  }
}

// Best-effort sweep of e2e projects abandoned by crashed or cancelled runs. Only
// projects matching our name prefix whose embedded timestamp is older than
// STALE_E2E_PROJECT_AGE_MS are removed, so live runs (and foreign projects) are
// never touched. Keeps the shared lab from accumulating projects without bound
// now that the lab is never recreated.
export async function pruneStaleProjects({
  api,
  virtualLabId,
  logger,
  now = Date.now(),
}: {
  api: VirtualLabManagerApi;
  virtualLabId: string;
  logger: CleanupLogger;
  now?: number;
}): Promise<void> {
  const projects = await api.listProjects(virtualLabId);
  const stale = projects.filter((project) => {
    const createdAt = parseE2EProjectTimestamp(project.name);
    return createdAt !== null && now - createdAt > STALE_E2E_PROJECT_AGE_MS;
  });

  if (stale.length === 0) return;

  logger.info(`pruning ${stale.length} stale e2e project(s) from virtual lab ${virtualLabId}.`);
  await deleteProjects({ api, virtualLabId, projects: stale, logger });
}
