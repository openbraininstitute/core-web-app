import { entityCorePublicProjectId, entityCorePublicVirtualLabId } from '@/config';
import { entityCoreUrl } from '@/config';
import authApiClient from '@/api/apiClient';

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
  return {
    headers: {
      'virtual-lab-id': ctx?.virtualLabId ?? entityCorePublicVirtualLabId,
      'project-id': ctx?.projectId ?? entityCorePublicProjectId,
    },
  };
};

export async function entityCoreApi(url?: string) {
  const api = await authApiClient(url ?? entityCoreUrl);
  return api;
}
