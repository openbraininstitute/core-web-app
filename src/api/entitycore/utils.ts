import authApiClient from '@/api/apiClient';

import { entityCorePublicProjectId, entityCorePublicVirtualLabId } from '@/config';
import { entityCoreUrl } from '@/config';

export const getEntityCorePublicContext = () => ({
  headers: {
    'virtual-lab-id': entityCorePublicVirtualLabId,
    'project-id': entityCorePublicProjectId,
  },
});

export const getEntityCoreContext = (
  ctx:
    | {
        virtualLabId?: string;
        projectId?: string;
      }
    | undefined
    | null
) => {
  if (ctx?.virtualLabId && ctx?.projectId) {
    return {
      headers: {
        'virtual-lab-id': ctx?.virtualLabId,
        'project-id': ctx?.projectId,
      },
    };
  }
  return {};
};

export async function entityCoreApi(url?: string) {
  const api = await authApiClient(url ?? entityCoreUrl);
  return api;
}
