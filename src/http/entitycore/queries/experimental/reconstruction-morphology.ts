import { entityCoreUrl } from '@/config';
import authApiClient from '@/http/apiClient';
import {
  ExpandReconstructionMorphologyParm,
  IMorphologyFilter,
  IReconstructionMorphology,
  IReconstructionMorphologyExpanded,
} from '@/http/entitycore/types/entities/reconstruction-morphology';
import { EntityCoreResponse } from '@/http/entitycore/types/shared/response';

/**
 * Retrieves a list of reconstruction morphologies from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {IMorphologyFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IReconstructionMorphology>>} A promise that resolves to the list of reconstruction morphologies
 */
export async function getReconstructionMorphologies({ filters }: { filters?: IMorphologyFilter }) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<EntityCoreResponse<IReconstructionMorphology>>(
    '/reconstruction_morphology/',
    {
      queryParams: {
        ...filters,
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
  expand: ExpandReconstructionMorphologyParm;
}) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<IReconstructionMorphology | IReconstructionMorphologyExpanded>(
    `/reconstruction_morphology/${id}`,
    {
      queryParams: {
        expand,
      },
    }
  );
}
