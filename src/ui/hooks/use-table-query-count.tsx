'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useSyncExternalStore } from 'react';

import { WorkspaceSection } from '@/constants';
import { buildQueryKey, useQueryParameters } from '@/ui/hooks/use-query-extended-entity-type';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope } from '@/constants';
import type { WorkspaceContext } from '@/types/common';

/**
 * subscribes to the data table's cached query for a given extended entity type
 * and returns `total_items` from the pagination.
 *
 * this allows the browse-link sidebar to reactively reflect the filtered count
 * when the table is filtered / searched / sorted, without a separate query.
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
    { requireBrainRegion: true }
  );

  const queryKey = buildQueryKey({
    workspace,
    context: {
      key: dataKey,
      extendedEntityType: extendedType,
      workspaceScope: scope,
    },
    queryParameters,
    requireBrainRegion: true,
  });

  const prevCountRef = useRef<number | undefined>(undefined);
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const cache = queryClient.getQueryCache();

  const subscribe = useCallback(
    (onStoreChange: () => void) => cache.subscribe(onStoreChange),
    [cache]
  );

  const getSnapshot = useCallback(() => {
    if (!isActiveEntity) return undefined;
    const query = cache.find({ queryKey: queryKeyRef.current });
    const data = query?.state?.data as EntityCoreResponse<unknown> | undefined;
    const total = data?.pagination?.total_items;
    if (total !== prevCountRef.current) {
      prevCountRef.current = total;
    }
    return prevCountRef.current;
  }, [isActiveEntity, cache]);

  const count = useSyncExternalStore(subscribe, getSnapshot, () => undefined);

  if (!isActiveEntity) {
    return { count: undefined, isLoading: false, isError: false, hasCachedData: false };
  }

  const query = cache.find({ queryKey });
  const isFetching = query?.state?.fetchStatus === 'fetching';
  const isError = query?.state?.status === 'error';

  return {
    dataKey,
    count,
    isLoading: isFetching,
    isError,
    hasCachedData: count !== undefined,
  };
}
