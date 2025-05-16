import filter from 'lodash/filter';
import find from 'lodash/find';

import { EntityCoreConfiguration } from '.';

import type { EntityCoreTypeGroup } from '@/entity-configuration/domain/types';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { EntityTypeValue } from '@/api/entitycore/types';

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
