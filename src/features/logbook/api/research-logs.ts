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
import { LOGS_PAGE_SIZE } from '@/features/logbook/constants';
import { LogOrderField, OrderDirection } from '@/features/logbook/types';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IResearchLog, TResearchLogDraft } from '@/api/entitycore/types/entities/research-log';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { ILogFilter, ILogOrder, IProject, TLogPages } from '@/features/logbook/types';

export const DEFAULT_ORDER: ILogOrder = {
  field: LogOrderField.Updated,
  direction: OrderDirection.Descending,
};

export const orderByOf = (order: ILogOrder): string =>
  `${order.direction === OrderDirection.Descending ? '-' : ''}${order.field}`;

export const noFilterOf = (filter: ILogFilter): boolean => !filter.public && !filter.project;

export function listParamsOf(project: IProject, filter: ILogFilter): URLSearchParams {
  const params = new URLSearchParams({
    page_size: String(LOGS_PAGE_SIZE),
    order_by: orderByOf(filter.order),
  });
  if (filter.public && !filter.project) params.set('authorized_public', 'true');
  if (filter.project && !filter.public) params.set('authorized_project_id', project.projectId);
  const needle = filter.search.trim();
  if (needle.length > 0) params.set('ilike_search', `*${needle}*`);
  return params;
}

export const nextPageOf = ({ pagination }: EntityCoreResponse<unknown>): number | undefined =>
  pagination.page * pagination.page_size < pagination.total_items ? pagination.page + 1 : undefined;

export const logsOf = (pages: readonly EntityCoreResponse<IResearchLog>[]): IResearchLog[] =>
  uniqBy(
    pages.flatMap((page) => page.data),
    (log) => log.id
  );

const listingOf = ({ pages }: TLogPages) => ({
  logs: logsOf(pages),
  total: pages[0]?.pagination.total_items ?? 0,
});

export const researchLogsQuery = (project: IProject, filter: ILogFilter) =>
  infiniteQueryOptions({
    queryKey: keyBuilderLogbook.logsPage(
      project.projectId,
      listParamsOf(project, filter).toString()
    ),
    queryFn: ({ signal, pageParam }) => {
      const params = listParamsOf(project, filter);
      params.set('page', String(pageParam));
      return getResearchLogs({ context: project, queryParams: Object.fromEntries(params), signal });
    },
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    select: listingOf,
    enabled: !noFilterOf(filter),
    staleTime: 30_000,
  });

const eachPage =
  (change: (logs: readonly IResearchLog[]) => readonly IResearchLog[]) =>
  (lists: TLogPages | undefined): TLogPages | undefined =>
    isNil(lists)
      ? lists
      : { ...lists, pages: lists.pages.map((page) => ({ ...page, data: [...change(page.data)] })) };

export const researchLogQuery = (project: IProject, id: string) =>
  queryOptions({
    queryKey: keyBuilderLogbook.log(project.projectId, id),
    queryFn: ({ signal }) => getResearchLog({ id, context: project, signal }),
    staleTime: 30_000,
  });

export function useCreateLog(project: IProject) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: TResearchLogDraft) => createResearchLog({ context: project, draft }),
    onSuccess: (created) => {
      client.setQueryData(researchLogQuery(project, created.id).queryKey, created);
      return client.invalidateQueries({ queryKey: keyBuilderLogbook.logs(project.projectId) });
    },
  });
}

export function useUpdateLog(project: IProject) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<TResearchLogDraft> & { readonly id: string }) =>
      updateResearchLog({ id, context: project, patch }),
    onSuccess: (updated) => {
      client.setQueryData(researchLogQuery(project, updated.id).queryKey, updated);
      client.setQueriesData<TLogPages>(
        { queryKey: keyBuilderLogbook.logs(project.projectId) },
        eachPage((logs) => logs.map((log) => (log.id === updated.id ? updated : log)))
      );
    },
  });
}

export function useDeleteLog(project: IProject) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteResearch({ id, context: project }),
    onSuccess: (_answer, id) => {
      client.removeQueries({ queryKey: researchLogQuery(project, id).queryKey });
      client.setQueriesData<TLogPages>(
        { queryKey: keyBuilderLogbook.logs(project.projectId) },
        eachPage((logs) => logs.filter((log) => log.id !== id))
      );
      return client.invalidateQueries({ queryKey: keyBuilderLogbook.logs(project.projectId) });
    },
    onSettled: (_answer, _error, id) =>
      client.removeQueries({ queryKey: pagesQuery(id, project).queryKey }),
  });
}
