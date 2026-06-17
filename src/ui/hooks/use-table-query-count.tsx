'use client';

import { hashKey, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import {
  dataBrowseListingUsesBrainRegionHierarchy,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { speciesSelectionModeAtom } from '@/features/brain-region-hierarchy/context';
import { buildQueryKey, useQueryParameters } from '@/ui/hooks/use-query-extended-entity-type';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope } from '@/constants';
import type { WorkspaceContext } from '@/types/common';

/**
 * Reads `pagination.total_items` from the data table's React Query cache entry so
 * the sidebar count stays in sync with filters, search, sort, and pagination.
 */
export function useTableQueryCount({
  extendedType,
  scope,
  workspace,
  isActiveEntity,
}: {
  extendedType: TExtendedEntitiesTypeDict;
  scope: TWorkspaceScope;
  workspace: WorkspaceContext;
  isActiveEntity: boolean;
}) {
  const queryClient = useQueryClient();
  const { virtualLabId, projectId } = workspace;
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const requireBrainRegion = dataBrowseListingUsesBrainRegionHierarchy(extendedType);

  const { dataKey } = makeDataKey({
    virtualLabId,
    projectId,
    section: WorkspaceSection.Data,
    dataType: extendedType,
    scope,
  });

  const queryParameters = useQueryParameters(
    {
      context: {
        key: dataKey,
        extendedEntityType: extendedType,
        workspaceScope: scope,
      },
      workspace,
    },
    { requireBrainRegion }
  );

  const queryKey = useMemo(
    () =>
      buildQueryKey({
        workspace,
        context: {
          key: dataKey,
          extendedEntityType: extendedType,
          workspaceScope: scope,
        },
        queryParameters,
        requireBrainRegion,
        speciesSelectionMode,
      }),
    [
      workspace,
      dataKey,
      extendedType,
      scope,
      queryParameters,
      requireBrainRegion,
      speciesSelectionMode,
    ]
  );

  const queryKeyHash = useMemo(() => hashKey(queryKey), [queryKey]);
  const cache = queryClient.getQueryCache();

  const getSnapshot = useCallback(() => {
    if (!isActiveEntity) return undefined;
    const data = cache.find({ queryKey })?.state?.data as EntityCoreResponse<unknown> | undefined;
    return data?.pagination?.total_items;
  }, [cache, isActiveEntity, queryKey]);

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      cache.subscribe((event) => {
        if (hashKey(event.query.queryKey) === queryKeyHash) {
          onStoreChange();
        }
      }),
    [cache, queryKeyHash]
  );

  const count = useSyncExternalStore(subscribe, getSnapshot, () => undefined);

  const queryState = isActiveEntity ? cache.find({ queryKey })?.state : undefined;
  const isFetching = queryState?.fetchStatus === 'fetching';

  return {
    dataKey,
    count,
    isLoading: isActiveEntity && isFetching && count === undefined,
    isError: queryState?.status === 'error',
  };
}
