import { useQuery, type QueryFunction, keepPreviousData } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import isEmpty from 'lodash/isEmpty';

import {
  DEFAULT_BRAIN_REGION_HIERARCHY_ID,
  selectedBrainRegionAtom,
} from '@/features/brain-region-hierarchy/context';
import { transformFiltersToQuery } from '@/api/entitycore/transformers';
import { compactRecord } from '@/utils/dictionary';
import { pageNumberAtom } from '@/state/explore-section/list-view-atoms';
import {
  coreFiltersAtom,
  coreSearchStringAtom,
  coreSortStateAtom,
} from '@/ui/segments/data-table/elements/context';

import {
  PAGE_SIZE,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import type { WorkspaceContext } from '@/types/common';

export type WorkspaceScope = 'public' | 'project' | 'bookmarks' | 'custom' | 'build-me-model';

export type QueryContext = {
  key: string;
  extendedEntityType: TExtendedEntitiesTypeDict;
  workspaceScope: WorkspaceScope;
};

export function buildQueryKey({
  ctx,
  workspace,
  queryParameters,
}: {
  ctx: QueryContext;
  workspace: WorkspaceContext;
  queryParameters: Record<string, any>;
}) {
  return [{ workspace, ctx, queryParameters }];
}

function useQueryParameters({ ctx }: { ctx: QueryContext }) {
  const selectedBrainRegin = useAtomValue(selectedBrainRegionAtom);
  const sortState = useAtomValue(coreSortStateAtom({ key: ctx.key }));
  const searchString = useAtomValue(coreSearchStringAtom(ctx.key));
  const pageNumber = useAtomValue(pageNumberAtom(ctx.key));
  const filters = useAtomValue(coreFiltersAtom({ dataType: ctx.extendedEntityType, key: ctx.key }));

  const queryParameters = compactRecord({
    page_size: PAGE_SIZE,
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

export function useQueryExtendedEntityType({
  ctx,
  workspace,
  queryFn,
  useKeepPreviousData = true,
}: {
  ctx: QueryContext;
  workspace: WorkspaceContext;
  queryFn:
    | QueryFunction<
        unknown,
        {
          workspace: {
            virtualLabId: string;
            projectId: string;
          };
          ctx: QueryContext;
          queryParameters: {} | Record<string, any>;
        }[],
        never
      >
    | undefined;
  useKeepPreviousData?: boolean;
}) {
  const queryParameters = useQueryParameters({ ctx });
  return useQuery({
    queryKey: buildQueryKey({ workspace, ctx, queryParameters }),
    queryFn,
    // NOTE: if we don't use this option, the isLoading should be used in the component
    placeholderData: useKeepPreviousData ? keepPreviousData : undefined,
  });
}
