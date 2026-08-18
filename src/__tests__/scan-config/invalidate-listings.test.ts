import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope } from '@/constants';
import { invalidateDataListings } from '@/features/scan-config/outputs/invalidate-listings';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { QueryKey } from '@tanstack/react-query';

const RESULT = ExtendedEntitiesTypeDict.EFeatureExtractionResult;
const workspace = { virtualLabId: 'vl-1', projectId: 'proj-1' };

/** the sidebar's "current" count, keyed on the region it is scoped to */
const currentCountKey = keyBuilder.dataCountPerEntity({
  ...workspace,
  extendedEntityType: RESULT,
  brainRegionId: 'region-1',
  scope: WorkspaceScope.Project,
});

/** the sidebar's "root" count, same head, different region */
const rootCountKey = keyBuilder.dataCountPerEntity({
  ...workspace,
  extendedEntityType: RESULT,
  brainRegionId: '',
  scope: WorkspaceScope.Project,
});

/** the listing table, as `buildQueryKey` shapes it */
const listingKey: QueryKey = [
  {
    workspace,
    context: {
      key: 'vl-1/proj-1/data/efeature_extraction_result/project',
      extendedEntityType: RESULT,
      workspaceScope: WorkspaceScope.Project,
    },
    queryParameters: { page: 1, page_size: 30 },
  },
];

const facetsKey: QueryKey = ['facets', { dataKey: 'x', dataType: RESULT, workspace }];

const otherCountKey = keyBuilder.dataCountPerEntity({
  ...workspace,
  extendedEntityType: ExtendedEntitiesTypeDict.CellMorphology,
  scope: WorkspaceScope.Project,
});

const otherListingKey: QueryKey = [
  {
    workspace,
    context: {
      key: 'vl-1/proj-1/data/cell_morphology/project',
      extendedEntityType: ExtendedEntitiesTypeDict.CellMorphology,
    },
  },
];

/**
 * A cache holding one entry per query the Data page keeps, each with a real `queryFn` — the
 * invalidation refetches what it marks, so a cache seeded with `setQueryData` alone would hang.
 */
function seededClient() {
  const client = new QueryClient();
  const fetches = new Map<QueryKey, ReturnType<typeof vi.fn>>();

  for (const key of [
    currentCountKey,
    rootCountKey,
    listingKey,
    facetsKey,
    otherCountKey,
    otherListingKey,
  ]) {
    const queryFn = vi.fn(async () => ({ seeded: true }));
    fetches.set(key, queryFn);
    client.setQueryDefaults(key, { queryFn, staleTime: Infinity });
    client.setQueryData(key, { seeded: true });
  }

  return { client, refetchCount: (key: QueryKey) => fetches.get(key)?.mock.calls.length ?? 0 };
}

describe('invalidateDataListings', () => {
  it('refreshes the rows, both sidebar counts and the facets of the produced type', async () => {
    const { client, refetchCount } = seededClient();

    await invalidateDataListings({ queryClient: client, listingTypes: [RESULT] });

    // the run finishes on the Workflows page, where none of these queries has an observer, so
    // each has to be refetched outright: the default only refreshes active queries, which is what
    // left the sidebar total showing the pre-run number
    expect(refetchCount(currentCountKey)).toBe(1);
    expect(refetchCount(rootCountKey)).toBe(1);
    expect(refetchCount(listingKey)).toBe(1);
    expect(refetchCount(facetsKey)).toBe(1);
  });

  it('leaves the listings of other entity types alone', async () => {
    const { client, refetchCount } = seededClient();

    await invalidateDataListings({ queryClient: client, listingTypes: [RESULT] });

    expect(refetchCount(otherCountKey)).toBe(0);
    expect(refetchCount(otherListingKey)).toBe(0);
  });

  it('does nothing when a run resolved no listing type', async () => {
    const { client, refetchCount } = seededClient();

    await invalidateDataListings({ queryClient: client, listingTypes: [] });

    expect(refetchCount(currentCountKey)).toBe(0);
    expect(refetchCount(listingKey)).toBe(0);
  });
});
