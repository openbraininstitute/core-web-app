import {
  QueryFunction,
  useQuery,
  useInfiniteQuery,
  GetNextPageParamFunction,
  GetPreviousPageParamFunction,
} from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import isEmpty from 'es-toolkit/compat/isEmpty';

import { DEFAULT_BRAIN_REGION_HIERARCHY_ID } from '@/features/brain-region-hierarchy/context';
import { transformFiltersToQuery } from '@/api/entitycore/transformers';
import { compactRecord } from '@/utils/dictionary';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import {
  sortStateAtom,
  searchStringAtom,
  pageNumberAtom,
  filtersAtom,
} from '@/state/explore-section/list-view-atoms';
import type { WorkspaceContext } from '@/types/common';

function useQueryParameters({
  ctx,
}: {
  ctx: {
    key: string;
    brainRegionId: string;
    entityType: string;
    workspaceScope: 'public' | 'project' | 'bookmarks' | 'custom';
  };
}) {
  const sortState = useAtomValue(sortStateAtom({ key: ctx.key }));
  const searchString = useAtomValue(searchStringAtom(ctx.key));
  const pageNumber = useAtomValue(pageNumberAtom(ctx.key));
  // TODO: fix the context of filters atom when we change the parameters
  // @ts-expect-error
  const filters = useAtomValue(filtersAtom(ctx));

  const queryParameters = compactRecord({
    page_size: DEFAULT_PAGE_SIZE,
    page: pageNumber,
    search: isEmpty(searchString) ? null : searchString,
    order_by: `${sortState.order === 'asc' ? '+' : '-'}${sortState.backendField}`,
    within_brain_region_hierarchy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
    within_brain_region_brain_region_id: ctx.brainRegionId,
    within_brain_region_ascendants: false,
    ...transformFiltersToQuery(filters as any),
  });

  return queryParameters;
}

export function useQueryScience({
  ctx,
  workspace,
  queryFn,
}: {
  ctx: {
    key: string;
    brainRegionId: string;
    entityType: string;
    workspaceScope: 'public' | 'project' | 'bookmarks' | 'custom';
  };
  workspace: WorkspaceContext;
  queryFn:
    | QueryFunction<
        unknown,
        {
          [x: string]: any;
        }[],
        never
      >
    | undefined;
}) {
  const queryParameters = useQueryParameters({ ctx });
  return useQuery({
    queryKey: [{ workspace, queries: queryParameters }],
    queryFn,
  });
}

export function useInfiniteQueryScience({
  ctx,
  workspace,
  queryFn,
  initialPageParam,
  getNextPageParam,
  getPreviousPageParam,
}: {
  ctx: {
    key: string;
    brainRegionId: string;
    entityType: string;
    workspaceScope: 'public' | 'project' | 'bookmarks' | 'custom';
  };
  workspace: WorkspaceContext;
  queryFn?:
    | QueryFunction<
        void,
        {
          workspace: {
            virtualLabId: string;
            projectId: string;
          };
          queries: {} | Record<string, any>;
        }[],
        number
      >
    | undefined;
  initialPageParam: number;
  getNextPageParam: GetNextPageParamFunction<number, void>;
  getPreviousPageParam: GetPreviousPageParamFunction<number, void> | undefined;
}) {
  const queryParameters = useQueryParameters({ ctx });
  return useInfiniteQuery({
    queryKey: [{ workspace, queries: queryParameters }],
    queryFn,
    initialPageParam,
    getNextPageParam,
    getPreviousPageParam,
  });
}
