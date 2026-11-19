// Research logs are EntityCore records: EntityCore owns the list, the name, the
// description, who may read and write. EntityCore also filters, searches and orders the list (its
// list endpoint, over its indexes), so the browser never filters it. React Query caches one list
// per project, scope and search, read 10 logs at a time as the list scrolls (infinite query).
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

// One page: what a screen shows, so the first answer is small and quick; more as the list scrolls.
export const PAGE_SIZE = 10;

// The fields EntityCore can order research logs by (ResearchLogFilter.ordering_model_fields).
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

// EntityCore's order_by: the field, with a leading minus for descending.
export const orderByOf = (order: ILogOrder): string =>
  `${order.direction === OrderDirection.Descending ? '-' : ''}${order.field}`;

// What the list shows: Public (public logs of any project) and Project (this project's, public
// or not); both on is everything the project headers list. `search` matches name or description.
export interface ILogFilter {
  readonly public: boolean;
  readonly project: boolean;
  readonly search: string;
  readonly order: ILogOrder;
}

export const noFilterOf = (filter: ILogFilter): boolean => !filter.public && !filter.project;

// The EntityCore list query for a filter: its own filters (authorized_public,
// authorized_project_id), its search (ilike_search on name and description: `*` is its "any
// characters", added on both sides for a "contains" match) and its order. Without the page.
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

// Every list of the project, whatever its filter: the key the writes below update.
const listsKey = (project: IProject) => ['research-logs', project.projectId] as const;

// The next page number, or undefined after the last (React Query then stops asking).
export const nextPageOf = ({ pagination }: EntityCoreResponse<unknown>): number | undefined =>
  pagination.page * pagination.page_size < pagination.total_items ? pagination.page + 1 : undefined;

// The loaded pages as one list. Limit: EntityCore pages by number (offset), not by cursor, so a log
// made or moved to the top between two pages shifts the next page by one: the same log can come
// twice (dropped here by id). Upgrade: a keyset cursor in EntityCore.
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
    // Both filters off lists nothing: no call (the screen says why).
    enabled: !noFilterOf(filter),
    staleTime: 30_000,
  });

type TLogPages = InfiniteData<EntityCoreResponse<IResearchLog>, number>;

// Every loaded page of every list, each page's logs changed by `change`.
const eachPage =
  (change: (logs: readonly IResearchLog[]) => readonly IResearchLog[]) =>
  (lists: TLogPages | undefined): TLogPages | undefined =>
    isNil(lists)
      ? lists
      : { ...lists, pages: lists.pages.map((page) => ({ ...page, data: [...change(page.data)] })) };

// One log, for the open one when the list does not hold it (a search or a filter hides it).
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
    // The new log is listed again by EntityCore (it fits some filters, not others); the open log
    // reads it from its own query at once.
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
    // One call, to the logbook server: it deletes the EntityCore record (as this person), then
    // its own pages, text and history. Never EntityCore directly: the server would keep its part.
    // A failure (503) is safe to send again.
    mutationFn: (id: string) => deleteResearch({ id, context: project }),
    onSuccess: (_answer, id) => {
      client.removeQueries({ queryKey: researchLogQuery(project, id).queryKey });
      // Gone from the screen at once; then the lists read again, since every page after it now
      // starts one log later (pages by number).
      client.setQueriesData<TLogPages>(
        { queryKey: listsKey(project) },
        eachPage((logs) => logs.filter((log) => log.id !== id))
      );
      return client.invalidateQueries({ queryKey: listsKey(project) });
    },
    // Also after a failure: the log may be deleted already (an answer that got lost), and its
    // cached pages must not open again.
    onSettled: (_answer, _error, id) =>
      client.removeQueries({ queryKey: pagesQuery(id, project).queryKey }),
  });
}
