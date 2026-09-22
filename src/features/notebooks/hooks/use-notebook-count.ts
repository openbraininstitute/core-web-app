'use client';

import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

import { WorkspaceSection } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { gridFilteredTotalAtom } from '@/features/data-grid/host/grid-total';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { getWorkspaceScopeFilters } from '@/utils/workspace-scope';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope } from '@/constants';

/**
 * resolves the sidebar count for a notebook type as `{ filtered } of { total }`:
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
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // the grid publishes its filtered total under this dataKey while it is mounted
  const { dataKey } = makeDataKey({
    virtualLabId,
    projectId,
    section: WorkspaceSection.Notebooks,
    dataType: extendedType,
    scope,
  });
  const liveCount = useAtomValue(gridFilteredTotalAtom(dataKey));
  const filtered = isActive ? (liveCount ?? total) : total;

  return { filtered, total, isLoading: isLoading && total == null };
}
