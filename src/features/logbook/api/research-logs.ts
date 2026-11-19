// EntityCore filters, searches and orders the list; the browser never does.
import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { isNil, uniqBy } from 'es-toolkit';

import {
  createResearchLog,
  getResearchLog,
  getResearchLogs,
  updateResearchLog,
} from '@/api/entitycore/queries/general/research-log';
import { deleteResearch } from '@/api/logbook/queries/research';
import { pagesQuery } from '@/features/logbook/api/pages';

import type { InfiniteData } from '@tanstack/react-query';
import type { IResearchLog, IResearchLogDraft } from '@/api/entitycore/types/entities/research-log';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TValueOf } from '@/api/logbook/types';
import type { IProject } from '@/features/logbook/auth/session';

export const PAGE_SIZE = 10;

export const LogOrderField = {
  Name: 'name',
  Created: 'creation_date',
  Updated: 'update_date',
} as const;
export type TLogOrderField = TValueOf<typeof LogOrderField>;

export const OrderDirection = { Ascending: 'asc', Descending: 'desc' } as const;
export type TOrderDirection = TValueOf<typeof OrderDirection>;

export interface ILogOrder {
  readonly field: TLogOrderField;
  readonly direction: TOrderDirection;
}

export const DEFAULT_ORDER: ILogOrder = {
  field: LogOrderField.Updated,
  direction: OrderDirection.Descending,
};

export const orderByOf = (order: ILogOrder): string =>
  `${order.direction === OrderDirection.Descending ? '-' : ''}${order.field}`;

// Public: public logs of any project. Project: this project's. Both on: everything.
export interface ILogFilter {
  readonly public: boolean;
  readonly project: boolean;
  readonly search: string;
  readonly order: ILogOrder;
}

export const noFilterOf = (filter: ILogFilter): boolean => !filter.public && !filter.project;

// `*` is EntityCore's wildcard, so `*x*` means "contains".
export function listParamsOf(project: IProject, filter: ILogFilter): URLSearchParams {
  const params = new URLSearchParams({
    page_size: String(PAGE_SIZE),
    order_by: orderByOf(filter.order),
  });
  if (filter.public && !filter.project) params.set('authorized_public', 'true');
  if (filter.project && !filter.public) params.set('authorized_project_id', project.projectId);
  const needle = filter.search.trim();
  if (needle.length > 0) params.set('ilike_search', `*${needle}*`);
  return params;
}

const listsKey = (project: IProject) => ['research-logs', project.projectId] as const;

export const nextPageOf = ({ pagination }: EntityCoreResponse<unknown>): number | undefined =>
  pagination.page * pagination.page_size < pagination.total_items ? pagination.page + 1 : undefined;

// Limit: offset paging can repeat a log, so dedupe by id. Upgrade: a keyset cursor in EntityCore.
export const logsOf = (pages: readonly EntityCoreResponse<IResearchLog>[]): IResearchLog[] =>
  uniqBy(
    pages.flatMap((page) => page.data),
    (log) => log.id
  );

export const researchLogsQuery = (project: IProject, filter: ILogFilter) =>
  infiniteQueryOptions({
    queryKey: [...listsKey(project), listParamsOf(project, filter).toString()],
    queryFn: ({ signal, pageParam }) => {
      const params = listParamsOf(project, filter);
      params.set('page', String(pageParam));
      return getResearchLogs({ context: project, queryParams: Object.fromEntries(params), signal });
    },
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled: !noFilterOf(filter),
    staleTime: 30_000,
  });

type TLogPages = InfiniteData<EntityCoreResponse<IResearchLog>, number>;

const eachPage =
  (change: (logs: readonly IResearchLog[]) => readonly IResearchLog[]) =>
  (lists: TLogPages | undefined): TLogPages | undefined =>
    isNil(lists)
      ? lists
      : { ...lists, pages: lists.pages.map((page) => ({ ...page, data: [...change(page.data)] })) };

// For an open log the list doesn't hold (hidden by a search or filter).
export const researchLogQuery = (project: IProject, id: string) =>
  queryOptions({
    queryKey: ['research-log', project.projectId, id],
    queryFn: ({ signal }) => getResearchLog({ id, context: project, signal }),
    staleTime: 30_000,
  });

export function useCreateLog(project: IProject) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: IResearchLogDraft) => createResearchLog({ context: project, draft }),
    onSuccess: (created) => {
      client.setQueryData(researchLogQuery(project, created.id).queryKey, created);
      return client.invalidateQueries({ queryKey: listsKey(project) });
    },
  });
}

export function useUpdateLog(project: IProject) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<IResearchLogDraft> & { readonly id: string }) =>
      updateResearchLog({ id, context: project, patch }),
    onSuccess: (updated) => {
      client.setQueryData(researchLogQuery(project, updated.id).queryKey, updated);
      client.setQueriesData<TLogPages>(
        { queryKey: listsKey(project) },
        eachPage((logs) => logs.map((log) => (log.id === updated.id ? updated : log)))
      );
    },
  });
}

export function useDeleteLog(project: IProject) {
  const client = useQueryClient();
  return useMutation({
    // Via the logbook server, not EntityCore, or its pages stay behind. Safe to retry.
    mutationFn: (id: string) => deleteResearch({ id, context: project }),
    onSuccess: (_answer, id) => {
      client.removeQueries({ queryKey: researchLogQuery(project, id).queryKey });
      // Refetch too: offset paging shifts every later page by one.
      client.setQueriesData<TLogPages>(
        { queryKey: listsKey(project) },
        eachPage((logs) => logs.filter((log) => log.id !== id))
      );
      return client.invalidateQueries({ queryKey: listsKey(project) });
    },
    // Also on failure: the delete may have gone through with the answer lost.
    onSettled: (_answer, _error, id) =>
      client.removeQueries({ queryKey: pagesQuery(id, project).queryKey }),
  });
}
