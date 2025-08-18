import {
  useQuery,
  keepPreviousData,
  UseQueryOptions,
  type QueryFunction,
} from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import isEmpty from 'lodash/isEmpty';

import {
  DEFAULT_BRAIN_REGION_HIERARCHY_ID,
  selectedBrainRegionAtom,
} from '@/features/brain-region-hierarchy/context';
import { transformFiltersToQuery } from '@/api/entitycore/transformers';
import { compactRecord } from '@/utils/dictionary';
import {
  coreFiltersAtom,
  corePageNumberAtom,
  coreSearchStringAtom,
  coreSortStateAtom,
} from '@/ui/segments/data-table/elements/context';
import { DEFAULT_PAGE_SIZE, type TWorkspaceScope } from '@/constants';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkspaceContext } from '@/types/common';

export type QueryContext = {
  key: string;
  extendedEntityType: TExtendedEntitiesTypeDict;
  workspaceScope: TWorkspaceScope;
};

export function buildQueryKey({
  context,
  workspace,
  queryParameters,
}: {
  context: QueryContext;
  workspace: WorkspaceContext;
  queryParameters: Record<string, any>;
}): [
  {
    workspace: WorkspaceContext;
    context: QueryContext;
    queryParameters: {} | Record<string, any>;
  },
] {
  return [{ workspace, context, queryParameters }];
}

function useQueryParameters({ context }: { context: QueryContext }) {
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
    search: isEmpty(searchString) ? null : searchString,
    order_by: `${sortState.order === 'asc' ? '+' : '-'}${sortState.backendField}`,
    within_brain_region_hierarchy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
    within_brain_region_brain_region_id: selectedBrainRegin?.id,
    within_brain_region_ascendants: false,
    ...transformFiltersToQuery(filters as any),
  });

  return queryParameters;
}

export function useQueryExtendedEntityType<TData = unknown, TError = unknown>({
  context,
  workspace,
  queryFn,
  useKeepPreviousData = true,
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
  const queryParameters = useQueryParameters({ context });
  return useQuery({
    queryKey: buildQueryKey({ workspace, context, queryParameters }),
    queryFn,
    // NOTE: if we don't use this option, the isLoading should be used in the component
    placeholderData: useKeepPreviousData ? keepPreviousData : undefined,
    ...rest,
  });
}
