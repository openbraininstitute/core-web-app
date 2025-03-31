
import authApiClient from '@/api/apiClient';
import {
  ExpandReconstructionMorphologyParm,
  IMorphologyFilter,
  IReconstructionMorphology,
  IReconstructionMorphologyExpanded,
} from '@/api/entitycore/types/entities/reconstruction-morphology';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { entityCoreUrl } from '@/config';


const baseUri = "/reconstruction-morphology/"
/**
 * Retrieves a list of reconstruction morphologies from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {IMorphologyFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IReconstructionMorphology>>} A promise that resolves to the list of reconstruction morphologies
 */
export async function getReconstructionMorphologies({ withFacets, filters }: { withFacets?: boolean; filters?: IMorphologyFilter }) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<EntityCoreResponse<IReconstructionMorphology>>(
    baseUri,
    {
      queryParams: {
        ...filters,
        with_facets: withFacets,
      },
    }
  );
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
}: {
  id: string;
  expand?: ExpandReconstructionMorphologyParm;
}) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<IReconstructionMorphology | IReconstructionMorphologyExpanded>(
    `${baseUri}${id}`,
    {
      queryParams: {
        expand,
      },
    }
  );
}
