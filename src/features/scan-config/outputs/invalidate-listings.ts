import { WorkspaceScope } from '@/constants';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { QueryClient } from '@tanstack/react-query';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/**
 * Builds the query-key head shared by a type's two sidebar count queries.
 *
 * @param extendedEntityType - Extended entity type the Data listing is registered under.
 * @returns The `data-entity-count-<type>` head, or `undefined` if the builder did not produce a
 * string head.
 *
 * @remarks
 * The sidebar's "current" and "root" counts differ only in the brain region and scope carried by
 * the key's second element, so the head alone identifies both.
 */
function countKeyHead(extendedEntityType: TExtendedEntitiesTypeDict): string | undefined {
  const [head] = keyBuilder.dataCountPerEntity({
    virtualLabId: '',
    projectId: '',
    scope: WorkspaceScope.Project,
    extendedEntityType,
  });
  return typeof head === 'string' ? head : undefined;
}

/**
 * Reads a nested string property off an untyped query-key element.
 *
 * @param part - A single element of a query key.
 * @param path - Property names to walk, outermost first.
 * @returns The value at `path` when it is a string, `undefined` otherwise.
 *
 * @remarks
 * Query keys are typed `unknown[]`, and the listing and facet keys nest the entity type
 * (`context.extendedEntityType`, `dataType`), so the predicates need a narrowing accessor.
 *
 * @example
 * readPath({ context: { extendedEntityType: 'circuit' } }, 'context', 'extendedEntityType');
 * // 'circuit'
 */
function readPath(part: unknown, ...path: string[]): string | undefined {
  let current: unknown = part;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Tests an untyped query-key head against a set of known heads.
 *
 * @param head - First element of a query key.
 * @param heads - Heads to match against.
 * @returns `true` when `head` is a string present in `heads`.
 */
function matchesHead(head: unknown, heads: ReadonlySet<string>): boolean {
  return typeof head === 'string' && heads.has(head);
}

/**
 * Refetches the Data listings of the given entity types: table rows, sidebar counts and facets.
 *
 * @param params - Invalidation target.
 * @param params.queryClient - Client holding the Data page's queries.
 * @param params.listingTypes - Extended entity types whose listings changed.
 * @returns A promise resolving once every matched query has been refetched; resolves immediately
 * when `listingTypes` is empty.
 *
 * @remarks
 * Uses `refetchType: 'all'` rather than the default `'active'`. A run finishes while the user is on
 * Workflows, so the Data page and its "N of M" count queries are unmounted; the default would flag
 * them without refetching, and their `staleTime: Infinity` leaves the root total on the pre-run
 * value.
 *
 * @example
 * await invalidateDataListings({
 *   queryClient,
 *   listingTypes: [ExtendedEntitiesTypeDict.EFeatureExtractionResult],
 * });
 */
export function invalidateDataListings({
  queryClient,
  listingTypes,
}: {
  queryClient: QueryClient;
  listingTypes: readonly TExtendedEntitiesTypeDict[];
}) {
  if (listingTypes.length === 0) return Promise.resolve([]);

  const types = new Set<string>(listingTypes);
  const countHeads = new Set(
    listingTypes.map(countKeyHead).filter((head): head is string => head !== undefined)
  );

  const matches = (value: unknown) => typeof value === 'string' && types.has(value);

  return Promise.all([
    queryClient.invalidateQueries({
      refetchType: 'all',
      predicate: (query) => matchesHead(query.queryKey[0], countHeads),
    }),
    queryClient.invalidateQueries({
      refetchType: 'all',
      predicate: (query) => matches(readPath(query.queryKey[0], 'context', 'extendedEntityType')),
    }),
    queryClient.invalidateQueries({
      refetchType: 'all',
      predicate: (query) =>
        query.queryKey[0] === 'facets' && matches(readPath(query.queryKey[1], 'dataType')),
    }),
  ]);
}
