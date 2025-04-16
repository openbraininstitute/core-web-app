import find from 'lodash/find';
import { EntityCoreConfiguration } from '.';

export type EntityCoreLegacyType =
  (typeof EntityCoreConfiguration)[keyof typeof EntityCoreConfiguration]['legacyType'];

export const getEntityByLegacyType = ({ legacyType }: { legacyType: EntityCoreLegacyType }) =>
  find(EntityCoreConfiguration, { legacyType });

// TODO: fix type to be a list of available types in entitycore
export const getEntityByCoreType = ({ type }: { type: string }) =>
  find(EntityCoreConfiguration, { type });

export const getEntityBySlug = ({ slug }: { slug: string }) =>
  find(EntityCoreConfiguration, { slug });
