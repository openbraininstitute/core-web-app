import { find, kebabCase, snakeCase } from 'es-toolkit/compat';

import { authApiClient } from '@/api/api-client';
import { config as appConfig } from '@/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreBaseAsset, IAsset } from '@/api/entitycore/types/shared/global';
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

/** Builds the `/{entity-route}/{entityId}/assets` URI prefix shared by all asset endpoints. */
export function entityAssetsPath(entityType: string, entityId: string): string {
  return `/${kebabCase(entityType)}/${entityId}/assets`;
}

export function getAssetElement(
  config:
    | (Partial<EntityCoreBaseAsset> & { filter: (i: IAsset) => boolean })
    | (Partial<EntityCoreBaseAsset> & { type: string; path: string })
) {
  if ('filter' in config) {
    return find(config.assets, config.filter);
  }
  return config.assets?.find((o) => {
    if (o.path === config.path && o.content_type === config.type) return true;
    return false;
  });
}

export const convertEntitySlugToExtendedType = ({
  type,
}: {
  type: KebabCase<TExtendedEntitiesTypeDict>;
}) => {
  return snakeCase(type) as TExtendedEntitiesTypeDict;
};
