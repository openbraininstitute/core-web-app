import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type {
  ExpandReconstructionMorphologyParm,
  ReconstructionMorphologyFilter,
  IReconstructionMorphology,
  IReconstructionMorphologyExpanded,
} from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/reconstruction-morphology';
/**
 * Retrieves a list of reconstruction morphologies from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {ReconstructionMorphologyFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IReconstructionMorphology>>} A promise that resolves to the list of reconstruction morphologies
 */
export async function getReconstructionMorphologies({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: ReconstructionMorphologyFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<
    EntityCoreResponse<IReconstructionMorphology | IReconstructionMorphologyExpanded>
  >(baseUri, {
    queryParams: {
      ...filters,
      with_facets: withFacets,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a specific reconstruction morphology by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the reconstruction morphology to retrieve
 * @param {ExpandReconstructionMorphologyParm} params.expand - Parameter to specify if the morphology should be expanded
 * @returns {Promise<IReconstructionMorphology | IReconstructionMorphologyExpanded>} A promise that resolves to the requested reconstruction morphology
 */
export async function getReconstructionMorphology({
  id,
  expand,
  context,
}: {
  id: string;
  expand?: ExpandReconstructionMorphologyParm;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IReconstructionMorphology | IReconstructionMorphologyExpanded>(
    `${baseUri}/${id}`,
    {
      queryParams: {
        expand,
      },
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...getEntityCoreContext(context).headers,
      },
    }
  );
}
