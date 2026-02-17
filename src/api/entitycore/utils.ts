import { find, snakeCase } from 'es-toolkit/compat';
import { authApiClient } from '@/api/apiClient';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreBaseAsset, IAsset } from '@/api/entitycore/types/shared/global';
import { config as appConfig } from '@/config';
import type { KebabCase } from '@/utils/type';

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
  const api = await authApiClient(url ?? appConfig.ENTITY_CORE_URL);
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

export const convertEntitySlugToExtendedType = ({
  type,
}: {
  type: KebabCase<TExtendedEntitiesTypeDict>;
}) => {
  return snakeCase(type) as TExtendedEntitiesTypeDict;
};
