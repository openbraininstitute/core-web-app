import { entityCorePublicProjectId, entityCorePublicVirtualLabId } from '@/config';
import { entityCoreUrl } from '@/config';
import authApiClient from '@/api/apiClient';

export const getEntityCorePublicContext = () => ({
  headers: {
    'virtual-lab-id': entityCorePublicVirtualLabId,
    'project-id': entityCorePublicProjectId,
  },
});

export const getEntityCoreContext = (virtualLabId?: string, projectId?: string) => ({
  headers: {
    'virtual-lab-id': virtualLabId ?? entityCorePublicVirtualLabId,
    'project-id': projectId ?? entityCorePublicProjectId,
  },
});

export async function entityCoreApi() {
  const api = await authApiClient(entityCoreUrl);
  return api;
}
