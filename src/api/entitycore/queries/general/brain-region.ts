import { entityCoreApi } from '@/api/entitycore/utils';
import {
  IBrainRegionHierarchy,
  ITemporaryBrainRegionHierarchy,
  TemporaryFlatBrainRegionHierarchy,
} from '@/api/entitycore/types/entities/brain-region';

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
  >(
    '/brain-region',
    {
      queryParams: {
        flat,
      },
    },
    {
      cache: { cacheName: 'brain-region', enabled: true, ttlInSeconds: 86_400 },
    }
  );
}

/**
 * Retrieves a specific brain region by its ID from the Entity Core API.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the brain region to retrieve
 * @returns {Promise<BrainRegion>} A promise that resolves to the requested brain region
 */
export async function getTemporaryBrainRegionById({ id }: { id: string }) {
  const api = await entityCoreApi();
  return await api.get<IBrainRegionHierarchy>(`/brain-region/${id}`);
}
