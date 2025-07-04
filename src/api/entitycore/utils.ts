import find from 'lodash/find';

import { entityCorePublicProjectId, entityCorePublicVirtualLabId, entityCoreUrl } from '@/config';
import authApiClient from '@/api/apiClient';

import type { EntityCoreBaseAsset, IAsset } from '@/api/entitycore/types/shared/global';

const getEntityCorePublicContext = () => ({
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

export function getAssetElement(
  config:
    | (Partial<EntityCoreBaseAsset> & { filter: (i: IAsset) => boolean })
    | (Partial<EntityCoreBaseAsset> & { type: string; path: string })
) {
  if ('filter' in config) {
    return find(config.assets, config.filter);
  }
  return find(config.assets, { path: config.path, content_type: config.type });
}
