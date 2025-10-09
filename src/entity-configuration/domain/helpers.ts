import filter from 'es-toolkit/compat/filter';
import find from 'es-toolkit/compat/find';
import set from 'es-toolkit/compat/set';

import { EntityCoreConfiguration } from '@/entity-configuration/domain';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { TEntityTypeDict } from '@/api/entitycore/types';

export type EntityCoreExtendedType =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration]['extendedType'];

export const circuitTypes: EntityCoreExtendedType[] = [
  'circuit',
  'small_micro_circuit',
  'paired_neuron_circuit',
  'micro_circuit',
];

export const getEntityByExtendedType = ({ type }: { type?: EntityCoreExtendedType }) => {
  return find(EntityCoreConfiguration, { extendedType: type });
};

// TODO: fix type to be a list of available types in entitycore
export const getEntityByCoreType = ({ type }: { type?: TEntityTypeDict }) =>
  find(EntityCoreConfiguration, { type });

/**
 * Retrieves an entity configuration by its slug value.
 *
 * @param param0 - An object containing the `slug` of the entity to retrieve.
 * @returns The entity configuration matching the provided slug, or `undefined` if not found.
 */
export const getEntityBySlug = ({ slug }: { slug: EntitySlugValue }) =>
  find(EntityCoreConfiguration, { slug });

export const getEntitiesByGroup = ({ group }: { group: TEntityTypeGroup }) => {
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
