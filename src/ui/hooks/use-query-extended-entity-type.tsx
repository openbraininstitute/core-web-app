import {
  hashKey,
  keepPreviousData,
  type QueryFunction,
  type UseQueryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isEmpty } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { transformFiltersToQuery } from '@/api/entitycore/transformers';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { BrainRegionDirection } from '@/api/entitycore/types/shared/request';
import type { TWorkspaceScope } from '@/constants';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import {
  DEFAULT_BRAIN_REGION_HIERARCHY_ID,
  selectedBrainRegionAtom,
} from '@/features/brain-region-hierarchy/context';
import type { WorkspaceContext } from '@/types/common';
import {
  coreFiltersAtom,
  corePageNumberAtom,
  coreSearchStringAtom,
  coreSortStateAtom,
} from '@/ui/segments/data-table/elements/context';
import { compactRecord } from '@/utils/dictionary';
import { getWorkspaceScopeFilters } from '@/utils/workspace-scope';

export type QueryContext = {
  key: string;
  extendedEntityType: TExtendedEntitiesTypeDict;
  workspaceScope: TWorkspaceScope;
} & Record<string, string | boolean | number>;

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
    queryParameters: Record<string, any>;
    requireBrainRegion: boolean | undefined;
  },
] {
  return [{ workspace, context, queryParameters, requireBrainRegion }];
}

export type ExtendedEntityTypeQueryKey = ReturnType<typeof buildQueryKey>;

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
  const entity = getEntityByExtendedType({ type: context.extendedEntityType });

  function search() {
    if (entity && !!entity.api.config.ilikeSearchEnabled && !isEmpty(searchString)) {
      return { ilike_search: `*${searchString}*` };
    }
    if (!isEmpty(searchString)) {
      return { search: searchString };
    }
    return null;
  }

  const queryParameters = compactRecord({
    page_size: DEFAULT_PAGE_SIZE,
    page: pageNumber,
    with_facets: true,
    ...search(),
    order_by: `${sortState.order === 'asc' ? '+' : '-'}${sortState.backendField}`,
    ...(requireBrainRegion
      ? {
          within_brain_region_hierarchy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
          within_brain_region_brain_region_id: defaultBrainRegion ?? selectedBrainRegin?.id,
          within_brain_region_direction: BrainRegionDirection.ASCENDANTS_AND_DESCENDANTS,
        }
      : {}),
    ...getWorkspaceScopeFilters(context.workspaceScope, workspace),
    ...transformFiltersToQuery(filters),
  });
  return queryParameters;
}

export function useQueryExtendedEntityType<TData = unknown, TError = unknown>({
  context,
  workspace,
  queryFn,
  requireBrainRegion,
  defaultBrainRegion,
  extraQueryParams,
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
            queryParameters: Record<string, any>;
          },
        ],
        never
      >
    | undefined;
  useKeepPreviousData?: boolean;
  requireBrainRegion?: boolean;
  defaultBrainRegion?: string;
  extraQueryParams?: Record<string, any>;
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
        queryParameters: Record<string, any>;
      },
    ]
  >,
  'queryKey' | 'queryFn' | 'placeholderData'
>) {
  const queryParameters = useQueryParameters(
    { context, workspace },
    { requireBrainRegion, defaultBrainRegion }
  );
  const queryKey = buildQueryKey({
    workspace,
    context,
    queryParameters: { ...queryParameters, ...extraQueryParams },
    requireBrainRegion,
  });

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
