import type {
  IBrainRegionHierarchy,
  ITemporaryBrainRegionHierarchy,
  TemporaryFlatBrainRegionHierarchy,
} from '@/api/entitycore/types/entities/brain-region';
import { entityCoreApi } from '@/api/entitycore/utils';
import { config } from '@/config';

/**
 * Retrieves the brain region hierarchy from the Entity Core API.
 *
 * @param {Object} options - The options object
 * @param {boolean} [options.flat] - When true, returns a flattened list of brain regions instead of a hierarchical structure
 * @returns {Promise<BrainRegion>} A promise that resolves to the brain region hierarchy or flattened list
 */
export async function getTemporaryBrainRegionHierarchy<T extends boolean>(
  { flat }: { flat?: T } = {} as { flat?: T }
): Promise<T extends true ? TemporaryFlatBrainRegionHierarchy : ITemporaryBrainRegionHierarchy> {
  // TODO: the caching could be also passed to a specific function
  const api = await entityCoreApi(); // cached it for 1 day
  return await api.get<
    T extends true ? TemporaryFlatBrainRegionHierarchy : ITemporaryBrainRegionHierarchy
  >('/brain-region', {
    queryParams: {
      flat,
    },
  });
}

/**
 * Retrieves the brain region hierarchy from the entity core API.
 *
 * @param params - An object containing the name of the brain region hierarchy to fetch.
 * @param params.name - The name of the brain region hierarchy. Defaults to 'aibs'.
 * @returns A promise that resolves to the brain region hierarchy data.
 */
export async function getBrainRegionHierarchy({
  id = config.DEFAULT_BRAIN_REGION_HIERARCHY_ID,
}: {
  id?: string;
}) {
  const api = await entityCoreApi();
  return await api.get<IBrainRegionHierarchy>(`/brain-region-hierarchy/${id}/hierarchy`);
}
