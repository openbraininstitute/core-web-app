import { circuitScaleVariants } from './circuit-scale';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IListingVariant, IListingVariantGroup } from './types';

/**
 * Every listing with variants. Adding variants = one `defineFacetVariants` file + one line here
 * (the parent dataType must also be in `DATA_BROWSE_ALLOWED_ENTITIES`).
 */
export const LISTING_VARIANT_GROUPS: readonly IListingVariantGroup[] = [circuitScaleVariants];

export function getVariantGroup(dataType: string): IListingVariantGroup | undefined {
  return LISTING_VARIANT_GROUPS.find(
    (group) => group.dataType === (dataType as TExtendedEntitiesTypeDict)
  );
}

export function resolveListingVariant(
  dataType: string,
  slug: string | undefined
): IListingVariant | undefined {
  return slug === undefined
    ? undefined
    : getVariantGroup(dataType)?.variants.find((variant) => variant.slug === slug);
}

/** The variant an entity belongs to (e.g. a whole-brain circuit), if its type is split. */
export function resolveEntityVariant(
  dataType: string,
  entity: object
): IListingVariant | undefined {
  const group = getVariantGroup(dataType);
  const value = (entity as Record<string, unknown>)[group?.field ?? ''];
  return group?.variants.find((variant) => variant.value === value);
}
