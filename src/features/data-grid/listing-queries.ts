import { WorkspaceScope } from '@/constants';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { QueryClient } from '@tanstack/react-query';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/**
 * Root of every grid query for one entity type: rows, the source's facets and the
 * host's facets all hang off it, so an invalidation addresses the whole listing by
 * prefix instead of a predicate that re-implements the key shape. Keep new grid
 * queries under this prefix.
 */
export function gridQueryKey(dataType: TExtendedEntitiesTypeDict, ...rest: unknown[]) {
  return ['data-grid', dataType, ...rest];
}

function countKeyHead(extendedEntityType: TExtendedEntitiesTypeDict) {
  const [head] = keyBuilder.dataCountPerEntity({
    virtualLabId: '',
    projectId: '',
    scope: WorkspaceScope.Project,
    extendedEntityType,
  });
  return head as string;
}

/**
 * Refetches the listings of the given entity types — grid rows and facets, the Data
 * sidebar's two counts, the notebook sidebar's totals.
 *
 * `refetchType: 'all'` rather than the default `'active'`: several callers mutate from
 * a surface where the listing is unmounted (a workflow run finishing on Workflows, a
 * delete that navigates away, an upload started from Get started), and a host may
 * pass `refetchOnMount: false` through the grid's query options, so a flagged-only
 * query can stay on its pre-mutation rows.
 */
export function invalidateEntityListings(
  queryClient: QueryClient,
  types: TExtendedEntitiesTypeDict | readonly TExtendedEntitiesTypeDict[]
) {
  const listingTypes = Array.isArray(types) ? types : [types as TExtendedEntitiesTypeDict];
  if (listingTypes.length === 0) return Promise.resolve([]);

  return Promise.all(
    listingTypes.flatMap((type) =>
      [gridQueryKey(type), [countKeyHead(type)], ['notebook-total-count', type]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey, refetchType: 'all' })
      )
    )
  );
}
