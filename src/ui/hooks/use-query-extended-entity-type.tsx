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
import { BrainRegionDirection } from '@/api/entitycore/types/shared/request';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { SortOrder } from '@/entity-configuration/definitions/types';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import {
  coreFiltersAtom,
  corePageNumberAtom,
  coreSearchStringAtom,
  coreSortStateAtom,
} from '@/ui/segments/data-table/elements/context';
import { compactRecord } from '@/utils/dictionary';
import { getWorkspaceScopeFilters } from '@/utils/workspace-scope';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { WorkspaceContext } from '@/types/common';

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
  const entity = getEntityByExtendedType({ type: context.extendedEntityType });
  return [
    {
      workspace,
      context,
      queryParameters: {
        ...(entity?.api.config.extraQueryKeyBuilder ?? {}),
        ...queryParameters,
      },
      requireBrainRegion,
    },
  ];
}

export type ExtendedEntityTypeQueryKey = ReturnType<typeof buildQueryKey>;

export function useQueryParameters(
  { context, workspace }: { context: QueryContext; workspace?: WorkspaceContext },
  {
    requireBrainRegion = true,
    defaultBrainRegion,
  }: { requireBrainRegion?: boolean; defaultBrainRegion?: string }
) {
  const { selectedBrainRegion } = useWorkspaceHierarchyRegistry();
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
  const isBrainRegionRequiredAndPresent = Boolean(
    requireBrainRegion && (!!defaultBrainRegion || !!selectedBrainRegion?.id)
  );
  const requireBrainRegionQuery = isBrainRegionRequiredAndPresent
    ? {
        within_brain_region_brain_region_id: defaultBrainRegion ?? selectedBrainRegion?.id,
        within_brain_region_direction: BrainRegionDirection.ASCENDANTS_AND_DESCENDANTS,
      }
    : {};
  const queryParameters = compactRecord({
    page_size: DEFAULT_PAGE_SIZE,
    page: pageNumber,
    with_facets: true,
    ...search(),
    order_by: `${sortState.order === SortOrder.ASC ? '+' : '-'}${sortState.backendField}`,
    ...requireBrainRegionQuery,
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

export function useQueryExtendedEntityTypeFacets({
  dataKey,
  section,
  scope,
  dataType,
  workspace,
  queryFilters,
  extraQueryKey,
  enabled,
}: {
  dataKey: string;
  section: TWorkspaceSection;
  scope: TWorkspaceScope;
  dataType: TExtendedEntitiesTypeDict;
  workspace: WorkspaceContext;
  queryFilters?: Record<string, any>;
  extraQueryKey?: Record<string, any>;
  enabled?: boolean | (() => boolean);
}) {
  const entity = getEntityByExtendedType({ type: dataType });
  return useQuery({
    queryKey: [
      'facets',
      {
        dataKey,
        with_facets: true,
        section,
        scope,
        dataType,
        workspace,
        ...extraQueryKey,
      },
    ],
    queryFn: async () => {
      return (
        await entity?.api?.query.list?.({
          filters: { ...queryFilters, page: 1, page_size: 1 },
          withFacets: true,
          context: workspace,
        })
      )?.facets;
    },
    enabled: () => {
      let enable = false;

      if (typeof enabled === 'function') {
        enable = enabled?.();
      }
      if (typeof enabled === 'boolean') {
        enable = enabled;
      }

      return !!entity?.api?.query.list && enable;
    },
  });
}
