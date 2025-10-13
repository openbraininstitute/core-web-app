import {
  useQuery,
  keepPreviousData,
  UseQueryOptions,
  type QueryFunction,
  hashKey,
} from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import isEmpty from 'es-toolkit/compat/isEmpty';

import { transformFiltersToQuery } from '@/api/entitycore/transformers';
import {
  DEFAULT_BRAIN_REGION_HIERARCHY_ID,
  selectedBrainRegionAtom,
} from '@/features/brain-region-hierarchy/context';
import { compactRecord } from '@/utils/dictionary';
import { DEFAULT_PAGE_SIZE, WorkspaceScope } from '@/constants';
import {
  coreFiltersAtom,
  coreSortStateAtom,
  corePageNumberAtom,
  coreSearchStringAtom,
} from '@/ui/segments/data-table/elements/context';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkspaceContext } from '@/types/common';
import type { TWorkspaceScope } from '@/constants';

export type QueryContext = {
  key: string;
  extendedEntityType: TExtendedEntitiesTypeDict;
  workspaceScope: TWorkspaceScope;
};

export function buildQueryKey({
  context,
  workspace,
  queryParameters,
  requireBrainRegion,
}: {
  context: QueryContext;
  workspace: WorkspaceContext;
  queryParameters: Record<string, any>;
  requireBrainRegion: boolean | undefined;
}): [
  {
    workspace: WorkspaceContext;
    context: QueryContext;
    queryParameters: {} | Record<string, any>;
    requireBrainRegion: boolean | undefined;
  },
] {
  return [{ workspace, context, queryParameters, requireBrainRegion }];
}

function useQueryParameters(
  { context, workspace }: { context: QueryContext; workspace?: WorkspaceContext },
  {
    requireBrainRegion = true,
    defaultBrainRegion,
  }: { requireBrainRegion?: boolean; defaultBrainRegion?: string }
) {
  const selectedBrainRegin = useAtomValue(selectedBrainRegionAtom);
  const sortState = useAtomValue(coreSortStateAtom({ key: context.key }));
  const searchString = useAtomValue(coreSearchStringAtom(context.key));
  const pageNumber = useAtomValue(corePageNumberAtom(context.key));
  const filters = useAtomValue(
    coreFiltersAtom({ dataType: context.extendedEntityType, key: context.key })
  );

  const queryParameters = compactRecord({
    page_size: DEFAULT_PAGE_SIZE,
    page: pageNumber,
    with_facets: true,
    search: isEmpty(searchString) ? null : searchString,
    order_by: `${sortState.order === 'asc' ? '+' : '-'}${sortState.backendField}`,
    ...(requireBrainRegion
      ? {
          within_brain_region_hierarchy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
          within_brain_region_brain_region_id: defaultBrainRegion ?? selectedBrainRegin?.id,
          within_brain_region_ascendants: false,
        }
      : {}),
    // eslint-disable-next-line no-nested-ternary
    ...(context.workspaceScope === WorkspaceScope.Project
      ? {
          authorized_project_id: workspace?.projectId,
        }
      : context.workspaceScope === WorkspaceScope.Public
        ? {
            authorized_public: true,
          }
        : {}),
    ...transformFiltersToQuery(filters as any),
  });
  return queryParameters;
}

export function useQueryExtendedEntityType<TData = unknown, TError = unknown>({
  context,
  workspace,
  queryFn,
  requireBrainRegion,
  defaultBrainRegion,
  ...rest
}: {
  context: QueryContext;
  workspace: WorkspaceContext;
  queryFn:
    | QueryFunction<
        TData,
        [
          {
            workspace: {
              virtualLabId: string;
              projectId: string;
            };
            context: QueryContext;
            queryParameters: {} | Record<string, any>;
          },
        ],
        never
      >
    | undefined;
  useKeepPreviousData?: boolean;
  requireBrainRegion?: boolean;
  defaultBrainRegion?: string;
} & Omit<
  UseQueryOptions<
    TData,
    TError,
    TData,
    [
      {
        workspace: {
          virtualLabId: string;
          projectId: string;
        };
        context: QueryContext;
        queryParameters: {} | Record<string, any>;
      },
    ]
  >,
  'queryKey' | 'queryFn' | 'placeholderData'
>) {
  const queryParameters = useQueryParameters(
    { context, workspace },
    { requireBrainRegion, defaultBrainRegion }
  );
  const queryKey = buildQueryKey({ workspace, context, queryParameters, requireBrainRegion });
  const queryKeyHash = hashKey(queryKey);

  const query = useQuery({
    queryKey,
    queryFn,
    // NOTE: if we don't use this option, then `isLoading` should be used in the component
    placeholderData: rest.useKeepPreviousData ? keepPreviousData : undefined,
    ...rest,
  });

  return {
    ...query,
    queryKeyHash,
  };
}
