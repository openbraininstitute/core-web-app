import { queryOptions, useQuery } from '@tanstack/react-query';
import { chunk, isNil } from 'es-toolkit';

import { getResearchContributors } from '@/api/logbook/queries/research';
import { CONTRIBUTORS_BATCH_WAIT_MS, CONTRIBUTORS_MAX_IDS } from '@/features/logbook/constants';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IContributor } from '@/api/logbook/types';
import type { IContributorsBatch, IContributorsWaiter } from '@/features/logbook/types';
import type { WorkspaceContext } from '@/types/common';

const batches = new Map<string, IContributorsBatch>();

const batchKeyOf = (project: WorkspaceContext): string =>
  `${project.virtualLabId}/${project.projectId}`;

function send(project: WorkspaceContext, waiters: ReadonlyMap<string, IContributorsWaiter[]>) {
  for (const ids of chunk([...waiters.keys()], CONTRIBUTORS_MAX_IDS)) {
    const settle = (each: (waiter: IContributorsWaiter, id: string) => void): void => {
      for (const id of ids) for (const waiter of waiters.get(id) ?? []) each(waiter, id);
    };
    getResearchContributors({ ids, context: project })
      .then(({ items }) => {
        const byLog = new Map(items.map((item) => [item.researchId, item.contributors]));
        settle((waiter, id) => waiter.resolve(byLog.get(id) ?? []));
      })
      .catch((error: unknown) => settle((waiter) => waiter.reject(error)));
  }
}

export function contributorsOf(
  project: WorkspaceContext,
  logId: string
): Promise<readonly IContributor[]> {
  return new Promise((resolve, reject) => {
    const key = batchKeyOf(project);
    let batch = batches.get(key);
    if (isNil(batch)) {
      const waiters = new Map<string, IContributorsWaiter[]>();
      batch = { project, waiters };
      batches.set(key, batch);
      setTimeout(() => {
        batches.delete(key);
        send(project, waiters);
      }, CONTRIBUTORS_BATCH_WAIT_MS);
    }
    batch.waiters.set(logId, [...(batch.waiters.get(logId) ?? []), { resolve, reject }]);
  });
}

const contributorsQuery = (project: WorkspaceContext, logId: string) =>
  queryOptions({
    queryKey: keyBuilderLogbook.contributors(project.projectId, logId),
    queryFn: () => contributorsOf(project, logId),
    staleTime: 30_000,
  });

export const useContributors = (project: WorkspaceContext, logId: string, shown: boolean) =>
  useQuery({ ...contributorsQuery(project, logId), enabled: shown });
