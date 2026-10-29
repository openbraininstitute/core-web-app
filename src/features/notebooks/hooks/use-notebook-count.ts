'use client';

import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

import { WorkspaceSection } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { gridFilteredTotalAtom } from '@/features/data-grid/host/grid-total';
import {
  savedListingParams,
  useSavedListingFilters,
} from '@/features/data-grid/saved-listing-filters';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { getWorkspaceScopeFilters } from '@/utils/workspace-scope';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope } from '@/constants';
import type { TSavedListingFilters } from '@/features/data-grid/saved-listing-filters';

/**
 * resolves the sidebar count for a notebook type as `{ filtered } of { total }`:
 * - `total`: unfiltered count for the type within the current scope.
 * - `filtered`: the active table's live count; otherwise the count under the listing's saved
 *   filters/search, or `total` when none are saved.
 */
export function useNotebookCount({
  extendedType,
  scope,
  isActive,
}: {
  extendedType: TExtendedEntitiesTypeDict;
  scope: TWorkspaceScope;
  isActive: boolean;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const ctx = { virtualLabId, projectId };
  const entity = getEntityByExtendedType({ type: extendedType });

  // the grid publishes its filtered total under this dataKey while it is mounted
  const { dataKey } = makeDataKey({
    virtualLabId,
    projectId,
    section: WorkspaceSection.Notebooks,
    dataType: extendedType,
    scope,
  });
  const liveCount = useAtomValue(gridFilteredTotalAtom(dataKey));
  const savedFilters = useSavedListingFilters(dataKey);

  const countQuery = (saved?: TSavedListingFilters | null) => ({
    queryKey: ['notebook-total-count', extendedType, scope, virtualLabId, projectId, saved ?? null],
    queryFn: async () => {
      const savedParams = await savedListingParams(extendedType, saved);
      const response = await entity?.api?.query?.list?.({
        filters: { ...savedParams, page: 1, page_size: 1, ...getWorkspaceScopeFilters(scope, ctx) },
        withFacets: false,
        context: ctx,
      });
      return (response as EntityCoreResponse<unknown> | undefined)?.pagination?.total_items;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // a mounted grid publishes the number itself
  const live = isActive ? liveCount : undefined;
  // `filtered` shows the saved-filters count; `undefined` saved filters = storage not read yet
  // (hydration), which waits rather than flashing the unfiltered total
  const showsSavedCount = live == null && savedFilters !== null;

  const {
    data: total,
    isLoading,
    isError,
  } = useQuery({
    ...countQuery(),
    enabled: Boolean(entity),
  });
  const {
    data: savedCount,
    isLoading: isSavedLoading,
    isError: isSavedError,
  } = useQuery({
    ...countQuery(savedFilters),
    enabled: Boolean(entity) && Boolean(savedFilters) && live == null,
  });

  // with filters unread the saved query is keyed like the total's, so its data is the total
  const savedValue = savedFilters ? savedCount : undefined;

  // loading and error follow the count `filtered` shows: a request left in flight after the
  // grid published its total must not hold the skeleton
  return {
    filtered: live ?? (showsSavedCount ? savedValue : total),
    total,
    isLoading: isLoading || (showsSavedCount && (savedFilters === undefined || isSavedLoading)),
    isError: isError || (showsSavedCount && isSavedError),
  };
}
