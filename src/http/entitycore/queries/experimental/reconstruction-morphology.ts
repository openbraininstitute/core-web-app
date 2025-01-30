import omitBy from 'lodash/omitBy';
import isNil from 'lodash/isNil';

import authApiClient from '@/http/apiClient';
import {
  IMorphologyFilter,
  ReconstructionMorphology,
} from '@/http/entitycore/types/reconstruction-morphology';
import { EntityCoreResponse } from '@/http/entitycore/types/request-shared-type';
import { entityCoreUrl } from '@/config';

export async function getReconstructionMorphologies({ filters }: { filters?: IMorphologyFilter }) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<EntityCoreResponse<ReconstructionMorphology>>(
    '/reconstruction_morphology/',
    {
      queryParams: {
        ...omitBy(filters, isNil),
      },
    }
  );
}