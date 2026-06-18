import type { E2EProject, E2EState } from './e2e-state';
import type {
  DeleteResult,
  ProjectSummary,
  VirtualLabManagerApi,
  VirtualLabSummary,
} from './virtual-lab-manager-api';

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

export async function deleteVirtualLabWorkspace({
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

  try {
    const result = await deleteWithRetry({
      label: `delete virtual lab ${virtualLabId}`,
      logger,
      operation: () => api.deleteVirtualLab(virtualLabId),
    });
    if (!result.ok) {
      logger.warn(
        `failed to delete virtual lab ${virtualLabId} (${result.status}). ${result.body}`
      );
    } else {
      logger.info(`deleted virtual lab ${virtualLabId}.`);
    }
  } catch (error) {
    logger.warn(`error deleting virtual lab ${virtualLabId}: ${error}.`);
  }
}

export async function deleteVirtualLabState({
  api,
  state,
  logger,
}: {
  api: VirtualLabManagerApi;
  state: E2EState;
  logger: CleanupLogger;
}): Promise<void> {
  await deleteVirtualLabWorkspace({
    api,
    virtualLabId: state.virtualLabId,
    projects: state.projects,
    logger,
  });
}

export async function deleteAllUserVirtualLabs({
  api,
  logger,
}: {
  api: VirtualLabManagerApi;
  logger: CleanupLogger;
}): Promise<void> {
  const virtualLabs = await api.listVirtualLabs();
  for (const lab of virtualLabs) {
    let projects: ProjectSummary[] = [];
    try {
      projects = await api.listProjects(lab.id);
    } catch (error) {
      logger.warn(`error listing projects for virtual lab ${lab.id}: ${error}.`);
    }

    logger.info(`deleting pre-existing virtual lab ${formatLab(lab)}.`);
    await deleteVirtualLabWorkspace({
      api,
      virtualLabId: lab.id,
      projects,
      logger,
    });
  }
}

function formatLab(lab: VirtualLabSummary): string {
  return lab.name === lab.id ? lab.id : `${lab.name} (${lab.id})`;
}
