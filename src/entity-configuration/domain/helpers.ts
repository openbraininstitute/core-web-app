import filter from 'lodash/filter';
import find from 'lodash/find';
import set from 'lodash/set';

import { EntityCoreConfiguration } from '@/entity-configuration/domain';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type {
  EntityCoreTypeConfig,
  EntityCoreTypeGroup,
} from '@/entity-configuration/domain/types';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { EntityTypeValue } from '@/api/entitycore/types';

export type EntityCoreLegacyType =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration]['legacyType'];

/**
 * Retrieves an entity configuration by its legacy type.
 *
 * @param params - An object containing the legacy type of the entity.
 * @param params.legacyType - The legacy type of the entity (optional).
 * @returns A promise resolving to the entity configuration(s) matching the given legacy type.
 */
export const getEntityByLegacyType = ({ legacyType }: { legacyType?: EntityCoreLegacyType }) =>
  find(EntityCoreConfiguration, { legacyType });

/**
 * Retrieves an entity from the `EntityCoreConfiguration` based on the provided core entity type.
 *
 * @param params - An object containing the entity type to search for.
 * @param params.type - The type of the entity to find (optional).
 * @returns The entity matching the specified type, if found.
 */
export const getEntityByCoreType = ({ type }: { type?: EntityTypeValue }) =>
  find(EntityCoreConfiguration, { type });

/**
 * Retrieves an entity configuration by its slug value.
 *
 * @param param0 - An object containing the `slug` of the entity to retrieve.
 * @returns The entity configuration matching the provided slug, or `undefined` if not found.
 */
export const getEntityBySlug = ({ slug }: { slug: EntitySlugValue }) =>
  find(EntityCoreConfiguration, { slug });

/**
 * Retrieves all entities from `EntityCoreConfiguration` that belong to the specified group.
 *
 * @param params - An object containing the group to filter entities by.
 * @param params.group - The group of type `EntityCoreTypeGroup` to filter entities.
 * @returns An array of entities from `EntityCoreConfiguration` that match the given group.
 */
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
