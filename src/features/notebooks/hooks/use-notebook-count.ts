'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { getWorkspaceScopeFilters } from '@/utils/workspace-scope';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope } from '@/constants';

type ListQueryKeyContext = {
  context?: { extendedEntityType?: string; workspaceScope?: string };
};

/**
 * live filtered total for the currently-rendered notebook table
 * subscribes to the React Query cache and reads `pagination.total_items` from the *observed* list query for this type/scope,
 * so the count tracks the table's search/filter without re-implementing its query key.
 */
function useActiveTableTotal({
  extendedType,
  scope,
  enabled,
}: {
  extendedType: TExtendedEntitiesTypeDict;
  scope: TWorkspaceScope;
  enabled: boolean;
}) {
  const cache = useQueryClient().getQueryCache();

  const getSnapshot = useCallback(() => {
    if (!enabled) return undefined;
    const matches = cache.getAll().filter((q) => {
      const ctx = (q.queryKey?.[0] as ListQueryKeyContext | undefined)?.context;
      return ctx?.extendedEntityType === extendedType && ctx?.workspaceScope === scope;
    });
    // the table's current query is the observed one; stale filter entries have no observers
    const current = matches.find((q) => q.getObserversCount() > 0) ?? matches.at(-1);
    return (current?.state?.data as EntityCoreResponse<unknown> | undefined)?.pagination
      ?.total_items;
  }, [cache, enabled, extendedType, scope]);

  const subscribe = useCallback((onChange: () => void) => cache.subscribe(onChange), [cache]);

  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

/**
 * Resolves the sidebar count for a notebook type as `{ filtered } of { total }`:
 * - `total`: unfiltered count for the type within the current scope.
 * - `filtered`: the active table's live count (reflects search); falls back to `total` when this
 *   type isn't the active listing.
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

  const { data: total, isLoading } = useQuery({
    queryKey: ['notebook-total-count', extendedType, scope, virtualLabId, projectId],
    queryFn: async () => {
      const response = await entity?.api?.query?.list?.({
        filters: { page: 1, page_size: 1, ...getWorkspaceScopeFilters(scope, ctx) },
        withFacets: false,
        context: ctx,
      });
      return (response as EntityCoreResponse<unknown> | undefined)?.pagination?.total_items;
    },
    enabled: Boolean(entity),
    staleTime: 60_000,
  });

  const liveCount = useActiveTableTotal({ extendedType, scope, enabled: isActive });
  const filtered = isActive ? (liveCount ?? total) : total;

  return { filtered, total, isLoading: isLoading && total == null };
}
