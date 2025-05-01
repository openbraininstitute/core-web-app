import find from 'lodash/find';
import { EntityCoreConfiguration } from '.';

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
