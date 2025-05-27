import filter from 'lodash/filter';
import find from 'lodash/find';
import set from 'lodash/set';

import { EntityCoreConfiguration } from '@/entity-configuration/domain';

import type {
  EntityCoreTypeConfig,
  EntityCoreTypeGroup,
} from '@/entity-configuration/domain/types';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { EntityTypeValue } from '@/api/entitycore/types';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

export type EntityCoreLegacyType =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration]['legacyType'];

export const getEntityByLegacyType = ({ legacyType }: { legacyType: EntityCoreLegacyType }) =>
  find(EntityCoreConfiguration, { legacyType });

// TODO: fix type to be a list of available types in entitycore
export const getEntityByCoreType = ({ type }: { type: EntityTypeValue }) =>
  find(EntityCoreConfiguration, { type });

export const getEntityBySlug = ({ slug }: { slug: EntitySlugValue }) =>
  find(EntityCoreConfiguration, { slug });

export const getEntitiesByGroup = ({ group }: { group: EntityCoreTypeGroup }) => {
  return filter(EntityCoreConfiguration, { group });
};

export const applyEntityExpansions = async <
  T extends EntityCoreIdentifiable,
  K extends Record<string, any>,
>(
  entity: EntityCoreTypeConfig<T>,
  source: T,
  ...other: any
): Promise<K> => {
  const data = {} as K;
  if (entity.api.expand) {
    const promises = Object.entries(entity.api.expand).map(([k, fn]) => {
      return fn(source, ...other).then((result) => ({ key: k, result }));
    });

    const results = await Promise.all(promises);
    results.forEach(({ key, result }) => {
      set(data, key, result);
    });
  }
  return data;
};
